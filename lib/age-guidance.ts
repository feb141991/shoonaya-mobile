export const AGE_GUIDANCE_VERSION = '2026-08-25.parental-guidance-v1';

export const AGE_GUIDANCE_POLICY = {
  version: AGE_GUIDANCE_VERSION,
  accountAccess: 'allowed_without_age_block',
  guidanceAge: 18,
  directedToChildrenUnder13: false,
  verifiedParentalConsentImplemented: false,
  legalReviewStatus: 'pending',
  notice: {
    en: {
      title: 'A note for younger seekers',
      body: 'If you are under 18, please continue with the awareness and guidance of a parent or guardian, especially when adding personal, birth, family, location, or community information.',
      under18Body: 'Because you are under 18, please continue with the awareness and guidance of a parent or guardian, especially when adding personal, birth, family, location, or community information.',
    },
    hi: {
      title: 'युवा साधकों के लिए एक सूचना',
      body: 'यदि आपकी आयु 18 वर्ष से कम है, तो व्यक्तिगत, जन्म, परिवार, स्थान या समुदाय से जुड़ी जानकारी जोड़ते समय माता-पिता या अभिभावक की जानकारी और मार्गदर्शन में आगे बढ़ें।',
      under18Body: 'क्योंकि आपकी आयु 18 वर्ष से कम है, व्यक्तिगत, जन्म, परिवार, स्थान या समुदाय से जुड़ी जानकारी जोड़ते समय माता-पिता या अभिभावक की जानकारी और मार्गदर्शन में आगे बढ़ें।',
    },
  },
} as const;

export function ageOnDate(dateOfBirth: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) return null;

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  return age >= 0 ? age : null;
}

export function isUnderGuidanceAge(dateOfBirth: string, today = new Date()): boolean {
  const age = ageOnDate(dateOfBirth, today);
  return age !== null && age < AGE_GUIDANCE_POLICY.guidanceAge;
}
