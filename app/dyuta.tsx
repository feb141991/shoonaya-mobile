import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Text, TextInput, useColorScheme, View, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { useReducedMotion } from '@/components/ui/Motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SPACING, TYPE, themeColor } from '@/lib/constants';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { DYUTA_COPY, type DyutaCopy } from '@/lib/dyuta/copy';
import {
  chooseGuideStake,
  continueAfterHandoff,
  createDyutaMatch,
  declareStake,
  getGuideRerollIndex,
  getMatchOutcome,
  getPublicResponseState,
  keepCurrentRoll,
  maxAvailableStake,
  rerollCurrentDie,
  respondToStake,
  rollForSide,
  shouldGuideAccept,
  type DicePair,
  type DyutaBoardColor,
  type DyutaMatchState,
  type DyutaMode,
  type DyutaRoundRecord,
  type DyutaSide,
  type DyutaStake,
  type GuideDifficulty,
} from '@/lib/dyuta/engine';
import { rollDie, rollDicePair } from '@/lib/dyuta/random';
import {
  clearDyutaMatch,
  readDyutaMatch,
  readDyutaPreferences,
  recordDyutaMatchCompletion,
  writeDyutaMatch,
  type DyutaPreferences,
} from '@/lib/dyuta/storage';

const GUIDE_ASSETS: Record<'neutral' | 'thinking' | 'pleased' | 'defeat', ImageSource> = {
  neutral: require('@/assets/dyuta/guide-neutral.png'),
  thinking: require('@/assets/dyuta/guide-thinking.png'),
  pleased: require('@/assets/dyuta/guide-pleased.png'),
  defeat: require('@/assets/dyuta/guide-defeat.png'),
};

