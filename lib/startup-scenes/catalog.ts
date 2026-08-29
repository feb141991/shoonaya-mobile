import type { StartupScene } from './types';

// Register .webp extension handler in Node.js test environments
if (typeof require !== 'undefined' && require.extensions && !require.extensions['.webp']) {
  require.extensions['.webp'] = (module, filename) => {
    module.exports = { uri: filename };
  };
}

/**
 * STARTUP_SCENE_CATALOG

 *
 * Curated local manifest of native startup scenes.
 *
 * Technical & Design Invariants:
 * 1. Offline Guarantee: Every referenced image is bundled in local assets.
 * 2. Predictable Decoding: WebP format with unified 1080x1920 geometry.
 * 3. Zero Fabrication: Sacred symbols and descriptions are grounded in their authentic tradition.
 * 4. Graceful Fallback: 'neutral_portal_infinite' is guaranteed present as fallback.
 */
export const STARTUP_SCENE_CATALOG: StartupScene[] = [
  // ── NEUTRAL / DEFAULT ────────────────────────────────────────────────
  {
    assetId: 'neutral_portal_infinite',
    source: require('@/assets/startup-scenes/neutral-portal.webp'),
    traditions: ['neutral'],
    sacredTimes: ['early_morning', 'daytime', 'evening', 'night'],
    textTreatment: 'light',
    cropMode: 'cover',
    focalPoint: { x: 0.5, y: 0.48 },
    sourceRightsId: 'shoonaya-core-v1-portal',
    accessibilityLabel: {
      en: 'Sacred golden portal radiating infinite warm light',
      hi: 'अनंत दिव्य प्रकाश बिखेरता स्वर्ण शून्य द्वार',
      pa: 'ਅਨੰਤ ਬ੍ਰਹਮੰਡੀ ਜੋਤ ਬਿਖੇਰਦਾ ਸੁਨਹਿਰੀ ਦੁਆਰ',
    },
    reviewStatus: 'approved',
    version: '1.0.0',
  },

  // ── HINDU TRADITION ──────────────────────────────────────────────────
  {
    assetId: 'hindu_vedic_sunrise',
    source: require('@/assets/startup-scenes/hindu-sunrise.webp'),
    traditions: ['hindu'],
    sacredTimes: ['early_morning', 'daytime'],
    textTreatment: 'light',
    cropMode: 'cover',
    focalPoint: { x: 0.5, y: 0.42 },
    sourceRightsId: 'shoonaya-hindu-v1-krishna-sunrise',
    accessibilityLabel: {
      en: 'Shri Krishna playing flute by the sacred Yamuna at sunrise with temple ghats and lotus mandala',
      hi: 'यमुना तट पर प्रातःकालीन सूर्योदय में वेणु वादन करते श्री कृष्ण एवं पावन मंदिर',
      pa: 'ਸਵੇਰ ਦੇ ਸੂਰਜ ਦੀ ਰੋਸ਼ਨੀ ਵਿੱਚ ਯਮੁਨਾ ਕੰਢੇ ਬੰਸਰੀ ਵਜਾਉਂਦੇ ਸ਼੍ਰੀ ਕ੍ਰਿਸ਼ਨ ਜੀ',
    },
    reviewStatus: 'approved',
    version: '1.0.0',
  },
  {
    assetId: 'hindu_temple_dharma',
    source: require('@/assets/startup-scenes/hindu-temple.webp'),
    traditions: ['hindu'],
    sacredTimes: ['evening', 'night'],
    textTreatment: 'light',
    cropMode: 'cover',
    focalPoint: { x: 0.5, y: 0.52 },
    sourceRightsId: 'shoonaya-hindu-v1-shiva-kailash',
    accessibilityLabel: {
      en: 'Shri Shiva in meditation on Mount Kailash with crescent moon and sacred Mansarovar lake',
      hi: 'कैलाश पर्वत पर चंद्रकला सुशोभित ध्यानमग्न भगवान शिव एवं मानसरोवर',
      pa: 'ਕੈਲਾਸ਼ ਪਰਬਤ ਤੇ ਧਿਆਨ ਵਿੱਚ ਲੀਨ ਭਗਵਾਨ ਸ਼ਿਵ ਅਤੇ ਮਾਨਸਰੋਵਰ ਝੀਲ',
    },
    reviewStatus: 'approved',
    version: '1.0.0',
  },

  // ── SIKH TRADITION ───────────────────────────────────────────────────
  {
    assetId: 'sikh_sarovar_simran',
    source: require('@/assets/startup-scenes/sikh-sarovar.webp'),
    traditions: ['sikh'],
    sacredTimes: ['early_morning', 'night'],
    textTreatment: 'light',
    cropMode: 'cover',
    focalPoint: { x: 0.5, y: 0.48 },
    sourceRightsId: 'shoonaya-sikh-v1-harmandir-sarovar',
    accessibilityLabel: {
      en: 'Sri Harmandir Sahib reflecting across the sacred Sarovar at golden hour',
      hi: 'पावन अमृत सरोवर में सचखंड श्री हरिमंदिर साहिब का स्वर्ण प्रतिबिम्ब',
      pa: 'ਪਵਿੱਤਰ ਸਰੋਵਰ ਵਿੱਚ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੀ ਸੁਨਹਿਰੀ ਝਲਕ',
    },
    reviewStatus: 'approved',
    version: '1.0.0',
  },
  {
    assetId: 'sikh_nishan_khanda',
    source: require('@/assets/startup-scenes/sikh-khanda.webp'),
    traditions: ['sikh'],
    sacredTimes: ['daytime', 'evening'],
    textTreatment: 'light',
    cropMode: 'cover',
    focalPoint: { x: 0.5, y: 0.45 },
    sourceRightsId: 'shoonaya-sikh-v1-ikonkar-mandala',
    accessibilityLabel: {
      en: 'Sacred golden Ik Onkar emblem within celestial cosmic mandala',
      hi: 'दिव्य ब्रह्मांडीय मंडल में प्रकाशित पावन ੴ (इक ओंकार)',
      pa: 'ਬ੍ਰਹਮੰਡੀ ਮੰਡਲ ਵਿੱਚ ਪ੍ਰਕਾਸ਼ਮਾਨ ਪਵਿੱਤਰ ੴ (ਇੱਕ ਓਅੰਕਾਰ)',
    },
    reviewStatus: 'approved',
    version: '1.0.0',
  },

  // ── JAIN TRADITION ───────────────────────────────────────────────────
  {
    assetId: 'jain_derasar_ahimsa',
    source: require('@/assets/startup-scenes/jain-derasar.webp'),
    traditions: ['jain'],
    sacredTimes: ['early_morning', 'daytime'],
    textTreatment: 'light',
    cropMode: 'cover',
    focalPoint: { x: 0.5, y: 0.46 },
    sourceRightsId: 'shoonaya-jain-v1-mahavira-derasar',
    accessibilityLabel: {
      en: 'Bhagwan Mahavira in Padmasana dhyana within white marble Jinendralaya alcove with Ahimsa hand',
      hi: 'श्वेत संगमरमर जिनालय में पद्मासन ध्यानस्थ भगवान महावीर एवं पावन अहिंसा हस्त',
      pa: 'ਸੰਗਮਰਮਰ ਦੇ ਜਿਨਾਲਯ ਵਿੱਚ ਧਿਆਨ ਵਿੱਚ ਵਿਰਾਜਮਾਨ ਭਗਵਾਨ ਮਹਾਵੀਰ',
    },
    reviewStatus: 'approved',
    version: '1.0.0',
  },
  {
    assetId: 'jain_siddhashila_lotus',
    source: require('@/assets/startup-scenes/jain-lotus.webp'),
    traditions: ['jain'],
    sacredTimes: ['evening', 'night'],
    textTreatment: 'light',
    cropMode: 'cover',
    focalPoint: { x: 0.5, y: 0.47 },
    sourceRightsId: 'shoonaya-jain-v1-ahimsa-lotus',
    accessibilityLabel: {
      en: 'Sacred Ahimsa hand with Dharmachakra rising from radiant golden lotus',
      hi: 'स्वर्ण कमल से उद्भूत पावन अहिंसा हस्त एवं धर्मचक्र',
      pa: 'ਸੁਨਹਿਰੀ ਕਮਲ ਵਿੱਚੋਂ ਪ੍ਰਗਟ ਪਵਿੱਤਰ ਅਹਿੰਸਾ ਹੱਥ ਅਤੇ ਧਰਮਚੱਕਰ',
    },
    reviewStatus: 'approved',
    version: '1.0.0',
  },

  // ── BUDDHIST TRADITION ───────────────────────────────────────────────
  {
    assetId: 'buddhist_bodhi_tranquil',
    source: require('@/assets/startup-scenes/buddhist-bodhi.webp'),
    traditions: ['buddhist'],
    sacredTimes: ['early_morning', 'evening'],
    textTreatment: 'light',
    cropMode: 'cover',
    focalPoint: { x: 0.5, y: 0.45 },
    sourceRightsId: 'shoonaya-buddhist-v1-bodhi-asana',
    accessibilityLabel: {
      en: 'Sacred Bodhi tree canopy and stone meditation asana at tranquil dawn',
      hi: 'प्रभात वेला में पावन बोधिवृक्ष एवं ध्यान शिला आसन',
      pa: 'ਸਵੇਰ ਦੇ ਸ਼ਾਂਤ ਵੇਲੇ ਪਵਿੱਤਰ ਬੋਧੀ ਰੁੱਖ ਅਤੇ ਧਿਆਨ ਆਸਣ',
    },
    reviewStatus: 'approved',
    version: '1.0.0',
  },
  {
    assetId: 'buddhist_dharma_wheel',
    source: require('@/assets/startup-scenes/buddhist-dharma.webp'),
    traditions: ['buddhist'],
    sacredTimes: ['daytime', 'night'],
    textTreatment: 'light',
    cropMode: 'cover',
    focalPoint: { x: 0.5, y: 0.46 },
    sourceRightsId: 'shoonaya-buddhist-v1-dharmawheel-moon',
    accessibilityLabel: {
      en: 'Noble 8-spoked Dharmachakra glowing under full moon over holy waters',
      hi: 'पूर्ण चंद्रमा एवं पावन जल के ऊपर प्रकाशित अष्टांगिक धर्मचक्र',
      pa: 'ਪੂਰਨਮਾਸ਼ੀ ਦੇ ਚੰਦ ਹੇਠ ਪਵਿੱਤਰ ਜਲ ਉੱਤੇ ਚਮਕਦਾ ਧਰਮਚੱਕਰ',
    },
    reviewStatus: 'approved',
    version: '1.0.0',
  },
];

export const NEUTRAL_STARTUP_SCENE = STARTUP_SCENE_CATALOG[0];
