import type { AppLanguage } from '@/lib/language-runtime';

// Interface text for the reader controls (top bar, capsule, "Aa" sheet).
// Hindi/Punjabi are first-pass translations pending native-speaker review
// (docs/reader-experience/PROGRESS.md). Content text is never here.

export type ReaderCopy = {
  back: string;
  pin: string;
  unpin: string;
  smaller: string;
  larger: string;
  textSize: (label: string) => string;
  listen: string;
  stopListening: string;
  preparingAudio: string;
  language: (current: string) => string;
  moreOptions: string;
  sheetTitle: string;
  sectionText: string;
  sectionSpeed: string;
  sectionShow: string;
  sectionActions: string;
  transliteration: string;
  meaning: string;
  copy: string;
  copied: string;
  share: string;
  speed: (rate: string) => string;
  done: string;
  tapHint: string;
  sectionPaper: string;
  paper: { auto: string; bhojpatra: string; sandhya: string; templeNight: string };
  resumed: (where: string) => string;
  startOver: string;
  sectionRepeat: string;
  repeatTimes: (n: number) => string;
  sectionSleep: string;
  sleepOff: string;
  sleepMinutes: (n: number) => string;
  sleepAfterThis: string;
  sleepActive: (label: string) => string;
  recitationStatus: (pass: number, total: number, verse: number, verses: number) => string;
};

const en: ReaderCopy = {
  back: 'Go back',
  pin: 'Keep controls visible',
  unpin: 'Let controls hide while reading',
  smaller: 'Smaller text',
  larger: 'Larger text',
  textSize: (label) => `Text size ${label}`,
  listen: 'Listen',
  stopListening: 'Stop listening',
  preparingAudio: 'Preparing audio',
  language: (current) => `Reading language: ${current}. Tap to change`,
  moreOptions: 'Reading options',
  sheetTitle: 'Reading options',
  sectionText: 'Text size',
  sectionSpeed: 'Listening speed',
  sectionShow: 'Show',
  sectionActions: 'Share',
  transliteration: 'Transliteration',
  meaning: 'Meaning',
  copy: 'Copy text',
  copied: 'Copied',
  share: 'Share',
  speed: (rate) => `${rate}× speed`,
  done: 'Done',
  tapHint: 'Tap the page to show or hide the controls',
  sectionPaper: 'Paper',
  paper: { auto: 'Auto', bhojpatra: 'Bhojpatra', sandhya: 'Sandhya', templeNight: 'Temple Night' },
  resumed: (where) => `Resumed where you left off · ${where}`,
  startOver: 'Start over',
  sectionRepeat: 'Repeat',
  repeatTimes: (n) => `${n}×`,
  sectionSleep: 'Sleep timer',
  sleepOff: 'Off',
  sleepMinutes: (n) => `${n} min`,
  sleepAfterThis: 'After this recitation',
  sleepActive: (label) => `Sleep timer: ${label}`,
  recitationStatus: (pass, total, verse, verses) => total > 1 ? `Recitation ${pass} of ${total} · Verse ${verse} of ${verses}` : `Verse ${verse} of ${verses}`,
};

const hi: ReaderCopy = {
  back: 'वापस जाएँ',
  pin: 'नियंत्रण दिखते रहें',
  unpin: 'पढ़ते समय नियंत्रण छिप जाएँ',
  smaller: 'छोटा अक्षर',
  larger: 'बड़ा अक्षर',
  textSize: (label) => `अक्षर आकार ${label}`,
  listen: 'सुनें',
  stopListening: 'सुनना बंद करें',
  preparingAudio: 'ऑडियो तैयार हो रहा है',
  language: (current) => `पढ़ने की भाषा: ${current}। बदलने के लिए दबाएँ`,
  moreOptions: 'पढ़ने के विकल्प',
  sheetTitle: 'पढ़ने के विकल्प',
  sectionText: 'अक्षर आकार',
  sectionSpeed: 'सुनने की गति',
  sectionShow: 'दिखाएँ',
  sectionActions: 'साझा करें',
  transliteration: 'लिप्यंतरण',
  meaning: 'अर्थ',
  copy: 'पाठ कॉपी करें',
  copied: 'कॉपी हो गया',
  share: 'साझा करें',
  speed: (rate) => `${rate}× गति`,
  done: 'हो गया',
  tapHint: 'नियंत्रण दिखाने या छिपाने के लिए पृष्ठ पर टैप करें',
  sectionPaper: 'पृष्ठ',
  paper: { auto: 'स्वचालित', bhojpatra: 'भोजपत्र', sandhya: 'संध्या', templeNight: 'मंदिर रात्रि' },
  resumed: (where) => `जहाँ छोड़ा था, वहीं से · ${where}`,
  startOver: 'शुरू से पढ़ें',
  sectionRepeat: 'दोहराएँ',
  repeatTimes: (n) => `${n}×`,
  sectionSleep: 'स्लीप टाइमर',
  sleepOff: 'बंद',
  sleepMinutes: (n) => `${n} मिनट`,
  sleepAfterThis: 'इस पाठ के बाद',
  sleepActive: (label) => `स्लीप टाइमर: ${label}`,
  recitationStatus: (pass, total, verse, verses) => total > 1 ? `पाठ ${pass} / ${total} · श्लोक ${verse} / ${verses}` : `श्लोक ${verse} / ${verses}`,
};

