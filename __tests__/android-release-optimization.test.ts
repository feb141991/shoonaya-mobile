import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const appConfig = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')) as {
  expo: {
    plugins: unknown[];
  };
};
const pluginSource = readFileSync(new URL('../plugins/with-optimized-r8.js', import.meta.url), 'utf8');

describe('Android release optimization contract', () => {
  it('keeps R8 and resource shrinking enabled without blanket package keep rules', () => {
    const buildPropertiesEntry = appConfig.expo.plugins.find(
      (entry): entry is [string, { android?: Record<string, unknown> }] =>
        Array.isArray(entry) && entry[0] === 'expo-build-properties'
    );
    assert.ok(buildPropertiesEntry);
    const android = buildPropertiesEntry[1].android;
    assert.equal(android?.enableMinifyInReleaseBuilds, true);
    assert.equal(android?.enableShrinkResourcesInReleaseBuilds, true);
    assert.equal(android?.extraProguardRules, undefined);
  });

  it('runs the checked-in plugin that selects Android optimized default rules', () => {
    assert.ok(appConfig.expo.plugins.includes('./plugins/with-optimized-r8'));
    assert.match(pluginSource, /proguard-android-optimize\.txt/);
    assert.match(pluginSource, /withAppBuildGradle/);
  });
});
