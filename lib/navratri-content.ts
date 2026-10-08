/**
 * lib/navratri-content.ts
 *
 * Navratri conduct, samagri and day dhyana verses for Sharad and Chaitra
 * Navratri (Navadurga & Vijayadashami). Chaitra days reuse the dhyana verse
 * of the same Navadurga form.
 *
 * Verse check (2026-10-08) against the Navadurga dhyana texts in the
 * brhat.in "Navadurgā" series (old.brhat.in/dhiti/<form>):
 * - Day 7 Kalaratri: replaced a garbled "karālavadanā…" line with the
 *   classical "ekaveṇī japākarṇapūrā…" dhyana (two stanzas). Popular sites
 *   also print a "karālavandanāṃ ghorāṃ…" verse, but every copy found was
 *   corrupted, so it was not used.
 * - Translations now say only what each verse says: day 3 (no lion/bell
 *   claims), day 4 (surā rendered as divine nectar, as brhat.in does, and the
 *   pot of blood kept), day 5 (no "Skanda on Her lap"), day 6 (śārdūla =
 *   tiger, not lion), day 9 (asuras restored).
 * - Day 3: प्रसादिं → प्रसादं (standard reading).
 * Still open: this hand-written Native file has no per-item source metadata
 * and is not in the backend canonical snapshot (AGENTS.md sections 1 and 3).
 * The verse texts and translations have not had a human/council review.
 */

export const NAVRATRI_SLUGS = [
  'sharad-navratri',
  'navratri-begins',
  'navratri-day-1-shailaputri',
  'navratri-day-2-brahmacharini',
  'navratri-day-3-chandraghanta',
  'navratri-day-4-kushmanda',
  'navratri-day-5-skandamata',
  'navratri-day-6-katyayani',
  'navratri-day-7-kalaratri',
  'durga-ashtami',
  'maha-navami',
  'dussehra',
  'vijayadashami',
] as const;

/** Chaitra (Vasanta) Navratri day slugs: same Navadurga order as Sharad. */
const CHAITRA_DAY_PREFIX = 'chaitra-navratri-day-';

export function isNavratriObservance(slug: string): boolean {
  return (
    slug === 'sharad-navratri' ||
    slug === 'navratri-begins' ||
    slug.startsWith('navratri-day-') ||
    slug === 'durga-ashtami' ||
    slug === 'maha-navami' ||
    slug === 'dussehra' ||
    slug === 'vijayadashami' ||
    slug === 'chaitra-navratri' ||
    slug === 'chaitra-navratri-begins' ||
    slug.startsWith(CHAITRA_DAY_PREFIX)
  );
}

/**
 * The Sharad slug for the same Navadurga form, so a Chaitra day reuses that
 * form's dhyana verse (the verse belongs to the goddess, not the season).
 * Chaitra days 8 and 9 are Mahagauri and Siddhidatri, which Sharad files
 * under durga-ashtami and maha-navami.
 */
function navadurgaSlug(slug: string): string {
  if (!slug.startsWith(CHAITRA_DAY_PREFIX)) return slug;
  const rest = slug.slice(CHAITRA_DAY_PREFIX.length); // e.g. "8-mahagauri"
  if (rest.startsWith('8-')) return 'durga-ashtami';
  if (rest.startsWith('9-')) return 'maha-navami';
  return `navratri-day-${rest}`;
}

