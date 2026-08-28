import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS, FONTS, RADII, themeColor } from '@/lib/constants';
import { fetchCommentReactors, type CommentReactor, type ReactionType, REACTION_META, REACTION_ORDER } from '@/lib/mandali';

type ReactionFilter = 'all' | ReactionType;

const REACTION_TABS: ReactionType[] = REACTION_ORDER;

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type CommentReactorsSheetProps = {
  visible: boolean;
  commentId: string | null;
  currentUserId?: string;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
};

// Instagram/Facebook-style "Who reacted" sheet for Mandali comments.
// Displays all reactors grouped/filtered by reaction type (Pranam, Love, Insightful),
// with safe author projections and safety-state filtering (blocked/muted users excluded).
export function CommentReactorsSheet({
  visible,
  commentId,
  currentUserId,
  onClose,
  onViewProfile,
}: CommentReactorsSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [reactors, setReactors] = useState<CommentReactor[]>([]);
  const [activeTab, setActiveTab] = useState<ReactionFilter>('all');

  useEffect(() => {
    if (!visible || !commentId) {
      setReactors([]);
      setActiveTab('all');
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchCommentReactors(commentId, currentUserId)
      .then((data) => {
        if (!cancelled) {
          setReactors(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[CommentReactorsSheet] failed to load reactors', err);
        if (!cancelled) {
          setReactors([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, commentId, currentUserId]);

  const counts = useMemo(() => {
    const map: Record<ReactionType, number> = { pranam: 0, love: 0, insightful: 0 };
    for (const r of reactors) {
      if (map[r.reactionType] != null) {
        map[r.reactionType]++;
      }
    }
    return map;
  }, [reactors]);

  const filteredReactors = useMemo(() => {
    if (activeTab === 'all') return reactors;
    return reactors.filter((r) => r.reactionType === activeTab);
  }, [reactors, activeTab]);

  const availableTabs = useMemo(() => {
    const tabs: Array<{ key: ReactionFilter; label: string; count: number }> = [
      { key: 'all', label: `All ${reactors.length}`, count: reactors.length },
    ];
    for (const type of REACTION_TABS) {
      if (counts[type] > 0) {
        const meta = REACTION_META[type];
        tabs.push({ key: type, label: `${meta.emoji} ${counts[type]}`, count: counts[type] });
      }
    }
    return tabs;
  }, [reactors.length, counts]);

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
            padding: 20,
            paddingBottom: 34,
            gap: 14,
            maxHeight: '75%',
          }}
        >
          {/* Top Grab Handle */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 48, height: 4, borderRadius: 999, backgroundColor: theme.borderSoft }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 19, color: theme.text }}>Reactions</Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: RADII.pill,
                  backgroundColor: theme.cardSoft,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                }}
              >
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand }}>
                  {reactors.length}
                </Text>
              </View>
            </View>

            <PressableSurface
              haptic="selection"
              onPress={onClose}
              accessibilityLabel="Close"
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.cardSoft,
              }}
            >
              <Feather name="x" size={15} color={theme.dim} />
            </PressableSurface>
          </View>

          {/* Filter Tabs */}
          {reactors.length > 0 && availableTabs.length > 2 ? (
            <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 2 }}>
              {availableTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <PressableSurface
                    key={tab.key}
                    haptic="selection"
                    onPress={() => setActiveTab(tab.key)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: RADII.pill,
                      backgroundColor: isActive ? theme.brandSoft : theme.cardSoft,
                      borderWidth: 1,
                      borderColor: isActive ? theme.brand : theme.borderSoft,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: isActive ? FONTS.sansSemiBold : FONTS.sans,
                        fontSize: 12,
                        color: isActive ? theme.brand : theme.dim,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>
          ) : null}

          {/* Content List */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={theme.brand} />
            </View>
          ) : filteredReactors.length === 0 ? (
            <EmptyState
              icon="smile"
              title="No reactions yet"
              subtitle="When seekers react with Pranam, Love, or Insight, they appear here."
            />
          ) : (
            <ScrollView
              style={{ maxHeight: 340 }}
              contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredReactors.map((reactor) => {
                const meta = REACTION_META[reactor.reactionType];
                const name = reactor.profile?.fullName ?? reactor.profile?.username ?? 'A fellow seeker';
                const isOwn = reactor.userId === currentUserId;

                return (
                  <PressableSurface
                    key={`${reactor.userId}-${reactor.reactionType}`}
                    haptic="selection"
                    accessibilityLabel={`View ${name}'s profile`}
                    onPress={() => {
                      onClose();
                      onViewProfile(reactor.userId);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 7,
                      paddingHorizontal: 10,
                      borderRadius: RADII.sm,
                      backgroundColor: theme.cardSoft,
                      borderWidth: 1,
                      borderColor: theme.borderSoft,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      {/* Avatar with reaction badge */}
                      <View style={{ position: 'relative' }}>
                        {reactor.profile?.avatarUrl ? (
                          <Image
                            source={{ uri: reactor.profile.avatarUrl }}
                            style={{ width: 36, height: 36, borderRadius: 18 }}
                            contentFit="cover"
                          />
                        ) : (
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: theme.border,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                              {getInitials(name)}
                            </Text>
                          </View>
                        )}
                        <View
                          style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -3,
                            width: 17,
                            height: 17,
                            borderRadius: 9,
                            backgroundColor: theme.card,
                            borderWidth: 1,
                            borderColor: theme.borderSoft,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 9.5 }}>{meta.emoji}</Text>
                        </View>
                      </View>

                      {/* Name & Handle */}
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text
                          style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}
                          numberOfLines={1}
                        >
                          {name}
                          {isOwn ? <Text style={{ color: theme.brand }}> · you</Text> : null}
                        </Text>
                        {reactor.profile?.username ? (
                          <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim }} numberOfLines={1}>
                            @{reactor.profile.username}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Reaction badge label */}
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: RADII.pill,
                        backgroundColor: `${meta.color}15`,
                        borderWidth: 1,
                        borderColor: `${meta.color}40`,
                      }}
                    >
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: meta.color }}>
                        {meta.emoji} {meta.label}
                      </Text>
                    </View>
                  </PressableSurface>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
