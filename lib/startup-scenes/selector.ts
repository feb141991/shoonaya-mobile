import type {
  AppLanguage,
  SacredTimePeriod,
  StartupGreeting,
  StartupPreferences,
  StartupScene,
  TraditionKey,
} from './types';
import { NEUTRAL_STARTUP_SCENE, STARTUP_SCENE_CATALOG } from './catalog';
import { getStartupDeviceTimezone } from './preferences';

/**
 * Resolves the diurnal sacred time period for a given timezone and instant.
 *
 * Civil & Diurnal Divisions:
 * - early_morning (04:00 – 07:00): Dawn / Ushas / Prabhat
 * - daytime (07:00 – 17:00): Day / Divasa / Madhyahna
 * - evening (17:00 – 20:00): Evening / Dusk / Sandhya
 * - night (20:00 – 04:00): Night / Ratri / Prashanti
 */
export function resolveSacredTimePeriod(
  timezone?: string | null,
  now: Date = new Date()
): SacredTimePeriod {
  const tz = getStartupDeviceTimezone(timezone);
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    });
    const hourStr = formatter.format(now);
    const hour = parseInt(hourStr, 10);

    if (hour >= 4 && hour < 7) {
      return 'early_morning';
    }
    if (hour >= 7 && hour < 17) {
      return 'daytime';
    }
    if (hour >= 17 && hour < 20) {
      return 'evening';
    }
    return 'night';
  } catch {
    const utcHours = now.getUTCHours();
    if (utcHours >= 4 && utcHours < 7) return 'early_morning';
    if (utcHours >= 7 && utcHours < 17) return 'daytime';
    if (utcHours >= 17 && utcHours < 20) return 'evening';
    return 'night';
  }
}

/**
 * Deterministically selects the startup scene based on user tradition and current sacred time.
 * Guaranteed to return a valid scene without network access.
 */
export function selectStartupScene(options?: {
  tradition?: string | null;
  timezone?: string | null;
  now?: Date;
}): StartupScene {
  const rawTradition = options?.tradition?.toLowerCase().trim();
  const validTraditions: TraditionKey[] = ['hindu', 'sikh', 'buddhist', 'jain'];
  const tradition: TraditionKey | 'neutral' = validTraditions.includes(rawTradition as TraditionKey)
    ? (rawTradition as TraditionKey)
    : 'neutral';

  const sacredTime = resolveSacredTimePeriod(options?.timezone, options?.now);

  if (tradition === 'neutral') {
    return NEUTRAL_STARTUP_SCENE;
  }

  // 1. Match exact tradition AND sacred time period
  const exactMatch = STARTUP_SCENE_CATALOG.find(
    (scene) =>
      scene.traditions.includes(tradition) &&
      scene.sacredTimes.includes(sacredTime) &&
      scene.reviewStatus === 'approved'
  );
  if (exactMatch) {
    return exactMatch;
  }

  // 2. Match exact tradition (any time)
  const traditionMatch = STARTUP_SCENE_CATALOG.find(
    (scene) =>
      scene.traditions.includes(tradition) &&
      scene.reviewStatus === 'approved'
  );
  if (traditionMatch) {
    return traditionMatch;
  }

  // 3. Guaranteed Neutral Fallback
  return NEUTRAL_STARTUP_SCENE;
}

/**
 * Curated multilingual sacred greetings keyed by tradition and sacred time period.
 */
const SACRED_GREETINGS: Record<
  TraditionKey | 'neutral',
  Record<SacredTimePeriod, StartupGreeting>
