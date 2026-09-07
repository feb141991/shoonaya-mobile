export type FounderTradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';
export type FounderLanguage = 'en' | 'hi';

export type NoteBlock = {
  kind: 'paragraph' | 'heading' | 'quote' | 'emphasis' | 'rhythm';
  text: string;
};

export type FounderCopy = {
  greeting: Record<FounderTradition, string>;
  welcome: string;
  tagline: string;
  eyebrow: string;
  headerTitle: string;
  title: string;
  teaser: string;
  read: string;
  skip: string;
  continue: string;
  back: string;
  normalText: string;
  largeText: string;
  blocks: NoteBlock[];
  signoff: string;
  founderName: string;
  founderRole: string;
  closing: string;
};

export const TRADITION_BRIDGES: Record<FounderLanguage, Record<FounderTradition, string>> = {
  en: {
    hindu:
      'For Hindu families, that means staying rooted in sacred dates, daily sadhana, and the quiet rhythms of family parampara, wherever in the world life takes us.',
    sikh:
      'For Sikh families, that means keeping Gurbani, Gurpurabs, sangat, and the discipline of inherited practice alive and close at hand in daily life.',
    buddhist:
      'For Buddhist practitioners and families, that means sustaining core teachings, sacred observances, meditation, and a connection with sangha across distance.',
    jain:
      'For Jain families, that means upholding ahimsa, samayika, sacred observances, and the careful spiritual discipline passed down through generations.',
  },
  hi: {
    hindu:
      'हिंदू परिवारों के लिए इसका अर्थ है पावन तिथियों, दैनिक साधना और पारिवारिक परंपरा के शांत प्रवाह से जुड़े रहना — चाहे जीवन हमें संसार के किसी भी कोने में ले जाए।',
    sikh:
      'सिख परिवारों के लिए इसका अर्थ है गुरबाणी, गुरपुरब, संगत और विरासत में मिले अभ्यास के अनुशासन को दैनिक जीवन में सजीव रखना।',
    buddhist:
      'बौद्ध साधकों और परिवारों के लिए इसका अर्थ है मूल शिक्षाओं, पावन अवसरों, ध्यान और संघ से दूरी के बावजूद जुड़े रहना।',
    jain:
      'जैन परिवारों के लिए इसका अर्थ है अहिंसा, सामायिक, पावन पर्वों और पीढ़ियों से मिले सूक्ष्म आध्यात्मिक अनुशासन को सँजोना।',
  },
};