export function getNavratriConduct(
  _slug: string,
  lang: 'en' | 'hi' | 'pa',
): { dos: string[]; donts: string[] } {
  if (lang === 'pa') {
    return {
      dos: [
        'ਸਾਤਵਿਕ ਆਹਾਰ (ਫਲਾਹਾਰ, ਫਲ, ਦੁੱਧ) ਲਵੋ ਅਤੇ ਨਰਾਤਿਆਂ ਦੇ ਪਵਿੱਤਰ ਨਿਯਮਾਂ ਦੀ ਪਾਲਣਾ ਕਰੋ',
        'ਸਵੇਰੇ ਅਤੇ ਸ਼ਾਮ ਘਿਓ ਦਾ ਦੀਵਾ ਜਗਾ ਕੇ ਮਾਂ ਭਗਵਤੀ ਦੀ ਆਰਤੀ ਤੇ ਪ੍ਰਾਰਥਨਾ ਕਰੋ',
        'ਦੁਰਗਾ ਸਪਤਸ਼ਤੀ, ਦੇਵੀ ਕਵਚ ਜਾਂ ਨਵਾਰਣ ਮੰਤਰ ਦਾ ਸ਼ਰਧਾ ਭਾਵ ਨਾਲ ਪਾਠ ਤੇ ਸਿਮਰਨ ਕਰੋ',
        'ਜੇ ਅਖੰਡ ਜੋਤ ਜਗਾਈ ਹੈ ਤਾਂ ਉਸਦੀ ਲਗਾਤਾਰ ਦੇਖਭਾਲ ਰੱਖੋ',
        'ਅਸ਼ਟਮੀ ਜਾਂ ਨੌਮੀ ਦੇ ਪਵਿੱਤਰ ਦਿਨ ਕੰਜਕ ਪੂਜਨ (ਕੰਨਿਆ ਪੂਜਾ) ਕਰਕੇ ਪ੍ਰਸਾਦ ਅਤੇ ਦੱਛਣਾ ਭੇਟ ਕਰੋ',
      ],
      donts: [
        'ਮਾਸ, ਸ਼ਰਾਬ, ਪਿਆਜ਼ ਅਤੇ ਲਸਣ ਵਰਗੇ ਤਾਮਸਿਕ ਭੋਜਨ ਤੋਂ ਪੂਰੀ ਤਰ੍ਹਾਂ ਪਰਹੇਜ਼ ਰੱਖੋ',
        'ਨਰਾਤਿਆਂ ਦੇ ਪਵਿੱਤਰ ਨੌਂ ਦਿਨਾਂ ਦੌਰਾਨ ਵਾਲ ਜਾਂ ਨਹੁੰ ਕੱਟਣ ਤੋਂ ਬਚੋ',
        'ਜੇ ਅਖੰਡ ਜੋਤ ਜਗਾਈ ਹੋਵੇ ਤਾਂ ਘਰ ਨੂੰ ਇਕੱਲਾ ਜਾਂ ਤਾਲਾ ਲਗਾ ਕੇ ਨਾ ਛੱਡੋ',
        'ਵਰਤ ਦੇ ਦਿਨਾਂ ਵਿੱਚ ਗੁੱਸੇ, ਝੂਠ, ਨਿੰਦਾ ਅਤੇ ਲੜਾਈ-ਝਗੜੇ ਤੋਂ ਦੂਰ ਰਹੋ',
        'ਦਸਮੀ ਤੇ ਵਿਸਰਜਨ ਤੋਂ ਪਹਿਲਾਂ ਸਥਾਪਿਤ ਕਲਸ਼ ਅਤੇ ਬੀਜੇ ਹੋਏ ਜੌਂਆਂ ਨੂੰ ਨਾ ਛੇੜੋ',
      ],
    };
  }

  if (lang === 'hi') {
    return {
      dos: [
        'सात्विक आहार (फलाहार, कुट्टू/सिंघाड़े का आटा, फल, दूध) ग्रहण करें और मन-कर्म-वचन से पवित्रता (ब्रह्मचर्य) रखें',
        'प्रतिदिन प्रातः व सायं शुद्ध घी का दीपक जलाकर शंख-घंटी की ध्वनि के साथ माँ भगवती की आरती करें',
        'दुर्गा सप्तशती (चंडी पाठ), देवी कवच अथवा नवार्ण मंत्र का एकाग्रचित्त होकर नियमित जप करें',
        'यदि अखंड ज्योति स्थापित की हो तो ध्यान रखें कि तेल/घी पर्याप्त रहे और दीप बुझने न पाए',
        'अष्टमी अथवा नवमी पर कन्या पूजन कर नौ कन्याओं को देवी मानकर आदरपूर्वक भोजन, उपहार व दक्षिणा दें',
      ],
      donts: [
        'तामसिक भोजन जैसे मांसाहार, प्याज, लहसुन और मदिरा का नौ दिनों तक पूर्ण त्याग रखें',
        'नवरात्रि के पावन दिनों में बाल कटवाना, दाढ़ी बनाना और नाखून काटना वर्जित माना गया है',
        'यदि घर में अखंड ज्योति प्रज्वलित की हो तो घर में ताला लगाकर उसे अकेला न छोड़ें',
        'व्रत के दौरान क्रोध, कलह, परनिंदा, असत्य भाषण और दिन में सोने से बचें',
        'दशमी पर विसर्जन मुहूर्त से पूर्व स्थापित कलश अथवा बोए गए जौ (जवारे) को न हिलाएं',
      ],
    };
  }

  return {
    dos: [
      'Observe a pure sattvic diet (fruits, milk, buckwheat) and maintain self-restraint and celibacy (Brahmacharya)',
      'Perform daily morning and evening Aarti with a pure ghee lamp, incense, and bells before the altar',
      'Recite Durga Saptashati (Chandi Path), Devi Kavacham, or chant the Navarna Mantra with unbroken devotion',
      'If keeping an Akhand Jyot (unbroken flame), ensure it is attended with reverence and never left unmonitored',
      'Perform Kanya Pujan on Ashtami or Navami, honoring young girls as living embodiments of Goddess Durga',
    ],
    donts: [
      'Strictly avoid all tamasic foods: non-vegetarian foods, onion, garlic, and alcohol',
      'Do not cut hair, shave, or clip nails during the nine holy nights of Navratri',
      'Never lock the home or leave it unattended if an Akhand Jyot has been consecrated',
      'Avoid anger, harsh speech, deception, quarrels, and daytime sleeping during fasting days',
      'Do not disturb or move the consecrated Kalash and sown barley until ritual Visarjan on Dashami',
    ],
  };
}

