import { useEffect, useMemo, useState } from 'react';
import { Modal, Text, TouchableWithoutFeedback, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, TYPE } from '@/lib/constants';
import type { ReadableCapabilities } from '@/lib/readable-content';
import { PressableSurface } from '@/components/ui/PressableSurface';

interface IntroStep {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  capabilityGate?: keyof ReadableCapabilities;
}

const ALL_STEPS: IntroStep[] = [
  {
    title: 'Reading Mode',
    description: 'The reader follows your device light or dark appearance for comfortable reading.',
    icon: 'moon',
  },
  {
    title: 'Text Scale',
    description: 'Adjust the font size to your preference for effortless reading.',
    icon: 'type',
  },
  {
    title: 'Deep Localization',
    description: "Toggle between English and your local tradition's language.",
    icon: 'sun',
    capabilityGate: 'canToggleLocalLanguage'
  },
  {
    title: 'Spread the Wisdom',
    description: 'Share these sacred teachings and observances with your Mandali.',
    icon: 'share-2',
  }
];

interface ReaderIntroProps {
  capabilities?: Partial<ReadableCapabilities>;
  isDark: boolean;
}

const INTRO_STORAGE_KEY = 'shoonaya_reader_intro_seen';

export function ReaderIntro({ capabilities, isDark }: ReaderIntroProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = useMemo(() => ALL_STEPS.filter(step => {
    if (!step.capabilityGate) return true;
    if (!capabilities) return true;
    return capabilities[step.capabilityGate] !== false;
  }), [capabilities]);

  useEffect(() => {
    let mounted = true;
    let revealTimer: ReturnType<typeof setTimeout> | null = null;
    const checkIntro = async () => {
      try {
        const seen = await AsyncStorage.getItem(INTRO_STORAGE_KEY);
        if (!seen && steps.length > 0 && mounted) {
          revealTimer = setTimeout(() => {
            if (mounted) setIsVisible(true);
          }, 1000);
        }
      } catch (err) {
        // ignore
      }
    };
    void checkIntro();
    return () => {
      mounted = false;
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [steps.length]);

  const closeIntro = async () => {
    setIsVisible(false);
    try {
      await AsyncStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((stepIndex) => stepIndex + 1);
    } else {
      void closeIntro();
    }
  };

  if (!isVisible || steps.length === 0) return null;

  const step = steps[currentStep];
  if (!step) return null;

  const bgModal = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const textMain = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brandSoft = isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight;
  const brandMain = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={closeIntro}
    >
      <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: 'flex-end' }}>
        <TouchableWithoutFeedback onPress={closeIntro}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
        
        <View style={{
          backgroundColor: bgModal,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          padding: 24,
          paddingBottom: 40,
          borderTopWidth: 1,
          borderColor: brandSoft,
          boxShadow: isDark ? '0 -10px 24px rgba(0,0,0,0.30)' : '0 -10px 24px rgba(49,35,20,0.10)',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: brandSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Feather name={step.icon} size={24} color={brandMain} />
            </View>
            <PressableSurface
              haptic="selection"
              onPress={closeIntro}
              accessibilityLabel="Close reader introduction"
              style={{ width: 44, height: 44, borderRadius: 22, opacity: 0.5, alignItems: 'center', justifyContent: 'center', minHeight: 0 }}
            >
              <Feather name="x" size={20} color={textMain} />
            </PressableSurface>
          </View>

          <Text style={{ ...TYPE.title, color: textMain, fontSize: 20, marginBottom: 8 }}>
            {step.title}
          </Text>
          <Text style={{ ...TYPE.body, color: textDim, lineHeight: 22, marginBottom: 24 }}>
            {step.description}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={{
                    height: 4,
                    borderRadius: 2,
                    width: i === currentStep ? 16 : 4,
                    backgroundColor: i === currentStep ? brandMain : brandSoft,
                  }}
                />
              ))}
            </View>

            <PressableSurface
              haptic="selection"
              onPress={nextStep}
              accessibilityLabel={currentStep === steps.length - 1 ? 'Finish reader introduction' : 'Next reader introduction step'}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: brandMain }}>
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                </Text>
                <Feather name="arrow-right" size={16} color={brandMain} />
              </View>
            </PressableSurface>
          </View>
        </View>
      </View>
    </Modal>
  );
}