const DIE_PIPS: Record<number, readonly number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function DyutaScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = DYUTA_COPY[language];
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const reducedMotion = useReducedMotion();
  const recapRef = useRef<View>(null);
  const generation = useRef(0);
  const [match, setMatch] = useState<DyutaMatchState | null>(null);
  const [mode, setMode] = useState<DyutaMode>('solo');
  const [difficulty, setDifficulty] = useState<GuideDifficulty>('medium');
  const [playerOne, setPlayerOne] = useState('Player 1');
  const [playerTwo, setPlayerTwo] = useState('Player 2');
  const [hydrated, setHydrated] = useState(false);
  const [rollingSide, setRollingSide] = useState<DyutaSide | null>(null);
  const [guideThinking, setGuideThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [preferences, setPreferences] = useState<DyutaPreferences>({ hapticsEnabled: true, tutorialCompleted: false, unlockedFunFacts: 0, completedMatches: 0 });
  const previousComplete = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([readDyutaMatch(), readDyutaPreferences()]).then(([saved, prefs]) => {
      if (!cancelled) { setMatch(saved); setPreferences(prefs); }
    }).finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated || !match) return;
    void writeDyutaMatch(match).catch(() => {});
  }, [hydrated, match]);

  useEffect(() => {
    const complete = match?.phase === 'complete';
    if (complete && !previousComplete.current) void recordDyutaMatchCompletion().then(setPreferences).catch(() => {});
    previousComplete.current = complete;
  }, [match?.phase]);

  const guidePhase = match?.mode === 'solo' && match.activeSide === 'guide' ? match.phase : null;
  useEffect(() => {
    if (!match || match.mode !== 'solo' || match.activeSide !== 'guide' || busy) return;
    const currentGeneration = generation.current;
    const act = async () => {
      if (match.phase === 'awaiting_challenger_roll' || match.phase === 'awaiting_responder_roll') {
        setBusy(true); setRollingSide('guide');
        try {
          const dice = await rollDicePair();
          const rerollIndex = getGuideRerollIndex(dice, match.guideDifficulty);
          const reroll = rerollIndex === null ? null : await rollDie();
          await wait(reducedMotion ? 80 : 720);
          if (generation.current !== currentGeneration) return;
          setMatch((state) => {
            if (!state || state.activeSide !== 'guide') return state;
            const rolled = rollForSide(state, 'guide', dice);
            return rerollIndex === null ? keepCurrentRoll(rolled) : rerollCurrentDie(rolled, rerollIndex, reroll as 1 | 2 | 3 | 4 | 5 | 6);
          });
        } finally { setRollingSide(null); setBusy(false); }
      } else if (match.phase === 'awaiting_declaration') {
        setGuideThinking(true); setBusy(true);
        await wait(reducedMotion ? 80 : 520);
        if (generation.current === currentGeneration) setMatch((state) => state ? declareStake(state, 'guide', chooseGuideStake(state)) : state);
        setGuideThinking(false); setBusy(false);
      } else if (match.phase === 'awaiting_response') {
        setGuideThinking(true); setBusy(true);
        await wait(reducedMotion ? 80 : 620);
        if (generation.current === currentGeneration) setMatch((state) => state ? respondToStake(state, 'guide', shouldGuideAccept(getPublicResponseState(state), state.guideDifficulty) ? 'accept' : 'yield') : state);
        setGuideThinking(false); setBusy(false);
      }
    };
    void act().catch(() => { setBusy(false); setGuideThinking(false); setRollingSide(null); });
  }, [busy, guidePhase, match, reducedMotion]);

  const startMatch = useCallback(() => {
    generation.current += 1;
    setBusy(false); setRollingSide(null); setGuideThinking(false);
    const names = mode === 'pass_and_play' ? { player: playerOne, guide: playerTwo } : undefined;
    setMatch(createDyutaMatch(difficulty, mode, names));
  }, [difficulty, mode, playerOne, playerTwo]);

  const rollPlayer = useCallback(async () => {
    if (!match || match.activeSide !== 'player' || busy) return;
    const currentGeneration = generation.current;
    setBusy(true); setRollingSide('player');
    try {
      const dice = await rollDicePair();
      await wait(reducedMotion ? 80 : 720);
      if (generation.current === currentGeneration) setMatch((state) => state ? rollForSide(state, 'player', dice) : state);
    } finally { setBusy(false); setRollingSide(null); }
  }, [busy, match, reducedMotion]);

  const keep = useCallback(() => setMatch((state) => state ? keepCurrentRoll(state) : state), []);
  const reroll = useCallback(async (index: 0 | 1) => {
    if (busy) return;
    setBusy(true); setRollingSide('player');
    try { const value = await rollDie(); await wait(reducedMotion ? 80 : 520); setMatch((state) => state ? rerollCurrentDie(state, index, value) : state); }
    finally { setBusy(false); setRollingSide(null); }
  }, [busy, reducedMotion]);

  const declare = useCallback((stake: DyutaStake) => setMatch((state) => state ? declareStake(state, 'player', stake) : state), []);
  const respond = useCallback((response: 'accept' | 'yield') => setMatch((state) => state ? respondToStake(state, 'player', response) : state), []);
  const continueHandoff = useCallback(() => setMatch((state) => state ? continueAfterHandoff(state) : state), []);
  const reset = useCallback(() => {
    Alert.alert(copy.discardTitle, copy.discardMessage, [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.discard, style: 'destructive', onPress: () => { generation.current += 1; void clearDyutaMatch(); setMatch(null); } },
    ]);
  }, [copy]);

  if (!hydrated) return <Screen style={{ backgroundColor: theme.bg }}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.brand} /></View></Screen>;

  const latest = match?.history.at(-1) ?? null;
  const outcome = match ? getMatchOutcome(match) : null;
  const playerLabel = match?.mode === 'pass_and_play' ? match.playerNames.player : copy.player;
  const guideLabel = match?.mode === 'pass_and_play' ? match.playerNames.guide : copy.guideName;
  const guideMood = guideThinking || rollingSide === 'guide' ? 'thinking' : outcome === 'player_win' ? 'defeat' : latest?.winner === 'guide' ? 'pleased' : 'neutral';
  const visibleRoll = getVisibleRoll(match);
  const status = getStatus(match, copy, playerLabel, guideLabel);
  const canPlayerRoll = match?.activeSide === 'player' && (match.phase === 'awaiting_challenger_roll' || match.phase === 'awaiting_responder_roll');
  const canPlayerDecide = match?.activeSide === 'player' && (match.phase === 'challenger_decision' || match.phase === 'responder_decision');
  const canDeclare = match?.activeSide === 'player' && match.phase === 'awaiting_declaration';
  const canRespond = match?.activeSide === 'player' && match.phase === 'awaiting_response';

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
      <LinearGradient colors={isDark ? [theme.bg, theme.card, theme.bg] : [COLORS.homeRaisedLight, theme.bg, theme.card]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.md }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <BackButton label={copy.backLabel} variant="glass" showLabel={false} fallbackHref="/play" />
            <View style={{ flex: 1 }}><Text style={{ ...TYPE.title, color: theme.text }}>{copy.gameTitle}</Text><Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.gameSubtitle}</Text></View>
            <View style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, borderRadius: RADII.pill, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Feather name="wifi-off" size={18} color={theme.brand} /></View>
          </View>

          {!match ? (
            <SetupCard mode={mode} onMode={setMode} difficulty={difficulty} onDifficulty={setDifficulty} playerOne={playerOne} playerTwo={playerTwo} onPlayerOne={setPlayerOne} onPlayerTwo={setPlayerTwo} onStart={startMatch} copy={copy} theme={theme} />
          ) : (
            <>
              <SabhaBoard match={match} playerLabel={playerLabel} guideLabel={guideLabel} guideMood={guideMood} visibleRoll={visibleRoll} rollingSide={rollingSide} status={status} latest={latest} copy={copy} theme={theme} reducedMotion={reducedMotion} />

              <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.premiumBorder, borderWidth: 1, gap: SPACING.sm }}>
                {match.phase === 'handoff' ? <PrimaryAction label={copy.continueTurn} onPress={continueHandoff} theme={theme} /> : null}
                {canPlayerRoll ? <PrimaryAction label={copy.roll} onPress={() => void rollPlayer()} busy={busy} disabled={busy} theme={theme} /> : null}
                {canPlayerDecide ? <View style={{ gap: SPACING.sm }}><PrimaryAction label={copy.keep} onPress={keep} disabled={busy} theme={theme} /><View style={{ flexDirection: 'row', gap: SPACING.sm }}><SecondaryAction label={copy.rerollFirst} onPress={() => void reroll(0)} disabled={busy} theme={theme} /><SecondaryAction label={copy.rerollSecond} onPress={() => void reroll(1)} disabled={busy} theme={theme} /></View></View> : null}
                {canDeclare ? <View style={{ gap: SPACING.sm }}><Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>{copy.declarePrompt}</Text><View style={{ flexDirection: 'row', gap: SPACING.sm }}>{([1, 2, 3] as DyutaStake[]).map((stake) => <StakeAction key={stake} stake={stake} disabled={stake > maxAvailableStake(match)} onPress={() => declare(stake)} copy={copy} theme={theme} />)}</View></View> : null}
                {canRespond && match.declaredStake ? <View style={{ gap: SPACING.md }}><Text style={{ ...TYPE.body, color: theme.text, textAlign: 'center' }}>{copy.responsePrompt.replace('{name}', guideLabel).replace('{count}', String(match.declaredStake))}</Text><PrimaryAction label={copy.accept} onPress={() => respond('accept')} theme={theme} /><SecondaryAction label={copy.yield} onPress={() => respond('yield')} theme={theme} /></View> : null}
                {match.activeSide === 'guide' && match.phase !== 'complete' && match.phase !== 'handoff' ? <View style={{ alignItems: 'center', gap: SPACING.sm }}><ActivityIndicator color={theme.brand} /><Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.guideThinking}</Text></View> : null}
                {match.phase === 'complete' ? <View style={{ gap: SPACING.md }}><Text style={{ ...TYPE.title, color: theme.text, textAlign: 'center' }}>{status}</Text><PrimaryAction label={copy.shareRecap} onPress={() => void shareCapturedShoonayaCard(recapRef, { fileName: 'shoonaya-dyuta-sabha.png', dialogTitle: copy.shareRecap })} theme={theme} /><SecondaryAction label={copy.startMatch} onPress={startMatch} theme={theme} /><SecondaryAction label={copy.close} onPress={() => router.replace('/play')} theme={theme} /></View> : null}
              </Card>

              <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
                <PressableSurface accessibilityLabel={rulesOpen ? copy.hideRules : copy.showRules} accessibilityState={{ expanded: rulesOpen }} onPress={() => setRulesOpen((value) => !value)} haptic="selection" style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.rulesTitle}</Text><Feather name={rulesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.brand} /></PressableSurface>
                {rulesOpen ? <Text style={{ ...TYPE.body, color: theme.dim, marginTop: SPACING.sm }}>{copy.rulesBody}</Text> : null}
              </Card>
              {match.phase !== 'complete' ? <SecondaryAction label={copy.changeMode} onPress={reset} theme={theme} /> : null}
            </>
          )}
        </ScrollView>
      </LinearGradient>
      {match?.phase === 'complete' ? <MatchRecapCard ref={recapRef} match={match} playerLabel={playerLabel} guideLabel={guideLabel} copy={copy} theme={theme} /> : null}
    </Screen>
  );
}

