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
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
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
  getVisibleDice,
  keepCurrentRoll,
  maxAvailableStake,
  rerollCurrentDie,
  respondToStake,
  rollForSide,
  shouldGuideAccept,
  type DicePair,
  type DyutaAvatarId,
  type DyutaBoardColor,
  type DyutaFaction,
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
  deleteDyutaSavedMatch,
  MAX_DYUTA_SAVED_MATCHES,
  markDyutaTutorialCompleted,
  readDyutaMatch,
  readDyutaPreferences,
  readDyutaSavedMatches,
  recordDyutaMatchCompletion,
  saveDyutaMatchCopy,
  writeDyutaMatch,
  writeDyutaPreferences,
  type DyutaPreferences,
  type DyutaSavedMatch,
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
  const [setupFaction, setSetupFaction] = useState<DyutaFaction>('pandavas');
  const [playerAvatar, setPlayerAvatar] = useState<DyutaAvatarId>('sun');
  const [playerColor, setPlayerColor] = useState<DyutaBoardColor>('gold');
  const [guideAvatar, setGuideAvatar] = useState<DyutaAvatarId>('compass');
  const [guideColor, setGuideColor] = useState<DyutaBoardColor>('navy');
  const [hydrated, setHydrated] = useState(false);
  const [rollingSide, setRollingSide] = useState<DyutaSide | null>(null);
  const [guideThinking, setGuideThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openPanel, setOpenPanel] = useState<ExtrasPanel | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [savedMatches, setSavedMatches] = useState<DyutaSavedMatch[]>([]);
  const [savingCopy, setSavingCopy] = useState(false);
  const [preferences, setPreferences] = useState<DyutaPreferences>({ hapticsEnabled: true, tutorialCompleted: false, unlockedFunFacts: 0, completedMatches: 0 });
  const previousComplete = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([readDyutaMatch(), readDyutaPreferences(), readDyutaSavedMatches()]).then(([saved, prefs, saves]) => {
      if (!cancelled) { previousComplete.current = saved?.phase === 'complete'; setMatch(saved); setPreferences(prefs); setSavedMatches(saves); }
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
    setMatch(createDyutaMatch(
      difficulty,
      mode,
      names,
      { avatar: playerAvatar, color: playerColor, faction: setupFaction },
      { avatar: guideAvatar, color: guideColor, faction: setupFaction === 'pandavas' ? 'kauravas' : 'pandavas' },
    ));
  }, [difficulty, guideAvatar, guideColor, mode, playerAvatar, playerColor, playerOne, playerTwo, setupFaction]);

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
  const saveCopy = useCallback(async () => {
    if (!match || savingCopy) return;
    setSavingCopy(true);
    try { const saved = await saveDyutaMatchCopy(match); setSavedMatches((current) => [saved, ...current]); }
    catch (error) { Alert.alert(copy.savedMatchesTitle, error instanceof Error && error.message.includes('slots are full') ? copy.saveSlotsFull : copy.saveFailed); }
    finally { setSavingCopy(false); }
  }, [copy, match, savingCopy]);
  const loadCopy = useCallback((saved: DyutaSavedMatch) => {
    Alert.alert(copy.loadSaveTitle, copy.loadSaveMessage, [{ text: copy.cancel, style: 'cancel' }, { text: copy.loadSave, onPress: () => { generation.current += 1; setBusy(false); setRollingSide(null); setGuideThinking(false); previousComplete.current = saved.match.phase === 'complete'; setMatch(saved.match); } }]);
  }, [copy]);
  const deleteCopy = useCallback((saved: DyutaSavedMatch) => {
    Alert.alert(copy.deleteSave, copy.deleteSaveMessage, [{ text: copy.cancel, style: 'cancel' }, { text: copy.deleteSave, style: 'destructive', onPress: () => { void deleteDyutaSavedMatch(saved.id).then(() => setSavedMatches((current) => current.filter((item) => item.id !== saved.id))); } }]);
  }, [copy]);
  const completeTutorial = useCallback(() => { setOpenPanel(null); setTutorialStep(0); void markDyutaTutorialCompleted().then(setPreferences).catch(() => {}); }, []);
  const togglePanel = useCallback((panel: ExtrasPanel) => setOpenPanel((current) => current === panel ? null : panel), []);
  const toggleHaptics = useCallback(() => {
    const enabled = !preferences.hapticsEnabled;
    setPreferences((current) => ({ ...current, hapticsEnabled: enabled }));
    void writeDyutaPreferences({ hapticsEnabled: enabled }).catch(() => {});
  }, [preferences.hapticsEnabled]);
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
  const visibleRoll = getVisibleDice(match);
  const status = getStatus(match, copy, playerLabel, guideLabel);
  const canPlayerRoll = match?.activeSide === 'player' && (match.phase === 'awaiting_challenger_roll' || match.phase === 'awaiting_responder_roll');
  const canPlayerDecide = match?.activeSide === 'player' && (match.phase === 'challenger_decision' || match.phase === 'responder_decision');
  const canDeclare = match?.activeSide === 'player' && match.phase === 'awaiting_declaration';
  const canRespond = match?.activeSide === 'player' && match.phase === 'awaiting_response';

  const shadow = isDark ? SHADOWS.sm.dark : SHADOWS.sm.light;
  const extras = (
    <GameExtras
      copy={copy}
      theme={theme}
      shadow={shadow}
      match={match}
      openPanel={openPanel}
      onPanel={togglePanel}
      tutorialStep={tutorialStep}
      onTutorialStep={setTutorialStep}
      tutorialCompleted={preferences.tutorialCompleted}
      onCompleteTutorial={completeTutorial}
      unlockedFacts={preferences.unlockedFunFacts}
      savedMatches={savedMatches}
      onSave={() => void saveCopy()}
      onLoad={loadCopy}
      onDelete={deleteCopy}
      savingCopy={savingCopy}
      hapticsEnabled={preferences.hapticsEnabled}
      onToggleHaptics={toggleHaptics}
    />
  );

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
      {/* Backdrop glows copied from app/play.tsx, the screen that launches Dyuta. */}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 70, right: -86, width: 220, height: 220, borderRadius: 110, backgroundColor: theme.brandSoft }} />
        <View style={{ position: 'absolute', top: 390, left: -96, width: 240, height: 240, borderRadius: 120, backgroundColor: isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowGoldLight }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton label={copy.backLabel} showLabel={false} fallbackHref="/play" />
          <View accessible accessibilityLabel={copy.offlineLabel} style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: MIN_TOUCH_TARGET / 2, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', boxShadow: shadow }}>
            <Feather name="wifi-off" size={17} color={theme.brand} />
          </View>
        </View>
        <View>
          <Text style={{ ...TYPE.section, color: theme.brand }}>{copy.experienceLabel}</Text>
          <Text style={{ ...TYPE.display, color: theme.text, marginTop: 2 }}>{copy.gameTitle}</Text>
          <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: SPACING.xs }}>{copy.gameSubtitle}</Text>
        </View>

        {!match ? (
          <>
            <SetupSection mode={mode} onMode={setMode} difficulty={difficulty} onDifficulty={setDifficulty} playerOne={playerOne} playerTwo={playerTwo} onPlayerOne={setPlayerOne} onPlayerTwo={setPlayerTwo} faction={setupFaction} onFaction={setSetupFaction} playerAvatar={playerAvatar} onPlayerAvatar={setPlayerAvatar} playerColor={playerColor} onPlayerColor={setPlayerColor} guideAvatar={guideAvatar} onGuideAvatar={setGuideAvatar} guideColor={guideColor} onGuideColor={setGuideColor} onStart={startMatch} copy={copy} theme={theme} shadow={shadow} hapticsEnabled={preferences.hapticsEnabled} />
            {extras}
          </>
        ) : (
          <>
            <SabhaBoard match={match} playerLabel={playerLabel} guideLabel={guideLabel} guideMood={guideMood} visibleRoll={visibleRoll} rollingSide={rollingSide} status={status} latest={latest} copy={copy} theme={theme} reducedMotion={reducedMotion} />

            <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.premiumBorder, borderWidth: 1, gap: SPACING.sm }}>
              {match.phase === 'handoff' ? <PrimaryAction label={copy.continueTurn} onPress={continueHandoff} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /> : null}
              {canPlayerRoll ? <PrimaryAction label={copy.roll} onPress={() => void rollPlayer()} busy={busy} disabled={busy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /> : null}
              {canPlayerDecide ? <View style={{ gap: SPACING.sm }}><PrimaryAction label={copy.keep} onPress={keep} disabled={busy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><View style={{ flexDirection: 'row', gap: SPACING.sm }}><SecondaryAction label={copy.rerollFirst} onPress={() => void reroll(0)} disabled={busy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><SecondaryAction label={copy.rerollSecond} onPress={() => void reroll(1)} disabled={busy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /></View></View> : null}
              {canDeclare ? <View style={{ gap: SPACING.sm }}><Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>{copy.declarePrompt}</Text><View style={{ flexDirection: 'row', gap: SPACING.sm }}>{([1, 2, 3] as DyutaStake[]).map((stake) => <StakeAction key={stake} stake={stake} disabled={stake > maxAvailableStake(match)} onPress={() => declare(stake)} copy={copy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />)}</View></View> : null}
              {canRespond && match.declaredStake ? <View style={{ gap: SPACING.md }}><Text style={{ ...TYPE.body, color: theme.text, textAlign: 'center' }}>{copy.responsePrompt.replace('{name}', guideLabel).replace('{count}', String(match.declaredStake))}</Text><PrimaryAction label={copy.accept} onPress={() => respond('accept')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><SecondaryAction label={copy.yield} onPress={() => respond('yield')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /></View> : null}
              {match.activeSide === 'guide' && match.phase !== 'complete' && match.phase !== 'handoff' ? <View style={{ alignItems: 'center', gap: SPACING.sm }}><ActivityIndicator color={theme.brand} /><Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.guideThinking}</Text></View> : null}
              {match.phase === 'complete' ? <View style={{ gap: SPACING.md }}><Text style={{ ...TYPE.title, color: theme.text, textAlign: 'center' }}>{status}</Text><PrimaryAction label={copy.shareRecap} onPress={() => void shareCapturedShoonayaCard(recapRef, { fileName: 'shoonaya-dyuta-sabha.png', dialogTitle: copy.shareRecap })} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><SecondaryAction label={copy.startMatch} onPress={startMatch} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><SecondaryAction label={copy.close} onPress={() => router.replace('/play')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /></View> : null}
            </Card>

            {extras}
            {match.phase !== 'complete' ? <RowTile icon="refresh-ccw" title={copy.changeMode} onPress={reset} theme={theme} shadow={shadow} hapticsEnabled={preferences.hapticsEnabled} /> : null}
          </>
        )}
      </ScrollView>
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
          <Seat label={playerLabel} seals={match.seals.player} active={match.activeSide === 'player' && match.phase !== 'complete'} avatar={match.identities.player.avatar} color={boardColorValue(match.identities.player.color, theme)} copy={copy} theme={theme} />
          {match.mode === 'pass_and_play' ? <Seat label={guideLabel} seals={match.seals.guide} active={match.activeSide === 'guide' && match.phase !== 'complete'} avatar={match.identities.guide.avatar} color={boardColorValue(match.identities.guide.color, theme)} copy={copy} theme={theme} /> : <GuidePortrait mood={guideMood} label={guideLabel} seals={match.seals.guide} active={match.activeSide === 'guide' && match.phase !== 'complete'} copy={copy} theme={theme} />}
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

function Seat({ label, seals, active, avatar, color, copy, theme }: { label: string; seals: number; active: boolean; avatar: DyutaAvatarId; color: string; copy: DyutaCopy; theme: ReturnType<typeof themeColor> }) {
  return <View accessible accessibilityLabel={`${label}, ${seals} ${copy.seals}`} accessibilityState={{ selected: active }} style={{ flex: 1, minHeight: 104, borderRadius: RADII.lg, borderWidth: 1, borderColor: active ? color : theme.border, backgroundColor: active ? theme.brandSoft : theme.cardSoft, padding: SPACING.sm, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs }}><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}><Feather name={avatar} size={22} color={theme.textOnBrand} /></View><Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.text }}>{label}</Text><Text style={{ ...TYPE.metric, color: theme.brand }}>{seals}</Text></View>;
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

type Theme = ReturnType<typeof themeColor>;
type FeatherName = React.ComponentProps<typeof Feather>['name'];
type ExtrasPanel = 'rules' | 'tutorial' | 'facts' | 'saves' | 'settings';
const AVATAR_ORDER: DyutaAvatarId[] = ['sun', 'moon', 'star', 'feather', 'heart', 'compass'];
const COLOR_ORDER: DyutaBoardColor[] = ['gold', 'sage', 'navy', 'clay'];

function SetupSection({ mode, onMode, difficulty, onDifficulty, playerOne, playerTwo, onPlayerOne, onPlayerTwo, faction, onFaction, playerAvatar, onPlayerAvatar, playerColor, onPlayerColor, guideAvatar, onGuideAvatar, guideColor, onGuideColor, onStart, copy, theme, shadow, hapticsEnabled }: {
  mode: DyutaMode; onMode: (value: DyutaMode) => void; difficulty: GuideDifficulty; onDifficulty: (value: GuideDifficulty) => void;
  playerOne: string; playerTwo: string; onPlayerOne: (value: string) => void; onPlayerTwo: (value: string) => void;
  faction: DyutaFaction; onFaction: (value: DyutaFaction) => void;
  playerAvatar: DyutaAvatarId; onPlayerAvatar: (value: DyutaAvatarId) => void; playerColor: DyutaBoardColor; onPlayerColor: (value: DyutaBoardColor) => void;
  guideAvatar: DyutaAvatarId; onGuideAvatar: (value: DyutaAvatarId) => void; guideColor: DyutaBoardColor; onGuideColor: (value: DyutaBoardColor) => void;
  onStart: () => void; copy: DyutaCopy; theme: Theme; shadow: string; hapticsEnabled: boolean;
}) {
  const tile = { theme, shadow, hapticsEnabled };
  return <View style={{ gap: SPACING.md }}>
    <SectionLabel label={copy.modeTitle} theme={theme} />
    <View style={{ gap: SPACING.sm }}>
      <SelectTile label={copy.soloMode} icon="user" selected={mode === 'solo'} onPress={() => onMode('solo')} {...tile} />
      <SelectTile label={copy.passAndPlayMode} icon="users" selected={mode === 'pass_and_play'} onPress={() => onMode('pass_and_play')} {...tile} />
    </View>
    {mode === 'solo' ? <>
      <SectionLabel label={copy.difficultyTitle} theme={theme} />
      <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
        <SelectTile compact label={copy.difficultyEasy} selected={difficulty === 'easy'} onPress={() => onDifficulty('easy')} {...tile} />
        <SelectTile compact label={copy.difficultyMedium} selected={difficulty === 'medium'} onPress={() => onDifficulty('medium')} {...tile} />
        <SelectTile compact label={copy.difficultyHard} selected={difficulty === 'hard'} onPress={() => onDifficulty('hard')} {...tile} />
      </View>
      <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.difficultyDescription}</Text>
    </> : <View style={{ gap: SPACING.sm }}><NameInput value={playerOne} onChange={onPlayerOne} label={copy.playerOneLabel} theme={theme} /><NameInput value={playerTwo} onChange={onPlayerTwo} label={copy.playerTwoLabel} theme={theme} /></View>}
    <SectionLabel label={copy.factionTitle} theme={theme} />
    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
      <SelectTile compact label={copy.pandavas} selected={faction === 'pandavas'} onPress={() => onFaction('pandavas')} {...tile} />
      <SelectTile compact label={copy.kauravas} selected={faction === 'kauravas'} onPress={() => onFaction('kauravas')} {...tile} />
    </View>
    <IdentityChoices title={mode === 'solo' ? copy.avatarTitle : copy.playerOneLabel} avatar={playerAvatar} color={playerColor} onAvatar={onPlayerAvatar} onColor={onPlayerColor} copy={copy} {...tile} />
    {mode === 'pass_and_play' ? <IdentityChoices title={copy.playerTwoLabel} avatar={guideAvatar} color={guideColor} onAvatar={onGuideAvatar} onColor={onGuideColor} copy={copy} {...tile} /> : null}
    <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.cosmeticChoice}</Text>
    <PrimaryAction label={copy.startMatch} onPress={onStart} theme={theme} hapticsEnabled={hapticsEnabled} />
  </View>;
}

function IdentityChoices({ title, avatar, color, onAvatar, onColor, copy, theme, shadow, hapticsEnabled }: { title: string; avatar: DyutaAvatarId; color: DyutaBoardColor; onAvatar: (value: DyutaAvatarId) => void; onColor: (value: DyutaBoardColor) => void; copy: DyutaCopy; theme: Theme; shadow: string; hapticsEnabled: boolean }) {
  const avatarLabels: Record<DyutaAvatarId, string> = { sun: copy.avatarSun, moon: copy.avatarMoon, star: copy.avatarStar, feather: copy.avatarFeather, heart: copy.avatarHeart, compass: copy.avatarCompass };
  const colorLabels: Record<DyutaBoardColor, string> = { gold: copy.colorGold, sage: copy.colorSage, navy: copy.colorNavy, clay: copy.colorClay };
  const chosen = boardColorValue(color, theme);
  return <View style={{ gap: SPACING.md }}>
    <SectionLabel label={title} theme={theme} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
      {AVATAR_ORDER.map((id) => <SelectTile key={id} compact columns={3} label={avatarLabels[id]} icon={id} iconColor={avatar === id ? chosen : undefined} selected={avatar === id} onPress={() => onAvatar(id)} theme={theme} shadow={shadow} hapticsEnabled={hapticsEnabled} />)}
    </View>
    <SectionLabel label={copy.colorTitle} theme={theme} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
      {COLOR_ORDER.map((id) => <SelectTile key={id} compact columns={2} label={colorLabels[id]} swatch={boardColorValue(id, theme)} selected={color === id} onPress={() => onColor(id)} theme={theme} shadow={shadow} hapticsEnabled={hapticsEnabled} />)}
    </View>
  </View>;
}

function GameExtras({ copy, theme, shadow, match, openPanel, onPanel, tutorialStep, onTutorialStep, tutorialCompleted, onCompleteTutorial, unlockedFacts, savedMatches, onSave, onLoad, onDelete, savingCopy, hapticsEnabled, onToggleHaptics }: {
  copy: DyutaCopy; theme: Theme; shadow: string; match: DyutaMatchState | null; openPanel: ExtrasPanel | null; onPanel: (panel: ExtrasPanel) => void;
  tutorialStep: number; onTutorialStep: (value: number) => void; tutorialCompleted: boolean; onCompleteTutorial: () => void; unlockedFacts: number;
  savedMatches: DyutaSavedMatch[]; onSave: () => void; onLoad: (saved: DyutaSavedMatch) => void; onDelete: (saved: DyutaSavedMatch) => void; savingCopy: boolean;
  hapticsEnabled: boolean; onToggleHaptics: () => void;
}) {
  const tutorial = [copy.tutorialRoll, copy.tutorialChoice, copy.tutorialScore];
  const facts = [copy.factOne, copy.factTwo, copy.factThree];
  const sources = ['Shoonaya Dyuta ruleset dyuta-sabha-bluff-v1', 'BORI Critical Edition · Mahabharata 2.53', 'BORI Critical Edition · Mahabharata 2.53.4–5; Stage 0 evidence review'];
  const tile = { theme, shadow, hapticsEnabled };
  const showSaves = match !== null || savedMatches.length > 0;
  return <View style={{ gap: SPACING.sm }}>
    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
      <ToolTile icon="book-open" title={copy.rulesTitle} subtitle={openPanel === 'rules' ? copy.hideRules : copy.showRules} expanded={openPanel === 'rules'} onPress={() => onPanel('rules')} {...tile} />
      <ToolTile icon="play-circle" title={copy.tutorialTitle} subtitle={tutorialCompleted ? copy.tutorialReplay : copy.tutorialStart} expanded={openPanel === 'tutorial'} onPress={() => onPanel('tutorial')} {...tile} />
    </View>
    {openPanel === 'rules' ? <ExtrasPanelCard theme={theme} shadow={shadow}><Text style={{ ...TYPE.body, color: theme.dim }}>{copy.rulesBody}</Text></ExtrasPanelCard> : null}
    {openPanel === 'tutorial' ? <ExtrasPanelCard theme={theme} shadow={shadow}><Text style={{ ...TYPE.chip, color: theme.brand }}>{copy.tutorialStep.replace('{step}', String(tutorialStep + 1))}</Text><Text style={{ ...TYPE.body, color: theme.dim }}>{tutorial[tutorialStep]}</Text><PrimaryAction label={tutorialStep < tutorial.length - 1 ? copy.tutorialNext : copy.tutorialDone} onPress={() => tutorialStep < tutorial.length - 1 ? onTutorialStep(tutorialStep + 1) : onCompleteTutorial()} theme={theme} hapticsEnabled={hapticsEnabled} /></ExtrasPanelCard> : null}
    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
      <ToolTile icon="feather" title={copy.factsTitle} subtitle={copy.factsProgress.replace('{count}', String(unlockedFacts))} expanded={openPanel === 'facts'} onPress={() => onPanel('facts')} {...tile} />
      {showSaves ? <ToolTile icon="archive" title={copy.savedMatchesTitle} subtitle={`${savedMatches.length}/${MAX_DYUTA_SAVED_MATCHES}`} expanded={openPanel === 'saves'} onPress={() => onPanel('saves')} {...tile} /> : null}
    </View>
    {openPanel === 'facts' ? <ExtrasPanelCard theme={theme} shadow={shadow}>{facts.map((fact, index) => index < unlockedFacts ? <View key={sources[index]} style={{ gap: SPACING.xs }}><Text style={{ ...TYPE.body, color: theme.text }}>{fact}</Text><Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.factSourceLabel}: {sources[index]}</Text></View> : <View key={sources[index]} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}><Feather name="lock" size={14} color={theme.dim} /><Text style={{ ...TYPE.caption, color: theme.dim, flex: 1 }}>{copy.factsLocked}</Text></View>)}</ExtrasPanelCard> : null}
    {openPanel === 'saves' && showSaves ? <ExtrasPanelCard theme={theme} shadow={shadow}>
      {match ? <PrimaryAction label={copy.saveCopy} onPress={onSave} disabled={savedMatches.length >= MAX_DYUTA_SAVED_MATCHES || savingCopy} busy={savingCopy} theme={theme} hapticsEnabled={hapticsEnabled} /> : null}
      {savedMatches.length === 0 ? <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.noSavedMatches}</Text> : null}
      {savedMatches.map((saved) => <View key={saved.id} style={{ gap: SPACING.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SPACING.sm }}><Text style={{ ...TYPE.label, color: theme.text }}>{saved.label}</Text><Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.savedAt.replace('{date}', new Date(saved.savedAt).toLocaleString())}</Text><View style={{ flexDirection: 'row', gap: SPACING.sm }}><SecondaryAction label={copy.loadSave} onPress={() => onLoad(saved)} theme={theme} hapticsEnabled={hapticsEnabled} /><SecondaryAction label={copy.deleteSave} onPress={() => onDelete(saved)} theme={theme} hapticsEnabled={hapticsEnabled} /></View></View>)}
    </ExtrasPanelCard> : null}
    <RowTile icon="sliders" title={copy.settingsTitle} subtitle={`${copy.hapticsTitle} · ${hapticsEnabled ? copy.enabled : copy.disabled}`} expanded={openPanel === 'settings'} onPress={() => onPanel('settings')} {...tile} />
    {openPanel === 'settings' ? <ExtrasPanelCard theme={theme} shadow={shadow}>
      <Text style={{ ...TYPE.label, color: theme.text }}>{copy.hapticsTitle}</Text>
      <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.hapticsDescription}</Text>
      <SelectTile label={hapticsEnabled ? copy.enabled : copy.disabled} icon={hapticsEnabled ? 'smartphone' : 'slash'} selected={hapticsEnabled} onPress={onToggleHaptics} accessibilityRole="switch" {...tile} />
    </ExtrasPanelCard> : null}
  </View>;
}

