# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Shoonaya Project Standards

### 1. Two-Repository Contract Ownership
- Treat `Sanatan Sangam/Shoonaya` as the backend/PWA repository and
  `shoonaya-mobile` as the Native repository.
- Any shared route, DTO, auth, content, notification, profile, or calendar
  change must be audited in both repositories.
- State explicitly which repository owns the canonical contract.
- Never maintain manually edited duplicate catalogues when a generated,
  versioned snapshot can provide Native offline support.

### 2. Calendar Governance
- Never derive an observance date in UI code when canonical,
  profile-qualified occurrence data exists.
- Never change `masaName`, evaluator flags, materialisation flags, council
  decisions, locked rows, or manual overrides outside an explicitly scoped
  calendar task.
- Never publish, notify, award karma, or present a final date for unresolved,
  disputed, fallback, unaudited, unverified, or withheld occurrences.
- Distinguish astronomical instant, local civil date, spiritual date,
  calendar profile, sampradaya, location and timezone.
- Calendar migrations must be tested against a shadow/Supabase branch before
  production.

### 3. Spiritual Content Integrity
- Never fabricate scripture, mantra, quotation, translation, ritual rule,
  source, page number, source tier, rights status or council approval.
- Separate verbatim public-domain text, licensed text, sourced translation
  and Shoonaya-curated explanation.
- Unsupported content must remain withheld or explicitly labelled, never
  filled with generic prose.
- Tradition-specific claims must carry applicable tradition, sampradaya,
  region and source metadata.

### 4. Database and Auth Safety
- Derive user identity server-side; never trust a request-body user ID.
- Shared Native/PWA routes must explicitly support Bearer and cookie auth
  through the established helper.
- Private writes must be atomic, idempotent and protected by database
  constraints, not only application checks.
- Every migration requires RLS review, privilege review, rollback guidance,
  generated type updates and applied/unapplied environment reporting.
- Never expose service-role credentials or production secrets.

### 5. Cache and Identity Isolation
- Every persisted client cache must define its key dimensions: user, guest,
  profile, tradition, timezone/location, language and content version.
- Clear private caches on sign-out or account switch.
- Never display one user's cached profile-qualified data to another user.
- Offline data must disclose when timing/date information may be stale.

### 6. Notification Delivery
- Trace notification creation through eligibility, canonical occurrence,
  user preference, OS permission, local timezone, quiet hours, dedupe,
  database insertion, provider send, receipt checking and tap routing.
- Distinguish in-app notification creation from OS push delivery.
- Never claim delivery from token registration or a successful provider
  ticket alone.
- D-7, D-1 and D0 keys must not overlap with legacy tithi or OneSignal keys.
- Real-device evidence is required before calling Android/iOS push
  release-ready.

### 7. Platform and Build Precision
- Keep these states distinct: committed, pushed, deployed, built, installed,
  launched and smoke-tested.
- Distinguish local Android APK/AVD, EAS preview standalone APK,
  Play production AAB, local iOS Simulator build and App Store/TestFlight IPA.
- Never claim an AVD or Simulator is updated without reporting the installed
  artifact/build identity.
- iOS Simulator cannot prove remote push delivery.

### 8. UI and Motion Verification
- Preserve established Shoonaya tokens and shared components.
- Do not redesign unrelated Home, Hero, navigation or profile surfaces.
- Verify Android and iOS, light/dark mode, text scaling, reduced motion,
  loading/error/empty/offline states and 44px touch targets.
- Do not claim pixel parity between PWA and Native; require equivalent
  content, actions, states, accessibility and platform-appropriate quality.
- Do not add animation dependencies or decorative loops without measured need.

### 9. Performance Evidence
- Measure before and after: request count, query count, render/mount count,
  bundle impact, cache behavior and server timing.
- Do not claim 60fps, 120Hz, lower CPU, lower memory or better battery life
  without repeatable device profiling.
- Prefer removal of redundant work over adding caching or infrastructure.

### 10. Delivery and Repository Hygiene
- Inspect both working trees before editing.
- Preserve unrelated and parallel changes.
- One scoped objective and one scoped commit per prompt.
- Report every changed file and prove unrelated dirty files were not staged.
- Never push, deploy, apply production migrations, trigger production
  notifications or start paid infrastructure without explicit approval.
- Report test results as passed, failed and skipped; never present only the
  passed count as the full denominator.

## Styling — match existing DNA, never invent

`lib/constants.ts` is the single source of truth: `COLORS`, `themeColor(isDark)`
(the `theme.*` object — `bg/card/border/borderSoft/text/dim/brand/brandSoft/
glass/premiumBorder/accent/earth`), `FONTS`, `TYPE`, `RADII`, `SPACING`,
`SHADOWS`. Every color, font, radius, spacing, and shadow value used anywhere
in the app should trace back to a named export in this one file — never a
fresh hex/rgba literal, never inline opacity math on top of an already-alpha
token (e.g. `opacity: 0.6` on a View whose `backgroundColor` is already
`rgba(...,0.12)` — the two multiply, silently producing ~7% effective alpha).
If a token doesn't exist yet for what you need, add it to `lib/constants.ts`
with a comment explaining where the value came from (PWA parity, an existing
sibling token, etc.) — don't invent a one-off in the component file.

**Before styling anything, grep 2-3 existing screens doing something similar
and copy their exact pattern** (colors, radius, shadow, icon treatment) rather
than deriving a new one. Concretely:
- Decorative backdrop glow/bubbles → copy `app/(tabs)/japa.tsx`'s launcher
  backdrop circles (`theme.brandSoft` + `COLORS.navGlow*Light/Dark`,
  `pointerEvents="none"`, absolutely positioned, bleeding off-edge).
- Card/surface → use the `Card` component (`components/ui/Card.tsx`,
  24px radius) or `Surface`, not a bare `View` with hand-rolled
  border/shadow, unless an existing screen's bare-View pattern is what
  you're matching.
- Icon wells / feature-identity icons → check `components/ui/SacredIcon.tsx`
  first (full-color clay-art assets exist for most features); don't drop
  back to a plain `Feather` glyph if a matching asset already exists.
- Pills/chips/buttons → match `TYPE.chip`/`TYPE.section` and the
  `PressableSurface` component, not ad hoc `Text`+`View` styling.

`docs/NATIVE_VISUAL_DEBT_MATRIX.md` inventories known, already-tracked
styling debt (untokenized rgba literals, bare `COLORS.brandGold` instead of
the theme-aware pair, etc.) — check it before "fixing" something that's
already a deliberate, deferred item there, and update it if you fix one.

If a styling change goes through more than one back-and-forth with the user
in a session, that's the signal to stop iterating on values and instead go
find the actual existing precedent to copy — say explicitly which existing
screen/pattern you matched, so it can be verified without another round
trip.

## graphify

This project has a source-scoped graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `./scripts/graphify-update-source.sh` to keep the graph current (AST-only, no API cost)
- Do not run `graphify update .` directly in this repo; it includes node_modules and produces dependency noise instead of saving tokens.
