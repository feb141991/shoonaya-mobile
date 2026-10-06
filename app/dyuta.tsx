import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SPACING, TYPE, themeColor } from '@/lib/constants';
import { DYUTA_COPY, type DyutaCopy } from '@/lib/dyuta/copy';
import {
  createDyutaMatch,
  continueAfterHandoff,
  getGuideRerollIndex,
  getMatchOutcome,
  keepCurrentRoll,
  rerollCurrentDie,
  resolveGuideTurn,
  rollForSide,
  type DicePair,
  type DyutaMode,
  type DyutaMatchState,
  type DieIndex,
  type GuideDifficulty,
  type DyutaAvatarId,
  type DyutaBoardColor,
  type DyutaFaction,
} from '@/lib/dyuta/engine';
import { rollDie, rollDicePair } from '@/lib/dyuta/random';
import {
  clearDyutaMatch,
  deleteDyutaSavedMatch,
  readDyutaMatch,
  readDyutaPreferences,
  readDyutaSavedMatches,
  markDyutaTutorialCompleted,
  recordDyutaMatchCompletion,
  saveDyutaMatchCopy,
  writeDyutaMatch,
  writeDyutaPreferences,
  type DyutaPreferences,
  type DyutaSavedMatch,
} from '@/lib/dyuta/storage';

