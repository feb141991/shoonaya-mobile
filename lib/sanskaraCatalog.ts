// The traditional 16 Hindu samskaras (shodasha samskaras), for the "Plant
// Sacred Milestone" picker (components used from app/kul/sanskara.tsx).
//
// AGENTS.md section 3 (Spiritual Content Integrity) forbids fabricating
// ritual content and requires separating sourced material from
// Shoonaya's own explanation. This list's name/order/purpose/life-stage
// fields were cross-checked against two independent reference pages
// (hindu-blog.com's Shodasha Samskara list and hindupad.com's 16 Hindu
// Samskaras list; both agree on all 16 names, order, and approximate
// timing) rather than written from memory alone. The `values` field on
// each entry is NOT a scriptural claim — it is Shoonaya's own short
// framing of what the rite cultivates, clearly a curated gloss rather
// than translated or sourced text.
//
// `reviewStatus` is 'pending_review' for every entry. This content has
// NOT been through Shoonaya's council/founder review yet (AGENTS.md: a
// named reviewer, "D3" in docs/SANSKARA_TRACKER_BACKEND_DESIGN.md, still
// needs to sign off). The UI that renders this must say so visibly, not
// present it as settled.
//
// This list does NOT include Vanaprastha or Sannyasa: some reference
// lists fold the four ashramas (life stages) into the 16 samskaras, but
// this app already has a dedicated Ashrama feature (app/nitya-ashrama.tsx)
// — including them here would duplicate that, not extend it.
//
// Scope: this is the standard Hindu list only, matching the existing
// screen's current scope (it has no tradition gating today). A
// Sikh/Buddhist/Jain equivalent catalog was not requested and is not
// built here.
//
// Backend note: `sanskara_rites` (the live catalogue table) currently
// has exactly one row, `custom` — there is no reviewed, referentially-
// integral rite_key catalogue yet (confirmed directly against the
// database, 2026-11-06). So every entry below is presentation-only: the
// picker fills `customTitle` with the entry's name and the record is
// still created with `riteKey: 'custom'`, exactly like free-typed
// titles are today. Wiring a real `rite_key` per samskara needs a
// reviewed migration (AGENTS.md section 4) and is out of scope here.

export type SanskaraReviewStatus = 'pending_review';

export interface SanskaraCatalogEntry {
  key: string;
  nameSanskrit: string;
  nameTransliteration: string;
  nameEnglish: string;
  lifeStage: string;
  purpose: string;
  values: string[];
  reviewStatus: SanskaraReviewStatus;
}

export const SANSKARA_CATALOG_SOURCE_NOTE =
  'Cross-checked against hindu-blog.com (Shodasha Samskara list) and hindupad.com (16 Hindu Samskaras), 2026-11-06. Pending review.';

