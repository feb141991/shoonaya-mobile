import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Origin: 2026-11-12 privacy audit. The iOS manifest listed precise location for "Analytics" although location is never sent to
// product measurement (policy: "We do not record ... location"), and it left out the hourly performance summary, which is linked
// to the account and disclosed in the policy. The manifest must describe what the app really collects.

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8')).expo.ios.privacyManifests as {
  NSPrivacyTracking: boolean;
  NSPrivacyCollectedDataTypes: Array<{
    NSPrivacyCollectedDataType: string;
    NSPrivacyCollectedDataTypeLinked: boolean;
    NSPrivacyCollectedDataTypeTracking: boolean;
    NSPrivacyCollectedDataTypePurposes: string[];
  }>;
};
const entry = (type: string) => manifest.NSPrivacyCollectedDataTypes.find((d) => d.NSPrivacyCollectedDataType === `NSPrivacyCollectedDataType${type}`);
const ANALYTICS = 'NSPrivacyCollectedDataTypePurposeAnalytics';

describe('iOS privacy manifest matches what the app collects', () => {
  it('says the app does not track', () => {
    assert.equal(manifest.NSPrivacyTracking, false);
    for (const d of manifest.NSPrivacyCollectedDataTypes) assert.equal(d.NSPrivacyCollectedDataTypeTracking, false, d.NSPrivacyCollectedDataType);
  });

  it('does not claim location is used for analytics', () => {
    const location = entry('PreciseLocation');
    assert.ok(location, 'location is declared');
    assert.ok(!location.NSPrivacyCollectedDataTypePurposes.includes(ANALYTICS));
  });

  it('declares optional product measurement under Product Interaction', () => {
    assert.ok(entry('ProductInteraction')?.NSPrivacyCollectedDataTypePurposes.includes(ANALYTICS));
  });

  it('declares the account-linked performance summary', () => {
    const performance = entry('PerformanceData');
    assert.ok(performance, 'performance data is declared');
    assert.equal(performance.NSPrivacyCollectedDataTypeLinked, true);
  });
});
