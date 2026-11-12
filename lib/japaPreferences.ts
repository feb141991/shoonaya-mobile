import AsyncStorage from '@react-native-async-storage/async-storage';

export const JAPA_MALA_KEY = 'shoonaya.japa.selectedMala';
export const JAPA_SCENE_KEY = 'shoonaya.japa.scene';
export const JAPA_SOUND_KEY = 'shoonaya.japa.sound';
export const JAPA_MANTRA_KEY = 'shoonaya.japa.mantraKey';
export const JAPA_TARGET_ROUNDS_KEY = 'shoonaya.japa.targetRounds';
export const JAPA_CHANTING_MODE_KEY = 'shoonaya.japa.chantingMode';
export const JAPA_HANDS_FREE_PACE_KEY = 'shoonaya.japa.handsFreePace';
export const JAPA_CEREMONY_AUTO_ADVANCE_KEY = 'shoonaya.japa.ceremonyAutoAdvance';

export type JapaChantingMode = 'manual' | 'hands_free';

export const DEFAULT_HANDS_FREE_PACE = 3.0;

export const HANDS_FREE_PACE_OPTIONS = [
  { id: 'fast', label: 'Brisk (2.0s)', seconds: 2.0 },
  { id: 'medium', label: 'Steady (3.0s)', seconds: 3.0 },
  { id: 'slow', label: 'Deep (4.5s)', seconds: 4.5 },
] as const;

export function writeJapaPreference(key: string, value: string) {
  return AsyncStorage.setItem(key, value);
}

// The saved device choices in one native bridge call. Values are returned
// raw; the screen checks each against what it offers.
export async function readJapaPreferences() {
  const pairs = await AsyncStorage.multiGet([
    JAPA_MALA_KEY,
    JAPA_SCENE_KEY,
    JAPA_TARGET_ROUNDS_KEY,
    JAPA_MANTRA_KEY,
    JAPA_SOUND_KEY,
    JAPA_CHANTING_MODE_KEY,
    JAPA_HANDS_FREE_PACE_KEY,
    JAPA_CEREMONY_AUTO_ADVANCE_KEY,
  ]);
  const [malaId, sceneId, rounds, mantraKey, soundId, chantingMode, handsFreePace, ceremonyAutoAdvance] = pairs.map(([, value]) => value);
  return {
    malaId,
    sceneId,
    rounds,
    mantraKey,
    soundId,
    chantingMode: (chantingMode === 'hands_free' ? 'hands_free' : 'manual') as JapaChantingMode,
    handsFreePace: HANDS_FREE_PACE_OPTIONS.find(({ seconds }) => seconds === Number(handsFreePace))?.seconds ?? DEFAULT_HANDS_FREE_PACE,
    ceremonyAutoAdvance: ceremonyAutoAdvance !== 'false',
  };
}
