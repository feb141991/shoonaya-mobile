import type { NotificationPermissionState } from './notificationPermissionState';

// A lease on our database acknowledgement, not a claim about FCM/APNs validity.
// This is a database-acknowledgement freshness window, not provider token TTL.
// Foreground returns and explicit Settings checks provide earlier repair points.
export const PUSH_REGISTRATION_LEASE_MS = 24 * 60 * 60 * 1000;
export const PUSH_REGISTRATION_HEARTBEAT_MS = 24 * 60 * 60 * 1000;
export const PUSH_RECOVERY_DELAYS_MS = [2_000, 10_000, 60_000] as const;

export type NativePushToken = { type: 'ios' | 'android'; data: string };
export type PushRegistrationResult = {
  // deletion_pending: the backend refused this account (409 ACCOUNT_DELETION_PENDING)
  // during its deletion cool-off. Terminal until the user cancels deletion.
  status: 'registered' | 'fresh' | 'permission_denied' | 'unavailable' | 'failed' | 'superseded' | 'deletion_pending';
  retryable?: boolean;
};
export type PushRegistrationSnapshot = {
  userId: string | null;
  status: 'idle' | 'syncing' | PushRegistrationResult['status'];
};
export type PushBinding = {
  userId: string;
  projectId: string;
  token: string;
  bindingVersion: string | null;
  revision: number;
  acknowledgedAt: number;
};
type Lease = {
  identity: { kind: string; userId?: string };
  revision: number;
  isCurrent: () => boolean;
};
export type PushRegistrationOptions = {
  force?: boolean;
  reason?: 'auth' | 'foreground' | 'heartbeat' | 'settings' | 'permission' | 'rotation' | 'retry';
  devicePushToken?: NativePushToken;
};
type Dependencies = {
  captureIdentity: () => Lease;
  now: () => number;
  projectId: () => string;
  permission: () => Promise<NotificationPermissionState>;
  token: (projectId: string, nativeToken?: NativePushToken) => Promise<string>;
  post: (token: string, userId: string, reason: string) => Promise<{
    bindingVersion: string | null;
    discard?: () => Promise<void>;
  }>;
  failure: (userId: string, stage: string, error: unknown) => void;
};

/** One serialization point for registration, recovery and logout on this installation. */
export class PushRegistrationCoordinator {
  private binding: PushBinding | null = null;
  private blockedRevision: number | null = null;
  private permissionWasGranted = false;
  private acknowledgementValid = false;
  private flight: { key: string; options: PushRegistrationOptions; promise: Promise<PushRegistrationResult> } | null = null;
  private snapshot: PushRegistrationSnapshot = { userId: null, status: 'idle' };
  private listeners = new Set<() => void>();

  constructor(private readonly d: Dependencies) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getBinding = () => this.binding;
  resume = () => { this.blockedRevision = null; };

  private publish(userId: string | null, status: PushRegistrationSnapshot['status']) {
    if (this.snapshot.userId === userId && this.snapshot.status === status) return;
    this.snapshot = { userId, status };
    this.listeners.forEach((listener) => listener());
  }

  private reportFailure(userId: string, stage: string, error: unknown) {
    try { this.d.failure(userId, stage, error); } catch { /* Diagnostics must not block recovery. */ }
  }

  register(userId: string, options: PushRegistrationOptions = {}): Promise<PushRegistrationResult> {
    return this.registerUnderLease(userId, options, this.d.captureIdentity());
  }

  private registerUnderLease(userId: string, options: PushRegistrationOptions, lease: Lease): Promise<PushRegistrationResult> {
    if (!lease.isCurrent() || lease.identity.kind !== 'authenticated' || lease.identity.userId !== userId
      || lease.revision === this.blockedRevision) return Promise.resolve({ status: 'superseded' });
    const projectId = this.d.projectId();
    const key = `${lease.revision}:${userId}:${projectId}`;
    if (this.flight) {
      const sameToken = !options.devicePushToken ||
        (options.devicePushToken.data === this.flight.options.devicePushToken?.data &&
          options.devicePushToken.type === this.flight.options.devicePushToken?.type);
      const covered = this.flight.key === key && sameToken && (!options.force || this.flight.options.force);
      if (covered) return this.flight.promise;
      // A forced check/rotation cannot disappear behind a flight that may only
      // return a fresh-cache result. Serialize owners too: A settles before B sends.
      const flight = this.flight;
      return flight.promise.then((result) => {
        if (flight.key === key && lease.isCurrent() && result.status === 'registered' && !options.devicePushToken) return result;
        return this.registerUnderLease(userId, options, lease);
      });
    }
    const promise = this.run(userId, projectId, options, lease);
    const flight = { key, options, promise };
    this.flight = flight;
    void promise.then(() => { if (this.flight === flight) this.flight = null; }, () => { if (this.flight === flight) this.flight = null; });
    return promise;
  }