function SectionLabel({ label, theme }: { label: string; theme: Theme }) {
  return <Text accessibilityRole="header" style={{ ...TYPE.section, color: theme.brand }}>{label}</Text>;
}

/** Icon well from Japa's launcher tiles: a 34px brandSoft circle with a brand glyph. */
function IconWell({ name, theme, fill }: { name: FeatherName; theme: Theme; fill?: string }) {
  return <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: fill ?? theme.brandSoft }}><Feather name={name} size={16} color={fill ? theme.textOnBrand : theme.brand} /></View>;
}

/** Selection card matching Japa's SelectableCard treatment (premium border, brandSoft when selected, radio dot). */
function SelectTile({ label, selected, onPress, icon, iconColor, swatch, compact = false, columns, theme, shadow, hapticsEnabled, accessibilityRole = 'radio' }: { label: string; selected: boolean; onPress: () => void; icon?: FeatherName; iconColor?: string; swatch?: string; compact?: boolean; columns?: 2 | 3; theme: Theme; shadow: string; hapticsEnabled: boolean; accessibilityRole?: 'radio' | 'switch' }) {
  return <PressableSurface accessibilityRole={accessibilityRole} accessibilityState={{ checked: selected }} accessibilityLabel={label} onPress={onPress} haptic={hapticsEnabled ? 'selection' : 'none'} style={{ flexGrow: 1, flexBasis: columns === 3 ? '30%' : columns === 2 ? '45%' : compact ? 0 : 'auto', minHeight: MIN_TOUCH_TARGET + SPACING.md, borderRadius: RADII.md, borderWidth: selected ? 1.5 : 1, borderColor: selected ? theme.brand : theme.premiumBorder, backgroundColor: selected ? theme.brandSoft : theme.card, boxShadow: shadow, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, flexDirection: 'row', alignItems: 'center', justifyContent: compact && !icon && !swatch ? 'center' : 'flex-start', gap: SPACING.sm }}>
    {icon ? <IconWell name={icon} theme={theme} fill={iconColor} /> : null}
    {swatch ? <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: swatch, borderWidth: 1, borderColor: theme.premiumBorder }} /> : null}
    <Text numberOfLines={1} style={{ ...TYPE.label, color: selected ? theme.brand : theme.text, flexShrink: 1, flexGrow: compact ? 0 : 1 }}>{label}</Text>
    {!compact ? (selected
      ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={13} color={theme.textOnBrand} /></View>
      : <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: theme.premiumBorder }} />) : null}
  </PressableSurface>;
}