const DIE_PIPS: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function DyutaScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = DYUTA_COPY[language];
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [match, setMatch] = useState<DyutaMatchState | null>(null);
  const [setupMode, setSetupMode] = useState<DyutaMode>('solo');
  const [setupDifficulty, setSetupDifficulty] = useState<GuideDifficulty>('medium');
  const [setupFaction, setSetupFaction] = useState<DyutaFaction>('pandavas');
  const [setupPlayerAvatar, setSetupPlayerAvatar] = useState<DyutaAvatarId>('sun');
  const [setupPlayerColor, setSetupPlayerColor] = useState<DyutaBoardColor>('gold');
  const [setupSecondAvatar, setSetupSecondAvatar] = useState<DyutaAvatarId>('moon');
  const [setupSecondColor, setSetupSecondColor] = useState<DyutaBoardColor>('navy');
  const [playerOneName, setPlayerOneName] = useState('Player 1');
  const [playerTwoName, setPlayerTwoName] = useState('Player 2');
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [factsExpanded, setFactsExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [savesExpanded, setSavesExpanded] = useState(false);
  const [savedMatches, setSavedMatches] = useState<DyutaSavedMatch[]>([]);
  const [preferences, setPreferences] = useState<DyutaPreferences>({ hapticsEnabled: true, tutorialCompleted: false, unlockedFunFacts: 0, completedMatches: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [playerBusy, setPlayerBusy] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);
  const playerBusyRef = useRef(false);
  const savingCopyRef = useRef(false);
  const [guideBusy, setGuideBusy] = useState(false);
  const [guideRetry, setGuideRetry] = useState(0);
  const [rollError, setRollError] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const saveRevision = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const matchGeneration = useRef(0);
  const previousPhaseRef = useRef<DyutaMatchState['phase'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([readDyutaMatch(), readDyutaPreferences(), readDyutaSavedMatches()]).then(([saved, savedPreferences, saves]) => {
      if (!cancelled) {
        previousPhaseRef.current = saved?.phase ?? null;
        setMatch(saved);
        setPreferences(savedPreferences);
        setSavedMatches(saves);
        if (saved) {
          setSetupMode(saved.mode);
          setSetupDifficulty(saved.guideDifficulty);
          setSetupFaction(saved.identities.player.faction);
          setSetupPlayerAvatar(saved.identities.player.avatar);
          setSetupPlayerColor(saved.identities.player.color);
          setSetupSecondAvatar(saved.identities.guide.avatar);
          setSetupSecondColor(saved.identities.guide.color);
          if (saved.mode === 'pass_and_play') {
            setPlayerOneName(saved.playerNames.player);
            setPlayerTwoName(saved.playerNames.guide);
          }
        }
      }
    }).finally(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (match?.phase !== 'complete' || previousPhaseRef.current === 'complete') {
      previousPhaseRef.current = match?.phase ?? null;
      return;
    }
    previousPhaseRef.current = 'complete';
    void recordDyutaMatchCompletion().then(setPreferences).catch(() => {});
  }, [match?.phase]);

  useEffect(() => {
    if (!hydrated || !match) return;
    const revision = ++saveRevision.current;
    const snapshot = match;
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => writeDyutaMatch(snapshot))
      .then(() => {
        if (saveRevision.current === revision) setSaveWarning(false);
      })
      .catch(() => {
        if (saveRevision.current === revision) setSaveWarning(true);
      });
  }, [hydrated, match]);

  useEffect(() => {
    if (!hydrated || !match || match.mode !== 'solo' || match.phase !== 'awaiting_roll' || match.activeSide !== 'guide') return;
    let cancelled = false;
    const generation = matchGeneration.current;
    setGuideBusy(true);
    setRollError(false);
    void (async () => {
      try {
        const dice = await rollDicePair();
        const rerollIndex = getGuideRerollIndex(dice, match.guideDifficulty);
        const rerollValue = rerollIndex === null ? undefined : await rollDie();
        if (cancelled || generation !== matchGeneration.current) return;
        setMatch((previous) => {
          if (generation !== matchGeneration.current) return previous;
          if (!previous || previous.phase !== 'awaiting_roll' || previous.activeSide !== 'guide') return previous;
          try {
            return resolveGuideTurn(previous, dice, rerollValue);
          } catch {
            return previous;
          }
        });
      } catch {
        if (!cancelled && generation === matchGeneration.current) setRollError(true);
      } finally {
        if (!cancelled) setGuideBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [guideRetry, hydrated, match]);

  const handlePlayerRoll = useCallback(async () => {
    if (!match || match.phase !== 'awaiting_roll' || playerBusyRef.current) return;
    if (match.mode === 'solo' && match.activeSide !== 'player') return;
    const generation = matchGeneration.current;
    playerBusyRef.current = true;
    setPlayerBusy(true);
    setRollError(false);
    try {
      const dice = await rollDicePair();
      setMatch((previous) => {
        if (matchGeneration.current !== generation) return previous;
        if (!previous || previous.phase !== 'awaiting_roll' || previous.activeSide !== 'player') return previous;
        try { return rollForSide(previous, previous.activeSide, dice); } catch { return previous; }
      });
    } catch {
      if (generation === matchGeneration.current) setRollError(true);
    } finally {
      playerBusyRef.current = false;
      setPlayerBusy(false);
    }
  }, [match]);

  const handleKeep = useCallback(() => {
    if (!match || (match.phase !== 'player_decision' && !(match.mode === 'pass_and_play' && match.phase === 'guide_decision')) || playerBusyRef.current) return;
    playerBusyRef.current = true;
    setPlayerBusy(true);
    setRollError(false);
    setMatch((previous) => {
      if (!previous) return previous;
      try { return keepCurrentRoll(previous); } catch { return previous; }
    });
    playerBusyRef.current = false;
    setPlayerBusy(false);
  }, [match]);

  const handleReroll = useCallback(async (dieIndex: DieIndex) => {
    if (!match || (match.phase !== 'player_decision' && !(match.mode === 'pass_and_play' && match.phase === 'guide_decision')) || playerBusyRef.current) return;
    const generation = matchGeneration.current;
    playerBusyRef.current = true;
    setPlayerBusy(true);
    setRollError(false);
    try {
      const rerollValue = await rollDie();
      setMatch((previous) => {
        if (matchGeneration.current !== generation) return previous;
        if (!previous) return previous;
        try { return rerollCurrentDie(previous, dieIndex, rerollValue); } catch { return previous; }
      });
    } catch {
      if (generation === matchGeneration.current) setRollError(true);
    } finally {
      playerBusyRef.current = false;
      setPlayerBusy(false);
    }
  }, [match]);

  const beginNewMatch = useCallback(() => {
    matchGeneration.current += 1;
    playerBusyRef.current = false;
    setPlayerBusy(false);
    setGuideBusy(false);
    setRollError(false);
    setSaveWarning(false);
    const names = setupMode === 'pass_and_play'
      ? { player: playerOneName, guide: playerTwoName }
      : undefined;
    const opponentFaction = setupFaction === 'pandavas' ? 'kauravas' : 'pandavas';
    setMatch(createDyutaMatch(setupDifficulty, setupMode, names,
      { avatar: setupPlayerAvatar, color: setupPlayerColor, faction: setupFaction },
      { avatar: setupMode === 'solo' ? 'compass' : setupSecondAvatar, color: setupMode === 'solo' ? 'navy' : setupSecondColor, faction: opponentFaction },
    ));
  }, [playerOneName, playerTwoName, setupDifficulty, setupFaction, setupMode, setupPlayerAvatar, setupPlayerColor, setupSecondAvatar, setupSecondColor]);

  const completeTutorial = useCallback(() => {
    setTutorialStep(null);
    void markDyutaTutorialCompleted().then(setPreferences).catch(() => {});
  }, []);

  const saveCurrentCopy = useCallback(async () => {
    if (!match || savingCopyRef.current) return;
    savingCopyRef.current = true;
    setSavingCopy(true);
    try {
      const saved = await saveDyutaMatchCopy(match);
      setSavedMatches((current) => [saved, ...current].slice(0, 5));
      setSavesExpanded(true);
    } catch (error) {
      Alert.alert(copy.savedMatchesTitle, error instanceof Error && error.message.includes('slots are full') ? copy.saveSlotsFull : copy.saveFailed);
    } finally {
      savingCopyRef.current = false;
      setSavingCopy(false);
    }
  }, [copy, match]);

  const loadSavedCopy = useCallback((saved: DyutaSavedMatch) => {
    const load = () => {
      previousPhaseRef.current = saved.match.phase;
      setMatch(saved.match);
      setSetupMode(saved.match.mode);
      setSetupDifficulty(saved.match.guideDifficulty);
      setSetupFaction(saved.match.identities.player.faction);
      setSetupPlayerAvatar(saved.match.identities.player.avatar);
      setSetupPlayerColor(saved.match.identities.player.color);
      setSetupSecondAvatar(saved.match.identities.guide.avatar);
      setSetupSecondColor(saved.match.identities.guide.color);
      setSavesExpanded(false);
    };
    if (!match || match.phase === 'complete') load();
    else Alert.alert(copy.loadSaveTitle, copy.loadSaveMessage, [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.loadSave, onPress: load },
    ]);
  }, [copy, match]);

  const removeSavedCopy = useCallback((id: string) => {
    Alert.alert(copy.deleteSave, copy.deleteSaveMessage, [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.deleteSave, style: 'destructive', onPress: () => {
        void deleteDyutaSavedMatch(id).then(() => setSavedMatches((current) => current.filter((save) => save.id !== id))).catch(() => {});
      } },
    ]);
  }, [copy]);

  const toggleHaptics = useCallback(() => {
    const next = !preferences.hapticsEnabled;
    setPreferences((current) => ({ ...current, hapticsEnabled: next }));
    void writeDyutaPreferences({ hapticsEnabled: next }).catch(() => {});
  }, [preferences.hapticsEnabled]);

  const handleContinueHandoff = useCallback(() => {
    setMatch((previous) => {
      if (!previous) return previous;
      try { return continueAfterHandoff(previous); } catch { return previous; }
    });
  }, []);

  const confirmNewMatch = useCallback(() => {
    if (!match || match.phase === 'complete') {
      beginNewMatch();
      return;
    }
    Alert.alert(copy.discardTitle, copy.discardMessage, [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.discard, style: 'destructive', onPress: beginNewMatch },
    ]);
  }, [beginNewMatch, copy, match]);

  const changeMode = useCallback(() => {
    if (!match) return;
    Alert.alert(copy.discardTitle, copy.discardMessage, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.changeMode,
        style: 'destructive',
        onPress: () => {
          matchGeneration.current += 1;
          playerBusyRef.current = false;
          setPlayerBusy(false);
          setGuideBusy(false);
          setRollError(false);
          const revision = ++saveRevision.current;
          saveQueue.current = saveQueue.current
            .catch(() => {})
            .then(() => clearDyutaMatch())
            .then(() => {
              if (saveRevision.current === revision) {
                setMatch(null);
                setSaveWarning(false);
              }
            })
            .catch(() => {
              if (saveRevision.current === revision) setSaveWarning(true);
            });
        },
      },
    ]);
  }, [copy, match]);

  const retryGuide = useCallback(() => {
    setRollError(false);
    setGuideRetry((revision) => revision + 1);
  }, []);

  if (!hydrated) {
    return (
      <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md }}>
          <ActivityIndicator color={theme.brand} />
          <Text style={{ ...TYPE.body, color: theme.dim }}>{copy.savedMatch}</Text>
        </View>
      </Screen>
    );
  }

  const outcome = match ? getMatchOutcome(match) : null;
  const latestTurn = match?.history.at(-1) ?? null;
  const isHumanDecision = match?.phase === 'player_decision'
    || (match?.mode === 'pass_and_play' && match.phase === 'guide_decision');
  const isPlayerTurn = match?.phase === 'awaiting_roll'
    && (match.mode === 'pass_and_play' || match.activeSide === 'player');
  const playerOneLabel = match?.mode === 'pass_and_play' ? match.playerNames.player : copy.player;
  const playerTwoLabel = match?.mode === 'pass_and_play' ? match.playerNames.guide : copy.guideName;
  const statusTitle = !match
    ? copy.modeTitle
    : match.phase === 'complete'
      ? outcome === 'draw' ? copy.drawTitle : match.mode === 'solo'
        ? outcome === 'player_win' ? copy.winTitle : copy.guideWinTitle
        : (outcome === 'player_win' ? copy.playerWon : copy.opponentWon).replace('{name}', match.playerNames[outcome === 'player_win' ? 'player' : 'guide'])
      : match.phase === 'handoff'
        ? copy.handoffPrompt.replace('{name}', match.playerNames[match.activeSide])
        : match.mode === 'solo'
          ? match.activeSide === 'player' ? copy.yourTurn : copy.guideTurn
          : copy.namedTurn.replace('{name}', match.playerNames[match.activeSide]);
  const tutorialSteps = [copy.tutorialRoll, copy.tutorialChoice, copy.tutorialScore];
  const factCopy = [copy.factOne, copy.factTwo, copy.factThree];
  const factSources = ['Shoonaya Dyuta ruleset v1', 'BORI Critical Edition · Mahabharata 2.53', 'BORI Critical Edition · Mahabharata 2.53.4–5; Stage 0 evidence review'];
  const guideThreshold = match?.guideDifficulty === 'easy' ? '1' : match?.guideDifficulty === 'hard' ? '1–3' : '1–2';

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 92, right: -86, width: 220, height: 220, borderRadius: 110, backgroundColor: theme.brandSoft }} />
        <View style={{ position: 'absolute', top: 520, left: -96, width: 240, height: 240, borderRadius: 120, backgroundColor: isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowGoldLight }} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.md }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <BackButton label={copy.backLabel} variant="glass" showLabel={false} fallbackHref="/play" />
          <View style={{ flex: 1 }}>
            <Text style={{ ...TYPE.title, color: theme.text }}>{copy.gameTitle}</Text>
            <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.gameSubtitle}</Text>
          </View>
          <View accessible accessibilityRole="image" accessibilityLabel={copy.offlineLabel} style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: RADII.pill, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="wifi-off" size={18} color={theme.brand} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          </View>
        </View>

        <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, gap: SPACING.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Feather name="book-open" size={16} color={theme.brand} />
            <Text style={{ ...TYPE.label, color: theme.brand }}>{copy.experienceLabel}</Text>
          </View>
          <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.storyBoundary}</Text>
        </Card>

        {match ? (
          <GameBoard
            match={match}
            playerOneLabel={playerOneLabel}
            playerTwoLabel={playerTwoLabel}
            statusTitle={statusTitle}
            prompt={isHumanDecision ? copy.chooseAction : match.mode === 'solo' && match.activeSide === 'guide' ? copy.waitingForGuide : match.phase === 'handoff' ? copy.handoffPrompt.replace('{name}', match.playerNames[match.activeSide]) : copy.rollPrompt}
            guideBusy={guideBusy}
            latestTurn={latestTurn}
            theme={theme}
            copy={copy}
          />
        ) : null}

        {match ? (
          <Card tone="auto" style={{ padding: SPACING.lg, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, gap: SPACING.md }}>
            {match.phase === 'complete' ? (
              <View style={{ gap: SPACING.md }}>
                <Text style={{ ...TYPE.body, color: theme.dim }}>{copy.finalScore}</Text>
                <Text style={{ ...TYPE.metric, color: theme.brand }}>{playerOneLabel} {match.totals.player}  ·  {playerTwoLabel} {match.totals.guide}</Text>
              <PrimaryAction label={copy.startMatch} onPress={beginNewMatch} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
              </View>
            ) : (
              <>
                {match.phase === 'handoff' ? (
                  <PrimaryAction label={copy.continueTurn} onPress={handleContinueHandoff} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                ) : null}

                {isPlayerTurn ? (
                  <PrimaryAction label={copy.roll} onPress={() => void handlePlayerRoll()} disabled={playerBusy} busy={playerBusy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                ) : null}

                {isHumanDecision ? (
                  <View style={{ gap: SPACING.sm }}>
                    <PrimaryAction label={copy.keep} onPress={handleKeep} disabled={playerBusy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                      <SecondaryAction label={copy.rerollFirst} onPress={() => void handleReroll(0)} disabled={playerBusy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                      <SecondaryAction label={copy.rerollSecond} onPress={() => void handleReroll(1)} disabled={playerBusy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                    </View>
                  </View>
                ) : null}

                {match.mode === 'solo' && match.activeSide === 'guide' && rollError ? (
                  <PrimaryAction label={copy.tryAgain} onPress={retryGuide} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                ) : null}
              </>
            )}
          </Card>
        ) : (
          <Card tone="auto" style={{ padding: SPACING.lg, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, gap: SPACING.md }}>
            <View style={{ gap: SPACING.xs }}>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.modeTitle}</Text>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.passPlayDescription}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <ModeChoice label={copy.soloMode} selected={setupMode === 'solo'} onPress={() => setSetupMode('solo')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
              <ModeChoice label={copy.passAndPlayMode} selected={setupMode === 'pass_and_play'} onPress={() => setSetupMode('pass_and_play')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
            </View>
            {setupMode === 'pass_and_play' ? (
              <View style={{ gap: SPACING.sm }}>
                <TextInput
                  accessibilityLabel={copy.playerOneLabel}
                  value={playerOneName}
                  onChangeText={setPlayerOneName}
                  placeholder={copy.playerOneLabel}
                  placeholderTextColor={theme.dim}
                  maxLength={24}
                  returnKeyType="next"
                  style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: theme.border, borderRadius: RADII.md, color: theme.text, backgroundColor: theme.bg, ...TYPE.body }}
                />
                <TextInput
                  accessibilityLabel={copy.playerTwoLabel}
                  value={playerTwoName}
                  onChangeText={setPlayerTwoName}
                  placeholder={copy.playerTwoLabel}
                  placeholderTextColor={theme.dim}
                  maxLength={24}
                  returnKeyType="done"
                  style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: theme.border, borderRadius: RADII.md, color: theme.text, backgroundColor: theme.bg, ...TYPE.body }}
                />
              </View>
            ) : null}

            {setupMode === 'solo' ? (
              <View style={{ gap: SPACING.xs }}>
                <Text style={{ ...TYPE.label, color: theme.dim }}>{copy.difficultyTitle}</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
                  <ModeChoice label={copy.difficultyEasy} selected={setupDifficulty === 'easy'} onPress={() => setSetupDifficulty('easy')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                  <ModeChoice label={copy.difficultyMedium} selected={setupDifficulty === 'medium'} onPress={() => setSetupDifficulty('medium')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                  <ModeChoice label={copy.difficultyHard} selected={setupDifficulty === 'hard'} onPress={() => setSetupDifficulty('hard')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                </View>
                <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.difficultyDescription}</Text>
              </View>
            ) : null}

            <View style={{ gap: SPACING.xs }}>
              <Text style={{ ...TYPE.label, color: theme.dim }}>{copy.factionTitle}</Text>
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <ModeChoice label={copy.pandavas} selected={setupFaction === 'pandavas'} onPress={() => setSetupFaction('pandavas')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                <ModeChoice label={copy.kauravas} selected={setupFaction === 'kauravas'} onPress={() => setSetupFaction('kauravas')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
              </View>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.cosmeticChoice}</Text>
            </View>

            <IdentityChoices
              title={setupMode === 'solo' ? copy.player : (playerOneName.trim() || copy.playerOneLabel)}
              avatar={setupPlayerAvatar} color={setupPlayerColor}
              onAvatar={setSetupPlayerAvatar} onColor={setSetupPlayerColor}
              theme={theme} copy={copy} hapticsEnabled={preferences.hapticsEnabled}
            />
            {setupMode === 'pass_and_play' ? (
              <IdentityChoices
                title={playerTwoName.trim() || copy.playerTwoLabel}
                avatar={setupSecondAvatar} color={setupSecondColor}
                onAvatar={setSetupSecondAvatar} onColor={setSetupSecondColor}
                theme={theme} copy={copy} hapticsEnabled={preferences.hapticsEnabled}
              />
            ) : null}
            <PrimaryAction label={copy.startMatch} onPress={beginNewMatch} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
          </Card>
        )}

        <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, gap: SPACING.sm }}>
          <PressableSurface accessibilityLabel={copy.tutorialTitle} accessibilityHint={preferences.tutorialCompleted ? copy.tutorialReplay : copy.tutorialStart} accessibilityState={{ expanded: tutorialStep !== null }} haptic={preferences.hapticsEnabled ? 'selection' : 'none'} onPress={() => setTutorialStep((step) => step === null ? 0 : null)} style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.tutorialTitle}</Text>
            <Text style={{ ...TYPE.label, color: theme.brand }}>{preferences.tutorialCompleted ? copy.tutorialReplay : copy.tutorialStart}</Text>
          </PressableSurface>
          {tutorialStep !== null ? (
            <View style={{ gap: SPACING.sm }}>
              <Text style={{ ...TYPE.caption, color: theme.brand }}>{copy.tutorialStep.replace('{step}', String(tutorialStep + 1))}</Text>
              <Text style={{ ...TYPE.body, color: theme.dim }}>{tutorialSteps[tutorialStep]}</Text>
              <PrimaryAction label={tutorialStep < 2 ? copy.tutorialNext : copy.tutorialDone} onPress={() => tutorialStep < 2 ? setTutorialStep((step) => step === null ? 0 : step + 1) : completeTutorial()} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
            </View>
          ) : null}
        </Card>

        <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, gap: SPACING.sm }}>
          <PressableSurface accessibilityLabel={copy.factsTitle} accessibilityState={{ expanded: factsExpanded }} haptic={preferences.hapticsEnabled ? 'selection' : 'none'} onPress={() => setFactsExpanded((value) => !value)} style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm }}>
            <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.factsTitle}</Text>
            <Text style={{ ...TYPE.caption, color: theme.brand }}>{copy.factsProgress.replace('{count}', String(preferences.unlockedFunFacts))}</Text>
          </PressableSurface>
          {factsExpanded ? preferences.unlockedFunFacts === 0 ? (
            <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.factsLocked}</Text>
          ) : factCopy.slice(0, preferences.unlockedFunFacts).map((fact, index) => (
            <View key={index} style={{ gap: SPACING.xs, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: theme.borderSoft, paddingTop: index === 0 ? 0 : SPACING.sm }}>
              <Text style={{ ...TYPE.body, color: theme.text }}>{fact}</Text>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.factSourceLabel}: {factSources[index]}</Text>
            </View>
          )) : null}
        </Card>

        {match || savedMatches.length > 0 ? (
          <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, gap: SPACING.sm }}>
            <PressableSurface accessibilityLabel={copy.savedMatchesTitle} accessibilityState={{ expanded: savesExpanded }} haptic={preferences.hapticsEnabled ? 'selection' : 'none'} onPress={() => setSavesExpanded((value) => !value)} style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.savedMatchesTitle} · {savedMatches.length}/5</Text>
              <Text style={{ ...TYPE.label, color: theme.brand }}>{copy.saveCopy}</Text>
            </PressableSurface>
            {savesExpanded ? (
              <View style={{ gap: SPACING.sm }}>
                {match ? <PrimaryAction label={copy.saveCopy} onPress={() => void saveCurrentCopy()} disabled={savedMatches.length >= 5 || savingCopy} busy={savingCopy} theme={theme} hapticsEnabled={preferences.hapticsEnabled} /> : null}
                {savedMatches.length === 0 ? <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.noSavedMatches}</Text> : null}
                {savedMatches.map((saved) => (
                  <View key={saved.id} style={{ gap: SPACING.xs, borderTopWidth: 1, borderTopColor: theme.borderSoft, paddingTop: SPACING.sm }}>
                    <Text style={{ ...TYPE.label, color: theme.text }}>{formatSavedMatchLabel(saved.match, copy)}</Text>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.savedAt.replace('{date}', new Date(saved.savedAt).toLocaleDateString(language))}</Text>
                    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                      <SecondaryAction label={copy.loadSave} onPress={() => loadSavedCopy(saved)} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                      <SecondaryAction label={copy.deleteSave} onPress={() => removeSavedCopy(saved.id)} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
                    </View>
                  </View>
                ))}
                {savedMatches.length >= 5 ? <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.saveSlotsFull}</Text> : null}
              </View>
            ) : null}
          </Card>
        ) : null}

        <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, gap: SPACING.sm }}>
          <PressableSurface accessibilityLabel={copy.settingsTitle} accessibilityState={{ expanded: settingsExpanded }} haptic={preferences.hapticsEnabled ? 'selection' : 'none'} onPress={() => setSettingsExpanded((value) => !value)} style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.settingsTitle}</Text>
            <Feather name={settingsExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.dim} />
          </PressableSurface>
          {settingsExpanded ? (
            <View style={{ gap: SPACING.xs }}>
              <Text style={{ ...TYPE.label, color: theme.text }}>{copy.hapticsTitle}</Text>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.hapticsDescription}</Text>
              <ModeChoice label={preferences.hapticsEnabled ? copy.enabled : copy.disabled} selected={preferences.hapticsEnabled} onPress={toggleHaptics} theme={theme} hapticsEnabled={preferences.hapticsEnabled} accessibilityRole="switch" />
            </View>
          ) : null}
        </Card>

        <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, gap: SPACING.sm }}>
          <PressableSurface
            accessibilityLabel={rulesExpanded ? copy.hideRules : copy.showRules}
            accessibilityState={{ expanded: rulesExpanded }}
            haptic={preferences.hapticsEnabled ? 'selection' : 'none'}
            onPress={() => setRulesExpanded((value) => !value)}
            style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm }}
          >
            <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.rulesTitle}</Text>
            <Text style={{ ...TYPE.label, color: theme.brand }}>{rulesExpanded ? copy.hideRules : copy.showRules}</Text>
          </PressableSurface>
          {rulesExpanded ? (
            <View style={{ gap: SPACING.xs }}>
              <Text style={{ ...TYPE.body, color: theme.dim }}>{match?.mode === 'pass_and_play' ? copy.passPlayRulesBody : copy.rulesBody}</Text>
              {match?.mode !== 'pass_and_play' ? <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.guideRule.replace('{threshold}', guideThreshold)}</Text> : null}
              <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.storyBoundary}</Text>
            </View>
          ) : null}
        </Card>

        {rollError && isPlayerTurn ? (
          <Text accessibilityRole="alert" style={{ ...TYPE.caption, color: COLORS.danger }}>{copy.tryAgain}</Text>
        ) : null}
        {saveWarning ? <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.saveUnavailable}</Text> : null}
        {match && !saveWarning ? <Text style={{ ...TYPE.caption, textAlign: 'center', color: theme.dim }}>{copy.savedMatch}</Text> : null}

        {match?.phase === 'complete' ? (
          <>
            <SecondaryAction label={copy.changeMode} onPress={changeMode} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
            <SecondaryAction label={copy.close} onPress={() => router.replace('/play')} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
          </>
        ) : match ? (
          <>
            <SecondaryAction label={copy.newMatch} onPress={confirmNewMatch} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
            <SecondaryAction label={copy.changeMode} onPress={changeMode} theme={theme} hapticsEnabled={preferences.hapticsEnabled} />
          </>
        ) : null}

      </ScrollView>
    </Screen>
  );
}

