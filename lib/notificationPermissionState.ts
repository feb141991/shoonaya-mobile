export type NotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unavailable';

export function normalizeNotificationPermissionState(permission: {
  granted?: boolean;
  status?: string;
  ios?: { status?: number };
}): NotificationPermissionState {
  const iosStatus = permission.ios?.status;
  if (
    permission.granted === true
    || permission.status === 'granted'
    || iosStatus === 2
    || iosStatus === 3
    || iosStatus === 4
  ) return 'granted';
  if (iosStatus === 1 || permission.status === 'denied') return 'denied';
  return 'undetermined';
}
