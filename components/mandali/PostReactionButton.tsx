import { useRef, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { useReducedMotion } from '@/components/ui/Motion';
import { COLORS, FONTS } from '@/lib/constants';
import { type ReactionType, REACTION_META, REACTION_ORDER } from '@/lib/mandali';

export { REACTION_META, REACTION_ORDER };

type PostReactionButtonProps = {
  reaction: ReactionType | null;
  count: number;
  onSelect: (reaction: ReactionType) => void;
  onRemove: () => void;
  dim: string;
  cardBg: string;
  border: string;
  scrimColor: string;
  /** True when this reaction failed to sync and is waiting in the outbox for a retry. Tapping retries instead of opening the picker. */
  failed?: boolean;
  onRetry?: () => void;
};

// Same Facebook reaction-picker mechanism as FilterPicker (tap reveals a
// small anchored popup of colored options) applied to post reactions
// instead of the single upvote heart. Tapping the already-active reaction
// removes it; tapping a different one switches. No literal "dislike" --
// deliberately a devotional set (pranam/love/insightful), not a general
// social reaction bar.
export function PostReactionButton({ reaction, count, onSelect, onRemove, dim, cardBg, border, scrimColor, failed, onRetry }: PostReactionButtonProps) {
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; height: number } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const active = reaction ? REACTION_META[reaction] : null;

  const openPicker = () => {
    triggerRef.current?.measureInWindow((x, y, _width, height) => {
      setAnchor({ x, y, height });
      setOpen(true);
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 200, useNativeDriver: true }).start();
    });
  };

  const closePicker = () => {
    Animated.timing(progress, { toValue: 0, duration: reduceMotion ? 0 : 150, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setOpen(false);
    });
  };

  const pick = (type: ReactionType) => {
    if (type === reaction) onRemove();
    else onSelect(type);
    closePicker();
  };

  return (
    <>
      {/* Unlike FilterPicker (a column-context trigger, where the default
          alignSelf:'flex-start'-on-PressableSurface fix is enough), this
          trigger sits in a row alongside the Comment button. A row's
          non-flex children size to content, so PressableSurface's internal
          flex:1 content wrapper collapses to zero without an explicit
          minWidth here to give it a resolvable box to fill. */}
      <View ref={triggerRef} collapsable={false} style={{ minWidth: 34 }}>
        <PressableSurface
          haptic="selection"
          accessibilityLabel={failed ? 'Reaction could not sync -- tap to retry' : active ? `Remove ${active.label} reaction` : 'React to this post'}
          onPress={failed ? onRetry : openPicker}
          style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 5 }}
        >
          {active ? (
            <Text style={{ fontSize: 14, opacity: failed ? 0.5 : 1 }}>{active.emoji}</Text>
          ) : (
            <Feather name="smile" size={13} color={dim} />
          )}
          {failed || count > 0 ? (
            <Text style={{ color: failed ? COLORS.danger : active ? active.color : dim, fontFamily: FONTS.sansSemiBold, fontSize: 11.5 }}>
              {failed ? 'Retry' : count}
            </Text>
          ) : null}
        </PressableSurface>
      </View>

      <Modal transparent visible={open} animationType="none" onRequestClose={closePicker}>
        <Pressable style={{ flex: 1, backgroundColor: scrimColor }} onPress={closePicker}>
          {anchor ? (
            <Animated.View
              style={{
                position: 'absolute',
                top: anchor.y + anchor.height + 8,
                left: anchor.x,
                flexDirection: 'row',
                gap: 8,
                backgroundColor: cardBg,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: border,
                padding: 10,
                opacity: progress,
                transform: [
                  { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
                ],
              }}
            >
              {REACTION_ORDER.map((type) => {
                const meta = REACTION_META[type];
                const isActive = type === reaction;
                return (
                  <Pressable
                    key={type}
                    onPress={() => pick(type)}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${meta.color}18`,
                      borderWidth: isActive ? 1.5 : 0,
                      borderColor: meta.color,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