function GameBoard({
  match,
  playerOneLabel,
  playerTwoLabel,
  statusTitle,
  prompt,
  guideBusy,
  latestTurn,
  theme,
  copy,
}: {
  match: DyutaMatchState;
  playerOneLabel: string;
  playerTwoLabel: string;
  statusTitle: string;
  prompt: string;
  guideBusy: boolean;
  latestTurn: DyutaMatchState['history'][number] | null;
  theme: ReturnType<typeof themeColor>;
  copy: DyutaCopy;
}) {
  const isComplete = match.phase === 'complete';
  const currentRound = isComplete ? 5 : match.round;
  const dice = isComplete ? match.history.at(-1)?.finalDice ?? null : match.currentRoll?.finalDice ?? null;

  return (
    <Card tone="auto" style={{ padding: SPACING.md, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, gap: SPACING.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
          <Feather name="circle" size={14} color={theme.brand} />
          <Text style={{ ...TYPE.label, color: theme.brand }}>{copy.boardTitle}</Text>
        </View>
        <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.round} {currentRound} / 5</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: SPACING.sm }}>
        <PlayerSeat
          label={playerOneLabel}
          score={match.totals.player}
          active={!isComplete && match.activeSide === 'player'}
          identity={match.identities.player}
          theme={theme}
          copy={copy}
        />
        <View accessible accessibilityLabel={copy.versus} style={{ width: 32, height: 32, borderRadius: RADII.pill, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...TYPE.chip, color: theme.dim }}>{copy.versus}</Text>
        </View>
        <PlayerSeat
          label={playerTwoLabel}
          score={match.totals.guide}
          active={!isComplete && match.activeSide === 'guide'}
          identity={match.identities.guide}
          theme={theme}
          copy={copy}
        />
      </View>

      <View style={{ minHeight: 184, overflow: 'hidden', borderRadius: RADII.xl, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.cardSoft, padding: SPACING.md, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }}>
        <View pointerEvents="none" style={{ position: 'absolute', width: 210, height: 150, borderRadius: RADII.pill, borderWidth: 1, borderColor: theme.borderSoft, top: -48, right: -42 }} />
        <View pointerEvents="none" style={{ position: 'absolute', width: 170, height: 118, borderRadius: RADII.pill, borderWidth: 1, borderColor: theme.borderSoft, bottom: -44, left: -26 }} />
        <Text accessibilityLiveRegion="polite" style={{ ...TYPE.cardHeading, color: theme.text, textAlign: 'center' }}>{statusTitle}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg }}>
          <DiceFace value={dice?.[0] ?? null} theme={theme} label={`${match.playerNames[match.activeSide]}, ${copy.firstDie}`} size={72} />
          <View style={{ width: 1, height: 40, backgroundColor: theme.border }} />
          <DiceFace value={dice?.[1] ?? null} theme={theme} label={`${match.playerNames[match.activeSide]}, ${copy.secondDie}`} size={72} />
        </View>
        {!isComplete ? <Text style={{ ...TYPE.caption, color: theme.dim, textAlign: 'center' }}>{prompt}</Text> : <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.matchComplete}</Text>}
        {guideBusy ? <ActivityIndicator size="small" color={theme.brand} /> : null}
      </View>

      {latestTurn ? (
        <TurnResult
          turn={latestTurn}
          playerLabel={latestTurn.side === 'player' ? playerOneLabel : playerTwoLabel}
          total={match.totals[latestTurn.side]}
          theme={theme}
          copy={copy}
        />
      ) : null}

      <RoundTrack match={match} label={copy.round} theme={theme} />
    </Card>
  );
}