function SabhaBoard({ match, playerLabel, guideLabel, guideMood, visibleRoll, rollingSide, status, latest, copy, theme, reducedMotion }: {
  match: DyutaMatchState; playerLabel: string; guideLabel: string; guideMood: keyof typeof GUIDE_ASSETS; visibleRoll: DicePair | null; rollingSide: DyutaSide | null; status: string; latest: DyutaRoundRecord | null; copy: DyutaCopy; theme: ReturnType<typeof themeColor>; reducedMotion: boolean;
}) {
  return (
    <Card elevated tone="auto" style={{ padding: 0, overflow: 'hidden', backgroundColor: theme.card, borderColor: theme.premiumBorder, borderWidth: 1 }}>
      <LinearGradient colors={[theme.card, theme.brandSoft, theme.card]} style={{ padding: SPACING.md, gap: SPACING.md }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: -70, alignSelf: 'center', width: 230, height: 150, borderRadius: 115, borderWidth: 1, borderColor: theme.premiumBorder }} />
        <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: SPACING.sm }}>
          <Seat label={playerLabel} seals={match.seals.player} active={match.activeSide === 'player' && match.phase !== 'complete'} color={boardColorValue(match.identities.player.color, theme)} copy={copy} theme={theme} />
          <GuidePortrait mood={guideMood} label={guideLabel} seals={match.seals.guide} active={match.activeSide === 'guide' && match.phase !== 'complete'} copy={copy} theme={theme} />
        </View>
        <Text accessibilityLiveRegion="polite" style={{ ...TYPE.cardHeading, color: theme.text, textAlign: 'center' }}>{status}</Text>
        <DiceStage dice={visibleRoll} rolling={rollingSide !== null} theme={theme} copy={copy} reducedMotion={reducedMotion} />
        <SabhaLamps match={match} copy={copy} theme={theme} />
        {latest ? <RoundReveal record={latest} playerLabel={playerLabel} guideLabel={guideLabel} copy={copy} theme={theme} /> : null}
      </LinearGradient>
    </Card>
  );
}

