import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';
import { DEVOTIONAL_STARTER_TRACKS } from '@/lib/devotional-audio';
import { supabase } from '@/lib/supabase';

// ── Bhakti Phase 6 — native equivalent of the PWA's
// src/app/(main)/bhakti/zen/page.tsx ("Sattvic Mode"), scoped per the
// user's "Breathing guide + real audio" decision: the 4 real breath
// patterns with real phase timers, haptics, and looping ambient audio —
// but using the 4 pre-recorded devotional tracks already ported in Phase
// 3 (lib/devotional-audio.ts) instead of PWA's live WebAudio oscillator
// synthesis (bowl/om/tanpura/instrumental tones), which RN has no
// equivalent for. The animated SVG mandala, 5 particle-system environment
// themes, and the full-screen "Focus" overlay are intentionally not
// ported — this is a breathing timer + audio, not the full ambience app.
// Session logging still writes to `sattvic_sessions` with the same
// graceful column-fallback insert PWA uses, so both platforms' practice
// history stays in the same table. `environment` is hardcoded to
// 'default' (native has no sanctuary picker to source a real value from).

type PatternId = 'nadi' | 'box' | 'sleep' | 'shitali';
type Phase = 'inhale' | 'hold' | 'exhale' | 'holdAfter';

const BREATH_PATTERNS: { id: PatternId; label: string; inhale: number; hold: number; exhale: number; holdAfter?: number; desc: string }[] = [
  { id: 'nadi', label: 'Nāḍī Śodhana', inhale: 4, hold: 2, exhale: 6, desc: 'Calming · Reduces anxiety' },
  { id: 'box', label: 'Box Breath', inhale: 4, hold: 4, exhale: 4, holdAfter: 4, desc: 'Focus · Equalizes mind' },
  { id: 'sleep', label: '4-7-8', inhale: 4, hold: 7, exhale: 8, desc: 'Sleep · Deep rest' },
  { id: 'shitali', label: 'Shītalī', inhale: 6, hold: 0, exhale: 6, desc: 'Cooling · Reduces heat' },
];

const PHASE_META: Record<Phase, { label: string; color: string }> = {
  inhale: { label: 'Inhale', color: COLORS.brandGold },
  hold: { label: 'Hold', color: '#A89880' },
  exhale: { label: 'Exhale', color: '#D4B483' },
  holdAfter: { label: 'Hold', color: '#A89880' },
};

const PRESET_DURATIONS = [12, 24, 48];