function TurnResult({ turn, playerLabel, total, theme, copy }: {
  turn: DyutaMatchState['history'][number];
  playerLabel: string;
  total: number;
  theme: ReturnType<typeof themeColor>;
  copy: DyutaCopy;
}) {
  const rerollDescription = turn.rerolledIndex === null
    ? copy.keptBoth
    : copy.rerolledDie
      .replace('{die}', turn.rerolledIndex === 0 ? copy.firstDie : copy.secondDie)
      .replace('{from}', String(turn.initialDice[turn.rerolledIndex]))
      .replace('{to}', String(turn.finalDice[turn.rerolledIndex]));
  const scoreDescription = copy.scoredPoints
    .replace('{points}', String(turn.points))
    .replace('{total}', String(total));

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${copy.lastTurn}. ${playerLabel}. ${rerollDescription}. ${scoreDescription}`}
      style={{ padding: SPACING.md, borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, gap: SPACING.sm }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...TYPE.chip, color: theme.brand, textTransform: 'uppercase' }}>{copy.lastTurn}</Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...TYPE.label, color: theme.text }}>{playerLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
          <DiceFace value={turn.finalDice[0]} theme={theme} label={`${playerLabel}, ${copy.firstDie}`} size={44} />
          <Text style={{ ...TYPE.label, color: theme.dim }}>+</Text>
          <DiceFace value={turn.finalDice[1]} theme={theme} label={`${playerLabel}, ${copy.secondDie}`} size={44} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
        <Feather name={turn.rerolledIndex === null ? 'check-circle' : 'repeat'} size={16} color={theme.brand} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...TYPE.caption, color: theme.dim }}>{rerollDescription}</Text>
          <Text style={{ ...TYPE.label, color: theme.text }}>{scoreDescription}</Text>
        </View>
      </View>
    </View>
  );
}

function formatSavedMatchLabel(match: DyutaMatchState, copy: DyutaCopy): string {
  const mode = match.mode === 'solo' ? copy.soloMode : copy.passAndPlayMode;
  const progress = match.phase === 'complete' ? copy.matchComplete : `${copy.round} ${match.round}`;
  return `${mode} · ${progress}`;
}

function PlayerSeat({ label, score, active, identity, theme, copy }: {
  label: string;
  score: number;
  active: boolean;
  identity: DyutaMatchState['identities']['player'];
  theme: ReturnType<typeof themeColor>;
  copy: DyutaCopy;
}) {
  const accent = boardColorValue(identity.color, theme);
  const icon = avatarIcon(identity.avatar);
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${copy[identity.faction]}, ${copy.score}: ${score}`}
      accessibilityState={{ selected: active }}
      style={{ flex: 1, minWidth: 0, minHeight: 82, padding: SPACING.sm, borderRadius: RADII.lg, borderWidth: 1, borderColor: active ? accent : theme.border, backgroundColor: active ? theme.brandSoft : theme.cardSoft, gap: SPACING.xs }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
        <View style={{ width: 30, height: 30, borderRadius: RADII.pill, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={16} color={identity.color === 'gold' ? theme.textOnBrand : COLORS.creamBg} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...TYPE.caption, color: theme.text }}>{label}</Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...TYPE.chip, color: theme.dim }}>{copy[identity.faction]}</Text>
        </View>
      </View>
      <Text style={{ ...TYPE.metric, color: theme.text, marginLeft: 34 }}>{score}</Text>
    </View>
  );
}