function GuidePortrait({ mood, label, seals, active, copy, theme }: { mood: keyof typeof GUIDE_ASSETS; label: string; seals: number; active: boolean; copy: DyutaCopy; theme: ReturnType<typeof themeColor> }) {
  return <View accessible accessibilityLabel={`${label}, ${seals} ${copy.seals}`} accessibilityState={{ selected: active }} style={{ flex: 1, minHeight: 104, borderRadius: RADII.lg, borderWidth: 1, borderColor: active ? theme.brand : theme.border, backgroundColor: active ? theme.brandSoft : theme.cardSoft, padding: SPACING.sm, alignItems: 'center', gap: 2 }}><Image source={GUIDE_ASSETS[mood]} style={{ width: 52, height: 52, borderRadius: 26 }} contentFit="cover" /><Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.text }}>{label}</Text><Text style={{ ...TYPE.metric, color: theme.brand }}>{seals}</Text></View>;
}

function Seat({ label, seals, active, color, copy, theme }: { label: string; seals: number; active: boolean; color: string; copy: DyutaCopy; theme: ReturnType<typeof themeColor> }) {
  return <View accessible accessibilityLabel={`${label}, ${seals} ${copy.seals}`} accessibilityState={{ selected: active }} style={{ flex: 1, minHeight: 104, borderRadius: RADII.lg, borderWidth: 1, borderColor: active ? color : theme.border, backgroundColor: active ? theme.brandSoft : theme.cardSoft, padding: SPACING.sm, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs }}><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}><Feather name="sun" size={22} color={theme.textOnBrand} /></View><Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.text }}>{label}</Text><Text style={{ ...TYPE.metric, color: theme.brand }}>{seals}</Text></View>;
}

