import React, { useState } from 'react';
import { Modal, Text, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, SHADOWS, themeColor } from '@/lib/constants';
import { setGuestMode } from '@/lib/guestSession';

interface AuthGateProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function AuthGate({
  visible,
  onClose,
  title = 'Join Shoonaya',
  message = 'Sign in to save your sadhana.',
}: AuthGateProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setErrorMessage(null);
      await setGuestMode(false);
      onClose();
      router.replace('/(auth)/login');
    } catch {
      setErrorMessage('Could not leave guest mode. Please try again.');
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 22,
            paddingBottom: 34,
            gap: 16,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: theme.borderSoft }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <Feather name="lock" size={24} color={theme.brand} />
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: theme.text }}>
              {title}
            </Text>
          </View>

          <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: theme.dim, lineHeight: 20 }}>
            {message}
          </Text>

          {errorMessage ? (
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.danger }}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={{ gap: 10, marginTop: 8 }}>
            <PressableSurface
              haptic="selection"
              onPress={handleSignIn}
              style={{
                borderRadius: 18,
                backgroundColor: theme.brand,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: COLORS.ink }}>
                Sign In
              </Text>
            </PressableSurface>

            <PressableSurface
              haptic="selection"
              onPress={onClose}
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: 'transparent',
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 15, color: theme.text }}>
                Later
              </Text>
            </PressableSurface>
          </View>
        </View>
      </View>
    </Modal>
  );
}