  private async run(userId: string, projectId: string, options: PushRegistrationOptions, lease: Lease): Promise<PushRegistrationResult> {
    let stage = 'check_permission';
    this.publish(userId, 'syncing');
    try {
      const permission = await this.d.permission();
      if (!lease.isCurrent()) return { status: 'superseded' };
      if (permission !== 'granted') {
        // A later grant must never be hidden by an old acknowledgement.
        this.permissionWasGranted = false;
        this.acknowledgementValid = false;
        const status = permission === 'unavailable' ? 'unavailable' : 'permission_denied';
        this.publish(userId, status);
        if (status === 'permission_denied') this.reportFailure(userId, stage, new Error(`permission not granted: ${permission}`));
        return { status };
      }
      const permissionChanged = !this.permissionWasGranted;
      this.permissionWasGranted = true;
      const binding = this.binding;
      const elapsed = binding ? this.d.now() - binding.acknowledgedAt : -1;
      if (!options.force && this.acknowledgementValid && !permissionChanged && binding?.userId === userId && binding.projectId === projectId
        && binding.revision === lease.revision && elapsed >= 0 && elapsed < PUSH_REGISTRATION_LEASE_MS
        && !options.devicePushToken) {
        this.publish(userId, 'fresh');
        return { status: 'fresh' };
      }
      stage = 'fetch_expo_push_token';
      const token = await this.d.token(projectId, options.devicePushToken);
      if (!lease.isCurrent()) return { status: 'superseded' };
      if (!token) throw new Error('Push service returned an empty token');
      stage = 'post_register_token';
      const acknowledgement = await this.d.post(token, userId, options.reason ?? 'auth');
      if (!lease.isCurrent()) {
        // A versioned stale acknowledgement can be removed without touching a
        // later binding, including A -> B -> A. Legacy unversioned responses cannot.
        await acknowledgement.discard?.().catch(() => {});
        return { status: 'superseded' };
      }
      this.binding = {
        userId, projectId, token, bindingVersion: acknowledgement.bindingVersion,
        revision: lease.revision, acknowledgedAt: this.d.now(),
      };
      this.acknowledgementValid = true;
      this.publish(userId, 'registered');
      return { status: 'registered' };
    } catch (error) {
      if (!lease.isCurrent()) return { status: 'superseded' };
      this.acknowledgementValid = false;
      if (error instanceof Error && 'deletionPending' in error && error.deletionPending === true) {
        // An expected refusal, not a registration fault: no failure report, no retry.
        this.binding = null;
        this.publish(userId, 'deletion_pending');
        return { status: 'deletion_pending' };
      }
      this.publish(userId, 'failed');
      this.reportFailure(userId, stage, error);
      return { status: 'failed', retryable: !(error instanceof Error && 'retryable' in error && error.retryable === false) };
    }
  }

  async unregister(remove: (binding: PushBinding) => Promise<void>, ownerId?: string, cleanupBinding?: PushBinding | null): Promise<void> {
    const lease = this.d.captureIdentity();
    const owner = ownerId ?? this.binding?.userId ?? lease.identity.userId;
    if (!owner) return;
    // Stop new work first, then let an already-sent POST settle before DELETE.
    // Do not abort a POST: aborting locally cannot undo its server-side upsert.
    if (lease.identity.userId === owner || lease.identity.kind !== 'authenticated') this.blockedRevision = lease.revision;
    await this.flight?.promise;
    const binding = this.binding?.userId === owner ? this.binding : cleanupBinding;
    if (!binding || binding.userId !== owner) return;
    if (this.binding?.userId === owner) { this.binding = null; this.acknowledgementValid = false; this.publish(null, 'idle'); }
    await remove(binding);
  }
}