/** Two-up launcher tile matching Japa's "Change mala" / "Ambient sound" pair. */
function ToolTile({ icon, title, subtitle, expanded, onPress, theme, shadow, hapticsEnabled }: { icon: FeatherName; title: string; subtitle: string; expanded: boolean; onPress: () => void; theme: Theme; shadow: string; hapticsEnabled: boolean }) {
  return <PressableSurface accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} accessibilityState={{ expanded }} haptic={hapticsEnabled ? 'selection' : 'none'} onPress={onPress} style={{ flex: 1, minHeight: 84, borderRadius: RADII.lg, borderWidth: expanded ? 1.5 : 1, borderColor: expanded ? theme.brand : theme.premiumBorder, backgroundColor: expanded ? theme.brandSoft : theme.card, boxShadow: shadow, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, justifyContent: 'center', gap: SPACING.sm }}>
    <IconWell name={icon} theme={theme} />
    <View style={{ minWidth: 0 }}>
      <Text numberOfLines={2} style={{ ...TYPE.label, color: theme.text }}>{title}</Text>
      <Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>{subtitle}</Text>
    </View>
  </PressableSurface>;
}

/** Full-width row tile matching Japa's "Recent sessions" row. */
function RowTile({ icon, title, subtitle, expanded, onPress, theme, shadow, hapticsEnabled }: { icon: FeatherName; title: string; subtitle?: string; expanded?: boolean; onPress: () => void; theme: Theme; shadow: string; hapticsEnabled: boolean }) {
  return <PressableSurface accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} accessibilityState={expanded === undefined ? undefined : { expanded }} haptic={hapticsEnabled ? 'selection' : 'none'} onPress={onPress} style={{ minHeight: MIN_TOUCH_TARGET + SPACING.lg, borderRadius: RADII.lg, borderWidth: 1, borderColor: expanded ? theme.brand : theme.premiumBorder, backgroundColor: expanded ? theme.brandSoft : theme.card, boxShadow: shadow, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 }}>
      <IconWell name={icon} theme={theme} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...TYPE.label, color: theme.text }}>{title}</Text>
        {subtitle ? <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
    </View>
    <Feather name={expanded ? 'chevron-up' : expanded === false ? 'chevron-down' : 'chevron-right'} size={16} color={theme.dim} />
  </PressableSurface>;
}

