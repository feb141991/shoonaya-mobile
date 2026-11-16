import { useState } from 'react';
import {
  Linking,
  Platform,
  Share,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { FeedbackModal, type FeedbackCategory } from '@/components/settings/FeedbackModal';
import { APP_VERSION_LABEL } from '@/lib/appVersion';
import { COLORS, FONTS, MIN_TOUCH_TARGET, OFFICIAL_EMAIL, SOCIAL_LINKS, TYPE, themeColor } from '@/lib/constants';
import { openStoreReview } from '@/lib/storeReview';

type AboutSettingsViewProps = {
  theme: ReturnType<typeof themeColor>;
  isDark: boolean;
  language?: string;
  tourLabel?: string;
  userEmail?: string | null;
  onReplayTips: () => void;
  onOpenTour: () => void;
  onOpenLegal: (path: '/terms' | '/privacy') => void;
};

export function AboutSettingsView({
  theme,
  isDark,
  language = 'en',
  tourLabel,
  userEmail,
  onReplayTips,
  onOpenTour,
  onOpenLegal,
}: AboutSettingsViewProps) {
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('suggestion');

  const openFeedback = (category: FeedbackCategory) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedbackCategory(category);
    setFeedbackVisible(true);
  };

  const handleShareApp = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: 'Join me on Shoonaya — a sacred sanctuary for daily Vedic Panchang, Japa meditation, and authentic Sanatan rituals. https://www.shoonaya.com',
        title: 'Shoonaya · Sacred Sanatan Sanctuary',
        url: 'https://www.shoonaya.com',
      });
    } catch {
      // User cancelled or share unavailable
    }
  };

  const handleRateApp = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await openStoreReview();
  };

  return (
    <View style={{ gap: 20 }}>
      {/* ── App Identity & Hero Card ────────────────────────────── */}
      <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 20, alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 20,
            backgroundColor: theme.brandSoft,
            borderWidth: 1,
            borderColor: theme.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="sun" size={28} color={theme.brand} />
        </View>

        <Text style={{ ...TYPE.cardHeading, color: theme.text, fontSize: 24, textAlign: 'center' }}>
          Shoonaya
        </Text>
        <Text style={{ ...TYPE.caption, color: theme.brand, textAlign: 'center', fontSize: 13, letterSpacing: 0.5 }}>
          Find your infinite · शून्य से अनंत
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: theme.cardSoft,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            marginTop: 4,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success }} />
          <Text style={{ ...TYPE.caption, color: theme.text, fontSize: 12, fontFamily: FONTS.sansMedium }}>
            {APP_VERSION_LABEL}
          </Text>
        </View>
      </Card>

      {/* ── About the Sanctuary ─────────────────────────────────── */}
      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.section, color: theme.brand, fontSize: 11 }}>About the Sanctuary</Text>
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 18, gap: 10 }}>
          <Text style={{ ...TYPE.body, color: theme.text, fontSize: 14, lineHeight: 22 }}>
            Shoonaya was created with deep reverence to unite timeless Vedic wisdom with modern precision.
          </Text>
          <Text style={{ ...TYPE.body, color: theme.dim, fontSize: 13.5, lineHeight: 21 }}>
            From high-precision Drik Ganita Panchang and authentic Nitya rituals, to 108-bead Japa Mala meditation, communal Mandali satsang, and Pathshala recitation — Shoonaya is crafted with zero ads, zero commercial compromises, and unwavering devotion to your daily Sadhana.
          </Text>
        </Card>
      </View>

      {/* ── Rate & Review Section (Customer Review Flow) ────────── */}
      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.section, color: theme.brand, fontSize: 11 }}>Reviews & Gratitude</Text>
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 18, gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ ...TYPE.label, color: theme.text, fontSize: 15 }}>
              Enjoying your spiritual journey on Shoonaya?
            </Text>
            <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 13, lineHeight: 18 }}>
              Your store reviews help fellow seekers discover authentic Sanatan wisdom and sacred rituals worldwide.
            </Text>
          </View>

          <PressableSurface
            haptic="selection"
            onPress={handleRateApp}
            accessibilityLabel={`Rate Shoonaya on ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'}`}
            style={{
              minHeight: 50,
              borderRadius: 16,
              backgroundColor: theme.brandSoft,
              borderWidth: 1,
              borderColor: theme.brand,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingHorizontal: 16,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Feather key={star} name="star" size={15} color={theme.brand} />
              ))}
            </View>
            <Text style={{ ...TYPE.label, color: theme.brand, fontSize: 14, fontFamily: FONTS.sansSemiBold }}>
              Rate on {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
            </Text>
          </PressableSurface>
        </Card>
      </View>

      {/* ── Customer Feedback & Support Flow ────────────────────── */}
      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.section, color: theme.brand, fontSize: 11 }}>Feedback & Support</Text>
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 18, gap: 10 }}>
          <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 13, lineHeight: 18 }}>
            Have an idea for a practice, a scriptural question, or ran into a bug? Our founding team reviews every submission.
          </Text>

          <View style={{ gap: 8, marginTop: 4 }}>
            <PressableSurface
              haptic="selection"
              onPress={() => openFeedback('suggestion')}
              style={{
                minHeight: 48,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.cardSoft,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Feather name="message-square" size={16} color={theme.brand} />
              <Text style={{ ...TYPE.body, color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13.5, flex: 1 }}>
                Send Feedback or Suggestion
              </Text>
              <Feather name="chevron-right" size={16} color={theme.dim} />
            </PressableSurface>

            <PressableSurface
              haptic="selection"
              onPress={() => openFeedback('issue')}
              style={{
                minHeight: 48,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.cardSoft,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Feather name="alert-circle" size={16} color={COLORS.danger} />
              <Text style={{ ...TYPE.body, color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13.5, flex: 1 }}>
                Report an Issue or Bug
              </Text>
              <Feather name="chevron-right" size={16} color={theme.dim} />
            </PressableSurface>

            <PressableSurface
              haptic="selection"
              onPress={() => { void Linking.openURL(SOCIAL_LINKS.email); }}
              style={{
                minHeight: 48,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.cardSoft,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Feather name="mail" size={16} color={theme.brand} />
              <Text style={{ ...TYPE.body, color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13.5, flex: 1 }}>
                Email Official Support ({OFFICIAL_EMAIL})
              </Text>
              <Feather name="external-link" size={14} color={theme.dim} />
            </PressableSurface>
          </View>
        </Card>
      </View>

      {/* ── Share with Friends & Family ─────────────────────────── */}
      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.section, color: theme.brand, fontSize: 11 }}>Invite Seekers</Text>
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 18, gap: 10 }}>
          <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 13, lineHeight: 18 }}>
            Share the sacred sanctuary with family, elders, and spiritual companions.
          </Text>
          <PressableSurface
            haptic="selection"
            onPress={handleShareApp}
            style={{
              minHeight: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.brand,
              backgroundColor: theme.brandSoft,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Feather name="share-2" size={16} color={theme.brand} />
            <Text style={{ ...TYPE.label, color: theme.brand, fontSize: 14, fontFamily: FONTS.sansSemiBold }}>
              Share Shoonaya App
            </Text>
          </PressableSurface>
        </Card>
      </View>

      {/* ── Guidance & Tips ─────────────────────────────────────── */}
      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.section, color: theme.brand, fontSize: 11 }}>Guidance & Discovery</Text>
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 18, gap: 10 }}>
          <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 13, lineHeight: 18 }}>
            Bring back the hints Shoonaya shows when you are new to a feature, or take a visual tour of the four core sections.
          </Text>
          <View style={{ gap: 8, marginTop: 4 }}>
            <PressableSurface
              haptic="selection"
              onPress={onReplayTips}
              style={{
                minHeight: 46,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.cardSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13.5 }}>
                Replay first-use tips
              </Text>
            </PressableSurface>

            <PressableSurface
              haptic="selection"
              onPress={onOpenTour}
              style={{
                minHeight: 46,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.cardSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13.5 }}>
                {tourLabel ?? (language === 'hi' ? 'ऐप की मुख्य झलक देखें' : 'Take the visual tour')}
              </Text>
            </PressableSurface>
          </View>
        </Card>
      </View>

      {/* ── Community & Socials ─────────────────────────────────── */}
      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.section, color: theme.brand, fontSize: 11 }}>Community & Socials</Text>
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 6, paddingHorizontal: 16 }}>
          {[
            { id: 'instagram', icon: 'instagram', label: 'Instagram', handle: '@shoonayaapp', url: SOCIAL_LINKS.instagram },
            { id: 'facebook', icon: 'facebook-square', label: 'Facebook', handle: 'Shoonaya', url: SOCIAL_LINKS.facebook },
            { id: 'linkedin', icon: 'linkedin-square', label: 'LinkedIn', handle: 'Shoonaya', url: SOCIAL_LINKS.linkedin },
            { id: 'website', icon: 'globe', label: 'Official Website', handle: 'shoonaya.com', url: SOCIAL_LINKS.website },
          ].map((social, index) => (
            <View key={social.id}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: theme.borderSoft, marginVertical: 4 }} /> : null}
              <PressableSurface
                haptic="selection"
                accessibilityRole="link"
                accessibilityLabel={social.label}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void Linking.openURL(social.url);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: MIN_TOUCH_TARGET,
                  paddingVertical: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome name={social.icon as React.ComponentProps<typeof FontAwesome>['name']} size={16} color={theme.brand} />
                  </View>
                  <View>
                    <Text style={{ ...TYPE.body, color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13.5 }}>{social.label}</Text>
                    <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 12 }}>{social.handle}</Text>
                  </View>
                </View>
                <Feather name="external-link" size={14} color={theme.dim} />
              </PressableSurface>
            </View>
          ))}
        </Card>
      </View>

      {/* ── Governance & Sources Statement ──────────────────────── */}
      <View style={{ gap: 8 }}>
        <Text style={{ ...TYPE.section, color: theme.brand, fontSize: 11 }}>Astronomical & Scriptural Governance</Text>
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 16, gap: 8 }}>
          <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 12.5, lineHeight: 18 }}>
            Shoonaya calculates Panchang timings, tithis, and nakshatras using Drik Ganita (astronomical ephemerides) tailored to your exact geographic coordinates. Ritual rules, Ekadashi vratas, and festival dates are governed according to classical Vedic scriptures, Surya Siddhanta, and vetted sampradaya standards.
          </Text>
        </Card>
      </View>

      {/* ── Legal & Policy Links ────────────────────────────────── */}
      <View style={{ alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
          <PressableSurface
            haptic="selection"
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
            hitSlop={10}
            onPress={() => onOpenLegal('/terms')}
            style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
          >
            <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>Terms of Service</Text>
          </PressableSurface>
          <PressableSurface
            haptic="selection"
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
            hitSlop={10}
            onPress={() => onOpenLegal('/privacy')}
            style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
          >
            <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>Privacy Policy</Text>
          </PressableSurface>
        </View>
        <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 11.5 }}>
          Shoonaya · Crafted with devotion for Sanatan Dharma
        </Text>
      </View>

      {/* In-app Feedback Modal */}
      <FeedbackModal
        visible={feedbackVisible}
        initialCategory={feedbackCategory}
        userEmail={userEmail}
        isDark={isDark}
        onClose={() => setFeedbackVisible(false)}
      />
    </View>
  );
}
