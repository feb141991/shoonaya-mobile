import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Source pins for onboarding Step 9 (Location) layout and text wrapping bounds (Rule 17).
 * Ensures row items alongside icons carry flex: 1 and lineHeight to prevent text
 * bleeding past parent container padding on mobile viewports.
 */
const raw = readFileSync(join(__dirname, "..", "app", "(auth)", "onboarding.tsx"), "utf8");
const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("onboarding location step layout & text wrapping bounds", () => {
  it("bounds feature label text to available row width with flex: 1 and lineHeight", () => {
    const locationStep = source.slice(source.indexOf("step === 'location'"));
    assert.ok(locationStep.length > 0, "location step block exists");

    const cardBlock = locationStep.slice(0, locationStep.indexOf("locationDenied ?"));
    assert.match(
      cardBlock,
      /<Text style=\{\{\s*flex: 1,\s*fontFamily:[^}]+lineHeight:[^}]+color: text\s*\}\}>\s*\{item\.label\}\s*<\/Text>/,
      "expected location item label Text to have flex: 1 and explicit lineHeight"
    );
  });
});
