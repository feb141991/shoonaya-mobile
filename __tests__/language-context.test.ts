import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SUPPORTED_APP_LANGUAGES, isAppLanguage } from '../lib/language-runtime';

describe('Unified Language Architecture & Provider Integrity', () => {
  const contextSource = readFileSync(join(process.cwd(), 'lib/i18n/LanguageContext.tsx'), 'utf8');

  it('supports the canonical app languages en, hi, and pa', () => {
    assert.deepEqual(SUPPORTED_APP_LANGUAGES, ['en', 'hi', 'pa']);
    assert.equal(isAppLanguage('en'), true);
    assert.equal(isAppLanguage('hi'), true);
    assert.equal(isAppLanguage('pa'), true);
    assert.equal(isAppLanguage('fr'), false);
  });

  it('defines persistent storage keys matching mobile and PWA contracts', () => {
    assert.ok(contextSource.includes("export const APP_LANGUAGE_STORAGE_KEY = '@shoonaya/app_language'"));
    assert.ok(contextSource.includes("export const LEGACY_CHAT_LANGUAGE_KEY = '@shoonaya/chat_language'"));
    assert.ok(contextSource.includes("export const PWA_STORAGE_KEY = 'shoonaya-app-lang'"));
  });

  it('mounts LanguageProvider in AppProviders root layout', () => {
    const source = readFileSync(join(process.cwd(), 'components/providers/AppProviders.tsx'), 'utf8');
    assert.ok(source.includes("import { LanguageProvider } from '@/lib/i18n/LanguageContext'"));
    assert.ok(source.includes('<LanguageProvider>{children}</LanguageProvider>'));
  });

  it('connects all reader screens to useLanguage', () => {
    const vratSource = readFileSync(join(process.cwd(), 'app/vrat/[slug].tsx'), 'utf8');
    assert.ok(vratSource.includes("useLanguage"));
    assert.ok(!vratSource.includes("useState<'en' | 'local'>('en')"), 'Vrat reader must not have isolated local language state');

    const festivalSource = readFileSync(join(process.cwd(), 'app/festival/[slug].tsx'), 'utf8');
    assert.ok(festivalSource.includes("useLanguage"));
    assert.ok(!festivalSource.includes("useState<'en' | 'local'>('en')"), 'Festival reader must not have isolated local language state');

    const dharmVeerSource = readFileSync(join(process.cwd(), 'app/dharm-veer/[id].tsx'), 'utf8');
    assert.ok(dharmVeerSource.includes("useLanguage"));
    assert.ok(!dharmVeerSource.includes("useState<'en' | 'local'>('en')"), 'Dharm Veer reader must not have isolated local language state');

    const kathaSource = readFileSync(join(process.cwd(), 'app/bhakti/katha/[id].tsx'), 'utf8');
    assert.ok(kathaSource.includes("useLanguage"));
    assert.ok(!kathaSource.includes("useState<'en' | 'hi' | 'pa'>('en')"), 'Katha reader must not have isolated local language state');

    const stotramSource = readFileSync(join(process.cwd(), 'app/bhakti/stotram/[id].tsx'), 'utf8');
    assert.ok(stotramSource.includes("useLanguage"));
    assert.ok(!stotramSource.includes("useState<'en' | 'hi' | 'pa'>('en')"), 'Stotram reader must not have isolated local language state');

    const pathshalaSource = readFileSync(join(process.cwd(), 'app/pathshala/[pathId]/[lessonId].tsx'), 'utf8');
    assert.ok(pathshalaSource.includes("useLanguage"));
    assert.ok(!pathshalaSource.includes("useState<'en' | 'hi'>('en')"), 'Pathshala reader must not have isolated local language state');
  });

  it('connects AI Chat and localizes Dharma Mitra badge', () => {
    const chatHook = readFileSync(join(process.cwd(), 'hooks/useAiChat.ts'), 'utf8');
    assert.ok(chatHook.includes("useLanguage"));
    assert.ok(chatHook.includes("activeLanguage = globalLanguage"));

    const chatScreen = readFileSync(join(process.cwd(), 'app/ai-chat.tsx'), 'utf8');
    assert.ok(chatScreen.includes("language === 'hi' ? 'दिव्य वाणी' : language === 'pa' ? 'ਦਿਵਯ ਬਾਣੀ' : 'Divine Voice'"));

    const chatSheet = readFileSync(join(process.cwd(), 'components/home/DharmaMitraChatSheet.tsx'), 'utf8');
    assert.ok(chatSheet.includes("language === 'hi' ? 'दिव्य वाणी' : language === 'pa' ? 'ਦਿਵਯ ਬਾਣੀ' : 'Divine Voice'"));
  });

  // F03 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md): LanguageContext
  // used to run its own supabase.auth.getUser()/onAuthStateChange instead
  // of the root-owned identity, duplicating ownership and missing the
  // sign-out case entirely (no branch for a null session).
  it('consumes the root-owned identity instead of its own auth subscription', () => {
    assert.doesNotMatch(contextSource, /supabase\.auth\.getUser\(\)/);
    assert.doesNotMatch(contextSource, /supabase\.auth\.onAuthStateChange/);
    assert.match(contextSource, /useAppIdentity\(\)/);
    assert.match(contextSource, /captureAppIdentity\(\)/);
    assert.match(contextSource, /getAppIdentity\(\)/);
    // The sign-out/guest branch must exist and must not be a no-op --
    // the old code silently left a just-signed-out user's language visible.
    assert.match(contextSource, /if \(identity\.kind !== 'authenticated'\)\s*\{/);
  });
});
