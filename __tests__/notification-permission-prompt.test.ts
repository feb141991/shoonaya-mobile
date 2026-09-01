import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearNotificationPromptClaimsForTests,
  notificationPromptStorageKey,
} from '../lib/notificationPermissionPrompt';
import { normalizeNotificationPermissionState } from '../lib/notificationPermissionState';

test('notification prompt dismissal storage is scoped to the signed-in user', () => {
  clearNotificationPromptClaimsForTests();
  assert.notEqual(notificationPromptStorageKey('user-a'), notificationPromptStorageKey('user-b'));
  assert.equal(
    notificationPromptStorageKey('user-a'),
    'shoonaya:notification_prompt_dismissed:user-a',
  );
});

test('normalizes iOS authorization states without treating denial as undetermined', () => {
  const permission = (iosStatus: number) => ({
    granted: false,
    status: iosStatus === 1 ? 'denied' : 'undetermined',
    canAskAgain: iosStatus === 0,
    expires: 'never',
    ios: { status: iosStatus },
  });

  assert.equal(normalizeNotificationPermissionState(permission(0) as never), 'undetermined');
  assert.equal(normalizeNotificationPermissionState(permission(1) as never), 'denied');
  assert.equal(normalizeNotificationPermissionState(permission(2) as never), 'granted');
  assert.equal(normalizeNotificationPermissionState(permission(3) as never), 'granted');
});