function IdentityChoices({ title, avatar, color, onAvatar, onColor, theme, copy, hapticsEnabled }: {
  title: string;
  avatar: DyutaAvatarId;
  color: DyutaBoardColor;
  onAvatar: (value: DyutaAvatarId) => void;
  onColor: (value: DyutaBoardColor) => void;
  theme: ReturnType<typeof themeColor>;
  copy: DyutaCopy;
  hapticsEnabled: boolean;
}) {
  const avatars: Array<[DyutaAvatarId, string]> = [
    ['sun', copy.avatarSun], ['moon', copy.avatarMoon], ['star', copy.avatarStar],
    ['feather', copy.avatarFeather], ['heart', copy.avatarHeart], ['compass', copy.avatarCompass],
  ];
  const colors: Array<[DyutaBoardColor, string]> = [
    ['gold', copy.colorGold], ['sage', copy.colorSage], ['navy', copy.colorNavy], ['clay', copy.colorClay],
  ];
  return (
    <View style={{ gap: SPACING.xs }}>
      <Text style={{ ...TYPE.label, color: theme.text }}>{title} · {copy.avatarTitle}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
        {avatars.map(([id, label]) => (
          <AvatarChoice key={id} id={id} label={label} selected={avatar === id} onPress={() => onAvatar(id)} theme={theme} hapticsEnabled={hapticsEnabled} />
        ))}
      </View>
      <Text style={{ ...TYPE.label, color: theme.text }}>{copy.colorTitle}</Text>
      <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
        {colors.map(([id, label]) => (
          <ColorChoice key={id} color={id} label={label} selected={color === id} onPress={() => onColor(id)} theme={theme} hapticsEnabled={hapticsEnabled} />
        ))}
      </View>
    </View>
  );
}

