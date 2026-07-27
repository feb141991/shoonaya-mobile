import { useRef, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { useReducedMotion } from '@/components/ui/Motion';
import { FONTS } from '@/lib/constants';

export type FilterOption<T extends string> = {
  value: T;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
};

type FilterPickerProps<T extends string> = {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  cardBg: string;
  border: string;
  scrimColor: string;
};

// Facebook reaction-picker style: one tap on the current filter reveals a
// small popup of every option (each in its own color) anchored right below
// wherever you tapped, instead of an always-visible horizontal pill row.
// Renders inside a transparent Modal rather than an absolutely-positioned
// inline View so it isn't clipped by the FlatList header it lives in, and
// so the backdrop can cover the whole screen for tap-outside-to-dismiss --
// the anchor position is measured fresh each time it opens (screenX/screenY
// via measureInWindow), not assumed fixed.
export function FilterPicker<T extends string>({ options, value, onChange, cardBg, border, scrimColor }: FilterPickerProps<T>) {
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; height: number } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const active = options.find((o) => o.value === value) ?? options[0];

  const openPicker = () => {
    triggerRef.current?.measureInWindow((x, y, _width, height) => {
      setAnchor({ x, y, height });
      setOpen(true);
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 200, useNativeDriver: true }).start();
    });
  };

  const closePicker = (nextValue?: T) => {
    Animated.timing(progress, { toValue: 0, duration: reduceMotion ? 0 : 150, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setOpen(false);
    });
    if (nextValue) onChange(nextValue);
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <PressableSurface
          haptic="selection"
          accessibilityLabel={`Filter: ${active.label}`}
          onPress={openPicker}
          style={{
            alignSelf: 'flex-start',
            minHeight: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 9,
            backgroundColor: `${active.color}18`,
            borderWidth: 1.5,
            borderColor: active.color,
          }}
        >
          <Feather name={active.icon} size={13} color={active.color} />
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: active.color }}>{active.label}</Text>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={active.color} />
        </PressableSurface>
      </View>

      <Modal transparent visible={open} animationType="none" onRequestClose={() => closePicker()}>
        <Pressable style={{ flex: 1, backgroundColor: scrimColor }} onPress={() => closePicker()}>
          {anchor ? (
            <Animated.View
              style={{
                position: 'absolute',
                top: anchor.y + anchor.height + 8,
                left: anchor.x,
                maxWidth: '78%',
                flexDirection: 'row',
                flexWrap: 'wrap',
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
              {options.map((opt) => {
                const isActive = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => closePicker(opt.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: 999,
                      backgroundColor: `${opt.color}18`,
                      borderWidth: isActive ? 1.5 : 0,
                      borderColor: opt.color,
                    }}
                  >
                    <Feather name={opt.icon} size={13} color={opt.color} />
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: opt.color }}>{opt.label}</Text>
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
