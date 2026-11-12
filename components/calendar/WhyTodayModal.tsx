import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { FEATURE_COLORS, OVERLAYS, COLORS, FONTS } from '@/lib/constants';

// Mobile port of web's WhyTodayExplanationModal
// (Sanatan Sangam/Shoonaya/src/components/calendar/WhyTodayExplanationModal.tsx).
// Renders the SAME fields the web modal does (reasons, diagnostics,
// sourceRefs, alternatives, monthLabel) straight off the
// /api/calendar/upcoming response already fetched by app/panchang.tsx --
// no new endpoint, no client-side recomputation. Styled to match this
// screen's dark sky-phase glass aesthetic (CREAM/GOLD) rather than web's
// ivory card, since it's presented from panchang.tsx only.

const CREAM = COLORS.creamBg;
const GOLD = COLORS.brandGoldDark;

export type WhyTodayObservance = {
  date: string;
  slug: string;
  display_name: string;
  emoji: string;
  description?: string | null;
  status?: 'resolved' | 'ambiguous' | 'unresolved' | 'under_review';
  monthLabel?: { formattedLabel: string; isDivergentFromRuleDefault?: boolean } | null;
  reasons?: Array<{ label: string; description: string }>;
  diagnostics?: string[];
  sourceRefs?: Array<{ title: string; tier?: string; citation?: string | null }>;
  alternatives?: Array<{
    profile?: { tradition?: string; calendar?: string };
    civilDate?: string | null;
    note?: string | null;
  }>;
};

type WhyTodayModalProps = {
  visible: boolean;
  observance: WhyTodayObservance | null;
  onClose: () => void;
};

function Section({ title, icon, children }: { title: string; icon: keyof typeof Feather.glyphMap; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name={icon} size={13} color={GOLD} />
        <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: OVERLAYS.white[0.1],
        backgroundColor: OVERLAYS.white[0.05],
        padding: 12,
      }}
    >
      {children}
    </View>
  );
}

