import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { apiFetch } from '@/lib/api';
import { APP_BUILD_NUMBER, APP_VERSION } from '@/lib/appVersion';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SUGGESTIONS_EMAIL, TYPE, themeColor } from '@/lib/constants';

export type FeedbackCategory = 'suggestion' | 'issue' | 'content' | 'appreciation';

type FeedbackModalProps = {
  visible: boolean;
  initialCategory?: FeedbackCategory;
  initialRating?: number | null;
  userEmail?: string | null;
  isDark?: boolean;
  onClose: () => void;
};

const CATEGORIES: Array<{ key: FeedbackCategory; label: string; icon: keyof typeof Feather.glyphMap; placeholder: string }> = [
  {
    key: 'suggestion',
    label: 'Suggestion',
    icon: 'zap',
    placeholder: 'What feature, ritual, or festival would you love to see in Shoonaya?',
  },
  {
    key: 'issue',
    label: 'Report Bug',
    icon: 'alert-circle',
    placeholder: 'What happened, and where did you encounter it?',
  },
  {
    key: 'content',
    label: 'Scripture / Content',
    icon: 'book-open',
    placeholder: 'Tell us about the mantra, translation, or calculation that needs attention...',
  },
  {
    key: 'appreciation',
    label: 'Love & Gratitude',
    icon: 'heart',
    placeholder: 'What touched your heart during your spiritual practice with Shoonaya?',
  },
];