function DiceStage({ dice, rolling, theme, copy, reducedMotion }: { dice: DicePair | null; rolling: boolean; theme: ReturnType<typeof themeColor>; copy: DyutaCopy; reducedMotion: boolean }) {
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (!rolling || reducedMotion) { motion.setValue(0); return; } const animation = Animated.loop(Animated.sequence([Animated.timing(motion, { toValue: 1, duration: 180, easing: Easing.linear, useNativeDriver: true }), Animated.timing(motion, { toValue: 0, duration: 180, easing: Easing.linear, useNativeDriver: true })])); animation.start(); return () => animation.stop(); }, [motion, reducedMotion, rolling]);
  const transform = { transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) }, { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '18deg'] }) }] };
  return <View style={{ minHeight: 190, overflow: 'hidden', borderRadius: RADII.xl, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }}><View pointerEvents="none" style={{ position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 1, borderColor: theme.premiumBorder }} /><Text style={{ ...TYPE.chip, color: theme.brand, textTransform: 'uppercase' }}>{copy.concealedThrow}</Text><Animated.View style={[{ flexDirection: 'row', gap: SPACING.lg }, transform]}><DiceFace value={rolling ? null : dice?.[0] ?? null} label={copy.firstDie} theme={theme} /><DiceFace value={rolling ? null : dice?.[1] ?? null} label={copy.secondDie} theme={theme} /></Animated.View></View>;
}

function SabhaLamps({ match, copy, theme }: { match: DyutaMatchState; copy: DyutaCopy; theme: ReturnType<typeof themeColor> }) {
  return <View accessible accessibilityLabel={`${copy.lampsLabel}. ${match.history.length} complete.`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.xs }}>{Array.from({ length: 7 }, (_, index) => { const record = match.history[index]; const current = !record && index === match.round - 1 && match.phase !== 'complete'; const dimmed = record?.overreach === true; const color = record?.winner === 'player' ? COLORS.sage : record?.winner === 'guide' ? theme.brand : theme.border; return <View key={index} accessible accessibilityLabel={record ? `${copy.round} ${index + 1}: ${record.winner}${dimmed ? `, ${copy.overreach}` : ''}` : `${copy.round} ${index + 1}`} style={{ alignItems: 'center', gap: 2, opacity: dimmed ? 0.42 : 1 }}><View style={{ width: 10, height: 15, borderRadius: RADII.pill, backgroundColor: record || current ? color : theme.borderSoft }} /><View style={{ width: 28, height: 10, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: record || current ? color : theme.cardSoft }} /></View>; })}</View>;
}

function RoundReveal({ record, playerLabel, guideLabel, copy, theme }: { record: DyutaRoundRecord; playerLabel: string; guideLabel: string; copy: DyutaCopy; theme: ReturnType<typeof themeColor> }) {
  const winner = record.winner === 'player' ? playerLabel : record.winner === 'guide' ? guideLabel : copy.drawTitle;
  const line = record.response === 'yield' ? copy.yieldedSeal.replace('{name}', record.responder === 'player' ? playerLabel : guideLabel) : copy.wonSeals.replace('{name}', winner).replace('{count}', String(record.sealsTransferred));
  return <View accessible accessibilityLiveRegion="polite" accessibilityLabel={line} style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SPACING.sm, alignItems: 'center', gap: 4 }}><Text style={{ ...TYPE.label, color: theme.text }}>{line}</Text>{record.overreach ? <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.overreach}</Text> : null}{record.response === 'accept' && record.responderRoll ? <View style={{ flexDirection: 'row', gap: SPACING.md }}><Text style={{ ...TYPE.caption, color: theme.dim }}>{record.challengerRoll.finalDice.join(' + ')}</Text><Text style={{ ...TYPE.caption, color: theme.brand }}>{copy.versus}</Text><Text style={{ ...TYPE.caption, color: theme.dim }}>{record.responderRoll.finalDice.join(' + ')}</Text></View> : null}</View>;
}