export function WhyTodayModal({ visible, observance, onClose }: WhyTodayModalProps) {
  if (!observance) return null;

  const isUnderReview = observance.status === 'unresolved' || observance.status === 'under_review' || observance.status === 'ambiguous';
  const reasons = observance.reasons ?? [];
  const diagnostics = observance.diagnostics ?? [];
  const sourceRefs = observance.sourceRefs ?? [];
  const alternatives = observance.alternatives ?? [];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close why today explanation" />
        <View
          style={{
            maxHeight: '82%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: FEATURE_COLORS.whyTodayModal.sheetSurface,
            borderWidth: 1,
            borderColor: OVERLAYS.white[0.1],
            borderBottomWidth: 0,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              padding: 18,
              borderBottomWidth: 1,
              borderBottomColor: OVERLAYS.white[0.08],
            }}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: FEATURE_COLORS.whyTodayModal.headerIconSurface, borderWidth: 1, borderColor: FEATURE_COLORS.whyTodayModal.headerIconBorder,
                }}
              >
                <Text style={{ fontSize: 18 }}>{observance.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: CREAM, fontFamily: FONTS.serifBold, fontSize: 17 }} numberOfLines={2}>
                  Why {observance.display_name} Today?
                </Text>
                <Text style={{ color: OVERLAYS.white[0.45], fontFamily: FONTS.sans, fontSize: 11, marginTop: 2 }}>
                  {observance.date}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel="Close"
              accessibilityRole="button"
              style={{
                width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: OVERLAYS.white[0.08],
              }}
            >
              <Feather name="x" size={14} color={OVERLAYS.white[0.7]} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
            {observance.description ? (
              <Text
                style={{
                  color: OVERLAYS.white[0.6], fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18, fontStyle: 'italic',
                  borderLeftWidth: 2, borderLeftColor: GOLD, paddingLeft: 10,
                }}
              >
                {observance.description}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1,
                backgroundColor: isUnderReview ? FEATURE_COLORS.whyTodayModal.reviewSurface : FEATURE_COLORS.whyTodayModal.publishedSurface,
                borderColor: isUnderReview ? FEATURE_COLORS.whyTodayModal.reviewBorder : FEATURE_COLORS.whyTodayModal.publishedBorder,
              }}
            >
              <Feather name={isUnderReview ? 'alert-triangle' : 'shield'} size={16} color={isUnderReview ? COLORS.warningDark : FEATURE_COLORS.whyTodayModal.publishedIcon} />
              <Text style={{ flex: 1, color: isUnderReview ? FEATURE_COLORS.whyTodayModal.reviewText : FEATURE_COLORS.whyTodayModal.publishedText, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                {isUnderReview ? 'Date under review — see alternatives below' : 'Published calendar result'}
              </Text>
            </View>

            {observance.monthLabel ? (
              <InfoCard>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: CREAM, fontFamily: FONTS.sans, fontSize: 12 }}>
                    <Text style={{ fontFamily: FONTS.sansSemiBold }}>Month label: </Text>
                    {observance.monthLabel.formattedLabel}
                  </Text>
                  {observance.monthLabel.isDivergentFromRuleDefault ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: FEATURE_COLORS.whyTodayModal.conventionSurface }}>
                      <Text style={{ color: FEATURE_COLORS.whyTodayModal.conventionText, fontFamily: FONTS.sansSemiBold, fontSize: 9 }}>Profile Convention</Text>
                    </View>
                  ) : null}
                </View>
              </InfoCard>
            ) : null}

            {reasons.length > 0 && (
              <Section title="Calculation Factors" icon="help-circle">
                <View style={{ gap: 8 }}>
                  {reasons.map((r, i) => (
                    <InfoCard key={i}>
                      <Text style={{ color: CREAM, fontFamily: FONTS.sansSemiBold, fontSize: 12, marginBottom: 2 }}>{r.label}</Text>
                      <Text style={{ color: OVERLAYS.white[0.55], fontFamily: FONTS.sans, fontSize: 11, lineHeight: 16 }}>
                        {r.description}
                      </Text>
                    </InfoCard>
                  ))}
                </View>
              </Section>
            )}

            {diagnostics.length > 0 && (
              <Section title="Diagnostics & Disclosures" icon="alert-triangle">
                <View style={{ gap: 8 }}>
                  {diagnostics.map((d, i) => (
                    <InfoCard key={i}>
                      <Text style={{ color: FEATURE_COLORS.whyTodayModal.reviewText, fontFamily: FONTS.sans, fontSize: 11, lineHeight: 16 }}>{d}</Text>
                    </InfoCard>
                  ))}
                </View>
              </Section>
            )}

            {alternatives.length > 0 && (
              <Section title="Recognized Sampradaya Variations" icon="calendar">
                <View style={{ gap: 8 }}>
                  {alternatives.map((alt, i) => (
                    <InfoCard key={i}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: CREAM, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                          {alt.profile?.tradition ?? alt.profile?.calendar ?? 'Alternative'}
                        </Text>
                        {alt.civilDate ? (
                          <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>{alt.civilDate}</Text>
                        ) : null}
                      </View>
                      {alt.note ? (
                        <Text style={{ color: OVERLAYS.white[0.5], fontFamily: FONTS.sans, fontSize: 11, marginTop: 3 }}>
                          {alt.note}
                        </Text>
                      ) : null}
                    </InfoCard>
                  ))}
                </View>
              </Section>
            )}

            {sourceRefs.length > 0 && (
              <Section title="Pramana & Sourced Authorities" icon="book-open">
                <View style={{ gap: 8 }}>
                  {sourceRefs.map((s, i) => (
                    <InfoCard key={i}>
                      <Text style={{ color: CREAM, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{s.title}</Text>
                      {s.tier ? (
                        <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 10, marginTop: 2 }}>{s.tier}</Text>
                      ) : null}
                      {s.citation ? (
                        <Text style={{ color: OVERLAYS.white[0.5], fontFamily: FONTS.sans, fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>
                          Citation: {s.citation}
                        </Text>
                      ) : null}
                    </InfoCard>
                  ))}
                </View>
              </Section>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
