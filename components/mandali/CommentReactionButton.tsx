import { useRef, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { useReducedMotion } from '@/components/ui/Motion';
import { COLORS, FONTS } from '@/lib/constants';
import { type ReactionType, REACTION_META, REACTION_ORDER } from '@/lib/mandali';

type CommentReactionButtonProps = {
  reaction: ReactionType | null;
  count: number;
  onSelect: (reaction: ReactionType) => void;
  onRemove: () => void;
  onViewReactors: () => void;
  dim: string;
  cardBg: string;
  border: string;
  scrimColor: string;
};

// Comment-level reaction button matching PostReactionButton's 3-type devotional
// variety (pranam, love, insightful) and its exact tap-to-open-picker
// interaction. Tapping the count opens the "Who reacted" sheet.
export function CommentReactionButton({
  reaction,
  count,
  onSelect,
  onRemove,
  onViewReactors,
  dim,
  cardBg,
  border,
  scrimColor,
}: CommentReactionButtonProps) {
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
    if (type === reaction) {
      onRemove();
    } else {
      onSelect(type);
    }
    closePicker();
  };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {/* Reaction Icon Trigger — same interaction as PostReactionButton:
            a plain tap opens the picker, no separate toggle/long-press
            behavior, so the control feels identical whether it's attached
            to a post or a comment. */}
        <View ref={triggerRef} collapsable={false}>
          <PressableSurface
            haptic="selection"
            accessibilityLabel={active ? `Remove ${active.label} reaction` : 'React to this comment'}
            onPress={openPicker}
            style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', padding: 2 }}
          >
            {active ? (
              <Text style={{ fontSize: 13 }}>{active.emoji}</Text>
            ) : (
              <Feather name="heart" size={11} color={dim} />
            )}
          </PressableSurface>
        </View>

        {/* Count Button (Tapping opens "Who reacted" sheet) */}
        {count > 0 ? (
          <PressableSurface
            haptic="selection"
            accessibilityLabel={`View all ${count} reactions`}
            onPress={onViewReactors}
            style={{ minHeight: 0, paddingHorizontal: 2, paddingVertical: 2 }}
          >
            <Text
              style={{
                fontFamily: FONTS.sansSemiBold,
                fontSize: 10.5,
                color: active ? active.color : dim,
              }}
            >
              {count}
            </Text>
          </PressableSurface>
        ) : null}
      </View>

      {/* Floating Reaction Picker Popup */}
      <Modal transparent visible={open} animationType="none" onRequestClose={closePicker}>
        <Pressable style={{ flex: 1, backgroundColor: scrimColor }} onPress={closePicker}>
          {anchor ? (
            <Animated.View
              style={{
                position: 'absolute',
                top: Math.max(10, anchor.y - 56), // anchor above comment
                left: Math.max(12, anchor.x - 20),
                flexDirection: 'row',
                gap: 8,
                backgroundColor: cardBg,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: border,
                padding: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 6,
                opacity: progress,
                transform: [
                  { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
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
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${meta.color}18`,
                      borderWidth: isActive ? 1.5 : 0,
                      borderColor: meta.color,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
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
