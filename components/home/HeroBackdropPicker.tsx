import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { API_BASE, COLORS, FONTS, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { getHeroPick, setHeroPick, type HeroPick } from '@/lib/heroPreference';

type HeroTheme = {
  id: string;
  label: string;
  heroImage: string;
  objectPosition?: string;
};

function resolveThemeImageUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

type HeroBackdropPickerProps = {
  visible: boolean;
  onClose: () => void;
  tradition: string;
  onPickChange: (pick: HeroPick | null) => void;
};

// Native equivalent of the PWA's "Choose Sanctuary Backdrop" bottom sheet
// (src/app/(main)/home/sections/HeroSection.tsx). The theme pool itself
// comes from the backend (GET /api/native/hero-themes — admin-uploaded
// hero_assets rows merged with the static bundled defaults), but the
// user's actual pick stays device-local (lib/heroPreference.ts), same as
// PWA's own localStorage-only persistence — no new profiles column, so
// this costs no per-user DB storage.
export function HeroBackdropPicker({ visible, onClose, tradition, onPickChange }: HeroBackdropPickerProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [loading, setLoading] = useState(false);
  const [themes, setThemes] = useState<HeroTheme[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pick, response] = await Promise.all([
        getHeroPick(),
        apiFetch(`/api/native/hero-themes?tradition=${encodeURIComponent(tradition)}`),
      ]);
      setSelectedId(pick?.id ?? null);
      if (response.ok) {
        const payload = (await response.json()) as { themes?: HeroTheme[] };
        setThemes(payload.themes ?? []);
      }
    } catch {
      // Best-effort — picker just shows an empty grid if this fails.
    } finally {
      setLoading(false);
    }
  }, [tradition]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const handleSelect = async (choice: HeroTheme | null) => {
    const pick: HeroPick | null = choice
      ? { id: choice.id, imageUrl: resolveThemeImageUrl(choice.heroImage), objectPosition: choice.objectPosition }
      : null;
    await setHeroPick(pick);
    setSelectedId(pick?.id ?? null);
    onPickChange(pick);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
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
            maxHeight: '78%',
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: theme.borderSoft }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="image" size={20} color={theme.brand} />
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: theme.text }}>
                Choose Sanctuary Backdrop
              </Text>
            </View>
            <PressableSurface
              haptic="selection"
              onPress={onClose}
              accessibilityLabel="Close"
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cardSoft }}
            >
              <Feather name="x" size={16} color={theme.dim} />
            </PressableSurface>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={theme.brand} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <PressableSurface
                  haptic="selection"
                  onPress={() => handleSelect(null)}
                  style={{
                    width: '30%',
                    aspectRatio: 1,
                    borderRadius: 16,
                    borderWidth: selectedId === null ? 2 : 1,
                    borderColor: selectedId === null ? theme.brand : theme.border,
                    backgroundColor: theme.cardSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Feather name="refresh-cw" size={20} color={theme.brand} />
                  <Text style={{ ...TYPE_MICRO, color: theme.dim, textAlign: 'center' }}>Auto{'\n'}Default</Text>
                </PressableSurface>

                {themes.map((item) => {
                  const active = selectedId === item.id;
                  return (
                    <PressableSurface
                      key={item.id}
                      haptic="selection"
                      onPress={() => handleSelect(item)}
                      style={{
                        width: '30%',
                        aspectRatio: 1,
                        borderRadius: 16,
                        borderWidth: active ? 2 : 1,
                        borderColor: active ? theme.brand : theme.border,
                        overflow: 'hidden',
                      }}
                    >
                      <Image source={{ uri: resolveThemeImageUrl(item.heroImage) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          paddingHorizontal: 6,
                          paddingVertical: 4,
                          backgroundColor: 'rgba(0,0,0,0.45)',
                        }}
                      >
                        <Text style={{ ...TYPE_MICRO, color: '#fff' }} numberOfLines={1}>
                          {item.label}
                        </Text>
                      </View>
                      {active ? (
                        <View
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: theme.brand,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Feather name="check" size={12} color={COLORS.ink} />
                        </View>
                      ) : null}
                    </PressableSurface>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const TYPE_MICRO = { fontFamily: FONTS.sansMedium, fontSize: 10.5, lineHeight: 13 } as const;
