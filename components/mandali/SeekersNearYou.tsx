import { Text, View } from 'react-native';

import { COLORS, FONTS } from '@/lib/constants';
import type { NearbySeeker } from '@/lib/mandali';

// Port of PWA's SeekersNearYou.tsx — a lightweight nearby-seekers strip,
// separate from the Mandali feed itself (haversine within 80km, or a city
// ILIKE fallback — same two-strategy approach, computed in lib/mandali.ts's
// fetchNearbySeekers to match src/app/(main)/mandali/SeekersNearYou.tsx).
export function SeekersNearYou({
  seekers,
  loading,
  text,
  dim,
  brand,
  cardBg,
  border,
}: {
  seekers: NearbySeeker[];
  loading: boolean;
  text: string;
  dim: string;
  brand: string;
  cardBg: string;
  border: string;
}) {
  return (
    <View style={{ backgroundColor: cardBg, borderColor: border, borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 }}>
      <Text style={{ fontFamily: FONTS.serifBold, fontSize: 16, color: text }}>Seekers Near You</Text>

      {loading ? (
        <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>Looking for nearby seekers…</Text>
      ) : seekers.length === 0 ? (
        <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
          No seekers found nearby yet — as more join from your area they&apos;ll appear here.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {seekers.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '46%' }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.ink }}>
                  {(p.full_name ?? p.username ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontFamily: FONTS.sansMedium, fontSize: 12.5, color: text }}>
                  {p.full_name ?? p.username}
                </Text>
                {p.distanceKm != null ? (
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 10.5, color: dim }}>
                    {p.distanceKm < 1 ? '< 1 km away' : `${Math.round(p.distanceKm)} km`}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
