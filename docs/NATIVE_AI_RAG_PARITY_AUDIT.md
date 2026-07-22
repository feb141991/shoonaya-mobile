# Native AI / RAG Parity Audit

Audit date: 2026-07-22
Scope: `/Users/Business(C)/Sanatan Sangam/Shoonaya` (PWA/web) vs `/Users/Business(C)/shoonaya-mobile` (native/Expo)

This document is the source of truth for which AI features exist in Shoonaya, how each is wired on the backend, and whether native reaches parity with the PWA. It should be updated whenever an AI route, prompt, or retrieval path changes.

## 0. AI stack overview (read this first)

All AI in this app runs through **Pramana**, Shoonaya's private AI stack, split across four workspace packages:

- `@sangam/pramana-core` — task contracts, input/output types, policy checks. No provider SDKs, no DB reads.
- `@sangam/pramana-corpus` — canonical document/chunk schema, source metadata, rights state.
- `@sangam/pramana-serve` — provider/runtime adapters, model routing, retrieval interfaces.
- `@sangam/pramana-eval` — eval/regression harness. Not production-relevant here.

App-level seam (temporary, per `PRAMANA_MODULE_MAP.md`): `src/lib/ai/{contracts,policies,context-builder,router,retrieval}.ts` + `src/lib/ai/providers/inference.ts`.

**Provider chain** (`src/lib/ai/providers/inference.ts`): `PRAMANA_INFERENCE_PROVIDER` env var selects the primary provider, default `sarvam-hosted`. Falls through a circuit-breaker (5 failures / 60s cooldown) to any configured self-hosted endpoint, and finally to `google-gemini` as a last resort. `/api/ai/chat` additionally has its own **inline** Sarvam→Gemini fallback (older code path, not yet migrated onto the shared `generateWithProvider` circuit breaker for its top-level flow, only for the `dharam_veer_reflection` sub-mode).

**RAG / retrieval**: there is **no pgvector or Postgres vector table** anywhere in this stack. Retrieval is TF‑IDF sparse-vector search (`src/lib/ai/retrieval.ts`) over static JSON indexes built offline by `python/ai_pipeline/` and shipped in the repo at `python/ai_pipeline/corpus/*.json` (`gita_index.json`, `upanishads_index.json`, `gurbani_index.json`, `buddhist_dhamma_index.json`, `jain_dharma_index.json`, `valmiki_ramayana_index.json`, `dharam_veer_index.json`). Each corpus has a registered `PramanaRetriever` (`PramanaRetrieverSelector.register(corpusId, retriever)`); if the embedding index file is missing, retrievers fall back to an exact-reference manifest lookup (`PramanaManifestRetriever`), and if manifests are also missing, to synthetic mock content (guarded by `fs.existsSync`, should never trigger in production — flagged as a content-integrity risk if the corpus files are ever missing from a deploy).

**Reasoning cache**: `src/lib/ai/reasoning-cache.ts` persists stable AI outputs (verse explanations, meaning translations, path recommendations/bridges) to a Supabase Storage bucket `shoonaya-reasoning-cache`, keyed by SHA-256 of normalized input. This is a cost control, not a RAG store. The live conversational `/api/ai/chat` route is deliberately **not** cached (each turn is fresh).