export const SANSKARA_CATALOG: SanskaraCatalogEntry[] = [
  {
    key: 'garbhadhana',
    nameSanskrit: 'गर्भाधान',
    nameTransliteration: 'Garbhadhana',
    nameEnglish: 'Conception',
    lifeStage: 'Before conception, for a married couple',
    purpose: 'Marks and blesses the intention to conceive a child.',
    values: ['Intention', 'Responsibility', 'Welcoming new life'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'pumsavana',
    nameSanskrit: 'पुंसवन',
    nameTransliteration: 'Pumsavana',
    nameEnglish: 'Blessing the Pregnancy',
    lifeStage: '3rd–4th month of pregnancy',
    purpose: "A rite for the pregnancy's health and the child's vitality.",
    values: ['Care', 'Protection', 'Gratitude'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'simantonnayana',
    nameSanskrit: 'सीमन्तोन्नयन',
    nameTransliteration: 'Simantonnayana',
    nameEnglish: "Blessing the Mother's Wellbeing",
    lifeStage: '5th–7th month of pregnancy',
    purpose: "A hair-parting rite for the mother's calm and the child's wellbeing.",
    values: ['Nurture', 'Calm', 'Protection'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'jatakarma',
    nameSanskrit: 'जातकर्म',
    nameTransliteration: 'Jatakarma',
    nameEnglish: 'Birth Rite',
    lifeStage: 'At birth',
    purpose: 'Welcomes the newborn and invites good fortune.',
    values: ['Welcome', 'Blessing', 'Gratitude'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'namakarana',
    nameSanskrit: 'नामकरण',
    nameTransliteration: 'Namakarana',
    nameEnglish: 'Naming Ceremony',
    lifeStage: '11th–21st day after birth',
    purpose: 'Gives the child a name and a sacred identity.',
    values: ['Identity', 'Belonging'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'nishkramana',
    nameSanskrit: 'निष्क्रमण',
    nameTransliteration: 'Nishkramana',
    nameEnglish: 'First Outing',
    lifeStage: '3rd–4th month',
    purpose: "Introduces the child to the sun, the sky, and the wider world beyond home.",
    values: ['Connection', 'Openness to the world'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'annaprashana',
    nameSanskrit: 'अन्नप्राशन',
    nameTransliteration: 'Annaprashana',
    nameEnglish: 'First Solid Food',
    lifeStage: '6th–8th month',
    purpose: 'Marks the first feeding of solid food, beyond milk alone.',
    values: ['Nourishment', 'Growth'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'chudakarana',
    nameSanskrit: 'चूडाकरण',
    nameTransliteration: 'Chudakarana (Mundan)',
    nameEnglish: 'First Haircut',
    lifeStage: '1st–3rd year',
    purpose: 'The first haircut, symbolizing purification and a fresh start.',
    values: ['Purification', 'New beginning'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'karnavedha',
    nameSanskrit: 'कर्णवेध',
    nameTransliteration: 'Karnavedha',
    nameEnglish: 'Ear-Piercing',
    lifeStage: 'Usually with Chudakarana, 1st–5th year',
    purpose: 'Ear-piercing, traditionally linked to health and adornment.',
    values: ['Health', 'Tradition'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'vidyarambha',
    nameSanskrit: 'विद्यारम्भ',
    nameTransliteration: 'Vidyarambha (Aksharabhyasam)',
    nameEnglish: 'Start of Learning',
    lifeStage: 'Around age 4–5',
    purpose: "The child's first formal introduction to letters and learning.",
    values: ['Knowledge', 'Discipline', 'Reverence for learning'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'upanayana',
    nameSanskrit: 'उपनयन',
    nameTransliteration: 'Upanayana',
    nameEnglish: 'Sacred Thread Ceremony',
    lifeStage: 'Traditionally around age 8',
    purpose: 'Investiture with the sacred thread, beginning formal Vedic study under a teacher.',
    values: ['Discipline', 'Spiritual commitment', 'Teacher–student respect'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'vedarambha',
    nameSanskrit: 'वेदारम्भ',
    nameTransliteration: 'Vedarambha',
    nameEnglish: 'Beginning of Scriptural Study',
    lifeStage: 'Shortly after Upanayana',
    purpose: 'Marks the formal start of Vedic and scriptural study.',
    values: ['Dedication to study', 'Humility'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'keshanta',
    nameSanskrit: 'केशान्त',
    nameTransliteration: 'Keshanta',
    nameEnglish: 'Coming of Age',
    lifeStage: 'Around age 16',
    purpose: 'The first shave, marking the approach of adulthood.',
    values: ['Maturity', 'Responsibility'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'samavartana',
    nameSanskrit: 'समावर्तन',
    nameTransliteration: 'Samavartana',
    nameEnglish: 'Graduation',
    lifeStage: 'End of formal education',
    purpose: 'Completion of studentship, returning home ready for householder life.',
    values: ['Readiness', 'Gratitude to one’s teacher'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'vivaha',
    nameSanskrit: 'विवाह',
    nameTransliteration: 'Vivaha',
    nameEnglish: 'Marriage',
    lifeStage: 'At marriage',
    purpose: 'Unites two people in partnership and shared householder duties.',
    values: ['Partnership', 'Duty', 'Commitment'],
    reviewStatus: 'pending_review',
  },
  {
    key: 'antyeshti',
    nameSanskrit: 'अन्त्येष्टि',
    nameTransliteration: 'Antyeshti',
    nameEnglish: 'Last Rites',
    lifeStage: 'At death',
    purpose: "Funeral rites that honor the departed and guide the soul's journey onward.",
    values: ['Honoring the departed', 'Continuity', 'Letting go'],
    reviewStatus: 'pending_review',
  },
];