const pa: ReaderCopy = {
  back: 'ਵਾਪਸ ਜਾਓ',
  pin: 'ਕੰਟਰੋਲ ਦਿਖਦੇ ਰਹਿਣ',
  unpin: 'ਪੜ੍ਹਦੇ ਸਮੇਂ ਕੰਟਰੋਲ ਲੁਕ ਜਾਣ',
  smaller: 'ਛੋਟੇ ਅੱਖਰ',
  larger: 'ਵੱਡੇ ਅੱਖਰ',
  textSize: (label) => `ਅੱਖਰ ਆਕਾਰ ${label}`,
  listen: 'ਸੁਣੋ',
  stopListening: 'ਸੁਣਨਾ ਬੰਦ ਕਰੋ',
  preparingAudio: 'ਆਡੀਓ ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ',
  language: (current) => `ਪੜ੍ਹਨ ਦੀ ਭਾਸ਼ਾ: ${current}। ਬਦਲਣ ਲਈ ਦਬਾਓ`,
  moreOptions: 'ਪੜ੍ਹਨ ਦੇ ਵਿਕਲਪ',
  sheetTitle: 'ਪੜ੍ਹਨ ਦੇ ਵਿਕਲਪ',
  sectionText: 'ਅੱਖਰ ਆਕਾਰ',
  sectionSpeed: 'ਸੁਣਨ ਦੀ ਗਤੀ',
  sectionShow: 'ਦਿਖਾਓ',
  sectionActions: 'ਸਾਂਝਾ ਕਰੋ',
  transliteration: 'ਲਿਪੀਅੰਤਰਨ',
  meaning: 'ਅਰਥ',
  copy: 'ਪਾਠ ਕਾਪੀ ਕਰੋ',
  copied: 'ਕਾਪੀ ਹੋ ਗਿਆ',
  share: 'ਸਾਂਝਾ ਕਰੋ',
  speed: (rate) => `${rate}× ਗਤੀ`,
  done: 'ਹੋ ਗਿਆ',
  tapHint: 'ਕੰਟਰੋਲ ਦਿਖਾਉਣ ਜਾਂ ਲੁਕਾਉਣ ਲਈ ਪੰਨੇ \'ਤੇ ਟੈਪ ਕਰੋ',
  sectionPaper: 'ਪੰਨਾ',
  paper: { auto: 'ਆਪਣੇ-ਆਪ', bhojpatra: 'ਭੋਜਪੱਤਰ', sandhya: 'ਸੰਧਿਆ', templeNight: 'ਮੰਦਰ ਰਾਤ' },
  resumed: (where) => `ਜਿੱਥੇ ਛੱਡਿਆ ਸੀ, ਉੱਥੋਂ · ${where}`,
  startOver: 'ਸ਼ੁਰੂ ਤੋਂ ਪੜ੍ਹੋ',
  sectionRepeat: 'ਦੁਹਰਾਓ',
  repeatTimes: (n) => `${n}×`,
  sectionSleep: 'ਸਲੀਪ ਟਾਈਮਰ',
  sleepOff: 'ਬੰਦ',
  sleepMinutes: (n) => `${n} ਮਿੰਟ`,
  sleepAfterThis: 'ਇਸ ਪਾਠ ਤੋਂ ਬਾਅਦ',
  sleepActive: (label) => `ਸਲੀਪ ਟਾਈਮਰ: ${label}`,
  recitationStatus: (pass, total, verse, verses) => total > 1 ? `ਪਾਠ ${pass} / ${total} · ਸਲੋਕ ${verse} / ${verses}` : `ਸਲੋਕ ${verse} / ${verses}`,
};

export const READER_COPY: Record<AppLanguage, ReaderCopy> = { en, hi, pa };

export function readerCopy(language: AppLanguage | null | undefined): ReaderCopy {
  return (language && READER_COPY[language]) || en;
}
