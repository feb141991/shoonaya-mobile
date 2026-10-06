import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Text, TextInput, useColorScheme, useWindowDimensions, View, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient as SvgLinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
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
  getHumanTurnSide,
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
  const { width: windowWidth } = useWindowDimensions();
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
  const [rerollingIndex, setRerollingIndex] = useState<0 | 1 | null>(null);
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
    const side = getHumanTurnSide(match);
    if (!side || busy) return;
    const currentGeneration = generation.current;
    setBusy(true); setRollingSide(side);
    try {
      const dice = await rollDicePair();
      await wait(reducedMotion ? 80 : 720);
      if (generation.current === currentGeneration) setMatch((state) => state && getHumanTurnSide(state) === side ? rollForSide(state, side, dice) : state);
    } finally { setBusy(false); setRollingSide(null); }
  }, [busy, match, reducedMotion]);

  const keep = useCallback(() => setMatch((state) => state && getHumanTurnSide(state) ? keepCurrentRoll(state) : state), []);
  const reroll = useCallback(async (index: 0 | 1) => {
    const side = getHumanTurnSide(match);
    if (!side || busy) return;
    setBusy(true); setRollingSide(side); setRerollingIndex(index);
    try { const value = await rollDie(); await wait(reducedMotion ? 80 : 520); setMatch((state) => state && getHumanTurnSide(state) === side ? rerollCurrentDie(state, index, value) : state); }
    finally { setBusy(false); setRollingSide(null); setRerollingIndex(null); }
  }, [busy, match, reducedMotion]);

  const declare = useCallback((stake: DyutaStake) => setMatch((state) => { const side = getHumanTurnSide(state); return state && side ? declareStake(state, side, stake) : state; }), []);
  const respond = useCallback((response: 'accept' | 'yield') => setMatch((state) => { const side = getHumanTurnSide(state); return state && side ? respondToStake(state, side, response) : state; }), []);
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
  // Either seat acts in pass-and-play; in solo only the player does.
  const humanTurn = getHumanTurnSide(match) !== null;
  const canPlayerRoll = humanTurn && (match?.phase === 'awaiting_challenger_roll' || match?.phase === 'awaiting_responder_roll');
  const canPlayerDecide = humanTurn && (match?.phase === 'challenger_decision' || match?.phase === 'responder_decision');
  const canDeclare = humanTurn && match?.phase === 'awaiting_declaration';
  const canRespond = humanTurn && match?.phase === 'awaiting_response';

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
        {match ? <SabhaHallBackdrop width={windowWidth} theme={theme} isDark={isDark} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton label={copy.backLabel} showLabel={false} fallbackHref="/play" />
          <View accessible accessibilityLabel={copy.offlineLabel} style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: MIN_TOUCH_TARGET / 2, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', boxShadow: shadow }}>
            <Feather name="wifi-off" size={17} color={theme.brand} />
          </View>
        </View>
        {!match ? <View>
          <Text style={{ ...TYPE.section, color: theme.brand }}>{copy.experienceLabel}</Text>
          <Text style={{ ...TYPE.display, color: theme.text, marginTop: 2 }}>{copy.gameTitle}</Text>
          <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: SPACING.xs }}>{copy.gameSubtitle}</Text>
        </View> : null}

        {!match ? (
          <>
            <SetupSection mode={mode} onMode={setMode} difficulty={difficulty} onDifficulty={setDifficulty} playerOne={playerOne} playerTwo={playerTwo} onPlayerOne={setPlayerOne} onPlayerTwo={setPlayerTwo} faction={setupFaction} onFaction={setSetupFaction} playerAvatar={playerAvatar} onPlayerAvatar={setPlayerAvatar} playerColor={playerColor} onPlayerColor={setPlayerColor} guideAvatar={guideAvatar} onGuideAvatar={setGuideAvatar} guideColor={guideColor} onGuideColor={setGuideColor} onStart={startMatch} copy={copy} theme={theme} shadow={shadow} hapticsEnabled={preferences.hapticsEnabled} />
            {extras}
          </>
        ) : (
          <>
            <SabhaBoard match={match} playerLabel={playerLabel} guideLabel={guideLabel} guideMood={guideMood} visibleRoll={visibleRoll} rollingSide={rollingSide} rerollingIndex={rerollingIndex} status={status} latest={latest} copy={copy} theme={theme} isDark={isDark} roman={language === 'en'} tableWidth={windowWidth - SPACING.xl * 2} reducedMotion={reducedMotion} />

            <View style={{ gap: SPACING.sm }}>
              {match.phase === 'handoff' ? <SabhaButton label={copy.continueTurn} icon="account-arrow-right" onPress={continueHandoff} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /> : null}
              {canPlayerRoll ? <SabhaButton label={copy.roll} icon="dice-multiple" onPress={() => void rollPlayer()} busy={busy} disabled={busy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /> : null}
              {canPlayerDecide ? <><SabhaButton label={copy.keep} icon="check-bold" onPress={keep} disabled={busy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><View style={{ flexDirection: 'row', gap: SPACING.sm }}><SabhaButton variant="secondary" label={copy.rerollFirst} icon="autorenew" onPress={() => void reroll(0)} disabled={busy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><SabhaButton variant="secondary" label={copy.rerollSecond} icon="autorenew" onPress={() => void reroll(1)} disabled={busy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /></View></> : null}
              {canDeclare ? <View style={{ flexDirection: 'row', gap: SPACING.sm }}>{([1, 2, 3] as DyutaStake[]).map((stake) => <StakeAction key={stake} stake={stake} disabled={stake > maxAvailableStake(match)} onPress={() => declare(stake)} copy={copy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />)}</View> : null}
              {canRespond && match.declaredStake ? <View style={{ flexDirection: 'row', gap: SPACING.sm }}><SabhaButton label={copy.accept} icon="handshake-outline" onPress={() => respond('accept')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><SabhaButton variant="secondary" label={copy.yield} icon="flag-outline" onPress={() => respond('yield')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /></View> : null}
              {match.mode === 'solo' && match.activeSide === 'guide' && match.phase !== 'complete' ? <View style={{ alignItems: 'center', gap: SPACING.sm, minHeight: 60, justifyContent: 'center' }}><ActivityIndicator color={theme.brand} /><Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.guideThinking}</Text></View> : null}
              {match.phase === 'complete' ? <><SabhaButton label={copy.shareRecap} icon="share-variant-outline" onPress={() => void shareCapturedShoonayaCard(recapRef, { fileName: 'shoonaya-dyuta-sabha.png', dialogTitle: copy.shareRecap })} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><View style={{ flexDirection: 'row', gap: SPACING.sm }}><SabhaButton variant="secondary" label={copy.newMatch} icon="restart" onPress={startMatch} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /><SabhaButton variant="secondary" label={copy.close} icon="arrow-left" onPress={() => router.replace('/play')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /></View></> : null}
            </View>

            {extras}
            {match.phase !== 'complete' ? <RowTile icon="refresh-ccw" title={copy.changeMode} onPress={reset} theme={theme} shadow={shadow} hapticsEnabled={preferences.hapticsEnabled} /> : null}
          </>
        )}
      </ScrollView>
      {match?.phase === 'complete' ? <MatchRecapCard ref={recapRef} match={match} playerLabel={playerLabel} guideLabel={guideLabel} copy={copy} theme={theme} /> : null}
    </Screen>
  );
}

const ROMAN_ROUNDS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

/**
 * In-game Sabha table, laid out from the approved Dyuta mockup: ornamented
 * title, two score plaques, round banner, octagonal carved table with ivory
 * dice, a result plaque and the seven-round track.
 */
function SabhaBoard({ match, playerLabel, guideLabel, guideMood, visibleRoll, rollingSide, rerollingIndex, status, latest, copy, theme, isDark, roman, tableWidth, reducedMotion }: {
  match: DyutaMatchState; playerLabel: string; guideLabel: string; guideMood: keyof typeof GUIDE_ASSETS; visibleRoll: DicePair | null; rollingSide: DyutaSide | null; rerollingIndex: 0 | 1 | null; status: string; latest: DyutaRoundRecord | null; copy: DyutaCopy; theme: Theme; isDark: boolean; roman: boolean; tableWidth: number; reducedMotion: boolean;
}) {
  const playerColor = boardColorValue(match.identities.player.color, theme);
  const guideColor = boardColorValue(match.identities.guide.color, theme);
  const live = match.phase !== 'complete';
  const roundLabel = live ? `${copy.round} ${roman ? ROMAN_ROUNDS[match.round - 1] : match.round}` : copy.matchComplete;
  return (
    <View style={{ gap: SPACING.md }}>
      <View style={{ alignItems: 'center', gap: SPACING.xs }}>
        <Text accessibilityRole="header" style={{ ...TYPE.hero, color: theme.text, textTransform: 'uppercase', letterSpacing: 2 }}>{copy.gameTitle}</Text>
        <OrnamentDivider width={180} theme={theme} />
      </View>
      <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
        <ScorePlaque label={playerLabel} seals={match.seals.player} active={match.activeSide === 'player' && live} copy={copy} theme={theme} isDark={isDark}>
          <Medallion color={playerColor} theme={theme}><Feather name={match.identities.player.avatar} size={14} color={COLORS.dyutaIvory} /></Medallion>
        </ScorePlaque>
        <ScorePlaque label={guideLabel} seals={match.seals.guide} active={match.activeSide === 'guide' && live} copy={copy} theme={theme} isDark={isDark}>
          {match.mode === 'solo'
            ? <Medallion color={guideColor} theme={theme} innerRadius={27}><Image source={GUIDE_ASSETS[guideMood]} style={{ width: 24, height: 24, borderRadius: 12 }} contentFit="cover" /></Medallion>
            : <Medallion color={guideColor} theme={theme}><Feather name={match.identities.guide.avatar} size={14} color={COLORS.dyutaIvory} /></Medallion>}
        </ScorePlaque>
      </View>
      <RoundBanner label={roundLabel} theme={theme} />
      <SabhaTable width={tableWidth} theme={theme} isDark={isDark}>
        {live
          ? <DiceStage dice={visibleRoll} rolling={rollingSide !== null ? [rerollingIndex !== 1, rerollingIndex !== 0] : null} theme={theme} isDark={isDark} copy={copy} reducedMotion={reducedMotion} />
          : <FinalTally playerLabel={playerLabel} guideLabel={guideLabel} seals={match.seals} copy={copy} theme={theme} isDark={isDark} />}
      </SabhaTable>
      <Plaque theme={theme} isDark={isDark} style={{ marginTop: -SPACING.xl, marginHorizontal: SPACING.md }}>
        <Text accessibilityLiveRegion="polite" style={{ ...TYPE.cardHeading, color: theme.text, textAlign: 'center' }}>{status}</Text>
        {latest ? <RoundReveal record={latest} playerLabel={playerLabel} guideLabel={guideLabel} copy={copy} theme={theme} /> : null}
      </Plaque>
      <SabhaLamps match={match} copy={copy} theme={theme} />
    </View>
  );
}

type Vec = { x: number; y: number };
function cubicPoint(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const u = 1 - t;
  return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
}

/**
 * Cusped (multifoil) pointed arch from `left` to `right`, springing at
 * `spring` and peaking at `apex`, closed down to `floor`. Each lobe bulges
 * outward between inward-pointing cusps, the classic Mughal opening.
 */
function multifoilArch(left: number, right: number, spring: number, apex: number, floor: number, lobes = 4): string {
  const width = right - left;
  const mid = left + width / 2;
  const leftCurve = [{ x: left, y: spring }, { x: left, y: spring - width * 0.5 }, { x: mid - width * 0.14, y: apex + width * 0.1 }, { x: mid, y: apex }] as const;
  const rightCurve = [{ x: mid, y: apex }, { x: mid + width * 0.14, y: apex + width * 0.1 }, { x: right, y: spring - width * 0.5 }, { x: right, y: spring }] as const;
  const centre = { x: mid, y: spring };
  const depth = width * 0.05;
  const points: Vec[] = [];
  for (let index = 0; index <= lobes; index += 1) points.push(cubicPoint(...leftCurve, index / lobes));
  for (let index = 1; index <= lobes; index += 1) points.push(cubicPoint(...rightCurve, index / lobes));
  let d = `M ${left} ${floor} L ${left} ${spring}`;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]; const to = points[index];
    const m = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const away = { x: m.x - centre.x, y: m.y - centre.y };
    const length = Math.hypot(away.x, away.y) || 1;
    d += ` Q ${m.x + (away.x / length) * depth} ${m.y + (away.y / length) * depth} ${to.x} ${to.y}`;
  }
  return `${d} L ${right} ${floor} Z`;
}

/**
 * Palace hall behind the in-game header, after the mockup: a cream wall with
 * three sunlit multifoil arches on capitals, a jali screen in the centre
 * opening, hanging brass diyas with glowing flames and potted plants, fading
 * into the floor the table sits on. Decorative only; it scrolls with the page.
 */
function SabhaHallBackdrop({ width, theme, isDark }: { width: number; theme: Theme; isDark: boolean }) {
  const height = 560;
  const wall = theme.cardSoft;
  const lightTop = isDark ? COLORS.homeHeroDark : COLORS.homeHeroLight;
  const lightBottom = isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight;
  const glow = isDark ? COLORS.navGlowGoldDark : COLORS.navGlowGoldLight;
  const column = width * 0.075;
  const span = (width - column * 4) / 3;
  const spring = 250;
  const apex = 96;
  const opening = (index: number) => { const left = column + index * (span + column); return { left, right: left + span }; };
  const centre = opening(1);
  const lamp = (x: number) => <G key={x}>
    {Array.from({ length: 9 }, (_, index) => <Ellipse key={index} cx={x} cy={4 + index * 6} rx={1.6} ry={2.8} fill="none" stroke={theme.brandStrong} strokeWidth={1} />)}
    <Circle cx={x} cy={66} r={30} fill="url(#hallFlame)" />
    <Path d={`M ${x - 16} 66 Q ${x} 86 ${x + 16} 66 Z`} fill={theme.brand} stroke={theme.brandStrong} strokeWidth={1} />
    <Path d={`M ${x - 18} 66 H ${x + 18}`} stroke={theme.brandStrong} strokeWidth={1.6} strokeLinecap="round" />
    <Circle cx={x} cy={80} r={2.2} fill={theme.brandStrong} />
    <Path d={`M ${x} 50 Q ${x + 4} 58 ${x} 64 Q ${x - 4} 58 ${x} 50 Z`} fill={theme.brand} />
    <Ellipse cx={x} cy={60} rx={1.4} ry={2.6} fill={COLORS.dyutaIvory} />
  </G>;
  const plant = (x: number, flip: 1 | -1) => <G key={x} transform={`translate(${x} 40) scale(${flip * 0.6} 0.6)`}>
    {[[-22, 120, -38], [-10, 108, -14], [6, 112, 14], [18, 126, 36], [-2, 98, 2], [-30, 140, -60], [26, 142, 58]].map(([dx, cy, deg], index) => <Ellipse key={index} cx={dx} cy={cy} rx={6} ry={20} fill={COLORS.sage} fillOpacity={0.55 + (index % 3) * 0.12} transform={`rotate(${deg} ${dx} ${cy})`} />)}
    <Path d="M -20 150 H 20 L 15 182 Q 0 188 -15 182 Z" fill={theme.brand} />
    <Path d="M -22 150 H 22" stroke={theme.brandStrong} strokeWidth={3} strokeLinecap="round" />
  </G>;
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
    <Svg width={width} height={height}>
      <Defs>
        <SvgLinearGradient id="hallLight" x1="0" y1="0" x2="0" y2="1"><Stop offset={0} stopColor={lightTop} /><Stop offset={1} stopColor={lightBottom} /></SvgLinearGradient>
        <SvgLinearGradient id="hallFade" x1="0" y1="0" x2="0" y2="1"><Stop offset={0} stopColor={theme.bg} stopOpacity={0} /><Stop offset={1} stopColor={theme.bg} stopOpacity={1} /></SvgLinearGradient>
        <RadialGradient id="hallSun" cx="50%" cy="40%" r="50%"><Stop offset={0} stopColor={glow} stopOpacity={0.55} /><Stop offset={1} stopColor={glow} stopOpacity={0} /></RadialGradient>
        <RadialGradient id="hallFlame" cx="50%" cy="50%" r="50%"><Stop offset={0} stopColor={glow} /><Stop offset={1} stopColor={glow} stopOpacity={0} /></RadialGradient>
        <ClipPath id="hallJali"><Path d={multifoilArch(centre.left + 14, centre.right - 14, spring + 30, apex + 60, height)} /></ClipPath>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={wall} />
      {[0, 1, 2].map((index) => { const { left, right } = opening(index); return <G key={index}>
        <Path d={multifoilArch(left - 5, right + 5, spring, apex - 7, height)} fill="none" stroke={theme.premiumBorder} strokeWidth={6} />
        <Path d={multifoilArch(left, right, spring, apex, height)} fill="url(#hallLight)" stroke={theme.brand} strokeOpacity={0.35} strokeWidth={1.2} />
      </G>; })}
      {/* jali screen in the centre opening */}
      <G clipPath="url(#hallJali)">
        <Rect x={centre.left} y={apex} width={span} height={height - apex} fill={theme.brandSoft} />
        {Array.from({ length: 30 }, (_, index) => { const offset = index * 14 - 160; return <G key={index}>
          <Line x1={centre.left + offset} y1={height} x2={centre.left + offset + height} y2={0} stroke={theme.brand} strokeOpacity={0.35} strokeWidth={1} />
          <Line x1={centre.left + offset} y1={0} x2={centre.left + offset + height} y2={height} stroke={theme.brand} strokeOpacity={0.35} strokeWidth={1} />
        </G>; })}
      </G>
      <Ellipse cx={width / 2} cy={spring} rx={width * 0.5} ry={spring * 0.9} fill="url(#hallSun)" />
      {/* columns with capitals and bases */}
      {[0, 1, 2, 3].map((index) => { const x = index * (span + column); return <G key={index}>
        <Rect x={x + column * 0.18} y={spring - 4} width={column * 0.64} height={height - spring} fill={wall} stroke={theme.premiumBorder} strokeWidth={1} />
        <Rect x={x - 2} y={spring - 14} width={column + 4} height={10} rx={2} fill={wall} stroke={theme.brand} strokeOpacity={0.35} strokeWidth={1} />
        <Path d={`M ${x + column * 0.5} ${spring - 26} l 5 8 l -5 4 l -5 -4 Z`} fill={theme.brand} fillOpacity={0.6} />
      </G>; })}
      {[width * 0.24, width * 0.76].map(lamp)}
      {plant(width * 0.03, 1)}
      {plant(width * 0.97, -1)}
      <Rect x={0} y={height - 200} width={width} height={200} fill="url(#hallFade)" />
    </Svg>
  </View>;
}

/** Final seal count shown on the mat once the match is over, in place of the dice. */
function FinalTally({ playerLabel, guideLabel, seals, copy, theme, isDark }: { playerLabel: string; guideLabel: string; seals: Record<DyutaSide, number>; copy: DyutaCopy; theme: Theme; isDark: boolean }) {
  return <View accessible accessibilityLabel={`${copy.finalScore}: ${playerLabel} ${seals.player}, ${guideLabel} ${seals.guide}`} style={{ alignItems: 'center', gap: SPACING.xs }}>
    <Text style={{ ...TYPE.chip, color: theme.brandStrong, textTransform: 'uppercase', letterSpacing: 1.5, backgroundColor: isDark ? COLORS.dyutaMatDark : COLORS.dyutaMatLight, paddingHorizontal: SPACING.sm, borderRadius: RADII.xs, overflow: 'hidden' }}>{copy.finalScore}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.xs, borderRadius: RADII.pill, backgroundColor: isDark ? COLORS.dyutaMatDark : COLORS.dyutaMatLight }}>
      <View style={{ alignItems: 'center' }}><Text style={{ ...TYPE.display, fontSize: 52, lineHeight: 58, color: theme.text, fontVariant: ['lining-nums'] }}>{seals.player}</Text><Text numberOfLines={1} style={{ ...TYPE.label, color: theme.dim }}>{playerLabel}</Text></View>
      <Diamond size={12} theme={theme} />
      <View style={{ alignItems: 'center' }}><Text style={{ ...TYPE.display, fontSize: 52, lineHeight: 58, color: theme.text, fontVariant: ['lining-nums'] }}>{seals.guide}</Text><Text numberOfLines={1} style={{ ...TYPE.label, color: theme.dim }}>{guideLabel}</Text></View>
    </View>
  </View>;
}

/** Double-framed ivory plaque with a gold rule, the mockup's card treatment. */
function Plaque({ theme, isDark, highlighted = false, compact = false, style, children }: { theme: Theme; isDark: boolean; highlighted?: boolean; compact?: boolean; style?: object; children: React.ReactNode }) {
  return <View style={[{ borderRadius: RADII.sm, borderWidth: highlighted ? 2 : 1.5, borderColor: theme.brand, backgroundColor: theme.card, padding: 3, boxShadow: highlighted ? `0 0 20px ${theme.brand}` : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) }, style]}>
    <PlaqueCorners theme={theme} />
    <View style={{ borderRadius: RADII.xs, borderWidth: 1, borderColor: highlighted ? theme.brand : theme.premiumBorder, backgroundColor: highlighted ? theme.brandSoft : undefined, paddingHorizontal: compact ? SPACING.sm : SPACING.md, paddingVertical: compact ? SPACING.xs : SPACING.sm, gap: SPACING.xs }}>{children}</View>
  </View>;
}

