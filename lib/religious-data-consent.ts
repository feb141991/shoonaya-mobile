import type { TraditionKey, LanguageKey } from './onboarding-contract';

/**
 * Explicit consent for religious data during onboarding.
 *
 * A person's tradition (and the birth details that follow it: date of birth, nakshatra, rashi, gotra)
 * is religious and personal information. Before this existed, tapping a tradition saved it to the account
 * straight away and the consent column (`profiles.consent_religious_data`, default false) was never asked
 * for, so the server held a tradition for people who had never agreed and then ignored it everywhere it
 * personalises. Now:
 *   - choosing a tradition shows a switch that is OFF until the person turns it on;
 *   - nothing about the tradition is written to the account until it is on;
 *   - the way to say no is the "Universal / Exploring" choice, which stores no tradition at all;
 *   - the choice is saved in the same row, with `consent_updated_at`, and can be changed in Settings.
 *
 * Everything here is pure so the rules can be tested without a screen.
 */

/** Only "Universal / Exploring" (and not yet having chosen) carries no religious information. */
export function traditionNeedsReligiousDataConsent(tradition: TraditionKey | null): boolean {
  return tradition !== null && tradition !== 'none';
}

/** The tradition that may be stored: the chosen one only with consent, otherwise the neutral choice. */
export function storableTradition(tradition: TraditionKey | null, consented: boolean): TraditionKey {
  if (tradition === null) return 'none';
  return traditionNeedsReligiousDataConsent(tradition) && !consented ? 'none' : tradition;
}

export function canLeavePreferences({
  tradition,
  language,
  religiousDataConsent,
}: {
  tradition: TraditionKey | null;
  language: LanguageKey | null;
  religiousDataConsent: boolean;
}): boolean {
  if (!tradition || !language) return false;
  return !traditionNeedsReligiousDataConsent(tradition) || religiousDataConsent;
}

export type ReligiousConsentWrite = Partial<{
  tradition: TraditionKey;
  consent_religious_data: boolean;
  consent_updated_at: string;
}>;

/**
 * What to save on the account right after a tradition is tapped. `null` means save nothing: a faith tradition
 * is held on the device only until the person agrees. Choosing the neutral option stores it, and also records
 * a withdrawal if the person had agreed a moment earlier for a different tradition.
 */
export function planTraditionTap({
  tradition,
  hadConsent,
  now,
}: {
  tradition: TraditionKey;
  hadConsent: boolean;
  now: string;
}): ReligiousConsentWrite | null {
  if (!traditionNeedsReligiousDataConsent(tradition)) {
    return hadConsent
      ? { tradition: 'none', consent_religious_data: false, consent_updated_at: now }
      : { tradition: 'none' };
  }
  return hadConsent ? { tradition } : null;
}

/**
 * What to save when the switch is turned on or off. Turning it off removes the tradition that was stored only
 * because of the agreement, so withdrawing in the middle of onboarding does not leave it behind.
 */
export function planConsentChange({
  tradition,
  agreed,
  now,
}: {
  tradition: TraditionKey | null;
  agreed: boolean;
  now: string;
}): ReligiousConsentWrite | null {
  if (!tradition || !traditionNeedsReligiousDataConsent(tradition)) return null;
  return agreed
    ? { tradition, consent_religious_data: true, consent_updated_at: now }
    : { tradition: 'none', consent_religious_data: false, consent_updated_at: now };
}

export const RELIGIOUS_DATA_CONSENT_COPY = {
  en: {
    title: 'Your tradition is personal information',
    body:
      'Your tradition, and the birth details you may add next (date of birth, nakshatra, rashi, gotra), are religious and personal information. With your permission, Shoonaya saves them to your account to tailor your calendar, reminders, practice and guidance.',
    switchLabel: 'I agree to Shoonaya saving and using these details',
    switchHint: 'Off by default. Turn it on to continue with this tradition.',
    needed: 'To continue with this tradition, turn this on, or choose Universal / Exploring above.',
    footer:
      'You can change this any time in Settings, under Privacy & Data, and delete your account and data there too. Prefer not to share? Choose Universal / Exploring and nothing about your tradition is saved to your account.',
  },
  hi: {
    title: 'आपकी परंपरा निजी जानकारी है',
    body:
      'आपकी परंपरा और जो जन्म विवरण आप आगे जोड़ सकते हैं (जन्म तिथि, नक्षत्र, राशि, गोत्र) धार्मिक और व्यक्तिगत जानकारी हैं। आपकी अनुमति से Shoonaya इन्हें आपके खाते में सहेजता है, ताकि पंचांग, स्मरण, साधना और मार्गदर्शन आपके अनुरूप हो सके।',
    switchLabel: 'मैं सहमत हूँ कि Shoonaya ये विवरण सहेजे और उपयोग करे',
    switchHint: 'यह पहले से बंद है। इस परंपरा के साथ आगे बढ़ने के लिए इसे चालू करें।',
    needed: 'इस परंपरा के साथ आगे बढ़ने के लिए इसे चालू करें, या ऊपर “सार्वभौमिक / अन्वेषण” चुनें।',
    footer:
      'आप इसे कभी भी सेटिंग्स में “Privacy & Data” के अंतर्गत बदल सकते हैं, और वहीं से अपना खाता व डेटा हटा सकते हैं। साझा नहीं करना चाहते? “सार्वभौमिक / अन्वेषण” चुनें; आपकी परंपरा के बारे में कुछ भी आपके खाते में सहेजा नहीं जाएगा।',
  },
} as const;