export function getNavratriPujaItems(
  _slug: string,
  lang: 'en' | 'hi' | 'pa',
): string[] {
  if (lang === 'pa') {
    return [
      'ਮਿੱਟੀ ਜਾਂ ਤਾਂਬੇ ਦਾ ਕਲਸ਼, ਜਟਾ ਵਾਲਾ ਨਾਰੀਅਲ, ਲਾਲ ਚੁੰਨੀ, ਮੌਲੀ ਅਤੇ ਅੰਬ ਦੇ ਪੱਤੇ',
      'ਪਵਿੱਤਰ ਮਿੱਟੀ, ਕੱਚਾ ਥਾਲ ਅਤੇ ਬੀਜਣ ਲਈ ਸਾਫ ਜੌਂ',
      'ਰੋਲੀ, ਕੁਮਕੁਮ, ਅਕਸ਼ਤ (ਸਾਬੁਤ ਚੌਲ), ਚੰਦਨ, ਕਪੂਰ ਅਤੇ ਗਾਂ ਦਾ ਸ਼ੁੱਧ ਘਿਓ',
      'ਲਾਲ ਗੁੜਹਲ ਜਾਂ ਗੁਲਾਬ ਦੇ ਫੁੱਲ, ਪਾਨ ਦੇ ਪੱਤੇ, ਸੁਪਾਰੀ, ਲੌਂਗ ਅਤੇ ਇਲਾਇਚੀ',
      'ਮੌਸਮੀ ਫਲ, ਪੰਚਮੇਵਾ, ਮਿਸ਼ਰੀ, ਬਤਾਸ਼ੇ ਅਤੇ ਮਾਂ ਦੇ ਭੋਗ ਲਈ ਸਾਤਵਿਕ ਪ੍ਰਸਾਦ',
    ];
  }

  if (lang === 'hi') {
    return [
      'मिट्टी अथवा तांबे का कलश, जटा वाला नारियल, लाल चुनरी, कलावा (मौली) और आम के पल्लव',
      'शुद्ध मिट्टी, मिट्टी का चौड़ा पात्र और बोने हेतु साफ जौ',
      'रोली, कुमकुम, साबुत अक्षत (चावल), चंदन, धूप, कपूर और शुद्ध गाय का घी',
      'लाल गुड़हल अथवा गुलाब के पुष्प, पान के पत्ते, साबुत सुपारी, लौंग और इलायची',
      'मौसमी फल, पंचमेवा, मिश्री, बताशे और हलवा-पूरी/खीर का सात्विक नैवेद्य',
    ];
  }

  return [
    'Earthen or copper Kalash (pot), raw coconut with husk wrapped in red cloth (Chunari) and sacred thread (Mauli)',
    'Sacred soil (Saptamrittika), clay tray, and clean barley (Jau) seeds for sowing',
    'Fresh mango leaves (Amra Pallav) or Ashoka leaves to adorn the Kalash rim',
    'Roli (kumkum), unbroken rice (Akshat), Chandan, camphor, dhoop, and pure cow ghee',
    'Red hibiscus or rose flowers, betel leaves (Paan), betel nuts (Supari), and cloves',
    'Seasonal satvik fruits, dry fruits, Mishri, batasha, and fresh sweet offerings (Bhog)',
  ];
}