// Real, pre-recorded, looping tracks standing in for PWA's live-synthesized
// ambient tones — see the file-level comment above.
const AMBIENT_OPTIONS = [
  { id: 'off', label: 'Off', trackId: null as string | null },
  { id: 'gayatri', label: 'Gayatri', trackId: 'gayatri-mantra-as-it-is' },
  { id: 'guru', label: 'Guru Stotram', trackId: 'guru-stotram' },
  { id: 'kirtan', label: 'Kirtan', trackId: 'kirtana-in-hindi' },
  { id: 'chant', label: 'Sacred Chant', trackId: 'usnidha-sitatapatra' },
];

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function BreathCircle({ running, phase, remaining, cycleCount, dur }: { running: boolean; phase: Phase; remaining: number; cycleCount: number; dur: number }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const meta = PHASE_META[phase];
  const targetScale = phase === 'exhale' ? 0.82 : 1.18;

  useEffect(() => {
    if (!running) {
      Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(scaleAnim, {
      toValue: targetScale,
      duration: Math.max(300, dur * 1000),
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [running, phase, dur, scaleAnim, targetScale]);

  return (
    <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: `${meta.color}30` }} />
      <Animated.View
        style={{
          width: 170,
          height: 170,
          borderRadius: 85,
          borderWidth: 1.5,
          borderColor: `${meta.color}55`,
          transform: [{ scale: scaleAnim }],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: `${meta.color}22`,
          borderWidth: 1,
          borderColor: `${meta.color}45`,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: scaleAnim }],
        }}
      />
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ ...TYPE.chip, letterSpacing: 2, textTransform: 'uppercase', color: meta.color }}>
          {running ? meta.label : 'Ready'}
        </Text>
        <Text style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: '300', color: meta.color, marginTop: 4 }}>
          {formatClock(remaining)}
        </Text>
        {running ? (
          <Text style={{ ...TYPE.micro, color: `${meta.color}90`, marginTop: 4 }}>
            Cycle {cycleCount} · {Math.round(remaining / 60)}m left
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function SattvicModeScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);
  const audio = useAudioPlayer();

  const [tradition, setTradition] = useState('hindu');
  const [pattern, setPattern] = useState<PatternId>('nadi');
  const [duration, setDuration] = useState(24);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [remaining, setRemaining] = useState(24 * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [cycleCount, setCycleCount] = useState(0);
  const [ambientId, setAmbientId] = useState('off');
  const [sessionMins, setSessionMins] = useState(0);
  const [savedMsg, setSavedMsg] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minuteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSecs = duration * 60;
  const activePattern = BREATH_PATTERNS.find((p) => p.id === pattern)!;
  const activeAmbient = AMBIENT_OPTIONS.find((a) => a.id === ambientId)!;

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('tradition').eq('id', user.id).maybeSingle();
        setTradition(data?.tradition ?? 'hindu');
      } catch {
        // guest — keep default
      }
    })();
  }, []);

  // Reset on duration/pattern change
  useEffect(() => {
    setRemaining(duration * 60);
    setRunning(false);
    setPhase('inhale');
    setCycleCount(0);
  }, [duration, pattern]);

  const saveSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const row = {
        user_id: user.id,
        mode: 'breath',
        duration_secs: totalSecs,
        environment: 'default',
        mantra: null as string | null,
        tradition,
        ambient_id: ambientId,
        completion_type: 'completed',
        source_route: '/bhakti/zen',
      };
      const { error } = await supabase.from('sattvic_sessions').insert(row);
      if (error) {
        const { tradition: _t, ambient_id: _a, completion_type: _c, source_route: _s, ...legacyRow } = row;
        await supabase.from('sattvic_sessions').insert(legacyRow);
      }
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch {
      // non-fatal — session tracking is a bonus, not a blocker
    }
  }, [totalSecs, tradition, ambientId]);

  // Countdown
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((cur) => {
        if (cur <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          try { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
          void saveSession();
          return 0;
        }
        return cur - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, saveSession]);

  // Breath phase cycle
  useEffect(() => {
    if (!running) {
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
      return;
    }
    function cyclePhase(current: Phase) {
      try {
        void Haptics.impactAsync(current.includes('hold') ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      setPhase(current);

      let nextPhase: Phase = 'inhale';
      let durationSec = activePattern.inhale;

      if (current === 'inhale') {
        if (activePattern.hold > 0) { nextPhase = 'hold'; durationSec = activePattern.hold; }
        else { nextPhase = 'exhale'; durationSec = activePattern.exhale; }
      } else if (current === 'hold') {
        nextPhase = 'exhale'; durationSec = activePattern.exhale;
      } else if (current === 'exhale') {
        setCycleCount((c) => c + 1);
        if (activePattern.holdAfter && activePattern.holdAfter > 0) {
          nextPhase = 'holdAfter'; durationSec = activePattern.holdAfter;
        } else {
          nextPhase = 'inhale'; durationSec = activePattern.inhale;
        }
      } else if (current === 'holdAfter') {
        nextPhase = 'inhale'; durationSec = activePattern.inhale;
      }
      phaseTimeoutRef.current = setTimeout(() => cyclePhase(nextPhase), durationSec * 1000);
    }
    cyclePhase('inhale');
    return () => { if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pattern]);

  // Ambient playback
  useEffect(() => {
    if (!running || !activeAmbient.trackId) {
      void audio.pause();
      return;
    }
    const track = DEVOTIONAL_STARTER_TRACKS.find((t) => t.id === activeAmbient.trackId);
    if (track) void audio.loadAndPlay(track.audioUrl, true);
    return () => { void audio.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, ambientId]);

  // Minutes-practiced ticker
  useEffect(() => {
    if (!running) {
      if (minuteIntervalRef.current) clearInterval(minuteIntervalRef.current);
      return;
    }
    minuteIntervalRef.current = setInterval(() => setSessionMins((m) => m + 1), 60000);
    return () => { if (minuteIntervalRef.current) clearInterval(minuteIntervalRef.current); };
  }, [running]);

  const dur = phase === 'hold' || phase === 'holdAfter' ? 0.3
    : phase === 'inhale' ? activePattern.inhale
    : phase === 'exhale' ? activePattern.exhale
    : (activePattern.holdAfter ?? 1);

  function toggleRunning() {
    try { void Haptics.selectionAsync(); } catch {}
    setRunning((r) => !r);
  }
  function reset() {
    setRunning(false);
    setRemaining(totalSecs);
    setPhase('inhale');
    setCycleCount(0);
  }
  function applyCustomDuration() {
    const v = parseInt(customInput, 10);
    if (v > 0 && v <= 180) { setDuration(v); setShowCustom(false); setCustomInput(''); }
  }

  const modeLabel = tradition === 'sikh' ? 'Simran Breath' : tradition === 'buddhist' ? 'Ānāpāna' : tradition === 'jain' ? 'Samayika Breath' : 'Prāṇāyāma';
  const gold = COLORS.brandGold;

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton showLabel={false} />
          <Text style={{ ...TYPE.micro, letterSpacing: 2, textTransform: 'uppercase', color: gold }}>{modeLabel}</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          {/* Pattern pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {BREATH_PATTERNS.map((p) => {
              const active = pattern === p.id;
              return (
                <PressableSurface key={p.id} haptic="selection" onPress={() => setPattern(p.id)} style={{ borderRadius: 18 }}>
                  <View style={{ borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: active ? `${gold}18` : theme.card, borderWidth: 1, borderColor: active ? `${gold}50` : theme.border, minWidth: 96, alignItems: 'center' }}>
                    <Text style={{ ...TYPE.caption, fontWeight: '600', color: active ? theme.text : theme.dim }}>{p.label}</Text>
                    <Text style={{ ...TYPE.micro, color: theme.dim, marginTop: 2 }}>
                      {p.inhale}-{p.hold}-{p.exhale}{p.holdAfter ? `-${p.holdAfter}` : ''}
                    </Text>
                  </View>
                </PressableSurface>
              );
            })}
          </ScrollView>

          {/* Breath circle */}
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <BreathCircle running={running} phase={phase} remaining={remaining} cycleCount={cycleCount} dur={dur} />
          </View>
          <Text style={{ ...TYPE.caption, color: theme.dim, textAlign: 'center' }}>{activePattern.desc}</Text>

          {/* Duration */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {PRESET_DURATIONS.map((v) => (
              <PressableSurface key={v} haptic="selection" onPress={() => { setDuration(v); setShowCustom(false); }} style={{ borderRadius: 999 }}>
                <View style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: duration === v && !showCustom ? gold : theme.card, borderWidth: 1, borderColor: duration === v && !showCustom ? gold : theme.border }}>
                  <Text style={{ ...TYPE.caption, fontWeight: '700', color: duration === v && !showCustom ? '#1c1208' : theme.dim }}>{v} min</Text>
                </View>
              </PressableSurface>
            ))}
            <PressableSurface haptic="selection" onPress={() => setShowCustom((v) => !v)} style={{ borderRadius: 999 }}>
              <View style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: showCustom ? `${gold}18` : theme.card, borderWidth: 1, borderColor: showCustom ? `${gold}50` : theme.border }}>
                <Text style={{ ...TYPE.caption, fontWeight: '700', color: theme.dim }}>Custom</Text>
              </View>
            </PressableSurface>
          </View>

          {showCustom ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, paddingHorizontal: 12, paddingVertical: 8 }}>
              <TextInput
                value={customInput}
                onChangeText={setCustomInput}
                placeholder="e.g. 60"
                placeholderTextColor={theme.dim}
                keyboardType="number-pad"
                style={{ flex: 1, ...TYPE.body, color: theme.text }}
              />
              <Text style={{ ...TYPE.caption, color: theme.dim }}>min</Text>
              <PressableSurface haptic="selection" onPress={applyCustomDuration} style={{ borderRadius: 10 }}>
                <View style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: gold }}>
                  <Text style={{ ...TYPE.caption, fontWeight: '700', color: '#1c1208' }}>Set</Text>
                </View>
              </PressableSurface>
            </View>
          ) : null}

          {/* Progress bar */}
          <View style={{ height: 3, borderRadius: 2, backgroundColor: theme.border, overflow: 'hidden' }}>
            <View style={{ width: `${((totalSecs - remaining) / totalSecs) * 100}%`, height: '100%', backgroundColor: gold }} />
          </View>

          {/* Controls */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
            <PressableSurface haptic="selection" onPress={toggleRunning} style={{ borderRadius: 999 }}>
              <View style={{ borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: running ? theme.card : gold, borderWidth: 1, borderColor: gold }}>
                <Text style={{ ...TYPE.body, fontWeight: '700', color: running ? theme.text : '#1c1208' }}>{running ? 'Pause' : 'Begin'}</Text>
              </View>
            </PressableSurface>
            <PressableSurface haptic="selection" onPress={reset} style={{ borderRadius: 999 }}>
              <View style={{ borderRadius: 999, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
                <Feather name="rotate-ccw" size={16} color={theme.dim} />
              </View>
            </PressableSurface>
          </View>

          {savedMsg ? (
            <Text style={{ ...TYPE.caption, color: gold, textAlign: 'center' }}>Session saved 🙏</Text>
          ) : null}

          {/* Ambient */}
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 14, gap: 8 }}>
            <Text style={{ ...TYPE.micro, letterSpacing: 1, textTransform: 'uppercase', color: theme.dim }}>Ambient Sound</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {AMBIENT_OPTIONS.map((opt) => {
                const active = ambientId === opt.id;
                return (
                  <PressableSurface key={opt.id} haptic="selection" onPress={() => setAmbientId(opt.id)} style={{ borderRadius: 999 }}>
                    <View style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: active ? `${gold}18` : theme.bg, borderWidth: 1, borderColor: active ? `${gold}50` : theme.border }}>
                      <Text style={{ ...TYPE.caption, fontWeight: '600', color: active ? theme.text : theme.dim }}>{opt.label}</Text>
                    </View>
                  </PressableSurface>
                );
              })}
            </ScrollView>
            {ambientId !== 'off' && !running ? (
              <Text style={{ ...TYPE.micro, color: theme.dim, textAlign: 'center' }}>Ambient plays when the session begins</Text>
            ) : null}
          </View>

          {/* Today's practice */}
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 14, gap: 10 }}>
            <Text style={{ ...TYPE.micro, letterSpacing: 1, textTransform: 'uppercase', color: gold }}>Today&apos;s Practice</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { value: sessionMins > 0 ? `${sessionMins}m` : '—', label: 'Sat' },
                { value: activePattern.label, label: 'Pattern' },
                { value: activeAmbient.label, label: 'Ambient' },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontFamily: FONTS.serifBold, fontSize: 15, color: theme.text }} numberOfLines={1}>{item.value}</Text>
                  <Text style={{ ...TYPE.micro, color: theme.dim, textTransform: 'uppercase' }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
