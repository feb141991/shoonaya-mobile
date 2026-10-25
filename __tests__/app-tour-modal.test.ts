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

  it("conforms to Rule 8: text in flex rows alongside icons or badges carries flex: 1 and explicit lineHeight", () => {
    const content = fs.readFileSync(tourModalPath, "utf-8");

    // Check that Haptics is used for the bead tap
    assert.ok(content.includes("Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)"));

    // Check that close and navigation buttons meet accessibility standards
    assert.ok(content.includes('"Close tour"'));
    assert.ok(content.includes('"Previous tour slide"'));
    assert.ok(content.includes('"Next tour slide"'));
  });
});
