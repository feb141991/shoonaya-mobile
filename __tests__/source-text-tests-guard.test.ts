import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

// AGENTS.md section 36. A test that reads a source file as text and greps it with a regular expression proves that a
// pattern exists, not that the code works: it passes when the behaviour is broken and fails when the code is
// harmlessly reorganised. New tests render the component and press its buttons (__component_tests__/, run by
// `npm run test:components`) or call the logic. The files below were written the old way before this rule: each
// has a ceiling equal to its count of grep assertions on 2026-11-13. A ceiling only goes down, and converting a test
// (or deleting an assertion that a render test now covers) is how it does.
const ROOT = join(__dirname, '..');
const TEST_DIRS = ['__tests__', 'tests'];
// A stale ceiling this far above the real count is slack someone could grow back into.
const CEILING_SLACK = 5;

// Read project configuration (package.json, the ESLint config, the CI workflow) or are this guard's own checker tests, not UI source.
const EXEMPT = new Set<string>(['__tests__/lint-ratchet.test.ts', '__tests__/source-text-tests-guard.test.ts']);

export function sourceTextAssertions(text: string): number {
  if (!text.includes('readFileSync(')) return 0;
  return (text.match(/assert\.(?:match|doesNotMatch)\(/g) ?? []).length;
}

export function findSourceTextViolations(counts: Record<string, number>, ceilings: Record<string, number>, exempt: Set<string> = EXEMPT): string[] {
  const problems: string[] = [];
  for (const [file, count] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    if (exempt.has(file) || count === 0) continue;
    const ceiling = ceilings[file];
    if (ceiling === undefined) {
      problems.push(`${file}: ${count} grep assertion(s) on source text and the file is not in the list. Test behaviour instead: render the component (__component_tests__/) or call the logic. Do not add the file to the list.`);
    } else if (count > ceiling) {
      problems.push(`${file}: ${count} grep assertions, over its ceiling of ${ceiling}. Replace the new ones with behaviour tests; never raise the ceiling.`);
    } else if (ceiling - count > CEILING_SLACK) {
      problems.push(`${file}: down to ${count} grep assertions but its ceiling is still ${ceiling}. Lower the ceiling to ${count} so it cannot grow back.`);
    }
  }
  for (const file of Object.keys(ceilings)) {
    if (!(file in counts) || counts[file] === 0) problems.push(`${file}: listed, but it no longer greps source text. Delete its entry from the list.`);
  }
  return problems;
}

// Test files that grep source text on 2026-11-13, with their number of grep assertions then. This list may only shrink.
const SOURCE_TEXT_CEILINGS: Record<string, number> = {
  '__tests__/sanskara-data.test.ts': 69,
  '__tests__/private-export-files.test.ts': 61,
  '__tests__/app-identity-ownership.test.ts': 56,
  '__tests__/mahabharata-dyuta-screen.test.ts': 46,
  '__tests__/reader-navigation-and-audio.test.ts': 37,
  '__tests__/query-read-failure-guards.test.ts': 36,
  '__tests__/onboarding-shell-integration.test.ts': 30,
  '__tests__/panchatantra-wisdom-actions-contract.test.ts': 30,
  'tests/rashiphala-guidance-surface.test.ts': 30,
  '__tests__/save-error.test.ts': 29,
  '__tests__/vansh-screen-contract.test.ts': 29,
  '__tests__/mandali-guest-readonly.test.ts': 28,
  '__tests__/sanskara-birth-date.test.ts': 27,
  '__tests__/notification-tap-consent.test.ts': 25,
  '__tests__/sanskara-handover-banner.test.ts': 25,
  '__tests__/sanskara-managers.test.ts': 22,
  '__tests__/login-two-step-contract.test.ts': 21,
  '__tests__/panchatantra-storybook.test.ts': 21,
  '__tests__/dharm-veer-localization.test.ts': 19,
  '__tests__/onboarding-notification-choices.test.ts': 19,
  '__tests__/sacred-days-deck.test.ts': 19,
  '__tests__/notification-tap-tracking.test.ts': 18,
  '__tests__/shloka-profile-error.test.ts': 18,
  '__tests__/mandali-post-card-layout.test.ts': 17,
  'tests/kundali-profile-prefill.test.ts': 17,
  '__tests__/home-guest-calendar-empty-state.test.ts': 16,
  '__tests__/mandali-comment-pending-retry.test.ts': 16,
  '__tests__/mandali-post-options.test.ts': 16,
  '__tests__/dharma-mitra-chat-sheet-keyboard.test.ts': 15,
  '__tests__/religious-data-consent.test.ts': 15,
  '__tests__/sanskara-early-handover.test.ts': 15,
  '__tests__/kul-snapshot-resilience.test.ts': 14,
  '__tests__/pathshala-completion-share.test.ts': 14,
  '__tests__/language-awareness-regressions.test.ts': 13,
  '__tests__/mantras-panchang-loader-migration.test.ts': 13,
  '__tests__/notification-destination.test.ts': 13,
  '__tests__/performance-waterfall-contract.test.ts': 13,
  '__tests__/startup-visibility.test.ts': 13,
  'tests/pathshala-completion.test.ts': 13,
  '__tests__/app-identity-ownership-batch2.test.ts': 12,
  '__tests__/quote-card.test.ts': 12,
  '__tests__/sacred-days-carousel-auto-advance.test.ts': 12,
  '__tests__/settings-nav-clearance-and-time-picker.test.ts': 12,
  '__tests__/mandali-post-reactions-visibility.test.ts': 11,
  '__tests__/tirtha-visit-flow.test.ts': 11,
  '__tests__/vrat-loader-migration.test.ts': 11,
  'tests/verse-navigation.test.ts': 11,
  '__tests__/consent-wording.test.ts': 10,
  '__tests__/japa-sound-nav-visibility.test.ts': 10,
  '__tests__/mandali-realtime-focus-lifecycle.test.ts': 10,
  '__tests__/profile-screen-hierarchy.test.ts': 10,
  '__tests__/reader-listening.test.ts': 10,
  '__tests__/reader-progress-account-switch-protection.test.ts': 10,
  'tests/location-sync-persistence.test.ts': 10,
  '__tests__/japa-bead-ring.test.ts': 9,
  '__tests__/kul-universal-invitation-contract.test.ts': 9,
  '__tests__/mood-navigation-clearance.test.ts': 9,
  '__tests__/onboarding-marketing-optin-contract.test.ts': 9,
  '__tests__/android-pressable-surface-flex-and-nav-clearance.test.ts': 8,
  '__tests__/auth-lifecycle-contract.test.ts': 8,
  '__tests__/dharma-mitra-chat-sheet-visibility.test.ts': 8,
  '__tests__/notification-production-surface.test.ts': 8,
  '__tests__/home-panchang-unavailable-state.test.ts': 7,
  '__tests__/language-context.test.ts': 7,
  '__tests__/quiz-seva-loader-migration.test.ts': 7,
  '__tests__/home-customisation-settings.test.ts': 6,
  '__tests__/reader-chapters.test.ts': 6,
  '__tests__/sanskara-cache.test.ts': 6,
  '__tests__/saved-dates-and-errors-contract.test.ts': 6,
  '__tests__/settings-write-coordinator.test.ts': 6,
  '__tests__/declaration-english-only.test.ts': 5,
  '__tests__/festival-date-governance.test.ts': 5,
  '__tests__/login-signin-signup-separation.test.ts': 5,
  '__tests__/mandali-comment-duplicate-fetch-fix.test.ts': 5,
  '__tests__/mandali-loadmore-identity-guard.test.ts': 5,
  '__tests__/mood-loader-migration.test.ts': 5,
  '__tests__/profile-load-telemetry-and-waterfall.test.ts': 5,
  '__tests__/reading-progress.test.ts': 5,
  '__tests__/rejected-session.test.ts': 5,
  '__tests__/telemetryUploadPolicy.test.ts': 5,
  '__tests__/user-scoped-storage.test.ts': 5,
  'tests/product-analytics-runtime-isolation.test.ts': 5,
  '__tests__/home-unique-child-keys.test.ts': 4,
  '__tests__/language-options.test.ts': 4,
  '__tests__/lineage-layout.test.ts': 4,
  '__tests__/reader-request-lifecycle.test.ts': 4,
  '__tests__/yatra-layout.test.ts': 4,
  '__tests__/account-deletion-copy.test.ts': 3,
  '__tests__/ai-citations.test.ts': 3,
  '__tests__/bhakti-loader-migration.test.ts': 3,
  '__tests__/birth-profiles-safety.test.ts': 3,
  '__tests__/dharm-veer-celebration.test.ts': 3,
  '__tests__/observance-series-content.test.ts': 3,
  '__tests__/panchang-first-paint.test.ts': 3,
  '__tests__/shloka-today.test.ts': 3,
  '__tests__/android-release-optimization.test.ts': 2,
  '__tests__/app-tour-modal.test.ts': 2,
  '__tests__/coldStartAuthGateOrdering.test.ts': 2,
  '__tests__/japa-presentation.test.ts': 2,
  '__tests__/kul-pitru-paksha-link.test.ts': 2,
  '__tests__/mandali-post-delete-verification.test.ts': 2,
  '__tests__/shloka-celebration.test.ts': 2,
  '__tests__/system-link-intent.test.ts': 2,
  '__tests__/authCoordinator-integration.test.ts': 1,
  '__tests__/bottom-nav-kul-centre.test.ts': 1,
  '__tests__/mood-pill-visual-parity.test.ts': 1,
  '__tests__/onboarding-step-layout.test.ts': 1,
  '__tests__/settings-notification-toggles.test.ts': 1,
};

describe('tests prove behaviour, not that a pattern exists in the source', () => {
  const counts: Record<string, number> = {};
  for (const dir of TEST_DIRS) {
    for (const name of readdirSync(join(ROOT, dir))) {
      if (!name.endsWith('.test.ts')) continue;
      counts[`${dir}/${name}`] = sourceTextAssertions(readFileSync(join(ROOT, dir, name), 'utf8'));
    }
  }

  it('scans the test folders (a guard that scans nothing guards nothing)', () => {
    assert.ok(Object.keys(counts).length > 200, `only ${Object.keys(counts).length} test files scanned`);
    assert.ok('__tests__/japa-bead-ring.test.ts' in counts);
  });

  it('no test file greps source text more than its ceiling, and no new one greps it at all', () => {
    const problems = findSourceTextViolations(counts, SOURCE_TEXT_CEILINGS);
    assert.deepEqual(problems, [], `\n${problems.join('\n')}\n`);
  });

  it('there are component tests, so the way forward exists', () => {
    const components = readdirSync(join(ROOT, '__component_tests__')).filter((name) => name.endsWith('.test.tsx'));
    assert.ok(components.length >= 2, `${components.length} component test files`);
  });
});

describe('the guard itself', () => {
  const ceilings = { '__tests__/a.test.ts': 10 };

  it('counts only regex assertions in a file that reads source', () => {
    assert.equal(sourceTextAssertions("readFileSync('x'); assert.match(a, /b/); assert.doesNotMatch(c, /d/);"), 2);
    assert.equal(sourceTextAssertions('assert.match("abc", /b/);'), 0);
    assert.equal(sourceTextAssertions("readFileSync('x'); assert.equal(1, 1);"), 0);
  });

  it('accepts a listed file at or just under its ceiling', () => {
    assert.deepEqual(findSourceTextViolations({ '__tests__/a.test.ts': 10 }, ceilings, new Set()), []);
    assert.deepEqual(findSourceTextViolations({ '__tests__/a.test.ts': 6 }, ceilings, new Set()), []);
  });

  it('rejects a listed file that gained grep assertions', () => {
    assert.equal(findSourceTextViolations({ '__tests__/a.test.ts': 11 }, ceilings, new Set()).length, 1);
  });

  it('rejects a new test file that greps source at all', () => {
    const problems = findSourceTextViolations({ '__tests__/a.test.ts': 10, '__tests__/new.test.ts': 1 }, ceilings, new Set());
    assert.equal(problems.length, 1);
    assert.match(problems[0], /new\.test\.ts.*not in the list/);
  });

  it('asks for the ceiling to be lowered once assertions are removed, and for the entry to go at zero', () => {
    assert.equal(findSourceTextViolations({ '__tests__/a.test.ts': 4 }, ceilings, new Set()).length, 1);
    assert.equal(findSourceTextViolations({ '__tests__/a.test.ts': 0 }, ceilings, new Set()).length, 1);
    assert.equal(findSourceTextViolations({}, ceilings, new Set()).length, 1);
  });

  it('lets exempt files grep their own kind of text', () => {
    assert.deepEqual(findSourceTextViolations({ '__tests__/lint-ratchet.test.ts': 99 }, {}, new Set(['__tests__/lint-ratchet.test.ts'])), []);
  });
});
