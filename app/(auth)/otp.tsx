import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { exchangeOAuthCodeOnce } from '@/lib/authRedirect';
import { API_BASE, COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

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

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'shoonaya',
        path: 'auth/callback',
      });

      const mobileRedirect = rewriteRedirectTarget(payload.redirect, redirectUri);
      const result = await WebBrowser.openAuthSessionAsync(mobileRedirect, redirectUri);

      // Same fix as native Google sign-in (app/(auth)/login.tsx): the auth
      // session resolves with the final redirect URL directly and does not
      // reliably reach app/_layout.tsx's Linking handling while the app
      // stays running in the foreground. The PKCE `code` must be exchanged
      // from here, or a verified WhatsApp code never creates a session.
      if (result.type === 'success' && result.url) {
        const redirectParams = new URL(result.url).searchParams;
        const oauthError = redirectParams.get('error_description') ?? redirectParams.get('error');
        const code = redirectParams.get('code');

        if (oauthError) {
          throw new Error(oauthError);
        }

        if (code) {
          await exchangeOAuthCodeOnce(code);
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

          <Pressable
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
              opacity: submitting || code.trim().length < 4 ? 0.6 : 1,
            }}
          >
            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
              Verify code
            </Text>
          </Pressable>

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
