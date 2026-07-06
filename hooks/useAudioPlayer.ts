import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

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
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const playerRef = useRef<AudioPlayer | null>(null);

  const stop = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      player.pause();
      await player.seekTo(0);
      player.remove();
    } catch {
      // already removed
    }
    playerRef.current = null;
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

      const player = createAudioPlayer({ uri: url });
      player.loop = loop;
      player.volume = 1.0;
      player.play();
      playerRef.current = player;
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

  return { loadAndPlay, pause, resume, stop, setRate };
}