function ExtrasPanelCard({ theme, shadow, children }: { theme: Theme; shadow: string; children: React.ReactNode }) {
  return <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.card, boxShadow: shadow, padding: SPACING.lg, gap: SPACING.md }}>{children}</View>;
}

function MatchRecapCard({ ref, match, playerLabel, guideLabel, copy, theme }: { ref: React.RefObject<View | null>; match: DyutaMatchState; playerLabel: string; guideLabel: string; copy: DyutaCopy; theme: ReturnType<typeof themeColor> }) {
  return <View ref={ref} collapsable={false} style={{ position: 'absolute', left: -10000, top: 0, width: 360, height: 640, backgroundColor: theme.bg, padding: 28, justifyContent: 'space-between' }}><View><Text style={{ fontFamily: FONTS.serif, fontSize: 34, color: theme.text }}>{copy.gameTitle}</Text><Text style={{ ...TYPE.body, color: theme.dim }}>{copy.matchComplete}</Text></View><View style={{ gap: 20 }}><Text style={{ fontFamily: FONTS.serif, fontSize: 26, color: theme.text }}>{playerLabel} {match.seals.player}</Text><Text style={{ fontFamily: FONTS.serif, fontSize: 26, color: theme.text }}>{guideLabel} {match.seals.guide}</Text><SabhaLamps match={match} copy={copy} theme={theme} /></View><Text style={{ ...TYPE.label, color: theme.brand }}>Shoonaya · {copy.experienceLabel}</Text></View>;
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
function NameInput({ value, onChange, label, theme }: { value: string; onChange: (v: string) => void; label: string; theme: ReturnType<typeof themeColor> }) { return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={label} placeholderTextColor={theme.dim} maxLength={24} style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: theme.border, borderRadius: RADII.md, color: theme.text, backgroundColor: theme.bg, ...TYPE.body }} />; }
function StakeAction({ stake, disabled, onPress, copy, theme, hapticsEnabled }: { stake: DyutaStake; disabled: boolean; onPress: () => void; copy: DyutaCopy; theme: ReturnType<typeof themeColor>; hapticsEnabled: boolean }) { return <PressableSurface accessibilityLabel={copy.declareStake.replace('{count}', String(stake))} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} haptic={hapticsEnabled ? 'selection' : 'none'} style={{ flex: 1, minHeight: 58, borderRadius: RADII.md, borderWidth: 1, borderColor: theme.brand, backgroundColor: disabled ? theme.cardSoft : theme.brandSoft, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1 }}><Text style={{ ...TYPE.metric, color: theme.brand }}>{stake}</Text><Text style={{ ...TYPE.chip, color: theme.dim }}>{copy.seals}</Text></PressableSurface>; }
function PrimaryAction({ label, onPress, disabled = false, busy = false, theme, hapticsEnabled = true }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean; theme: ReturnType<typeof themeColor>; hapticsEnabled?: boolean }) { return <PressableSurface accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onPress} haptic={hapticsEnabled ? 'selection' : 'none'} style={{ minHeight: 52, borderRadius: RADII.lg, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md, opacity: disabled ? 0.5 : 1 }}>{busy ? <ActivityIndicator color={theme.textOnBrand} /> : <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: theme.textOnBrand }}>{label}</Text>}</PressableSurface>; }
function SecondaryAction({ label, onPress, disabled = false, theme, hapticsEnabled = true }: { label: string; onPress: () => void; disabled?: boolean; theme: ReturnType<typeof themeColor>; hapticsEnabled?: boolean }) { return <PressableSurface accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} haptic={hapticsEnabled ? 'selection' : 'none'} style={{ flex: 1, minHeight: MIN_TOUCH_TARGET, borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm, opacity: disabled ? 0.5 : 1 }}><Text style={{ ...TYPE.label, color: theme.text, textAlign: 'center' }}>{label}</Text></PressableSurface>; }
function boardColorValue(color: DyutaBoardColor, theme: ReturnType<typeof themeColor>): string { if (color === 'gold') return theme.brand; if (color === 'sage') return COLORS.sage; if (color === 'navy') return COLORS.navy; return theme.earth; }