/** Gold diamond studs on a frame's four corners. */
function PlaqueCorners({ theme, size = 7 }: { theme: Theme; size?: number }) {
  const offset = -size / 2 - 1;
  return <>{[{ top: offset, left: offset }, { top: offset, right: offset }, { bottom: offset, left: offset }, { bottom: offset, right: offset }].map((position, index) => <View key={index} pointerEvents="none" style={{ position: 'absolute', zIndex: 1, ...position }}><Diamond size={size} theme={theme} /></View>)}</>;
}

function Diamond({ size = 8, theme }: { size?: number; theme: Theme }) {
  return <View style={{ width: size, height: size, backgroundColor: theme.brand, transform: [{ rotate: '45deg' }] }} />;
}

function OrnamentDivider({ width, theme }: { width: number; theme: Theme }) {
  return <View accessible={false} style={{ width, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}><View style={{ flex: 1, height: 1, backgroundColor: theme.brand }} /><Diamond size={6} theme={theme} /><Diamond size={9} theme={theme} /><Diamond size={6} theme={theme} /><View style={{ flex: 1, height: 1, backgroundColor: theme.brand }} /></View>;
}

function ScorePlaque({ label, seals, active, copy, theme, isDark, children }: { label: string; seals: number; active: boolean; copy: DyutaCopy; theme: Theme; isDark: boolean; children: React.ReactNode }) {
  return <View accessible accessibilityLabel={`${label}, ${seals} ${copy.seals}`} accessibilityState={{ selected: active }} style={{ flex: 1 }}>
    <Plaque theme={theme} isDark={isDark} highlighted={active} compact>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        {children}
        <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
          <Text numberOfLines={1} style={{ ...TYPE.label, fontFamily: FONTS.serifBold, fontSize: 15, color: theme.text }}>{label}</Text>
          <OrnamentDivider width={40} theme={theme} />
          <Text style={{ ...TYPE.metric, color: theme.text, fontVariant: ['lining-nums'] }}>{seals}</Text>
        </View>
      </View>
    </Plaque>
  </View>;
}

/** Petal mandala medallion; `children` sits in the filled centre. */
function Medallion({ color, theme, innerRadius = 17, size = 44, children }: { color: string; theme: Theme; innerRadius?: number; size?: number; children: React.ReactNode }) {
  const inner = (innerRadius * 2 * size) / 100;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
      <Circle cx={50} cy={50} r={48} fill={theme.card} stroke={color} strokeWidth={2.5} />
      <Circle cx={50} cy={50} r={43} fill="none" stroke={color} strokeWidth={1} strokeDasharray="2 3" />
      <G>{Array.from({ length: 12 }, (_, index) => <Ellipse key={index} cx={50} cy={22} rx={6} ry={12} fill="none" stroke={color} strokeWidth={1.6} transform={`rotate(${index * 30} 50 50)`} />)}</G>
      <Circle cx={50} cy={50} r={innerRadius} fill={color} />
    </Svg>
    <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
  </View>;
}

function RoundBanner({ label, theme }: { label: string; theme: Theme }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs }}>
    <Diamond size={10} theme={theme} />
    <View style={{ minWidth: 168, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: RADII.xs, borderWidth: 1.5, borderColor: theme.brand, backgroundColor: theme.card, alignItems: 'center' }}>
      <Text style={{ ...TYPE.cardHeading, color: theme.text, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</Text>
    </View>
    <Diamond size={10} theme={theme} />
  </View>;
}

/**
 * Octagonal carved table drawn in a 100×100 box and squashed vertically for a
 * seated perspective: a heavy sandstone slab with a lotus-relief rim, a carved
 * lip, a gold filigree band and a layered mandala on the mat.
 */
function SabhaTable({ width, theme, isDark, children }: { width: number; theme: Theme; isDark: boolean; children: React.ReactNode }) {
  const height = Math.round(width * 0.76);
  const rim = isDark ? COLORS.dyutaRimDark : COLORS.dyutaRimLight;
  const edge = isDark ? COLORS.dyutaRimEdgeDark : COLORS.dyutaRimEdgeLight;
  const mat = isDark ? COLORS.dyutaMatDark : COLORS.dyutaMatLight;
  const highlight = isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowIvoryLight;
  const gold = theme.brand;
  const cy = 47;
  const octagon = (radius: number, dy = 0) => Array.from({ length: 8 }, (_, index) => { const angle = Math.PI / 8 + (index * Math.PI) / 4; return `${50 + radius * Math.cos(angle)},${cy + dy + radius * Math.sin(angle)}`; }).join(' ');
  const ring = (count: number, radius: number, offset = 0) => Array.from({ length: count }, (_, index) => { const angle = offset + (index * 2 * Math.PI) / count; return { x: 50 + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), deg: (angle * 180) / Math.PI }; });
  // Radial lotus petal centred on (x, y), pointing outward.
  const petal = (x: number, y: number, deg: number, length: number, girth: number) => `M ${-length} 0 Q 0 ${-girth} ${length} 0 Q 0 ${girth} ${-length} 0 Z`;
  return <View style={{ width, height, alignSelf: 'center' }}>
    <Svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute' }}>
      <Defs>
        <SvgLinearGradient id="dyutaSlab" x1="0" y1="0" x2="0" y2="1"><Stop offset={0} stopColor={rim} /><Stop offset={0.55} stopColor={rim} /><Stop offset={1} stopColor={edge} /></SvgLinearGradient>
        <RadialGradient id="dyutaMat" cx={50} cy={cy} r={37} gradientUnits="userSpaceOnUse"><Stop offset={0} stopColor={mat} /><Stop offset={0.82} stopColor={mat} /><Stop offset={1} stopColor={rim} /></RadialGradient>
        <RadialGradient id="dyutaFloor" cx="50%" cy="50%" r="50%"><Stop offset={0} stopColor={COLORS.dyutaDieShadow} /><Stop offset={1} stopColor={COLORS.dyutaDieShadow} stopOpacity={0} /></RadialGradient>
      </Defs>
      {/* floor shadow and slab thickness */}
      <Ellipse cx={50} cy={cy + 8} rx={50} ry={46} fill="url(#dyutaFloor)" />
      <Polygon points={octagon(49.5, 4)} fill={edge} />
      <Polygon points={octagon(49.5, 2)} fill={edge} stroke={edge} strokeWidth={0.4} />
      <Polygon points={octagon(49.5)} fill="url(#dyutaSlab)" stroke={edge} strokeWidth={0.6} />
      {/* faceted stone panels: faces turned away from the light (lower half) carry more shade */}
      <G>{Array.from({ length: 8 }, (_, index) => {
        const corner = (radius: number, step: number) => { const angle = Math.PI / 8 + (step * Math.PI) / 4; return `${50 + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`; };
        const facing = Math.sin(Math.PI / 8 + ((index + 0.5) * Math.PI) / 4);
        return <G key={index}>
          <Polygon points={`${corner(49.5, index)} ${corner(49.5, index + 1)} ${corner(39.5, index + 1)} ${corner(39.5, index)}`} fill={edge} fillOpacity={0.12 + Math.max(0, facing) * 0.4} />
          <Line x1={50 + 49.5 * Math.cos(Math.PI / 8 + (index * Math.PI) / 4)} y1={cy + 49.5 * Math.sin(Math.PI / 8 + (index * Math.PI) / 4)} x2={50 + 39.5 * Math.cos(Math.PI / 8 + (index * Math.PI) / 4)} y2={cy + 39.5 * Math.sin(Math.PI / 8 + (index * Math.PI) / 4)} stroke={edge} strokeWidth={0.5} />
        </G>;
      })}</G>
      <Polygon points={octagon(47.4)} fill="none" stroke={highlight} strokeWidth={0.6} />
      {/* lotus relief: each petal is carved (edge tone) with a lit upper lip */}
      <G>{ring(28, 42).map(({ x, y, deg }, index) => <G key={index} transform={`translate(${x} ${y}) rotate(${deg})`}>
        <Path d={petal(x, y, deg, 2.7, 1.9)} fill={edge} fillOpacity={0.55} />
        <Path d={petal(x, y, deg, 2.7, 1.9)} fill="none" stroke={highlight} strokeWidth={0.35} transform="translate(-0.25 -0.25)" />
      </G>)}</G>
      <G>{ring(28, 42, Math.PI / 28).map(({ x, y }, index) => <Circle key={index} cx={x} cy={y} r={0.45} fill={edge} />)}</G>
      {/* carved lip around the mat */}
      <Circle cx={50} cy={cy} r={38.4} fill="none" stroke={edge} strokeWidth={1.1} />
      <Circle cx={50} cy={cy} r={39.3} fill="none" stroke={highlight} strokeWidth={0.4} />
      {/* gold filigree band */}
      <Circle cx={50} cy={cy} r={37.4} fill="url(#dyutaMat)" stroke={gold} strokeWidth={0.7} />
      <Circle cx={50} cy={cy} r={35.2} fill="none" stroke={gold} strokeWidth={0.35} />
      <G>{ring(36, 36.3).map(({ x, y, deg }, index) => <Ellipse key={index} cx={x} cy={y} rx={0.5} ry={1} fill={gold} fillOpacity={0.75} transform={`rotate(${deg} ${x} ${y})`} />)}</G>
      <Circle cx={50} cy={cy} r={31.5} fill="none" stroke={gold} strokeWidth={0.3} strokeDasharray="0.8 1.2" />
      <G>{ring(12, 31.5).map(({ x, y, deg }, index) => <Path key={index} d={`M ${x} ${y - 2} Q ${x + 1.5} ${y} ${x} ${y + 2} Q ${x - 1.5} ${y} ${x} ${y - 2} Z`} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.8} transform={`rotate(${deg + 90} ${x} ${y})`} />)}</G>
      {/* layered centre mandala */}
      <Circle cx={50} cy={cy} r={25} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.55} />
      <G>{Array.from({ length: 16 }, (_, index) => <Ellipse key={index} cx={50} cy={cy - 18} rx={2.3} ry={5.2} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.55} transform={`rotate(${index * 22.5} 50 ${cy})`} />)}</G>
      <G>{Array.from({ length: 8 }, (_, index) => <Ellipse key={index} cx={50} cy={cy - 11} rx={2.8} ry={6} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.55} transform={`rotate(${index * 45 + 22.5} 50 ${cy})`} />)}</G>
      <Circle cx={50} cy={cy} r={8.5} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.55} />
      <Circle cx={50} cy={cy} r={3} fill={gold} fillOpacity={0.35} />
    </Svg>
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: height * 0.06, left: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
  </View>;
}