**Auth pattern**: the codebase has two auth helpers in play —
- `createServerSupabaseClient()` + `.auth.getUser()` — **cookie-only**. Works for the web app, returns no user for native (native's `apiFetch` sends `Authorization: Bearer <token>`, never cookies).
- `getApiUser(req)` (`src/lib/api-auth.ts`) — tries the cookie session first, falls back to the `Authorization: Bearer` header. This is the only pattern that works for both web and native.

Several AI routes still use the cookie-only pattern. That is the single biggest parity bug found in this audit — see §2.

## 1. Feature classification

| Feature | Classification | Live route(s) |
|---|---|---|
| Dharma Mitra chat | Live, user-facing | `POST /api/ai/chat`, `GET /api/ai/chat/usage` |
| Dharm Veer "ask Dharma Mitra about this figure" | Live, user-facing (sub-mode of the route above) | `POST /api/ai/chat` (`mode: 'dharam_veer_reflection'`) |
| Pathshala "explain this verse" | Live, user-facing, Zenith/Pro-gated | `POST /api/pathshala/explain` |
| Pathshala post-lesson reflection bridge | Live, PWA-only today | `POST /api/pathshala/bridge` |
| Pathshala AI recommendation reason | Live, PWA-only today | `POST /api/pathshala/recommend` |
| Name Story generation | Live, user-facing | `POST /api/name-story/generate` |
| TTS (recitation / mantra audio) | Live, user-facing | `POST /api/tts`, `GET /api/tts/health` |
| Localized verse meaning (i18n) | Live, user-facing (public, no auth gate) | `POST /api/i18n/meaning` |
| Japa completion insight | Live, user-facing (public, no auth gate) | `POST /api/japa/completion-insight` |
| Mood check-in / discover-track / complete / reflection-summary | Live, user-facing | `POST/GET /api/mood/{checkin,discover-track,complete,reflection-summary}` |
| Mood recommendations | Live, PWA-only today | `GET /api/mood/recommendations` |
| Dharm Veer response submission | Live, user-facing | `POST /api/dharm-veer/submit` |
| Journal reflection | Live, PWA-only, no native journal feature exists | `POST /api/journal/reflect` |
| Home personalisation copy | Live, PWA-only | `POST /api/home/personalise` |
| Sankalpa reflection | Live, PWA-only | `POST /api/sankalpa/reflection` |
| Discover-by-mood content surfacing | Live, PWA-only | `GET /api/discover/mood` |
| Daily quiz generation | Admin/internal (cron-triggered) | `POST /api/quiz/generate-daily` |
| Digest generation | Admin/internal (cron-triggered) | `POST /api/digest/generate` |
| Hindi content generator | Admin/internal | `/admin/hindi-generator` |
| Sarvam translation provider | Internal helper, not a route | `src/lib/ai/providers/sarvam-translate.ts` |
| Mock retrieval fallback in `PramanaManifestRetriever` | Experimental/dev-only safety net | n/a — only fires if corpus JSON is missing |

## 2. Live, user-facing features — full detail

### 2.1 Dharma Mitra chat

- **PWA entry point**: `src/app/(main)/ai-chat/AIChatClient.tsx`
- **Native entry point**: `app/ai-chat.tsx` (screen exists, already calls the right route) + `app/dharm-veer/[id].tsx` ("Ask Dharma Mitra" panel, same route, `mode: 'dharam_veer_reflection'`)
- **API route**: `src/app/api/ai/chat/route.ts` (POST, streamed plain text), `src/app/api/ai/chat/usage/route.ts` (GET, usage counter)
- **Auth model (before fix)**: `createServerSupabaseClient()` + `.auth.getUser()` — **cookie-only**. `usage` route used `requireUserNotBanned(supabase)`, same underlying cookie client.
- **Request contract**: `{ message, history?, tradition?, sampradaya?, city?, country?, seeking?, language?, appLanguage?, meaningLanguage?, transliterationLanguage?, mode?, figure_id? }` → streamed `text/plain` body. 429 body: `{ error: 'daily_limit_reached', used, limit, isPro }`.
- **Model/provider**: Sarvam-hosted primary (`generateWithProvider` with `providerOverride: 'sarvam-hosted'`), inline Gemini fallback if Sarvam key absent or the call throws.
- **Prompt source**: `buildSystemPrompt()` inline in the route — "Dharma Mitra" persona, tradition/rank/location/goals/spiritual-date context injected, explicit language-lock instruction.
- **RAG**: only in `mode: 'dharam_veer_reflection'` — `dharamVeerRetriever` (TF-IDF over `dharam_veer_index.json`), retrieved passages injected into a strict "answer only from these passages, cite them, and label the answer as an AI reflection" prompt.
- **Rate limit / cost guard**: `rateLimitByIp` (30 req/60s per IP) + per-user daily quota via `increment_ai_chat_usage` Postgres RPC. Limit is tiered: `FREE_DAILY_LIMIT = 25`, `PRO_DAILY_LIMIT = 200`, with `SEVA_TIER_PERKS[tier].aiChatLimit` able to grant a higher free-tier limit based on seva score.
- **Safety/religious-content guardrails**: system prompt explicitly forbids fabricating citations/rituals/mantras/medical/legal/financial certainty, and instructs the model to redirect distressed users toward grounding and trusted human support. The `dharam_veer_reflection` sub-mode additionally hard-restricts the model to the retrieved passages only and appends a mandatory "AI reflection based on verified sources" disclosure.
- **Persisted data**: `sadhana_events` (`event_type: 'ai_chat_message'`, used for usage counting via the `usage` route's own query as a secondary source of truth) + whatever `increment_ai_chat_usage` writes server-side.
- **Native parity status before this pass**: 🔴 **RED** — native already calls this route via `apiFetch` (Bearer-only), but the route only accepted cookies, so every native call returned `401`. Both the chat screen and the Dharm Veer "ask more" panel were silently broken in production. Native also hardcoded a stale `DAILY_LIMITS = { free: 5, pro: 200 }` instead of reading the real, tiered limit from `/api/ai/chat/usage` the way the PWA does.
- **Fix applied**: see §3.1.

### 2.2 Pathshala "explain this verse"

- **PWA entry point**: reader components under `src/components/pathshala/` / `src/components/bhakti/` (`CanonicalReader.tsx`, `SacredReader.tsx`) call `/api/pathshala/explain`.
- **Native entry point (before fix)**: `app/pathshala/[pathId]/[lessonId].tsx` had a button labelled "Ask Dharma Mitra about this verse" that did **not** call the explain route at all — it deep-linked to the generic `/ai-chat` screen with a canned prompt string. This bypassed the structured output, the RAG grounding, the Pro gate, and the reasoning cache entirely.
- **API route**: `src/app/api/pathshala/explain/route.ts` (POST)
- **Auth model (before fix)**: `createServerSupabaseClient()` + `.auth.getUser()` — **cookie-only**, plus a Zenith/Pro gate (`403 { error, upgrade_required: true }` for non-Pro users).
- **Request contract**: `{ sanskrit?, originalText?, transliteration?, translation?, source?, title?, tradition?, language?, responseMode?, pipelineTags?/tags? }` → `{ explanation: { word_by_word, meaning, commentary, daily_application, contemplation, related_text }, tradition, teacher, source, title, ai: { provider, model, ... } }`. On failure with any translation/original text present, falls back to a deterministic `buildFallbackExplanation()` payload with `is_fallback: true` and `ai.degraded: true` instead of erroring.
- **Model/provider**: Pramana router → `runPathshalaExplain()` → per-corpus prompt builder (`buildPathshalaExplainPrompt` / `buildUpanishadsExplainPrompt` / `buildGurbaniShabadExplainPrompt` / `buildBuddhistSutraExplainPrompt` / `buildJainSutraExplainPrompt` / `buildMoralStoryExplainPrompt` / `buildDevotionalStoryExplainPrompt`, selected by corpus/response mode) → `generateWithProvider`.
- **RAG source**: `retrievePathshalaContext()` → `SimpleCorpusSelector` picks the corpus (`pathshala_gita`, `pathshala_upanishads`, `sikh_gurbani`, `buddhist_dhamma`, `jain_dharma`, `bhakti_katha`, `bhakti_panchatantra`), then the corpus-specific `PramanaRetriever` (TF-IDF over the matching `*_index.json`, or manifest exact-match fallback) returns ranked chunks (Sanskrit/original + transliteration + translation) that get folded into the prompt.
- **Rate limit/cost guard**: no IP rate limit on this specific route (only the Pro gate + the reasoning cache, which dedupes identical requests via `withReasoningCache`). **Flagged as a gap** — see §4.
- **Safety guardrails**: `canExplain(effectiveTags.content_type)` pipeline-tag check blocks explanation for disallowed content types before any model call; deterministic fallback avoids ever showing an error screen when translation text already exists.
- **Persisted data**: none per-user; only the shared reasoning cache (Storage bucket).
- **Native parity status before this pass**: 🔴 **RED** — partial/fake feature, real contract not wired at all.
- **Fix applied**: see §3.2.

### 2.3 Name Story generation

- **PWA entry point**: `src/app/(main)/onboarding/OnboardingClient.tsx`, `src/app/(main)/sadhana/my-name/MyNameClient.tsx`
- **Native entry point**: `app/(auth)/onboarding.tsx` — **already correctly wired**.
- **API route**: `src/app/api/name-story/generate/route.ts` (POST)
- **Auth model**: `getApiUser(req)` — already Bearer-ready.
- **Request contract**: `{ name, displayName, confirmedFirstName, tradition, translationLanguage, intent: string[] }` → `{ success: true, data: NameStory }`. Native's request body and response parsing (`body?.data`) both match exactly.
- **Model/provider**: Pramana router via `generateWithProvider`, structured JSON output validated before persistence.
- **RAG**: none — this is generative naming content, not scripture retrieval.
- **Rate limit/cost guard**: relies on Supabase upsert idempotency; no dedicated IP rate limit found on this route (lower risk than chat/explain since it's gated behind onboarding, not repeatable spam-bait, but still worth a rate limit if abuse is observed).
- **Safety guardrails**: server validates the AI's JSON shape twice (`AI returned invalid structured content` / `AI returned an unexpected content shape`) before accepting it, refusing to persist malformed output.
- **Persisted data**: upserted into the name-story table (`nameStory` result).
- **Native parity status**: 🟢 **GREEN** — already correct. Only gap: native has no post-onboarding screen to view/regenerate the story later (PWA's `sadhana/my-name` page has no native equivalent) — this is a **new screen**, not a wiring fix, so it is intentionally **deferred** (see §5).

### 2.4 TTS (recitation / mantra audio)

- **PWA entry point**: `src/components/reader/ReaderShell.tsx`, `src/components/ui/MantraPlayer.tsx`, `ReciteClient.tsx`, `StotramClient.tsx`, `KathaReaderClient.tsx`
- **Native entry point (before fix)**: `app/(tabs)/japa.tsx` (`startMantraAudio`) and `app/pathshala/[pathId]/[lessonId].tsx` (recitation playback) both called a **route that does not exist**, `POST /api/tts/generate`, and expected a `{ url | audioUrl }` response.
- **API route**: `src/app/api/tts/route.ts` (POST `/api/tts`), `src/app/api/tts/health/route.ts` (GET)
- **Auth model**: cookie session is read only to check Pro status for premium voices (`pandit`/`akash`); unauthenticated/guest callers still get standard-quality audio. Effectively public — no blocking auth requirement, so native's Bearer header is harmless but unnecessary.
- **Request contract**: `{ text, quality?: 'standard'|'pandit'|'akash', rate?/speed?, language?, pipelineTags?/tags? }` → `{ audioContent: <base64 string>, meta: { provider, voiceUsed, qualityUsed, status, chunks } }`. **Not a URL** — the audio bytes come back base64-encoded in the JSON body itself.
- **Model/provider**: Sarvam `bulbul:v3` (default), Bhashini `sa-m1` for text explicitly flagged Sanskrit (`language: 'sa'`). In-memory cache + Supabase Storage cache keyed by `generateTTSCacheKey(text, provider, voice, rate, quality)`.
- **RAG**: none.
- **Rate limit/cost guard**: `rateLimitByIp` (20 req/60s per IP) + two-tier cache (memory, then Storage) before any provider call.
- **Safety guardrails**: n/a (audio synthesis of already-approved text, not generative content).
- **Persisted data**: cached audio blobs in Supabase Storage only.
- **Native parity status before this pass**: 🔴 **RED** — wrong path (404) and wrong response contract (expects a URL field that the route never returns) in **two** call sites.
- **Fix applied**: see §3.3.

### 2.5 Localized verse meaning (i18n)

- **PWA entry point**: reader components requesting non-English meanings.
- **Native entry point**: `hooks/useLocalizedMeaning.ts` — **already correctly wired**.
- **API route**: `src/app/api/i18n/meaning/route.ts` (POST)
- **Auth model**: none — no `getUser()` call gates this route at all. Effectively public.
- **Request contract**: `{ entryId, sourceMeaning, sourceLabel?, targetLanguage, pipelineTags? }` → `{ meaning, language, status: 'cached'|'reasoning_cached'|'fallback'|<generated> }`. Matches native's request/response handling exactly.
- **Model/provider**: Sarvam translation API first (`generateSarvamTranslation`), falls back to `runMeaningGenerate()` (Pramana router) if Sarvam is unavailable or fails.
- **RAG**: none — direct translation of already-known source text, not retrieval.
- **Rate limit/cost guard**: **none found** on this route (no `rateLimitByIp` call). Two layers of caching (`content_meanings` Postgres table, then the shared reasoning cache) blunt repeat-request cost, but a burst of unique `entryId`/`targetLanguage` pairs from an unauthenticated caller is not rate-limited. **Flagged as a gap** — see §4.
- **Safety guardrails**: n/a (translation of existing vetted content).
- **Persisted data**: `content_meanings` table (`entry_id`, `language`, `meaning`, `source_meaning_hash`) — acts as a permanent translation cache, keyed so a source-text edit invalidates the cached translation.
- **Native parity status**: 🟢 **GREEN** — already correct.

### 2.6 Japa completion insight

- **Native entry point**: `app/(tabs)/japa.tsx` (`/api/japa/completion-insight` after a mala session completes)
- **API route**: `src/app/api/japa/completion-insight/route.ts` (POST)
- **Auth model**: **none** — no user check at all, not even the lightweight one TTS/meaning use.
- **Request contract**: `{ tradition?, mantraName?, rounds?, totalBeads?, durationMinutes?, timeOfDay? }` → `{ insight: string | null }`. Native's call matches.
- **Model/provider**: Pramana router, `generateWithProvider` with `responseFormat: 'text'`.
- **RAG**: none — templated prompt with numeric/context substitution, no retrieval.
- **Rate limit/cost guard**: **none at all** — no auth, no IP rate limit, no cache. Every call is a fresh, uncached LLM generation reachable by anyone who can reach the endpoint. **Flagged as the most concrete cost-abuse gap found in this audit** — see §4.
- **Safety guardrails**: n/a (low-stakes reflective text, no scripture claims).
- **Persisted data**: none.
- **Native parity status**: 🟢 functionally GREEN (contract matches, already wired) but 🟡 **backend hardening gap** — see §3.4 for the fix applied.

### 2.7 Mood check-in / discover-track / complete / reflection-summary

- **Native entry point**: `components/home/MoodCheckin.tsx`, `lib/mood.ts` (`checkin`, `discover-track`, `complete`), `app/my-progress/mood.tsx` (`reflection-summary`)
- **API routes**: `src/app/api/mood/{checkin,discover-track,complete,reflection-summary}/route.ts`
- **Auth model**: all four already use `getApiUser(req)` — Bearer-ready.
- **Native parity status**: 🟢 **GREEN** — already correctly wired end-to-end, no changes needed.

### 2.8 Mood recommendations

- **API route**: `src/app/api/mood/recommendations/route.ts` — already `getApiUser(req)` (Bearer-ready).
- **Native entry point**: none — native never calls this route.
- **Native parity status**: 🟡 **DEFERRED** — backend is already parity-ready (no auth fix needed), but wiring it in requires a new UI surface in native's mood flow to actually display recommendations. Not implemented in this pass (see §5 — this is a screen/UX addition, not a "missing link" in the sense of an existing button pointed at the wrong place).

### 2.9 Dharm Veer response submission

- **Native entry point**: `app/dharm-veer.tsx` (`POST /api/dharm-veer/submit` per swipe)
- **API route**: already `getApiUser(req)` (Bearer-ready).
- **Native parity status**: 🟢 **GREEN** — already correctly wired.

## 3. Fixes implemented in this pass

All fixes below are wiring/contract/auth fixes only. No new model provider, no new RAG ingestion, no new vector schema, and no new paid AI feature were added.

### 3.1 Bearer auth on Dharma Mitra chat + usage routes

- `src/app/api/ai/chat/route.ts`: replaced `createServerSupabaseClient()` + `.auth.getUser()` with `getApiUser(req)`. Cookie sessions (web) continue to work unchanged; Bearer sessions (native) now authenticate correctly.
- `src/app/api/ai/chat/usage/route.ts`: replaced `requireUserNotBanned(supabase)` (which assumed a cookie-derived client) with `getApiUser(req)` + an inline ban check against the resolved client, preserving the exact same ban/401 behavior for both call styles.
- `app/ai-chat.tsx` (native): now fetches `/api/ai/chat/usage` on mount and after each send, mirroring the PWA's `AIChatClient.tsx`, instead of showing a hardcoded, incorrect `5/200` limit label. The real tiered limit (seva-score-aware) now displays correctly.
- No changes needed in `app/dharm-veer/[id].tsx` — it already called the right route with the right body shape; it was blocked purely by the route-side auth bug above and is unblocked by the same fix.

### 3.2 Pathshala explain — real wiring + Bearer auth

- `src/app/api/pathshala/explain/route.ts`: replaced `createServerSupabaseClient()` + `.auth.getUser()` with `getApiUser(req)`. The existing Pro-gate (`403 upgrade_required`) behavior is unchanged.
- `app/pathshala/[pathId]/[lessonId].tsx` (native): the "Ask Dharma Mitra about this verse" button now calls `POST /api/pathshala/explain` with the actual verse context (`originalText`, `transliteration`, `translation` from `localizedMeaning`/`entry.meaning`, `source: entry.source`, `title: path.title`, `tradition: path.tradition`, `language`) and renders the structured response (word-by-word, meaning, commentary, daily application, contemplation, related text) in a bottom-sheet `Modal`, matching the existing bottom-sheet convention already used elsewhere in this file's codebase (e.g. `app/kosh.tsx`). Source/citation context (`title` / `tradition` / `teacher`) is displayed under the heading. Loading state (`ActivityIndicator`) and error state (network failure, non-2xx, `upgrade_required`) are all handled explicitly instead of silently failing. Guests are routed through the existing `AuthGate` component instead of hitting a 401.
- The generic "deep-link to /ai-chat with a canned prompt" behavior was removed for this button — the real endpoint replaces it rather than running alongside it, per the no-second-flow rule.

### 3.3 TTS — correct path and response contract

- `app/(tabs)/japa.tsx` and `app/pathshala/[pathId]/[lessonId].tsx`: both call sites now call `POST /api/tts` (not the nonexistent `/api/tts/generate`), send `{ text }` (unchanged), and handle the real `{ audioContent: base64, meta }` response by constructing a `data:audio/mpeg;base64,<audioContent>` URI and passing that to `useAudioPlayer().loadAndPlay(...)` instead of looking for a `url`/`audioUrl` field that the route never sends.
- **Caveat**: `expo-audio`'s `createAudioPlayer({ uri })` is expected to accept a `data:` URI on both iOS (AVPlayer supports `data:` natively) and Android (ExoPlayer via `DataSchemeDataSource`), but this could not be verified against a real device or simulator in this environment — no device/emulator access here. Recommend a manual smoke test (play a mantra in Japa, play a recitation in Pathshala) before considering this fully green.

### 3.4 Japa completion insight — cost guard added

- `src/app/api/japa/completion-insight/route.ts`: added `rateLimitByIp` (reusing the existing helper from `src/lib/api-security.ts`, same helper already used by `/api/ai/chat` and `/api/tts`) at 10 requests/60s per IP. This does not add any new dependency or pattern — it applies an existing, already-audited helper to a route that was missing it. Full user auth was intentionally **not** added here, since the route is reachable from a screen that guests can also complete (Japa is usable without an account) and adding an auth requirement would be a behavior change beyond "wiring," not just a security fix — flagged in §4 for a product decision instead of silently gating it.

## 4. Security / cost / RAG concerns (not fixed in this pass — flagged for a decision)

1. **`/api/i18n/meaning` has no rate limit.** Two caching layers blunt repeat-request cost, but a burst of unique `(entryId, targetLanguage)` pairs from an unauthenticated caller is not throttled. Low severity (translation-only, no free-form user input reaches the model), but worth a `rateLimitByIp` pass similar to what was just added to `completion-insight`.
2. **`/api/japa/completion-insight` has no user auth**, only the new IP rate limit. Anyone who can reach the endpoint can generate text, not just signed-in users. Left as-is intentionally (see §3.4) since gating it behind auth is a product decision (Japa currently works for guests), not a pure wiring fix.
3. **`PramanaManifestRetriever` synthetic mock-data fallback** (`retrieval.ts`) will silently return fabricated placeholder verse content (clearly labeled as mock in the code, but not necessarily to the end user) if the corpus JSON files are ever missing from a deployment. This should never happen in a correctly deployed environment, but there is no runtime alarm if it does — worth a startup healthcheck that asserts the expected corpus files exist before the app starts serving explain/chat traffic.
4. **No pgvector / DB-backed vector store exists.** All retrieval is static-file TF-IDF. This is not a bug, just worth stating plainly since the audit brief asked specifically about "vector tables" — there are none; the closest analog is the JSON index files under `python/ai_pipeline/corpus/`.
5. **Gemini fallback shares full user profile context** (tradition, sampradaya, city, country, seeking) with Google's API when Sarvam fails or is unconfigured, same as the primary path. Not new behavior introduced by this audit, just noting it's an existing third-party data-sharing surface worth knowing about.

## 5. Intentionally deferred (proven live on PWA, but not implemented here)

Per the audit brief, only route-links, Bearer-auth fixes, contract mismatches, loading/error states, citation display, and guest AuthGate behavior were in scope. The following are confirmed live PWA-only features where native has **zero** existing UI surface to reconcile — building them is a new screen/feature, not a wiring fix, so they were left untouched:

- **Journal reflection** (`/api/journal/reflect`) — no native journal feature exists at all.
- **Pathshala AI recommendation reason** (`/api/pathshala/recommend`) — no native call site.
- **Pathshala post-lesson reflection bridge** (`/api/pathshala/bridge`) — no native call site.
- **Home personalisation copy** (`/api/home/personalise`) — no native call site.
- **Sankalpa reflection** (`/api/sankalpa/reflection`) — no native call site.
- **Discover-by-mood content surfacing** (`/api/discover/mood`) — no native call site.
- **Mood recommendations** (`/api/mood/recommendations`) — backend already Bearer-ready, but no native UI consumes it yet.
- **Name Story "view again" screen** — native's onboarding generation flow is fully wired (green), but there is no native equivalent of the PWA's `sadhana/my-name` page to revisit a previously generated story.

None of these require new providers, new RAG pipelines, or new vector schema if/when they are built — they would all reuse the exact same Pramana routes and retrieval infrastructure documented above.

## 6. Files changed

See the final report delivered alongside this document for the exact file list and commit hashes for both repos.
