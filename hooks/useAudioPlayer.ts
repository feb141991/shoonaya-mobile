import { useCallback, useMemo, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useFocusEffect } from 'expo-router';

type AudioRate = 0.75 | 1.0 | 1.25;

type UseAudioPlayerResult = {
  loadAndPlay: (url: string, loop?: boolean, onComplete?: () => void) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  setRate: (rate: AudioRate) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
};

let audioModeConfigured = false;

async function configureAudioMode() {
  if (audioModeConfigured) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'doNotMix',
  });
  audioModeConfigured = true;
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const playerRef = useRef<AudioPlayer | null>(null);
  const statusSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const generationRef = useRef(0);
  const focusedRef = useRef(true);

  const stop = useCallback(async () => {
    generationRef.current += 1;
    statusSubscriptionRef.current?.remove();
    statusSubscriptionRef.current = null;
    const player = playerRef.current;
    playerRef.current = null;
    if (!player) return;
    try {
      player.pause();
      await player.seekTo(0);
      player.remove();
    } catch {
      // already removed
    }
  }, []);

  // Focus-scoped, not mount/unmount: React Navigation's native-stack keeps
  // a screen mounted (not unmounted) once another screen is pushed on top
  // of it. A plain useEffect's cleanup only ran on genuine unmount, so
  // narrated audio kept playing in the background if the user navigated
  // forward to a new screen without this one being popped off the stack
  // -- e.g. opening a second reader from a link inside this one.
  // useFocusEffect's cleanup fires on blur AND on unmount, covering both.
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
        void stop();
      };
    }, [stop])
  );

  const loadAndPlay = useCallback(
    async (url: string, loop = false, onComplete?: () => void) => {
      const stopping = stop();
      const generation = generationRef.current;
      await stopping;
      await configureAudioMode();
      if (!focusedRef.current || generation !== generationRef.current) return;

      const player = createAudioPlayer({ uri: url });
      player.loop = loop;
      player.volume = 1.0;
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!loop && status.didJustFinish && playerRef.current === player) {
          statusSubscriptionRef.current?.remove();
          statusSubscriptionRef.current = null;
          if (playerRef.current === player) {
            playerRef.current = null;
            try {
              player.remove();
            } catch {
              // already removed
            }
          }
          onComplete?.();
        }
      });
      statusSubscriptionRef.current = subscription;
      playerRef.current = player;
      player.play();
    },
    [stop]
  );

  const pause = useCallback(async () => {
    try {
      playerRef.current?.pause();
    } catch {
      // not loaded
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      playerRef.current?.play();
    } catch {
      // not loaded
    }
  }, []);

  const setRate = useCallback(async (rate: AudioRate) => {
    try {
      const player = playerRef.current;
      if (!player || !player.isLoaded) return;
      player.setPlaybackRate(rate);
    } catch {
      // not supported on all platforms
    }
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    try {
      const player = playerRef.current;
      if (!player) return;
      player.volume = Math.max(0, Math.min(1, volume));
    } catch {
      // not supported or removed
    }
  }, []);

  return useMemo(
    () => ({ loadAndPlay, pause, resume, stop, setRate, setVolume }),
    [loadAndPlay, pause, resume, stop, setRate, setVolume]
  );
}
