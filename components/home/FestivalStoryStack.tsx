import { useState } from 'react';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { Linking, Modal, ScrollView, Share, Text, View } from 'react-native';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon } from '@/components/ui/SacredIcon';
import { COLORS, RADII, SHADOWS, TYPE } from '@/lib/constants';
import type { HomeObservanceStoryCard } from '@/lib/observance-story-contract.generated';

type Theme = { card: string; border: string; premiumBorder: string; text: string; dim: string; brand: string };

export function FestivalStoryStack({ cards, theme, isDark }: { cards?: HomeObservanceStoryCard[]; theme: Theme; isDark: boolean }) {
  const [active, setActive] = useState<HomeObservanceStoryCard | null>(null);
  if (!cards?.length) return null;
  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const surface = isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight;

  return <>
    <View style={{ gap: 10 }}>
      {cards.map((card) => {
        const art = card.story.artwork.find((item) => item.kind === 'card');
        return <PressableSurface key={card.identityKey} haptic="selection" accessibilityLabel={`Read ${card.story.displayName}`} onPress={() => setActive(card)} style={{ minHeight: 92, borderRadius: RADII.xl, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.card, overflow: 'hidden', boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light }}>
          {art ? <Image source={{ uri: art.uri }} contentFit="cover" style={{ position: 'absolute', width: 96, top: 0, bottom: 0, right: 0, opacity: 0.3 }} accessibilityLabel={art.altText[card.story.translation.language] ?? art.altText.en ?? ''} /> : null}
          <View style={{ flexDirection: 'row', gap: 11, alignItems: 'center', padding: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight }}><SacredIcon name="shloka" fallbackGlyph="book-open" size={18} color={accent} /></View>
            <View style={{ flex: 1 }}><Text style={{ ...TYPE.section, color: accent, fontSize: 10 }}>{card.daysLeft === 0 ? 'TODAY' : card.daysLeft === 1 ? 'TOMORROW' : `IN ${card.daysLeft} DAYS`} · FESTIVAL STORY</Text><Text style={{ ...TYPE.cardHeading, color: theme.text, marginTop: 3 }} numberOfLines={1}>{card.story.displayName}</Text><Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }} numberOfLines={2}>{card.story.translation.teaser}</Text></View>
            <Feather name="chevron-right" size={18} color={accent} />
          </View>
        </PressableSurface>;
      })}
    </View>
    <Modal visible={Boolean(active)} transparent animationType="slide" onRequestClose={() => setActive(null)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.64)' }}>
        {active ? <View style={{ maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: surface, borderWidth: 1, borderColor: theme.premiumBorder, overflow: 'hidden' }}>
          <View style={{ alignItems: 'center', paddingTop: 10 }}><View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: theme.border }} /></View>
          <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, justifyContent: 'space-between' }}><View style={{ flex: 1 }}><Text style={{ ...TYPE.section, color: accent, fontSize: 10 }}>SOURCE-REVIEWED STORY</Text><Text style={{ ...TYPE.title, color: theme.text, marginTop: 3 }}>{active.story.displayName}</Text></View><PressableSurface haptic="none" accessibilityLabel="Close" onPress={() => setActive(null)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><Feather name="x" size={20} color={theme.dim} /></PressableSurface></View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 22 }}>
            {active.story.artwork.find((item) => item.kind === 'reader_hero') ? <Image source={{ uri: active.story.artwork.find((item) => item.kind === 'reader_hero')!.uri }} contentFit="cover" style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: RADII.lg }} /> : null}
            <StorySection label="Origin" text={active.story.translation.origin} theme={theme} accent={accent} />
            <StorySection label="Spiritual significance" text={active.story.translation.significance} theme={theme} accent={accent} />
            {active.story.translation.rituals.length ? <View><Text style={{ ...TYPE.section, color: accent, fontSize: 10 }}>HOW TO OBSERVE</Text>{active.story.translation.rituals.map((ritual) => <Text key={ritual} style={{ ...TYPE.body, color: theme.text, marginTop: 9 }}>• {ritual}</Text>)}</View> : null}
            <StorySection label="A practice for today" text={active.story.translation.personalPractice} theme={theme} accent={accent} />
            <View><Text style={{ ...TYPE.section, color: accent, fontSize: 10 }}>SOURCES</Text>{active.story.sources.map((source) => <PressableSurface key={source.id} haptic="none" accessibilityLabel={`Open ${source.title}`} onPress={() => void Linking.openURL(source.url)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ ...TYPE.caption, color: theme.brand, textDecorationLine: 'underline' }}>{source.title} · Tier {source.tier}</Text></PressableSurface>)}</View>
            <PressableSurface haptic="selection" accessibilityLabel={active.story.shareTemplate.cta} onPress={() => void Share.share({ title: active.story.shareTemplate.title, message: active.story.shareTemplate.message })} style={{ minHeight: 52, borderRadius: 26, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}><Feather name="share-2" size={18} color={COLORS.textOnBrandLight} /><Text style={{ ...TYPE.label, color: COLORS.textOnBrandLight }}>{active.story.shareTemplate.cta}</Text></PressableSurface>
          </ScrollView>
        </View> : null}
      </View>
    </Modal>
  </>;
}

function StorySection({ label, text, theme, accent }: { label: string; text: string; theme: Theme; accent: string }) {
  return <View><Text style={{ ...TYPE.section, color: accent, fontSize: 10 }}>{label.toUpperCase()}</Text><Text style={{ ...TYPE.body, color: theme.text, marginTop: 8, lineHeight: 24 }}>{text}</Text></View>;
}