export const FOUNDER_COPY: Record<FounderLanguage, FounderCopy> = {
  en: {
    greeting: {
      hindu: 'Radhe Radhe',
      sikh: 'Sat Sri Akaal',
      buddhist: 'Namo Buddhaya',
      jain: 'Jai Jinendra',
    },
    welcome: 'Welcome to Shoonaya',
    tagline: 'From zero to infinity.',
    eyebrow: 'A PERSONAL LETTER',
    headerTitle: "Founder's note",
    title: 'A Note From Our Founder',
    teaser:
      'Shoonaya began from a simple feeling: distance should not make our sacred days, stories, practices and family wisdom quietly disappear.',
    read: "Read the founder's note",
    skip: 'Skip for now',
    continue: 'Continue setup',
    back: 'Back',
    normalText: 'Normal text size',
    largeText: 'Larger text size',
    blocks: [
      {
        kind: 'emphasis',
        text: 'Some things should never feel distant, no matter how far from home we travel.',
      },
      {
        kind: 'paragraph',
        text: 'When I moved to London, I realised I did not only miss home. I missed the quiet ways our traditions stayed present: someone remembering Ekadashi, a festival date, a story, a prayer, a family practice.',
      },
      {
        kind: 'paragraph',
        text: 'Many of us are building lives far from where our families began. Shoonaya was created to help sacred time, daily practice, stories, texts and family wisdom travel with us.',
      },
      {
        kind: 'paragraph',
        text: 'It is not here to replace tradition. It is here to serve it with care, accuracy and technology that remembers gently.',
      },
      {
        kind: 'rhythm',
        text: 'A sacred day remembered.\nA prayer repeated.\nA story passed forward.\nA root kept alive.',
      },
      {
        kind: 'emphasis',
        text: 'Shoonaya begins there: from remembering where we come from to discovering how far inward we can go.',
      },
    ],
    signoff: 'With gratitude,',
    founderName: 'Prince Sharma',
    founderRole: 'Founder, Shoonaya',
    closing: 'Find your infinity.',
  },
  hi: {
    greeting: {
      hindu: 'राधे राधे',
      sikh: 'सत श्री अकाल',
      buddhist: 'नमो बुद्धाय',
      jain: 'जय जिनेन्द्र',
    },
    welcome: 'Shoonaya में आपका स्वागत है',
    tagline: 'शून्य से अनंत तक।',
    eyebrow: 'एक व्यक्तिगत पत्र',
    headerTitle: 'संस्थापक का पत्र',
    title: 'हमारे संस्थापक की ओर से',
    teaser:
      'Shoonaya की शुरुआत एक सीधी-सी भावना से हुई: दूरी की वजह से हमारे पावन दिन, कथाएँ, अभ्यास और पारिवारिक ज्ञान चुपचाप ग़ायब नहीं होने चाहिए।',
    read: 'संस्थापक का पत्र पढ़ें',
    skip: 'अभी छोड़ें',
    continue: 'सेटअप आगे बढ़ाएँ',
    back: 'पीछे',
    normalText: 'सामान्य अक्षर आकार',
    largeText: 'बड़ा अक्षर आकार',
    blocks: [
      {
        kind: 'emphasis',
        text: 'कुछ चीज़ें हमसे कभी दूर नहीं होनी चाहिए, चाहे हम घर से कितनी भी दूर चले जाएँ।',
      },
      {
        kind: 'paragraph',
        text: 'जब मैं लंदन आया, तो मुझे एहसास हुआ कि मुझे सिर्फ़ घर की याद नहीं आई। मुझे उन शांत तरीक़ों की कमी महसूस हुई जिनसे हमारी परंपराएँ हमेशा हमारे आसपास बनी रहती थीं — जैसे कोई एकादशी याद दिलाए, किसी त्योहार की तारीख़ बताए, कोई कथा सुनाए, कोई प्रार्थना दोहराए, या कोई पारिवारिक अभ्यास निभाया जाए।',
      },
      {
        kind: 'paragraph',
        text: 'हममें से बहुत से लोग उस स्थान से दूर अपना जीवन बना रहे हैं जहाँ से हमारे परिवारों की यात्रा शुरू हुई थी। Shoonaya इसीलिए बनाया गया ताकि पावन समय, दैनिक अभ्यास, कथाएँ, ग्रंथ और पारिवारिक ज्ञान हमारे साथ यात्रा कर सकें।',
      },
      {
        kind: 'paragraph',
        text: 'यह परंपरा का स्थान लेने नहीं आया। यह सावधानी, शुद्धता और सहजता से याद रखने वाली तकनीक के साथ उसकी सेवा करने आया है।',
      },
      {
        kind: 'rhythm',
        text: 'एक पावन दिन याद रखा गया।\nएक प्रार्थना दोहराई गई।\nएक कथा आगे बढ़ाई गई।\nएक जड़ जीवित रखी गई।',
      },
      {
        kind: 'emphasis',
        text: 'Shoonaya यहीं से शुरू होता है: यह याद रखने से कि हम कहाँ से आए हैं, यह खोजने तक कि हम भीतर कितनी दूर जा सकते हैं।',
      },
    ],
    signoff: 'कृतज्ञता सहित,',
    founderName: 'Prince Sharma',
    founderRole: 'संस्थापक, Shoonaya',
    closing: 'अपना अनंत खोजें।',
  },
};

export function getFounderNoteBlocks(language: FounderLanguage, tradition: FounderTradition): NoteBlock[] {
  const baseBlocks = FOUNDER_COPY[language].blocks;
  const bridgeText = TRADITION_BRIDGES[language][tradition];
  const bridgeBlock: NoteBlock = { kind: 'paragraph', text: bridgeText };

  // Anchor: the "many of us are building lives far from where our families
  // began" paragraph -- the bridge slots in right after it, before "It is
  // not here to replace tradition...", so the tradition-specific line reads
  // as a natural elaboration rather than an appended afterthought.
  const anchorIndex = baseBlocks.findIndex((b) =>
    language === 'hi'
      ? b.text.includes('हममें से बहुत से लोग उस स्थान से दूर अपना जीवन बना रहे हैं')
      : b.text.includes('Many of us are building lives far from where our families began')
  );

  if (anchorIndex === -1) {
    return [...baseBlocks, bridgeBlock];
  }

  const result = [...baseBlocks];
  result.splice(anchorIndex + 1, 0, bridgeBlock);
  return result;
}
