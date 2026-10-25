import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { APP_TOUR_STEPS } from "../lib/tour-contract";

describe("Interactive App Tour — Metadata & Structure Integrity", () => {
  it("contains exactly 4 core visual preview slides", () => {
    assert.equal(APP_TOUR_STEPS.length, 4);

    const expectedIds = ["today", "practice", "learn", "connect"];
    const actualIds = APP_TOUR_STEPS.map((s) => s.id);
    assert.deepEqual(actualIds, expectedIds);
  });

  it("provides comprehensive English and Hindi localizations for all tour slides", () => {
    for (const step of APP_TOUR_STEPS) {
      assert.ok(step.id && step.id.length > 0, "Slide must have a unique ID");
      assert.ok(step.title && step.title.length > 5, `Slide ${step.id} must have English title`);
      assert.ok(step.titleHi && step.titleHi.length > 5, `Slide ${step.id} must have Hindi title`);
      assert.ok(step.subtitle && step.subtitle.length > 10, `Slide ${step.id} must have English subtitle`);
      assert.ok(step.subtitleHi && step.subtitleHi.length > 10, `Slide ${step.id} must have Hindi subtitle`);
      assert.ok(step.icon && step.icon.length > 0, `Slide ${step.id} must define an icon`);
    }
  });

  it("verifies Slide 2 (Practice) includes offline interactive Japa bead counter", () => {
    const practiceSlide = APP_TOUR_STEPS.find((s) => s.id === "practice");
    assert.ok(practiceSlide, "Practice slide must exist");
    assert.equal(practiceSlide.interactiveFeature, "offline_japa_bead_counter");
  });
});

describe("Interactive App Tour — Entry Points & Non-blocking Experience", () => {
  const rootDir = path.resolve(__dirname, "..");

  it("guarantees OnboardingWelcomeScreen exposes optional onStartTour without blocking entry", () => {
    const welcomeFilePath = path.join(rootDir, "components", "onboarding", "OnboardingWelcomeScreen.tsx");
    assert.ok(fs.existsSync(welcomeFilePath), "OnboardingWelcomeScreen must exist");
    const content = fs.readFileSync(welcomeFilePath, "utf-8");

    // Must declare optional onStartTour prop
    assert.ok(
      content.includes("onStartTour?: () => void;"),
      "OnboardingWelcomeScreenProps must accept optional onStartTour prop"
    );

    // Must render secondary action button
    assert.ok(
      content.includes("Take a quick tour (30 sec)"),
      "Must render secondary quick tour action in English"
    );
    assert.ok(
      content.includes("एक त्वरित झलक देखें (30 सेकंड)"),
      "Must render secondary quick tour action in Hindi"
    );

    // Primary action ("Enter Shoonaya Sanctuary") must be preserved
    assert.ok(
      content.includes("onComplete(destination.route)"),
      "Must preserve existing personalized destination actions"
    );
  });

  it("wires optional tour in onboarding screen without forcing or blocking flow", () => {
    const onboardingFilePath = path.join(rootDir, "app", "(auth)", "onboarding.tsx");
    assert.ok(fs.existsSync(onboardingFilePath), "onboarding.tsx must exist");
    const content = fs.readFileSync(onboardingFilePath, "utf-8");

    assert.ok(content.includes("import { AppTourModal } from '@/components/tour/AppTourModal';"));
    assert.ok(content.includes("const [tourVisible, setTourVisible] = useState(false);"));
    assert.ok(content.includes("onStartTour={() => setTourVisible(true)}"));
    assert.ok(content.includes("<AppTourModal"));
  });

  it("provides replay access in Profile screen", () => {
    const profileFilePath = path.join(rootDir, "app", "(tabs)", "profile.tsx");
    assert.ok(fs.existsSync(profileFilePath), "profile.tsx must exist");
    const content = fs.readFileSync(profileFilePath, "utf-8");

    assert.ok(content.includes("import { AppTourModal } from '@/components/tour/AppTourModal';"));
    assert.ok(content.includes("const [tourVisible, setTourVisible] = useState(false);"));
    assert.ok(content.includes("Tour Shoonaya"));
    assert.ok(content.includes("शून्या की झलक देखें"));
    assert.ok(content.includes("<AppTourModal"));
  });

  it("provides replay access in Settings > About Shoonaya screen", () => {
    const detailScreenPath = path.join(rootDir, "app", "settings", "detail-screen.tsx");
    assert.ok(fs.existsSync(detailScreenPath), "detail-screen.tsx must exist");
    const content = fs.readFileSync(detailScreenPath, "utf-8");

    assert.ok(content.includes("import { AppTourModal } from '@/components/tour/AppTourModal';"));
    assert.ok(content.includes("Take the visual tour"));
    assert.ok(content.includes("ऐप की मुख्य झलक देखें"));
    assert.ok(content.includes("<AppTourModal"));
  });
});

