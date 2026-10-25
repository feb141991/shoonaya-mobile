export type TourStepId = 'today' | 'practice' | 'learn' | 'connect';

export type TourStep = {
  id: TourStepId;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  icon: 'sun' | 'activity' | 'book-open' | 'users';
  interactiveFeature?: 'offline_japa_bead_counter';
};

export const APP_TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'today',
    title: 'Today: Panchang & Sacred Days',
    titleHi: 'आज: पंचांग एवं पावन पर्व',
    subtitle: 'Accurate astronomical sunrise, tithi, muhurta & vrat timings calibrated for your exact location.',
    subtitleHi: 'आपके सटीक स्थान पर आधारित सूर्योदय, तिथि, शुभ मुहूर्त और व्रत का प्रामाणिक समय।',
    icon: 'sun',
  },
  {
    id: 'practice',
    title: 'Practice: Japa & Daily Rituals',
    titleHi: 'साधना: जप एवं दैनिक अनुष्ठान',
    subtitle: 'Distraction-free tactile Japamala, custom mantras and daily sadhana tracking.',
    subtitleHi: 'बिना किसी भटकाव के शांत जपमाला, पवित्र मंत्र और दैनिक साधना का सहज साधन।',
    icon: 'activity',
    interactiveFeature: 'offline_japa_bead_counter',
  },
  {
    id: 'learn',
    title: 'Learn: Bhakti & Wisdom',
    titleHi: 'ज्ञान: भक्ति एवं पाठशाला',
    subtitle: 'Authentic shlokas with word-by-word meanings, foundational Pathshala courses, and Dharm Veer epics.',
    subtitleHi: 'श्लोक-दर-श्लोक प्रामाणिक अर्थ, धर्म की पाठशाला और धर्मवीर महानायकों की प्रेरणादायी गाथाएँ।',
    icon: 'book-open',
  },
  {
    id: 'connect',
    title: 'Connect: KUL & Community',
    titleHi: 'संबंध: कुल एवं सत्संग',
    subtitle: 'Preserve 3+ generations of family lineage, private Shraddha remembrance, and gentle mandali satsang.',
    subtitleHi: 'तीन पीढ़ियों की कुल वंशावली, पितृ तर्पण स्मरण और पवित्र सत्संग चिंतन।',
    icon: 'users',
  },
] as const;