// Cosmetic faces shown while the dice tumble; never a real result.
const TUMBLE_FACES = [3, 6, 2, 5, 1, 4] as const;

/**
 * Throw → tumble → land. While `rolling`, each die spins along a short arc
 * with flickering faces; when the result arrives it drops in and settles with
 * a spring. Reduced motion skips all movement and just shows the result.
 */
function DiceStage({ dice, rolling: rollingDice, theme, isDark, copy, reducedMotion }: { dice: DicePair | null; rolling: [boolean, boolean] | null; theme: Theme; isDark: boolean; copy: DyutaCopy; reducedMotion: boolean }) {
  const rolling = rollingDice !== null;
  const lastThrown = useRef<[boolean, boolean]>([true, true]);
  const tumble = useRef(new Animated.Value(0)).current;
  const land = useRef(new Animated.Value(1)).current;
  const wasRolling = useRef(rolling);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (reducedMotion) { tumble.setValue(0); land.setValue(1); wasRolling.current = rolling; return; }
    if (rolling) {
      land.setValue(0);
      tumble.setValue(0);
      const spin = Animated.loop(Animated.timing(tumble, { toValue: 1, duration: 520, easing: Easing.linear, useNativeDriver: true }));
      spin.start();
      const flicker = setInterval(() => setFrame((value) => value + 1), 90);
      wasRolling.current = true;
      return () => { spin.stop(); clearInterval(flicker); };
    }
    if (wasRolling.current) {
      wasRolling.current = false;
      land.setValue(0);
      Animated.spring(land, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true }).start();
    }
    return undefined;
  }, [land, reducedMotion, rolling, tumble]);

  const tumbling = rolling && !reducedMotion;
  const dieMotion = (direction: 1 | -1, delay: number, moving: boolean) => {
    const settle = { transform: [{ translateY: land.interpolate({ inputRange: [0, 1], outputRange: [-34, 0] }) }, { scale: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1.12, 0.96, 1] }) }] };
    // The spin only applies mid-throw; a landed die always rests upright.
    if (!tumbling || !moving) return moving ? settle : {};
    const phase = Animated.modulo(Animated.add(tumble, delay), 1);
    return {
      transform: [
        // airborne arc while tumbling, then a drop that overshoots and settles
        { translateY: Animated.add(phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -26, 0] }), land.interpolate({ inputRange: [0, 1], outputRange: [-34, 0] })) },
        { translateX: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-6 * direction, 6 * direction, -6 * direction] }) },
        { rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * direction}deg`] }) },
        { scale: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1.12, 0.96, 1] }) },
      ],
    };
  };
  const faceFor = (offset: number) => TUMBLE_FACES[(frame + offset) % TUMBLE_FACES.length];
  // A single-die reroll tumbles only that die; the kept die stays visible and still.
  const faceOf = (index: 0 | 1) => { const moving = rollingDice?.[index] ?? false; if (moving) return tumbling ? faceFor(index * 3) : null; return dice?.[index] ?? null; };
  const first = faceOf(0);
  const second = faceOf(1);
  // Remember which dice were thrown so only they replay the landing bounce.
  if (rollingDice) lastThrown.current = rollingDice;
  const [movingFirst, movingSecond] = rollingDice ?? lastThrown.current;

  return <View style={{ alignItems: 'center', gap: SPACING.sm }}>
    <Text style={{ ...TYPE.chip, color: theme.brandStrong, textTransform: 'uppercase', letterSpacing: 1.5, backgroundColor: isDark ? COLORS.dyutaMatDark : COLORS.dyutaMatLight, paddingHorizontal: SPACING.sm, borderRadius: RADII.xs, overflow: 'hidden' }}>{copy.concealedThrow}</Text>
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.lg }}>
      <Animated.View style={dieMotion(1, 0, movingFirst)}><IvoryDie value={first} label={copy.firstDie} tilt="-14deg" airborne={tumbling && movingFirst} /></Animated.View>
      <Animated.View style={[{ marginTop: SPACING.xxl }, dieMotion(-1, 0.35, movingSecond)]}><IvoryDie value={second} label={copy.secondDie} tilt="10deg" airborne={tumbling && movingSecond} /></Animated.View>
    </View>
  </View>;
}

// Pip centres on a unit face, indexed like DIE_PIPS (row-major 3×3).
const PIP_GRID = [0.24, 0.5, 0.76] as const;
// Faces visible beside each front value; opposite faces of a standard die sum to seven.
const DIE_NEIGHBOURS: Record<number, [number, number]> = { 1: [2, 3], 2: [3, 1], 3: [1, 2], 4: [5, 1], 5: [1, 3], 6: [2, 4] };

type Point = readonly [number, number];
/** Closed SVG path through `points` with every corner rounded by up to `radius`. */
function roundedPath(points: readonly Point[], radius: number): string {
  const n = points.length;
  const toward = (from: Point, to: Point): Point => { const dx = to[0] - from[0]; const dy = to[1] - from[1]; const length = Math.hypot(dx, dy) || 1; const r = Math.min(radius, length / 2); return [from[0] + (dx / length) * r, from[1] + (dy / length) * r]; };
  return points.map((point, index) => {
    const before = toward(point, points[(index - 1 + n) % n]);
    const after = toward(point, points[(index + 1) % n]);
    return `${index === 0 ? 'M' : 'L'} ${before[0]} ${before[1]} Q ${point[0]} ${point[1]} ${after[0]} ${after[1]}`;
  }).join(' ') + ' Z';
}

/**
 * Ivory cube in oblique projection with rounded edges: the front face carries
 * the value, the top and right faces show neighbouring faces, a soft rim light
 * runs along the top edge and a shadow sits on the mat. A concealed die keeps
 * every face blank.
 */
function IvoryDie({ value, label, tilt, size = 92, airborne = false }: { value: number | null; label: string; tilt: string; size?: number; airborne?: boolean }) {
  const x0 = 12, y0 = 32, s = 54, d = 15;
  const x1 = x0 + s, y1 = y0 + s;
  const tl: Point = [x0, y0], tr: Point = [x1, y0], br: Point = [x1, y1], bl: Point = [x0, y1];
  const btl: Point = [x0 + d, y0 - d], btr: Point = [x1 + d, y0 - d], bbr: Point = [x1 + d, y1 - d];
  const pipsFor = (face: number) => DIE_PIPS[face] ?? [];
  const [topFace, sideFace] = value ? DIE_NEIGHBOURS[value] : [0, 0];
  const inset = 0.08;
  const grid = (index: number) => inset + (1 - inset * 2) * PIP_GRID[index];
  const frontPips = value ? pipsFor(value).map((cell) => ({ cx: x0 + s * grid(cell % 3), cy: y0 + s * grid(Math.floor(cell / 3)) })) : [];
  const topPips = value ? pipsFor(topFace).map((cell) => { const u = grid(cell % 3); const v = 1 - grid(Math.floor(cell / 3)); return { cx: x0 + s * u + d * v, cy: y0 - d * v }; }) : [];
  const sidePips = value ? pipsFor(sideFace).map((cell) => { const u = grid(cell % 3); const v = 1 - grid(Math.floor(cell / 3)); return { cx: x1 + d * u, cy: y1 - d * u - s * v }; }) : [];
  return <View accessible accessibilityRole="image" accessibilityLabel={airborne ? `${label}: rolling` : value ? `${label}: ${value}` : `${label}: concealed`} style={{ width: size, height: size, transform: [{ rotate: tilt }] }}>
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgLinearGradient id="dieFront" x1="0" y1="0" x2="1" y2="1"><Stop offset={0} stopColor={COLORS.dyutaIvory} /><Stop offset={1} stopColor={COLORS.dyutaIvoryShade} /></SvgLinearGradient>
        <SvgLinearGradient id="dieTop" x1="0" y1="1" x2="1" y2="0"><Stop offset={0} stopColor={COLORS.dyutaIvory} /><Stop offset={1} stopColor={COLORS.dyutaIvoryShade} /></SvgLinearGradient>
        <SvgLinearGradient id="dieSide" x1="0" y1="0" x2="1" y2="1"><Stop offset={0} stopColor={COLORS.dyutaIvoryShade} /><Stop offset={1} stopColor={COLORS.dyutaIvoryEdge} /></SvgLinearGradient>
        <RadialGradient id="dieShadow" cx="50%" cy="50%" r="50%"><Stop offset={0} stopColor={COLORS.dyutaDieShadow} /><Stop offset={1} stopColor={COLORS.dyutaDieShadow} stopOpacity={0} /></RadialGradient>
      </Defs>
      {airborne ? null : <Ellipse cx={x0 + s / 2 + 10} cy={y1 + 3} rx={s * 0.66} ry={7.5} fill="url(#dieShadow)" />}
      {/* silhouette doubles as the softened edge between faces */}
      <Path d={roundedPath([bl, tl, btl, btr, bbr, br], 9)} fill={COLORS.dyutaIvoryEdge} />
      <Path d={roundedPath([tr, btr, bbr, br], 7)} fill="url(#dieSide)" transform="translate(-0.6 0.4)" />
      <Path d={roundedPath([tl, btl, btr, tr], 7)} fill="url(#dieTop)" transform="translate(0.4 0.5)" />
      <Path d={roundedPath([tl, tr, br, bl], 10)} fill="url(#dieFront)" />
      <Path d={`M ${x0 + 9} ${y0 + 1.4} H ${x1 - 9}`} stroke={COLORS.navGlowIvoryLight} strokeWidth={1.6} strokeLinecap="round" />
      <Path d={`M ${x0 + 1.4} ${y0 + 9} V ${y1 - 9}`} stroke={COLORS.navGlowIvoryLight} strokeWidth={1.2} strokeLinecap="round" />
      {topPips.map((pip, index) => <Ellipse key={`t${index}`} cx={pip.cx} cy={pip.cy} rx={3.2} ry={1.5} fill={COLORS.ink} fillOpacity={0.85} />)}
      {sidePips.map((pip, index) => <Ellipse key={`s${index}`} cx={pip.cx} cy={pip.cy} rx={1.4} ry={3.4} fill={COLORS.ink} fillOpacity={0.8} />)}
      {frontPips.map((pip, index) => <Circle key={`f${index}`} cx={pip.cx} cy={pip.cy} r={5} fill={COLORS.ink} />)}
    </Svg>
    {value === null ? <View style={{ position: 'absolute', left: (x0 / 100) * size, top: (y0 / 100) * size, width: (s / 100) * size, height: (s / 100) * size, alignItems: 'center', justifyContent: 'center' }}><Feather name="help-circle" size={24} color={COLORS.brandEarthLight} /></View> : null}
  </View>;
}

/** Seven-round track: won rounds fill with the winner's colour and a check; a losing three-seal declaration is dimmed. */
function SabhaLamps({ match, copy, theme }: { match: DyutaMatchState; copy: DyutaCopy; theme: Theme }) {
  const currentRound = match.phase === 'complete' ? null : match.round;
  return <View accessible accessibilityLabel={`${copy.lampsLabel}. ${match.history.length} complete.`} style={{ alignItems: 'center', gap: SPACING.xs }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' }}>
      {Array.from({ length: 7 }, (_, index) => {
        const record = match.history[index];
        const current = !record && index + 1 === currentRound;
        const dimmed = record?.overreach === true;
        const color = record?.winner === 'player' ? COLORS.sage : record?.winner === 'guide' ? theme.earth : record ? theme.dim : current ? theme.brand : theme.card;
        return <Fragment key={index}>
          {index > 0 ? <View style={{ width: 12, height: 2, marginTop: 15, backgroundColor: record ? color : theme.border }} /> : null}
          <View accessible accessibilityLabel={record ? `${copy.round} ${index + 1}: ${record.winner}${dimmed ? `, ${copy.overreach}` : ''}` : `${copy.round} ${index + 1}`} style={{ alignItems: 'center', gap: 2, opacity: dimmed ? 0.42 : 1 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: record || current ? color : theme.border, backgroundColor: color, alignItems: 'center', justifyContent: 'center', boxShadow: current ? `0 0 12px ${theme.brand}` : undefined }}>
              <Text style={{ ...TYPE.label, color: record || current ? COLORS.dyutaIvory : theme.dim }}>{index + 1}</Text>
            </View>
            {record ? <Feather name="check" size={12} color={theme.text} /> : <View style={{ height: 12 }} />}
          </View>
        </Fragment>;
      })}
    </View>
    <Text style={{ ...TYPE.label, color: theme.text }}>{currentRound ? `${copy.round} ${currentRound} / 7` : copy.matchComplete}</Text>
  </View>;
}

function RoundReveal({ record, playerLabel, guideLabel, copy, theme }: { record: DyutaRoundRecord; playerLabel: string; guideLabel: string; copy: DyutaCopy; theme: Theme }) {
  const winner = record.winner === 'player' ? playerLabel : record.winner === 'guide' ? guideLabel : copy.drawTitle;
  const line = record.response === 'yield' ? copy.yieldedSeal.replace('{name}', record.responder === 'player' ? playerLabel : guideLabel) : copy.wonSeals.replace('{name}', winner).replace('{count}', String(record.sealsTransferred));
  const throws = record.response === 'accept' && record.responderRoll ? ` · ${record.challengerRoll.finalDice.join(' + ')} ${copy.versus} ${record.responderRoll.finalDice.join(' + ')}` : '';
  return <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`${line}${throws}`} style={{ alignItems: 'center', gap: 2 }}>
    <Text style={{ ...TYPE.label, fontFamily: FONTS.serifBold, fontSize: 15, color: theme.brandStrong, textAlign: 'center' }}>{line}{throws}</Text>
    {record.overreach ? <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.overreach}</Text> : null}
  </View>;
}

type SabhaIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Mockup action plaques: navy primary and ivory secondary, both double-framed in gold. */
function SabhaButton({ label, icon, onPress, variant = 'primary', disabled = false, busy = false, theme, hapticsEnabled }: { label: string; icon: SabhaIcon; onPress: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean; busy?: boolean; theme: Theme; hapticsEnabled: boolean }) {
  const primary = variant === 'primary';
  const ink = primary ? COLORS.dyutaIvory : theme.text;
  return <PressableSurface accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onPress} haptic={hapticsEnabled ? 'selection' : 'none'} style={{ flex: 1, minHeight: 60, borderRadius: RADII.sm, borderWidth: 1.5, borderColor: theme.brand, backgroundColor: primary ? COLORS.navy : theme.card, padding: 3, opacity: disabled ? 0.55 : 1 }}>
    <View style={{ flex: 1, borderRadius: RADII.xs, borderWidth: 1, borderColor: primary ? COLORS.homeGoldPillBorder : theme.premiumBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: SPACING.xs, top: 0, bottom: 0, justifyContent: 'center' }}><Diamond size={6} theme={theme} /></View>
      <View pointerEvents="none" style={{ position: 'absolute', right: SPACING.xs, top: 0, bottom: 0, justifyContent: 'center' }}><Diamond size={6} theme={theme} /></View>
      {busy ? <ActivityIndicator color={ink} /> : <><MaterialCommunityIcons name={icon} size={20} color={primary ? COLORS.dyutaIvory : theme.brand} /><Text numberOfLines={2} style={{ ...TYPE.cardHeading, color: ink, textAlign: 'center', flexShrink: 1 }}>{label}</Text></>}
    </View>
  </PressableSurface>;
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
  // The accept/yield prompt is for the responder; in solo the Guide responds on its own.
  if (match.phase === 'awaiting_response' && match.mode === 'solo' && match.activeSide === 'guide') return copy.guideTurn;
  if (match.phase === 'awaiting_response' && match.declaredStake) return copy.responsePrompt.replace('{name}', match.challenger === 'player' ? playerLabel : guideLabel).replace('{count}', String(match.declaredStake));
  return match.activeSide === 'player' || match.mode === 'pass_and_play' ? copy.yourTurn : copy.guideTurn;
}

function NameInput({ value, onChange, label, theme }: { value: string; onChange: (v: string) => void; label: string; theme: ReturnType<typeof themeColor> }) { return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={label} placeholderTextColor={theme.dim} maxLength={24} style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: theme.border, borderRadius: RADII.md, color: theme.text, backgroundColor: theme.bg, ...TYPE.body }} />; }
function StakeAction({ stake, disabled, onPress, copy, theme, hapticsEnabled }: { stake: DyutaStake; disabled: boolean; onPress: () => void; copy: DyutaCopy; theme: Theme; hapticsEnabled: boolean }) { return <PressableSurface accessibilityRole="button" accessibilityLabel={copy.declareStake.replace('{count}', String(stake))} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} haptic={hapticsEnabled ? 'selection' : 'none'} style={{ flex: 1, minHeight: 76, borderRadius: RADII.sm, borderWidth: 1.5, borderColor: theme.brand, backgroundColor: theme.card, padding: 3, opacity: disabled ? 0.45 : 1 }}><View style={{ flex: 1, borderRadius: RADII.xs, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }}><Text style={{ ...TYPE.display, color: theme.brandStrong, fontVariant: ['lining-nums'] }}>{stake}</Text><Text style={{ ...TYPE.chip, color: theme.dim }}>{copy.seals}</Text></View></PressableSurface>; }
function PrimaryAction({ label, onPress, disabled = false, busy = false, theme, hapticsEnabled = true }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean; theme: ReturnType<typeof themeColor>; hapticsEnabled?: boolean }) { return <PressableSurface accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onPress} haptic={hapticsEnabled ? 'selection' : 'none'} style={{ minHeight: 52, borderRadius: RADII.lg, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md, opacity: disabled ? 0.5 : 1 }}>{busy ? <ActivityIndicator color={theme.textOnBrand} /> : <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: theme.textOnBrand }}>{label}</Text>}</PressableSurface>; }
function SecondaryAction({ label, onPress, disabled = false, theme, hapticsEnabled = true }: { label: string; onPress: () => void; disabled?: boolean; theme: ReturnType<typeof themeColor>; hapticsEnabled?: boolean }) { return <PressableSurface accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} haptic={hapticsEnabled ? 'selection' : 'none'} style={{ flex: 1, minHeight: MIN_TOUCH_TARGET, borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm, opacity: disabled ? 0.5 : 1 }}><Text style={{ ...TYPE.label, color: theme.text, textAlign: 'center' }}>{label}</Text></PressableSurface>; }
function boardColorValue(color: DyutaBoardColor, theme: ReturnType<typeof themeColor>): string { if (color === 'gold') return theme.brand; if (color === 'sage') return COLORS.sage; if (color === 'navy') return COLORS.navy; return theme.earth; }