function AvatarChoice({ id, label, selected, onPress, theme, hapticsEnabled }: {
  id: DyutaAvatarId;
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof themeColor>;
  hapticsEnabled: boolean;
}) {
  return (
    <PressableSurface accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: selected }} haptic={hapticsEnabled ? 'selection' : 'none'} onPress={onPress} style={{ width: '31%', minHeight: MIN_TOUCH_TARGET, borderRadius: RADII.md, borderWidth: 1, borderColor: selected ? theme.brand : theme.border, backgroundColor: selected ? theme.brandSoft : theme.bg, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Feather name={avatarIcon(id)} size={18} color={selected ? theme.brand : theme.dim} />
      <Text numberOfLines={1} style={{ ...TYPE.chip, color: selected ? theme.brand : theme.dim }}>{label}</Text>
    </PressableSurface>
  );
}

function ColorChoice({ color, label, selected, onPress, theme, hapticsEnabled }: {
  color: DyutaBoardColor;
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof themeColor>;
  hapticsEnabled: boolean;
}) {
  const value = boardColorValue(color, theme);
  return (
    <PressableSurface accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: selected }} haptic={hapticsEnabled ? 'selection' : 'none'} onPress={onPress} style={{ flex: 1, minHeight: MIN_TOUCH_TARGET, borderRadius: RADII.md, borderWidth: 1, borderColor: selected ? value : theme.border, backgroundColor: selected ? theme.brandSoft : theme.bg, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <View style={{ width: 18, height: 18, borderRadius: RADII.pill, backgroundColor: value }} />
      <Text style={{ ...TYPE.chip, color: theme.dim }}>{label}</Text>
    </PressableSurface>
  );
}

