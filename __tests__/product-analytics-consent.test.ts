import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  configureNativeAnalytics,
  isNativeAnalyticsEnabled,
  isNativePracticeAnalyticsEnabled,
  setNativeAnalyticsEnabled,
  setNativePracticeAnalyticsEnabled,
  trackAnalyticsEvent,
  trackScreenView,
  type AnalyticsEventName,
} from '@/lib/analytics';

test('product analytics is off by default and records nothing before consent', async () => {
  const sent: AnalyticsEventName[] = [];
  configureNativeAnalytics({ send: async (event) => { sent.push(event); }, withdraw: async () => {} });
  assert.equal(isNativeAnalyticsEnabled(), false);
  await trackAnalyticsEvent('app_opened');
  await trackAnalyticsEvent('practice_started');
  assert.deepEqual(sent, []);
});

test('practice events require both account analytics and tradition-aware consent', async () => {
  const sent: AnalyticsEventName[] = [];
  configureNativeAnalytics({ send: async (event) => { sent.push(event); }, withdraw: async () => {} });
  await setNativeAnalyticsEnabled(true);
  await trackAnalyticsEvent('practice_completed');
  assert.deepEqual(sent, []);
  await setNativePracticeAnalyticsEnabled(true);
  await trackAnalyticsEvent('practice_completed');
  assert.deepEqual(sent, ['practice_completed']);
});

test('explicit consent sends only the event name and discards route and prompt context', async () => {
  const sent: AnalyticsEventName[] = [];
  configureNativeAnalytics({ send: async (event) => { sent.push(event); }, withdraw: async () => {} });
  await setNativeAnalyticsEnabled(true);
  await trackAnalyticsEvent('progressive_profiling', {
    route: '/kundali',
    prompt_key: 'birth_place',
    action: 'shown',
  });
  await trackScreenView('/mood');
  assert.deepEqual(sent, ['progressive_profiling']);
});

test('turning consent off immediately stops subsequent events', async () => {
  const sent: AnalyticsEventName[] = [];
  configureNativeAnalytics({ send: async (event) => { sent.push(event); }, withdraw: async () => {} });
  await setNativeAnalyticsEnabled(true);
  await setNativePracticeAnalyticsEnabled(true);
  await trackAnalyticsEvent('practice_completed');
  await setNativeAnalyticsEnabled(false);
  assert.equal(isNativePracticeAnalyticsEnabled(), false);
  await trackAnalyticsEvent('app_opened');
  assert.deepEqual(sent, ['practice_completed']);
});
