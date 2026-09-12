import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { lookupFestivalContent, FESTIVAL_CONTENT_SNAPSHOT } from '../lib/festival-content.generated';
import { resolveFestivalText, resolveFestivalList, isFestivalPublishable } from '../lib/festival-content-helpers';
import { LOCAL_HERO_ASSETS, BUNDLED_HERO_THEMES } from '../lib/heroPreference';

const ALL_HINDU_SLUGS = [
  // Batch 1 + established
  'raksha-bandhan',
  'ganesh-chaturthi',
  'krishna-janmashtami',
  'chhath-puja',
  'maha-shivaratri',
  'dhanteras',
  'naraka-chaturdashi',
  'diwali',
  'govardhan-puja',
  'bhai-dooj',
  'holi',
  'ram-navami',
  'hanuman-jayanti',
  // Batch 2
  'makar-sankranti',
  'vasant-panchami',
  'gudi-padwa',
  'ugadi',
  'akshaya-tritiya',
  'narasimha-jayanti',
  'shani-jayanti',
  'jagannath-rath-yatra',
  'nag-panchami',
  'hartalika-teej',
  'karva-chauth',
  'gita-jayanti',
];

const ALL_SIKH_SLUGS = [
  'baisakhi',
  'guru-nanak-gurpurab',
  'guru-gobind-singh-gurpurab',
  'bandhi-chhor-divas',
  'holla-mohalla',
  'lohri',
  'guru-arjan-dev-martyrdom',
  'guru-tegh-bahadur-martyrdom',
  'sahibzade-shaheedi-diwas',
  'guru-ravidas-jayanti',
];

const ALL_AUTHORED_SLUGS = [...ALL_HINDU_SLUGS, ...ALL_SIKH_SLUGS];

describe('Batch 1, 2 & 3 Festival Content & Hero Integration Suite', () => {
  it('contains all 35 authored festival entries in snapshot', () => {
    assert.equal(FESTIVAL_CONTENT_SNAPSHOT.festivals.length, 35);
    for (const slug of ALL_HINDU_SLUGS) {
      const festival = lookupFestivalContent(slug);
      assert.ok(festival, `Expected festival content for "${slug}"`);
      assert.equal(festival.definitionKey, slug);
      assert.equal(festival.tradition, 'hindu');
      assert.ok(festival.emoji.length > 0);
    }
    for (const slug of ALL_SIKH_SLUGS) {
      const festival = lookupFestivalContent(slug);
      assert.ok(festival, `Expected festival content for "${slug}"`);
      assert.equal(festival.definitionKey, slug);
      assert.equal(festival.tradition, 'sikh');
      assert.ok(festival.emoji.length > 0);
      assert.ok(resolveFestivalText(festival.name, 'pa').length > 0, `Missing Gurmukhi name for ${slug}`);
    }
  });

  it('verifies bilingual content integrity (EN & HI) for every festival', () => {
    for (const slug of ALL_AUTHORED_SLUGS) {
      const festival = lookupFestivalContent(slug)!;
      const nameEn = resolveFestivalText(festival.name, 'en');
      const nameHi = resolveFestivalText(festival.name, 'hi');
      assert.ok(nameEn.length > 0, `Missing EN name for ${slug}`);
      assert.ok(nameHi.length > 0, `Missing HI name for ${slug}`);

      const sigEn = resolveFestivalText(festival.significance, 'en');
      const sigHi = resolveFestivalText(festival.significance, 'hi');
      assert.ok(sigEn.length > 20, `Significance EN too short for ${slug}`);
      assert.ok(sigHi.length > 20, `Significance HI too short for ${slug}`);

      const ritualsEn = resolveFestivalList(festival.rituals, 'en');
      const ritualsHi = resolveFestivalList(festival.rituals, 'hi');
      assert.ok(ritualsEn.length >= 3, `Expected at least 3 EN rituals for ${slug}`);
      assert.ok(ritualsHi.length >= 3, `Expected at least 3 HI rituals for ${slug}`);

      const dos = resolveFestivalList(festival.dos, 'en');
      const donts = resolveFestivalList(festival.donts, 'en');
      assert.ok(dos.length >= 1, `Expected dos for ${slug}`);
      assert.ok(donts.length >= 1, `Expected donts for ${slug}`);

      const items = resolveFestivalList(festival.pujaItems, 'en');
      assert.ok(items.length >= 3, `Expected puja items for ${slug}`);

      assert.ok(isFestivalPublishable(festival), `Festival ${slug} must be publishable`);
    }
  });

  it('verifies authentic Sanskrit/Gurbani mantra and translations for all 35 festivals', () => {
    for (const slug of ALL_AUTHORED_SLUGS) {
      const festival = lookupFestivalContent(slug)!;
      assert.ok(festival.mantra, `Expected mantra for ${slug}`);
      assert.ok(festival.mantra.sanskrit.length > 10, `Mantra text too short for ${slug}`);
      assert.ok(festival.mantra.transliteration.length > 10, `Transliteration too short for ${slug}`);

      const transEn = resolveFestivalText(festival.mantra.translation, 'en');
      const transHi = resolveFestivalText(festival.mantra.translation, 'hi');
      assert.ok(transEn.length > 10, `Mantra EN translation too short for ${slug}`);
      assert.ok(transHi.length > 10, `Mantra HI translation too short for ${slug}`);
    }
  });

  it('verifies all registered hero assets exist in LOCAL_HERO_ASSETS and BUNDLED_HERO_THEMES', () => {
    const requiredHeroIds = [
      // Batch 1
      'ganesha-divine-dhyana',
      'chhath-surya-arghya',
      'dhanteras-deepam-kuber',
      'naraka-chaturdashi-dawn-deepam',
      'diwali-deepam-serenity',
      'govardhan-annakut-darshan',
      'bhai-dooj-sacred-aarti',
      'holi-gulal-vrindavan',
      'sri-rama-darbar-serene',
      'krishna-cosmic-flute',
      'shiva-moonlit-kedar',
      'hanuman-sita-ram-darshan',
      // Batch 2
      'makar-sankranti-uttarayan-dawn',
      'vasant-panchami-saraswati-amber',
      'gudi-padwa-chaitra-sunrise',
      'ugadi-pachadi-mango-dawn',
      'akshaya-tritiya-udaka-kumbha',
      'narasimha-twilight-protection',
      'shani-peepal-deepam-dhyana',
      'jagannath-puri-rath-yatra',
      'nag-panchami-shesha-dhyana',
      'hartalika-teej-forest-tapasya',
      'karva-chauth-moonrise-serenity',
      'gita-jayanti-kurukshetra-darshan',
      // Batch 3
      'sikh-baisakhi-khalsa-saajna',
      'sikh-guru-nanak-gurpurab',
      'sikh-guru-gobind-singh-ji',
      'sikh-bandhi-chhor-divas',
      'sikh-hola-mohalla',
      'sikh-lohri-bonfire',
      'sikh-guru-arjan-dev-shaheedi',
      'sikh-guru-tegh-bahadur-shaheedi',
      'sikh-chaar-sahibzade-shaheedi',
      'sikh-guru-ravidas-jayanti',
    ];

    for (const heroId of requiredHeroIds) {
      assert.ok(LOCAL_HERO_ASSETS[heroId], `Missing LOCAL_HERO_ASSETS entry for ${heroId}`);
      assert.ok(
        BUNDLED_HERO_THEMES.some((t) => t.id === heroId),
        `Missing BUNDLED_HERO_THEMES entry for ${heroId}`
      );
    }
  });
});