function SetupCard({ mode, onMode, difficulty, onDifficulty, playerOne, playerTwo, onPlayerOne, onPlayerTwo, onStart, copy, theme }: { mode: DyutaMode; onMode: (v: DyutaMode) => void; difficulty: GuideDifficulty; onDifficulty: (v: GuideDifficulty) => void; playerOne: string; playerTwo: string; onPlayerOne: (v: string) => void; onPlayerTwo: (v: string) => void; onStart: () => void; copy: DyutaCopy; theme: ReturnType<typeof themeColor> }) {
  return <Card elevated tone="auto" style={{ padding: SPACING.lg, backgroundColor: theme.card, borderColor: theme.premiumBorder, borderWidth: 1, gap: SPACING.md }}><Text style={{ ...TYPE.title, color: theme.text }}>{copy.modeTitle}</Text><View style={{ flexDirection: 'row', gap: SPACING.sm }}><Choice label={copy.soloMode} selected={mode === 'solo'} onPress={() => onMode('solo')} theme={theme} /><Choice label={copy.passAndPlayMode} selected={mode === 'pass_and_play'} onPress={() => onMode('pass_and_play')} theme={theme} /></View>{mode === 'solo' ? <View style={{ flexDirection: 'row', gap: SPACING.sm }}><Choice label={copy.difficultyEasy} selected={difficulty === 'easy'} onPress={() => onDifficulty('easy')} theme={theme} /><Choice label={copy.difficultyMedium} selected={difficulty === 'medium'} onPress={() => onDifficulty('medium')} theme={theme} /><Choice label={copy.difficultyHard} selected={difficulty === 'hard'} onPress={() => onDifficulty('hard')} theme={theme} /></View> : <View style={{ gap: SPACING.sm }}><NameInput value={playerOne} onChange={onPlayerOne} label={copy.playerOneLabel} theme={theme} /><NameInput value={playerTwo} onChange={onPlayerTwo} label={copy.playerTwoLabel} theme={theme} /></View>}<Text style={{ ...TYPE.body, color: theme.dim }}>{copy.rulesBody}</Text><PrimaryAction label={copy.startMatch} onPress={onStart} theme={theme} /></Card>;
}

function MatchRecapCard({ ref, match, playerLabel, guideLabel, copy, theme }: { ref: React.RefObject<View | null>; match: DyutaMatchState; playerLabel: string; guideLabel: string; copy: DyutaCopy; theme: ReturnType<typeof themeColor> }) {
  return <View ref={ref} collapsable={false} style={{ position: 'absolute', left: -10000, top: 0, width: 360, height: 640, backgroundColor: theme.bg, padding: 28, justifyContent: 'space-between' }}><View><Text style={{ fontFamily: FONTS.serif, fontSize: 34, color: theme.text }}>{copy.gameTitle}</Text><Text style={{ ...TYPE.body, color: theme.dim }}>{copy.matchComplete}</Text></View><View style={{ gap: 20 }}><Text style={{ fontFamily: FONTS.serif, fontSize: 26, color: theme.text }}>{playerLabel} {match.seals.player}</Text><Text style={{ fontFamily: FONTS.serif, fontSize: 26, color: theme.text }}>{guideLabel} {match.seals.guide}</Text><SabhaLamps match={match} copy={copy} theme={theme} /></View><Text style={{ ...TYPE.label, color: theme.brand }}>Shoonaya · {copy.experienceLabel}</Text></View>;
}

function getVisibleRoll(match: DyutaMatchState | null): DicePair | null {
  if (!match || match.phase === 'handoff' || match.phase === 'awaiting_response') return null;
  if (match.activeSide === match.challenger) return match.challengerRoll?.finalDice ?? null;
  return match.responderRoll?.finalDice ?? null;
}

function getStatus(match: DyutaMatchState | null, copy: DyutaCopy, playerLabel: string, guideLabel: string): string {
  if (!match) return copy.modeTitle;
  if (match.phase === 'complete') { const outcome = getMatchOutcome(match); return outcome === 'draw' ? copy.drawTitle : outcome === 'player_win' ? copy.playerWon.replace('{name}', playerLabel) : copy.opponentWon.replace('{name}', guideLabel); }
  if (match.phase === 'handoff') return copy.handoffPrompt.replace('{name}', match.activeSide === 'player' ? playerLabel : guideLabel);
  if (match.phase === 'awaiting_declaration') return copy.declarePrompt;
  if (match.phase === 'awaiting_response' && match.declaredStake) return copy.responsePrompt.replace('{name}', match.challenger === 'player' ? playerLabel : guideLabel).replace('{count}', String(match.declaredStake));
  return match.activeSide === 'player' ? copy.yourTurn : copy.guideTurn;
}

