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
  // Batch 5 Chhath & Major
  'chhath-nahay-khay',
  'chhath-kharna',
  'chhath-usha-arghya',
  'kartik-purnima',
  'vivah-panchami',
  'onam',
  // Navratris
  'chaitra-navratri-begins',
  'navratri-begins',
  'gupt-navratri-ashadha-begins',
  'gupt-navratri-magha-begins',
  // Memorial & Shrines
  'mahalaya-amavasya',
  'vat-savitri-amavasya',
  'vat-savitri-purnima',
  'chintpurni-mata-chaitra-navratri',
  'chintpurni-mata-sharad-navratri',
  // Ekadashis
  'nirjala-ekadashi',
  'vaikunta-ekadashi',
  'devshayani-ekadashi',
  'devutthana-ekadashi',
  'kamada-ekadashi',
  'amalaki-ekadashi',
  'papmochani-ekadashi',
  'apara-ekadashi',
  'kamika-ekadashi',
  'shravana-putrada-ekadashi',
  'aja-ekadashi',
  'parivartini-ekadashi',
  'rama-ekadashi',
  'utpanna-ekadashi',
  'saphala-ekadashi',
  'vijaya-ekadashi',
  'yogini-ekadashi',
  'ekadashi',
  // Periodic & Vrats
  'pradosh-vrat',
  'purnima-vrat',
  'amavasya-vrat',
  'vinayaka-chaturthi',
  'sankashti-chaturthi',
  'shravan-somvar',
  'mangala-gauri-vrat',
  // Ganeshotsav
  'ganeshotsav-day-2',
  'ganeshotsav-day-3',
  'ganeshotsav-day-4',
  'ganeshotsav-day-5',
  'ganeshotsav-day-6',
  'ganeshotsav-day-7',
  'ganeshotsav-day-8',
  'ganeshotsav-day-9',
  'ganeshotsav-day-10',
  'anant-chaturdashi-ganesh-visarjan',
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
  'guru-amar-das-gurpurab',
  'guru-har-krishan-gurpurab',
  'guru-ram-das-gurpurab',
];

const ALL_BUDDHIST_SLUGS = [
  'vesak-buddha-purnima',
  'asalha-puja',
  'magha-puja',
  'vassa-begins-rains-retreat',
  'pavarana-end-of-vassa',
  'kathina',
  'ullambana-ancestor-day',
  'bodhi-day',
  'parinirvana-day',
  'losar-tibetan-new-year',
  'sangha-day-loy-krathong',
];

const ALL_JAIN_SLUGS = [
  'mahavir-jayanti',
  'akshaya-tritiya-jain',
  'paryushana-parva-begins',
  'samvatsari-paryushana-ends',
  'das-lakshana-dharma-begins',
  'jain-new-year-pratipada',
  'jain-diwali-nirvana-ladnun',
  'kartik-purnima-jain',
  'paryushana-day-2',
  'paryushana-day-3',
  'paryushana-day-4',
  'paryushana-day-5',
  'paryushana-day-6',
  'paryushana-day-7',
];

const ALL_SHARED_SLUGS = [
  'guru-purnima',
];

const ALL_AUTHORED_SLUGS = [
  ...ALL_HINDU_SLUGS,
  ...ALL_SIKH_SLUGS,
  ...ALL_BUDDHIST_SLUGS,
  ...ALL_JAIN_SLUGS,
  ...ALL_SHARED_SLUGS,
];

describe('Batch 1, 2, 3, 4 & 5 Festival Content & Hero Integration Suite', () => {
  it('contains all 114 authored festival entries in snapshot', () => {
    assert.equal(FESTIVAL_CONTENT_SNAPSHOT.festivals.length, 114);
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
    for (const slug of ALL_BUDDHIST_SLUGS) {
      const festival = lookupFestivalContent(slug);
      assert.ok(festival, `Expected festival content for "${slug}"`);
      assert.equal(festival.definitionKey, slug);
      assert.equal(festival.tradition, 'buddhist');
      assert.ok(festival.emoji.length > 0);
    }
    for (const slug of ALL_JAIN_SLUGS) {
      const festival = lookupFestivalContent(slug);
      assert.ok(festival, `Expected festival content for "${slug}"`);
      assert.equal(festival.definitionKey, slug);
      assert.equal(festival.tradition, 'jain');
      assert.ok(festival.emoji.length > 0);
    }
    for (const slug of ALL_SHARED_SLUGS) {
      const festival = lookupFestivalContent(slug);
      assert.ok(festival, `Expected festival content for "${slug}"`);
      assert.equal(festival.definitionKey, slug);
      assert.equal(festival.tradition, 'all');
      assert.ok(festival.emoji.length > 0);
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

  it('verifies authentic Sanskrit/Gurbani/Pali/Prakrit mantra and translations for all 114 festivals', () => {
    for (const slug of ALL_AUTHORED_SLUGS) {
      const festival = lookupFestivalContent(slug)!;
      assert.ok(festival.mantra, `Expected mantra for ${slug}`);
      assert.ok(festival.mantra.sanskrit.length > 5, `Mantra text too short for ${slug}`);
      assert.ok(festival.mantra.transliteration.length > 5, `Transliteration too short for ${slug}`);

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
      // Batch 4 (Buddhist & Jain)
      'buddhist-vesak-buddha-purnima',
      'buddhist-asalha-puja-dharmachakra',
      'buddhist-magha-puja-sangha',
      'buddhist-vassa-monsoon-retreat',
      'buddhist-pavarana-kathina',
      'buddhist-bodhi-day-awakening',
      'buddhist-parinirvana-day',
      'buddhist-losar-tibetan-new-year',
      'buddhist-sangha-day',
      'jain-mahavir-jayanti-darshan',
      'jain-akshaya-tritiya-adinatha',
      'jain-paryushana-parva-samavasarana',
      'jain-samvatsari-universal-forgiveness',
      'jain-das-lakshana-dharma',
      'jain-new-year-gautama-kevala',
      'jain-diwali-nirvana-deepotsav',
      'jain-kartik-purnima-shatrunjaya',
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
