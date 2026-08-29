import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { API_BASE, COLORS, FONTS, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import {
  getHeroPick,
  setHeroPick,
  getHeroSize,
  setHeroSize,
  HERO_SIZE_CONFIG,
  LOCAL_HERO_ASSETS,
  BUNDLED_HERO_THEMES,
  type HeroPick,
  type HeroSize,
} from '@/lib/heroPreference';

type HeroTheme = {
  id: string;
  label: string;
  heroImage: string;
  objectPosition?: string;
  traditions?: string[];
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
  currentSize?: HeroSize;
  onSizeChange?: (size: HeroSize) => void;
};

// Native equivalent of the PWA's "Choose Sanctuary Backdrop" bottom sheet
// (src/app/(main)/home/sections/HeroSection.tsx). The theme pool itself
// comes from the backend (GET /api/native/hero-themes — admin-uploaded
// hero_assets rows merged with the static bundled defaults), but the
// user's actual pick stays device-local (lib/heroPreference.ts), same as
// PWA's own localStorage-only persistence — no new profiles column, so
// this costs no per-user DB storage.
export function HeroBackdropPicker({
  visible,
  onClose,
  tradition,
  onPickChange,
  currentSize,
  onSizeChange,
}: HeroBackdropPickerProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [loading, setLoading] = useState(false);
  const [themes, setThemes] = useState<HeroTheme[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<HeroSize>(currentSize ?? 'standard');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pick, sizePref, response] = await Promise.all([
        getHeroPick(),
        getHeroSize(),
        apiFetch(`/api/native/hero-themes?tradition=${encodeURIComponent(tradition)}`),
      ]);
      setSelectedId(pick?.id ?? null);
      setSelectedSize(currentSize ?? sizePref);
      let fetchedThemes: HeroTheme[] = [];
      if (response.ok) {
        const payload = (await response.json()) as { themes?: HeroTheme[] };
        fetchedThemes = payload.themes ?? [];
      }
      const matchingBundled = BUNDLED_HERO_THEMES.filter(
        (t) => !t.traditions?.length || t.traditions.includes(tradition)
      );
      const seen = new Set<string>();
      const merged: HeroTheme[] = [];
      for (const t of [...fetchedThemes, ...matchingBundled]) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          merged.push(t);
        }
      }
      setThemes(merged);
    } catch {
      // Best-effort fallback to bundled themes
      const matchingBundled = BUNDLED_HERO_THEMES.filter(
        (t) => !t.traditions?.length || t.traditions.includes(tradition)
      );
      setThemes(matchingBundled);
    } finally {
      setLoading(false);
    }
  }, [currentSize, tradition]);

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

  const handleSizeSelect = async (size: HeroSize) => {
    setSelectedSize(size);
    await setHeroSize(size);
    onSizeChange?.(size);
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
            gap: 18,
            maxHeight: '82%',
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

          {/* Hero Size Segmented Selector */}
          <View style={{ gap: 8 }}>
            <Text style={{ ...TYPE_MICRO, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1.2 }}>
              Sanctuary View Size
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['standard', 'expanded', 'immersive'] as const).map((sizeKey) => {
                const active = selectedSize === sizeKey;
                const config = HERO_SIZE_CONFIG[sizeKey];
                return (
                  <PressableSurface
                    key={sizeKey}
                    accessibilityRole="button"
                    accessibilityLabel={`${config.label} size, ${config.description}`}
                    accessibilityState={{ selected: active }}
                    haptic="selection"
                    onPress={() => {
                      void handleSizeSelect(sizeKey);
                    }}
                    style={{
                      flex: 1,
                      minHeight: 72,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 16,
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? theme.brand : theme.borderSoft,
                      backgroundColor: active
                        ? isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight
                        : theme.cardSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text
                        style={{
                          fontFamily: FONTS.sansSemiBold,
                          fontSize: 12.5,
                          color: active ? theme.brand : theme.text,
                        }}
                      >
                        {config.label}
                      </Text>
                      {active ? <Feather name="check" size={12} color={theme.brand} /> : null}
                    </View>
                    <Text
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 10,
                        color: theme.dim,
                        textAlign: 'center',
                      }}
                      numberOfLines={2}
                    >
                      {config.description}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={theme.brand} />
            </View>
          ) : (
            <View style={{ gap: 8, flexShrink: 1 }}>
              <Text style={{ ...TYPE_MICRO, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                Sacred Artwork
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 16 }}>
                  <PressableSurface
                    accessibilityRole="button"
                    accessibilityLabel="Auto Rotate artwork daily"
                    accessibilityState={{ selected: selectedId === null }}
                    haptic="selection"
                    onPress={() => handleSelect(null)}
                    style={{
                      width: '30%',
                      aspectRatio: 1,
                      borderRadius: 16,
                      borderWidth: selectedId === null ? 2 : 1,
                      borderColor: selectedId === null ? theme.brand : theme.border,
                      backgroundColor: selectedId === null
                        ? isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight
                        : theme.cardSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      paddingHorizontal: 4,
                      paddingVertical: 8,
                    }}
                  >
                    <Feather name="refresh-cw" size={18} color={theme.brand} />
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 11,
                        color: selectedId === null ? theme.brand : theme.text,
                        textAlign: 'center',
                      }}
                    >
                      Auto Rotate
                    </Text>
                  </PressableSurface>

                  {themes.map((item) => {
                    const active = selectedId === item.id;
                    return (
                      <PressableSurface
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.label} artwork`}
                        accessibilityState={{ selected: active }}
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
                        <Image
                          source={LOCAL_HERO_ASSETS[item.id] ?? { uri: resolveThemeImageUrl(item.heroImage) }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
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
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const TYPE_MICRO = { fontFamily: FONTS.sansMedium, fontSize: 10.5, lineHeight: 13 } as const;
