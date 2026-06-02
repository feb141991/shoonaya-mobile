import { useCallback, useEffect, useRef } from 'react';
import { Audio, type AVPlaybackStatusSuccess } from 'expo-av';

type AudioRate = 0.75 | 1.0 | 1.25;

type UseAudioPlayerResult = {
  loadAndPlay: (url: string, loop?: boolean) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  setRate: (rate: AudioRate) => Promise<void>;
};

let audioModeConfigured = false;

async function configureAudioMode() {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: false,
    interruptionModeIOS: 2, // DoNotMix
    interruptionModeAndroid: 1, // DoNotMix
  });
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const soundRef = useRef<Audio.Sound | null>(null);

  const stop = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {
      // already unloaded
    }
    soundRef.current = null;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  const loadAndPlay = useCallback(
    async (url: string, loop = false) => {
      await stop();
      await configureAudioMode();

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, isLooping: loop, volume: 1.0 }
      );
      soundRef.current = sound;
    },
    [stop]
  );

  const pause = useCallback(async () => {
    try {
      await soundRef.current?.pauseAsync();
    } catch {
      // not loaded
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      await soundRef.current?.playAsync();
    } catch {
      // not loaded
    }
  }, []);

  const setRate = useCallback(async (rate: AudioRate) => {
    try {
      const sound = soundRef.current;
      if (!sound) return;
      const status = await sound.getStatusAsync();
      if ((status as AVPlaybackStatusSuccess).isLoaded) {
        await sound.setRateAsync(rate, true);
      }
    } catch {
      // not supported on all platforms
    }
  }, []);

  return { loadAndPlay, pause, resume, stop, setRate };
}
