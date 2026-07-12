import { Text, View } from 'react-native';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS } from '@/lib/constants';
import type { RsvpRow, RsvpStatus } from '@/lib/mandali';

// Direct port of PWA's EventRsvpBar (src/app/(main)/mandali/MandaliEvents.tsx
// lines ~57-100) — same three statuses, same counts-with-label rendering,
// same "my status" highlight logic.
export function EventRsvpBar({
  postId,
  rsvps,
  userId,
  brand,
  border,
  surface,
  dim,
  onRsvp,
}: {
  postId: string;
  rsvps: RsvpRow[];
  userId: string;
  brand: string;
  border: string;
  surface: string;
  dim: string;
  onRsvp: (postId: string, status: RsvpStatus) => void;
}) {
  const counts = {
    going: rsvps.filter((r) => r.status === 'going').length,
    interested: rsvps.filter((r) => r.status === 'interested').length,
    not_going: rsvps.filter((r) => r.status === 'not_going').length,
  };
  const myStatus = rsvps.find((r) => r.user_id === userId)?.status ?? null;

  const options: Array<{ value: RsvpStatus; label: string; count: number }> = [
    { value: 'going', label: 'Going', count: counts.going },
    { value: 'interested', label: 'Interested', count: counts.interested },
    { value: 'not_going', label: "Can't make it", count: counts.not_going },
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {options.map((opt) => {
        const active = myStatus === opt.value;
        return (
          <PressableSurface
            key={opt.value}
            haptic="selection"
            accessibilityLabel={`RSVP ${opt.label}`}
            onPress={() => onRsvp(postId, opt.value)}
            style={{
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
              backgroundColor: active ? brand : surface,
              borderWidth: active ? 0 : 1,
              borderColor: border,
              minHeight: 0,
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: active ? COLORS.ink : dim }}>
              {opt.label}
              {opt.count > 0 ? ` · ${opt.count}` : ''}
            </Text>
          </PressableSurface>
        );
      })}
    </View>
  );
}
