import type { AppLanguage } from '@/lib/language-runtime';

/**
 * The words shown next to the e-mail switches, by wording version (the backend names the version for a person's region:
 * docs/EMAIL_CONSENT_PLAN.md in the backend repository). The version the person was shown is recorded with their choice.
 *
 *   eu-uk-v1   EEA, UK, Switzerland, and any region the backend cannot determine (the strictest: it says plainly that nothing is sent
 *              unless the switch is turned on, and where and how to turn it off).
 *   global-v1  everywhere else (the text onboarding has always shown).
 *
 * Hindi is a plain translation that has not been reviewed by a native reader or a lawyer. Any other language shows the English text.
 * A version this build does not know shows the strictest text.
 */
export type EmailWordingVersion = 'eu-uk-v1' | 'global-v1';
export const EMAIL_WORDING_VERSIONS: readonly EmailWordingVersion[] = ['eu-uk-v1', 'global-v1'];
export const STRICTEST_EMAIL_WORDING: EmailWordingVersion = 'eu-uk-v1';

export type EmailChoiceCopy = { label: string; help: string };
export type EmailWordingCopy = {
  newsletter: EmailChoiceCopy;
  festivals: EmailChoiceCopy;
  /** Shown under the switches in Settings: what is not affected, and where the choice can be changed. */
  note: string;
};

type Text = { en: string; hi: string };

const NEWSLETTER_LABEL: Text = { en: 'Occasional email from Shoonaya', hi: 'Shoonaya से कभी-कभार ईमेल' };
const FESTIVALS_LABEL: Text = { en: 'Festival emails', hi: 'पर्व के ईमेल' };

const NEWSLETTER_HELP: Record<EmailWordingVersion, Text> = {
  'global-v1': {
    en: 'New features, festival guides and a weekly newsletter. Optional, and you can unsubscribe at any time.',
    hi: 'नई सुविधाएँ, पर्व मार्गदर्शन और साप्ताहिक न्यूज़लेटर। वैकल्पिक, और आप कभी भी सदस्यता छोड़ सकते हैं।',
  },
  'eu-uk-v1': {
    en: 'New features, festival guides and a weekly newsletter. Optional: we email you only if you turn this on. You can turn it off at any time in Settings, then Email, or with the link in every email.',
    hi: 'नई सुविधाएँ, पर्व मार्गदर्शन और साप्ताहिक न्यूज़लेटर। वैकल्पिक: आप चालू करेंगे तभी हम ईमेल भेजेंगे। आप इसे कभी भी सेटिंग्स → ईमेल में, या हर ईमेल के लिंक से बंद कर सकते हैं।',
  },
};

const FESTIVALS_HELP: Record<EmailWordingVersion, Text> = {
  'global-v1': {
    en: 'A note before upcoming festivals and sacred days. Optional, and you can unsubscribe at any time.',
    hi: 'आने वाले पर्वों और पावन दिनों से पहले एक संदेश। वैकल्पिक, और आप कभी भी सदस्यता छोड़ सकते हैं।',
  },
  'eu-uk-v1': {
    en: 'A note before upcoming festivals and sacred days. Optional: we email you only if you turn this on. You can turn it off at any time in Settings, then Email, or with the link in every email.',
    hi: 'आने वाले पर्वों और पावन दिनों से पहले एक संदेश। वैकल्पिक: आप चालू करेंगे तभी हम ईमेल भेजेंगे। आप इसे कभी भी सेटिंग्स → ईमेल में, या हर ईमेल के लिंक से बंद कर सकते हैं।',
  },
};

const NOTE: Text = {
  en: 'Account emails, such as sign-in alerts, are not optional and are not affected by these choices.',
  hi: 'खाते से जुड़े ईमेल, जैसे साइन-इन अलर्ट, वैकल्पिक नहीं हैं और इन विकल्पों से प्रभावित नहीं होते।',
};

export function normaliseEmailWording(value: unknown): EmailWordingVersion {
  return typeof value === 'string' && (EMAIL_WORDING_VERSIONS as readonly string[]).includes(value)
    ? (value as EmailWordingVersion)
    : STRICTEST_EMAIL_WORDING;
}

function pick(text: Text, language: AppLanguage): string {
  return language === 'hi' ? text.hi : text.en;
}

export function emailWordingCopy(version: unknown, language: AppLanguage): EmailWordingCopy {
  const v = normaliseEmailWording(version);
  return {
    newsletter: { label: pick(NEWSLETTER_LABEL, language), help: pick(NEWSLETTER_HELP[v], language) },
    festivals: { label: pick(FESTIVALS_LABEL, language), help: pick(FESTIVALS_HELP[v], language) },
    note: pick(NOTE, language),
  };
}
