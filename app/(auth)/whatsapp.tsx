import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { API_BASE } from '@/lib/constants';

const TERMS_URL = 'https://shoonaya.com/terms';
const PRIVACY_URL = 'https://shoonaya.com/privacy';

export default function WhatsAppScreen() {
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
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 34, color: COLORS.ink, marginBottom: 12 }}>
          WhatsApp login
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.textDimLight, marginBottom: 20 }}>
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
              borderColor: COLORS.borderLight,
              backgroundColor: COLORS.creamBg,
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 14,
              color: COLORS.ink,
              fontFamily: FONTS.sans,
              fontSize: 15,
            }}
            placeholderTextColor={COLORS.textDimLight}
          />

          <Pressable
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
              opacity: submitting || phone.trim().length < 8 ? 0.6 : 1,
            }}
          >
            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
              Send code
            </Text>
          </Pressable>

          <Text
            style={{
              color: COLORS.textDimLight,
              fontFamily: FONTS.sans,
              fontSize: 12,
              textAlign: 'center',
              paddingTop: 14,
              lineHeight: 18,
            }}
          >
            By continuing, you agree to our{' '}
            <Text
              accessibilityRole="link"
              onPress={() => { void Linking.openURL(TERMS_URL); }}
              style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold }}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              accessibilityRole="link"
              onPress={() => { void Linking.openURL(PRIVACY_URL); }}
              style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold }}
            >
              Privacy Policy
            </Text>
            .
          </Text>

          {submitting ? (
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <ActivityIndicator color={COLORS.brandGold} />
            </View>
          ) : null}

          {errorMessage ? (
            <Text
              style={{
                marginTop: 12,
                color: COLORS.textDimLight,
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
