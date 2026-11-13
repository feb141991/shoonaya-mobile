export interface StorybookKathaData {
  id: string;
  title: string;
  titleHi?: string;
  titlePa?: string;
  preview?: string;
  body: string[];
  bodyHi?: string[];
  bodyPa?: string[];
  phal: string;
  phalHi?: string;
  phalPa?: string;
  durationMin: number;
  tags?: string[];
  portrait?: string;
  occasion?: string;
}

export interface StorybookFontScale {
  label: string;
  fontSize: number;
  lineHeight: number;
  dropCapSize: number;
  dropCapFont: number;
}

export const STORYBOOK_FONT_SCALES: StorybookFontScale[] = [
  { label: "sm", fontSize: 14, lineHeight: 24, dropCapSize: 40, dropCapFont: 24 },
  { label: "md", fontSize: 16.5, lineHeight: 28, dropCapSize: 46, dropCapFont: 27 },
  { label: "lg", fontSize: 19.5, lineHeight: 32, dropCapSize: 52, dropCapFont: 31 },
  { label: "xl", fontSize: 23, lineHeight: 37, dropCapSize: 58, dropCapFont: 35 },
];

/**
 * Scene-by-scene cinematic camera perspectives for single-masterwork stories.
 * Creates dynamic pan/zoom framing across the 6 dramatic narrative phases.
 */
export const MASTERWORK_SCENE_FRAMING = [
  // Scene 1: Wide panoramic establishing framing
  { scale: 1.05, translateX: 0, translateY: 0 },
  // Scene 2: Tension / inciting dilemma — camera pushes in towards left action
  { scale: 1.18, translateX: -16, translateY: -8 },
  // Scene 3: Scheme / conflict — camera swings towards right opposing action
  { scale: 1.20, translateX: 16, translateY: 8 },
  // Scene 4: Climax / confrontation — dramatic tight center zoom
  { scale: 1.28, translateX: 0, translateY: -6 },
  // Scene 5: Consequence / resolution — pulling back
  { scale: 1.12, translateX: 0, translateY: 6 },
  // Scene 6: Wisdom fruit — radiant balanced view with golden aura
  { scale: 1.04, translateX: 0, translateY: 0 },
];

/**
 * Classical Sanskrit narrative stages for the 6 scenes of each Panchatantra tale.
 */
export const SCENE_STAGE_LABELS = [
  { hi: "आरम्भ · कथा सूत्र", pa: "ਆਰੰਭ · ਕਥਾ ਸੂਤਰ", en: "THE ENCOUNTER", icon: "🌿" },
  { hi: "द्वन्द्व · परिस्थिति", pa: "ਦੁਵਿਧਾ · ਸਥਿਤੀ", en: "THE CONFLICT", icon: "⚡" },
  { hi: "युक्ति · चातुर्य", pa: "ਜੁਗਤ · ਸਿਆਣਪ", en: "THE CLEVER PLAN", icon: "💡" },
  { hi: "मोड़ · निर्णायक क्षण", pa: "ਮੋੜ · ਨਿਰਣਾਇਕ ਪਲ", en: "THE TURNING POINT", icon: "🎯" },
  { hi: "परिणाम · सत्य प्रगट", pa: "ਨਤੀਜਾ · ਸੱਚ ਦਾ ਪ੍ਰਗਟਾਵਾ", en: "THE RESOLUTION", icon: "🌅" },
  { hi: "नीति फल · शाश्वत बोध", pa: "ਨੀਤੀ ਫਲ · ਸਦੀਵੀ ਬੋਧ", en: "THE ETERNAL WISDOM", icon: "🪷" },
];

export function localizedLabel(language: 'en' | 'hi' | 'pa', english: string, hindi: string, punjabi: string) {
  return language === 'pa' ? punjabi : language === 'hi' ? hindi : english;
}
