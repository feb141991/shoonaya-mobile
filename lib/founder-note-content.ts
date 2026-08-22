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
      'Living far from home made me realise how easily the quiet connections to our traditions can fade: a sacred date remembered, a story shared, a practice carried forward. Shoonaya began as an attempt to help those things travel with us.',
    read: "Read the founder's note",
    skip: 'Skip for now',
    continue: 'Continue setup',
    back: 'Back',
    normalText: 'Normal text size',
    largeText: 'Larger text size',
    blocks: [
      {
        kind: 'emphasis',
        text: 'Some things should never become distant, no matter how far from home we travel.',
      },
      { kind: 'paragraph', text: 'When I moved to London, I expected to miss home.' },
      {
        kind: 'paragraph',
        text: 'I expected to miss the food, the people, the familiar streets and the festivals celebrated together.',
      },
      {
        kind: 'paragraph',
        text: 'What I did not expect was to miss the small, almost invisible ways our traditions had always remained present.',
      },
      {
        kind: 'quote',
        text: '“Kal Ekadashi hai.”\n“Aaj Purnima hai.”\n“Is baar Diwali kis din hai?”',
      },
      {
        kind: 'paragraph',
        text: 'A parent remembered. A grandparent reminded us. A temple bell, a calendar on the wall or a conversation at home somehow kept us connected.',
      },
      {
        kind: 'paragraph',
        text: 'Thousands of miles away, that quiet connection became much easier to lose. And I realised I was not alone.',
      },
      {
        kind: 'paragraph',
        text: 'Many of us are building lives far from where our families began. We have technology for banking, travel, food, fitness and entertainment, yet staying connected with our traditions can still mean searching through different calendars, websites, family messages and phone calls home.',
      },
      {
        kind: 'paragraph',
        text: 'My own experience began with the Sanatan traditions in which I was raised. But the deeper concern is shared by many families carrying Hindu, Sikh, Jain and Buddhist traditions across generations.',
      },
      {
        kind: 'emphasis',
        text: 'How do we preserve what matters without flattening it, forgetting it or allowing it to quietly disappear?',
      },
      { kind: 'heading', text: 'What if our traditions could travel with us?' },
      {
        kind: 'paragraph',
        text: 'What if your phone could gently remind you when a sacred day or festival approaches—not because you remembered to search for it, but because Shoonaya remembered for you?',
      },
      {
        kind: 'paragraph',
        text: 'What if sacred teachings were easier to understand, daily practices easier to maintain, and the knowledge inherited from our families easier to preserve?',
      },
      {
        kind: 'paragraph',
        text: 'Our traditions are more than dates on a calendar. They are memory, practice and belonging. They are the thread connecting one generation to the next.',
      },
      {
        kind: 'paragraph',
        text: 'Our grandparents carried much of that knowledge in memory. Our parents carried it forward in the ways available to them. Our generation now has an opportunity to carry it differently: with care, accuracy and technology that serves tradition rather than replacing it.',
      },
      { kind: 'heading', text: 'That is why I began building Shoonaya.' },
      {
        kind: 'paragraph',
        text: 'Shoonaya is more than a calendar. It is a digital home for knowledge and practices that should not quietly disappear: sacred time, daily practice, sacred texts, quiet reflection, family heritage and the wisdom passed through generations.',
      },
      { kind: 'rhythm', text: 'Delhi or London.\nPunjab or Paris.\nMumbai or Melbourne.' },
      { kind: 'emphasis', text: 'Distance may change where we live. It should not erase our roots.' },
      {
        kind: 'paragraph',
        text: "Shoonaya is my attempt to use today's technology to preserve something timeless.",
      },
      {
        kind: 'paragraph',
        text: 'Perhaps someone will observe an important day because a quiet reminder arrived at the right moment. Perhaps a child growing up far from India will discover something meaningful about their family’s tradition. Perhaps someone searching for direction will encounter a teaching their grandparents once knew by heart.',
      },
      { kind: 'paragraph', text: 'These may appear to be small things. But traditions have always survived through small things:' },
      {
        kind: 'rhythm',
        text: 'A story remembered.\nA prayer repeated.\nA sacred day observed.\nA name preserved.\nA teaching passed forward.',
      },
      { kind: 'emphasis', text: 'Shoonaya begins there.' },
      {
        kind: 'rhythm',
        text: 'From remembering where we come from\nto discovering how far inward we can go.\n\nFrom zero to infinity.',
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
      'घर से दूर रहने पर मुझे महसूस हुआ कि परंपराओं से हमारा शांत संबंध कितनी आसानी से धुंधला पड़ सकता है — कोई पावन तिथि याद रखना, कोई कथा सुनाना, कोई अभ्यास आगे बढ़ाना। Shoonaya इसी संबंध को हमारे साथ आगे ले जाने के प्रयास से जन्मा।',
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
      { kind: 'paragraph', text: 'जब मैं लंदन आया, मुझे पता था कि घर की याद आएगी।' },
      {
        kind: 'paragraph',
        text: 'मुझे भोजन, अपने लोगों, परिचित गलियों और साथ मिलकर मनाए जाने वाले त्योहारों की याद आने की उम्मीद थी।',
      },
      {
        kind: 'paragraph',
        text: 'लेकिन मैंने यह नहीं सोचा था कि मुझे उन छोटी, लगभग अदृश्य बातों की भी कमी महसूस होगी जिनके सहारे हमारी परंपराएँ हमेशा हमारे आसपास बनी रहती थीं।',
      },
      {
        kind: 'quote',
        text: '“कल एकादशी है।”\n“आज पूर्णिमा है।”\n“इस बार दीपावली किस दिन है?”',
      },
      {
        kind: 'paragraph',
        text: 'कोई माता-पिता याद रखते थे। कोई दादा-दादी या नाना-नानी स्मरण करा देते थे। मंदिर की घंटी, दीवार का कैलेंडर या घर की कोई बातचीत — किसी न किसी तरह वह जानकारी हम तक पहुँच जाती थी।',
      },
      {
        kind: 'paragraph',
        text: 'हज़ारों मील दूर आकर उस शांत संबंध को खो देना बहुत आसान हो गया। और मुझे समझ आया कि मैं अकेला नहीं था।',
      },
      {
        kind: 'paragraph',
        text: 'हममें से बहुत से लोग उस स्थान से दूर अपना जीवन बना रहे हैं जहाँ से हमारे परिवारों की यात्रा शुरू हुई थी। बैंकिंग, यात्रा, भोजन, स्वास्थ्य और मनोरंजन के लिए तकनीक है; फिर भी अपनी परंपरा से जुड़े रहने के लिए अलग-अलग कैलेंडर, वेबसाइट, पारिवारिक संदेश और घर पर फोन खोजना पड़ता है।',
      },
      {
        kind: 'paragraph',
        text: 'मेरी अपनी यात्रा उन सनातन परंपराओं से शुरू हुई जिनमें मेरा पालन-पोषण हुआ। लेकिन यह गहरी चिंता उन अनेक परिवारों की भी है जो हिंदू, सिख, जैन और बौद्ध परंपराओं को पीढ़ी-दर-पीढ़ी आगे ले जा रहे हैं।',
      },
      {
        kind: 'emphasis',
        text: 'जो महत्वपूर्ण है, उसे एक जैसा बनाए बिना, भुलाए बिना और चुपचाप मिटने दिए बिना हम कैसे सँजो सकते हैं?',
      },
      { kind: 'heading', text: 'क्या हमारी परंपराएँ हमारे साथ यात्रा कर सकती हैं?' },
      {
        kind: 'paragraph',
        text: 'क्या ऐसा हो सकता है कि कोई पावन तिथि या पर्व आने पर आपका फोन सहजता से आपको स्मरण करा दे—इसलिए नहीं कि आपने खोजना याद रखा, बल्कि इसलिए कि Shoonaya ने आपके लिए याद रखा?',
      },
      {
        kind: 'paragraph',
        text: 'क्या पवित्र शिक्षाओं को समझना, दैनिक अभ्यासों को निभाना और परिवारों से मिला ज्ञान सँजोना थोड़ा अधिक सहज हो सकता है?',
      },
      {
        kind: 'paragraph',
        text: 'हमारी परंपराएँ कैलेंडर की तिथियों से कहीं अधिक हैं। वे स्मृति, अभ्यास और अपनापन हैं। वे एक पीढ़ी को अगली पीढ़ी से जोड़ने वाला सूत्र हैं।',
      },
      {
        kind: 'paragraph',
        text: 'हमारे बुज़ुर्गों ने इस ज्ञान का बड़ा भाग स्मृति में सँजोया। हमारे माता-पिता ने उसे अपनी तरह आगे बढ़ाया। अब हमारे पास अवसर है कि हम उसे सावधानी, शुद्धता और ऐसी तकनीक के साथ आगे ले जाएँ जो परंपरा का स्थान न ले, बल्कि उसकी सेवा करे।',
      },
      { kind: 'heading', text: 'इसीलिए मैंने Shoonaya बनाना शुरू किया।' },
      {
        kind: 'paragraph',
        text: 'Shoonaya केवल एक कैलेंडर नहीं है। यह उस ज्ञान और अभ्यास का एक डिजिटल घर है जिसे चुपचाप लुप्त नहीं होना चाहिए — पावन समय, दैनिक अभ्यास, पवित्र ग्रंथ, आत्मचिंतन, पारिवारिक विरासत और पीढ़ियों से मिला ज्ञान।',
      },
      { kind: 'rhythm', text: 'दिल्ली या लंदन।\nपंजाब या पेरिस।\nमुंबई या मेलबर्न।' },
      { kind: 'emphasis', text: 'दूरी हमारे रहने का स्थान बदल सकती है। उसे हमारी जड़ें नहीं मिटानी चाहिए।' },
      {
        kind: 'paragraph',
        text: 'Shoonaya आज की तकनीक के माध्यम से किसी कालातीत चीज़ को सँजोने का मेरा प्रयास है।',
      },
      {
        kind: 'paragraph',
        text: 'शायद कोई व्यक्ति किसी महत्वपूर्ण दिन का पालन करे क्योंकि सही समय पर एक शांत स्मरण आया। शायद भारत से दूर बड़ा हो रहा कोई बच्चा अपने परिवार की परंपरा के बारे में कुछ अर्थपूर्ण जान सके। शायद दिशा खोज रहा कोई व्यक्ति उस शिक्षा तक पहुँचे जिसे उसके बुज़ुर्ग कभी हृदय से जानते थे।',
      },
      {
        kind: 'paragraph',
        text: 'ये बातें छोटी लग सकती हैं। लेकिन परंपराएँ हमेशा छोटी बातों के माध्यम से ही जीवित रही हैं:',
      },
      {
        kind: 'rhythm',
        text: 'एक कथा याद रखी गई।\nएक प्रार्थना दोहराई गई।\nएक पावन दिन मनाया गया।\nएक नाम सँजोया गया।\nएक शिक्षा आगे बढ़ाई गई।',
      },
      { kind: 'emphasis', text: 'Shoonaya यहीं से शुरू होता है।' },
      {
        kind: 'rhythm',
        text: 'यह याद रखने से कि हम कहाँ से आए हैं\nयह खोजने तक कि हम भीतर कितनी दूर जा सकते हैं।\n\nशून्य से अनंत तक।',
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

  const sanatanIndex = baseBlocks.findIndex((b) =>
    language === 'hi'
      ? b.text.includes('मेरी अपनी यात्रा उन सनातन परंपराओं से शुरू हुई')
      : b.text.includes('My own experience began with the Sanatan traditions')
  );

  if (sanatanIndex === -1) {
    return [...baseBlocks, bridgeBlock];
  }

  const result = [...baseBlocks];
  result.splice(sanatanIndex + 1, 0, bridgeBlock);
  return result;
}