function avatarIcon(avatar: DyutaAvatarId): 'sun' | 'moon' | 'star' | 'feather' | 'heart' | 'compass' {
  return avatar;
}

function boardColorValue(color: DyutaBoardColor, theme: ReturnType<typeof themeColor>): string {
  if (color === 'gold') return theme.brand;
  if (color === 'sage') return COLORS.sage;
  if (color === 'navy') return COLORS.navy;
  return theme.earth;
}

function ModeChoice({ label, selected, onPress, theme, hapticsEnabled = true, accessibilityRole = 'radio' }: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof themeColor>;
  hapticsEnabled?: boolean;
  accessibilityRole?: 'radio' | 'switch';
}) {
  return (
    <PressableSurface
      accessibilityLabel={label}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ checked: selected }}
      haptic={hapticsEnabled ? 'selection' : 'none'}
      onPress={onPress}
      style={{ flex: 1, minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.sm, borderRadius: RADII.md, borderWidth: 1, borderColor: selected ? theme.brand : theme.border, backgroundColor: selected ? theme.brandSoft : theme.bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ ...TYPE.label, color: selected ? theme.brand : theme.text, textAlign: 'center' }}>{label}</Text>
    </PressableSurface>
  );
}

function RoundTrack({ match, label, theme }: { match: DyutaMatchState; label: string; theme: ReturnType<typeof themeColor> }) {
  const current = match.phase === 'complete' ? 5 : match.round;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`${label} ${current} of 5`} accessibilityValue={{ min: 1, max: 5, now: current }} style={{ flexDirection: 'row', gap: SPACING.xs }}>
      {[1, 2, 3, 4, 5].map((round) => (
        <View key={round} style={{ flex: 1, alignItems: 'center', gap: SPACING.xs }}>
          <View style={{ width: 30, height: 30, borderRadius: RADII.pill, borderWidth: 1, borderColor: round <= current ? theme.brand : theme.border, backgroundColor: round < current || match.phase === 'complete' ? theme.brand : round === current ? theme.brandSoft : theme.cardSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...TYPE.chip, color: round < current || match.phase === 'complete' ? theme.textOnBrand : round === current ? theme.brand : theme.dim }}>{round}</Text>
          </View>
          <View style={{ width: '70%', height: 3, borderRadius: RADII.pill, backgroundColor: round <= current ? theme.brand : theme.border }} />
        </View>
      ))}
    </View>
  );
}