function DiceFace({ value, label, theme }: { value: number | null; label: string; theme: ReturnType<typeof themeColor> }) { const pips = value ? DIE_PIPS[value] ?? [] : []; return <View accessible accessibilityRole="image" accessibilityLabel={value ? `${label}: ${value}` : `${label}: concealed`} style={{ width: 72, height: 72, borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}>{value === null ? <Feather name="help-circle" size={24} color={theme.dim} /> : <View style={{ gap: 4 }}>{[0, 1, 2].map((row) => <View key={row} style={{ flexDirection: 'row', gap: 4 }}>{[0, 1, 2].map((column) => <View key={column} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pips.includes(row * 3 + column) ? theme.brand : 'transparent' }} />)}</View>)}</View>}</View>; }
function Choice({ label, selected, onPress, theme }: { label: string; selected: boolean; onPress: () => void; theme: ReturnType<typeof themeColor> }) { return <PressableSurface accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={label} onPress={onPress} haptic="selection" style={{ flex: 1, minHeight: MIN_TOUCH_TARGET, padding: SPACING.sm, borderRadius: RADII.md, borderWidth: 1, borderColor: selected ? theme.brand : theme.border, backgroundColor: selected ? theme.brandSoft : theme.bg, justifyContent: 'center' }}><Text style={{ ...TYPE.label, color: selected ? theme.brand : theme.text, textAlign: 'center' }}>{label}</Text></PressableSurface>; }
function NameInput({ value, onChange, label, theme }: { value: string; onChange: (v: string) => void; label: string; theme: ReturnType<typeof themeColor> }) { return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={label} placeholderTextColor={theme.dim} maxLength={24} style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: theme.border, borderRadius: RADII.md, color: theme.text, backgroundColor: theme.bg, ...TYPE.body }} />; }
function StakeAction({ stake, disabled, onPress, copy, theme }: { stake: DyutaStake; disabled: boolean; onPress: () => void; copy: DyutaCopy; theme: ReturnType<typeof themeColor> }) { return <PressableSurface accessibilityLabel={copy.declareStake.replace('{count}', String(stake))} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} haptic="selection" style={{ flex: 1, minHeight: 58, borderRadius: RADII.md, borderWidth: 1, borderColor: theme.brand, backgroundColor: disabled ? theme.cardSoft : theme.brandSoft, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1 }}><Text style={{ ...TYPE.metric, color: theme.brand }}>{stake}</Text><Text style={{ ...TYPE.chip, color: theme.dim }}>{copy.seals}</Text></PressableSurface>; }
function PrimaryAction({ label, onPress, disabled = false, busy = false, theme }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean; theme: ReturnType<typeof themeColor> }) { return <PressableSurface accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onPress} haptic="selection" style={{ minHeight: 52, borderRadius: RADII.lg, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md, opacity: disabled ? 0.5 : 1 }}>{busy ? <ActivityIndicator color={theme.textOnBrand} /> : <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: theme.textOnBrand }}>{label}</Text>}</PressableSurface>; }
function SecondaryAction({ label, onPress, disabled = false, theme }: { label: string; onPress: () => void; disabled?: boolean; theme: ReturnType<typeof themeColor> }) { return <PressableSurface accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} haptic="selection" style={{ flex: 1, minHeight: MIN_TOUCH_TARGET, borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm, opacity: disabled ? 0.5 : 1 }}><Text style={{ ...TYPE.label, color: theme.text, textAlign: 'center' }}>{label}</Text></PressableSurface>; }
function boardColorValue(color: DyutaBoardColor, theme: ReturnType<typeof themeColor>): string { if (color === 'gold') return theme.brand; if (color === 'sage') return COLORS.sage; if (color === 'navy') return COLORS.navy; return theme.earth; }
