import type { AppLanguage } from '@/lib/language-runtime';

export type DyutaCopy = {
  playTitle: string;
  playSubtitle: string;
  featuredGame: string;
  featuredDescription: string;
  experienceLabel: string;
  storyBoundary: string;
  playNow: string;
  modernTitle: string;
  modernDescription: string;
  gyanTitle: string;
  comingSoon: string;
  gyanDescription: string;
  gameTitle: string;
  gameSubtitle: string;
  boardTitle: string;
  versus: string;
  backLabel: string;
  offlineLabel: string;
  guideName: string;
  guideRule: string;
  modeTitle: string;
  soloMode: string;
  passAndPlayMode: string;
  passPlayDescription: string;
  passPlayRulesBody: string;
  rollPrompt: string;
  playerOneLabel: string;
  playerTwoLabel: string;
  handoffPrompt: string;
  namedTurn: string;
  continueTurn: string;
  playerWon: string;
  opponentWon: string;
  round: string;
  yourTurn: string;
  guideTurn: string;
  player: string;
  score: string;
  firstDie: string;
  secondDie: string;
  roll: string;
  keep: string;
  chooseAction: string;
  rerollFirst: string;
  rerollSecond: string;
  waitingForGuide: string;
  tryAgain: string;
  startMatch: string;
  newMatch: string;
  changeMode: string;
  savedMatch: string;
  saveUnavailable: string;
  winTitle: string;
  guideWinTitle: string;
  drawTitle: string;
  finalScore: string;
  matchComplete: string;
  discardTitle: string;
  discardMessage: string;
  cancel: string;
  discard: string;
  close: string;
  points: string;
  rulesTitle: string;
  rulesBody: string;
  showRules: string;
  hideRules: string;
  difficultyTitle: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;
  difficultyDescription: string;
  factionTitle: string;
  pandavas: string;
  kauravas: string;
  cosmeticChoice: string;
  avatarTitle: string;
  colorTitle: string;
  colorGold: string;
  colorSage: string;
  colorNavy: string;
  colorClay: string;
  avatarSun: string;
  avatarMoon: string;
  avatarStar: string;
  avatarFeather: string;
  avatarHeart: string;
  avatarCompass: string;
  tutorialTitle: string;
  tutorialStart: string;
  tutorialReplay: string;
  tutorialStep: string;
  tutorialNext: string;
  tutorialDone: string;
  tutorialRoll: string;
  tutorialChoice: string;
  tutorialScore: string;
  factsTitle: string;
  factsProgress: string;
  factsLocked: string;
  factOne: string;
  factTwo: string;
  factThree: string;
  factSourceLabel: string;
  settingsTitle: string;
  hapticsTitle: string;
  hapticsDescription: string;
  enabled: string;
  disabled: string;
  savedMatchesTitle: string;
  saveCopy: string;
  loadSave: string;
  deleteSave: string;
  noSavedMatches: string;
  saveSlotsFull: string;
  loadSaveTitle: string;
  loadSaveMessage: string;
  savedAt: string;
  deleteSaveMessage: string;
  saveFailed: string;
};

