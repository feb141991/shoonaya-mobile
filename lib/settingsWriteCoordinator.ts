import type { PendingSettingsWrite, SettingsFields } from './settingsCache';
import { nextBackoffMs } from './retryPolicy';

/** Settings-only single writer. Storage remains independent of transport so
 * a newer intent is durable even while an older request is still in flight. */
export class SettingsWriteCoordinator {
  private owner: { userId: string; isCurrent: () => boolean } | null = null;
  private generation = 0;
  private pending: PendingSettingsWrite | null = null;
  private revision = 0;
  private sends = Promise.resolve();
  private storage = Promise.resolve();

  bind(userId: string, isCurrent: () => boolean): void {
    if (this.owner?.userId === userId && this.owner.isCurrent()) return;
    this.generation += 1;
    this.owner = { userId, isCurrent };
    this.pending = null;
  }

  cancel(): void {
    this.generation += 1;
    this.owner = null;
    this.pending = null;
  }

  getPending(): PendingSettingsWrite | null { return this.pending; }
  getRevision(): number { return this.revision; }
  setPending(write: PendingSettingsWrite | null): void { this.pending = write; this.revision += 1; }

  private guard(write: PendingSettingsWrite | null): () => boolean {
    const generation = this.generation;
    return () => this.generation === generation && this.owner?.isCurrent() === true &&
      this.pending?.id === write?.id;
  }

  send(write: PendingSettingsWrite, work: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
    const isCurrent = this.guard(write);
    const next = this.sends.then(async () => {
      if (isCurrent() && this.pending?.status === 'pending' && this.pending.attempts === write.attempts) await work(isCurrent);
    });
    this.sends = next.catch(() => {});
    return next;
  }

  store(write: PendingSettingsWrite | null, work: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
    const isOwnerAndWriteCurrent = this.guard(write);
    const revision = this.revision;
    const isCurrent = () => isOwnerAndWriteCurrent() && revision === this.revision;
    const next = this.storage.then(async () => { if (isCurrent()) await work(isCurrent); });
    this.storage = next.catch(() => {});
    return next;
  }
}

export function settingsRetryDelay(attempts: number, status?: number, afterMs = 0): number | null {
  const delay = nextBackoffMs(attempts);
  if (delay === null) return null;
  return status === 429 ? Math.max(delay, afterMs) : delay;
}

/** Pending grants never enable collection; unacknowledged revocations,
 * including failed writes, keep collection off until retried or discarded. */
export function confirmedSettingsConsent(
  server: Partial<SettingsFields>, pending: PendingSettingsWrite | null,
): { product: boolean; practice: boolean } {
  return {
    product: server.consent_product_analytics === true && pending?.fields.consent_product_analytics !== false,
    practice: server.consent_religious_data === true && pending?.fields.consent_religious_data !== false,
  };
}