export function getNavratriMantra(
  requestedSlug: string,
  lang: 'en' | 'hi' | 'pa',
): { sanskrit: string; translation: string } {
  const slug = navadurgaSlug(requestedSlug);
  if (slug === 'navratri-day-1-shailaputri') {
    return {
      sanskrit: 'वन्दे वाञ्छितलाभाय चन्द्रार्धकृतशेखराम्। वृषारूढां शूलधरां शैलपुत्रीं यशस्विनीम्॥',
      translation:
        lang === 'pa'
          ? "ਮਨੋਕਾਮਨਾਵਾਂ ਦੀ ਪੂਰਤੀ ਲਈ ਮੈਂ ਅਰਧ-ਚੰਦਰਮਾ ਧਾਰਨ ਕਰਨ ਵਾਲੀ, ਬਲਦ 'ਤੇ ਸਵਾਰ ਅਤੇ ਤ੍ਰਿਸ਼ੂਲਧਾਰੀ ਮਾਂ ਸ਼ੈਲਪੁਤਰੀ ਦੀ ਵੰਦਨਾ ਕਰਦਾ ਹਾਂ।"
          : lang === 'hi'
          ? 'मनोवांछित फल की प्राप्ति हेतु मैं मस्तक पर अर्धचंद्र धारण करने वाली, वृषभ पर आरूढ़ और त्रिशूलधारिणी यशस्विनी माँ शैलपुत्री की वंदना करता हूँ।'
          : 'I bow to glorious Mother Shailaputri, adorned with the crescent moon upon Her crest, riding the sacred bull, holding the trident to bestow auspicious spiritual fulfillments.',
    };
  }

  if (slug === 'navratri-day-2-brahmacharini') {
    return {
      sanskrit: 'दधाना करपद्माभ्यामक्षमालाकमण्डलू। देवी प्रसीदतु मयि ब्रह्मचारिण्यनुत्तमा॥',
      translation:
        lang === 'pa'
          ? "ਹੱਥਾਂ ਵਿੱਚ ਜਪਮਾਲਾ ਅਤੇ ਕਮੰਡਲ ਧਾਰਨ ਕਰਨ ਵਾਲੀ, ਤਪੱਸਵੀ ਮਾਂ ਬ੍ਰਹਮਚਾਰਿਣੀ ਮੇਰੇ 'ਤੇ ਕ੍ਰਿਪਾ ਕਰਨ।"
          : lang === 'hi'
          ? 'अपने कर-कमलों में जपमाला और कमंडल धारण करने वाली, अनुपम तपस्विनी माँ ब्रह्मचारिणी मुझ पर प्रसन्न हों।'
          : 'Holding the rosary of sacred beads and the kamandalu in Her lotus hands, may the peerless Goddess Brahmacharini shower Her grace upon me.',
    };
  }

  if (slug === 'navratri-day-3-chandraghanta') {
    return {
      sanskrit: 'पिण्डजप्रवरारूढा चण्डकोपास्त्रकैर्युता। प्रसादं तनुते मह्यं चन्द्रघण्टेति विश्रुता॥',
      translation:
        lang === 'pa'
          ? "ਸ੍ਰੇਸ਼ਟ ਵਾਹਨ 'ਤੇ ਸਵਾਰ, ਪ੍ਰਚੰਡ ਕ੍ਰੋਧ ਦੇ ਸ਼ਸਤਰਾਂ ਨਾਲ ਸੁਸੱਜਿਤ, ਚੰਦਰਘੰਟਾ ਨਾਮ ਨਾਲ ਪ੍ਰਸਿੱਧ ਮਾਂ ਮੇਰੇ 'ਤੇ ਕਿਰਪਾ ਕਰੇ।"
          : lang === 'hi'
          ? 'श्रेष्ठ वाहन पर आरूढ़, प्रचंड क्रोध के अस्त्रों से युक्त, चंद्रघंटा नाम से विख्यात देवी मुझ पर अपनी कृपा का विस्तार करें।'
          : 'Mounted on the foremost of beasts and armed with weapons of fierce wrath, may She who is renowned as Chandraghanta extend Her grace to me.',
    };
  }

  if (slug === 'navratri-day-4-kushmanda') {
    return {
      sanskrit: 'सुरासम्पूर्णकलशं रुधिराप्लुतमेव च। दधाना हस्तपद्माभ्यां कूष्माण्डा शुभदास्तु मे॥',
      translation:
        lang === 'pa'
          ? 'ਆਪਣੇ ਕਮਲ ਵਰਗੇ ਹੱਥਾਂ ਵਿੱਚ ਸੁਰਾ (ਦੈਵੀ ਅੰਮ੍ਰਿਤ) ਨਾਲ ਭਰਿਆ ਕਲਸ਼ ਅਤੇ ਖ਼ੂਨ ਨਾਲ ਭਿੱਜਿਆ ਕਲਸ਼ ਧਾਰਨ ਕਰਨ ਵਾਲੀ ਮਾਂ ਕੂਸ਼ਮਾਂਡਾ ਮੇਰੇ ਲਈ ਸ਼ੁਭ ਦੇਣ ਵਾਲੀ ਹੋਵੇ।'
          : lang === 'hi'
          ? 'अपने कर-कमलों में सुरा (दिव्य अमृत) से परिपूर्ण कलश और रक्त से आप्लुत कलश धारण करने वाली माँ कूष्मांडा मेरे लिए शुभदायिनी हों।'
          : 'Holding in Her lotus hands a kalasha filled with surā (understood as divine nectar) and another drenched in blood, may Goddess Kushmanda be the giver of auspiciousness to me.',
    };
  }

  if (slug === 'navratri-day-5-skandamata') {
    return {
      sanskrit: 'सिंहासनगता नित्यं पद्माश्रितकरद्वया। शुभदास्तु सदा देवी स्कन्दमाता यशस्विनी॥',
      translation:
        lang === 'pa'
          ? "ਸਦਾ ਸਿੰਘਾਸਣ 'ਤੇ ਬਿਰਾਜਮਾਨ, ਜਿਨ੍ਹਾਂ ਦੇ ਦੋਵੇਂ ਹੱਥ ਕਮਲਾਂ 'ਤੇ ਟਿਕੇ ਹਨ — ਯਸ਼ਸਵਿਨੀ ਦੇਵੀ ਸਕੰਦਮਾਤਾ ਸਦਾ ਸ਼ੁਭ ਦੇਣ ਵਾਲੀ ਹੋਵੇ।"
          : lang === 'hi'
          ? 'सदा सिंहासन पर विराजमान, जिनके दोनों हाथ कमलों पर आश्रित हैं — यशस्विनी देवी स्कंदमाता सदा शुभ देने वाली हों।'
          : 'Ever seated on a lion throne, Her two hands resting on lotuses, may the glorious Goddess Skandamata always grant auspiciousness.',
    };
  }

  if (slug === 'navratri-day-6-katyayani') {
    return {
      sanskrit: 'चन्द्रहासोज्ज्वलकरा शार्दूलवरवाहना। कात्यायनी शुभं दद्याद् देवी दानवघातिनी॥',
      translation:
        lang === 'pa'
          ? "ਚੰਦਰਹਾਸ ਤਲਵਾਰ ਨਾਲ ਚਮਕਦੇ ਹੱਥ ਵਾਲੀ, ਸ੍ਰੇਸ਼ਟ ਬਾਘ (ਸ਼ਾਰਦੂਲ) 'ਤੇ ਸਵਾਰ, ਦਾਨਵਾਂ ਦਾ ਨਾਸ਼ ਕਰਨ ਵਾਲੀ ਦੇਵੀ ਕਾਤਿਆਇਨੀ ਸ਼ੁਭ ਬਖ਼ਸ਼ੇ।"
          : lang === 'hi'
          ? 'चंद्रहास खड्ग से उज्ज्वल हाथ वाली, श्रेष्ठ व्याघ्र (शार्दूल) पर सवार, दानवों का संहार करने वाली देवी कात्यायनी शुभ प्रदान करें।'
          : 'Her hand radiant with the Chandrahasa sword, riding the noblest tiger (śārdūla), may Goddess Katyayani, slayer of demons, grant auspiciousness.',
    };
  }

  if (slug === 'navratri-day-7-kalaratri') {
    return {
      // The widely cited classical dhyana (as given in the brhat.in Navadurga
      // series). Replaces a garbled "karālavadanā…" line whose second half
      // did not match any published version.
      sanskrit: 'एकवेणी जपाकर्णपूरा नग्ना खरास्थिता। लम्बोष्ठी कर्णिकाकर्णी तैलाभ्यक्तशरीरिणी॥ वामपादोल्लसल्लोहलताकण्टकभूषणा। वर्धनमूर्धध्वजा कृष्णा कालरात्रिर्भयङ्करी॥',
      translation:
        lang === 'pa'
          ? "ਇੱਕ ਗੁੱਤ ਵਾਲੀ, ਕੰਨਾਂ ਵਿੱਚ ਜਪਾ (ਗੁੜਹਲ) ਦੇ ਫੁੱਲ ਸਜਾਏ, ਦਿਸ਼ਾਵਾਂ ਹੀ ਜਿਨ੍ਹਾਂ ਦੇ ਬਸਤਰ ਹਨ, ਗਧੇ 'ਤੇ ਸਵਾਰ, ਲੰਮੇ ਬੁੱਲ੍ਹਾਂ ਵਾਲੀ, ਕੰਨਾਂ ਵਿੱਚ ਕਰਣਿਕਾ ਪਹਿਨੇ, ਤੇਲ ਨਾਲ ਮਲੇ ਸਰੀਰ ਵਾਲੀ; ਜਿਨ੍ਹਾਂ ਦੇ ਖੱਬੇ ਪੈਰ ਵਿੱਚ ਲੋਹੇ ਦੀ ਕੰਡਿਆਲੀ ਵੇਲ ਵਰਗਾ ਗਹਿਣਾ ਚਮਕਦਾ ਹੈ; ਸਾਂਵਲੇ ਰੰਗ ਵਾਲੀ, ਉੱਚੇ ਝੰਡੇ ਵਾਲੀ — ਭਿਆਨਕ ਰੂਪ ਵਾਲੀ ਮਾਂ ਕਾਲਰਾਤ੍ਰੀ।"
          : lang === 'hi'
          ? 'एक वेणी (चोटी) वाली, कानों में जपा (गुड़हल) के पुष्प धारण किए, दिगंबरा, गर्दभ पर सवार, लंबे होठों वाली, कानों में कर्णिका पहने, तेल से अभ्यक्त शरीर वाली; जिनके बाएँ पैर में लोहे की कँटीली लता जैसा आभूषण चमकता है; श्याम वर्ण, ऊँची ध्वजा वाली — भयंकर रूप वाली माँ कालरात्रि।'
          : 'With a single braid, ears adorned with hibiscus (japā) flowers, clad only in the directions, riding a donkey, with long lips, ear-ornaments and a body anointed with oil; Her left foot shining with an ornament of iron thorns like a creeper; dark-hued, Her banner raised high — Kalaratri, the fearsome one.',
    };
  }

  if (slug === 'durga-ashtami') {
    return {
      sanskrit: 'श्वेते वृषे समारूढा श्वेताम्बरधरा शुचिः। महागौरी शुभं दद्यान्महादेवप्रमोददा॥',
      translation:
        lang === 'pa'
          ? "ਚਿੱਟੇ ਬਲਦ 'ਤੇ ਸਵਾਰ, ਚਿੱਟੇ ਬਸਤਰ ਧਾਰਨ ਕਰਨ ਵਾਲੀ ਅਤੇ ਮਹਾਦੇਵ ਨੂੰ ਪ੍ਰਸੰਨ ਕਰਨ ਵਾਲੀ ਮਾਂ ਮਹਾਗੌਰੀ ਸੁੱਖ-ਸ਼ਾਂਤੀ ਬਖਸ਼ਣ।"
          : lang === 'hi'
          ? 'श्वेत वृषभ पर सवार, श्वेत वस्त्र धारण करने वाली परम पवित्र और महादेव को आनंदित करने वाली माँ महागौरी सदा शुभ फल प्रदान करें।'
          : 'Riding the pure white bull, clad in pristine white attire, radiating immaculate purity, may Mother Mahagauri who delights Lord Shiva bestow auspicious peace.',
    };
  }

  if (slug === 'maha-navami') {
    return {
      sanskrit: 'सिद्धगन्धर्वयक्षाद्यैरसुरैरमरैरपि। सेव्यमाना सदा भूयात् सिद्धिदा सिद्धिदायिनी॥',
      translation:
        lang === 'pa'
          ? 'ਸਿੱਧਾਂ, ਗੰਧਰਵਾਂ, ਯਕਸ਼ਾਂ, ਅਸੁਰਾਂ ਅਤੇ ਦੇਵਤਿਆਂ ਵੱਲੋਂ ਵੀ ਸਦਾ ਪੂਜੀ ਜਾਣ ਵਾਲੀ, ਸਿੱਧੀ ਦੇਣ ਵਾਲੀ ਮਾਂ ਸਿੱਧੀਦਾਤਰੀ ਸਦਾ ਸਿੱਧੀ ਬਖ਼ਸ਼ਣ ਵਾਲੀ ਹੋਵੇ।'
          : lang === 'hi'
          ? 'सिद्धों, गंधर्वों, यक्षों, असुरों और देवताओं द्वारा भी सदा सेवित, सिद्धि देने वाली माँ सिद्धिदात्री सदा सिद्धि प्रदान करने वाली हों।'
          : 'Ever served by siddhas, gandharvas, yakshas, asuras and devas alike, may Siddhidatri, the giver of siddhi, always grant spiritual attainment.',
    };
  }

  if (slug === 'dussehra' || slug === 'vijayadashami') {
    return {
      sanskrit: 'ॐ जयन्ती मङ्गला काली भद्रकाली कपालिनी। दुर्गा क्षमा शिवा धात्री स्वाहा स्वधा नमोऽस्तु ते॥',
      translation:
        lang === 'pa'
          ? 'ਜਯੰਤੀ, ਮੰਗਲਾ, ਕਾਲੀ, ਭੱਦਰਕਾਲੀ, ਕਪਾਲਿਨੀ, ਦੁਰਗਾ, ਖ਼ਿਮਾ, ਸ਼ਿਵਾ, ਧਾਤਰੀ, ਸਵਾਹਾ ਅਤੇ ਸਵਧਾ — ਸਾਰੇ ਰੂਪਾਂ ਵਿੱਚ ਪੂਜੀ ਜਾਣ ਵਾਲੀ ਜਗਤ-ਜਨਨੀ ਮਾਂ ਨੂੰ ਪ੍ਰਣਾਮ।'
          : lang === 'hi'
          ? 'जयन्ती, मंगला, काली, भद्रकाली, कपालिनी, दुर्गा, क्षमा, शिवा, धात्री, स्वाहा और स्वधा — इन सभी स्वरूपों में पूजित जगज्जननी माँ भगवती को हमारा बारंबार नमन।'
          : 'Salutations to Jayanti, Mangala, Kali, Bhadrakali, Kapalini, Durga, Kshama, Shiva, Dhatri, Svaha, and Svadha — the triumphant protector of the universe.',
    };
  }

  return {
    sanskrit: 'ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे॥',
    translation:
      lang === 'pa'
        ? 'ਮਹਾਸਰਸਵਤੀ, ਮਹਾਲਕਸ਼ਮੀ ਅਤੇ ਮਹਾਕਾਲੀ ਦੀ ਸ਼ਕਤੀ ਨੂੰ ਪ੍ਰਣਾਮ ਕਰਦਾ ਪਵਿੱਤਰ ਨਵਾਰਣ ਮੰਤਰ, ਜੋ ਗਿਆਨ, ਖੁਸ਼ਹਾਲੀ ਅਤੇ ਮੁਕਤੀ ਬਖਸ਼ਦਾ ਹੈ।'
        : lang === 'hi'
        ? 'महासरस्वती, महालक्ष्मी और महाकाली की समन्वित शक्ति को जाग्रत करने वाला परम पावन नवार्ण महामंत्र, जो ज्ञान, समृद्धि और मोक्ष प्रदान करता है।'
        : 'The sacred nine-syllable Navarna Mantra invoking Mahasaraswati, Mahalakshmi, and Mahakali to bestow wisdom, prosperity, and spiritual liberation.',
  };
}