export const DYUTA_COPY: Record<AppLanguage, DyutaCopy> = {
  en: {
    playTitle: 'Play & Learn',
    playSubtitle: 'Short, thoughtful ways to explore and play.',
    featuredGame: 'Mahabharata: Dyuta Sabha',
    featuredDescription: 'Enter a Sabha-inspired setting for a calm, five-round offline dice experience.',
    experienceLabel: 'Epic experience',
    storyBoundary: 'Inspired by the Sabha Parva episode. The presentation is traditional; the playable rules are a respectful Shoonaya interpretation, not a claimed historical reconstruction.',
    playNow: 'Enter the Sabha',
    modernTitle: 'Open Throw',
    modernDescription: 'A faster Shoonaya-original strategy game, designed separately from the epic experience.',
    gyanTitle: 'Gyan Chaupar',
    comingSoon: 'Coming soon',
    gyanDescription: 'A separate board-game experience is planned for a later release.',
    gameTitle: 'Dyuta Sabha',
    gameSubtitle: 'A Sabha Parva-inspired dice experience',
    boardTitle: 'Sabha table',
    versus: 'VS',
    backLabel: 'Back',
    offlineLabel: 'Offline · no account needed',
    guideName: 'Guide',
    guideRule: 'At this difficulty the Guide rerolls its lower die on {threshold}. The dice odds are unchanged.',
    modeTitle: 'Choose how to play',
    soloMode: 'Solo with Guide',
    passAndPlayMode: 'Pass and play',
    passPlayDescription: 'Two people share this device and take turns. No account or network is needed.',
    passPlayRulesBody: 'Two named players share one device. The device is passed between turns; tap “I have the device” before each roll. Each turn uses the same two dice, one optional single-die reroll, and sum scoring. The higher total after five rounds wins; a tie stays a draw.',
    rollPrompt: 'Roll two dice, then keep both or reroll one die once.',
    playerOneLabel: 'Player 1 name',
    playerTwoLabel: 'Player 2 name',
    handoffPrompt: 'Pass the device to {name}. Their previous turn is cleared from the dice area.',
    namedTurn: '{name}’s turn',
    continueTurn: 'I have the device',
    playerWon: '{name} won this match',
    opponentWon: '{name} won this match',
    round: 'Round',
    yourTurn: 'Your turn',
    guideTurn: 'Guide’s turn',
    player: 'You',
    score: 'Score',
    firstDie: 'first die',
    secondDie: 'second die',
    roll: 'Roll dice',
    keep: 'Keep both',
    chooseAction: 'Keep both dice, or reroll exactly one die once.',
    rerollFirst: 'Reroll first die',
    rerollSecond: 'Reroll second die',
    waitingForGuide: 'The guide is taking its turn…',
    tryAgain: 'Try again',
    startMatch: 'Start a five-round match',
    newMatch: 'Start new match',
    changeMode: 'Change mode or players',
    savedMatch: 'Your match is saved on this device.',
    saveUnavailable: 'The match is still playable, but this device could not save it.',
    winTitle: 'You won this match',
    guideWinTitle: 'The guide won this match',
    drawTitle: 'It’s a draw',
    finalScore: 'Final score',
    matchComplete: 'Five rounds complete',
    discardTitle: 'Start a new match?',
    discardMessage: 'Your current match will be replaced on this device.',
    cancel: 'Cancel',
    discard: 'Start new',
    close: 'Back to Play',
    points: 'points',
    rulesTitle: 'How to play',
    rulesBody: 'Play five rounds. You and the Guide each take one turn per round, and the opening alternates. On your turn, roll two dice and add their final sum. Keep both dice or reroll one die once. The higher total wins; an equal total is a draw.',
    showRules: 'Read the rules',
    hideRules: 'Hide the rules',
    difficultyTitle: 'Guide difficulty',
    difficultyEasy: 'Easy', difficultyMedium: 'Medium', difficultyHard: 'Hard',
    difficultyDescription: 'Easy rerolls a 1; Medium rerolls 1–2; Hard rerolls 1–3. Dice odds stay the same.',
    factionTitle: 'Choose your side', pandavas: 'Pandavas', kauravas: 'Kauravas',
    cosmeticChoice: 'Side, avatar, and color are cosmetic. They do not change dice, scoring, or the epic story.',
    avatarTitle: 'Choose avatar', colorTitle: 'Board color',
    colorGold: 'Gold', colorSage: 'Sage', colorNavy: 'Indigo', colorClay: 'Earth',
    avatarSun: 'Sun', avatarMoon: 'Moon', avatarStar: 'Star', avatarFeather: 'Feather', avatarHeart: 'Heart', avatarCompass: 'Compass',
    tutorialTitle: 'Quick tutorial', tutorialStart: 'Start tutorial', tutorialReplay: 'Replay', tutorialStep: 'Step {step} of 3', tutorialNext: 'Next', tutorialDone: 'Finish tutorial',
    tutorialRoll: 'Roll two fair six-sided dice. The same dice odds apply to both sides.',
    tutorialChoice: 'Keep both dice, or reroll exactly one die once. The other die stays as it is.',
    tutorialScore: 'Add the final dice values. After five rounds, the higher total wins; a tie is a draw. These are Shoonaya-interpreted rules for this experience.',
    factsTitle: 'Unlockable game notes', factsProgress: '{count} of 3 notes unlocked', factsLocked: 'Finish the tutorial and matches to unlock source-aware notes.',
    factOne: 'Dyuta Sabha uses a traditional presentation with Shoonaya-interpreted gameplay. Its six-sided dice and reroll are not claimed as historical Sabha Parva rules.',
    factTwo: 'The BORI Critical Edition places the dice contest in Book 2, Sabha Parva, in the Dyuta episode.',
    factThree: 'The text presents Shakuni playing for Duryodhana, but does not provide a complete procedure for recreating a playable game.',
    factSourceLabel: 'Source', settingsTitle: 'Game settings', hapticsTitle: 'Button haptics', hapticsDescription: 'Use a light vibration for game actions.', enabled: 'On', disabled: 'Off',
    savedMatchesTitle: 'Saved matches', saveCopy: 'Save a copy', loadSave: 'Load', deleteSave: 'Delete', noSavedMatches: 'No saved copies yet.', saveSlotsFull: 'All five save slots are full. Delete one to save another.', loadSaveTitle: 'Load this match?', loadSaveMessage: 'Your current autosaved match will switch to this saved match.', savedAt: 'Saved {date}', deleteSaveMessage: 'This saved copy will be deleted from this device.', saveFailed: 'Could not save a copy. Your current match is still autosaved.',
  },
  hi: {
    playTitle: 'खेलें और जानें',
    playSubtitle: 'खेलने और जानने के सहज तरीके।',
    featuredGame: 'महाभारत: द्यूत सभा',
    featuredDescription: 'पाँच चरणों की ऑफ़लाइन पासा चुनौती, स्पष्ट नियमों के साथ।',
    experienceLabel: 'महाकाव्य अनुभव',
    storyBoundary: 'सभा पर्व के प्रसंग से प्रेरित। प्रस्तुति पारंपरिक है; खेलने के नियम Shoonaya की सम्मानपूर्ण व्याख्या हैं, ऐतिहासिक नियमों के पुनर्निर्माण का दावा नहीं।',
    playNow: 'सभा में प्रवेश करें',
    modernTitle: 'ओपन थ्रो',
    modernDescription: 'महाकाव्य अनुभव से अलग बनाया गया एक तेज़, मौलिक Shoonaya रणनीति खेल।',
    gyanTitle: 'ज्ञान चौपड़',
    comingSoon: 'जल्द आ रहा है',
    gyanDescription: 'बोर्ड-गेम का एक अलग अनुभव बाद में लाने की योजना है।',
    gameTitle: 'द्यूत सभा',
    gameSubtitle: 'सभा पर्व से प्रेरित पासों का अनुभव',
    boardTitle: 'सभा की मेज़',
    versus: 'बनाम',
    backLabel: 'वापस',
    offlineLabel: 'ऑफ़लाइन · खाते की ज़रूरत नहीं',
    guideName: 'साथी',
    guideRule: 'इस स्तर पर साथी कम अंक वाला पासा {threshold} आने पर फिर फेंकता है। पासों की संभावना नहीं बदलती।',
    modeTitle: 'खेलने का तरीका चुनें',
    soloMode: 'साथी के साथ अकेले',
    passAndPlayMode: 'बारी-बारी से खेलें',
    passPlayDescription: 'दो लोग इसी डिवाइस पर बारी-बारी से खेलें। खाते या इंटरनेट की ज़रूरत नहीं।',
    passPlayRulesBody: 'दो खिलाड़ी एक ही डिवाइस पर खेलते हैं। हर बारी से पहले डिवाइस दूसरे खिलाड़ी को दें और “डिवाइस मेरे पास है” चुनें। हर बारी में वही दो पासे, एक पासे को एक बार फिर फेंकने का विकल्प और अंकों का योग लागू होगा। पाँच चरणों के बाद अधिक अंक जीतते हैं; बराबरी पर खेल बराबर रहता है।',
    rollPrompt: 'दो पासे फेंकें, फिर दोनों रखें या एक पासे को एक बार फिर फेंकें।',
    playerOneLabel: 'खिलाड़ी 1 का नाम',
    playerTwoLabel: 'खिलाड़ी 2 का नाम',
    handoffPrompt: 'डिवाइस {name} को दें। पासों का पिछला परिणाम साफ़ कर दिया गया है।',
    namedTurn: '{name} की बारी',
    continueTurn: 'डिवाइस मेरे पास है',
    playerWon: '{name} यह खेल जीता',
    opponentWon: '{name} यह खेल जीता',
    round: 'चरण',
    yourTurn: 'आपकी बारी',
    guideTurn: 'साथी की बारी',
    player: 'आप',
    score: 'अंक',
    firstDie: 'पहला पासा',
    secondDie: 'दूसरा पासा',
    roll: 'पासे फेंकें',
    keep: 'दोनों रखें',
    chooseAction: 'दोनों पासे रखें या केवल एक पासे को एक बार फिर फेंकें।',
    rerollFirst: 'पहला पासा फिर फेंकें',
    rerollSecond: 'दूसरा पासा फिर फेंकें',
    waitingForGuide: 'साथी अपनी बारी खेल रहा है…',
    tryAgain: 'फिर कोशिश करें',
    startMatch: 'पाँच चरणों का खेल शुरू करें',
    newMatch: 'नया खेल शुरू करें',
    changeMode: 'खेल का तरीका या खिलाड़ी बदलें',
    savedMatch: 'आपका खेल इसी डिवाइस पर सहेजा गया है।',
    saveUnavailable: 'खेल जारी है, लेकिन इसे इस डिवाइस पर सहेजा नहीं जा सका।',
    winTitle: 'आप यह खेल जीते',
    guideWinTitle: 'साथी यह खेल जीता',
    drawTitle: 'खेल बराबरी पर रहा',
    finalScore: 'अंतिम अंक',
    matchComplete: 'पाँच चरण पूरे हुए',
    discardTitle: 'नया खेल शुरू करें?',
    discardMessage: 'इस डिवाइस पर आपका मौजूदा खेल बदल जाएगा।',
    cancel: 'रद्द करें',
    discard: 'नया शुरू करें',
    close: 'खेल पर लौटें',
    points: 'अंक',
    rulesTitle: 'कैसे खेलें',
    rulesBody: 'पाँच चरण खेलें। हर चरण में आपकी और साथी की एक-एक बारी होगी; शुरुआत की बारी हर चरण में बदलती है। अपनी बारी में दो पासे फेंकें और अंतिम अंकों का योग जोड़ें। दोनों पासे रखें या एक पासे को एक बार फिर फेंकें। अधिक कुल अंक जीतते हैं; बराबर अंक होने पर खेल बराबरी पर रहता है।',
    showRules: 'नियम पढ़ें',
    hideRules: 'नियम छिपाएँ',
    difficultyTitle: 'साथी का कठिनाई स्तर',
    difficultyEasy: 'आसान', difficultyMedium: 'मध्यम', difficultyHard: 'कठिन',
    difficultyDescription: 'आसान में 1 पर, मध्यम में 1–2 पर और कठिन में 1–3 पर साथी फिर फेंकता है। पासों की संभावना समान रहती है।',
    factionTitle: 'अपना पक्ष चुनें', pandavas: 'पांडव', kauravas: 'कौरव',
    cosmeticChoice: 'पक्ष, अवतार और रंग केवल दिखावट के लिए हैं। वे पासों, अंकों या महाकाव्य की कथा को नहीं बदलते।',
    avatarTitle: 'अवतार चुनें', colorTitle: 'बोर्ड का रंग',
    colorGold: 'सुनहरा', colorSage: 'हरा', colorNavy: 'नीला', colorClay: 'मिट्टी',
    avatarSun: 'सूरज', avatarMoon: 'चाँद', avatarStar: 'तारा', avatarFeather: 'पंख', avatarHeart: 'हृदय', avatarCompass: 'दिशासूचक',
    tutorialTitle: 'त्वरित परिचय', tutorialStart: 'परिचय शुरू करें', tutorialReplay: 'फिर से देखें', tutorialStep: 'चरण {step} / 3', tutorialNext: 'आगे', tutorialDone: 'परिचय पूरा करें',
    tutorialRoll: 'दो निष्पक्ष छह-पक्षीय पासे फेंकें। दोनों पक्षों के लिए पासों की संभावना समान है।',
    tutorialChoice: 'दोनों पासे रखें या केवल एक पासे को एक बार फिर फेंकें। दूसरा पासा नहीं बदलेगा।',
    tutorialScore: 'अंतिम पासों के अंकों को जोड़ें। पाँच चरणों के बाद अधिक कुल अंक जीतते हैं; बराबरी पर खेल बराबर रहता है। ये इस अनुभव के लिए Shoonaya द्वारा व्याख्यायित नियम हैं।',
    factsTitle: 'खेल से जुड़े नोट', factsProgress: '{count} / 3 नोट खुले', factsLocked: 'स्रोत-सहित नोट खोलने के लिए परिचय और खेल पूरे करें।',
    factOne: 'द्यूत सभा पारंपरिक प्रस्तुति के साथ Shoonaya द्वारा व्याख्यायित खेल-नियम इस्तेमाल करती है। छह-पक्षीय पासे और दोबारा फेंकने के नियम को सभा पर्व का ऐतिहासिक नियम नहीं बताया गया है।',
    factTwo: 'BORI Critical Edition में पासों का प्रसंग पुस्तक 2, सभा पर्व के द्यूत प्रसंग में आता है।',
    factThree: 'पाठ में शकुनि दुर्योधन की ओर से खेलता है, लेकिन खेलने योग्य खेल को दोहराने की पूरी प्रक्रिया नहीं दी गई है।',
    factSourceLabel: 'स्रोत', settingsTitle: 'खेल की सेटिंग', hapticsTitle: 'बटन कंपन', hapticsDescription: 'खेल की क्रियाओं पर हल्का कंपन इस्तेमाल करें।', enabled: 'चालू', disabled: 'बंद',
    savedMatchesTitle: 'सहेजे गए खेल', saveCopy: 'प्रतिलिपि सहेजें', loadSave: 'खोलें', deleteSave: 'हटाएँ', noSavedMatches: 'अभी कोई सहेजी प्रतिलिपि नहीं है।', saveSlotsFull: 'सहेजने की पाँचों जगह भर गई हैं। नई प्रतिलिपि के लिए एक हटाएँ।', loadSaveTitle: 'यह खेल खोलें?', loadSaveMessage: 'मौजूदा स्वतः-सहेजा खेल इस सहेजे खेल से बदल जाएगा।', savedAt: 'सहेजा: {date}', deleteSaveMessage: 'यह सहेजी हुई प्रतिलिपि इस डिवाइस से मिट जाएगी।', saveFailed: 'प्रतिलिपि सहेजी नहीं जा सकी। आपका मौजूदा खेल स्वतः-सहेजा हुआ है।',
  },
  pa: {
    playTitle: 'ਖੇਡੋ ਅਤੇ ਜਾਣੋ',
    playSubtitle: 'ਖੇਡਣ ਅਤੇ ਜਾਣਨ ਦੇ ਸੌਖੇ ਤਰੀਕੇ।',
    featuredGame: 'ਮਹਾਭਾਰਤ: ਦਿਊਤ ਸਭਾ',
    featuredDescription: 'ਪੰਜ ਦੌਰਾਂ ਦੀ ਆਫ਼ਲਾਈਨ ਪਾਸਿਆਂ ਦੀ ਚੁਣੌਤੀ, ਸਾਫ਼ ਨਿਯਮਾਂ ਨਾਲ।',
    experienceLabel: 'ਮਹਾਕਾਵਿ ਅਨੁਭਵ',
    storyBoundary: 'ਸਭਾ ਪਰਵ ਦੇ ਪ੍ਰਸੰਗ ਤੋਂ ਪ੍ਰੇਰਿਤ। ਪੇਸ਼ਕਾਰੀ ਰਵਾਇਤੀ ਹੈ; ਖੇਡ ਦੇ ਨਿਯਮ Shoonaya ਦੀ ਸਤਿਕਾਰਪੂਰਵਕ ਵਿਆਖਿਆ ਹਨ, ਇਤਿਹਾਸਕ ਨਿਯਮਾਂ ਦੀ ਪੁਨਰਰਚਨਾ ਦਾ ਦਾਅਵਾ ਨਹੀਂ।',
    playNow: 'ਸਭਾ ਵਿੱਚ ਦਾਖਲ ਹੋਵੋ',
    modernTitle: 'ਓਪਨ ਥ੍ਰੋ',
    modernDescription: 'ਮਹਾਕਾਵਿ ਅਨੁਭਵ ਤੋਂ ਵੱਖ ਤਿਆਰ ਕੀਤੀ ਇੱਕ ਤੇਜ਼, ਮੌਲਿਕ Shoonaya ਰਣਨੀਤੀ ਖੇਡ।',
    gyanTitle: 'ਗਿਆਨ ਚੌਪੜ',
    comingSoon: 'ਜਲਦੀ ਆ ਰਿਹਾ ਹੈ',
    gyanDescription: 'ਬੋਰਡ-ਖੇਡ ਦਾ ਇੱਕ ਵੱਖਰਾ ਅਨੁਭਵ ਬਾਅਦ ਵਿੱਚ ਲਿਆਉਣ ਦੀ ਯੋਜਨਾ ਹੈ।',
    gameTitle: 'ਦਿਊਤ ਸਭਾ',
    gameSubtitle: 'ਸਭਾ ਪਰਵ ਤੋਂ ਪ੍ਰੇਰਿਤ ਪਾਸਿਆਂ ਦਾ ਅਨੁਭਵ',
    boardTitle: 'ਸਭਾ ਦੀ ਮੇਜ਼',
    versus: 'ਬਨਾਮ',
    backLabel: 'ਵਾਪਸ',
    offlineLabel: 'ਆਫ਼ਲਾਈਨ · ਖਾਤੇ ਦੀ ਲੋੜ ਨਹੀਂ',
    guideName: 'ਸਾਥੀ',
    guideRule: 'ਇਸ ਪੱਧਰ ਤੇ ਸਾਥੀ ਘੱਟ ਅੰਕ ਵਾਲਾ ਪਾਸਾ {threshold} ਆਉਣ ਤੇ ਮੁੜ ਸੁੱਟਦਾ ਹੈ। ਪਾਸਿਆਂ ਦੀ ਸੰਭਾਵਨਾ ਨਹੀਂ ਬਦਲਦੀ।',
    modeTitle: 'ਖੇਡਣ ਦਾ ਤਰੀਕਾ ਚੁਣੋ',
    soloMode: 'ਸਾਥੀ ਨਾਲ ਇਕੱਲੇ',
    passAndPlayMode: 'ਵਾਰੀ-ਵਾਰੀ ਖੇਡੋ',
    passPlayDescription: 'ਦੋ ਜਣੇ ਇਸੇ ਡਿਵਾਈਸ ਤੇ ਵਾਰੀ-ਵਾਰੀ ਖੇਡੋ। ਖਾਤੇ ਜਾਂ ਇੰਟਰਨੈੱਟ ਦੀ ਲੋੜ ਨਹੀਂ।',
    passPlayRulesBody: 'ਦੋ ਖਿਡਾਰੀ ਇੱਕੋ ਡਿਵਾਈਸ ਤੇ ਖੇਡਦੇ ਹਨ। ਹਰ ਵਾਰੀ ਤੋਂ ਪਹਿਲਾਂ ਡਿਵਾਈਸ ਦੂਜੇ ਖਿਡਾਰੀ ਨੂੰ ਦਿਓ ਅਤੇ “ਡਿਵਾਈਸ ਮੇਰੇ ਕੋਲ ਹੈ” ਚੁਣੋ। ਹਰ ਵਾਰੀ ਵਿੱਚ ਉਹੀ ਦੋ ਪਾਸੇ, ਇੱਕ ਪਾਸੇ ਨੂੰ ਇੱਕ ਵਾਰ ਮੁੜ ਸੁੱਟਣ ਦਾ ਵਿਕਲਪ ਅਤੇ ਅੰਕਾਂ ਦਾ ਜੋੜ ਲਾਗੂ ਹੋਵੇਗਾ। ਪੰਜ ਦੌਰਾਂ ਤੋਂ ਬਾਅਦ ਵੱਧ ਅੰਕ ਜਿੱਤਦੇ ਹਨ; ਬਰਾਬਰੀ ਤੇ ਖੇਡ ਬਰਾਬਰ ਰਹਿੰਦੀ ਹੈ।',
    rollPrompt: 'ਦੋ ਪਾਸੇ ਸੁੱਟੋ, ਫਿਰ ਦੋਵੇਂ ਰੱਖੋ ਜਾਂ ਇੱਕ ਪਾਸਾ ਇੱਕ ਵਾਰ ਮੁੜ ਸੁੱਟੋ।',
    playerOneLabel: 'ਖਿਡਾਰੀ 1 ਦਾ ਨਾਮ',
    playerTwoLabel: 'ਖਿਡਾਰੀ 2 ਦਾ ਨਾਮ',
    handoffPrompt: 'ਡਿਵਾਈਸ {name} ਨੂੰ ਦਿਓ। ਪਾਸਿਆਂ ਵਾਲੀ ਥਾਂ ਤੋਂ ਪਿਛਲੀ ਵਾਰੀ ਦਾ ਨਤੀਜਾ ਹਟਾ ਦਿੱਤਾ ਹੈ।',
    namedTurn: '{name} ਦੀ ਵਾਰੀ',
    continueTurn: 'ਡਿਵਾਈਸ ਮੇਰੇ ਕੋਲ ਹੈ',
    playerWon: '{name} ਇਹ ਖੇਡ ਜਿੱਤਿਆ',
    opponentWon: '{name} ਇਹ ਖੇਡ ਜਿੱਤਿਆ',
    round: 'ਦੌਰ',
    yourTurn: 'ਤੁਹਾਡੀ ਵਾਰੀ',
    guideTurn: 'ਸਾਥੀ ਦੀ ਵਾਰੀ',
    player: 'ਤੁਸੀਂ',
    score: 'ਅੰਕ',
    firstDie: 'ਪਹਿਲਾ ਪਾਸਾ',
    secondDie: 'ਦੂਜਾ ਪਾਸਾ',
    roll: 'ਪਾਸੇ ਸੁੱਟੋ',
    keep: 'ਦੋਵੇਂ ਰੱਖੋ',
    chooseAction: 'ਦੋਵੇਂ ਪਾਸੇ ਰੱਖੋ ਜਾਂ ਸਿਰਫ਼ ਇੱਕ ਪਾਸਾ ਇੱਕ ਵਾਰ ਮੁੜ ਸੁੱਟੋ।',
    rerollFirst: 'ਪਹਿਲਾ ਪਾਸਾ ਮੁੜ ਸੁੱਟੋ',
    rerollSecond: 'ਦੂਜਾ ਪਾਸਾ ਮੁੜ ਸੁੱਟੋ',
    waitingForGuide: 'ਸਾਥੀ ਆਪਣੀ ਵਾਰੀ ਖੇਡ ਰਿਹਾ ਹੈ…',
    tryAgain: 'ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    startMatch: 'ਪੰਜ ਦੌਰਾਂ ਦੀ ਖੇਡ ਸ਼ੁਰੂ ਕਰੋ',
    newMatch: 'ਨਵੀਂ ਖੇਡ ਸ਼ੁਰੂ ਕਰੋ',
    changeMode: 'ਖੇਡਣ ਦਾ ਢੰਗ ਜਾਂ ਖਿਡਾਰੀ ਬਦਲੋ',
    savedMatch: 'ਤੁਹਾਡੀ ਖੇਡ ਇਸੇ ਡਿਵਾਈਸ ਤੇ ਸੰਭਾਲੀ ਗਈ ਹੈ।',
    saveUnavailable: 'ਖੇਡ ਜਾਰੀ ਹੈ, ਪਰ ਇਸਨੂੰ ਇਸ ਡਿਵਾਈਸ ਤੇ ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।',
    winTitle: 'ਤੁਸੀਂ ਇਹ ਖੇਡ ਜਿੱਤੀ',
    guideWinTitle: 'ਸਾਥੀ ਇਹ ਖੇਡ ਜਿੱਤਿਆ',
    drawTitle: 'ਖੇਡ ਬਰਾਬਰ ਰਹੀ',
    finalScore: 'ਅੰਤਿਮ ਅੰਕ',
    matchComplete: 'ਪੰਜ ਦੌਰ ਪੂਰੇ ਹੋਏ',
    discardTitle: 'ਨਵੀਂ ਖੇਡ ਸ਼ੁਰੂ ਕਰਨੀ ਹੈ?',
    discardMessage: 'ਇਸ ਡਿਵਾਈਸ ਤੇ ਤੁਹਾਡੀ ਮੌਜੂਦਾ ਖੇਡ ਬਦਲ ਜਾਵੇਗੀ।',
    cancel: 'ਰੱਦ ਕਰੋ',
    discard: 'ਨਵੀਂ ਸ਼ੁਰੂ ਕਰੋ',
    close: 'ਖੇਡਾਂ ਵੱਲ ਵਾਪਸ',
    points: 'ਅੰਕ',
    rulesTitle: 'ਕਿਵੇਂ ਖੇਡਣਾ ਹੈ',
    rulesBody: 'ਪੰਜ ਦੌਰ ਖੇਡੋ। ਹਰ ਦੌਰ ਵਿੱਚ ਤੁਹਾਡੀ ਅਤੇ ਸਾਥੀ ਦੀ ਇੱਕ-ਇੱਕ ਵਾਰੀ ਹੋਵੇਗੀ; ਸ਼ੁਰੂਆਤੀ ਵਾਰੀ ਹਰ ਦੌਰ ਵਿੱਚ ਬਦਲਦੀ ਹੈ। ਆਪਣੀ ਵਾਰੀ ਵਿੱਚ ਦੋ ਪਾਸੇ ਸੁੱਟੋ ਅਤੇ ਅੰਤਿਮ ਅੰਕਾਂ ਦਾ ਜੋੜ ਲਵੋ। ਦੋਵੇਂ ਪਾਸੇ ਰੱਖੋ ਜਾਂ ਇੱਕ ਪਾਸਾ ਇੱਕ ਵਾਰ ਮੁੜ ਸੁੱਟੋ। ਵੱਧ ਕੁੱਲ ਅੰਕ ਜਿੱਤਦੇ ਹਨ; ਬਰਾਬਰ ਅੰਕ ਹੋਣ ਤੇ ਖੇਡ ਬਰਾਬਰ ਰਹਿੰਦੀ ਹੈ।',
    showRules: 'ਨਿਯਮ ਪੜ੍ਹੋ',
    hideRules: 'ਨਿਯਮ ਲੁਕਾਓ',
    difficultyTitle: 'ਸਾਥੀ ਦਾ ਔਖਿਆਈ ਪੱਧਰ',
    difficultyEasy: 'ਸੌਖਾ', difficultyMedium: 'ਦਰਮਿਆਨਾ', difficultyHard: 'ਔਖਾ',
    difficultyDescription: 'ਸੌਖੇ ਵਿੱਚ 1 ਤੇ, ਦਰਮਿਆਨੇ ਵਿੱਚ 1–2 ਤੇ ਅਤੇ ਔਖੇ ਵਿੱਚ 1–3 ਤੇ ਸਾਥੀ ਮੁੜ ਸੁੱਟਦਾ ਹੈ। ਪਾਸਿਆਂ ਦੀ ਸੰਭਾਵਨਾ ਇੱਕੋ ਰਹਿੰਦੀ ਹੈ।',
    factionTitle: 'ਆਪਣਾ ਪੱਖ ਚੁਣੋ', pandavas: 'ਪਾਂਡਵ', kauravas: 'ਕੌਰਵ',
    cosmeticChoice: 'ਪੱਖ, ਅਵਤਾਰ ਅਤੇ ਰੰਗ ਸਿਰਫ਼ ਦਿੱਖ ਲਈ ਹਨ। ਇਹ ਪਾਸਿਆਂ, ਅੰਕਾਂ ਜਾਂ ਮਹਾਕਾਵਿ ਦੀ ਕਥਾ ਨੂੰ ਨਹੀਂ ਬਦਲਦੇ।',
    avatarTitle: 'ਅਵਤਾਰ ਚੁਣੋ', colorTitle: 'ਬੋਰਡ ਦਾ ਰੰਗ',
    colorGold: 'ਸੁਨਹਿਰੀ', colorSage: 'ਹਰਾ', colorNavy: 'ਨੀਲਾ', colorClay: 'ਮਿੱਟੀ',
    avatarSun: 'ਸੂਰਜ', avatarMoon: 'ਚੰਦ', avatarStar: 'ਤਾਰਾ', avatarFeather: 'ਖੰਭ', avatarHeart: 'ਦਿਲ', avatarCompass: 'ਦਿਸ਼ਾ-ਸੂਚਕ',
    tutorialTitle: 'ਛੋਟੀ ਜਾਣ-ਪਛਾਣ', tutorialStart: 'ਜਾਣ-ਪਛਾਣ ਸ਼ੁਰੂ ਕਰੋ', tutorialReplay: 'ਮੁੜ ਵੇਖੋ', tutorialStep: 'ਕਦਮ {step} / 3', tutorialNext: 'ਅੱਗੇ', tutorialDone: 'ਜਾਣ-ਪਛਾਣ ਪੂਰੀ ਕਰੋ',
    tutorialRoll: 'ਦੋ ਨਿਰਪੱਖ ਛੇ-ਪਾਸਿਆਂ ਵਾਲੇ ਪਾਸੇ ਸੁੱਟੋ। ਦੋਹਾਂ ਪੱਖਾਂ ਲਈ ਪਾਸਿਆਂ ਦੀ ਸੰਭਾਵਨਾ ਇੱਕੋ ਹੈ।',
    tutorialChoice: 'ਦੋਵੇਂ ਪਾਸੇ ਰੱਖੋ ਜਾਂ ਸਿਰਫ਼ ਇੱਕ ਪਾਸਾ ਇੱਕ ਵਾਰੀ ਮੁੜ ਸੁੱਟੋ। ਦੂਜਾ ਪਾਸਾ ਨਹੀਂ ਬਦਲੇਗਾ।',
    tutorialScore: 'ਅੰਤਿਮ ਪਾਸਿਆਂ ਦੇ ਅੰਕ ਜੋੜੋ। ਪੰਜ ਦੌਰਾਂ ਤੋਂ ਬਾਅਦ ਵੱਧ ਕੁੱਲ ਅੰਕ ਜਿੱਤਦੇ ਹਨ; ਬਰਾਬਰੀ ਤੇ ਖੇਡ ਬਰਾਬਰ ਰਹਿੰਦੀ ਹੈ। ਇਹ ਇਸ ਅਨੁਭਵ ਲਈ Shoonaya ਵੱਲੋਂ ਵਿਆਖਿਆ ਕੀਤੇ ਨਿਯਮ ਹਨ।',
    factsTitle: 'ਖੇਡ ਬਾਰੇ ਨੋਟ', factsProgress: '{count} / 3 ਨੋਟ ਖੁੱਲ੍ਹੇ', factsLocked: 'ਸਰੋਤਾਂ ਵਾਲੇ ਨੋਟ ਖੋਲ੍ਹਣ ਲਈ ਜਾਣ-ਪਛਾਣ ਅਤੇ ਖੇਡਾਂ ਪੂਰੀਆਂ ਕਰੋ।',
    factOne: 'ਦਿਊਤ ਸਭਾ ਰਵਾਇਤੀ ਪੇਸ਼ਕਾਰੀ ਨਾਲ Shoonaya ਵੱਲੋਂ ਵਿਆਖਿਆ ਕੀਤੀ ਖੇਡ ਵਰਤਦੀ ਹੈ। ਛੇ-ਪਾਸਿਆਂ ਵਾਲੇ ਪਾਸੇ ਅਤੇ ਮੁੜ ਸੁੱਟਣ ਨੂੰ ਸਭਾ ਪਰਵ ਦੇ ਇਤਿਹਾਸਕ ਨਿਯਮ ਨਹੀਂ ਕਿਹਾ ਗਿਆ।',
    factTwo: 'BORI Critical Edition ਵਿੱਚ ਪਾਸਿਆਂ ਦਾ ਪ੍ਰਸੰਗ ਕਿਤਾਬ 2, ਸਭਾ ਪਰਵ ਦੇ ਦਿਊਤ ਪ੍ਰਸੰਗ ਵਿੱਚ ਆਉਂਦਾ ਹੈ।',
    factThree: 'ਪਾਠ ਵਿੱਚ ਸ਼ਕੁਨੀ ਦੁਰਯੋਧਨ ਵੱਲੋਂ ਖੇਡਦਾ ਹੈ, ਪਰ ਖੇਡ ਨੂੰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਦੁਹਰਾਉਣ ਦੀ ਪ੍ਰਕਿਰਿਆ ਨਹੀਂ ਦਿੱਤੀ ਗਈ।',
    factSourceLabel: 'ਸਰੋਤ', settingsTitle: 'ਖੇਡ ਸੈਟਿੰਗਾਂ', hapticsTitle: 'ਬਟਨ ਕੰਪਨ', hapticsDescription: 'ਖੇਡ ਦੀਆਂ ਕਾਰਵਾਈਆਂ ਤੇ ਹੌਲਾ ਕੰਪਨ ਵਰਤੋ।', enabled: 'ਚਾਲੂ', disabled: 'ਬੰਦ',
    savedMatchesTitle: 'ਸੰਭਾਲੀਆਂ ਖੇਡਾਂ', saveCopy: 'ਕਾਪੀ ਸੰਭਾਲੋ', loadSave: 'ਖੋਲ੍ਹੋ', deleteSave: 'ਮਿਟਾਓ', noSavedMatches: 'ਹਾਲੇ ਕੋਈ ਸੰਭਾਲੀ ਕਾਪੀ ਨਹੀਂ।', saveSlotsFull: 'ਸਾਰੀਆਂ ਪੰਜ ਥਾਵਾਂ ਭਰੀਆਂ ਹਨ। ਹੋਰ ਕਾਪੀ ਲਈ ਇੱਕ ਮਿਟਾਓ।', loadSaveTitle: 'ਇਹ ਖੇਡ ਖੋਲ੍ਹਣੀ ਹੈ?', loadSaveMessage: 'ਮੌਜੂਦਾ ਆਪਣੇ-ਆਪ ਸੰਭਾਲੀ ਖੇਡ ਇਸ ਸੇਵ ਨਾਲ ਬਦਲ ਜਾਵੇਗੀ।', savedAt: 'ਸੰਭਾਲਿਆ: {date}', deleteSaveMessage: 'ਇਹ ਸੰਭਾਲੀ ਕਾਪੀ ਇਸ ਡਿਵਾਈਸ ਤੋਂ ਮਿਟ ਜਾਵੇਗੀ।', saveFailed: 'ਕਾਪੀ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ। ਤੁਹਾਡੀ ਮੌਜੂਦਾ ਖੇਡ ਆਪਣੇ-ਆਪ ਸੰਭਾਲੀ ਗਈ ਹੈ।',
  },
};
