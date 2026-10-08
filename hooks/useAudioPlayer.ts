import { useCallback, useMemo, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioMetadata, type AudioPlayer } from 'expo-audio';
import { useFocusEffect } from 'expo-router';

type AudioRate = 0.75 | 1.0 | 1.25;

type AudioSource = string | number | { uri: string };
export type AudioPlaybackOptions = {
  backgroundPlayback?: boolean;
  lockScreenMetadata?: AudioMetadata;
};

type UseAudioPlayerResult = {
  loadAndPlay: (source: AudioSource, loop?: boolean, onComplete?: () => void, options?: AudioPlaybackOptions) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  setRate: (rate: AudioRate) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
};

let configuredBackgroundPlayback: boolean | null = null;
let audioModeQueue: Promise<void> = Promise.resolve();

async function configureAudioMode(backgroundPlayback: boolean) {
  const operation = audioModeQueue.then(async () => {
    if (configuredBackgroundPlayback === backgroundPlayback) return;
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: backgroundPlayback,
      interruptionMode: 'doNotMix',
    });
    configuredBackgroundPlayback = backgroundPlayback;
  });
  audioModeQueue = operation.catch(() => {});
  await operation;
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const playerRef = useRef<AudioPlayer | null>(null);
  const statusSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const generationRef = useRef(0);
  const focusedRef = useRef(true);
  const backgroundPlaybackRef = useRef(false);

  const stop = useCallback(async () => {
    generationRef.current += 1;
    statusSubscriptionRef.current?.remove();
    statusSubscriptionRef.current = null;
    const player = playerRef.current;
    playerRef.current = null;
    const shouldRestoreAudioMode = backgroundPlaybackRef.current;
    try {
      if (player) {
        if (backgroundPlaybackRef.current) player.setActiveForLockScreen(false);
        player.pause();
        await player.seekTo(0);
        player.remove();
      }
    } catch {
      // already removed
    } finally {
      if (shouldRestoreAudioMode) {
        backgroundPlaybackRef.current = false;
        await configureAudioMode(false).catch(() => {
          configuredBackgroundPlayback = null;
        });
      }
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
    async (source: AudioSource, loop = false, onComplete?: () => void, options?: AudioPlaybackOptions) => {
      const stopping = stop();
      const generation = generationRef.current;
      await stopping;
      const backgroundPlayback = options?.backgroundPlayback === true;
      let player: AudioPlayer | null = null;
      try {
        await configureAudioMode(backgroundPlayback);
        if (!focusedRef.current || generation !== generationRef.current) {
          if (backgroundPlayback) await configureAudioMode(false);
          return;
        }

        player = createAudioPlayer(source);
        player.loop = loop;
        player.volume = 1.0;
        const activePlayer = player;
        const subscription = activePlayer.addListener('playbackStatusUpdate', (status) => {
          if (!loop && status.didJustFinish && playerRef.current === activePlayer) {
            statusSubscriptionRef.current?.remove();
            statusSubscriptionRef.current = null;
            if (playerRef.current === activePlayer) {
              playerRef.current = null;
              try {
                activePlayer.remove();
              } catch {
                // already removed
              }
            }
            const finishPlayback = async () => {
              if (backgroundPlayback) {
                backgroundPlaybackRef.current = false;
                try {
                  activePlayer.setActiveForLockScreen(false);
                } catch {
                  // lock-screen state may already be cleared by the OS
                }
                await configureAudioMode(false).catch(() => {
                  configuredBackgroundPlayback = null;
                });
              }
              onComplete?.();
            };
            void finishPlayback();
          }
        });
        statusSubscriptionRef.current = subscription;
        playerRef.current = activePlayer;
        backgroundPlaybackRef.current = backgroundPlayback;
        if (backgroundPlayback && options?.lockScreenMetadata) {
          try {
            activePlayer.setActiveForLockScreen(true, options.lockScreenMetadata, {
              showSeekBackward: true,
              showSeekForward: true,
            });
          } catch {
            // Playback still works if this platform cannot expose lock-screen metadata.
          }
        }
        activePlayer.play();
      } catch (error) {
        statusSubscriptionRef.current?.remove();
        statusSubscriptionRef.current = null;
        if (playerRef.current === player) playerRef.current = null;
        try {
          player?.setActiveForLockScreen(false);
          player?.remove();
        } catch {
          // Player setup did not complete.
        }
        if (backgroundPlayback) {
          backgroundPlaybackRef.current = false;
          await configureAudioMode(false).catch(() => {
            configuredBackgroundPlayback = null;
          });
        }
        throw error;
      }
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
