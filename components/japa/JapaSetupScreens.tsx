import { ComponentProps, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { JapaCustomMantraCard } from '@/components/japa/JapaCustomMantraCard';
import { JapaMalaChoiceList } from '@/components/japa/JapaMalaChoiceList';
import { JapaMantraChoiceList } from '@/components/japa/JapaMantraChoiceList';
import { JapaSceneChoiceList } from '@/components/japa/JapaSceneChoiceList';
import { TargetRoundSelector } from '@/components/japa/JapaSelectionControls';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { MALA_SKINS } from '@/lib/mala-skins';
import { createJapaTimer } from '@/lib/japaTimers';
import { navScrollHandler } from '@/lib/navScrollBus';
import type { JapaMantra } from '@/lib/traditions';

type Theme = ReturnType<typeof themeColor>;

type SetupColors = {
  isDark: boolean;
  cardBg: string;
  text: string;
  dim: string;
  theme: Theme;
};

// Short taglines for the mala list. MALA_SKINS (lib/mala-skins.ts, shared
// with the bead-ring renderer) only carries colour/label fields, so these
// stay with the picker's presentation.
const MALA_TAGLINES: Record<string, string> = {
  default: 'Calming · all traditions',
  'sacred-mala': 'Sacred · Shaiva',
  'krishna-flute': 'Clarity · breath practice',
  'tulsi-leaf': 'Pure · Vaishnava',
  'brahma-lotus': 'Soft focus · universal',
  'the-sage-halo': 'Radiant · festival practice',
  'bodhi-leaf': 'Grounding · meditation',
  'sphatik-crystal': 'Luminous · Saraswati & Shakti',
  'vaijayanti-bead': 'Victory · Krishna & Rama',
  'navaratna-gems': 'Cosmic · 9 Planetary Gems',
};

const MALA_OPTIONS = Object.entries(MALA_SKINS).map(([id, skin]) => ({
  id,
  skin,
  tagline: MALA_TAGLINES[id] ?? 'Traditional prayer beads',
}));

// Scroll container, back button and title block shared by both setup steps.
function JapaSetupShell({
  title,
  subtitle,
  cardBg,
  text,
  dim,
  theme,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  cardBg: string;
  text: string;
  dim: string;
  theme: Theme;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 150, gap: 18 }}
      onScroll={navScrollHandler}
      scrollEventThrottle={16}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PressableSurface
          haptic="selection"
          accessibilityLabel="Back"
          onPress={onBack}
          hitSlop={16}
          style={{
            width: 40,
            height: 40,
            minHeight: 40,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            backgroundColor: cardBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="chevron-left" size={18} color={theme.brand} />
        </PressableSurface>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: theme.brand }}>
          Japa Mala
        </Text>
        <Text style={{ fontFamily: FONTS.serif, fontSize: 30, lineHeight: 36, color: text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ ...TYPE.caption, color: dim, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {children}
    </ScrollView>
  );
}

function SetupPrimaryButton({ label, accessibilityLabel, isDark, theme, onPress }: { label: string; accessibilityLabel: string; isDark: boolean; theme: Theme; onPress: () => void }) {
  return (
    <PressableSurface
      haptic="impact"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        borderRadius: 999,
        minHeight: MIN_TOUCH_TARGET,
        paddingVertical: 17,
        backgroundColor: theme.brand,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
      }}
    >
      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, letterSpacing: 0.2, color: isDark ? COLORS.darkBg : COLORS.creamBg }}>
        {label}
      </Text>
    </PressableSurface>
  );
}

function useSetupAdvance(active: boolean, onAdvance: () => void) {
  const [timer] = useState(createJapaTimer);
  const advance = useRef(onAdvance);
  useLayoutEffect(() => {
    advance.current = onAdvance;
  }, [onAdvance]);
  useLayoutEffect(() => timer.cancel, [active, timer]);

  return {
    cancel: timer.cancel,
    schedule: () => {
      if (active) timer.schedule(240, () => {
        if (AppState.currentState === 'active') advance.current();
      });
    },
  };
}