export function FeedbackModal({
  visible,
  initialCategory = 'suggestion',
  initialRating = null,
  userEmail,
  isDark = false,
  onClose,
}: FeedbackModalProps) {
  const theme = themeColor(isDark);
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(userEmail ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeCategory = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];

  const handleClose = () => {
    setMessage('');
    setRating(null);
    setSubmitted(false);
    onClose();
  };

  const handleStarPress = (star: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating((prev) => (prev === star ? null : star));
  };

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 3) {
      Alert.alert('Message Required', 'Please share a few words about your reflection or feedback.');
      return;
    }

    setSubmitting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          rating,
          message: trimmedMessage,
          email: email.trim() || undefined,
          deviceInfo: {
            platform: Platform.OS,
            osVersion: Platform.Version,
            appVersion: APP_VERSION,
            buildNumber: APP_BUILD_NUMBER,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      setSubmitted(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(
        'Offline or Network Issue',
        'Could not submit feedback online. Would you like to email your feedback directly to our team?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Email',
            onPress: () => {
              const subject = encodeURIComponent(`[Shoonaya Feedback] ${category.toUpperCase()}`);
              const body = encodeURIComponent(
                `${trimmedMessage}\n\n---\nPlatform: ${Platform.OS} ${Platform.Version}\nApp: v${APP_VERSION} (${APP_BUILD_NUMBER})\nContact: ${email}`,
              );
              void Linking.openURL(`mailto:${SUGGESTIONS_EMAIL}?subject=${subject}&body=${body}`);
            },
          },
        ],
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="Dismiss feedback sheet"
          onPress={handleClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              maxHeight: '92%',
              backgroundColor: theme.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              paddingBottom: Platform.OS === 'ios' ? 24 : 16,
            }}
          >
            {/* Handle bar */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 6 }}>
              <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: theme.premiumBorder }} />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 6, gap: 16 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...TYPE.section, color: theme.brand, fontSize: 11 }}>Seeker Voice</Text>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text, fontSize: 20 }}>
                    {submitted ? 'Dhanyavaad! 🙏' : 'Share Your Reflection'}
                  </Text>
                </View>
                <PressableSurface
                  accessibilityLabel="Close feedback sheet"
                  haptic="selection"
                  onPress={handleClose}
                  style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="x" size={20} color={theme.dim} />
                </PressableSurface>
              </View>

              {submitted ? (
                /* Success View */
                <View style={{ alignItems: 'center', paddingVertical: 28, gap: 14 }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: theme.brandSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="heart" size={28} color={theme.brand} />
                  </View>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text, fontSize: 18, textAlign: 'center' }}>
                    Your feedback is received with reverence
                  </Text>
                  <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center', paddingHorizontal: 12 }}>
                    Every reflection guides our craftsmanship to keep Shoonaya pure, authentic, and devoted to your daily spiritual journey.
                  </Text>
                  <PressableSurface
                    haptic="selection"
                    onPress={handleClose}
                    style={{
                      minHeight: 48,
                      minWidth: 160,
                      marginTop: 8,
                      borderRadius: 16,
                      backgroundColor: theme.brand,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 24,
                    }}
                  >
                    <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Done</Text>
                  </PressableSurface>
                </View>
              ) : (
                /* Form View */
                <>
                  {/* Category Pills */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>What kind of feedback would you like to share?</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {CATEGORIES.map((cat) => {
                        const active = category === cat.key;
                        return (
                          <PressableSurface
                            key={cat.key}
                            haptic="selection"
                            onPress={() => setCategory(cat.key)}
                            style={{
                              minHeight: 38,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 999,
                              backgroundColor: active ? theme.brandSoft : theme.cardSoft,
                              borderWidth: 1,
                              borderColor: active ? theme.brand : theme.premiumBorder,
                            }}
                          >
                            <Feather name={cat.icon} size={13} color={active ? theme.brand : theme.dim} />
                            <Text
                              style={{
                                color: active ? theme.brand : theme.text,
                                fontFamily: active ? FONTS.sansSemiBold : FONTS.sansMedium,
                                fontSize: 12.5,
                              }}
                            >
                              {cat.label}
                            </Text>
                          </PressableSurface>
                        );
                      })}
                    </View>
                  </View>

                  {/* Star Rating Bar */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>Rate your overall experience (optional)</Text>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = rating !== null && star <= rating;
                        return (
                          <PressableSurface
                            key={star}
                            accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            haptic="selection"
                            onPress={() => handleStarPress(star)}
                            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Feather
                              name="star"
                              size={26}
                              color={active ? theme.brand : theme.dim}
                              style={active ? { transform: [{ scale: 1.08 }] } : undefined}
                            />
                          </PressableSurface>
                        );
                      })}
                    </View>
                  </View>

                  {/* Message Input */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>Your message</Text>
                    <TextInput
                      value={message}
                      onChangeText={setMessage}
                      placeholder={activeCategory.placeholder}
                      placeholderTextColor={theme.dim}
                      multiline
                      maxLength={2000}
                      numberOfLines={4}
                      style={{
                        minHeight: 110,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.premiumBorder,
                        backgroundColor: theme.cardSoft,
                        padding: 14,
                        color: theme.text,
                        fontFamily: FONTS.sans,
                        fontSize: 14,
                        textAlignVertical: 'top',
                      }}
                    />
                    <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 11, textAlign: 'right' }}>
                      {message.length} / 2000
                    </Text>
                  </View>

                  {/* Email Input */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>Your email for reply (optional)</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="e.g. yourname@example.com"
                      placeholderTextColor={theme.dim}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: theme.premiumBorder,
                        backgroundColor: theme.cardSoft,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        color: theme.text,
                        fontFamily: FONTS.sans,
                        fontSize: 13.5,
                      }}
                    />
                  </View>

                  {/* Diagnostics Footer */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 4,
                      opacity: 0.7,
                    }}
                  >
                    <Feather name="info" size={12} color={theme.dim} />
                    <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 11, flex: 1 }}>
                      Attached: Shoonaya v{APP_VERSION} ({APP_BUILD_NUMBER}) · {Platform.OS.toUpperCase()}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <PressableSurface
                      haptic="selection"
                      onPress={handleClose}
                      style={{
                        minHeight: 48,
                        flex: 1,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.premiumBorder,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Discard</Text>
                    </PressableSurface>

                    <PressableSurface
                      haptic="selection"
                      onPress={handleSubmit}
                      disabled={submitting || message.trim().length < 3}
                      style={{
                        minHeight: 48,
                        flex: 1,
                        borderRadius: 16,
                        backgroundColor: message.trim().length >= 3 ? theme.brand : theme.premiumBorder,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {submitting ? (
                        <ActivityIndicator color={COLORS.ink} />
                      ) : (
                        <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                          Submit Feedback
                        </Text>
                      )}
                    </PressableSurface>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
