import { readFileSync } from 'node:fs';

type ExpoConfig = {
  version?: unknown;
  ios?: { bundleIdentifier?: unknown };
  android?: { package?: unknown; versionCode?: unknown };
};

type EasConfig = { cli?: { appVersionSource?: unknown }; build?: Record<string, any> };

const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')) as { expo?: ExpoConfig };
const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8')) as EasConfig;
const expo = app.expo;
const errors: string[] = [];

if (!expo || typeof expo.version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(expo.version)) {
  errors.push('app.json expo.version must be a semantic version.');
}
if (typeof expo?.ios?.bundleIdentifier !== 'string' || !expo.ios.bundleIdentifier.includes('.')) {
  errors.push('app.json expo.ios.bundleIdentifier must be configured.');
}
if (typeof expo?.android?.package !== 'string' || !expo.android.package.includes('.')) {
  errors.push('app.json expo.android.package must be configured.');
}
const androidVersionCode = expo?.android?.versionCode;
if (androidVersionCode !== undefined && (typeof androidVersionCode !== 'number' || !Number.isSafeInteger(androidVersionCode) || androidVersionCode < 1)) {
  errors.push('app.json expo.android.versionCode must be a positive integer when configured.');
}
for (const profile of ['development', 'development-simulator', 'preview', 'production']) {
  if (!eas.build?.[profile]) errors.push(`eas.json is missing the ${profile} build profile.`);
}
if (eas.cli?.appVersionSource === 'remote' && eas.build?.production?.autoIncrement !== true && androidVersionCode === undefined) {
  errors.push('Remote app versioning needs production autoIncrement or an explicit Android versionCode.');
}

if (errors.length) {
  for (const error of errors) console.error(`Build metadata: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Build metadata valid for Shoonaya ${expo?.version}.`);
}