function DiceFace({ value, theme, label, size = 64 }: {
  value: number | null;
  theme: ReturnType<typeof themeColor>;
  label: string;
  size?: number;
}) {
  const activePips = value === null ? [] : DIE_PIPS[value] ?? [];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={value === null ? `${label}: not rolled` : `${label}: ${value}`}
      style={{ width: size, height: size, borderRadius: RADII.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ gap: 4 }}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 4 }}>
            {[0, 1, 2].map((column) => {
              const index = row * 3 + column;
              return (
                <View
                  key={column}
                  style={{ width: 10, height: 10, borderRadius: RADII.pill, backgroundColor: activePips.includes(index) ? theme.brand : 'transparent' }}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function PrimaryAction({ label, onPress, disabled = false, busy = false, theme, hapticsEnabled = true }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  theme: ReturnType<typeof themeColor>;
  hapticsEnabled?: boolean;
}) {
  return (
    <PressableSurface
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      haptic={hapticsEnabled ? 'selection' : 'none'}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.lg, borderRadius: RADII.lg, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}
    >
      {busy ? <ActivityIndicator color={theme.textOnBrand} /> : <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: theme.textOnBrand, textAlign: 'center' }}>{label}</Text>}
    </PressableSurface>
  );
}

function SecondaryAction({ label, onPress, disabled = false, theme, hapticsEnabled = true }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  theme: ReturnType<typeof themeColor>;
  hapticsEnabled?: boolean;
}) {
  return (
    <PressableSurface
      accessibilityLabel={label}
      disabled={disabled}
      haptic={hapticsEnabled ? 'selection' : 'none'}
      onPress={onPress}
      style={{ flex: 1, minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.sm, borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ ...TYPE.label, color: theme.text, textAlign: 'center' }}>{label}</Text>
    </PressableSurface>
  );
}
