import { useState } from 'react';
import { ActivityIndicator, Linking, Text, TextInput, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS, themeColor } from '@/lib/constants';
import { API_BASE } from '@/lib/constants';

const TERMS_URL = 'https://shoonaya.com/terms';
const PRIVACY_URL = 'https://shoonaya.com/privacy';
const MIN_TOUCH_TARGET = 44;

export default function WhatsAppScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendCode = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/whatsapp-otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Could not send WhatsApp code.');
      }

      router.push({
        pathname: '/(auth)/otp',
        params: { phone },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send WhatsApp code.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 34, color: theme.text, marginBottom: 12 }}>
          WhatsApp login
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: theme.dim, marginBottom: 20 }}>
          Enter your phone number in international format to receive a WhatsApp verification code.
        </Text>
        <Card>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+447700900123"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="phone-pad"
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.cardSoft,
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 14,
              color: theme.text,
              fontFamily: FONTS.sans,
              fontSize: 15,
            }}
            placeholderTextColor={theme.dim}
          />

          <PressableSurface
            onPress={() => {
              void handleSendCode();
            }}
            disabled={submitting || phone.trim().length < 8}
            style={{
              marginTop: 14,
              borderRadius: 18,
              backgroundColor: COLORS.brandGold,
              paddingVertical: 15,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
              Send code
            </Text>
          </PressableSurface>

          <View style={{ paddingTop: 14, gap: 6 }}>
            <Text
              style={{
                color: theme.dim,
                fontFamily: FONTS.sans,
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              By continuing, you agree to our
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <PressableSurface
                accessibilityRole="link"
                haptic="selection"
                hitSlop={8}
                onPress={() => { void Linking.openURL(TERMS_URL); }}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                }}
              >
                <Text
                  style={{
                    color: theme.brand,
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 13,
                    textDecorationLine: 'underline',
                  }}
                >
                  Terms of Service
                </Text>
              </PressableSurface>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
                &
              </Text>
              <PressableSurface
                accessibilityRole="link"
                haptic="selection"
                hitSlop={8}
                onPress={() => { void Linking.openURL(PRIVACY_URL); }}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                }}
              >
                <Text
                  style={{
                    color: theme.brand,
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 13,
                    textDecorationLine: 'underline',
                  }}
                >
                  Privacy Policy
                </Text>
              </PressableSurface>
            </View>
          </View>

          {submitting ? (
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <ActivityIndicator color={COLORS.brandGold} />
            </View>
          ) : null}

          {errorMessage ? (
            <Text
              style={{
                marginTop: 12,
                color: theme.dim,
                fontFamily: FONTS.sans,
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {errorMessage}
            </Text>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}