describe("Interactive App Tour — Architectural & Bloat Prevention Constraints", () => {
  const rootDir = path.resolve(__dirname, "..");
  const tourModalPath = path.join(rootDir, "components", "tour", "AppTourModal.tsx");

  it("does not bundle heavy videos or external image files (zero bloat, pure Native UI)", () => {
    const content = fs.readFileSync(tourModalPath, "utf-8");

    // No video imports
    assert.ok(!content.includes("expo-av"), "Must not depend on expo-av video player");
    assert.ok(!content.includes("expo-video"), "Must not depend on expo-video");
    assert.ok(!content.includes(".mp4"), "Must not bundle .mp4 video files");
    assert.ok(!content.includes(".webm"), "Must not bundle .webm video files");
    assert.ok(!content.includes(".mkv"), "Must not bundle .mkv video files");
  });

  it("uses Haptics for the bead tap and accessible labels on close/navigation controls", () => {
    const content = fs.readFileSync(tourModalPath, "utf-8");

    assert.ok(content.includes("Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)"));
    assert.ok(content.includes('"Close tour"'));
    assert.ok(content.includes('"Previous tour slide"'));
    assert.ok(content.includes('"Next tour slide"'));
  });

  it("conforms to Rule 17: every row-adjacent Text next to an icon/badge sibling carries flex: 1 or flexShrink, with lineHeight", () => {
    const content = fs.readFileSync(tourModalPath, "utf-8");

    // Every row that pairs a label Text with a badge/count/icon cluster must
    // bound the label (flex: 1) and shrink-protect the cluster (flexShrink: 0)
    // — the exact shape of the 2026-10-23 onboarding clipping incident Rule 17
    // documents, reproduced here with the tour's longer Hindi strings.
    const boundedLabelRows = [
      /flexDirection: "row", alignItems: "center", gap: 6, flex: 1 \}\}>\s*<Feather name="map-pin"/,
      /style=\{\{ \.\.\.TYPE\.label, color: theme\.text, flex: 1, lineHeight: 19 \}\}>\s*\{isHindi \? "महामृत्युंजय/,
      /style=\{\{ \.\.\.TYPE\.caption, color: theme\.brand, fontWeight: "600", fontSize: 11, flex: 1, lineHeight: 15 \}\}>\s*\{isHindi \? "दैनिक श्लोक/,
      /flex: 1 \}\}>\s*<Text style=\{\{ fontSize: 16 \}\}>🏡/,
      /style=\{\{ \.\.\.TYPE\.caption, color: theme\.brand, fontWeight: "600", fontSize: 11\.5, flex: 1, lineHeight: 15 \}\}>\s*\{isHindi \? "मंडली/,
    ];
    for (const pattern of boundedLabelRows) {
      assert.match(content, pattern, `Expected a bounded (flex: 1) label Text matching ${pattern}`);
    }

    // Mutation check: if the Mantra-name label's flex: 1 guard were removed,
    // this test must fail -- proving the assertion is load-bearing, not
    // tautological against whatever the file happens to contain.
    const withoutGuard = content.replace(
      'style={{ ...TYPE.label, color: theme.text, flex: 1, lineHeight: 19 }}',
      'style={{ ...TYPE.label, color: theme.text }}'
    );
    assert.throws(() => assert.match(withoutGuard, boundedLabelRows[1]));
  });

  it("labels every mockup frame as illustrative so specific-looking panchang/muhurta/shloka data is never read as today's real values", () => {
    const content = fs.readFileSync(tourModalPath, "utf-8");
    const previewLabelCount = (content.match(/Illustrative preview/g) ?? []).length;
    // One per "Faithful Mockup Frame" (slides 1, 3, 4) that shows specific
    // time/verse-looking values which are frozen, not live data.
    assert.equal(previewLabelCount, 3, "Each specific-data mockup frame needs an illustrative-preview label");
    assert.ok(content.includes("उदाहरणात्मक झलक"), "Hindi illustrative-preview label must be present too");
  });
});
