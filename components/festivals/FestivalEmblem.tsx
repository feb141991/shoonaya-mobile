import { StyleSheet, View, Text } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { COLORS } from '@/lib/constants';

const RELIC_ASSETS: Record<string, ImageSource> = {
  'maha-shivratri': require('@/assets/relics/trishula-gold.png'),
  'mahashivratri': require('@/assets/relics/trishula-gold.png'),
  'pradosh-vrat': require('@/assets/relics/shiva-damaru.png'),
  'masik-shivratri': require('@/assets/relics/shiva-damaru.png'),
  'ganesh-chaturthi': require('@/assets/relics/ganesha-modak.png'),
  'vinayaka-chaturthi': require('@/assets/relics/ganesha-modak.png'),
  'sankashti-chaturthi': require('@/assets/relics/ganesha-modak.png'),
  'krishna-janmashtami': require('@/assets/relics/krishna-flute.png'),
  'janmashtami': require('@/assets/relics/krishna-flute.png'),
  'radhashtami': require('@/assets/relics/peacock-feather.png'),
  'gita-jayanti': require('@/assets/relics/prarthana-pothi.png'),
  'govardhan-puja': require('@/assets/relics/brahma-lotus.png'),
  'ram-navami': require('@/assets/relics/rama-bow.png'),
  'dussehra': require('@/assets/relics/rama-bow.png'),
  'vijayadashami': require('@/assets/relics/rama-bow.png'),
  'vivah-panchami': require('@/assets/relics/clay-kalash.png'),
  'hanuman-jayanti': require('@/assets/relics/hanuman-gada.png'),
  'diwali': require('@/assets/relics/diya-bronze.png'),
  'deepawali': require('@/assets/relics/diya-bronze.png'),
  'chhoti-diwali': require('@/assets/relics/diya-bronze.png'),
  'naraka-chaturdashi': require('@/assets/relics/diya-bronze.png'),
  'dhanteras': require('@/assets/relics/ganga-kalash.png'),
  'dev-deepawali': require('@/assets/relics/diya-bronze.png'),
  'bhai-dooj': require('@/assets/relics/diya-bronze.png'),
  'sharad-navratri': require('@/assets/relics/clay-kalash.png'),
  'navratri-begins': require('@/assets/relics/clay-kalash.png'),
  'navratri-day-1-shailaputri': require('@/assets/relics/nandi-devotion.png'),
  'navratri-day-2-brahmacharini': require('@/assets/relics/rishi-kamandalu.png'),
  'navratri-day-3-chandraghanta': require('@/assets/relics/mindful-bell.png'),
  'navratri-day-4-kushmanda': require('@/assets/relics/camphor-flame.png'),
  'navratri-day-5-skandamata': require('@/assets/relics/lotus-bloom.png'),
  'navratri-day-6-katyayani': require('@/assets/relics/durga-shield.png'),
  'navratri-day-7-kalaratri': require('@/assets/relics/trishula-gold.png'),
  'chaitra-navratri-begins': require('@/assets/relics/clay-kalash.png'),
  'gupt-navratri-ashadha-begins': require('@/assets/relics/durga-shield.png'),
  'gupt-navratri-magha-begins': require('@/assets/relics/durga-shield.png'),
  'durga-puja': require('@/assets/relics/durga-shield.png'),
  'durga-ashtami': require('@/assets/relics/durga-shield.png'),
  'maha-navami': require('@/assets/relics/camphor-flame.png'),
  'chintpurni-mata-chaitra-navratri': require('@/assets/relics/clay-kalash.png'),
  'chintpurni-mata-sharad-navratri': require('@/assets/relics/clay-kalash.png'),
  'makar-sankranti': require('@/assets/relics/ganga-kalash.png'),
  'pongal': require('@/assets/relics/clay-kalash.png'),
  'chhath-nahay-khay': require('@/assets/relics/ganga-kalash.png'),
  'chhath-kharna': require('@/assets/relics/camphor-flame.png'),
  'chhath-usha-arghya': require('@/assets/relics/copper-lota.png'),
  'raksha-bandhan': require('@/assets/relics/diya-bronze.png'),
  'holi': require('@/assets/relics/camphor-flame.png'),
  'vasant-panchami': require('@/assets/relics/lotus-bloom.png'),
  'nag-panchami': require('@/assets/relics/ananta-shesha.png'),
  'anant-chaturdashi': require('@/assets/relics/ananta-shesha.png'),
  'guru-purnima': require('@/assets/relics/mala.png'),
  'tulsi-vivah': require('@/assets/relics/tulsi-leaf.png'),
  'karva-chauth': require('@/assets/relics/diya-bronze.png'),
  'akshaya-tritiya': require('@/assets/relics/ganga-kalash.png'),
  'nirjala-ekadashi': require('@/assets/relics/tulsi-leaf.png'),
  'vaikunta-ekadashi': require('@/assets/relics/shankha-conch.png'),
  'devshayani-ekadashi': require('@/assets/relics/ananta-shesha.png'),
  'devutthana-ekadashi': require('@/assets/relics/mindful-bell.png'),
  'guru-nanak-gurpurab': require('@/assets/relics/khanda-gold.png'),
  'guru-gobind-singh-gurpurab': require('@/assets/relics/nishan-sahib.png'),
  'baisakhi': require('@/assets/relics/sacred-kirpan.png'),
  'bandhi-chhor-divas': require('@/assets/relics/diya-bronze.png'),
  'holla-mohalla': require('@/assets/relics/deg-teg.png'),
  'lohri': require('@/assets/relics/camphor-flame.png'),
  'guru-arjan-dev-martyrdom': require('@/assets/relics/gurbani-pothi.png'),
  'guru-tegh-bahadur-martyrdom': require('@/assets/relics/khanda-gold.png'),
  'sahibzade-shaheedi-diwas': require('@/assets/relics/khanda-gold.png'),
  'vesak-buddha-purnima': require('@/assets/relics/bodhi-leaf.png'),
  'asalha-puja': require('@/assets/relics/dharma-wheel.png'),
  'magha-puja': require('@/assets/relics/lotus-bloom.png'),
  'bodhi-day': require('@/assets/relics/bodhi-leaf.png'),
  'parinirvana-day': require('@/assets/relics/dharma-wheel.png'),
  'kathina': require('@/assets/relics/alms-bowl.png'),
  'mahavir-jayanti': require('@/assets/relics/ahimsa-hand.png'),
  'paryushana-parva-begins': require('@/assets/relics/siddhachakra-wheel.png'),
  'samvatsari-paryushana-ends': require('@/assets/relics/ahimsa-hand.png'),
  'das-lakshana-dharma-begins': require('@/assets/relics/jain-kalasha.png'),
  'jain-diwali-nirvana-ladnun': require('@/assets/relics/diya-bronze.png'),
  'jain-new-year-pratipada': require('@/assets/relics/siddhashila-moon.png'),
  'kartik-purnima-jain': require('@/assets/relics/siddhashila-moon.png'),
};