> = {
  neutral: {
    early_morning: {
      title: { en: 'Awaken in Sacred Stillness', hi: 'पावन शांति में जागरण', pa: 'ਪਵਿੱਤਰ ਸ਼ਾਂਤੀ ਵਿੱਚ ਜਾਗੋ' },
      subtitle: { en: 'Begin your day with devotion & clarity', hi: 'श्रद्धा और स्पष्टता के साथ दिन का आरंभ करें', pa: 'ਸ਼ਰਧਾ ਅਤੇ ਸਪੱਸ਼ਟਤਾ ਨਾਲ ਦਿਨ ਦੀ ਸ਼ੁਰੂਆਤ ਕਰੋ' },
      sacredPeriodName: { en: 'Dawn', hi: 'उषा काल', pa: 'ਪ੍ਰਭਾਤ' },
    },
    daytime: {
      title: { en: 'Walk in Mindfulness', hi: 'सजगता एवं शांति', pa: 'ਸਚੇਤਤਾ ਅਤੇ ਸ਼ਾਂਤੀ' },
      subtitle: { en: 'May your actions bring harmony and purpose', hi: 'आपके कर्म सद्भाव और सार्थकता लाएं', pa: 'ਤੁਹਾਡੇ ਕਰਮ ਸਦਭਾਵਨਾ ਲਿਆਉਣ' },
      sacredPeriodName: { en: 'Day', hi: 'दिवस', pa: 'ਦਿਨ' },
    },
    evening: {
      title: { en: 'Sacred Reflection', hi: 'संध्या चिंतन', pa: 'ਸੰਧਿਆ ਚਿੰਤਨ' },
      subtitle: { en: 'Pause, breathe, and return within', hi: 'विराम लें और अंतरात्मा की ओर लौटें', pa: 'ਠਹਿਰੋ ਅਤੇ ਅੰਤਰ-ਧਿਆਨ ਹੋਵੋ' },
      sacredPeriodName: { en: 'Evening', hi: 'संध्या', pa: 'ਸੰਧਿਆ' },
    },
    night: {
      title: { en: 'Peaceful Rest', hi: 'शुभ रात्रि', pa: 'ਸ਼ੁਭ ਰਾਤ' },
      subtitle: { en: 'Rest in the infinite presence', hi: 'अनंत शांति में विश्राम करें', pa: 'ਅਨੰਤ ਸ਼ਾਂਤੀ ਵਿੱਚ ਵਿਸ਼ਰਾਮ ਕਰੋ' },
      sacredPeriodName: { en: 'Night', hi: 'रात्रि', pa: 'ਰਾਤ' },
    },
  },
  hindu: {
    early_morning: {
      title: { en: 'Prabhat Smaran', hi: 'प्रभात स्मरण', pa: 'ਪ੍ਰਭਾਤ ਸਿਮਰਨ' },
      subtitle: { en: 'Auspicious dawn for sadhana & prayer', hi: 'साधना और स्मरण का पावन काल', pa: 'ਸਾਧਨਾ ਅਤੇ ਪ੍ਰਾਰਥਨਾ ਦਾ ਪਵਿੱਤਰ ਸਮਾਂ' },
      sacredPeriodName: { en: 'Dawn', hi: 'उषा काल', pa: 'ਪ੍ਰਭਾਤ' },
    },
    daytime: {
      title: { en: 'Hari Om', hi: 'हरि ॐ', pa: 'ਹਰਿ ਓਮ' },
      subtitle: { en: 'Dedicate every action with devotion', hi: 'समस्त कर्म निष्काम भाव से समर्पित करें', pa: 'ਸਾਰੇ ਕੰਮ ਸਮਰਪਣ ਭਾਵ ਨਾਲ ਕਰੋ' },
      sacredPeriodName: { en: 'Day', hi: 'दिवस काल', pa: 'ਦਿਨ' },
    },
    evening: {
      title: { en: 'Shubh Sandhya', hi: 'शुभ संध्या', pa: 'ਸ਼ੁਭ ਸੰਧਿਆ' },
      subtitle: { en: 'Light the inner diya of devotion', hi: 'श्रद्धा का पावन दीप प्रज्वलित करें', pa: 'ਸ਼ਰਧਾ ਦਾ ਪਵਿੱਤਰ ਦੀਵਾ ਜਗਾਓ' },
      sacredPeriodName: { en: 'Evening', hi: 'संध्या वेला', pa: 'ਸੰਧਿਆ' },
    },
    night: {
      title: { en: 'Shubh Ratri', hi: 'शुभ रात्रि', pa: 'ਸ਼ੁਭ ਰਾਤਰੀ' },
      subtitle: { en: 'Surrender in divine tranquility', hi: 'प्रभु के पावन चरणों में विश्राम', pa: 'ਪ੍ਰਭੂ ਚਰਨਾਂ ਵਿੱਚ ਸ਼ਾਂਤ ਵਿਸ਼ਰਾਮ' },
      sacredPeriodName: { en: 'Ratri', hi: 'रात्रि', pa: 'ਰਾਤ' },
    },
  },
  sikh: {
    early_morning: {
      title: { en: 'Amrit Vela', hi: 'अमृत वेला', pa: 'ਅੰਮ੍ਰਿਤ ਵੇਲਾ' },
      subtitle: { en: 'Sacred hour of Naam Simran', hi: 'नाम सिमरन का पावन समय', pa: 'ਨਾਮ ਸਿਮਰਨ ਦਾ ਪਵਿੱਤਰ ਸਮਾਂ' },
      sacredPeriodName: { en: 'Dawn', hi: 'प्रभात', pa: 'ਅੰਮ੍ਰਿਤ ਵੇਲਾ' },
    },
    daytime: {
      title: { en: 'Sat Sri Akal', hi: 'सत श्री अकाल', pa: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ' },
      subtitle: { en: 'Kirat Karo, Naam Japo', hi: 'किरत करो, नाम जपो', pa: 'ਕਿਰਤ ਕਰੋ, ਨਾਮ ਜਪੋ' },
      sacredPeriodName: { en: 'Day', hi: 'दिवस', pa: 'ਦਿਨ' },
    },
    evening: {
      title: { en: 'Rehras Sahib', hi: 'रहिरास साहिब', pa: 'ਰਹਰਾਸਿ ਸਾਹਿਬ' },
      subtitle: { en: 'Evening gratitude and praise', hi: 'संध्या की पावन प्रार्थना', pa: 'ਸ਼ਾਮ ਦੀ ਪਵਿੱਤਰ ਅਰਦਾਸ' },
      sacredPeriodName: { en: 'Evening', hi: 'संध्या', pa: 'ਸੰਝ' },
    },
    night: {
      title: { en: 'Kirtan Sohila', hi: 'कीर्तन सोहिला', pa: 'ਕੀਰਤਨ ਸੋਹਿਲਾ' },
      subtitle: { en: 'Peaceful night in His embrace', hi: 'वाहेगुरु की कृपा में विश्राम', pa: 'ਵਾਹਿਗੁਰੂ ਦੀ ਓਟ ਵਿੱਚ ਵਿਸ਼ਰਾਮ' },
      sacredPeriodName: { en: 'Night', hi: 'रात्रि', pa: 'ਰਾਤ' },
    },
  },
  jain: {
    early_morning: {
      title: { en: 'Jai Jinendra', hi: 'जय जिनेंद्र', pa: 'ਜੈ ਜਿਨੇਂਦਰ' },
      subtitle: { en: 'Chant the holy Navkar Mantra', hi: 'णमोकार महामंत्र का पावन जाप', pa: 'ਣਮੋਕਾਰ ਮੰਤਰ ਦਾ ਪਵਿੱਤਰ ਜਾਪ' },
      sacredPeriodName: { en: 'Dawn', hi: 'प्रभात', pa: 'ਪ੍ਰਭਾਤ' },
    },
    daytime: {
      title: { en: 'Ahimsa & Satya', hi: 'अहिंसा और सत्य', pa: 'अहिंसा और सत्य' },
      subtitle: { en: 'Live mindfully in compassion for all', hi: 'समस्त जीवों पर दया और करुणा', pa: 'ਸਾਰੇ ਜੀਵਾਂ ਤੇ ਦਇਆ ਅਤੇ ਕਰੁਣਾ' },
      sacredPeriodName: { en: 'Day', hi: 'दिवस', pa: 'ਦਿਵਸ' },
    },
    evening: {
      title: { en: 'Pratikramana', hi: 'प्रतिक्रमण', pa: 'ਪ੍ਰਤੀਕ੍ਰਮਣ' },
      subtitle: { en: 'Evening self-reflection and forgiveness', hi: 'संध्या आत्म-निरीक्षण और क्षमा', pa: 'ਸ਼ਾਮ ਦੀ ਆਤਮ-ਖੋਜ ਅਤੇ ਖਿਮਾ' },
      sacredPeriodName: { en: 'Evening', hi: 'संध्या', pa: 'ਸੰਧਿਆ' },
    },
    night: {
      title: { en: 'Shantimayi Ratri', hi: 'शांतिमयी रात्रि', pa: 'ਸ਼ਾਂਤੀਮਈ ਰਾਤ' },
      subtitle: { en: 'Pure consciousness in detachment', hi: 'वीतराग भाव में आत्म-शांति', pa: 'ਵੀਤਰਾਗ ਭਾਵ ਵਿੱਚ ਆਤਮ-ਸ਼ਾਂਤੀ' },
      sacredPeriodName: { en: 'Night', hi: 'रात्रि', pa: 'ਰਾਤ' },
    },
  },
  buddhist: {
    early_morning: {
      title: { en: 'Namo Buddhaya', hi: 'नमो बुद्धाय', pa: 'ਨਮੋ ਬੁੱਧਾਯ' },
      subtitle: { en: 'Awaken with mindful breath & clarity', hi: 'सजग श्वास और स्पष्टता के साथ जागें', pa: 'ਸਚੇਤ ਸਾਹ ਅਤੇ ਸਪੱਸ਼ਟਤਾ ਨਾਲ ਜਾਗੋ' },
      sacredPeriodName: { en: 'Dawn', hi: 'उषा काल', pa: 'ਉਸ਼ਾ ਕਾਲ' },
    },
    daytime: {
      title: { en: 'Right Mindfulness', hi: 'सम्यक स्मृति', pa: 'ਸਮਯਕ ਸਮ੍ਰਿਤੀ' },
      subtitle: { en: 'Walk the Noble Eightfold Path', hi: 'आर्य आष्टांगिक मार्ग का आचरण', pa: 'ਅਸ਼ਟਾਂਗ ਮਾਰਗ ਦਾ ਪਾਲਣ' },
      sacredPeriodName: { en: 'Day', hi: 'दिवस', pa: 'ਦੁਪਹਿਰ' },
    },
    evening: {
      title: { en: 'Metta Bhavana', hi: 'मैत्री भावना', pa: 'ਮੈਤਰੀ ਭਾਵਨਾ' },
      subtitle: { en: 'Radiate loving-kindness to all beings', hi: 'समस्त प्राणियों के लिए मंगल कामना', pa: 'ਸਭ ਜੀਵਾਂ ਲਈ ਭਲਾਈ ਦੀ ਕਾਮਨਾ' },
      sacredPeriodName: { en: 'Evening', hi: 'संध्या', pa: 'ਸੰਧਿਆ' },
    },
    night: {
      title: { en: 'Inner Stillness', hi: 'प्रशांत विश्राम', pa: 'ਪ੍ਰਸ਼ਾਂਤ ਵਿਸ਼ਰਾਮ' },
      subtitle: { en: 'Rest in equanimity and peace', hi: 'समता और परम शांति में विश्राम', pa: 'ਸਮਤਾ ਅਤੇ ਪਰਮ ਸ਼ਾਂਤੀ ਵਿੱਚ ਵਿਸ਼ਰਾਮ' },
      sacredPeriodName: { en: 'Night', hi: 'रात्रि', pa: 'ਰਾਤ' },
    },
  },
};

/**
 * Returns the localized greeting for the given tradition, sacred time, and language.
 */
export function getStartupGreeting(options?: {
  tradition?: string | null;
  timezone?: string | null;
  language?: string | null;
  now?: Date;
}): {
  title: string;
  subtitle: string;
  periodName: string;
} {
  const rawTradition = options?.tradition?.toLowerCase().trim();
  const validTraditions: TraditionKey[] = ['hindu', 'sikh', 'buddhist', 'jain'];
  const tradition: TraditionKey | 'neutral' = validTraditions.includes(rawTradition as TraditionKey)
    ? (rawTradition as TraditionKey)
    : 'neutral';

  const sacredTime = resolveSacredTimePeriod(options?.timezone, options?.now);

  const rawLang = options?.language?.toLowerCase().trim();
  const lang: AppLanguage = rawLang === 'hi' || rawLang === 'pa' ? rawLang : 'en';

  const pool = SACRED_GREETINGS[tradition] ?? SACRED_GREETINGS.neutral;
  const greeting = pool[sacredTime] ?? pool.early_morning;

  return {
    title: greeting.title[lang] || greeting.title.en,
    subtitle: greeting.subtitle[lang] || greeting.subtitle.en,
    periodName: greeting.sacredPeriodName[lang] || greeting.sacredPeriodName.en,
  };
}
