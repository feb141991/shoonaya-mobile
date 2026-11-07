import type Feather from '@expo/vector-icons/Feather';

import type { NotificationChoiceKey } from './onboarding-contract';

/**
 * Every notification a person can choose, as onboarding shows it: grouped, one switch each, all off until turned on.
 *
 * Titles and descriptions are the SAME words Settings shows for the same notification (app/settings/detail-screen.tsx,
 * NOTIFICATION_TOGGLES): this file was generated from them and a guard test keeps the two equal, so onboarding can never promise
 * something different from what Settings controls. Group names are new, plain, and (in Hindi) not yet reviewed by a native reader.
 */
export type OnboardingNotificationItem = {
  key: NotificationChoiceKey;
  icon: React.ComponentProps<typeof Feather>['name'];
  /** The profile column Settings uses for the same switch. */
  settingsKey: string;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
};

export type OnboardingNotificationGroup = {
  id: string;
  title: string;
  titleHi: string;
  items: readonly OnboardingNotificationItem[];
};

export const ONBOARDING_NOTIFICATION_GROUPS: readonly OnboardingNotificationGroup[] = [
  {
    id: "festivals",
    title: "Festivals & vrats",
    titleHi: "पर्व और व्रत",
    items: [
      { key: "festival", icon: "calendar", settingsKey: "wants_festival_reminders",
        title: "Sacred festivals", titleHi: "पावन पर्व",
        description: "Major and regional sacred festivals", descriptionHi: "प्रमुख व क्षेत्रीय पावन पर्व" },
      { key: "vrat", icon: "moon", settingsKey: "wants_vrat_reminders",
        title: "Vrats & fasting", titleHi: "व्रत व उपवास",
        description: "Ekadashi, Pradosha, Purnima & fasting days", descriptionHi: "एकादशी, प्रदोष, पूर्णिमा व उपवास के दिन" },
      { key: "tithi", icon: "clock", settingsKey: "wants_tithi_reminders",
        title: "Tithi alerts", titleHi: "तिथि सूचनाएं",
        description: "Daily lunar phase transitions", descriptionHi: "दैनिक चंद्र तिथि परिवर्तन" },
      { key: "sankalpaMidpoint", icon: "target", settingsKey: "wants_sankalpa_midpoint_reminders",
        title: "Sankalpa midpoint", titleHi: "संकल्प का मध्यबिंदु",
        description: "One gentle reminder halfway through an active vow", descriptionHi: "सक्रिय संकल्प के आधे समय पर एक सरल रिमाइंडर" },
    ],
  },
  {
    id: "practice",
    title: "Daily practice",
    titleHi: "दैनिक साधना",
    items: [
      { key: "shloka", icon: "book-open", settingsKey: "wants_shloka_reminders",
        title: "Daily wisdom", titleHi: "दैनिक ज्ञान",
        description: "Your daily shloka & reflection", descriptionHi: "आपका दैनिक श्लोक व चिंतन" },
      { key: "nitya", icon: "sun", settingsKey: "wants_nitya_reminders",
        title: "Nitya reminders", titleHi: "नित्य रिमाइंडर",
        description: "Morning sadhana nudges", descriptionHi: "सुबह की साधना के लिए याद दिलाने वाले संदेश" },
      { key: "midday", icon: "sun", settingsKey: "wants_madhyahn_reminder",
        title: "Midday Nitya", titleHi: "मध्याह्न नित्य",
        description: "A midday nudge for your Nitya Karma practice", descriptionHi: "आपकी नित्य कर्म साधना के लिए मध्याह्न का रिमाइंडर" },
      { key: "evening", icon: "sunset", settingsKey: "wants_evening_reminder",
        title: "Evening Sandhya", titleHi: "सायं संध्या",
        description: "A second daily nudge for evening twilight practice", descriptionHi: "सायंकालीन साधना के लिए दिन का दूसरा रिमाइंडर" },
      { key: "sattvic", icon: "wind", settingsKey: "wants_sattvic_reminders",
        title: "Sattvic Mode evening", titleHi: "सात्विक मोड शाम",
        description: "An evening nudge into pr\u0101\u1e47\u0101y\u0101ma, k\u012brtana, or quiet reflection", descriptionHi: "प्राणायाम, कीर्तन या शांत चिंतन के लिए शाम का रिमाइंडर" },
      { key: "japa", icon: "repeat", settingsKey: "japa_reminder_enabled",
        title: "Japa practice reminder", titleHi: "जाप अभ्यास रिमाइंडर",
        description: "A gentle daily reminder at your chosen time", descriptionHi: "आपके चुने समय पर एक सरल दैनिक रिमाइंडर" },
    ],
  },
  {
    id: "reflection",
    title: "Reflection",
    titleHi: "आत्मचिंतन",
    items: [
      { key: "mood", icon: "smile", settingsKey: "wants_mood_reminders",
        title: "Mood check-ins", titleHi: "मनोभाव जाँच",
        description: "Midday and evening prompts to note how you are feeling", descriptionHi: "आपकी भावनाएं दर्ज करने के लिए दोपहर व शाम के संकेत" },
    ],
  },
  {
    id: "learning",
    title: "Learning",
    titleHi: "अध्ययन",
    items: [
      { key: "quiz", icon: "award", settingsKey: "quiz_reminder_enabled",
        title: "Daily quiz reminders", titleHi: "दैनिक क्विज़ रिमाइंडर",
        description: "Daily quiz challenge at 10:00 AM, plus a 6:00 PM nudge if still unfinished", descriptionHi: "सुबह 10:00 बजे दैनिक क्विज़ चुनौती, और अधूरा रहने पर शाम 6:00 बजे एक याद दिलाने वाला संदेश" },
      { key: "dharmVeer", icon: "star", settingsKey: "dharm_veer_reminder_enabled",
        title: "Dharm Veer stories", titleHi: "धर्म वीर कथाएं",
        description: "A nudge toward unread Dharm Veer stories", descriptionHi: "अपठित धर्म वीर कथाओं की ओर एक रिमाइंडर" },
    ],
  },
  {
    id: "community",
    title: "Community & family",
    titleHi: "समुदाय और परिवार",
    items: [
      { key: "community", icon: "users", settingsKey: "wants_community_notifications",
        title: "Community", titleHi: "समुदाय",
        description: "Mandali posts, reactions & connections", descriptionHi: "मंडली की पोस्ट, प्रतिक्रियाएं व जुड़ाव" },
      { key: "family", icon: "home", settingsKey: "wants_family_notifications",
        title: "Family", titleHi: "परिवार",
        description: "Kul & lineage activity", descriptionHi: "कुल व वंश की गतिविधि" },
      { key: "familyRemembrance", icon: "heart", settingsKey: "wants_family_remembrance_reminders",
        title: "Family remembrance", titleHi: "पारिवारिक स्मृति",
        description: "A yearly, private reminder for family dates you link to a deceased relative", descriptionHi: "किसी दिवंगत परिजन से जोड़ी गई पारिवारिक तिथि के लिए एक वार्षिक, निजी रिमाइंडर" },
    ],
  },
  {
    id: "sunrise",
    title: "Before sunrise",
    titleHi: "सूर्योदय से पहले",
    items: [
      { key: "brahmaMuhurta", icon: "sunrise", settingsKey: "wants_brahma_muhurta_reminders",
        title: "Brahma Muhurta", titleHi: "ब्रह्म मुहूर्त",
        description: "A pre-dawn reminder about 1\u00bd hours before sunrise at your saved location. It arrives at night.", descriptionHi: "आपके सहेजे गए स्थान पर सूर्योदय से लगभग 1½ घंटे पहले, तड़के का एक रिमाइंडर। यह रात में आता है।" },
    ],
  },
] as const;

export const ONBOARDING_NOTIFICATION_ITEMS: readonly OnboardingNotificationItem[] = ONBOARDING_NOTIFICATION_GROUPS.flatMap((group) => group.items);