function resolveRelicSource(slug?: string, tradition?: string): ImageSource {
  const norm = (slug || '').toLowerCase().trim();
  if (RELIC_ASSETS[norm]) return RELIC_ASSETS[norm];

  if (norm.includes('ekadashi')) return require('@/assets/relics/tulsi-leaf.png');
  if (norm.includes('navratri')) return require('@/assets/relics/clay-kalash.png');
  if (norm.includes('paryushana')) return require('@/assets/relics/siddhachakra-wheel.png');
  if (norm.includes('gurpurab') || norm.includes('guru-')) return require('@/assets/relics/khanda-gold.png');
  if (norm.includes('shiva') || norm.includes('pradosh')) return require('@/assets/relics/trishula-gold.png');

  const trad = (tradition || '').toLowerCase();
  if (trad === 'sikh') return require('@/assets/relics/khanda-gold.png');
  if (trad === 'buddhist') return require('@/assets/relics/dharma-wheel.png');
  if (trad === 'jain') return require('@/assets/relics/ahimsa-hand.png');
  return require('@/assets/relics/diya-bronze.png');
}

export function FestivalEmblem({
  slug,
  name,
  tradition,
  size = 56,
  isDark = true,
}: {
  slug?: string;
  name?: string;
  tradition?: string;
  size?: number;
  isDark?: boolean;
}) {
  const relic = resolveRelicSource(slug, tradition);
  const iconSize = Math.round(size * 0.68);
  const borderColor = isDark ? 'rgba(212, 175, 55, 0.45)' : 'rgba(212, 175, 55, 0.55)';
  const bg = isDark ? 'rgba(216, 138, 28, 0.12)' : 'rgba(216, 138, 28, 0.08)';

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2),
          borderColor,
          backgroundColor: bg,
        },
      ]}
      accessibilityLabel={name || 'Sacred Festival Emblem'}
    >
      <Image
        source={relic}
        style={{ width: iconSize, height: iconSize }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
});
