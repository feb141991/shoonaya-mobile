import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { exchangeOAuthUrlIfPresent, getOAuthRedirectUri, waitForStoredSession } from '@/lib/authRedirect';
import { API_BASE, COLORS, FONTS } from '@/lib/constants';

type VerifyPayload = {
  success?: boolean;
  redirect?: string;
  error?: string;
};

function rewriteRedirectTarget(rawUrl: string, redirectUri: string) {
  const url = new URL(rawUrl);

  if (url.searchParams.has('redirect_to')) {
    url.searchParams.set('redirect_to', redirectUri);
  }

  return url.toString();
}

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/whatsapp-otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          code,
        }),
      });

      const payload = (await response.json()) as VerifyPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? 'Could not verify WhatsApp code.');
      }

      if (!payload.redirect) {
        throw new Error('Verification succeeded but no mobile redirect was returned.');
      }

      const redirectUri = getOAuthRedirectUri();

      const mobileRedirect = rewriteRedirectTarget(payload.redirect, redirectUri);
      const result = await WebBrowser.openAuthSessionAsync(mobileRedirect, redirectUri);

      if (result.type === 'success' && result.url) {
        const exchanged = await exchangeOAuthUrlIfPresent(result.url);

        if (!exchanged) {
          throw new Error('Verification redirect did not include an auth code.');
        }
      } else if (result.type !== 'cancel') {
        const session = await waitForStoredSession(2800);

        if (!session) {
          throw new Error(`Verification did not complete (browser result: "${result.type}").`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not verify WhatsApp code.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 34, color: COLORS.ink, marginBottom: 12 }}>
          Enter code
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.textDimLight, marginBottom: 20 }}>
          Enter the verification code sent to {phone ?? 'your phone'} on WhatsApp.
        </Text>
        <Card>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            style={{
              borderWidth: 1,
              borderColor: COLORS.borderLight,
              backgroundColor: COLORS.creamBg,
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 14,
              color: COLORS.ink,
              fontFamily: FONTS.sans,
              fontSize: 18,
              letterSpacing: 4,
              textAlign: 'center',
            }}
            placeholderTextColor={COLORS.textDimLight}
          />

          <PressableSurface
            onPress={() => {
              void handleVerify();
            }}
            disabled={submitting || code.trim().length < 4}
            style={{
              marginTop: 14,
              borderRadius: 18,
              backgroundColor: COLORS.brandGold,
              paddingVertical: 15,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
              Verify code
            </Text>
          </PressableSurface>

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