// Setup step 1: mala list and practice background; continuing chains to
// the mantra step.
export function JapaChooseMalaScreen({
  selectedMalaId,
  scenes,
  selectedSceneId,
  onBack,
  onSelectMala,
  onSelectScene,
  onContinue,
  canAdvance,
  ...colors
}: SetupColors & {
  selectedMalaId: string | null;
  scenes: ComponentProps<typeof JapaSceneChoiceList>['options'];
  selectedSceneId: string;
  onBack: () => void;
  onSelectMala: (id: string) => void;
  onSelectScene: (id: string) => void;
  onContinue: () => void;
  canAdvance: boolean;
}) {
  const { isDark, cardBg, text, dim, theme } = colors;
  const advance = useSetupAdvance(canAdvance, onContinue);

  const handleSelectMalaWithAutoAdvance = (id: string) => {
    onSelectMala(id);
    advance.schedule();
  };

  return (
    <JapaSetupShell
      title="Choose your mala"
      subtitle="The sacred beads carry the energy of your tradition."
      cardBg={cardBg}
      text={text}
      dim={dim}
      theme={theme}
      onBack={() => { advance.cancel(); onBack(); }}
    >
      <JapaMalaChoiceList
        options={MALA_OPTIONS}
        selectedId={selectedMalaId}
        isDark={isDark}
        cardBg={cardBg}
        dim={dim}
        text={text}
        theme={theme}
        onSelect={handleSelectMalaWithAutoAdvance}
      />

      <JapaSceneChoiceList
        options={scenes}
        selectedId={selectedSceneId}
        isDark={isDark}
        dim={dim}
        theme={theme}
        onSelect={(id) => { advance.cancel(); onSelectScene(id); }}
      />

      <SetupPrimaryButton label="Choose mantra →" accessibilityLabel="Choose mantra" isDark={isDark} theme={theme} onPress={() => { advance.cancel(); onContinue(); }} />
    </JapaSetupShell>
  );
}

// Setup step 2: personal mantra card, preset list and target rounds;
// confirming begins practice (or asks for the personal mantra first).
export function JapaChooseMantraScreen({
  mantras,
  mantraIndex,
  customMantra,
  customSelected,
  targetRounds,
  onBack,
  onSelectCustom,
  onEditCustom,
  onSelectMantra,
  onChangeTargetRounds,
  onBegin,
  canAdvance,
  ...colors
}: SetupColors & {
  mantras: readonly JapaMantra[];
  mantraIndex: number;
  customMantra: JapaMantra | null;
  customSelected: boolean;
  targetRounds: number;
  onBack: () => void;
  onSelectCustom: () => void;
  onEditCustom: () => void;
  onSelectMantra: (index: number, key: string) => void;
  onChangeTargetRounds: (rounds: number) => void;
  onBegin: () => void;
  canAdvance: boolean;
}) {
  const { isDark, cardBg, text, dim, theme } = colors;
  const needsCustomMantra = customSelected && !customMantra;
  const advance = useSetupAdvance(canAdvance, onBegin);

  const handleSelectMantraWithAutoAdvance = (index: number, key: string) => {
    onSelectMantra(index, key);
    advance.schedule();
  };

  return (
    <JapaSetupShell title="Choose your mantra" cardBg={cardBg} text={text} dim={dim} theme={theme} onBack={() => { advance.cancel(); onBack(); }}>
      <JapaCustomMantraCard
        customMantra={customMantra}
        selected={customSelected}
        isDark={isDark}
        cardBg={cardBg}
        dim={dim}
        text={text}
        theme={theme}
        onSelect={() => { advance.cancel(); onSelectCustom(); }}
        onEdit={() => { advance.cancel(); onEditCustom(); }}
      />

      <JapaMantraChoiceList
        mantras={mantras}
        selectedIndex={mantraIndex}
        isDark={isDark}
        cardBg={cardBg}
        dim={dim}
        text={text}
        theme={theme}
        onSelect={handleSelectMantraWithAutoAdvance}
      />

      <View style={{ gap: 10 }}>
        <TargetRoundSelector value={targetRounds} theme={theme} isDark={isDark} onChange={(rounds) => { advance.cancel(); onChangeTargetRounds(rounds); }} />
        <Text style={{ ...TYPE.caption, color: dim, textAlign: 'center' }}>
          {targetRounds} mala{targetRounds > 1 ? 's' : ''} = {targetRounds * 108} beads
        </Text>
      </View>

      <SetupPrimaryButton
        label={needsCustomMantra ? 'Add your mantra →' : 'Begin practice →'}
        accessibilityLabel={needsCustomMantra ? 'Add your mantra' : 'Begin practice'}
        isDark={isDark}
        theme={theme}
        onPress={() => { advance.cancel(); onBegin(); }}
      />
    </JapaSetupShell>
  );
}
