/**
 * Shoonaya — Dharm Veer
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Handcrafted stories of forgotten and underappreciated heroes of Dharma.
 * Covers all four traditions — Hindu, Sikh, Buddhist, Jain — with genuine
 * depth: real trials, real sacrifice, real wisdom.
 *
 * A new hero surfaces on the home card every day via getDharmVeerOfTheDay().
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface DharmVeer {
  id: string;
  name: string;
  nameLocal?: string;
  namePa?: string;
  era: string;
  eraLocal?: string;
  eraPa?: string;
  tradition: 'hindu' | 'sikh' | 'buddhist' | 'jain' | 'sufi' | 'tribal';
  region: string;
  regionLocal?: string;
  regionPa?: string;
  emoji: string;
  tagline: string;
  taglineLocal?: string;
  taglinePa?: string;
  /** 2–3 paragraph account of their life and mission */
  journey: string;
  journeyLocal?: string;
  journeyPa?: string;
  /** The defining test, sacrifice, or trial they endured */
  trial: string;
  trialLocal?: string;
  trialPa?: string;
  /** Their core teaching in plain language */
  teaching: string;
  teachingLocal?: string;
  teachingPa?: string;
  /** The moral for a modern seeker */
  moral: string;
  moralLocal?: string;
  moralPa?: string;
  /** How their legacy shaped the tradition or society */
  legacy?: string;
  legacyLocal?: string;
  legacyPa?: string;
  /** Primary scriptural or historical source */
  source?: string;
  sourceLocal?: string;
  sourcePa?: string;
  /** Detailed canonical citations with book/chapter/parva references */
  sourceCitations?: Array<{
    sourceName: string;
    sourceRef?: string;
    tier?: number;
  }>;
  /** Scene description for illustration — evokes their most iconic moment */
  illustrationPrompt?: string;
  quote?: {
    text: string;
    attribution: string;
  };
  quoteLocal?: {
    text: string;
    attribution: string;
  };
  quotePa?: {
    text: string;
    attribution: string;
  };
}

/**
 * Picks which language's text to show for a given field, given the viewer's
 * resolved local-content language. Punjabi falls back to Hindi (not English)
 * when a specific row hasn't been backfilled with Punjabi yet, so a
 * Punjabi-preferring reader still sees local-script content rather than a
 * sudden drop to English. Mirrors the backend's identical helper in
 * src/lib/dharm-veer.ts (Sanatan Sangam/Shoonaya).
 */
export function pickDharmVeerLocalizedText(
  english: string | undefined,
  hindi: string | undefined,
  punjabi: string | undefined,
  contentLanguage: 'hi' | 'pa',
): string | undefined {
  if (contentLanguage === 'pa') return punjabi || hindi || english;
  return hindi || english;
}

export const DHARM_VEERS: DharmVeer[] = [
  {
    "id": "sri-krishna",
    "name": "Sri Krishna",
    "nameLocal": "श्री कृष्ण",
    "era": "Dwapara Yuga",
    "eraLocal": "द्वापर युग",
    "tradition": "hindu",
    "region": "Mathura / Vrindavan / Dwarka",
    "regionLocal": "मथुरा / वृंदावन / द्वारका",
    "emoji": "🦚",
    "tagline": "The Yogeshwara and divine guide who upheld cosmic order without personal attachment, revealing the eternal path of Nishkama Karma to humanity.",
    "taglineLocal": "योगेश्वर जिन्होंने अनासक्त होकर धर्म की स्थापना की और निष्काम कर्मयोग का शाश्वत मार्ग प्रकाशित किया।",
    "journey": "Krishna was born in the midnight darkness of a subterranean prison cell in Mathura, where his parents Devaki and Vasudeva were held in chains by the tyrant king Kamsa. To preserve the divine infant from his uncle's murderous edict, Vasudeva bore him in a wicker basket through torrential monsoon storms across the miraculously parting Yamuna river to the pastoral sanctuary of Gokula. In the idyllic pastures of Vraja and the sacred groves of Vrindavan, Krishna’s childhood unfolded as a sublime tapestry of divine play (leela)—enchanting cowherds with his celestial flute, redistributing milk and butter to disrupt exploitation, liberating cursed spirits, subduing the venomous serpent Kaliya in the depths of the river, and lifting the vast Govardhana mountain on the tip of his little finger for seven continuous days and nights to shelter the vulnerable villagers from Indra’s wrathful deluge.\n\nAs youth dawned, Krishna stepped decisively from pastoral innocence onto the stage of civilizational duty. He entered Mathura, overthrew and slew the tyrant Kamsa, liberated his imprisoned parents, and restored his grandfather Ugrasena to the throne without claiming sovereignty for himself. When the emperor Jarasandha of Magadha mounted seventeen successive military sieges against Mathura, Krishna demonstrated strategic wisdom over vanity by relocating his people westward to the Saurashtra coast, constructing the impregnable island citadel of Dwarka to ensure long-term peace and prosperity for the Yadava confederacy. Throughout Aryavarta, he acted as the unyielding patron of virtue, entering into an indissoluble spiritual bond with the Pandava brothers and championing the reclamation of righteousness.\n\nAt the ultimate crossroad of Kurukshetra, amidst the assembling of eighteen colossal akshauhinis of warriors, Krishna chose to enter the battlefield without bearing weapons, serving humbly as the charioteer (Partha-sarathi) to his beloved friend Arjuna. Positioned between the two roaring armies poised for cataclysmic fratricide, when Arjuna collapsed in moral paralysis, grief, and confusion, Krishna revealed the seventy-four chapters of the Srimad Bhagavad Gita. Displaying his terrifying and awe-inspiring Vishwarupa (Cosmic Form), Krishna reconciled selfless action (Karma Yoga), divine contemplation (Jnana Yoga), and unconditional surrender (Bhakti Yoga), offering humanity the supreme metaphysical compass for navigating ethical crises across all generations.",
    "journeyLocal": "श्री कृष्ण का जन्म द्वापर युग में मथुरा के अंधेरे कारागार में हुआ था, जहाँ उनके माता-पिता देवकी और वसुदेव कंस के क्रूर कारावास में बंद थे। अत्याचारी कंस के संहारक आदेशों से बालक की रक्षा के लिए, वसुदेव जी यमुना पार कर उन्हें रातों-रात गोकुल में नंदबाबा और यशोदा के घर पहुँचा आए। गोकुल और वृंदावन की पावन भूमि में कन्हैया का बाल्यकाल दिव्य लीलाओं से परिपूर्ण रहा—अपनी मोहिनी मुरली से गोप-ग्वालों को आनंदित करना, माखन की चोरी से समाज के अभावों को दूर करना, कालिया नाग का दमन कर यमुना को शुद्ध करना, और देवराज इंद्र के अहंकार को तोड़कर सात दिनों तक कनिष्ठिका अंगुली पर विशाल गोवर्धन पर्वत धारण कर समस्त ब्रजवासियों की रक्षा करना।\n\nयौवन के पदार्पण के साथ ही कृष्ण ने बाल-लीलाओं से विदा लेकर लोक-धर्म की स्थापना का बीड़ा उठाया। मथुरा पहुँचकर उन्होंने अत्याचारी कंस का वध किया, माता-पिता को कारागार से मुक्त कराया, और स्वयं सिंहासन न लेकर राजा उग्रसेन को पुनः प्रतिष्ठित किया। जब मगधराज जरासंध ने मथुरा पर सत्रह बार आक्रमण किए, तो प्रजा के प्राणों की रक्षा हेतु उन्होंने कूटनीतिक विवेक अपनाते हुए पश्चिम में समुद्र तट पर अभेद्य द्वारका नगरी बसाई। उन्होंने पांडवों के साथ आत्मिक मैत्री स्थापित की और धर्म की रक्षा के लिए निरंतर संघर्षरत रहे।\n\nकुरुक्षेत्र के महासमर में, जब अठारह अक्षौहिणी सेनाएं आमने-सामने खड़ी थीं, कृष्ण ने शस्त्र न उठाने का व्रत लिया और अर्जुन के सारथी (पार्थसारथी) बने। युद्ध के मुहाने पर जब अपने सगे-संबंधियों को देखकर अर्जुन मोह और विषाद से ग्रस्त होकर बैठ गया, तब योगेश्वर कृष्ण ने 'श्रीमद्भगवद्गीता' के अठारह अध्यायों का अलौकिक उपदेश दिया। अपने विराट विश्वरूप का दर्शन कराकर उन्होंने कर्मयोग, भक्तियोग और ज्ञानयोग का ऐसा अनुपम समन्वय प्रस्तुत किया जो मानव चेतना को हर युग में मोह से मुक्ति और कर्तव्य-पालन की प्रेरणा देता है।",
    "trial": "Krishna’s supreme trial was not the physical violence of war, but the profound inner agony of holding the moral equilibrium of a collapsing civilization. He endured relentless misunderstandings, slander, and betrayal from those he protected, yet never compromised the higher imperative of Dharma. He strove tirelessly through peaceful diplomacy to prevent war, entering the Kuru court as a humble peace envoy even as Duryodhana plotted to bind him in chains. Following the devastation of the Mahabharata war, when the grief-stricken Queen Gandhari cast a devastating curse upon him—condemning his entire Vrishni dynasty to fratricidal ruin—Krishna accepted the curse with unbroken serenity, bowing before the bereaved mother. Decades later, as Dwarka sank into the ocean and the Yadavas destroyed themselves in spiritual decline, Krishna retired alone to the forest and calmly welcomed the hunter Jara's stray arrow, demonstrating absolute transcendence and equanimity in the final withdrawal of his earthly manifestation.",
    "trialLocal": "श्री कृष्ण की सबसे बड़ी परीक्षा युद्ध के प्रहार नहीं, बल्कि एक युग के पतन के बीच धर्म की धुरी को थामे रहने का दारुण बोझ था। उन्होंने युद्ध को टालने के लिए शांतिदूत बनकर हस्तिनापुर की सभा में हर संभव कूटनीतिक प्रयास किया, जहाँ दुर्योधन ने उन्हें बंदी बनाने का दुस्साहस किया। युद्धोपरांत जब पुत्र-शोक में डूबी महारानी गांधारी ने अपने समस्त कुल के विनाश का दारुण शाप दिया, तो कृष्ण ने उस शाप को बिना किसी आक्रोश के, एक शांत मुस्कान के साथ सिर झुकाकर स्वीकार किया। जीवन के अंतिम क्षणों में जब द्वारका समुद्र में समा गई और प्रभास क्षेत्र में यादव आपस में लड़कर समाप्त हो गए, तब वे वन में मौन भाव से विश्राम करते हुए जरा नामक शिकारी के बाण को सहर्ष स्वीकार कर अपने परम धाम पधारे।",
    "teaching": "Krishna revealed the timeless doctrine of Nishkama Karma: perform your ordained duties with utmost perfection and devotion, but abandon all selfish attachment to the fruits. Renunciation is not the desertion of worldly responsibilities or the forest hermit’s flight; it is the inner renunciation of egotism and personal desire. When action is offered as a sacred sacrifice (yajna) to the divine, the mind is purified and one attains liberation while actively engaged in the world.",
    "teachingLocal": "भगवान कृष्ण का मूल उपदेश निष्काम कर्मयोग है: अपने नियत कर्तव्यों का पूर्ण निष्ठा से पालन करें, किंतु कर्म के फल में आसक्ति का त्याग कर दें। सन्यास कर्मों के पलायन में नहीं, बल्कि कर्मों के अहंकार और स्वार्थ के त्याग में है। जब प्रत्येक कार्य ईश्वर को समर्पित यज्ञ बन जाता है, तो मनुष्य कर्म-बंधन से मुक्त होकर परम शांति और मोक्ष को प्राप्त करता है।",
    "moral": "Do not let fear, sentimental weakness, or anxiety over success and failure paralyze your duty. Stand firmly in righteousness, act with unswerving integrity, and surrender the final outcome to the cosmic order with serene equanimity.",
    "moralLocal": "कर्तव्य के समय मोह, दुर्बलता अथवा लाभ-हानि की चिंता से अपने कदम न रोकें। सत्य और धर्म के मार्ग पर अडिग रहकर कर्म करें और परिणाम को ईश्वर पर छोड़कर शांत व निर्भय रहें।",
    "legacy": "Sri Krishna forever transformed Indian spirituality and thought, integrating liberation with everyday duty and family life. The Bhagavad Gita remains humanity's premier philosophical scripture, revered globally as the supreme manual for moral action and self-realization.",
    "legacyLocal": "भगवान कृष्ण ने भारतीय जनमानस और दर्शन को वह दृष्टि दी जिसने मोक्ष को जीवन के संघर्षों और कर्तव्यों के साथ जोड़ दिया। उनकी वाणी श्रीमद्भगवद्गीता विश्व साहित्य का सर्वाधिक पठित और आदरणीय आध्यात्मिक ग्रंथ है।",
    "source": "Mahabharata (Bhishma Parva 25–42 / Bhagavad Gita), Srimad Bhagavata Purana (Skandha 10–11)",
    "sourceLocal": "महाभारत (भीष्म पर्व / श्रीमद्भगवद्गीता), श्रीमद्भागवत महापुराण (दशम व एकादश स्कंध)",
    "sourceCitations": [
      {
        "sourceName": "Srimad Bhagavad Gita",
        "sourceRef": "Chapters 1–18 (Bhishma Parva, Mahabharata)",
        "tier": 1
      },
      {
        "sourceName": "Srimad Bhagavata Purana",
        "sourceRef": "Skandha 10 (Krishna Leela) & Skandha 11 (Uddhava Gita)",
        "tier": 1
      },
      {
        "sourceName": "Harivamsha Purana",
        "sourceRef": "Vishnu Parva",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Karmanyevadhikaraste ma phaleshu kadachana, ma karmaphalaheturbhurma te sango’stvakarmani.",
      "attribution": "You have a right only to work, never to its fruits; let not the fruits of action be your motive, nor let your attachment be to inaction. — Bhagavad Gita 2.47"
    },
    "quoteLocal": {
      "text": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
      "attribution": "भगवान श्री कृष्ण (श्रीमद्भगवद्गीता २.४७)"
    }
  },
  {
    "id": "sri-rama",
    "name": "Sri Rama",
    "nameLocal": "श्री राम",
    "era": "Treta Yuga",
    "eraLocal": "त्रेता युग",
    "tradition": "hindu",
    "region": "Ayodhya / Dandakaranya / Lanka",
    "regionLocal": "अयोध्या / दंडकारण्य / लंका",
    "emoji": "🏹",
    "tagline": "The Maryada Purushottama who sacrificed his royal throne and personal happiness to uphold truth, filial piety, and the eternal order of Dharma.",
    "taglineLocal": "मर्यादा पुरुषोत्तम जिन्होंने सत्य, पितृ-वचन और लोक-कल्याण के लिए राजसिंहासन और व्यक्तिगत सुखों का सहर्ष त्याग किया।",
    "journey": "Sri Rama was born in Ayodhya as the eldest prince of King Dasharatha in the illustrious Solar dynasty (Suryavansha). Endowed with matchless valor, humility, and wisdom, he mastered the Vedic sciences and archery under Sage Vasishtha. In his youth, at the behest of Sage Vishwamitra, Rama walked into the wilderness to protect the sacred sacrifices of hermits from demonic marauders, slaying Tataka and Subahu, liberating Ahalya from her petrified slumber, and subsequently stringing and breaking the celestial Pinaka bow of Lord Shiva at King Janaka's swayamvara in Mithila to win the hand of Mata Sita in sacred marriage.\n\nOn the eve of his grand coronation as Yuvaraja of Kosala, joy turned to sorrow across Ayodhya when his stepmother Queen Kaikeyi claimed two ancient boons from King Dasharatha: fourteen years of forest exile for Rama and the crown for her son Bharata. Observing his father crushed by grief and bound by royal honor, Rama neither hesitated, questioned, nor showed a flicker of resentment. Casting aside his princely ornaments and royal garments, he donned ascetic bark and walked barefoot into the dense Dandakaranya forest, accompanied solely by the devoted Sita and his brother Lakshmana.\n\nThroughout his fourteen years in the wilderness, Rama lived as an ascetic guardian of hermits and forest tribes, sanctifying places like Chitrakoot and Panchavati. When the demon emperor Ravana abducted Sita through deceit, Rama did not raise an imperial army from Ayodhya. Instead, he forged a sacred alliance of love and mutual respect with the Vanara kingdom of Kishkindha and the grief-stricken Sugriva. Building the miraculous Rama Setu stone bridge across the roaring southern sea, he led an army of forest-dwellers against the golden fortress of Lanka, vanquishing Ravana and reinstating Dharma. Returning to Ayodhya, his reign (Ram Rajya) established the eternal civilizational paradigm of just, selfless, and compassionate governance.",
    "journeyLocal": "श्री राम का जन्म अयोध्या के प्रतापी सूर्यवंश में महाराज दशरथ और महारानी कौशल्या के ज्येष्ठ पुत्र के रूप में हुआ था। अनुपम पराक्रम, शील और मर्यादा के धनी श्री राम ने महर्षि वशिष्ठ के चरणों में समस्त वेद और धनुर्विद्या की शिक्षा प्राप्त की। किशोरावस्था में ही महर्षि विश्वामित्र के यज्ञ की रक्षा हेतु वे वन गए, जहाँ उन्होंने ताड़का व सुबाहु जैसे निशाचरों का वध किया और ऋषि-पत्नी अहल्या का उद्धार किया। जनकपुर में राजा जनक के स्वयंवर में भगवान शिव के दिव्य पिनाक धनुष पर प्रत्यंचा चढ़ाकर उन्होंने जगत-जननी माता सीता का वरण किया।\n\nजब अयोध्या में उनके राज्याभिषेक का महोत्सव होने वाला था, तभी माता कैकेयी ने राजा दशरथ से अपने दो पुराने वचनों की मांग की: राम को चौदह वर्ष का वनवास और भरत को राजगद्दी। पिता को धर्म-संकट में देखकर श्री राम ने एक क्षण भी संकोच नहीं किया। उन्होंने राजसी सुख-सुविधाओं को त्याग दिया, वल्कल वस्त्र धारण किए और माता सीता तथा अनुज लक्ष्मण के साथ नंगे पांव वन की ओर प्रस्थान कर दिया।\n\nचौदह वर्षों के वनवास काल में श्री राम ने दंडकारण्य, चित्रकूट और पंचवटी में ऋषियों की रक्षा की और वनवासी समाज को संगठित किया। जब लंकापति रावण ने छलपूर्वक सीता जी का हरण किया, तो श्री राम ने अयोध्या की सेना नहीं बुलाई। उन्होंने किष्किंधा के वानरों और रीछों के साथ मैत्री की, समुद्र पर राम सेतु का निर्माण किया, और अहंकारी रावण का संहार कर धर्म की पताका फहराई। अयोध्या लौटने पर उनका शासन 'राम राज्य' के रूप में लोक-कल्याण और सुशासन का शाश्वत आदर्श बना।",
    "trial": "Sri Rama’s defining trial was the lifelong crucible of self-abnegation—surrendering every personal happiness for the sanctity of Dharma and the welfare of his subjects. He bore the agony of seeing his beloved father die of heartbreak, endured the harshness of forest exile, suffered the unbearable pangs of Sita’s abduction, and fought a monumental war against an invincible foe. Yet his greatest sorrow lay in the agonizing sacrifice of his own domestic happiness as king, when he relinquished living with his pregnant queen Sita to preserve the unblemished faith and moral authority of the royal throne before his questioning subjects, bearing the solitude of kingship with silent tears and an icon of gold Sita by his side during sacrificial rites.",
    "trialLocal": "श्री राम की सबसे कठिन परीक्षा उनका निरंतर आत्म-बलिदान थी। उन्होंने अपने जीवन में कभी अपने व्यक्तिगत सुख को धर्म और मर्यादा से ऊपर नहीं रखा। वनवास का कष्ट, पिता का वियोग, सीता हरण की दारुण व्यथा, और लंका का भीषण संग्राम—हर मोड़ पर उन्होंने धैर्य और मर्यादा का परिचय दिया। राजा बनने के बाद भी जब एक साधारण प्रजाजन के संशय पर उन्होंने गर्भवती सीता का त्याग किया, तो यह उनके व्यक्तिगत हृदय का चीरहरण था, किंतु राजधर्म की वेदी पर उन्होंने अपने समस्त सुखों को न्योछावर कर दिया और अश्वमेध यज्ञ में स्वर्ण सीता की प्रतिमा के साथ यज्ञ संपन्न किया।",
    "teaching": "Rama demonstrated that Dharma is not an intellectual abstraction, but the rigorous practice of truth (Satya), righteous conduct (Achara), and unyielding commitment to promises made. True leadership requires leaders to bear the heaviest sacrifices, placing the welfare of family, society, and subjects above personal rights and pleasures.",
    "teachingLocal": "श्री राम का जीवन संदेश देता है कि धर्म कोई अमूर्त विचार नहीं, बल्कि सत्य, शील और मर्यादा का आचरण है। रघुकुल की मर्यादा प्राणों से भी बढ़कर है। एक सच्चे नेता और सेवक को समाज के कल्याण के लिए अपने व्यक्तिगत सुख और स्वार्थ का पूर्ण समर्पण करना पड़ता है।",
    "moral": "Integrity is doing the righteous deed when it costs you everything. When faced with trials, honor your vows, treat all living beings with dignity, and choose duty over transient convenience.",
    "moralLocal": "सत्यनिष्ठा वह है जो हर परिस्थिति में अटल रहे। कठिन से कठिन समय में भी अपने वचनों और मर्यादा का पालन करें तथा स्वार्थ की तुलना में सदा कर्तव्य को प्राथमिकता दें।",
    "legacy": "Sri Rama established the archetype of the righteous ruler and the ideal human being. The concept of Ram Rajya remains the foundational vision of righteous governance, inspiring saints, poets, freedom fighters, and leaders across thousands of years.",
    "legacyLocal": "मर्यादा पुरुषोत्तम राम ने आदर्श पुत्र, आदर्श भ्राता, आदर्श पति और आदर्श राजा के मानदंड स्थापित किए। 'राम राज्य' आज भी सुशासन, समरसता और न्यायप्रिय शासन का विश्वव्यापी प्रतीक माना जाता है।",
    "source": "Valmiki Ramayana (Bala to Uttara Kanda), Ramcharitmanas of Goswami Tulsidas",
    "sourceLocal": "वाल्मीकि रामायण (बालकाण्ड से उत्तरकाण्ड), गोस्वामी तुलसीदास कृत श्रीरामचरितमानस",
    "sourceCitations": [
      {
        "sourceName": "Valmiki Ramayana",
        "sourceRef": "Ayodhya Kanda (Sargas 18–34) & Yuddha Kanda",
        "tier": 1
      },
      {
        "sourceName": "Ramcharitmanas",
        "sourceRef": "Ayodhya Kanda (Doha 27–45)",
        "tier": 1
      },
      {
        "sourceName": "Adhyatma Ramayana",
        "sourceRef": "Ayodhya Kanda",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Ramo vigrahavan dharmah, sadhu satya-parakramah; Raja sarvasya lokasya, devanamiva vasavah.",
      "attribution": "Rama is the very embodiment of Dharma, a saint of truth and righteousness, who governs the world like Indra rules the gods. — Valmiki Ramayana 3.37.13 (Maricha)"
    },
    "quoteLocal": {
      "text": "रामो विग्रहवान् धर्मः साधुः सत्यपराक्रमः। राजा सर्वस्य लोकस्य देवानाम् इव वासवः॥",
      "attribution": "वाल्मीकि रामायण (अरण्यकाण्ड ३७.१३ — मारीच वचन)"
    }
  },
  {
    "id": "arjuna",
    "name": "Arjuna",
    "nameLocal": "अर्जुन",
    "era": "Dwapara Yuga",
    "eraLocal": "द्वापर युग",
    "tradition": "hindu",
    "region": "Indraprastha / Hastinapura / Kurukshetra",
    "regionLocal": "इंद्रप्रस्थ / हस्तिनापुर / कुरुक्षेत्र",
    "emoji": "🏹",
    "tagline": "The peerless wielder of the Gandiva bow who confronted his deepest despair on the battlefield and surrendered his ego to become the divine instrument of cosmic justice.",
    "taglineLocal": "गांडीवधारी महाधनुर्धर जिन्होंने कुरुक्षेत्र में विषाद पर विजय पाकर अपने अहंकार को त्यागा और धर्म की स्थापना के दिव्य साधन बने।",
    "journey": "Arjuna, the third of the Pandava brothers and spiritual son of Indra, was born as the paragon of martial dedication, unwavering focus, and intellectual discipline. Under the tutelage of Guru Dronacharya, his singular concentration became legendary; while other princes saw branches and leaves during an archery test, Arjuna perceived only the eye of the wooden bird. He mastered every branch of divine warfare, winning the celestial Gandiva bow from Agni and obtaining the Pasupatastra from Lord Shiva through grueling Himalayan tapasya on the peak of Indrakila. At the swayamvara of Princess Draupadi in Panchala, his unmatched marksmanship struck the revolving target by looking only at its reflection in oil, binding the fortunes of the Pandavas.\n\nYet, despite his peerless prowess, Arjuna’s life was an unbroken sequence of trials, humiliations, and forced exiles. He endured thirteen years of forest wandering and lived disguised as the eunuch dance teacher Brihannala in the court of King Virata during their year of concealment. Throughout every trial, he bore the burden of being the military pillar of the righteous cause, refusing to surrender to bitterness or despair.\n\nWhen the monumental war at Kurukshetra was finally joined, Arjuna stood upon his great chariot drawn by four white steeds, with Hanuman on his banner and Bhagavan Sri Krishna at the reins. But as the conches sounded and the battle lines drew taut, looking across at his revered teacher Drona, his grand-uncle Bhishma, and his kinsmen, Arjuna’s knees shook, his mouth dried, and the mighty Gandiva slipped from his nerveless fingers. In this profound crisis of moral conscience, Arjuna laid bare his vulnerability to Krishna, listening with open humility to the Bhagavad Gita until his doubts were incinerated in the fire of spiritual wisdom. Reclaiming his bow, he fought not out of personal hatred, but as a consecrated instrument (Nimitta-matra) of cosmic destiny, leading the Pandavas to victory over adharma.",
    "journeyLocal": "अर्जुन, पांडु और कुंती के तृतीय पुत्र तथा देवराज इंद्र के अंशावतार, एकाग्रता, समर्पण और पुरुषार्थ के अद्वितीय प्रतीक थे। गुरु द्रोणाचार्य की छत्रछाया में उनकी एकाग्रता की मिसाल इतिहास में अमर हो गई; जब अन्य शिष्यों को पेड़ और शाखाएं दिखती थीं, अर्जुन को केवल चिड़िया की आंख दिखाई देती थी। उन्होंने हिमालय में इंद्रकील पर्वत पर भगवान शिव की कठोर तपस्या कर पाशुपतास्त्र प्राप्त किया और अग्निदेव से दिव्य गांडीव धनुष तथा अक्षय तरकश प्राप्त किए। पांचाल नरेश द्रुपद के स्वयंवर में तेल के पात्र में परछाईं देखकर घूमते हुए मत्स्य की आंख को भेदकर उन्होंने द्रौपदी का वरण किया।\n\nअतुलनीय सामर्थ्य के स्वामी होते हुए भी अर्जुन का जीवन निरंतर संघर्षों से भरा रहा। लाक्षागृह के षड्यंत्र से लेकर बारह वर्ष के वनवास और विराट नगर में 'बृहन्नला' के वेश में एक वर्ष के अज्ञातवास तक, उन्होंने प्रत्येक परीक्षा को धैर्य और विनम्रता से सहा। वे सदैव पांडवों के सबसे बड़े संबल और धर्म के रक्षक बने रहे।\n\nकुरुक्षेत्र के महासमर में, जब दोनों ओर की सेनाएं शंखनाद कर रही थीं, अर्जुन के रथ की बागडोर स्वयं जगदीश्वर श्री कृष्ण के हाथों में थी। किंतु जब अर्जुन ने सामने खड़े अपने परम पूज्य भीष्म पितामह, गुरु द्रोणाचार्य और बंधु-बांधवों को देखा, तो उनका हृदय करुणा और विषाद से भर गया। उनके हाथ से गांडीव छूट गया और वे रथ के पिछले भाग में बैठ गए। इसी आत्मिक संकट के क्षण में अर्जुन ने संपूर्ण समर्पण के साथ श्री कृष्ण से ज्ञान की याचना की। अठारह अध्यायों के दिव्य उपदेश और विश्वरूप के दर्शन के पश्चात अर्जुन का मोह नष्ट हुआ। उन्होंने स्वयं को ईश्वर का 'निमित्त मात्र' मानकर पुनः गांडीव उठाया और धर्म की विजय सुनिश्चित की।",
    "trial": "Arjuna’s supreme crucible was not facing lethal weapons or monstrous foes, but overcoming the devastating spiritual paralysis of Vishada (existential dejection). On the eve of war, his intellect fractured between the duty of a Kshatriya to eradicate evil and the familial grief of slaying the elders who had cradled him as a child. He was forced to shatter his own heart, releasing arrows against Bhishma who had raised him and Drona who had taught him how to shoot. In enduring the unbearable grief of losing his brilliant son Abhimanyu in the slaughter of the Chakravyuha, Arjuna transformed his sorrow into fiery resolve, executing his vows with terrifying focus while keeping his inner soul anchored in Krishna’s transcendent teachings.",
    "trialLocal": "अर्जुन की सबसे कठिन परीक्षा युद्धभूमि में शत्रुओं के बाण नहीं, बल्कि उनका अपना अंतर्द्वंद्व और विषाद था। जिस भीष्म की गोद में वे बचपन में खेले थे और जिस द्रोण ने उन्हें धनुर्धर बनाया था, उन्हीं के वक्षस्थल पर बाण चलाना किसी भी वीर के लिए आत्मा के चीरहरण जैसा था। चक्रव्यूह में अपने वीर पुत्र अभिमन्यु के निर्मम वध का दारुण समाचार सुनकर अर्जुन का हृदय विदीर्ण हो गया, किंतु उन्होंने अपने व्यक्तिगत शोक को धर्म-युद्ध के संकल्प में बदला और प्रतिज्ञा पूर्ण कर धर्म की मर्यादा की रक्षा की।",
    "teaching": "Arjuna exemplified that self-doubt and ethical anxiety are not signs of weakness, but the necessary threshold of spiritual awakening. Spiritual victory requires the utter surrender of personal agency: recognize that the Divine is the ultimate architect of destiny, cast aside the delusion of being the solitary doer, and become a pure, willing instrument (Nimitta-matra) of the cosmic good.",
    "teachingLocal": "अर्जुन का जीवन सिखाता है कि जब मन में संशय और विषाद उठे, तो सद्गुरु की शरण में जाकर अहंकार का विसर्जन कर देना चाहिए। मनुष्य को यह समझना चाहिए कि वह कर्ता नहीं, बल्कि उस परम सत्ता का एक साधन (निमित्त) है। जब हम अपने कर्मों को ईश्वर की इच्छा से जोड़ देते हैं, तो कोई भी भय या मोह हमें कर्तव्य से विचलित नहीं कर सकता।",
    "moral": "True mastery is not merely external competence, but the humility to seek guidance when your understanding fails. Face your inner Kurukshetra with courage, slay the illusions of ego, and act with unswerving faith.",
    "moralLocal": "सच्ची वीरता केवल बाहुबल में नहीं, बल्कि अपने अंतर्मन के भय और मोह को जीतने में है। जीवन के हर संघर्ष में अहंकार को त्यागकर सत्य और ईश्वर के प्रति समर्पित रहें।",
    "legacy": "Arjuna represents the archetypal spiritual seeker (Nara) guided by the Supreme Lord (Narayana). His dialogue with Krishna gave humanity the Bhagavad Gita, forever establishing that the highest state of yoga can be attained in the thick of worldly duty.",
    "legacyLocal": "अर्जुन 'नर' के और श्री कृष्ण 'नारायण' के प्रतीक हैं। अर्जुन की जिज्ञासा और समर्पण के कारण ही संपूर्ण मानव जाति को श्रीमद्भगवद्गीता जैसा अमूल्य प्रकाश स्तंभ प्राप्त हुआ।",
    "source": "Mahabharata (Udyoga, Bhishma, Drona, and Karna Parvas), Srimad Bhagavad Gita",
    "sourceLocal": "महाभारत (उद्योग, भीष्म, द्रोण व कर्ण पर्व), श्रीमद्भगवद्गीता",
    "sourceCitations": [
      {
        "sourceName": "Mahabharata",
        "sourceRef": "Bhishma Parva (Gita Parva, Chapters 25–42)",
        "tier": 1
      },
      {
        "sourceName": "Mahabharata",
        "sourceRef": "Drona Parva (Abhimanyu-badha & Jayadratha-badha Parvas)",
        "tier": 1
      },
      {
        "sourceName": "Mahabharata",
        "sourceRef": "Vana Parva (Indrakiladhigamana & Kirata Parvas)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Nashto mohah smritir labdha tvat-prasadan mayachyuta, sthito’smi gata-sandehah karishye vachanam tava.",
      "attribution": "My delusion is destroyed, I have regained memory through your grace, O Achyuta; I stand firm with all doubts dispelled, and I shall act according to your word. — Bhagavad Gita 18.73 (Arjuna)"
    },
    "quoteLocal": {
      "text": "नष्टो मोहः स्मृतिर्लब्धा त्वत्प्रसादान्मयाच्युत। स्थितोऽस्मि गतसंदेहः करिष्ये वचनं तव॥",
      "attribution": "अर्जुन (श्रीमद्भगवद्गीता १८.७३)"
    }
  },
  {
    "id": "karna",
    "name": "Karna",
    "nameLocal": "कर्ण",
    "era": "Dwapara Yuga",
    "eraLocal": "द्वापर युग",
    "tradition": "hindu",
    "region": "Anga / Hastinapura / Kurukshetra",
    "regionLocal": "अंग देश / हस्तिनापुर / कुरुक्षेत्र",
    "emoji": "☀️",
    "tagline": "The tragic sun-born titan of unmatched generosity (Danaveera) who remained faithful to his bond of friendship even when it cost him honor, lineage, and life.",
    "taglineLocal": "दानवीर महारथी जिन्होंने सामाजिक तिरस्कार के बावजूद अपनी दानशीलता और मित्रता के वचन पर अडिग रहकर जीवन का बलिदान दे दिया।",
    "journey": "Karna was born of the celestial Sun god Surya and the virgin princess Kunti, endowed from birth with radiant divine armor (Kavacha) and golden earrings (Kundala) that rendered him invincible to all earthly weapons. Terrified of social opprobrium, Kunti placed the newborn infant in a sealed basket and set him afloat upon the holy waters of the Ashwa river. He was rescued and tenderly raised by the royal charioteer Adhiratha and his wife Radha in Champapuri, growing up with the noble heart of a warrior beneath the humble designation of a suta-putra (charioteer’s son).\n\nDriven by an insatiable hunger for martial mastery, Karna mastered archery and approached the great warrior-sage Parashurama disguised as a brahmin to receive the knowledge of supreme astras, including the Brahmashira. When Parashurama discovered his warrior blood after Karna endured the agonizing bite of an insect without flinching so as not to wake his slumbering guru, the sage cursed him in anger that he would forget the invocation of the Brahmastra in his hour of greatest need. At the martial exhibition in Hastinapura, when Karna challenged Arjuna, he was mocked and disqualified on account of his low birth. In that humiliating hour, Prince Duryodhana stepped forward, crowned Karna the King of Anga, and offered him lifelong friendship. In return, Karna pledged his absolute, unwavering loyalty to Duryodhana.\n\nThroughout his reign as King of Anga, Karna became world-renowned as Danaveera—the supreme giver who never refused any petitioner who approached him at noon during his prayers to Surya. Even when the god Indra disguised himself as a mendicant brahmin to beg for his celestial Kavacha and Kundala to save Arjuna, Karna smilingly carved the flesh from his ribs and surrendered his divine protection, winning Indra's awe. Knowing full well on the eve of the Kurukshetra war from both Krishna and Kunti that he was the eldest Pandava and the rightful emperor of Aryavarta, Karna steadfastly refused to abandon Duryodhana in his hour of peril, marching to his tragic destiny on the battlefield with unmatched valor.",
    "journeyLocal": "महारथी कर्ण का जन्म सूर्यदेव के वरदान स्वरूप कुंती के गर्भ से हुआ था। जन्म के साथ ही वे अमरता प्रदान करने वाले दिव्य कवच और कुंडल से सुशोभित थे। लोक-लाज के भय से कुंती ने नवजात शिशु को मंजूषा में रखकर नदी में प्रवाहित कर दिया। सूत अधिरथ और उनकी पत्नी राधा ने बालक को पाया और बड़े प्रेम से पाला, जिससे वे 'राधेय' कहलाए। समाज ने उन्हें सदा 'सूतपुत्र' कहकर तिरस्कृत किया, किंतु उनके भीतर क्षत्रिय तेज धधक रहा था।\n\nधनुर्विद्या सीखने की तीव्र ललक में उन्होंने महर्षि परशुराम से दीक्षा ली। एक दिन जब गुरु उनके सिर पर सिर रखकर सो रहे थे, एक कीड़े ने कर्ण की जंघा को काट लिया। गुरु की नींद न टूटे, इसलिए कर्ण ने असह्य पीड़ा सही। रक्त देखकर परशुराम ने जान लिया कि इतनी सहनशीलता केवल क्षत्रिय में हो सकती है। छल से विद्या सीखने के कारण परशुराम ने शाप दिया कि मृत्यु के समय वे ब्रह्मास्त्र का प्रयोग भूल जाएंगे। हस्तिनापुर के रंगमंच पर जब कुल-गोत्र के नाम पर कर्ण का अपमान हुआ, तब दुर्योधन ने उन्हें गले लगाया और अंग देश का राजा बना दिया। इस उपकार के बदले कर्ण ने दुर्योधन को अपनी अटूट निष्ठा और मित्रता समर्पित कर दी।\n\nकर्ण की दानवीरता इतिहास में अद्वितीय थी। मध्याह्न में सूर्योपासना के समय जो भी याचक आता, वे उसे निराश नहीं करते थे। जब देवराज इंद्र ने ब्राह्मण वेश में अर्जुन की रक्षा के लिए उनके अमर कवच-कुंडल मांगे, तो कर्ण ने हँसते हुए अपनी त्वचा काटकर उन्हें दान कर दिया। युद्ध से पूर्व जब श्री कृष्ण और माता कुंती ने उन्हें उनका वास्तविक परिचय दिया कि वे ज्येष्ठ पांडव हैं और हस्तिनापुर के सिंहासन के अधिकारी हैं, तब भी कर्ण ने अपने मित्र दुर्योधन को संकट में छोड़कर पांडवों के पक्ष में जाने से मना कर दिया और धर्म की वेदी पर अपनी मित्रता का मान रखा।",
    "trial": "Karna’s life was an unbroken crucible of unjust destiny, cosmic rejection, and tragic integrity. Burdened by multiple curses—from Parashurama, from a grieving brahmin whose cow was accidentally slain, and from the Earth goddess Bhoomi Devi—he fought the Kurukshetra war knowing his doom was sealed. On the seventeenth day of battle, as his chariot wheel sank deep into the mire of the battlefield due to the earth's curse, and his memory of the Brahmastra evaporated under Parashurama’s curse, Karna dismounted to lift the wheel, pleading for the warrior code of chivalry. Cut down by Arjuna’s arrow at Krishna's command, Karna died as he had lived: unbroken in generosity, having gifted his remaining spiritual merits to a destitute petitioner even as his breath ebbed away upon the sands of Kurukshetra.",
    "trialLocal": "कर्ण का जीवन नियति के क्रूर प्रहारों और अभिशापों की एक लंबी गाथा था। परशुराम का शाप, ब्राह्मण का शाप और पृथ्वी देवी का शाप—इन सबने मिलकर उनके भाग्य को बांध दिया था। युद्ध के सत्रहवें दिन जब उनके रथ का पहिया धरती में धंस गया और वे परशुराम के शापवश अस्त्र विद्या भूल गए, तब वे निहत्थे होकर पहिया निकालने लगे। उसी समय श्री कृष्ण के निर्देश पर अर्जुन ने उन पर बाण चलाया। मृत्यु शैया पर पड़े होने पर भी जब सूर्यदेव ने ब्राह्मण वेश में आकर दान मांगा, तो कर्ण ने अपने स्वर्ण दंत को पत्थर से तोड़कर अंतिम दान के रूप में अर्पित कर दिया और दानवीरता का अमर इतिहास रच दिया।",
    "teaching": "Karna demonstrated the supreme grandeur of uncalculating generosity and steadfast fidelity. Yet his life also stands as a profound warning: personal loyalty and gratitude, no matter how heartfelt, must never blind a seeker to the overarching compass of universal Dharma. Associating with injustice inevitably drags even the noblest soul into tragedy.",
    "teachingLocal": "कर्ण का जीवन निःस्वार्थ दान, अटूट मित्रता और अपार धैर्य की पराकाष्ठा है। साथ ही उनका जीवन यह गंभीर चेतावनी भी देता है कि व्यक्तिगत मित्रता और कृतज्ञता कभी भी सार्वभौमिक धर्म और न्याय से बड़ी नहीं हो सकती। अधर्म का साथ देने पर महापराक्रमी और दानवीर होने पर भी पतन अवश्यंभावी हो जाता है।",
    "moral": "Give generously without expectation of reward or recognition. Honor your friendships, but ensure that your loyalties are anchored in truth rather than blind allegiance.",
    "moralLocal": "बिना किसी स्वार्थ के दान करें और दूसरों के दुख में संबल बनें। मित्रता निभाएं, परंतु इस बात का ध्यान रखें कि आपका मार्ग अधर्म और अन्याय की ढाल न बन जाए।",
    "legacy": "Karna remains the immortal benchmark for self-sacrificing charity (Danaveera) and tragic resilience in world literature. His name is invoked across India whenever selflessness and loyalty against all odds are celebrated.",
    "legacyLocal": "दानवीर कर्ण का नाम त्याग, दानशीलता और पुरुषार्थ का अमर पर्याय है। सामाजिक विषमताओं से लड़कर अपनी योग्यता से शिखर छूने वाले इस महारथी को इतिहास सदैव श्रद्धा से स्मरण करता है।",
    "source": "Mahabharata (Adi, Udyoga, Drona, Karna, and Shanti Parvas)",
    "sourceLocal": "महाभारत (आदि, उद्योग, द्रोण, कर्ण व शांति पर्व)",
    "sourceCitations": [
      {
        "sourceName": "Mahabharata",
        "sourceRef": "Karna Parva (Chapters 70–96)",
        "tier": 1
      },
      {
        "sourceName": "Mahabharata",
        "sourceRef": "Udyoga Parva (Krishna-Karna Samvada, Chapters 140–146)",
        "tier": 1
      },
      {
        "sourceName": "Mahabharata",
        "sourceRef": "Vana Parva (Kundalaharana Parva)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Na me dharme matir hyasi dharmo rakshati rakshitah, dhiyate nityada dharmo dharmo hanti na rakshitah.",
      "attribution": "Righteousness protects those who protect it; when righteousness is neglected, it destroys the neglectful. Yet my pledge of charity shall never be broken. — Mahabharata (Karna Parva)"
    },
    "quoteLocal": {
      "text": "धर्म एव हतो हन्ति धर्मो रक्षति रक्षितः। तस्माद्धर्मो न हन्तव्यो मा नो धर्मो हतोऽवधीत्॥",
      "attribution": "दानवीर कर्ण (महाभारत — कर्ण पर्व)"
    }
  },
  {
    "id": "guru-nanak",
    "name": "Guru Nanak Dev Ji",
    "nameLocal": "गुरु नानक देव जी",
    "namePa": "ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ",
    "era": "1469–1539 CE",
    "eraLocal": "१४६९–१५३९ ईस्वी",
    "eraPa": "੧੪੬੯–੧੫੩੯ ਈਸਵੀ",
    "tradition": "sikh",
    "region": "Talwandi (Nankana Sahib) / Kartarpur Sahib",
    "regionLocal": "तलवंडी (ननकाना साहिब) / करतारपुर साहिब",
    "regionPa": "ਤਲਵੰਡੀ (ਨਨਕਾਣਾ ਸਾਹਿਬ) / ਕਰਤਾਰਪੁਰ ਸਾਹਿਬ",
    "emoji": "☬",
    "tagline": "The divine prophet and founder of Sikhi who traversed over 28,000 kilometers on foot, broke caste and sectarian barriers, and revealed the eternal oneness of God and humanity.",
    "taglineLocal": "सिख धर्म के आदि संस्थापक जिन्होंने पाखंडों और जाति-भेद को तोड़कर समस्त मानवता में एक ही ईश्वर की ज्योति का साक्षात्कार कराया।",
    "taglinePa": "ਸਿੱਖੀ ਦੇ ਪਹਿਲੇ ਪਾਤਸ਼ਾਹ ਜਿਨ੍ਹਾਂ ਨੇ ਜਾਤ-ਪਾਤ ਤੇ ਵਹਿਮਾਂ-ਭਰਮਾਂ ਨੂੰ ਮਿਟਾ ਕੇ ੴ ਦਾ ਇਲਾਹੀ ਸੁਨੇਹਾ ਜਗਤ ਵਿੱਚ ਰੌਸ਼ਨ ਕੀਤਾ।",
    "journey": "Guru Nanak was born in 1469 at Rai Bhoi di Talwandi (now Nankana Sahib, Pakistan) in a world fractured by tyrannical rulers, social injustice, and rigid priestly ritualism. From early childhood, his celestial disposition challenged dogmatism. When his family assembled pandits for his sacred thread ceremony (Upanayana), the young Nanak politely declined the cotton cord, stating that outward threads rot and perish; instead, he demanded a sacred thread spun from compassion, contentment, modesty, and truth that would never soil or snap. Sent to trade with twenty silver coins for his father’s business, Nanak spent the entire sum buying grain and food for starving ascetics and wandering holy men, calling it the Sacha Sauda (The True Bargain)—establishing the eternal bedrock of Sikh philanthropy.\n\nAt Sultanpur Lodhi, Nanak worked as the official superintendent of the state granary (Modikhana). While weighing grain provisions, whenever his count reached thirteen (tera), his soul was enraptured by the double meaning of the word—'Tera' meaning 'Yours, O Lord.' Murmuring 'Tera, Tera, Sab Tera' (All is Thine, Lord), he gave away provisions to destitute seekers without retaining personal wealth. One morning, after descending into the sacred Kali Bein river for his dawn ablutions, Nanak disappeared beneath the waters for three full days. When he emerged, transfigured in radiant illumination, his first prophetic utterance shattered centuries of theological animosity: 'Na koi hindu, na koi musalman' (There is no Hindu, there is no Muslim—in the eyes of the One Divine Creator, all humanity constitutes a single, undivided brotherhood).\n\nResigning his royal post, Guru Nanak embarked upon four monumental missionary journeys (Udasis), traversing over 28,000 kilometers on foot across four continents over twenty-four years. Accompanied by his devoted Muslim minstrel companion Bhai Mardana playing the rabab (rebeck), the Guru visited sacred pilgrimage centers across India, Tibet, Sri Lanka, Mecca, Medina, and Baghdad. He gently dismantled superstitious rituals—splashing water westwards at Haridwar to teach that physical water cannot reach departed ancestors, sleeping with his feet toward the Kaaba in Mecca to demonstrate that God resides in every direction, and transforming cruel cannibals like Kauda and murderous bandits like Sajjan Thug into noble servants of society through pure love and divine song.\n\nReturning to Punjab, Guru Nanak founded the sacred city of Kartarpur on the banks of the Ravi river. Hanging up his traveler’s robe, he took up the wooden plow as a simple farmer, demonstrating that spiritual perfection is achieved not by forest hermitages, but through living as an active householder. At Kartarpur, he instituted the sacred egalitarian pillars of Sikhi: Kirat Karo (earn an honest living by honest labor), Vand Chhako (share your honest earnings with the needy), and Naam Japo (meditate upon the Divine Name). He instituted the Pangat and Sangat—the community congregation where caste hierarchies were eradicated, and the Langar—the free community kitchen where kings, emperors, and outcastes sat side by side on the floor to partake of identical food.",
    "journeyLocal": "गुरु नानक देव जी का जन्म १४६९ ईस्वी में राय भोई दी तलवंडी (वर्तमान ननकाना साहिब) में हुआ था। बाल्यावस्था से ही उनका मन सांसारिक प्रपंचों से परे ईश्वर-भक्ति में लीन रहता था। जब पुरोहितों ने उनका जनेऊ संस्कार कराना चाहा, तो बालक नानक ने सूत का धागा पहनने से मना कर दिया और कहा कि उन्हें दया की कपास, संतोष का सूत, संयम की गांठ और सत्य का जनेऊ चाहिए जो कभी मैला न हो। जब पिता ने बीस रुपये देकर व्यापार करने भेजा, तो उन्होंने भूखे साधुओं को भोजन करा दिया और इसे 'सच्चा सौदा' कहा, जिसने निःस्वार्थ सेवा की नींव रखी।\n\nसुल्तानपुर लोधी में नवाब के मोदीखाने (अन्न भंडार) में कार्य करते हुए, जब वे तौलते समय तेरह की संख्या पर पहुँचते, तो 'तेरा-तेरा' कहते हुए ईश्वर के प्रेम में भाव-विभोर हो जाते और गरीबों में अन्न बांट देते। एक दिन वे काली बेईं नदी में स्नान करने उतरे और तीन दिनों तक अंतर्धान रहे। जब वे बाहर आए, तो उनके मुख से दिव्य उद्घोष निकला: \"ना कोई हिन्दू, ना कोई मुसलमान\" — अर्थात् ईश्वर की दृष्टि में सभी मनुष्य एक समान हैं।\n\nइसके पश्चात गुरु नानक देव जी ने अपने मुस्लिम साथी भाई मरदाना के साथ चार महान उदासियों (यात्राओं) में लगभग २८,००० किलोमीटर की पदयात्रा की। उन्होंने मक्का, मदीना, बगदाद, तिब्बत, श्रीलंका और संपूर्ण भारत का भ्रमण किया। हरिद्वार में सूर्य को जल देने के पाखंड को उन्होंने तार्किक ढंग से दूर किया और मक्का में काबा की ओर पैर करके यह सिद्ध किया कि परमात्मा किसी एक दिशा में नहीं, सर्वत्र व्याप्त है।\n\nजीवन के अंतिम पड़ाव में उन्होंने रावी नदी के तट पर करतारपुर साहिब नगर बसाया। वहाँ उन्होंने स्वयं हल चलाया और गृहस्थ जीवन में रहते हुए ईश्वर-प्राप्ति का मार्ग दिखाया। उन्होंने 'कीरत करो' (ईमानदारी से श्रम), 'वंड छको' (बांटकर खाना) और 'नाम जपो' का त्रिसूत्र दिया तथा लंगर और पंगत की स्थापना कर जाति-पाति के भेदभाव को समूल नष्ट कर दिया।",
    "journeyPa": "ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਦਾ ਅਵਤਾਰ ੧੪੬੯ ਈਸਵੀ ਵਿੱਚ ਰਾਏ ਭੋਇ ਦੀ ਤਲਵੰਡੀ (ਨਨਕਾਣਾ ਸਾਹਿਬ) ਵਿਖੇ ਮਹਿਤਾ ਕਾਲੂ ਜੀ ਅਤੇ ਮਾਤਾ ਤ੍ਰਿਪਤਾ ਜੀ ਦੇ ਗ੍ਰਹਿ ਵਿਖੇ ਹੋਇਆ। ਬਚਪਨ ਤੋਂ ਹੀ ਆਪ ਜੀ ਦਾ ਮਨ ਪ੍ਰਭੂ ਭਗਤੀ ਵਿੱਚ ਲੀਨ ਰਹਿੰਦਾ ਸੀ। ਜਦੋਂ ਪੰਡਿਤ ਨੇ ਜਨੇਊ ਪਾਉਣਾ ਚਾਹਿਆ ਤਾਂ ਆਪ ਨੇ ਫ਼ਰਮਾਇਆ ਕਿ ਦਇਆ, ਸੰਤੋਖ, ਜਤ ਅਤੇ ਸੱਚ ਦਾ ਜਨੇਊ ਹੀ ਆਤਮਾ ਦਾ ਅਸਲ ਸ਼ਿੰਗਾਰ ਹੈ। ਪਿਤਾ ਜੀ ਵੱਲੋਂ ਦਿੱਤੇ ਵੀਹ ਰੁਪਿਆਂ ਨਾਲ ਭੁੱਖੇ ਸਾਧੂਆਂ ਨੂੰ ਭੋਜਨ ਛਕਾ ਕੇ ਆਪ ਨੇ 'ਸੱਚਾ ਸੌਦਾ' ਕੀਤਾ।\n\nਸੁਲਤਾਨਪੁਰ ਲੋਧੀ ਵਿਖੇ ਨਵਾਬ ਦੌਲਤ ਖਾਨ ਦੇ ਮੋਦੀਖਾਨੇ ਵਿੱਚ ਕਾਰਜ ਕਰਦਿਆਂ ਜਦੋਂ 'ਤੇਰਾਂ' ਤੋਲਦੇ ਤਾਂ ਪ੍ਰਭੂ ਦੇ ਰੰਗ ਵਿੱਚ ਰੰਗੇ ਜਾ ਕੇ \"ਤੇਰਾ-ਤੇਰਾ\" ਕਹਿੰਦੇ ਹੋਏ ਸਭ ਕੁਝ ਵੰਡ ਦਿੰਦੇ। ਵੇਈਂ ਨਦੀ ਵਿੱਚ ਤਿੰਨ ਦਿਨ ਅਲੋਪ ਰਹਿਣ ਮਗਰੋਂ ਆਪ ਨੇ ਪ੍ਰਗਟ ਹੋ ਕੇ ਇਲਾਹੀ ਨਾਅਰਾ ਦਿੱਤਾ: \"ਨਾ ਕੋ ਹਿੰਦੂ ਨਾ ਕੋ ਮੁਸਲਮਾਨ\"।\n\nਆਪ ਨੇ ਭਾਈ ਮਰਦਾਨਾ ਜੀ ਨਾਲ ਮਿਲ ਕੇ ਚਾਰ ਉਦਾਸੀਆਂ ਕੀਤੀਆਂ ਅਤੇ ਹਜ਼ਾਰਾਂ ਮੀਲ ਦਾ ਸਫ਼ਰ ਤੈਅ ਕਰਦਿਆਂ ਮੱਕਾ, ਮਦੀਨਾ, ਬਗਦਾਦ, ਤਿੱਬਤ ਅਤੇ ਭਾਰਤ ਦੇ ਕੋਨੇ-ਕੋਨੇ ਵਿੱਚ ੴ ਦਾ ਸੁਨੇਹਾ ਦਿੱਤਾ। ਹਰਿਦੁਆਰ ਵਿੱਚ ਪਾਖੰਡ ਦਾ ਖੰਡਨ ਕੀਤਾ ਅਤੇ ਮੱਕੇ ਵਿੱਚ ਰੱਬ ਦੀ ਸਰਬ-ਵਿਆਪਕਤਾ ਦਾ ਅਹਿਸਾਸ ਕਰਵਾਇਆ।\n\nਅੰਤ ਵਿੱਚ ਕਰਤਾਰਪੁਰ ਸਾਹਿਬ ਵਸਾ ਕੇ ਆਪ ਨੇ ਖ਼ੁਦ ਹਲ ਵਾਹਿਆ ਅਤੇ ਗ੍ਰਹਿਸਥ ਜੀਵਨ ਵਿੱਚ ਰਹਿੰਦਿਆਂ ਨਾਮ ਜਪਣ, ਕਿਰਤ ਕਰਨ ਅਤੇ ਵੰਡ ਛਕਣ ਦਾ ਸੁਨਹਿਰੀ ਉਪਦੇਸ਼ ਦਿੱਤਾ। ਸੰਗਤ ਅਤੇ ਪੰਗਤ ਦੀ ਮਹਾਨ ਪਰੰਪਰਾ ਕਾਇਮ ਕਰਕੇ ਸਮਾਜ ਵਿੱਚੋਂ ਊਚ-ਨੀਚ ਦਾ ਭੇਦਭਾਵ ਸਦਾ ਲਈ ਖ਼ਤਮ ਕਰ ਦਿੱਤਾ।",
    "trial": "Guru Nanak’s trial was the courageous confrontation of entrenched institutional tyranny and religious fanaticism without anger, hatred, or violence. In 1520, when the Mughal warlord Babur invaded Punjab and carried out a savage slaughter at Saidpur (Eminabad), putting thousands of innocent citizens to the sword, enslaving women, and piling mountains of corpses, Guru Nanak did not flee to a safe forest sanctuary. He walked directly into the smoldering ruins of the city, was taken prisoner, and forced to carry heavy loads and grind corn at a hand mill. Standing fearlessly before the ruthless conqueror Babur, the Guru looked him in the eyes and called him a 'slayer of righteousness,' lamenting the agonizing cries of the innocent in his immortal composition Baburvani: 'When there was such slaughter, such groaning, didst Thou not feel pain, O Lord?' His absolute fearlessness and moral authority moved Babur to release the captive prisoners, proving that truth spoken with divine love pierces the armor of imperial cruelty.",
    "trialLocal": "गुरु नानक देव जी की सबसे बड़ी परीक्षा क्रूर सत्ता और कट्टरता के सामने बिना किसी भय के सत्य पर अडिग रहना था। १५२० ईस्वी में जब बाबर ने सैदपुर (ऐमनाबाद) पर आक्रमण कर नरसंहार किया, निर्दोषों की हत्या की और स्त्रियों को बंदी बनाया, तब गुरु नानक चुप नहीं रहे। वे स्वयं उस रक्तपात के बीच गए, बंदी बने और जेल में चक्की पीसी। उन्होंने बाबर के सामने खड़े होकर उसे जालिम कहा और अपनी वाणी 'बाबरवाणी' में इस दारुण दुख को दर्ज किया: \"एती मार पई कुरलाणे तैं की दर्द न आया।\" उनके आध्यात्मिक तेज के सामने बाबर नतमस्तक हुआ और उसने बंदियों को मुक्त किया।",
    "trialPa": "ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਦਾ ਸਭ ਤੋਂ ਵੱਡਾ ਇਮਤਿਹਾਨ ਉਸ ਵੇਲੇ ਦੇ ਜਾਬਰ ਹਾਕਮਾਂ ਅਤੇ ਕੱਟੜਪੰਥੀਆਂ ਅੱਗੇ ਸੱਚ ਦੀ ਆਵਾਜ਼ ਬੁਲੰਦ ਕਰਨਾ ਸੀ। ੧੫੨੦ ਵਿੱਚ ਜਦੋਂ ਬਾਬਰ ਨੇ ਐਮਨਾਬਾਦ ਵਿੱਚ ਕਤਲੇਆਮ ਕੀਤਾ, ਤਾਂ ਗੁਰੂ ਜੀ ਨੇ ਚੱਕੀ ਪੀਸਦਿਆਂ ਵੀ ਜ਼ੁਲਮ ਵਿਰੁੱਧ ਆਵਾਜ਼ ਉਠਾਈ ਅਤੇ ਬਾਬਰ ਨੂੰ \"ਜਾਬਰ\" ਕਹਿ ਕੇ ਵੰਗਾਰਿਆ। ਆਪ ਜੀ ਨੇ 'ਬਾਬਰਵਾਣੀ' ਵਿੱਚ ਲੋਕਾਂ ਦੇ ਦਰਦ ਨੂੰ ਬਿਆਨ ਕੀਤਾ: \"ਏਤੀ ਮਾਰ ਪਈ ਕੁਰਲਾਣੇ ਤੈਂ ਕੀ ਦਰਦੁ ਨ ਆਇਆ ॥\" ਆਪ ਦੇ ਆਤਮਿਕ ਤੇਜ ਅੱਗੇ ਬਾਬਰ ਨੂੰ ਝੁਕਣਾ ਪਿਆ ਅਤੇ ਉਸਨੇ ਕੈਦੀਆਂ ਨੂੰ ਰਿਹਾਅ ਕੀਤਾ।",
    "teaching": "Guru Nanak established that God is Ik Onkar—the One Indivisible, Formless, All-Pervading Reality who is accessed not through empty external rituals, ascetic renunciation, or dogmatic scriptures, but through the inward meditation on the Divine Name (Naam Simran) and compassionate service to creation. He revealed the supreme moral law: 'Sachon ore sabh ko, upar sach aachar'—Truth is highest of all, but higher still is truthful living.",
    "teachingLocal": "गुरु नानक देव जी का मूल उपदेश है कि ईश्वर एक है (ੴ), वह निर्भय और निर्वैर है। बाह्य आडंबरों और त्याग के स्थान पर गृहस्थ जीवन में रहते हुए ईमानदारी से आजीविका कमाना, जरूरतमंदों की सेवा करना और परमात्मा का स्मरण करना ही सच्ची भक्ति है। उनका अमर संदेश है: \"सच सबसे ऊंचा है, परंतु सच्चा आचरण उससे भी ऊंचा है।\"",
    "teachingPa": "ਗੁਰੂ ਜੀ ਦਾ ਮੂਲ ਉਪਦੇਸ਼ ਹੈ ਕਿ ਪ੍ਰਮਾਤਮਾ ਇੱਕ ਹੈ (ੴ), ਉਹ ਨਿਰਭਉ ਅਤੇ ਨਿਰਵੈਰ ਹੈ। ਰੱਬ ਜੰਗਲਾਂ ਵਿੱਚ ਨਹੀਂ, ਸਗੋਂ ਨੇਕ ਕਿਰਤ, ਸੱਚੇ ਆਚਰਣ ਅਤੇ ਲੋੜਵੰਦਾਂ ਦੀ ਸੇਵਾ ਵਿੱਚ ਵੱਸਦਾ ਹੈ। ਆਪ ਜੀ ਦਾ ਇਲਾਹੀ ਫ਼ੁਰਮਾਨ ਹੈ: \"ਸਚਹੁ ਓਰੈ ਸਭੁ ਕੋ ਉਪਰਿ ਸਚੁ ਆਚਾਰੁ ॥\"",
    "moral": "Live fearlessly, harbor hatred toward none, and treat every living being as your equal. True religion is not running away from the world, but bringing purity, integrity, and boundless compassion into the daily marketplace of life.",
    "moralLocal": "निर्भय और निर्वैर होकर जीवन जिएं। किसी से घृणा न करें, सभी में एक ही ईश्वर का रूप देखें और अपने आचरण को सदैव सत्य और सेवा से पवित्र रखें।",
    "moralPa": "ਨਿਰਭਉ ਤੇ ਨਿਰਵੈਰ ਹੋ ਕੇ ਜੀਵਨ ਜਿਊਣਾ, ਹੱਕ-ਸੱਚ ਦੀ ਕਮਾਈ ਕਰਨੀ ਅਤੇ ਸਾਰੇ ਜੀਵਾਂ ਨੂੰ ਇੱਕ ਪ੍ਰਮਾਤਮਾ ਦਾ ਰੂਪ ਜਾਣ ਕੇ ਬਿਨਾਂ ਵਿਤਕਰੇ ਦੇ ਪ੍ਰੇਮ ਕਰਨਾ ਹੀ ਸੱਚਾ ਧਰਮ ਹੈ।",
    "legacy": "Guru Nanak laid the enduring spiritual, social, and ethical foundations of Sikhi, shattering the millennium-old caste system through Langar and Sangat. His 974 sacred hymns enshrined in the Sri Guru Granth Sahib continue to guide millions across the globe toward universal brotherhood, social justice, and divine contemplation.",
    "legacyLocal": "गुरु नानक देव जी ने सिख पंथ की नींव रखी और लंगर व पंगत की परंपरा द्वारा जातिवाद पर निर्णायक प्रहार किया। गुरु ग्रंथ साहिब में दर्ज उनकी पावन वाणी संपूर्ण विश्व को समता, सेवा और प्रभु-प्रेम का शाश्वत प्रकाश देती है।",
    "legacyPa": "ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਨੇ ਸਮਾਜ ਵਿੱਚ ਊਚ-ਨੀਚ ਨੂੰ ਮਿਟਾ ਕੇ ਬਰਾਬਰੀ ਵਾਲਾ ਸਮਾਜ ਸਿਰਜਿਆ। ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਵਿੱਚ ਦਰਜ ਆਪ ਜੀ ਦੇ ੯੭੪ ਸ਼ਬਦ ਰਹਿੰਦੀ ਦੁਨੀਆ ਤੱਕ ਸਮੁੱਚੀ ਮਨੁੱਖਤਾ ਨੂੰ ਸੱਚ, ਦਇਆ ਅਤੇ ਸਰਬੱਤ ਦੇ ਭਲੇ ਦਾ ਰਾਹ ਦਿਖਾਉਂਦੇ ਰਹਿਣਗੇ।",
    "source": "Sri Guru Granth Sahib (Japji Sahib, Asa di Var, Baburvani), Bhai Gurdas Ji (Varan, Var 1), Puratan Janamsakhi",
    "sourceLocal": "श्री गुरु ग्रंथ साहिब (जपुजी साहिब, आसा दी वार, बाबरवाणी), भाई गुरदास जी की वारें (वार १), पुरातन जनमसाखी",
    "sourcePa": "ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ (ਜਪੁਜੀ ਸਾਹਿਬ, ਆਸਾ ਦੀ ਵਾਰ, ਬਾਬਰਵਾਣੀ), ਭਾਈ ਗੁਰਦਾਸ ਜੀ (ਵਾਰ ੧), ਪੁਰਾਤਨ ਜਨਮਸਾਖੀ",
    "sourceCitations": [
      {
        "sourceName": "Sri Guru Granth Sahib",
        "sourceRef": "Japji Sahib (Angs 1–8)",
        "tier": 1
      },
      {
        "sourceName": "Sri Guru Granth Sahib",
        "sourceRef": "Asa di Var (Angs 462–475) & Baburvani (Angs 360, 417)",
        "tier": 1
      },
      {
        "sourceName": "Bhai Gurdas Ji",
        "sourceRef": "Varan, Var 1, Pauri 23–38",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Sachon ore sabh ko, upar sach aachar.",
      "attribution": "Truth is the highest virtue, but higher still is truthful living. — Guru Nanak Dev Ji, Sri Guru Granth Sahib (Ang 62)"
    },
    "quoteLocal": {
      "text": "सचु ओरै सभु को उपरि सचु आचारु॥",
      "attribution": "गुरु नानक देव जी (श्री गुरु ग्रंथ साहिब, अंग ६२)"
    },
    "quotePa": {
      "text": "ਸਚਹੁ ਓਰੈ ਸਭੁ ਕੋ ਉਪਰਿ ਸਚੁ ਆਚਾਰੁ ॥",
      "attribution": "ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ (ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ, ਅੰਗ ੬੨)"
    }
  },
  {
    "id": "adi-shankaracharya",
    "name": "Adi Shankaracharya",
    "nameLocal": "आदि शंकराचार्य",
    "era": "788–820 CE",
    "eraLocal": "७८८–८२० ईस्वी",
    "tradition": "hindu",
    "region": "Kalady, Kerala / Varanasi / Kedarnath",
    "regionLocal": "कालड़ी, केरल / काशी / केदारनाथ",
    "emoji": "🪷",
    "tagline": "The peerless young philosopher-saint who walked the length of India barefoot, unified Advaita Vedanta, revived Sanatan Dharma, and founded four cardinal monastic pillars in thirty-two radiant years.",
    "taglineLocal": "अद्वैत वेदांत के महान ज्योतिर्धर जिन्होंने मात्र बत्तीस वर्ष की अल्पायु में संपूर्ण भारत की पदयात्रा कर सनातन धर्म और ज्ञान परंपरा को पुनर्जीवित किया।",
    "journey": "Adi Shankaracharya was born in 788 CE in the village of Kalady on the banks of the sacred Purna river in Kerala, to the pious Nambudiri couple Sivaguru and Aryamba. Endowed with extraordinary intellectual brilliance and memory (ekashrutadhara), he mastered the four Vedas, Upanishads, and auxiliary Darshanas by the tender age of eight. When his widowed mother hesitated to grant him permission to embrace sannyasa (monastic renunciation), an incident at the river settled his destiny: a crocodile seized his leg while bathing, and Shankara called out to his mother that only by granting him the vow of renunciation could his life be preserved. Relenting with tears, she gave her blessing on one solemn condition—that Shankara would return to perform her final funeral rites. The crocodile released him, and the young boy renounced worldly comfort.\n\nTraveling on foot to the sacred banks of the Narmada river, Shankara sought out the revered sage Govinda Bhagavatpada, the disciple of Gaudapada. Recognizing Shankara as the incarnate manifestation of Lord Shiva, the master initiated him into the deepest secrets of Advaita (Non-Duality) and instructed him to proceed to Varanasi, the eternal seat of spiritual learning, to write authoritative commentaries (Bhashyas) establishing the supremacy of Upanishadic non-dualism.\n\nAt Varanasi, amidst the sacred ghats of the Ganga, Shankara authored monumental commentaries on the Prasthanatrayi—the Brahma Sutras of Badarayana, the principal Upanishads (Isha, Kena, Katha, Prashna, Mundaka, Mandukya, Taittiriya, Aitareya, Chandogya, and Brihadaranyaka), and the Bhagavad Gita. While walking to Manikarnika Ghat, Shankara encountered an outcaste (chandala) with four dogs blocking the narrow alley. When Shankara bade him step aside, the outcaste retorted with profound metaphysical insight: 'O holy ascetic, do you ask this perishable body made of food to move away from your body of food, or do you ask the infinite, unattached, all-pervading Consciousness (Atman) to move away from Consciousness?' Pierced to the core by this lesson in practical non-duality, Shankara prostrated himself before the chandala, composing the immortal Manisha Panchakam—proclaiming that anyone who has realized the oneness of Brahman is his revered guru, whether a brahmin or an outcaste.\n\nEmbarking upon his legendary Digvijaya (philosophical conquest), Shankara walked thousands of miles across India. He engaged in celebrated public debates with the foremost scholars of Buddhism, Jainism, and Mimamsa, systematically dismantling dogmatic ritualism through razor-sharp logic and scriptural revelation. At Mahishmati, he defeated the celebrated Mimamsaka scholar Mandana Mishra in a historic debate judged by Mishra's brilliant wife, Ubhaya Bharati. To preserve Vedic wisdom for future millennia, Shankara established four cardinal monastic institutions (Amnaya Mathas) at the four corners of India: Sringeri Sharada Peetham in the South, Govardhana Matha at Puri in the East, Sharada Peetham at Dwarka in the West, and Jyotirmath at Badrikashrama in the North. He reorganized monasticism into the Dashanami Sampradaya, harmonized diverse sects under Shanmata worship, and composed devotional masterpieces like Bhaja Govindam and Soundarya Lahari before entering Mahasamadhi near Kedarnath at the age of thirty-two.",
    "journeyLocal": "आदि शंकराचार्य का जन्म ७८८ ईस्वी में केरल के कालड़ी ग्राम में पूर्णा नदी के तट पर शिवगुरु और आर्याम्बा के घर हुआ था। असाधारण प्रतिभा के धनी बालक शंकर ने आठ वर्ष की आयु में चारों वेदों और उपनिषदों का पूर्ण अध्ययन कर लिया था। संन्यास की अनुमति न मिलने पर, जब नदी में एक मगरमच्छ ने उनका पैर पकड़ लिया, तब उन्होंने माता से संन्यास की आज्ञा मांगी और वचन दिया कि वे उनके अंतिम संस्कार के समय अवश्य उपस्थित होंगे। आज्ञा मिलते ही मगरमच्छ ने उन्हें छोड़ दिया और वे संन्यासी बन गए।\n\nनर्मदा तट पर उन्होंने पूज्य गुरु गोविंद भगवत्पाद से दीक्षा ली, जिन्होंने उन्हें ब्रह्मज्ञान का साक्षात्कार कराया और काशी जाकर भाष्य लिखने का आदेश दिया। काशी में शंकराचार्य ने 'प्रस्थानत्रयी'—ब्रह्मसूत्र, प्रमुख उपनिषदों और श्रीमद्भगवद्गीता पर अद्वितीय भाष्य लिखे। मणिकर्णिका घाट के मार्ग पर जब एक चांडाल ने उन्हें अद्वैत का पाठ पढ़ाया कि \"तुम देह को देह से हटने को कह रहे हो या चैतन्य को चैतन्य से?\", तो शंकर ने नतमस्तक होकर 'मनीषा पंचकम्' की रचना की और घोषणा की कि ब्रह्मज्ञानी चाहे चांडाल हो या ब्राह्मण, वह मेरा गुरु है।\n\nइसके पश्चात उन्होंने संपूर्ण भारत की दिग्विजय पदयात्रा की। उन्होंने महिष्मति में महान मीमांसक विद्वान मंडन मिश्र और विदुषी भारती के साथ ऐतिहासिक शास्त्रार्थ कर अद्वैत मत की पुनर्स्थापना की। सनातन ज्ञान की रक्षा के लिए उन्होंने भारत के चारों कोनों में चार आम्नाय मठों की स्थापना की: दक्षिण में शृंगेरी, पूर्व में पुरी, पश्चिम में द्वारका और उत्तर में ज्योतिर्मठ (बद्रीनाथ)। उन्होंने दशनामी संन्यास परंपरा का गठन किया और मात्र बत्तीस वर्ष की आयु में केदारनाथ धाम में महासमाधि ली।",
    "trial": "Shankara’s supreme trial was facing the hostility of entrenched orthodox ritualists and upholding his filial promise against social ostracism. When his aged mother lay dying in Kalady, Shankara honored his vow and returned to her side, comforting her final moments with hymns of divine surrender. However, the orthodox Nambudiri community cruelly boycotted him, declaring that a sannyasin had broken scriptural laws by touching his deceased mother, and refused to provide wood or assist in the cremation. Undaunted by societal condemnation, Shankara lovingly lifted his mother’s body, built a funeral pyre in her own backyard using plantain stems, ignited the sacred fire through his yogic power, and performed the final rites alone. Throughout his life, walking through dense jungles infested with dacoits and confronting hostile tantrics like the Kapalika Ugrabhairava who attempted to sacrifice him, Shankara remained completely centered in non-dual peace, willing to offer his own head without anger.",
    "trialLocal": "शंकराचार्य की सबसे भावुक और कठिन परीक्षा अपनी माता को दिए वचन का पालन करना और रूढ़िवादी समाज के बहिष्कार का सामना करना था। जब उनकी माता का देहावसान हुआ, तो संन्यासी होने के कारण रूढ़िवादी समाज ने उनका बहिष्कार कर दिया और अंतिम संस्कार के लिए अग्नि और सहायता देने से मना कर दिया। शंकराचार्य विचलित नहीं हुए; उन्होंने अकेले अपनी माता की पार्थिव देह को आंगन में रखा, केले के पत्तों और लकड़ियों से चिता बनाई और योगबल से अग्नि प्रज्वलित कर संस्कार संपन्न किया। उन्होंने कापालिकों के प्राणघातक हमलों और विद्वानों के विरोध को केवल अगाध करुणा और ब्रह्म-ज्ञान से जीता।",
    "teaching": "Adi Shankara synthesized the core essence of Advaita Vedanta in his immortal aphorism: 'Brahma Satyam Jagan Mithya, Jivo Brahmaiva Na Parah'—Brahman (Pure, Undivided Consciousness) alone is the absolute truth; the empirical universe is a transient, dependent appearance (mithya); and the individual soul (Jiva) is non-different from Brahman itself. Liberation (Moksha) is not attained after physical death through rituals, but realized in this very life (Jivanmukti) through the dispelling of ignorance (avidya) via direct knowledge of the Self.",
    "teachingLocal": "आदि शंकर का अमर संदेश है: \"ब्रह्म सत्यं जगन्मिथ्या जीवो ब्रह्मैव नापरः\" — केवल ब्रह्म (परम चेतना) ही शाश्वत सत्य है, यह दृश्यमान जगत सापेक्षिक व परिवर्तनशील है, और जीवात्मा वास्तव में ब्रह्म से भिन्न नहीं है। मोक्ष किसी अन्य लोक में मिलने वाली वस्तु नहीं, बल्कि अज्ञान के आवरण को हटाकर स्वयं के वास्तविक स्वरूप (आत्मानंद) को इसी जीवन में जान लेना है।",
    "moral": "Do not mistake the perishable body and anxious ego for your true reality. Recognize the one divine consciousness shining equally through all living beings, cultivate fearless discernment (viveka), and anchor yourself in unshakeable inner peace.",
    "moralLocal": "क्षणिक शरीर और अहंकार को अपना वास्तविक स्वरूप न समझें। संसार के समस्त प्राणियों में उसी एक ईश्वर का दर्शन करें, विवेक और वैराग्य अपनाएं और जीवन के हर संघर्ष में निर्भय रहें।",
    "legacy": "Adi Shankara revitalized the intellectual and philosophical foundations of Sanatan Dharma, unifying disparate traditions under the grand banner of Advaita. His commentaries and the four Amnaya Mathas he founded remain the bedrock of Indian spiritual thought and monastic preservation to this day.",
    "legacyLocal": "आदि शंकराचार्य ने भारतीय दर्शन को सर्वोच्च शिखर प्रदान किया और खंड-खंड में बंटे समाज को सांस्कृतिक व दार्शनिक रूप से एक सूत्र में पिरोया। उनके द्वारा स्थापित चार धाम और मठ आज बारह सौ वर्षों बाद भी सनातन संस्कृति के प्रकाश स्तंभ बने हुए हैं।",
    "source": "Madhaviya Shankara Digvijaya, Prasthanatrayi Bhashya (Brahma Sutra Bhashya, Gita Bhashya), Vivekachudamani, Manisha Panchakam",
    "sourceLocal": "माधवीय शंकर दिग्विजय, प्रस्थानत्रयी भाष्य (ब्रह्मसूत्र भाष्य, गीता भाष्य), विवेकचूड़ामणि, मनीषा पंचकम्",
    "sourceCitations": [
      {
        "sourceName": "Brahma Sutra Bhashya",
        "sourceRef": "Catussutri (Adhyasa Bhashya & Sutras 1.1.1–4)",
        "tier": 1
      },
      {
        "sourceName": "Manisha Panchakam",
        "sourceRef": "Verses 1–5",
        "tier": 1
      },
      {
        "sourceName": "Madhaviya Shankara Digvijaya",
        "sourceRef": "Cantos 4–8 (Debates with Mandana Mishra and Digvijaya)",
        "tier": 1
      },
      {
        "sourceName": "Vivekachudamani",
        "sourceRef": "Verses 20–35 (Sadhana Chatushtaya)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Brahma satyam jagan mithya, jivo brahmaiva naparah.",
      "attribution": "Brahman alone is real; the empirical world is appearance; the individual soul is none other than Brahman. — Adi Shankaracharya, Vivekachudamani"
    },
    "quoteLocal": {
      "text": "ब्रह्म सत्यं जगन्मिथ्या जीवो ब्रह्मैव नापरः।",
      "attribution": "आदि शंकराचार्य (विवेकचूड़ामणि)"
    }
  },
  {
    "id": "guru-teg-bahadur",
    "name": "Guru Teg Bahadur",
    "nameLocal": "गुरु तेग बहादुर जी",
    "namePa": "ਗੁਰੂ ਤੇਗ ਬਹਾਦਰ ਜੀ",
    "era": "1621–1675 CE",
    "eraLocal": "१६२१–१६७५ ईस्वी",
    "eraPa": "੧੬੨੧–੧੬੭੫ ਈਸਵੀ",
    "tradition": "sikh",
    "region": "Amritsar / Anandpur Sahib / Chandni Chowk, Delhi",
    "regionLocal": "अमृतसर / आनंदपुर साहिब / चांदनी चौक, दिल्ली",
    "regionPa": "ਅੰਮ੍ਰਿਤਸਰ / ਅਨੰਦਪੁਰ ਸਾਹਿਬ / ਚਾਂਦਨੀ ਚੌਕ, ਦਿੱਲੀ",
    "emoji": "☬",
    "tagline": "The ninth Sikh Guru immortalized as 'Hind di Chadar' (The Shield of India), who laid down his life to defend the universal human right to conscience, faith, and freedom for an oppressed religion not his own.",
    "taglineLocal": "सिखों के नवम गुरु, जिन्हें 'हिन्द दी चादर' कहा जाता है, जिन्होंने तिलक और जनेऊ की रक्षा तथा धार्मिक स्वतंत्रता के लिए दिल्ली के चांदनी चौक में सर्वोच्च बलिदान दिया।",
    "taglinePa": "ਨੌਵੇਂ ਪਾਤਸ਼ਾਹ 'ਹਿੰਦ ਦੀ ਚਾਦਰ', ਜਿਨ੍ਹਾਂ ਨੇ ਮਨੁੱਖੀ ਅਧਿਕਾਰਾਂ, ਧਾਰਮਿਕ ਆਜ਼ਾਦੀ ਅਤੇ ਦੂਜੇ ਧਰਮ ਦੇ ਤਿਲਕ-ਜੰਞੂ ਦੀ ਰੱਖਿਆ ਲਈ ਆਪਣਾ ਸੀਸ ਕੁਰਬਾਨ ਕਰ ਦਿੱਤਾ।",
    "journey": "Guru Teg Bahadur was born in 1621 at Amritsar as Tyag Mal, the fifth and youngest son of the martial sixth Guru, Hargobind Sahib, and Mata Nanaki. From early childhood, he showed deep contemplative inclinations along with formidable courage. In 1635, during the fierce battle of Kartarpur against Mughal imperial forces, the young fourteen-year-old warrior wielded his sword with such terrifying valor and mastery that his father renamed him 'Teg Bahadur'—Mighty of the Sword. Yet, martial glory held no personal attraction for him; following his father’s passing, he retired to the quiet village of Bakala, spending over twenty-six years in deep solitary meditation (Bhora Sahib), immersing his soul in the ocean of divine equanimity.\n\nWhen the eighth Guru, Har Krishan, uttered his enigmatic final words in Delhi—'Baba Bakale' (The Baba is in Bakala)—dozens of greedy imposters established fraudulent seats at Bakala to claim the Guru’s wealth. A wealthy merchant named Makhan Shah Lubana, whose cargo vessel had been miraculously saved from shipwreck by earnest prayer, arrived in Bakala to fulfill a vow of 500 gold coins. Testing the pretenders by placing only two coins before each, all were pleased, until he discovered Guru Teg Bahadur sitting in deep meditation. When Makhan Shah placed two coins before him, the Guru gently smiled and asked: 'Why withhold the remaining 498 gold mohurs you promised when your ship was floundering in the storm?' Ecstatic with joy, Makhan Shah rushed to the rooftop, waving his shawl and shouting to the world: 'Guru Ladho Re! Guru Ladho Re!' (The True Guru has been found!).\n\nGuru Teg Bahadur established the sacred city of Anandpur Sahib (City of Bliss) in the foothills of the Shivalik hills. He traveled extensively across Punjab, Haryana, Uttar Pradesh, Bihar, Bengal, and Assam, establishing wells, planting trees, and singing celestial hymns of detachment and inner fearlessness.\n\nIn May 1675, a delegation of five hundred Kashmiri Brahmins led by Pandit Kirpa Ram arrived at Anandpur Sahib in utter desperation. Emperor Aurangzeb had instituted a ruthless imperial campaign to eradicate Hinduism by forcing the Kashmiri pandits to embrace Islam under threat of mass extermination. Weeping before the Guru, they pleaded for protection. Guru Teg Bahadur sat in deep contemplation, remarking that only the supreme sacrifice of a distinguished and noble soul could arrest the tsunami of tyranny. His nine-year-old son, Gobind Rai (later Guru Gobind Singh), innocently looked up and said: 'Dearest Father, who in this land could be more pure, noble, and worthy of making that supreme sacrifice than you?' Embracing his son’s heroic wisdom, the Guru instructed the pandits to tell Aurangzeb: 'If you can convert Guru Teg Bahadur to Islam, we will all willingly embrace your faith; but if you fail, you must cease the persecution of our people.' Setting out toward Delhi, the Guru walked willingly into the jaws of martyrdom.",
    "journeyLocal": "गुरु तेग बहादुर जी का जन्म १६२१ ईस्वी में अमृतसर में सिखों के छठे गुरु, गुरु हरगोविंद साहिब जी के घर हुआ था। बाल्यावस्था में उनका नाम 'त्याग मल' था। १४ वर्ष की आयु में करतारपुर के युद्ध में उन्होंने असाधारण वीरता दिखाई, जिससे प्रसन्न होकर उनके पिता ने उनका नाम 'तेग बहादुर' (तलवार का धनी) रखा। परंतु सांसारिक मान-सम्मान से दूर, उन्होंने बकाला में छब्बीस वर्षों तक भूमिगत कक्ष (भोरा साहिब) में निरंतर तपस्या की।\n\nजब आठवें गुरु हरकिशन जी ने 'बाबा बकाले' का संकेत दिया, तो मक्खन शाह लुभाना नामक व्यापारी ने, जिसका जहाज समुद्र में डूबने से गुरु कृपा से बचा था, बकाला पहुंचकर सच्चे गुरु की खोज की। गुरु जी के सामने दो मोहरें रखने पर जब उन्होंने बकाया ४९८ मोहरों का स्मरण कराया, तो मक्खन शाह ने छत पर चढ़कर पुकारा: \"गुरु लाधो रे!\" (सच्चा गुरु मिल गया है)।\n\nगुरु जी ने आनंदपुर साहिब की स्थापना की और देश भर में धर्म का प्रचार किया। मई १६७५ में पंडित कृपा राम के नेतृत्व में कश्मीरी पंडितों का एक दल आनंदपुर साहिब पहुंचा। औरंगजेब की क्रूर नीति के कारण उन पर जबरन धर्म परिवर्तन का दबाव था। गुरु जी ने विचार किया कि इस अत्याचार को रोकने के लिए किसी महापुरुष के आत्म-बलिदान की आवश्यकता है। उनके नौ वर्षीय सुपुत्र गोविंद राय (गुरु गोविंद सिंह) ने कहा: \"पिता जी, आपसे बड़ा महापुरुष और कौन हो सकता है?\" गुरु जी ने कश्मीरी पंडितों से कहा कि वे औरंगजेब से कह दें कि यदि गुरु तेग बहादुर इस्लाम स्वीकार कर लेंगे, तो हम सभी मुसलमान बन जाएंगे। इसके बाद गुरु जी ने दिल्ली की ओर प्रस्थान किया।",
    "journeyPa": "ਗੁਰੂ ਤੇਗ ਬਹਾਦਰ ਜੀ ਦਾ ਜਨਮ ੧੬੨੧ ਈਸਵੀ ਵਿੱਚ ਸ੍ਰੀ ਅੰਮ੍ਰਿਤਸਰ ਵਿਖੇ ਛੇਵੇਂ ਪਾਤਸ਼ਾਹ ਸ੍ਰੀ ਗੁਰੂ ਹਰਿਗੋਬਿੰਦ ਸਾਹਿਬ ਜੀ ਅਤੇ ਮਾਤਾ ਨਾਨਕੀ ਜੀ ਦੇ ਗ੍ਰਹਿ ਵਿਖੇ ਹੋਇਆ। ਆਪ ਜੀ ਦਾ ਬਚਪਨ ਦਾ ਨਾਮ 'ਤਿਆਗ ਮੱਲ' ਸੀ। ੧੪ ਸਾਲ ਦੀ ਉਮਰ ਵਿੱਚ ਕਰਤਾਰਪੁਰ ਦੀ ਜੰਗ ਵਿੱਚ ਆਪ ਜੀ ਨੇ ਐਸੀ ਤਲਵਾਰ ਚਲਾਈ ਕਿ ਪਿਤਾ ਜੀ ਨੇ ਆਪ ਦਾ ਨਾਮ 'ਤੇਗ ਬਹਾਦਰ' ਰੱਖ ਦਿੱਤਾ। ਆਪ ਜੀ ਨੇ ਬਾਬਾ ਬਕਾਲਾ ਵਿਖੇ ੨੬ ਸਾਲ ਲੰਮੀ ਭੋਰੇ ਵਿੱਚ ਬੈਠ ਕੇ ਘੋਰ ਤਪੱਸਿਆ ਕੀਤੀ।\n\nਅੱਠਵੇਂ ਪਾਤਸ਼ਾਹ ਦੇ \"ਬਾਬਾ ਬਕਾਲੇ\" ਬਚਨ ਸੁਣ ਕੇ ਜਦੋਂ ਮੱਖਣ ਸ਼ਾਹ ਲੁਭਾਣਾ ਬਕਾਲੇ ਪਹੁੰਚਿਆ, ਤਾਂ ਸੱਚੇ ਪਾਤਸ਼ਾਹ ਦੀ ਪਰਖ ਕਰਦਿਆਂ ਉਸਨੇ ਕੋਠੇ 'ਤੇ ਚੜ੍ਹ ਕੇ ਹੋਕਾ ਦਿੱਤਾ: \"ਗੁਰੂ ਲਾਧੋ ਰੇ!\" (ਸੱਚਾ ਗੁਰੂ ਲੱਭ ਗਿਆ ਹੈ)। ਗੁਰੂ ਜੀ ਨੇ ਅਨੰਦਪੁਰ ਸਾਹਿਬ ਦੀ ਪਵਿੱਤਰ ਨਗਰੀ ਵਸਾਈ ਅਤੇ ਦੂਰ-ਦੁਰਾਡੇ ਜਾ ਕੇ ਪ੍ਰਭੂ ਭਗਤੀ ਦਾ ਸੰਦੇਸ਼ ਦਿੱਤਾ।\n\nਮਈ ੧੬੭੫ ਵਿੱਚ ਪੰਡਿਤ ਕਿਰਪਾ ਰਾਮ ਦੀ ਅਗਵਾਈ ਵਿੱਚ ਕਸ਼ਮੀਰੀ ਪੰਡਤਾਂ ਦੀ ਫ਼ਰਿਆਦ ਸੁਣ ਕੇ ਗੁਰੂ ਜੀ ਨੇ ਮਨੁੱਖੀ ਅਧਿਕਾਰਾਂ ਦੀ ਰੱਖਿਆ ਲਈ ਸੀਸ ਕੁਰਬਾਨ ਕਰਨ ਦਾ ਨਿਰਣਾ ਲਿਆ। ਬਾਲ ਗੋਬਿੰਦ ਰਾਇ ਜੀ ਦੇ ਕਹਿਣ 'ਤੇ ਕਿ \"ਆਪ ਜੀ ਤੋਂ ਵੱਡਾ ਮਹਾਂਪੁਰਖ ਹੋਰ ਕੌਣ ਹੋ ਸਕਦਾ ਹੈ\", ਗੁਰੂ ਜੀ ਨੇ ਔਰੰਗਜ਼ੇਬ ਨੂੰ ਸੁਨੇਹਾ ਭੇਜਿਆ ਕਿ ਜੇਕਰ ਉਹ ਗੁਰੂ ਤੇਗ ਬਹਾਦਰ ਨੂੰ ਮੁਸਲਮਾਨ ਬਣਾ ਲਵੇ ਤਾਂ ਸਾਰੇ ਇਸਲਾਮ ਕਬੂਲ ਕਰ ਲੈਣਗੇ। ਫਿਰ ਆਪ ਜੀ ਨੇ ਦਿੱਲੀ ਵੱਲ ਸ਼ਹਾਦਤ ਲਈ ਕੂਚ ਕੀਤਾ।",
    "trial": "Arrested at Agra, Guru Teg Bahadur was brought to Delhi in iron chains and imprisoned inside a tiny iron cage in the Kotwali at Chandni Chowk. The imperial authorities offered three alternatives: display supernatural miracles (karamat) to validate divine favor, embrace Islam, or face a torturous death. The Guru serenely replied that occult miracles were the wrath of God and that forced conversion was an insult to the Creator. To break the Guru’s will, the qazis orchestrated horrific executions of his three beloved companions before his eyes: Bhai Mati Das was tied between two pillars and sawed alive in half from the scalp down; Bhai Dayala was cast alive into a boiling cauldron of oil; Bhai Sati Das was wrapped in cotton and burned alive. The Guru looked upon his blessed companions, praising their devotion and affirming the immortality of the soul. On 11 November 1675, amidst a weeping multitude, Guru Teg Bahadur was publicly beheaded at Chandni Chowk (Gurdwara Sis Ganj Sahib). Bhai Jaita daringly carried the severed head to Anandpur Sahib, while Bhai Lakhi Shah Vanjara burned his own home to cremate the sacred body (Gurdwara Rakab Ganj Sahib).",
    "trialLocal": "गुरु तेग बहादुर जी को दिल्ली के चांदनी चौक की कोतवाली में लोहे के संकरे पिंजरे में कैद किया गया। उन्हें तीन विकल्प दिए गए: चमत्कार दिखाएं, इस्लाम कबूल करें या मृत्यु का वरण करें। गुरु जी ने अडिग रहकर उत्तर दिया कि चमत्कार परमात्मा के नियम के विरुद्ध है और धर्म कभी जबरदस्ती नहीं थोपा जा सकता। गुरु जी का मनोबल तोड़ने के लिए उनके परम शिष्यों को उनके सामने अमानवीय यातनाएं देकर शहीद किया गया: भाई मती दास जी को आरे से चीर दिया गया, भाई दयाला जी को खौलते तेल के कड़ाह में उबाला गया, और भाई सती दास जी को रुई में लपेटकर जीवित जला दिया गया। गुरु जी ने शांत भाव से ईश्वर के भाणे को मीठा माना। ११ नवंबर १६७५ को गुरु जी का पावन शीश कलम कर दिया गया।",
    "trialPa": "ਗੁਰੂ ਤੇਗ ਬਹਾਦਰ ਜੀ ਨੂੰ ਚਾਂਦਨੀ ਚੌਕ ਦੀ ਕੋਤਵਾਲੀ ਵਿੱਚ ਲੋਹੇ ਦੇ ਪਿੰਜਰੇ ਵਿੱਚ ਬੰਦ ਰੱਖਿਆ ਗਿਆ। ਆਪ ਜੀ ਨੂੰ ਤਿੰਨ ਸ਼ਰਤਾਂ ਦਿੱਤੀਆਂ ਗਈਆਂ: ਕਰਾਮਾਤ ਦਿਖਾਓ, ਇਸਲਾਮ ਕਬੂਲ ਕਰੋ ਜਾਂ ਮੌਤ। ਗੁਰੂ ਜੀ ਨੇ ਸਭ ਕੁਝ ਰੱਦ ਕਰ ਦਿੱਤਾ। ਆਪ ਦਾ ਹੌਸਲਾ ਤੋੜਨ ਲਈ ਆਪ ਜੀ ਦੇ ਪਿਆਰੇ ਸਿੱਖਾਂ ਨੂੰ ਸ਼ਹੀਦ ਕੀਤਾ ਗਿਆ: ਭਾਈ ਮਤੀ ਦਾਸ ਜੀ ਨੂੰ ਆਰੇ ਨਾਲ ਚੀਰਿਆ ਗਿਆ, ਭਾਈ ਦਿਆਲਾ ਜੀ ਨੂੰ ਉਬਲਦੀ ਦੇਗ ਵਿੱਚ ਪਾਇਆ ਗਿਆ ਅਤੇ ਭਾਈ ਸਤੀ ਦਾਸ ਜੀ ਨੂੰ ਰੂੰ ਵਿੱਚ ਲਪੇਟ ਕੇ ਸਾੜਿਆ ਗਿਆ। ਗੁਰੂ ਜੀ ਅਡੋਲ ਰਹੇ। ੧੧ ਨਵੰਬਰ ੧੬੭੫ ਨੂੰ ਆਪ ਜੀ ਦਾ ਸੀਸ ਚਾਂਦਨੀ ਚੌਕ ਵਿਖੇ ਧੜ ਤੋਂ ਵੱਖ ਕਰਕੇ ਸ਼ਹੀਦ ਕਰ ਦਿੱਤਾ ਗਿਆ। ਸੀਸ ਦੀਆ ਪਰ ਸਿਰੜੁ ਨ ਦੀਆ।",
    "teaching": "Guru Teg Bahadur bequeathed the eternal declaration of spiritual fearlessness: 'Bhau kahu ko det neh, neh bhau manat aan'—Frighten no one, and live in fear of none. His life proved that the right to practice one's conscience and worship freely is an inviolable divine endowment. He taught the path of total equanimity—to remain untouched by praise or slander, gold or clay, pleasure or pain, anchored solely in the remembrance of the Eternal Lord.",
    "teachingLocal": "गुरु तेग बहादुर जी का अमर उपदेश है: \"भै काहू कउ देत नहि नहि भै मानत आन\" — न किसी को भयभीत करो और न किसी के भय को स्वीकार करो। उन्होंने सिखाया कि सुख और दुख, मान और अपमान, सोने और मिट्टी में समान दृष्टि रखना ही सच्ची मुक्ति है। धार्मिक स्वतंत्रता प्रत्येक मनुष्य का जन्मसिद्ध अधिकार है।",
    "teachingPa": "ਗੁਰੂ ਜੀ ਦਾ ਅਮਰ ਫ਼ੁਰਮਾਨ ਹੈ: \"ਭੈ ਕਾਹੂ ਕਉ ਦੇਤ ਨਹਿ ਨਹਿ ਭੈ ਮਾਨਤ ਆਨ ॥\" ਅਰਥਾਤ ਨਾ ਕਿਸੇ ਨੂੰ ਡਰਾਓ ਅਤੇ ਨਾ ਕਿਸੇ ਦਾ ਡਰ ਮੰਨੋ। ਆਪ ਜੀ ਨੇ ਸਿਖਾਇਆ ਕਿ ਸੁਖ-ਦੁਖ ਅਤੇ ਮਾਨ-ਅਪਮਾਨ ਵਿੱਚ ਇੱਕ-ਸਮਾਨ ਰਹਿਣਾ ਹੀ ਅਸਲ ਅਧਿਆਤਮਿਕ ਜੀਵਨ ਹੈ।",
    "moral": "Stand up boldly for the oppressed, even when their traditions are not your own. True spiritual courage lies in giving your life for the sacred liberty and dignity of humanity without harboring hatred toward your persecutors.",
    "moralLocal": "कमजोरों और पीड़ितों के अधिकारों के लिए निर्भय होकर खड़े हों। दूसरों की स्वतंत्रता की रक्षा के लिए अपने प्राणों का बलिदान दे देना ही सर्वोच्च धर्म है।",
    "moralPa": "ਦੱਬੇ-ਕੁਚਲੇ ਲੋਕਾਂ ਦੇ ਹੱਕਾਂ ਲਈ ਬਿਨਾਂ ਕਿਸੇ ਡਰ ਦੇ ਖੜ੍ਹੇ ਹੋਣਾ ਅਤੇ ਦੂਜਿਆਂ ਦੇ ਧਰਮ ਤੇ ਅਣਖ ਦੀ ਰੱਖਿਆ ਲਈ ਆਪਣਾ ਆਪ ਵਾਰ ਦੇਣਾ ਹੀ ਸਭ ਤੋਂ ਵੱਡੀ ਬਹਾਦਰੀ ਹੈ।",
    "legacy": "Revered eternally as 'Hind di Chadar' (The Shield of India), Guru Teg Bahadur's supreme martyrdom changed the course of Indian history. It inspired his son Guru Gobind Singh to create the Khalsa Panth to vanquish oppression and forever cemented the principle that state power must bow before the sanctity of human conscience.",
    "legacyLocal": "गुरु तेग बहादुर जी को इतिहास में सदैव 'हिन्द दी चादर' के रूप में स्मरण किया जाता है। उनके सर्वोच्च बलिदान ने भारत के इतिहास की धारा बदल दी और उनके सुपुत्र गुरु गोविंद सिंह जी द्वारा खालसा पंथ की स्थापना की नैतिक आधारशिला रखी।",
    "legacyPa": "ਆਪ ਜੀ ਨੂੰ ਜਗਤ ਵਿੱਚ 'ਹਿੰਦ ਦੀ ਚਾਦਰ' ਵਜੋਂ ਸਦਾ ਯਾਦ ਕੀਤਾ ਜਾਂਦਾ ਹੈ। ਆਪ ਜੀ ਦੀ ਸ਼ਹਾਦਤ ਨੇ ਭਾਰਤ ਵਿੱਚ ਧਾਰਮਿਕ ਆਜ਼ਾਦੀ ਦਾ ਮੁੱਢ ਬੰਨ੍ਹਿਆ ਅਤੇ ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ ਵੱਲੋਂ ਖ਼ਾਲਸਾ ਪੰਥ ਦੀ ਸਾਜਨਾ ਦਾ ਮਾਰਗ ਪੱਧਰਾ ਕੀਤਾ।",
    "source": "Sri Guru Granth Sahib (Salok Mahalla 9, Angs 1426–1429), Sri Dasam Granth (Bachittar Natak 5.13–16), Bhat Vahis, Sri Gur Sobha",
    "sourceLocal": "श्री गुरु ग्रंथ साहिब (सलोक महला ९, अंग १४२६–१४२९), श्री दसम ग्रंथ (बचित्तर नाटक ५.१३–१६), भाट वाहियां, श्री गुर सोभा",
    "sourcePa": "ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ (ਸਲੋਕ ਮਹਲਾ ੯, ਅੰਗ ੧੪੨੬–੧੪੨੯), ਸ੍ਰੀ ਦਸਮ ਗ੍ਰੰਥ (ਬਚਿਤ੍ਰ ਨਾਟਕ), ਭੱਟ ਵਹੀਆਂ, ਸ੍ਰੀ ਗੁਰ ਸੋਭਾ",
    "sourceCitations": [
      {
        "sourceName": "Sri Guru Granth Sahib",
        "sourceRef": "Salok Mahalla 9 (Angs 1426–1429)",
        "tier": 1
      },
      {
        "sourceName": "Sri Dasam Granth",
        "sourceRef": "Bachittar Natak, Chapter 5, Verses 13–16 (\"Thekhor phor dilli sir\")",
        "tier": 1
      },
      {
        "sourceName": "Bhat Vahi Talauda",
        "sourceRef": "Parganah Jind (Contemporary 1675 Record)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Bhau kahu ko det neh, neh bhau manat aan; kaho Nanak sun re mana, gyani tahi bakhan.",
      "attribution": "One who frightens no one, and who is afraid of no one — says Nanak, hear this, O mind: call that person spiritually enlightened. — Guru Teg Bahadur, Sri Guru Granth Sahib (Ang 1427)"
    },
    "quoteLocal": {
      "text": "भै काहू कउ देत नहि नहि भै मानत आन। कहु नानक सुनि रे मना गिआनी ताहि बखानि॥",
      "attribution": "गुरु तेग बहादुर जी (श्री गुरु ग्रंथ साहिब, अंग १४२७)"
    },
    "quotePa": {
      "text": "ਭੈ ਕਾਹੂ ਕਉ ਦੇਤ ਨਹਿ ਨਹਿ ਭੈ ਮਾਨਤ ਆਨ ॥ ਕਹੁ ਨਾਨਕ ਸੁਨਿ ਰੇ ਮਨਾ ਗਿਆਨੀ ਤਾਹਿ ਬਖਾਨਿ ॥",
      "attribution": "ਗੁਰੂ ਤੇਗ ਬਹਾਦਰ ਜੀ (ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ, ਅੰਗ ੧੪੨੭)"
    }
  },
  {
    "id": "mahavira-trials",
    "name": "Mahavira",
    "nameLocal": "भगवान महावीर",
    "era": "599–527 BCE",
    "eraLocal": "५९९–५२७ ईसा पूर्व",
    "tradition": "jain",
    "region": "Kundagrama / Vaishali / Pavapuri, Bihar",
    "regionLocal": "कुण्डग्राम / वैशाली / पावापुरी, बिहार",
    "emoji": "🤲",
    "tagline": "The 24th Tirthankara who renounced royal sovereignty, endured twelve and a half years of extreme bodily penance and silent austerity, and perfected the eternal science of universal non-violence (Ahimsa Paramo Dharmah).",
    "taglineLocal": "जैन धर्म के २४वें तीर्थंकर जिन्होंने राजसी सुखों का त्याग कर साढ़े बारह वर्षों तक मौन तपस्या की और \"अहिंसा परमो धर्मः\" का शाश्वत संदेश दिया।",
    "journey": "Vardhamana Mahavira was born in 599 BCE into the royal Jnatrika Kshatriya clan at Kundagrama, near the great republic of Vaishali in modern Bihar. Born to King Siddhartha and Queen Trishala, his birth heralded unprecedented prosperity across the kingdom, earning him the name 'Vardhamana' (The One Who Brings Growth). Endowed from infancy with matchless physical courage, he was honored with the title 'Mahavira' (The Great Hero) when he calmly subdued a terrifying rogue elephant and rescued his playmates from a monstrous venomous serpent without striking a blow or harboring malice.\n\nDespite enjoying the utmost luxuries of palaces, Vardhamana lived with an innate, blazing dispassion (vairagya) toward sensory pleasures. Possessing deep filial reverence, he vowed never to cause sorrow to his parents by renouncing the world during their lifetimes. At age thirty, following the peaceful passing of his parents and with the formal blessing of his elder brother Nandivardhana, Vardhamana distributed his entire royal treasury and worldly fortune among the poor, destitute, and disabled. He plucked out his royal hair in five handfuls (Kesh Lochan), discarded princely silken robes, and walked into the desolate wilderness dressed only in a single piece of coarse cloth.\n\nAfter thirteen months, even that solitary rag of cloth tore and fell away; from that moment onward, Mahavira wandered completely naked (Digambara, sky-clad), accepting absolute vulnerability and making the open universe his only shelter. For twelve years, five months, and fifteen days, he underwent an unbroken crucible of severe tapasya (penance), silent dhyana (meditative contemplation), and prolonged fasts lasting weeks and months. He never sought shelter from biting winter frost, torrential monsoon downpours, or scorching summer heat. He never stayed more than one night in a village or five nights in a walled town, walking with eyes fixed upon the ground six feet ahead, sweeping his gaze to avoid treading on even the smallest insect.\n\nOn the tenth day of the bright half of Vaisakha, on the sacred banks of the Rjupalika river outside the village of Jrmbhikagrama, seated in deep meditation under a Sala tree in the cow-milking posture (godohikasana), Mahavira obliterated all four soul-obscuring karmic veils (Ghatiya Karmas) and attained Kevala Jnana—supreme, unobstructed, infinite omniscience and liberation. For the remaining thirty years of his earthly existence, he walked barefoot across northern India, preaching the doctrine of Ahimsa (non-violence), Anekantavada (multi-faceted reality), and Aparigraha (non-attachment), establishing the fourfold community of monks, nuns, laymen, and laywomen (Chaturvidha Sangha) before attaining Mahaparinirvana at Pavapuri at age seventy-two.",
    "journeyLocal": "भगवान महावीर का जन्म ५९९ ईसा पूर्व में वैशाली गणराज्य के निकट कुण्डग्राम में राजा सिद्धार्थ और महारानी त्रिशला के घर हुआ था। उनके जन्म से राज्य में अपार समृद्धि आई, इसलिए उनका नाम 'वर्धमान' रखा गया। बाल्यकाल में एक मतवाले हाथी को शांत करने और एक विषधर सर्प के भय से मित्रों को बचाने के कारण उन्हें 'महावीर' नाम से विभूषित किया गया।\n\nराजसी वैभव में पले-बढ़े होने के बावजूद वर्धमान का मन संसार से विरक्त था। माता-पिता के देवलोक गमन के पश्चात, तीस वर्ष की आयु में बड़े भाई की आज्ञा लेकर उन्होंने अपना समस्त धन निर्धनों में बांट दिया। अपने हाथों से केश-लोचन कर उन्होंने राजवस्त्र उतार दिए और केवल एक वस्त्र धारण कर सन्यास ले लिया। तेरह माह पश्चात वह वस्त्र भी छूट गया और वे दिगंबर (आकाश को ही वस्त्र मानने वाले) हो गए।\n\nअगले साढ़े बारह वर्षों तक भगवान महावीर ने अत्यंत कठोर मौन तपस्या की। वे एक गांव में एक रात और नगर में पांच रात से अधिक नहीं रुकते थे। शीत, ग्रीष्म और वर्षा की परवाह किए बिना वे निरंतर ध्यान में लीन रहे। वे जमीन पर नजर रखकर चलते थे ताकि किसी सूक्ष्म जीव को भी ठेस न पहुंचे।\n\nवैशाख शुक्ल दशमी के दिन, जृंभिक ग्राम के निकट ऋजुपालिका नदी के तट पर शाल वृक्ष के नीचे गोदोहासन में ध्यानस्थ रहते हुए उन्हें 'केवल ज्ञान' (सर्वज्ञता) की प्राप्ति हुई। इसके बाद उन्होंने तीस वर्षों तक 'अहिंसा परमो धर्मः', 'अनेकांतवाद' और 'अपरिग्रह' का उपदेश दिया और पावापुरी में बहत्तर वर्ष की आयु में निर्वाण प्राप्त किया।",
    "trial": "Mahavira’s trial was the ultimate perfection of Kshama (forgiveness) and Titiksha (endurance of suffering without retaliation). In the inhospitable frontier of Ladha (ancient Bengal), fierce villagers attacked him with clubs, set vicious hunting dogs upon his bare limbs, threw blazing embers and filth at his body, and pierced his skin with thorny brambles; Mahavira endured every assault in utter silence, radiating boundless love and compassion upon his abusers. His most harrowing trial occurred in the hamlet of Chammani: while seated in motionless meditation in a deserted cowshed, an enraged cowherd, suspecting the silent ascetic of hiding his lost bullocks, drove long, sharpened wooden pegs into both of Mahavira’s ears until their ends met within his skull. Mahavira sat like a granite mountain, devoid of pain or malice. Days later, when a compassionate physician extracted the embedded spikes with surgical tongs, causing excruciating agony that made the earth tremble, Mahavira harbored not the slightest resentment, only profound pity for the karmic suffering the ignorant cowherd had invited upon himself.",
    "trialLocal": "भगवान महावीर की सबसे कठिन परीक्षा उनकी असीम क्षमा और घोर उपसर्गों को मौन भाव से सहने की क्षमता थी। राढ़ देश की यात्रा के समय हिंसक ग्रामीणों ने उन पर कुत्ते छोड़े, लाठियों से प्रहार किए और कांटे फेंके, परंतु महावीर ने सदा प्रेम की दृष्टि रखी। चामरी ग्राम में जब वे ध्यानमग्न थे, तब एक ग्वाले ने अपने बैल खो जाने के क्रोध में महावीर के दोनों कानों में नुकीली लकड़ी की खूंटियां ठोक दीं। असह्य पीड़ा होने पर भी महावीर की समाधि भंग नहीं हुई और उनके मन में ग्वाले के प्रति रत्ती भर भी क्रोध नहीं आया। जब बाद में शल्य-चिकित्सक ने संडासी से वे खूंटियां निकालीं, तब भी उन्होंने उस अज्ञानी ग्वाले के प्रति अगाध करुणा की ही वर्षा की।",
    "teaching": "Mahavira codified the supreme bedrock of Jain philosophy: Ahimsa Paramo Dharmah—non-violence is the supreme spiritual law. One must not injure, exploit, enslave, or cause pain to any sentient creature, whether microscopic or visible, through thought, word, or deed. He revealed Anekantavada (the doctrine of multi-sided reality), teaching that dogmatic certainty breeds conflict, whereas recognizing varied perspectives fosters harmony. Through Aparigraha, he urged humanity to voluntarily limit possessions to conquer greed and end environmental destruction.",
    "teachingLocal": "भगवान महावीर का मूल उपदेश है 'अहिंसा परमो धर्मः' — मन, वचन और कर्म से किसी भी सूक्ष्म या स्थूल जीव को कष्ट न पहुंचाना ही धर्म का सार है। उन्होंने 'अनेकांतवाद' और 'स्याद्वाद' का दर्शन दिया, जो सिखाता है कि सत्य के कई पहलू होते हैं और दूसरों के विचारों का सम्मान करना चाहिए। 'अपरिग्रह' का सिद्धांत सिखाता है कि अपनी आवश्यकताओं को सीमित रखें ताकि समाज में विषमता न फैले।",
    "moral": "Conquer anger with forgiveness, pride with humility, deceit with straightforwardness, and greed with contentment. Honor the sanctity of every living soul, for all life seeks happiness and dreads pain.",
    "moralLocal": "क्रोध को क्षमा से, अहंकार को विनम्रता से, कपट को सरलता से और लोभ को संतोष से जीतें। संसार के समस्त जीवों के प्रति मैत्री भाव रखें, क्योंकि सभी प्राणी जीना चाहते हैं, मृत्यु किसी को प्रिय नहीं।",
    "legacy": "Mahavira systematized Jainism into a timeless ethical compass that championed universal vegetarianism, environmental stewardship, and absolute non-violence. His teachings profoundly shaped Indian civilizational ethics and inspired Mahatma Gandhi’s twentieth-century philosophy of Satyagraha.",
    "legacyLocal": "भगवान महावीर ने अहिंसा और करुणा को जन-जन का आचरण बनाया। उनके उपदेशों ने भारतीय संस्कृति में शाकाहार और जीव-दया को अमर कर दिया तथा आधुनिक युग में महात्मा गांधी के 'सत्याग्रह' की प्रेरणा बने।",
    "source": "Acharanga Sutra (Book 1, Lecture 8 - Uvasagga & Tapasya), Kalpa Sutra (Lives of the Jinas), Uttaradhyayana Sutra",
    "sourceLocal": "आचारांग सूत्र (प्रथम श्रुतस्कंध, अष्टम अध्ययन - तप व उपसर्ग), कल्प सूत्र (जिन चरित्र), उत्तराध्ययन सूत्र",
    "sourceCitations": [
      {
        "sourceName": "Acharanga Sutra",
        "sourceRef": "Book 1, Lecture 8 (The Pillow-Sitting Chapter / Trials of Mahavira)",
        "tier": 1
      },
      {
        "sourceName": "Kalpa Sutra of Bhadrabahu",
        "sourceRef": "Section on the Life of Mahavira (Verses 110–125)",
        "tier": 1
      },
      {
        "sourceName": "Uttaradhyayana Sutra",
        "sourceRef": "Chapter 23 (Kesi-Gautama Dialogue)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Savve pana piyauya, sukhsayano dukkha-padikula, piye-jiviye, jiviyukama.",
      "attribution": "All living beings desire to live; all beings dread suffering and love happiness; life is dear to all beings. — Mahavira, Acharanga Sutra 1.2.3"
    },
    "quoteLocal": {
      "text": "सव्वे पाणा पियाउया सुहसाया दुक्खपडिकूला अप्पियवहा पियजीविणो जीविउकामा।",
      "attribution": "भगवान महावीर (आचारांग सूत्र १.२.३)"
    }
  },
  {
    "id": "buddha",
    "name": "Siddhartha Gautama (The Buddha)",
    "nameLocal": "सिद्धार्थ गौतम (बुद्ध)",
    "era": "563–483 BCE",
    "eraLocal": "५६३–४८३ ईसा पूर्व",
    "tradition": "buddhist",
    "region": "Lumbini / Bodh Gaya / Sarnath / Kushinagar",
    "regionLocal": "लुम्बिनी / बोधगया / सारनाथ / कुशीनगर",
    "emoji": "☸️",
    "tagline": "The Awakened One who renounced imperial palaces to conquer universal suffering, revealing the Middle Path and the Noble Eightfold Way to inner liberation and Nirvana.",
    "taglineLocal": "तथागत बुद्ध जिन्होंने राजवैभव त्यागकर मानव दुख के निवारण हेतु मध्यम मार्ग और अष्टांगिक मार्ग की खोज की और विश्व को प्रज्ञा व करुणा का संदेश दिया।",
    "journey": "Prince Siddhartha Gautama was born in 563 BCE in the tranquil sal grove of Lumbini to King Suddhodana, ruler of the Shakya clan of Kapilavastu, and Queen Mahamaya. Prophesied by royal astrologers to become either a world-conquering monarch (Chakravartin) or a world-renouncing Awakened Master (Buddha), his anxious father shielded the prince inside magnificent pleasure palaces, surrounding him with sensory splendors, celestial gardens, and festive musicians, while systematically concealing every sign of human pain, decay, and mortality. Siddhartha mastered literature, philosophy, and warrior archery, winning the hand of Princess Yashodhara and fathering a beloved son, Rahula.\n\nYet, a divine unrest burned within his noble spirit. Venturing outside the guarded palace gates with his charioteer Channa, Siddhartha encountered the historic 'Four Sights' that shattered his illusions: a decrepit, trembling old man bent over a staff; an agonizingly afflicted patient groaning with fever; a lifeless corpse borne to the cremation grounds amidst weeping relatives; and a tranquil, peaceful yellow-robed mendicant walking with serene grace. In that transformative flash of insight, Siddhartha realized that youth, health, and earthly life are fragile, ephemeral phenomena bound to unavoidable decay (anicca) and suffering (dukkha). At the age of twenty-nine, in the momentous Great Renunciation (Mahabhinikkhamana), he cast off his silk robes, kissed his slumbering family farewell in the dead of night, cut his long hair with his sword at the Anoma river, and entered the forest as an ascetic seeker.\n\nFor six grueling years, Siddhartha studied under the foremost contemplative masters of the age, Alara Kalama and Uddaka Ramaputta, quickly attaining the highest formless states of meditative absorption (samadhi). Yet, perceiving that trance states did not obliterate the latent seeds of suffering, he joined five ascetics in the forests of Uruvela to practice severe mortification—starving himself until his flesh wasted away, his ribs projected like roof-rafters, and his spine could be touched through his stomach. Collapsing unconscious upon the dusty ground on the banks of the Nairanjana river, he realized that self-torture merely exhausts the body and darkens the mind, just as sensual indulgence enervates it. Accepting a nourishing bowl of milk-rice (kheer) from the maiden Sujata, Siddhartha discovered the radiant 'Middle Way' (Majjhima Patipada) between self-mortification and self-indulgence.\n\nSitting beneath the sacred pipal tree (Bodhi tree) at Bodh Gaya, Siddhartha made an unyielding vow: 'Let my skin, sinews, and bones wither, let my flesh and blood dry up; until I attain supreme, unexcelled Enlightenment, I shall not stir from this seat.' Through the three watches of the full-moon night of Vaisakha, he dissolved all psychic defilements, penetrated the Twelve Links of Dependent Origination (Paticcasamuppada), and arose at dawn as the Buddha—The Awakened One. For forty-five years, he walked across northern India, setting in motion the Wheel of Dhamma (Dhammacakkappavattana) at Sarnath, teaching kings and outcasts alike without distinction of caste, establishing the monastic Sangha, and liberating thousands until entering Parinirvana at Kushinagar at age eighty.",
    "journeyLocal": "राजकुमार सिद्धार्थ गौतम का जन्म ५६३ ईसा पूर्व में कपिलवस्तु के शाक्य नरेश शुद्धोदन और महारानी मायादेवी के घर लुम्बिनी के पावन वन में हुआ था। जन्म के समय भविष्यवक्ता ऋषियों ने भविष्यवाणी की थी कि यह बालक या तो चक्रवर्ती सम्राट बनेगा या महान संन्यासी बनकर जगत का कल्याण करेगा। पिता ने उन्हें दुखों से दूर रखने के लिए तीन ऋतुओं के अनुकूल विलासपूर्ण महलों में रखा। उनका विवाह राजकुमारी यशोधरा से हुआ और उनके घर राहुल नामक पुत्र का जन्म हुआ।\n\nएक दिन नगर-भ्रमण के समय सिद्धार्थ ने 'चार दृश्य' देखे: एक जर्जर वृद्ध, एक कराहता हुआ रोगी, एक शवयात्रा और एक शांत संन्यासी। इन दृश्यों ने राजकुमार के हृदय को झकझोर दिया। उन्हें यह बोध हुआ कि संसार का समस्त सुख नश्वर है और प्रत्येक प्राणी जरा, व्याधि और मृत्यु के अधीन है। उनतीस वर्ष की आयु में, सत्य की खोज में उन्होंने आधी रात को राजमहल, पत्नी और नवजात शिशु का त्याग कर दिया और संन्यास धारण कर लिया।\n\nसिद्धार्थ ने आलार कालाम और उद्दक रामपुत्त जैसे आचार्यों से गहन ध्यान की शिक्षा ली, किंतु तृप्ति न मिलने पर उन्होंने उरुवेला (बोधगया) के वन में छह वर्षों तक अत्यंत कठोर तपस्या की। शरीर सूखकर कंकाल बन गया और वे मृत्यु के कगार पर पहुंच गए। तब उन्हें बोध हुआ कि शरीर को सुखाने से ज्ञान नहीं मिलता, बल्कि वीणा के तार को न इतना ढीला छोड़ना चाहिए कि स्वर न निकले और न इतना कसना चाहिए कि वह टूट जाए। सुजाता के हाथों खीर ग्रहण कर उन्होंने 'मध्यम मार्ग' अपनाया।\n\nबोधिवृक्ष के नीचे दृढ़ संकल्प लेकर ध्यान में बैठे सिद्धार्थ ने वैशाख पूर्णिमा की रात्रि में आंतरिक अविद्या को नष्ट किया और 'बुद्ध' (जागृत पुरुष) बने। सारनाथ में उन्होंने अपना पहला उपदेश दिया और 'धर्मचक्र प्रवर्तन' किया। अगले पैंतालीस वर्षों तक वे निरंतर पदयात्रा करते रहे और अस्सी वर्ष की आयु में कुशीनगर में महापरिनिर्वाण प्राप्त किया।",
    "trial": "The Buddha’s defining trial was the monumental confrontation beneath the Bodhi tree against Mara—the cosmic personification of illusion, sensual desire, fear, and egoic clinging. As twilight gathered, Mara unleashed howling typhoons, earthquakes, flaming rock showers, and horrific demonic legions armed with spears and thunderbolts to drive Siddhartha from his seat. Siddhartha remained immovable, transforming the demonic weapons into showers of fragrant celestial flowers through the power of loving-kindness (metta). Mara then manifested his three enchanting daughters—Tanha (Craving), Arati (Aversion), and Raga (Sensual Lust)—who danced with divine allure, yet Siddhartha looked upon them with complete transparency and detachment. Finally, Mara challenged Siddhartha’s spiritual legitimacy, shouting: 'By whose authority do you claim this seat of awakening?' Remaining in serene stillness, Siddhartha reached down his right hand and touched the soil in the historic Earth-Witness gesture (Bhumisparsha Mudra), calling the ancient Mother Earth to bear witness to his millions of lifetimes of selfless virtue and sacrifice; the earth roared with thunder, causing Mara’s illusions to scatter into oblivion.",
    "trialLocal": "बुद्ध की सबसे महान परीक्षा बोधिवृक्ष के नीचे कामदेव 'मार' और उसकी आसुरी सेना के साथ आंतरिक युद्ध था। मार ने उन्हें ध्यान से डिगाने के लिए भीषण आंधी, प्रलयंकारी अग्नि, भूकंप और राक्षसों की सेना भेजी, किंतु बुद्ध ने अपने मैत्री-भाव (करुणा) से उन सभी प्रहारों को फूलों की वर्षा में बदल दिया। इसके बाद मार ने अपनी तीन सुंदर पुत्रियों—तृष्णा, अरति और राग को भेजा, किंतु बुद्ध के मुख पर कोई विकार नहीं आया। अंत में जब मार ने उनके ज्ञान प्राप्त करने के अधिकार पर प्रश्न उठाया, तो बुद्ध ने शांत भाव से अपनी कनिष्ठिका अंगुली से पृथ्वी का स्पर्श किया (भूमिस्पर्श मुद्रा)। पृथ्वी ने गड़गड़ाहट के साथ गवाही दी कि सिद्धार्थ इस ज्ञान के पूर्ण अधिकारी हैं, और मार का अहंकार चकनाचूर हो गया।",
    "teaching": "The Buddha revealed the Four Noble Truths (Cattari Ariyasaccani): Life contains suffering (Dukkha); suffering originates from craving and ignorant attachment (Samudaya); suffering ceases completely with the eradication of craving (Nirodha); and the path leading to the cessation of suffering is the Noble Eightfold Path (Ariya Atthangika Magga)—comprising Right View, Right Resolve, Right Speech, Right Action, Right Livelihood, Right Effort, Right Mindfulness, and Right Concentration. He taught the law of Impermanence (Anicca), Non-Self (Anatta), and Dependent Origination (Paticcasamuppada), establishing that true peace is found in the tranquil stillness of Nirvana.",
    "teachingLocal": "भगवान बुद्ध ने चार आर्य सत्यों का उपदेश दिया: संसार में दुख है; दुख का कारण तृष्णा (इच्छा और आसक्ति) है; दुख का निवारण संभव है; और दुख निवारण का मार्ग 'अष्टांगिक मार्ग' है—सम्यक दृष्टि, सम्यक संकल्प, सम्यक वाक, सम्यक कर्म, सम्यक आजीविका, सम्यक व्यायाम, सम्यक स्मृति और सम्यक समाधि। उन्होंने सिखाया कि किसी भी चरम पर जाने के बजाय जीवन में 'मध्यम मार्ग' अपनाना चाहिए।",
    "moral": "Do not depend on outer rituals or external saviors for your freedom. Tame your wandering mind through awareness, purify your actions with universal compassion, and become an island of luminous truth unto yourself.",
    "moralLocal": "अपनी मुक्ति के लिए बाह्य आडंबरों या दूसरों पर निर्भर न रहें। ध्यान द्वारा अपने मन को वश में करें, सभी प्राणियों के प्रति करुणा रखें और 'अप्प दीपो भव' — स्वयं अपना प्रकाश बनें।",
    "legacy": "The Buddha’s teachings gave birth to a universal philosophical and spiritual tradition that permeated Asia and reshaped world thought. His emphasis on rational inquiry, non-violence (Ahimsa), mindfulness, and moral integrity continues to illuminate millions across every continent.",
    "legacyLocal": "भगवान बुद्ध के विचारों ने भारत की सीमाओं को लांघकर पूरे विश्व को शांति और करुणा का पाठ पढ़ाया। नालंदा और तक्षशिला जैसे महान विश्वविद्यालयों में उनके दर्शन का अध्ययन हुआ और आज भी विपश्यना व बौद्ध दर्शन आधुनिक विज्ञान और मनोविज्ञान को प्रेरित कर रहे हैं।",
    "source": "Pali Canon: Majjhima Nikaya (Ariyapariyesana Sutta 26), Samyutta Nikaya (Dhammacakkappavattana Sutta 56.11), Digha Nikaya (Mahaparinibbana Sutta 16)",
    "sourceLocal": "पालि त्रिपिटक: मज्झिम निकाय (अरियपरियेसन सुत्त २६), संयुत्त निकाय (धम्मचक्कप्पवत्तन सुत्त ५६.११), दीघ निकाय (महापरिनिब्बाण सुत्त १६)",
    "sourceCitations": [
      {
        "sourceName": "Majjhima Nikaya",
        "sourceRef": "Ariyapariyesana Sutta (MN 26 - The Noble Search)",
        "tier": 1
      },
      {
        "sourceName": "Samyutta Nikaya",
        "sourceRef": "Dhammacakkappavattana Sutta (SN 56.11 - Setting the Wheel in Motion)",
        "tier": 1
      },
      {
        "sourceName": "Digha Nikaya",
        "sourceRef": "Mahaparinibbana Sutta (DN 16 - Last Days of the Buddha)",
        "tier": 1
      },
      {
        "sourceName": "Dhammapada",
        "sourceRef": "Yamaka-vagga & Appamada-vagga (Verses 1–32)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Atta hi attano natho, ko hi natho paro siya; attana hi sudantena, natham labhati dullabham.",
      "attribution": "One truly is the protector of oneself; who else could the protector be? With oneself thoroughly tamed, one discovers a refuge that is hard to find. — The Buddha, Dhammapada (Verse 160)"
    },
    "quoteLocal": {
      "text": "अत्ता हि अत्तनो नाथो को हि नाथो परो सिया। अत्तना हि सुदन्तेन नाथं लभति दुल्लभं॥",
      "attribution": "गौतम बुद्ध (धम्मपद, गाथा १६०)"
    }
  },
  {
    "id": "vivekananda",
    "name": "Swami Vivekananda",
    "nameLocal": "स्वामी विवेकानंद",
    "era": "1863–1902 CE",
    "eraLocal": "१८६३–१९०२ ईस्वी",
    "tradition": "hindu",
    "region": "Calcutta (Kolkata), Bengal / Chicago / Belur Math",
    "regionLocal": "कोलकाता, बंगाल / शिकागो / बेलूर मठ",
    "emoji": "🔥",
    "tagline": "The cyclonic monk and lion of Vedanta who awakened a sleeping nation, introduced Indian philosophy to the West at the 1893 Parliament of Religions, and synthesized spiritual liberation with the worship of God through the service of humanity (Daridra Narayana).",
    "taglineLocal": "वेदांत के जाग्रत सिंह जिन्होंने शिकागो के धर्म संसद में भारत के सनातन ज्ञान की पताका फहराई और दरिद्र नारायण की सेवा को ही सच्ची ईश्वर-भक्ति घोषित किया।",
    "journey": "Swami Vivekananda was born Narendranath Datta on 12 January 1863 into a cultured aristocratic family in Calcutta. Endowed with a towering intellect, photic memory, athletic prowess, and a deep longing for truth, the young Narendra devoured Western philosophy, science, and the classical Sanskrit scriptures. Yet, intellectual debates failed to extinguish the burning metaphysical question that tormented his soul: 'Sir, have you seen God?' He questioned the leaders of the Brahmo Samaj and the greatest scholars of Bengal, receiving only evasive scholarly rhetoric, until he was brought before the mystic saint Sri Ramakrishna Paramahamsa at the Kali temple of Dakshineswar in 1881. Narendra asked him the identical question. Ramakrishna looked deeply into his eyes and replied with childlike serenity: 'Yes, Narendra, I have seen Him; I see Him just as I see you here, only far more intensely. And you too can see Him if you yearn for Him.'\n\nOver five years of rigorous spiritual training, Sri Ramakrishna dissolved Narendra's skepticism through profound direct experience, initiating him into the highest states of Nirvikalpa Samadhi and harmonizing the diverse paths of Hinduism. Following Ramakrishna’s passing in 1886, Narendra gathered his brother disciples at an abandoned, ghost-infested house in Baranagar, taking formal sannyasa vows to establish the first Ramakrishna Math.\n\nFrom 1888 to 1893, Vivekananda walked the length and breadth of India as a wandering monk (Parivrajaka). With only a staff and water pot, he slept in the huts of untouchables, lived with tribal peasants, and stayed in princely palaces, witnessing firsthand the appalling hunger, social degradation, and spiritual exhaustion of India under British colonial rule. At Kanyakumari, swimming through shark-infested waters to reach the solitary rock at the southernmost tip of India where three oceans merge, Vivekananda meditated for three continuous days and nights on India’s past, present, and future. There, he experienced his great historic awakening: religion could not be preached to empty stomachs. His mission was to awaken the dormant spirit of India with self-respect and practical Vedanta, and to share the spiritual treasures of India with the materialist West.\n\nSailing to America with financial help from his disciples in Madras and the Maharaja of Khetri, Vivekananda arrived at the World’s Parliament of Religions in Chicago in September 1893. On the opening day, 11 September, when the thirty-year-old monk stepped forward and uttered his immortal opening address: 'Sisters and Brothers of America,' seven thousand listeners rose in a thunderous standing ovation that lasted two full minutes. Over the next four years, he captivated America and Europe with masterly expositions on Raja Yoga, Karma Yoga, Jnana Yoga, and Bhakti Yoga. Returning to India as a national hero in 1897, he founded the Ramakrishna Math and Mission, institutionalizing the eternal motto: 'Atmano Mokshartham Jagat Hitaya Cha' (For the liberation of the Self, and for the welfare of the world), before leaving his mortal body in deep meditation at Belur Math at age thirty-nine.",
    "journeyLocal": "स्वामी विवेकानंद का जन्म १२ जनवरी १८६३ को कोलकाता में विश्वनाथ दत्त और भुवनेश्वरी देवी के घर हुआ था। बाल्यावस्था में उनका नाम नरेंद्रनाथ था। वे कुशाग्र बुद्धि, संगीत और अध्ययन में निपुण थे। उनके मन में सत्य को जानने की तीव्र प्यास थी और वे हर विद्वान से एक ही प्रश्न पूछते थे: \"क्या आपने ईश्वर को देखा है?\" कोई भी उन्हें संतुष्ट नहीं कर सका, जब तक कि वे दक्षिणेश्वर में रामकृष्ण परमहंस के पास नहीं पहुंचे। परमहंस जी ने मुस्कुराकर उत्तर दिया: \"हाँ नरेंद्र, मैंने ईश्वर को देखा है, ठीक वैसे ही जैसे तुम्हें देख रहा हूँ, बल्कि उससे भी अधिक स्पष्टता से।\"\n\nश्री रामकृष्ण के सानिध्य में नरेंद्र का संशय समाप्त हुआ और उन्हें निर्विकल्प समाधि का साक्षात्कार हुआ। गुरुदेव के महाप्रयाण के पश्चात उन्होंने बारह सन्यासी भाइयों के साथ वराहनगर में मठ की स्थापना की।\n\n१८८८ से १८९३ तक विवेकानंद ने 'परिव्राजक' (संन्यासी) के रूप में पूरे भारत की पदयात्रा की। उन्होंने गरीबों की झोपड़ियों में रातें बिताईं और देखा कि विदेशी शासन के अधीन भारतीय समाज भूख और अशिक्षा से पीड़ित है। कन्याकुमारी के समुद्री तट पर एक विशाल शिला पर बैठकर उन्होंने तीन दिनों तक अखंड ध्यान किया। वहाँ उन्हें प्रेरणा मिली कि भूखे पेट को धर्म नहीं सिखाया जा सकता; भारत को जागृत करना होगा और पश्चिम को वेदांत का आध्यात्मिक प्रकाश देना होगा।\n\nसितंबर १८९३ में वे अमेरिका के शिकागो शहर में आयोजित विश्व धर्म संसद में पहुंचे। ११ सितंबर को जब उन्होंने मंच से \"अमेरिका के भाइयो और बहनो!\" कहकर अपना भाषण आरंभ किया, तो सात हजार श्रोता अपनी सीटों से खड़े हो गए और दो मिनट तक तालियां गूंजती रहीं। उन्होंने वेदांत को विश्व-मंच पर प्रतिष्ठित किया। भारत लौटकर उन्होंने १८९७ में 'रामकृष्ण मिशन' की स्थापना की और 'आत्मनो मोक्षार्थं जगद्धिताय च' (अपनी मुक्ति और जगत के कल्याण के लिए) का महामंत्र दिया। मात्र ३९ वर्ष की आयु में उन्होंने बेलूर मठ में महासमाधि ली।",
    "trial": "Vivekananda’s supreme trial was enduring destitute poverty, social calumny, and physical privation while carrying the spiritual destiny of a nation on his solitary shoulders. When his father died suddenly in Calcutta, leaving the family in crushing debt and starvation, Narendra walked the streets barefoot in scorching heat looking desperately for employment, fainting from hunger while giving his share of meager food to his mother and younger brothers. Later, arriving in Chicago weeks before the Parliament opened, he found his credentials missing, his funds completely exhausted, and himself stranded in a freezing foreign city without winter garments. Shivering with cold, mocked as a strange oriental heathen, and forced to sleep inside an empty wooden box in a railway freight yard, Vivekananda never surrendered his faith in his master’s divine mission. In the West, he weathered malicious character assassinations by orthodox missionaries, while in India, he confronted rigid orthodox pandits who condemned him for traveling across the ocean, answering every slander with towering forbearance and relentless work.",
    "trialLocal": "स्वामी विवेकानंद की सबसे कठिन परीक्षा अत्यधिक अभाव, भूख और अकेलेपन के बीच अपने संकल्प को जीवित रखना था। पिता की अचानक मृत्यु के बाद जब परिवार दाने-दाने को मोहताज हो गया, तब नरेंद्र चिलचिलाती धूप में नंगे पांव नौकरी खोजते थे और घर में भोजन कम होने पर खुद भूखे रहकर मां और भाइयों को खिला देते थे। शिकागो पहुंचने पर जब उनके पैसे खत्म हो गए और कड़ाके की ठंड में उनके पास गर्म कपड़े नहीं थे, तब वे रेलवे स्टेशन के माल गोदाम में लकड़ी के बक्से में सोए। लोगों ने उनका उपहास उड़ाया, परंतु उन्होंने हार नहीं मानी। भारत और विदेश में रूढ़िवादियों ने उनके संन्यास और समुद्री यात्रा पर झूठे आक्षेप लगाए, किंतु उन्होंने सबका सामना केवल अगाध प्रेम और सेवा से किया।",
    "teaching": "Vivekananda proclaimed the immortal gospel of Practical Vedanta: 'Each soul is potentially divine. The goal is to manifest this divinity within by controlling nature, external and internal.' He taught that the highest worship of God is the worship of the Living God in humanity—especially in the poor, the illiterate, the afflicted, and the downtrodden (Daridra Narayana). He shattered fatalistic weakness, declaring: 'Strength is life, weakness is death. Expansion is life, contraction is death. Love is life, hatred is death.' Faith in one's own divine Self is the foundation of all progress: 'He is an atheist who does not believe in himself.'",
    "teachingLocal": "स्वामी विवेकानंद का मूल दर्शन 'व्यावहारिक वेदांत' है: \"प्रत्येक आत्मा में दिव्यता की अनंत संभावनाएं हैं। अंतः और बाह्य प्रकृति को वश में करके इस दिव्यता को प्रकट करना ही जीवन का चरम लक्ष्य है।\" उन्होंने घोषणा की कि निर्धनों, रोगियों और असहायों की सेवा ही 'दरिद्र नारायण' की सच्ची पूजा है। उनका क्रांतिकारी उद्घोष था: \"शक्ति ही जीवन है, दुर्बलता ही मृत्यु है। उठो, जागो और तब तक मत रुको जब तक लक्ष्य प्राप्त न हो जाए!\"",
    "moral": "Cast away all fear, superstition, and weakness. Stand firmly upon your own feet, awaken the dormant divine power within you, and dedicate your intellect, wealth, and energy to the fearless service and elevation of the world.",
    "moralLocal": "भय और अंधविश्वास का त्याग करें। अपने भीतर के सोए हुए पौरुष को जगाएं और 'उठो, जागो और लक्ष्य तक रुको मत' के संकल्प के साथ समाज की उन्नति में अपना योगदान दें।",
    "legacy": "Swami Vivekananda ignited the modern Indian Renaissance, providing the intellectual and spiritual spine for India's freedom struggle. His works inspired leaders like Mahatma Gandhi, Subhas Chandra Bose, and Rabindranath Tagore, while his founding of the Ramakrishna Mission established a global network of hospitals, schools, and relief missions active across five continents.",
    "legacyLocal": "स्वामी विवेकानंद ने आधुनिक भारत के राष्ट्रीय आंदोलन को आध्यात्मिक ऊर्जा प्रदान की। सुभाष चंद्र बोस ने उन्हें 'आधुनिक भारत का निर्माता' कहा। उनके विचारों ने विश्व में योग और वेदांत की स्वीकृति का मार्ग प्रशस्त किया और उनके द्वारा स्थापित रामकृष्ण मिशन आज भी विश्व भर में सेवा का पर्याय बना हुआ है।",
    "source": "The Complete Works of Swami Vivekananda (Vols 1–9, Chicago Addresses, Karma Yoga, Raja Yoga), Life of Swami Vivekananda by Eastern & Western Disciples",
    "sourceLocal": "स्वामी विवेकानंद वाङ्मय (शिकागो व्याख्यान, कर्मयोग, राजयोग, ज्ञानयोग), पूर्वी और पश्चिमी शिष्यों द्वारा रचित विवेकानंद जीवन चरित",
    "sourceCitations": [
      {
        "sourceName": "Complete Works of Swami Vivekananda",
        "sourceRef": "Vol. 1 (Addresses at the Parliament of Religions, Chicago, 1893)",
        "tier": 1
      },
      {
        "sourceName": "Complete Works of Swami Vivekananda",
        "sourceRef": "Vol. 1 (Karma Yoga & Raja Yoga)",
        "tier": 1
      },
      {
        "sourceName": "Complete Works of Swami Vivekananda",
        "sourceRef": "Vol. 5 (Epistles & Lectures from Colombo to Almora)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Uttishthata jagrata prapya varan nibodhata.",
      "attribution": "Arise, awake, and stop not till the goal is reached. — Swami Vivekananda (Adapting Katha Upanishad 1.3.14)"
    },
    "quoteLocal": {
      "text": "उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत।",
      "attribution": "स्वामी विवेकानंद (कठोपनिषद् १.३.१४ के आधार पर)"
    }
  },
  {
    "id": "chanakya",
    "name": "Chanakya (Kautilya)",
    "nameLocal": "आचार्य चाणक्य (कौटिल्य)",
    "era": "350–283 BCE",
    "eraLocal": "३५०–२८३ ईसा पूर्व",
    "tradition": "hindu",
    "region": "Takshashila / Pataliputra (Magadha)",
    "regionLocal": "तक्षशिला / पाटलिपुत्र (मगध)",
    "emoji": "🦅",
    "tagline": "The legendary master statesman, political philosopher, and royal strategist of Takshashila who toppled the corrupt Nanda dynasty, repelled Macedonian invaders, unified India under the Maurya Empire, and renounced power for a hermit’s hut.",
    "taglineLocal": "तक्षशिला के आचार्य और महान कूटनीतिज्ञ जिन्होंने विदेशी आक्रांताओं को खदेड़कर अखंड भारत की स्थापना की और नंद वंश का विनाश कर चंद्रगुप्त मौर्य को सम्राट बनाया।",
    "journey": "Acharya Chanakya, also known as Vishnugupta and Kautilya, was born circa 350 BCE into a pious brahmin family in the ancient territory of Magadha. Endowed with an astonishing intellect and an unyielding will, he was educated at the world’s foremost university of Takshashila (modern Taxila), mastering the four Vedas, military logistics, foreign policy, monetary systems, and geopolitical strategy, eventually rising to become an esteemed professor of political science.\n\nIn 326 BCE, the storm of foreign invasion loomed over northwest India as the Macedonian armies of Alexander the Great crossed the Indus river, subjugating fragmented frontier kingdoms like Taxila and Porus’s realm. Realizing that the disunited, warring republics of Aryavarta were doomed to piecemeal colonization, Chanakya journeyed to Pataliputra, the capital of the immensely wealthy Magadha empire, to plead with King Dhanananda to mobilize imperial armies and forge a pan-Indian defensive coalition. Instead of heeding his visionary counsel, the decadent, greedy tyrant Dhanananda publicly mocked Chanakya’s austere appearance, insulted his lineage, and had him forcibly ejected from the royal assembly hall. Standing on the marble steps outside the court, the enraged sage untied his sacred topknot (shikha) and swore an immortal vow: 'I shall not tie this hair again until I have completely eradicated the corrupt Nanda dynasty from the soil of Bharatvarsha and established a righteous sovereign upon this throne!'\n\nExiled into the forests, Chanakya observed an orphan boy named Chandragupta leading his playmates in the game of kings (Rajakrida), adjudicating village disputes with natural justice, courage, and dignity. Recognizing in the young lad the seeds of a righteous emperor, Chanakya purchased him from his guardian, brought him to Takshashila, and subjected him to eight years of rigorous discipline—training him in swordsmanship, archery, Sanskrit, political diplomacy, and the art of warfare.\n\nWhen Alexander died in Babylon in 323 BCE, leaving Greek garrisons in disarray, Chanakya and Chandragupta mobilized discontented warrior tribes, hill clans, and forest mercenaries, igniting a war of national liberation that systematically drove the Macedonian satraps out of Punjab and Sindh. Next, turning their forces against Magadha, Chanakya employed masterly psychological warfare, counter-espionage, and tactical encirclement to dismantle the vast Nanda army, capturing Pataliputra and crowning Chandragupta Maurya as the first universal emperor (Chakravartin) of a united India. As Prime Minister, Chanakya authored the Arthashastra, the world’s most comprehensive classical treatise on statecraft, espionage, and jurisprudence, along with the timeless Chanakya Niti. Having solidified the empire's borders and ensured peace, Chanakya rejected royal riches, living in a modest mud hut outside the palace and lighting an oil lamp fueled with his own meager earnings.",
    "journeyLocal": "आचार्य चाणक्य (विष्णुगुप्त/कौटिल्य) का जन्म लगभग ३५० ईसा पूर्व में मगध के एक विद्वान ब्राह्मण परिवार में हुआ था। उन्होंने तक्षशिला विश्वविद्यालय में समस्त वेदों, अर्थशास्त्र, राजनीति और युद्धकला में अद्वितीय प्रवीणता प्राप्त की और वहीं आचार्य पद को सुशोभित किया।\n\nजब सिकंदर की यूनानी सेनाओं ने भारत के पश्चिमोत्तर सीमांत पर आक्रमण किया, तो भारत को विदेशी गुलामी से बचाने के लिए चाणक्य मगध के शक्तिशाली साम्राज्य की राजधानी पाटलिपुत्र पहुंचे। उन्होंने नंद सम्राट धनानंद से एकजुट होकर विदेशी आक्रांताओं का सामना करने का आग्रह किया। परंतु अहंकारी धनानंद ने चाणक्य की वेशभूषा का उपहास उड़ाया और उन्हें अपमानित करके राजदरबार से बाहर निकलवा दिया। उसी क्षण चाणक्य ने अपनी शिखा खोल दी और भीषण प्रतिज्ञा ली: \"जब तक मैं तेरे भ्रष्ट नंद वंश को समूल नष्ट नहीं कर दूंगा और एक धर्मनिष्ठ राजा को सिंहासन पर नहीं बैठाऊंगा, तब तक यह शिखा नहीं बांधूंगा!\"\n\nवन में जाते हुए उन्होंने बालक चंद्रगुप्त को 'राजक्रीड़ा' खेलते देखा, जो बालकों के बीच न्याय कर रहा था। चाणक्य ने उसकी प्रतिभा को पहचाना और उसे तक्षशिला ले जाकर आठ वर्षों तक युद्धकला और राजनीति का कठोर प्रशिक्षण दिया।\n\nसिकंदर की मृत्यु के बाद उन्होंने चंद्रगुप्त के साथ मिलकर पश्चिमोत्तर भारत से यूनानी गवर्नरों को खदेड़ दिया और फिर अपनी विलक्षण कूटनीति से पाटलिपुत्र पर विजय प्राप्त कर चंद्रगुप्त मौर्य को भारत का चक्रवर्ती सम्राट बनाया। प्रधानमंत्री बनकर उन्होंने 'अर्थशास्त्र' जैसा अमर ग्रंथ लिखा। अखंड भारत का स्वप्न साकार करने के पश्चात चाणक्य ने राजवैभव त्याग दिया और राजधानी के बाहर एक साधारण मिट्टी की कुटिया में निवास किया।",
    "trial": "Chanakya’s life was an unbroken trial of acute danger, palace conspiracies, and harrowing realpolitik choices. He survived scores of assassination attempts, poisoned blades, and palace uprisings orchestrated by vengeful Nanda loyalists and the brilliant rival prime minister Amatya Rakshasa; Chanakya neutralized every plot through preternatural foresight and psychological mastery, ultimately winning Rakshasa’s loyalty through sheer magnanimity. To safeguard Chandragupta against poisoning, Chanakya systematically fed the young emperor microscopic daily doses of venom to build immunity. Tragically, pregnant Queen Durdhara unknowingly ate a morsel of the king’s poisoned meal and collapsed dying; Chanakya instantly performed an emergency surgical incision with his dagger, extracting the unborn infant prince—whose forehead bore a drop of poison, naming him Bindusara—saving the Mauryan royal lineage at the cost of personal heartbreak.",
    "trialLocal": "चाणक्य का संपूर्ण जीवन षड्यंत्रों, विष-कन्याओं और प्राणघातक हमलों के बीच व्यतीत हुआ। नंद वंश के निष्ठावान मंत्री अमात्य राक्षस ने चंद्रगुप्त की हत्या के अनेक षड्यंत्र रचे, किंतु चाणक्य की सूक्ष्म दृष्टि ने हर चाल को विफल कर दिया और अंत में राक्षस की देशभक्ति को पहचानकर उसे ही मौर्य साम्राज्य का प्रधानमंत्री बना दिया। चंद्रगुप्त को विष-आक्रमणों से बचाने के लिए वे भोजन में थोड़ा-थोड़ा विष देते थे। एक दिन गर्भवती महारानी दुर्धरा ने भूलवश वह भोजन खा लिया; चाणक्य ने तत्परता से महारानी के गर्भ को चीरकर बालक बिंदुसार के प्राणों की रक्षा की, यद्यपि इस दारुण निर्णय का दुख उन्हें आजीवन रहा।",
    "teaching": "Chanakya codified the foundational science of statecraft: power is legitimate only when dedicated to the prosperity, justice, and security of the people. In his immortal words: 'Prajasukhe sukham rajnah, prajanam cha hite hitam'—In the happiness of the subjects lies the king's happiness; in their welfare, his welfare. He formulated the Saptanga Theory—that a state is an organic body consisting of the Ruler (Swami), Ministers (Amatya), Territory (Janapada), Fortresses (Durga), Treasury (Kosha), Defense (Danda), and Allies (Mitra).",
    "teachingLocal": "आचार्य चाणक्य का मूल सिद्धांत है: \"प्रजासुखे सुखं राज्ञः प्रजानां च हिते हितम्\" — प्रजा के सुख में ही राजा का सुख है और प्रजा के हित में ही राजा का हित है। राजा का अपना कोई व्यक्तिगत सुख नहीं होता। उन्होंने राज्य के सप्तांग सिद्धांत का प्रतिपादन किया और सिखाया कि अनुशासन, कूटनीति और मजबूत आर्थिक व्यवस्था ही किसी राष्ट्र की स्वतंत्रता की वास्तविक गारंटी हैं।",
    "moral": "Unflinching resolve, strategic intellect, and strict self-discipline can overturn impossible odds and shatter corrupt systems. Seek power not for personal aggrandizement, but to protect the virtuous and secure the commonwealth; when the mission is accomplished, let go of power with absolute detachment.",
    "moralLocal": "दृढ़ संकल्प और विवेक के बल पर बड़े से बड़े साम्राज्य और संकट को परास्त किया जा सकता है। शक्ति का अर्जन केवल जनकल्याण और धर्म की रक्षा के लिए करें, और कार्य पूर्ण होने पर सत्ता का मोह त्याग दें।",
    "legacy": "Chanakya pioneered the civilizational concept of a united India (Akhand Bharat), turning back European imperial conquest and establishing the Mauryan Empire that peaked under Ashoka the Great. His Arthashastra and Chanakya Niti remain foundational global masterpieces of political philosophy, economics, and diplomacy.",
    "legacyLocal": "चाणक्य ने खंड-खंड में बंटे भारत को एक सूत्र में बांधकर 'अखंड भारत' की आधारशिला रखी। उनका 'अर्थशास्त्र' राजनीति, प्रशासन और कूटनीति का विश्व का प्राचीनतम और सर्वाधिक प्रामाणिक ग्रंथ है, जो आज भी प्रशासनिक अधिकारियों और नीति-निर्माताओं के लिए मार्गदर्शक है।",
    "source": "Kautilya Arthashastra (Adhikaranas 1–15), Chanakya Niti Shastra, Vishakhadatta’s Mudrarakshasa",
    "sourceLocal": "कौटिल्य अर्थशास्त्र (अधिकरण १–१५), चाणक्य नीति शास्त्र, विशाखदत्त कृत मुद्राराक्षस",
    "sourceCitations": [
      {
        "sourceName": "Kautilya Arthashastra",
        "sourceRef": "Book 1 (Vinayadhikarana, Chapter 19 - Duties of the King)",
        "tier": 1
      },
      {
        "sourceName": "Kautilya Arthashastra",
        "sourceRef": "Book 6 (Mandalayoni - Saptanga State Theory)",
        "tier": 1
      },
      {
        "sourceName": "Chanakya Niti Shastra",
        "sourceRef": "Chapters 1–17",
        "tier": 1
      },
      {
        "sourceName": "Mudrarakshasa of Vishakhadatta",
        "sourceRef": "Acts 1–7 (Historical Drama on the overthrow of Nandas)",
        "tier": 2
      }
    ],
    "quote": {
      "text": "Prajasukhe sukham rajnah, prajanam cha hite hitam; natmapriyam priyam rajnah, prajanam tu priyam priyam.",
      "attribution": "In the happiness of his subjects lies a king’s happiness; in their welfare his welfare. He shall not consider as good only that which pleases him, but treat as good whatever pleases his subjects. — Kautilya, Arthashastra 1.19.34"
    },
    "quoteLocal": {
      "text": "प्रजासुखे सुखं राज्ञः प्रजानां च हिते हितम्। नात्मप्रियं प्रियं राज्ञः प्रजानां तु प्रियं प्रियम्॥",
      "attribution": "आचार्य चाणक्य (कौटिल्य अर्थशास्त्र १.१९.३४)"
    }
  },
  {
    "id": "banda-singh-bahadur",
    "name": "Banda Singh Bahadur",
    "nameLocal": "बाबा बंदा सिंह बहादुर",
    "namePa": "ਬਾਬਾ ਬੰਦਾ ਸਿੰਘ ਬਹਾਦਰ",
    "era": "1670–1716 CE",
    "eraLocal": "१६७०–१७१६ ईस्वी",
    "eraPa": "੧੬੭੦–੧੭੧੬ ਈਸਵੀ",
    "tradition": "sikh",
    "region": "Rajouri, Kashmir / Nanded / Sirhind / Delhi",
    "regionLocal": "राजौरी, कश्मीर / नांदेड़ / सरहिंद / दिल्ली",
    "regionPa": "ਰਾਜੌਰੀ, ਕਸ਼ਮੀਰ / ਨਾਂਦੇੜ / ਸਰਹਿੰਦ / ਦਿੱਲੀ",
    "emoji": "⚔️",
    "tagline": "The ascetic hermit transformed by Guru Gobind Singh into the supreme general of the Khalsa, who shattered Mughal feudal tyranny, minted the first sovereign Sikh coins, and granted land ownership to the peasant tillers of Punjab.",
    "taglineLocal": "तपस्वी वैरागी जिन्हें गुरु गोविंद सिंह जी ने खालसा का सेनापति बनाया; जिन्होंने जागीरदारी प्रथा का अंत कर किसानों को भूमि का स्वामित्व दिया और प्रथम संप्रभु सिख राज्य की स्थापना की।",
    "taglinePa": "ਤਪੱਸਵੀ ਵੈਰਾਗੀ ਜਿਨ੍ਹਾਂ ਨੂੰ ਦਸਮੇਸ਼ ਪਿਤਾ ਨੇ ਖ਼ਾਲਸੇ ਦਾ ਜਰਨੈਲ ਥਾਪਿਆ; ਜਿਨ੍ਹਾਂ ਨੇ ਜਗੀਰਦਾਰੀ ਗੁਲਾਮੀ ਨੂੰ ਮਿਟਾ ਕੇ ਕਿਸਾਨਾਂ ਨੂੰ ਜ਼ਮੀਨਾਂ ਦੇ ਮਾਲਕ ਬਣਾਇਆ ਅਤੇ ਪਹਿਲਾ ਸਿੱਖ ਰਾਜ ਕਾਇਮ ਕੀਤਾ।",
    "journey": "Banda Singh Bahadur was born as Lachhman Dev on 27 October 1670 in the mountainous town of Rajouri, in the Jammu hills of Kashmir. An athletic youth fond of horseback riding and hunting, his life underwent a radical metamorphosis when he shot an arrow into a pregnant doe during a hunting expedition in the woods. As the dying doe collapsed before him, its two unborn fawns dropped from her womb and writhed in agony, perishing before his eyes. Overcome with inconsolable grief and moral revulsion, Lachhman Dev cast his bow into the river, renounced his family, and took the monastic name Madho Das, becoming a wandering Bairagi ascetic. He spent years mastering Hatha Yoga and occult sciences in Central India, eventually establishing an ashram on the banks of the Godavari river at Nanded, Maharashtra.\n\nIn September 1708, the tenth master of the Sikhs, Guru Gobind Singh Ji, visited Madho Das’s hermitage. When the ascetic attempted to exert his yogic occult powers to humble the Guru, he found his magical arts completely paralyzed in the master’s presence. Falling at the Guru's feet in total humility, Madho Das asked: 'Who are you?' The Guru replied: 'Look at me and tell me who you are.' The hermit answered: 'I am your Banda (your humble slave).' The Guru blessed him, administered the Khande di Pahul (Amrit initiation), and named him Gurbaksh Singh, though history forever remembers him as Banda Singh Bahadur (Banda the Brave).\n\nRecognizing his extraordinary martial genius and spiritual intensity, Guru Gobind Singh commissioned Banda to lead the Khalsa army to Punjab to punish tyrannical rulers and protect the oppressed. The Guru presented Banda with five sacred arrows from his own quiver, a battle standard (Nishan Sahib), a war drum (Nagara), twenty-five elite Sikh warriors, and solemn Hukamnamas urging all Sikhs to rally beneath his banner.\n\nArriving in Punjab in 1709, Banda mobilized thousands of downtrodden peasants, artisans, and Sikhs into a formidable liberation army. In May 1710, at the historic Battle of Chappar Chiri, the Khalsa decisively routed the Mughal imperial army of Subahdar Wazir Khan, the governor of Sirhind who had brutally martyred Guru Gobind Singh’s innocent young sons, Baba Zorawar Singh (aged 9) and Baba Fateh Singh (aged 7), by bricking them alive. Wazir Khan fell on the battlefield, and Sirhind was liberated.\n\nEstablishing his capital at Mukhlisgarh (renamed Lohgarh, Fort of Iron), Banda Singh Bahadur founded the first sovereign Sikh state. In a revolutionary decree that overturned centuries of feudal oppression, he completely abolished the Zamindari system, confiscating land from corrupt Mughal feudal lords and granting full legal ownership directly to the impoverished peasant tillers. He introduced a new calendar and minted the first sovereign Sikh coins inscribed with the holy names of Guru Nanak and Guru Gobind Singh: 'Degh Tegh Fateh, O Nusrat Bedarang, Yaft Az Nanak Guru Gobind Singh' (Abundance, the Sword, and Victory without delay were received from Guru Nanak and Guru Gobind Singh).",
    "journeyLocal": "बाबा बंदा सिंह बहादुर का जन्म २७ अक्टूबर १६७० को कश्मीर के राजौरी में हुआ था। उनका प्रारंभिक नाम लक्ष्मण देव था। वे एक कुशल शिकारी थे, परंतु एक दिन एक गर्भवती हिरणी का शिकार करते समय, जब उसकी आंखों के सामने उसके दो नवजात बच्चों ने तड़प-तड़प कर दम तोड़ दिया, तो उनका हृदय वैराग्य से भर गया। उन्होंने धनुष तोड़ दिया और संन्यासी बनकर 'माधो दास' नाम धारण कर लिया। वे योग साधना करते हुए महाराष्ट्र के नांदेड़ में गोदावरी नदी के तट पर कुटिया बनाकर रहने लगे।\n\nसितंबर १७०८ में सिखों के दसवें गुरु, गुरु गोविंद सिंह जी उनकी कुटिया में पधारे। गुरु जी के आध्यात्मिक तेज के सामने माधो दास का अहंकार समाप्त हो गया। उन्होंने गुरु जी के चरणों में सिर रखकर कहा: \"मैं आपका बंदा (दास) हूँ।\" गुरु जी ने उन्हें अमृत छकाकर 'गुरबख्श सिंह' नाम दिया, परंतु वे 'बंदा सिंह बहादुर' के नाम से अमर हुए।\n\nगुरु गोविंद सिंह जी ने उन्हें अपने तरकश से पांच तीर, निशान साहिब, नगाड़ा और हुकमनामे देकर मुगलों के अत्याचारों से त्रस्त पंजाब में धर्म और न्याय की स्थापना के लिए भेजा। पंजाब पहुंचकर बंदा सिंह बहादुर ने किसानों और मजलूमों को संगठित किया। मई १७१० में 'छप्पर चिड़ी' के मैदान में भीषण युद्ध हुआ, जिसमें सरहिंद के क्रूर नवाब वजीर खान—जिसने गुरु जी के छोटे साहिबजादों को दीवार में चिनवा दिया था—को मार गिराया गया और सरहिंद को मुक्त कराया गया।\n\nबंदा सिंह बहादुर ने 'लोहगढ़' को राजधानी बनाकर प्रथम संप्रभु सिख राज्य की स्थापना की। उन्होंने सदियों पुरानी जमींदारी प्रथा को समाप्त कर खेत जोतने वाले किसानों को जमीन का असली मालिक बनाया। उन्होंने गुरु नानक देव जी और गुरु गोविंद सिंह जी के नाम से सिक्के चलाए और 'देग तेग फतेह' का राजमुद्रा उद्घोष स्थापित किया।",
    "journeyPa": "ਬਾਬਾ ਬੰਦਾ ਸਿੰਘ ਬਹਾਦਰ ਦਾ ਜਨਮ ੨੭ ਅਕਤੂਬਰ ੧੬੭੦ ਨੂੰ ਰਾਜੌਰੀ (ਕਸ਼ਮੀਰ) ਵਿਖੇ ਹੋਇਆ। ਆਪ ਜੀ ਦਾ ਬਚਪਨ ਦਾ ਨਾਮ ਲਛਮਣ ਦੇਵ ਸੀ। ਸ਼ਿਕਾਰ ਦੌਰਾਨ ਜਦੋਂ ਇੱਕ ਗਰਭਵਤੀ ਹਿਰਨੀ ਦੇ ਦੋ ਬੱਚੇ ਆਪ ਦੀਆਂ ਅੱਖਾਂ ਸਾਹਮਣੇ ਤੜਫ਼ ਕੇ ਮਰ ਗਏ, ਤਾਂ ਆਪ ਦਾ ਮਨ ਐਸਾ ਵੈਰਾਗੀ ਹੋਇਆ ਕਿ ਆਪ ਨੇ ਧਨੁੱਖ-ਬਾਣ ਤਿਆਗ ਕੇ ਸੰਨਿਆਸ ਧਾਰਨ ਕਰ ਲਿਆ ਅਤੇ 'ਮਾਧੋ ਦਾਸ' ਅਖਵਾਏ।\n\nਸਤੰਬਰ ੧੭੦੮ ਵਿੱਚ ਸ੍ਰੀ ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ ਨਾਂਦੇੜ ਵਿਖੇ ਆਪ ਦੀ ਕੁਟੀਆ ਵਿੱਚ ਪਹੁੰਚੇ। ਗੁਰੂ ਜੀ ਦੇ ਦੀਦਾਰ ਕਰਦਿਆਂ ਹੀ ਮਾਧੋ ਦਾਸ ਨੇ ਚਰਨੀਂ ਢਹਿ ਕੇ ਕਿਹਾ: \"ਮੈਂ ਆਪ ਜੀ ਦਾ ਬੰਦਾ ਹਾਂ।\" ਗੁਰੂ ਜੀ ਨੇ ਆਪ ਨੂੰ ਅੰਮ੍ਰਿਤ ਦੀ ਦਾਤ ਬਖ਼ਸ਼ ਕੇ ਨਾਮ 'ਗੁਰਬਖ਼ਸ਼ ਸਿੰਘ' ਰੱਖਿਆ, ਪਰ ਜਗਤ ਵਿੱਚ ਆਪ 'ਬੰਦਾ ਸਿੰਘ ਬਹਾਦਰ' ਵਜੋਂ ਪ੍ਰਸਿੱਧ ਹੋਏ।\n\nਦਸਮੇਸ਼ ਪਿਤਾ ਨੇ ਆਪ ਜੀ ਨੂੰ ਪੰਜ ਤੀਰ, ਨਿਸ਼ਾਨ ਸਾਹਿਬ, ਨਗਾਰਾ ਅਤੇ ਹੁਕਮਨਾਮੇ ਦੇ ਕੇ ਪੰਜਾਬ ਵਿੱਚ ਜ਼ੁਲਮ ਦਾ ਖ਼ਾਤਮਾ ਕਰਨ ਲਈ ਭੇਜਿਆ। ਮਈ ੧੭੧੦ ਵਿੱਚ ਛੱਪੜ-ਚਿੜੀ ਦੀ ਇਤਿਹਾਸਕ ਜੰਗ ਵਿੱਚ ਆਪ ਨੇ ਸਰਹਿੰਦ ਦੇ ਜ਼ਾਲਮ ਸੂਬੇਦਾਰ ਵਜ਼ੀਰ ਖਾਨ ਨੂੰ ਮੌਤ ਦੇ ਘਾਟ ਉਤਾਰਿਆ, ਜਿਸਨੇ ਛੋਟੇ ਸਾਹਿਬਜ਼ਾਦਿਆਂ ਨੂੰ ਨੀਹਾਂ ਵਿੱਚ ਚਿਣਵਾਇਆ ਸੀ।\n\nਆਪ ਜੀ ਨੇ ਲੋਹਗੜ੍ਹ ਨੂੰ ਰਾਜਧਾਨੀ ਬਣਾ ਕੇ ਪਹਿਲਾ ਖ਼ਾਲਸਾ ਰਾਜ ਕਾਇਮ ਕੀਤਾ। ਜਗੀਰਦਾਰੀ ਪ੍ਰਥਾ ਦਾ ਸਦਾ ਲਈ ਭੋਗ ਪਾ ਕੇ ਜ਼ਮੀਨਾਂ ਦੇ ਮਾਲਕੀ ਹੱਕ ਗ਼ਰੀਬ ਕਿਸਾਨਾਂ ਨੂੰ ਦਿੱਤੇ। ਗੁਰੂ ਨਾਨਕ ਅਤੇ ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ ਦੇ ਨਾਮ ਦਾ ਸਿੱਕਾ ਚਲਾਇਆ ਅਤੇ 'ਦੇਗ ਤੇਗ ਫ਼ਤਿਹ' ਦਾ ਪਰਚਮ ਲਹਿਰਾਇਆ।",
    "trial": "In 1715, a colossal Mughal imperial army of over thirty thousand troops under Abdus Samad Khan besieged Banda Singh Bahadur and his band of seven hundred Khalsa warriors inside the mud enclosure of Gurdas Nangal. For eight brutal months, completely cut off from all food and supplies, the Sikhs withstood the siege with superhuman endurance, eating grass, tree bark, and leaves, without a single warrior defecting or surrendering. Captured when unconscious from starvation, Banda and his men were shackled in heavy iron chains, paraded through Lahore and Delhi inside wooden cages, and subjected to public ridicule. In Delhi, one hundred Sikhs were beheaded each day for a week; every warrior was offered wealth and liberty if they embraced Islam, yet every single one joyfully mounted the execution platform chanting 'Waheguru.' On 9 June 1716, Banda Singh Bahadur was tortured near the tomb of Bakhtiyar Kaki. His four-year-old son Ajay Singh was placed in his lap and ordered to kill him; when Banda refused, executioners butchered the boy, ripped out his quivering heart, and forced it into Banda’s mouth. Banda remained motionless in deep samadhi. His eyes were gouged out, his feet and hands severed, and his flesh torn from his bones with red-hot pincers, yet he died unbroken, affirming: 'When arrogance and tyranny cross all limits, the Divine raises an instrument like me to execute justice.'",
    "trialLocal": "१७१५ ईस्वी में मुगलों की विशाल सेना ने गुरुदास नंगल की कच्ची गढ़ी में बंदा सिंह बहादुर और उनके सात सौ सिखों को आठ महीने तक घेरे रखा। राशन समाप्त होने पर उन्होंने घास और पेड़ों की छाल खाकर युद्ध जारी रखा, परंतु आत्मसमर्पण नहीं किया। अंततः भूखे-प्यासे सिखों को बंदी बनाकर लोहे के पिंजरों में दिल्ली लाया गया। दिल्ली में सात दिनों तक प्रतिदिन सौ सिखों के शीश काटे गए, परंतु किसी ने भी इस्लाम स्वीकार नहीं किया। ९ जून १७१६ को बंदा सिंह बहादुर को अमानवीय यातनाएं दी गईं। उनके चार वर्षीय पुत्र अजय सिंह का हृदय चीरकर उनके मुंह में ठूंस दिया गया। उनकी आंखें निकाल ली गईं और गर्म चिमटों से मांस नोचा गया, परंतु वे समाधि में लीन रहकर अमर बलिदान दे गए।",
    "trialPa": "੧੭੧੫ ਵਿੱਚ ਗੁਰਦਾਸ ਨੰਗਲ ਦੀ ਕੱਚੀ ਗੜ੍ਹੀ ਵਿੱਚ ਮੁਗਲ ਫੌਜ ਨੇ ੮ ਮਹੀਨੇ ਘੇਰਾ ਪਾਈ ਰੱਖਿਆ। ਸਿੰਘਾਂ ਨੇ ਘਾਹ ਅਤੇ ਦਰੱਖਤਾਂ ਦੇ ਛਿੱਲੜ ਖਾ ਕੇ ਗੁਜ਼ਾਰਾ ਕੀਤਾ ਪਰ ਈਨ ਨਾ ਮੰਨੀ। ਕੈਦ ਕਰਕੇ ਦਿੱਲੀ ਲਿਆਂਦੇ ਗਏ ੭੪੦ ਸਿੱਖਾਂ ਨੂੰ ਸ਼ਹੀਦ ਕੀਤਾ ਗਿਆ, ਪਰ ਕਿਸੇ ਨੇ ਧਰਮ ਨਹੀਂ ਛੱਡਿਆ। ੯ ਜੂਨ ੧੭੧੬ ਨੂੰ ਬਾਬਾ ਬੰਦਾ ਸਿੰਘ ਬਹਾਦਰ ਜੀ ਦੇ ਚਾਰ ਸਾਲਾ ਪੁੱਤਰ ਅਜੈ ਸਿੰਘ ਦਾ ਕਲੇਜਾ ਕੱਢ ਕੇ ਆਪ ਜੀ ਦੇ ਮੂੰਹ ਵਿੱਚ ਪਾਇਆ ਗਿਆ। ਗਰਮ ਜੰਬੂਰਾਂ ਨਾਲ ਮਾਸ ਨੋਚਿਆ ਗਿਆ ਅਤੇ ਅੱਖਾਂ ਕੱਢ ਦਿੱਤੀਆਂ ਗਈਆਂ। ਆਪ ਅਡੋਲ ਰਹੇ ਅਤੇ ਸ਼ਹਾਦਤ ਦਾ ਜਾਮ ਪੀ ਕੇ ਸਿੱਖ ਕੌਮ ਦੇ ਮੱਥੇ ਦਾ ਝੂਮਰ ਬਣ ਗਏ।",
    "teaching": "Banda Singh Bahadur demonstrated that spiritual tapasya must culminate in the courageous defense of righteousness and social justice. He taught that political power belongs to the working community (Panth and Sangat), and that true Dharma cannot tolerate tyranny, feudal exploitation, or religious bigotry.",
    "teachingLocal": "बाबा बंदा सिंह बहादुर का जीवन सिखाता है कि आध्यात्मिक साधना तब तक अधूरी है जब तक वह अन्याय और अत्याचार से लड़ने का साहस न दे। उन्होंने सिद्ध किया कि शासन का अधिकार जनता का है और किसानों तथा श्रमिकों की भलाई ही किसी भी धर्मनिष्ठ राज्य की सर्वोच्च प्राथमिकता होनी चाहिए।",
    "teachingPa": "ਬਾਬਾ ਬੰਦਾ ਸਿੰਘ ਬਹਾਦਰ ਜੀ ਨੇ ਸਾਬਤ ਕੀਤਾ ਕਿ ਭਗਤੀ ਅਤੇ ਸ਼ਕਤੀ ਦਾ ਸੁਮੇਲ ਹੀ ਜ਼ੁਲਮ ਦਾ ਖ਼ਾਤਮਾ ਕਰ ਸਕਦਾ ਹੈ। ਆਪ ਜੀ ਨੇ ਸਿਖਾਇਆ ਕਿ ਧਰਮ ਸਿਰਫ਼ ਪੂਜਾ-ਪਾਠ ਨਹੀਂ, ਸਗੋਂ ਮਜ਼ਲੂਮਾਂ ਦੇ ਹੱਕਾਂ ਲਈ ਲੜਨਾ ਅਤੇ ਸਮਾਜ ਵਿੱਚੋਂ ਗੁਲਾਮੀ ਦੀਆਂ ਜ਼ੰਜੀਰਾਂ ਨੂੰ ਕੱਟਣਾ ਹੈ।",
    "moral": "Transform your inner spiritual strength into fearless service for the downtrodden. Never compromise your honor, faith, or integrity before tyranny, torture, or the threat of death.",
    "moralLocal": "अपनी आध्यात्मिक शक्ति को समाज के दबे-कुचले वर्गों की रक्षा में लगाएं। मृत्यु के भय या क्रूर यातनाओं के सामने भी अपने धर्म, स्वाभिमान और सत्यनिष्ठा से कभी समझौता न करें।",
    "moralPa": "ਆਪਣੀ ਰੂਹਾਨੀ ਤਾਕਤ ਨੂੰ ਮਜ਼ਲੂਮਾਂ ਦੀ ਸੇਵਾ ਅਤੇ ਜ਼ੁਲਮ ਦੇ ਟਾਕਰੇ ਲਈ ਵਰਤੋ। ਮੌਤ ਦੇ ਡਰ ਅੱਗੇ ਕਦੇ ਵੀ ਆਪਣੇ ਧਰਮ ਅਤੇ ਸੱਚੇ ਅਸੂਲਾਂ ਤੋਂ ਪਿੱਛੇ ਨਾ ਹਟੋ।",
    "legacy": "Banda Singh Bahadur broke the myth of Mughal imperial invincibility, enacted the first historic agrarian land reforms in Asia, and minted the sovereign coinage of the Khalsa. His heroic sacrifice paved the way for the rise of the Sikh Misls and the glorious sovereign empire of Maharaja Ranjit Singh.",
    "legacyLocal": "बंदा सिंह बहादुर ने मुगल साम्राज्य की अजेयता के भ्रम को तोड़ा और एशिया में पहली बार भूमि-सुधार कानून लागू कर किसानों को सशक्त बनाया। उनके अमर बलिदान ने आगे चलकर सिख मिसलों और महाराजा रणजीत सिंह के विशाल सिख साम्राज्य की नींव रखी।",
    "legacyPa": "ਆਪ ਜੀ ਨੇ ਮੁਗਲ ਸਲਤਨਤ ਦੀਆਂ ਜੜ੍ਹਾਂ ਹਿਲਾ ਦਿੱਤੀਆਂ ਅਤੇ ਕਿਰਤੀ ਕਿਸਾਨਾਂ ਨੂੰ ਜ਼ਮੀਨ ਦੇ ਮਾਲਕ ਬਣਾ ਕੇ ਇਤਿਹਾਸ ਰਚਿਆ। ਆਪ ਦੀ ਮਹਾਨ ਸ਼ਹਾਦਤ ਸਦਕਾ ਹੀ ਅੱਗੇ ਚੱਲ ਕੇ ਸਿੱਖ ਮਿਸਲਾਂ ਅਤੇ ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਦੇ ਵਿਸ਼ਾਲ ਖ਼ਾਲਸਾ ਰਾਜ ਦਾ ਮੁੱਢ ਬੱਝਿਆ।",
    "source": "Prachin Panth Prakash by Ratan Singh Bhangu, Bansavalinama by Kesar Singh Chhibber, Ganda Singh’s Life of Banda Singh Bahadur (Mughal Akhbarat-i-Darbar-i-Mu’alla)",
    "sourceLocal": "प्राचीन पंथ प्रकाश (रतन सिंह भंगू), बंशावलीनामा (केसर सिंह छिब्बर), डॉ. गंडा सिंह कृत बंदा सिंह बहादुर का जीवन चरित (मुगल दरबारी दस्तावेज)",
    "sourcePa": "ਪ੍ਰਾਚੀਨ ਪੰਥ ਪ੍ਰਕਾਸ਼ (ਰਤਨ ਸਿੰਘ ਭੰਗੂ), ਬੰਸਾਵਲੀਨਾਮਾ (ਕੇਸਰ ਸਿੰਘ ਛਿੱਬਰ), ਲਾਈਫ਼ ਆਫ਼ ਬੰਦਾ ਸਿੰਘ ਬਹਾਦਰ (ਡਾ. ਗੰਡਾ ਸਿੰਘ, ਮੁਗਲ ਅਖ਼ਬਾਰਾਤ-ਏ-ਦਰਬਾਰ-ਏ-ਮੁਅੱਲਾ)",
    "sourceCitations": [
      {
        "sourceName": "Prachin Panth Prakash",
        "sourceRef": "Ratan Singh Bhangu, Chapters on Banda Singh Bahadur",
        "tier": 1
      },
      {
        "sourceName": "Mughal Imperial Akhbarat",
        "sourceRef": "Akhbarat-i-Darbar-i-Mu’alla (Contemporary 1710–1716 Court Records)",
        "tier": 1
      },
      {
        "sourceName": "Hukamnamas of Banda Singh Bahadur",
        "sourceRef": "Contemporary Letters to the Sarbat Khalsa (1710)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Degh Tegh Fateh, o nusrat bedarang; yaft az Nanak Guru Gobind Singh.",
      "attribution": "Through the hospitality of the kettle and the strength of the sword, victory was gained without delay, through the grace of Guru Nanak and Guru Gobind Singh. — Inscription on the First Sovereign Sikh Coinage minted by Banda Singh Bahadur (1710)"
    },
    "quoteLocal": {
      "text": "देग तेग फ़तह ओ नुसरत बेदरंग। याफ़्त अज़ नानक गुरु गोबिंद सिंह॥",
      "attribution": "बाबा बंदा सिंह बहादुर द्वारा जारी प्रथम सिख संप्रभु सिक्के पर अंकित राज-मुद्रा (१७१०)"
    },
    "quotePa": {
      "text": "ਦੇਗ ਤੇਗ ਫ਼ਤਿਹ ਓ ਨੁਸਰਤ ਬੇਦਰੰਗ ॥ ਯਾਫ਼ਤ ਅਜ਼ ਨਾਨਕ ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ॥",
      "attribution": "ਬਾਬਾ ਬੰਦਾ ਸਿੰਘ ਬਹਾਦਰ ਵੱਲੋਂ ਜਾਰੀ ਪਹਿਲੇ ਸਿੱਖ ਸਿੱਕੇ ਉੱਤੇ ਉੱਕਰਿਆ ਇਲਾਹੀ ਬੋਲ (੧੭੧੦)"
    }
  },
  {
    "id": "prahlad",
    "name": "Bhakta Prahlad",
    "nameLocal": "भक्त प्रह्लाद",
    "era": "Satya Yuga",
    "eraLocal": "सत्य युग",
    "tradition": "hindu",
    "region": "Multan (Ancient India)",
    "regionLocal": "मुल्तान / प्राचीन भारत",
    "emoji": "🙏",
    "tagline": "The child-saint whose unshakeable faith and pure vision of the Divine in all existence shattered demonic tyranny and invoked Lord Narasimha.",
    "taglineLocal": "बाल-संत जिनकी अटूट भक्ति और सर्वत्र ईश्वर-दर्शन ने दानवी अहंकार को तोड़ा और भगवान नृसिंह को प्रकट किया।",
    "journey": "Prahlada was born in the golden age of Satya Yuga into the fierce Asura dynasty as the son of the cosmic tyrant Hiranyakashipu and Queen Kayadhu. While his father performed severe penances to extract invulnerability boons from Brahma, celestial conflicts erupted, and the pregnant Kayadhu was given refuge in the hermitage of the divine sage Narada. Within the womb, the unborn child listened to Narada’s continuous discourses on supreme metaphysics, the vanity of worldly dominion, and unyielding surrender to Lord Narayana. Consequently, Prahlada emerged into the earthly realm not with the predatory arrogance of a demon prince, but as a paramahamsa—a realized soul anchored in unblemished devotion from his first breath.\n\nAs he grew, Hiranyakashipu placed Prahlada under the tutelage of Shanda and Amarka, the royal preceptors, commanding them to instruct the heir in worldly diplomacy, military coercion, and ruthless statecraft. Yet whenever summoned before the imperial court and asked what he had learned of greatest value, the young prince calmly declared that true wisdom consists in abandoning the illusion of ego and taking solitary refuge in the imperishable Lord of the universe. Frustrated by the preceptors' failure, Hiranyakashipu demanded to know who had subverted his son's mind. Prahlada answered with gentle fearlessness that Narayana is the teacher of all creation, dwelling equally in the heart of the oppressor and the oppressed. In secret moments between school lessons, Prahlada gathered the sons of the demons, singing the holy names and explaining that youth, wealth, and empires are transient as ocean foam, while divine love alone rescues the soul from the sea of mortal sorrow.",
    "journeyLocal": "सत्य युग में भक्त प्रह्लाद का जन्म दैत्यराज हिरण्यकशिपु और महारानी कयाधु के यहाँ असुर कुल में हुआ था। जब उनके पिता ब्रह्मा जी से अजेयता का वरदान प्राप्त करने के लिए कठोर तपस्या में लीन थे, तब देवराज इंद्र ने दैत्य-राजधानी पर आक्रमण कर दिया। देवर्षि नारद ने गर्भवती कयाधु की रक्षा की और उन्हें अपने आश्रम में आश्रय दिया। आश्रम में रहते हुए, माता के गर्भ में स्थित बालक प्रह्लाद ने देवर्षि नारद के मुख से भगवान नारायण की महिमा, आत्म-ज्ञान और नश्वर संसार की असारता का दिव्य उपदेश सुना। इसी कारण, असुर कुल में जन्म लेने के उपरांत भी प्रह्लाद जन्मजात परमहंस और भगवान विष्णु के अनन्य प्रेमी बने।\n\nजब प्रह्लाद बड़े हुए, तो हिरण्यकशिपु ने उन्हें दैत्य-गुरु शुक्राचार्य के पुत्रों, शंड और अमर्क के पास राजनीति, कूटनीति और असुर-धर्म की शिक्षा लेने भेजा। किंतु जब भी राजा अपने पुत्र को गोद में बिठाकर पूछते कि तुमने अब तक क्या सबसे उत्तम ज्ञान सीखा, तो प्रह्लाद निर्भय होकर कहते कि मिथ्या अहंकार और सांसारिक आसक्तियों को त्यागकर सर्वव्यापी भगवान नारायण की शरण लेना ही जीवन का परम कल्याण है। जब हिरण्यकशिपु ने क्रोधित होकर पूछा कि तुम्हें यह शिक्षा किसने दी, तो प्रह्लाद ने शांत भाव से उत्तर दिया कि भगवान विष्णु ही संपूर्ण जगत के गुरु हैं, जो मित्र और शत्रु दोनों के हृदय में समान रूप से वास करते हैं। पाठशाला में जब शिक्षक बाहर जाते, तो प्रह्लाद साथी असुर बालकों को एकत्रित कर संकीर्तन करते और समझाते कि मानव जन्म दुर्लभ है, यौवन और संपदा जल के बुलबुले के समान हैं, इसलिए बचपन से ही श्रीहरि की भक्ति में रम जाना चाहिए।",
    "trial": "Enraged that his own flesh dared to worship his eternal foe, Hiranyakashipu ordered the child put to death through escalating cruelties. Executioners struck him with razor-sharp celestial weapons, yet as Prahlada remembered Vishnu residing within the metal and his own flesh, the blades splintered harmlessly. Deadly venomous serpents, including Takshaka and Kuhaka, were unleashed to bite him, but their fangs fractured against his unyielding skin. Massive imperial elephants were ordered to gore and trample the boy, but their tusks buckled against his chest as Prahlada stood lost in serene contemplation of Janarddana. The king had him bound in iron chains, thrown from dizzying mountain precipices, cast into boiling oil cauldrons, fed lethal poisons, and sealed beneath crushing boulders in the depths of the ocean, yet the waters parted and the rocks floated aside as his devotion dissolved all physical peril.\n\nThe supreme trial arrived when the king’s sorceress sister, Holika, who possessed a celestial shawl impervious to flames, sat with Prahlada upon a blazing inferno to burn him alive. Through divine justice, a sudden wind swept the shawl from Holika, consuming her in the fire while leaving Prahlada unharmed, amidst fragrant showers of celestial blossoms. Finally, roaring in fury before his entire court, Hiranyakashipu pointed his sword at an ornate stone pillar, demanding: ‘If your Vishnu is everywhere, is he present in this stone?’ Striking the pillar with his mace, the stone shattered with a cosmic roar, and Lord Narasimha—the half-man, half-lion manifestation—burst forth at twilight, tearing the tyrant upon the palace threshold to preserve cosmic balance and vindicate his devotee’s unshakable trust.",
    "trialLocal": "अपने ही पुत्र द्वारा परम शत्रु विष्णु की आराधना से कुपित होकर हिरण्यकशिपु ने प्रह्लाद की हत्या के अनेक क्रूर षड्यंत्र रचे। सैनिकों ने उन पर तीक्ष्ण त्रिशूलों और खड्गों से प्रहार किया, किंतु प्रह्लाद ने जब सर्वत्र नारायण को देखा, तो अस्त्र-शस्त्र तिनके के समान टूट गए। तक्षक और कुहक जैसे काल-सर्पों से उन्हें डसवाया गया, पर विषैले नागों के दांत कुंद हो गए। मदमस्त दिग्गजों को उन्हें कुचलने के लिए छोड़ा गया, पर हाथियों के दांत प्रह्लाद की छाती से टकराकर टूट गए। उन्हें ऊंचे पर्वतों से नीचे गहरी खाइयों में फेंका गया, खौलते तेल के कड़ाहों में डाला गया, हलाहल विष पिलाया गया, और भारी शिलाओं से बांधकर अथाह समुद्र में डुबो दिया गया; किंतु हर बार भगवान के स्मरण मात्र से समुद्र शांत हो गया और शिलाएं तैरने लगीं।\n\nचरम परीक्षा तब आई जब हिरण्यकशिपु की बहन होलिका, जिसे अग्नि से न जलने का वरदान प्राप्त था, अपनी दिव्य ओढ़नी ओढ़कर प्रह्लाद को गोद में लेकर धधकती चिता में बैठ गई। ईश्वर की लीला से तीव्र वायु चली, वह रक्षा-ओढ़नी होलिका के तन से उड़कर प्रह्लाद पर आ गई; होलिका भस्म हो गई और प्रह्लाद नारायण का नाम जपते हुए पुष्पों की भांति अग्नि से निष्कलंक बाहर निकल आए। अंततः, क्रोधोन्मत्त होकर हिरण्यकशिपु ने राजसभा के एक विशाल पाषाण-स्तंभ की ओर संकेत करते हुए ललकारा: 'यदि तेरा विष्णु सर्वत्र है, तो क्या इस खंभे में भी है?' जैसे ही उसने अपनी गदा से खंभे पर प्रहार किया, एक भीषण गर्जना के साथ स्तंभ को चीरते हुए संध्याकाल में नर-सिंह रूप में भगवान प्रकट हुए और राजमहल की देहरी पर उस अत्याचारी का वध कर अपने नन्हे भक्त के विश्वास को अमर कर दिया।",
    "teaching": "Prahlada taught the sublime doctrine of omnipresence and Sharanagati (unconditional surrender). The Divine is not distant or confined to ethereal realms; Narayana permeates every particle of existence, living equally within the stone pillar, the executioner's sword, and the devotee’s heart. Hatred and tyranny are self-limiting illusions born of ego, whereas steady devotion dissolves fear, transcending all physical danger. Prahlada revealed that true spirituality demands moral courage: the willingness to stand alone against overwhelming worldly authority with gentleness, compassion, and unwavering fidelity to truth.",
    "teachingLocal": "भक्त प्रह्लाद ने जगत को सर्वव्यापकता और शरणागति का अनुपम दर्शन सिखाया। ईश्वर किसी सुदूर लोक में नहीं, अपितु सृष्टि के कण-कण में—पाषाण स्तंभ, तलवार की धार, और भक्त के हृदय में समान रूप से विराजमान हैं। अहंकार और द्वेष नश्वर हैं, जबकि निष्काम भक्ति और प्रेम समस्त सांसारिक भयों को भस्म कर देते हैं। प्रह्लाद ने दिखाया कि धर्म का मार्ग किसी बाह्य सत्ता के भय से नहीं, बल्कि आंतरिक सत्य और करुणा के अटूट विश्वास से प्रशस्त होता है।",
    "moral": "No worldly tyranny, however invincible it appears, can overcome a soul anchored in righteous truth and unshakeable faith. When one sees the divine presence in all beings, fear vanishes and the cosmic order itself moves to protect the righteous seeker.",
    "moralLocal": "जब मनुष्य का हृदय सत्य और ईश्वरीय चेतना में स्थिर होता है, तो संसार का कोई भी क्रूर अत्याचार उसका बाल भी बांका नहीं कर सकता। धर्म की रक्षा करने वाले की रक्षा स्वयं संपूर्ण ब्रह्मांडीय शक्ति करती है।",
    "legacy": "Prahlada remains the supreme exemplar of Navadha Bhakti (the ninefold devotional path) and the immortal archetype of righteous courage in the face of family tyranny. His steadfastness directly inspired the emergence of the Narasimha Avatara and the celebratory bonfire of the festival of Holi, marking the triumph of faith over cruelty. Succeeded to the throne of the Daityas, Prahlada governed as a saintly king, establishing justice and demonstrating that spiritual nobility is determined by virtue and devotion rather than lineage or birth.",
    "legacyLocal": "भक्त प्रह्लाद नवधा भक्ति के सर्वोपरि आदर्श और विपरीत परिस्थितियों में अडिग आस्था के शाश्वत प्रतीक हैं। उनकी इस पवित्र कथा से ही भगवान नृसिंह का प्राकट्य हुआ और बुराई पर अच्छाई की विजय के रूप में पावन 'होली' का पर्व प्रारंभ हुआ। हिरण्यकशिपु के उद्धार के पश्चात वे दैत्यों के धर्मात्मा सम्राट बने और यह सिद्ध किया कि मनुष्य कुल या जन्म से नहीं, बल्कि अपने आचरण, शील और भक्ति से महान बनता है।",
    "source": "Srimad Bhagavata Purana (Skandha 7, Ch. 4–10), Vishnu Purana (Book I, Ch. 17–20)",
    "sourceLocal": "श्रीमद्भागवत महापुराण (सप्तम स्कंध, अध्याय ४-१०), विष्णु पुराण (प्रथम अंश, अध्याय १७-२०)",
    "sourceCitations": [
      {
        "sourceName": "Srimad Bhagavata Purana",
        "sourceRef": "Skandha 7, Chapters 4–10 (Prahlada Charitra & Narasimha Avatara)",
        "tier": 1
      },
      {
        "sourceName": "Vishnu Purana",
        "sourceRef": "Book I, Chapters 17–20 (Legend of Prahlada, trans. H. H. Wilson)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Daityas, as truly as Vishnu is present in your weapons and in my body, so truly shall those weapons fail to harm me.",
      "attribution": "Bhakta Prahlad — Vishnu Purana 1.17"
    },
    "quoteLocal": {
      "text": "यथा च सर्वभूतेषु सर्वव्यापी जगन्मयः। तथा मे दनुजाः सर्वे शस्त्राण्यायान्तु संक्षयम्॥",
      "attribution": "भक्त प्रह्लाद (विष्णु पुराण १.१७)"
    }
  },
  {
    "id": "rani-lakshmibai",
    "name": "Rani Lakshmibai",
    "nameLocal": "रानी लक्ष्मीबाई",
    "era": "1828 – 1858 CE",
    "eraLocal": "१८२८ – १८५८ ई.",
    "tradition": "hindu",
    "region": "Jhansi, Bundelkhand",
    "regionLocal": "झाँसी, बुंदेलखंड",
    "emoji": "🐎",
    "tagline": "The warrior-queen of Jhansi whose unyielding stand against imperial annexation became the immortal symbol of Swadharma, resistance, and valor.",
    "taglineLocal": "झाँसी की वीरांगना रानी जिन्होंने साम्राज्यवादी अन्याय के विरुद्ध स्वधर्म, स्वाभिमान और अदम्य शौर्य का अमर इतिहास रचा।",
    "journey": "Born as Manikarnika Tambe in the sacred city of Varanasi, she was raised in the court of the Peshwa at Bithoor after the early loss of her mother. Educated far beyond conventional royal customs, Manu mastered horse-riding, archery, marksmanship, and swordcraft alongside Nana Sahib and Tatya Tope. In 1842, she married Maharaja Gangadhar Rao Newalkar of Jhansi and assumed the title Rani Lakshmibai. Following the Maharaja's untimely passing in 1853 and the tragic loss of their infant son, the British East India Company under Governor-General Lord Dalhousie invoked the Doctrine of Lapse—summarily rejecting her adopted son Damodar Rao’s rightful claim and decreeing the annexation of Jhansi. Faced with imperial eviction and an insulting pension, Lakshmibai famously declared: ‘Main meri Jhansi nahi doongi’ (I shall never surrender my Jhansi).\n\nWhen the Great Rebellion of 1857 swept across northern India, Lakshmibai assumed direct military and civil leadership over Jhansi. She fortified the formidable stone ramparts, established munitions foundries, organized volunteer infantry units, and formed the Durga Dal—a specialized fighting regiment of women led by her trusted commander Jhalkaribai. For months she governed with impeccable justice and communal harmony, earning the deep devotion of Hindu and Muslim soldiers alike. When British forces under Major General Sir Hugh Rose laid siege to Jhansi in March 1858, the Queen personally directed artillery fire from the battlements, inspiring her garrison to repel intense bombardments and storming assaults for over two weeks.",
    "journeyLocal": "काशी की पावन भूमि पर मणिकर्णिका (मनु) के रूप में जन्मी लक्ष्मीबाई का बाल्यकाल बिठूर में पेशवा बाजीराव द्वितीय की छत्रछाया में बीता। परंपरागत सीमाओं को तोड़ते हुए मनु ने घुड़सवारी, मल्लविद्या, धनुर्विद्या और तलवारबाजी में असाधारण निपुणता प्राप्त की। १८४२ में उनका विवाह झाँसी के नरेश महाराज गंगाधर राव नेवालकर से हुआ और वे रानी लक्ष्मीबाई के नाम से प्रतिष्ठित हुईं। १८५३ में महाराज के आकस्मिक निधन तथा अपने नवजात शिशु के वियोग के पश्चात, ब्रिटिश ईस्ट इंडिया कंपनी के गवर्नर जनरल लॉर्ड डलहौजी ने कुख्यात 'हड़प नीति' (डॉक्ट्रिन ऑफ लैप्स) लागू कर दी। उन्होंने दत्तक पुत्र दामोदर राव के उत्तराधिकार को अवैध घोषित करते हुए झाँसी को ब्रिटिश साम्राज्य में मिलाने का फरमान जारी किया। अंग्रेजों के इस अपमानजनक आदेश को ठुकराते हुए महारानी ने निर्भीक गर्जना की: 'मैं अपनी झाँसी नहीं दूँगी!'\n\n१८५७ के प्रथम स्वाधीनता संग्राम में जब विद्रोह की ज्वाला प्रज्वलित हुई, तब रानी ने झाँसी की कमान अपने हाथों में ले ली। उन्होंने दुर्ग के परकोटों को सुदृढ़ किया, तोपखाने स्थापित किए, और झलकारी बाई के नेतृत्व में वीरांगनाओं का अजेय 'दुर्गा दल' गठित किया। जब मार्च १८५८ में मेजर जनरल सर ह्यू रोज के नेतृत्व में विशाल ब्रिटिश सेना ने झाँसी के दुर्ग को घेर लिया, तब रानी ने स्वयं मोर्चे पर खड़े होकर तोपों का संचालन किया और दो सप्ताह तक भीषण गोलाबारी का डटकर मुकाबला किया।",
    "trial": "Surrounded by superior siege artillery and breached walls, Rani Lakshmibai executed a daring tactical breakout. Strapping her ten-year-old adopted son Damodar Rao securely to her back, she mounted her legendary warhorse Sarangi and leapt down from the palace ramparts into the darkness, cutting through the enemy lines with a handful of loyal cavalry riders.\n\nShe rode over a hundred miles without rest to Kalpi, joining forces with Tatya Tope and the Nawab of Banda. Together they captured the historic Gwalior Fort in a strategic counterstroke. On June 17, 1858, at the Battle of Kotah-ki-Serai near Gwalior, clad in warrior armor and wielding twin sabers, the Queen commanded her troops against the British 8th King's Royal Irish Hussars. Struck down in close cavalry combat while preventing capture, she instructed her surviving hermit-warriors to cremate her body instantly so that imperial troops could never touch or desecrate her mortal remains.",
    "trialLocal": "दुर्ग की दीवारें टूटने पर रानी ने एक अप्रतिम साहसिक निर्णय लिया। उन्होंने अपने दस वर्षीय दत्तक पुत्र दामोदर राव को अपनी पीठ पर बांधा और स्वामीभक्त अश्व पर सवार होकर दुर्ग की विशाल प्राचीर से छलांग लगा दी। मुट्ठी भर निष्ठावान घुड़सवारों के साथ वे ब्रिटिश घेरा चीरते हुए निकल गईं और रात भर में १०० मील से अधिक की दूरी तय करके कालपी पहुँचीं।\n\nकालपी में तात्या टोपे के साथ मिलकर उन्होंने रणनीति बनाई और ऐतिहासिक ग्वालियर दुर्ग पर अधिकार कर लिया। १७ जून १८५८ को कोटा की सराय के मैदान में ब्रिटिश हुसार सेना के विरुद्ध अंतिम युद्ध में रानी दोनों हाथों में तलवारें थामकर रणचंडी की भांति लड़ीं। वीरगति प्राप्त करने से पूर्व उन्होंने अपने संन्यासी योद्धाओं को यह अंतिम आज्ञा दी कि उनके शरीर को ब्रिटिश स्पर्श न कर सकें, और उसी क्षण रणभूमि के समीप उनका अंतिम संस्कार संपन्न हुआ।",
    "teaching": "Rani Lakshmibai taught that Swadharma and national sovereignty are sacred trusts demanding supreme commitment regardless of the odds. She proved that leadership is defined not by gender or imperial sanction, but by fearless self-sacrifice, moral dignity, and unyielding defense of one's homeland against exploitation.",
    "teachingLocal": "महारानी लक्ष्मीबाई ने सिखाया कि स्वधर्म और मातृभूमि की रक्षा सर्वोच्च कर्तव्य है। साधन सीमित हों या शत्रु असीम, स्वाभिमानी आत्मा कभी पराधीनता स्वीकार नहीं करती। सच्चा नेतृत्व लिंग या सत्ता की मोहताज नहीं, बल्कि चरित्र, साहस और निःस्वार्थ त्याग से सिद्ध होता है।",
    "moral": "True courage lies in standing resolute against institutional injustice even when solitude and sacrifice are inevitable. Physical defeat cannot extinguish the spirit of righteous resistance; it transforms sacrifice into an eternal beacon for generations.",
    "moralLocal": "अत्याचार कितना भी शक्तिशाली क्यों न हो, न्याय और स्वाभिमान के लिए किया गया संघर्ष कभी व्यर्थ नहीं जाता। देह का अंत हो सकता है, किंतु स्वधर्म की रक्षा में दिया गया बलिदान युगों-युगों तक आने वाली पीढ़ियों को प्रेरित करता है।",
    "legacy": "Rani Lakshmibai's martyrdom became the enduring spark of the Indian independence movement, celebrated across centuries in Subhadra Kumari Chauhan’s iconic verses and revered in every Indian household. Her formidable adversary, Major General Sir Hugh Rose, acknowledged her unmatched genius, recording in his military dispatches: ‘She was the bravest and best military leader of the rebels; a woman who had a man's courage and a chief's head.’",
    "legacyLocal": "रानी लक्ष्मीबाई भारतीय स्वाधीनता संग्राम की अमर प्रेरणा बन गईं। सुभद्रा कुमारी चौहान की कालजयी पंक्तियों 'खूब लड़ी मर्दानी वह तो झाँसी वाली रानी थी' ने देश के हर नागरिक में देशभक्ति का संचार किया। उनके घोर विरोधी मेजर जनरल ह्यू रोज ने भी उनके सम्मान में लिखा था: 'वह विद्रोहियों में सबसे बहादुर और सर्वोत्तम सैन्य कमांडर थीं।'",
    "source": "History of the Indian Mutiny 1857-58 (Col. G. B. Malleson, 1897), Dispatches of Maj. Gen. Sir Hugh Rose (1858)",
    "sourceLocal": "हिस्ट्री ऑफ द इंडियन म्यूटिनी (कर्नल जी. बी. मालेसन, १८९७), मेजर जनरल सर ह्यू रोज का आधिकारिक सैन्य विवरण (१८५८)",
    "sourceCitations": [
      {
        "sourceName": "Col. G. B. Malleson — History of the Indian Mutiny of 1857-8",
        "sourceRef": "Vol. V, Chapter II (The Siege and Storm of Jhansi, and Gwalior Campaign)",
        "tier": 1
      },
      {
        "sourceName": "Maj. Gen. Sir Hugh Rose — Official Despatches to the Military Secretary",
        "sourceRef": "Despatch of 1858 (Operations in Central India & Battle of Kotah-ki-Serai)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Main meri Jhansi nahi doongi — I shall not give up my Jhansi.",
      "attribution": "Rani Lakshmibai to Major Malcolm, March 1854"
    },
    "quoteLocal": {
      "text": "मैं अपनी झाँसी नहीं दूँगी!",
      "attribution": "रानी लक्ष्मीबाई (मार्च १८५४)"
    }
  },
  {
    "id": "chhatrapati-shivaji",
    "name": "Chhatrapati Shivaji Maharaj",
    "nameLocal": "छत्रपती शिवाजी महाराज",
    "era": "1630 – 1680 CE",
    "eraLocal": "१६३० – १६८० ई.",
    "tradition": "hindu",
    "region": "Maharashtra, Deccan",
    "regionLocal": "महाराष्ट्र, दक्खन",
    "emoji": "🚩",
    "tagline": "The visionary sovereign who established Hindavi Swarajya through guerrilla mastery, naval pioneering, and unyielding adherence to righteous governance.",
    "taglineLocal": "हिंदवी स्वराज्य के संस्थापक और कुशल रणनीतिकार जिन्होंने गोरिल्ला युद्ध, नौसेना निर्माण और धर्मनिष्ठ शासन से अजेय साम्राज्य की नींव रखी।",
    "journey": "Born at the hill-fort of Shivneri to Shahaji Bhonsle and Jijabai, Shivaji was nurtured by his mother on the heroic epics of the Ramayana and Mahabharata, instilling in him a deep reverence for Dharma and self-rule. At the young age of sixteen in 1645, Shivaji gathered his devoted Mavala comrades at the sacred shrine of Rohideshwar, cutting his finger and offering blood to Lord Shiva with the solemn oath to establish Hindavi Swarajya—self-rule grounded in righteousness and justice. Rejecting submission to the decaying Adilshahi and Mughal dynasties, Shivaji captured Torna Fort with lightning speed, followed rapidly by Chakan, Kondana, and Purandar. Recognizing the distinct geography of the Western Ghats, he pioneered Ganimi Kava—an innovative system of mountain guerrilla warfare, leveraging speed, concealment, deception, and precise ambushes to neutralize vastly larger, heavily armored imperial hosts.\n\nBeyond his land army, Shivaji displayed extraordinary geopolitical foresight by creating India's first modern indigenous maritime force. He constructed impregnable sea fortresses including Sindhudurg, Vijaydurg, and Suvarnadurg, establishing naval shipyards that defended the Konkan coast from European colonizers and pirate fleets. Yet Shivaji's genius was not solely military; it was profoundly institutional. In his civil administration, he abolished the oppressive Jagirdari system, introduced direct cash salaries for soldiers to prevent agrarian looting, established strict environmental laws protecting sandalwood and teak trees, and formulated the Rajavyavahara Kosha to revive Sanskrit terminology in administrative law. On June 6, 1674, Shivaji was crowned Chhatrapati at Raigad in a Vedic ceremony led by Pandit Gaga Bhatt, formally reviving sovereign Hindu kingship in the Deccan.",
    "journeyLocal": "शिवनेरी दुर्ग में माता जीजाबाई और शहाजी भोंसले के यहाँ जन्मे शिवाजी को उनकी माता ने रामायण और महाभारत के प्रेरक प्रसंगों से संस्कारित किया। मात्र १६ वर्ष की अल्पायु में १६४५ में रोहिडेश्वर महादेव के पावन मंदिर में शिवाजी ने अपने निष्ठावान मावला साथियों के साथ अपनी उंगली काटकर रक्त अर्पित करते हुए 'हिंदवी स्वराज्य' की स्थापना की अमर प्रतिज्ञा ली। आदिलशाही और मुग़ल सत्ता की अधीनता को नकारते हुए उन्होंने सबसे पहले तोरणा दुर्ग जीता, जिसके बाद चाकण, कोंढाणा और पुरंदर पर अपना आधिपत्य स्थापित किया। पश्चिमी घाट के दुर्गम भूगोल को पहचानते हुए उन्होंने 'गनिमी कावा' (गुरिल्ला युद्ध) की नई युद्ध-प्रणाली विकसित की, जिससे मुट्ठी भर सैनिकों के बल पर विशाल शत्रु-सेनाओं को परास्त किया।\n\nथल सेना के साथ-साथ शिवाजी ने भारत में पहली आधुनिक स्वदेशी नौसेना की नींव रखी। उन्होंने सिंधुदुर्ग, विजयदुर्ग और सुवर्णदुर्ग जैसे अजेय जलदुर्गों का निर्माण कराया और कोंकण तट को विदेशी आक्रांताओं तथा समुद्री लुटेरों से सुरक्षित किया। शिवाजी का शासन केवल युद्ध तक सीमित नहीं था; उन्होंने जागीरदारी प्रथा समाप्त कर किसानों को कर-राहत दी, सैनिकों को नकद वेतन देना प्रारंभ किया, और संस्कृत शब्दावली के पुनरुद्धार हेतु 'राज्यव्यवहार कोश' की रचना कराई। ६ जून १६७४ को रायगढ़ दुर्ग में पंडित गागाभट्ट द्वारा वैदिक पद्धति से उनका राज्याभिषेक हुआ और वे छत्रपति के रूप में प्रतिष्ठित हुए।",
    "trial": "Shivaji's life was defined by continuous mortal trials against overwhelming imperial coalitions. In 1659, the Adilshahi sultanate dispatched their towering general Afzal Khan with a massive army, vowing to drag Shivaji to Bijapur in iron chains. Meeting in a secluded pavilion at the foot of Pratapgad Fort under a declared truce, Afzal Khan feigned an embrace and attempted to strangle Shivaji while stabbing him with a dagger. Anticipating treachery, Shivaji wore hidden chainmail beneath his tunic and wielded a concealed wagh-nakh (tiger claws), disemboweling the giant and routing the stunned Adilshahi army in the dense surrounding jungles.\n\nIn 1666, Shivaji faced his most perilous diplomatic crucible when he traveled to Agra on imperial guarantees to meet Mughal Emperor Aurangzeb. Placed under house arrest surrounded by heavy artillery and guards, Shivaji feigned severe illness, distributing enormous baskets of sweets and fruits to sadhus and brahmins as religious charity. On August 17, 1666, Shivaji and his young son Sambhaji hid inside the empty sweet baskets, slipped past the imperial pickets, and traveled across thousands of miles disguised as wandering sannyasis to return safely to Raigad, transforming an imperial cage into a legendary escape that shook the Mughal court to its foundations.",
    "trialLocal": "छत्रपति शिवाजी का संपूर्ण जीवन भीषण संघर्षों और अग्नि-परीक्षाओं से भरा रहा। १६५९ में बीजापुर सल्तनत ने अपने क्रूर सेनापति अफजल खान को विशाल सेना के साथ भेजा, जिसने शिवाजी को बंदी बनाने की प्रतिज्ञा की थी। प्रतापगढ़ की तलहटी में शांति-वार्ता के बहाने अफजल खान ने आलिंगन करते हुए शिवाजी पर कटार से घातक वार किया। किंतु सतर्क शिवाजी ने वस्त्रों के भीतर चिलखत (कवच) पहन रखा था; उन्होंने तत्काल बघनखे से पलटवार कर अफजल खान का वध कर दिया और बीजापुर की सेना को पराजित किया।\n\n१६६६ में जब वे मुग़ल सम्राट औरंगज़ेब के बुलावे पर आगरा गए, तो उन्हें विश्वासघात करके बंदी बना लिया गया। कड़े पहरे के बीच शिवाजी ने अस्वस्थता का स्वांग रचा और साधु-संतों को दान देने के बहाने मिठाइयों के बड़े-बड़े टोकरे बाहर भेजने शुरू किए। १७ अगस्त १६६६ को वे अपने नन्हे पुत्र संभाजी के साथ टोकरों में छिपकर मुग़ल पहरेदारों की आँखों में धूल झोंकते हुए सुरक्षित निकल गए और संन्यासी का वेश बनाकर हजारों मील की यात्रा कर सकुशल महाराष्ट्र लौट आए।",
    "teaching": "Shivaji taught that statecraft and military strength must always be subordinate to moral righteousness. Power is a sacred trust to protect the weak, cultivate agricultural prosperity, and defend spiritual liberty. He established unprecedented codes of warfare: strictly prohibiting harm to women, non-combatants, and crops, and mandating that any captured holy texts, whether the Vedas or the Quran, be treated with solemn reverence.",
    "teachingLocal": "छत्रपति शिवाजी ने सिखाया कि शक्ति और शासन का एकमात्र उद्देश्य प्रजा की रक्षा और धर्म की प्रतिष्ठा है। उन्होंने युद्ध के ऐसे उच्च नैतिक मानदंड स्थापित किए जिनमें महिलाओं, बच्चों, किसानों और पूजा-स्थलों पर प्रहार सर्वथा वर्जित था। उनके राज्य में शत्रु के धार्मिक ग्रंथों का भी पूर्ण सम्मान किया जाता था।",
    "moral": "Strategic foresight, unyielding self-respect, and moral integrity can overcome seemingly insurmountable imperial monopolies. True sovereignty begins when a people awaken to their inherent dignity and dedicate their collective strength to the welfare of all.",
    "moralLocal": "अटल स्वाभिमान, कुशल रणनीति और चारित्रिक पवित्रता के सम्मुख संसार की बड़ी से बड़ी साम्राज्यवादी शक्ति भी नतमस्तक हो जाती है। सच्चा नेतृत्व वही है जो जन-जन में स्वतंत्रता और स्वावलंबन का विश्वास जगा दे।",
    "legacy": "Chhatrapati Shivaji Maharaj fundamentally altered the course of Indian history, dismantling the myth of foreign imperial invincibility and laying the bedrock for the Maratha confederacy that eventually extended across northern and central India. His naval doctrines, mountain warfare strategies, and enlightened administrative ethics continue to inspire India’s armed forces, with the modern Indian Navy drawing its naval ensign from his royal seal (Rajmudra).",
    "legacyLocal": "छत्रपति शिवाजी महाराज ने विदेशी दासता के मिथक को तोड़कर भारत में राष्ट्रीय चेतना और स्वधर्म-गौरव का पुनर्जागरण किया। उनके द्वारा स्थापित हिंदवी स्वराज्य ने आगे चलकर अखिल भारतीय मराठा परिसंघ का रूप लिया। भारतीय नौसेना ने अपने ध्वज पर छत्रपति शिवाजी महाराज की राजमुद्रा को स्थान देकर उनके युगांतकारी समुद्री योगदान को अमर सम्मान दिया है।",
    "source": "Sabhasad Bakhar (Krishnaji Anant Sabhasad, 1697 CE), Sri Shivabharata (Kavindra Paramananda, 1674 CE), Shivaji and His Times (Sir Jadunath Sarkar, 1919)",
    "sourceLocal": "सभासद बखर (कृष्णाजी अनंत सभासद, १६९७ ई.), श्री शिवभारत (कविंद्र परमानंद, १६७४ ई.), शिवाजी एंड हिज टाइम्स (सर जदुनाथ सरकार, १९१९)",
    "sourceCitations": [
      {
        "sourceName": "Krishnaji Anant Sabhasad — Sabhasad Bakhar (1697 CE)",
        "sourceRef": "Life and Campaigns of Chhatrapati Shivaji Maharaj",
        "tier": 1
      },
      {
        "sourceName": "Kavindra Paramananda — Sri Shivabharata (1674 CE)",
        "sourceRef": "Cantos 1–32 (Contemporary Sanskrit court epic on Shivaji)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "This kingdom's establishment is not for personal vanity; it is the will of the Divine Almighty.",
      "attribution": "Chhatrapati Shivaji Maharaj — Letter to Dadaji Naras Prabhu, 1645"
    },
    "quoteLocal": {
      "text": "हे राज्य व्हावे, हे तो श्रींची इच्छा!",
      "attribution": "छत्रपती शिवाजी महाराज (१६४५)"
    }
  },
  {
    "id": "maharana-pratap",
    "name": "Maharana Pratap",
    "nameLocal": "महाराणा प्रताप",
    "era": "1540 – 1597 CE",
    "eraLocal": "१५४० – १५९७ ई.",
    "tradition": "hindu",
    "region": "Mewar, Rajasthan",
    "regionLocal": "मेवाड़, राजस्थान",
    "emoji": "⚔️",
    "tagline": "The lion of Mewar who rejected royal luxury and imperial vassalage, enduring decades of forest warfare to keep the flame of Rajput independence burning.",
    "taglineLocal": "मेवाड़ के अमर प्रतापी सूर्य जिन्होंने मुग़ल अधीनता को ठुकराकर वनों में घास की रोटियां खाईं, किंतु स्वाभिमान और स्वतंत्रता का ध्वज कभी झुकने नहीं दिया।",
    "journey": "Maharana Pratap Singh I was born at Kumbhalgarh Fort to Maharana Udai Singh II and Rani Jaiwanta Bai, inheriting the illustrious Sisodia Rajput dynasty of Mewar—the sole royal house in northern India that steadfastly refused matrimonial alliances or political subjugation to the expanding Mughal empire. Ascending the throne of Mewar in 1572 amidst severe internal strife and regional isolation, Pratap rejected every lucrative diplomatic embassy sent by Emperor Akbar offering immense riches and imperial rank in exchange for paying personal court and bowing before Delhi. Pratap declared that sovereignty and the sacred soil of Eklingji could never be bartered for comfortable servitude.\n\nKnowing that open warfare against the colossal resources of the Mughal empire would be suicide on the plains, Pratap fortified the rugged gorges of the Aravalli hills. He enlisted the indigenous Bhil tribals as brothers-in-arms under Rana Punja Bhil, mastering guerrilla mountain warfare and establishing supply chains in the deep wilderness. On June 18, 1576, Pratap met the imperial forces under Man Singh I at the narrow mountain pass of Haldighati. Clad in heavy armor and riding his devoted blue stallion Chetak, Pratap led a thunderous cavalry charge directly into the heart of the Mughal center. Though heavily outnumbered and wounded by multiple arrows and spears, Pratap fought with mythic fury, while his noble steed Chetak leapt upon the war elephant of the imperial general, sacrificing his life in a legendary final leap across a mountain stream to carry his wounded master to safety.",
    "journeyLocal": "कुंभलगढ़ दुर्ग में जन्मे महाराणा प्रताप मेवाड़ के सूर्यवंशी सिसोदिया राजवंश के गौरव थे। जब संपूर्ण उत्तर भारत मुग़ल सत्ता के सामने नतमस्तक हो रहा था, तब १५७२ में मेवाड़ के सिंहासन पर आसीन होकर प्रताप ने मुग़ल सम्राट अकबर की अधीनता स्वीकार करने से स्पष्ट इनकार कर दिया। अकबर द्वारा भेजे गए संधि-प्रस्तावों और सुख-सुविधाओं के प्रलोभनों को ठुकराते हुए उन्होंने घोषणा की कि एकलिंगजी की पावन भूमि कभी विदेशी दासता स्वीकार नहीं करेगी।\n\nमुग़ल साम्राज्य के असीम संसाधनों का सामना करने के लिए प्रताप ने अरावली की पहाड़ियों को अपना रक्षा-कवच बनाया। उन्होंने राणा पूंजा भील के नेतृत्व में स्थानीय भील योद्धाओं को अपना भाई बनाकर संगठित किया और छापामार युद्ध की रणनीति अपनाई। १८ जून १५७६ को हल्दीघाटी के ऐतिहासिक दर्रे में मानसिंह के नेतृत्व वाली मुग़ल सेना के साथ भीषण संग्राम हुआ। अपने स्वामीभक्त अश्व चेतक पर सवार होकर प्रताप ने युद्धभूमि में अद्वितीय पराक्रम दिखाया। चेतक ने घायल अवस्था में भी एक विशाल बरसाती नाले को लांघकर अपने स्वामी के प्राणों की रक्षा की और उनके चरणों में अपने प्राण त्याग दिए।",
    "trial": "Following Haldighati, Pratap was driven deep into the wild forests of the Aravallis, with imperial garrisons encircling every city in Mewar. For years, the Maharana, his queen, and his young children lived as wandering exiles, sleeping upon the stony forest floor, enduring bitter mountain winters, and subsisting on wild roots and rotis made from ground grass seed (ghas ki roti). Mughal patrols relentlessly pursued them, forcing the royal family to flee at midnight across rocky ridges with infant princes tucked inside wicker baskets.\n\nIn his darkest hour of financial exhaustion, when it seemed his army could no longer be sustained, his loyal hereditary minister Bhama Shah arrived at his forest camp. Bhama Shah placed his entire ancestral fortune—twenty-five lakh rupees and twenty thousand gold mohurs—at Pratap's feet, enough to maintain an army of twenty-five thousand soldiers for twelve full years. Revitalized by this selfless act of devotion, Maharana Pratap launched a sweeping military counter-offensive in 1582 at the Battle of Dewair, capturing Mughal outposts in rapid succession and liberating nearly all of Mewar, including Kumbhalgarh, Gogunda, and Udaipur, before passing away as an undefeated, free sovereign in his capital at Chavand.",
    "trialLocal": "हल्दीघाटी के पश्चात प्रताप को सपरिवार अरावली के बीहड़ जंगलों में शरण लेनी पड़ी। मुग़ल चौकियां मेवाड़ के चारों ओर फैली थीं। वर्षों तक महाराणा, उनकी महारानी और नन्हे राजकुमारों ने वनों में भटकते हुए घास के बीजों की रोटियां खाईं और शिलाओं पर शयन किया। मुग़ल सैनिकों की लगातार दबिश के कारण उन्हें रातों-रात नन्हे बच्चों को टोकरियों में छिपाकर एक पहाड़ी से दूसरी पहाड़ी पर भागना पड़ता था।\n\nजब धन और रसद के अभाव में सेना बिखरने की कगार पर थी, तब मेवाड़ के निष्ठावान दानवीर भामाशाह ने अपनी जीवन भर की संचित संपदा—२५ लाख रुपये और २० हजार स्वर्ण मुद्राएं—प्रताप के चरणों में समर्पित कर दीं, जिससे २५ हजार सैनिकों का १२ वर्ष तक भरण-पोषण हो सकता था। इस सहयोग से शक्ति पाकर महाराणा ने १५८२ में दिवेर के युद्ध में मुग़लों को करारी शिकस्त दी और एक-एक करके कुंभलगढ़, गोगुंदा और उदयपुर सहित संपूर्ण मेवाड़ को स्वतंत्र करा लिया।",
    "teaching": "Maharana Pratap taught that freedom is non-negotiable and that dignity outweighs physical comfort. A leader’s true strength is measured not by palace opulence, but by their willingness to suffer alongside their people in defense of their foundational values and sacred heritage.",
    "teachingLocal": "महाराणा प्रताप ने सिखाया कि आत्मसम्मान और स्वतंत्रता का कोई विकल्प नहीं होता। महलों के सुख-साधन और दासता से भरी विलासिता की तुलना में स्वाभिमान के साथ वनों में संघर्ष करना कोटि-कोटि गुना श्रेष्ठ है। सच्चा नेता वही है जो अपने सिद्धांतों के लिए सर्वस्व न्योछावर करने को तत्पर रहे।",
    "moral": "Material luxury and imperial favor bought at the price of self-respect are forms of gilded slavery. When an individual stands resolute on the rock of righteousness, no earthly empire can crush their spirit.",
    "moralLocal": "स्वाभिमान को बेचकर प्राप्त किया गया वैभव सोने की बेड़ियों के समान है। जो मनुष्य धर्म और राष्ट्र की रक्षा के लिए अडिग रहता है, इतिहास उसी का वंदन करता है।",
    "legacy": "Maharana Pratap’s lifelong defiance transformed him into the timeless archetype of patriotic valor across the Indian subcontinent. His alliance with the indigenous Bhils established an enduring model of cross-community brotherhood in arms. Centuries later, his legend inspired freedom fighters across the nation, from the Marathas and Bundelas to the revolutionary leaders of the Indian independence movement.",
    "legacyLocal": "महाराणा प्रताप का जीवन भारतवर्ष में राष्ट्रभक्ति और त्याग का अमर प्रतीक बन गया। भील समाज के साथ उनका आत्मीय संबंध सामाजिक समरसता की अनुपम मिसाल है। उनके अदम्य शौर्य ने छत्रपति शिवाजी से लेकर आधुनिक स्वाधीनता सेनानियों तक सभी को स्वाभिमान की प्रेरणा दी।",
    "source": "Rajprasasti Mahakavyam (Ranachhoda Bhatta, 1676 CE), Amar Kavya Vamshavali, Annals and Antiquities of Rajasthan (Lt. Col. James Tod, 1829)",
    "sourceLocal": "राजप्रशस्ति महाकाव्यम् (रणछोड़ भट्ट, १६७६ ई.), अमरकाव्य वंशावली, एनल्स एंड एंटीक्विटीज ऑफ राजस्थान (जेम्स टॉड, १८२९)",
    "sourceCitations": [
      {
        "sourceName": "Ranachhoda Bhatta — Rajprasasti Mahakavyam (1676 CE)",
        "sourceRef": "Sanskrit Inscriptions at Rajsamand Lake (Cantos on Maharana Pratap)",
        "tier": 1
      },
      {
        "sourceName": "Lt. Col. James Tod — Annals and Antiquities of Rajasthan (1829)",
        "sourceRef": "Vol. I, Annals of Mewar, Chapters IX–X",
        "tier": 1
      }
    ],
    "quote": {
      "text": "My mother, if you bear a son, let him be like Rana Pratap, at whose very name Akbar startles awake as if a serpent lay at his pillow.",
      "attribution": "Rajasthani Folk Bardic Lore (Doha on Rana Pratap)"
    },
    "quoteLocal": {
      "text": "मईया एहड़ो पूत जण जेहड़ो राणा प्रताप। अकबर सूतो ओझके जाण सिराणै साँप॥",
      "attribution": "राजस्थानी लोक दोहा"
    }
  },
  {
    "id": "guru-gobind-singh",
    "name": "Guru Gobind Singh Ji",
    "nameLocal": "गुरु गोबिंद सिंह जी",
    "namePa": "ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ",
    "era": "1666 – 1708 CE",
    "eraLocal": "१६६६ – १७०८ ई.",
    "eraPa": "੧੬੬੬ – ੧੭੦੮ ਈ.",
    "tradition": "sikh",
    "region": "Anandpur Sahib, Punjab",
    "regionLocal": "आनंदपुर साहिब, पंजाब",
    "regionPa": "ਅਨੰਦਪੁਰ ਸਾਹਿਬ, ਪੰਜਾਬ",
    "emoji": "🦅",
    "tagline": "The tenth Sikh Guru who transformed sparrows into hawks, established the Khalsa Panth to vanquish tyranny, and vested eternal Guruship in the Guru Granth Sahib.",
    "taglineLocal": "दसवें सिख गुरु जिन्होंने चिड़ियों से बाज लड़ाए, खालसा पंथ की स्थापना की और गुरु ग्रंथ साहिब को शाश्वत गुरु पद पर प्रतिष्ठित किया।",
    "taglinePa": "ਦਸਵੇਂ ਪਾਤਸ਼ਾਹ ਜਿਨ੍ਹਾਂ ਨੇ ਚਿੜੀਆਂ ਤੋਂ ਬਾਜ ਤੁੜਾਏ, ਖਾਲਸਾ ਪੰਥ ਦੀ ਸਾਜਨਾ ਕੀਤੀ ਅਤੇ ਸ਼ਬਦ ਗੁਰੂ ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਨੂੰ ਸਦੀਵੀ ਗੁਰਗੱਦੀ ਬਖ਼ਸ਼ੀ।",
    "journey": "Born in Patna Sahib to the ninth Guru, Tegh Bahadur, and Mata Gujri, Gobind Rai grew up steeped in classical spiritual wisdom, martial prowess, and multilingual scholarship, mastering Sanskrit, Persian, Arabic, Braj, and Punjabi. In 1675, when a delegation of Kashmiri Pandits sought protection from forced conversions, his father declared that a supreme soul must sacrifice his life to awaken the nation’s conscience. The nine-year-old Gobind Rai courageously remarked: \"Father, who in this land is more worthy of that sacrifice than you?\" Following Guru Tegh Bahadur's martyrdom at Chandni Chowk in Delhi, Guru Gobind Singh assumed the spiritual leadership of the Sikhs, determined to forge a people so fearless that no tyrant could ever oppress them again.\n\nOn the historic day of Vaisakhi in 1699 at Anandpur Sahib, before a gathering of eighty thousand disciples, Guru Gobind Singh drew a naked sword and demanded five heads for the faith. Five devoted Sikhs from diverse castes and corners of India stepped forward—the Panj Pyare (Five Beloved Ones). Administering Khande Di Pahul (nectar stirred with a double-edged sword), he inaugurated the Khalsa Panth, giving them the surname Singh (Lion) and Kaur (Princess). In an act of unparalleled spiritual humility, the Guru then knelt before the Panj Pyare, requesting that they initiate him into the Khalsa, declaring: \"Waho Waho Gobind Singh, Aape Gur Chela\" (Hail Gobind Singh, who is simultaneously the Guru and the disciple).",
    "journeyLocal": "पटना साहिब में नौवें गुरु तेग बहादुर जी और माता गुजरी जी के यहाँ जन्मे गोबिंद राय बाल्यकाल से ही शास्त्र और शस्त्र दोनों में पारंगत थे। १६७५ में जब कश्मीरी पंडितों की रक्षा हेतु गुरु तेग बहादुर जी ने शहादत का विचार किया, तब मात्र नौ वर्ष के बालक गोबिंद राय ने कहा: 'पिता जी! आपसे बढ़कर बलिदानी महापुरुष इस धरती पर और कौन हो सकता है?' पिता के बलिदान के पश्चात गुरु पद संभालते हुए उन्होंने मुग़ल अत्याचार के विरुद्ध समाज में अदम्य साहस का संचार किया।\n\n१६९९ की बैसाखी को आनंदपुर साहिब में अस्सी हजार की संगत के सम्मुख गुरु जी ने नंगी तलवार लहराकर शीश की मांग की। विभिन्न जातियों और प्रांतों से उठे पाँच निष्ठावान शिष्यों को उन्होंने अमृत छकाकर 'पंज प्यारे' के रूप में प्रतिष्ठित किया और 'खालसा पंथ' की स्थापना की। फिर स्वयं उनके सम्मुख नतमस्तक होकर अमृत की याचना की, जिससे यह अमर उद्घोष गूंज उठा: 'वाहो वाहो गोबिंद सिंह आपे गुर चेला'!",
    "journeyPa": "ਪਟਨਾ ਸਾਹਿਬ ਵਿਖੇ ਨੌਵੇਂ ਪਾਤਸ਼ਾਹ ਸ੍ਰੀ ਗੁਰੂ ਤੇਗ ਬਹਾਦਰ ਜੀ ਅਤੇ ਮਾਤਾ ਗੁਜਰੀ ਜੀ ਦੇ ਗ੍ਰਹਿ ਵਿਖੇ ਪ੍ਰਗਟ ਹੋਏ ਬਾਲ ਗੋਬਿੰਦ ਰਾਇ ਜੀ ਨੇ ਬਚਪਨ ਤੋਂ ਹੀ ਰੂਹਾਨੀ ਵਿੱਦਿਆ ਅਤੇ ਸ਼ਸਤਰ ਵਿੱਦਿਆ ਵਿਚ ਮੁਹਾਰਤ ਹਾਸਲ ਕੀਤੀ। ੧੬੭੫ ਵਿਚ ਜਦੋਂ ਕਸ਼ਮੀਰੀ ਪੰਡਿਤ ਫ਼ਰਿਆਦ ਲੈ ਕੇ ਆਏ, ਤਾਂ ਨੌਂ ਸਾਲ ਦੀ ਉਮਰ ਵਿਚ ਬਾਲਕ ਗੋਬਿੰਦ ਰਾਇ ਜੀ ਨੇ ਪਿਤਾ ਜੀ ਨੂੰ ਤਿਲਕ-ਜੰਞੂ ਦੀ ਰਾਖੀ ਲਈ ਦਿੱਲੀ ਸ਼ਹੀਦੀ ਦੇਣ ਲਈ ਪ੍ਰੇਰਿਆ। ਪਿਤਾ ਦੀ ਲਾਸਾਨੀ ਸ਼ਹਾਦਤ ਤੋਂ ਬਾਅਦ ਗੁਰਗੱਦੀ ਸੰਭਾਲਦਿਆਂ ਜ਼ੁਲਮ ਦਾ ਟਾਕਰਾ ਕਰਨ ਲਈ ਕੌਮ ਨੂੰ ਤਿਆਰ ਕੀਤਾ।\n\n੧੬੯੯ ਦੀ ਵਿਸਾਖੀ ਨੂੰ ਸ੍ਰੀ ਅਨੰਦਪੁਰ ਸਾਹਿਬ ਵਿਖੇ ਸੀਸ ਭੇਟ ਮੰਗ ਕੇ ਪੰਜਾਂ ਪਿਆਰਿਆਂ ਦੀ ਚੋਣ ਕੀਤੀ ਅਤੇ ਖੰਡੇ ਬਾਟੇ ਦੀ ਪਾਹੁਲ ਛਕਾ ਕੇ ਖ਼ਾਲਸਾ ਪੰਥ ਸਾਜਿਆ। ਫਿਰ ਆਪ ਪੰਜਾਂ ਪਿਆਰਿਆਂ ਅੱਗੇ ਨਤਮਸਤਕ ਹੋ ਕੇ ਅੰਮ੍ਰਿਤ ਛਕਿਆ, ਜਿਸ ਤੋਂ 'ਵਾਹੁ ਵਾਹੁ ਗੋਬਿੰਦ ਸਿੰਘ ਆਪੇ ਗੁਰ ਚੇਲਾ' ਦਾ ਅਦੁੱਤੀ ਸਿਧਾਂਤ ਪ੍ਰਗਟ ਹੋਇਆ।",
    "trial": "Guru Gobind Singh’s life was an unbroken crucible of supreme sacrifice. Besieged at Anandpur Sahib for months by combined Mughal imperial armies and hill chieftains, the Sikhs evacuated the fort in December 1705 under sworn safe-passage oaths on the Quran and cows, which the enemy treacherously violated. At the flooded Sirsa River, the Guru’s family was separated amidst furious combat. At the epic Battle of Chamkaur, the Guru with just forty starving Sikhs held a mud fortress against a besieging army of hundreds of thousands. There, he blessed and sent his eldest sons, Sahibzada Ajit Singh (18) and Sahibzada Jujhar Singh (14), into the battlefield, watching them achieve martyrdom with serene gratitude to the Almighty.\n\nMeanwhile, at Sirhind, his two younger sons, Sahibzada Zorawar Singh (9) and Sahibzada Fateh Singh (7), along with their grandmother Mata Gujri, were captured. Refusing to renounce their faith despite promises of princely estates and threats of torture, the young Sahibzade were bricked alive on the orders of Nawab Wazir Khan. Walking barefoot through the thorny forests of Machhiwara, having sacrificed his four sons, his father, and thousands of disciples, Guru Gobind Singh composed the immortal epistle Zafarnama (Epistle of Victory) in exquisite Persian verse to Emperor Aurangzeb, declaring: \"When all other means have failed, it is righteous to draw the sword.\" In 1708 at Hazur Sahib, Nanded, the Guru ended human Guruship, bowing before the Sri Guru Granth Sahib and commanding the Panth to revere the Shabad (divine word) as the eternal living Guru forevermore.",
    "trialLocal": "गुरु गोबिंद सिंह जी का संपूर्ण जीवन त्याग और बलिदान का अनुपम इतिहास है। आनंदपुर साहिब के घेरे के दौरान मुग़लों ने क़ुरान की कसमें खाकर सुरक्षित मार्ग का वचन दिया, किंतु पीछे से हमला कर दिया। सरसा नदी पर परिवार बिछड़ गया। चमकौर की कच्ची गढ़ी में मात्र चालीस भूखे सिखों के साथ लाखों की शाही सेना का सामना करते हुए गुरु जी ने अपने दोनों बड़े साहिबजादों—अजीत सिंह और जुझार सिंह—को अपने हाथों से रणभूमि में भेजा और उनकी शहादत पर प्रभु का शुकराना अदा किया।\n\nउधर सरहिंद में नवाब वज़ीर ख़ान ने छोटे साहिबजादों—जोरावर सिंह (९) और फतेह सिंह (७)—को धर्म न छोड़ने पर जीवित दीवारों में चिनवा दिया। माछीवाड़े के कंटीले जंगलों में नंगे पांव विचरते हुए भी गुरु जी ने बादशाह औरंगज़ेब को 'ज़फ़रनामा' (विजय-पत्र) लिखकर ललकारा। १७०८ में नांदेड़ (हजूर साहिब) में उन्होंने देहधारी गुरु-परंपरा समाप्त कर श्री गुरु ग्रंथ साहिब जी को शाश्वत गुरु पद सौंपा।",
    "trialPa": "ਅਨੰਦਪੁਰ ਸਾਹਿਬ ਦੇ ਕਿਲ੍ਹੇ ਨੂੰ ਮੁਗ਼ਲ ਅਤੇ ਪਹਾੜੀ ਰਾਜਿਆਂ ਦੀਆਂ ਫ਼ੌਜਾਂ ਵੱਲੋਂ ਲੰਮਾ ਸਮਾਂ ਘੇਰਾ ਪਾਉਣ ਤੋਂ ਬਾਅਦ, ਝੂਠੀਆਂ ਕਸਮਾਂ ਤੋੜ ਕੇ ਪਿੱਛੋਂ ਹਮਲਾ ਕੀਤਾ ਗਿਆ। ਸਰਸਾ ਨਦੀ ਦੇ ਕੰਢੇ ਪਰਿਵਾਰ ਵਿਛੋੜਾ ਪੈ ਗਿਆ। ਚਮਕੌਰ ਦੀ ਕੱਚੀ ਗੜ੍ਹੀ ਵਿਚ ਚਾਲੀ ਭੁੱਖੇ ਸਿੰਘਾਂ ਨਾਲ ਲੱਖਾਂ ਦੀ ਫ਼ੌਜ ਦਾ ਮੁਕਾਬਲਾ ਕਰਦਿਆਂ ਵੱਡੇ ਸਾਹਿਬਜ਼ਾਦੇ ਬਾਬਾ ਅਜੀਤ ਸਿੰਘ ਅਤੇ ਬਾਬਾ ਜੁਝਾਰ ਸਿੰਘ ਜੀ ਨੂੰ ਆਪਣੇ ਹੱਥੀਂ ਸ਼ਹੀਦ ਕਰਵਾਇਆ।\n\nਦੂਜੇ ਪਾਸੇ ਸਰਹਿੰਦ ਵਿਖੇ ਛੋਟੇ ਸਾਹਿਬਜ਼ਾਦੇ ਬਾਬਾ ਜ਼ੋਰਾਵਰ ਸਿੰਘ ਅਤੇ ਬਾਬਾ ਫ਼ਤਿਹ ਸਿੰਘ ਜੀ ਨੂੰ ਨੀਹਾਂ ਵਿਚ ਚਿਣ ਕੇ ਸ਼ਹੀਦ ਕਰ ਦਿੱਤਾ ਗਿਆ। ਮਾਛੀਵਾੜੇ ਦੇ ਜੰਗਲਾਂ ਵਿਚ ਕੰਡਿਆਂ 'ਤੇ ਚੱਲਦਿਆਂ ਵੀ ਅਕਾਲ ਪੁਰਖ ਦਾ ਸ਼ੁਕਰਾਨਾ ਕਰਦਿਆਂ ਔਰੰਗਜ਼ੇਬ ਨੂੰ 'ਜ਼ਫ਼ਰਨਾਮਾ' ਭੇਜਿਆ। ੧੭੦੮ ਵਿਚ ਸੱਚਖੰਡ ਸ੍ਰੀ ਹਜ਼ੂਰ ਸਾਹਿਬ ਵਿਖੇ ਦੇਹਧਾਰੀ ਗੁਰੂ ਪਰੰਪਰਾ ਸਮਾਪਤ ਕਰਕੇ ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਨੂੰ ਸਦੀਵੀ ਗੁਰਗੱਦੀ ਬਖ਼ਸ਼ਿਸ਼ ਕੀਤੀ।",
    "teaching": "Guru Gobind Singh revealed the philosophy of Sant-Sipahi (Saint-Soldier). Spiritual devotion and righteous defense must be inseparable; the sword is not for conquest, vengeance, or oppression, but an instrument of divine justice to protect the vulnerable when all peaceful avenues of reconciliation have been exhausted. He obliterated caste distinctions, declaring that the light of the Creator shines identically within all humanity: \"Manas ki jaat sabhe eke paihchanbo\" (Recognize all of humanity as one single caste).",
    "teachingLocal": "गुरु गोबिंद सिंह जी ने 'संत-सिपाही' का सिद्धांत दिया कि आत्मिक साधना और आत्मरक्षा एक-दूसरे के पूरक हैं। तलवार किसी पर अत्याचार करने के लिए नहीं, बल्कि पीड़ितों की रक्षा हेतु अंतिम उपाय के रूप में उठाई जानी चाहिए। उन्होंने संपूर्ण मानव जाति को एक समान मानकर जातिवाद को समूल नष्ट कर दिया: 'मानस की जात सभै एकै पहिचानबो'।",
    "teachingPa": "ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ ਨੇ ਸੰਤ-ਸਿਪਾਹੀ ਦਾ ਸੰਕਲਪ ਦਿੱਤਾ ਕਿ ਭਗਤੀ ਅਤੇ ਸ਼ਕਤੀ ਆਪਸ ਵਿਚ ਜੁੜੇ ਹੋਏ ਹਨ। ਤਲਵਾਰ ਅੱਤਿਆਚਾਰ ਲਈ ਨਹੀਂ, ਸਗੋਂ ਮਜ਼ਲੂਮਾਂ ਦੀ ਰੱਖਿਆ ਲਈ ਅੰਤਿਮ ਚਾਰੇ ਵਜੋਂ ਉਠਾਈ ਜਾਂਦੀ ਹੈ। ਉਹਨਾਂ ਨੇ ਜਾਤ-ਪਾਤ ਦਾ ਖ਼ਾਤਮਾ ਕਰਕੇ ਸਾਰੀ ਮਾਨਵਤਾ ਨੂੰ ਇੱਕ ਜਾਣਨ ਦਾ ਉਪਦੇਸ਼ ਦਿੱਤਾ: 'ਮਾਨਸ ਕੀ ਜਾਤ ਸਭੈ ਏਕੈ ਪਹਿਚਾਨਬੋ'।",
    "moral": "No loss, persecution, or sacrifice can diminish the victory of truth. When one surrenders completely to the Divine Will (Hukam), even death is transformed into a triumphant celebration of honor, righteousness, and spiritual liberation.",
    "moralLocal": "सत्य और धर्म के मार्ग पर किया गया सर्वोच्च बलिदान भी पराजय नहीं, बल्कि शाश्वत विजय है। ईश्वर के विधान पर अटल विश्वास रखने वाला मनुष्य कभी हताश नहीं होता और सदैव चढ़दी कला में रहता है।",
    "moralPa": "ਸੱਚ ਅਤੇ ਧਰਮ ਦੇ ਰਾਹ 'ਤੇ ਚੱਲਦਿਆਂ ਕੋਈ ਵੀ ਕੁਰਬਾਨੀ ਵਿਅਰਥ ਨਹੀਂ ਜਾਂਦੀ। ਪ੍ਰਮਾਤਮਾ ਦੇ ਭਾਣੇ ਨੂੰ ਮਿੱਠਾ ਮੰਨ ਕੇ ਜੀਊਣ ਵਾਲਾ ਮਨੁੱਖ ਹਰ ਹਾਲ ਵਿਚ ਅਡੋਲ ਅਤੇ ਚੜ੍ਹਦੀ ਕਲਾ ਵਿਚ ਰਹਿੰਦਾ ਹੈ।",
    "legacy": "Guru Gobind Singh bestowed an indestructible identity upon the Sikh nation through the Khalsa, giving the 5 Ks (Kesh, Kangha, Kara, Kachhera, Kirpan) and the eternal sovereignty of the Shabad Guru. His poetic masterworks in the Dasam Granth and Zafarnama continue to inspire unyielding courage across the globe, embodying the immortal maxim: \"Deh Shiva bar mohi ehai, shubh karman te kabhun na taron\" (Grant me this boon, O Lord, that I may never waver from righteous deeds).",
    "legacyLocal": "गुरु गोबिंद सिंह जी ने खालसा पंथ की स्थापना कर सिखों को पंच ककार और अद्वितीय पहचान प्रदान की। उन्होंने 'शब्द गुरु' श्री गुरु ग्रंथ साहिब जी को सर्वोच्च सत्ता बनाकर समाज को रूढ़ियों से मुक्त किया। उनके काव्य और उनका अमर जीवन युगों-युगों तक अन्याय के विरुद्ध लड़ने की प्रेरणा देते रहेंगे।",
    "legacyPa": "ਗੁਰੂ ਸਾਹਿਬ ਨੇ ਖ਼ਾਲਸਾ ਪੰਥ ਦੀ ਸਿਰਜਣਾ ਕਰਕੇ ਸਿੱਖਾਂ ਨੂੰ ਨਿਆਰੀ ਪਛਾਣ ਅਤੇ ਚੜ੍ਹਦੀ ਕਲਾ ਦੀ ਦਾਤ ਬਖ਼ਸ਼ੀ। ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਨੂੰ ਗੁਰਗੱਦੀ ਸੌਂਪ ਕੇ ਸ਼ਬਦ ਗੁਰੂ ਦੇ ਲੜ ਲਾਇਆ ਅਤੇ ਜ਼ੁਲਮ ਦੇ ਖ਼ਿਲਾਫ਼ ਸਦਾ ਲਈ ਲੜਨ ਦੀ ਪ੍ਰੇਰਨਾ ਦਿੱਤੀ।",
    "source": "Dasam Granth (Bachittar Natak, Zafarnama), Sri Gur Sobha (Kavi Senapati, 1711 CE), Mahan Kosh (Bhai Kahn Singh Nabha)",
    "sourceLocal": "दसम ग्रंथ (बचित्तर नाटक, ज़फ़रनामा), श्री गुर सोभा (कवि सेनापति, १७११ ई.), महान कोश (भाई काह्न सिंह नाभा)",
    "sourcePa": "ਦਸਮ ਗ੍ਰੰਥ (ਬਚਿੱਤਰ ਨਾਟਕ, ਜ਼ਫ਼ਰਨਾਮਾ), ਸ੍ਰੀ ਗੁਰ ਸੋਭਾ (ਕਵੀ ਸੈਨਾਪਤੀ, ੧੭੧੧ ਈ.), ਮਹਾਨ ਕੋਸ਼ (ਭਾਈ ਕਾਨ੍ਹ ਸਿੰਘ ਨਾਭਾ)",
    "sourceCitations": [
      {
        "sourceName": "Guru Gobind Singh Ji — Zafarnama (Epistle of Victory, 1705 CE)",
        "sourceRef": "Verses 22–24 (The Principle of Righteous Resistance)",
        "tier": 1
      },
      {
        "sourceName": "Kavi Senapati — Sri Gur Sobha (1711 CE)",
        "sourceRef": "Chapters 5–18 (Eyewitness chronicle of the Khalsa and Anandpur Sahib)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "When all other recourse has failed, it is righteous to take sword in hand.",
      "attribution": "Guru Gobind Singh Ji — Zafarnama, Verse 22"
    },
    "quoteLocal": {
      "text": "चूँ कार अज़ हमह हीलते दर गुज़श्त। हलाल अस्त बुरदन ब शमशीर दस्त॥",
      "attribution": "गुरु गोबिंद सिंह जी (ज़फ़रनामा, बंद २२)"
    },
    "quotePa": {
      "text": "ਚੂੰ ਕਾਰ ਅਜ਼ ਹਮਹ ਹੀਲਤੇ ਦਰ ਗੁਜ਼ਸ਼ਤ ॥ ਹਲਾਲ ਅਸਤ ਬੁਰਦਨ ਬ ਸ਼ਮਸ਼ੀਰ ਦਸਤ ॥",
      "attribution": "ਸ੍ਰੀ ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ (ਜ਼ਫ਼ਰਨਾਮਾ, ਬੰਦ ੨੨)"
    }
  },
  {
    "id": "baba-deep-singh",
    "name": "Baba Deep Singh Ji",
    "nameLocal": "बाबा दीप सिंह जी",
    "namePa": "ਬਾਬਾ ਦੀਪ ਸਿੰਘ ਜੀ",
    "era": "1682 – 1757 CE",
    "eraLocal": "१६८२ – १७५७ ई.",
    "eraPa": "੧੬੮੨ – ੧੭੫੭ ਈ.",
    "tradition": "sikh",
    "region": "Damdama Sahib & Amritsar, Punjab",
    "regionLocal": "दमदमा साहिब व अमृतसर, पंजाब",
    "regionPa": "ਦਮਦਮਾ ਸਾਹਿਬ ਤੇ ਅੰਮ੍ਰਿਤਸਰ, ਪੰਜਾਬ",
    "emoji": "⚔️",
    "tagline": "The venerable scholar-warrior who scribed the Guru Granth Sahib and fought with his head upon his palm to liberate Sri Harmandir Sahib at age 75.",
    "taglineLocal": "पूज्य विद्वान-योद्धा जिन्होंने गुरु ग्रंथ साहिब के पावन स्वरूपों की हस्तलिखित प्रतियां तैयार कीं और ७५ वर्ष की आयु में हरिमंदिर साहिब की मुक्ति हेतु शीश हथेली पर रखकर युद्ध किया।",
    "taglinePa": "ਮਹਾਨ ਵਿਦਵਾਨ ਤੇ ਜਰਨੈਲ ਜਿਨ੍ਹਾਂ ਨੇ ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਦੇ ਸਰੂਪ ਲਿਖੇ ਅਤੇ ੭੫ ਸਾਲ ਦੀ ਉਮਰ ਵਿਚ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੀ ਪਵਿੱਤਰਤਾ ਲਈ ਸੀਸ ਤਲੀ 'ਤੇ ਧਰ ਕੇ ਲੜੇ।",
    "journey": "Born in the village of Pahuwind in Amritsar district to Bhai Bhagtu and Mata Jioni, Deepa received the baptism of the double-edged sword (Khande Di Pahul) from Guru Gobind Singh Ji himself at Anandpur Sahib in 1700. Immersing himself in spiritual studies and martial training under the direct supervision of the Tenth Master, Baba Deep Singh mastered Gurmukhi, Persian, and Sanskrit. When Guru Gobind Singh stayed at Talwandi Sabo (Guru Ki Kashi, Damdama Sahib) in 1706, Baba Deep Singh and Bhai Mani Singh served as the primary scribes, assisting the Guru in preparing the definitive, complete Damdami Bir of the Sri Guru Granth Sahib, incorporating the sacred hymns of the ninth Guru, Tegh Bahadur.\n\nFollowing the departure of Guru Gobind Singh to the Deccan, Baba Deep Singh remained at Damdama Sahib as the chief custodian and spiritual preceptor of the Sikh center. A profound scholar as well as a master calligrapher, Baba Deep Singh painstakingly hand-copied four complete volumes of the Sri Guru Granth Sahib, dispatching them to the four historical Takhts: Sri Akal Takht Sahib, Takht Sri Patna Sahib, Takht Sri Damdama Sahib, and Takht Sri Hazur Sahib. Later, he joined Baba Banda Singh Bahadur in 1709 to punish the tyrants of Sirhind and protect the agrarian populace. As the head of the Shahid Misl, Baba Deep Singh was revered across the Panth as a living saint who spent his days teaching Gurbani to thousands of scholars while maintaining continuous preparedness for righteous defense.",
    "journeyLocal": "अमृतसर जिले के पहुविंड गाँव में जन्मे बाबा दीप सिंह जी ने १७०० में आनंदपुर साहिब में स्वयं गुरु गोबिंद सिंह जी के कर-कमलों से खंडे बाटे का अमृत छका। दशमेश पिता की छत्रछाया में उन्होंने गुरमुखी, फ़ारसी और संस्कृत में अद्वितीय विद्वत्ता प्राप्त की। १७०६ में जब गुरु गोबिंद सिंह जी तलवंडी साबो (दमदमा साहिब, गुरु की काशी) पधारे, तब बाबा दीप सिंह जी और भाई मनी सिंह जी ने मुख्य लेखक की भूमिका निभाते हुए गुरु तेग बहादुर जी की बाणी को सम्मिलित कर श्री गुरु ग्रंथ साहिब जी के संपूर्ण 'दमदमी बीड़' के पावन स्वरूप को लिपिबद्ध किया।\n\nगुरु जी के दक्षिण गमन के पश्चात बाबा दीप सिंह जी दमदमा साहिब में गुरबाणी शिक्षण और सिख केंद्र के मुख्य संरक्षक बने रहे। उन्होंने अपने हाथों से श्री गुरु ग्रंथ साहिब जी के चार पावन स्वरूप तैयार कर चारों ऐतिहासिक तख्तों पर भिजवाए। १७०९ में उन्होंने बाबा बंदा सिंह बहादुर के साथ मिलकर अत्याचारियों को दंड दिया। 'शहीद मिसल' के प्रमुख के रूप में वे एक ऐसे संत-योद्धा थे जो दिन-रात गुरबाणी का पाठ और अध्यापन करते थे और धर्म-रक्षा के लिए सदैव तत्पर रहते थे।",
    "journeyPa": "ਅੰਮ੍ਰਿਤਸਰ ਜ਼ਿਲ੍ਹੇ ਦੇ ਪਿੰਡ ਪਹੂਵਿੰਡ ਵਿਖੇ ਜਨਮੇ ਬਾਬਾ ਦੀਪ ਸਿੰਘ ਜੀ ਨੇ ੧੭੦੦ ਵਿਚ ਸ੍ਰੀ ਅਨੰਦਪੁਰ ਸਾਹਿਬ ਵਿਖੇ ਕਲਗੀਧਰ ਪਾਤਸ਼ਾਹ ਦੇ ਹੱਥੋਂ ਅੰਮ੍ਰਿਤ ਛਕਿਆ। ਦਸਮ ਪਾਤਸ਼ਾਹ ਦੀ ਛਤਰ-ਛਾਇਆ ਹੇਠ ਗੁਰਮੁਖੀ, ਫ਼ਾਰਸੀ ਅਤੇ ਸੰਸਕ੍ਰਿਤ ਦੀ ਉੱਚ ਵਿੱਦਿਆ ਹਾਸਲ ਕੀਤੀ। ੧੭੦੬ ਵਿਚ ਤਲਵੰਡੀ ਸਾਬੋ (ਸ੍ਰੀ ਦਮਦਮਾ ਸਾਹਿਬ) ਵਿਖੇ ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ ਦੀ ਹਜ਼ੂਰੀ ਵਿਚ ਭਾਈ ਮਨੀ ਸਿੰਘ ਜੀ ਦੇ ਨਾਲ ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਦੀ ਪਵਿੱਤਰ 'ਦਮਦਮੀ ਬੀੜ' ਲਿਖਣ ਦੀ ਮਹਾਨ ਸੇਵਾ ਨਿਭਾਈ।\n\nਸ੍ਰੀ ਦਮਦਮਾ ਸਾਹਿਬ ਵਿਖੇ ਗੁਰਮਤਿ ਵਿੱਦਿਆ ਦਾ ਕੇਂਦਰ ਚਲਾਉਂਦਿਆਂ ਬਾਬਾ ਜੀ ਨੇ ਆਪਣੇ ਹੱਥੀਂ ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਦੇ ਚਾਰ ਪਾਵਨ ਸਰੂਪ ਲਿਖ ਕੇ ਚਾਰਾਂ ਤਖ਼ਤਾਂ 'ਤੇ ਭੇਜੇ। ੧੭੦੯ ਵਿਚ ਬਾਬਾ ਬੰਦਾ ਸਿੰਘ ਬਹਾਦਰ ਨਾਲ ਜ਼ਾਲਮਾਂ ਨੂੰ ਸੋਧਣ ਵਿਚ ਅਹਿਮ ਯੋਗਦਾਨ ਪਾਇਆ। 'ਸ਼ਹੀਦ ਮਿਸਲ' ਦੇ ਮੁਖੀ ਵਜੋਂ ਉਹ ਉੱਘੇ ਵਿਦਵਾਨ ਅਤੇ ਅਦੁੱਤੀ ਜਰਨੈਲ ਸਨ।",
    "trial": "In 1757, the Afghan conqueror Ahmad Shah Abdali launched his fourth brutal invasion of India. Appointing his son Timur Shah and general Jahan Khan as governors of Lahore, Abdali ordered the total destruction of Sri Harmandir Sahib in Amritsar. The Afghan army desecrated the sanctum sanctorum, blew up the sacred causeway with gunpowder, and filled the holy Amrit Sarovar with debris and animal carcasses to extinguish the spiritual heart of Sikhi.\n\nWhen news of this sacrilege reached Baba Deep Singh at Damdama Sahib, the 75-year-old warrior-saint immediately vowed to liberate the Golden Temple or lay down his life in the Parikrama. Drawing a line in the soil with his heavy eighteen-ser (approx. 14 kg) double-edged Khanda, he proclaimed: \"Only those who are prepared to lay down their heads for the Guru should cross this line.\" Five thousand Khalsa warriors crossed the line without hesitation. Clad in yellow robes and reciting Gurbani, the Khalsa advanced towards Amritsar. At the Battle of Gohalwar, six miles from Amritsar, they collided with twenty thousand Afghan troops. In fierce hand-to-hand combat, Baba Deep Singh fought his way through enemy ranks until he engaged Afghan commander Jamal Khan in a duel. Both commanders struck simultaneous blows, decapitating one another. As Baba Deep Singh fell, a fellow warrior reminded him of his sacred vow to reach Sri Darbar Sahib. Imbued with superhuman spiritual resolve, the saint-warrior lifted his severed head with his left hand, gripped his Khanda in his right, and continued cutting through the Afghan lines until he collapsed on the sacred marble Parikrama of Sri Harmandir Sahib, fulfilling his vow with his final breath.",
    "trialLocal": "१७५७ में अहमद शाह अब्दाली के चौथे आक्रमण के समय उसके सेनापति जहान ख़ान ने अमृतसर पर हमला कर श्री हरिमंदिर साहिब को अपवित्र कर दिया। पवित्र अमृत सरोवर को मिट्टी और मलबे से भर दिया गया ताकि सिखों के आध्यात्मिक केंद्र को नष्ट किया जा सके।\n\nजब यह समाचार दमदमा साहिब पहुँचा, तो ७५ वर्षीय बाबा दीप सिंह जी ने हरिमंदिर साहिब को मुक्त कराने या अपने प्राणों की आहुति देने का संकल्प लिया। उन्होंने अपने अठारह सेर (लगभग १४ किलो) वजनी खंडे से ज़मीन पर लकीर खींचकर ललकारा: 'जो गुरु के लिए शीश न्योछावर करने को तैयार हो, वही इस लकीर को पार करे।' पाँच हज़ार सिंहों ने तत्काल लकीर पार की। अमृतसर से कुछ मील दूर गोहलवड़ के मैदान में बीस हज़ार अफ़गान सैनिकों से भीषण युद्ध हुआ। युद्ध में अफ़गान सेनापति जमाल ख़ान के साथ द्वंद्व में दोनों के एक साथ वार से बाबा जी का शीश धड़ से अलग हो गया। पास खड़े सिंह द्वारा प्रण स्मरण कराने पर, बाबा जी ने अपने बाएँ हाथ पर अपना शीश टिकाया, दाएँ हाथ से खंडा घुमाते हुए शत्रुओं का संहार किया और हरिमंदिर साहिब की पावन परिक्रमा में पहुँचकर अपना शीश अर्पित कर प्रण पूरा किया।",
    "trialPa": "੧੭੫੭ ਵਿਚ ਅਹਿਮਦ ਸ਼ਾਹ ਅਬਦਾਲੀ ਦੇ ਜਰਨੈਲ ਜਹਾਨ ਖ਼ਾਨ ਨੇ ਸ੍ਰੀ ਅੰਮ੍ਰਿਤਸਰ 'ਤੇ ਹਮਲਾ ਕਰਕੇ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੀ ਬੇਅਦਬੀ ਕੀਤੀ ਅਤੇ ਪਵਿੱਤਰ ਅੰਮ੍ਰਿਤ ਸਰੋਵਰ ਨੂੰ ਪੂਰ ਦਿੱਤਾ। ਇਸ ਬੇਅਦਬੀ ਦੀ ਖ਼ਬਰ ਸੁਣ ਕੇ ੭੫ ਸਾਲਾ ਬਾਬਾ ਦੀਪ ਸਿੰਘ ਜੀ ਨੇ ਦਰਬਾਰ ਸਾਹਿਬ ਨੂੰ ਆਜ਼ਾਦ ਕਰਵਾਉਣ ਦਾ ਪ੍ਰਣ ਲਿਆ।\n\nਸ੍ਰੀ ਦਮਦਮਾ ਸਾਹਿਬ ਵਿਖੇ ੧੮ ਸੇਰ ਦੇ ਖੰਡੇ ਨਾਲ ਧਰਤੀ 'ਤੇ ਲਕੀਰ ਖਿੱਚ ਕੇ ਫ਼ੁਰਮਾਇਆ: 'ਜਿਹੜਾ ਗੁਰੂ ਦੇ ਲੇਖੇ ਸਿਰ ਲਾਉਣਾ ਚਾਹੁੰਦਾ ਹੈ, ਉਹ ਇਸ ਲਕੀਰ ਨੂੰ ਟੱਪੇ।' ਪੰਜ ਹਜ਼ਾਰ ਸਿੰਘਾਂ ਨੇ ਖ਼ੁਸ਼ੀ-ਖ਼ੁਸ਼ੀ ਲਕੀਰ ਟੱਪੀ। ਗੋਹਲਵੜ ਦੇ ਮੈਦਾਨ ਵਿਚ ਅਫ਼ਗਾਨ ਫ਼ੌਜ ਨਾਲ ਗਹਿਗੱਚ ਲੜਾਈ ਹੋਈ। ਜਮਾਲ ਖ਼ਾਨ ਨਾਲ ਲੜਦਿਆਂ ਬਾਬਾ ਜੀ ਦਾ ਸੀਸ ਧੜ ਤੋਂ ਜੁਦਾ ਹੋ ਗਿਆ। ਇੱਕ ਸਾਥੀ ਸਿੰਘ ਵੱਲੋਂ ਪ੍ਰਣ ਯਾਦ ਕਰਵਾਉਣ 'ਤੇ ਬਾਬਾ ਜੀ ਨੇ ਖੱਬੇ ਹੱਥ ਦੀ ਤਲੀ 'ਤੇ ਆਪਣਾ ਸੀਸ ਟਿਕਾ ਕੇ, ਸੱਜੇ ਹੱਥ ਨਾਲ ਖੰਡਾ ਚਲਾਉਂਦਿਆਂ ਦੁਸ਼ਮਣਾਂ ਦਾ ਸਫ਼ਾਇਆ ਕੀਤਾ ਅਤੇ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੀ ਪਰਿਕਰਮਾ ਵਿਚ ਪਹੁੰਚ ਕੇ ਸੀਸ ਭੇਟ ਕਰਕੇ ਆਪਣਾ ਬਚਨ ਨਿਭਾਇਆ।",
    "teaching": "Baba Deep Singh demonstrated that scholarship without courage is hollow, and strength without spiritual contemplation is blind. The sanctity of sacred spaces and the defense of spiritual freedom demand uncompromising devotion. The physical body is merely an instrument; when the soul is anchored in the Divine, spiritual will overcomes all mortal limitations.",
    "teachingLocal": "बाबा दीप सिंह जी ने सिद्ध किया कि भक्ति और शक्ति, ज्ञान और शौर्य का समन्वय ही पूर्ण जीवन है। धर्म-स्थलों की पवित्रता और सत्य की रक्षा के लिए लिया गया संकल्प सांसारिक सीमाओं और मृत्यु के भय से परे होता है।",
    "teachingPa": "ਬਾਬਾ ਦੀਪ ਸਿੰਘ ਜੀ ਨੇ ਸਾਬਤ ਕੀਤਾ ਕਿ ਗਿਆਨ ਅਤੇ ਸ਼ਕਤੀ ਦਾ ਸੁਮੇਲ ਹੀ ਅਸਲ ਜੀਵਨ ਹੈ। ਗੁਰਧਾਮਾਂ ਦੀ ਪਵਿੱਤਰਤਾ ਅਤੇ ਧਰਮ ਦੀ ਰੱਖਿਆ ਲਈ ਕਿਸੇ ਵੀ ਕੁਰਬਾਨੀ ਤੋਂ ਪਿੱਛੇ ਨਹੀਂ ਹਟਣਾ ਚਾਹੀਦਾ। ਸਰੀਰ ਨਾਸ਼ਵਾਨ ਹੈ ਪਰ ਆਤਮਿਕ ਸੰਕਲਪ ਅਤੇ ਅਣਖ ਸਦਾ ਅਮਰ ਰਹਿੰਦੇ ਹਨ।",
    "moral": "A life dedicated to truth knows no decay, exhaustion, or fear of death. When a vow is taken in selfless service to the Divine, the power of faith transcends the laws of nature.",
    "moralLocal": "ईश्वर और धर्म के लिए निष्काम भाव से किया गया संकल्प प्रकृति के नियमों को भी बदल देता है। सत्य के मार्ग पर चलने वाले को वृद्धावस्था या मृत्यु कभी पराजित नहीं कर सकती।",
    "moralPa": "ਗੁਰੂ ਦੇ ਭਰੋਸੇ 'ਤੇ ਲਿਆ ਗਿਆ ਪ੍ਰਣ ਕਦੇ ਅਧੂਰਾ ਨਹੀਂ ਰਹਿੰਦਾ। ਨੇਕੀ ਅਤੇ ਧਰਮ ਦੇ ਮਾਰਗ 'ਤੇ ਚੱਲਦਿਆਂ ਮਨੁੱਖ ਮੌਤ ਦੇ ਭੈਅ ਤੋਂ ਮੁਕਤ ਹੋ ਕੇ ਅਕਾਲ ਪੁਰਖ ਦੀ ਗੋਦ ਦਾ ਆਨੰਦ ਮਾਣਦਾ ਹੈ।",
    "legacy": "Baba Deep Singh’s supreme sacrifice is etched eternally into Sikh consciousness, commemorated daily in the global Ardas. The Shahidganj Gurdwara stands on the sacred spot in the Parikrama where he laid down his head, and his historic Khanda is preserved at Sri Akal Takht Sahib as an enduring symbol of spiritual defiance and fearlessness.",
    "legacyLocal": "बाबा दीप सिंह जी का बलिदान संपूर्ण मानवता के लिए प्रेरणा का स्रोत है और सिख अरदास का अभिन्न अंग है। हरिमंदिर साहिब की परिक्रमा में गुरुद्वारा शहीद बंगा उनकी अटूट आस्था का साक्षी है, और उनका खंडा श्री अकाल तख्त साहिब पर श्रद्धा से सुरक्षित है।",
    "legacyPa": "ਬਾਬਾ ਦੀਪ ਸਿੰਘ ਜੀ ਦੀ ਸ਼ਹਾਦਤ ਸਿੱਖ ਕੌਮ ਦੀ ਅਰਦਾਸ ਦਾ ਅਨਿੱਖੜਵਾਂ ਅੰਗ ਹੈ। ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੀ ਪਰਿਕਰਮਾ ਵਿੱਚ ਗੁਰਦੁਆਰਾ ਸ਼ਹੀਦ ਬਾਬਾ ਦੀਪ ਸਿੰਘ ਜੀ ਉਹਨਾਂ ਦੇ ਅਡੋਲ ਸਿਦਕ ਦੀ ਗਵਾਹੀ ਭਰਦਾ ਹੈ। ਉਹਨਾਂ ਦਾ ਖੰਡਾ ਸ੍ਰੀ ਅਕਾਲ ਤਖ਼ਤ ਸਾਹਿਬ 'ਤੇ ਸ਼ਰਧਾ ਨਾਲ ਸੰਭਾਲਿਆ ਗਿਆ ਹੈ।",
    "source": "Prachin Panth Prakash (Rattan Singh Bhangu, 1841 CE), Sri Gur Pratap Suraj Granth (Kavi Santokh Singh, 1843 CE)",
    "sourceLocal": "प्राचीन पंथ प्रकाश (रतन सिंह भंगू, १८४१ ई.), श्री गुर प्रताप सूरज ग्रंथ (कवि संतोख सिंह, १८४३ ई.)",
    "sourcePa": "ਪ੍ਰਾਚੀਨ ਪੰਥ ਪ੍ਰਕਾਸ਼ (ਰਤਨ ਸਿੰਘ ਭੰਗੂ, ੧੮੪੧ ਈ.), ਸ੍ਰੀ ਗੁਰ ਪ੍ਰਤਾਪ ਸੂਰਜ ਗ੍ਰੰਥ (ਕਵੀ ਸੰਤੋਖ ਸਿੰਘ, ੧੮੪੩ ਈ.)",
    "sourceCitations": [
      {
        "sourceName": "Rattan Singh Bhangu — Prachin Panth Prakash (1841 CE)",
        "sourceRef": "Episode of Shahid Baba Deep Singh and the Battle of Gohalwar",
        "tier": 1
      },
      {
        "sourceName": "Kavi Santokh Singh — Sri Gur Pratap Suraj Granth (Suraj Prakash, 1843 CE)",
        "sourceRef": "Ain 2, Account of the Liberation of Sri Amritsar",
        "tier": 1
      }
    ],
    "quote": {
      "text": "If you desire to play the game of love with Me, come onto My street with your head upon the palm of your hand.",
      "attribution": "Guru Nanak Dev Ji — Sri Guru Granth Sahib, Ang 1412"
    },
    "quoteLocal": {
      "text": "जउ तउ प्रेम खेलन का चाउ। सिरु धरि तली गली मेरी आउ॥",
      "attribution": "गुरु नानक देव जी (श्री गुरु ग्रंथ साहिब, अंग १४१२)"
    },
    "quotePa": {
      "text": "ਜਉ ਤਉ ਪ੍ਰੇਮ ਖੇਲਣ ਕਾ ਚਾਉ ॥ ਸਿਰੁ ਧਰਿ ਤਲੀ ਗਲੀ ਮੇਰੀ ਆਉ ॥",
      "attribution": "ਸ੍ਰੀ ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ (ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ, ਅੰਗ ੧੪੧੨)"
    }
  },
  {
    "id": "hanuman",
    "name": "Sri Hanuman",
    "nameLocal": "श्री हनुमान",
    "era": "Treta Yuga",
    "eraLocal": "त्रेता युग",
    "tradition": "hindu",
    "region": "Kishkindha & Ayodhya",
    "regionLocal": "किष्किंधा व अयोध्या",
    "emoji": "🚩",
    "tagline": "The supreme exemplar of selfless devotion, wisdom, and strength whose unconditional service to Lord Rama conquered all adversity.",
    "taglineLocal": "निःस्वार्थ भक्ति, असीम बल और विवेक के शिरोमणि जिन्होंने प्रभु श्री राम के काज संवारने हेतु समस्त संकटों को हर लिया।",
    "journey": "Born to Anjana and Kesari through the divine grace of Vayu Deva, Hanuman displayed cosmic spiritual vitality from infancy. Mistaking the rising sun for a golden fruit, the child leapt into the heavens, demonstrating fearless wonder before receiving boons of invulnerability, wisdom, and mastery over the elements from the celestial guardians. Educated directly by Surya Deva, the sun god, Hanuman mastered the four Vedas, the six Vedangas, grammar, and statesmanship, becoming the wisest among scholars while remaining completely devoid of ego. Later, as chief minister to the Vanara king Sugriva in the forests of Kishkindha, Hanuman acted as the discerning bridge of trust, recognizing the divine avatarhood of Sri Rama and Lakshmana during their wandering exile.\n\nWhen the search for the abducted Mother Sita led the Vanara search party to the southern shores of the ocean, the warriors sat in despair, overwhelmed by the hundred-yojana expanse of roaring waters. Reminded of his latent strength by the elder Jambavan, Hanuman expanded his physical form, climbed Mount Mahendra, and launched himself into the sky with a roar that shook the earth. Braving the oceanic demons Surasa and Simhika through intellect and agility, Hanuman reached Lanka, transformed into the size of a cat to slip past guards, and located the grief-stricken Janaki in the Ashoka Vatika, delivering Rama's signet ring and restoring her hope.",
    "journeyLocal": "माता अंजना और वानरराज केसरी के यहाँ पवनदेव की कृपा से अवतरित श्री हनुमान ने बाल्यकाल से ही अद्भुत तेज का परिचय दिया। सूर्य को फल समझकर आकाश में छलांग लगाने वाले बालक को समस्त देवों ने अमरता, अतुलित बल और विद्या का वरदान दिया। स्वयं सूर्यदेव से समस्त वेदों, उपनिषदों और व्याकरण का ज्ञान प्राप्त कर वे परम ज्ञानी बने, किंतु उनका हृदय सदैव निरहंकार और सेवा-भाव में लीन रहा। किष्किंधा में सुग्रीव के मंत्री के रूप में उन्होंने वन-वन भटकते प्रभु श्री राम और लक्ष्मण को पहचानकर उनकी मैत्री कराई।\n\nसीता जी की खोज में जब वानर सेना दक्षिण समुद्र तट पर आकर निराश हो गई, तब जाम्बवंत जी ने हनुमान जी को उनकी सोई हुई दिव्य शक्ति का स्मरण कराया। 'कवन सो काज कठिन जग माहीं, जो नहिं होत तात तुम्ह पाहीं' सुनते ही हनुमान जी ने महेंद्र पर्वत से गर्जना करते हुए सौ योजन के विशाल समुद्र को एक छलांग में लांघ लिया। सुरसा और सिंहिका की बाधाओं को बुद्धि-बल से पार कर वे लंका पहुँचे, सूक्ष्म रूप धरकर पहरेदारों से बचते हुए अशोक वाटिका में माता जानकी के दर्शन किए और प्रभु राम की मुद्रिका देकर उनके प्राणों में नवजीवन का संचार किया।",
    "trial": "Hanuman's trial was not merely facing demonic legions, but navigating extreme danger with unshakeable restraint and strategic brilliance. Captured intentionally after destroying the Ashoka grove to confront the demon king Ravana in open court, Hanuman fearlessly warned the tyrant to return Sita and take refuge in Rama's compassion. When the enraged Rakshasa king ordered Hanuman's tail wrapped in cloth, soaked in oil, and set ablaze, Hanuman transformed the intended execution into an instrument of liberation, expanding his body, leaping across the golden ramparts, and reducing the arrogant fortress of Lanka to ashes while keeping Mother Sita’s sanctuary untouched.\n\nDuring the apocalyptic war in Lanka, when Lakshmana fell unconscious, struck by Indrajit’s deadly Shakti weapon, the royal physician Sushena declared that life could only be preserved if the Sanjeevani herb from the distant Dronagiri mountain in the Himalayas was fetched before dawn. Traversing thousands of leagues across the night sky, Hanuman found the mountain enveloped in dazzling mystical illusions concealing the herb. Refusing to let time or uncertainty triumph, Hanuman uprooted the entire cosmic mountain upon his palm and flew back across the subcontinent, reviving Lakshmana and turning the tide of the war.",
    "trialLocal": "हनुमान जी की परीक्षा केवल दैत्यों से युद्ध करने की नहीं, बल्कि विषम परिस्थितियों में धैर्य और धर्म की मर्यादा बनाए रखने की थी। रावण की राजसभा में बंदी बनकर उन्होंने निर्भय होकर धर्म का उपदेश दिया। जब क्रूर रावण ने उनकी पूंछ में आग लगाने का आदेश दिया, तो उन्होंने उसी अग्नि से रावण के सोने की लंका के अहंकार को भस्म कर दिया, किंतु माता सीता के निवास को आंच तक नहीं आने दी।\n\nलंका युद्ध में जब मेघनाद के शक्ति-बाण से लक्ष्मण मूर्छित हो गए और सूर्योदय से पूर्व हिमालय के द्रोणागिरि पर्वत से संजीवनी बूटी लाना अनिवार्य हो गया, तब हनुमान जी ने रात्रि के अंधकार में हजारों योजन की दूरी तय की। पर्वत पर जड़ी-बूटियों की पहचान में भ्रम होने पर, उन्होंने समय व्यर्थ किए बिना समूचे पर्वत को ही अपनी हथेली पर उठा लिया और सूर्योदय से पहले लंका लौटकर लक्ष्मण जी के प्राणों की रक्षा की।",
    "teaching": "Hanuman revealed that the highest strength (Bala) finds its true purpose only when consecrated in selfless service (Seva) and total surrender to the Divine. Ego is the ultimate bondage, whereas pure devotion transforms even the impossible into effortless reality. Power without righteousness leads to ruin like Ravana; power aligned with Dharma becomes the savior of worlds like Hanuman.",
    "teachingLocal": "श्री हनुमान ने सिखाया कि बल और बुद्धि की सार्थकता केवल प्रभु-सेवा और दीन-दुखियों की रक्षा में है। अहंकार सबसे बड़ा बंधन है, जबकि अनन्य भक्ति असंभव कार्य को भी सहज बना देती है। शक्ति जब अधर्म के साथ होती है तो रावण की तरह विनाश लाती है, किंतु जब धर्म के साथ होती है तो हनुमान की भांति जगत का उद्धार करती है।",
    "moral": "True heroism does not boast of its achievements; it bows in humble gratitude to the Divine will. When actions are dedicated unconditionally to truth and love, grace dissolves every obstacle in heaven and earth.",
    "moralLocal": "सच्चा वीर अपने पराक्रम का अभिमान नहीं करता, बल्कि अपनी विजय को ईश्वर की कृपा मानता है। जब हृदय में सत्य और सेवा का वास होता है, तो संसार की कोई भी बाधा मार्ग नहीं रोक सकती।",
    "legacy": "Sri Hanuman remains the immortal Chiranjivi, revered in millions of households, ashrams, and temples across the world as the Sankat Mochan—the dispeller of fear, disease, and sorrow. His name invokes courage in the hearts of athletes, scholars, and spiritual seekers alike, while the Hanuman Chalisa composed by Tulsidas stands as the universal anthem of divine protection and inner fortitude.",
    "legacyLocal": "हनुमान जी अष्ट चिरंजीवियों में से एक हैं और युगों-युगों से संकटमोचन के रूप में जन-जन के हृदय में बसे हैं। तुलसीदास कृत 'हनुमान चालीसा' आज भी कोटि-कोटि भक्तों को आत्मिक शांति, अभय और सकारात्मक ऊर्जा प्रदान करती है।",
    "source": "Valmiki Ramayana (Sundara Kanda & Yuddha Kanda), Goswami Tulsidas — Ramcharitmanas",
    "sourceLocal": "वाल्मीकि रामायण (सुंदरकांड व युद्धकांड), गोस्वामी तुलसीदास — श्रीरामचरितमानस",
    "sourceCitations": [
      {
        "sourceName": "Valmiki Ramayana",
        "sourceRef": "Sundara Kanda, Sargas 1–55 (The Leap Across the Ocean and Exploration of Lanka)",
        "tier": 1
      },
      {
        "sourceName": "Goswami Tulsidas — Ramcharitmanas",
        "sourceRef": "Sundar Kand, Chaupais 1–35 & Lanka Kand (Sanjeevani Episode)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Enter the city keeping the King of Ayodhya in your heart, and accomplish all your tasks with success.",
      "attribution": "Goswami Tulsidas — Ramcharitmanas, Sundar Kand 5"
    },
    "quoteLocal": {
      "text": "प्रबिसि नगर कीजै सब काजा। हृदयँ राखि कौसलपुर राजा॥",
      "attribution": "श्रीरामचरितमानस (सुंदरकांड, दोहा ५)"
    }
  },
  {
    "id": "bhishma",
    "name": "Bhishma Pitamah",
    "nameLocal": "भीष्म पितामह",
    "era": "Dwapara Yuga",
    "eraLocal": "द्वापर युग",
    "tradition": "hindu",
    "region": "Hastinapur, Kuru Realm",
    "regionLocal": "हस्तिनापुर, कुरु राज्य",
    "emoji": "🏹",
    "tagline": "The grand patriarch of the Mahabharata whose dreadful vow of lifelong celibacy and unbending dedication to duty shaped the destiny of the Kuru dynasty.",
    "taglineLocal": "कुरुवंश के भीष्म पितामह जिनकी आजीवन ब्रह्मचर्य की भीषण प्रतिज्ञा और कर्तव्य-निष्ठा ने महाभारत के युग को दिशा दी।",
    "journey": "Born as Devavrata, the eighth son of the sacred river Ganga and King Shantanu of Hastinapur, the young prince was trained in spiritual knowledge and statesmanship by Sage Brihaspati, Shukracharya, and Vasishtha, and in supreme martial mastery by Lord Parashurama himself. Renowned for radiant intellect and unmatched prowess with the celestial bow, Devavrata was formally invested as the crown prince of Hastinapur, beloved by citizens and royalty alike.\n\nHis life pivoted into tragedy when his aging father Shantanu fell deeply in love with Satyavati, the daughter of the chieftain of fishermen. The chieftain refused to permit the marriage unless Satyavati's future sons were guaranteed the imperial throne over Devavrata. Learning of his father’s silent despondency, Devavrata approached the fisherman chief and renounced his rightful claim to the kingdom. When the chief voiced anxiety that Devavrata’s future children might challenge the throne, Devavrata took the terrible oath that stunned the cosmos: renouncing marriage and taking a solemn vow of unbroken celibacy (Akhanda Brahmacharya). Celestial flowers showered from heaven with the cry 'Bhishma! Bhishma!' (The Terrible One), and Shantanu granted his son the rare boon of Ichha Mrityu—the power to choose the moment of his own death.",
    "journeyLocal": "हस्तिनापुर नरेश शांतनु और देवनदी गंगा के आठवें पुत्र के रूप में जन्मे देवव्रत ने महर्षि वशिष्ठ, बृहस्पति और शुक्राचार्य से वेद-वेदांग और नीति-शास्त्र का ज्ञान प्राप्त किया, तथा भगवान परशुराम से अस्त्र-शस्त्र की अद्वितीय शिक्षा ली। उनके अतुलित पराक्रम और शील को देखकर शांतनु ने उन्हें हस्तिनापुर का युवराज घोषित किया।\n\nकिंतु जब महाराज शांतनु निषादराज की कन्या सत्यवती पर मोहित हुए और निषादराज ने शर्त रखी कि सत्यवती का पुत्र ही राजा बनेगा, तब पिता के मौन दुख को दूर करने के लिए देवव्रत ने न केवल सिंहासन का अधिकार त्याग दिया, बल्कि आजीवन अखण्ड ब्रह्मचर्य का पालन करने की 'भीषण प्रतिज्ञा' ली। इस अलौकिक त्याग से प्रसन्न होकर देवताओं ने उन्हें 'भीष्म' नाम दिया और शांतनु ने उन्हें 'इच्छा-मृत्यु' का वरदान प्रदान किया।",
    "trial": "Bhishma's tragic crucible lay in living bound by his oath of allegiance to the throne of Hastinapur, even as righteousness was subverted by the arrogance of Duryodhana and the blindness of Dhritarashtra. Powerless to prevent the gambling match that brought dishonor to Draupadi, Bhishma endured agonizing spiritual torment, caught between institutional duty to the crown and moral truth.\n\nWhen the Kurukshetra war became inevitable, Bhishma served as supreme commander of the Kaurava armies for ten furious days, repelling the combined might of the Pandavas and forcing even Sri Krishna to breach his vow of not taking up weapons. On the tenth day, knowing that the Pandavas could never win as long as he stood undefeated, Bhishma revealed the secret of his own vulnerability to Yudhishthira. Permitting Arjuna to shoot him while standing behind Shikhandi, Bhishma was pierced by thousands of arrows until he fell from his chariot, resting upon a bed of arrows without his body touching the earth. Awaiting the auspicious Uttarayana solstice to leave his mortal frame, the dying patriarch lay upon his bed of arrows for fifty-eight nights, patiently transmitting the monumental discourses of the Shanti Parva and Anushasana Parva on Rajadharma, Moksha, and the Vishnu Sahasranama to Yudhishthira.",
    "trialLocal": "भीष्म का सबसे बड़ा आंतरिक संघर्ष हस्तिनापुर के सिंहासन से बंधी निष्ठा और धर्म के बीच का था। भरी सभा में द्रौपदी के चीरहरण के समय वे कुल-मर्यादा और राजसिंहासन के नियमों के बंधन में बंधे रहे, जो उनके जीवन की सबसे बड़ी पीड़ा बनी।\n\nकुरुक्षेत्र के महायुद्ध में कौरव सेना के प्रधान सेनापति के रूप में दस दिनों तक उन्होंने ऐसा भीषण पराक्रम दिखाया कि भगवान श्री कृष्ण को भी अपनी प्रतिज्ञा तोड़कर चक्र उठाना पड़ा। दसवें दिन, जब उन्होंने देखा कि उनके रहते धर्म की विजय संभव नहीं है, तो उन्होंने स्वयं युधिष्ठिर को अपने पतन का उपाय बताया। शिखंडी को आगे कर अर्जुन के बाणों से छलनी होकर वे शर-शैया पर गिरे। बाणों की शैया पर पड़े हुए उत्तरायण की प्रतीक्षा करते हुए उन्होंने युधिष्ठिर को 'शांति पर्व' और 'अनुशासन पर्व' के अंतर्गत राजधर्म, मोक्षधर्म और 'श्री विष्णु सहस्रनाम' का अमर उपदेश दिया।",
    "teaching": "Bhishma revealed that vows and institutional obligations, when rigid and detached from compassionate justice, can become a golden cage that enables adharma. True righteousness requires the courage to dismantle corrupt systems rather than merely serving them with unquestioning loyalty. Yet his profound discourses upon his bed of arrows remain humanity's highest treatises on ethical governance and detachment.",
    "teachingLocal": "भीष्म का जीवन सिखाता है कि कर्तव्य और प्रतिज्ञाएँ यदि न्याय और संवेदना से रहित हो जाएँ, तो वे अनजाने में अधर्म को संरक्षण देने लगती हैं। सच्चा धर्म किसी पद या सिंहासन का अंधानुकरण नहीं, बल्कि समय पर असत्य के विरुद्ध खड़े होने का साहस है। शर-शैया पर दिया गया उनका उपदेश आज भी राजधर्म का सर्वोच्च ग्रंथ है।",
    "moral": "Uncompromising integrity and personal sacrifice make a soul immortal, but one must always ensure that one's strength and loyalty are never mortgaged to unjust authority.",
    "moralLocal": "व्यक्तिगत त्याग और सत्यनिष्ठा मनुष्य को अमर बनाती है, किंतु यह ध्यान रखना आवश्यक है कि हमारी शक्ति और निष्ठा कभी अधर्म के पक्ष में ढाल न बन जाए।",
    "legacy": "Bhishma stands as the tragic colossus of the Mahabharata, the archetype of supreme self-denial, martial brilliance, and philosophical depth. His gift of the Vishnu Sahasranama to King Yudhishthira remains one of the most sacred stotras recited by spiritual seekers across the centuries.",
    "legacyLocal": "भीष्म पितामह त्याग, संयम और ज्ञान के अद्वितीय शिखर हैं। महाभारत के शांति पर्व में उनके द्वारा दिया गया राजधर्म का ज्ञान और श्री विष्णु सहस्रनाम का प्राकट्य सनातन संस्कृति की अमूल्य धरोहर है।",
    "source": "Mahabharata (Adi Parva, Bhishma Parva, Shanti Parva, Anushasana Parva)",
    "sourceLocal": "महाभारत (आदि पर्व, भीष्म पर्व, शांति पर्व, अनुशासन पर्व)",
    "sourceCitations": [
      {
        "sourceName": "Vyasa — Mahabharata",
        "sourceRef": "Adi Parva, Chapters 100–105 (Devavrata's Terrible Vow)",
        "tier": 1
      },
      {
        "sourceName": "Vyasa — Mahabharata",
        "sourceRef": "Shanti Parva & Anushasana Parva (Teachings on Rajadharma and Vishnu Sahasranama)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "I covet neither the sovereignty of the earth nor the pleasures of the gods; truth alone is dear to me, and from righteousness I will never swerve.",
      "attribution": "Bhishma Pitamah — Mahabharata, Adi Parva 100"
    },
    "quoteLocal": {
      "text": "न चाहं पृथिवीं राज्यं कामये नरसत्तम। सत्यं च मे प्रियं राजन् धर्माच्च न चलेयम्॥",
      "attribution": "भीष्म पितामह (महाभारत, आदि पर्व १००)"
    }
  },
  {
    "id": "dhruv",
    "name": "Bhakta Dhruv",
    "nameLocal": "भक्त ध्रुव",
    "era": "Satya Yuga",
    "eraLocal": "सत्य युग",
    "tradition": "hindu",
    "region": "Madhuvana, Yamuna Banks",
    "regionLocal": "मधुवन, यमुना तट",
    "emoji": "⭐",
    "tagline": "The child-devotee whose unwavering single-pointed penance won the grace of Lord Vishnu and transformed him into the eternal Pole Star.",
    "taglineLocal": "बाल-भक्त जिनकी अनन्य तपस्या और अटूट निष्ठा ने श्रीहरि का साक्षात्कार कराया और वे आकाश में अचल 'ध्रुव तारा' बने।",
    "journey": "Born as the son of King Uttanapada and Queen Suniti, prince Dhruva was a gentle five-year-old child who yearned for his father's affection. One day, seeing his elder half-brother Uttama sitting happily in their father's lap, Dhruva approached to climb up as well. His proud stepmother, Queen Suruchi, pushed the child away with cutting words, declaring that he had no right to sit on the king's lap or inherit the royal throne because he had not been born from her womb, telling him to wander into the wilderness and pray to Lord Vishnu if he desired royalty.\n\nWeeping inconsolably from the public humiliation, Dhruva ran to his mother Suniti. Instead of sowing seeds of bitterness or resentment, the noble Suniti embraced her son and counseled him with profound spiritual wisdom: worldly kings and thrones are transient, but Lord Narayana alone is the imperishable father and refuge of all living beings. Inspired by his mother's words, the five-year-old prince renounced palace comfort, took leave of his mother, and walked alone into the dense forests of Madhuvana along the sacred banks of the Yamuna to seek the supreme Lord.",
    "journeyLocal": "राजा उत्तानपाद और महारानी सुनीति के पुत्र के रूप में जन्मे पांच वर्षीय बालक ध्रुव जब एक दिन अपने पिता की गोद में बैठने गए, तो उनकी सौतेली माता सुरुचि ने अहंकारवश उन्हें झिड़क दिया। सुरुचि ने कटु वचन कहते हुए कहा कि राजा की गोद और सिंहासन केवल उसके पुत्र उत्तम का अधिकार है; यदि ध्रुव सिंहासन चाहता है तो वन में जाकर भगवान नारायण की तपस्या करे।\n\nरोते हुए जब ध्रुव अपनी माता सुनीति के पास पहुँचे, तो माता ने उन्हें ढांढस बंधाते हुए सिखाया कि संसार के राजाओं की गोद क्षणभंगुर है, किंतु जगतपिता श्रीहरि की शरण सर्वोपरि है। माता के वचनों को हृदय में धारण कर नन्हे ध्रुव ने उसी क्षण राजमहलों के सुखों का त्याग कर दिया और यमुना तट पर स्थित मधुवन के घने जंगलों की ओर चल पड़े।",
    "trial": "On the forest path, the divine sage Narada intercepted Dhruva, testing his resolve. Narada urged the young prince to return home, warning that forest austerities are perilous even for seasoned ascetics, and that worldly honor and insult are merely illusions of childhood. Seeing that Dhruva’s resolve remained immovable as granite, Narada initiated him into the sacred twelve-syllable mantra: 'Om Namo Bhagavate Vasudevaya', instructing him in breath control and unbroken meditation.\n\nIn Madhuvana, Dhruva undertook an ascetic tapasya unprecedented in cosmic history. In the first month, he ate only wild fruits every three days; in the second month, dried leaves every six days; in the third month, only water every nine days; in the fourth month, only air every twelve days. By the fifth month, standing poised on one foot like a pillar with his senses withdrawn from the material world, Dhruva restrained his breath entirely, fixing his soul on the supreme effulgence in his heart. The spiritual intensity of his penance created cosmic heat, causing the demigods to appeal to Lord Vishnu for relief. Moved by the child's unyielding faith, Lord Vishnu descended upon Garuda, touched Dhruva’s cheek with his divine conch Panchajanya, awakening supreme spiritual poetry and granting him the Dhruva Loka—the eternal, unmoving Pole Star around which the entire celestial sphere revolves.",
    "trialLocal": "मार्ग में देवर्षि नारद ने बालक की परीक्षा लेते हुए समझाया कि इतनी छोटी आयु में वन की कठोर तपस्या असंभव है और मान-अपमान को भूलकर महल लौट जाना चाहिए। किंतु जब नारद जी ने देखा कि ध्रुव का संकल्प अडिग है, तो उन्होंने उन्हें 'ॐ नमो भगवते वासुदेवाय' का द्वादशाक्षर मंत्र और ध्यान की विधि प्रदान की।\n\nमधुवन में पांच वर्ष के बालक ने कठोर तप प्रारंभ किया। पहले महीने में तीन दिन में एक बार फल, दूसरे महीने में छह दिन में सूखे पत्ते, तीसरे महीने में नौ दिन में जल, और चौथे महीने में बारह दिन में केवल वायु का सेवन किया। पांचवें महीने में एक पैर पर खड़े होकर उन्होंने अपनी श्वास को रोककर हृदय में श्रीहरि का ध्यान धर लिया। उनके तपोबल से तीनों लोक कंपित हो उठे। अंततः भगवान विष्णु शंख, चक्र, गदा और पद्म धारण कर प्रकट हुए। प्रभु ने अपने पाञ्चजन्य शंख का स्पर्श ध्रुव के गाल से कराया, जिससे उन्हें समस्त ज्ञान प्राप्त हुआ और उन्हें ब्रह्मांड के केंद्र में 'ध्रुव लोक' का अमर स्थान प्राप्त हुआ।",
    "teaching": "Dhruva taught that age, lineage, and physical stature are no barriers to spiritual realization. When determination (Sankalpa) is pure and directed toward the Divine rather than worldly ego, grace descends immediately. Insults and adversities in life are not curses; they are catalysts meant to awaken the sleeping soul to its eternal heritage.",
    "teachingLocal": "भक्त ध्रुव ने सिखाया कि ईश्वर-प्राप्ति में आयु, बल या सांसारिक साधन कभी बाधा नहीं बनते। यदि मनुष्य का संकल्प निष्काम और अडिग हो, तो भगवान स्वयं चलकर अपने भक्त के पास आते हैं। संसार का अपमान भी यदि भगवान की ओर मोड़ दे, तो वह वरदान बन जाता है।",
    "moral": "Rejection by the world is an invitation to seek the eternal embrace of Truth. Single-pointed devotion and patience can steady the mind and elevate the humblest soul to the highest station in the universe.",
    "moralLocal": "संसार की उपेक्षा से निराश होने के बजाय उसे आत्म-जागृति का साधन बना लेना चाहिए। एकाग्र तप और निष्ठा से मनुष्य आकाश में ध्रुव तारे की भांति अचल और अमर हो सकता है।",
    "legacy": "Bhakta Dhruv remains the universal symbol of steadfast resolve (Dhruva Sankalpa) in Sanatan Dharma. The Pole Star (Dhruva Tara) continues to guide navigators, seekers, and newlyweds as an eternal reminder of fidelity, constancy, and the ultimate triumph of pure childlike surrender.",
    "legacyLocal": "सनातन संस्कृति में 'ध्रुव संकल्प' अडिग निष्ठा का प्रतीक बन गया। आकाश में चमकता ध्रुव तारा आज भी हर युग में भक्तों, संतों और पथिकों को यह संदेश देता है कि सत्य के पथ पर चलने वाला कभी अपने लक्ष्य से नहीं डिगता।",
    "source": "Srimad Bhagavata Purana (Skandha 4, Ch. 8–12), Vishnu Purana (Book I, Ch. 11–12)",
    "sourceLocal": "श्रीमद्भागवत महापुराण (चतुर्थ स्कंध, अध्याय ८-१२), विष्णु पुराण (प्रथम अंश, अध्याय ११-१२)",
    "sourceCitations": [
      {
        "sourceName": "Srimad Bhagavata Purana",
        "sourceRef": "Skandha 4, Chapters 8–12 (Dhruva Charitra & Penance in Madhuvana)",
        "tier": 1
      },
      {
        "sourceName": "Vishnu Purana",
        "sourceRef": "Book I, Chapters 11–12 (The Legend of Dhruva, trans. H. H. Wilson)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "He who with unbroken contemplation fixed his heart upon the imperishable Lord, dissolved all worldly desire and attained the unmoving celestial station.",
      "attribution": "Srimad Bhagavata Purana 4.12"
    },
    "quoteLocal": {
      "text": "स वै निवृत्तस्तरसा गतो वनं चकार तीव्रं तप ईश्वरेच्छया।",
      "attribution": "श्रीमद्भागवत महापुराण (४.८)"
    }
  },
  {
    "id": "savitri",
    "name": "Sati Savitri",
    "nameLocal": "सती सावित्री",
    "era": "Treta Yuga",
    "eraLocal": "त्रेता युग",
    "tradition": "hindu",
    "region": "Madra & Shalva Kingdoms",
    "regionLocal": "मद्र व शाल्व देश",
    "emoji": "🌳",
    "tagline": "The luminous princess whose intellect, moral power, and devotion defeated Yama, the god of death, and restored her husband's life and dynasty.",
    "taglineLocal": "अपूर्व ज्ञान, सतीत्व और तपोबल की मूर्ति जिन्होंने अपनी बुद्धि और धर्म-चर्चा से यमराज को परास्त कर पति के प्राण और साम्राज्य वापस पाए।",
    "journey": "Born as the long-sought daughter of the pious King Ashvapati of Madra through intense worship of the solar deity Savitr, Savitri grew into a woman of such radiant beauty, purity, and intellectual majesty that suitors stood in awe and dared not ask for her hand in marriage. Her father gently instructed her to travel across the kingdoms and select her own husband according to the dictates of her conscience.\n\nTraveling through the serene hermitages of the forest with royal courtiers, Savitri encountered Satyavan, the virtuous prince of the Shalva kingdom whose father, King Dyumatsena, had gone blind and been usurped of his throne, living in humble forest exile. Impressed by Satyavan’s nobility, filial service to his blind parents, and tranquil demeanor in poverty, Savitri chose him in her heart. Returning to her father's palace, she announced her choice in the presence of the divine sage Narada. Narada raised a grave warning: Satyavan possessed every virtue, but was destined to die exactly one year from that day. Unshaken by the prophecy, Savitri declared that a maiden chooses her partner only once, and that moral resolve and destiny are shaped by righteous fidelity.",
    "journeyLocal": "मद्र देश के धर्मात्मा राजा अश्वपति को सूर्यदेव सावित्री की उपासना से एक अत्यंत तेजस्वी कन्या प्राप्त हुई, जिनका नाम सावित्री रखा गया। जब सावित्री विवाह योग्य हुईं, तो उनके अलौकिक शील और तेज के सम्मुख किसी में विवाह का प्रस्ताव रखने का साहस न हुआ। पिता की आज्ञा से सावित्री ने स्वयं जीवनसाथी की खोज में तीर्थों और वनों का भ्रमण किया।\n\nवन में तपोवन के भ्रमण के दौरान उनकी भेंट सत्यवान से हुई, जो शाल्व नरेश द्युमत्सेन के पुत्र थे। राजा द्युमत्सेन के दृष्टिहीन हो जाने पर शत्रुओं ने उनका राज्य छीन लिया था, जिससे सत्यवान वन में रहकर अपने माता-पिता की सेवा करते थे। सावित्री ने मन ही मन सत्यवान का वरण कर लिया। जब वे महल लौटीं, तो देवर्षि नारद ने चेतावनी दी कि सत्यवान सर्वगुण संपन्न हैं किंतु उनकी आयु मात्र एक वर्ष शेष है। इस पर सावित्री ने निर्भीक होकर कहा कि जीवन में संकल्प केवल एक बार लिया जाता है, और वे सत्यवान के अतिरिक्त किसी अन्य का वरण नहीं करेंगी।",
    "trial": "Entering the forest as the bride of Satyavan, Savitri laid aside her royal silks, donning coarse bark garments and serving her aging in-laws and husband with joyful reverence while secretly tracking the days to the prophesied hour of doom. Three days before the fateful date, she undertook the grueling Triratra vow—fasting and standing in continuous meditation for seventy-two hours without sleep.\n\nOn the morning of the designated day, she accompanied Satyavan into the forest to gather firewood. As noon approached, Satyavan felt sudden piercing agony in his head and fell into Savitri’s lap beneath a banyan tree. Suddenly, Yama, the terrifying lord of death, appeared with blood-red robes and noose in hand, drawing out Satyavan’s thumb-sized soul (Angushtha-matra Purusha) and walking south towards the netherworld. Refusing to weep or abandon her duty, Savitri walked resolutely behind Yama. Astonished by a mortal walking in the realm of death, Yama repeatedly commanded her to return, offering boons excluding Satyavan's life. With consummate wisdom, Savitri engaged Yama in philosophical discourses on eternal Dharma, compassion, and the sanctity of truth. First, she secured the restoration of her father-in-law's sight; second, the return of his kingdom; third, a hundred noble sons for her own father; and fourth, a hundred righteous sons born of herself and Satyavan. Realizing he had granted a boon that could only be fulfilled if Satyavan lived, and utterly charmed by her righteous eloquence, Yama smiled, released Satyavan’s soul from the noose, and blessed Savitri with long life, honor, and prosperity.",
    "trialLocal": "विवाह के पश्चात सावित्री ने राजमहलों के वस्त्र त्यागकर वल्कल वस्त्र धारण किए और वन में वृद्ध सास-ससुर की सेवा की। नारद जी द्वारा बताई गई तिथि से तीन दिन पूर्व उन्होंने 'त्रिरात्र व्रत' प्रारंभ किया, जिसमें तीन दिनों तक अन्न-जल त्यागकर वे ध्यान में खड़ी रहीं।\n\nनिश्चित दिन पर जब सत्यवान लकड़ियां काटने वन में गए, तो सावित्री भी उनके साथ गईं। दोपहर में एक वटवृक्ष के नीचे सत्यवान के सिर में असह्य पीड़ा हुई और वे सावित्री की गोद में सिर रखकर लेट गए। उसी समय साक्षात यमराज काल-पाश लेकर प्रकट हुए और सत्यवान के प्राण लेकर दक्षिण दिशा की ओर चल दिए। सावित्री भी यमराज के पीछे-पीछे चल पड़ीं। यमराज ने उन्हें लौट जाने को कहा, किंतु सावित्री ने धर्म, सत्य और संगति की ऐसी अद्भुत व्याख्या की कि यमराज प्रसन्न हो गए। यमराज ने सत्यवान के प्राणों को छोड़कर अन्य वर मांगने को कहा। सावित्री ने पहले वर में ससुर की आंखों की ज्योति, दूसरे में उनका खोया हुआ राज्य, और तीसरे में अपने पिता के लिए सौ पुत्रों का वरदान प्राप्त किया। चौथे वर में जब सावित्री ने अपने लिए सत्यवान से सौ धर्मनिष्ठ पुत्रों का वरदान मांगा, तो यमराज ने 'तथास्तु' कह दिया। सत्यवान के जीवित हुए बिना यह वर पूर्ण नहीं हो सकता था; यमराज सावित्री की बुद्धि और धर्म-निष्ठा से परास्त हो गए और उन्होंने सत्यवान के प्राण मुक्त कर दिए।",
    "teaching": "Savitri proved that intellect, moral clarity, and unwavering determination can triumph over the most immutable laws of mortality. Destiny is not an arbitrary curse to be suffered passively; it is a spiritual terrain where virtue, courageous speech, and selfless love can reshape reality.",
    "teachingLocal": "सावित्री ने सिद्ध किया कि विवेक, चारित्रिक पवित्रता और धर्मनिष्ठ वाणी से मृत्यु पर भी विजय प्राप्त की जा सकती है। भाग्य कोई अटल अभिशाप नहीं है जिसे चुपचाप स्वीकार कर लिया जाए; सत्य और प्रेम के बल पर प्रारब्ध की रेखाओं को भी बदला जा सकता है।",
    "moral": "True love is not an emotional weakness but a divine spiritual power. When righteousness and intellectual discernment walk hand-in-hand, even cosmic forces must bow to human resolve.",
    "moralLocal": "सच्चा प्रेम और समर्पण दुर्बलता नहीं, बल्कि ब्रह्मांड की सबसे बड़ी शक्ति है। जब ज्ञान और निष्ठा का संगम होता है, तो असंभव भी संभव हो जाता है।",
    "legacy": "Savitri’s triumph is celebrated across India in the sacred festival of Vat Savitri Vrata, where women revere the immortal banyan tree as a symbol of resilience, longevity, and marital harmony. Her dialogue with Yama in the Mahabharata remains a classic philosophical masterpiece on Dharma, cited across ages from ancient commentators to modern Indian literature.",
    "legacyLocal": "सती सावित्री सनातन संस्कृति में नारी-शक्ति, बुद्धिमत्ता और निष्ठा की शाश्वत प्रतीक हैं। 'वट सावित्री व्रत' के रूप में आज भी भारत की करोड़ों नारियां वटवृक्ष का पूजन कर उनके पावन आदर्शों को स्मरण करती हैं।",
    "source": "Mahabharata (Vana Parva, Pativrata Mahatmya Parva, Ch. 293–299), Matsya Purana (Ch. 208–214)",
    "sourceLocal": "महाभारत (वन पर्व, पतिव्रता-माहात्म्य पर्व, अध्याय २९३-२९९), मत्स्य पुराण (अध्याय २०८-२१४)",
    "sourceCitations": [
      {
        "sourceName": "Vyasa — Mahabharata",
        "sourceRef": "Vana Parva, Chapters 293–299 (Pativratamahatmya Parva / Legend of Savitri)",
        "tier": 1
      },
      {
        "sourceName": "Matsya Purana",
        "sourceRef": "Chapters 208–214 (Dialogue of Savitri and Yama on Dharma)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "The righteous sustain the universe through truth and virtue; where the noble speak, truth alone prevails.",
      "attribution": "Sati Savitri — Mahabharata, Vana Parva 297"
    },
    "quoteLocal": {
      "text": "धर्मेण सत्येन च पालयन्ति सन्तो हि सत्या वचनेन युक्ताः।",
      "attribution": "सती सावित्री (महाभारत, वन पर्व २९७)"
    }
  },
  {
    "id": "shabari",
    "name": "Mata Shabari",
    "nameLocal": "माता शबरी",
    "era": "Treta Yuga",
    "eraLocal": "त्रेता युग",
    "tradition": "hindu",
    "region": "Matanga Ashram, Pampa Sarovar",
    "regionLocal": "मतंग आश्रम, पंपा सरोवर",
    "emoji": "🫐",
    "tagline": "The forest saint whose decades of patient waiting and pure, unpretentious love was rewarded with the personal arrival of Lord Rama.",
    "taglineLocal": "वनवासी संत जिन्होंने दशकों तक निःस्वार्थ प्रतीक्षा और पवित्र प्रेम से मार्ग संवारा और प्रभु श्री राम के चरणों में अमर गति पाई।",
    "journey": "Born as Shramana into a humble tribal chieftain's family of the Nishada or Shabara clan, she was a girl of tender compassion from her earliest days. On the eve of her arranged marriage, she discovered that hundreds of innocent forest animals, sheep, and birds had been captured and pensively penned to be slaughtered for the wedding feast. Horrified by the cruelty done in her name, she renounced the wedding in the dead of night, slipping away into the deep forests of Mount Rishyamukha near the pristine waters of Pampa Lake.\n\nWandering through the wilderness, she arrived at the hermitage of the revered Sage Matanga. Because worldly customs judged her tribal origin, she feared to approach the holy rishis directly. Instead, every morning in the dark hours before dawn, while the hermitage slept, Shabari silently swept the thorny forest paths leading from the ashram to the river, gathering firewood and placing smooth river stones so the elderly sages would not prick their bare feet. Observing this secret, selfless act of service day after day, Sage Matanga discovered her and welcomed her into the hermitage as his beloved disciple, instructing her in spiritual contemplation and the ultimate unity of all beings.",
    "journeyLocal": "शबर भील कुल में जन्मी श्रमणा बाल्यकाल से ही अत्यंत दयालु स्वभाव की थीं। जब उनके विवाह के उपलक्ष्य में सैकड़ों मूक पशु-पक्षियों को भोज के लिए बांधा गया, तो उस हिंसा से उनका हृदय कांप उठा। उस रक्तपात को रोकने के लिए उन्होंने रात्रि के अंधकार में चुपचाप गृह-त्याग कर दिया और ऋष्यमूक पर्वत के घने वनों की शरण ली।\n\nवन में वे महर्षि मतंग के आश्रम पहुँचीं। अपनी वनवासी जाति के संकोच के कारण वे दिन में आश्रम नहीं जाती थीं; बल्कि ब्रह्ममुहूर्त में छिपकर आश्रम से सरोवर तक जाने वाले पथ के कांटे चुनती थीं, पत्थरों को हटाती थीं और लकड़ियां काटकर रख आती थीं ताकि संतों के चरणों में कांटे न चुभें। जब महर्षि मतंग को इस गुप्त सेवा का पता चला, तो उन्होंने शबरी को अपनी शिष्या बनाया और उन्हें अध्यात्म और समदृष्टि का ज्ञान दिया।",
    "trial": "When Sage Matanga's physical life came to its twilight, the disciples prepared to depart the mortal plane. Shabari wept, asking how she would survive alone in the wilderness without her guru. The dying sage blessed her with an immortal prophecy: 'Stay here in the ashram, my daughter. Lord Rama, the Supreme Incarnation, will walk into this very forest in search of Sita. He will surely visit your cottage.'\n\nFor decades, Shabari remained in solitary sadhana, enduring the isolation of the forest as her youth faded, her hair turned white as kasha grass, and her back bent with age. Yet every morning of those long decades, she arose with ecstatic anticipation, sweeping the forest paths, decorating the threshold with fragrant wild lotus blossoms, and wandering into the thickets to collect sweet jujube berries (ber), tasting each fruit gently with her tongue to ensure no bitter or sour fruit would ever touch her Lord's lips. The villagers mocked her faith, calling her a mad hermit awaiting a prince who would never come. Yet her devotion remained unbroken. Finally, on an auspicious afternoon, the forest rustled, and Sri Rama, along with Lakshmana, walked directly to her humble mud hut. Weeping tears of bliss, Shabari washed Rama's feet with her tears and offered her half-tasted wild berries. Eating the offered fruits with boundless joy, Lord Rama declared that her devotion was the pinnacle of spiritual attainment, expounding to her the immortal Ninefold Path of Devotion (Navadha Bhakti).",
    "trialLocal": "जब महर्षि मतंग का महाप्रयाण का समय आया, तो शबरी ने रोते हुए पूछा कि वे उनके बिना कैसे रहेंगी। महर्षि ने वरदान दिया: 'पुत्री, इसी कुटिया में प्रतीक्षा करो। स्वयं मर्यादा पुरुषोत्तम श्री राम वन में सीता की खोज करते हुए यहाँ आएंगे और तुम्हें दर्शन देंगे।'\n\nदशकों बीत गए; शबरी के बाल श्वेत हो गए, देह दुर्बल हो गई, किंतु उनकी प्रतीक्षा कभी नहीं थकी। वे प्रतिदिन आश्रम के मार्ग को फूलों से सजाती थीं, और वनों से मीठे बेर चुन-चुनकर लाती थीं। प्रभु को कोई खट्टा या कड़वा फल न मिले, इसलिए वे हर बेर को स्वयं चखकर मीठे बेर एकत्र करती थीं। लोग उनका उपहास करते थे, किंतु उनका विश्वास अडिग था। अंततः एक दिन प्रभु श्री राम अपने अनुज लक्ष्मण के साथ उनकी कुटिया में पधारे। शबरी ने अपने आंसुओं से उनके चरण धोए और प्रेम से चखे हुए बेर अर्पित किए। प्रभु ने बड़े चाव से उन बेरों को खाया और उन्हें 'नवधा भक्ति' का सर्वोच्च उपदेश देकर उनका उद्धार किया।",
    "teaching": "Mata Shabari revealed that God looks neither at social status, gender, birth, learning, nor outer wealth, but solely at the purity of devotion (Bhakti). In the presence of genuine spiritual longing, rigid ritualism dissolves, and simple, unpretentious love becomes the highest offering in the universe.",
    "teachingLocal": "माता शबरी ने सिद्ध किया कि ईश्वर न कुल देखते हैं, न जाति, न विद्या और न बाह्य वैभव; वे केवल प्रेम के भूखे हैं। जहाँ सच्चा समर्पण और निष्कपट भाव होता है, वहाँ समस्त रूढ़ियाँ समाप्त हो जाती हैं और साधारण बेर भी अमृत बन जाते हैं।",
    "moral": "Patience is the highest form of faith. No prayer whispered in unselfish devotion is ever forgotten by the Divine; what is awaited with pure love will inevitably manifest at the perfect cosmic moment.",
    "moralLocal": "धैर्य और प्रतीक्षा ही भक्ति की वास्तविक कसौटी है। निःस्वार्थ भाव से की गई साधना कभी व्यर्थ नहीं जाती; यदि विश्वास अटल हो, तो भगवान को स्वयं भक्त की कुटिया तक आना पड़ता है।",
    "legacy": "Mata Shabari remains the immortal queen of Navadha Bhakti, celebrated in the Ramayana across millennia as the embodiment of egalitarian, pure-hearted devotion. Her encounter with Sri Rama destroyed ancient social prejudices and established an eternal paradigm of divine love transcending social barriers.",
    "legacyLocal": "माता शबरी का जीवन नवधा भक्ति का शाश्वत आदर्श है। प्रभु श्री राम और शबरी का मिलन सामाजिक समरसता और असीम करुणा का ऐसा अमर अध्याय है जो युगों-युगों तक मानवता का पथ-प्रदर्शन करता रहेगा।",
    "source": "Valmiki Ramayana (Aranya Kanda, Canto 74), Goswami Tulsidas — Ramcharitmanas (Aranya Kand)",
    "sourceLocal": "वाल्मीकि रामायण (अरण्यकांड, सर्ग ७४), गोस्वामी तुलसीदास — श्रीरामचरितमानस (अरण्यकांड)",
    "sourceCitations": [
      {
        "sourceName": "Valmiki Ramayana",
        "sourceRef": "Aranya Kanda, Sarga 74 (Sri Rama's Visit to Shabari's Hermitage)",
        "tier": 1
      },
      {
        "sourceName": "Goswami Tulsidas — Ramcharitmanas",
        "sourceRef": "Aranya Kand, Chaupais 34–36 (Navadha Bhakti Discourse)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "I recognize only one relationship—the bond of devotion; without it, all high birth, rank, and wealth are like clouds without rain.",
      "attribution": "Sri Rama to Mata Shabari — Ramcharitmanas, Aranya Kand 35"
    },
    "quoteLocal": {
      "text": "मानउँ एक भगति कर नाता। जाति पाँति कुल धरम बड़ाई। धन बल परिजन गुन चतुराई। भगति हीन नर सोहइ कैसा। बिनु जल बारिद देखिअ जैसा॥",
      "attribution": "श्रीरामचरितमानस (अरण्यकांड, दोहा ३५)"
    }
  },
  {
    "id": "valmiki",
    "name": "Maharishi Valmiki",
    "nameLocal": "महर्षि वाल्मीकि",
    "era": "Treta Yuga",
    "eraLocal": "त्रेता युग",
    "tradition": "hindu",
    "region": "Tamasa River Banks",
    "regionLocal": "तमसा तट",
    "emoji": "📜",
    "tagline": "The Adi Kavi (First Poet) whose transformative repentance and cosmic compassion gave birth to Sanskrit poetic meter and the immortal epic Ramayana.",
    "taglineLocal": "संस्कृत काव्य के आदिकवि जिनकी करुणा से छंद का प्राकट्य हुआ और जिन्होंने मर्यादा पुरुषोत्तम श्री राम के जीवन को अमर महाकाव्य रामायण में गढ़ा।",
    "journey": "Known in his early wandering life as Ratnakara, he lived in the deep forests, maintaining his family through roadside robbery and banditry, unaware of the spiritual gravity of his sinful deeds. One day, the divine sage Narada walked through the forest, radiating serene peace. When Ratnakara accosted him with weapons demanding his belongings, Narada showed neither fear nor anger, but calmly asked a probing question: 'You commit these violent deeds to feed your family; will your parents, wife, and children also share the karmic burden of your sins in the afterlife?'\n\nStunned by the question, Ratnakara returned to his home and asked his family members one by one. To his shock, every single relative replied that while it was his duty to provide for them, they would never share in the sin or punishment of his unlawful actions. Shaken to the core of his being, the illusion of worldly attachment shattered. Ratnakara fell at Narada's feet in agonizing repentance, pleading for liberation. Narada instructed him to chant the divine name of Rama. Unable even to articulate the sacred name due to the weight of his past actions, Narada skillfully asked him to chant 'Mara Mara' (meaning death), which in continuous repetition naturally resolved into the sacred name 'Rama Rama'. Entering deep samadhi in the forest for decades, an anthill (valmika) grew over his motionless body. When the penance bore fruit, the divine voice called him forth from the anthill, christening him Valmiki—the sage born of the anthill.",
    "journeyLocal": "आदिकवि वाल्मीकि का पूर्व जीवन रत्नाकर के रूप में वनों में बीता, जहाँ वे अपने परिवार के भरण-पोषण के लिए राहगीरों को लूटते थे। एक दिन देवर्षि नारद उस वन से निकले। जब रत्नाकर ने उन्हें लूटने का प्रयास किया, तो नारद जी ने शांत भाव से पूछा: 'जिन पाप-कर्मों से तुम परिवार का पालन कर रहे हो, क्या वे तुम्हारे पापों के फल के भी भागीदार बनेंगे?'\n\nरत्नाकर ने घर जाकर अपने माता-पिता और पत्नी से यही प्रश्न किया। सबने एक स्वर में कहा कि हमारा भरण-पोषण तुम्हारा कर्तव्य है, किंतु तुम्हारे पापों के फल को हम नहीं भोगेंगे। इस सत्य ने रत्नाकर की आँखें खोल दीं। वे नारद जी के चरणों में गिरकर पश्चाताप करने लगे। नारद जी ने उन्हें राम-नाम का जप करने को कहा, किंतु पापों के प्रभाव से उनके मुख से 'राम' नहीं निकला। तब नारद जी ने 'मरा-मरा' जपने की युक्ति दी, जो उलटकर 'राम-राम' बन गया। वनों में हजारों वर्ष की समाधि में उनके शरीर पर दीमकों ने बांबी (वाल्मीक) बना ली, जिससे उनका नाम 'वाल्मीकि' पड़ा।",
    "trial": "Valmiki’s defining trial transformed from personal repentance to cosmic poetic awakening. Walking near the tranquil banks of the sacred Tamasa river, he watched a pair of sweet Krauncha birds mating blissfully upon a branch. Suddenly, a cruel hunter shot an arrow, killing the male bird while the female wailed in heart-wrenching agony. Overwhelmed by unbearable empathy, a spontaneous verse burst from Valmiki’s lips in grief: 'Ma Nishada pratishtham tvam agamah shashvatih samah...' (O hunter, may you find no peace for endless years, for you have slain this innocent bird in its moment of joy!).\n\nReturning to his hermitage, Valmiki reflected on the spontaneous utterance, discovering that his sorrow (shoka) had transformed into poetic meter (shloka), balanced perfectly in thirty-two syllables. Lord Brahma then appeared, instructing Valmiki to use this divinely revealed meter to compose the life, character, and mission of Sri Rama—the perfect human being described by Narada. Valmiki composed the twenty-four thousand verses of the Ramayana in seven Kandas, capturing cosmic truth in literary perfection. His ultimate moral test arrived when Mother Sita, cast out due to public gossip, sought refuge in the forest; Valmiki welcomed her as his own daughter, sheltered her in his hermitage, and lovingly trained her twin sons Lava and Kusha in the Vedas, music, archery, and the singing of the Ramayana.",
    "trialLocal": "महर्षि वाल्मीकि के जीवन की सबसे बड़ी परीक्षा उनकी करुणा के छंद में रूपांतरित होने की थी। तमसा नदी के तट पर जब एक बहेलिए ने प्रणयरत क्रौंच पक्षी के जोड़े में से नर पक्षी का वध कर दिया और मादा पक्षी विलाप करने लगी, तो महर्षि के हृदय से करुणा की ज्वाला फूट पड़ी। उनके मुख से स्वतः ही पहला श्लोक निकला: 'मा निषाद प्रतिष्ठां त्वमगमः शाश्वतीः समाः...'\n\nशोक के श्लोक में बदलने की इस घटना के पश्चात साक्षात ब्रह्मा जी ने प्रकट होकर उन्हें इसी छंद में मर्यादा पुरुषोत्तम श्री राम के पावन चरित्र को रचने की आज्ञा दी। वाल्मीकि ने २४,००० श्लोकों में अमर महाकाव्य रामायण की रचना की। उनका सबसे बड़ा सेवा-धर्म तब प्रकट हुआ जब उन्होंने वन में निर्वासित माता सीता को अपनी पुत्री के समान आश्रम में आश्रय दिया और उनके जुड़वां पुत्रों लव और कुश को वेद, धनुर्विद्या और रामायण-गायन की शिक्षा देकर समर्थ बनाया।",
    "teaching": "Maharishi Valmiki taught that past actions, no matter how burdened with error, do not define a soul’s eternal destiny. Sincere repentance, coupled with the grace of the divine name, can transform a sinner into the highest sage. Furthermore, he revealed that true art, poetry, and literature are born not from cold intellectual ambition, but from profound empathy for the suffering of living creatures.",
    "teachingLocal": "महर्षि वाल्मीकि ने सिखाया कि मनुष्य का अतीत कितना भी कलंकित क्यों न हो, सच्चा पश्चाताप और ईश्वर का पावन नाम उसे ब्रह्मर्षि बना सकता है। इसके अतिरिक्त, उन्होंने सिद्ध किया कि साहित्य और कला का जन्म अहंकार से नहीं, बल्कि पीड़ित जीवों के प्रति उठने वाली असीम करुणा और संवेदना से होता है।",
    "moral": "Every saint has a past, and every seeker has a future. When compassion awakens in the heart, suffering turns into wisdom, and life becomes an instrument of universal blessing.",
    "moralLocal": "सच्ची करुणा मनुष्य को ईश्वर के निकट ले जाती है। कोई भी मनुष्य अपने जन्म या अतीत से नहीं, बल्कि अपने वर्तमान संकल्प और साधना से महान बनता है।",
    "legacy": "As the Adi Kavi (First Poet), Maharishi Valmiki is the founding father of classical Sanskrit literature, giving humanity the Anushtubh meter and the eternal epic Ramayana. His ashram was the sacred crucible where the ideals of Ramarajya were preserved and taught to the future rulers of the solar dynasty.",
    "legacyLocal": "महर्षि वाल्मीकि संस्कृत साहित्य के 'आदिकवि' हैं। उनके द्वारा रचित रामायण संपूर्ण विश्व साहित्य का मुकुटमणि है, जिसने युगों-युगों तक भारतीय संस्कृति, धर्म, दर्शन और मर्यादाओं को गढ़ा है।",
    "source": "Valmiki Ramayana (Bala Kanda, Sargas 1–4), Adhyatma Ramayana (Ayodhya Kanda, Ch. 6)",
    "sourceLocal": "वाल्मीकि रामायण (बालकांड, सर्ग १-४), अध्यात्म रामायण (अयोध्याकांड, अध्याय ६)",
    "sourceCitations": [
      {
        "sourceName": "Valmiki Ramayana",
        "sourceRef": "Bala Kanda, Sargas 1–4 (Inquiry with Narada, Krauncha Episode, First Sloka)",
        "tier": 1
      },
      {
        "sourceName": "Adhyatma Ramayana",
        "sourceRef": "Ayodhya Kanda, Chapter 6 (Transformation of Ratnakara into Valmiki)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "O hunter, you shall find no enduring rest in the world, for you have slain one of this pair of Krauncha birds while intoxicated with love.",
      "attribution": "Maharishi Valmiki — Valmiki Ramayana, Bala Kanda 2.15"
    },
    "quoteLocal": {
      "text": "मा निषाद प्रतिष्ठां त्वमगमः शाश्वतीः समाः। यत्क्रौञ्चमिथुनादेकमवधीः काममोहितम्॥",
      "attribution": "महर्षि वाल्मीकि (वाल्मीकि रामायण, बालकांड २.१५)"
    }
  },
  {
    "id": "harishchandra",
    "name": "King Harishchandra",
    "nameLocal": "राजा हरिश्चंद्र",
    "era": "Treta Yuga",
    "eraLocal": "त्रेता युग",
    "tradition": "hindu",
    "region": "Ayodhya & Kashi",
    "regionLocal": "अयोध्या व काशी",
    "emoji": "⚖️",
    "tagline": "The legendary monarch of Ayodhya who surrendered his empire, wealth, and family, serving in a cremation ground to uphold the inviolable sanctity of Truth.",
    "taglineLocal": "अयोध्या के सत्यवादी सम्राट जिन्होंने सत्य और धर्म की रक्षा हेतु संपूर्ण राजपाट, परिवार और स्वयं को श्मशान घाट पर बेच दिया।",
    "journey": "King Harishchandra of the illustrious Ikshvaku dynasty of Ayodhya was renowned across the three worlds for his absolute adherence to Satya (Truth), unwavering justice, and limitless charity. Under his reign, famine was unknown, crime was non-existent, and the righteous prospered in peace. His reputation for moral integrity became so exalted that celestial assemblies debated whether human nature could remain faithful to truth under absolute deprivation.\n\nTo test this supreme virtue, the fiery sage Vishvamitra appeared in a dream, requesting the donation of the entire earth. Upon waking, Harishchandra affirmed his word without hesitation. When Vishvamitra arrived in the physical court of Ayodhya, the king formally surrendered his golden throne, his imperial treasury, his armies, and his kingdom, retaining only the humble garments he wore. When Vishvamitra then demanded the traditional gold coin dakshina to seal the religious gift, Harishchandra, now completely penniless, requested a period of one month to earn the money, walking into exile with his devoted queen Shaivya and young son Rohitashva toward the holy city of Kashi.",
    "journeyLocal": "अयोध्या के सूर्यवंशी राजा हरिश्चंद्र अपने सत्य, न्याय और दानशीलता के लिए तीनों लोकों में विख्यात थे। उनके राज्य में प्रजा सुखी, संपन्न और धर्मपरायण थी। उनके सत्य की परीक्षा लेने के लिए महर्षि विश्वामित्र ने स्वप्न में उनका संपूर्ण राज्य दान में मांग लिया। प्रातःकाल जब विश्वामित्र साक्षात राजदरबार में पधारे, तो राजा हरिश्चंद्र ने बिना तनिक भी संकोच किए अपनी संपूर्ण संपदा और साम्राज्य महर्षि को दान कर दिया।\n\nजब विश्वामित्र ने दान का संकल्प पूरा करने हेतु राजसूय यज्ञ की दक्षिणा मांगी, तो राजा के पास फूटी कौड़ी भी न थी। राजा ने दक्षिणा चुकाने के लिए एक माह का समय मांगा और अपनी महारानी शैव्या तथा नन्हे पुत्र रोहिताश्व के साथ वल्कल वस्त्र पहनकर काशी की ओर पैदल चल पड़े।",
    "trial": "In Kashi, the deadline for paying the sage arrived. To honor his word of truth, Harishchandra took the agonizing step of selling his beloved queen Shaivya and child Rohitashva to an elderly brahmin as domestic servants. Since the sale still fell short of the full dakshina, the emperor sold himself to a chandala named Kallu, the keeper of the Manikarnika cremation ground. For months, the former emperor of Ayodhya lived amidst smoldering funeral pyres, clad in rags and covered in ashes, collecting burial taxes and shroud cloths from grieving relatives day and night.\n\nThe ultimate trial of agony arrived on a stormy night. Young Rohitashva was bitten by a venomous serpent while picking flowers in the forest and died instantly. Queen Shaivya, destitute and dressed in tatters, carried the cold body of her child to the cremation ground in the pouring rain. Recognizing his wife and dead son in the lightning flashes, Harishchandra was overwhelmed with unimaginable grief. Yet, when Shaivya prepared to cremate the boy, Harishchandra stood firm in his duty to his master, stating that as the cremation guard, he could not allow a body to be cremated without collecting the master's burial fee. Having no coins, Shaivya offered half of the worn cloth covering the child. As the king took the torn shroud with trembling hands to fulfill his duty, the heavens blazed with divine light. Lord Shiva, Indra, Vishnu, and Sage Vishvamitra manifested, stopping his hands and showering flowers. Vishvamitra declared that Harishchandra’s adherence to Satya was unmatched in cosmic history. Rohitashva was revived to life, the empire was restored, and the gods proclaimed that Harishchandra’s name would forever shine as the living embodiment of Truth.",
    "trialLocal": "काशी में दक्षिणा चुकाने का अंतिम दिन आने पर राजा ने भारी मन से अपनी महारानी शैव्या और पुत्र रोहिताश्व को एक ब्राह्मण के यहाँ दासी के रूप में बेच दिया। फिर भी दक्षिणा पूरी न होने पर उन्होंने स्वयं को मणिकर्णिका श्मशान के चांडाल कालू के हाथों बेच दिया। चक्रवर्ती सम्राट श्मशान में मुर्दों के कफ़न एकत्र करने और कर वसूलने का कार्य करने लगे।\n\nअग्नि-परीक्षा की चरम सीमा तब आई जब सर्पदंश से बालक रोहिताश्व की मृत्यु हो गई। महारानी शैव्या रोती हुई आधी रात को बालक के शव को लेकर श्मशान पहुँचीं। बिजली की कौंध में राजा ने अपनी पत्नी और मृत पुत्र को पहचान लिया। दोनों का क्रंदन आकाश को चीरने लगा। किंतु जब शैव्या ने पुत्र का दाह-संस्कार करना चाहा, तो हरिश्चंद्र ने चांडाल के सेवक का धर्म निभाते हुए बिना कर लिए अंतिम संस्कार करने से मना कर दिया। जब निर्धन शैव्या अपनी फटी साड़ी का आधा कफ़न देने को उद्यत हुई, उसी क्षण भगवान शिव, विष्णु, इंद्र और महर्षि विश्वामित्र प्रकट हो गए। उन्होंने राजा के हाथ थाम लिए और पुष्प-वर्षा करते हुए रोहिताश्व को जीवित कर दिया। विश्वामित्र ने घोषणा की कि हरिश्चंद्र ने सत्य की वह परीक्षा उत्तीर्ण की है जो सृष्टि में कोई अन्य नहीं कर सका।",
    "teaching": "King Harishchandra proved that Satya (Truth) is not a fair-weather intellectual luxury, but the unyielding pillar of cosmic order (Rita). When one adheres to truth through humiliation, poverty, heartbreak, and despair, Truth itself descends to crown the seeker with immortality.",
    "teachingLocal": "राजा हरिश्चंद्र ने सिद्ध किया कि सत्य कोई सुविधा का विषय नहीं, बल्कि जीवन की अंतिम सांस तक निभाने वाला तप है। सुख हो या दारुण दुख, मान हो या घोर अपमान—जो मनुष्य सत्य का दामन नहीं छोड़ता, संपूर्ण ब्रह्मांड उसकी रक्षा में नतमस्तक हो जाता है।",
    "moral": "Integrity is proven not in prosperity, but in the furnace of affliction. A promise made must be honored at all costs, for when truth is preserved, all is preserved.",
    "moralLocal": "सत्य ही ईश्वर है और सत्य ही परम धर्म है। संसार के समस्त वैभव छूट जाएं, किंतु सत्य का त्याग कभी नहीं करना चाहिए, क्योंकि सत्य की रक्षा करने वाले की रक्षा स्वयं धर्म करता है।",
    "legacy": "King Harishchandra’s legendary devotion to Satya became an eternal touchstone in Indian culture. Centuries later, a theatrical performance of Harishchandra’s life in Rajkot inspired young Mohandas Karamchand Gandhi to dedicate his entire existence to the weapon of Satyagraha (Soul-force grounded in Truth).",
    "legacyLocal": "राजा हरिश्चंद्र का नाम भारतीय संस्कृति में 'सत्य' का पर्याय बन गया। उनके इस पावन चरित्र ने आगे चलकर राष्ट्रपिता महात्मा गांधी के जीवन को गहराई से प्रभावित किया और उन्हें 'सत्याग्रह' का मार्ग चुनने की प्रेरणा दी।",
    "source": "Markandeya Purana (Ch. 7–8), Devi Bhagavata Purana (Skandha 6, Ch. 11–13)",
    "sourceLocal": "मार्कंडेय पुराण (अध्याय ७-८), देवी भागवत पुराण (षष्ठ स्कंध, अध्याय ११-१३)",
    "sourceCitations": [
      {
        "sourceName": "Markandeya Purana",
        "sourceRef": "Chapters 7–8 (The Testing of Harishchandra and the Glory of Truth)",
        "tier": 1
      },
      {
        "sourceName": "Devi Bhagavata Purana",
        "sourceRef": "Skandha 6, Chapters 11–13 (Harishchandra Charitam)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Truth alone is the supreme Dharma; there is no status or attainment higher than Truth in all the worlds.",
      "attribution": "Markandeya Purana 8.35"
    },
    "quoteLocal": {
      "text": "सत्यमेव परो धर्मः सत्यान्नास्ति परं पदम्।",
      "attribution": "मार्कंडेय पुराण (८.३५)"
    }
  },
  {
    "id": "tulsidas",
    "name": "Goswami Tulsidas",
    "nameLocal": "गोस्वामी तुलसीदास",
    "era": "1532 – 1623 CE",
    "eraLocal": "१५३२ – १६२३ ई.",
    "tradition": "hindu",
    "region": "Varanasi & Ayodhya",
    "regionLocal": "वाराणसी व अयोध्या",
    "emoji": "🪔",
    "tagline": "The supreme Bhakti poet-saint who brought the sacred story of Lord Rama into the language of the common people in the immortal Ramcharitmanas.",
    "taglineLocal": "भक्तिकाल के शिरोमणि संत-कवि जिन्होंने श्रीरामचरितमानस के माध्यम से प्रभु राम की पावन कथा को जन-जन की भाषा अवधी में अमर कर दिया।",
    "journey": "Born as Rambola in Rajapur along the banks of the sacred Yamuna, the child was abandoned in infancy due to inauspicious astrological conjunctions (Abhukta Mula). Raised in abject poverty by an ascetic maidservant and later initiated by Naraharidas—the fourth spiritual descendant of Ramananda—the boy was educated in Sanskrit, the Upanishads, and the Puranas at Varanasi under the great scholar Shesha Sanatana. Returning to Rajapur, he married Ratnavali, the daughter of a learned scholar, falling into intense, blind attachment to her physical presence.\n\nOne stormy monsoon night, unable to endure even a few days of separation while Ratnavali was visiting her parents' home, Tulsidas braved a roaring flooded river, clutching a floating corpse mistaking it for a log, and scaled the second-story balcony of her house using a hanging venomous snake mistaking it for a rope. Astonished and dismayed by his desperate infatuation, Ratnavali rebuked him with a single razor-sharp verse: 'If you possessed even half the devotion for Sri Rama that you shower upon this frail body of flesh and bone, you would have crossed the ocean of mortal sorrow!' Struck to the heart as if by lightning, the veil of delusion fell. Without uttering a word, Tulsidas turned around in the pouring rain, renounced worldly domestic life, and walked away into lifelong mendicant sadhana.",
    "journeyLocal": "राजापुर में यमुना तट पर जन्मे रामबोला का बाल्यकाल घोर अभाव और कष्टों में बीता। संत नरहरिदास ने उनका हाथ थामा और उन्हें काशी में शेष सनातन जी के सानिध्य में वेद-वेदांग और शास्त्रों की गहन शिक्षा दिलाई। उनका विवाह रत्नावली से हुआ, जिनके रूप पर वे अत्यधिक आसक्त हो गए।\n\nएक बार वर्षा ऋतु में पत्नी के मायके चले जाने पर तुलसीदास विरह में इतने व्याकुल हुए कि उफनती नदी को एक शव के सहारे पार कर गए और आधी रात को ससुराल की खिड़की पर लटकते सर्प को रस्सी समझकर ऊपर चढ़ गए। पत्नी रत्नावली ने जब यह देखा, तो उन्हें धिक्कारते हुए कहा: 'अस्थि चर्म मय देह यह, तासों ऐसी प्रीति। नेकु जो होती राम महं, तो नहिं भव-भीति॥' इस कटु सत्य ने तुलसीदास की चेतना को झकझोर दिया। वे उसी क्षण विरक्त होकर प्रभु श्री राम की अनन्य साधना में लीन हो गए।",
    "trial": "Wandering through Prayagraj, Ayodhya, and Varanasi, Tulsidas immersed himself in Rama Nama. According to tradition, through the guidance of a departed spirit he met Sri Hanuman disguised as a leper in an audience hall, who blessed him with direct visions of Lord Rama and Lakshmana on the banks of Chitrakoot: 'Chitrakoot ke ghat par bhai santan ki bheer, Tulsidas chandan ghise tilak det Raghubeer'.\n\nOn the auspicious day of Ram Navami in 1574 in Ayodhya, Tulsidas began composing the monumental epic *Sri Ramcharitmanas* in Awadhi, the spoken vernacular dialect of the common people. This act provoked furious hostility from orthodox Sanskrit scholars in Varanasi, who condemned translating the sacred scripture into a folk tongue. Hostile pandits sent thieves to steal his manuscripts, but the thieves fled in terror after witnessing two youthful celestial archers guarding the saint’s hut through the night. Pandits placed the Ramcharitmanas at the very bottom of a stack of sacred texts in the Kashi Vishwanath temple beneath the four Vedas, the Shastras, and the Puranas, locking the temple doors overnight to test its divine sanction. In the morning, when the doors were opened, the Ramcharitmanas lay miraculously on top of the entire stack, inscribed with the words 'Satyam Shivam Sundaram' by the grace of Lord Shiva himself. Imprisoned later by Emperor Jahangir for refusing to perform miracles, Tulsidas composed the fervent *Hanuman Bahuk*, while thousands of monkeys descended upon the imperial court, compelling the emperor to release the saint with deep reverence.",
    "trialLocal": "प्रयाग, चित्रकूट और काशी में साधना करते हुए हनुमान जी की कृपा से उन्हें चित्रकूट के घाट पर प्रभु श्री राम के साक्षात दर्शन हुए: 'चित्रकूट के घाट पर भई संतन की भीर। तुलसिदास चंदन घिसैं तिलक देत रघुबीर॥'\n\n१५७४ में अयोध्या में उन्होंने अवधी भाषा में 'श्रीरामचरितमानस' की रचना प्रारंभ की। संस्कृत के रूढ़िवादी पंडितों ने इसका कड़ा विरोध किया कि देववाणी के ज्ञान को लोकभाषा में क्यों लिखा गया। उनकी पांडुलिपि चुराने के षड्यंत्र रचे गए, किंतु प्रभु की कृपा से ग्रंथ सुरक्षित रहा। काशी विश्वनाथ मंदिर में परीक्षा हेतु इस ग्रंथ को चारों वेदों और शास्त्रों के सबसे नीचे रखा गया, किंतु प्रातः द्वार खुलने पर श्रीरामचरितमानस सबसे ऊपर मिला और उस पर 'सत्यं शिवं सुंदरम्' लिखा हुआ पाया गया। मुग़ल सम्राट द्वारा चमत्कार दिखाने के दबाव पर बंदी बनाए जाने पर भी वे अडिग रहे और उनकी निष्ठा सदैव श्री राम के चरणों में समर्पित रही।",
    "teaching": "Goswami Tulsidas taught that in the age of Kali Yuga, when elaborate Vedic sacrifices, severe yogic austerities, and ritual knowledge are difficult for the common man, the chanting of the divine Name (Nama Japa) and loving surrender to Rama is the supreme, effortless path to liberation. He dismantled elitist barriers to spirituality, proving that the highest philosophical truths belong to everyone regardless of caste or education.",
    "teachingLocal": "तुलसीदास जी ने सिखाया कि कलियुग में योग, यज्ञ और कठिन तप की अपेक्षा केवल 'राम नाम' का स्मरण और अनन्य शरणागति ही भवसागर से पार उतरने का सबसे सुगम मार्ग है: 'कलिजुग केवल नाम अधारा। सुमिरी सुमिरी नर उतरहिं पारा॥' उन्होंने धर्म को रूढ़ियों से निकालकर जन-जन की भाषा और हृदय में स्थापित किया।",
    "moral": "When worldly passions are redirected toward the Supreme Reality, the greatest weakness transforms into divine genius. No opposition from orthodox authorities can stifle a message blessed by divine grace.",
    "moralLocal": "सांसारिक आसक्ति को यदि ईश्वर-प्रेम में बदल दिया जाए, तो सामान्य मनुष्य भी संत बन जाता है। सत्य और लोक-कल्याण के लिए किया गया कार्य समस्त बाधाओं को पार कर अमर हो जाता है।",
    "legacy": "Goswami Tulsidas transformed the religious and cultural landscape of northern India. The *Ramcharitmanas* is recited in millions of homes and temples worldwide, serving as the moral and spiritual compass of Hindu society. His *Hanuman Chalisa*, *Vinaya Patrika*, and *Kavitavali* remain immortal masterpieces of world devotional literature.",
    "legacyLocal": "गोस्वामी तुलसीदास जी का श्रीरामचरितमानस भारतीय जनमानस का प्राण है। उनके द्वारा रचित 'हनुमान चालीसा' और 'विनय पत्रिका' आज भी करोड़ों भक्तों के कंठहार हैं। उन्होंने भारतीय समाज को मर्यादा, शील और भक्ति के उच्च आदर्शों से जोड़कर सांस्कृतिक एकता के सूत्र में बांधा।",
    "source": "Sri Bhaktamal (Nabhadas, c. 1600 CE), Mula Gosain Charitra (Veni Madhav Das), Vinaya Patrika",
    "sourceLocal": "श्री भक्तमाल (नाभादास, १६०० ई.), मूल गोसाईं चरित (वेणी माधव दास), विनय पत्रिका",
    "sourceCitations": [
      {
        "sourceName": "Nabhadas — Sri Bhaktamal",
        "sourceRef": "Chhappai on Goswami Tulsidas (c. 1600 CE)",
        "tier": 1
      },
      {
        "sourceName": "Goswami Tulsidas — Vinaya Patrika & Kavitavali",
        "sourceRef": "Autobiographical Verses on His Life and Spiritual Trials",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Knowing the entire universe to be filled with Sita and Rama, I bow to all with folded hands.",
      "attribution": "Goswami Tulsidas — Ramcharitmanas, Bal Kand 8"
    },
    "quoteLocal": {
      "text": "सीय राममय सब जग जानी। करहूँ प्रनाम जोरि जुग पानी॥",
      "attribution": "श्रीरामचरितमानस (बालकांड, दोहा ८)"
    }
  },
  {
    "id": "mirabai",
    "name": "Sant Mirabai",
    "nameLocal": "संत मीराबाई",
    "era": "c. 1498 – 1546 CE",
    "eraLocal": "लगभग १४९८ – १५४६ ई.",
    "tradition": "hindu",
    "region": "Mewar & Vrindavan",
    "regionLocal": "मेवाड़ व वृंदावन",
    "emoji": "🪕",
    "tagline": "The royal mystic-poetess whose unconditional, fearless love for Giridhar Gopal dissolved royal tyranny and social convention into ecstatic melody.",
    "taglineLocal": "मेवाड़ की कृष्ण-दीवानी राजरानी जिनकी गिरधर गोपाल के प्रति अनन्य प्रेम-भक्ति ने विष के प्याले को भी अमृत बना दिया।",
    "journey": "Born as a Rajput princess in Kudki to Ratan Singh Rathore of the Merta dynasty, Mirabai was drawn to the divine from her earliest childhood. At age five, seeing a colorful wedding procession pass her balcony, she asked her mother who her bridegroom would be; her mother lovingly pointed to a small, dark stone murti of Lord Krishna (Giridhar Gopal), saying: 'My child, your bridegroom is Sri Krishna.' Mira embraced those playful words as eternal cosmic truth, placing the icon in her heart as her sole eternal beloved.\n\nIn 1516, under royal political diplomacy, she was married into the powerful royal house of Mewar to Prince Bhoj Raj, the eldest son of Rana Sanga. Despite living amidst the glittering luxury of Chittorgarh palace, Mira remained utterly detached from worldly opulence. She refused to bow before the royal family's ancestral clan deity or observe the strict purdah seclusion expected of royal Rajput women. Instead, she spent days and nights singing, dancing, and weeping before Giridhar Gopal in her temple, welcoming wandering sadhus, bhaktas, and outcast saints into the palace grounds to participate in divine Harikirtan.",
    "journeyLocal": "मेड़ता के राठौड़ कुल में जन्मी राजकुमारी मीरा का बाल्यकाल से ही भगवान श्री कृष्ण से गहरा नाता जुड़ गया था। पांच वर्ष की आयु में जब एक बारात को देखकर उन्होंने अपनी माता से पूछा कि उनका दूल्हा कौन है, तो माता ने सहज भाव से भगवान गिरधर गोपाल की प्रतिमा की ओर संकेत करते हुए कहा: 'मीरा, तुम्हारे दूल्हा यह श्री कृष्ण हैं।' मीरा ने माता के इस कथन को अपने जीवन का परम सत्य मान लिया और गिरधर को ही अपना सर्वस्व स्वीकार कर लिया।\n\n१५१६ में उनका विवाह मेवाड़ के महाराणा सांगा के ज्येष्ठ पुत्र युवराज भोजराज के साथ हुआ। चित्तौड़ के राजमहल के अपार वैभव के बीच रहकर भी मीरा राजसी सुखों से सर्वथा विरक्त रहीं। उन्होंने कुल-देवी के सम्मुख पशु-बलि देने और पर्दे में रहने की राजपूती परंपराओं को अस्वीकार कर दिया। वे राजमहलों के बंधनों को तोड़कर साधु-संतों की संगति में भगवान कृष्ण के भजनों में लीन होकर नाचने और गाने लगीं।",
    "trial": "Following the premature death of her supportive husband Bhoj Raj, and later Rana Sanga, the throne passed to Vikramaditya, who viewed Mira’s public devotional ecstasy and association with saints as an unforgivable stain upon royal prestige. Vikramaditya subjected Mira to cruel, calculated attempts on her life. First, he dispatched a sealed golden casket containing a deadly black cobra, presenting it as a gift of a fragrant flower garland; when Mira opened the box with Krishna’s name upon her lips, the serpent transformed into a garland of fresh celestial blooms.\n\nUndeterred, the Rana sent a cup of lethal green poison, commanding her to drink it as the king’s royal decree. Mira smiled, offered the draught to Giridhar Gopal, and drank the venom in one breath; by divine grace, the poison turned into sweet nectar (Amrit), leaving her radiant and unharmed. Finally, the Rana ordered a bed of sharp iron nails prepared for her to sleep upon; upon touching the metal, the spikes miraculously blossomed into a bed of fragrant rose petals. Realizing that the royal court had become an insurmountable prison for her spiritual freedom, Mira heeded the letter of counsel from Goswami Tulsidas: 'Jake priya na Ram-Vaidehi, tajiye tahi koti bairi sam, yadyapi param sanehi' (Abandon those who love not the Divine as millions of enemies, no matter how dearly related). She walked away from the palace of Chittor barefoot, wandering through Merta, Pushkar, and the holy groves of Vrindavan, singing her immortal padas until taking her final samadhi in Dwarka, where tradition holds she physically merged into the sanctum sanctorum icon of Sri Ranchhodraiji.",
    "trialLocal": "पति और महाराणा सांगा के निधन के पश्चात नए शासक विक्रमादित्य ने मीरा की भक्ति को राजकुल की मर्यादा के विरुद्ध मानकर उन पर अमानवीय अत्याचार प्रारंभ किए। उन्होंने मीरा की हत्या के अनेक षड्यंत्र रचे। पहले फूलों की टोकरी में एक विषैला काला नाग भेजा गया, किंतु जब मीरा ने कृष्ण-स्मरण करते हुए पिटारी खोली, तो वह सर्प शालिग्राम और पुष्पहार में बदल गया।\n\nइसके पश्चात राणा ने 'चरणामृत' के नाम पर हलाहल विष का प्याला भेजा। मीरा ने हँसते हुए उस विष को गिरधर का प्रसाद मानकर पी लिया: 'विष का प्याला राणा जी भेज्या, पीवत मीराँ हाँसी रे।' ईश्वर की कृपा से वह विष अमृत बन गया। जब उनके शयन हेतु लोहे की नुकीली कीलों की शैया बिछाई गई, तो वह फूलों की सेज में परिवर्तित हो गई। अत्याचारों से तंग आकर मीरा ने गोस्वामी तुलसीदास जी को पत्र लिखा, जिनके उत्तर के पश्चात उन्होंने राजमहल का त्याग कर दिया। वे नंगे पांव मेड़ता, वृंदावन और द्वारका की गलियों में 'पग घुँघरू बाँध मीराँ नाची रे' गाते हुए विचरण करने लगीं और अंततः द्वारकाधीश के विग्रह में समाहित हो गईं।",
    "teaching": "Sant Mirabai revealed the supreme path of Madhurya Bhakti (sweet, intimate bridal devotion). True surrender to the Divine knows no compromise with worldly tyranny, fear of social ostracism, or fear of death. The soul’s eternal covenant is with the Divine alone; when one's love is absolute and fearless, earthly venom is rendered powerless.",
    "teachingLocal": "मीराबाई ने माधुर्य भक्ति और अनन्य शरणागति का मार्ग प्रशस्त किया। उन्होंने सिखाया कि आत्मा का शाश्वत संबंध केवल परमात्मा से है। जब प्रेम में कपट नहीं होता, तो संसार का विष भी भक्त का बाल बांका नहीं कर सकता। लोक-लाज और कुल की मर्यादा से परे ईश्वर का प्रेम ही मनुष्य का सर्वोच्च धर्म है।",
    "moral": "Devotion demands courage to break through the illusions of social prestige. When one surrenders life, ego, and destiny unconditionally to the Divine, grace dissolves every poison and welcomes the soul into eternal union.",
    "moralLocal": "सच्ची भक्ति समाज के झूठे दिखावों और बंधनों से मुक्त होती है। जो जीव प्रभु के चरणों में पूर्ण समर्पित हो जाता है, उसके समस्त संकटों को भगवान स्वयं हर लेते हैं।",
    "legacy": "Sant Mirabai’s bhajans and padas are etched into the spiritual and musical heart of India, sung across centuries in every village, classical concert, and temple. She stands as an eternal beacon of spiritual liberty, women's agency, and mystical courage against feudal oppression.",
    "legacyLocal": "मीराबाई भारतीय भक्ति साहित्य और संगीत की अमर वीणा हैं। उनके पद आज भी जन-जन के कंठ में बसे हैं। वे केवल एक संत नहीं, बल्कि रूढ़िवादी सामंती व्यवस्था के विरुद्ध नारी-स्वाधीनता और आत्मिक निष्ठा की क्रांतिदूत थीं।",
    "source": "Sri Bhaktamal (Nabhadas, c. 1600 CE), Priyadas's Bhaktirasbodhini Tika, Padavali of Mirabai",
    "sourceLocal": "श्री भक्तमाल (नाभादास, १६०० ई.), प्रियादास कृत भक्तिरसबोधिनी टीका, मीराँबाई की पदावली",
    "sourceCitations": [
      {
        "sourceName": "Nabhadas — Sri Bhaktamal",
        "sourceRef": "Chhappai on Mirabai and Her Trial by Poison",
        "tier": 1
      },
      {
        "sourceName": "Priyadas — Bhaktirasbodhini Tika (1712 CE)",
        "sourceRef": "Commentary on the Life, Trials, and Miracles of Mirabai",
        "tier": 1
      }
    ],
    "quote": {
      "text": "My Lord is Giridhar Gopal, the lifter of mountains, and none other; having seen the world, my tears have watered the creeper of divine love.",
      "attribution": "Sant Mirabai — Padavali"
    },
    "quoteLocal": {
      "text": "मेरो तो गिरधर गोपाल दूसरो न कोई। जाके सिर मोर मुकुट मेरो पति सोई॥",
      "attribution": "संत मीराबाई (पदावली)"
    }
  },
  {
    "id": "tukaram",
    "name": "Sant Tukaram",
    "nameLocal": "संत तुकाराम",
    "era": "1598 – 1650 CE",
    "eraLocal": "१५९८ – १६५० ई.",
    "tradition": "hindu",
    "region": "Dehu, Maharashtra",
    "regionLocal": "देहू, महाराष्ट्र",
    "emoji": "🪘",
    "tagline": "The great Varkari saint-poet whose divine abhangas submerged in the Indrayani river resurfaced unscathed, democratizing Bhakti for all humanity.",
    "taglineLocal": "वारकरी संप्रदाय के महान संत-कवि जिनके इंद्रायणी नदी में डुबोए गए अभंग निष्कलंक तैर आए और जिन्होंने विट्ठल-भक्ति को जन-जन तक पहुँचाया।",
    "journey": "Born into a humble More peasant (Kunbi) family in the village of Dehu along the Indrayani river, Tukaram inherited a modest grocery business and farmland. His early life was shattered by the devastating Deccan famine of 1630–1632, in which his first wife Rakhumabai and eldest son died of starvation, his cattle perished, and his business collapsed into bankruptcy. Confronted with the harsh transience of worldly security, Tukaram forgave all debts owed to his family, threw the promissory debt bonds into the Indrayani river, and retreated to the solitude of the Bhandara and Bhamchandra hills to immerse himself in spiritual contemplation.\n\nAfter fifteen days of intense fasting and continuous meditation on Lord Vitthala (Vithoba of Pandharpur), Tukaram received spiritual initiation in a dream from a divine guru named Babaji Chaitanya, who gave him the sacred mantra 'Rama Krishna Hari'. Inspired by the legacy of Sant Dnyaneshwar and Namdev, Tukaram began pouring forth thousands of Marathi *Abhangas*—rhythmic devotional verses brimming with raw emotional honesty, profound Vedantic non-dualism, and searing social commentary against caste hypocrisy and ritualist commercialism.",
    "journeyLocal": "महाराष्ट्र के देहू गाँव में इंद्रायणी नदी के तट पर एक साधारण कृषक परिवार में जन्मे तुकाराम का पूर्वार्ध घोर दुखों से भरा था। १६३० के भीषण अकाल में उनकी पहली पत्नी और ज्येष्ठ पुत्र भूख से तड़प-तड़प कर चल बसे और उनका व्यापार नष्ट हो गया। सांसारिक सुखों की असारता को देखकर तुकाराम ने ग्रामीणों के कर्ज के सभी बही-खाते इंद्रायणी नदी में बहा दिए और स्वयं भामचंद्र और भंडारा की पहाड़ियों में एकांत साधना करने चले गए।\n\nकठोर तपस्या के पश्चात उन्हें स्वप्न में बाबाजी चैतन्य से 'राम कृष्ण हरि' के तारक मंत्र की दीक्षा मिली। भगवान विट्ठल के अनन्य प्रेम में डूबकर उन्होंने मराठी भाषा में हजारों 'अभंगों' की रचना प्रारंभ की, जिनमें वेदांत का सार, आत्म-समर्पण और जाति-पांति के पाखंड पर कड़ा प्रहार समाहित था।",
    "trial": "Tukaram's meteoric popularity among the peasant masses infuriated the rigid orthodox brahmins of the region, headed by a scholar named Mambaji and the orthodox pandit Rameshwar Bhatt. They argued that as a Shudra, Tukaram possessed no scriptural authority to compose devotional verses on the Vedas. Rameshwar Bhatt summoned Tukaram, subjected him to verbal abuse, and issued a cruel decree: all of Tukaram's handwritten manuscripts containing thousands of his abhangas must be cast into the waters of the Indrayani river, warning that if his poetry was not of divine origin, it would perish forever.\n\nHeartbroken not for himself but for the sacred words of devotion, Tukaram wrapped his precious manuscripts in cloth, weighted them with stones, and lowered them into the deep swirling river. He then sat on a stone slab by the riverbank, undertaking an uncompromising fast-unto-death without food or water, praying: 'O Lord, if these words are merely my human pride, let them drown; but if they belong to You, vindicate Your servant.' For thirteen continuous days and nights, Tukaram sat in unmoving prayer while the villagers watched in awe and the orthodox mocked him. On the thirteenth day, a miraculous sight stunned the entire village: the bundles of manuscripts floated up to the surface of the river, completely dry and undamaged, as if preserved by celestial hands. Witnessing this undeniable sign of divine favor, Rameshwar Bhatt fell at Tukaram’s feet in deep repentance, becoming his lifelong disciple.",
    "trialLocal": "तुकाराम जी की बढ़ती लोकप्रियता से रूढ़िवादी पंडित क्रुद्ध हो उठे। रामेश्वर भट्ट नामक विद्वान ने उन पर आरोप लगाया कि शूद्र कुल में जन्म लेकर वेदों के ज्ञान पर अभंग लिखने का उन्हें कोई अधिकार नहीं है। उन्होंने तुकाराम जी को कठोर आज्ञा दी कि वे अपने सभी हस्तलिखित अभंगों की बहियों को इंद्रायणी नदी में डुबो दें।\n\nतुकाराम जी ने भारी हृदय से अपने जीवन भर के संचित अभंगों को पत्थर से बांधकर नदी की अथाह जलराशि में डुबो दिया। इसके पश्चात वे नदी तट पर एक शिला पर 'प्रायोपवेशन' (अन्न-जल त्यागकर अनशन) पर बैठ गए। उन्होंने प्रभु विट्ठल से प्रार्थना की कि यदि ये शब्द उनके अपने अहंकार के हैं तो नष्ट हो जाएं, किंतु यदि ये भगवान के हैं तो उनकी रक्षा हो। लगातार तेरह दिनों तक वे भूखे-प्यासे प्रभु-स्मरण में बैठे रहे। तेरहवें दिन इंद्रायणी की लहरों से वे सभी पांडुलिपियाँ सूखी अवस्था में जल के ऊपर तैरती हुई बाहर निकल आईं। इस चमत्कार को देखकर रामेश्वर भट्ट का अहंकार टूट गया और वे रोते हुए तुकाराम जी के चरणों में गिर पड़े।",
    "teaching": "Sant Tukaram taught that God dwells not in stone temples, ritual ostentation, or high birth, but in the compassionate heart that feels the agony of the downtrodden as its own: 'Je ka ranjale ganjale, tyansi mhane jo apule, tochi sadhu olakhava, deva tethichi janava' (Know him to be a true saint who embraces the tormented and destitute as his own; God resides right there). Pure devotion (Bhakti) requires internal purity, unceasing remembrance of the Holy Name, and active empathy for all living creatures.",
    "teachingLocal": "संत तुकाराम ने उद्घोष किया कि ईश्वर पाषाण की मूर्तियों या बाह्य आडंबरों में नहीं, बल्कि दीन-दुखियों की सेवा में वास करता है: 'जे का रंजले गांजले, त्यांसी म्हणे जो आपुले। तोचि साधु ओळखावा, देव तेथेंचि जाणावा॥' उन्होंने सिखाया कि सच्चा धर्म हृदय की पवित्रता, ईश्वर के नाम-स्मरण और प्राणी-मात्र के प्रति दया में निहित है।",
    "moral": "When faith is pure and surrendered without ego, truth will rise to the surface no matter how deeply the world attempts to drown it. The highest spiritual authority is earned not through social lineage, but through humility, love, and righteous conduct.",
    "moralLocal": "सत्य को संसार कितना भी डुबोने का प्रयास करे, वह इंद्रायणी के अभंगों की भांति तैरकर बाहर आ जाता है। मनुष्य कुल से नहीं, बल्कि अपने आचरण और ईश्वर-प्रेम से पूज्य बनता है।",
    "legacy": "Sant Tukaram is the crown jewel of the Varkari tradition. His *Tukaram Gatha* containing over 4,500 abhangas continues to be sung by millions of pilgrims (Varkaris) as they march on foot to Pandharpur every year in the historic Ashadhi Ekadashi wari. His spiritual teachings profoundly influenced Chhatrapati Shivaji Maharaj, who personally sought Tukaram's blessings and was counseled by him on detachment and servant-kingship.",
    "legacyLocal": "संत तुकाराम वारकरी संप्रदाय के शिरोमणि हैं। उनकी 'तुकाराम गाथा' के अभंग आज भी प्रतिवर्ष पंढरपुर की वारी में लाखों श्रद्धालुओं के मुख से गूंजते हैं। छत्रपति शिवाजी महाराज स्वयं उनके दर्शन हेतु देहू आए थे और उनके उपदेशों से अत्यंत प्रभावित हुए थे।",
    "source": "Sri Bhaktalilamrita & Bhaktavijaya (Mahipati, 18th Century CE), Tukaram Gatha",
    "sourceLocal": "श्री भक्तिलीलामृत व भक्तविजय (महीपति, १८वीं शताब्दी), तुकाराम गाथा",
    "sourceCitations": [
      {
        "sourceName": "Mahipati — Bhaktalilamrita",
        "sourceRef": "Chapters 25–40 (Life, Trials, and the Miracle of Submerged Abhangas)",
        "tier": 1
      },
      {
        "sourceName": "Tukaram Gatha",
        "sourceRef": "Abhangas on the Indrayani river ordeal and vitthal devotion",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Recognize him alone as a true saint who considers the afflicted and distressed as his very own; God truly dwells within him.",
      "attribution": "Sant Tukaram — Abhanga 203"
    },
    "quoteLocal": {
      "text": "जे का रंजले गांजले। त्यांसी म्हणे जो आपुले। तोचि साधु ओळखावा। देव तेथेंचि जाणावा॥",
      "attribution": "संत तुकाराम (अभंग २०३)"
    }
  },
  {
    "id": "kabir",
    "name": "Sant Kabir Das",
    "nameLocal": "संत कबीर दास",
    "era": "15th Century CE",
    "eraLocal": "१५वीं शताब्दी",
    "tradition": "hindu",
    "region": "Varanasi & Maghar",
    "regionLocal": "वाराणसी व मगहर",
    "emoji": "🧵",
    "tagline": "The fearless weaver-mystic whose piercing dohas shattered sectarian hypocrisy, ritualism, and dogma to reveal the formless Divine within.",
    "taglineLocal": "निर्भीक जुलाहा-संत जिनके तीखे दोहों ने धार्मिक पाखंड, बाह्याचार और भेदभाव को तोड़कर घट-घट में समाए निर्गुण राम का साक्षात्कार कराया।",
    "journey": "Discovered as an abandoned infant on a lotus petal in the Lahartara lake of Varanasi by a humble Muslim weaver couple, Niru and Nima, Kabir was raised in the weaver (Julaha) community. Working daily at the handloom, weaving coarse cloth while chanting the divine name, Kabir experienced the rhythm of the loom as the cosmic tapestry of creation itself. Yearning for spiritual initiation into Rama-Nama, he knew that the orthodox Vedic scholar Swami Ramananda might hesitate to accept a low-born weaver as a direct disciple.\n\nUndeterred by social convention, Kabir observed that Swami Ramananda walked down to the Panchganga Ghat in Varanasi every morning in the dark hours before dawn to bathe in the sacred Ganga. One morning, Kabir lay down across the steep stone steps of the ghat. As Ramananda descended in the darkness, his wooden sandal struck Kabir’s chest. Startled, the saint exclaimed: 'Rama! Rama!' Taking those holy words spoken from the guru’s lips as his supreme spiritual mantra and formal initiation, Kabir rose as a disciple of Ramananda, dedicating his life to the realization of the formless, omnipresent Divine (Nirguna Parabrahma).",
    "journeyLocal": "काशी के लहरतारा तालाब में नीरू और नीमा नामक जुलाहा दंपति को मिले बालक कबीर का लालन-पालन बुनकर परिवार में हुआ। करघे पर कपड़ा बुनते हुए कबीर ने श्रम को ही साधना बना लिया। जब उन्होंने स्वामी रामानंद जी से दीक्षा लेने का विचार किया, तो उन्हें संकोच था कि रूढ़िवादी समाज उन्हें अनुमति नहीं देगा।\n\nकबीर ने एक युक्ति निकाली। वे ब्रह्ममुहूर्त में पंचगंगा घाट की सीढ़ियों पर लेट गए। स्नान के लिए जा रहे स्वामी रामानंद का पैर अंधेरे में कबीर की छाती पर पड़ा, तो उनके मुख से अनायास निकला: 'राम! राम!' कबीर ने इसी को गुरु-मंत्र और दीक्षा मान लिया और 'निर्गुण राम' की उपासना में लीन हो गए।",
    "trial": "Kabir’s revolutionary verses attacked religious bigotry, caste supremacy, empty rituals, idol worship without inner devotion, and the clerical exploitation practiced by both Hindu pandits and Muslim qazis. Standing in the bustling market squares of Varanasi, he proclaimed: 'Pahan puje Hari mile, to main pujun pahar' (If worshiping a stone brings God, I will worship a mountain) and challenged clerics on formalistic prayers without inward purity. Enraged by his audacity, orthodox leaders from both communities allied together to petition the Delhi Sultan, Sikandar Lodi, accusing Kabir of blasphemy and inciting civic rebellion.\n\nSummoned before the imperial court, Kabir refused to bow before the emperor, stating that he bowed only to the Emperor of the Universe. Sultan Lodi ordered him executed through escalating cruelties. First, Kabir was bound in heavy iron chains and thrown into the churning waters of the Ganga; miraculously, the chains shattered and Kabir floated peacefully upon the river upon a bed of grass. Next, they cast him into a blazing furnace, but he walked out unharmed, enveloped in cool celestial fragrance. Finally, an enraged, intoxicated royal war elephant was driven to crush him; the elephant stopped dead before Kabir, bowed its massive head, and fled in terror despite being struck with sharp iron hooks. Realizing the presence of a supreme divine mystic, the Sultan pardoned Kabir and sought his blessings. In his final act of defiance against superstition, Kabir journeyed in his old age to Maghar—a town believed by orthodox dogma to cause rebirth as an ass for anyone dying there—proving that liberation depends on internal purity, not geographical superstition.",
    "trialLocal": "कबीर दास जी ने हिंदू और मुस्लिम दोनों धर्मों के पाखंडों, जाति-प्रथा और बाह्याचारों पर तीखे प्रहार किए। उन्होंने दोनों संप्रदायों को आईना दिखाते हुए कहा: 'पाहन पूजे हरि मिलैं, तो मैं पूजौं पहार।' इससे क्षुब्ध होकर पंडितों और मौलवियों ने सुल्तान सिकंदर लोदी से उनकी शिकायत की।\n\nदरबार में पेश किए जाने पर कबीर ने सुल्तान के सामने झुकने से इनकार कर दिया। सुल्तान ने उन्हें मृत्युदंड देने के अनेक प्रयास किए। पहले उन्हें लोहे की जंजीरों में बांधकर गंगा में डुबोया गया, किंतु जंजीरें टूट गईं और वे तैरते रहे। फिर उन्हें धधकती आग में डाला गया, पर वे निष्कलंक बाहर आ गए। अंत में एक मतवाले हाथी के सामने उन्हें कुचलने के लिए फेंका गया, किंतु हाथी ने कबीर के सामने सिर झुका दिया और आगे नहीं बढ़ा। यह देखकर सुल्तान ने क्षमा मांगी। जीवन के अंतिम समय में काशी में मरने पर मोक्ष और मगहर में मरने पर नरक की अंधमान्यता को तोड़ने के लिए वे स्वयं मगहर चले गए और वहीं अपनी देह त्यागी।",
    "teaching": "Sant Kabir taught that God is neither in the temple, nor the mosque, nor Kaaba, nor Kailash, but resides as the breath of all breaths (Ghat-ghat vasi) within every heart. Outer rituals, holy garments, pilgrimages, and social hierarchies are meaningless illusions without true love, compassion, and the inner awakening of the self.",
    "teachingLocal": "कबीर ने सिखाया कि ईश्वर न मंदिर में है, न मस्जिद में, न काबा में और न कैलाश में; वह तो हर प्राणी के घट-घट में समाया हुआ है: 'मोको कहाँ ढूँढे रे बन्दे, मैं तो तेरे पास में।' प्रेम, सत्य और निष्कपट हृदय ही परमात्मा को पाने का एकमात्र मार्ग है।",
    "moral": "Truth requires the fearlessness to dismantle hypocrisy wherever it hides. Spiritual liberation is attained not through dogmatic inheritance, but through living integrity and universal compassion.",
    "moralLocal": "सच्चा साधु वही है जो पाखंड और रूढ़ियों को तोड़कर सत्य के मार्ग पर निर्भय चले। धर्म का वास्तविक अर्थ बाह्य दिखावा नहीं, बल्कि आंतरिक शुद्धि और सभी जीवों से प्रेम है।",
    "legacy": "Sant Kabir stands as one of the towering colossi of Indian spiritual history. His *Bijak*, *Sakhi*, and *Sabada* form the foundation of Hindi literature, and 541 of his sacred hymns are permanently enshrined in the *Sri Guru Granth Sahib*. The Kabir Panth continues to preserve his egalitarian, non-sectarian path across the world.",
    "legacyLocal": "संत कबीर भारतीय संत-परंपरा के अमर स्तंभ हैं। उनकी वाणी 'बीजक' के रूप में प्रसिद्ध है, और उनके सैकड़ों पावन पद 'श्री गुरु ग्रंथ साहिब' में श्रद्धापूर्वक सम्मिलित किए गए हैं। कबीर पंथ आज भी उनके समतावादी दर्शन को जीवित रखे हुए है।",
    "source": "Kabir Bijak, Sri Guru Granth Sahib (Bhagat Kabir Bani), Sri Bhaktamal (Nabhadas)",
    "sourceLocal": "कबीर बीजक, श्री गुरु ग्रंथ साहिब (भगत कबीर बाणी), श्री भक्तमाल (नाभादास)",
    "sourceCitations": [
      {
        "sourceName": "Kabir Bijak",
        "sourceRef": "Sakhi and Sabad collections (Compilation of Kabir's Core Teachings)",
        "tier": 1
      },
      {
        "sourceName": "Sri Guru Granth Sahib",
        "sourceRef": "Angs 1364–1377 (Salok Bhagat Kabir Jiu Ke)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Do not ask the caste of a saint; ask only for wisdom. Appraise the value of the sword, leaving the scabbard aside.",
      "attribution": "Sant Kabir Das — Sakhi"
    },
    "quoteLocal": {
      "text": "जाति न पूछो साधु की, पूछ लीजिये ज्ञान। मोल करो तरवार का, पड़ा रहन दो म्यान॥",
      "attribution": "संत कबीर दास (साखी)"
    }
  },
  {
    "id": "ramanujacharya",
    "name": "Sri Ramanujacharya",
    "nameLocal": "श्री रामानुजाचार्य",
    "era": "1017 – 1137 CE",
    "eraLocal": "१०१७ – ११३७ ई.",
    "tradition": "hindu",
    "region": "Sriperumbudur & Srirangam",
    "regionLocal": "श्रीपेरुंबुदूर व श्रीरंगम",
    "emoji": "🛕",
    "tagline": "The revolutionary Acharya of Vishishtadvaita who proclaimed the secret liberating mantra from the temple tower to liberate all humanity, regardless of caste.",
    "taglineLocal": "विशिष्टाद्वैत वेदांत के महान प्रवर्तक जिन्होंने मंदिर के गोपुरम पर चढ़कर गुप्त मुक्ति-मंत्र का उद्घोष किया ताकि समूची मानवता का कल्याण हो सके।",
    "journey": "Born in Sriperumbudur in Tamil Nadu to Asuri Keshava Somayaji and Kantimathi, young Ramanuja displayed extraordinary intellectual sharpness and encyclopedic memory. Initially studying under the Advaitic scholar Yadava Prakasha in Kanchi, Ramanuja's deeply devotional heart questioned his preceptor's interpretations that seemed to negate the personal reality and compassionate grace of the Supreme Lord Narayana. Following the divine call of Yamunacharya, the revered pontiff of Srirangam, Ramanuja journeyed south, dedicating his life to synthesizing the transcendental philosophy of the Upanishads with the ecstatic, egalitarian Tamil hymns of the Alvars (the Divya Prabandham).\n\nInvested as the spiritual leader of Srirangam, Ramanuja formulated the profound philosophical system of Vishishtadvaita (qualified non-dualism). He demonstrated through rigorous Sanskrit exegesis that the universe and individual souls (Jivas) are not an illusion (Maya), but real, eternal attributes and bodily expressions of the Supreme Being (Brahman). He reformed the temple administration of Srirangam and Tirumala-Tirupati, opening temple entry and devotional duties to underprivileged communities whom he affectionately named Thirukulattar (the blessed family of the Divine Goddess Lakshmi).",
    "journeyLocal": "तमिलनाडु के श्रीपेरुंबुदूर में जन्मे रामानुज बाल्यकाल से ही विलक्षण मेधा के धनी थे। कांचीपुरम में यादव प्रकाश से शिक्षा ग्रहण करते हुए उन्होंने परमात्मा के सगुण-साकार और कृपालु स्वरूप की रक्षा हेतु तार्किक व्याख्याएँ प्रस्तुत कीं। श्रीरंगम के महान आचार्य यामुनाचार्य के संकल्पों को पूरा करने हेतु उन्होंने संन्यास धारण किया और प्रस्थानत्रयी पर विशिष्टाद्वैत वेदांत की प्रतिष्ठा की।\n\nउन्होंने उपनिषदों के गंभीर दर्शन को तमिल आलवार संतों के भक्ति-गीतों (दिव्य प्रबंधम्) से जोड़कर जन-आंदोलन का रूप दिया। उन्होंने तिरुपति और श्रीरंगम सहित अनेक प्रमुख मंदिरों की व्यवस्था में क्रांतिकारी सुधार किए और समाज के वंचित वर्गों को 'तिरुक्कुलत्तार' (महालक्ष्मी का पावन कुल) नाम देकर उन्हें मंदिर-प्रवेश और पूजा-अर्चना का अधिकार दिलाया।",
    "trial": "Ramanuja’s supreme trial and immortal act of spiritual compassion occurred when seeking initiation into the sacred eight-syllable saving mantra: 'Om Namo Narayanaya'. His guru, Goshtipurna (Thirukkoshtiyur Nambi), made Ramanuja walk barefoot from Srirangam to Thirukkoshtiyur eighteen times before finally agreeing to impart the secret mantra. Imparting the initiation under the strictest oath of secrecy, the guru gave a dire warning: 'This mantra guarantees liberation (Moksha) to anyone who hears it, but whoever reveals it to the uninitiated shall suffer eternal damnation in the darkest hells.'\n\nTaking the sacred mantra into his heart, Ramanuja walked out of his guru's cottage and looked upon the suffering, weary crowd of townspeople gathered below. Rather than concealing the secret for his own solitary salvation, Ramanuja climbed the high outer gopuram (temple tower) of the Soumyanarayana Perumal temple. Calling out with a booming voice to all men, women, and children regardless of caste or standing, he proclaimed the eight-syllable mantra at the top of his lungs, commanding everyone to chant it and attain liberation. Infuriated, Goshtipurna stormed before him, raising his staff and thundering: 'Do you not realize that you have consigned yourself to the fires of hell for disobeying your guru?' Ramanuja bowed his head with serene humility and replied: 'O Gurudeva, if my single soul burning in hell can grant salvation to thousands of innocent beings, I welcome hell a million times over.' Overwhelmed by such divine, Christ-like selflessness, the guru cast down his staff, embraced Ramanuja in tears, and proclaimed: 'You are no longer my disciple; you are Emberumanar—our venerable Lord.' Later in life, when a fanatic Chola monarch demanded that all scholars sign a decree stating Shiva was supreme over Vishnu, Ramanuja withstood persecution and exile into Karnataka, where he converted King Bittideva (Vishnuvardhana) and established the historic Cheluvanarayana Swamy temple at Melkote.",
    "trialLocal": "रामानुजाचार्य के जीवन का सबसे प्रसिद्ध प्रसंग उनकी गुरु-दीक्षा से जुड़ा है। तिरुक्कोष्टियूर नम्बी से 'ॐ नमो नारायणाय' के अष्टाक्षर मंत्र को पाने के लिए वे १८ बार पैदल चलकर गए। गुरु ने इस शर्त पर मंत्र दिया कि यह अत्यंत गुप्त है; इसे सुनने वाला मोक्ष प्राप्त करेगा, किंतु इसे किसी को बताने वाला नरक में जाएगा।\n\nमंत्र पाते ही रामानुजाचार्य ने सोचा कि यदि इस मंत्र से सभी जीवों का उद्धार हो सकता है, तो वे अकेले मोक्ष पाकर क्या करेंगे? वे तुरंत तिरुक्कोष्टियूर के मंदिर के विशाल गोपुरम पर चढ़ गए और पूरे नगर को पुकारकर उच्च स्वर में उस पावन मंत्र का उद्घोष कर दिया। क्रुद्ध होकर जब गुरु ने पूछा कि क्या तुम जानते हो कि तुम्हें घोर नरक मिलेगा, तो रामानुज ने शांत भाव से कहा: 'हे गुरुदेव! यदि मेरे अकेले के नरक जाने से हजारों दीन-दुखियों को मोक्ष मिलता है, तो मुझे नरक जाना सहर्ष स्वीकार है।' उनकी यह असीम करुणा देखकर गुरु ने रोते हुए उन्हें गले लगा लिया और 'एम्बरुमानार' (हमारे प्रभु) की उपाधि दी।",
    "teaching": "Sri Ramanujacharya taught the sublime doctrine of Sharanagati (Prapatti)—unconditional, loving surrender to Lord Narayana. God is not an impersonal void or cold abstraction, but an ocean of boundless love, accessible to every living being irrespective of social standing, birth, or learning. All souls are interconnected in the cosmic body of the Divine.",
    "teachingLocal": "रामानुजाचार्य ने शरणागति और प्रपत्ति का सिद्धांत दिया कि भगवान नारायण प्रेम और करुणा के सागर हैं। ईश्वर की दृष्टि में कोई ऊँच-नीच नहीं है; सच्चा समर्पण ही मोक्ष का साधन है। जीव और जगत दोनों ही परमात्मा के शरीर के समान हैं, अतः सभी प्राणियों के प्रति सेवा और आदर का भाव ही सच्चा धर्म है।",
    "moral": "True spiritual greatness is measured not by the secrets one hoards for personal enlightenment, but by the willingness to sacrifice one's own salvation for the liberation and upliftment of humanity.",
    "moralLocal": "आध्यात्मिक ज्ञान का उद्देश्य व्यक्तिगत मोक्ष तक सीमित नहीं है, बल्कि समस्त मानवता के कल्याण में है। जो दूसरों के दुख को दूर करने के लिए स्वयं कष्ट सहने को तैयार रहता है, वही सच्चा संत है।",
    "legacy": "Sri Ramanujacharya is the venerable architect of the Sri Vaishnava sampradaya. His philosophical masterworks, including the *Sri Bhashya* on the Brahma Sutras and the *Gita Bhashya*, established Bhakti on an unassailable intellectual foundation. His egalitarian temple reforms laid the bedrock for universal social inclusion, commemorated in the historic 216-foot Statue of Equality in Hyderabad.",
    "legacyLocal": "श्री रामानुजाचार्य ने वेदांत दर्शन को भक्ति से जोड़कर भारतीय संस्कृति को नई चेतना प्रदान की। उनके द्वारा रचित 'श्रीभाष्य' और 'गीताभाष्य' दर्शन के अमूल्य ग्रंथ हैं। उनकी समतावादी दृष्टि के सम्मान में हैदराबाद में 'स्टैच्यू ऑफ इक्वैलिटी' (समानता की प्रतिमा) की स्थापना की गई है।",
    "source": "Prapannamritam (Anantacharya), Sri Ramanuja Divya Charitam, Vedartha Sangraha",
    "sourceLocal": "प्रपन्नामृतम् (अनंताचार्य), श्री रामानुज दिव्य चरितम्, वेदार्थ संग्रह",
    "sourceCitations": [
      {
        "sourceName": "Anantacharya — Prapannamritam",
        "sourceRef": "Chapters 15–28 (Life of Sri Ramanuja and Gopuram Mantropadesha)",
        "tier": 1
      },
      {
        "sourceName": "Sri Ramanuja — Sri Bhashya",
        "sourceRef": "Commentary on the Brahma Sutras (Chatus-sutri / Foundations of Vishishtadvaita)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "If my single soul falling into hell can bring eternal salvation to thousands of suffering beings, I welcome that hell with joy.",
      "attribution": "Sri Ramanujacharya to Guru Goshtipurna at Thirukkoshtiyur"
    },
    "quoteLocal": {
      "text": "यदि मेरे अकेले के नरक जाने से हजारों प्राणियों को मुक्ति मिलती है, तो मुझे वह नरक सहर्ष स्वीकार है।",
      "attribution": "श्री रामानुजाचार्य (तिरुक्कोष्टियूर गोपुरम उद्घोष)"
    }
  },
  {
    "id": "ramakrishna",
    "name": "Ramakrishna Paramahamsa",
    "nameLocal": "रामकृष्ण परमहंस",
    "era": "1836 – 1886 CE",
    "eraLocal": "१८३६ – १८८६ ई.",
    "tradition": "hindu",
    "region": "Dakshineswar, Bengal",
    "regionLocal": "दक्षिणेश्वर, बंगाल",
    "emoji": "🌸",
    "tagline": "The mystic of Dakshineswar whose direct realization of the Divine Mother and lived experience of all spiritual paths revealed universal harmony.",
    "taglineLocal": "दक्षिणेश्वर के दिव्य संत जिन्होंने मां काली के साक्षात दर्शन किए और सभी धर्मों की साधना कर 'यतो मत, ततो पथ' का सार्वभौमिक संदेश दिया।",
    "journey": "Born as Gadadhar Chattopadhyaya in the rural village of Kamarpukur in Bengal to Khudiram and Chandramani Devi, the boy was naturally immersed in mystical contemplation. At age seven, seeing a flock of pure white cranes flying across dark, rolling monsoon clouds, Gadadhar was overwhelmed by transcendent beauty and entered ecstatic samadhi, losing all outward consciousness. Following the passing of his elder brother Ramkumar, he was appointed as the priest of the newly established Bhavatarini Kali temple at Dakshineswar along the Ganga, built by Rani Rashmoni.\n\nAt Dakshineswar, Gadadhar’s longing for the direct vision of the Divine Mother consumed every waking moment. Unable to treat the granite murti as mere stone, he fed the Mother with his own hands, fanned her during summer heat, and wept like a child bereft of its mother, crying: 'Mother, another day has passed and You have not shown Yourself to me!' Seeing his intense spiritual intoxication, relatives believed he had lost his sanity and arranged his marriage to Sarada Devi of Jayrambati; yet when Sarada joined him at Dakshineswar, Ramakrishna worshiped her upon a floral altar as the living embodiment of the Divine Mother Shodashi (Tripura Sundari), sublimating all worldly desire into pure spiritual adoration.",
    "journeyLocal": "बंगाल के कामारपुकुर गाँव में जन्मे गदाधर चट्टोपाध्याय बाल्यकाल से ही भाव-समाधि में लीन रहते थे। रानी रासमणि द्वारा गंगा तट पर निर्मित दक्षिणेश्वर काली मंदिर में जब वे पुजारी बने, तो माँ भवतारिणी की प्रत्यक्ष अनुभूति के लिए उनकी व्याकुलता चरम पर पहुँच गई। वे मूर्ति को केवल पाषाण नहीं, अपितु साक्षात चिन्मयी माँ मानकर बातें करते थे और उन्हें अपने हाथों से भोग लगाते थे।\n\nजब परिजनों ने उन्हें विक्षिप्त समझकर शारदा देवी से उनका विवाह करा दिया, तब दक्षिणेश्वर आने पर श्रीरामकृष्ण ने शारदा देवी को पाषाण या देह के रूप में नहीं, बल्कि षोडशी महाविद्या के रूप में पूजा और उनके चरणों में अपने जप की माला समर्पित कर दी। उनका संपूर्ण जीवन पवित्रता और काम-कांचन के त्याग का अनुपम उदाहरण बन गया।",
    "trial": "Ramakrishna’s supreme spiritual trial and historic experiment was to experience the absolute Reality through every major spiritual path known to humanity. Having attained Nirvikalpa Samadhi—the unbroken non-dual union with Brahman—under the guidance of the wandering naked Naga monk Totapuri in just three days (a state that takes ordinary yogis lifetimes to touch), Ramakrishna did not remain frozen in solitary silence.\n\nUnder Bhairavi Brahmani, he systematically mastered all sixty-four Tantric sadhanas without touching liquor or violating moral purity, proving that the Divine Mother can be realized through immaculate self-restraint. He immersed himself in the Vaishnava Rasas, adopting the ecstatic longing of Radha (Madhura Bhava) until tears of divine separation flowed unceasingly. Next, he practiced Islam under the guidance of Govinda Roy, dressing in Muslim garments, reciting the Quran, and offering Namaz five times daily until he experienced the direct vision of the Prophet and merged into the formless Divine. Years later, contemplating an icon of the Madonna and Child, he experienced a dazzling vision of Jesus Christ entering his body, realizing Christ-consciousness. In his physical body, he suffered agonizing throat cancer in his final year at Cossipore garden house, yet while his throat burned, his face radiated ecstatic bliss as he transmitted his spiritual power to his young disciples headed by Narendranath (Swami Vivekananda), commanding them to serve humanity as the living presence of God: 'Shiva Jnane Jiva Seva'.",
    "trialLocal": "श्रीरामकृष्ण परमहंस का जीवन विभिन्न साधना-मार्गो की सत्यता को प्रमाणित करने की ऐतिहासिक प्रयोगशाला था। तोतापुरी जी के मार्गदर्शन में मात्र तीन दिनों में उन्होंने 'निर्विकल्प समाधि' की सर्वोच्च अवस्था प्राप्त की। इसके पश्चात भैरवी ब्राह्मणी से चौंसठ तंत्रों की कठिन साधनाएं कीं, और वैष्णव भाव में राधा रानी के विरह का अनुभव किया।\n\nयही नहीं, उन्होंने इस्लाम की साधना करते हुए नमाज़ पढ़ी और कुरान का पाठ किया, तथा ईसा मसीह का ध्यान करते हुए क्राइस्ट-चेतना का साक्षात्कार किया। जीवन के अंतिम समय में गले के कैंसर के असह्य दर्द के बीच भी वे शिष्यों को आत्म-ज्ञान बांटते रहे। उन्होंने नरेंद्र (स्वामी विवेकानंद) को अपनी समस्त आध्यात्मिक शक्ति समर्पित करते हुए जन-कल्याण हेतु 'शिव ज्ञाने जीव सेवा' (मानव सेवा ही ईश्वर सेवा है) का अमर मंत्र सौंपा।",
    "teaching": "Sri Ramakrishna revealed the timeless truth: 'Joto mat, toto poth'—as many faiths, so many paths to the one Supreme Reality. God is both personal with form (Sakara) and formless non-dual existence (Nirakara), just as water freezes into ice forms and melts back into formless ocean. The ultimate obstacle to spiritual awakening is attachment to lust and greed ('Kamini-Kanchana'); when greed and ego are surrendered, God-realization is instantaneous.",
    "teachingLocal": "श्रीरामकृष्ण ने 'यतो मत, ततो पथ' का अमर संदेश दिया कि विभिन्न धर्म एक ही परमात्मा तक पहुँचने के अलग-अलग मार्ग हैं, जैसे विभिन्न घाटों से एक ही नदी का जल भरा जाता है। ईश्वर साकार भी है और निराकार भी। उन्होंने काम और कांचन (भोग और लोभ) के त्याग को आत्म-साक्षात्कार की अनिवार्य शर्त बताया।",
    "moral": "Sectarian dogmatism is born of ignorance. When one tastes the sweetness of direct divine experience, all religious animosities vanish, leaving only boundless love, universal respect, and selfless service to humanity.",
    "moralLocal": "धर्म के नाम पर होने वाले विवाद अज्ञानता का परिणाम हैं। जब हृदय में ईश्वर का सच्चा प्रेम जागृत होता है, तो समस्त संकीर्णताएं मिट जाती हैं और मनुष्य हर प्राणी में परमात्मा का ही रूप देखता है।",
    "legacy": "Sri Ramakrishna’s teachings, recorded verbatim in the immortal *Sri Sri Ramakrishna Kathamrita* (The Gospel of Sri Ramakrishna) by Mahendranath Gupta (M.), revitalized Hinduism during the colonial era and inspired the global Ramakrishna Math and Ramakrishna Mission founded by Swami Vivekananda, bringing Vedanta to the modern world.",
    "legacyLocal": "श्रीरामकृष्ण परमहंस आधुनिक भारत के आध्यात्मिक पुनर्जागरण के जनक हैं। 'श्री रामकृष्ण कथामृत' विश्व साहित्य का अद्वितीय ग्रंथ है। उनके विचारों से प्रेरित होकर स्वामी विवेकानंद ने 'रामकृष्ण मिशन' की स्थापना की, जिसने विश्व भर में वेदांत और सेवा के दीप प्रज्वलित किए।",
    "source": "Sri Sri Ramakrishna Kathamrita (Mahendranath Gupta / M.), The Gospel of Sri Ramakrishna (Swami Nikhilananda)",
    "sourceLocal": "श्री श्री रामकृष्ण कथामृत (महेंद्रनाथ गुप्त / 'म'), द गॉस्पेल ऑफ श्री रामकृष्ण (स्वामी निखिला Bleaching)",
    "sourceCitations": [
      {
        "sourceName": "Mahendranath Gupta (M.) — Sri Sri Ramakrishna Kathamrita",
        "sourceRef": "Volumes 1–5 (Verbatim Bengali records of Sri Ramakrishna's discourses)",
        "tier": 1
      },
      {
        "sourceName": "Swami Saradananda — Sri Ramakrishna the Great Master (Sri Sri Ramakrishna Lilaprasanga)",
        "sourceRef": "Sadhana Phase and Direct Realization of World Faiths",
        "tier": 1
      }
    ],
    "quote": {
      "text": "As many faiths, so many paths to God; rain water flows through different channels, but all water returns to the ocean.",
      "attribution": "Sri Ramakrishna Paramahamsa — Kathamrita"
    },
    "quoteLocal": {
      "text": "यतो मत, ततो पथ—जितने मत, उतने ही ईश्वर तक पहुँचने के मार्ग हैं।",
      "attribution": "श्रीरामकृष्ण परमहंस (कथामृत)"
    }
  },
  {
    "id": "ramana-maharshi",
    "name": "Ramana Maharshi",
    "nameLocal": "रमण महर्षि",
    "era": "1879 – 1950 CE",
    "eraLocal": "१८७९ – १९५० ई.",
    "tradition": "hindu",
    "region": "Tiruvannamalai, Tamil Nadu",
    "regionLocal": "तिरुवन्नामलाई, तमिलनाडु",
    "emoji": "⛰️",
    "tagline": "The silent sage of Arunachala whose direct self-enquiry ('Who am I?') illuminated the path to effortless Self-realization for the modern world.",
    "taglineLocal": "अरुणाचल के मौन ऋषि जिन्होंने 'मैं कौन हूँ?' की आत्म-विचार पद्धति से समूचे विश्व को सहज आत्म-ज्ञान का मार्ग दिखाया।",
    "journey": "Born as Venkataraman Iyer in the village of Tiruchuzhi in Tamil Nadu to Sundaram Iyer and Azhagammal, he was an ordinary schoolboy with an athletic build and an unusually deep slumber. At age sixteen in July 1896, while sitting alone in an upstairs room of his uncle’s house in Madurai, a sudden, overwhelming fear of death seized him without any physical sickness. Instead of fleeing in panic, the sixteen-year-old youth resolved to face the mystery of death directly. Lying flat upon the floor like a corpse, stiffening his limbs and holding his breath, he entered deep inner inquiry: 'Now death has come. This body is dead, stiff, and will be carried to the cremation ground and burnt to ashes. But with the death of this body, am I dead? Is the body \"I\"?'\n\nIn that blazing moment of intense awareness, he discovered that the physical body, senses, and mental thoughts are merely perishable instruments, while the luminous 'I'-consciousness—the silent Spirit (Atman)—is unborn, immortal, and untouched by physical dissolution. In a single instant, the fear of death dissolved forever, and Venkataraman awakened as a fully liberated Sage (Jivanmukta). Weeks later, feeling the irresistible magnetic pull of Arunachala—the holy mountain revered as the physical form of Lord Shiva—he left three rupees and a note in his room, boarded a train, and arrived at Tiruvannamalai, throwing away his remaining coins, shaving his head, and immersing himself in unbroken absorption in the Self.",
    "journeyLocal": "तमिलनाडु के तिरुचुली गाँव में जन्मे वेंकटरमण मात्र १६ वर्ष के थे, जब मदुरै में अचानक उन्हें मृत्यु का तीव्र भय हुआ। किसी व्याधि के बिना ही उन्होंने मृत्यु का साक्षात करने का निर्णय लिया। वे फर्श पर शव की भांति लेट गए, सांस रोक ली और आत्म-विचार करने लगे: 'यह शरीर मृत हो गया, इसे जला दिया जाएगा; किंतु क्या इस देह के मरने से मैं भी मर गया? क्या मैं यह शरीर हूँ?'\n\nउसी क्षण उनकी चेतना देह से परे हटकर अमर, शाश्वत आत्म-तत्व में स्थिर हो गई। मृत्यु का भय सदा के लिए समाप्त हो गया और वे आत्म-साक्षात्कारी ऋषि बन गए। इसके पश्चात वे पवित्र अरुणाचल पर्वत की पुकार सुनकर तिरुवन्नामलाई आ गए और जीवन भर मौन ध्यान में लीन रहे।",
    "trial": "Arriving at the ancient Arunachaleswara temple, young Venkataraman sat in samadhi in the dark underground cellar known as Patala Lingam to escape noisy crowds. He remained in such deep absorption for months that vermin, ants, and scorpions gnawed into his thighs, drawing blood and pus, yet he remained utterly oblivious to bodily pain until devotees discovered him and carried him to safety. For years, he lived in the Virupaksha and Skandashram caves on the slopes of Arunachala, sitting in luminous silence, draped only in a simple loincloth.\n\nSeekers, scholars, and skeptics from across India and Europe—including Paul Brunton, Arthur Osborne, and Somerset Maugham—traveled to sit at his feet. The Maharshi rarely gave elaborate lectures; his primary teaching was transmitted through the silence of his presence, which quieted the restless minds of visitors like a profound tranquilizer. When asked intellectual questions about heaven, rebirth, or metaphysical cosmos, the Maharshi invariably turned the question back upon the inquirer: 'Who is asking this question? Find out who you are first. The seeker who finds the source of the \"I\" discovers that the questioner and the universe are one non-dual Self.' In his final years, afflicted with painful sarcoma cancer in his arm, he refused to allow surgeons to drug his consciousness, undergoing operations with a serene smile and comforting weeping devotees before his passing in April 1950 with the words: 'They say that I am dying, but where can I go? I am here.'",
    "trialLocal": "अरुणाचल मंदिर के पाताल लिंगम में ध्यानमग्न रहने के दौरान कीड़े और बिच्छू उनके शरीर को नोचते रहे, किंतु उन्हें देह का तनिक भी भान न रहा। वर्षों तक वे विरुपाक्ष गुफा में मौन रहे। देश-विदेश से आने वाले विद्वान और जिज्ञासु केवल उनके सानिध्य में बैठकर ही अपने मन की चंचलता को शांत पाते थे।\n\nजब लोग उनसे ईश्वर, पुनर्जन्म या सृष्टि के विषय में जटिल प्रश्न पूछते, तो वे केवल यही पूछते: 'यह प्रश्न पूछने वाला कौन है? पहले अपने \"मैं\" की खोज करो।' जीवन के अंतिम समय में जब उनकी भुजा में कैंसर का असह्य दर्द था, तब भी वे शांत और मुस्कुराते रहे। भक्तों के रोने पर उन्होंने कहा: 'लोग कहते हैं कि मैं जा रहा हूँ; पर मैं कहाँ जाऊँगा? मैं तो यहीं हूँ।'",
    "teaching": "Bhagavan Sri Ramana Maharshi taught the direct path of Self-Enquiry (Atma-Vichara)—incessantly tracing the root of the individual ego by asking 'Who am I?' (Nan Yar?). The mind is merely a bundle of thoughts orbiting the primary thought of 'I'; when one investigates where this 'I'-thought arises, it sinks back into the spiritual Heart (Hridaya), revealing the Self as pure, unbroken Consciousness.",
    "teachingLocal": "रमण महर्षि ने 'आत्म-विचार' (मैं कौन हूँ?) की सरल और प्रत्यक्ष साधना सिखाई। उन्होंने बताया कि मन केवल विचारों का समूह है जो 'मैं' के विचार के इर्द-गिर्द घूमता है। जब मनुष्य अपने अहम् के स्रोत की खोज करता है, तो मन हृदय में विलीन हो जाता है और केवल शुद्ध आत्मा ही शेष रहती है।",
    "moral": "Peace is not an external commodity to be acquired from without; it is your natural, inherent state when the restless illusion of the ego is dissolved in self-awareness.",
    "moralLocal": "सच्ची शांति संसार की वस्तुओं में नहीं, बल्कि अपने ही भीतर की आत्मा में है। जब मनुष्य मिथ्या अहंकार को छोड़ देता है, तो वह स्वतः ही परमानंद में स्थित हो जाता है।",
    "legacy": "Ramana Maharshi is revered globally as one of the purest embodiments of Advaita Vedanta in human history. His ashram at the foot of Mount Arunachala remains a worldwide sanctuary of silent meditation and spiritual awakening, drawing thousands of contemplative seekers across every continent.",
    "legacyLocal": "महर्षि रमण आधुनिक युग में अद्वैत वेदांत के साक्षात स्वरूप हैं। श्री रमणाश्रम आज भी विश्व भर के आत्म-अन्वेषियों के लिए मौन और शांति का पवित्र केंद्र है, जहाँ उनके विचार साधकों का मार्गदर्शन करते हैं।",
    "source": "Nan Yar? (Who Am I?), Ulladu Narpadu (Forty Verses on Reality), Talks with Sri Ramana Maharshi",
    "sourceLocal": "नान् यार्? (मैं कौन हूँ?), उल्लादु नर्पदु (सद्-दर्शनम्), टॉक्स विद श्री रमण महर्षि",
    "sourceCitations": [
      {
        "sourceName": "Sri Ramana Maharshi — Nan Yar? (Who Am I?)",
        "sourceRef": "Core dialogues on the Self-Enquiry method",
        "tier": 1
      },
      {
        "sourceName": "Sri Ramana Maharshi — Ulladu Narpadu",
        "sourceRef": "Forty Verses on Reality (Sanskrit: Sad-Darshanam)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Your duty is to be, and not to be this or that. 'I am that I am' sums up the whole truth; the method is summed up in 'Be still'.",
      "attribution": "Sri Ramana Maharshi — Talks with Sri Ramana Maharshi"
    },
    "quoteLocal": {
      "text": "तुम्हारा कर्तव्य केवल 'होना' है, यह या वह होना नहीं। 'शांत रहो'—यही समस्त सत्य और साधना का सार है।",
      "attribution": "श्री रमण महर्षि (टॉक्स विद श्री रमण महर्षि)"
    }
  },
  {
    "id": "samarth-ramdas",
    "name": "Samarth Ramdas",
    "nameLocal": "समर्थ रामदास",
    "era": "1608 – 1681 CE",
    "eraLocal": "१६०८ – १६८१ ई.",
    "tradition": "hindu",
    "region": "Jamb & Sajjangad, Maharashtra",
    "regionLocal": "जांब व सज्जनगढ़, महाराष्ट्र",
    "emoji": "🚩",
    "tagline": "The dynamic saint-warrior and preceptor to Shivaji who united Bhakti with physical strength (Bala) and political awakening in the immortal Dasbodh.",
    "taglineLocal": "शिवाजी महाराज के आध्यात्मिक गुरु जिन्होंने 'दास Capitबोध' के माध्यम से भक्ति और शक्ति, साधना और राष्ट्र-जागृति का अद्वितीय समन्वय किया।",
    "journey": "Born as Narayan Suryaji Thosar in the village of Jamb in Maharashtra on Ram Navami day, he was a child of independent spirit and intense contemplative bent. At age twelve, while standing in his own wedding ceremony, the priests chanted the customary Sanskrit wedding warning 'Savadhan!' (Be on guard / Beware!). Taking the word literally as a divine awakening call to beware of the snares of worldly illusion, young Narayan leapt off the marriage pavilion, ran out of the village, and disappeared into the wilderness.\n\nWandering to Panchavati along the sacred Godavari river near Nashik, he undertook twelve grueling years of penance at Takli. Standing in the waist-deep waters of the river every day from dawn until noon, he chanted the thirteen-letter Rama mantra ('Sri Ram Jaya Ram Jaya Jaya Ram') thirteen crore (130 million) times, undertaking rigorous physical exercise (Surya Namaskars) alongside Gayatri japa. Next, Narayan spent twelve years traveling barefoot across the length and breadth of the Indian subcontinent on a nationwide pilgrimage, closely studying the social degradation, political oppression, and cultural decay under foreign sultanates.",
    "journeyLocal": "महाराष्ट्र के जांब गाँव में रामनवमी को जन्मे नारायण ठोसर बाल्यकाल से ही गहन चिंतनशील थे। मात्र १२ वर्ष की आयु में जब विवाह मंडप में पुरोहितों ने 'सावधान!' शब्द का उच्चारण किया, तो उन्होंने इसे ईश्वर का बुलावा समझा और मंडप से छलांग लगाकर भाग निकले।\n\nवे नासिक के निकट टाकली पहुँचे और गोदावरी नदी के जल में खड़े होकर लगातार १२ वर्षों तक 'श्री राम जय राम जय जय राम' का १३ करोड़ जप किया। इसके पश्चात उन्होंने १२ वर्षों तक संपूर्ण भारतवर्ष का पैदल भ्रमण किया और विदेशी आक्रांताओं के अधीन पिसती हुई जनता की दुर्दशा का प्रत्यक्ष अनुभव किया।",
    "trial": "Unlike the passive other-worldly ascetics of his era who preached only patient endurance of suffering, Ramdas recognized that spiritual devotion without physical strength and organizational discipline leads to national subjugation. Returning to Maharashtra, he took the title 'Samarth' (The Capable One) and initiated a revolutionary socio-spiritual revival. He established over 1,200 Akharas (gymnasiums/monasteries) across Maharashtra and southern India, placing a shrine of Sri Hanuman—the symbol of celibacy, physical prowess, and fearless service—in every village. He trained a network of thousands of ascetic youth (Ramdasis) who served as spiritual preceptors by day and intelligence-gathering scouts for the righteous resistance by night.\n\nHis greatest trial lay in awakening the dormant spirit of the people and providing spiritual mentorship to Chhatrapati Shivaji Maharaj. In his monumental Marathi treatise, the *Dasbodh*, composed in the caves of Shivathar Ghal near Raigad, Samarth Ramdas laid down a comprehensive blueprint for practical spirituality, administrative statecraft, physical vigor, and righteous warfare (Kshatradharma). Legend records that when Shivaji Maharaj offered his entire Maratha empire to Ramdas by placing his royal deed inside the saint’s begging bowl at Sajjangad, Ramdas returned the kingdom to Shivaji with the saffron flag (Bhagwa Jhanda), commanding him to rule not as an arrogant monarch, but as a trustee of the Divine: 'This kingdom belongs to God; govern it with righteousness and justice.'",
    "trialLocal": "समर्थ रामदास जी ने देखा कि केवल निष्क्रिय भक्ति से राष्ट्र की रक्षा नहीं हो सकती; भक्ति के साथ शक्ति (बल) का होना अनिवार्य है। उन्होंने महाराष्ट्र भर में १,२०० से अधिक अखाड़े और मठ स्थापित किए और हर गाँव में शक्ति और सेवा के प्रतीक श्री हनुमान जी की मूर्तियाँ स्थापित कीं। उन्होंने हजारों संन्यासियों को संगठित किया जो धर्म-प्रचार के साथ-साथ समाज को जागृत करते थे।\n\nरायगढ़ के निकट शिवथर घल की गुफा में बैठकर उन्होंने 'दासबोध' जैसे युगांतकारी ग्रंथ की रचना की, जिसमें अध्यात्म, राजनीति, व्यवहार-ज्ञान और संगठन-कौशल का अद्भुत समन्वय था। छत्रपति शिवाजी महाराज ने उन्हें अपना गुरु बनाया। जब शिवाजी ने अपना संपूर्ण राज्य समर्थ रामदास के चरणों में समर्पित कर दिया, तो समर्थ ने उन्हें भगवा ध्वज देकर 'धर्म के न्यासी' के रूप में शासन करने की आज्ञा दी।",
    "teaching": "Samarth Ramdas taught the synthesis of 'Harikatha' (devotional reflection) and 'Rajyakarana' (practical action and governance). Bhakti must not degenerate into laziness, fatalism, or weakness; true spirituality demands a vigorous, healthy body, a sharp and practical intellect, organizational discipline, and the willingness to defend Dharma with righteous courage.",
    "teachingLocal": "समर्थ रामदास जी ने सिखाया कि भक्ति का अर्थ कायरता या निष्क्रियता नहीं है। धर्म की रक्षा के लिए बल, बुद्धि और संगठन की आवश्यकता होती है: 'सामर्थ्य आहे चळवळीचे, जो जे करील तयाचे।' उन्होंने 'मराठा तितुका मेळवावा, आपुला महाराष्ट्र धर्म वाढवावा' का नारा देकर समाज को संगठित किया।",
    "moral": "Prayer without practical action is impotent; action without spiritual contemplation is blind. When inner devotion is joined to physical vigor and collective organization, righteousness triumphs over tyranny.",
    "moralLocal": "ईश्वर की भक्ति और राष्ट्र-सेवा एक-दूसरे के पूरक हैं। सच्चा साधु वही है जो केवल अपनी मुक्ति की चिंता न करे, बल्कि समूचे समाज को सशक्त, संगठित और संस्कारित बनाए।",
    "legacy": "Samarth Ramdas’s magnum opus, the *Dasbodh*, and his stirring hymns to Hanuman (Maruti Stotra) and Sri Rama (Manache Shlok) remain daily recitation across millions of Marathi homes. His spiritual guidance provided the moral spine to Chhatrapati Shivaji Maharaj’s Hindavi Swarajya, uniting the people in an indomitable national resurgence.",
    "legacyLocal": "समर्थ रामदास जी का 'दासबोध' और 'मनाचे श्लोक' आज भी घर-घर में प्रेरणा देते हैं। उनका दिया गया मारुति स्तोत्र जन-जन को बल प्रदान करता है। शिवाजी महाराज के साथ उनका संबंध भारतीय इतिहास में गुरु-शिष्य परंपरा और राष्ट्र-निर्माण का स्वर्णिम अध्याय है।",
    "source": "Dasbodh (Samarth Ramdas, 1654 CE), Manache Shlok, Sri Samarth Charitra (Hanumant Swami)",
    "sourceLocal": "दासबोध (समर्थ रामदास, १६५४ ई.), मनाचे श्लोक, श्री समर्थ चरित्र (हनुमंत स्वामी)",
    "sourceCitations": [
      {
        "sourceName": "Samarth Ramdas — Dasbodh",
        "sourceRef": "Dashaka 1–20 (Discourses on Practical Vedanta, Rajadharma, and Devotion)",
        "tier": 1
      },
      {
        "sourceName": "Hanumant Swami — Sri Samarth Charitra",
        "sourceRef": "Historical biography and account of relationship with Shivaji Maharaj",
        "tier": 1
      }
    ],
    "quote": {
      "text": "There is boundless strength in disciplined collective movement; whoever undertakes it with dedication achieves victory.",
      "attribution": "Samarth Ramdas — Dasbodh"
    },
    "quoteLocal": {
      "text": "सामर्थ्य आहे चळवळीचे। जो जे करील तयाचे। परंतु येथे भगवंताचे। अधिष्ठान पाहिजे॥",
      "attribution": "समर्थ रामदास (दासबोध)"
    }
  },
  {
    "id": "guru-arjan-dev",
    "name": "Guru Arjan Dev Ji",
    "nameLocal": "गुरु अर्जन देव जी",
    "namePa": "ਗੁਰੂ ਅਰਜਨ ਦੇਵ ਜੀ",
    "era": "1563 – 1606 CE",
    "eraLocal": "१५६३ – १६०६ ई.",
    "eraPa": "੧੫੬੩ – ੧੬੦੬ ਈ.",
    "tradition": "sikh",
    "region": "Amritsar & Lahore, Punjab",
    "regionLocal": "अमृतसर व लाहौर, पंजाब",
    "regionPa": "ਅੰਮ੍ਰਿਤਸਰ ਤੇ ਲਾਹੌਰ, ਪੰਜਾਬ",
    "emoji": "☬",
    "tagline": "The fifth Sikh Guru, supreme compiler of the Adi Granth and builder of Sri Harmandir Sahib, who bore martyrdom upon burning iron plates with serene love.",
    "taglineLocal": "सिखों के पांचवें गुरु, आदि ग्रंथ के संकलनकर्ता और हरिमंदिर साहिब के निर्माता जिन्होंने तवे पर बैठकर 'तेरा कीआ मीठा लागै' का अमर संदेश दिया।",
    "taglinePa": "ਪੰਜਵੇਂ ਪਾਤਸ਼ਾਹ, ਆਦਿ ਗ੍ਰੰਥ ਦੇ ਸੰਪਾਦਕ ਅਤੇ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੇ ਉਸਰਈਏ ਜਿਨ੍ਹਾਂ ਨੇ ਤੱਤੀ ਤਵੀ 'ਤੇ ਬੈਠ ਕੇ 'ਤੇਰਾ ਕੀਆ ਮੀਠਾ ਲਾਗੈ' ਦਾ ਮਹਾਨ ਸੰਦੇਸ਼ ਦਿੱਤਾ।",
    "journey": "Born in Goindval to Guru Ram Das, the fourth Guru, and Mata Bhani, Arjan Dev was imbued from his youth with profound humility, poetic genius, and spiritual wisdom. Ascending to the Guruship in 1581 as the fifth Sikh Guru, he consolidated the spiritual and social infrastructure of the Sikh faith. He completed the construction of the sacred Sarovar (pool of nectar) and founded Sri Harmandir Sahib (the Golden Temple) in Amritsar. In a historic gesture of universal brotherhood and religious harmony, Guru Arjan Dev invited the venerated Muslim Sufi saint Hazrat Mian Mir of Lahore to lay the foundation stone of Sri Harmandir Sahib, designing the sanctum with four open doors facing all four directions to welcome seekers of every caste, creed, and gender.\n\nHis greatest cultural and spiritual achievement was the compilation of the sacred *Adi Granth* (the foundational scripture of Sikhism) in 1604. Gathering the sacred hymns of the first four Sikh Gurus, composing over 2,200 of his own sublime verses (including the immortal *Sukhmani Sahib*), and incorporating the hymns of fifteen Hindu and Muslim Bhakti saints—such as Kabir, Ravidas, Namdev, Baba Farid, and Jaidev—Guru Arjan Dev created a universal scripture of divine love and human unity, formally installing it within Sri Harmandir Sahib with Bhai Buddha as the first head granthi.",
    "journeyLocal": "गोइंदवाल साहिब में चौथे गुरु रामदास जी और माता भानी जी के यहाँ जन्मे अर्जन देव जी बाल्यकाल से ही अत्यंत विनम्र, विद्वान और शांत स्वभाव के थे। १५८१ में पांचवें गुरु के रूप में प्रतिष्ठित होकर उन्होंने सिख धर्म के आध्यात्मिक और सामाजिक स्वरूप को सुदृढ़ किया। उन्होंने अमृतसर के पवित्र अमृत सरोवर का कार्य पूर्ण कराया और 'श्री हरिमंदिर साहिब' का निर्माण कराया। धार्मिक सौहार्द की अनुपम मिसाल पेश करते हुए गुरु जी ने लाहौर के प्रख्यात सूफी संत हज़रत मियाँ मीर से हरिमंदिर साहिब की नींव रखवाई और चारों दिशाओं में चार द्वार रखे ताकि हर जाति, वर्ग और धर्म का व्यक्ति वहाँ बिना किसी भेदभाव के प्रवेश कर सके।\n\nउनका सबसे महान कार्य १६०४ में 'आदि ग्रंथ' (श्री गुरु ग्रंथ साहिब का मूल स्वरूप) का संकलन था। पहले चार गुरुओं की बाणी के साथ-साथ अपनी २,२१८ बाणियों (जिनमें पावन 'सुखमनी साहिब' प्रमुख है) और १५ हिंदू-मुस्लिम भक्त-कवियों—कबीर, रविदास, नामदेव, बाबा फरीद आदि—की बाणी को एकत्र कर उन्होंने मानवता के लिए प्रेम और एकता का पावन ग्रंथ तैयार किया और बाबा बुड्ढा जी को प्रथम ग्रंथी नियुक्त किया।",
    "journeyPa": "ਸ੍ਰੀ ਗੋਇੰਦਵਾਲ ਸਾਹਿਬ ਵਿਖੇ ਚੌਥੇ ਪਾਤਸ਼ਾਹ ਸ੍ਰੀ ਗੁਰੂ ਰਾਮਦਾਸ ਜੀ ਅਤੇ ਮਾਤਾ ਭਾਨੀ ਜੀ ਦੇ ਗ੍ਰਹਿ ਵਿਖੇ ਪ੍ਰਗਟ ਹੋਏ ਗੁਰੂ ਅਰਜਨ ਦੇਵ ਜੀ ਨੇ ੧੫੮੧ ਵਿਚ ਗੁਰਗੱਦੀ ਸੰਭਾਲੀ। ਆਪ ਜੀ ਨੇ ਸ੍ਰੀ ਅੰਮ੍ਰਿਤਸਰ ਸਾਹਿਬ ਵਿਖੇ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੀ ਉਸਾਰੀ ਕਰਵਾਈ ਅਤੇ ਇਸ ਦੀ ਨੀਂਹ ਮੁਸਲਮਾਨ ਸੂਫ਼ੀ ਸੰਤ ਸਾਈਂ ਮੀਆਂ ਮੀਰ ਜੀ ਪਾਸੋਂ ਰਖਵਾ ਕੇ ਸਰਬ-ਸਾਂਝੀਵਾਲਤਾ ਦਾ ਅਦੁੱਤੀ ਸਬੂਤ ਦਿੱਤਾ। ਚਹੁੰ ਵਰਨਾਂ ਲਈ ਚਾਰੇ ਦਰਵਾਜ਼ੇ ਖੁੱਲ੍ਹੇ ਰੱਖੇ।\n\n੧੬੦੪ ਵਿਚ ਆਪ ਜੀ ਨੇ ਪਹਿਲੇ ਚਾਰ ਗੁਰੂ ਸਾਹਿਬਾਨ, ਭਗਤਾਂ ਅਤੇ ਭੱਟਾਂ ਦੀ ਬਾਣੀ ਨੂੰ ਇਕੱਤਰ ਕਰਕੇ ਪਵਿੱਤਰ 'ਆਦਿ ਗ੍ਰੰਥ' ਸਾਹਿਬ ਜੀ ਦਾ ਸੰਪਾਦਨ ਕੀਤਾ ਅਤੇ ਬਾਬਾ ਬੁੱਢਾ ਜੀ ਨੂੰ ਪਹਿਲੇ ਹੈੱਡ ਗ੍ਰੰਥੀ ਥਾਪ ਕੇ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਵਿਖੇ ਪਹਿਲਾ ਪ੍ਰਕਾਸ਼ ਕੀਤਾ।",
    "trial": "Guru Arjan Dev’s expanding spiritual influence across Punjab aroused bitter jealousy from his elder brother Prithi Chand and venomous hostility from the Mughal courtier Chandu Shah, whose daughter's marriage proposal to the Guru's son Hargobind had been declined. Following the accession of Emperor Jahangir to the Mughal throne in 1605, fundamentalist imperial advisers poisoned the emperor's mind, claiming that the Adi Granth contained verses disrespectful to Islam and accusing the Guru of blessing the rebel prince Khusrau with a saffron mark.\n\nSummoned to the Mughal court in Lahore in May 1606, Jahangir demanded that the Guru alter verses in the Adi Granth and pay an enormous fine of two hundred thousand rupees. Guru Arjan Dev serenely refused, stating: 'The hymns in the Granth are direct revelations from the Creator; not a single syllable can be altered to flatter mortal kings, and money collected from the offerings of the poor cannot be paid as a wrongful fine.' Jahangir ordered the Guru executed under the torturous law of Yasa (death without shedding blood). For five scorching summer days in Lahore, Guru Arjan Dev was subjected to brutal torture: seated on red-hot iron plates while burning sand was poured over his blistered head and body, and boiled alive in cauldrons of water. When his friend Mian Mir arrived in tears and offered to use occult power to destroy the city of Lahore, the Guru comforted him, pointing to the sky and reciting with radiant peace: 'Tera keea meetha laagai, Har naam padharath Nanak maangai' (Sweet is Your will, O Lord; Nanak asks only for the treasure of Your Name). On May 30, 1606, after taking a dip in the cool waters of the Ravi River, the Guru’s luminous soul merged into the eternal Light, becoming the first supreme martyr (Shaheedan-de-Sartaj) of the Sikh faith.",
    "trialLocal": "गुरु अर्जन देव जी के बढ़ते प्रभाव से मुग़ल सम्राट जहाँगीर सशंकित हो उठा। उसने गुरु जी पर विद्रोही राजकुमार खुसरो की सहायता का आरोप लगाया और आदि ग्रंथ में बदलाव करने तथा भारी जुर्माना भरने का आदेश दिया। गुरु जी ने स्पष्ट कहा कि बाणी साक्षात ईश्वर की वाणी है, उसका एक अक्षर भी नहीं बदला जा सकता और न ही संगतों के धन से अन्यायपूर्ण जुर्माना दिया जाएगा।\n\nजहाँगीर के आदेश पर लाहौर में जेठ की तपती दोपहरी में गुरु जी को अमानवीय यातनाएं दी गईं। उन्हें जलते हुए लाल लोहे के तवे पर बैठाया गया, उनके शीश पर खौलती हुई गर्म रेत डाली गई और उबलते पानी की देग में उबाला गया। जब सूफी संत मियाँ मीर ने रोते हुए लाहौर को श्राप देने की बात कही, तो गुरु जी ने शांत भाव से मुस्कुराते हुए कहा: 'तेरा कीआ मीठा लागै, हरि नामु पदारथु नानकु मांगै।' ३० मई १६०६ को रावी नदी के पावन जल में स्नान करने के पश्चात उनका पावन प्रकाश परमात्मा में लीन हो गया। वे सिख धर्म के 'शहीदों के सरताज' बने।",
    "trialPa": "ਮੁਗ਼ਲ ਬਾਦਸ਼ਾਹ ਜਹਾਂਗੀਰ ਨੇ ਗੁਰੂ ਸਾਹਿਬ ਨੂੰ ਆਦਿ ਗ੍ਰੰਥ ਵਿਚ ਤਬਦੀਲੀ ਕਰਨ ਅਤੇ ਜੁਰਮਾਨਾ ਭਰਨ ਦਾ ਹੁਕਮ ਦਿੱਤਾ। ਗੁਰੂ ਸਾਹਿब ਨੇ ਸ਼ਬਦ ਵਿਚ ਕਿਸੇ ਕਿਸਮ ਦੀ ਤਬਦੀਲੀ ਕਰਨ ਤੋਂ ਸਾਫ਼ ਇਨਕਾਰ ਕਰ ਦਿੱਤਾ। ਜਹਾਂਗੀਰ ਦੇ ਹੁਕਮ 'ਤੇ ਲਾਹੌਰ ਵਿਖੇ ਜੇਠ ਦੀ ਤਪਦੀ ਧੁੱਪ ਵਿਚ ਗੁਰੂ ਜੀ ਨੂੰ ਤੱਤੀ ਤਵੀ 'ਤੇ ਬਿਠਾਇਆ ਗਿਆ, ਸੀਸ 'ਤੇ ਤੱਤੀ ਰੇਤ ਪਾਈ ਗਈ ਅਤੇ ਉਬਲਦੀਆਂ ਦੇਗਾਂ ਵਿਚ ਉਬਾਲਿਆ ਗਿਆ।\n\nਸਾਈਂ ਮੀਆਂ ਮੀਰ ਜੀ ਜਦੋਂ ਇਹ ਤਸ਼ੱਦਦ ਦੇਖ ਕੇ ਵਿਆਕੁਲ ਹੋਏ, ਤਾਂ ਗੁਰੂ ਸਾਹਿਬ ਨੇ ਉਹਨਾਂ ਨੂੰ ਸ਼ਾਂਤ ਰਹਿਣ ਦਾ ਉਪਦੇਸ਼ ਦਿੰਦਿਆਂ ਫ਼ੁਰਮਾਇਆ: 'ਤੇਰਾ ਕੀਆ ਮੀਠਾ ਲਾਗੈ, ਹਰਿ ਨਾਮੁ ਪਦਾਰਥੁ ਨਾਨਕੁ ਮਾਂਗੈ'। ੩੦ ਮਈ ੧੬੦੬ ਨੂੰ ਰਾਵੀ ਦਰਿਆ ਵਿਚ ਇਸ਼ਨਾਨ ਕਰਕੇ ਆਪ ਜੀ ਜੋਤੀ-ਜੋਤਿ ਸਮਾ ਗਏ ਅਤੇ 'ਸ਼ਹੀਦਾਂ ਦੇ ਸਿਰਤਾਜ' ਅਖਵਾਏ।",
    "teaching": "Guru Arjan Dev Ji taught the ultimate doctrine of accepting the Divine Will with sweet serenity (Bhana Mannana). Suffering and joy are both gifts from the Creator; when the mind is anchored in the nectar of the Divine Name, the fire of worldly agony cannot burn the immortal spirit. He established the necessity of righteous sacrifice to awaken moral conscience against tyrannical authority.",
    "teachingLocal": "गुरु अर्जन देव जी ने 'भाणा मंनणा' (ईश्वर की रज़ा को मीठा मानना) का सर्वोच्च दर्शन सिखाया। सुख और दुख दोनों ही परमात्मा के विधान हैं; जो मनुष्य प्रभु के नाम में लीन रहता है, संसार की कोई भी अग्नि उसकी आत्मा को विचलित नहीं कर सकती। उन्होंने सिखाया कि धर्म और सत्य के लिए शांत रहकर सर्वोच्च बलिदान देना ही सबसे बड़ा शौर्य है।",
    "teachingPa": "ਗੁਰੂ ਅਰਜਨ ਦੇਵ ਜੀ ਨੇ ਪ੍ਰਮਾਤਮਾ ਦੇ ਭਾਣੇ ਨੂੰ ਮਿੱਠਾ ਕਰਕੇ ਮੰਨਣ ਦਾ ਮਹਾਨ ਸਿਧਾਂਤ ਦ੍ਰਿੜ੍ਹ ਕਰਵਾਇਆ। ਆਪ ਜੀ ਨੇ ਸਿਖਾਇਆ ਕਿ ਧਰਮ ਅਤੇ ਸੱਚ ਦੀ ਖ਼ਾਤਰ ਸ਼ਾਂਤ ਰਹਿ ਕੇ ਸ਼ਹਾਦਤ ਦੇਣਾ ਜ਼ੁਲਮ ਦੀਆਂ ਜੜ੍ਹਾਂ ਨੂੰ ਹਿਲਾ ਦਿੰਦਾ ਹੈ। ਨਾਮ ਦੀ ਕਮਾਈ ਹੀ ਜੀਵਨ ਦਾ ਅਸਲ ਧਨ ਹੈ।",
    "moral": "Physical torture cannot conquer a soul grounded in divine love. Peace is not the absence of suffering, but the absolute surrender to truth that transforms martyrdom into an eternal victory.",
    "moralLocal": "सत्य और ईश्वर-प्रेम में लीन आत्मा को कोई भी शारीरिक प्रताड़ना पराजित नहीं कर सकती। धर्म की रक्षा हेतु दिया गया निःस्वार्थ बलिदान इतिहास का रुख मोड़ देता है।",
    "moralPa": "ਸਰੀਰਕ ਕਸ਼ਟ ਆਤਮਿਕ ਸ਼ਾਂਤੀ ਨੂੰ ਭੰਗ ਨਹੀਂ ਕਰ ਸਕਦੇ। ਸੱਚ 'ਤੇ ਪਹਿਰਾ ਦਿੰਦਿਆਂ ਜਾਨ ਵਾਰ ਦੇਣਾ ਕਾਇਰਤਾ ਨਹੀਂ, ਸਗੋਂ ਚੜ੍ਹਦੀ ਕਲਾ ਦੀ ਸਿਖ਼ਰ ਹੈ।",
    "legacy": "Guru Arjan Dev’s martyrdom was the decisive turning point in Sikh history. It led his son and successor, Guru Hargobind, to don the twin swords of Miri and Piri (temporal power and spiritual authority) and build the Akal Takht, transforming the Sikh community into saint-soldiers. The *Guru Granth Sahib*, which he compiled with monumental devotion, remains the eternal living Guru of millions across the earth.",
    "legacyLocal": "गुरु अर्जन देव जी का बलिदान सिख इतिहास का युगांतकारी मोड़ था। इसी बलिदान ने आगे चलकर 'मीरी और पीरी' की दो तलवारें धारण करने और अकाल तख्त की स्थापना की नींव रखी। उनके द्वारा संकलित 'श्री गुरु ग्रंथ साहिब' आज विश्व भर के सिखों के शाश्वत प्रकाश-स्तंभ हैं।",
    "legacyPa": "ਗੁਰੂ ਸਾਹਿਬ ਦੀ ਲਾਸਾਨੀ ਸ਼ਹਾਦਤ ਨੇ ਸਿੱਖ ਕੌਮ ਨੂੰ ਨਵਾਂ ਮੋੜ ਦਿੱਤਾ। ਛੇਵੇਂ ਪਾਤਸ਼ਾਹ ਗੁਰੂ ਹਰਿਗੋਬਿੰਦ ਸਾਹਿਬ ਜੀ ਨੇ ਮੀਰੀ ਅਤੇ ਪੀਰੀ ਦੀਆਂ ਦੋ ਤਲਵਾਰਾਂ ਧਾਰਨ ਕਰਕੇ ਸ੍ਰੀ ਅਕਾਲ ਤਖ਼ਤ ਸਾਹਿਬ ਦੀ ਸਿਰਜਣਾ ਕੀਤੀ। ਆਪ ਜੀ ਦੁਆਰਾ ਸੰਪਾਦਿਤ 'ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ' ਸਦਾ ਲਈ ਮਨੁੱਖਤਾ ਦਾ ਚਾਨਣ-ਮੁਨਾਰਾ ਹਨ।",
    "source": "Sri Guru Granth Sahib (Sukhmani Sahib), Tuzuk-i-Jahangiri (Memoirs of Emperor Jahangir), Sri Gur Pratap Suraj Granth",
    "sourceLocal": "श्री गुरु ग्रंथ साहिब (सुखमनी साहिब), तुज़ुक-ए-जहाँगीरी (सम्राट जहाँगीर के संस्मरण), श्री गुर प्रताप सूरज ग्रंथ",
    "sourcePa": "ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ (ਸੁਖਮਨੀ ਸਾਹਿਬ), ਤੁਜ਼ਕ-ਏ-ਜਹਾਂਗੀਰੀ (ਬਾਦਸ਼ਾਹ ਜਹਾਂਗੀਰ ਦੀ ਆਤਮਕਥਾ), ਸ੍ਰੀ ਗੁਰ ਪ੍ਰਤਾਪ ਸੂਰਜ ਗ੍ਰੰਥ",
    "sourceCitations": [
      {
        "sourceName": "Sri Guru Granth Sahib",
        "sourceRef": "Angs 394 & 262–296 (Gauri Sukhmani Mahalla 5 & Rag Asa)",
        "tier": 1
      },
      {
        "sourceName": "Emperor Jahangir — Tuzuk-i-Jahangiri (Memoirs)",
        "sourceRef": "Imperial decrees on Guru Arjan Dev at Lahore (1606 CE)",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Sweet is Your will, O Lord; Nanak asks only for the treasure of Your holy Name.",
      "attribution": "Guru Arjan Dev Ji — Sri Guru Granth Sahib, Ang 394"
    },
    "quoteLocal": {
      "text": "तेरा कीआ मीठा लागै। हरि नामु पदारथु नानकु मांगै॥",
      "attribution": "गुरु अर्जन देव जी (श्री गुरु ग्रंथ साहिब, अंग ३९४)"
    },
    "quotePa": {
      "text": "ਤੇਰਾ ਕੀਆ ਮੀਠਾ ਲਾਗੈ ॥ ਹਰਿ ਨਾਮੁ ਪਦਾਰਥੁ ਨਾਨਕੁ ਮਾਂਗੈ ॥",
      "attribution": "ਸ੍ਰੀ ਗੁਰੂ ਅਰਜਨ ਦੇਵ ਜੀ (ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ, ਅੰਗ ੩੯੪)"
    }
  },
  {
    "id": "mai-bhago",
    "name": "Mai Bhago",
    "nameLocal": "माई भागो",
    "namePa": "ਮਾਈ ਭਾਗੋ",
    "era": "Early 18th Century CE",
    "eraLocal": "१८वीं शताब्दी का पूर्वार्ध",
    "eraPa": "੧੮ਵੀਂ ਸਦੀ ਦਾ ਪਹਿਲਾ ਅੱਧ",
    "tradition": "sikh",
    "region": "Jhabal, Majha & Muktsar",
    "regionLocal": "झबाल, माझा व मुक्तसर",
    "regionPa": "ਝਬਾਲ, ਮਾਝਾ ਤੇ ਮੁਕਤਸਰ",
    "emoji": "⚔️",
    "tagline": "The fearless warrior-lioness of Punjab who rallied forty deserters, led them back to Guru Gobind Singh, and fought heroically at the Battle of Muktsar.",
    "taglineLocal": "पंजाब की वीरांगना शेरनी जिन्होंने चालीस बेदावा लिख चुके सिखों को ललकार कर पुनः गुरु चरणों में खड़ा किया और मुक्तसर के रण में अदम्य पराक्रम दिखाया।",
    "taglinePa": "ਮਾਝੇ ਦੀ ਉਹ ਦਲੇਰ ਸ਼ੇਰਨੀ ਜਿਨ੍ਹਾਂ ਨੇ ਬੇਦਾਵਾ ਲਿਖ ਕੇ ਆਏ ਚਾਲੀ ਸਿੰਘਾਂ ਨੂੰ ਵੰਗਾਰਿਆ ਅਤੇ ਖ਼ਿਦਰਾਣੇ ਦੀ ਢਾਬ 'ਤੇ ਮੁਗ਼ਲ ਫ਼ੌਜਾਂ ਦੇ ਆਹੂ ਲਾਹੇ।",
    "journey": "Born as Bhag Kaur in the village of Jhabal Kalan in the Majha region of Punjab to Bhai Malo Shah, she was raised in a devout family of Dhillon Jatts who had served the Sikh Gurus for generations. Imbued with deep spiritual devotion and trained by her father in horse-riding, archery, and swordsmanship, young Bhag Kaur lived in continuous contemplation of the divine mission of Guru Gobind Singh Ji.\n\nHer defining moment arrived in late 1705 during the prolonged, agonizing eight-month Siege of Anandpur Sahib. With food, water, and ammunition exhausted, forty Sikhs from the Majha region lost their resolve, signed a formal disclaimer (Bedawa)—declaring 'Tusi sade guru nahi, te asi tuhade sikh nahi' (You are no longer our Guru, and we are no longer your Sikhs)—and abandoned the fort to return to their villages. When these forty men reached Majha, Mai Bhago stood before them in fury and shame. She cast down her bangles at their feet, thundering: 'If you have deserted the Tenth Master in his hour of greatest trial, put on our glass bangles and sit at home grinding grain, while we women take your swords and ride into battle for our Guru!' Her piercing rebuke ignited the sleeping conscience of the forty men; weeping in repentance, they begged her to lead them back to the Guru.",
    "journeyLocal": "पंजाब के माझा क्षेत्र के झबाल कलां गाँव में जन्मी भाग कौर बाल्यकाल से ही घुड़सवारी और तलवारबाजी में निपुण थीं। उनका परिवार पीढ़ियों से सिख गुरुओं का अनन्य सेवक था।\n\n१७०५ में जब आनंदपुर साहिब के आठ महीने लंबे घेरे के दौरान भुखमरी से तंग आकर माझा के चालीस सिखों ने गुरु गोबिंद सिंह जी को 'बेदावा' (त्यागपत्र) लिखकर दे दिया कि 'न आप हमारे गुरु, न हम आपके सिख' और वे घर लौट आए, तब माई भागो का स्वाभिमान जाग उठा। उन्होंने उन चालीस सिखों को ललकारते हुए अपनी चूड़ियाँ उनके आगे फेंक दीं और कहा: 'यदि तुम विपत्ति में दशमेश पिता का साथ छोड़कर आ गए हो, तो ये चूड़ियाँ पहन लो और घर में चूल्हा फूंको; हम स्त्रियाँ तुम्हारी तलवारें लेकर गुरु के लिए रणभूमि में जाएंगी!' इस ललकार ने उन वीरों की सोई हुई चेतना को झकझोर दिया और वे पश्चाताप करते हुए माई भागो के नेतृत्व में गुरु जी की खोज में चल पड़े।",
    "journeyPa": "ਪਿੰਡ ਝਬਾਲ ਕਲਾਂ ਵਿਖੇ ਜਨਮੀ ਭਾਗ ਕੌਰ ਜੀ ਬਚਪਨ ਤੋਂ ਹੀ ਸ਼ਸਤਰ ਵਿੱਦਿਆ ਵਿਚ ਪ੍ਰਬੀਨ ਅਤੇ ਗੁਰੂ ਘਰ ਦੀ ਅਨਿੰਨ ਸੇਵਕ ਸਨ। ੧੭੦੫ ਵਿਚ ਜਦੋਂ ਅਨੰਦਪੁਰ ਸਾਹਿਬ ਦੇ ਘੇਰੇ ਦੌਰਾਨ ਚਾਲੀ ਸਿੰਘ ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ ਨੂੰ 'ਬੇਦਾਵਾ' ਲਿਖ ਕੇ ਘਰ ਆ ਗਏ, ਤਾਂ ਮਾਈ ਭਾਗੋ ਨੇ ਉਹਨਾਂ ਨੂੰ ਲਾਹਣਤਾਂ ਪਾਈਆਂ।\n\nਮਾਈ ਭਾਗੋ ਨੇ ਵੰਗਾਰਦਿਆਂ ਕਿਹਾ ਕਿ ਜੇਕਰ ਤੁਸੀਂ ਦਸਮੇਸ਼ ਪਿਤਾ ਨੂੰ ਛੱਡ ਆਏ ਹੋ ਤਾਂ ਚੂੜੀਆਂ ਪਹਿਨ ਕੇ ਘਰ ਬੈਠੋ, ਅਸੀਂ ਲੜਨ ਜਾਵਾਂਗੀ। ਇਸ ਵੰਗਾਰ ਨੇ ਸਿੰਘਾਂ ਦੇ ਹਿਰਦੇ ਵਲੂੰਧਰ ਦਿੱਤੇ ਅਤੇ ਉਹ ਮਾਈ ਭਾਗੋ ਦੀ ਅਗਵਾਈ ਹੇਠ ਮੁੜ ਗੁਰੂ ਜੀ ਕੋਲ ਜਾਣ ਲਈ ਤਿਆਰ ਹੋ ਗਏ।",
    "trial": "Donning warrior armor, tying a dastar (turban), wielding a heavy lance, and mounting a warhorse, Mai Bhago led the forty repentant warriors across Punjab in search of Guru Gobind Singh. In December 1705, they located the Mughal imperial army under Wazir Khan advancing rapidly toward Khidrana di Dhab to capture the Guru. Realizing that the Guru was nearby and vulnerable on the sand dunes, Mai Bhago ordered her warriors to spread white cloths over desert bushes to deceive the Mughal scouts into believing a massive army lay in wait.\n\nAt Khidrana (now Sri Muktsar Sahib), the forty Sikhs and Mai Bhago engaged the ten-thousand-strong Mughal army in desperate, savage hand-to-hand combat under scorching desert sun. Mai Bhago charged into the enemy lines like an avatar of Durga, wielding her lance and saber, cutting down dozens of Mughal soldiers while being wounded multiple times. The forty Sikhs fought with such demonic fury that the thirsty, exhausted imperial army believed they had clashed with an entire vanguard and retreated in disorder. Following the battle, Guru Gobind Singh walked across the blood-soaked battlefield, wiping the faces of the fallen martyrs with his robe and naming them the 'Chali Mukte' (the Forty Liberated Ones). Finding their leader Mahan Singh breathing his last, the Guru granted his dying request: tearing up the Bedawa document and restoring their spiritual union with the Guru forever. The Guru then tended to the severely wounded Mai Bhago, dressing her wounds with his own hands and blessing her courage.",
    "trialLocal": "माई भागो ने पगड़ी बांधी, तलवार उठाई और घोड़े पर सवार होकर उन चालीस योद्धाओं का नेतृत्व किया। खिदराना के मैदान में जब वज़ीर ख़ान की विशाल मुग़ल सेना गुरु जी को पकड़ने आ रही थी, तब माई भागो और उन चालीस सिखों ने मुग़लों पर अचानक भीषण आक्रमण कर दिया।\n\nमाई भागो ने रणचंडी का रूप धरकर शत्रुओं के छक्के छुड़ा दिए। गंभीर रूप से घायल होने के बावजूद वे अंतिम सांस तक लड़ती रहीं। उन चालीस वीरों ने ऐसा पराक्रम दिखाया कि मुग़ल सेना मैदान छोड़कर भाग गई। युद्ध के पश्चात जब गुरु गोबिंद सिंह जी रणभूमि में आए, तो उन्होंने भाई महाँ सिंह की अंतिम इच्छा पर अपनी जेब से वह 'बेदावा' निकालकर फाड़ दिया और उन चालीस वीरों को 'चालीस मुक्तों' (मुक्ति प्राप्त करने वाले) की उपाधि दी। गुरु जी ने घायल माई भागो का स्वयं उपचार किया और उनके साहस की सराहना की।",
    "trialPa": "ਮਾਈ ਭਾਗੋ ਨੇ ਖ਼ੁਦ ਸ਼ਸਤਰ ਸਜਾਏ, ਘੋੜੇ 'ਤੇ ਸਵਾਰ ਹੋ ਕੇ ਚਾਲੀ ਸਿੰਘਾਂ ਦੀ ਅਗਵਾਈ ਕੀਤੀ ਅਤੇ ਖ਼ਿਦਰਾਣੇ ਦੀ ਢਾਬ 'ਤੇ ਮੁਗ਼ਲ ਫ਼ੌਜਾਂ ਦਾ ਰਾਹ ਰੋਕ ਲਿਆ। ਉਹਨਾਂ ਨੇ ਮੈਦਾਨ-ਏ-ਜੰਗ ਵਿਚ ਅਜਿਹਾ ਜੌਹਰ ਦਿਖਾਇਆ ਕਿ ਮੁਗ਼ਲ ਫ਼ੌਜਾਂ ਪੈਰ ਛੱਡ ਗਈਆਂ।\n\nਸਾਰੇ ਚਾਲੀ ਸਿੰਘ ਸ਼ਹੀਦ ਹੋ ਗਏ ਪਰ ਗੁਰੂ ਸਾਹਿਬ 'ਤੇ ਆਂਚ ਨਾ ਆਉਣ ਦਿੱਤੀ। ਦਸਮੇਸ਼ ਪਿਤਾ ਨੇ ਭਾਈ ਮਹਾਂ ਸਿੰਘ ਦੀ ਅੰਤਿਮ ਬੇਨਤੀ 'ਤੇ ਬੇਦਾਵਾ ਪਾੜ ਕੇ ਉਹਨਾਂ ਨੂੰ 'ਚਾਲੀ ਮੁਕਤਿਆਂ' ਦਾ ਦਰਜਾ ਦਿੱਤਾ। ਗੁਰੂ ਸਾਹਿਬ ਨੇ ਜ਼ਖ਼ਮੀ ਮਾਈ ਭਾਗੋ ਦਾ ਖ਼ੁਦ ਮਲ੍ਹਮ-ਪੱਟੀ ਕਰਕੇ ਇਲਾਜ ਕੀਤਾ।",
    "teaching": "Mai Bhago shattered the traditional shackles of patriarchal confinement, revealing that courage, honor, and martial leadership belong equally to women. When men falter in their spiritual duty, righteous women must step forward to lead, inspire, and defend the truth with unflinching bravery.",
    "teachingLocal": "माई भागो ने सिद्ध किया कि शौर्य और धर्म-रक्षा केवल पुरुषों का दायित्व नहीं है; आवश्यकता पड़ने पर नारी चंडी बनकर समाज और धर्म की रक्षा कर सकती है। जब पुरुष अपने कर्तव्य से विमुख हो जाएं, तो नारी को उनका मार्गदर्शक बनकर नेतृत्व करना चाहिए।",
    "teachingPa": "ਮਾਈ ਭਾਗੋ ਨੇ ਸਾਬਤ ਕੀਤਾ ਕਿ ਸਿੱਖ ਧਰਮ ਵਿਚ ਇਸਤਰੀ ਕੇਵਲ ਘਰ ਦੀ ਚਾਰਦੀਵਾਰੀ ਤੱਕ ਸੀਮਤ ਨਹੀਂ, ਸਗੋਂ ਜੰਗ ਦੇ ਮੈਦਾਨ ਵਿਚ ਜਰਨੈਲੀ ਕਰਨ ਦੇ ਸਮਰੱਥ ਹੈ। ਅਣਖ ਅਤੇ ਗ਼ੈਰਤ ਦੀ ਰਾਖੀ ਕਰਨਾ ਹਰ ਜੀਵ ਦਾ ਫ਼ਰਜ਼ ਹੈ।",
    "moral": "Guilt and mistakes are redeemed through courageous action and sincere repentance. A single resolute soul can revive the dormant valor of an entire community and turn despair into eternal glory.",
    "moralLocal": "गलतियाँ सुधारी जा सकती हैं यदि पश्चाताप सच्चा हो। आत्मसम्मान की एक पुकार पूरे समाज की सोई हुई चेतना को जगा सकती है और कायरता को अमर बलिदान में बदल सकती है।",
    "moralPa": "ਸੱਚੇ ਦਿਲੋਂ ਕੀਤਾ ਪਛਤਾਵਾ ਮਨੁੱਖ ਨੂੰ ਮੁੜ ਸੁਰਖ਼ਰੂ ਕਰ ਦਿੰਦਾ ਹੈ। ਦ੍ਰਿੜ੍ਹ ਇਰਾਦੇ ਵਾਲੀ ਇੱਕ ਔਰਤ ਵੀ ਸਮੁੱਚੀ ਕੌਮ ਦਾ ਰੁਖ਼ ਮੋੜ ਸਕਦੀ ਹੈ।",
    "legacy": "Mai Bhago stands as the premier martial heroine of Sikh history, revered as a warrior-saint (Kaur). Following the Battle of Muktsar, she remained in the personal bodyguard of Guru Gobind Singh Ji, traveling with him to Nanded (Hazur Sahib), where her residence (Tap Asthan) at Jinwada stands as a sacred site of contemplation. Her valor is celebrated annually at the sacred festival of Maghi Mela in Muktsar.",
    "legacyLocal": "माई भागो सिख इतिहास की अमर वीरांगना हैं। वे जीवन भर गुरु गोबिंद सिंह जी के अंग-रक्षकों में शामिल रहीं और नांदेड़ (हजूर साहिब) तक उनके साथ गईं। मुक्तसर की पावन भूमि पर माघी मेला प्रतिवर्ष उनके और चालीस मुक्तों के बलिदान की स्मृति में मनाया जाता है।",
    "legacyPa": "ਮਾਈ ਭਾਗੋ ਸਿੱਖ ਇਤਿਹਾਸ ਦੀ ਅਮਰ ਨਾਇਕਾ ਹਨ। ਉਹ ਹਜ਼ੂਰ ਸਾਹਿਬ ਨਾਂਦੇੜ ਤੱਕ ਗੁਰੂ ਸਾਹਿਬ ਦੇ ਨਾਲ ਰਹੇ। ਸ੍ਰੀ ਮੁਕਤਸਰ ਸਾਹਿਬ ਵਿਖੇ ਮਾਘੀ ਦਾ ਮੇਲਾ ਹਰ ਸਾਲ ਚਾਲੀ ਮੁਕਤਿਆਂ ਅਤੇ ਮਾਈ ਭਾਗੋ ਦੀ ਲਾਸਾਨੀ ਸ਼ਹਾਦਤ ਦੀ ਯਾਦ ਦਿਵਾਉਂਦਾ ਹੈ।",
    "source": "Prachin Panth Prakash (Rattan Singh Bhangu), Sri Gur Pratap Suraj Granth (Kavi Santokh Singh), Mahan Kosh",
    "sourceLocal": "प्राचीन पंथ प्रकाश (रतन सिंह भंगू), श्री गुर प्रताप सूरज ग्रंथ (कवि संतोख सिंह), महान कोश (भाई काह्न सिंह नाभा)",
    "sourcePa": "ਪ੍ਰਾਚੀਨ ਪੰਥ ਪ੍ਰਕਾਸ਼ (ਰਤਨ ਸਿੰਘ ਭੰਗੂ), ਸ੍ਰੀ ਗੁਰ ਪ੍ਰਤਾਪ ਸੂਰਜ ਗ੍ਰੰਥ (ਕਵੀ ਸੰਤੋਖ ਸਿੰਘ), ਮਹਾਨ ਕੋਸ਼ (ਭਾਈ ਕਾਨ੍ਹ ਸਿੰਘ ਨਾਭਾ)",
    "sourceCitations": [
      {
        "sourceName": "Rattan Singh Bhangu — Prachin Panth Prakash",
        "sourceRef": "Episode of Mai Bhago and the Battle of Khidrana (Muktsar)",
        "tier": 1
      },
      {
        "sourceName": "Bhai Kahn Singh Nabha — Mahan Kosh",
        "sourceRef": "Entry on Mai Bhago and the 40 Mukte",
        "tier": 1
      }
    ],
    "quote": {
      "text": "If you have turned your backs on the Guru, wear our bangles and sit at home; we shall take your swords and ride to defend the Tenth Master!",
      "attribution": "Mai Bhago to the Forty Deserters at Jhabal (1705 CE)"
    },
    "quoteLocal": {
      "text": "यदि तुम गुरु जी का साथ छोड़ आए हो तो हमारी चूड़ियाँ पहन लो; हम तुम्हारी तलवारें लेकर दशमेश पिता की रक्षा हेतु जाएँगी!",
      "attribution": "माई भागो (१७०५ ई.)"
    },
    "quotePa": {
      "text": "ਜੇ ਤੁਸੀਂ ਗੁਰੂ ਸਾਹਿਬ ਨੂੰ ਛੱਡ ਕੇ ਆਏ ਹੋ ਤਾਂ ਚੂੜੀਆਂ ਪਾ ਕੇ ਘਰ ਬੈਠੋ; ਅਸੀਂ ਸ਼ਸਤਰ ਪਹਿਨ ਕੇ ਦਸਮੇਸ਼ ਪਿਤਾ ਦੇ ਚਰਨਾਂ ਵਿਚ ਜਾਵਾਂਗੀਆਂ!",
      "attribution": "ਮਾਈ ਭਾਗੋ (੧੭੦੫ ਈ.)"
    }
  },
  {
    "id": "mata-gujri",
    "name": "Mata Gujri Ji",
    "nameLocal": "माता गुजरी जी",
    "namePa": "ਮਾਤਾ ਗੁਜਰੀ ਜੀ",
    "era": "1624 – 1705 CE",
    "eraLocal": "१६२४ – १७०५ ई.",
    "eraPa": "੧੬੨੪ – ੧੭੦੫ ਈ.",
    "tradition": "sikh",
    "region": "Kartarpur, Anandpur Sahib & Sirhind",
    "regionLocal": "करतारपुर, आनंदपुर साहिब व सरहिंद",
    "regionPa": "ਕਰਤਾਰਪੁਰ, ਅਨੰਦਪੁਰ ਸਾਹਿਬ ਤੇ ਸਰਹਿੰਦ",
    "emoji": "🏰",
    "tagline": "The venerable matriarch of the Khalsa—wife of a martyr Guru, mother of a martyr Guru, and grandmother to four martyr Sahibzade—who stood resolute in the Cold Tower of Sirhind.",
    "taglineLocal": "शहीद गुरु की पत्नी, शहीद गुरु की माता और चार बलिदानी साहिबजादों की दादी जिन्होंने सरहिंद के ठंडे बुर्ज में अदम्य आत्म-बल का परिचय दिया।",
    "taglinePa": "ਸ਼ਹੀਦ ਗੁਰੂ ਦੇ ਮਹਿਲ, ਸ਼ਹੀਦ ਗੁਰੂ ਦੇ ਮਾਤਾ ਅਤੇ ਚਾਰ ਸਾਹਿਬਜ਼ਾਦਿਆਂ ਦੀ ਦਾਦੀ ਜਿਨ੍ਹਾਂ ਨੇ ਸਰਹਿੰਦ ਦੇ ਠੰਡੇ ਬੁਰਜ ਵਿਚ ਸਿਦਕ ਦੀ ਅਦੁੱਤੀ ਮਿਸਾਲ ਕਾਇਮ ਕੀਤੀ।",
    "journey": "Born in Kartarpur (Jalandhar district) to Bhai Lal Chand Subhikkhi and Mata Bishan Kaur, Mata Gujri was married in 1632 to the ninth Sikh Guru, Tegh Bahadur. For over three decades, she lived with her husband in serene contemplation during his quiet, solitary sadhana at Baba Bakala. Accompanying him on extensive missionary journeys across eastern India, she gave birth to the tenth Guru, Gobind Rai, in Patna Sahib in 1666.\n\nMata Gujri was the bedrock of fortitude during the formative crises of the Sikh faith. In 1675, when her husband Guru Tegh Bahadur departed for Delhi to offer his life to protect the freedom of religion, she blessed his supreme sacrifice with quiet dignity and steely spiritual composure. Following his martyrdom, she guided her young nine-year-old son Guru Gobind Singh as he assumed leadership of the Panth, supervising the administration and defense of Anandpur Sahib and instilling in the young Sahibzade the immortal values of fearlessness, truth, and dedication to the Guru's mission.",
    "journeyLocal": "करतारपुर में जन्मी माता गुजरी जी का विवाह १६३२ में नौवें गुरु तेग बहादुर जी के साथ हुआ। उन्होंने बाबा बकाला में गुरु जी के साथ वर्षों तक शांत साधना का जीवन बिताया। पूर्वी भारत की यात्राओं के दौरान १६६६ में पटना साहिब में उन्होंने दशमेश पिता गुरु गोबिंद सिंह जी को जन्म दिया।\n\n१६७५ में जब गुरु तेग बहादुर जी कश्मीरी पंडितों के धर्म की रक्षा हेतु दिल्ली में शहादत देने गए, तो माता गुजरी जी ने धैर्य और आध्यात्मिक गरिमा के साथ उन्हें विदा किया। पति की शहादत के बाद उन्होंने नौ वर्ष के बालक गोबिंद राय का मार्गदर्शन किया और चारों साहिबजादों को धर्म-निष्ठा, शौर्य और त्याग के संस्कारों से सिंचित किया।",
    "journeyPa": "ਕਰਤਾਰਪੁਰ ਵਿਖੇ ਜਨਮੇ ਮਾਤਾ ਗੁਜਰੀ ਜੀ ਦਾ ਵਿਆਹ ਨੌਵੇਂ ਪਾਤਸ਼ਾਹ ਸ੍ਰੀ ਗੁਰੂ ਤੇਗ ਬਹਾਦਰ ਜੀ ਨਾਲ ਹੋਇਆ। ਬਾਬਾ ਬਕਾਲਾ ਵਿਖੇ ਲੰਮਾ ਸਮਾਂ ਗੁਰੂ ਸਾਹਿਬ ਨਾਲ ਭਗਤੀ ਵਿਚ ਬਿਤਾਇਆ ਅਤੇ ੧੬੬੬ ਵਿਚ ਪਟਨਾ ਸਾਹਿਬ ਵਿਖੇ ਦਸਮੇਸ਼ ਪਿਤਾ ਜੀ ਨੂੰ ਜਨਮ ਦਿੱਤਾ।\n\n੧੬੭੫ ਵਿਚ ਪਤੀ ਸ੍ਰੀ ਗੁਰੂ ਤੇਗ ਬਹਾਦਰ ਜੀ ਦੀ ਦਿੱਲੀ ਵਿਖੇ ਲਾਸਾਨੀ ਸ਼ਹਾਦਤ ਵੇਲੇ ਅਡੋਲ ਰਹੇ ਅਤੇ ਬਾਲ ਗੋਬਿੰਦ ਰਾਇ ਜੀ ਦੀ ਪਰਵਰਿਸ਼ ਕਰਦਿਆਂ ਪੰਥ ਦੀ ਅਗਵਾਈ ਵਿਚ ਅਹਿਮ ਭੂਮਿਕਾ ਨਿਭਾਈ।",
    "trial": "In December 1705, when Anandpur Sahib was evacuated, treacherous attacks by imperial forces while crossing the flooded Sirsa river separated the royal family. Mata Gujri, holding the hands of her two youngest grandsons, Sahibzada Zorawar Singh (9) and Sahibzada Fateh Singh (7), was betrayed by their former domestic servant Gangu in the village of Saheri and handed over to Nawab Wazir Khan of Sirhind.\n\nIn the bitter freezing cold of December, the 81-year-old matriarch and the two innocent children were imprisoned in the open, unheated stone turret of Sirhind known as the Thanda Burj (Cold Tower), exposed to freezing gale-force winds without warm clothing or food. Knowing that the children were summoned daily to the royal court where ministers alternated between tempting them with royal riches and threatening them with gruesome torture if they did not convert to Islam, Mata Gujri did not weep. Instead, every evening in the freezing tower, she embraced the young boys, kissed their foreheads, and narrated the heroic martyrdom of their grandfather Guru Tegh Bahadur and Guru Arjan Dev, commanding them: 'My beloved lions, never bow before tyranny; let your bodies perish, but let your faith in the Creator shine untarnished forever!'\n\nOn December 26, 1705, when the children were bricked alive inside stone walls and executed after steadfastly refusing to renounce their faith, the news was brought to Mata Gujri in the Cold Tower. Closing her eyes in profound serenity, she offered heartfelt gratitude to the Almighty that her grandsons had upheld the supreme honor of the Gurus' house without flinching, and breathed her last in deep meditative samadhi.",
    "trialLocal": "दिसंबर १७०५ में सरसा नदी पार करते समय परिवार बिछड़ गया। रसोइए गंगू के विश्वासघात के कारण माता गुजरी जी और दोनों छोटे साहिबजादों—जोरावर सिंह (९) और फतेह सिंह (७)—को सरहिंद के नवाब वज़ीर ख़ान ने बंदी बना लिया।\n\nदिसंबर की हाड़ कंपाने वाली ठंड में ८१ वर्ष की वृद्धा माता और नन्हे बालकों को खुले 'ठंडे बुर्ज' में बिना गर्म कपड़ों के कैद रखा गया। प्रतिदिन जब बालकों को कचहरी में पेशी के लिए ले जाया जाता, तो माता गुजरी जी उन्हें अपने दादा गुरु तेग बहादुर जी के बलिदान की गाथाएं सुनाकर कहती थीं: 'मेरे शेरो! जान भले चली जाए, किंतु धर्म की मर्यादा और दादा की पगड़ी पर आंच न आने देना।' जब दोनों साहिबजादों को जीवित दीवारों में चिनवाकर शहीद कर दिया गया और यह समाचार ठंडे बुर्ज पहुँचा, तो माता गुजरी जी ने प्रभु का शुकराना अदा किया कि उनके बच्चों ने धर्म नहीं छोड़ा, और उसी क्षण प्रभु-चरणों में अपने प्राण त्याग दिए।",
    "trialPa": "ਸਰਸਾ ਨਦੀ ਦੇ ਕੰਢੇ ਪਰਿਵਾਰ ਵਿਛੋੜੇ ਤੋਂ ਬਾਅਦ ਗੰਗੂ ਰਸੋਈਏ ਦੀ ਗ਼ੱਦਾਰੀ ਕਾਰਨ ਮਾਤਾ ਗੁਜਰੀ ਜੀ ਅਤੇ ਦੋਵੇਂ ਛੋਟੇ ਸਾਹਿਬਜ਼ਾਦੇ ਬਾਬਾ ਜ਼ੋਰਾਵਰ ਸਿੰਘ ਤੇ ਬਾਬਾ ਫ਼ਤਿਹ ਸਿੰਘ ਜੀ ਨੂੰ ਗ੍ਰਿਫ਼ਤਾਰ ਕਰਕੇ ਸਰਹਿੰਦ ਦੇ ਠੰਡੇ ਬੁਰਜ ਵਿਚ ਕੈਦ ਕੀਤਾ ਗਿਆ।\n\nਪੋਹ ਦੀ ਕਹਿਰਵਾਨ ਠੰਢ ਵਿਚ ਮਾਤਾ ਜੀ ਨੇ ਸਾਹਿਬਜ਼ਾਦਿਆਂ ਨੂੰ ਆਪਣੇ ਦਾਦਾ ਜੀ ਦੀ ਸ਼ਹਾਦਤ ਯਾਦ ਕਰਵਾ ਕੇ ਧਰਮ 'ਤੇ ਅਡੋਲ ਰਹਿਣ ਦੀ ਪ੍ਰੇਰਨਾ ਦਿੱਤੀ। ਜਦੋਂ ਦੋਵੇਂ ਮਾਸੂਮ ਬੱਚਿਆਂ ਨੂੰ ਜਿਊਂਦੇ ਜੀਅ ਨੀਹਾਂ ਵਿਚ ਚਿਣਵਾ ਦਿੱਤਾ ਗਿਆ, ਤਾਂ ਮਾਤਾ ਜੀ ਨੇ ਅਕਾਲ ਪੁਰਖ ਦਾ ਸ਼ੁਕਰਾਨਾ ਕਰਦਿਆਂ ਠੰਡੇ ਬੁਰਜ ਵਿਚ ਹੀ ਆਪਣੇ ਪ੍ਰਾਣ ਤਿਆਗ ਦਿੱਤੇ।",
    "teaching": "Mata Gujri demonstrated that spiritual strength, moral resilience, and family character form the true bedrock of civilization. When mothers and grandmothers impart the courage of truth to future generations, even small children can face empires and execution without fear.",
    "teachingLocal": "माता गुजरी जी ने सिखाया कि परिवार के संस्कार और आत्मिक बल ही राष्ट्र की वास्तविक शक्ति हैं। यदि माताएं बालकों को सत्य और स्वाभिमान का पाठ पढ़ाएं, तो नन्हे बालक भी साम्राज्यवादी अहंकार को झुका सकते हैं।",
    "teachingPa": "ਮਾਤਾ ਗੁਜਰੀ ਜੀ ਨੇ ਸਿੱਧ ਕੀਤਾ ਕਿ ਮਾਂ ਦੇ ਦਿੱਤੇ ਸੰਸਕਾਰ ਹੀ ਬੱਚਿਆਂ ਨੂੰ ਸ਼ਹਾਦਤ ਦੇ ਮਹਾਨ ਮਾਰਗ 'ਤੇ ਅਡੋਲ ਰੱਖਦੇ ਹਨ। ਜ਼ੁਲਮ ਦੇ ਸਾਹਮਣੇ ਸਿਰ ਝੁਕਾਉਣ ਨਾਲੋਂ ਸੱਚ 'ਤੇ ਮਰ ਮਿਟਣਾ ਹੀ ਅਸਲ ਜੀਵਨ ਹੈ।",
    "moral": "Dignity does not depend on physical warmth, worldly power, or youth. A steadfast spirit anchored in faith can withstand the freezing winds of persecution and shine as a guide for all ages.",
    "moralLocal": "सच्चा आत्म-बल बाह्य सुख-सुविधाओं का मोहताज नहीं होता। जो आत्मा सत्य में स्थिर होती है, वह क्रूरतम परिस्थितियों में भी शांत और अपराजेय रहती है।",
    "moralPa": "ਸਿਦਕ ਅਤੇ ਭਰੋਸਾ ਦੁਨਿਆਵੀ ਤਾਕਤ ਨਾਲੋਂ ਕਿਤੇ ਵੱਡਾ ਹੁੰਦਾ ਹੈ। ਧਰਮ ਦੀ ਖ਼ਾਤਰ ਆਪਣਾ ਪਰਿਵਾਰ ਵਾਰ ਦੇਣ ਵਾਲੀ ਮਾਂ ਦੀ ਸ਼ਾਨ ਸਦਾ ਅਮਰ ਰਹਿੰਦੀ ਹੈ।",
    "legacy": "Mata Gujri is the sole woman in world spiritual history who was the wife of a martyr (Guru Tegh Bahadur), mother of a martyr (Guru Gobind Singh), and grandmother of four martyr princes (the Sahibzade). Gurdwara Fatehgarh Sahib stands on the hallowed ground in Sirhind where she and the Sahibzade attained immortality, commemorated worldwide during the sacred Shaheedi Jor Mela every December.",
    "legacyLocal": "माता गुजरी जी विश्व इतिहास की एकमात्र ऐसी नारी हैं जो शहीद पति की पत्नी, शहीद पुत्र की माता और चार बलिदानी पौत्रों की दादी थीं। सरहिंद में गुरुद्वारा फतेहगढ़ साहिब उनकी अमर स्मृति का तीर्थ है, जहाँ प्रतिवर्ष लाखों श्रद्धालु नतमस्तक होते हैं।",
    "legacyPa": "ਮਾਤਾ ਗੁਜਰੀ ਜੀ ਸੰਸਾਰ ਦੇ ਇਤਿਹਾਸ ਵਿਚ ਇਕਲੌਤੀ ਅਜਿਹੀ ਹਸਤੀ ਹਨ ਜੋ ਸ਼ਹੀਦ ਪਤੀ ਦੇ ਪਤਨੀ, ਸ਼ਹੀਦ ਪੁੱਤਰ ਦੇ ਮਾਤਾ ਅਤੇ ਚਾਰ ਸ਼ਹੀਦ ਪੋਤਰਿਆਂ ਦੇ ਦਾਦੀ ਸਨ। ਫ਼ਤਿਹਗੜ੍ਹ ਸਾਹਿਬ ਦੀ ਧਰਤੀ ਉਹਨਾਂ ਦੇ ਅਦੁੱਤੀ ਸਿਦਕ ਦੀ ਗਵਾਹੀ ਭਰਦੀ ਹੈ।",
    "source": "Prachin Panth Prakash (Rattan Singh Bhangu), Sri Gur Sobha (Kavi Senapati), Mahan Kosh",
    "sourceLocal": "प्राचीन पंथ प्रकाश (रतन सिंह भंगू), श्री गुर सोभा (कवि सेनापति), महान कोश (भाई काह्न सिंह नाभा)",
    "sourcePa": "ਪ੍ਰਾਚੀਨ ਪੰਥ ਪ੍ਰਕਾਸ਼ (ਰਤਨ ਸਿੰਘ ਭੰਗੂ), ਸ੍ਰੀ ਗੁਰ ਸੋਭਾ (ਕਵੀ ਸੈਨਾਪਤੀ), ਮਹਾਨ ਕੋਸ਼ (ਭਾਈ ਕਾਨ੍ਹ ਸਿੰਘ ਨਾਭਾ)",
    "sourceCitations": [
      {
        "sourceName": "Rattan Singh Bhangu — Prachin Panth Prakash",
        "sourceRef": "Episode of Mata Gujri and the Chhote Sahibzade at Sirhind",
        "tier": 1
      },
      {
        "sourceName": "Kavi Senapati — Sri Gur Sobha (1711 CE)",
        "sourceRef": "Account of the Separation at Sirsa and Martyrdom at Sirhind",
        "tier": 1
      }
    ],
    "quote": {
      "text": "My beloved children, let your breath depart, but never let the spotless honor of your grandfather Guru Tegh Bahadur be diminished!",
      "attribution": "Mata Gujri to the Sahibzade in the Cold Tower (1705 CE)"
    },
    "quoteLocal": {
      "text": "मेरे प्यारे बच्चों, प्राण भले चले जाएं, किंतु अपने दादा गुरु तेग बहादुर जी की पगड़ी की लाज पर आंच न आने देना!",
      "attribution": "माता गुजरी जी (सरहिंद, १७०५ ई.)"
    },
    "quotePa": {
      "text": "ਮੇਰੇ ਲਾਲੋ, ਜਾਨ ਭਾਵੇਂ ਚਲੀ ਜਾਵੇ, ਪਰ ਦਾਦਾ ਗੁਰੂ ਤੇਗ ਬਹਾਦਰ ਜੀ ਦੀ ਸ਼ਾਨ ਨੂੰ ਕਦੇ ਦਾਗ਼ ਨਾ ਲੱਗਣ ਦੇਣਾ!",
      "attribution": "ਮਾਤਾ ਗੁਜਰੀ ਜੀ (ਠੰਡਾ ਬੁਰਜ, ੧੭੦੫ ਈ.)"
    }
  },
  {
    "id": "bhai-taru-singh",
    "name": "Bhai Taru Singh Ji",
    "nameLocal": "भाई तारू सिंह जी",
    "namePa": "ਭਾਈ ਤਾਰੂ ਸਿੰਘ ਜੀ",
    "era": "1720 – 1745 CE",
    "eraLocal": "१७२० – १७४५ ई.",
    "eraPa": "੧੭੨੦ – ੧੭੪੫ ਈ.",
    "tradition": "sikh",
    "region": "Poolha, Majha & Lahore",
    "regionLocal": "पूहला, माझा व लाहौर",
    "regionPa": "ਪੂਹਲਾ, ਮਾਝਾ ਤੇ ਲਾਹੌਰ",
    "emoji": "🪮",
    "tagline": "The young farmer-saint who chose to have his scalp scraped off with cobbler's chisels rather than have his sacred Keshas cut to compromise his faith.",
    "taglineLocal": "अमृतसर के युवा किसान-संत जिन्होंने अपने पावन केशों को कटवाने के बजाय रंभी से खोपड़ी उतरवाना स्वीकार किया।",
    "taglinePa": "ਸਿੱਖੀ ਸਿਦਕ ਦੇ ਅਮਰ ਸ਼ਹੀਦ ਜਿਨ੍ਹਾਂ ਨੇ ਕੇਸ ਕਟਵਾਉਣ ਦੀ ਥਾਂ ਰੰਬੀ ਨਾਲ ਖੋਪਰੀ ਲੁਹਾਉਣੀ ਪ੍ਰਵਾਨ ਕੀਤੀ ਪਰ ਸਿੱਖੀ ਕੇਸਾਂ-ਸੁਆਸਾਂ ਨਾਲ ਨਿਭਾਈ।",
    "journey": "Born in the village of Poolha in Amritsar district to a humble Sandhu Jatt peasant family, Bhai Taru Singh grew up as an embodiment of Gurbani’s highest ideals of honest hard work (Kirat Karo), sharing one’s earnings with the needy (Vand Chhako), and constant remembrance of God (Naam Japna). Following the untimely death of his father, the youthful Taru Singh labored in the agricultural fields alongside his mother and sister, living a life of utter simplicity.\n\nDuring the 1740s, Punjab was ruled by the tyrannical Mughal governor of Lahore, Zakariya Khan, who launched a genocidal campaign against the Sikhs, placing price bounties on Sikh heads (ten rupees for information, fifty rupees for a severed head). Driven into the dense jungles of Kahnuwan and the Lakhi wilderness, the Khalsa guerrillas suffered extreme starvation. Working day and night in his fields, Bhai Taru Singh secretly gathered grain, baked dry rotis, and prepared garments, trekking into the trackless wilderness under cover of darkness to feed and clothe the hunted Sikhs, regardless of the mortal danger to his own household.",
    "journeyLocal": "अमृतसर के पूहला गाँव में जन्मे भाई तारू सिंह एक साधारण, धर्मपरायण किसान थे। पिता के निधन के बाद वे अपनी माता और बहन के साथ खेती करते थे और 'किरत करो, नाम जपो, वंड छको' के सिद्धांत पर चलते थे।\n\n१७४० के दशक में जब लाहौर के क्रूर गवर्नर ज़करिया ख़ान ने सिखों का समूल विनाश करने के लिए उनके सिरों पर इनाम रख दिए थे और सिख जंगलों में भूख-प्यास से व्याकुल भटक रहे थे, तब भाई तारू सिंह दिन-रात अपने खेतों में पसीना बहाकर अन्न उपजाते थे और रात्रि के अंधेरे में चुपचाप जंगलों में जाकर भूखे सिखों को भोजन और वस्त्र पहुँचाते थे।",
    "journeyPa": "ਅੰਮ੍ਰਿਤਸਰ ਜ਼ਿਲ੍ਹੇ ਦੇ ਪਿੰਡ ਪੂਹਲਾ ਵਿਖੇ ਜਨਮੇ ਭਾਈ ਤਾਰੂ ਸਿੰਘ ਜੀ ਖੇਤੀਬਾੜੀ ਕਰਦਿਆਂ 'ਕਿਰਤ ਕਰੋ, ਨਾਮ ਜਪੋ, ਵੰਡ ਛਕੋ' ਦੇ ਗੁਰਮਤਿ ਸਿਧਾਂਤ 'ਤੇ ਪਹਿਰਾ ਦਿੰਦੇ ਸਨ।\n\nਜਦੋਂ ਜ਼ਕਰੀਆ ਖ਼ਾਨ ਦੇ ਜ਼ੁਲਮ ਕਾਰਨ ਸਿੰਘ ਜੰਗਲਾਂ ਵਿਚ ਭੁੱਖੇ-ਤਿਹਾਈਏ ਦਿਨ ਕੱਟ ਰਹੇ ਸਨ, ਤਾਂ ਭਾਈ ਸਾਹਿਬ ਆਪਣੀ ਮਿਹਨਤ ਦੀ ਕਮਾਈ ਵਿਚੋਂ ਜੰਗਲਾਂ ਵਿਚ ਸਿੰਘਾਂ ਨੂੰ ਗੁਪਤ ਤਰੀਕੇ ਨਾਲ ਰਸਦ ਅਤੇ ਕੱਪੜੇ ਪਹੁੰਚਾਉਂਦੇ ਸਨ।",
    "trial": "A traitorous government informant named Harbhagat Niranjaniya of Jandiala reported Bhai Taru Singh to Zakariya Khan, accusing him of treason for feeding state rebels. Mughal soldiers raided Poolha, arrested the twenty-five-year-old youth, and marched him in heavy chains to the dungeons of Lahore Fort.\n\nIn the court of Lahore, Zakariya Khan offered Bhai Taru Singh high imperial honors, vast jagir estates, and wealth if he would accept Islam and cut his sacred hair (Kesh). Bhai Taru Singh calmly replied: 'Even if you offer me the empire of Delhi and celestial treasures, I will not barter the sacred gift of the Guru. My breath and my hair belong to God alone.' Enraged by his serene refusal, Zakariya Khan ordered an executioner’s barber to forcibly shave his head. When the barber approached with sharp razors, his hands shook and the blades broke against Taru Singh's hair like glass against iron. Roaring in fury, Zakariya Khan ordered a cobbler to bring his curved chisels (rambi) and scrape the scalp entirely off Taru Singh’s head along with his skull bone.\n\nWhile the barbaric cobbler scraped the skin and bone from his forehead to the nape of his neck, Bhai Taru Singh sat in cross-legged padmasana, eyes closed, chanting *Japji Sahib* without uttering a single groan or shed of tear. Spectators in the court fainted in horror at the ghastly cruelty, but the young martyr's face radiated unearthly peace. Tradition records that Taru Singh declared Zakariya Khan would precede him in death through agonizing suffering; soon after, Zakariya Khan suffered an acute blockage of urine, crying out in unbearable agony until he died on July 1, 1745. Having fulfilled his vow to maintain his faith to his final breath, Bhai Taru Singh surrendered his soul to the Creator on that same day.",
    "trialLocal": "जंडियाला के मुखबिर हरभगत निरंजनिया ने ज़करिया ख़ान को सूचना दी कि तारू सिंह विद्रोहियों को रसद देता है। सैनिकों ने २५ वर्षीय युवक को बंदी बनाकर लाहौर की काल-कोठरी में डाल दिया।\n\nअदालत में ज़करिया ख़ान ने उन्हें धन, पद और जागीर का प्रलोभन देते हुए इस्लाम स्वीकार करने और केश कटवाने को कहा। भाई तारू सिंह ने शांत स्वर में कहा: 'यदि तुम मुझे दिल्ली का तख्त भी दे दो, तो भी मैं गुरु के दिए केशों का सौदा नहीं करूँगा। मेरी अंतिम सांस तक यह सिख धर्म मेरे साथ रहेगा।' क्रोधित होकर ज़करिया ख़ान ने मोची को बुलाकर रंभी (चमड़ा छीलने वाले औजार) से उनकी खोपड़ी उतारने का आदेश दिया। जब जल्लाद ने रंभी से उनकी खोपड़ी की चमड़ी और हड्डियों को छीला, तब भी भाई तारू सिंह अविचल बैठकर जपजी साहिब का पाठ करते रहे। १ जुलाई १७४५ को अपने केशों और धर्म की रक्षा करते हुए उन्होंने वीरगति प्राप्त की।",
    "trialPa": "ਜੰਡਿਆਲੇ ਦੇ ਮੁਖ਼ਬਰ ਹਰਭਗਤ ਨਿਰੰਜਨੀਏ ਦੀ ਸ਼ਿਕਾਇਤ 'ਤੇ ਭਾਈ ਸਾਹਿਬ ਨੂੰ ਗ੍ਰਿਫ਼ਤਾਰ ਕਰਕੇ ਲਾਹੌਰ ਲਿਆਂਦਾ ਗਿਆ। ਜ਼ਕਰੀਆ ਖ਼ਾਨ ਨੇ ਇਸਲਾਮ ਕਬੂਲ ਕਰਨ 'ਤੇ ਧਨ-ਦੌਲਤ ਦਾ ਲਾਲਚ ਦਿੱਤਾ, ਪਰ ਭਾਈ ਸਾਹਿਬ ਨੇ ਕਿਹਾ ਕਿ ਸਿੱਖੀ ਮੈਨੂੰ ਪ੍ਰਾਣਾਂ ਤੋਂ ਵੱਧ ਪਿਆਰੀ ਹੈ।\n\nਜ਼ਕਰੀਆ ਖ਼ਾਨ ਦੇ ਹੁਕਮ 'ਤੇ ਮੋਚੀ ਨੇ ਰੰਬੀ ਨਾਲ ਭਾਈ ਸਾਹਿਬ ਦੀ ਖੋਪਰੀ ਉਤਾਰ ਦਿੱਤੀ। ਇਸ ਅਸਹਿ ਤਸ਼ੱਦਦ ਦੌਰਾਨ ਵੀ ਭਾਈ ਸਾਹਿਬ ਅਡੋਲ ਰਹਿ ਕੇ ਜਪੁਜੀ ਸਾਹਿਬ ਦਾ ਪਾਠ ਕਰਦੇ ਰਹੇ। ੧ ਜੁਲਾਈ ੧੭੪੫ ਨੂੰ ਆਪ ਜੀ ਨੇ ਸਿੱਖੀ ਨੂੰ ਕੇਸਾਂ-ਸੁਆਸਾਂ ਨਾਲ ਨਿਭਾ ਕੇ ਸ਼ਹਾਦਤ ਦਾ ਜਾਮ ਪੀਤਾ।",
    "teaching": "Bhai Taru Singh demonstrated that the sacred emblems of faith (the Kakaars) are not superficial symbols, but the inviolable seal of the Guru upon the disciple’s soul. Physical life can be surrendered with joy, but moral and spiritual fidelity to the Guru must never be compromised for earthly survival or imperial favor.",
    "teachingLocal": "भाई तारू सिंह जी ने सिखाया कि धर्म के प्रतीक केवल बाह्य दिखावा नहीं, बल्कि आत्मा पर गुरु की अमर मोहर हैं। प्राण भले चले जाएं, किंतु आत्मसम्मान और धर्म की मर्यादा का सौदा कभी नहीं किया जाना चाहिए।",
    "teachingPa": "ਭਾਈ ਤਾਰੂ ਸਿੰਘ ਜੀ ਨੇ ਸਿੱਧ ਕੀਤਾ ਕਿ ਕੇਸ ਗੁਰੂ ਦੀ ਅਮਾਨਤ ਹਨ ਜਿਨ੍ਹਾਂ ਦੀ ਰਾਖੀ ਲਈ ਸਿਰ ਤਾਂ ਦਿੱਤਾ ਜਾ ਸਕਦਾ ਹੈ ਪਰ ਸਿੱਖੀ ਸਿਦਕ ਨਹੀਂ ਹਾਰਿਆ ਜਾ ਸਕਦਾ।",
    "moral": "When faith is absolute, physical pain loses its sting. True honor lies in holding fast to one’s principles under the most gruesome persecution, inspiring generations to value spiritual integrity over bodily comfort.",
    "moralLocal": "अटल निष्ठा के सम्मुख शारीरिक पीड़ा भी तुच्छ हो जाती है। सिद्धांतों के लिए प्राण न्योछावर करने वाला मनुष्य इतिहास के पन्नों में अमर हो जाता है।",
    "moralPa": "ਸਿਦਕਵਾਨ ਯੋਧਾ ਮੌਤ ਦੇ ਭੈਅ ਤੋਂ ਮੁਕਤ ਹੁੰਦਾ ਹੈ। ਜ਼ੁਲਮ ਦੀ ਤਲਵਾਰ ਨਾਲੋਂ ਧਰਮੀ ਦਾ ਸਿਰ ਉੱਚਾ ਰਹਿੰਦਾ ਹੈ।",
    "legacy": "Bhai Taru Singh is commemorated daily in the global Sikh Ardas with the sacred words: 'Jinhaan keshyaan suwasaan naal nibhaaya' (Those who preserved their faith and hair intact till their last breath). The historic Gurdwara Shaheed Ganj Bhai Taru Singh stands in Naulakha Bazar in Lahore as a timeless monument to uncompromising spiritual constancy.",
    "legacyLocal": "भाई तारू सिंह जी का बलिदान सिख अरदास का पावन हिस्सा है: 'जिन्हां ने केशां-सुवासां नाल निबाहेया'। लाहौर का गुरुद्वारा शहीद गंज भाई तारू सिंह उनके अदम्य साहस का साक्षी है।",
    "legacyPa": "ਸਿੱਖ ਅਰਦਾਸ ਵਿਚ ਰੋਜ਼ਾਨਾ ਭਾਈ ਤਾਰੂ ਸਿੰਘ ਜੀ ਦੀ ਸ਼ਹਾਦਤ ਨੂੰ ਯਾਦ ਕੀਤਾ ਜਾਂਦਾ ਹੈ: 'ਜਿਨ੍ਹਾਂ ਕੇਸਾਂ ਸੁਆਸਾਂ ਨਾਲ ਨਿਬਾਹੀ'। ਲਾਹੌਰ ਵਿਖੇ ਗੁਰਦੁਆਰਾ ਸ਼ਹੀਦ ਗੰਜ ਭਾਈ ਤਾਰੂ ਸਿੰਘ ਜੀ ਉਹਨਾਂ ਦੇ ਅਡੋਲ ਸਿਦਕ ਦੀ ਯਾਦ ਦਿਵਾਉਂਦਾ ਹੈ।",
    "source": "Prachin Panth Prakash (Rattan Singh Bhangu), Shahid Bilas, Mahan Kosh",
    "sourceLocal": "प्राचीन पंथ प्रकाश (रतन सिंह भंगू), शहीद बिलास, महान कोश (भाई काह्न सिंह नाभा)",
    "sourcePa": "ਪ੍ਰਾਚੀਨ ਪੰਥ ਪ੍ਰਕਾਸ਼ (ਰਤਨ ਸਿੰਘ ਭੰਗੂ), ਸ਼ਹੀਦ ਬਿਲਾਸ, ਮਹਾਨ ਕੋਸ਼ (ਭਾਈ ਕਾਨ੍ਹ ਸਿੰਘ ਨਾਭਾ)",
    "sourceCitations": [
      {
        "sourceName": "Rattan Singh Bhangu — Prachin Panth Prakash",
        "sourceRef": "Episode of the Martyrdom of Bhai Taru Singh at Lahore",
        "tier": 1
      },
      {
        "sourceName": "Bhai Kahn Singh Nabha — Mahan Kosh",
        "sourceRef": "Biographical entry on Bhai Taru Singh",
        "tier": 1
      }
    ],
    "quote": {
      "text": "My hair is the sacred blessing of my Guru; take my scalp if you will, but you can never sever my bond with the Tenth Master!",
      "attribution": "Bhai Taru Singh to Zakariya Khan at Lahore (1745 CE)"
    },
    "quoteLocal": {
      "text": "मेरे केश मेरे गुरु की पावन धरोहर हैं; तुम मेरी खोपड़ी उतार सकते हो, किंतु दशमेश पिता से मेरा नाता कभी नहीं तोड़ सकते!",
      "attribution": "भाई तारू सिंह जी (१७४५ ई.)"
    },
    "quotePa": {
      "text": "ਕੇਸ ਮੇਰੇ ਗੁਰੂ ਦੀ ਅਮਾਨਤ ਹਨ; ਤੁਸੀਂ ਮੇਰੀ ਖੋਪਰੀ ਲਾਹ ਸਕਦੇ ਹੋ ਪਰ ਮੇਰੇ ਅੰਦਰੋਂ ਸਿੱਖੀ ਨਹੀਂ ਖੋਹ ਸਕਦੇ!",
      "attribution": "ਭਾਈ ਤਾਰੂ ਸਿੰਘ ਜੀ (੧੭੪੫ ਈ.)"
    }
  },
  {
    "id": "bhai-mani-singh",
    "name": "Bhai Mani Singh Ji",
    "nameLocal": "भाई मनी सिंह जी",
    "namePa": "ਭਾਈ ਮਨੀ ਸਿੰਘ ਜੀ",
    "era": "1644 – 1737 CE",
    "eraLocal": "१६४४ – १७३७ ई.",
    "eraPa": "੧੬੪੪ – ੧੭੩੭ ਈ.",
    "tradition": "sikh",
    "region": "Amritsar & Lahore",
    "regionLocal": "अमृतसर व लाहौर",
    "regionPa": "ਅੰਮ੍ਰਿਤਸਰ ਤੇ ਲਾਹੌਰ",
    "emoji": "📜",
    "tagline": "The supreme Sikh scholar, head granthi of Harmandir Sahib, and scribe of the Damdami Bir who endured being cut joint-by-joint for religious freedom.",
    "taglineLocal": "श्री हरिमंदिर साहिब के मुख्य ग्रंथी और महान विद्वान जिन्होंने धर्म और मर्यादा की रक्षा हेतु बंद-बंद कटवाना स्वीकार किया।",
    "taglinePa": "ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੇ ਮੁੱਖ ਗ੍ਰੰਥੀ ਅਤੇ ਮਹਾਨ ਵਿਦਵਾਨ ਜਿਨ੍ਹਾਂ ਨੇ ਧਰਮ ਦੀ ਖ਼ਾਤਰ ਆਪਣਾ ਬੰਦ-ਬੰਦ ਕਟਵਾ ਕੇ ਸ਼ਹਾਦਤ ਦਾ ਜਾਮ ਪੀਤਾ।",
    "journey": "Born into a devoted Alishenoor Rajput family in the village of Alipur (Multan district) to Mai Das, Mani Ram was brought to Kiratpur Sahib in his youth to serve the seventh Sikh Guru, Har Rai. Devoting his life to scholarship, martial discipline, and Gurbani, he served five successive Sikh Gurus: Guru Har Rai, Guru Harkrishan, Guru Tegh Bahadur, and Guru Gobind Singh.\n\nBhai Mani Singh was one of the most prolific and authoritative scholars of Sikh history. At Anandpur Sahib, he assisted the Tenth Master in transcription and administration, and in 1706 at Damdama Sahib (Talwandi Sabo), he served as the master calligrapher along with Baba Deep Singh, writing down the complete, definitive Damdami Bir of the Sri Guru Granth Sahib as dictated from memory by Guru Gobind Singh Ji. In 1721, when internal sectarian disputes arose between the Tat Khalsa and Bandai Khalsa at Amritsar, Mata Sundri appointed Bhai Mani Singh as the Head Granthi of Sri Harmandir Sahib. Through wisdom, moral authority, and scriptural clarity, he reconciled the factions and restored Amritsar as the supreme spiritual center of the Sikh nation.",
    "journeyLocal": "मुल्तान के अलीपुर गाँव में जन्मे भाई मनी सिंह बाल्यकाल में ही गुरु-दरबार में आ गए थे। उन्होंने पांच सिख गुरुओं—गुरु हरिराय, गुरु हरिकृष्ण, गुरु तेग बहादुर और गुरु गोबिंद सिंह जी—की निष्ठापूर्वक सेवा की।\n\nवे सिख इतिहास के प्रकांड विद्वान और लेखक थे। १७०६ में दमदमा साहिब में उन्होंने गुरु गोबिंद सिंह जी के मुखारविंद से सुनकर श्री गुरु ग्रंथ साहिब जी के संपूर्ण 'दमदमी बीड़' को लिपिबद्ध किया। १७२१ में माता सुंदरी जी ने उन्हें श्री हरिमंदिर साहिब का मुख्य ग्रंथी नियुक्त किया। उन्होंने सिख पंथ में उपजे मतभेदों को समाप्त कर पंथ में एकता स्थापित की।",
    "journeyPa": "ਮੁਲਤਾਨ ਦੇ ਅਲੀਪੁਰ ਵਿਖੇ ਜਨਮੇ ਭਾਈ ਮਨੀ ਸਿੰਘ ਜੀ ਨੇ ਪੰਜ ਗੁਰੂ ਸਾਹਿਬਾਨ ਦੀ ਸੰਗਤ ਕੀਤੀ। ੧੭੦੬ ਵਿਚ ਸ੍ਰੀ ਦਮਦਮਾ ਸਾਹਿਬ ਵਿਖੇ ਕਲਗੀਧਰ ਪਾਤਸ਼ਾਹ ਦੇ ਹਜ਼ੂਰੀ ਲਿਖਾਰੀ ਵਜੋਂ ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਦੀ ਪਾਵਨ 'ਦਮਦਮੀ ਬੀੜ' ਲਿਖਣ ਦੀ ਮਹਾਨ ਸੇਵਾ ਨਿਭਾਈ।\n\n੧੭੨੧ ਵਿਚ ਮਾਤਾ ਸੁੰਦਰੀ ਜੀ ਦੇ ਹੁਕਮ ਨਾਲ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੇ ਮੁੱਖ ਗ੍ਰੰਥੀ ਥਾਪੇ ਗਏ ਅਤੇ ਤੱਤ ਖ਼ਾਲਸਾ ਤੇ ਬੰਦਈ ਖ਼ਾਲਸਾ ਦੇ ਝਗੜੇ ਨੂੰ ਬੜੀ ਸੂਝ-ਬੂਝ ਨਾਲ ਨਿਬੇੜਿਆ।",
    "trial": "In 1737, Bhai Mani Singh sought permission from Zakariya Khan, the Mughal governor of Lahore, to hold the traditional Diwali gathering of Sikhs at Sri Harmandir Sahib, which had been banned under pain of death. Zakariya Khan agreed on the condition that Bhai Mani Singh pay a heavy fee of five thousand rupees after the fair. However, Zakariya Khan secretly planned to dispatch a massive imperial army to slaughter the unarmed pilgrims as soon as they assembled.\n\nLearning of the imperial ambush in advance, Bhai Mani Singh immediately dispatched fast messengers across Punjab, warning the Sikhs not to come to Amritsar. Because the congregation did not gather, no offerings were collected, and Bhai Mani Singh could not pay the five thousand rupee tax. Zakariya Khan arrested the ninety-three-year-old scholar and dragged him to Lahore, offering him the choice between Islam or death. Bhai Mani Singh fearlessly chose martyrdom.\n\nThe Qazi sentenced the venerable sage to be cut to pieces joint by joint (Band-band katna). When the executioner approached his wrists with a heavy cleaver to chop off his hands, the ninety-three-year-old scholar stopped him calmly and said: 'Look at the judge's decree, executioner! The order says to cut me joint by joint. You are cutting my wrist, ignoring the joints of my fingers! Start from the tips of my fingers, joint by joint, so you do not fail in your duty, and I do not fail in my patience!' The executioner trembled in terror at such superhuman courage. While the cleaver severed every joint of his fingers, wrists, elbows, and limbs, Bhai Mani Singh serenely recited Gurbani, merging into the eternal Light as an immortal monument to Sikh steadfastness.",
    "trialLocal": "१७३७ में भाई मनी सिंह जी ने लाहौर के गवर्नर ज़करिया ख़ान से हरिमंदिर साहिब में दीवाली का मेला लगाने की अनुमति ली, जिसके बदले ५,००० रुपये का कर चुकाना तय हुआ। किंतु जब उन्हें पता चला कि मुग़ल सेना मेले में आने वाले निहत्थे सिखों के नरसंहार की योजना बना रही है, तो उन्होंने तुरंत संदेश भेजकर सिखों को आने से रोक दिया। मेला न लगने के कारण वे कर नहीं चुका पाए। ज़करिया ख़ान ने ९३ वर्षीय वृद्ध विद्वान को बंदी बनाकर लाहौर लाया और इस्लाम स्वीकार न करने पर उनका अंग-अंग (बंद-बंद) काटने की सजा सुनाई।\n\nजब जल्लाद ने कलाई पर कुल्हाड़ा रखा, तो भाई मनी सिंह ने शांत भाव से कहा: 'काजी का हुक्म बंद-बंद काटने का है, कलाई से नहीं। उंगलियों के पोरों से काटना शुरू करो ताकि तुम्हारा हुक्म पूरा हो और मेरी परीक्षा अधूरी न रहे!' यह सुनकर जल्लाद भी कांप उठा। उंगलियों से लेकर शरीर के प्रत्येक जोड़ को कटवाते हुए भाई मनी सिंह जपजी साहिब का पाठ करते रहे और शहीद हो गए।",
    "trialPa": "੧੭੩੭ ਵਿਚ ਦੀਵਾਲੀ ਦਾ ਮੇਲਾ ਕਰਵਾਉਣ ਬਦਲੇ ਜ਼ਕਰੀਆ ਖ਼ਾਨ ਨਾਲ ੫,੦੦੦ ਰੁਪਏ ਦੇਣ ਦਾ ਸਮਝੌਤਾ ਹੋਇਆ, ਪਰ ਜਦੋਂ ਪਤਾ ਲੱਗਾ ਕਿ ਮੁਗ਼ਲ ਫ਼ੌਜ ਸੰਗਤ ਦਾ ਕਤਲੇਆਮ ਕਰਨ ਆ ਰਹੀ ਹੈ, ਤਾਂ ਭਾਈ ਸਾਹਿਬ ਨੇ ਸੰਗਤ ਨੂੰ ਆਉਣ ਤੋਂ ਰੋਕ ਦਿੱਤਾ। ਟੈਕਸ ਨਾ ਭਰ ਸਕਣ ਕਾਰਨ ਆਪ ਜੀ ਨੂੰ ਲਾਹੌਰ ਵਿਖੇ ਗ੍ਰਿਫ਼ਤਾਰ ਕਰ ਲਿਆ ਗਿਆ।\n\nਕਾਜ਼ੀ ਨੇ ਆਪ ਜੀ ਦਾ ਬੰਦ-ਬੰਦ ਕੱਟਣ ਦਾ ਫ਼ਤਵਾ ਦਿੱਤਾ। ਜਦੋਂ ਜੱਲਾਦ ਨੇ ਗੁੱਟ 'ਤੇ ਕੁਹਾੜਾ ਰੱਖਿਆ ਤਾਂ ਭਾਈ ਸਾਹਿਬ ਨੇ ਕਿਹਾ ਕਿ ਹੁਕਮ ਬੰਦ-ਬੰਦ ਕੱਟਣ ਦਾ ਹੈ, ਇਸ ਲਈ ਉਂਗਲਾਂ ਦੇ ਪੋਟਿਆਂ ਤੋਂ ਸ਼ੁਰੂ ਕਰ। ਸਾਰਾ ਸਰੀਰ ਟੁਕੜੇ-ਟੁਕੜੇ ਕਰਵਾ ਕੇ ਵੀ ਆਪ ਜੀ ਨੇ ਬਾਣੀ ਦਾ ਜਾਪ ਕਰਦਿਆਂ ਸ਼ਹਾਦਤ ਦਾ ਜਾਮ ਪੀਤਾ।",
    "teaching": "Bhai Mani Singh proved that supreme intellectual scholarship must be backed by uncompromising physical valor. Knowledge that surrenders to tyranny is vanity; true wisdom shines only when a sage is prepared to defend the spiritual integrity of his faith with his own flesh and blood.",
    "teachingLocal": "भाई मनी सिंह जी ने सिद्ध किया कि सच्चा विद्वान वही है जो केवल ग्रंथों की रचना नहीं करता, बल्कि सिद्धांतों की रक्षा हेतु अपना शीश और शरीर समर्पित करने का साहस रखता है।",
    "teachingPa": "ਭਾਈ ਮਨੀ ਸਿੰਘ ਜੀ ਨੇ ਸਾਬਤ ਕੀਤਾ ਕਿ ਕਹਿਣੀ ਅਤੇ ਕਰਨੀ ਦਾ ਸੂਰਾ ਹੀ ਅਸਲ ਵਿਦਵਾਨ ਹੈ। ਧਰਮ ਦੀ ਆਨ-ਸ਼ਾਨ ਲਈ ਤਨ ਦਾ ਬੰਦ-ਬੰਦ ਕਟਵਾ ਦੇਣਾ ਹੀ ਸੱਚੇ ਸਿੱਖ ਦਾ ਆਦਰਸ਼ ਹੈ।",
    "moral": "When a soul stands anchored in truth, cruelty exhausts its weapons while patience remains victorious. The courage of the righteous turns the executioner’s block into an altar of eternal glory.",
    "moralLocal": "अत्याचार के साधन सीमित हैं, किंतु सत्य में स्थिर आत्मा का धैर्य असीम है। अधर्म का नाश अवश्यंभावी है और सत्य का बलिदान युगों-युगों को आलोकित करता है।",
    "moralPa": "ਜ਼ਾਲਮ ਦਾ ਜ਼ੁਲਮ ਮੁੱਕ ਜਾਂਦਾ ਹੈ ਪਰ ਸ਼ਹੀਦ ਦਾ ਸਿਦਕ ਸਦਾ ਜਿਊਂਦਾ ਰਹਿੰਦਾ ਹੈ। ਸੱਚ ਲਈ ਦਿੱਤੀ ਕੁਰਬਾਨੀ ਕਦੇ ਮਿਟਦੀ ਨਹੀਂ।",
    "legacy": "Bhai Mani Singh is commemorated daily in the global Sikh Ardas: 'Jinhaan band-band kataaye' (Those who were cut joint by joint). Gurdwara Shaheed Ganj Bhai Mani Singh in Lahore stands on the sacred site of his supreme martyrdom, and his literary masterworks, including the *Gyan Ratnavali* and *Bhagat Ratnavali*, remain treasures of Sikh theology.",
    "legacyLocal": "सिख अरदास में प्रतिदिन उनका पावन स्मरण किया जाता है: 'जिन्हां ने बंद-बंद कटाए'। उनकी रचित 'ज्ञान रत्नावली' और 'भगत रत्नावली' सिख साहित्य की अमूल्य धरोहर हैं।",
    "legacyPa": "ਰੋਜ਼ਾਨਾ ਅਰਦਾਸ ਵਿਚ 'ਜਿਨ੍ਹਾਂ ਬੰਦ-ਬੰਦ ਕਟਾਏ' ਕਹਿ ਕੇ ਭਾਈ ਮਨੀ ਸਿੰਘ ਜੀ ਦੀ ਸ਼ਹਾਦਤ ਨੂੰ ਪ੍ਰਣਾਮ ਕੀਤਾ ਜਾਂਦਾ ਹੈ। ਆਪ ਜੀ ਦੀਆਂ ਲਿਖਤਾਂ ਗੁਰਮਤਿ ਗਿਆਨ ਦਾ ਅਥਾਹ ਖ਼ਜ਼ਾਨਾ ਹਨ।",
    "source": "Prachin Panth Prakash (Rattan Singh Bhangu), Sikhan Di Bhagat Mala, Shahid Bilas Bhai Mani Singh",
    "sourceLocal": "प्राचीन पंथ प्रकाश (रतन सिंह भंगू), सिखों की भगत माला, शहीद बिलास भाई मनी सिंह",
    "sourcePa": "ਪ੍ਰਾਚੀਨ ਪੰਥ ਪ੍ਰਕਾਸ਼ (ਰਤਨ ਸਿੰਘ ਭੰਗੂ), ਸਿੱਖਾਂ ਦੀ ਭਗਤ ਮਾਲਾ, ਸ਼ਹੀਦ ਬਿਲਾਸ ਭਾਈ ਮਨੀ ਸਿੰਘ",
    "sourceCitations": [
      {
        "sourceName": "Rattan Singh Bhangu — Prachin Panth Prakash",
        "sourceRef": "Episode of the Martyrdom of Bhai Mani Singh (Band-band Katna)",
        "tier": 1
      },
      {
        "sourceName": "Giani Garja Singh — Shahid Bilas Bhai Mani Singh (Kavi Sewa Singh)",
        "sourceRef": "Historical biography of Bhai Mani Singh's life and sacrifice",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Executioner, follow the decree with care: cut me joint by joint from my fingertips so you do not fail in your duty and I do not fail in my faith!",
      "attribution": "Bhai Mani Singh to the Executioner at Lahore (1737 CE)"
    },
    "quoteLocal": {
      "text": "जल्लाद, हुक्म के अनुसार मेरी उंगलियों के पोरों से काटना शुरू करो ताकि तुम्हारा कर्तव्य पूरा हो और मेरा धैर्य अधूरा न रहे!",
      "attribution": "भाई मनी सिंह जी (१७३७ ई.)"
    },
    "quotePa": {
      "text": "ਜੱਲਾਦ, ਹੁਕਮ ਮੁਤਾਬਕ ਉਂਗਲਾਂ ਦੇ ਪੋਟਿਆਂ ਤੋਂ ਬੰਦ-ਬੰਦ ਕੱਟਣਾ ਸ਼ੁਰੂ ਕਰ ਤਾਂ ਜੋ ਤੂੰ ਆਪਣੇ ਹੁਕਮ ਵਿਚ ਅਤੇ ਮੈਂ ਆਪਣੇ ਸਿਦਕ ਵਿਚ ਪੂਰਾ ਉਤਰਾਂ!",
      "attribution": "ਭਾਈ ਮਨੀ ਸਿੰਘ ਜੀ (੧੭੩੭ ਈ.)"
    }
  },
  {
    "id": "bhai-gurdas",
    "name": "Bhai Gurdas Ji",
    "nameLocal": "भाई गुरदास जी",
    "namePa": "ਭਾਈ ਗੁਰਦਾਸ ਜੀ",
    "era": "1551 – 1636 CE",
    "eraLocal": "१५५१ – १६३६ ई.",
    "eraPa": "੧੫੫੧ – ੧੬੩੬ ਈ.",
    "tradition": "sikh",
    "region": "Goindval & Amritsar, Punjab",
    "regionLocal": "गोइंदवाल व अमृतसर, पंजाब",
    "regionPa": "ਗੋਇੰਦਵਾਲ ਤੇ ਅੰਮ੍ਰਿਤਸਰ, ਪੰਜਾਬ",
    "emoji": "📜",
    "tagline": "The supreme Sikh philosopher and scribe who penned the original Adi Granth and whose Vaaran serve as the canonical key to Gurbani.",
    "taglineLocal": "सिख धर्म के प्रथम दार्शनिक और आदि ग्रंथ के मुख्य लेखक जिनकी 'वारें' गुरुबाणी की कुंजी के रूप में प्रतिष्ठित हैं।",
    "taglinePa": "ਸਿੱਖ ਧਰਮ ਦੇ ਮਹਾਨ ਦਾਰਸ਼ਨਿਕ ਅਤੇ ਆਦਿ ਗ੍ਰੰਥ ਦੇ ਲਿਖਾਰੀ ਜਿਨ੍ਹਾਂ ਦੀਆਂ ਵਾਰਾਂ ਨੂੰ 'ਗੁਰਬਾਣੀ ਦੀ ਕੁੰਜੀ' ਦਾ ਸਤਿਕਾਰ ਪ੍ਰਾਪਤ ਹੈ।",
    "journey": "Born in Goindval to Bhai Ishar Das (nephew of Guru Amar Das, the third Sikh Guru) and Mata Jivani, Bhai Gurdas was raised in the serene spiritual atmosphere of the Guru’s court. Orphaned at an early age, he was nurtured under the protective guardianship of Guru Amar Das and later Guru Ram Das. Sent to Varanasi and Agra to study Sanskrit, Braj, Persian, and Indian philosophical systems (Nyaya, Sankhya, Vedanta), young Gurdas became a scholar of towering intellect, uniting deep scriptural knowledge with sublime poetic sensitivity.\n\nReturning to Punjab, Bhai Gurdas served as the chief missionary ambassador of the Sikh faith. He traveled extensively to Kabul, Kashmir, Rajasthan, Agra, and Varanasi, establishing Sangats and clarifying the theological distinctiveness of Sikhi. When the fifth Guru, Arjan Dev Ji, undertook the historic compilation of the *Adi Granth* in 1604 at Ramsar in Amritsar, he selected Bhai Gurdas as his sole master scribe. For over a year, sitting in tranquil meditation by the lake, Bhai Gurdas meticulously wrote down every sacred verse as dictated by Guru Arjan Dev, producing the monumental original Kartarpuri Bir with immaculate calligraphic precision.",
    "journeyLocal": "गोइंदवाल साहिब में तीसरे गुरु अमरदास जी के भतीजे भाई ईश्वर दास जी के घर जन्मे भाई गुरदास बाल्यकाल से ही अत्यंत मेधावी थे। माता-पिता के साये से वंचित होने पर गुरु अमरदास जी और गुरु रामदास जी ने उनका पालन-पोषण किया। उन्होंने काशी और आगरा में रहकर संस्कृत, ब्रज, फ़ारसी और भारतीय दर्शन शास्त्रों का गहन अध्ययन किया।\n\nसिख धर्म के मुख्य प्रचारक के रूप में उन्होंने काबुल, कश्मीर, राजस्थान और बनारस तक यात्राएं कीं और संगतें स्थापित कीं। १६०४ में जब पांचवें गुरु अर्जन देव जी ने अमृतसर में 'आद ग्रंथ' के संकलन का संकल्प लिया, तो उन्होंने भाई गुरदास जी को मुख्य लेखक चुना। रामसर सरोवर के तट पर एक वर्ष से अधिक समय तक बैठकर भाई गुरदास जी ने गुरु जी के मुखारविंद से उच्चारित प्रत्येक शब्द को अत्यंत सुंदर और शुद्ध हस्तलिपि में लिपिबद्ध किया।",
    "journeyPa": "ਸ੍ਰੀ ਗੋਇੰਦਵਾਲ ਸਾਹਿਬ ਵਿਖੇ ਤੀਜੇ ਪਾਤਸ਼ਾਹ ਸ੍ਰੀ ਗੁਰੂ ਅਮਰਦਾਸ ਜੀ ਦੀ ਛਤਰ-ਛਾਇਆ ਹੇਠ ਪਲੇ ਭਾਈ ਗੁਰਦਾਸ ਜੀ ਨੇ ਕਾਸ਼ੀ ਤੇ ਆਗਰਾ ਤੋਂ ਸੰਸਕ੍ਰਿਤ, ਫ਼ਾਰਸੀ ਅਤੇ ਫ਼ਲਸਫ਼ੇ ਦੀ ਉੱਚ ਵਿੱਦਿਆ ਹਾਸਲ ਕੀਤੀ।\n\n੧੬੦੪ ਵਿਚ ਸ੍ਰੀ ਗੁਰੂ ਅਰਜਨ ਦੇਵ ਜੀ ਨੇ ਜਦੋਂ ਰਾਮਸਰ ਸਰੋਵਰ ਦੇ ਕੰਢੇ ਪਵਿੱਤਰ 'ਆਦਿ ਗ੍ਰੰਥ' ਸਾਹਿਬ ਦਾ ਸੰਪਾਦਨ ਕੀਤਾ, ਤਾਂ ਭਾਈ ਗੁਰਦਾਸ ਜੀ ਨੂੰ ਹੱਥੀਂ ਲਿਖਣ ਦੀ ਸੇਵਾ ਬਖ਼ਸ਼ੀ। ਆਪ ਜੀ ਨੇ ਬੜੀ ਨਿਮਰਤਾ ਅਤੇ ਸ਼ੁੱਧਤਾ ਨਾਲ ਸਮੁੱਚੀ ਬਾਣੀ ਲਿਖੀ।",
    "trial": "Bhai Gurdas’s trial was one of supreme intellectual humility and incorruptible fidelity to truth. When the Adi Granth was completed, Guru Arjan Dev Ji offered to include Bhai Gurdas’s own poetic compositions within the sacred scripture, recognizing their supreme spiritual depth. Displaying breathtaking humility, Bhai Gurdas bowed with folded hands and declined the honor, stating that his mortal verses could never sit on the same celestial throne as the revealed words of the Gurus and Bhagats. Deeply moved by his complete lack of vanity, Guru Arjan Dev bestowed an immortal blessing: 'Bhai Gurdas's compositions shall be revered as the Gurbani Di Kunji—the master key without which the divine treasures of the Guru Granth Sahib cannot be unlocked.'\n\nLater, during Emperor Akbar's visit to Batala in 1598, orthodox opponents accused the Adi Granth of containing slurs against Islam and Hinduism. Bhai Gurdas stood before the imperial Mughal court, fearlessly reciting and explaining the verses. Akbar listened with deep awe, bowed his head, offered fifty-one gold mohurs to the scripture, and remitted the annual land tax for the peasants of Punjab. Following Guru Arjan Dev’s martyrdom, Bhai Gurdas stood firmly with the sixth Guru, Hargobind, defending the new doctrine of Miri-Piri (spiritual and temporal sovereignty) through his powerful 40 *Vaaran* and 675 *Kabit-Swayye*, providing the intellectual spine to the rising Sikh martial renaissance.",
    "trialLocal": "भाई गुरदास जी के जीवन की सबसे बड़ी विशेषता उनकी अगाध विनम्रता थी। आदि ग्रंथ के पूर्ण होने पर जब गुरु अर्जन देव जी ने उनकी रचनाओं को भी ग्रंथ में शामिल करने का प्रस्ताव रखा, तो भाई गुरदास जी ने हाथ जोड़कर मना कर दिया कि उनकी रचनाएं गुरुबाणी के समकक्ष नहीं हो सकतीं। उनकी इस निरहंकारिता से प्रसन्न होकर गुरु जी ने वरदान दिया कि उनकी 'वारें' गुरुबाणी की 'कुंजी' कहलाएंगी।\n\nजब मुग़ल सम्राट अकबर के दरबार में विरोधियों ने आदि ग्रंथ के विरुद्ध शिकायत की, तो भाई गुरदास जी ने निर्भीक होकर दरबार में बाणी का गायन और व्याख्या की, जिससे प्रभावित होकर अकबर ने ग्रंथ को नमन किया और किसानों का लगान माफ कर दिया। गुरु अर्जन देव जी की शहादत के बाद उन्होंने छठे गुरु हरिगोबिंद साहिब की 'मीरी-पीरी' की नीति का दार्शनिक समर्थन अपनी वारों के माध्यम से किया।",
    "trialPa": "ਗੁਰੂ ਅਰਜਨ ਦੇਵ ਜੀ ਨੇ ਜਦੋਂ ਭਾਈ ਗੁਰਦਾਸ ਜੀ ਦੀ ਰਚਨਾ ਨੂੰ ਆਦਿ ਗ੍ਰੰਥ ਵਿਚ ਦਰਜ ਕਰਨ ਦੀ ਪੇਸ਼ਕਸ਼ ਕੀਤੀ, ਤਾਂ ਅਥਾਹ ਨਿਮਰਤਾ ਦਿਖਾਉਂਦਿਆਂ ਉਹਨਾਂ ਨੇ ਇਨਕਾਰ ਕਰ ਦਿੱਤਾ। ਗੁਰੂ ਸਾਹਿਬ ਨੇ ਖ਼ੁਸ਼ ਹੋ ਕੇ ਉਹਨਾਂ ਦੀਆਂ ਵਾਰਾਂ ਨੂੰ 'ਗੁਰਬਾਣੀ ਦੀ ਕੁੰਜੀ' ਦਾ ਵਰਦਾਨ ਦਿੱਤਾ।\n\nਅਕਬਰ ਦੇ ਦਰਬਾਰ ਵਿਚ ਵਿਰੋਧੀਆਂ ਦੀਆਂ ਸਾਜ਼ਿਸ਼ਾਂ ਦਾ ਮੂੰਹ-ਤੋੜ ਜਵਾਬ ਦਿੰਦਿਆਂ ਬਾਣੀ ਦਾ ਪ੍ਰਚਾਰ ਕੀਤਾ। ਛੇਵੇਂ ਪਾਤਸ਼ਾਹ ਗੁਰੂ ਹਰਿਗੋਬਿੰਦ ਸਾਹਿਬ ਜੀ ਦੀ ਮੀਰੀ-ਪੀਰੀ ਦੀ ਨੀਤੀ ਨੂੰ ਆਪਣੀਆਂ ੪੦ ਵਾਰਾਂ ਰਾਹੀਂ ਸਿੱਖ ਸੰਗਤਾਂ ਵਿਚ ਦ੍ਰਿੜ੍ਹ ਕਰਵਾਇਆ।",
    "teaching": "Bhai Gurdas taught that true knowledge is inseparable from humility. Intellectual brilliance and scholarly mastery must lead not to arrogance or self-aggrandizement, but to quiet, dedicated service to the Divine and humanity. His Vaaran reveal that living as a householder with honest labor and selfless remembrance of God is superior to all ascetic escapism.",
    "teachingLocal": "भाई गुरदास जी ने सिखाया कि विद्या की पराकाष्ठा अहंकार में नहीं, बल्कि विनम्रता और सेवा में है। गृहस्थ जीवन में रहकर सत्य की कमाई करना और ईश्वर का सिमरन करना ही संन्यास से श्रेष्ठ है। उन्होंने गुरु और शिष्य के संबंध को पूर्ण समर्पण का मार्ग बताया।",
    "teachingPa": "ਭਾਈ ਗੁਰਦਾਸ ਜੀ ਨੇ ਸਿਖਾਇਆ ਕਿ ਅਸਲ ਵਿਦਵਾਨ ਉਹੀ ਹੈ ਜੋ ਹਉਮੈ ਤੋਂ ਮੁਕਤ ਹੋ ਕੇ ਨਿਮਰਤਾ ਧਾਰਨ ਕਰੇ। ਗ੍ਰਹਿਸਤ ਵਿਚ ਰਹਿ ਕੇ ਨਾਮ ਜਪਣਾ ਅਤੇ ਧਰਮ ਦੀ ਕਿਰਤ ਕਰਨਾ ਹੀ ਪਰਮ ਪਦ ਹੈ।",
    "moral": "The greatest minds are those that seek no personal glory. When intellect is placed at the feet of truth, its legacy outlives empires and guides wandering souls across millennia.",
    "moralLocal": "सच्चा ज्ञानी कभी अपनी प्रतिष्ठा का भूखा नहीं होता। जो ज्ञान ईश्वर के चरणों में समर्पित कर दिया जाता है, वह युगों-युगों तक मानवता का कल्याण करता है।",
    "moralPa": "ਵਿਦਿਆ ਵਿਚਾਰੀ ਤਾਂ ਪਰਉਪਕਾਰੀ। ਜਦੋਂ ਬੁੱਧੀ ਸੱਚ ਦੀ ਸੇਵਾ ਵਿਚ ਲੱਗਦੀ ਹੈ, ਤਾਂ ਉਹ ਸਦਾ ਲਈ ਅਮਰ ਹੋ ਜਾਂਦੀ ਹੈ।",
    "legacy": "Bhai Gurdas is universally venerated as the Saint Paul and Ved Vyasa of Sikhism. His 40 *Vaaran* and *Kabit-Swayye* are the only non-canonical compositions permitted to be sung during sacred worship inside Sri Harmandir Sahib and Sikh gurdwaras worldwide, recognized as the definitive exposition of Sikh theology and history.",
    "legacyLocal": "भाई गुरदास जी सिख धर्म के वेदव्यास कहे जाते हैं। उनकी ४० वारें और कबित्त-सवैये आज भी श्री हरिमंदिर साहिब में कीर्तन के रूप में गाए जाने वाले एकमात्र गैर-शास्त्र सम्मत पद हैं, जिन्हें गुरुबाणी की कुंजी माना जाता है।",
    "legacyPa": "ਭਾਈ ਗੁਰਦਾਸ ਜੀ ਦੀਆਂ ੪੦ ਵਾਰਾਂ ਸਿੱਖ ਇਤਿਹਾਸ ਅਤੇ ਫ਼ਲਸਫ਼ੇ ਦੀ ਪ੍ਰਮਾਣਿਕ ਬੁਨਿਆਦ ਹਨ। ਉਹਨਾਂ ਦੀਆਂ ਰਚਨਾਵਾਂ ਨੂੰ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਸਮੇਤ ਹਰ ਗੁਰਦੁਆਰਾ ਸਾਹਿਬ ਵਿਚ ਗਾਉਣ ਦੀ ਪ੍ਰਵਾਨਗੀ ਹੈ।",
    "source": "Vaaran Bhai Gurdas, Kabit-Swayye Bhai Gurdas, Mahan Kosh",
    "sourceLocal": "वारें भाई गुरदास, कबित्त-सवैये भाई गुरदास, महान कोश (भाई काह्न सिंह नाभा)",
    "sourcePa": "ਵਾਰਾਂ ਭਾਈ ਗੁਰਦਾਸ, ਕਬਿੱਤ ਸਵੱਯੇ ਭਾਈ ਗੁਰਦਾਸ, ਮਹਾਨ ਕੋਸ਼ (ਭਾਈ ਕਾਨ੍ਹ ਸਿੰਘ ਨਾਭਾ)",
    "sourceCitations": [
      {
        "sourceName": "Bhai Gurdas — Vaaran",
        "sourceRef": "Vaar 1 (Historical chronicle of Guru Nanak and the advent of Truth)",
        "tier": 1
      },
      {
        "sourceName": "Bhai Kahn Singh Nabha — Mahan Kosh",
        "sourceRef": "Entry on Bhai Gurdas and the title Gurbani Di Kunji",
        "tier": 1
      }
    ],
    "quote": {
      "text": "With the rising of the Sun of Guru Nanak, the mist of darkness was dispelled, and the light of truth illuminated the whole world.",
      "attribution": "Bhai Gurdas Ji — Vaaran, Vaar 1, Pauri 27"
    },
    "quoteLocal": {
      "text": "सतिगुरु नानक प्रगटिआ मिटी धुंधु जगि चानणु होआ।",
      "attribution": "भाई गुरदास जी (वार १, पौड़ी २७)"
    },
    "quotePa": {
      "text": "ਸਤਿਗੁਰ ਨਾਨਕ ਪ੍ਰਗਟਿਆ ਮਿਟੀ ਧੁੰਧੁ ਜਗਿ ਚਾਨਣੁ ਹੋਆ ॥",
      "attribution": "ਭਾਈ ਗੁਰਦਾਸ ਜੀ (ਵਾਰ ੧, ਪਉੜੀ ੨੭)"
    }
  },
  {
    "id": "hari-singh-nalwa",
    "name": "Hari Singh Nalwa",
    "nameLocal": "हरी सिंह नलवा",
    "namePa": "ਹਰੀ ਸਿੰਘ ਨਲਵਾ",
    "era": "1791 – 1837 CE",
    "eraLocal": "१७९१ – १८३७ ई.",
    "eraPa": "੧੭੯੧ – ੧੮੩੭ ਈ.",
    "tradition": "sikh",
    "region": "Gujranwala, Kashmir, Peshawar & Jamrud",
    "regionLocal": "गुजरांवाला, कश्मीर, पेशावर व जमरूद",
    "regionPa": "ਗੁਜਰਾਂਵਾਲਾ, ਕਸ਼ਮੀਰ, ਪੇਸ਼ਾਵਰ ਤੇ ਜਮਰੌਦ",
    "emoji": "⚔️",
    "tagline": "The legendary Commander-in-Chief of the Sikh Empire who reversed eight centuries of foreign invasions through the Khyber Pass and defended Jamrud to his last breath.",
    "taglineLocal": "सिख साम्राज्य के महान सेनापति जिन्होंने खैबर दर्रे से होने वाले आठ सौ वर्षों के विदेशी आक्रमणों को रोककर जमरूद में अंतिम सांस तक पहरा दिया।",
    "taglinePa": "ਸਿੱਖ ਸਲਤਨਤ ਦੇ ਮਹਾਨ ਜਰਨੈਲ ਜਿਨ੍ਹਾਂ ਨੇ ਖ਼ੈਬਰ ਦੱਰੇ ਤੋਂ ਸਦੀਆਂ ਤੋਂ ਹੁੰਦੇ ਹਮਲਿਆਂ ਦਾ ਰੁਖ਼ ਮੋੜ ਕੇ ਜਮਰੌਦ ਦੀ ਧਰਤੀ 'ਤੇ ਸ਼ਹਾਦਤ ਪਾਈ।",
    "journey": "Born in Gujranwala to Sardar Gurdial Singh Uppal and Mata Dharam Kaur, young Hari Singh entered the service of Maharaja Ranjit Singh at the age of fourteen in 1805. During a royal hunting expedition in the dense forests, an enormous tiger sprang upon Hari Singh, tearing his horse from beneath him. Calmly drawing his talwar, the teenage warrior shattered the beast's head in mid-air with a single blow, earning the epithet 'Nalwa' (the one who slays with the fury of King Nala).\n\nRecognizing his tactical genius and martial fearlessness, Maharaja Ranjit Singh appointed him general, leading the vanguard of the Khalsa Fauj across the most hazardous frontiers of the subcontinent. Hari Singh led victorious campaigns capturing Kasur (1807), Multan (1818), Kashmir (1819), and Mankera (1821). Appointed Governor of Kashmir, he eradicated religious persecution, stabilized the currency by minting the 'Hari Singhee rupee', abolished corrupt taxation, and rebuilt damaged temples and mosques. In 1834, Nalwa achieved what no Indian ruler had accomplished in eight hundred years: conquering Peshawar and pushing the borders of the Sikh Empire directly to the mouth of the Khyber Pass in Afghanistan.",
    "journeyLocal": "गुजरांवाला में जन्मे हरी सिंह १४ वर्ष की आयु में महाराजा रणजीत सिंह की सेना में शामिल हुए। शिकार के दौरान जब एक विशाल बाघ ने उन पर झपट्टा मारा, तो उन्होंने तलवार के एक ही वार से उस बाघ को चीर दिया, जिसके बाद उन्हें 'नलवा' की उपाधि मिली।\n\nमहाराजा रणजीत सिंह ने उन्हें खालसा सेना का प्रधान सेनापति बनाया। उन्होंने मुल्तान, कश्मीर और मानकेरा की ऐतिहासिक विजयों का नेतृत्व किया। कश्मीर के गवर्नर के रूप में उन्होंने कर-प्रणाली में सुधार किया और सभी धर्मों को समानता दी। १८३४ में उन्होंने आठ सौ वर्षों के इतिहास को पलटते हुए पेशावर पर विजय प्राप्त की और सिख साम्राज्य की सीमाओं को अफ़गानिस्तान के खैबर दर्रे तक पहुँचा दिया।",
    "journeyPa": "ਗੁਜਰਾਂਵਾਲਾ ਵਿਖੇ ਜਨਮੇ ਹਰੀ ਸਿੰਘ ਨਲਵਾ ੧੪ ਸਾਲ ਦੀ ਉਮਰ ਵਿਚ ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਦੀ ਫ਼ੌਜ ਵਿਚ ਸ਼ਾਮਲ ਹੋਏ। ਇੱਕ ਸ਼ਿਕਾਰ ਦੌਰਾਨ ਸ਼ੇਰ ਦੇ ਹਮਲੇ ਨੂੰ ਤਲਵਾਰ ਦੇ ਇੱਕੋ ਵਾਰ ਨਾਲ ਠੱਲ੍ਹ ਕੇ 'ਨਲਵਾ' ਦਾ ਖ਼ਿਤਾਬ ਹਾਸਲ ਕੀਤਾ।\n\nਕਸੂਰ, ਮੁਲਤਾਨ, ਕਸ਼ਮੀਰ ਅਤੇ ਪੇਸ਼ਾਵਰ ਨੂੰ ਜਿੱਤ ਕੇ ਸਿੱਖ ਰਾਜ ਦੀਆਂ ਹੱਦਾਂ ਖ਼ੈਬਰ ਦੱਰੇ ਤੱਕ ਵਧਾਈਆਂ ਅਤੇ ਸਦੀਆਂ ਤੋਂ ਹੁੰਦੇ ਆ ਰਹੇ ਅਫ਼ਗਾਨੀ ਹਮਲਿਆਂ ਨੂੰ ਸਦਾ ਲਈ ਠੱਲ੍ਹ ਪਾਈ।",
    "trial": "To permanently seal the historic invasion gateway into India, Hari Singh Nalwa constructed the massive stone fortress of Jamrud at the eastern end of the Khyber Pass in 1836. Recognizing this fortress as a dagger pointing at Kabul, the Afghan Amir Dost Mohammad Khan dispatched a colossal army of over thirty thousand troops under his son Muhammad Akbar Khan in April 1837 to crush the Sikhs.\n\nAt Jamrud, Sardar Hari Singh lay confined to his bed inside the fort with high fever and dysentery, while only a small garrison of eight hundred Sikhs defended the walls. When the Afghan siege artillery breached the outer ramparts, Nalwa rose from his sickbed, don his warrior armor, mounted his horse, and led a thunderous counter-attack through the fortress gates. Driving the Afghans in terror, Nalwa was struck by two fatal bullets in the chest and side while commanding the pursuit. Knowing his death would demoralize his outnumbered troops and invite an Afghan massacre, Nalwa ordered his aides to carry him back inside the fort secretly and conceal his death: 'Do not raise a lament! Stand my body upon the ramparts with my turban and weapons, and fire the cannons regularly so the enemy believes I still watch them!' For over forty-eight hours, the terrified Afghan army dared not advance, held at bay by the mere phantom presence of the dead general upon the ramparts, until Khalsa reinforcements from Lahore arrived under Sardar Tej Singh, liberating Jamrud and cementing India's western frontier forever.",
    "trialLocal": "अफ़गानों के आक्रमणों को हमेशा के लिए रोकने हेतु नलवा ने खैबर दर्रे पर 'जमरूद' के अजेय दुर्ग का निर्माण कराया। अप्रैल १८३७ में अफ़गान अमीर दोस्त मोहम्मद ख़ान के पुत्र अकबर ख़ान ने ३०,००० सैनिकों के साथ जमरूद पर घेरा डाल दिया।\n\nउस समय सरदार हरी सिंह नलवा तेज बुखार से पीड़ित थे और दुर्ग में मात्र ८०० सिख सैनिक थे। दीवारें टूटने की खबर मिलते ही नलवा अपनी शय्या से उठे और घोड़े पर सवार होकर मुट्ठी भर सैनिकों के साथ अफ़गानों पर टूट पड़े। अफ़गान सेना भाग खड़ी हुई, किंतु दो घातक गोलियाँ नलवा के सीने में जा लगीं। वीरगति प्राप्त करने से पूर्व उन्होंने अपने सैनिकों को अंतिम आदेश दिया कि उनके निधन की खबर गुप्त रखी जाए और उनके पार्थिव शरीर को पगड़ी और अस्त्र-शस्त्र पहनाकर दुर्ग की प्राचीर पर खड़ा रखा जाए ताकि शत्रु हमला न करे। दो दिनों तक अफ़गान सेना उनके भय से आगे नहीं बढ़ी, जब तक कि लाहौर से अतिरिक्त सेना नहीं पहुँच गई।",
    "trialPa": "ਜਮਰੌਦ ਦੇ ਕਿਲ੍ਹੇ ਨੂੰ ਘੇਰਾ ਪਾਉਣ ਆਈ ੩੦,੦੦੦ ਅਫ਼ਗਾਨੀ ਫ਼ੌਜ ਦਾ ਮੁਕਾਬਲਾ ਕਰਨ ਲਈ ਬਿਮਾਰ ਹੁੰਦਿਆਂ ਵੀ ਹਰੀ ਸਿੰਘ ਨਲਵਾ ਮੈਦਾਨ ਵਿਚ ਨਿੱਤਰੇ। ਅਫ਼ਗਾਨਾਂ ਨੂੰ ਭਾਂਜ ਦਿੱਤੀ ਪਰ ਦੋ ਗੋਲੀਆਂ ਲੱਗਣ ਕਾਰਨ ਗੰਭੀਰ ਜ਼ਖ਼ਮੀ ਹੋ ਗਏ।\n\nਸ਼ਹਾਦਤ ਤੋਂ ਪਹਿਲਾਂ ਆਦੇਸ਼ ਦਿੱਤਾ ਕਿ ਮੇਰੀ ਮੌਤ ਦੀ ਖ਼ਬਰ ਗੁਪਤ ਰੱਖੀ ਜਾਵੇ ਅਤੇ ਮੇਰੀ ਦੇਹ ਨੂੰ ਕਿਲ੍ਹੇ ਦੀ ਕੰਧ 'ਤੇ ਖੜ੍ਹਾ ਰੱਖਿਆ ਜਾਵੇ ਤਾਂ ਜੋ ਦੁਸ਼ਮਣ ਅੱਗੇ ਵਧਣ ਦਾ ਹੌਂਸਲਾ ਨਾ ਕਰੇ। ਦੋ ਦਿਨਾਂ ਤੱਕ ਅਫ਼ਗਾਨ ਕੇਵਲ ਉਹਨਾਂ ਦੇ ਪਰਛਾਵੇਂ ਤੋਂ ਹੀ ਥਰ-ਥਰ ਕੰਬਦੇ ਰਹੇ।",
    "teaching": "General Hari Singh Nalwa proved that righteous military power and strategic defense must be used to protect the sovereign borders of one's homeland. True leadership is defined not by seeking comfortable safety, but by leading from the front and sacrificing one's physical breath so that future generations may live in dignity and peace.",
    "teachingLocal": "हरी सिंह नलवा ने सिद्ध किया कि राष्ट्रीय सीमाओं की सुरक्षा हेतु अदम्य शौर्य और दूरदर्शी रणनीति का होना अनिवार्य है। सच्चा सेनापति वह है जो विपत्ति में अपनी देह की चिंता किए बिना राष्ट्र के स्वाभिमान को सर्वोपरि रखे।",
    "teachingPa": "ਹਰੀ ਸਿੰਘ ਨਲਵਾ ਨੇ ਸਾਬਤ ਕੀਤਾ ਕਿ ਦੇਸ਼ ਦੀਆਂ ਸਰਹੱਦਾਂ ਦੀ ਰਾਖੀ ਲਈ ਲਾਸਾਨੀ ਜਰਨੈਲੀ ਅਤੇ ਨਿਰਭੈਤਾ ਜ਼ਰੂਰੀ ਹੈ। ਮਰਦੇ ਦਮ ਤੱਕ ਕੌਮ ਦੀ ਆਨ-ਸ਼ਾਨ 'ਤੇ ਆਂਚ ਨਾ ਆਉਣ ਦੇਣਾ ਹੀ ਸੱਚੇ ਸੂਰਮੇ ਦੀ ਪਛਾਣ ਹੈ।",
    "moral": "The dread of a righteous champion can paralyze tyrants even in death. Courage and tactical mastery reverse centuries of subjugation and establish lasting peace for a nation.",
    "moralLocal": "सत्य और शौर्य के प्रतीक की छाया से भी अधर्मी थर-थर कांपते हैं। जब एक वीर देश के लिए सर्वस्व न्योछावर करता है, तो सदियों की दासता का कलंक मिट जाता है।",
    "moralPa": "ਸੂਰਬੀਰਤਾ ਅਤੇ ਦਲੇਰੀ ਸਦੀਆਂ ਦੀ ਗ਼ੁਲਾਮੀ ਦੀਆਂ ਜ਼ੰਜੀਰਾਂ ਕੱਟ ਦਿੰਦੀ ਹੈ। ਧਰਮੀ ਯੋਧੇ ਦੀ ਸ਼ਾਨ ਮੌਤ ਤੋਂ ਬਾਅਦ ਵੀ ਦੁਸ਼ਮਣਾਂ ਦੇ ਦਿਲਾਂ ਵਿਚ ਦਹਿਸ਼ਤ ਪਾ ਕੇ ਰੱਖਦੀ ਹੈ।",
    "legacy": "Hari Singh Nalwa is internationally celebrated as one of the greatest military generals in human history, ranked alongside Alexander and Napoleon in international military studies for conquering the unconquerable North-West Frontier. Fort Jamrud and the historic town of Haripur in Hazara bear his immortal name.",
    "legacyLocal": "हरी सिंह नलवा को विश्व के महानतम सेनापतियों में गिना जाता है। खैबर दर्रे पर उनके द्वारा स्थापित चौकी आज भी उनकी अमर गाथा का स्मरण कराती है और पाकिस्तान में 'हरिपुर' शहर उनके नाम पर बसा है।",
    "legacyPa": "ਹਰੀ ਸਿੰਘ ਨਲਵਾ ਨੂੰ ਦੁਨੀਆ ਦੇ ਚੋਟੀ ਦੇ ਜਰਨੈਲਾਂ ਵਿਚ ਸ਼ੁਮਾਰ ਕੀਤਾ ਜਾਂਦਾ ਹੈ। ਜਮਰੌਦ ਦਾ ਕਿਲ੍ਹਾ ਅਤੇ ਹਰੀਪੁਰ ਸ਼ਹਿਰ ਉਹਨਾਂ ਦੇ ਅਦੁੱਤੀ ਕਾਰਨਾਮਿਆਂ ਦੀ ਯਾਦ ਦਿਵਾਉਂਦੇ ਹਨ।",
    "source": "Tawarikh Guru Khalsa (Giani Gian Singh), Hari Singh Nalwa: Champion of the Khalsaji (Autar Singh Sandhu), The Sikh Empire (Amarpal Singh)",
    "sourceLocal": "तवारीख गुरु खालसा (ज्ञानी ज्ञान सिंह), हरी सिंह नलवा (अवतार सिंह संधू), द सिख एम्पायर",
    "sourcePa": "ਤਵਾਰੀਖ਼ ਗੁਰੂ ਖ਼ਾਲਸਾ (ਗਿਆਨੀ ਗਿਆਨ ਸਿੰਘ), ਹਰੀ ਸਿੰਘ ਨਲਵਾ (ਔਤਾਰ ਸਿੰਘ ਸੰਧੂ), ਦ ਸਿੱਖ ਇੰਪਾਇਰ",
    "sourceCitations": [
      {
        "sourceName": "Giani Gian Singh — Tawarikh Guru Khalsa",
        "sourceRef": "Raj Khalsa, Chapter on General Hari Singh Nalwa and the Battle of Jamrud",
        "tier": 1
      },
      {
        "sourceName": "Autar Singh Sandhu — General Hari Singh Nalwa (1935)",
        "sourceRef": "Historical biography based on royal court records of the Sikh Darbar",
        "tier": 1
      }
    ],
    "quote": {
      "text": "Do not weep or sound the retreat; stand my body upon the battlements of Jamrud so the Afghans know that Hari Singh still guards the gates of India!",
      "attribution": "General Hari Singh Nalwa's final words at Jamrud (1837 CE)"
    },
    "quoteLocal": {
      "text": "विलाप मत करो; मेरे पार्थिव शरीर को जमरूद की प्राचीर पर खड़ा रखो ताकि अफ़गान जान लें कि हरी सिंह अब भी भारत के द्वार की रक्षा कर रहा है!",
      "attribution": "सरदार हरी सिंह नलवा (जमरूद, १८३७ ई.)"
    },
    "quotePa": {
      "text": "ਮੇਰੀ ਸ਼ਹਾਦਤ ਦਾ ਰੋਣਾ ਨਾ ਰੋਇਓ; ਮੇਰੀ ਦੇਹ ਨੂੰ ਜਮਰੌਦ ਦੀ ਕੰਧ 'ਤੇ ਖੜ੍ਹੀ ਰੱਖਿਓ ਤਾਂ ਜੋ ਅਫ਼ਗਾਨ ਜਾਣ ਸਕਣ ਕਿ ਹਰੀ ਸਿੰਘ ਅਜੇ ਵੀ ਭਾਰਤ ਦੇ ਬੂਹੇ 'ਤੇ ਪਹਿਰਾ ਦੇ ਰਿਹਾ ਹੈ!",
      "attribution": "ਸਰਦਾਰ ਹਰੀ ਸਿੰਘ ਨਲਵਾ (੧੮੩੭ ਈ.)"
    }
  },
  {
    "id": "akali-phula-singh",
    "name": "Akali Phula Singh",
    "nameLocal": "अकाली फूला सिंह",
    "namePa": "ਅਕਾਲੀ ਫੂਲਾ ਸਿੰਘ",
    "era": "1761 – 1823 CE",
    "eraLocal": "१७६१ – १८२३ ई.",
    "eraPa": "੧੭੬੧ – ੧੮੨੩ ਈ.",
    "tradition": "sikh",
    "region": "Amritsar & Nowshera",
    "regionLocal": "अमृतसर व नौशेरा",
    "regionPa": "ਅੰਮ੍ਰਿਤਸਰ ਤੇ ਨੌਸ਼ਹਿਰਾ",
    "emoji": "⚔️",
    "tagline": "The fearless Nihang Jathedar of the Akal Takht who held the Sikh Empire to strict spiritual account and fell as a supreme martyr at the Battle of Nowshera.",
    "taglineLocal": "अकाल तख्त के निर्भीक निहंग जत्थेदार जिन्होंने महाराजा रणजीत सिंह को भी मर्यादा भंग करने पर तलब किया और नौशेरा के युद्ध में अमर बलिदान दिया।",
    "taglinePa": "ਸ੍ਰੀ ਅਕਾਲ ਤਖ਼ਤ ਸਾਹਿਬ ਦੇ ਨਿਡਰ ਜਥੇਦਾਰ ਜਿਨ੍ਹਾਂ ਨੇ ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਨੂੰ ਵੀ ਤਲਬ ਕੀਤਾ ਅਤੇ ਨੌਸ਼ਹਿਰਾ ਦੀ ਜੰਗ ਵਿਚ ਸ਼ਹੀਦੀ ਪਾਈ।",
    "journey": "Born in the village of Shihn in Bangar (now Sangrur district) to Sardar Ishar Singh of the Nishanwalia Misl, Phula Singh was initiated into the Nihang Khalsa order (the immortals of the Guru) under Baba Narain Singh. Immersing himself in Gurbani, equestrian warfare, and the blue-robed lifestyle of the warrior-ascetics, Akali Phula Singh rose to become the supreme Jathedar of the Budha Dal and the custodian of Sri Akal Takht Sahib in Amritsar in 1800.\n\nAkali Phula Singh was the incorruptible conscience of the Sikh nation. When Maharaja Ranjit Singh was forging the sovereign Sikh Empire, Akali Phula Singh served as his most formidable military vanguard, leading the battle-hardened Nihang regiments in victorious assaults on Multan, Kasur, and Kashmir. Yet he accepted neither jagir land grants, royal pensions, nor imperial titles, remaining completely detached from worldly power and answering solely to the spiritual authority of the Akal Takht and the Guru Granth Sahib.",
    "journeyLocal": "संगरूर के शीह गाँव में जन्मे फूला सिंह ने बाल्यकाल में ही निहंग खालसा दल में प्रवेश किया। वे अस्त्र-शस्त्र, घुड़सवारी और गुरुबाणी के निष्ठावान साधक बने और १८०० में श्री अकाल तख्त साहिब के जत्थेदार बने।\n\nवे सिख पंथ की निर्भीक चेतना थे। महाराजा रणजीत सिंह के विस्तारवादी अभियानों में उनके निहंग सैनिकों ने मुल्तान, कसूर और कश्मीर में अजेय मोर्चे संभाले। किंतु फूला सिंह ने कभी कोई जागीर, पद या धन स्वीकार नहीं किया और जीवन भर निष्काम संत-सैनिक बने रहे।",
    "journeyPa": "ਸੰਗਰੂਰ ਦੇ ਪਿੰਡ ਸ਼ੀਹ ਵਿਖੇ ਜਨਮੇ ਅਕਾਲੀ ਫੂਲਾ ਸਿੰਘ ਜੀ ਬੁੱਢਾ ਦਲ ਦੇ ਮੁਖੀ ਅਤੇ ਸ੍ਰੀ ਅਕਾਲ ਤਖ਼ਤ ਸਾਹਿਬ ਦੇ ਮਹਾਨ ਜਥੇਦਾਰ ਬਣੇ।\n\nਉਹਨਾਂ ਨੇ ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਦੀਆਂ ਮੁਲਤਾਨ, ਕਸੂਰ ਅਤੇ ਕਸ਼ਮੀਰ ਦੀਆਂ ਜਿੱਤਾਂ ਵਿਚ ਮੋਹਰੀ ਰੋਲ ਅਦਾ ਕੀਤਾ, ਪਰ ਕਦੇ ਕੋਈ ਜਾਗੀਰ ਜਾਂ ਸਰਕਾਰੀ ਅਹੁਦਾ ਕਬੂਲ ਨਹੀਂ ਕੀਤਾ।",
    "trial": "Akali Phula Singh’s legendary moral courage was demonstrated when Maharaja Ranjit Singh breached traditional Sikh moral discipline by associating with a nautch dancer named Moran. As supreme guardian of the Akal Takht, Akali Phula Singh summoned the sovereign Emperor of Punjab to appear before the seat of temporal authority as a humble petitioner. Stripped of imperial regalia, Maharaja Ranjit Singh stood before the Takht with folded hands. The Akali Jathedar sentenced the monarch to public flogging (Kordas) for his moral transgression. When the Maharaja submissively lowered his garments and placed himself against the Tamarind tree to receive the lashes, Akali Phula Singh, moved by the king’s genuine humility and total submission to the authority of the Panth, remitted the physical punishment and blessed him.\n\nHis final supreme trial arrived on March 14, 1823, at the decisive Battle of Nowshera (Tibba Teri) near the Kabul river, where over forty thousand fanatical Afghan Pashtun tribesmen held fortified mountain heights. At dawn, the Sikh army made an Ardas (prayer to God) before the Guru Granth Sahib pledging to launch the assault. However, scouts arrived warning that the Khalsa artillery had not arrived from Attock and that assaulting immediately would be suicidal. Maharaja Ranjit Singh urged waiting for the heavy cannons, but Akali Phula Singh drew his sword and thundered: 'The Khalsa has performed Ardas in the presence of the Guru! An Ardas made to the Almighty can never be revoked for human calculations!' Mounting his horse and rallying twelve hundred Nihangs, Akali Phula Singh charged directly up the flaming heights into a tempest of gunfire. Shot multiple times and with his horse killed beneath him, he mounted a war elephant and drove into the Afghan summit until a final bullet pierced his forehead, breaking the Afghan line and securing victory for the Sikh Empire.",
    "trialLocal": "अकाली फूला सिंह की निर्भीकता का सबसे बड़ा प्रमाण तब मिला जब उन्होंने सिख मर्यादा के उल्लंघन पर स्वयं महाराजा रणजीत सिंह को अकाल तख्त पर तलब किया और कोड़े मारने की सजा सुनाई। जब महाराजा ने नम्रतापूर्वक दंड स्वीकार करने हेतु कपड़े उतार दिए, तो उनकी सच्ची पश्चाताप भावना देखकर फूला सिंह ने दंड माफ कर दिया।\n\n१४ मार्च १८२३ को नौशेरा के ऐतिहासिक युद्ध में जब ४०,००० अफ़गान कबाइलियों ने पहाड़ियों को घेर रखा था, तब खालसा ने युद्ध हेतु अरदास की। बाद में तोपें न पहुँचने पर महाराजा ने रुकने का सुझाव दिया, किंतु फूला सिंह ने गर्जना की: 'गुरु के सम्मुख की गई अरदास कभी वापस नहीं ली जा सकती!' वे अपने १,२०० निहंगों के साथ सीधे पहाड़ियों पर चढ़ गए। गोली लगने पर जब घोड़ा मारा गया, तो वे हाथी पर सवार होकर लड़े और माथे पर गोली लगने से वीरगति पाई, किंतु खालसा को विजय दिलाई।",
    "trialPa": "ਅਕਾਲੀ ਫੂਲਾ ਸਿੰਘ ਨੇ ਮਰਯਾਦਾ ਭੰਗ ਕਰਨ 'ਤੇ ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਨੂੰ ਸ੍ਰੀ ਅਕਾਲ ਤਖ਼ਤ ਸਾਹਿਬ 'ਤੇ ਤਲਬ ਕਰਕੇ ਕੋੜਿਆਂ ਦੀ ਸਜ਼ਾ ਸੁਣਾਈ ਸੀ, ਜਿਸ ਨੂੰ ਮਹਾਰਾਜਾ ਨੇ ਸਿਰ ਮੱਥੇ ਪ੍ਰਵਾਨ ਕੀਤਾ।\n\n੧੪ ਮਾਰਚ ੧੮੨੩ ਨੂੰ ਨੌਸ਼ਹਿਰੇ ਦੀ ਜੰਗ ਵਿਚ ਜਦੋਂ ਗੁਰੂ ਅੱਗੇ ਅਰਦਾਸਾ ਸੋਧ ਲਿਆ ਗਿਆ, ਤਾਂ ਤੋਪਾਂ ਨਾ ਪਹੁੰਚਣ 'ਤੇ ਵੀ ਆਪ ਨੇ ਕਿਹਾ ਕਿ ਖ਼ਾਲਸੇ ਦੀ ਅਰਦਾਸ ਅਟੱਲ ਹੈ। ਆਪ ਨੇ ੧,੨੦੦ ਨਿਹੰਗਾਂ ਨਾਲ ਚੜ੍ਹਾਈ ਕੀਤੀ ਅਤੇ ਸ਼ਹਾਦਤ ਦਾ ਜਾਮ ਪੀ ਕੇ ਸਿੱਖ ਰਾਜ ਨੂੰ ਫ਼ਤਿਹ ਬਖ਼ਸ਼ੀ।",
    "teaching": "Akali Phula Singh proved that spiritual authority is higher than all earthly crowns, empires, and armies. A commitment made to the Divine (Ardas) is sacred and non-negotiable; when duty calls, personal calculations of survival must be dissolved in unwavering faith.",
    "teachingLocal": "अकाली फूला सिंह ने सिखाया कि ईश्वर और धर्म की सत्ता संसार के समस्त सिंहासनों से ऊपर है। प्रभु के सम्मुख लिया गया संकल्प कभी तोड़ा नहीं जा सकता; जब धर्म पुकारे, तो जीवन-मरण की चिंता किए बिना कूद पड़ना ही सच्चा क्षात्रधर्म है।",
    "teachingPa": "ਅਕਾਲੀ ਜੀ ਨੇ ਦ੍ਰਿੜ੍ਹ ਕਰਵਾਇਆ ਕਿ ਗੁਰੂ ਦੀ ਮਰਯਾਦਾ ਅੱਗੇ ਦੁਨੀਆ ਦੇ ਬਾਦਸ਼ਾਹ ਵੀ ਨਿਗੂਣੇ ਹਨ। ਗੁਰੂ ਹਜ਼ੂਰ ਕੀਤੀ ਅਰਦਾਸ ਤੋਂ ਪਿੱਛੇ ਹਟਣਾ ਖ਼ਾਲਸੇ ਦੀ ਸ਼ਾਨ ਦੇ ਖ਼ਿਲਾਫ਼ ਹੈ।",
    "moral": "Integrity means speaking truth to power without fear of consequence. When spiritual conviction guides the sword, sacrifice becomes an eternal triumph.",
    "moralLocal": "सत्ता के सामने भी सत्य को निर्भीक होकर कहना ही सच्ची साधुता है। सिद्धांतों के लिए प्राण देने वाला योद्धा कभी पराजित नहीं होता।",
    "moralPa": "ਹੱਕ ਅਤੇ ਸੱਚ 'ਤੇ ਖਲੋਣਾ ਹੀ ਅਸਲ ਦਲੇਰੀ ਹੈ। ਸਿਦਕਵਾਨ ਸ਼ਹੀਦ ਕਦੇ ਮਰਦੇ ਨਹੀਂ, ਸਗੋਂ ਕੌਮਾਂ ਦੇ ਦਿਲਾਂ ਵਿਚ ਸਦਾ ਧੜਕਦੇ ਹਨ।",
    "legacy": "Akali Phula Singh is celebrated as the iconic personification of the Nihang Singh warrior tradition. The memorial Gurdwara Shaheed Akali Phula Singh stands at Nowshera on the banks of the Kabul River, and his samadhi is revered as a monument to uncompromising moral and martial fearlessness.",
    "legacyLocal": "अकाली फूला सिंह निहंग परंपरा के सर्वोच्च आदर्श हैं। नौशेरा में काबुल नदी के तट पर उनका समाधि-स्थल आज भी उनकी अदम्य वीरता की गाथा गाता है।",
    "legacyPa": "ਅਕਾਲੀ ਫੂਲਾ ਸਿੰਘ ਜੀ ਨਿਹੰਗ ਸਿੰਘਾਂ ਦੇ ਅਮਰ ਨਾਇਕ ਹਨ। ਨੌਸ਼ਹਿਰਾ ਵਿਖੇ ਗੁਰਦੁਆਰਾ ਸ਼ਹੀਦ ਅਕਾਲੀ ਫੂਲਾ ਸਿੰਘ ਜੀ ਉਹਨਾਂ ਦੇ ਅਦੁੱਤੀ ਬਲਿਦਾਨ ਦਾ ਗਵਾਹ ਹੈ।",
    "source": "Prachin Panth Prakash, Tawarikh Guru Khalsa (Giani Gian Singh), Life of Akali Phula Singh (Prem Singh Hoti)",
    "sourceLocal": "प्राचीन पंथ प्रकाश, तवारीख गुरु खालसा (ज्ञानी ज्ञान सिंह), अकाली फूला सिंह (प्रेम सिंह होती)",
    "sourcePa": "ਪ੍ਰਾਚੀਨ ਪੰਥ ਪ੍ਰਕਾਸ਼, ਤਵਾਰੀਖ਼ ਗੁਰੂ ਖ਼ਾਲਸਾ (ਗਿਆਨੀ ਗਿਆਨ ਸਿੰਘ), ਜੀਵਨ ਬਿਰਤਾਂਤ ਅਕਾਲੀ ਫੂਲਾ ਸਿੰਘ (ਬਾਬਾ ਪ੍ਰੇਮ ਸਿੰਘ ਹੋਤੀ)",
    "sourceCitations": [
      {
        "sourceName": "Baba Prem Singh Hoti — Akali Phula Singh (1914)",
        "sourceRef": "Historical biography and account of the Battle of Nowshera",
        "tier": 1
      },
      {
        "sourceName": "Giani Gian Singh — Tawarikh Guru Khalsa",
        "sourceRef": "Raj Khalsa, Chapter on the Fall of Nowshera and Akali Phula Singh's Martyrdom",
        "tier": 1
      }
    ],
    "quote": {
      "text": "The Khalsa has made its Ardas before the Guru! An Ardas offered to the Almighty can never be recalled for mortal hesitation!",
      "attribution": "Akali Phula Singh at the Battle of Nowshera (1823 CE)"
    },
    "quoteLocal": {
      "text": "खालसा ने गुरु के सम्मुख अरदास कर ली है! परमात्मा के चरणों में की गई अरदास कभी वापस नहीं ली जा सकती!",
      "attribution": "अकाली फूला सिंह (नौशेरा, १८२३ ई.)"
    },
    "quotePa": {
      "text": "ਖ਼ਾਲਸੇ ਨੇ ਗੁਰੂ ਅੱਗੇ ਅਰਦਾਸਾ ਸੋਧ ਲਿਆ ਹੈ! ਅਕਾਲ ਪੁਰਖ ਅੱਗੇ ਕੀਤੀ ਅਰਦਾਸ ਤੋਂ ਦੁਨਿਆਵੀ ਡਰ ਕਾਰਨ ਪਿੱਛੇ ਨਹੀਂ ਹਟਿਆ ਜਾ ਸਕਦਾ!",
      "attribution": "ਅਕਾਲੀ ਫੂਲਾ ਸਿੰਘ (੧੮੨੩ ਈ.)"
    }
  },
  {
    "id": "maharaja-ranjit-singh",
    "name": "Maharaja Ranjit Singh",
    "nameLocal": "महाराजा रणजीत सिंह",
    "namePa": "ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ",
    "era": "1780 – 1839 CE",
    "eraLocal": "१७८० – १८३९ ई.",
    "eraPa": "੧੭੮੦ – ੧੮੩੯ ਈ.",
    "tradition": "sikh",
    "region": "Gujranwala & Lahore, Punjab",
    "regionLocal": "गुजरांवाला व लाहौर, पंजाब",
    "regionPa": "ਗੁਜਰਾਂਵਾਲਾ ਤੇ ਲਾਹੌਰ, ਪੰਜਾਬ",
    "emoji": "👑",
    "tagline": "Sher-e-Punjab (Lion of Punjab) who united the fractured Misls into a sovereign, secular empire and covered Sri Harmandir Sahib in radiant gold.",
    "taglineLocal": "शेर-ए-पंजाब जिन्होंने बिखरी हुई मिसलों को एकजुट कर एक धर्मनिरपेक्ष सिख साम्राज्य की स्थापना की और हरिमंदिर साहिब को सोने से सुशोभित किया।",
    "taglinePa": "ਸ਼ੇਰ-ਏ-ਪੰਜਾਬ ਜਿਨ੍ਹਾਂ ਨੇ ਬਾਰਾਂ ਮਿਸਲਾਂ ਨੂੰ ਇਕੱਠਾ ਕਰਕੇ ਵਿਸ਼ਾਲ ਸਿੱਖ ਸਲਤਨਤ ਕਾਇਮ ਕੀਤੀ ਅਤੇ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ 'ਤੇ ਸੁਨਹਿਰੀ ਸੇਵਾ ਕਰਵਾਈ।",
    "journey": "Born in Gujranwala to Sardar Mahan Singh Sukerchakia and Mata Raj Kaur, young Ranjit Singh survived smallpox in infancy which left him blind in his left eye and pockmarked on his face. Succeeding to the chieftainship of the Sukerchakia Misl at the age of twelve in 1792, he displayed prodigious political intelligence, martial valor, and diplomatic vision. In 1799, at the young age of nineteen, he captured the historic capital of Lahore from the Afghan Bhangi rulers, ending decades of foreign invasions into Punjab.\n\nOn Baisakhi in 1801, Ranjit Singh was formally anointed Maharaja of Punjab, but steadfastly refused to sit on an imperial throne, opting to sit on a humble carpet or chair and minting currency named not after himself, but as the 'Nanakshahi rupee' bearing the names of Guru Nanak and Guru Gobind Singh. Uniting the twelve scattered Sikh Misls, he built the legendary Khalsa Fauj—modernizing it with European tactics alongside veteran Sikh cavalry. He expanded the Sikh Empire across Multan, Kashmir, Ladakh, and Peshawar, creating one of the most powerful and prosperous sovereign nations in nineteenth-century Asia.",
    "journeyLocal": "गुजरांवाला में जन्मे रणजीत सिंह बचपन में चेचक के कारण एक आंख की दृष्टि खो बैठे थे, किंतु उनकी बुद्धि और युद्ध-कौशल अद्वितीय था। १२ वर्ष की अल्पायु में मिसल की कमान संभालते हुए उन्होंने १७९९ में मात्र १९ वर्ष की आयु में लाहौर पर अधिकार कर लिया।\n\n१८०१ में उनका राज्याभिषेक हुआ, किंतु उन्होंने स्वयं को 'महाराजा' के बजाय 'खालसा का सेवक' माना। उन्होंने अपने नाम का सिक्का नहीं चलाया, बल्कि गुरु नानक देव जी के नाम पर 'नानकशाही सिक्का' जारी किया। उन्होंने सभी १२ मिसलों को एकजुट कर एक विशाल साम्राज्य की नींव रखी जो तिब्बत से खैबर दर्रे तक फैला हुआ था।",
    "journeyPa": "ਗੁਜਰਾਂਵਾਲਾ ਵਿਖੇ ਜਨਮੇ ਰਣਜੀਤ ਸਿੰਘ ਨੇ ੧੭੯੯ ਵਿਚ ਲਾਹੌਰ 'ਤੇ ਕਬਜ਼ਾ ਕੀਤਾ ਅਤੇ ੧੮੦੧ ਵਿਚ ਸਿੱਖ ਰਾਜ ਦੀ ਨੀਂਹ ਰੱਖੀ। ਉਹਨਾਂ ਨੇ ਆਪਣੇ ਨਾਂ ਦਾ ਸਿੱਕਾ ਚਲਾਉਣ ਦੀ ਥਾਂ 'ਨਾਨਕਸ਼ਾਹੀ ਸਿੱਕਾ' ਚਲਾਇਆ।\n\nਬਾਰਾਂ ਮਿਸਲਾਂ ਨੂੰ ਇਕੱਠਾ ਕਰਕੇ ਆਧੁਨਿਕ ਖ਼ਾਲਸਾ ਫ਼ੌਜ ਤਿਆਰ ਕੀਤੀ ਅਤੇ ਮੁਲਤਾਨ, ਕਸ਼ਮੀਰ, ਲੱਦਾਖ਼ ਤੇ ਪੇਸ਼ਾਵਰ ਨੂੰ ਜਿੱਤ ਕੇ ਸਿੱਖ ਰਾਜ ਦਾ ਝੰਡਾ ਬੁਲੰਦ ਕੀਤਾ।",
    "trial": "Maharaja Ranjit Singh’s crowning glory lay not merely in his military conquests, but in his extraordinary commitment to secular justice, religious tolerance, and complete absence of capital punishment. Throughout his forty-year reign, despite ruling a land filled with warring ethnic factions and assassinations, Ranjit Singh never once executed a single criminal or political enemy, demonstrating an unprecedented ethos of royal clemency in world history.\n\nHis government was a masterclass in inclusive meritocracy: his Prime Minister was a Dogra Rajput (Dhyan Singh), his Foreign Minister was a Muslim (Fakir Azizuddin), his Finance Minister was a Hindu Brahmin (Dina Nath), and his supreme generals included Sikhs, Hindus, Muslims, and European officers (Allard, Ventura, Court). When an impoverished Muslim calligrapher spent his entire life hand-writing a magnificent copy of the Holy Quran, he sought buyers across northern India without success; learning of this, Ranjit Singh purchased the Quran for an immense sum, placed it upon his forehead in reverence, and declared: 'God intended me to look upon all religions with one eye, which is why He took away the sight of my other.' In his devotion to the Gurus, he commissioned the gilding of Sri Harmandir Sahib in pure gold leaf (earning it the name Golden Temple) and donated enormous wealth, including jeweled chandeliers and the golden canopy, as well as donating golden plates to the Kashi Vishwanath temple in Varanasi and the Jwalamukhi temple in Himachal Pradesh.",
    "trialLocal": "महाराजा रणजीत सिंह के शासन की सबसे बड़ी विशेषता उनका न्याय और धार्मिक सहिष्णुता थी। अपने ४० वर्ष के शासनकाल में उन्होंने किसी भी अपराधी को 'मृत्युदंड' नहीं दिया, जो विश्व इतिहास में एक दुर्लभ मिसाल है। उनके दरबार में हिंदू, सिख, मुस्लिम और ईसाई सभी को योग्यता के आधार पर उच्च पद प्राप्त थे।\n\nजब एक मुस्लिम सुलेखक द्वारा लिखी गई पवित्र कुरान की कोई कद्र नहीं कर रहा था, तो महाराजा ने उसे भारी धनराशि देकर खरीदा और सिर पर लगाया। उन्होंने कहा: 'ईश्वर ने मेरी एक आंख इसलिए ली ताकि मैं सभी धर्मों को एक आंख से समान दृष्टि से देख सकूँ।' उन्होंने श्री हरिमंदिर साहिब पर सोना चढ़वाकर उसे 'स्वर्ण मंदिर' का स्वरूप दिया, तथा काशी विश्वनाथ मंदिर और ज्वालाजी मंदिर को भी स्वर्ण-दान दिया।",
    "trialPa": "ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਨੇ ਆਪਣੇ ੪੦ ਸਾਲਾ ਰਾਜ ਵਿਚ ਕਿਸੇ ਇੱਕ ਵੀ ਵਿਅਕਤੀ ਨੂੰ ਫਾਂਸੀ ਦੀ ਸਜ਼ਾ ਨਹੀਂ ਦਿੱਤੀ। ਉਹਨਾਂ ਦੇ ਦਰਬਾਰ ਵਿਚ ਧਰਮ ਦੇ ਆਧਾਰ 'ਤੇ ਕੋਈ ਵਿਤਕਰਾ ਨਹੀਂ ਸੀ; ਫ਼ਕੀਰ ਅਜ਼ੀਜ਼ੁਦੀਨ ਅਤੇ ਦੀਵਾਨ ਦੀਨਾ ਨਾਥ ਵਰਗੇ ਉੱਚ ਅਹੁਦਿਆਂ 'ਤੇ ਸਨ।\n\nਉਹਨਾਂ ਨੇ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ 'ਤੇ ਸੋਨੇ ਦੀ ਸੇਵਾ ਕਰਵਾਈ ਜਿਸ ਨਾਲ ਇਹ 'ਗੋਲਡਨ ਟੈਂਪਲ' ਵਜੋਂ ਪ੍ਰਸਿੱਧ ਹੋਇਆ। ਉਹਨਾਂ ਨੇ ਕਾਸ਼ੀ ਵਿਸ਼ਵਨਾਥ ਮੰਦਰ ਨੂੰ ਵੀ ਸੋਨਾ ਭੇਟ ਕੀਤਾ। ਉਹਨਾਂ ਦਾ ਫ਼ੁਰਮਾਨ ਸੀ ਕਿ ਰੱਬ ਨੇ ਮੈਨੂੰ ਇੱਕ ਅੱਖ ਇਸ ਲਈ ਦਿੱਤੀ ਹੈ ਤਾਂ ਜੋ ਮੈਂ ਸਾਰੇ ਧਰਮਾਂ ਨੂੰ ਇੱਕੋ ਨਜ਼ਰ ਨਾਲ ਦੇਖ ਸਕਾਂ।",
    "teaching": "Maharaja Ranjit Singh taught that a true ruler is not an autocratic master, but a servant-trustee of the people and the Divine. Power finds its justification in universal justice, the abolition of vengeance, protection of the weak, and creating prosperity where all faiths flourish without fear.",
    "teachingLocal": "महाराजा रणजीत सिंह ने सिखाया कि शासक जनता का स्वामी नहीं, बल्कि ईश्वर का सेवक और न्यासी होता है। सत्ता की सार्थकता न्याय, दया और सभी धर्मों के आदर में है।",
    "teachingPa": "ਸ਼ੇਰ-ਏ-ਪੰਜਾਬ ਨੇ ਸਿਖਾਇਆ ਕਿ ਰਾਜਭਾਗ ਲੋਕਾਂ ਦੀ ਸੇਵਾ ਅਤੇ ਇਨਸਾਫ਼ ਲਈ ਹੁੰਦਾ ਹੈ। ਸਰਬ-ਸਾਂਝੀਵਾਲਤਾ ਅਤੇ ਦਇਆ ਹੀ ਸੱਚੇ ਸ਼ਾਸਕ ਦਾ ਗਹਿਣਾ ਹੈ।",
    "moral": "Sovereignty rooted in tolerance, merit, and compassion builds an invincible nation. True strength lies not in the cruelty of punishment, but in the magnanimity of forgiveness and the upliftment of all.",
    "moralLocal": "सहिष्णुता और न्याय पर आधारित राज्य ही दीर्घकाल तक जनता के हृदय में जीवित रहता है। क्षमा और सर्वधर्म-समभाव ही महान शासक की वास्तविक शक्ति हैं।",
    "moralPa": "ਨਿਆਂ ਅਤੇ ਦਇਆ ਨਾਲ ਚਲਾਇਆ ਰਾਜ ਹੀ ਲੋਕਾਂ ਦੇ ਦਿਲਾਂ 'ਤੇ ਰਾਜ ਕਰਦਾ ਹੈ। ਨਿਰਪੱਖਤਾ ਅਤੇ ਮਿਹਨਤ ਨਾਲ ਅਸੰਭਵ ਨੂੰ ਵੀ ਸੰਭਵ ਬਣਾਇਆ ਜਾ ਸਕਦਾ ਹੈ।",
    "legacy": "Maharaja Ranjit Singh is universally celebrated as the greatest sovereign of Punjab, whose reign is remembered as the Golden Age of Punjab. His samadhi at Lahore and the radiant golden domes of Sri Harmandir Sahib stand as eternal monuments to his enlightened servant-kingship.",
    "legacyLocal": "महाराजा रणजीत सिंह का काल पंजाब का स्वर्णिम युग कहलाता है। लाहौर में उनकी समाधि और अमृतसर में स्वर्ण मंदिर का भव्य स्वरूप आज भी उनके युगप्रवर्तक शासन की गाथा कहते हैं।",
    "legacyPa": "ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਦਾ ਰਾਜ ਸਿੱਖ ਇਤਿਹਾਸ ਦਾ ਸੁਨਹਿਰੀ ਦੌਰ ਹੈ। ਲਾਹੌਰ ਵਿਖੇ ਉਹਨਾਂ ਦੀ ਸਮਾਧ ਅਤੇ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ 'ਤੇ ਸੋਨੇ ਦੀ ਚਮਕ ਉਹਨਾਂ ਦੇ ਨਾਂ ਨੂੰ ਸਦਾ ਰੌਸ਼ਨ ਰੱਖਦੀ ਹੈ।",
    "source": "Umdat-ut-Tawarikh (Sohan Lal Suri), The Real Ranjit Singh (Fakir Syed Waheeduddin), History of the Sikhs (J.D. Cunningham)",
    "sourceLocal": "उमदत-उत-तवारीख (सोहन लाल सूरी), द रियल रणजीत सिंह (फ़कीर सैयद वहीदुद्दीन), हिस्ट्री ऑफ द सिख्स",
    "sourcePa": "ਉਮਦਾਤ-ਉਤ-ਤਵਾਰੀਖ਼ (ਸੋਹਨ ਲਾਲ ਸੂਰੀ), ਦ ਰੀਅਲ ਰਣਜੀਤ ਸਿੰਘ (ਫ਼ਕੀਰ ਸੱਯਦ ਵਹੀਦੁਦੀਨ), ਹਿਸਟਰੀ ਆਫ਼ ਦ ਸਿੱਖਸ",
    "sourceCitations": [
      {
        "sourceName": "Sohan Lal Suri — Umdat-ut-Tawarikh",
        "sourceRef": "Official court chronicle of the Lahore Darbar (Daftars II–IV)",
        "tier": 1
      },
      {
        "sourceName": "Fakir Syed Waheeduddin — The Real Ranjit Singh",
        "sourceRef": "Family memoirs of the Maharaja's Foreign Minister Fakir Azizuddin",
        "tier": 1
      }
    ],
    "quote": {
      "text": "God intended me to look upon all religions with one eye; that is why He took away the light from my other eye.",
      "attribution": "Maharaja Ranjit Singh to Fakir Azizuddin (Lahore Darbar)"
    },
    "quoteLocal": {
      "text": "ईश्वर की इच्छा थी कि मैं सभी धर्मों को एक समान दृष्टि से देखूं, इसीलिए उसने मेरी दूसरी आंख की रोशनी ले ली।",
      "attribution": "महाराजा रणजीत सिंह (लाहौर दरबार)"
    },
    "quotePa": {
      "text": "ਰੱਬ ਦੀ ਰਜ਼ਾ ਸੀ ਕਿ ਮੈਂ ਸਾਰੇ ਧਰਮਾਂ ਨੂੰ ਇੱਕੋ ਅੱਖ ਨਾਲ ਵੇਖਾਂ, ਇਸੇ ਕਰਕੇ ਉਸ ਨੇ ਮੇਰੀ ਦੂਜੀ ਅੱਖ ਦਾ ਨੂਰ ਲੈ ਲਿਆ।",
      "attribution": "ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ (ਲਾਹੌਰ ਦਰਬਾਰ)"
    }
  },
  {
    "id": "nawab-jassa-singh",
    "name": "Nawab Jassa Singh Ahluwalia",
    "nameLocal": "नवाब जस्सा सिंह आहलूवालिया",
    "namePa": "ਨਵਾਬ ਜੱਸਾ ਸਿੰਘ ਆਹਲੂਵਾਲੀਆ",
    "era": "1718 – 1783 CE",
    "eraLocal": "१७१८ – १७८३ ई.",
    "eraPa": "੧੭੧੮ – ੧੭੮੩ ਈ.",
    "tradition": "sikh",
    "region": "Amritsar, Lahore & Delhi",
    "regionLocal": "अमृतसर, लाहौर व दिल्ली",
    "regionPa": "ਅੰਮ੍ਰਿਤਸਰ, ਲਾਹੌਰ ਤੇ ਦਿੱਲੀ",
    "emoji": "⚔️",
    "tagline": "Sultan-ul-Qaum (King of the Nation) who commanded the Dal Khalsa, liberated thousands of Hindu captives from Abdali, and hoisted the Sikh Nishan Sahib over the Red Fort.",
    "taglineLocal": "सुल्तान-उल-कौम जिन्होंने दल खालसा का नेतृत्व किया, अब्दाली के चंगुल से हजारों निर्दोष हिंदू कन्याओं को मुक्त कराया और दिल्ली के लाल किले पर निशान साहिब फहराया।",
    "taglinePa": "ਸੁਲਤਾਨ-ਉਲ-ਕੌਮ ਜਿਨ੍ਹਾਂ ਨੇ ਦਲ ਖ਼ਾਲਸਾ ਦੀ ਅਗਵਾਈ ਕਰਦਿਆਂ ਅਬਦਾਲੀ ਤੋਂ ਹਜ਼ਾਰਾਂ ਬੰਦੀ ਬੱਚੀਆਂ ਛੁਡਵਾਈਆਂ ਅਤੇ ਦਿੱਲੀ ਦੇ ਲਾਲ ਕਿਲ੍ਹੇ 'ਤੇ ਨਿਸ਼ਾਨ ਸਾਹਿਬ ਝੁਲਾਇਆ।",
    "journey": "Born in the village of Ahlu near Lahore to Sardar Badar Singh, young Jassa Singh lost his father at age four. His mother took the child to Delhi, seeking refuge in the holy household of Mata Sundri Ji (widow of Guru Gobind Singh Ji). For seven formative years, young Jassa Singh was lovingly raised under Mata Sundri’s direct guidance, learning Gurbani recitation, Persian, and singing classical kirtan with melodious devotion.\n\nIn 1729, Mata Sundri entrusted Jassa Singh to Nawab Kapur Singh, the supreme leader of the nascent Sikh confederacy. Impressed by his integrity, physical strength, and spiritual humility, Kapur Singh trained him in horse-riding and warfare, eventually adopting him as his spiritual son. In 1748, at the historic Sarbat Khalsa meeting at Amritsar on Baisakhi, Nawab Kapur Singh consolidated the scattered Sikh guerrilla bands into the unified *Dal Khalsa*, appointing the thirty-year-old Jassa Singh Ahluwalia as the supreme Supreme Commander of the entire Sikh armed forces.",
    "journeyLocal": "लाहौर के निकट आहलु गाँव में जन्मे जस्सा सिंह के सिर से बाल्यकाल में ही पिता का साया उठ गया था। उनकी माता उन्हें दिल्ली में माता सुंदरी जी (गुरु गोबिंद सिंह जी की धर्मपत्नी) के पास ले गईं, जहाँ सात वर्षों तक उन्होंने गुरबाणी और शास्त्रीय संगीत की शिक्षा ली।\n\n१७२९ में माता सुंदरी जी ने उन्हें नवाब कपूर सिंह को सौंप दिया, जिन्होंने उन्हें युद्ध-कला और घुड़सवारी में पारंगत किया। १७४८ की बैसाखी को अमृतसर में सर्वत खालसा ने जस्सा सिंह आहलूवालिया को समूचे 'दल खालसा' का प्रधान सेनापति नियुक्त किया।",
    "journeyPa": "ਪਿੰਡ ਆਹਲੂ ਵਿਖੇ ਜਨਮੇ ਜੱਸਾ ਸਿੰਘ ਜੀ ਨੇ ਬਚਪਨ ਦਿੱਲੀ ਵਿਖੇ ਮਾਤਾ ਸੁੰਦਰੀ ਜੀ ਦੀ ਛਤਰ-ਛਾਇਆ ਹੇਠ ਬਿਤਾਇਆ। ਬਾਅਦ ਵਿਚ ਨਵਾਬ ਕਪੂਰ ਸਿੰਘ ਜੀ ਨੇ ਉਹਨਾਂ ਨੂੰ ਸ਼ਸਤਰ ਵਿੱਦਿਆ ਦਿੱਤੀ ਅਤੇ ਆਪਣਾ ਧਰਮ-ਪੁੱਤਰ ਬਣਾਇਆ।\n\n੧੭੪੮ ਵਿਚ ਸਰਬੱਤ ਖ਼ਾਲਸਾ ਨੇ ਆਪ ਜੀ ਨੂੰ 'ਦਲ ਖ਼ਾਲਸਾ' ਦਾ ਸਰਬ-ਉੱਚ ਜਰਨੈਲ ਥਾਪਿਆ।",
    "trial": "Nawab Jassa Singh Ahluwalia led the Dal Khalsa through the most horrific holocaust in Sikh history—the Vadda Ghallughara (The Great Massacre) of February 5, 1762, near Kup-Rahira. The Afghan conqueror Ahmad Shah Abdali, marching with a massive cavalry force of over thirty thousand troops, surrounded an entire migrating caravan of fifty thousand Sikh non-combatants, women, and children. In a running battle of forty miles across open plains, Jassa Singh Ahluwalia and Sardar Charat Singh Sukerchakia formed a moving square of cavalry around the caravan, repelling wave after wave of Afghan charges. Though over twenty thousand Sikhs fell that day and Jassa Singh suffered over twenty-two wounds on his body, his defensive masterpiece saved thirty thousand lives.\n\nHis greatest act of humanitarian heroism occurred following Abdali’s raid in 1761, when the Afghan army was escorting over two thousand young Hindu women and girls captive to Kabul to be sold into slavery. Learning of this atrocity, Nawab Jassa Singh led a lightning night raid upon the Afghan rear guard at the Sutlej river crossing. Scattering the Afghan guards, the Khalsa liberated all two thousand women, provided them with food, clothes, and financial aid, and escorted every single daughter safely back to her family across northern India, earning him the immortal title 'Bandi Chhor' (Liberator of the Captives).\n\nIn 1761, Jassa Singh captured Lahore, minting the first independent Sikh coins and being proclaimed 'Sultan-ul-Qaum' (King of the Nation) by the Panth. In March 1783, uniting with Sardar Baghel Singh and Baba Jassa Singh Ramgarhia, Nawab Jassa Singh marched thirty thousand Sikh warriors into Delhi, defeating the Mughal imperial garrison, capturing the Red Fort, and hoisting the Sikh Nishan Sahib over the Diwan-i-Am, breaking the final vestige of Mughal supremacy over India.",
    "trialLocal": "५ फरवरी १७६२ को 'वडा घल्लूघारा' (विशाल नरसंहार) के दौरान जब अहमद शाह अब्दाली ने ५०,००० सिखों के काफिले को घेर लिया, तब जस्सा सिंह आहलूवालिया ने अपने शरीर पर २२ घाव खाकर भी ३०,००० मासूमों की जान बचाई।\n\n१७६१ में जब अब्दाली २,००० हिंदू कन्याओं को बंदी बनाकर अफ़गानिस्तान ले जा रहा था, तब जस्सा सिंह ने सतलुज नदी पर रात में हमला कर सभी कन्याओं को मुक्त कराया और सुरक्षित उनके घरों तक पहुँचाया, जिससे उन्हें 'बंदी छोड़' कहा गया। मार्च १७८३ में उन्होंने लाल किले पर तिरंगा-नुमा 'निशान साहिब' फहराकर मुग़ल सत्ता का घमंड हमेशा के लिए तोड़ दिया।",
    "trialPa": "੧੭੬੨ ਦੇ 'ਵੱਡੇ ਘੱਲੂਘਾਰੇ' ਵਿਚ ੨੨ ਫ਼ੱਟ ਖਾ ਕੇ ਵੀ ਕੌਮ ਦੀ ਅਗਵਾਈ ਕੀਤੀ। ੧੭੬੧ ਵਿਚ ਅਹਿਮਦ ਸ਼ਾਹ ਅਬਦਾਲੀ ਵੱਲੋਂ ਗ਼ੁਲਾਮ ਬਣਾ ਕੇ ਲਿਜਾਈਆਂ ਜਾ ਰਹੀਆਂ ੨,੨੦੦ ਹਿੰਦੂ ਬਹੂ-ਬੇਟੀਆਂ ਨੂੰ ਸਤਲੁਜ ਕੰਢੇ ਛਾਪਾ ਮਾਰ ਕੇ ਛੁਡਵਾਇਆ ਅਤੇ ਸੁਰੱਖਿਅਤ ਘਰੋ-ਘਰੀ ਪਹੁੰਚਾਇਆ, ਜਿਸ ਕਰਕੇ 'ਬੰਦੀ ਛੋੜ' ਕਹਾਏ।\n\n੧੭੮੩ ਵਿਚ ਦਿੱਲੀ ਫ਼ਤਿਹ ਕਰਕੇ ਲਾਲ ਕਿਲ੍ਹੇ ਦੇ ਦੀਵਾਨ-ਏ-ਆਮ 'ਤੇ ਖ਼ਾਲਸਾਈ ਨਿਸ਼ਾਨ ਸਾਹਿਬ ਝੁਲਾਇਆ ਅਤੇ 'ਸੁਲਤਾਨ-ਉਲ-ਕੌਮ' ਦਾ ਖ਼ਿਤਾਬ ਪਾਇਆ।",
    "teaching": "Nawab Jassa Singh Ahluwalia demonstrated that martial prowess finds its highest divine justification in liberating the oppressed, protecting women's honor, and maintaining personal humility amidst absolute victory. He refused to sit on imperial thrones, considering himself merely a humble servant of the Khalsa Panth.",
    "teachingLocal": "नवाब जस्सा सिंह आहलूवालिया ने सिद्ध किया कि तलवार की सार्थकता पीड़ित की रक्षा और नारी के सम्मान की हिफाजत में है। विजय के शिखर पर भी अहंकार न करना ही सच्चे संत-सिपाही की पहचान है।",
    "teachingPa": "ਸੁਲਤਾਨ-ਉਲ-ਕੌਮ ਨੇ ਸਿਖਾਇਆ ਕਿ ਸ਼ਸਤਰਾਂ ਦੀ ਵਰਤੋਂ ਮਜ਼ਲੂਮਾਂ ਦੀ ਰਾਖੀ ਅਤੇ ਔਰਤਾਂ ਦੀ ਇੱਜ਼ਤ ਬਚਾਉਣ ਲਈ ਹੀ ਸੋਭਦੀ ਹੈ। ਵੱਡੀਆਂ ਜਿੱਤਾਂ ਪ੍ਰਾਪਤ ਕਰਕੇ ਵੀ ਖ਼ਾਲਸੇ ਦਾ ਨਿਮਾਣਾ ਸੇਵਕ ਬਣੇ ਰਹਿਣਾ ਹੀ ਸਿੱਖੀ ਦਾ ਆਦਰਸ਼ ਹੈ।",
    "moral": "True nobility is measured by how many captives you liberate, not how many captives you enslave. Moral courage and selfless service elevate a leader to an immortal beacon of freedom.",
    "moralLocal": "सच्चा विजेता वही है जो दूसरों को स्वतंत्रता दिलाए। जो व्यक्ति निःस्वार्थ भाव से समाज की रक्षा करता है, इतिहास उसे सदैव नमन करता है।",
    "moralPa": "ਦੂਜਿਆਂ ਦੀ ਆਜ਼ਾਦੀ ਲਈ ਆਪਣੀ ਜਾਨ ਤਲੀ 'ਤੇ ਧਰਨ ਵਾਲਾ ਹੀ ਅਸਲ ਜਰਨੈਲ ਹੁੰਦਾ ਹੈ। ਸੱਚੇ ਸੇਵਕ ਨੂੰ ਰਾਜਭਾਗ ਦਾ ਕੋਈ ਹੰਕਾਰ ਨਹੀਂ ਹੁੰਦਾ।",
    "legacy": "Nawab Jassa Singh Ahluwalia was the founding father of the Ahluwalia Misl and the Kapurthala state. His leadership preserved the Sikh faith through its darkest eighteenth-century persecutions, laying the bedrock for the sovereign empire of Maharaja Ranjit Singh. He rebuilt Sri Harmandir Sahib after its destruction by Abdali, spending his personal wealth on its sacred reconstruction.",
    "legacyLocal": "नवाब जस्सा सिंह आहलूवालिया ने १८वीं शताब्दी के घोर संकट में सिख धर्म की रक्षा की। उन्होंने अब्दाली द्वारा तोड़े गए श्री हरिमंदिर साहिब का पुनर्निर्माण कराया और उनकी समाधि अमृतसर में अकाल तख्त के समीप स्थित है।",
    "legacyPa": "ਸੁਲਤਾਨ-ਉਲ-ਕੌਮ ਨੇ ਅਬਦਾਲੀ ਵੱਲੋਂ ਢਾਹੇ ਗਏ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਦੀ ਦਰਸ਼ਨੀ ਡਿਓੜੀ ਅਤੇ ਸਰੋਵਰ ਦੀ ਪੁਨਰ-ਉਸਾਰੀ ਕਰਵਾਈ। ਉਹਨਾਂ ਦੀ ਸਮਾਧ ਸ੍ਰੀ ਅੰਮ੍ਰਿਤਸਰ ਸਾਹਿਬ ਵਿਖੇ ਸਥਿਤ ਹੈ।",
    "source": "Prachin Panth Prakash (Rattan Singh Bhangu), Jassa Singh Ahluwalia (Dr. Ganda Singh), Tawarikh Guru Khalsa",
    "sourceLocal": "प्राचीन पंथ प्रकाश (रतन सिंह भंगू), जस्सा सिंह आहलूवालिया (डॉ. गंडा सिंह), तवारीख गुरु खालसा",
    "sourcePa": "ਪ੍ਰਾਚੀਨ ਪੰਥ ਪ੍ਰਕਾਸ਼ (ਰਤਨ ਸਿੰਘ ਭੰਗੂ), ਸਰਦਾਰ ਜੱਸਾ ਸਿੰਘ ਆਹਲੂਵਾਲੀਆ (ਡਾ. ਗੰਡਾ ਸਿੰਘ), ਤਵਾਰੀਖ਼ ਗੁਰੂ ਖ਼ਾਲਸਾ",
    "sourceCitations": [
      {
        "sourceName": "Rattan Singh Bhangu — Prachin Panth Prakash",
        "sourceRef": "Chapters on the Rise of Nawab Jassa Singh and the Vadda Ghallughara",
        "tier": 1
      },
      {
        "sourceName": "Dr. Ganda Singh — Sardar Jassa Singh Ahluwalia (1969)",
        "sourceRef": "Historical monograph based on contemporary Persian and Sikh records",
        "tier": 1
      }
    ],
    "quote": {
      "text": "The Khalsa takes up the sword not to enslave humanity or conquer kingdoms, but to shatter the chains of the captive and protect the honor of our sisters!",
      "attribution": "Nawab Jassa Singh Ahluwalia at the Sutlej River (1761 CE)"
    },
    "quoteLocal": {
      "text": "खालसा तलवार किसी को बंदी बनाने के लिए नहीं, बल्कि बंदियों की बेड़ियाँ काटने और बहनों के सम्मान की रक्षा हेतु उठाता है!",
      "attribution": "नवाब जस्सा सिंह आहलूवालिया (१७६१ ई.)"
    },
    "quotePa": {
      "text": "ਖ਼ਾਲਸਾ ਤਲਵਾਰ ਕਿਸੇ ਨੂੰ ਗ਼ੁਲਾਮ ਬਣਾਉਣ ਲਈ ਨਹੀਂ, ਸਗੋਂ ਗ਼ੁਲਾਮਾਂ ਦੀਆਂ ਬੇੜੀਆਂ ਕੱਟਣ ਅਤੇ ਧੀਆਂ-ਭੈਣਾਂ ਦੀ ਪੱਤ ਰੱਖਣ ਲਈ ਚੁੱਕਦਾ ਹੈ!",
      "attribution": "ਨਵਾਬ ਜੱਸਾ ਸਿੰਘ ਆਹਲੂਵਾਲੀਆ (੧੭੬੧ ਈ.)"
    }
  },
  {
    "id": "rishabhanatha",
    "name": "Lord Rishabhanatha (Adinatha)",
    "nameLocal": "भगवान ऋषभदेव (आदिनाथ)",
    "era": "Beginning of Avasarpini Era",
    "eraLocal": "अवसर्पिणी काल का प्रारंभ",
    "tradition": "jain",
    "region": "Ayodhya / Mount Ashtapada",
    "regionLocal": "अयोध्या / अष्टापद पर्वत",
    "emoji": "🐂",
    "tagline": "The first Tirthankara of our cosmic age who laid the foundations of human civilization, polity, and agriculture, before renouncing all sovereignty to attain absolute spiritual liberation.",
    "taglineLocal": "वर्तमान अवसर्पिणी काल के प्रथम तीर्थंकर, जिन्होंने मानव सभ्यता, कृषि व नीति की नींव रखी और फिर सर्वस्व त्याग कर कैवल्य ज्ञान प्राप्त किया।",
    "journey": "In the dawn of our cosmic cycle, as the wish-fulfilling trees (Kalpavrikshas) naturally withered and humanity stood bewildered by scarcity and desire, Rishabhanatha was born as the crown prince of Ayodhya to King Nabhi and Queen Marudevi. Recognizing that humanity needed institutional order to survive peacefully without descent into mutual destruction, Rishabhanatha instituted the foundational structures of human society. He introduced the six essential livelihoods: Asi (defense and justice), Masi (writing and record-keeping), Krishi (agrarian cultivation), Vidya (sciences and arts), Vanijya (ethical commerce), and Shilpa (craftsmanship and architecture). He established the first judicial codes, established marriage as a sacred social contract, and personally tutored his daughters Brahmi and Sundari in linguistics, mathematics, and philosophy, laying the ground for India's earliest written scripts. Under his righteous monarchical reign, society flourished in peace, industry, and spiritual equilibrium for thousands of years.\n\nYet the soul of Rishabhanatha was forever attuned to absolute transcendence. During a celestial dance performance in his royal court by the divine maiden Nilanjana, she suddenly collapsed and passed away in an instant. The gods swiftly replaced her with another dancer so the court would not perceive the tragedy, but the discerning eye of Rishabhanatha caught the impermanence of mortal life in its stark reality. The sudden dissolution of beauty illuminated the transient nature of all worldly existence—sovereignty, power, youth, and physical beauty were all transient mirages swept away by the river of time. Without hesitation, Rishabhanatha decided to abandon his vast empire, apportioning the realm fairly among his hundred sons—giving the capital of Ayodhya to his eldest son Bharata and the southern territories to Bahubali. Accompanied by four thousand royal subjects who resolved to follow his monastic footsteps, he walked barefoot out of Ayodhya, tore out his hair in five handfuls (Kesh Lochan), and entered the boundless forest to practice unyielding meditation.\n\nFor one thousand unbroken years, Rishabhanatha walked the earth as an austere digambara ascetic. Because humanity had never before witnessed an ascetic mendicant, people did not understand how to offer him food according to monastic vows (Gocharan). For four hundred continuous days, Rishabhanatha wandered without accepting sustenance, maintaining absolute silence and equanimity amidst starvation and seasonal tempests. Finally, his great-grandson Prince Shreyamsa at Hastinapur intuitively perceived the pure ascetic rite and offered him fresh sugarcane juice (Ikshu-rasa)—a moment eternally commemorated as Akshaya Tritiya. Rishabhanatha continued intense penance until, seated under a great banyan tree at Purimatala, he eradicated all four destructive karmas (Ghatiya Karmas) and attained Kevala Jnana—supreme omniscience. He subsequently established the fourfold community (Chaturvidha Sangha) of monks, nuns, laymen, and laywomen, showing that every living soul possesses identical capacity to awaken from delusion.",
    "journeyLocal": "अवसर्पिणी काल के आरंभ में जब कल्पवृक्ष लुप्त होने लगे और समाज में अभाव व भ्रम उत्पन्न हुआ, तब अयोध्या में राजा नाभिराज और महारानी मरुदेवी के गृह में भगवान ऋषभदेव का अवतरण हुआ। उन्होंने मानव सभ्यता को व्यवस्था और जीवन-यापन के साधन प्रदान करने के लिए छह महाशिल्पों का सूत्रपात किया—असि (सुरक्षा), मसि (लेखन), कृषि (खेती), विद्या (ज्ञान व कलाएं), वाणिज्य (व्यापार) और शिल्प (दस्तकारी)। उन्होंने अपनी पुत्रियों ब्राह्मी और सुंदरी को लिपि व गणित की शिक्षा दी, जिससे भारतीय लिपियों का विकास हुआ। उनके न्यायप्रिय शासन में प्रजा ने सहस्रों वर्षों तक शांति और धर्म का अनुभव किया।\n\nएक दिन राजसभा में अप्सरा नीलांजना का मनमोहक नृत्य चल रहा था कि अचानक उसका देहांत हो गया। यद्यपि देवों ने तुरंत दूसरी नर्तकी खड़ी कर दी, परंतु ऋषभदेव की अंतर्दृष्टि ने संसार की क्षणभंगुरता को तत्काल पहचान लिया। उन्होंने विचार किया कि जिस शरीर और ऐश्वर्य पर जीव इतराता है, वह बिजली की कौंध के समान नश्वर है। उन्होंने तुरंत अपने साम्राज्य का भार सौ पुत्रों में बांट दिया—अयोध्या का शासन चक्रवर्ती भरत को और पोदनपुर का शासन बाहुबली को सौंपकर, वे स्वयं चार सहस्र राजाओं के साथ दिगंबर दीक्षा लेकर वन की ओर निकल पड़े।\n\nसंन्यास के पश्चात् वे एक सहस्र वर्षों तक घोर तपश्चर्या में लीन रहे। उस समय समाज को श्रमणों को आहार देने की विधि ज्ञात न थी, जिसके कारण ऋषभदेव लगभग चार सौ दिनों तक निराहार विचरते रहे। अंततः हस्तिनापुर के राजकुमार श्रेयांस ने अपने जातिस्मरण ज्ञान से उनकी चर्या पहचानी और उन्हें इक्षुरस (गन्ने का रस) का दान दिया—यह पावन दिवस आज भी 'अक्षय तृतीया' के रूप में मनाया जाता है। घोर ध्यान के पश्चात् पुरिमताल के वटवृक्ष के नीचे उन्हें केवलज्ञान (सर्वज्ञता) प्राप्त हुआ। इसके बाद उन्होंने मुनि, आर्यिका, श्रावक और श्राविका रूप चतुर्विध संघ की स्थापना की और अष्टापद पर्वत पर निर्वाण प्राप्त किया।",
    "trial": "Rishabhanatha's supreme trial was enduring four hundred days of continuous fasting while wandering through villages that knew nothing of ascetic charity. When people brought him gold, elephants, jewels, and maidens instead of simple pure food, he accepted their incomprehension without frustration or sorrow. He endured extreme hunger, winter frost, and summer heat in absolute silent equanimity, never demanding or asking for anything, proving that true freedom is internal detachment from physical comfort.",
    "trialLocal": "भगवान आदिनाथ की सबसे बड़ी परीक्षा चार सौ दिनों तक बिना अन्न-जल के एकाकी विचरण करना था। उस समय संसार साधु-चर्या से अनभिज्ञ था; लोग उनके चरणों में रत्न, स्वर्ण और हाथी अर्पित करते, परंतु शुद्ध सात्विक आहार कोई न दे सका। इस दारुण क्षुधा, तृषा और शीत-घाम को उन्होंने बिना एक शब्द कहे परम समता भाव से सहा, जिससे यह सिद्ध हुआ कि आत्मा की तृप्ति भौतिक साधनों पर नहीं, आत्मिक वैराग्य पर निर्भर करती है।",
    "teaching": "Adinatha taught that spiritual liberation is the natural constitutional state of the pure soul (Jiva), obscured only by encrusted karmic particles accrued through attachment (Raga) and aversion (Dvesha). Life must be grounded in Ahimsa (non-violence to all sentient life), ethical livelihood, and internal renunciation. True sovereignty is not ruling empires across continents, but conquering one's own senses and passions through continuous mindfulness and self-restraint.",
    "teachingLocal": "आदिनाथ भगवान ने उपदेश दिया कि मुक्ति आत्मा का स्वाभाविक स्वरूप है, जो राग-द्वेष और कर्मों के आवरण से ढका हुआ है। अहिंसा, सत्य और अपरिग्रह ही जीवन के मूल आधार हैं। सच्चा चक्रवर्ती वह नहीं जो देशों को जीतता है, अपितु सच्चा विजेता वह 'जिन' है जो अपनी इंद्रियों और अंतःकरण के विकारों पर पूर्ण विजय प्राप्त कर लेता है।",
    "moral": "Real civilization begins with compassion and ethical livelihood, but finds its highest fulfillment in inner mastery. No matter how high our societal achievements or responsibilities, we must cultivate the discernment to recognize worldly impermanence and keep our soul detached from possessiveness.",
    "moralLocal": "सच्ची सभ्यता भौतिक साधनों के विकास से नहीं, अपितु करुणा और अंतर्मुखी वैराग्य से पूर्ण होती है। सांसारिक कर्तव्यों का निर्वहन करते हुए भी अपनी चेतना को नश्वर बंधनों से मुक्त रखना ही सच्चा पुरुषार्थ है।",
    "legacy": "As the first Tirthankara, Adinatha founded the sacred Shramana tradition that flowered through twenty-four Tirthankaras culminating in Bhagwan Mahavira. His life established the spiritual geometry of Jain monasticism, the ethic of unconditional non-violence, and the sacred pilgrimage shrines of Shatrunjaya and Mount Ashtapada.",
    "legacyLocal": "प्रथम तीर्थंकर के रूप में उन्होंने श्रमण परंपरा और जैन दर्शन की नींव रखी, जो आगे चलकर चौबीस तीर्थंकरों तक अविच्छिन्न रूप से प्रवाहित हुई। उनकी साधना ने अहिंसा, त्याग और आत्म-शोधन का ऐसा शाश्वत मार्ग प्रशस्त किया जो सहस्रों वर्षों से मानव जाति का मार्गदर्शन कर रहा है।",
    "source": "Acharanga Sutra & Kalpa Sutra (Acharya Bhadrabahu)",
    "sourceLocal": "आचारांग सूत्र एवं कल्प सूत्र (आचार्य भद्रबाहु)",
    "sourceCitations": [
      {
        "sourceName": "Acharanga Sutra",
        "sourceRef": "Book 1, Discourse on the Ascetic Life of the Arhat",
        "tier": 1
      },
      {
        "sourceName": "Kalpa Sutra",
        "sourceRef": "Lives of the Jinas: The Life of Rishabhanatha",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Ancient depiction of Lord Rishabhanatha seated in serene deep meditation under a colossal banyan tree, long ascetic locks flowing over his shoulders, surrounded by silent forest deer and lions resting in absolute peace together.",
    "quote": {
      "text": "Knowing the world to be full of misery and impermanence, the wise soul casts away all possessions and walks the path of untroubled equanimity.",
      "attribution": "Acharanga Sutra, 1.3"
    },
    "quoteLocal": {
      "text": "संसार को क्षणभंगुर और दुखों का आगार जानकर ज्ञानी जीव समस्त परिग्रह का त्याग कर परम समता के मार्ग पर आरूढ़ होता है।",
      "attribution": "आचारांग सूत्र, १.३"
    }
  },
  {
    "id": "parshvanatha",
    "name": "Lord Parshvanatha",
    "nameLocal": "भगवान पार्श्वनाथ",
    "era": "c. 877–777 BCE",
    "eraLocal": "लगभग ८७७-७७७ ईसा पूर्व",
    "tradition": "jain",
    "region": "Varanasi / Mount Sammed Shikhar",
    "regionLocal": "वाराणसी / सम्मेद शिखर",
    "emoji": "🐍",
    "tagline": "The twenty-third Tirthankara whose transcendental compassion turned deadly malice into serenity, giving humanity the foundational fourfold vows of Ahimsa and truth.",
    "taglineLocal": "तेईसवें तीर्थंकर जिनकी असीम करुणा ने शत्रु के भयानक क्रोध को भी शांत कर दिया और विश्व को चतुर्याम धर्म की पावन आधारशिला दी।",
    "journey": "Parshvanatha was born into the royal court of Varanasi as the prince of King Ashvasena and Queen Vama Devi. From earliest childhood, he demonstrated natural detachment, acute intellect, and profound empathy toward all creatures. One day, while walking near the banks of the sacred Ganga, Parshvanatha noticed a renowned ascetic named Kamatha conducting the severe five-fire penance (Panchagni Tapas). The crowd praised the ascetic's endurance, but Parshvanatha's inner vision pierced through external display to perceive two living serpents trapped inside a burning log placed on the blazing altar. Filled with distress, the prince commanded his attendants to split the log open gently. Two charred, suffering snakes fell to the ground on the brink of death. Kneeling beside them, Parshvanatha recited the holy Namokar Mantra, providing them spiritual solace until they peacefully shed their bodies and were reborn in the celestial realm as Dharanendra and Padmavati.\n\nThe ascetic Kamatha was consumed by humiliation and burning rage at being publicly corrected by the young prince, harboring a deep-seated enmity that would stretch across lifetimes. When Parshvanatha turned thirty, observing the fleeting vanities of courtly power, he distributed his royal treasures to the impoverished and accepted the vows of renunciation. He wandered across northern India for eighty-four days of unbroken meditative austerity, practicing absolute silence, sleeping on the bare earth, and remaining unmoved by insults or physical hardships. His mind rested solely on the luminous nature of the pure soul, radiating peace across every forest and meadow he passed.\n\nWhile standing in the profound meditative posture of Kayotsarga under a Dhataki tree near the forest of Kadambari, his former adversary Kamatha, now reborn as the fierce demonic demigod Meghamalin, resolved to destroy him. Meghamalin unleashed an apocalyptic tempest—hurling jagged boulders, summoning ravenous beasts, unleashing blinding bolts of lightning, and pouring torrential sheets of water until the floodwaters rose to Parshvanatha's chest, neck, and lips. Yet Parshvanatha remained utterly motionless in deep contemplation, without a flicker of fear or resentment. Perceiving the supreme danger to their lord, the serpent king Dharanendra and goddess Padmavati manifested from the underworld, Dharanendra spreading his seven majestic serpent hoods over Parshvanatha's head like a protective umbrella, while Padmavati lifted a great lotus blossom beneath his feet to keep him above the deluge. Undisturbed by both the raging demon and the protective deities, Parshvanatha dissolved the final remnants of his deluding karmas, attaining Kevala Jnana (omniscience) and preaching the eternal law of Chatur-yama Dharma across the land until attaining Nirvana on Mount Sammed Shikhar.",
    "journeyLocal": "वाराणसी के इक्ष्वाकुवंशी राजा अश्वसेन और महारानी वामादेवी के महल में भगवान पार्श्वनाथ का जन्म हुआ। बाल्यकाल से ही उनमें समस्त प्राणियों के प्रति अद्वितीय करुणा थी। एक दिन जब वे गंगा तट पर भ्रमण कर रहे थे, तो उन्होंने देखा कि कमठ नामक तापस पंचाग्नि तप कर रहा था। लोग उसके तप की प्रशंसा कर रहे थे, परंतु पार्श्वनाथ ने अपनी अंतर्दृष्टि से देखा कि जलती हुई लकड़ी में एक नाग-नागिन का जोड़ा तड़प रहा है। राजकुमार ने तुरंत लकड़ी को सावधानी से चिरवाया, जिससे अधजले सर्प बाहर निकले। पार्श्वनाथ ने उन्हें अत्यंत वात्सल्य से णमोकार महामंत्र सुनाया, जिसके प्रभाव से वे शांत भाव से देहत्याग कर पाताल लोक में धरणेंद्र और पद्मावती के रूप में उत्पन्न हुए।\n\nकमठ इस घटना से अपना घोर अपमान मान बैठा और उसके हृदय में प्रतिशोध की ज्वाला धधक उठी। तीस वर्ष की आयु में सांसारिक भोगों की असारता देखकर पार्श्वनाथ ने समस्त राजसी वैभव का परित्याग कर दिया और दिगंबर श्रमण दीक्षा अंगीकार की। उन्होंने चौरासी दिनों तक मौन रहकर कठोर कायोत्सर्ग ध्यान किया। वन-वन विचरण करते हुए वे सर्दी, गर्मी और वन्य जीवों के कष्टों को समभाव से सहते रहे।\n\nएक दिन जब वे कदंबरी वन में एक वृक्ष के नीचे कायोत्सर्ग मुद्रा में लीन थे, तब पूर्वजन्म का वैरी कमठ (जो मेघमाली नामक देव बन चुका था) वहाँ आया और उसने भगवान पर भीषण उपसर्ग प्रारंभ किए। उसने मूसलाधार वर्षा की, विशाल शिलाएं बरसाईं और बिजली के भीषण वज्रपात किए। जब बाढ़ का जल भगवान की नासिका तक पहुँच गया, तब धरणेंद्र देव ने अपने सात फणों का छत्र भगवान के सिर पर तान दिया और पद्मावती ने उनके चरणों में कमल रख दिया। भगवान पार्श्वनाथ न तो मेघमाली पर कुपित हुए और न धरणेंद्र पर मुग्ध; वे पूर्ण समता में स्थित रहे। इसी समता के बल पर उन्हें केवलज्ञान प्राप्त हुआ। उन्होंने अहिंसा, सत्य, अचौर्य और अपरिग्रह रूप चतुर्याम धर्म का उपदेश दिया और अंततः सम्मेद शिखर से मोक्ष पधारे।",
    "trial": "Parshvanatha's ultimate trial was the violent onslaught of Meghamalin, who sought to drown him in an apocalyptic storm. Standing completely vulnerable in deep meditation, Parshvanatha neither resisted nor prayed for rescue. Most remarkably, his heart held identical equanimity toward his tormentor Meghamalin and his protector Dharanendra, seeing both as souls bound by karmic ignorance.",
    "trialLocal": "पार्श्वनाथ की सबसे कठिन परीक्षा मेघमाली द्वारा किया गया दारुण उपसर्ग था। जब जलमग्न होते हुए भी उनके प्राण संकट में थे, उन्होंने अपनी देह की रंचमात्र भी चिंता नहीं की। उनकी सबसे बड़ी विजय यह थी कि उनके मन में उपसर्ग करने वाले मेघमाली के प्रति न कोई क्रोध था, और न रक्षा करने वाले धरणेंद्र के प्रति कोई राग; वे दोनों को केवल कर्म-बंधन में बंधे जीव मानकर परम वीतराग रहे।",
    "teaching": "Lord Parshvanatha systematized the core of Jain ethics through the Chatur-yama Dharma—the four vows of absolute non-violence (Ahimsa), truthfulness (Satya), non-stealing (Asteya), and non-possession (Aparigraha). He taught that equanimity (Samabhava) toward friend and foe alike is the sole fire capable of consuming the accumulated karmas of infinite past lives.",
    "teachingLocal": "भगवान पार्श्वनाथ ने चतुर्याम धर्म—अहिंसा, सत्य, अचौर्य और अपरिग्रह का उपदेश दिया। उन्होंने सिखाया कि अनुकूलता और प्रतिकूलता में, मित्र और शत्रु में समान दृष्टि रखना ही समता है। जब तक हृदय से वैर-भाव का समूल नाश नहीं होता, तब तक सच्ची आध्यात्मिक शांति संभव नहीं है।",
    "moral": "Hatred cannot be conquered by hatred; it dissolves only in the cool ocean of unconditional forgiveness and forbearance. When facing malice, remaining grounded in inner stillness neutralizes negativity at its very root.",
    "moralLocal": "वैर से कभी वैर शांत नहीं होता; वह केवल क्षमा और समता के जल से ही बुझ सकता है। विपत्ति या विरोध की घड़ी में शांत और अडिग रहना ही हमारी आत्मिक शक्ति का सच्चा प्रमाण है।",
    "legacy": "Parshvanatha's historic mission revitalized the Shramana culture two and a half centuries prior to Bhagwan Mahavira, who integrated his Chatur-yama vows into the Mahavratas. Mount Sammed Shikhar (Parasnath Hill in Jharkhand) stands as the most revered pilgrimage center in Jainism because of his supreme spiritual triumph.",
    "legacyLocal": "पार्श्वनाथ भगवान ने ऐतिहासिक रूप से श्रमण संस्कृति को सुदृढ़ किया, जिसकी पृष्ठभूमि पर आगे चलकर भगवान महावीर ने पंच महाव्रतों का विधान किया। झारखंड स्थित सम्मेद शिखरजी उनके निर्वाण से पावन होकर आज समस्त जैन समाज का सर्वोच्च तीर्थ बन चुका है।",
    "source": "Kalpa Sutra (Acharya Bhadrabahu) & Uttaradhyayana Sutra",
    "sourceLocal": "कल्प सूत्र (आचार्य भद्रबाहु) एवं उत्तराध्ययन सूत्र",
    "sourceCitations": [
      {
        "sourceName": "Kalpa Sutra",
        "sourceRef": "The Life of the Tirthankara Parshvanatha",
        "tier": 1
      },
      {
        "sourceName": "Uttaradhyayana Sutra",
        "sourceRef": "Chapter 23, The Dialogue of Keshi and Gautama",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Magnificent depiction of Lord Parshvanatha standing in serene Kayotsarga posture amidst a roaring thunderstorm, with the seven-hooded serpent King Dharanendra sheltering his crown and lotus blossoming beneath his feet.",
    "quote": {
      "text": "Even if an enemy cuts your body to pieces and another embalms it with sandalwood paste, bear equal love and equanimity toward both.",
      "attribution": "Parshvanatha Charitra"
    },
    "quoteLocal": {
      "text": "यदि कोई तुम्हारे शरीर पर चंदन का लेप करे और दूसरा तलवार से प्रहार करे, तो दोनों के प्रति तुम्हारा अंतःकरण समान और द्वेषरहित होना चाहिए।",
      "attribution": "पार्श्वनाथ चरित्र"
    }
  },
  {
    "id": "bahubali",
    "name": "Lord Bahubali (Gommateshwara)",
    "nameLocal": "भगवान बाहुबली (गोमटेश्वर)",
    "era": "Ancient Ikshvaku Period",
    "eraLocal": "प्राचीन इक्ष्वाकु काल",
    "tradition": "jain",
    "region": "Podanpur / Shravanabelagola",
    "regionLocal": "पोदनपुर / श्रवणबेलगोला",
    "emoji": "🗿",
    "tagline": "The prince of boundless strength who defeated an emperor in combat, yet surrendered the empire at the moment of victory to conquer his own ego in standing penance.",
    "taglineLocal": "अतुल्य बल के धनी राजकुमार, जिन्होंने युद्ध में चक्रवर्ती को पराजित कर भी विजय के क्षण में राज्य त्याग दिया और अहंकार को जीतकर कैवल्य प्राप्त किया।",
    "journey": "Bahubali was the heroic son of Lord Rishabhanatha and younger brother to Emperor Bharata. Renowned for his towering physical stature, peerless strength, and unshakeable virtue, he ruled the prosperous province of Podanpur with wisdom and fairness. When their father renounced the kingdom to pursue spiritual liberation, Bharata set forth on a world-conquering expedition with his celestial discus (Chakra-ratna), subduing all kingdoms across the continent. However, upon returning to the capital city of Ayodhya, the miraculous discus refused to enter the city gates. The imperial astrologers informed Bharata that his conquest remained incomplete because his own brothers, sovereign rulers of their designated lands, had not yet acknowledged his supreme suzerainty.\n\nWhile ninety-eight of the brothers relinquished their kingdoms to avoid conflict and followed their father into monastic homelessness, Bahubali refused to bend. He maintained that while he revered Bharata deeply as an elder brother, righteous sovereignty could not bow to arbitrary royal pride. Facing the prospect of a catastrophic fratricidal war that would slaughter thousands of innocent soldiers, the venerable ministers of both realms intervened and proposed a duel of champions between the two brothers. The contest consisted of three non-lethal trials: Drishti-yuddha (unblinking staring contest), Jala-yuddha (water-splashing contest in a lake), and Malla-yuddha (physical wrestling).\n\nBahubali defeated Bharata in all three contests through superhuman endurance. Enraged by public humiliation, Bharata violated the sacred rules of combat and hurled his divine Chakra-ratna directly at Bahubali's chest. But the celestial weapon, incapable of harming someone of pure soul and shared blood, circumambulated Bahubali in reverence and came to rest harmlessly at his right side. Bahubali raised his colossal fist to strike down Bharata in retaliation. But at that very threshold of supreme worldly dominion, a lightning flash of spiritual awakening pierced Bahubali's heart. He looked at his raised fist and thought: 'What am I about to do? For a handful of dirt, an impermanent kingdom that countless kings have fought over and turned to ash, would I spill my brother's blood?' With his fist still raised, Bahubali gently lowered his hand, touched Bharata's feet in forgiveness, pulled out his royal hair, and walked into the deep wilderness to conquer the only enemy that truly matters: the ego.\n\nStanding in the motionless Kayotsarga posture for an entire unbroken year, Bahubali neither ate nor sat nor sheltered from torrential monsoons. Vines grew from the earth and coiled around his legs, thighs, and arms; anthills arose around his feet; birds built nests in his tangled beard. Yet, despite his extreme physical austerities, Kevala Jnana eluded him. His father Rishabhanatha revealed to Bahubali's sisters, Brahmi and Sundari, the subtle obstacle: 'Your brother is still standing upon an invisible elephant—the lingering pride that he is standing on his brother Bharata's land.' The sisters traveled to the forest and gently whispered: 'Beloved brother, dismount the elephant of pride!' Hearing these words, Bahubali realized that even the subtle thought of his own renunciation was a lingering veil of pride. As he dissolved this final trace of ego and bowed inwardly to all beings, supreme omniscience (Kevala Jnana) instantly illumined his soul.",
    "journeyLocal": "भगवान ऋषभदेव के तेजस्वी पुत्र बाहुबली अपार बल, असाधारण तेज और धर्मपरायणता के प्रतीक थे। वे पोदनपुर के न्यायप्रिय शासक थे। जब ऋषभदेव ने दीक्षा ली, तो बड़े भाई भरत ने चक्रवर्ती बनने हेतु दिग्विजय अभियान प्रारंभ किया और समस्त भूमंडल पर विजय प्राप्त की। परंतु जब वे अयोध्या लौटे, तो चक्ररत्न नगर के द्वार पर ही ठहर गया। ज्योतिषियों ने बताया कि जब तक उनके सहोदर भाई उनकी अधीनता स्वीकार नहीं करेंगे, तब तक चक्ररत्न भीतर प्रवेश नहीं करेगा।\n\nअट्ठानवे भाइयों ने व्यर्थ के रक्तपात से बचने के लिए अपने राज्य पिता को समर्पित कर दीक्षा ले ली, परंतु बाहुबली ने स्वाभिमान के साथ कहा कि वे भाई के नाते भरत का सम्मान करते हैं, परंतु अनुचित आधिपत्य के आगे नहीं झुकेंगे। दोनों सेनाएं आमने-सामने आ गईं। निर्दोष सैनिकों को विनाश से बचाने हेतु दोनों पक्षों के मंत्रियों ने सेना युद्ध के स्थान पर तीन धर्म-युद्धों का निर्णय लिया—दृष्टियुद्ध (बिना पलक झपकाए देखना), जलयुद्ध (जल उछालकर विचलित करना) और मल्लयुद्ध (कुश्ती)।\n\nबाहुबली ने तीनों युद्धों में भरत को पराजित कर दिया। अपनी पराजय से कुपित होकर भरत ने नियमों का उल्लंघन करते हुए बाहुबली पर चक्ररत्न चला दिया। परंतु चक्ररत्न बाहुबली जैसे पुण्यात्मा की प्रदक्षिणा कर उनके दाईं ओर शांत खड़ा हो गया। क्रोध में भरकर बाहुबली ने भरत को धराशायी करने के लिए अपनी विशाल मुट्ठी उठाई। परंतु उसी क्षण उनके अंतःकरण में वैराग्य की बिजली कौंध उठी—'जिस राज्य के लिए मैं अपने बड़े भाई पर प्रहार करने जा रहा हूँ, वह राज्य कितना नश्वर है! कितने राजा इसे छोड़कर चले गए!' बाहुबली ने अपनी मुट्ठी को भाई पर मारने के स्थान पर अपने ही केशों पर फेरा और केशलोंच कर सर्वस्व त्याग दिया।\n\nवे वन में एक वर्ष तक बिना हिले-डुले कायोत्सर्ग ध्यान में खड़े रहे। उनके पैरों पर बांबियां बन गईं, अंगों पर लताएं लिपट गईं, और दाढ़ी में पक्षियों ने घोंसले बना लिए। परंतु फिर भी केवलज्ञान उत्पन्न नहीं हुआ। तब भगवान आदिनाथ ने ब्राह्मी और सुंदरी को भेजा। उन्होंने जाकर कहा—'भ्राता, मान रूपी गज से नीचे उतरो!' बाहुबली समझ गए कि उनके मन में यह सूक्ष्म अहंकार शेष था कि मैं भरत की भूमि पर खड़ा हूँ। जैसे ही उन्होंने अहंकार के इस अंतिम कण का त्याग किया, उन्हें तत्काल केवलज्ञान प्राप्त हुआ।",
    "trial": "Bahubali's hardest trial was not standing motionless for twelve months while jungle vines and serpents entwined his limbs, but recognizing and dissolving the subtle, hidden pride within his mind. The moment he surrendered the pride of his own austere sacrifice, the gates of infinite consciousness swung open.",
    "trialLocal": "बाहुबली की वास्तविक परीक्षा एक वर्ष तक वर्षा, धूप और देह पर लताएं लिपटे रहने का शारीरिक कष्ट नहीं थी; उनकी सबसे कठिन परीक्षा अपने भीतर छिपे 'त्याग के अहंकार' को पहचानना था। जैसे ही उन्होंने इस सूक्ष्म अभिमान को विसर्जित किया, वे पूर्ण वीतरागी बन गए।",
    "teaching": "True victory is never achieved by crushing an opponent outside yourself; it is realized only by defeating the inner passions of anger, pride, deceit, and greed (Kashayas). Renunciation without complete freedom from ego is merely an external posture.",
    "teachingLocal": "सच्चा विजेता वह नहीं जो युद्धभूमि में दूसरों को परास्त करता है, अपितु सच्चा विजेता वह है जो अपने भीतर के क्रोध, मान, माया और लोभ रूपी आंतरिक शत्रुओं को पराजित करता है। अहंकार के विसर्जन के बिना किया गया बाह्य त्याग अधूरा है।",
    "moral": "Even the greatest spiritual austerity can be blocked by a single grain of pride. To attain absolute peace, we must step off the pedestal of self-importance and see ourselves as humble servants of truth.",
    "moralLocal": "अहंकार की एक सूक्ष्म बूंद भी साधना के विशाल सागर को विषाक्त कर सकती है। यदि जीवन में वास्तविक शांति पानी है, तो स्वयं को दूसरों से श्रेष्ठ मानने के भाव का पूर्ण त्याग करना होगा।",
    "legacy": "Bahubali's supreme sacrifice of victory gave humanity an eternal ideal of nobility. The 57-foot monolithic statue of Gommateshwara at Shravanabelagola, carved in 981 CE by Chamundaraya, stands as one of the world's greatest spiritual monuments, celebrated globally through the Mahamastakabhisheka.",
    "legacyLocal": "बाहुबली का जीवन त्याग और वीतरागता का अमर प्रतीक बन गया। कर्नाटक के श्रवणबेलगोला में चामुंडराय द्वारा ९८१ ईस्वी में स्थापित ५७ फीट ऊंची भगवान बाहुबली की अखंड पाषाण प्रतिमा आज भी सहस्रों वर्षों से संपूर्ण विश्व को त्याग और अहिंसा का मौन संदेश दे रही है।",
    "source": "Adipurana (Acharya Jinasena) & Trishashti-Shalakapurusha-Charitra",
    "sourceLocal": "आदिपुराण (आचार्य जिनसेन) एवं त्रिषष्टि-शलाकापुरुष-चरित्र",
    "sourceCitations": [
      {
        "sourceName": "Adipurana",
        "sourceRef": "Parva 34–36, The Story of Bahubali and Bharata",
        "tier": 1
      },
      {
        "sourceName": "Trishashti-Shalakapurusha-Charitra",
        "sourceRef": "Parva 1, The Renunciation of Bahubali",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Colossal monolithic statue of Lord Bahubali standing in majestic tranquility, tender flowering vines climbing up his muscular legs, serene meditative expression overlooking ancient green hills of Shravanabelagola.",
    "quote": {
      "text": "Conquer anger by forgiveness, pride by humility, deceit by honesty, and greed by contentment.",
      "attribution": "Dasavaikalika Sutra, 8.39"
    },
    "quoteLocal": {
      "text": "क्रोध को क्षमा से, मान को नम्रता से, कपट को सरलता से और लोभ को संतोष से जीतो।",
      "attribution": "दशवैकालिक सूत्र, ८.३९"
    }
  },
  {
    "id": "bhadrabahu",
    "name": "Acharya Bhadrabahu",
    "nameLocal": "आचार्य भद्रबाहु",
    "era": "c. 4th–3rd Century BCE",
    "eraLocal": "लगभग चौथी-तीसरी शताब्दी ईसा पूर्व",
    "tradition": "jain",
    "region": "Pataliputra / Shravanabelagola",
    "regionLocal": "पाटलिपुत्र / श्रवणबेलगोला",
    "emoji": "📜",
    "tagline": "The last Shruta Kevali of the Maurya era who foresaw the great Magadha famine, led the southern migration of the Sangha, and guided Emperor Chandragupta to spiritual renunciation.",
    "taglineLocal": "मौर्य काल के अंतिम श्रुतकेवली जिन्होंने मगध के महाअकाल का पूर्वाभास कर संघ का दक्षिण की ओर मार्गदर्शन किया और सम्राट चंद्रगुप्त को वैराग्य का मार्ग दिखाया।",
    "journey": "Acharya Bhadrabahu was the sixth and final Shruta Kevali—the last sovereign spiritual master who carried the entire fourteen Purvas, twelve Angas, and the unbroken oral canon of the Jain Agamas directly in living memory. Residing in Pataliputra as the supreme head of the united Shramana Sangha, his spiritual authority was revered across kingdoms and imperial courts throughout ancient India. Through profound astrological insight, rigorous contemplative penance, and interpretation of ominous cosmic portents, Bhadrabahu foresaw an impending, catastrophic twelve-year famine that would ravage the fertile heartlands of Magadha, drying up the rivers, turning agrarian fields to dust, and making it impossible for thousands of naked mendicants to sustain their strict vows of non-violence, daily alms-gathering (Gocharan), and compassionate equanimity without imposing a crushing burden on a starving, desperate populace.\n\nDemonstrating extraordinary institutional foresight and moral courage, Bhadrabahu convened the great assembly of elders and made the monumental decision to divide the Sangha to ensure the survival of the sacred teachings. While he appointed Sthulabhadra to oversee the monks who resolved to remain in the northern territories, Bhadrabahu personally guided an epic migration of twelve thousand monks southward across the Vindhya mountain ranges and dense central forests into the tranquil plateaus of Karnataka, establishing an enduring spiritual sanctuary upon the granite ridge of Chandragiri hill at Shravanabelagola.\n\nAmong the most devoted disciples accompanying this southern exodus was the founder of the Mauryan Empire, Emperor Chandragupta Maurya. Having unified the Indian subcontinent, defeated the Seleucid Greek satraps, and consolidated an empire stretching from the Hindu Kush to the Bay of Bengal, Chandragupta was shaken by Bhadrabahu’s prophetic vision and the stark reality of worldly impermanence. The mighty monarch renounced the golden throne of Pataliputra, surrendered all imperial insignia to his son Bindusara, and walked south barefoot as a humble, shaved-headed mendicant (known in monastic records as Muni Prabhachandra), dedicated to serving his spiritual preceptor with profound devotion and cleaning the rocky cave with peacock feathers.\n\nUpon Chandragiri hill, perceiving through inner clarity that his physical body had completed its earthly mission, Acharya Bhadrabahu initiated the sacred rite of Sallekhana—the voluntary, peaceful transition of the soul through progressive fasting and unbroken meditation on the eternal self. Tended solely by his royal disciple Chandragupta in a secluded cave, Bhadrabahu peacefully passed from physical life, leaving behind foundational commentaries and the Kalpa Sutra that preserved the lineage of the twenty-four Tirthankaras for future millennia.",
    "journeyLocal": "आचार्य भद्रबाहु अंतिम श्रुतकेवली थे—वे अंतिम आचार्य थे जिन्हें चौदह पूर्वों और संपूर्ण जिनवाणी का कंठस्थ ज्ञान था। वे पाटलिपुत्र में विशाल श्रमण संघ के प्रमुख थे। अपने असाधारण निमित्तज्ञान और आत्म-साधना के बल पर उन्होंने पूर्वाभास किया कि मगध में बारह वर्षों का भयानक अकाल पड़ने वाला है, जिससे मुनियों के लिए अहिंसात्मक चर्या का पालन करना असंभव हो जाएगा।\n\nसंघ की सुरक्षा और जिन-शासन की रक्षा हेतु उन्होंने एक युगांतरकारी निर्णय लिया। उन्होंने स्थूलभद्र को उत्तर भारत के संघ का दायित्व सौंपा और स्वयं बारह सहस्र दिगंबर मुनियों को लेकर दक्षिण भारत (कर्नाटक) की ओर प्रस्थान किया। उन्होंने श्रवणबेलगोला की चंद्रगिरि पहाड़ी पर अपनी साधना का केंद्र बनाया। मौर्य साम्राज्य के चक्रवर्ती सम्राट चंद्रगुप्त मौर्य भद्रबाहु के उपदेशों से इतने प्रभावित हुए कि उन्होंने अपना विशाल साम्राज्य पुत्र बिंदुसार को सौंप दिया और मुनि दीक्षा लेकर भद्रबाहु के चरण-कमलों में शिष्य बनकर आ गए।\n\nश्रवणबेलगोला में अपने जीवन के अंतिम समय में आचार्य भद्रबाहु ने सल्लेखना व्रत धारण किया। एक गुफा में बैठकर उन्होंने ध्यान और आत्म-चिंतन में लीन होकर अपने नश्वर शरीर का विसर्जन किया। उनके द्वारा रचित 'कल्पसूत्र' और 'भद्रबाहु संहिता' ने श्रमण परंपरा और तीर्थंकरों के इतिहास को आने वाली पीढ़ियों के लिए सुरक्षित कर दिया।",
    "trial": "Bhadrabahu’s supreme trial was bearing the staggering burden of leadership during an unprecedented civilizational catastrophe. Making the agonizing choice to lead twelve thousand monks away from their ancestral northern monasteries across thousands of miles of wilderness, through starvation, illness, and displacement, tested every fiber of his spiritual resolve. Even more arduous was the final trial of Sallekhana—voluntarily welcoming the slow cessation of physical sustenance while maintaining crystalline inner joy and unclouded mindfulness inside a desolate granite cave.",
    "trialLocal": "आचार्य भद्रबाहु की सबसे बड़ी परीक्षा अकाल के संकट में हजारों साधुओं को सुदूर दक्षिण की ओर ले जाने का साहसिक निर्णय था। भूख और विस्थापन के कठिन दौर में पूरे संघ के आचार-विचार को सुरक्षित रखना और अंत समय में पर्वत की गुफा में एकांत सल्लेखना साधना को पूर्ण करना उनकी आत्मिक दृढ़ता का शिखर था।",
    "teaching": "True spiritual wisdom (Shruta) is not a museum of memorized verses or external dogmas, but the living transformation of consciousness into equanimity and fearlessness. When historical catastrophes threaten society, a true teacher does not panic or cling to institutions, but acts with decisive detachment to safeguard the essence of Dharma. The physical body is merely an impermanent vehicle; the soul alone is eternal, indestructible, and self-sufficient.",
    "teachingLocal": "सच्चा ज्ञान शास्त्रों को कंठस्थ करने में नहीं, अपितु जीवन में आचरण की पवित्रता में है। संकट के समय में एक आध्यात्मिक पथप्रदर्शक को लौकिक मोह का त्याग कर सिद्धांतों की रक्षा के लिए अडिग रहना चाहिए।",
    "moral": "Worldly power, military triumph, and material wealth are ephemeral morning mist compared to the eternal majesty of inner self-mastery. When the greatest emperor in Indian history chose to trade his imperial crown for an ascetic’s bowl at Bhadrabahu’s feet, he demonstrated that the ultimate destiny of human existence is self-conquest and spiritual liberation.",
    "moralLocal": "संसार के बड़े से बड़े साम्राज्य भी एक दिन मिट जाते हैं, परंतु आत्मा का साम्राज्य शाश्वत है। भौतिक उपलब्धियां तभी सार्थक हैं जब वे मनुष्य को अंतर्मुखी वैराग्य और आत्म-कल्याण की ओर ले जाएं।",
    "legacy": "Acharya Bhadrabahu’s southern migration permanently transformed the cultural and spiritual landscape of South India. It established Karnataka as the indestructible citadel of Jain philosophy, literature, and art for more than two millennia, directly inspiring the rise of monumental sacred centers like Shravanabelagola, fostering classical Kannada literature through poets like Pampa and Ranna, and influencing celebrated royal dynasties including the Gangas, Kadambas, and Rashtrakutas.",
    "legacyLocal": "आचार्य भद्रबाहु के दक्षिण गमन ने दक्षिण भारत में जैन संस्कृति, दर्शन और साहित्य का स्वर्ण युग प्रारंभ किया। श्रवणबेलगोला का पावन तीर्थ और गंग, राष्ट्रकूट राजाओं द्वारा जैन धर्म का संरक्षण उन्हीं के प्रभाव का ऐतिहासिक परिणाम था।",
    "source": "Brihat-Katha-Kosha (Harishena) & Bhadrabahu Charitra",
    "sourceLocal": "बृहत्कथाकोश (हरिषेण) एवं भद्रबाहु चरित्र",
    "sourceCitations": [
      {
        "sourceName": "Brihat-Katha-Kosha",
        "sourceRef": "Kathanaka of Bhadrabahu and Chandragupta",
        "tier": 1
      },
      {
        "sourceName": "Epigraphia Carnatica",
        "sourceRef": "Shravanabelagola Inscription No. 1 (Chandragiri)",
        "tier": 2
      }
    ],
    "illustrationPrompt": "Venerable Acharya Bhadrabahu seated peacefully in a granite cave at Shravanabelagola, surrounded by ancient palm-leaf manuscripts, with the former Emperor Chandragupta Maurya sitting humbly at his feet as an ascetic disciple.",
    "quote": {
      "text": "The body is merely an instrument for the pursuit of Dharma; when it can no longer sustain righteousness, let it be shed peacefully like an old garment.",
      "attribution": "Bhadrabahu Samhita"
    },
    "quoteLocal": {
      "text": "शरीर केवल धर्म-साधना का साधन है; जब यह धर्म के निर्वहन में असमर्थ हो जाए, तो इसे जीर्ण वस्त्र की भांति शांत भाव से विसर्जित कर देना चाहिए।",
      "attribution": "भद्रबाहु संहिता"
    }
  },
  {
    "id": "kundakunda",
    "name": "Acharya Kundakunda",
    "nameLocal": "आचार्य कुन्दकुन्द",
    "era": "c. 1st Century BCE – 1st Century CE",
    "eraLocal": "लगभग प्रथम शताब्दी ईसा पूर्व - प्रथम शताब्दी",
    "tradition": "jain",
    "region": "Kondakunda (Andhra Pradesh) / Tamil Nadu",
    "regionLocal": "कोंडकुंद (आंध्र प्रदेश) / तमिलनाडु",
    "emoji": "💎",
    "tagline": "The supreme metaphysician of Jain philosophy who articulated the timeless distinction between the absolute soul and empirical conduct in the sacred Samayasara.",
    "taglineLocal": "जैन दर्शन के परम अध्यात्मवेत्ता जिन्होंने 'समयसार' के माध्यम से निश्चय नय और व्यवहार नय का शाश्वत भेद प्रकाशित किया।",
    "journey": "Acharya Kundakunda occupies an exalted, almost divine pedestal in the spiritual consciousness of Jainism, revered alongside Bhagwan Mahavira and Gautama Swami in the universal daily mangalacharan benediction chanted across temples: \"Mangalam Bhagavaan Viro, Mangalam Gautamoo Gani, Mangalam Kundakundaaryo, Jainadharmostu Mangalam.\" Born in the southern village of Kondakunda in present-day Andhra Pradesh, he embraced the unadorned, sky-clad (digambara) monastic path in early youth. Blessed with peerless intellectual clarity and profound mystical absorption, Kundakunda rose to become the guiding luminary of non-dual spiritual metaphysics at a historical crossroads when Shramana traditions were at risk of degenerating into dry ritualism and scholastic pedantry.\n\nWhile preceding scholars focused extensively on elaborate taxonomic classifications of karmic particles, monastic rituals, and cosmological geography, Kundakunda bypassed the outer layers of religious convention to illuminate the radiant, untouched essence of self-realization (Atma-Jnana). Dwelling in secluded forest caverns on hilltops, seated upon bare stone, he composed monumental treatises in the ancient Sauraseni Prakrit language that revolutionized Indian spiritual philosophy: the Samayasara (The Essence of the Soul), Pravachanasara (The Essence of the Doctrine), Panchastikayasara (The Essence of the Five Cosmic Reals), and Niyamasara (The Essence of Restraint).\n\nKundakunda introduced the luminous analytical paradigm of the two viewpoints: Nischaya Naya (the ultimate or absolute perspective) and Vyavahara Naya (the empirical, relative perspective). With unsparing philosophical precision, he showed that all outward ethical observances, temple worship, chanting, severe austerities, and scriptural study belong exclusively to the domain of Vyavahara—necessary conventional stepping-stones that nevertheless generate karmic bondage, even if of a virtuous nature (Punya). The absolute truth (Nischaya), Kundakunda boldly declared, is that the pure soul (Shuddhatman) is an unblemished, self-luminous knower (Jnaka), eternally free from karma, sin, virtue, bodily changes, and worldly delusion. To experience this inner self directly, beyond all conceptual chatter and sectarian dogmatism, is the true meaning of Samyak Darshana (enlightened vision).\n\nThroughout his expansive life as an itinerant wandering monk, Kundakunda walked barefoot without a copper coin or a thread of clothing, carrying only a peacock-feather broom (Pinchi) to gently clear insects from his path and a wooden water pot (Kamandalu). His pristine spiritual realization cut through the mechanical rituals of his age like a brilliant diamond, inspiring spiritual seekers across two millennia from medieval commentators like Amritachandra Suri to twentieth-century spiritual masters like Shrimad Rajchandra and Kanji Swami.",
    "journeyLocal": "आचार्य कुन्दकुन्द का स्थान जैन परंपरा में इतना उच्च है कि मंगल पाठ में भगवान महावीर और गौतम स्वामी के साथ उनका स्मरण किया जाता है—'मंगलं भगवान वीरो, मंगलं गौतमो गणी। मंगलं कुन्दकुन्दार्यो, जैनधर्मोऽस्तु मंगलम्॥' उनका जन्म दक्षिण भारत के कोंडकुंद ग्राम में हुआ था। अल्पायु में ही दिगंबर दीक्षा अंगीकार कर वे आत्म-साधना के उस शिखर पर पहुँचे जहाँ बाह्य क्रियाकांडों के स्थान पर शुद्ध चेतना का साक्षात्कार मुख्य हो जाता है।\n\nउन्होंने प्राकृत भाषा में अध्यात्म के अमर ग्रंथों की रचना की, जिनमें 'समयसार', 'प्रवचनसार', 'नियमसार' और 'पंचास्तिकाय' प्रमुख हैं। कुन्दकुन्द ने निश्चय नय (परमार्थ सत्य) और व्यवहार नय (व्यावहारिक दृष्टि) का ऐसा वैज्ञानिक और दार्शनिक विश्लेषण प्रस्तुत किया जिसने भारतीय दर्शन को एक नया आयाम दिया। उन्होंने स्पष्ट किया कि बाह्य व्रत, उपवास और तपस्या केवल व्यावहारिक साधन हैं; वास्तविक धर्म तो आत्मा का अपने शुद्ध, ज्ञायक और वीतराग स्वरूप में लीन हो जाना है।\n\nउन्होंने अपने संपूर्ण जीवन में दिगंबर चर्या का कठोरता से पालन करते हुए यह संदेश दिया कि आत्मा स्वयं सिद्ध स्वरूपा है, वह न कभी बंधी है और न अशुद्ध हुई है; केवल अज्ञान के कारण स्वयं को पर-द्रव्य का कर्ता मानती है। उनके इस अध्यात्म ने सदियों तक मुमुक्षुओं का मार्गदर्शन किया और आधुनिक काल में श्रीमद् राजचंद्र तथा कानजी स्वामी जैसे विचारकों को भी गहराई से प्रभावित किया।",
    "trial": "Kundakunda’s defining trial was confronting the entrenched resistance of traditional scholars and dogmatic ritualists who mistook external religious observances for ultimate liberation. He was accused of undermining monastic discipline when he boldly asserted that attachment to pious religious merit (Punya) is still a golden chain binding the soul to worldly rebirth. Bearing misunderstanding and sectarian debate with unbroken serenity, he preserved the pure non-dual flame of Atma-Jnana against the encroaching tide of mechanical ritualism.",
    "trialLocal": "आचार्य कुन्दकुन्द की सबसे बड़ी साधना बाह्य कर्मकांडों में उलझे समाज को शुद्ध अध्यात्म की ओर मोड़ना था। उन्होंने निर्भीकता से घोषित किया कि शुभ कर्म भी सोने की बेड़ियां हैं, जो संसार में ही बांधती हैं; वास्तविक मुक्ति तो राग-द्वेष से परे अपने ज्ञायक स्वभाव के अनुभव से ही संभव है।",
    "teaching": "The soul is pure consciousness—its essential nature is only knowing and seeing (Jnan-Darshan)—completely distinct from the body, thoughts, emotions, and accrued karmas. As long as you believe \"I am the doer of action,\" \"This body is mine,\" or \"These rituals will purchase my salvation,\" you remain trapped in Samsara. Renounce all identification with the non-self; abide as the silent, detached, witness-knower of your own divine consciousness, and liberation is your immediate reality.",
    "teachingLocal": "आत्मा केवल जानने और देखने वाला शुद्ध चैतन्य तत्व है। वह शरीर, मन और कर्मों से सर्वथा भिन्न है। जब तक मनुष्य यह मानता है कि 'मैं करता हूँ' या 'यह मेरा है', तब तक वह बंधन में है। अपने आपको केवल 'ज्ञाता-दृष्टा' अनुभव करना ही मुक्ति का साक्षात मार्ग है।",
    "moral": "External religious rituals, fasting, and rules are merely the protective outer bark of the spiritual tree; never mistake them for the sweet fruit of inner self-realization. True religion is the silent, pure experience of your own divine nature, untainted by anger, pride, attachment, or greed.",
    "moralLocal": "धार्मिक क्रियाएं तभी सार्थक हैं जब वे हमारे अंतःकरण के विकारों को धोकर हमें आत्म-शांति प्रदान करें। बाह्य क्रियाओं के अहंकार में उलझकर आत्मा के वास्तविक स्वरूप को नहीं भूलना चाहिए।",
    "legacy": "Kundakunda’s Samayasara is celebrated as the pinnacle masterpiece of Jain spiritual literature, often called the \"Upanishad of the Shramanas.\" His revolutionary two-truth framework (Nischaya and Vyavahara) provided the metaphysical foundation for all subsequent Jain philosophical developments and remains the preeminent text studied by spiritual seekers seeking direct experiential awakening across the world today.",
    "legacyLocal": "आचार्य कुन्दकुन्द का 'समयसार' जैन अध्यात्म का मुकुटमणि ग्रंथ माना जाता है। इसने भारतीय दर्शन में आत्म-साक्षात्कार और अद्वैत चेतना के अध्ययन को नई गहराई दी और आज भी आत्म-कल्याण के इच्छुक साधकों के लिए प्रमुख आधार बना हुआ है।",
    "source": "Samayasara & Pravachanasara (Acharya Kundakunda)",
    "sourceLocal": "समयसार एवं प्रवचनसार (आचार्य कुन्दकुन्द)",
    "sourceCitations": [
      {
        "sourceName": "Samayasara",
        "sourceRef": "Jiva-Ajiva Adhikara, Gatha 1–15",
        "tier": 1
      },
      {
        "sourceName": "Pravachanasara",
        "sourceRef": "Jnana Tattva Prajnapana, Chapter 1",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Serene digambara Acharya Kundakunda inscribing Sanskrit-Prakrit verses on palm leaves in a rock-cut mountain cavern, bathed in soft divine golden sunlight with eyes glowing with spiritual wisdom.",
    "quote": {
      "text": "I am neither the body nor the mind; I am one eternal, indivisible, pure conscious soul. All else is alien and transient.",
      "attribution": "Samayasara, Gatha 38"
    },
    "quoteLocal": {
      "text": "मैं न देह हूँ, न मन; मैं तो एक, शाश्वत, शुद्ध चैतन्य आत्म-द्रव्य हूँ। इसके अतिरिक्त जो कुछ भी है, वह पर-भाव और क्षणभंगुर है।",
      "attribution": "समयसार, गाथा ३८"
    }
  },
  {
    "id": "hemachandra",
    "name": "Acharya Hemachandra",
    "nameLocal": "आचार्य हेमचन्द्र (कलिकाल-सर्वज्ञ)",
    "era": "1088–1172 CE",
    "eraLocal": "१०८८-११७२ ईस्वी",
    "tradition": "jain",
    "region": "Dhandhuka / Patan (Gujarat)",
    "regionLocal": "धंधुका / पाटण (गुजरात)",
    "emoji": "📖",
    "tagline": "The 'Omniscient of the Iron Age' whose encyclopedic scholarship, literary genius, and ethical diplomacy transformed Gujarat into an empire of non-violence and cultural flowering.",
    "taglineLocal": "'कलिकाल-सर्वज्ञ' जिनकी असाधारण विद्वता, साहित्यिक प्रतिभा और कूटनीति ने गुजरात को अहिंसा और विद्या का अप्रतिम केंद्र बना दिया।",
    "journey": "Born in the ancient town of Dhandhuka in Gujarat as Changadeva to a modest mercantile family, Hemachandra’s life was marked by intellectual genius from his earliest days. Recognizing the child’s extraordinary memory and spiritual destiny, the revered master Acharya Devachandra initiated him into the monastic order, bestowing upon him the name Somachandra. By the young age of twenty-one, having mastered the entirety of canonical scriptures, Sanskrit and Prakrit linguistics, Indian logic, poetics, metrics, and statecraft, he was formally elevated to the exalted station of Acharya and given the name Hemachandra. His intellectual brilliance was so comprehensive and encyclopedic that scholars across the Indian subcontinent bestowed upon him the ultimate title: \"Kalikala-Sarvajna\"—the All-Knowing Luminary of the Iron Age.\n\nMoving to Patan (Anhilwad Patan), the glorious capital of the Chaulukya (Solanki) Empire, Hemachandra entered into an extraordinary partnership with King Siddharaja Jayasimha. When the king lamented that Malwa possessed great literary grammars while Gujarat lacked a foundational linguistic text, Hemachandra had manuscripts collected from libraries across Kashmir and central India and composed the immortal Siddha-Hema-Shabdanushasana in astonishingly record time. Recognizing the monumental significance of the work, King Siddharaja placed the palm-leaf manuscript upon the royal imperial elephant beneath a golden umbrella and led a magnificent civic procession through Patan, an honor to literature without parallel in world history.\n\nFollowing Siddharaja’s demise, Hemachandra became the preceptor, counselor, and spiritual father to King Kumarpal. Under Hemachandra’s compassionate guidance, Kumarpal embraced Jainism and transformed the vast Chaulukya Empire into an unprecedented commonwealth of non-violence. Royal decrees known as the A-mari Pravartan (proclamation of non-slaughter) were enacted across Gujarat, Saurashtra, Malwa, and Rajasthan, prohibiting hunting, animal sacrifice, animal combat, fishing, butchery, liquor consumption, and gambling. Crucially, Kumarpal abolished the ancient, predatory confiscation law (Rudanti-Dhana) under which the royal treasury seized the property of childless widows. Meanwhile, Hemachandra penned monumental works including the Yoga Shastra, Trishashti-Shalakapurusha-Charitra, Deshinamamala, and Kavyanushasana, establishing Gujarat as the cultural and intellectual epicenter of medieval India.",
    "journeyLocal": "गुजरात के धंधुका में जन्मे चंगदेव को बाल्यावस्था में ही आचार्य देवचंद्र ने उनकी असाधारण मेधा देखकर श्रमण दीक्षा दी और उनका नाम हेमचंद्र रखा गया। मात्र इक्कीस वर्ष की आयु में आचार्य पद पर प्रतिष्ठित होने वाले हेमचंद्र ने व्याकरण, न्याय, काव्य, छंद, इतिहास और दर्शन में ऐसा अभूतपूर्व ज्ञान अर्जित किया कि संपूर्ण भारतवर्ष ने उन्हें 'कलिकाल-सर्वज्ञ' (कलियुग के सर्वज्ञ) की उपाधि से विभूषित किया।\n\nवे सोलंकी राजवंश की राजधानी पाटण पहुँचे, जहाँ महाराज सिद्धराज जयसिंह ने उनका सर्वोच्च सम्मान किया। राजा के अनुरोध पर उन्होंने 'सिद्ध-हेम-शब्दानुशासन' नामक एक अद्वितीय व्याकरण ग्रंथ की रचना की, जिसे तत्कालीन राजा ने हाथी पर विराजमान कर पूरे पाटण नगर में गाजे-बाजे के साथ जलूस निकाला—विद्या का ऐसा सम्मान भारतीय इतिहास में दुर्लभ है।\n\nसिद्धराज के पश्चात् जब राजा कुमारपाल सिंहासन पर बैठे, तो हेमचंद्र उनके परम गुरु और पथप्रदर्शक बने। हेमचंद्र के प्रभाव से कुमारपाल ने जैन धर्म अंगीकार किया और अपने संपूर्ण साम्राज्य में अहिंसा का डंका बजाया। उन्होंने राज्य भर में जीव-हिंसा, मदिरापान, जुआ और शिकार पर पूर्ण प्रतिबंध लगा दिया (अमारि घोषणा)। यही नहीं, निःसंतान मृतकों की संपत्ति हड़पने वाले क्रूर कानून (रुदंति-धन) को भी समाप्त कर दिया। हेमचंद्र ने 'योगशास्त्र' और 'त्रिषष्टि-शलाकापुरुष-चरित्र' जैसे विशाल ग्रंथों का सृजन कर गुजरात को ज्ञान और करुणा की पावन भूमि बना दिया।",
    "trial": "Hemachandra had to navigate the vicious court intrigues, jealousy, and religious bigotry of orthodox Shaivite ministers who sought to destroy his influence over the monarchs. During a historic royal pilgrimage to the sacred shrine of Somnath with King Kumarpal, sectarian opponents engineered a trap, demanding that the Jain monk prostrate before the Shiva Lingam or be condemned for sacrilege. Unshaken and smiling with serene magnanimity, Hemachandra stepped directly before the Lingam and proclaimed: \"I bow to Him who has conquered the passions of attachment and aversion, whether He be known as Brahma, Vishnu, Shiva, or Jina!\" By dissolving dogmatic sectarian boundaries in the universal truth of spiritual self-conquest, he silenced his critics forever.",
    "trialLocal": "आचार्य हेमचंद्र को दरबार के ईर्ष्यालु सामंतों के षड्यंत्रों का सामना करना पड़ा। एक बार सोमनाथ मंदिर की यात्रा के दौरान विरोधियों ने सोचा कि यदि हेमचंद्र शिव को नमन नहीं करेंगे तो राजा रुष्ट हो जाएगा। परंतु हेमचंद्र ने शिवलिंग के समक्ष जाकर उद्घोष किया—'जो भी राग और द्वेष से मुक्त हो चुका है, चाहे वह ब्रह्मा हो, विष्णु हो, शिव हो या जिन हो, मैं उसी को नमन करता हूँ!' इस उदात्त दृष्टि ने सभी आलोचकों को नतमस्तक कर दिया।",
    "teaching": "Ahimsa is not merely a passive avoidance of physical harm, but an active, boundless compassion that embraces every breathing soul. Scholarship and intellect are hollow vanity unless they manifest as protective love for the humblest creature. A monarch’s true glory lies not in bloody military conquests or accumulated gold, but in establishing justice, sheltering the weak, and eliminating institutional cruelty from society.",
    "teachingLocal": "अहिंसा ही परम धर्म और समाज की रीढ़ है। विद्वता तब तक व्यर्थ है जब तक वह मूक और निर्बल प्राणियों के प्रति दया न जगा सके। सच्चा राजा वही है जो तलवार के बल पर नहीं, अपितु प्रजा की रक्षा और नैतिक मूल्यों की स्थापना से शासन करता है।",
    "moral": "Brilliant scholarship reaches its divine fulfillment only when married to ethical character and political courage. We must never allow rigid sectarian labels to blind us to universal truth, recognizing that true divinity resides wherever virtue, self-restraint, and compassion flourish.",
    "moralLocal": "प्रखर ज्ञान तभी कल्याणकारी होता है जब वह करुणा और लोक-कल्याण से जुड़ता है। सांप्रदायिक संकीर्णता से ऊपर उठकर सत्य और सदाचार का आदर करना ही सच्ची प्रबुद्धता है।",
    "legacy": "Acharya Hemachandra laid the enduring literary, cultural, and ethical foundation of Gujarat. His standardized grammar helped shape the Gujarati language, while his institutionalization of Ahimsa under King Kumarpal created a deeply rooted vegetarian and compassionate civic ethos that endured through centuries of political upheaval, directly nurturing the spiritual environment that produced Mahatma Gandhi’s philosophy of Satyagraha.",
    "legacyLocal": "आचार्य हेमचंद्र ने गुजरात की भाषाई, साहित्यिक और सांस्कृतिक अस्मिता की आधारशिला रखी। उनकी अहिंसा-प्रेरित नीति ने सदियों तक समाज में शाकाहार और करुणा की संस्कृति को जीवित रखा, जिसका प्रभाव आगे चलकर महात्मा गांधी के अहिंसा आंदोलन में भी स्पष्ट परिलक्षित हुआ।",
    "source": "Yoga Shastra & Trishashti-Shalakapurusha-Charitra (Acharya Hemachandra)",
    "sourceLocal": "योगशास्त्र एवं त्रिषष्टि-शलाकापुरुष-चरित्र (आचार्य हेमचन्द्र)",
    "sourceCitations": [
      {
        "sourceName": "Yoga Shastra",
        "sourceRef": "Prakasha 1–2, On the Vows of the Layman",
        "tier": 1
      },
      {
        "sourceName": "Prabhavaka Charitra",
        "sourceRef": "Life of Acharya Hemachandra",
        "tier": 2
      }
    ],
    "illustrationPrompt": "Acharya Hemachandra in pristine white monastic robes presenting the palm-leaf manuscript of Siddha-Hema to King Siddharaja Jayasimha in the grand royal court of medieval Patan.",
    "quote": {
      "text": "Just as a mother protects her only child with her life, let your heart protect all living creatures, from the elephant down to the tiniest ant.",
      "attribution": "Yoga Shastra, 2.18"
    },
    "quoteLocal": {
      "text": "जिस प्रकार एक माता अपने इकलौते पुत्र की प्राण देकर भी रक्षा करती है, उसी प्रकार तुम्हारा हृदय विशाल गजराज से लेकर सूक्ष्म चींटी तक समस्त जीवों की रक्षा करे।",
      "attribution": "योगशास्त्र, २.१८"
    }
  },
  {
    "id": "lonka-saha",
    "name": "Lonka Saha",
    "nameLocal": "लोंकाशाह",
    "era": "c. 15th Century CE (fl. 1475 CE)",
    "eraLocal": "लगभग १५वीं शताब्दी (१४७५ ईस्वी)",
    "tradition": "jain",
    "region": "Ahmedabad (Gujarat)",
    "regionLocal": "अहमदाबाद (गुजरात)",
    "emoji": "🖋️",
    "tagline": "The visionary scribe and scriptural reformer of Ahmedabad who returned Jainism to its canonical Agama roots, founding the non-idolatrous Sthanakvasi movement.",
    "taglineLocal": "अहमदाबाद के दूरदर्शी लेखक और शास्त्र-सुधारक, जिन्होंने जैन परंपरा को पुनः आगमों के मूल सिद्धांतों से जोड़ा और स्थानकवासी आंदोलन की नींव रखी।",
    "journey": "In the vibrant mercantile metropolis of Ahmedabad during the late fifteenth century, amidst the grand architectural monuments of the Gujarat Sultanate, Lonka Saha served as a master scribe and chief administrative clerk. Renowned for his exquisite calligraphy, sharp philological mastery of ancient Prakrit and Apabhramsha, and immaculate integrity, Lonka Saha was commissioned by affluent Jain merchants and temple trustees to transcribe ancient palm-leaf manuscripts preserved in dark, subterranean temple vaults (Jnana Bhandars) to save them from natural decay and wartime destruction. As Lonka Saha spent consecutive years painstakingly copying the sacred Agamas—word by word, syllable by syllable—a revolutionary intellectual and spiritual awakening transformed his life.\n\nHaving direct, unmediated access to the foundational discourses of Bhagwan Mahavira—including the Acharanga, Sutrakritanga, and Uttaradhyayana Sutras—Lonka Saha was astonished by the stark contradiction between the original canonical teachings and the contemporary religious landscape of his day. In the original Agamas, Bhagwan Mahavira had proclaimed a path of radical inner purification, silent meditation, absolute non-possession (Aparigraha), rigorous self-restraint, and uncompromising compassion for all living beings, including the subtle life-forms inhabiting earth, water, fire, and air. Nowhere in the thirty-two authentic Agamas did the Tirthankara sanction the opulent, gold-encrusted temple rituals, astronomical expenditures, competitive ostentation, and institutional corruption that had come to dominate medieval Jain monasticism.\n\nLonka Saha observed with profound sorrow that monks (Yatis) had abandoned the homelessness of the true Shramana to live comfortably in wealthy monasteries (Upashrayas), amassing property, handling money, and conducting rituals that inadvertently caused harm to subtle life-forms during construction and lavish ceremonies. Refusing to remain complicit in spiritual decay, Lonka Saha stepped out of the scribe’s chambers to launch a fearless scriptural reform movement. Holding up the ancient Agamas before assemblies of scholars, monks, and householders, he demonstrated with undeniable textual evidence that true worship (Puja) is the contemplation and emulation of the Tirthankaras’ detachment, not the ceremonial adoration of stone idols. Despite facing ferocious ostracism from entrenched temple hierarchies, his clarion call awakened a vast community of seekers, laying the foundation for the Sthanakvasi and Terapanthi traditions that practice non-idolatrous, inward-focused spiritual sadhana.",
    "journeyLocal": "पंद्रहवीं शताब्दी में अहमदाबाद में लोंकाशाह एक अत्यंत कुशल लेखक और ज्ञानी विद्वान थे। उनकी सुंदर लिखावट और प्राकृत-संस्कृत के गहरे ज्ञान के कारण, धनी श्रेष्ठी और संघपति उन्हें प्राचीन जैन ज्ञान-भंडारों की जीर्ण ताड़पत्र पाण्डुलिपियों की प्रतिलिपि तैयार करने का कार्य सौंपते थे। जब लोंकाशाह ने मूल जैन आगमों—आचारांग, सूत्रकृतांग, उत्तराध्ययन आदि—को शब्द-दर-शब्द लिखना प्रारंभ किया, तो उनके अंतःकरण में एक महान वैचारिक क्रांति घटित हुई।\n\nउन्होंने देखा कि मूल आगमों में भगवान महावीर ने जिस शुद्ध आत्म-कल्याण, आंतरिक अहिंसा, ध्यान और अपरिग्रह का उपदेश दिया था, वर्तमान समाज उससे बहुत दूर भटक चुका था। उस समय के मठवासी मुनि वैभवपूर्ण जीवन जी रहे थे, मंदिरों के नाम पर भारी धन संग्रह किया जा रहा था, और आडंबरपूर्ण उत्सवों में स्थावर जीवों (जल, अग्नि, वनस्पति) की हिंसा हो रही थी। आगमों में बाह्य मूर्तियों की पूजा के स्थान पर वीतराग गुणों के आंतरिक चिंतन को मोक्ष का मार्ग बताया गया था।\n\nलोंकाशाह ने निर्भीक होकर मूल आगमों के आधार पर सुधार की आवाज उठाई। उन्होंने शास्त्रार्थ कर यह प्रमाणित किया कि जिन-पूजा का वास्तविक अर्थ पाषाण की मूर्तियों को पूजना नहीं, अपितु तीर्थंकरों के गुणों को अपने जीवन में धारण करना है। मंदिर-व्यवस्थापकों के भारी विरोध और बहिष्कार के बावजूद उन्होंने सत्य का मार्ग नहीं छोड़ा। उनके इस आंदोलन से स्थानकवासी परंपरा का उदय हुआ, जिसने आडंबरों को त्यागकर सामायिक, स्वाध्याय और अहिंसा को पुनः जीवन का केंद्र बनाया।",
    "trial": "Lonka Saha’s supreme trial was standing as an ordinary, defenseless lay householder against an entrenched, fabulously wealthy religious establishment of temple trustees, monastic abbots, and orthodox caste leaders. He was subjected to severe social boycotts, excommunication, public slander as a heretic, and continuous threats against his life. Yet he stood immovable as a mountain, brandishing neither weapons nor anger, relying exclusively on the undeniable authority of Bhagwan Mahavira’s original words recorded on ancient palm leaves.",
    "trialLocal": "एक साधारण गृहस्थ होकर भी लोंकाशाह ने सदियों पुरानी रूढ़ियों और शक्तिशाली मठाधीशों की व्यवस्था को चुनौती दी। उन्हें जाति से बहिष्कृत करने के प्रयास हुए, अधर्मी कहा गया और धमकियां दी गईं। परंतु उन्होंने किसी आक्रोश के बिना केवल आगमों के प्रमाणों के बल पर अडिग रहकर सत्य का शंखनाद किया।",
    "teaching": "The true temple of the Divine is your own pure soul; the true sacred ritual is the destruction of internal anger, pride, deceit, and greed. Do not pour out fortunes on external stone monuments while living souls suffer in neglect. Worship the Tirthankaras by embodying their virtues—practicing Ahimsa in every breath, living with simple non-possession, and meditating upon the unblemished self.",
    "teachingLocal": "भगवान का सच्चा मंदिर तुम्हारी अपनी आत्मा है; और सच्ची पूजा अपने विकारों का विसर्जन करना है। बाह्य क्रियाकांडों और आडंबरों में उलझकर आत्मा के आंतरिक ज्ञान और दया को नहीं भूलना चाहिए।",
    "moral": "When religious institutions lose their moral compass and substitute outward spectacle for inner virtue, a single courageous voice armed with truth can ignite a spiritual renaissance. Never trade the pure essence of spiritual truth for the comfortable acceptance of corrupt traditions.",
    "moralLocal": "सत्य और प्रामाणिकता के बल पर एक अकेला व्यक्ति भी सदियों से जमी हुई रूढ़ियों को उखाड़ फेंकने का साहस जुटा सकता है। बाह्य दिखावे से मुक्त होकर मूल सिद्धांतों पर चलना ही सच्चा धर्म है।",
    "legacy": "Lonka Saha’s scriptural revival movement revitalized Jainism during a critical period of medieval decline, giving birth to the vibrant Sthanakvasi tradition and later the Shvetambara Terapanth founded by Acharya Bhikshu. His insistence on direct study of the Agamas democratized religious knowledge, liberated thousands from costly superstitious rituals, and re-centered Jain practice upon inward meditation, scriptural study (Swadhyaya), and ethical simplicity.",
    "legacyLocal": "लोंकाशाह के सुधारवादी आंदोलन ने जैन समाज में एक नई चेतना फूंकी। उनके विचारों ने स्थानकवासी और आगे चलकर आचार्य भिक्षु द्वारा स्थापित तेरापंथ संप्रदाय की आधारशिला रखी, जिससे लाखों श्रावकों ने सादगी और स्वाध्याय का मार्ग अपनाया।",
    "source": "Pattavali & History of Jain Reforms (Pt. Sukhlal Sanghvi)",
    "sourceLocal": "पट्टावली एवं जैन सुधार आंदोलन का इतिहास (पं. सुखलाल संघवी)",
    "sourceCitations": [
      {
        "sourceName": "Pattavali of Sthanakvasi Tradition",
        "sourceRef": "Account of Lonka Saha's Agamic Revival",
        "tier": 2
      },
      {
        "sourceName": "Acharanga Sutra Commentary",
        "sourceRef": "On the Pure Conduct of the Shramana",
        "tier": 1
      }
    ],
    "illustrationPrompt": "15th-century Ahmedabad scribe Lonka Saha sitting by flickering oil lamp at his wooden desk, meticulously examining ancient Prakrit palm-leaf manuscripts with deep spiritual resolve.",
    "quote": {
      "text": "Venerate the virtues of the Tirthankaras within your heart, not the stone; for the soul alone is capable of attaining liberation through pure conduct.",
      "attribution": "Lonka Saha's Address to the Sangha"
    },
    "quoteLocal": {
      "text": "तीर्थंकरों के वीतराग गुणों की अपने हृदय में पूजा करो, पाषाण में नहीं; क्योंकि शुद्ध आचरण और आत्म-ध्यान से ही आत्मा मोक्ष को प्राप्त करती है।",
      "attribution": "लोंकाशाह का संघ को संदेश"
    }
  },
  {
    "id": "shrimad-rajchandra",
    "name": "Shrimad Rajchandra",
    "nameLocal": "श्रीमद् राजचन्द्र",
    "era": "1867–1901 CE",
    "eraLocal": "१८६७-१९०१ ईस्वी",
    "tradition": "jain",
    "region": "Vavaniya / Rajkot (Gujarat)",
    "regionLocal": "वावाणिया / राजकोट (गुजरात)",
    "emoji": "🕊️",
    "tagline": "The modern mystic, poet, and philosopher whose spiritual illumination, Atma Siddhi Shastra, and guidance shaped Mahatma Gandhi's philosophy of truth and non-violence.",
    "taglineLocal": "आधुनिक युग के परम संत और दार्शनिक, जिनकी आत्मिक जागृति, 'आत्मसिद्धि शास्त्र' और मार्गदर्शन ने महात्मा गांधी के जीवन को सत्य और अहिंसा के मार्ग पर ढाला।",
    "journey": "Born as Raichandbhai Mehta in the coastal Gujarati village of Vavaniya, Shrimad Rajchandra experienced spontaneous recollection of past lives (Jati-Smarana Jnana) at the tender age of seven upon witnessing the cremation of an elder neighbor, awakening an unquenchable thirst for absolute spiritual liberation. Blessed with an astonishing prodigy of consciousness, in his early teens he demonstrated the miraculous feat of Shatavadhana—performing one hundred distinct mental activities simultaneously without pencil or paper, including playing chess, composing poetry in multiple meters, solving complex mathematical problems, and identifying bells struck in randomized sequences. The governor of Bombay and royal princes offered him immense fame and wealth, but Shrimad renounced public demonstrations, recognizing that occult intellectual displays were merely subtle traps feeding the ego.\n\nUnlike traditional monastic renunciates who withdraw into mountain caves, Shrimad Rajchandra lived predominantly as a householder in Mumbai and Gujarat, engaging in the pearl and gemstone trade to fulfill family obligations while his consciousness remained permanently absorbed in unshakeable spiritual detachment. Handling diamonds and pearls worth fortunes during the day, his heart remained utterly untouched by greed or possessiveness, exemplifying the ancient ideal of King Janaka. During his twenties, he met a young, spiritually conflicted London-trained barrister named Mohandas Karamchand Gandhi in Mumbai. Gandhi was deeply unsettled by religious doubts and aggressively courted by Christian and Muslim intellectuals to convert. Shrimad's profound scriptural mastery, crystalline logic, and radiant living embodiment of truth made an indelible impression on Gandhi, who adopted him as his supreme spiritual guide and moral anchor. Through extensive philosophical correspondence while Gandhi was in South Africa, Shrimad rooted Gandhi deeply in Ahimsa, celibacy (Brahmacharya), and universal tolerance, providing the bedrock upon which the Indian independence struggle was built.\n\nIn 1896, in the serene hill retreat of Nadiad, in a single night of divine inspiration across less than two hours, Shrimad composed his spiritual magnum opus: the *Atma Siddhi Shastra*—a sublime Gujarati philosophical poem of 142 verses elucidating the six fundamental spiritual truths (Satpada): the existence of the soul, its eternity, its agency as the doer of karma, its experience of fruits, its capacity for liberation, and the practical path to Moksha. Living in intense meditative austerities in the forests of Idar, Shrimad lived a life of unblemished purity before shedding his physical body at the young age of thirty-three in Rajkot, leaving a timeless spiritual legacy for modern humanity.",
    "journeyLocal": "गुजरात के वावाणिया ग्राम में जन्मे रायचंदभाई को मात्र सात वर्ष की आयु में एक पड़ोसी की अंत्येष्टि देखकर पूर्वजन्मों का जातिस्मरण ज्ञान जागृत हुआ, जिससे उनके हृदय में वैराग्य की तीव्र धारा फूट पड़ी। बाल्यकाल में ही उन्होंने 'शतावधान' की अलौकिक क्षमता का प्रदर्शन किया—एक साथ सौ विभिन्न बौद्धिक क्रियाएं बिना किसी कागज-कलम के करना, जिसमें शतरंज खेलना, विविध छंदों में काव्य रचना, जटिल गणितीय गणनाएं और पीछे बजने वाले घंटों की गिनती शामिल थी। मुंबई के गवर्नर और तत्कालीन राजाओं ने उन्हें सम्मानित किया, परंतु उन्होंने इस ख्याति को आत्म-साधना में बाधक मानकर इन प्रदर्शनों को तत्काल त्याग दिया।\n\nश्रीमद् राजचन्द्र ने कोई संन्यास वेश धारण नहीं किया; वे एक गृहस्थ व्यापारी के रूप में मुंबई में मोती और रत्नों का व्यापार करते रहे। सहस्रों रुपयों के बहुमूल्य हीरों के बीच रहते हुए भी उनका अंतःकरण सर्वथा निर्लिप्त रहा, ठीक वैसे ही जैसे कमल जल में रहकर भी जल से अछूता रहता है। १८९१ में जब बैरिस्टर मोहनदास करमचंद गांधी लंदन से लौटे, तो उनकी भेंट श्रीमद् जी से हुई। गांधी जी उस समय गंभीर धार्मिक संशयों से घिरे थे। श्रीमद् जी के निर्मल चरित्र, गहन तत्वज्ञान और समदर्शी व्यवहार ने गांधी जी को इतना प्रभावित किया कि उन्होंने श्रीमद् जी को अपना आध्यात्मिक पथप्रदर्शक स्वीकार किया। दक्षिण अफ्रीका प्रवास के दौरान श्रीमद् जी द्वारा भेजे गए पत्रों ने गांधी जी को सत्य, अहिंसा और ब्रह्मचर्य की ऐसी दृढ़ आधारशिला दी जिसने आगे चलकर भारतीय स्वाधीनता आंदोलन का स्वरूप निर्धारित किया।\n\n१८९६ में नाडियाड में एक ही रात्रि में, मात्र दो घंटे के आत्म-उल्लास में उन्होंने 'आत्मसिद्धि शास्त्र' की रचना की। १४२ दोहों का यह गुजराती ग्रंथ आत्म-दर्शन का अमर काव्य बन गया, जिसमें आत्मा के अस्तित्व, नित्यत्व, कर्तृत्व, भोक्तृत्व, मोक्ष और मोक्ष के उपाय—इन छह सत्यों का वैज्ञानिक विश्लेषण है। ईडर की गुफाओं में गहन ध्यान करते हुए, मात्र तैंतीस वर्ष की अल्पायु में उन्होंने राजकोट में समाधिपूर्वक देहत्याग किया।",
    "trial": "Shrimad Rajchandra's most extraordinary trial was maintaining absolute, unbroken spiritual absorption while actively managing commercial business in the bustling markets of Mumbai. Surrounded by material wealth and commerce, he never compromised honesty by a single grain, demonstrating that true spiritual transcendence is realized not by escaping society, but by purifying the inner consciousness of all desire.",
    "trialLocal": "श्रीमद् राजचन्द्र की सबसे बड़ी साधना सांसारिक व्यापार के कोलाहल के बीच रहकर भी अखंड आत्म-लीनता को बनाए रखना था। मुंबई के रत्न बाजार में व्यापार करते हुए भी उन्होंने कभी सत्य और प्रामाणिकता से समझौता नहीं किया। वे इस सत्य के साक्षात प्रमाण थे कि संन्यास केवल जंगल भागने का नाम नहीं, बल्कि संसार में रहते हुए भी भीतर से निष्काम और अनासक्त हो जाना है।",
    "teaching": "The soul is an eternal, independent conscious reality, distinct from the physical body and mental modifications. Real religion is not sectarian dogmatism, blind rituals, or external identity, but the living cessation of ego, attachment, and aversion through direct self-realization (Atma-Jnana).",
    "teachingLocal": "आत्मा एक शाश्वत, स्वतंत्र चैतन्य तत्व है जो देह और मन से सर्वथा भिन्न है। सच्चा धर्म किसी संप्रदाय की रूढ़ियों, बाह्य क्रियाकांडों या मत-मतांतरों में नहीं, बल्कि राग-द्वेष के क्षय और आत्म-साक्षात्कार में है। जब तक आत्मा का अपने शुद्ध स्वरूप में अनुभव नहीं होता, तब तक सारे बाह्य प्रयास व्यर्थ हैं।",
    "moral": "Do not wait for ideal conditions or retirement to seek spiritual truth. In whatever circumstance or profession you find yourself, you can cultivate absolute detachment, integrity, and mindfulness in the present moment.",
    "moralLocal": "आत्म-कल्याण के लिए किसी विशेष वेश या एकांत की प्रतीक्षा मत करो। तुम जहाँ भी हो, जिस परिस्थिति में हो, वहीं अपने मन को वासनाओं से मुक्त रखकर पवित्र और सत्यनिष्ठ जीवन जी सकते हो।",
    "legacy": "Shrimad Rajchandra is recognized as one of the towering spiritual masters of modern India. His *Atma Siddhi Shastra* has been translated into dozens of world languages, while his profound guidance to Mahatma Gandhi forever embedded spiritual non-violence into the political conscience of the modern world.",
    "legacyLocal": "श्रीमद् राजचन्द्र आधुनिक भारत के महानतम आध्यात्मिक विभूतियों में गिने जाते हैं। उनके 'आत्मसिद्धि शास्त्र' ने लाखों साधकों को आत्म-बोध की दिशा दी, और महात्मा गांधी के जीवन पर उनके आध्यात्मिक प्रभाव ने विश्व को अहिंसा और सत्याग्रह का अमोघ अस्त्र प्रदान किया।",
    "source": "Atma Siddhi Shastra & Vachanamrut (Shrimad Rajchandra)",
    "sourceLocal": "आत्मसिद्धि शास्त्र एवं वचनामृत (श्रीमद् राजचन्द्र)",
    "sourceCitations": [
      {
        "sourceName": "Atma Siddhi Shastra",
        "sourceRef": "Verses 43–45, The Six Fundamental Characteristics of the Soul",
        "tier": 1
      },
      {
        "sourceName": "The Story of My Experiments with Truth (M.K. Gandhi)",
        "sourceRef": "Part 2, Chapter 1: Raychandbhai",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Portrait of young Shrimad Rajchandra in simple white Gujarati attire with tranquil, deeply luminous eyes, seated cross-legged on a wooden platform writing Atma Siddhi Shastra by a lantern.",
    "quote": {
      "text": "The soul exists; it is eternal; it is the doer of its actions and the reaper of their fruits; there is liberation from bondage, and there is a direct path to attain it.",
      "attribution": "Atma Siddhi Shastra, Verse 43"
    },
    "quoteLocal": {
      "text": "आत्मा छे, ते नित्य छे, छे कर्ता निज कर्म। छे भोक्ता वळी तेहनों, छे मोक्ष उपाय सुधर्म॥",
      "attribution": "आत्मसिद्धि शास्त्र, गाथा ४३"
    }
  },
  {
    "id": "gautama-swami",
    "name": "Gautama Swami (Indrabhuti)",
    "nameLocal": "गौतम स्वामी (इंद्रभूति)",
    "era": "c. 6th–5th Century BCE",
    "eraLocal": "लगभग छठी-पांचवीं शताब्दी ईसा पूर्व",
    "tradition": "jain",
    "region": "Magadha / Rajgriha",
    "regionLocal": "मगध / राजगृह",
    "emoji": "📿",
    "tagline": "The proud Vedic scholar whose vanity dissolved before Bhagwan Mahavira, becoming the foremost Ganadhara who compiled the sacred Agamas and attained Kevala Jnana through pure detachment.",
    "taglineLocal": "महाविद्वान वैदिक पंडित जिनका दर्प भगवान महावीर के चरणों में विगलित हो गया, और जो द्वादशांगी आगमों के प्रधान संकलनकर्ता तथा प्रथम गणधर बने।",
    "journey": "Born into an illustrious scholarly Brahmin family in the kingdom of Magadha, Indrabhuti Gautama was celebrated as the greatest intellectual and Vedic scholar of his era. Flanked by five hundred accomplished disciples, he had mastered the four Vedas, Upanishads, grammar, astronomy, and ritual sciences, boasting that no living scholar on earth could challenge his comprehension of cosmic truth. When the wealthy merchant Somil organised a colossal Vedic Yajna at Apapa (Pawapuri), thousands of scholars assembled, exalting Indrabhuti as the undisputed sun of scholarship. Suddenly, divine celestial vehicles were seen flying across the sky. Indrabhuti proudly assumed the gods were descending to honor his sacrifice, only to be informed that the deities were bypassing the sacrificial altar to pay homage to the newly enlightened twenty-fourth Tirthankara, Bhagwan Mahavira, who had attained Kevala Jnana and was presiding over his first divine assembly (Samavasarana) nearby.\n\nStung by wounded pride, Indrabhuti resolved to debate and publicly humiliate Mahavira. He walked into the Samavasarana with five hundred disciples, carrying a secret, unresolved philosophical doubt regarding the existence of the soul (Jiva) that he had never revealed to any living being. As Indrabhuti stepped into the sacred pavilion, Bhagwan Mahavira addressed him by his personal name, welcoming him with boundless love and omniscience: 'Welcome, Indrabhuti Gautama! You harbor doubt in your heart whether the soul is distinct from the physical body, or merely a transient byproduct of material elements.' Mahavira proceeded to quote Indrabhuti's own secret Vedic passages, resolving every metaphysical doubt with crystalline clarity and showing that the conscious knower is an eternal, independent reality.\n\nAt that very moment, the colossal mountain of Indrabhuti's pride shattered to dust. Tears of awe flowed from his eyes. He realized that intellectual arrogance is merely a prison of darkness compared to the radiant sun of spiritual omniscience. Falling at Mahavira's feet, Indrabhuti and his five hundred disciples renounced their sacred threads, sacrificial fire-altars, and scholarly fame to accept Shramana diksha, becoming Bhagwan Mahavira’s foremost disciple and chief Ganadhara under the name Gautama Swami. Blessed with photographic memory and supreme spiritual retention, Gautama Swami listened to the divine sound (Divyadhvani) of Mahavira and meticulously codified the teachings into the twelve sacred Agamas (Dvadashangi), creating the foundational canon of Jainism.",
    "journeyLocal": "मगध के ब्राह्मण कुल में जन्मे इंद्रभूति गौतम अपने समय के प्रकांड वैदिक विद्वान थे। चारों वेदों, वेदांगों और दर्शनों के ज्ञाता गौतम के पास पांच सौ विद्वान शिष्य अध्ययन करते थे। उनके ज्ञान का इतना अहंकार था कि वे मानते थे कि भूमंडल पर उनके समान कोई दूसरा ज्ञानी नहीं है। जब पावापुरी में सोमिल नामक धनी श्रेष्ठी ने एक महायज्ञ का आयोजन किया, तो गौतम को उसका प्रधान आचार्य बनाया गया। अचानक आकाश में देवों के विमान उतरते दिखाई दिए। गौतम को लगा कि देव उनके यज्ञ का दर्शन करने आ रहे हैं, परंतु जब उन्हें ज्ञात हुआ कि देव भगवान महावीर के प्रथम समवशरण की ओर जा रहे हैं, तो उनका गर्व आहत हो गया।\n\nवे महावीर को शास्त्रार्थ में पराजित करने के उद्देश्य से अपने पांच सौ शिष्यों सहित समवशरण में पहुँचे। उनके मन में आत्मा के अस्तित्व को लेकर एक अत्यंत गुप्त संशय था, जो उन्होंने कभी किसी से प्रकट नहीं किया था। जैसे ही वे समवशरण में प्रविष्ट हुए, भगवान महावीर ने उन्हें नाम से पुकारा—'हे इंद्रभूति गौतम! तुम्हारा स्वागत है! तुम्हारे मन में यह संशय है कि क्या आत्मा देह से भिन्न कोई स्वतंत्र सत्ता है अथवा पंचभूतों का ही संयोग मात्र है?' महावीर ने वेदों की ऋचाओं का वास्तविक अर्थ उद्घाटित करते हुए उनके समस्त संशयों का तत्काल निवारण कर दिया।\n\nउस अलौकिक सर्वज्ञता और वात्सल्य के समक्ष गौतम का सारा अहंकार पल भर में पिघल गया। वे समझ गए कि कोरा पोथी-ज्ञान केवल अहंकार को बढ़ाता है, जबकि आत्म-ज्ञान ही वास्तविक मुक्ति है। उन्होंने तुरंत यज्ञोपवीत उतारकर अपने पांच सौ शिष्यों सहित भगवान महावीर के चरणों में दिगंबर दीक्षा अंगीकार की और उनके प्रथम गणधर बने। गौतम स्वामी ने महावीर की दिव्यध्वनि को द्वादशांगी आगमों के रूप में संकलित किया, जो आज तक जिनवाणी की अमर धरोहर हैं।",
    "trial": "Gautama Swami's most poignant trial was his profound, overwhelming personal attachment (Sneha) to Bhagwan Mahavira. Despite attaining extraordinary spiritual powers (Labdhis) and supreme ascetic purity, Kevala Jnana remained just out of reach because his heart loved his Master too intensely. On the fateful night of Dipawali in Pawapuri, when Mahavira attained Nirvana, Gautama was dispatched to enlighten a distant householder. Hearing of Mahavira's passing, Gautama wept in agony: 'Lord, why did you leave me behind?' In that crucible of heartbreak, Gautama suddenly perceived that even divine attachment to a Tirthankara is still a bond of affection. The moment he severed that final thread of emotional attachment, absolute omniscience (Kevala Jnana) illumined his soul at dawn.",
    "trialLocal": "गौतम स्वामी की सबसे कठिन परीक्षा भगवान महावीर के प्रति उनका अगाध व्यक्तिगत प्रेम (स्नेह) था। समस्त सिद्धियों और कठोर तप के बावजूद उन्हें केवलज्ञान नहीं हो रहा था क्योंकि उनका हृदय अपने गुरु के चरणों में बंधा हुआ था। दीपावली की रात्रि जब पावापुरी में भगवान महावीर ने निर्वाण प्राप्त किया, तो गौतम स्वामी पास नहीं थे। भगवान के महाप्रयाण का समाचार सुनकर वे विलाप करने लगे। परंतु उसी क्षण उन्हें ज्ञान हुआ कि तीर्थंकर के प्रति भी राग अंततः एक बंधन ही है। जैसे ही उन्होंने उस अंतिम राग-तंतु को विसर्जित किया, भोर की पहली किरण के साथ उन्हें परम केवलज्ञान प्राप्त हो गया।",
    "teaching": "Scholarly erudition without spiritual humility is mere intellectual pride. The eternal soul cannot be known through dialectical debates, but through humble surrender of the ego, ethical self-restraint, and meditation upon the inner witness.",
    "teachingLocal": "विनम्रता के बिना कोरा ज्ञान अहंकार का पोषण करता है। आत्मा को शास्त्रार्थ से नहीं, अपितु अहंकार के समर्पण और अंतर्मुखी साधना से ही जाना जा सकता है। जब तक हृदय में किसी भी प्रकार का राग शेष है, तब तक पूर्ण मुक्ति संभव नहीं है।",
    "moral": "Even the highest form of love—devotion to a spiritual master—must ultimately transcend emotional dependency to merge into the formless truth of the divine self.",
    "moralLocal": "गुरु के प्रति भी अत्यधिक मोह यदि राग का रूप ले ले, तो वह आध्यात्मिक यात्रा में अंतिम रुकावट बन सकता है। गुरु का सच्चा सम्मान उनके उपदेशों को अपने भीतर उतारकर स्वयं जागृत होना है।",
    "legacy": "As the chief Ganadhara, Gautama Swami gave structured form to the entire oral canon of the Jain Agamas. Every sacred Agamic discourse traditionally opens with the venerated invocation of Gautama inquiring of Mahavira: 'Bhante!' (O Revered Lord!).",
    "legacyLocal": "प्रथम गणधर के रूप में गौतम स्वामी ने संपूर्ण आगम साहित्य को शब्द और व्यवस्था दी। आज जैन शास्त्रों का प्रत्येक पाठ गौतम स्वामी द्वारा भगवान से पूछे गए प्रश्नों और उनके समाधान के रूप में ही सुरक्षित है।",
    "source": "Bhagavati Sutra & Aupapatika Sutra",
    "sourceLocal": "भगवती सूत्र एवं औपपातिक सूत्र",
    "sourceCitations": [
      {
        "sourceName": "Bhagavati Sutra (Vyakhyaprajnapti)",
        "sourceRef": "Shataka 1, Dialogue between Mahavira and Gautama",
        "tier": 1
      },
      {
        "sourceName": "Aupapatika Sutra",
        "sourceRef": "Description of the Samavasarana and the Ganadharas",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Gautama Swami kneeling in awe and complete humility before the glowing golden Samavasarana of Bhagwan Mahavira, laying aside his Vedic staff and smiling in sudden enlightenment.",
    "quote": {
      "text": "As a drop of water on the tip of a blade of grass cannot endure the sun, so is the life of mortals; do not delay for a single moment in seeking spiritual liberation.",
      "attribution": "Uttaradhyayana Sutra, 10.1"
    },
    "quoteLocal": {
      "text": "जैसे घास के तिनके पर टिकी ओस की बूंद पल भर में विलीन हो जाती है, वैसे ही मानव जीवन अत्यंत क्षणभंगुर है; अतः हे गौतम, एक समय के लिए भी प्रमाद मत करो।",
      "attribution": "उत्तराध्ययन सूत्र, १०.१"
    }
  },
  {
    "id": "chandanbala",
    "name": "Sadhvi Chandanbala",
    "nameLocal": "साध्वी चंदनबाला",
    "era": "c. 6th Century BCE",
    "eraLocal": "लगभग छठी शताब्दी ईसा पूर्व",
    "tradition": "jain",
    "region": "Champa / Kaushambi",
    "regionLocal": "चंपा / कौशाम्बी",
    "emoji": "🌸",
    "tagline": "The captured princess sold into slavery whose unshakeable purity, devotion, and simple offering of dry lentil husks broke Bhagwan Mahavira's legendary five-month fast.",
    "taglineLocal": "दासता में बेची गई राजकुमारी जिनकी असीम पवित्रता, निष्ठा और सूखे उड़द के बाकुलों के दान ने भगवान महावीर का पांच मास का कठिन अभिग्रह पूर्ण किया।",
    "journey": "Originally named Princess Vasumati, she was the beloved, refined daughter of King Dadhivahana and Queen Dharini of the kingdom of Champa. During a catastrophic military invasion by King Shatanika of Kaushambi, Champa was sacked, and the young princess was seized in the chaos by an enemy general. Transported far from her homeland, she was heartlessly sold at an open slave market in Kaushambi to a wealthy merchant named Dhanavaha. Recognizing her innate nobility, modesty, and exceptional character, Dhanavaha treated her with parental affection, renaming her Chandana (Chandanbala) because her gentle, virtuous presence brought the cool fragrance of sandalwood into his household.\n\nHowever, Dhanavaha's insecure and suspicious wife, Mula, became consumed by paranoid jealousy, suspecting that her husband intended to marry the young maiden. Waiting until Dhanavaha was away on a prolonged trade journey, Mula struck with cruel savagery. She summoned a barber, had Chandanbala's lustrous hair violently shaved to the scalp, bound her delicate arms and ankles with heavy iron chains, and threw her into a subterranean dungeon, starving her for three days and nights without a sip of water.\n\nMeanwhile, Bhagwan Mahavira was wandering as an austere mendicant in the twelfth year of his severe penance, practicing absolute detachment. In Kaushambi, Mahavira resolved upon an extraordinary, seemingly impossible secret vow (Abhigraha) before he would accept food to break a continuous fast that had lasted five months and twenty-five days. His vow stipulated: he would accept alms only if the giver was a princess reduced to slavery, wearing iron chains, with a shaved head, confined between two thresholds, weeping with tears streaming down her face, smiling simultaneously with devotion, and offering nothing more than coarse boiled lentil husks (Bakula) from a broken winnowing basket. For months Mahavira walked silently through Kaushambi, turning away from opulent palaces offering royal feasts.\n\nOn the very day Dhanavaha returned, horrified to discover Chandanbala locked in the dark pit, he broke her dungeon door, retrieved a basket of dry boiled lentil husks from the cattle shed to feed her, and rushed to find a blacksmith to cut her chains. As Chandanbala stood at the threshold in chains, head shaved, weeping at her misery, she caught sight of the radiant Tirthankara walking past the alley. Overjoyed, she called out to offer him her humble lentil husks. Mahavira turned toward her, seeing all conditions fulfilled, but as he reached out his alms-bowl, he paused: she was not crying. Disappointed, he began to walk away. Desolate that her lord was leaving without food because of her unworthiness, tears burst from Chandanbala's eyes even as her lips smiled in desperate love. Mahavira immediately turned back and accepted the coarse husks from her cupped hands. Miraculously, celestial drums sounded across the heavens, flowers rained from the sky, her iron chains shattered into gold, her hair grew back in radiant black curls, and her slave rags transformed into celestial silk.",
    "journeyLocal": "चंपा नगरी के राजा दधिवाहन और महारानी धारिणी की सुपुत्री राजकुमारी वसुमती अत्यंत सुसंस्कृत और धर्मपरायण थीं। कौशाम्बी के राजा शतानीक के आक्रमण के समय चंपा का पतन हो गया और एक सेनापति ने राजकुमारी का अपहरण कर लिया। उसने कौशाम्बी के दास बाजार में वसुमती को धनावह नामक श्रेष्ठी के हाथों बेच दिया। श्रेष्ठी ने राजकुमारी के शील और संस्कारों को देखकर उसे पुत्रीवत स्नेह दिया और उसका नाम 'चंदनबाला' रखा, क्योंकि उसकी उपस्थिति चंदन के समान शीतलता देती थी।\n\nपरंतु धनावह की पत्नी मूला अत्यंत ईर्ष्यालु थी। जब श्रेष्ठी व्यापार के लिए बाहर गया, तो मूला ने चंदनबाला पर अमानवीय अत्याचार किए। उसने चंदनबाला के सुंदर केश मुंडवा दिए, उसके पैरों में भारी लोहे की बेड़ियां डाल दीं और उसे एक अंधेरे तलघर में तीन दिनों तक भूखा-प्यासा कैद कर दिया।\n\nउधर भगवान महावीर अपनी कठोर साधना के बारहवें वर्ष में थे। कौशाम्बी में उन्होंने एक अत्यंत कठिन गुप्त अभिग्रह (संकल्प) लिया था कि वे पांच माह पच्चीस दिनों का उपवास तभी तोड़ेंगे जब आहार देने वाली—राजकुमारी हो जो दासी बन चुकी हो, जिसके सिर पर बाल न हों, पैरों में बेड़ियां हों, जो एक पैर देहरी के भीतर और एक बाहर रखे हो, जिसकी आंखों में आंसू हों और चेहरे पर मुस्कान हो, और जो सूप में रखे सूखे उड़द के बाकुलों का दान दे। भगवान नगर के बड़े-बड़े महलों से खाली हाथ लौट जाते थे।\n\nजब धनावह लौटा तो उसने चंदनबाला को तलघर से निकाला और लुहार को बुलाने गया। उसने चंदनबाला को खाने के लिए उड़द के बाकुले दिए। उसी समय भगवान महावीर वहाँ से गुजरे। चंदनबाला ने प्रभु को देखा तो अपने सारे दुख भूलकर उल्लास से आहार देने आगे बढ़ी। भगवान ने देखा कि उसके आंसू नहीं बह रहे हैं, तो वे लौटने लगे। प्रभु को लौटता देख चंदनबाला फूट-फूट कर रोने लगी—'हे नाथ! क्या मुझ दासी का आहार भी आपके योग्य नहीं?' उसके आंसुओं को देखते ही अभिग्रह पूर्ण हुआ और महावीर ने उसके हाथों से बाकुले स्वीकार किए। उसी क्षण देवों ने दुंदुभि बजाई, आकाश से पुष्प बरसे, लोहे की बेड़ियां कटकर स्वर्ण बन गईं और चंदनबाला का रूप पुनः दिव्य हो गया।",
    "trial": "Chandanbala's ultimate trial was enduring the brutal degradation of royal slavery, dungeon torture, and starvation without allowing a single drop of bitterness, hatred, or vengeance to enter her heart. Even in her darkest hour in iron chains, her first thought upon seeing a hungry mendicant was selfless hospitality.",
    "trialLocal": "चंदनबाला की सबसे बड़ी परीक्षा राजमहल के सुखों से सीधे दासता, अपमान और कालकोठरी की प्रताड़ना सहने के बाद भी अपने मन में मूला के प्रति लेशमात्र भी द्वेष न आने देना था। भूखी और जंजीरों में जकड़ी होने पर भी जब उसने प्रभु को देखा, तो अपने कष्ट भूलकर केवल दान का भाव रखना उसकी असीम पवित्रता का प्रमाण था।",
    "teaching": "The purity of an offering depends entirely on the selflessness of the heart, not the material value of the gift. Unconditional patience and forgiveness in the face of cruelty can transform iron chains into liberation.",
    "teachingLocal": "दान की महिमा वस्तु के मूल्य में नहीं, अपितु देने वाले के भाव की विशुद्धता में है। क्रूरता और अन्याय के सामने भी यदि मन में क्षमा और समता बनी रहे, तो लोहे की बेड़ियां भी आत्मिक मुक्ति का द्वार बन जाती हैं।",
    "moral": "External adversity and physical degradation cannot touch a soul anchored in chastity and spiritual faith. When you offer whatever little you possess with absolute love, the Divine receives it as the greatest treasure.",
    "moralLocal": "परिस्थितियां कितनी भी प्रतिकूल क्यों न हों, वे एक पवित्र अंतःकरण को कभी मैला नहीं कर सकतीं। अहंकाररहित होकर प्रेम से दिया गया तिनका भी ईश्वर के लिए सुवर्ण के समान होता है।",
    "legacy": "Following Bhagwan Mahavira's Kevala Jnana, Chandanbala became the first female initiate of his monastic order, ordained as the supreme head (Pradhana Arya) of thirty-six thousand Jain nuns (Sadhvis), proving that womanhood holds equal and supreme potential for spiritual liberation.",
    "legacyLocal": "भगवान महावीर के समवशरण में चंदनबाला ने प्रथम श्रमणी दीक्षा ली और ३६,००० साध्वियों के विशाल संघ की प्रधान आर्या (प्रमुख) बनीं। उन्होंने यह सिद्ध किया कि नारी चेतना त्याग, तपस्या और मोक्ष की सर्वोच्च अधिकारी है।",
    "source": "Trishashti-Shalakapurusha-Charitra & Avashyaka Churni",
    "sourceLocal": "त्रिषष्टि-शलाकापुरुष-चरित्र एवं आवश्यक चूर्णि",
    "sourceCitations": [
      {
        "sourceName": "Trishashti-Shalakapurusha-Charitra",
        "sourceRef": "Parva 10, The Fast and Abhigraha of Mahavira in Kaushambi",
        "tier": 1
      },
      {
        "sourceName": "Avashyaka Sutra",
        "sourceRef": "Niryukti on Chandanbala's Alms-Giving",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Young Chandanbala standing in iron chains at the wooden threshold of a mud house, offering coarse lentil husks with tears streaming down her face to the serene, radiant Bhagwan Mahavira.",
    "quote": {
      "text": "Neither royal blood nor gold makes an offering sacred; it is the fragrance of selfless compassion and unblemished purity that reaches the Divine.",
      "attribution": "Avashyaka Churni"
    },
    "quoteLocal": {
      "text": "न राजकुल और न स्वर्ण दान को पावन बनाता है; देने वाले के अंतःकरण की निर्मल करुणा और पवित्रता ही दान को महादान बनाती है।",
      "attribution": "आवश्यक चूर्णि"
    }
  },
  {
    "id": "sthulabhadra",
    "name": "Acharya Sthulabhadra",
    "nameLocal": "आचार्य स्थूलभद्र",
    "era": "c. 3rd–2nd Century BCE",
    "eraLocal": "लगभग तीसरी-दूसरी शताब्दी ईसा पूर्व",
    "tradition": "jain",
    "region": "Pataliputra (Magadha)",
    "regionLocal": "पाटलिपुत्र (मगध)",
    "emoji": "🛡️",
    "tagline": "The Magadhan noble who abandoned a life of decadent luxury to triumph over desire in the house of a courtesan, later preserving the canonical Agamas at the Council of Pataliputra.",
    "taglineLocal": "मगध के कुलीन युवक जिन्होंने विलास को त्यागकर वेश्या के भवन में कामवासना पर विजय प्राप्त की और पाटलिपुत्र की संगीति में जिनवाणी के आगमों को संरक्षित किया।",
    "journey": "Sthulabhadra was born in the imperial capital of Pataliputra as the eldest son of Shakatala, the prime minister of the Nanda Empire. Endowed with breathtaking physical beauty, artistic refinement, and immense wealth, the young nobleman turned his back on imperial politics to immerse himself in the pleasures of the senses. For twelve uninterrupted years, Sthulabhadra resided in the palace of Kosa, the most celebrated and exquisite courtesan of Pataliputra, living in a golden dream of poetry, dance, music, and sensual luxury, completely indifferent to the world outside.\n\nThe turning point of his life arrived with the violent assassination of his father Shakatala during court intrigues. When the Nanda monarch summoned Sthulabhadra to assume his father's prime ministerial seat, Sthulabhadra experienced an overwhelming flash of spiritual revulsion toward courtly power and mortal impermanence. Instead of accepting the prime ministership, he handed the post to his younger brother, walked directly to the monastery of Acharya Sambhutavijaya, and requested initiation into the naked, homeless order of Shramanas. His sudden renunciation sent shockwaves through the empire.\n\nSthulabhadra threw himself into the most rigorous monastic penances. When the four-month monsoon retreat (Chaturmas) approached, during which monks must remain stationary to avoid harming insects spawned by rain, four senior disciples volunteered for extraordinary austerities (Dushkara Charya). One monk chose to spend the four months outside the mouth of a venomous serpent's den; another perched upon the lip of a deep crumbling well; the third sat upon a sharpened iron pike. Sthulabhadra stepped forward and requested the hardest test of all: to spend the entire four months of the monsoon inside the private pleasure chambers of his former lover, the courtesan Kosa.\n\nAcharya Sambhutavijaya granted permission, knowing Sthulabhadra's spiritual resolve. Sthulabhadra returned to Kosa's palace, taking up residence in a corner of her lavish bedchamber on bare straw. Kosa, overjoyed at his return, deployed every art of seduction, intoxicating perfume, romantic verse, dance, and touch to rekindle his passion. For one hundred and twenty continuous days, Sthulabhadra sat motionless in meditation, his eyes lowered, regarding Kosa not as an object of lust, but as a pure, divine soul bound by karma. He spoke to her only of the impermanence of youth, the beauty of the soul, and the path to liberation. At the end of four months, Sthulabhadra walked out of the palace completely untainted, while Kosa fell at his feet, renounced her profession, and embraced the vows of a devout Jain laywoman (Shravika).\n\nWhen the monks returned to report their penances, the Acharya praised the others for their physical endurance, but when Sthulabhadra bowed, the master stood up and embraced him with tears of veneration, proclaiming: 'Dushkaram! Dushkaram Kriyate!'—You alone performed the truly impossible, for you conquered the inner fires of desire! Following the great twelve-year famine, Sthulabhadra convened the historic Council of Pataliputra around 300 BCE, compiling the fragmented oral Agamas and preserving the sacred tradition.",
    "journeyLocal": "पाटलिपुत्र में नंद साम्राज्य के प्रधानमंत्री शकटाल के कुल में जन्मे स्थूलभद्र असाधारण रूपवान, कला-पारखी और धनी युवक थे। सांसारिक सुखों में डूबे स्थूलभद्र ने बारह वर्षों तक पाटलिपुत्र की प्रसिद्ध नर्तकी और रूपसी कोषा के महल में संगीत, नृत्य और विलास का जीवन व्यतीत किया। उन्हें राज-काज और संसार की कोई चिंता न थी।\n\nपरंतु जब दरबारी षड्यंत्रों में उनके पिता शकटाल की हत्या हुई और राजा ने उन्हें प्रधानमंत्री का पद संभालने को कहा, तो स्थूलभद्र की अंतरात्मा कांप उठी। उन्होंने देखा कि जिस सत्ता और जीवन के लिए लोग षड्यंत्र करते हैं, वह कितना क्षणभंगुर है! उन्होंने पद का त्याग कर आचार्य संभूतविजय के चरणों में मुनि दीक्षा ले ली।\n\nदीक्षा के पश्चात् जब वर्षाकाल (चातुर्मास) आया, तो चार मुनियों ने घोर तपस्या के संकल्प लिए। एक मुनि ने सर्प के बिल के पास, दूसरे ने कुएं की मुंडेर पर, और तीसरे ने तीक्ष्ण आरा-यंत्र के पास चातुर्मास बिताने का व्रत लिया। परंतु स्थूलभद्र ने सबसे कठिन परीक्षा चुनी—अपनी पूर्व प्रेमिका कोषा के विलास-भवन में चातुर्मास करना।\n\nआचार्य की आज्ञा लेकर स्थूलभद्र कोषा के महल में गए और एक कोने में कुश के आसन पर ध्यानस्थ हो गए। कोषा ने उन्हें पुनः रिझाने के लिए अपने समस्त हाव-भाव, सौंदर्य, संगीत और स्पर्श का प्रयोग किया। परंतु चार मास तक स्थूलभद्र की दृष्टि विचलित नहीं हुई; वे निरंतर आत्मा के ध्यान में लीन रहे। उन्होंने कोषा को नश्वर देह के स्थान पर आत्मा की अमरता का उपदेश दिया। चार माह पश्चात जब वे लौटे, तो कोषा उनके वैराग्य से प्रभावित होकर स्वयं श्राविका बन चुकी थी। आचार्य ने अन्य मुनियों की तपस्या को सराहा, परंतु स्थूलभद्र के समक्ष खड़े होकर कहा—'दुष्करं कृतवान्!' (तुमने सचमुच असंभव कार्य किया है), क्योंकि तुमने काम-वासना के साक्षात समुद्र में रहकर भी स्वयं को निष्पाप रखा। आगे चलकर स्थूलभद्र ने पाटलिपुत्र संगीति का आयोजन कर आगमों को लिपिबद्ध कराने में ऐतिहासिक योगदान दिया।",
    "trial": "Sthulabhadra's defining trial was spending four months in the intimate chambers of the courtesan he had adored for twelve years, resisting relentless seduction through the sheer force of pure meditation and mental celibacy (Brahmacharya). Conquering lust from within while surrounded by sensual luxury was the pinnacle of spiritual mastery.",
    "trialLocal": "स्थूलभद्र की सबसे कठिन परीक्षा उस कामिनी के शयनकक्ष में चार महीने बिताना था जिससे वे बारह वर्षों तक प्रेम करते रहे थे। बाह्य रूप से कोई पहरा न होने पर भी अपने मन के भीतर काम-वासना के वेग को शांत रखना और पूर्ण वीतरागी बने रहना उनकी साधना का सर्वोच्च शिखर था।",
    "teaching": "Physical austerities that torture the outer body are far easier than subduing the unruly mind and burning out sexual desire from within. Real celibacy (Brahmacharya) is not mere physical suppression, but the radiant joy of abiding in the pure consciousness of the soul.",
    "teachingLocal": "शरीर को कष्ट देना या बाह्य तप करना आसान है, परंतु मन की वासनाओं पर विजय पाना अत्यंत कठिन है। ब्रह्मचर्य केवल शारीरिक नियंत्रण नहीं, बल्कि आत्मा के आनंद में लीन होकर वासना के बीजों को समूल नष्ट कर देना है।",
    "moral": "No matter how deeply you have indulged in worldly pleasures in the past, a single decisive moment of spiritual awakening can transform your consciousness and make you a master of self-restraint.",
    "moralLocal": "अतीत में चाहे जितने भी पाप या भोग रहे हों, यदि एक बार अंतःकरण में वैराग्य की ज्वाला प्रज्वलित हो जाए, तो मनुष्य अपनी दुर्बलताओं पर विजय प्राप्त कर वीतरागता के सर्वोच्च शिखर पर पहुँच सकता है।",
    "legacy": "Acharya Sthulabhadra convened the Council of Pataliputra (c. 300 BCE), which collected and codified the surviving eleven Angas of the Jain Agamas after the Magadha famine, securing the continuity of the Shvetambara canonical lineage.",
    "legacyLocal": "आचार्य स्थूलभद्र ने पाटलिपुत्र संगीति का नेतृत्व कर अकाल के पश्चात बिखरे हुए ग्यारह अंग आगमों का संकलन कराया, जिससे जैन धर्म की ज्ञान-परंपरा लुप्त होने से बच गई।",
    "source": "Parishishta-Parvan (Acharya Hemachandra) & Avashyaka Niryukti",
    "sourceLocal": "परिशिष्ट-पर्वन (आचार्य हेमचन्द्र) एवं आवश्यक निर्युक्ति",
    "sourceCitations": [
      {
        "sourceName": "Parishishta-Parvan",
        "sourceRef": "Sarga 8, The Austerity of Sthulabhadra in Kosa's Mansion",
        "tier": 1
      },
      {
        "sourceName": "Avashyaka Niryukti",
        "sourceRef": "Gatha on the Four Heroes of the Chaturmas Vows",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Young ascetic Sthulabhadra sitting in unwavering meditation on a simple mat inside a lavishly decorated, silk-draped ancient Indian palace chamber, with incense rising and dancer Kosa bowing before him in spiritual reverence.",
    "quote": {
      "text": "Harder than walking on the edge of a sword, harder than swallowing blazing poison, is conquering lust in the midst of temptation.",
      "attribution": "Parishishta-Parvan, 8.112"
    },
    "quoteLocal": {
      "text": "तलवार की धार पर चलना और जलता हुआ विष पीना भी सरल हो सकता है, परंतु काम-वासना के साक्षात सम्मुख रहकर मन को पवित्र रखना सबसे कठिन साधना है।",
      "attribution": "परिशिष्ट-पर्वन, ८.११२"
    }
  },
  {
    "id": "haribhadra",
    "name": "Haribhadra Suri",
    "nameLocal": "हरिभद्र सूरि",
    "era": "c. 8th Century CE",
    "eraLocal": "लगभग आठवीं शताब्दी ईस्वी",
    "tradition": "jain",
    "region": "Chitrakuta (Chittorgarh, Rajasthan)",
    "regionLocal": "चित्रकूट (चित्तौड़गढ़, राजस्थान)",
    "emoji": "☀️",
    "tagline": "The proud royal Brahmin scholar humbled by a Jain nun, who mastered comparative Indian philosophy, overcame the poison of revenge, and pioneered universal inter-faith dialogue in Yogadrishtisamuccaya.",
    "taglineLocal": "विद्वान राजपुरोहित जिनका दर्प एक जैन साध्वी ने तोड़ा, जिन्होंने प्रतिशोध की ज्वाला को करुणा में बदला और 'योगदृष्टिसमुच्चय' से सर्वधर्म समन्वय का मार्ग प्रशस्त किया।",
    "journey": "Born in the historic citadel of Chitrakuta (Chittorgarh in Rajasthan), Haribhadra was an aristocratic Brahmin of formidable intellectual prowess who served as the chief royal priest to King Jitari. Puffed up with immense pride in his mastery of the six orthodox Darshanas, Vedic rituals, grammar, and logic, Haribhadra wore a golden belt around his waist, boasting that his colossal intellect would burst his belly if it were not bound by steel and gold. He declared a public challenge across India that he would immediately surrender and become the humble disciple of anyone who could recite a philosophical verse whose meaning he could not decipher.\n\nOne afternoon while riding in his royal palanquin through the streets of Chitrakuta, he heard a soft, melodic voice coming from a nearby resting hall. A Jain nun named Sadhvi Yakini Mahattara was reciting an ancient Prakrit gatha describing the cosmological lineage of the Tirthankaras: 'Chakkavatti Chakkavatti...' Haribhadra stopped his palanquin, listened intently, and realized with mounting horror and embarrassment that he could not understand the grammatical syntax or philosophical import of the verse. True to his solemn vow, he approached the venerable nun with folded hands, begging her to explain the meaning. With gentle dignity, the nun replied: 'Noble scholar, I am a renunciate who cannot teach a householder. If you wish to understand the depths of the Agamas, you must approach my preceptor Acharya Jinadatta.' Haribhadra went to Jinadatta, renounced his royal wealth, took monastic initiation, and forever after signed his scholarly works with filial gratitude as 'Yakini-Mahattara-Sunu'—the spiritual son of the nun Yakini.\n\nHaribhadra became one of the most prolific and revolutionary scholars in Indian philosophical history, authoring an astounding 1,444 treatises spanning Sanskrit and Prakrit. He was the first thinker in Indian intellectual history to write comparative philosophical compendiums—such as the *Shaddarshanasamuccaya*—presenting rival traditions (Nyaya, Vaisheshika, Sankhya, Yoga, Mimamsa, and Buddhism) with scrupulous fairness and objective appreciation. In his crowning spiritual masterpiece, the *Yogadrishtisamuccaya* (The Synthesis of Yogic Visions), he synthesized Patanjali's Ashtanga Yoga with Jain metaphysics, demonstrating that true spiritual awakening transcends sectarian terminology.",
    "journeyLocal": "राजस्थान के ऐतिहासिक चित्तौड़गढ़ में जन्मे हरिभद्र राजा जितारि के राजपुरोहित थे। चारों वेदों, छहों दर्शनों और तर्कशास्त्र में अद्वितीय विद्वता के कारण उन्हें अपनी मेधा पर अपार अहंकार था। वे अपनी कमर पर सोने का पट्टा बांधकर चलते थे और कहते थे कि उनका विशाल ज्ञान उनके पेट को फाड़ न दे, इसलिए वे यह पट्टा बांधते हैं। उन्होंने प्रतिज्ञा की थी कि जो भी उन्हें ऐसा श्लोक सुना देगा जिसका अर्थ वे न समझ सकें, वे उसके आजीवन शिष्य बन जाएंगे।\n\nएक दिन जब वे पालकी में जा रहे थे, तो उन्होंने साध्वी याकिनी महत्तारा को एक प्राकृत गाथा का पाठ करते सुना। हरिभद्र ने बहुत प्रयास किया, परंतु वे उस गाथा का अर्थ न समझ सके। अपनी प्रतिज्ञा के अनुसार वे साध्वी के पास गए और अर्थ पूछा। साध्वी ने कहा कि वे साधु होकर किसी गृहस्थ को नहीं पढ़ा सकतीं; यदि ज्ञान पाना है तो उनके गुरु आचार्य जिनदत्त के पास जाना होगा। हरिभद्र ने आचार्य जिनदत्त के पास जाकर समस्त वैभव त्याग दिया और दीक्षा ग्रहण की। अपने अहंकार को तोड़ने वाली साध्वी के प्रति कृतज्ञता व्यक्त करते हुए उन्होंने जीवन भर अपने ग्रंथों में स्वयं को 'याकिनी महत्तारा सूनु' (साध्वी याकिनी का आध्यात्मिक पुत्र) लिखा।\n\nआचार्य हरिभद्र ने लगभग १४४४ ग्रंथों की रचना कर भारतीय दर्शन में क्रांति ला दी। वे भारत के पहले विचारक थे जिन्होंने 'षड्दर्शनसमुच्चय' लिखकर सभी दर्शनों—न्याय, वैशेषिक, सांख्य, योग, मीमांसा और बौद्ध—का बिना किसी पूर्वाग्रह के निष्पक्ष विवेचन किया। अपने अमर ग्रंथ 'योगदृष्टिसमुच्चय' में उन्होंने पतंजलि के योग और जैन दर्शन का सुंदर समन्वय प्रस्तुत किया और बताया कि सभी मार्गों का अंतिम लक्ष्य आत्मा का परमात्मा से मिलन है।",
    "trial": "Haribhadra's supreme trial was overcoming the burning poison of personal vengeance. When his two beloved monastic nephews, Hansa and Paramahamsa, were murdered by fanatical sectarian monks at a rival university, Haribhadra was consumed by agonizing grief and fury. Using his occult powers, he prepared to destroy his nephews' murderers in boiling oil. His compassionate preceptor intervened by singing a verse of forgiveness, showing him that revenge would drag his own soul into hell. Weeping in remorse, Haribhadra extinguished his wrath, composed treatises on universal forgiveness, and redirected his grief into writing spiritual literature.",
    "trialLocal": "हरिभद्र की सबसे कठिन परीक्षा प्रतिशोध की भयानक ज्वाला पर विजय पाना था। जब उनके प्रिय शिष्य और भांजे हंस और परमहंस की अन्य मतावलंबियों द्वारा हत्या कर दी गई, तो हरिभद्र शोक और क्रोध से पागल हो उठे। वे अपनी तांत्रिक शक्ति से हत्यारों को दंडित करने की योजना बनाने लगे। परंतु उनके गुरु ने समय पर उन्हें करुणा का पाठ पढ़ाया और समझाया कि प्रतिशोध से केवल अपनी ही आत्मा का पतन होता है। हरिभद्र का हृदय पश्चाताप से भर गया; उन्होंने क्रोध का त्याग कर दिया और अपनी सारी शक्ति ज्ञान के सृजन में लगा दी।",
    "teaching": "Truth is not the monopoly of any single religious sect or prophet. Just as different physicians prescribe different medicines according to the patient's illness, so do enlightened masters teach different paths according to seekers' spiritual maturity. Cultivate non-dogmatic vision (Anekantavada) and boundless compassion.",
    "teachingLocal": "सत्य किसी एक संप्रदाय या पंथ की बपौती नहीं है। जैसे एक कुशल वैद्य रोगी की अवस्था देखकर अलग-अलग औषधियां देता है, वैसे ही ज्ञानी पुरुष साधकों की योग्यता अनुसार भिन्न-भिन्न मार्ग बताते हैं। हठधर्मिता और सांप्रदायिकता को छोड़कर सभी के प्रति उदार और समन्वयकारी दृष्टिकोण रखना ही सच्चा धर्म है।",
    "moral": "Intellectual brilliance without emotional humility is a curse. When grief or betrayal tempts you toward revenge, remember that forgiveness is the only fire that can purify tragedy into divine grace.",
    "moralLocal": "अहंकार से युक्त ज्ञान मनुष्य को अंधा बना देता है। यदि जीवन में कभी घोर आघात या धोखा मिले, तो प्रतिशोध की आग में जलने के स्थान पर क्षमा और प्रेम से अपनी ऊर्जा को लोक-कल्याण में लगा देना चाहिए।",
    "legacy": "Haribhadra Suri pioneered inter-religious harmony and comparative philosophy in ancient India. His *Shaddarshanasamuccaya* and *Yogadrishtisamuccaya* remain foundational classics studied across global academic universities for their enlightened pluralism and systematic rigor.",
    "legacyLocal": "आचार्य हरिभद्र ने भारतीय दर्शन में तुलनात्मक अध्ययन और धार्मिक सहिष्णुता की नींव रखी। उनके ग्रंथ आज भी विश्व भर के विश्वविद्यालयों में दार्शनिक उदारवाद और अनेकांतवाद के अप्रतिम उदाहरण के रूप में पढ़ाए जाते हैं।",
    "source": "Yogadrishtisamuccaya & Shaddarshanasamuccaya (Haribhadra Suri)",
    "sourceLocal": "योगदृष्टिसमुच्चय एवं षड्दर्शनसमुच्चय (हरिभद्र सूरि)",
    "sourceCitations": [
      {
        "sourceName": "Yogadrishtisamuccaya",
        "sourceRef": "Chapter 1, The Eight Drishtis and the Unity of Truth",
        "tier": 1
      },
      {
        "sourceName": "Prabhavaka Charitra",
        "sourceRef": "Life of Acharya Haribhadra Suri",
        "tier": 2
      }
    ],
    "illustrationPrompt": "Royal Brahmin scholar Haribhadra standing before the venerable Jain nun Sadhvi Yakini Mahattara in a temple courtyard, unfastening his golden belt in humble intellectual surrender.",
    "quote": {
      "text": "I possess no bias toward Mahavira, nor prejudice against Kapila or Buddha; whoever's words are grounded in truth and reason, his path alone I accept.",
      "attribution": "Lokatattvanirnaya, Verse 38"
    },
    "quoteLocal": {
      "text": "पक्षपातो न मे वीरे, न द्वेषः कपिलादिषु। युक्तिमद्वचनं यस्य, तस्य कार्यः परिग्रहः॥",
      "attribution": "लोकतत्वनिर्णय, श्लोक ३८"
    }
  },
  {
    "id": "yashovijaya",
    "name": "Upadhyaya Yashovijaya",
    "nameLocal": "उपाध्याय यशोविजय",
    "era": "1624–1688 CE",
    "eraLocal": "१६२४-१६८८ ईस्वी",
    "tradition": "jain",
    "region": "Kanoda (Gujarat) / Varanasi",
    "regionLocal": "कनोड़ा (गुजरात) / वाराणसी",
    "emoji": "⚖️",
    "tagline": "The seventeenth-century master of Navya-Nyaya logic who studied undercover in Varanasi, synthesized dry epistemology with Kundakunda's inner mysticism, and rejuvenated Jain intellectual thought.",
    "taglineLocal": "सत्रहवीं शताब्दी के नव्य-न्याय के प्रकांड विद्वान, जिन्होंने वाराणसी में तर्कशास्त्र का अध्ययन कर शुष्क न्याय को आत्मिक अध्यात्म के साथ समन्वित किया।",
    "journey": "Regarded with veneration as the \"Laghu Hemachandra\" (The Younger Hemachandra), Upadhyaya Yashovijaya was the intellectual and spiritual colossus who dominated the seventeenth-century Indian philosophical renaissance. Born as Jasvant in the village of Kanoda in Gujarat, he exhibited luminous intellectual brilliance, extraordinary photographic memory, and profound spiritual receptivity from early childhood. Ordained into the Shvetambara monastic order by Acharya Nayavijaya, he was bestowed the monastic name Yashovijaya. At that time in Indian history, the traditional philosophical establishment was concentrated in the sacred city of Varanasi (Kashi), where Brahmin scholars of the Navya-Nyaya (New Logic) school had developed an extraordinarily rigorous, razor-sharp dialectical language that governed all serious theological, metaphysical, and legal discourse across the subcontinent.\n\nBecause orthodox pandits in Varanasi strictly barred non-Brahmin and Shramana ascetics from entering their esoteric academies, the Jain Sangha in Gujarat sent the young Yashovijaya and his companion to Varanasi disguised as traditional Brahmin students. For twelve unbroken years, living under rigorous ascetic discipline in secret, Yashovijaya studied under the most celebrated Nyaya masters of Kashi, mastering the dense dialectical treatises of Gangesha Upadhyaya, Raghunatha Shiromani, and Mathuranatha Tarkavagisha. His mastery of symbolic formal logic, epistemology, and polemical debate was so astonishing that the supreme council of Kashi pandits conferred upon him the highest academic titles of the realm: \"Nyaya-Visharada\" and \"Nyayacharya.\" When his true identity as a Jain monk was eventually discovered, the pandits were awed by his immaculate scholarship, intellectual honesty, and ethical purity, unanimously confirming his degrees with deep reverence and admiration.\n\nReturning to Gujarat, Yashovijaya did not use his formidable dialectical armory merely to win dry academic debates against rivals. Instead, he achieved a magnificent and unprecedented spiritual synthesis. He observed that dry intellectual dialectics without inner realization produces cynical pedants, while emotional devotion without logical discernment produces blind superstition and sectarian narrowness. Yashovijaya boldly unified the razor-sharp analytical precision of Navya-Nyaya with the luminous non-dual spiritual metaphysics of Acharya Kundakunda, Haribhadra Suri, and Anandghan. In monumental masterpieces including the Jnanasara, Adhyatmasara, Adhyatmapanishad, and his deep commentaries on Patanjali and the Yoga Shastra, he demonstrated that rigorous intellectual inquiry must never be an end in itself, but a diamond ladder that climbs toward silent meditative absorption in the pure, radiant soul.",
    "journeyLocal": "सत्रहवीं शताब्दी में गुजरात के कनोड़ा ग्राम में जन्मे जसवंत (यशोविजय) को उनकी असाधारण प्रतिभा के कारण 'लघु हेमचंद्र' कहा जाता है। अल्पायु में ही मुनि दीक्षा लेने के पश्चात वे ज्ञान की खोज में निकले। उस समय संपूर्ण भारत में काशी (वाराणसी) नव्य-न्याय और तर्कशास्त्र का सर्वोच्च केंद्र था, परंतु वहाँ के रूढ़िवादी पंडित केवल ब्राह्मण छात्रों को ही यह गूढ़ विद्या सिखाते थे। जैन संघ ने युवा यशोविजय को अध्ययन हेतु एक ब्राह्मण छात्र के वेश में काशी भेजा।\n\nयशोविजय ने बारह वर्षों तक काशी के महानतम आचार्यों से गदाधर भट्टाचार्य और रघुनाथ शिरोमणि के नव्य-न्याय का गहन अध्ययन किया। उनकी तार्किक मेधा इतनी प्रखर थी कि काशी की विद्वत-सभा ने उन्हें 'न्यायविशारद' और 'न्यायाचार्य' की सर्वोच्च उपाधियों से सम्मानित किया। जब बाद में यह रहस्य खुला कि वे एक जैन यति हैं, तो पंडितों ने उनके निष्कलंक ज्ञान और सत्यनिष्ठा को देखकर उनकी उपाधियों का सहर्ष अनुमोदन किया।\n\nकाशी से लौटकर यशोविजय जी ने केवल शास्त्रार्थ नहीं किया, अपितु भारतीय दर्शन में एक अद्वितीय समन्वय स्थापित किया। उन्होंने देखा कि कोरा तर्क मनुष्य को अहंकारी बना देता है, और बिना विवेक की भक्ति अंधविश्वास बन जाती है। उन्होंने नव्य-न्याय के तीक्ष्ण तर्क को आचार्य कुन्दकुन्द के आत्म-अध्यात्म और हरिभद्र सूरि की योग-दृष्टि के साथ जोड़ दिया। उन्होंने 'ज्ञानसार', 'अध्यात्मसार', 'अध्यात्मोपनिषद्' और 'न्यायामृत' जैसे सैकड़ों अमर ग्रंथों की रचना कर यह सिद्ध किया कि समस्त तर्कों का अंतिम लक्ष्य आत्मा का अपने शुद्ध, वीतराग स्वरूप में स्थिर हो जाना है।",
    "trial": "Yashovijaya endured twelve continuous years of scholastic isolation under a disguised identity in Varanasi, living under the constant threat of public exposure while maintaining strict monastic chastity and dietary purity in secret. After returning to Gujarat, he faced fierce suspicion from dogmatic traditionalists who accused him of corrupting pristine Jain doctrine with Hindu logic. With unshakeable composure, he proved through pristine Agamic citations that truth is fearless, and that rigorous logic is the finest servant of pure spiritual realization.",
    "trialLocal": "काशी में बारह वर्षों तक गुप्त रूप से रहते हुए अपनी मुनि-चर्या की पवित्रता को बनाए रखना यशोविजय की कठिन परीक्षा थी। इसके पश्चात जब उन्होंने जैन दर्शन को नव्य-न्याय की कसौटी पर कसा, तो रूढ़िवादी विद्वानों ने उनका विरोध किया। परंतु उन्होंने निर्भीकता से सिद्ध किया कि सत्य कभी तर्क से नहीं डरता, बल्कि तर्क की कसौटी पर कसने से वह और अधिक कुंदन बन जाता है।",
    "teaching": "Intellectual logic is merely a broom to sweep away the cobwebs of delusion; it can never replace the experiential nectar of direct self-realization (Atma-Jnana). When the mind is thoroughly purged of ego, sectarian malice, and possessiveness, analytical reasoning naturally quiets down and matures into profound meditation, revealing the unconditioned, blissful soul.",
    "teachingLocal": "तर्क केवल अज्ञान के जाले साफ करने का साधन है, वह आत्म-अनुभूति का विकल्प नहीं हो सकता। जब मन राग और अहंकार से मुक्त होता है, तभी बुद्धि शांत होकर ध्यान में बदलती है और आत्मा के आनंद का साक्षात्कार होता है।",
    "moral": "Never fear rigorous inquiry or genuine debate. Authentic faith does not shrink from honest questioning or seek shelter in blind dogmatism; rather, true spirituality is an unshakeable conviction tested by reason, anchored in compassionate ethics, and verified in the stillness of meditation.",
    "moralLocal": "सच्चा धर्म कभी तार्किक प्रश्नों से नहीं भागता। विवेक, तर्क और आचरण की कसौटी पर जो खरा उतरे, वही सच्चा ज्ञान है; अंधविश्वास के स्थान पर विवेकपूर्ण श्रद्धा ही कल्याण का मार्ग है।",
    "legacy": "Upadhyaya Yashovijaya was the last great universal polymath of classical Jain philosophy. Authoring over one hundred works in Sanskrit, Prakrit, and Gujarati, his writings rescued Jain thought from medieval intellectual stagnation, modernized its epistemological framework, and provided the philosophical bridge that enabled twentieth-century scholars to appreciate the profound analytical depth of Anekantavada.",
    "legacyLocal": "उपाध्याय यशोविजय जैन दर्शन के अंतिम महान युगप्रवर्तक माने जाते हैं। उन्होंने मध्यकालीन जड़ता को तोड़कर जैन दर्शन को आधुनिक तार्किक स्वरूप दिया, जिसके कारण आज भी उनका साहित्य दार्शनिक अध्ययन की आधारशिला बना हुआ है।",
    "source": "Jnanasara & Adhyatmasara (Upadhyaya Yashovijaya)",
    "sourceLocal": "ज्ञानसार एवं अध्यात्मसार (उपाध्याय यशोविजय)",
    "sourceCitations": [
      {
        "sourceName": "Jnanasara",
        "sourceRef": "Ashtaka 1, The Nature of Pure Spiritual Knowledge",
        "tier": 1
      },
      {
        "sourceName": "Adhyatmasara",
        "sourceRef": "Adhyatma Lakshana, Verses 1–10",
        "tier": 1
      }
    ],
    "illustrationPrompt": "17th-century scholar-monk Upadhyaya Yashovijaya sitting cross-legged in a Varanasi library debating with learned Brahmin pandits on the banks of the sacred Ganga, radiating calm intellectual mastery.",
    "quote": {
      "text": "Logic without spiritual contemplation is dry dust; contemplation without logic is blind delusion. Merge the two, and the luminous soul shines forth.",
      "attribution": "Adhyatmasara, 1.4"
    },
    "quoteLocal": {
      "text": "अध्यात्म के बिना कोरा तर्क शुष्क धूल है, और तर्क के बिना अध्यात्म अंधा भ्रम है। जब दोनों का संगम होता है, तभी आत्मा का दिव्य आलोक प्रकट होता है।",
      "attribution": "अध्यात्मसार, १.४"
    }
  },
  {
    "id": "kumarpal",
    "name": "King Kumarpal",
    "nameLocal": "राजा कुमारपाल (परमअर्हत)",
    "era": "1143–1172 CE",
    "eraLocal": "११४३-११७२ ईस्वी",
    "tradition": "jain",
    "region": "Anhilwad Patan (Gujarat)",
    "regionLocal": "अणहिलवाड़ पाटण (गुजरात)",
    "emoji": "👑",
    "tagline": "The Chaulukya emperor who rose from fugitive obscurity to the golden throne of Patan, transforming western India into an empire of non-violence under Acharya Hemachandra.",
    "taglineLocal": "सोलंकी वंश के चक्रवर्ती सम्राट, जिन्होंने संकटों से उबरकर सिंहासन प्राप्त किया और आचार्य हेमचंद्र के मार्गदर्शन में संपूर्ण पश्चिमी भारत में अहिंसा का साम्राज्य स्थापित किया।",
    "journey": "King Kumarpal of the Chaulukya (Solanki) dynasty remains celebrated in Indian history as the 'Paramarahata'—the supreme royal patron of non-violence. Born of modest lineage within the royal clan, the suspicious emperor Siddharaja Jayasimha viewed young Kumarpal as an existential threat to his direct succession and sought to assassinate him. For thirty years, Kumarpal lived the perilous life of a hunted fugitive, disguised as a wandering mendicant, fleeing across Gujarat, Malwa, and Rajasthan. During these harrowing years of destitution, he was sheltered by compassionate ordinary citizens—including an impoverished potter named Alinga, a farmer named Bosari, and a merchant named Udayana—experiences that forged in him deep empathy for the suffering of the common people.\n\nFollowing Siddharaja's demise without a male heir in 1143 CE, the royal council and ministers crowned the seasoned, resilient Kumarpal as the emperor of Anhilwad Patan at the mature age of fifty. Once securely on the throne, Kumarpal rewarded every humble friend who had sheltered him during his years in exile, elevating Alinga the potter to a high royal grant. Soon after his coronation, Kumarpal met the intellectual giant Acharya Hemachandra, forging one of the most transformative teacher-king relationships in world history. Inspired by Hemachandra’s profound spiritual discourses, Kumarpal formally embraced Jainism, taking the twelve sacred vows of a householder (Shravaka) and dedicating his imperial might to the service of righteousness.\n\nKumarpal enacted the historic *A-mari Pravartan* (Royal Edict of Non-Slaughter) across his vast empire extending over Gujarat, Saurashtra, Kutch, Malwa, and southern Rajasthan. Under imperial law, the slaughter of any animal, bird, or fish was strictly outlawed; hunting, animal combat, animal sacrifices in religious temples, and the sale of meat and liquor were completely prohibited. To ensure butchers and hunters were not driven into starvation, Kumarpal provided them three years of state grain and alternative ethical livelihoods from the imperial treasury. Most noble of all, Kumarpal abolished the predatory ancient law of *Rudanti-Dhana* (Tears Money), under which the state confiscated all property of men who died without sons, leaving grieving widows and daughters destitute. Kumarpal renounced millions in tax revenue, declaring: 'The tears of a widow shall never fill the royal treasury.' He constructed over fourteen hundred magnificent marble and stone temples, including the grand Taranga Hill temple and the restoration of Somnath, ushering in the golden age of Gujarat.",
    "journeyLocal": "गुजरात के सोलंकी (चौलुक्य) राजवंश के सम्राट कुमारपाल को इतिहास में 'परमअर्हत' की उपाधि से स्मरण किया जाता है। उनका प्रारंभिक जीवन अत्यंत संघर्षमय रहा। तत्कालीन राजा सिद्धराज जयसिंह उन्हें अपना प्रतिद्वंद्वी मानकर उनकी हत्या करवाना चाहता था। कुमारपाल लगभग तीस वर्षों तक एक संन्यासी और सामान्य नागरिक के वेश में दर-दर भटकते रहे। इस कठिन समय में एक निर्धन कुम्हार आलिंग, एक किसान बोसरि और एक व्यापारी उदयन ने अपनी जान जोखिम में डालकर उनकी रक्षा की। इस निर्धनता और संकट ने कुमारपाल के हृदय में जनसाधारण के प्रति गहरी करुणा भर दी।\n\n११४३ ईस्वी में सिद्धराज के निधन के पश्चात, पचास वर्ष की आयु में कुमारपाल अणहिलवाड़ पाटण के सिंहासन पर आरूढ़ हुए। राजा बनते ही उन्होंने संकट के दिनों में सहायता करने वाले सभी निर्धन मित्रों को राज-सम्मान और संपत्तियां देकर कृतज्ञता का आदर्श प्रस्तुत किया। इसके पश्चात उनका संपर्क कलिकाल-सर्वज्ञ आचार्य हेमचंद्र से हुआ। हेमचंद्र के पावन उपदेशों से प्रभावित होकर कुमारपाल ने जैन धर्म अंगीकार किया और आजीवन अहिंसा, सत्य और अपरिग्रह के व्रतों का पालन करने का संकल्प लिया।\n\nकुमारपाल ने अपने संपूर्ण साम्राज्य—गुजरात, मालवा, राजस्थान और कच्छ—में 'अमारि घोषणा' (जीव-हिंसा पर पूर्ण प्रतिबंध) लागू की। राज्य भर में पशु-पक्षी हत्या, शिकार, मदिरापान, जुआ और पशु-बलि को दंडनीय अपराध घोषित किया गया। जो कसाई और शिकारी बेरोजगार हुए, उन्हें राज्य के कोष से तीन वर्ष तक अन्न और नए व्यापार हेतु धन दिया गया। उन्होंने उस क्रूर कानून 'रुदंति-धन' को समाप्त कर दिया जिसके तहत निःसंतान मृतक की संपत्ति राजकोष में जब्त कर ली जाती थी और विधवाएं बेसहारा हो जाती थीं। कुमारपाल ने कहा—'विधवा के आंसुओं से अर्जित धन से राजकोष कभी पवित्र नहीं हो सकता।' उन्होंने तारंगा पहाड़ी पर विशाल जैन मंदिर और सोमनाथ ज्योतिर्लिंग का जीर्णोद्धार कराकर गुजरात के सांस्कृतिक गौरव को अमर कर दिया।",
    "trial": "Kumarpal endured thirty years of constant mortal terror as a hunted fugitive, sleeping in ravines, potter's kilns, and dense jungles. As an emperor, he faced immense resistance from revenue collectors and orthodox nobles who argued that banning animal slaughter, liquor, and the confiscation of widows' property would bankrupt the royal treasury, but he chose righteousness over gold.",
    "trialLocal": "कुमारपाल की सबसे बड़ी परीक्षा तीस वर्षों तक प्राण बचाते हुए जंगलों और भट्ठियों में छिपकर भटकना था। राजा बनने के बाद जब उन्होंने जीव-हिंसा और विधवाओं की संपत्ति जब्त करने पर रोक लगाई, तो मंत्रियों ने चेतावनी दी कि इससे राज्य को भारी राजस्व का नुकसान होगा। परंतु कुमारपाल ने धन के स्थान पर धर्म और मानवीय करुणा को चुनकर अद्वितीय नैतिक साहस दिखाया।",
    "teaching": "A ruler's greatest conquest is the conquest of his own passions, and his highest duty is the protection of the defenseless. True governance is not measured by the size of the treasury or the reach of the sword, but by the absence of fear among all living beings under the sovereign's watch.",
    "teachingLocal": "राजा की सबसे बड़ी विजय अपनी इंद्रियों पर विजय है, और उसका सर्वोच्च कर्तव्य निर्बलों की रक्षा करना है। शासन की सफलता इस बात से नहीं मापी जाती कि खजाने में कितना स्वर्ण है, बल्कि इससे मापी जाती है कि राज्य का निर्बल से निर्बल जीव भी भयमुक्त होकर जीवन जी सके।",
    "moral": "Power and authority are sacred trusts meant to relieve suffering, not tools for personal aggrandizement. When leaders align governance with compassion and justice, society enters an enduring golden age.",
    "moralLocal": "सच्चा शासक वही है जो अपने पद और शक्ति का उपयोग दुर्बलों के आंसू पोंछने और समाज में न्याय स्थापित करने के लिए करे। धन और सत्ता तभी सार्थक हैं जब वे धर्म और करुणा के अधीन हों।",
    "legacy": "King Kumarpal is celebrated alongside Ashoka as one of the very few imperial monarchs in world history who successfully organized an entire empire upon the foundation of non-violence. The architectural monuments he sponsored, especially the grand Ajitnath temple at Taranga Hill, remain standing as timeless wonders of Indian art.",
    "legacyLocal": "सम्राट कुमारपाल को विश्व इतिहास में सम्राट अशोक के समकक्ष ऐसा दुर्लभ राजा माना जाता है जिसने संपूर्ण साम्राज्य में अहिंसा का राज्य स्थापित किया। उनके द्वारा निर्मित तारंगा हिल का भव्य अजितनाथ मंदिर और पालिताना के जिनालय आज भी उनकी धर्मनिष्ठा की गवाही देते हैं।",
    "source": "Kumarpala-Pratibodha (Somaprabha) & Moharajaparajaya (Yashahpala)",
    "sourceLocal": "कुमारपाल-प्रतिबोध (सोमप्रभ) एवं मोहराजपराजय (यशःपाल)",
    "sourceCitations": [
      {
        "sourceName": "Kumarpala-Pratibodha",
        "sourceRef": "Pratibodha 1, The Amari Edicts and Royal Vows of Kumarpal",
        "tier": 1
      },
      {
        "sourceName": "Prabhavaka Charitra",
        "sourceRef": "Life of Acharya Hemachandra and King Kumarpal",
        "tier": 2
      }
    ],
    "illustrationPrompt": "Emperor Kumarpal in royal golden robes and crown kneeling humbly before Acharya Hemachandra inside the marble palace hall of Patan, presenting an imperial copper-plate decree of Ahimsa.",
    "quote": {
      "text": "Let not a single living creature be harmed across my realm; for the tears of the helpless bring destruction upon the crown, while compassion upholds the world.",
      "attribution": "Kumarpala Amari Inscription"
    },
    "quoteLocal": {
      "text": "मेरे संपूर्ण राज्य में किसी भी प्राणी की हत्या न हो; क्योंकि असहायों के आंसू साम्राज्य को नष्ट कर देते हैं, जबकि करुणा ही संपूर्ण जगत को धारण करती है।",
      "attribution": "कुमारपाल अमारि शिलालेख"
    }
  },
  {
    "id": "emperor-ashoka",
    "name": "Emperor Ashoka the Great",
    "nameLocal": "चक्रवर्ती सम्राट अशोक",
    "era": "c. 304–232 BCE",
    "eraLocal": "लगभग ३०४-२३२ ईसा पूर्व",
    "tradition": "buddhist",
    "region": "Pataliputra / Magadha",
    "regionLocal": "पाटलिपुत्र / मगध",
    "emoji": "☸️",
    "tagline": "The Mauryan emperor whose heart shattered at the bloody fields of Kalinga, renouncing imperial conquest by sword to inaugurate a golden era of Dhamma-vijaya across Asia.",
    "taglineLocal": "मौर्य सम्राट जिनका हृदय कलिंग के रक्तपात को देखकर कांप उठा, जिन्होंने युद्ध-विजय का त्याग कर संपूर्ण एशिया में धम्म-विजय का शंखनाद किया।",
    "journey": "Ashoka Maurya was the grandson of Chandragupta Maurya and the son of Emperor Bindusara, ascending the imperial throne of Pataliputra around 268 BCE after serving as a stern, formidable viceroy in the western frontier provinces of Ujjain and Taxila. In the eighth year of his coronation, seeking to complete the political unification of the Indian subcontinent and secure vital maritime trade routes to Southeast Asia, Ashoka launched a colossal military campaign against the sovereign, unyielding republic of Kalinga (modern Odisha). The war was fought with unprecedented ferocity. Over one hundred thousand soldiers and citizens were slaughtered on the battlefield, one hundred and fifty thousand were driven into captivity and bound in chains, and countless hundreds of thousands died in the agonizing aftermath of famine, epidemic, and displacement.\n\nWalking alone across the smoking wasteland along the Daya River, where the waters ran thick and crimson with human blood, Ashoka was confronted by the horrific reality of imperial ambition. Severed limbs, bloated corpses of young soldiers, starving orphans crying beside dead mothers, and grieving widows wandering through the ashes shattered the emperor’s conscience to its very foundations. Standing amidst the carnage, the mighty conqueror was seized by an earthquake of moral revulsion. He asked himself: \"What have I done? If this is victory, what then is defeat? Can the glory of a golden throne be bought with the slaughter of innocents?\"\n\nAt that supreme crossroads of historical destiny, Ashoka renounced the sword forever. Guided by the serene Buddhist monk Upagupta (and the young novice Samanera Nigrodha), Ashoka took refuge in the Triple Gem—the Buddha, the Dhamma, and the Sangha. He declared that henceforth the sound of the war drum (Bheri-ghosa) was permanently replaced by the reverberating trumpet of righteousness (Dhamma-ghosa), resolving that the only conquest worthy of a civilized sovereign is Dhamma-vijaya—conquest through compassion, truth, and moral example.\n\nAshoka transformed the entire apparatus of the state from an instrument of imperial conquest into a commonwealth of welfare and ethical upliftment. Across India, Pakistan, Afghanistan, Nepal, and Bangladesh, he had the Major and Minor Rock Edicts and Pillar Inscriptions carved in local Prakrit, Greek, and Aramaic scripts. He established state-funded medical hospitals for both humans and animals, ordered the planting of shade-giving banyan trees and herbal gardens, dug public wells every half-league along commercial highways, and appointed specialized welfare officers (Dhamma-mahamattas) to protect prisoners, widows, and vulnerable forest tribes. He convened the historic Third Buddhist Council at Pataliputra to resolve monastic corruption, sponsored the compilation of the Pali Tipitaka, and dispatched Buddhist peace missions across the known world—sending his own children, Prince Mahendra and Princess Sanghamitra, to Sri Lanka, and ambassadors to Hellenistic monarchs in Syria, Egypt, and Macedonia, permanently transforming Buddhism into an international civilization of non-violence.",
    "journeyLocal": "मौर्य सम्राट अशोक पाटलिपुत्र के सिंहासन पर आसीन हुए। अपने शासन के आठवें वर्ष में उन्होंने कलिंग (ओडिशा) पर भीषण आक्रमण किया। इस युद्ध में एक लाख से अधिक सैनिक और नागरिक मारे गए, डेढ़ लाख बंदी बनाए गए और लाखों लोग अकाल व महामारी से नष्ट हो गए।\n\nयुद्धोपरांत जब अशोक दया नदी के किनारे रक्त से पटी युद्धभूमि में घूमे, तो कटे हुए अंगों, अनाथ बच्चों और विलाप करती स्त्रियों को देखकर उनका हृदय पश्चाताप से कांप उठा। उन्होंने विचार किया—'यह कैसी विजय है जो केवल विनाश लाती है?' उसी क्षण उन्होंने सदा के लिए युद्ध का त्याग कर दिया। बौद्ध भिक्षु उपगुप्त के सान्निध्य में उन्होंने तथागत बुद्ध के धम्म की शरण ली और घोषणा की कि अब 'भेरीघोष' (युद्ध का नगाड़ा) नहीं, बल्कि 'धम्मघोष' (सदाचार का शंखनाद) ही गूंजेगा।\n\nअशोक ने अपने विशाल साम्राज्य में शिलाओं और स्तंभों पर धम्म के आदेश खुदवाए। उन्होंने मानव और पशु दोनों के लिए चिकित्सालय बनवाए, मार्गों पर छायादार वृक्ष लगवाए और कुएं खुदवाए। उन्होंने अपने पुत्र महेंद्र और पुत्री संघमित्रा को धम्म के प्रचार हेतु श्रीलंका भेजा, जिससे बौद्ध धर्म एक विश्वव्यापी संस्कृति बना।",
    "trial": "Ashoka's supreme trial was facing the crushing burden of his own horrific past in Kalinga and resisting the imperial impulse to retaliate with violence when frontier tribes revolted. He transformed an empire accustomed to terror into an administration anchored in compassion, enduring personal grief and political resistance to uphold Dhamma.",
    "trialLocal": "अशोक की सबसे बड़ी परीक्षा कलिंग के नरसंहार के दारुण अपराध-बोध का सामना करना और फिर एक साम्राज्य को सैन्य शक्ति के स्थान पर अहिंसा से चलाना था। विरोधियों और सीमावर्ती जातियों के विद्रोह के बावजूद उन्होंने अपनी प्रतिज्ञा को कभी नहीं तोड़ा।",
    "teaching": "True victory is not the conquest of lands through the slaughter of innocents, but the conquest of hearts through kindness, truth, and self-restraint. Regard all citizens as your own children, protect all living creatures, and respect all philosophical paths with broad-minded reverence.",
    "teachingLocal": "सच्ची विजय भूमि को तलवार से जीतना नहीं, अपितु करुणा और धर्म से हृदयों को जीतना है। सभी प्रजाजनों को अपनी संतान के समान मानना, समस्त जीवों पर दया करना और सभी संप्रदायों का सम्मान करना ही सच्चा धम्म है।",
    "moral": "No past mistake or violence is beyond redemption if one experiences genuine remorse and redirects power toward universal service and love.",
    "moralLocal": "यदि मनुष्य में सच्चा पश्चाताप और हृदय-परिवर्तन हो, तो वह अपने क्रूर अतीत को मिटाकर विश्व के लिए करुणा और शांति का प्रकाश स्तंभ बन सकता है।",
    "legacy": "Ashoka's Lion Capital of Sarnath and the Ashoka Chakra stand today as the official national emblem and central wheel of India's national flag. His spread of Buddhism across Asia altered the spiritual history of humanity.",
    "legacyLocal": "सारनाथ का सिंह-शीर्ष और अशोक चक्र आज स्वतंत्र भारत का राष्ट्रीय प्रतीक और राष्ट्रध्वज का केंद्र है। उनके द्वारा प्रसारित धम्म ने संपूर्ण एशिया में शांति और करुणा की शाश्वत संस्कृति स्थापित की।",
    "source": "Major Rock Edicts of Ashoka & Mahavamsa (Pali Chronicle)",
    "sourceLocal": "अशोक के प्रमुख शिलालेख एवं महावंस (पालि इतिहास)",
    "sourceCitations": [
      {
        "sourceName": "Rock Edict XIII (Kalinga Inscription)",
        "sourceRef": "Inscriptions of Asoka, Shahbazgarhi/Girnar text",
        "tier": 1
      },
      {
        "sourceName": "Mahavamsa",
        "sourceRef": "Chapter 5, The Third Buddhist Council",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Emperor Ashoka in simple Buddhist robes kneeling in deep remorse on the rocky banks of the Daya River, laying his royal sword upon a stone before a serene Buddhist monk at dawn.",
    "quote": {
      "text": "All men are my children. Just as I desire for my own children their welfare and happiness in this world and the next, so do I desire for all humanity.",
      "attribution": "Major Rock Edict (Dhauli / Jaugada)"
    },
    "quoteLocal": {
      "text": "समस्त मनुष्य मेरी संतान हैं। जिस प्रकार मैं अपनी संतानों के लिए इस लोक और परलोक में कल्याण की कामना करता हूँ, वैसी ही कामना मैं संपूर्ण मानव जाति के लिए करता हूँ।",
      "attribution": "धौली / जौगढ़ शिलालेख"
    }
  },
  {
    "id": "ananda",
    "name": "Venerable Ananda",
    "nameLocal": "आयुष्मान आनंद",
    "era": "c. 6th–5th Century BCE",
    "eraLocal": "लगभग छठी-पांचवीं शताब्दी ईसा पूर्व",
    "tradition": "buddhist",
    "region": "Kapilavastu / Rajagriha",
    "regionLocal": "कपिलवस्तु / राजगृह",
    "emoji": "🪷",
    "tagline": "The Buddha's beloved cousin, devoted personal attendant, and the 'Guardian of the Dhamma' whose photographic memory preserved the Sutta Pitaka at the First Buddhist Council.",
    "taglineLocal": "तथागत बुद्ध के प्रिय अनुज, निष्ठावान सेवक और 'धम्म के रक्षक', जिनकी अद्भुत स्मृति ने प्रथम बौद्ध संगीति में सुत्तपिटक को अमर कर दिया।",
    "journey": "Ananda was born as a Shakyan prince of Kapilavastu, a cousin of Siddhartha Gautama. Joining the Sangha in the early years of the Buddha's ministry alongside other Shakya nobles, Ananda was distinguished by his gentle nature, deep empathy, emotional sensitivity, and breathtaking intellectual retention. In the twentieth year of his Buddhahood, finding that various temporary attendants were failing to manage the heavy demands of his expanding public ministry, the Buddha requested the Sangha to designate a permanent attendant. While senior disciples like Sariputta and Moggallana offered themselves, the Buddha remained silent. Finally, the assembly turned to Ananda, who agreed to serve on eight strict conditions designed to eliminate any suspicion of worldly privilege—including that he would never accept fine robes, special food, or private quarters meant for the Buddha, but insisted on the right to bring spiritual seekers with pressing questions into the Master's presence at any hour.\n\nFor twenty-five uninterrupted years, Ananda walked as the shadow of the Buddha. He washed the Master's robes, swept his dwelling, brought his water, arranged his audiences, protected his resting hours, and listened with profound attention to every single discourse delivered in villages, forests, and royal halls. Possessing a flawless photographic memory, Ananda retained every word, metaphor, parable, and dialogue spoken by the Buddha. When Mahapajapati Gotami, the Buddha's foster mother, walked barefoot with hundreds of women from Kapilavastu to Vaishali pleading for the ordination of women, and the Buddha hesitated, it was Ananda who stepped forward with compassionate advocacy. He asked the Master directly: 'Lord, are women capable of realizing the fruits of stream-entry, once-returning, non-returning, and Arahantship?' When the Buddha answered affirmatively, Ananda pleaded: 'Then, Lord, let women be admitted into the homeless life!' His courage established the Bhikkhuni Sangha.\n\nAt Kushinagar, as the Buddha lay dying between the twin Sal trees, Ananda broke down in bitter tears, leaning against a doorpost and weeping: 'I am still a mere learner with passions unextinguished, and my Master is about to pass into Parinirvana!' The Buddha called him to his bedside and comforted him: 'Enough, Ananda, do not grieve. For twenty-five years you have served me with loving-kindness in deed, speech, and thought, beyond measure. Strive on with diligence, and you too will soon be free.' Three months later, on the eve of the First Buddhist Council at Rajagriha, Ananda practiced unbroken mindfulness through the night. Just as he leaned back toward his pillow to rest his exhausted body, at the precise threshold between standing and lying down, his mind was liberated from all clinging, attaining full Arahantship. The next morning, he entered the Sattapanni Cave, ascended the Dhamma seat, and recited the Sutta Pitaka from memory, opening each discourse with the immortal phrase: 'Evam me sutam'—Thus have I heard.",
    "journeyLocal": "शाक्य राजकुमार आनंद तथागत बुद्ध के चचेरे भाई थे। संघ में प्रविष्ट होने के पश्चात अपने सौम्य स्वभाव और अद्भुत धारणा-शक्ति के कारण वे सबके प्रिय बने। तथागत के संबोधि के बीसवें वर्ष में आनंद को बुद्ध का प्रधान सेवक नियुक्त किया गया। उन्होंने सेवक बनने से पूर्व आठ शर्तें रखीं ताकि कोई यह न समझे कि वे किसी लाभ के लिए सेवक बने हैं—उन्होंने बुद्ध के बचे हुए वस्त्र या विशेष भोजन लेने से इनकार किया, परंतु यह अधिकार मांगा कि वे किसी भी समय किसी दुखी साधक को बुद्ध के समक्ष ला सकें।\n\nपच्चीस वर्षों तक आनंद तथागत की छाया बनकर रहे। उन्होंने बुद्ध के प्रत्येक उपदेश को अक्षरशः अपनी स्मृति में अंकित कर लिया। जब बुद्ध की मौसी महाप्रजापती गौतमी महिलाओं के संघ में प्रवेश की प्रार्थना लेकर आईं, तो आनंद ने ही करुणापूर्वक बुद्ध से निवेदन किया कि क्या नारी निर्वाण प्राप्त करने में सक्षम नहीं है? जब बुद्ध ने कहा कि वह पूर्ण सक्षम है, तो आनंद के प्रयास से ही भिक्षुणी संघ की स्थापना संभव हुई।\n\nकुशीनगर में तथागत के महापरिनिर्वाण के समय आनंद फूट-फूट कर रोने लगे। बुद्ध ने उन्हें पास बुलाकर सांत्वना दी—'आनंद, शोक मत करो। तुमने पच्चीस वर्षों तक काया, वाणी और मन से मेरी निष्काम सेवा की है। तुम भी शीघ्र मुक्त हो जाओगे।' बुद्ध के महाप्रयाण के तीन माह बाद राजगृह की प्रथम बौद्ध संगीति से ठीक पहले की रात, आनंद ने गहन ध्यान किया और करवट बदलते ही उन्हें अरहंत पद (पूर्ण ज्ञान) प्राप्त हुआ। अगली सुबह उन्होंने संगीति में बैठकर अपनी स्मृति से संपूर्ण सुत्तपिटक का वाचन किया, जिसका प्रत्येक सूत्र 'एवं मे सुतं' (ऐसा मैंने सुना) से प्रारंभ होता है।",
    "trial": "Ananda's defining trial was enduring the grief of the Buddha's Parinirvana while still un-enlightened, and facing exclusion from the First Council if he did not eradicate his subtle emotional attachments. He achieved liberation in a single night of intense mindfulness at the edge of physical exhaustion.",
    "trialLocal": "आनंद की सबसे कठिन परीक्षा बुद्ध के वियोग के अगाध शोक को पार करना और प्रथम संगीति में प्रवेश पाने के लिए अपने अंतिम राग को समाप्त करना था। उन्होंने शारीरिक थकावट के चरम बिंदु पर भी होशपूर्वक ध्यान कर अरहंत पद प्राप्त किया।",
    "teaching": "Selfless loving service to others is a sacred vehicle of spiritual practice. The teachings of the Dhamma are not dry dogmas, but living treasures of compassion to be remembered, practiced, and passed on with absolute fidelity to future generations.",
    "teachingLocal": "दूसरों की निःस्वार्थ सेवा ही साधना का उच्चतम रूप है। तथागत की वाणी केवल सुनने के लिए नहीं, बल्कि जीवन में उतारने और सुरक्षित रखने के लिए है। करुणा और निष्ठा से ही सत्य का संरक्षण होता है।",
    "moral": "Emotional sensitivity and deep devotion are not obstacles to awakening; when purified of personal grasping, devotion blossoms into supreme wisdom and universal love.",
    "moralLocal": "हृदय की कोमलता और गुरु-भक्ति ज्ञान में बाधक नहीं, बल्कि साधक हैं। जब भक्ति से स्वार्थ मिट जाता है, तो वह तत्काल परम ज्ञान में रूपांतरित हो जाती है।",
    "legacy": "Because of Ananda's extraordinary memory and recitation, thousands of suttas in the Digha, Majjhima, Samyutta, and Anguttara Nikayas were preserved for world history, cementing his title as Dhamma-bhandagarika (Treasurer of the Dhamma).",
    "legacyLocal": "आनंद की स्मृति के कारण ही आज संपूर्ण सुत्तपिटक सुरक्षित है। उन्हें बौद्ध इतिहास में 'धम्म के कोषाध्यक्ष' के रूप में सदा श्रद्धा से स्मरण किया जाता है।",
    "source": "Digha Nikaya (Maha-Parinibbana Sutta) & Cullavagga (Vinaya Pitaka)",
    "sourceLocal": "दीघ निकाय (महापरिनिब्बान सुत्त) एवं चुल्लवग्ग (विनय पिटक)",
    "sourceCitations": [
      {
        "sourceName": "Digha Nikaya",
        "sourceRef": "DN 16, Maha-Parinibbana Sutta, Sections V–VI",
        "tier": 1
      },
      {
        "sourceName": "Vinaya Pitaka",
        "sourceRef": "Cullavagga XI, The First Buddhist Council at Rajagriha",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Venerable Ananda standing on the stone platform inside Sattapanni Cave at Rajagriha, surrounded by 500 serene Arahants, softly reciting 'Evam me sutam' with radiant golden eyes.",
    "quote": {
      "text": "Eighty-two thousand teachings from the Buddha I have received, and two thousand from the monks; eighty-four thousand teachings in total dwell within my heart.",
      "attribution": "Theragatha, Verse 1024"
    },
    "quoteLocal": {
      "text": "बयासी हजार उपदेश मैंने तथागत से साक्षात सुने और दो हजार भिक्षुओं से प्राप्त किए; इस प्रकार चौरासी हजार धम्म-स्कंध मेरे हृदय में प्रकाशित हैं।",
      "attribution": "थेरगाथा, गाथा १०२४"
    }
  },
  {
    "id": "sariputta",
    "name": "Venerable Sariputta",
    "nameLocal": "आयुष्मान सारिपुत्त",
    "era": "c. 6th–5th Century BCE",
    "eraLocal": "लगभग छठी-पांचवीं शताब्दी ईसा पूर्व",
    "tradition": "buddhist",
    "region": "Magadha / Nalanda",
    "regionLocal": "मगध / नालंदा",
    "emoji": "⚖️",
    "tagline": "The 'Marshal of the Dhamma' and foremost disciple of the Buddha in wisdom, whose analytical genius structured the psychological Abhidhamma philosophy.",
    "taglineLocal": "तथागत के अग्रश्रावक और 'धम्म-सेनापति', जिनकी अद्वितीय प्रज्ञा और विश्लेषणात्मक मेधा ने अभिधम्म दर्शन की मनोवैज्ञानिक नींव रखी।",
    "journey": "Born as Upatissa into an affluent, learned Brahmin family in the village of Nalaka near Rajagriha in Magadha, he was the childhood companion of Kolita (later Moggallana). Despite enjoying immense wealth, aristocratic privilege, and comprehensive mastery of Vedic literature, both youths realized the futility of mortal existence during an annual mountain festival (Giragga Samagga). Watching thousands of cheering citizens rejoicing before acrobats and musicians, a sudden realization struck Upatissa: in less than a single century, every single person in this roaring crowd—actors, spectators, and kings alike—will be a decaying corpse. Gripped by spiritual urgency (Samvega), they renounced their homes together, wandering across northern India under various renowned philosophers without finding inner peace or freedom from death.\n\nOne morning in the bustling streets of Rajagriha, Upatissa encountered the Buddhist monk Assaji walking with extraordinary serenity on his morning alms-round. Assaji’s gait was measured, his eyes cast down in mindfulness, and his countenance radiated unshakeable peace. Overcome by awe, Upatissa waited until Assaji finished his alms-round and inquired: \"Friend, your face is clear and radiant. Who is your teacher, and what doctrine does he proclaim?\" Assaji humbly replied that he was newly ordained, but recited the profound essence of dependent origination: \"Ye dhamma hetuppabhava, tesam hetum tathagato aha, tesan ca yo nirodho, evamvadi mahasamano\" (Of all phenomena arising from a cause, the Tathagata has revealed the cause, and also their cessation; this is the teaching of the Great Seer). Upon hearing merely the first two lines, the spiritual eye (Dhamma-cakkhu) opened within Upatissa’s mind, and he realized the first stage of enlightenment (Stream-Entry / Sotapatti).\n\nUpatissa rushed back to Kolita, repeated the sacred verse, and watched as Kolita also attained Stream-Entry in an instant. Together with two hundred and fifty disciples, they proceeded to the Veluvana bamboo grove to take ordination under the Buddha. Given the monastic name Sariputta (\"Son of Rupasari\"), he attained full Arahantship two weeks later inside the Sukarakhata cave on Vulture Peak, fanning the Buddha as the Master expounded the contemplation of feelings to the wanderer Dighanakha.\n\nThe Buddha declared Sariputta his foremost disciple in wisdom (Pannavatanam) and bestowed upon him the title of Dhamma-senapati (Marshal of the Dhamma). Just as a crown prince turns the wheel of imperial governance after the emperor, Sariputta turned the Wheel of the Dhamma after the Tathagata. Possessing peerless analytical genius, Sariputta dissected the human mind into its momentary constituent states of consciousness (Cittas) and mental factors (Cetasikas), laying the foundational architecture for the Abhidhamma Pitaka. Despite his exalted standing as second only to the Buddha, he was celebrated for his childlike humility, sweeping the monastery grounds himself, caring for sick novices, and bowing in gratitude every night toward the direction where his first preceptor Assaji resided.",
    "journeyLocal": "नालंदा के समीप ब्राह्मण कुल में जन्मे उपतिस्स (सारिपुत्त) बचपन से ही मेधावी थे। अपने अभिन्न मित्र कोलित (मोग्गलान) के साथ एक उत्सव को देखते हुए उन्हें संसार की नश्वरता का गहरा बोध हुआ कि आज जो लोग नाच-गा रहे हैं, सौ वर्ष बाद इनमें से कोई जीवित नहीं रहेगा। दोनों मित्रों ने अमृत (सत्य) की खोज में संन्यास ले लिया। एक दिन राजगृह में उपतिस्स ने तथागत के शिष्य अस्सजि को शांत भाव से भिक्षाटन करते देखा।\n\nउनके अलौकिक तेज से प्रभावित होकर उपतिस्स ने उनसे उनके गुरु का उपदेश पूछा। अस्सजि ने प्रतीत्यसमुत्पाद का प्रसिद्ध श्लोक सुनाया—'ये धम्मा हेतुप्पभवा, तेसं हेतुं तथागतो आह...' (जो भी वस्तु कारण से उत्पन्न होती है, तथागत ने उसके कारण और उसके निरोध का मार्ग बताया है)। इस श्लोक की आधी पंक्ति सुनते ही उपतिस्स को स्रोतापन्न (प्रथम संबोधि) फल प्राप्त हो गया। वे दौड़कर कोलित के पास गए और दोनों ने वेणुवन जाकर बुद्ध की शरण ली।\n\nसारिपुत्त को तथागत ने 'धम्म-सेनापति' की उपाधि दी। वे संघ में प्रज्ञा (बुद्धि) में सर्वश्रेष्ठ माने गए। उन्होंने मन और चेतना का ऐसा सूक्ष्म विश्लेषण प्रस्तुत किया जो आगे चलकर अभिधम्मपिटक का आधार बना। इतनी महान प्रज्ञा के स्वामी होकर भी वे परम विनम्र थे; वे स्वयं विहारों में झाड़ू लगाते थे और जिस दिशा में उनके प्रथम गुरु अस्सजि रहते थे, रात को उसी दिशा में सिर करके सोते थे।",
    "trial": "Sariputta endured severe physical exhaustion and terminal illness in his final months, traveling back to his ancestral home in Nalanda to teach his aging Brahmin mother, who had resented his Buddhist monasticism for decades. He patiently dissolved her doubts on his deathbed, leading her to awakening before peacefully attaining Parinirvana.",
    "trialLocal": "सारिपुत्त की अंतिम परीक्षा अपने जीवन के अंतिम क्षणों में गंभीर रुग्णता के बावजूद अपनी वृद्ध माता के पास जाना था, जो जीवन भर उनके संन्यास से असंतुष्ट थीं। उन्होंने मृत्यु-शय्या पर अपनी माता को सत्य का उपदेश देकर संबोधि तक पहुँचाया और फिर शांतिपूर्वक महापरिनिर्वाण प्राप्त किया।",
    "teaching": "All conditioned phenomena arise dependently on causes, and when those causes cease, the phenomena dissolve. Through mindful observation of impermanence, detachment arises naturally, leading the mind to the unconditioned peace of Nibbana.",
    "teachingLocal": "संसार की प्रत्येक घटना और विचार कारणों पर निर्भर हैं; कारणों के समाप्त होते ही दुख का भी अंत हो जाता है। अनित्यता का निरंतर सजग दर्शन ही राग और द्वेष से मुक्ति दिलाकर परम शांति की ओर ले जाता है।",
    "moral": "Supreme intellect reaches its divine potential only when united with profound humility, boundless patience, and filial gratitude.",
    "moralLocal": "प्रखर ज्ञान तभी सार्थक है जब वह अहंकार को मिटाकर नम्रता, सेवा और कृतज्ञता का रूप धारण करे।",
    "legacy": "Sariputta structured the analytical framework of the Abhidhamma and delivered foundational discourses in the Majjhima Nikaya, leaving an eternal blueprint for Buddhist psychology and meditation practice.",
    "legacyLocal": "सारिपुत्त ने बौद्ध मनोविज्ञान और अभिधम्म के दार्शनिक ढांचे का निर्माण किया। उनके द्वारा दिए गए उपदेश आज भी गहन ध्यान और चेतना के अध्ययन का आधार हैं।",
    "source": "Vinaya Pitaka (Mahavagga) & Majjhima Nikaya",
    "sourceLocal": "विनय पिटक (महावग्ग) एवं मज्झिम निकाय",
    "sourceCitations": [
      {
        "sourceName": "Vinaya Pitaka",
        "sourceRef": "Mahavagga, Khandhaka 1, The Conversion of Sariputta and Moggallana",
        "tier": 1
      },
      {
        "sourceName": "Majjhima Nikaya",
        "sourceRef": "MN 111, Anupada Sutta (One by One as They Occurred)",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Venerable Sariputta sitting on a stone beneath a lotus pond fanning the Buddha with a palm leaf, his face shining with intense, crystalline intellectual clarity and tranquility.",
    "quote": {
      "text": "Whatever is subject to origination is all subject to cessation.",
      "attribution": "Vinaya Pitaka, Mahavagga"
    },
    "quoteLocal": {
      "text": "जो कुछ भी उत्पन्न होने के स्वभाव वाला है, वह सब विलीन होने के स्वभाव वाला भी है।",
      "attribution": "विनय पिटक, महावग्ग"
    }
  },
  {
    "id": "moggallana",
    "name": "Maudgalyayana (Moggallana)",
    "nameLocal": "आयुष्मान महामोग्गलान",
    "era": "c. 6th–5th Century BCE",
    "eraLocal": "लगभग छठी-पांचवीं शताब्दी ईसा पूर्व",
    "tradition": "buddhist",
    "region": "Magadha / Rajagriha",
    "regionLocal": "मगध / राजगृह",
    "emoji": "⚡",
    "tagline": "The foremost disciple in psychic and meditative powers (Iddhi) whose deep loyalty to the Buddha ended in supreme voluntary martyrdom, honoring the law of karma.",
    "taglineLocal": "ऋद्धि और अलौकिक शक्तियों में तथागत के सर्वश्रेष्ठ शिष्य, जिन्होंने कर्म के सिद्धांत का आदर करते हुए स्वेच्छा से महाबलिदान स्वीकार किया।",
    "journey": "Known in his youth as Kolita, he was born into an affluent Brahmin family in the village of Kolita near Rajagriha, growing up as the inseparable companion of Sariputta. Bound by their solemn pact to find the Deathless, Kolita embraced the homeless life alongside Sariputta, seeking spiritual truth through diverse ascetic orders until Sariputta heard Assaji’s discourse on dependent origination. The moment Sariputta repeated the sacred verse to Kolita, Kolita’s spiritual eye opened, attaining Stream-Entry (Sotapatti) on the spot. Both friends traveled immediately to Rajagriha, ordaining into the Sangha under Bhagwan Buddha.\n\nKolita, now named Maha-Moggallana, retired to the forest village of Kallavalaputta in Magadha to practice intense meditation. Overcome by heavy sloth and torpor (Thina-Middha), he struggled to stay awake. The Buddha clairvoyantly perceived his struggle, manifested before him, and instructed him in eight distinct methods to conquer drowsiness—such as washing the face with cold water, looking at the starry sky, pacing mindfully, and contemplating the perception of light. Applying these teachings with fierce resolve, Moggallana eradicated all mental defilements and attained full Arahantship within seven days of ordination.\n\nThe Buddha appointed Moggallana as his Second Chief Disciple, declaring him foremost among all disciples in psychic powers (Iddhimantanam). Moggallana could traverse realms of existence, project mental mind-made bodies, read the thoughts of others, and visit the suffering spirits in the Preta and Hell realms. He used his powers not for magical vanity, but to instruct humans on the undeniable reality of karma—showing that every act of cruelty produces inevitable agony, while ethical virtue brings celestial peace. When the schismatic Devadatta attempted to fracture the Sangha by leading away five hundred young monks, it was Moggallana and Sariputta who flew to Gayasisa, engaged the monks with Dhamma and psychic demonstration, and reunited the entire Sangha without shedding a drop of blood.",
    "journeyLocal": "राजगृह के समीप ब्राह्मण कुल में जन्मे कोलित (मोग्गलान) सारिपुत्त के अभिन्न बालसखा थे। सत्य की खोज में दोनों ने साथ में गृहत्याग किया और जब सारिपुत्त ने उन्हें तथागत का प्रतीत्यसमुत्पाद सूत्र सुनाया, तो मोग्गलान को भी तत्काल स्रोतापन्न फल प्राप्त हो गया। दोनों मित्रों ने बुद्ध के चरणों में दीक्षा ग्रहण की।\n\nदीक्षा के बाद मगध के एक वन में साधना करते समय मोग्गलान को तीव्र निद्रा और आलस्य (थीन-मिद्ध) ने घेर लिया। बुद्ध ने दिव्य दृष्टि से यह देखकर उन्हें दर्शन दिए और आलस्य जीतने के उपाय सिखाए। बुद्ध के उपदेशों का पालन करते हुए मोग्गलान ने सात ही दिनों में समस्त आसक्तियों का नाश कर अरहंत पद प्राप्त कर लिया।\n\nतथागत ने मोग्गलान को संघ में 'ऋद्धिवान' (अलौकिक सिद्धियों के स्वामी) में सर्वोच्च स्थान दिया। वे मन की गति से किसी भी लोक में भ्रमण कर सकते थे। उन्होंने अपनी सिद्धियों का उपयोग कभी चमत्कार दिखाने के लिए नहीं, अपितु लोगों को कर्म के अटल सिद्धांत का बोध कराने के लिए किया। जब देवदत्त ने संघ में फूट डालकर पांच सौ भिक्षुओं को अलग कर लिया था, तब मोग्गलान और सारिपुत्त ने ही अपने ज्ञान और प्रभाव से सभी भिक्षुओं को पुनः संघ में जोड़कर एकता स्थापित की।",
    "trial": "Moggallana's supreme trial was facing the consequences of ancient past karma. Jealous sectarian ascetics hired ruthless brigands to assassinate him in his cave. Twice, Moggallana used his psychic powers to dissolve his body and slip away. But on the third occasion, he perceived with clairvoyant insight that in a distant past life he had mistreated his aged parents, and this heavy karma was ripe. Knowing the law of karma is supreme, Moggallana willingly refrained from using his powers, allowing the assassins to beat his physical body to powder. With superhuman will, he reconstituted his body, flew to the Buddha to pay final homage, and attained Parinirvana.",
    "trialLocal": "मोग्गलान की सबसे बड़ी परीक्षा कर्म के अटल नियम को स्वीकार करना था। उनके प्रभाव से ईर्ष्या करने वाले विरोधियों ने उन्हें मारने के लिए डाकू भेजे। दो बार वे अपनी ऋद्धि से अदृश्य हो गए, परंतु तीसरी बार उन्होंने दिव्य दृष्टि से देखा कि पूर्वजन्म में उन्होंने अपने अंधे माता-पिता के प्रति अपराध किया था, जिसका फल अब भोगना अनिवार्य था। उन्होंने अपनी सिद्धियों का प्रयोग नहीं किया और डाकुओं के प्रहारों को समभाव से सह लिया। अंत में तथागत को अंतिम प्रणाम कर उन्होंने महापरिनिर्वाण प्राप्त किया।",
    "teaching": "No power in the universe, neither gods nor occult miracles, can cancel the fruit of karma. Violence and deceit inevitably return upon the doer, while pure mindfulness and detachment grant absolute freedom from suffering.",
    "teachingLocal": "संसार की कोई भी शक्ति या चमत्कार कर्म के फल से नहीं बचा सकता। कर्म का नियम अटल है। जो जैसा करेगा, वैसा भरेगा; अतः मन को शुद्ध रखकर समता में स्थित रहना ही मोक्ष का एकमात्र मार्ग है।",
    "moral": "Even the greatest spiritual master must humbly accept the universal laws of nature and karma. True spiritual mastery is not escaping physical death through miracles, but facing the dissolution of the body with radiant, fearless equanimity.",
    "moralLocal": "चमत्कार या सिद्धियां कितनी भी बड़ी हों, वे प्रकृति और कर्म के नियमों से ऊपर नहीं हैं। वास्तविक सिद्धि मृत्यु या कष्ट से भागना नहीं, बल्कि उसे शांत और वीतराग भाव से स्वीकार करना है।",
    "legacy": "Moggallana's life remains the immortal benchmark for monastic courage, loyalty, and the righteous use of spiritual power in Buddhism. His relics, alongside Sariputta’s, are venerated across the world at the Sanchi Stupa.",
    "legacyLocal": "मोग्गलान का जीवन त्याग, निष्ठा और कर्म-सिद्धांत के प्रति समर्पण का सर्वोच्च उदाहरण है। सांची के स्तूप में सारिपुत्त और मोग्गलान की पावन धातुएं (अस्थियां) आज भी संपूर्ण विश्व द्वारा पूजी जाती हैं।",
    "source": "Anguttara Nikaya (Etadagga Vagga) & Dhammapada Atthakatha",
    "sourceLocal": "अंगुत्तर निकाय (एतदग्ग वग्ग) एवं धम्मपद अट्ठकथा",
    "sourceCitations": [
      {
        "sourceName": "Anguttara Nikaya",
        "sourceRef": "AN 1.14, Foremost Disciples: Moggallana in Psychic Power",
        "tier": 1
      },
      {
        "sourceName": "Dhammapada Commentary",
        "sourceRef": "Story of the Death of Venerable Moggallana",
        "tier": 2
      }
    ],
    "illustrationPrompt": "Venerable Maha-Moggallana seated in deep calm meditation on a mountain ridge in Rajagriha, surrounded by a subtle halo of radiant blue light, serene amidst crashing storm clouds.",
    "quote": {
      "text": "Neither in the sky nor in mid-ocean, nor entering a mountain cleft, is there a place on earth where one may escape the fruit of evil deeds.",
      "attribution": "Dhammapada, Verse 127"
    },
    "quoteLocal": {
      "text": "न आकाश में, न समुद्र के मध्य में, और न पर्वतों की गुफा में—संसार में ऐसा कोई स्थान नहीं है जहाँ जाकर मनुष्य अपने कर्मों के फल से बच सके।",
      "attribution": "धम्मपद, गाथा १२७"
    }
  },
  {
    "id": "mahapajapati-gotami",
    "name": "Mahapajapati Gotami",
    "nameLocal": "महाप्रजापती गौतमी",
    "era": "c. 6th–5th Century BCE",
    "eraLocal": "लगभग छठी-पांचवीं शताब्दी ईसा पूर्व",
    "tradition": "buddhist",
    "region": "Kapilavastu / Vaishali",
    "regionLocal": "कपिलवस्तु / वैशाली",
    "emoji": "👑",
    "tagline": "The queen-mother who nursed the infant Buddha, renounced imperial palace luxury, and walked barefoot to establish the historic Bhikkhuni Sangha for female monastic liberation.",
    "taglineLocal": "महारानी जिन्होंने शिशु बुद्ध का पालन-पोषण किया, राजसी वैभव त्याग कर नंगे पैर चलकर महिलाओं के लिए ऐतिहासिक भिक्षुणी संघ की स्थापना की।",
    "journey": "Mahapajapati Gotami was the younger sister of Queen Maya and the maternal aunt of Prince Siddhartha. When Queen Maya passed away a mere seven days after giving birth to the future Buddha in Lumbini, Gotami stepped forward with boundless maternal devotion. Surrendering her own biological newborn son Prince Nanda to court wet-nurses, Gotami personally cradled, breastfed, and raised Siddhartha in the royal palace of Kapilavastu with unmatched tenderness. Under her loving guidance, Siddhartha grew into manhood, cherishing her as his true mother. Decades later, when the Buddha returned to Kapilavastu as the awakened Tathagata, and King Suddhodana subsequently attained liberation on his deathbed, Gotami felt the palace walls close in like a gilded cage, awakening an unquenchable thirst for the homeless life of Dhamma.\n\nApproaching the Buddha beneath the Banyan Grove in Kapilavastu, Queen Gotami pleaded for permission for women to enter the homeless life and receive monastic ordination. Bound by the deeply patriarchal social norms of ancient Indian society, where solitary women in dense forests faced horrific perils from bandits and wild beasts, the Buddha initially declined three consecutive times. Refusing to allow social conventions to extinguish the spiritual destiny of womanhood, Gotami took a daring, historic step. Shaving off her lustrous royal hair, putting on coarse ochre robes, and accompanied by five hundred noble Shakyan and Koliyan women, she walked barefoot for over three hundred miles across northern India from Kapilavastu to the Kutagara Hall in Vaishali.\n\nArriving in Vaishali with dust-caked robes, bleeding feet covered in blisters, and tear-streaked faces, Gotami and her companions stood weeping in sheer physical exhaustion outside the entrance of the Buddha’s monastery. Moved to profound tears by their heroic perseverance, Venerable Ananda approached the Buddha and presented an unanswerable spiritual challenge: \"Lord, if a woman goes forth from the home into homelessness in the Dhamma and Vinaya, is she capable of realizing the fruits of Stream-Entry, Once-Returning, Non-Returning, and supreme Arahantship?\" The Buddha replied unequivocally: \"She is capable, Ananda.\" Ananda then pleaded: \"Then, Lord, remembering how Mahapajapati Gotami nursed you and raised you, let women be admitted to the Sangha!\" The Buddha consented, establishing the Bhikkhuni Sangha under eight foundational guidelines. Ordained as the first Buddhist nun, Gotami practiced relentless meditation, attained full Arahantship, and led thousands of women to complete spiritual emancipation.",
    "journeyLocal": "महाप्रजापती गौतमी महारानी माया की छोटी बहन और सिद्धार्थ की मौसी थीं। सिद्धार्थ के जन्म के सातवें दिन जब माता माया का देहांत हो गया, तो गौतमी ने अपने सगे पुत्र नंद को धाय को सौंपकर सिद्धार्थ को अपने स्तनों का दूध पिलाया और मातृत्व का सर्वोच्च स्नेह दिया। जब बुद्ध संबोधि प्राप्त कर कपिलवस्तु लौटे और कुछ समय बाद राजा शुद्धोधन का निर्वाण हुआ, तो गौतमी के मन में वैराग्य की तीव्र ज्वाला जाग उठी।\n\nउन्होंने बुद्ध से प्रार्थना की कि महिलाओं को भी संघ में प्रव्रज्या (संन्यास) की अनुमति दी जाए। तत्कालीन समाज की कठिन परिस्थितियों को देखते हुए बुद्ध ने तीन बार संकोच प्रकट किया। परंतु गौतमी का संकल्प अडिग था। उन्होंने अपने केश मुंडवाए, काषाय वस्त्र धारण किए और पांच सौ शाक्य राजकुमारियों व कुलीन स्त्रियों के साथ कपिलवस्तु से वैशाली तक तीन सौ मील की पदयात्रा नंगे पैर की।\n\nजब धूल से सनी, छालों से भरे पैरों के साथ वे वैशाली पहुँचीं, तो उनकी इस कठोर तपस्या को देखकर आयुष्मान आनंद द्रवित हो उठे। आनंद ने बुद्ध के समक्ष तर्क रखा कि क्या नारी निर्वाण पाने में सक्षम नहीं है? बुद्ध ने नारी की पूर्ण आध्यात्मिक क्षमता को स्वीकार करते हुए भिक्षुणी संघ की स्थापना की अनुमति दी। महाप्रजापती गौतमी प्रथम भिक्षुणी बनीं और उन्होंने कठोर साधना कर अरहंत पद प्राप्त किया। उन्होंने सिद्ध किया कि मोक्ष के मार्ग पर स्त्री और पुरुष में कोई भेद नहीं है।",
    "trial": "Gotami's supreme trial was walking three hundred miles barefoot through scorching sun, dust, and danger with five hundred women, enduring physical exhaustion and public humiliation to knock at the gates of the Sangha. Her perseverance broke ancient gender barriers in world religion.",
    "trialLocal": "गौतमी की सबसे बड़ी परीक्षा पांच सौ महिलाओं के साथ नंगे पांव सैकड़ों मील की यात्रा कर सामाजिक रूढ़ियों को तोड़ना था। पैरों में पड़े छालों और थकान के बावजूद उनका संकल्प नहीं डगमगाया और उन्होंने विश्व इतिहास में पहली बार नारी संन्यास का द्वार खुलवाया।",
    "teaching": "The capacity for awakening and inner liberation has no gender. Spiritual realization depends not on outward bodily form or social status, but on unyielding resolve, ethical purity, and mindful meditation.",
    "teachingLocal": "आत्म-जागृति और मुक्ति किसी लिंग की मोहताज नहीं है। साधना शरीर से नहीं, अंतरात्मा के संकल्प, शील और ध्यान से होती है। जो भी प्रमाद को त्याग कर धर्म के मार्ग पर चलेगा, वह अवश्य मुक्त होगा।",
    "moral": "Do not allow societal prejudices or historical barriers to limit your spiritual aspirations. When you persist with pure intentions and selfless courage, even the most entrenched doors will open.",
    "moralLocal": "सामाजिक बंधन या रूढ़ियां तुम्हारे आत्म-विकास को नहीं रोक सकतीं। यदि तुम्हारा संकल्प सच्चा और पवित्र है, तो मार्ग की सारी बाधाएं स्वतः दूर हो जाती हैं।",
    "legacy": "Mahapajapati Gotami founded the Bhikkhuni lineage, giving birth to generations of enlightened female teachers whose profound realizations are eternally recorded in the sacred *Therigatha* (Verses of the Elder Nuns).",
    "legacyLocal": "महाप्रजापती गौतमी ने भिक्षुणी संघ की स्थापना की। उनकी प्रेरणा से हजारों स्त्रियों ने निर्वाण प्राप्त किया, जिनकी अमृतवाणी आज बौद्ध धर्म के पावन ग्रंथ 'थेरीगाथा' में सुरक्षित है।",
    "source": "Vinaya Pitaka (Cullavagga X) & Therigatha",
    "sourceLocal": "विनय पिटक (चुल्लवग्ग १०) एवं थेरीगाथा",
    "sourceCitations": [
      {
        "sourceName": "Vinaya Pitaka",
        "sourceRef": "Cullavagga X, The Acceptance of Women into the Sangha",
        "tier": 1
      },
      {
        "sourceName": "Therigatha",
        "sourceRef": "Verses of Mahapajapati Gotami (Thig 157–162)",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Queen-turned-nun Mahapajapati Gotami standing with bleeding bare feet in dusty ochre robes outside the gates of Vaishali, her head shaved and eyes shining with unyielding spiritual resolve.",
    "quote": {
      "text": "Lord, I once nursed your physical body with milk; but now, you have nourished my soul with the eternal milk of the Dhamma, liberating me from the cycle of rebirth.",
      "attribution": "Apadana, Gotami Theriyapadana"
    },
    "quoteLocal": {
      "text": "हे तथागत, मैंने कभी आपके भौतिक शरीर को दूध पिलाया था; परंतु आज आपने मुझे धम्म का अमृत पिलाकर जन्म-मरण के चक्र से सदा के लिए मुक्त कर दिया है।",
      "attribution": "अपदान, गौतमी थेरी-अपदान"
    }
  },
  {
    "id": "nagarjuna",
    "name": "Acharya Nagarjuna",
    "nameLocal": "आचार्य नागार्जुन",
    "era": "c. 150–250 CE",
    "eraLocal": "लगभग १५०-२५० ईस्वी",
    "tradition": "buddhist",
    "region": "Nagarjunakonda (Andhra Pradesh) / Nalanda",
    "regionLocal": "नागार्जुनकोंडा (आंध्र प्रदेश) / नालंदा",
    "emoji": "🪐",
    "tagline": "The philosophical titan of Madhyamaka whose dialectical doctrine of Shunyata (Emptiness) revolutionized global philosophy, steering between nihilism and eternalism.",
    "taglineLocal": "माध्यमिक दर्शन के महान युगप्रवर्तक जिन्होंने 'शून्यता' के क्रांतिकारी सिद्धांत से संपूर्ण विश्व दर्शन को झकझोर दिया और शाश्वतवाद व उच्छेदवाद का अंत किया।",
    "journey": "Born into an illustrious, aristocratic Brahmin family in the southern kingdom of Vidarbha, Nagarjuna was renowned from boyhood as a prodigy in the four Vedas, astronomy, medicine, statecraft, and the esoteric sciences. According to ancient biographical chronicles, in his reckless youth he mastered the occult art of invisibility with three companions, using the magic to enter the royal palace chambers unnoticed. When his companions were ambushed and executed by the king’s guards, and Nagarjuna barely escaped with his life by hiding behind the sovereign’s shadow, a lightning flash of spiritual horror pierced his consciousness. He realized that sensual craving is the direct womb of all mortal terror, tragedy, and destruction. Fleeing to the mountain forests, he embraced Buddhist monastic ordination, mastering the entire Tripitaka within ninety days and exhausting the known philosophical libraries of India.\n\nPerceiving that traditional scholars were mistaking conceptual classifications of Dharma for ultimate liberation, Nagarjuna traveled deep into the spiritual heartlands. According to profound Mahayana tradition, perceiving his pristine intellect, the Naga serpent guardians of the nether ocean invited him to their subterranean water palaces, revealing the long-hidden Prajnaparamita Sutras (Perfection of Wisdom discourses) entrusted to them by Bhagwan Buddha. Returning to northern and southern India with these foundational texts, Nagarjuna spent decades teaching at Nalanda Mahavihara as its supreme abbot, and later at the mountain citadel of Sri Parvata (Nagarjunakonda) on the banks of the Krishna River, generously patronized by the royal Satavahana dynasty.\n\nNagarjuna composed the immortal Mulamadhyamakakarika (Fundamental Verses on the Middle Way), igniting a permanent revolution in world philosophy. Founding the Madhyamaka school, he articulated the doctrine of Shunyata (Emptiness). With crystalline dialectical logic, he demonstrated that all phenomena are empty of independent, intrinsic existence (Svabhava-Shunya) because they arise exclusively through dependent origination (Pratityasamutpada). Emptiness, Nagarjuna fiercely clarified, is neither nihilism nor a blank void; rather, it is the dynamic openness and relational interdependence of reality that allows change, growth, compassion, and spiritual awakening to occur. His profound formulation of the Two Truths—conventional reality (Samvriti-Satya) and ultimate truth (Paramartha-Satya)—became the philosophical bedrock for Mahayana and Vajrayana Buddhism throughout India, Tibet, China, Korea, and Japan.",
    "journeyLocal": "दक्षिण भारत के विदर्भ में जन्मे नागार्जुन बाल्यकाल से ही अद्भुत प्रतिभा के धनी थे। वेद, शास्त्र और तांत्रिक विधाओं में निष्णात नागार्जुन ने जब संसार में काम-वासना के विनाशकारी परिणाम देखे, तो उनके मन में तीव्र वैराग्य उत्पन्न हुआ। उन्होंने बौद्ध संघ में प्रव्रज्या ली और कुछ ही वर्षों में त्रिपिटक का संपूर्ण अध्ययन कर लिया।\n\nपरंपरा के अनुसार, पाताल लोक के नागों ने उनकी अद्वितीय प्रज्ञा देखकर उन्हें 'प्रज्ञापारमिता सूत्र' सौंपे, जो तथागत के गूढ़तम ज्ञान का भंडार थे। नागार्जुन ने नालंदा विश्वविद्यालय और आंध्र प्रदेश में कृष्णा नदी के तट पर स्थित श्रीपर्वत (नागार्जुनकोंडा) को अपनी साधना और ज्ञान का केंद्र बनाया। सातवाहन राजाओं ने उनके सम्मान में विशाल विहार बनवाए।\n\nनागार्जुन ने 'मूलमध्यमककारिका' की रचना कर दर्शन जगत में क्रांति ला दी। उन्होंने 'माध्यमिक दर्शन' की स्थापना की और 'शून्यता' का अमर सिद्धांत प्रतिपादित किया। उन्होंने सिद्ध किया कि संसार की कोई भी वस्तु स्वतंत्र या शाश्वत नहीं है; प्रत्येक वस्तु अन्य कारणों पर निर्भर होकर उत्पन्न होती है (प्रतीत्यसमुत्पाद)। शून्यता का अर्थ अभाव या शून्यवाद नहीं, बल्कि पदार्थों का स्वभाव-रहित और अंतर्संबंधित होना है। उन्होंने 'संवृति सत्य' (व्यावहारिक सत्य) और 'परमार्थ सत्य' (आत्यंतिक सत्य) का ऐसा अद्भुत विश्लेषण किया जिसने तिब्बत, चीन और जापान तक के दर्शन को हमेशा के लिए बदल दिया।",
    "trial": "Nagarjuna faced fierce intellectual attacks from both orthodox Hindu dualists and dogmatic Buddhist Abhidharma scholars who accused him of nihilism. Through calm, uncompromising dialectical debate, he demonstrated that it is dogmatic grasping at permanent essences that creates nihilism, while Shunyata reveals boundless compassion and freedom.",
    "trialLocal": "नागार्जुन की सबसे बड़ी परीक्षा समकालीन दार्शनिकों द्वारा उन पर 'शून्यवादी' (निराशावादी) होने के आरोपों का सामना करना था। उन्होंने अपने अचूक तर्कों से सिद्ध किया कि शून्यता संसार का विनाश नहीं, बल्कि मुक्ति और असीम करुणा का द्वार है।",
    "teaching": "Whatever is dependently co-arisen, that we declare to be emptiness. Emptiness is the very openness that allows life to exist. Do not cling to dogmatic views, not even the view of emptiness; when you let go of all conceptual grasping, pristine awareness shines.",
    "teachingLocal": "जो कुछ भी कारणों पर निर्भर होकर उत्पन्न हुआ है, वही शून्य है। शून्यता ही वह खुलापन है जिससे संसार में परिवर्तन और मुक्ति संभव होती है। किसी भी विचार या दृष्टि से चिपकना ही बंधन है; समस्त मानसिक धारणाओं का शांत हो जाना ही निर्वाण है।",
    "moral": "Rigid dogmatism and intellectual pride are the deepest traps of the mind. By seeing the interdependent nature of all things, self-importance dissolves and universal compassion naturally flowers.",
    "moralLocal": "कट्टरता और अहंकार मन के सबसे बड़े बंधन हैं। जब हम यह समझ लेते हैं कि हमारा अस्तित्व दूसरों से अलग नहीं बल्कि उनसे जुड़ा हुआ है, तो अहंकार स्वतः विसर्जित हो जाता है और हृदय करुणा से भर जाता है।",
    "legacy": "Revered as the 'Second Buddha' in Mahayana and Vajrayana traditions, Nagarjuna’s Madhyamaka philosophy remains one of the most studied and respected systems in global philosophy, deeply resonating with modern quantum physics and existential thought.",
    "legacyLocal": "महायान परंपरा में 'द्वितीय बुद्ध' के रूप में पूजित नागार्जुन का दर्शन आज भी विश्व के महानतम दार्शनिकों द्वारा सराहा जाता है। आधुनिक भौतिकी के क्वांटम सिद्धांत भी उनके शून्यता और सापेक्षता के विचारों से मेल खाते हैं।",
    "source": "Mulamadhyamakakarika & Ratnavali (Acharya Nagarjuna)",
    "sourceLocal": "मूलमध्यमककारिका एवं रत्नावली (आचार्य नागार्जुन)",
    "sourceCitations": [
      {
        "sourceName": "Mulamadhyamakakarika",
        "sourceRef": "Chapter 24, Examination of the Noble Truths (Verse 18)",
        "tier": 1
      },
      {
        "sourceName": "Ratnavali (Precious Garland)",
        "sourceRef": "Epistle to King Udayi on Righteous Governance",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Acharya Nagarjuna seated on a high cliff overlooking the swirling waters of the Krishna river at Sri Parvata, holding a glowing text with a serene serpent hood protecting his head.",
    "quote": {
      "text": "Whatever is dependently co-arisen, that is explained to be emptiness. That, being a dependent designation, is itself the Middle Way.",
      "attribution": "Mulamadhyamakakarika, 24.18"
    },
    "quoteLocal": {
      "text": "यः प्रतीत्यसमुत्पादः शून्यतां तां प्रचक्ष्महे। सा प्रज्ञप्तिरुपादाय प्रतिपत्सैव मध्यमा॥",
      "attribution": "मूलमध्यमककारिका, २४.१८"
    }
  },
  {
    "id": "bodhidharma",
    "name": "Bodhidharma",
    "nameLocal": "बोधिधर्म",
    "era": "c. 5th–6th Century CE",
    "eraLocal": "लगभग ५वीं-६वीं शताब्दी ईस्वी",
    "tradition": "buddhist",
    "region": "Kanchipuram (Tamil Nadu) / Shaolin Temple (China)",
    "regionLocal": "कांचीपुरम (तमिलनाडु) / शाओलिन मंदिर (चीन)",
    "emoji": "🧘",
    "tagline": "The Pallava prince who carried Dhyana to China, sat nine years facing a cave wall at Shaolin, and founded Chan (Zen) Buddhism and martial arts traditions.",
    "taglineLocal": "पल्लव राजकुमार जिन्होंने भारत से 'ध्यान' की ज्योति चीन तक पहुँचाई, शाओलिन की गुफा में नौ वर्ष दीवार के सम्मुख ध्यान किया और 'ज़ेन' परंपरा की नींव रखी।",
    "journey": "Bodhidharma was born as the third prince of the imperial Pallava dynasty in the ancient southern Indian capital of Kanchipuram. Renouncing his royal inheritance, palace luxuries, and martial command in his youth, he was initiated into the Buddhist monastic order by the revered master Prajnatara. Under Prajnatara, Bodhidharma absorbed the direct mind-to-mind transmission of meditative insight that traced back to the Buddha’s silent flower sermon on Vulture Peak. Honoring his preceptor’s dying mandate to carry the living spark of Dhyana to the northern lands of China, Bodhidharma undertook an arduous, perilous three-year sea voyage across the Bay of Bengal, the Strait of Malacca, and the South China Sea, finally arriving in Canton around 520 CE.\n\nUpon reaching Nanjing, the imperial capital of southern China, he was granted an audience with Emperor Wu of Liang, a pious monarch who had spent vast state fortunes constructing thousands of Buddhist temples, funding scriptural translations, and ordaining thousands of monks. Expecting divine praise, Emperor Wu asked: \"I have built countless monasteries, printed sacred sutras, and supported the Sangha throughout my reign. What merit have I accumulated?\" Bodhidharma looked directly into the emperor’s eyes and replied with shattering brevity: \"No merit whatsoever!\" The bewildered emperor demanded: \"What then is the highest principle of the sacred teachings?\" Bodhidharma replied: \"Vast emptiness, with nothing holy in it!\" In exasperation, the emperor asked: \"Who is it that stands before me?\" Bodhidharma calmly replied: \"I do not know.\"\n\nRecognizing that the royal court was trapped in external merit-making and intellectual dogma rather than direct spiritual awakening, Bodhidharma wrapped his coarse robes around his shoulders, traveled north across the roaring Yangtze River on a single reed, and ascended the misty peaks of the Songshan mountains to the Shaolin Monastery in Henan province. There, inside a secluded, wind-swept granite cave high above the temple, Bodhidharma sat facing a bare stone wall in unbroken, silent meditation (Wall-Gazing / Biguan) for nine consecutive years. His uncompromising silence ignited the Chan (Zen) tradition—a path pointing directly to the human mind, transcending dry scriptural pedantry. Observing that the Shaolin monks were physically frail from long sitting, he taught them Indian breath control (Pranayama) and eighteen dynamic physical postures derived from ancient Kalaripayattu and yoga, establishing the physical foundation of Shaolin Kung Fu.",
    "journeyLocal": "कांचीपुरम के पल्लव राजवंश के तीसरे राजकुमार बोधिधर्म ने अल्पायु में ही राजसी वैभव त्याग कर आचार्य प्रज्ञातार से दीक्षा ली। अपने गुरु के आदेश का पालन करते हुए वे भारत से 'ध्यान' की मूल चेतना को पूर्व की ओर ले जाने के लिए तीन वर्ष की कठिन समुद्री यात्रा कर चीन पहुँचे।\n\nचीन के लियोंग सम्राट वू ने, जिसने हजारों मंदिर और मूर्तियां बनवाई थीं, बोधिधर्म को आमंत्रित किया और गर्व से पूछा—'मैंने इतने मंदिर बनवाए हैं, मुझे कितना पुण्य मिला?' बोधिधर्म ने निर्भीकता से उत्तर दिया—'रंचमात्र भी नहीं!' सम्राट ने स्तब्ध होकर पूछा—'तो फिर धर्म का सर्वोच्च सत्य क्या है?' बोधिधर्म बोले—'विशाल शून्यता, जिसमें कुछ भी पवित्र नहीं!' सम्राट ने पूछा—'तो मेरे सामने यह कौन खड़ा है?' बोधिधर्म ने कहा—'मैं नहीं जानता।'\n\nदरबार के आडंबर को देखकर वे शाओलिन के मोंट सोंग की गुफा में चले गए। वहाँ वे नौ वर्षों तक एक पत्थर की दीवार के सामने एकटक ध्यान (दीवार-दर्शन) में बैठे रहे। उनकी इस मौन साधना से 'चान' (ज़ेन) बौद्ध धर्म का जन्म हुआ, जो पोथियों के स्थान पर मन के साक्षात अनुभव पर बल देता है। उन्होंने शाओलिन के कमजोर भिक्षुओं को स्वस्थ और एकाग्र बनाने के लिए भारतीय कलरिपयट्टु और योग पर आधारित व्यायाम सिखाए, जिससे आगे चलकर प्रसिद्ध शाओलिन कुंग-फू का विकास हुआ।",
    "trial": "Bodhidharma sat for nine continuous years facing a stone wall in the freezing winter blizzards and scorching summers of the Shaolin cave, conquering physical paralysis, demonic visions, and mortal exhaustion to prove that the awakened mind is utterly unshaken by external reality.",
    "trialLocal": "शाओलिन की ठंडी गुफा में नौ वर्ष तक बिना हिले-डुले दीवार के सामने ध्यानस्थ बैठे रहना बोधिधर्म की अमानवीय परीक्षा थी। उन्होंने भूख, प्यास, शीत और शरीर के विकारों को जीतकर यह सिद्ध किया कि मन की शक्ति समस्त भौतिक सीमाओं से परे है।",
    "teaching": "A special transmission outside the scriptures; not founded upon words and letters; pointing directly to the human mind; seeing into one's own nature and attaining Buddhahood. Awakening is not outside you; look directly within.",
    "teachingLocal": "शास्त्रों से परे एक विशेष चेतना; जो शब्दों और अक्षरों पर निर्भर नहीं है; जो सीधे मनुष्य के मन की ओर संकेत करती है; अपने आत्म-स्वरूप का साक्षात कर बुद्धत्व को उपलब्ध होना। सत्य बाहर नहीं, तुम्हारे भीतर ही है।",
    "moral": "Do not hide behind scriptures, ceremonies, or philanthropic vanity. Real spiritual transformation demands radical inner honesty, relentless discipline, and direct confrontation with your own mind.",
    "moralLocal": "धार्मिक दिखावों या पुस्तकों के ज्ञान में मत उलझो। जब तक तुम स्वयं अपने मन के विकारों का सामना नहीं करते और भीतर नहीं झांकते, तब तक वास्तविक मुक्ति संभव नहीं है।",
    "legacy": "Bodhidharma is revered as the First Patriarch of Chan (Zen) Buddhism in China, Japan, Korea, and Vietnam, and the spiritual father of the Shaolin martial arts, leaving an indelible imprint on East Asian spirituality and culture.",
    "legacyLocal": "बोधिधर्म को चीन, जापान और पूर्व एशिया में ज़ेन बौद्ध धर्म का प्रथम पैट्रिआर्क (आदि गुरु) माना जाता है। शाओलिन मार्शल आर्ट्स और ज़ेन ध्यान की उनकी विरासत आज संपूर्ण विश्व को प्रेरित कर रही है।",
    "source": "Records of the Transmission of the Lamp & Anthology of the Patriarchal Hall",
    "sourceLocal": "ट्रांसमिशन ऑफ द लैंप एवं एन्थोलॉजी ऑफ द पैट्रिआर्कल हॉल",
    "sourceCitations": [
      {
        "sourceName": "The Bodhidharma Anthology",
        "sourceRef": "The Treatise on the Two Entrances and Four Practices",
        "tier": 1
      },
      {
        "sourceName": "Jingde Record of the Transmission of the Lamp",
        "sourceRef": "Fascicle 3, Biography of Bodhidharma",
        "tier": 2
      }
    ],
    "illustrationPrompt": "Fierce and deeply serene Bodhidharma with piercing dark eyes, sitting motionless in patched ochre robes inside the Shaolin mountain cave facing a bare stone wall at midnight.",
    "quote": {
      "text": "Not founded upon words and letters; pointing directly to the human mind; seeing into one's own nature and attaining Buddhahood.",
      "attribution": "Bodhidharma's Zen Verse"
    },
    "quoteLocal": {
      "text": "शब्दों और अक्षरों पर आधारित नहीं; सीधे मनुष्य के चित्त का संधान; अपने वास्तविक स्वभाव का दर्शन और बुद्धत्व की साक्षात प्राप्ति।",
      "attribution": "बोधिधर्म का ज़ेन सूत्र"
    }
  },
  {
    "id": "padmasambhava",
    "name": "Guru Padmasambhava (Rinpoche)",
    "nameLocal": "गुरु पद्मसंभव (लोटस-बॉर्न)",
    "era": "c. 8th Century CE",
    "eraLocal": "लगभग आठवीं शताब्दी ईस्वी",
    "tradition": "buddhist",
    "region": "Oddiyana / Nalanda / Tibet",
    "regionLocal": "ओड्डियान / नालंदा / तिब्बत",
    "emoji": "⚡",
    "tagline": "The 'Lotus-Born' Vajrayana master who subdued demonic forces, founded Samye Monastery, and embedded the Diamond Vehicle of Buddhism across the roof of the world.",
    "taglineLocal": "वज्रयान के महान तांत्रिक सिद्ध, जिन्होंने तिब्बत की आसुरी शक्तियों को शांत कर सम्ये विहार की स्थापना की और हिमालय में बौद्ध धर्म की अमर ज्योति जलाई।",
    "journey": "Known throughout the Himalayan world as Guru Rinpoche (The Precious Master) and revered in Tibetan tradition as the Second Buddha, Padmasambhava was born in the sacred northwestern kingdom of Oddiyana (in modern Swat/Kashmir). According to sacred biographies, he miraculously appeared as an eight-year-old child seated upon a blooming multicolored lotus blossom in the middle of Lake Dhanakosha, adopted by the pious King Indrabhuti. Renouncing courtly luxury to pursue the supreme truth, he traveled to the great monastic universities of northern India, receiving monastic ordination and intensive training at Nalanda and Vikramashila under great masters like Prabhahasti and Garab Dorje, swiftly mastering the outer Tripitaka and the innermost esoteric cycles of the Dzogchen and Tantric vehicles.\n\nIn the late eighth century, Emperor Trisong Detsen of Tibet sought to establish Buddhism as the spiritual foundation of his mountain realm, inviting the great scholar-monk Shantarakshita from Nalanda. However, construction of Tibet’s first Buddhist monastery at Samye was repeatedly sabotaged by severe natural disasters, violent earthquakes, lightning strikes, and virulent epidemics, which the local populace attributed to wrathful indigenous mountain spirits and Bon sorcerers hostile to the Dhamma. Recognizing that scholastic philosophy alone could not overcome these deep-seated atmospheric and psychological resistances, Shantarakshita advised the Tibetan king to summon the peerless yogic adept Padmasambhava.\n\nCrossing the high Himalayan passes into Tibet, Padmasambhava did not destroy the wrathful local deities, spirits, and demonesses through brute force. Instead, through supreme meditative power, non-dual realization, and compassionate wrath, he subdued and transformed them, binding them under sacred oath (Samaya) as eternal protectors (Dharmapalas) of the Dhamma. With the spiritual ecology of the land pacified, Samye Monastery was triumphantly consecrated in 779 CE. Beside his primary spiritual consort, the enlightened dakini Yeshe Tsogyal, Padmasambhava supervised the monumental translation of hundreds of Sanskrit and Prakrit scriptures into the Tibetan language. Perceiving that future eras would bring spiritual darkness and persecution, he miraculously concealed thousands of esoteric teachings and ritual treasures (Termas) inside mountain rocks, deep lakes, temple pillars, and the subtle consciousness of chosen disciples, to be discovered in future centuries by spiritual treasure-revealers (Terton) when humanity needed them most.",
    "journeyLocal": "तिब्बती परंपरा में 'द्वितीय बुद्ध' के रूप में पूजित गुरु पद्मसंभव का प्राकट्य ओड्डियान राज्य के धनावकोश सरोवर में एक विशाल कमल के पुष्प पर बालक के रूप में हुआ था। राजा इंद्रभूति ने उनका लालन-पालन किया, परंतु राजसी सुखों का त्याग कर वे भारत के महान ज्ञान-केंद्रों नालंदा और विक्रमशिला पहुँचे। वहाँ उन्होंने त्रिपिटक, महायान और वज्रयान तंत्र का गहन अभ्यास कर पूर्ण सिद्धि प्राप्त की।\n\nआठवीं शताब्दी में तिब्बत के सम्राट थ्रिसोंग देत्सेन ने बौद्ध धर्म की स्थापना हेतु नालंदा से आचार्य शांतारक्षित को आमंत्रित किया। परंतु जब तिब्बत के प्रथम बौद्ध विहार 'सम्ये' का निर्माण प्रारंभ हुआ, तो भयंकर भूकम्पों, आकाशीय बिजली और महामारियों से निर्माण कार्य बार-बार ध्वस्त हो जाता था। शांतारक्षित ने सम्राट को परामर्श दिया कि इन आसुरी और तांत्रिक बाधाओं को शांत करने के लिए केवल गुरु पद्मसंभव ही सक्षम हैं।\n\nपद्मसंभव ने तिब्बत की पावन भूमि पर कदम रखा। उन्होंने अपनी अमोघ साधना, प्रचंड योगबल और करुणा से तिब्बत की उग्र शक्तियों और स्थानीय देवों को परास्त कर उन्हें धम्म की रक्षा की शपथ दिलाई। ७७९ ईस्वी में सम्ये विहार का निर्माण पूर्ण हुआ और तिब्बत में बौद्ध धर्म की जड़ें सदा के लिए जम गईं। उन्होंने महारानी येशे त्सोग्याल के सहयोग से सहस्रों संस्कृत ग्रंथों का तिब्बती में अनुवाद कराया। भविष्य के संकटों को भांपते हुए उन्होंने गुप्त आध्यात्मिक ज्ञान (तेरमा) को हिमालय की गुफाओं और झीलों में छुपा दिया, ताकि आने वाली पीढ़ियां संकट के समय उनका उद्धार कर सकें।",
    "trial": "Padmasambhava faced the fiercely hostile mountain elements, xenophobic Bon shamans, and entrenched local demons across the rugged terrain of Tibet. He overcame every occult obstacle and assassination plot not with hatred or fear, but by transmuting violent energy into radiant enlightened awareness.",
    "trialLocal": "पद्मसंभव की सबसे कठिन परीक्षा तिब्बत की बर्फीली घाटियों में स्थानीय तांत्रिकों और उग्र शक्तियों के घातक विरोध का सामना करना था। उन्होंने किसी हिंसा के बिना अपनी आंतरिक आध्यात्मिक ऊर्जा से शत्रुओं के विष को अमृत में बदल दिया।",
    "teaching": "The true nature of your own mind is primordial purity and self-arising radiant clarity (Rigpa). Do not suppress thoughts, fears, or demons; look directly into the source of fear, and you will see that it is completely empty of inherent reality.",
    "teachingLocal": "मन का वास्तविक स्वरूप आदि-विशुद्ध और स्वयंभू प्रकाश (रिगपा) है। भय, क्रोध या वासना को दबाओ मत; सीधे उनके मूल को देखो, और तुम पाओगे कि वे भ्रम मात्र और स्वभाव से शून्य हैं। अपने भीतर के बुद्ध को पहचानना ही परम मुक्ति है।",
    "moral": "External obstacles and dark energies cannot harm a person who rests in fearless, non-dual presence. Whatever dark forces confront you can be transformed into allies on the spiritual path through absolute compassion and wisdom.",
    "moralLocal": "बाहरी बाधाएं या विरोधी शक्तियां उस साधक का बाल भी बांका नहीं कर सकतीं जो आत्म-ज्ञान में स्थिर है। जीवन की हर विपत्ति को अपनी चेतना के बल पर आत्म-विकास का साधन बनाया जा सकता है।",
    "legacy": "Padmasambhava established the Nyingma (Ancient) school of Tibetan Buddhism. His profound teachings, Terma revelations, and sacred image are enshrined in thousands of gompas and monasteries across Tibet, Bhutan, Ladakh, Nepal, and Sikkim.",
    "legacyLocal": "गुरु पद्मसंभव ने तिब्बत में न्यिंग्मा परंपरा की नींव रखी। आज भी भूटान, लद्दाख, सिक्किम और तिब्बत के प्रत्येक मठ में 'गुरु रिन्पोछे' की प्रतिमा को साक्षात बुद्ध के समान पूजा जाता है।",
    "source": "The Life of Padmasambhava & The Lotus Chronicle (Padma Kathang)",
    "sourceLocal": "द लाइफ ऑफ पद्मसंभव एवं पद्म काथांग (पद्म आख्यान)",
    "sourceCitations": [
      {
        "sourceName": "Padma Kathang (The Lotus Chronicle)",
        "sourceRef": "Canto 55, The Subjugation of the Spirits of Tibet",
        "tier": 1
      },
      {
        "sourceName": "The Life and Liberation of Padmasambhava",
        "sourceRef": "Part II: The Master in the Land of Snows",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Magnificent depiction of Guru Padmasambhava seated on a golden lotus throne against the snowy Himalayan peaks of Tibet, holding a vajra in his right hand and skull-cup in his left, with piercing enlightened eyes.",
    "quote": {
      "text": "Though my view is as vast as the sky, my conduct regarding cause and effect is as fine as barley flour.",
      "attribution": "Padmasambhava's Precept"
    },
    "quoteLocal": {
      "text": "यद्यपि मेरी दृष्टि आकाश के समान विशाल और अनंत है, परंतु कर्म और फल के सूक्ष्म नियमों के प्रति मेरा आचरण जौ के आटे से भी अधिक बारीक है।",
      "attribution": "पद्मसंभव का उपदेश"
    }
  },
  {
    "id": "atisha",
    "name": "Atisha Dipankara Srijnana",
    "nameLocal": "अतीश दीपंकर श्रीज्ञान",
    "era": "982–1054 CE",
    "eraLocal": "९८२-१०५४ ईस्वी",
    "tradition": "buddhist",
    "region": "Vikramashila (Bengal) / Tibet",
    "regionLocal": "विक्रमशिला (बंगाल) / तिब्बत",
    "emoji": "🕯️",
    "tagline": "The illustrious Bengali prince and chancellor of Vikramashila who undertook a perilous Himalayan crossing at age sixty to restore ethical purity and Lamrim teachings to Tibet.",
    "taglineLocal": "बंगाल के राजपुत्र और विक्रमशिला के कुलपति, जिन्होंने ६० वर्ष की आयु में हिमालय पार कर तिब्बत में बौद्ध धर्म का नवजागरण किया और 'बोधिपथप्रदीप' की रचना की।",
    "journey": "Born as Prince Chandragarbha into the royal family of the Pala Empire in Bikrampur (modern Bangladesh), he renounced his crown on the eve of marriage, guided by visions of the goddess Arya Tara. Taking monastic ordination under the Mahasamghika preceptor Shilarakshita, he was given the name Dipankara Srijnana ('Illuminator of Wisdom'). Seeking the direct transmission of Bodhicitta (the altruistic awakening mind), he undertook a perilous fourteen-month ocean voyage in a wooden merchant ship across tempestuous waters to the golden kingdom of Suvarnadvipa (Sumatra, Indonesia), studying for twelve continuous years under the supreme master Dharmakirti of Sumatra. Returning to India, his spiritual and intellectual authority was so preeminent that King Nayapala appointed him as the supreme Chancellor (Upadhyaya) of Vikramashila Mahavihara, the most prestigious university in Buddhist Asia.\n\nMeanwhile, in western Tibet (Ngari), Buddhism had fallen into severe degeneration following centuries of political fragmentation and the spread of corrupt, misunderstood tantric practices. King Yeshe-Ö of Guge sought desperately to invite Atisha to cleanse and revive the tradition. Captured by a hostile frontier ruler who demanded a ransom equal to the king’s weight in solid gold, the aging Yeshe-Ö sent a message to his nephew: 'Do not waste gold on an old king’s ransom; use this gold to bring the supreme master Atisha to Tibet!' Hearing of the king’s supreme sacrifice, Atisha was moved to tears. Despite his advanced age of sixty years and warnings that the freezing mountain climate would shorten his physical life by twenty years, Atisha proclaimed: 'If my life can benefit the people of Tibet and preserve the holy Dhamma, what matters twenty years?'\n\nCrossing the icy, treacherous mountain passes of Nepal and western Tibet on foot and horseback, Atisha arrived in Guge in 1042 CE. Refraining from flamboyant occult demonstrations, he began by teaching the bedrock fundamentals: karma, ethical conduct, mindfulness, and loving-kindness, earning the affectionate title 'The Refuge-Master' (Kyab-je). At the request of King Jangchub-Ö, Atisha composed his immortal masterpiece, the *Bodhipathapradipa* (Lamp for the Path to Enlightenment)—a sixty-eight verse treatise that systematized the entire Buddhist path into three capacities of practitioners, creating the revolutionary Lamrim (Stages of the Path) framework that guided all subsequent Tibetan traditions.",
    "journeyLocal": "बंगाल के विक्रमपुर में पाल राजवंश के राजकुमार चंद्रगर्भ के रूप में जन्मे अतीश ने विवाह के दिन ही राजसी भोगों का त्याग कर दिया। उन्होंने आचार्य शीलरक्षित से दीक्षा ली और दीपंकर श्रीज्ञान नाम से प्रसिद्ध हुए। बोधिचित्त (संसार के समस्त जीवों की मुक्ति का संकल्प) की खोज में उन्होंने इंडोनेशिया के सुमात्रा द्वीप तक चौदह महीने की खतरनाक समुद्री यात्रा की और वहाँ बारह वर्षों तक आचार्य धर्मकीर्ति के सान्निध्य में साधना की। भारत लौटने पर पाल सम्राट नयपाल ने उन्हें विक्रमशिला महाविहार का प्रधान कुलपति नियुक्त किया।\n\nउधर तिब्बत में बौद्ध धर्म तांत्रिक विकृतियों के कारण पतन की ओर था। गूगे के राजा येशे-ओ ने अतीश को आमंत्रित करने के लिए स्वर्ण एकत्र करना प्रारंभ किया। जब एक शत्रु राजा ने राजा येशे-ओ को बंदी बनाकर उनके वजन के बराबर स्वर्ण की फिरौती मांगी, तो वृद्ध राजा ने कहा—'मेरे शरीर के लिए सोना मत बहाओ, इस सोने को भारत भेजकर अतीश को तिब्बत बुलाओ ताकि धर्म की रक्षा हो सके।' इस महात्याग को सुनकर अतीश का हृदय भर आया। चिकित्सकों की इस चेतावनी के बावजूद कि तिब्बत की बर्फीली ठंड उनकी आयु बीस वर्ष कम कर देगी, साठ वर्षीय अतीश ने कहा—'यदि मेरे जीवन से धर्म की रक्षा होती है, तो मुझे अपनी आयु की कोई चिंता नहीं।'\n\n१०४२ ईस्वी में वे तिब्बत पहुँचे। उन्होंने किसी आडंबर के बिना जनता को शील, अहिंसा और शरण-गमन का सरल पाठ पढ़ाया। उन्होंने 'बोधिपथप्रदीप' ग्रंथ की रचना की, जिसमें साधना के क्रमिक सोपानों (लाम-रिम) का ऐसा अद्भुत समन्वय किया कि तिब्बत में बौद्ध धर्म पुनः अपने शुद्ध और तेजस्वी रूप में स्थापित हो गया।",
    "trial": "Atisha knowingly surrendered two decades of physical lifespan to make the perilous journey across the freezing Himalayan heights at the age of sixty, trading the warmth and comfort of Vikramashila’s royal university for the desolate stone huts of Tibet to fulfill a martyr-king’s prayer.",
    "trialLocal": "साठ वर्ष की वृद्धावस्था में अपनी आयु के बीस वर्ष कम होने की चेतावनी जानते हुए भी दुर्गम बर्फीले हिमालय को पार कर तिब्बत जाना अतीश का सर्वोच्च त्याग था। उन्होंने सुख-सुविधाओं का त्याग कर ज्ञान की ज्योति जलाई।",
    "teaching": "All Buddhist teachings converge upon a single reality: cultivating unconditional Bodhicitta—the compassionate resolve to attain awakening for the liberation of all sentient beings. Practice ethical discipline first, for without ethical restraint, meditation is merely an illusion.",
    "teachingLocal": "समस्त बौद्ध साधनाओं का एकमात्र सार 'बोधिचित्त' है—संसार के सभी जीवों के दुखों को दूर करने की असीम करुणा। शील और सदाचार के बिना ध्यान का कोई मूल्य नहीं है; पहले अपने आचरण को पवित्र करो।",
    "moral": "A great teacher never measures service by personal comfort, prestige, or physical survival. When duty calls to relieve suffering in dark places, step forward fearlessly with the lamp of truth.",
    "moralLocal": "सच्चा संत कभी अपनी सुख-सुविधा या जीवन की चिंता नहीं करता। जहाँ भी अज्ञान और दुख का अंधकार हो, वहाँ दीपक बनकर ज्ञान का प्रकाश फैलाना ही सच्चा जीवन है।",
    "legacy": "Atisha founded the Kadampa tradition, which directly inspired Je Tsongkhapa to establish the Gelug tradition of the Dalai Lamas. His *Bodhipathapradipa* established the Lamrim literature that remains the core curriculum of Tibetan monasteries today.",
    "legacyLocal": "अतीश ने कंदम परंपरा की स्थापना की, जिससे आगे चलकर दलाई लामाओं की गेलुग परंपरा विकसित हुई। उनका 'बोधिपथप्रदीप' आज भी तिब्बती बौद्ध धर्म में साधना का अनिवार्य ग्रंथ है।",
    "source": "Bodhipathapradipa & The Blue Annals (Gö Lotsawa)",
    "sourceLocal": "बोधिपथप्रदीप एवं द ब्लू एनाल्स (गो लोत्सावा)",
    "sourceCitations": [
      {
        "sourceName": "Bodhipathapradipa (Lamp for the Path to Enlightenment)",
        "sourceRef": "Verses 1–5, The Three Capacities of Seekers",
        "tier": 1
      },
      {
        "sourceName": "The Blue Annals",
        "sourceRef": "Book 5, The Arrival of the Venerable Lord Atisha in Tibet",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Venerable elderly monk Atisha Dipankara in warm woolen Tibetan robes carrying a small butter lamp, riding a sturdy mountain horse across a snowy Himalayan pass into a sunlit plateau.",
    "quote": {
      "text": "Those who, through their personal suffering, truly understand the suffering of others and wish to eliminate all misery from the world—they are the supreme practitioners of truth.",
      "attribution": "Bodhipathapradipa, Verse 4"
    },
    "quoteLocal": {
      "text": "जो अपने व्यक्तिगत दुखों के माध्यम से समस्त प्राणियों के दुखों को गहराई से अनुभव करते हैं और संपूर्ण जगत के क्लेशों को मिटाना चाहते हैं, वे ही सच्चे और सर्वश्रेष्ठ साधक हैं।",
      "attribution": "बोधिपथप्रदीप, श्लोक ४"
    }
  },
  {
    "id": "thich-nhat-hanh",
    "name": "Thich Nhat Hanh",
    "nameLocal": "थिच नहत हान्ह",
    "era": "1926–2022 CE",
    "eraLocal": "१९२६-२०२२ ईस्वी",
    "tradition": "buddhist",
    "region": "Hue (Vietnam) / Plum Village (France)",
    "regionLocal": "ह्यूए (वियतनाम) / प्लम विलेज (फ्रांस)",
    "emoji": "🍃",
    "tagline": "The Vietnamese Zen master and poet who coined 'Engaged Buddhism', walked through the horrors of war with mindfulness, and gifted global culture the gentle art of peaceful presence.",
    "taglineLocal": "वियतनामी ज़ेन गुरु और कवि, जिन्होंने 'एंगेज्ड बुद्धिज्म' (सक्रिय बौद्ध धर्म) की नींव रखी, युद्ध की विभीषिका में भी शांति का मार्ग दिखाया और विश्व को 'माइंडफुलनेस' का उपहार दिया।",
    "journey": "Born as Nguyen Xuan Bao in central Vietnam, he entered the Tu Hieu root temple near Hue as a novice monk at the age of sixteen, steeped in the traditional Vietnamese Zen (Thien) and Mahayana lineages. As the catastrophic Vietnam War exploded across his homeland in the 1960s, tearing ancient rural villages apart and showering rice paddies in napalm, chemical defoliants, artillery shells, and carpet bombs, Thich Nhat Hanh and his fellow monastics confronted a profound moral crossroads: should they remain sequestered in tranquil mountain monasteries practicing solitary meditation, or should they step out into the smoke, napalm, and fire to rescue the wounded, shelter thousands of displaced refugees, and stop the fratricidal carnage?\n\nChoosing to practice meditation in the crucible of real-world suffering, Thich Nhat Hanh coined the revolutionary concept of \"Engaged Buddhism\" (Dao Phat Di Vao Cuoc Doi). He founded the School of Youth for Social Service, organizing over ten thousand dedicated young volunteers who walked directly into war zones to rebuild bombed rural clinics, establish cooperative village schools, dig clean water wells, and rescue injured civilians without bearing arms or swearing allegiance to either the Communist North or the American-backed South. In 1966, he traveled across the United States and Europe on an urgent peace mission, appealing directly to political leaders and citizens to end the bloodshed. He met with civil rights leader Dr. Martin Luther King Jr., who was so profoundly moved by Thich Nhat Hanh’s spiritual authority, gentleness, and moral courage that King publicly nominated him for the Nobel Peace Prize in 1967 and made the historic decision to publicly denounce the Vietnam War.\n\nBecause of his uncompromising refusal to support either warring faction and his courageous defense of innocent peasant lives, both North and South Vietnamese regimes banned him from returning to his homeland, casting him into thirty-nine continuous years of painful political exile. Undeterred by isolation, he established the Plum Village spiritual community in southwestern France, transforming it into the world’s most vibrant, influential international center for mindfulness and reconciliation. Authoring over one hundred poetic, accessible masterpieces—including The Miracle of Mindfulness, Peace Is Every Step, and Old Path White Clouds—he taught millions across six continents how to wash dishes mindfully, breathe through emotional trauma, resolve conflict through compassionate listening, and recognize that \"Peace is every step; the shining red sun is my heart.\"",
    "journeyLocal": "मध्य वियतनाम में जन्मे थिच नहत हान्ह सोलह वर्ष की आयु में ज़ेन भिक्षु बने। १९६० के दशक में जब उनके देश पर वियतनाम युद्ध का भीषण संकट आया और अमेरिकी बमवर्षकों ने गांवों को आग के हवाले करना प्रारंभ किया, तो उन्होंने और उनके साथी भिक्षुओं ने एक ऐतिहासिक निर्णय लिया। उन्होंने कहा कि जब जनता जल रही हो, तो हम मंदिर में बैठकर आंखें बंद नहीं कर सकते।\n\nउन्होंने 'एंगेज्ड बुद्धिज्म' (सक्रिय बौद्ध धर्म) की स्थापना की। उन्होंने हजारों युवाओं को लेकर युद्धग्रस्त क्षेत्रों में पुनर्निर्माण, अनाथालयों की स्थापना और घायलों की चिकित्सा का कार्य बिना किसी हथियार के किया। १९६६ में वे शांति की अपील लेकर अमेरिका गए, जहाँ डॉ. मार्टिन लूथर किंग जूनियर उनसे इतने प्रभावित हुए कि उन्होंने थिच नहत हान्ह को नोबेल शांति पुरस्कार हेतु नामांकित किया और युद्ध का विरोध किया।\n\nशांति का पक्ष लेने के कारण वियतनाम की दोनों सरकारों ने उन्हें देश से निष्कासित कर दिया। उनतालीस वर्षों के इस निर्वासन में उन्होंने फ्रांस में 'प्लम विलेज' की स्थापना की, जो आज विश्व में ध्यान और शांति का सबसे बड़ा केंद्र है। उन्होंने 'द मिरेकल ऑफ माइंडफुलनेस' जैसी पुस्तकों के माध्यम से संपूर्ण विश्व को सांस लेने, चलने और वर्तमान क्षण में जीने की कला सिखाई।",
    "trial": "Thich Nhat Hanh endured thirty-nine years of forced exile from his beloved homeland, seeing his student volunteers murdered in the crossfire of the Vietnam War. Rather than surrendering to bitterness or hatred toward the soldiers who bombed his country, he practiced deep looking, transforming sorrow into inexhaustible loving-kindness.",
    "trialLocal": "उनतालीस वर्षों तक अपनी मातृभूमि से निष्कासित रहना और अपने प्रिय शिष्यों को युद्ध में खोना उनकी सबसे बड़ी परीक्षा थी। परंतु उन्होंने कभी किसी पक्ष के प्रति घृणा नहीं की; उन्होंने आंसुओं को करुणा में बदलकर संपूर्ण विश्व को क्षमा का पाठ पढ़ाया।",
    "teaching": "Mindfulness is the miracle that brings you back to the present moment. There is no way to peace; peace is the way. Smile, breathe, and go slowly—the pure land of the Buddha is available right here and right now in every mindful breath.",
    "teachingLocal": "वर्तमान क्षण में होशपूर्वक जीना ही ध्यान का चमत्कार है। शांति का कोई अलग मार्ग नहीं है; शांत होकर चलना ही मार्ग है। प्रत्येक सांस में जीवन की सुंदरता को अनुभव करो; तथागत का बुद्धत्व इसी क्षण में उपलब्ध है।",
    "moral": "True spiritual activism is free from anger and blame. You cannot bring peace to the world if your own heart is at war; first cultivate inner tranquility, and peace will flow naturally from your presence.",
    "moralLocal": "क्रोध और बदले की भावना से कभी शांति नहीं आ सकती। यदि संसार को बदलना चाहते हो, तो पहले अपने भीतर के युद्ध को शांत करो; जब तुम शांत होगे, तो तुम्हारी उपस्थिति ही वातावरण को बदल देगी।",
    "legacy": "Thich Nhat Hanh popularized global mindfulness and inter-being (interdependent co-existence) in the West, establishing dozens of monasteries worldwide and inspiring contemporary environmental, peace, and restorative justice movements.",
    "legacyLocal": "उन्होंने पश्चिमी जगत में 'माइंडफुलनेस' की क्रांति ला दी। उनके द्वारा स्थापित मठ आज भी लाखों लोगों को तनाव, अवसाद और संघर्षों से मुक्त कर शांत जीवन जीने की प्रेरणा दे रहे हैं।",
    "source": "The Miracle of Mindfulness & Peace Is Every Step (Thich Nhat Hanh)",
    "sourceLocal": "द मिरेकल ऑफ माइंडफुलनेस एवं पीस इज एव्री स्टेप (थिच नहत हान्ह)",
    "sourceCitations": [
      {
        "sourceName": "The Miracle of Mindfulness",
        "sourceRef": "Chapter 1, Essential Sutra on Mindfulness",
        "tier": 1
      },
      {
        "sourceName": "Nomination Letter for the Nobel Peace Prize (Dr. Martin Luther King Jr.)",
        "sourceRef": "Letter to Nobel Committee, January 1967",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Zen master Thich Nhat Hanh in simple brown Vietnamese monastic robes walking with gentle, mindful barefoot steps beneath flowering plum trees at dawn, a serene smile on his lips.",
    "quote": {
      "text": "Breathing in, I calm body and mind. Breathing out, I smile. Dwelling in the present moment, I know this is the only moment.",
      "attribution": "Peace Is Every Step"
    },
    "quoteLocal": {
      "text": "श्वास भीतर लेते हुए, मैं काया और चित्त को शांत करता हूँ। श्वास बाहर छोड़ते हुए, मैं मुस्कुराता हूँ। वर्तमान क्षण में स्थित होकर, मैं जानता हूँ कि यही एकमात्र क्षण है।",
      "attribution": "पीस इज एव्री स्टेप"
    }
  },
  {
    "id": "br-ambedkar",
    "name": "Dr. B.R. Ambedkar (Babasaheb)",
    "nameLocal": "डॉ. भीमराव आंबेडकर (बाबासाहेब)",
    "era": "1891–1956 CE",
    "eraLocal": "१८९१-१९५६ ईस्वी",
    "tradition": "buddhist",
    "region": "Mhow (Madhya Pradesh) / Nagpur / Mumbai",
    "regionLocal": "महू (मध्य प्रदेश) / नागपुर / मुंबई",
    "emoji": "📜",
    "tagline": "The architect of modern India's Constitution who spearheaded the renaissance of the Dhamma, liberating millions from untouchability through the path of reason, equality, and compassion.",
    "taglineLocal": "भारतीय संविधान के मुख्य शिल्पी, जिन्होंने शोषितों को आत्म-सम्मान दिया और नागपुर में लाखों अनुयायियों के साथ तथागत के धम्म की शरण लेकर नवयान की क्रांति की।",
    "journey": "Born as Bhimrao Ramji Ambedkar into the untouchable Mahar community in the military cantonment of Mhow, he endured the humiliating sting of systemic caste discrimination from his earliest school days—forced to sit on a rough gunny sack outside the classroom floor, denied water from the common school tap unless it was poured down his throat from a distance by a peon, and subjected to universal social ostracism that denied his very humanity. Defying every crushing socio-economic barrier through superhuman intellectual discipline, voracious reading, and unshakeable self-respect, he earned doctorates in economics from Columbia University in New York and the London School of Economics, and was called to the Bar at Gray’s Inn in London, emerging as one of the most comprehensively educated legal and economic minds of the twentieth century.\n\nReturning to India, Babasaheb dedicated his life with fierce, single-minded devotion to the total emancipation of India’s sixty million oppressed and ostracized citizens. He launched the historic Mahad Satyagraha in 1927 to assert the fundamental human right of untouchables to drink water from the public Chavadar Lake, publicly burning the Manusmriti to signify a complete break with institutional inequality. He founded pioneering journals including Mooknayak (Leader of the Silent) and Bahishkrit Bharat to give a roaring voice to the voiceless. Appointed as Chairman of the Drafting Committee of the Indian Constitution following Independence, Ambedkar authored the supreme democratic charter of the world’s largest republic, enshrining universal adult franchise, fundamental civil liberties, and the total constitutional abolition of untouchability.\n\nYet Babasaheb recognized with acute historical foresight that legal constitutionalism alone could not eradicate deeply ingrained caste prejudice; true human emancipation demanded a profound moral and spiritual revolution of the heart. Having rigorously studied all world religions for decades, on October 14, 1956, at the historic Deekshabhoomi in Nagpur, alongside his wife Dr. Savita Ambedkar and over five hundred thousand followers, Babasaheb formally took refuge in the Triple Gem under the venerable Burmese monk U Chandramani. Administering twenty-two solemn pledges to renounce superstition and caste hierarchies, he revived Buddhism in the land of its birth as Navayana—a path rooted not in fatalism or ritual superstition, but in the Buddha’s original ethical foundation of Prajna (rational wisdom), Karuna (compassion), and Samata (equality). Weeks before his death, he completed his spiritual masterwork, The Buddha and His Dhamma, offering an enduring manifesto of human dignity.",
    "journeyLocal": "मध्य प्रदेश के महू में अछूत माने जाने वाले महार कुल में जन्मे भीमराव आंबेडकर ने बाल्यकाल से ही जातिगत भेदभाव और अपमान का घोर दंश झेला। विद्यालय में कक्षा के बाहर बोरे पर बैठना, मटके से पानी न पीने देना और हर कदम पर तिरस्कार—परंतु इन बाधाओं ने उनके संकल्प को और फौलादी बना दिया। उन्होंने कोलंबिया विश्वविद्यालय और लंदन स्कूल ऑफ इकोनॉमिक्स से डॉक्टरेट की उपाधियां प्राप्त कीं और बैरिस्टर बने।\n\nभारत लौटकर उन्होंने शोषितों और वंचितों के आत्म-सम्मान के लिए महाड़ का ऐतिहासिक सत्याग्रह किया, जिसमें सार्वजनिक तालाब से पानी पीने के मानवीय अधिकार को सिद्ध किया। स्वतंत्र भारत के प्रथम कानून मंत्री और संविधान की प्रारूप समिति के अध्यक्ष के रूप में उन्होंने भारतीय संविधान का निर्माण किया, जिसमें बंधुत्व, समानता और अस्पृश्यता के अंत की संवैधानिक गारंटी दी गई।\n\nपरंतु बाबासाहेब का मानना था कि कानून से अधिकार तो मिल सकते हैं, परंतु अंतर्मन की मुक्ति के लिए आध्यात्मिक क्रांति आवश्यक है। १४ अक्टूबर १९५६ को नागपुर की दीक्षाभूमि पर उन्होंने अपने पांच लाख अनुयायियों के साथ तथागत बुद्ध के धम्म की शरण ली और २२ प्रतिज्ञाएं दिलाईं। उन्होंने बौद्ध धर्म को 'नवयान' के रूप में पुनर्जीवित किया—एक ऐसा मार्ग जो प्रज्ञा, करुणा और समता पर आधारित है। अपने महापरिनिर्वाण से पूर्व उन्होंने 'द बुद्ध एंड हिज धम्म' की रचना कर मानवता को गरिमा का नया प्रकाश दिया।",
    "trial": "Babasaheb fought against millennia of deeply entrenched caste bigotry, personal tragedies including the loss of his beloved wife and children to poverty in his youth, and relentless political opposition, never once succumbing to violence or bitterness, but wielding the pen, law, and moral reason as his weapons.",
    "trialLocal": "सदियों पुरानी सामाजिक असमानता, घोर निर्धनता और अपनों को खोने के दारुण आघातों के बावजूद बाबासाहेब ने कभी हिंसा या कटुता का मार्ग नहीं चुना। उन्होंने केवल शिक्षा, संगठन और संविधान के बल पर शोषितों का उद्धार किया।",
    "teaching": "Educate, Agitate, Organize. Religion must be judged by its social utility and whether it promotes liberty, equality, and fraternity. The Buddha's Dhamma is morality—not ritualism, not superstition, but love, reason, and social justice.",
    "teachingLocal": "शिक्षित बनो, संगठित रहो, संघर्ष करो। धर्म वही सच्चा है जो स्वतंत्रता, समता और बंधुत्व सिखाए। तथागत का धम्म कोई अंधविश्वास या कर्मकांड नहीं, बल्कि नैतिकता, करुणा और न्याय का सजीव मार्ग है।",
    "moral": "No human being is born degraded; your destiny is forged by your intellect, moral courage, and dedicated service to truth. Stand upright with dignity, for self-respect is the most sacred possession of human life.",
    "moralLocal": "जन्म से कोई बड़ा या छोटा नहीं होता; मनुष्य अपने कर्मों और आत्म-सम्मान से महान बनता है। अपने अधिकारों के लिए सजग रहना और दूसरों के प्रति दयालु होना ही सच्ची मानवता है।",
    "legacy": "Dr. Ambedkar is revered as the champion of human rights across the globe. His revival of Buddhism in 1956 sparked a massive spiritual movement that revitalized the Dhamma in modern India, inspiring oppressed communities worldwide.",
    "legacyLocal": "बाबासाहेब आधुनिक भारत के महानतम जननायक हैं। उनके द्वारा दीक्षाभूमि में जलाई गई धम्म की ज्योति ने लाखों परिवारों को नई गरिमा और पहचान दी, और उनका चिंतन आज संपूर्ण विश्व में मानवाधिकारों का प्रेरणा स्रोत है।",
    "source": "The Buddha and His Dhamma & Annihilation of Caste (Dr. B.R. Ambedkar)",
    "sourceLocal": "द बुद्ध एंड हिज धम्म एवं एनीहिलेशन ऑफ कास्ट (डॉ. बी.आर. आंबेडकर)",
    "sourceCitations": [
      {
        "sourceName": "The Buddha and His Dhamma",
        "sourceRef": "Book IV, Part II: What is Dhamma?",
        "tier": 1
      },
      {
        "sourceName": "The Constituent Assembly Debates",
        "sourceRef": "Final Address on November 25, 1949",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Dr. B.R. Ambedkar standing with profound dignity in pristine white attire at Deekshabhoomi in Nagpur, hands folded before a radiant statue of the Buddha, surrounded by half a million transformed citizens.",
    "quote": {
      "text": "I measure the progress of a community by the degree of progress which women have achieved. Cultivate self-respect, rely on your own strength, and follow the path of the Buddha.",
      "attribution": "Babasaheb's Address"
    },
    "quoteLocal": {
      "text": "मैं किसी समाज की प्रगति को उस प्रगति से मापता हूँ जो उस समाज की महिलाओं ने हासिल की है। आत्म-सम्मान से जियो, अपनी शक्ति पर विश्वास रखो और तथागत के बताए मार्ग पर चलो।",
      "attribution": "बाबासाहेब का उद्बोधन"
    }
  },
  {
    "id": "sanghamitra",
    "name": "Theri Sanghamitra",
    "nameLocal": "थेरी संघमित्रा",
    "era": "c. 282–203 BCE",
    "eraLocal": "लगभग २८२-२०३ ईसा पूर्व",
    "tradition": "buddhist",
    "region": "Pataliputra / Anuradhapura (Sri Lanka)",
    "regionLocal": "पाटलिपुत्र / अनुराधापुर (श्रीलंका)",
    "emoji": "🌱",
    "tagline": "The Mauryan princess who renounced imperial royalty, braved ocean voyages, and carried the sacred Bodhi Tree sapling to plant the Bhikkhuni Sangha in Sri Lanka.",
    "taglineLocal": "मौर्य राजकुमारी जिन्होंने राजसी सुख त्याग कर भिक्षुणी दीक्षा ली और समुद्र पार कर बोधिवृक्ष की पावन शाखा ले जाकर श्रीलंका में भिक्षुणी संघ की स्थापना की।",
    "journey": "Princess Sanghamitra was the daughter of Emperor Ashoka and Queen Devi of Vidisha, born during Ashoka’s youthful viceroyalty in western India. Blessed with luminous grace, sharp intelligence, and profound ethical sensitivity, she witnessed the dramatic spiritual transformation of her imperial father following the devastating Kalinga War. Her husband Agribrahma and brother Mahendra both renounced the world to enter the homeless life of the Buddhist Sangha. Soon afterward, inspired by the noble teachings of the Buddha and realizing that royal titles and palace jewels could never bring lasting peace to the human heart, eighteen-year-old Sanghamitra requested ordination as a Buddhist nun (Bhikkhuni) under the venerable preceptress Ayupala, choosing a life of barefoot mendicancy and meditation over the splendor of Pataliputra’s royal court.\n\nAfter her brother Arahant Mahendra successfully introduced Buddhism to the island kingdom of Sri Lanka, converting King Devanampiya Tissa, the queen consort Anula and hundreds of noble court women pleaded to be admitted into the monastic order as nuns. Because the Vinaya strictly mandates that only fully ordained female preceptors can initiate female monastics, King Tissa sent royal envoys to Emperor Ashoka at Pataliputra, requesting that the venerable Theri Sanghamitra be dispatched to the island. Recognizing the supreme spiritual necessity of the mission, Ashoka tearfully parted with his beloved daughter.\n\nAccompanied by a retinue of enlightened nuns, Sanghamitra embarked on an epic and perilous voyage from the port of Tamralipti across the Bay of Bengal to Sri Lanka. Most sacred of all, she carried with her a southern sapling of the original, sacred Bodhi Tree (Jaya Sri Maha Bodhi) from Bodh Gaya, placed inside a pure golden vase. Miraculously weathering fierce oceanic tempests, Sanghamitra arrived at the port of Jambukola in Sri Lanka, where King Tissa waded neck-deep into the ocean to receive the sacred sapling upon his own royal head. Traveling inland to the capital city of Anuradhapura, the Bodhi sapling was planted in the Mahamevnawa Gardens, where it flourishes to this day as the oldest historically documented living tree in the world. Sanghamitra formally ordained Queen Anula and five hundred women, establishing the lineage of the Bhikkhuni Sangha in Sri Lanka and dedicating the remaining four decades of her life to teaching the Dhamma with boundless compassion.",
    "journeyLocal": "सम्राट अशोक और महारानी देवी की सुपुत्री राजकुमारी संघमित्रा का जन्म विदिशा में हुआ था। कलिंग युद्ध के बाद जब उनके पिता अशोक ने बौद्ध धर्म अंगीकार किया और उनके भाई महेंद्र ने संन्यास लिया, तो अठारह वर्षीय संघमित्रा के मन में भी वैराग्य का उदय हुआ। उन्होंने राजमहल के समस्त ऐश्वर्य का परित्याग कर भिक्षुणी दीक्षा ग्रहण की और कठोर साधना में लीन हो गईं।\n\nजब उनके भाई महेंद्र ने श्रीलंका में धम्म का प्रचार किया, तो वहाँ की महारानी अनुला और सैकड़ों स्त्रियों ने भिक्षुणी बनने की इच्छा प्रकट की। बौद्ध नियमों के अनुसार स्त्रियों को दीक्षा केवल वरिष्ठ भिक्षुणी ही दे सकती थी। अतः श्रीलंका के राजा देवानांपिय तिस्स ने सम्राट अशोक से संघमित्रा को भेजने का अनुरोध किया। अशोक ने भारी मन से अपनी लाडली पुत्री को इस महान आध्यात्मिक अभियान के लिए विदा किया।\n\nसंघमित्रा ताम्रलिप्ति बंदरगाह से समुद्र मार्ग द्वारा श्रीलंका के लिए रवाना हुईं। वे अपने साथ बोधगया के मूल बोधिवृक्ष की एक पावन शाखा (दक्षिणी शाखा) स्वर्ण पात्र में लेकर गईं। श्रीलंका पहुँचने पर राजा तिस्स ने स्वयं समुद्र में उतरकर उस शाखा को सिर पर धारण किया। अनुराधापुर के महामेघवन में इस बोधिवृक्ष को रोपा गया, जो आज भी २२०० वर्षों से जीवित विश्व का सबसे प्राचीन ऐतिहासिक वृक्ष है। संघमित्रा ने महारानी अनुला सहित सैकड़ों स्त्रियों को दीक्षा देकर श्रीलंका में भिक्षुणी संघ की स्थापना की और अपने जीवन के अंतिम क्षण तक धम्म की सेवा की।",
    "trial": "Sanghamitra faced the perilous dangers of ancient oceanic voyages across stormy seas and the heartbreak of permanent separation from her father and homeland, dedicating her youth and wisdom entirely to establishing spiritual independence for women in a distant land.",
    "trialLocal": "संघमित्रा की सबसे कठिन परीक्षा तूफानी समुद्र की यात्रा करना और अपने पिता व देश को सदा के लिए छोड़कर एक अनजान द्वीप में धम्म का बीजारोपण करना था। उन्होंने अपने जीवन को नारी चेतना के उत्थान के लिए समर्पित कर दिया।",
    "teaching": "The light of the Dhamma knows no national borders or gender boundaries. When compassion and wisdom are planted in the soil of pure intention, like the sacred Bodhi Tree, they take deep root and shelter generations of suffering souls.",
    "teachingLocal": "सत्य और धम्म की कोई सीमा नहीं होती। जिस प्रकार बोधिवृक्ष की शाखा जहां भी रोपी जाए, वह छाया और शांति देती है, उसी प्रकार पवित्र संकल्प से किया गया कार्य सदियों तक मानवता को शीतलता प्रदान करता है।",
    "moral": "True royalty is not measured by crowns and palaces, but by the willingness to surrender privilege and cross oceans to bring spiritual awakening and dignity to others.",
    "moralLocal": "सच्चा बड़प्पन महलों में रहने में नहीं, बल्कि दूसरों के कल्याण के लिए अपने सुखों को त्यागने में है। त्याग और सेवा ही जीवन को अमर बनाते हैं।",
    "legacy": "The Jaya Sri Maha Bodhi tree planted by Sanghamitra in Anuradhapura has been venerated continuously for over 2,200 years. Her establishment of the Bhikkhuni Sangha in Sri Lanka preserved the female monastic lineage across Southeast Asia.",
    "legacyLocal": "संघमित्रा द्वारा रोपा गया 'जय श्री महाबोधि' वृक्ष आज भी अनुराधापुर में हरा-भरा खड़ा है। उनके द्वारा स्थापित भिक्षुणी संघ ने एशिया भर में स्त्रियों के आध्यात्मिक सशक्तिकरण की नींव रखी।",
    "source": "Mahavamsa (The Great Chronicle of Sri Lanka) & Dipavamsa",
    "sourceLocal": "महावंस (श्रीलंका का महाइतिहास) एवं दीपवंस",
    "sourceCitations": [
      {
        "sourceName": "Mahavamsa",
        "sourceRef": "Chapters 18–19, The Coming of the Bodhi Tree and Sanghamitta",
        "tier": 1
      },
      {
        "sourceName": "Dipavamsa",
        "sourceRef": "Chapter 15, The Establishment of the Nuns' Order in Tambapanni",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Princess-nun Sanghamitra standing on the wooden prow of an ancient sailing ship entering the harbor of Sri Lanka, gently cradling a golden vessel containing the sprouting green branch of the sacred Bodhi Tree.",
    "quote": {
      "text": "With a heart established in peace, cross the turbulent oceans of the world, carrying the seed of awakening to all who thirst for liberation.",
      "attribution": "Mahavamsa Chronicle"
    },
    "quoteLocal": {
      "text": "शांत अंतःकरण के साथ संसार के तूफानी सागरों को पार करो, और जो भी मुक्ति के प्यासे हैं, उन तक बोधि का पावन बीज पहुँचाओ।",
      "attribution": "महावंस इतिहास"
    }
  },
  {
    "id": "milinda",
    "name": "King Milinda (Menander I)",
    "nameLocal": "राजा मिलिंद (मिनांडर प्रथम)",
    "era": "c. 165–130 BCE",
    "eraLocal": "लगभग १६५-१३० ईसा पूर्व",
    "tradition": "buddhist",
    "region": "Sagala (Sialkot, Punjab) / Gandhara",
    "regionLocal": "सागल (सियालकोट, पंजाब) / गांधार",
    "emoji": "🏛️",
    "tagline": "The Greek philosopher-king of northwestern India whose probing dialectical questions to the sage Nagasena gave world literature the philosophical masterpiece Milinda Panha.",
    "taglineLocal": "उत्तर-पश्चिम भारत के इंडो-ग्रीक दार्शनिक सम्राट, जिनके प्रखर प्रश्नों और भिक्षु नागसेन के संवाद ने विश्व साहित्य को 'मिलिंदपञ्हो' जैसा अमर दर्शन दिया।",
    "journey": "Menander I, known in Indian and Pali Buddhist literature as King Milinda, was the most celebrated sovereign of the Indo-Greek Kingdom, ruling a sprawling empire stretching from the Hindu Kush through the fertile valleys of Gandhara, Punjab, and Sindh from his glorious capital at Sagala (modern Sialkot in Punjab). Educated in classical Greek philosophy, Socratic dialectics, mathematics, astronomy, and rhetoric, Milinda was renowned not only as a formidable military general who struck gold coins across two continents, but as an insatiable intellectual who loved nothing more than engaging philosophers, Brahmins, and ascetics in rigorous public debates, systematically defeating and humiliating them with sharp Socratic logic.\n\nGrowing cynical and disillusioned that no philosopher in India could withstand his cross-examinations, Milinda famously lamented: 'Empty indeed is India! Like empty chaff is the whole continent! Is there no philosopher, Brahmin, or monk who can resolve my doubts and debate with me?' Hearing the king's challenge, the Sangha assembled and put forward the young, razor-sharp Buddhist elder Venerable Nagasena. The intellectual confrontation between the Greek warrior-king and the Buddhist monk took place in the royal pavilion at Sagala, witnessed by five hundred Greek courtiers (Yonakas) and thousands of monks and citizens.\n\nMilinda opened with an aggressive philosophical challenge: 'Reverend Sir, who are you? What is your name?' Nagasena replied: 'Sire, I am known as Nagasena, but Nagasena is merely a designation, a conceptual label; for in the ultimate truth, no permanent person or independent soul (Anatta) is found.' Shocked by this non-dual concept, Milinda demanded: 'If there is no permanent soul, who eats the food? Who practices morality? Who commits sin? If someone kills you, there is no murderer!' Nagasena countered with the famous Chariot Parable: 'Great King, did you come on foot or in a chariot?' 'In a chariot,' Milinda replied. Nagasena then systematically interrogated: 'Is the axle the chariot? Are the wheels the chariot? Is the chassis the chariot? Is the yoke the chariot?' Milinda conceded that none of these individual parts is the chariot. 'Just so,' Nagasena concluded, 'dependent upon the axle, wheels, chassis, and pole, the conventional term \"chariot\" arises; in the same way, dependent upon the five aggregates of form, feeling, perception, mental formations, and consciousness, the conventional label \"Nagasena\" exists, but no permanent soul is found.'\n\nAwed by Nagasena’s crystalline explanations over days of deep inquiry, Milinda’s skepticism dissolved into radiant faith. He embraced Buddhism, patronized the Sangha, struck coins bearing the eight-spoked Wheel of the Dhamma (Dhammachakra), built grand monasteries in Sagala, and according to Plutarch, when he passed away, his funeral ashes were divided among the cities of his empire and enshrined in sacred stupas.",
    "journeyLocal": "इंडो-ग्रीक (यवन) साम्राज्य के प्रतापी राजा मिनांडर (जिन्हें पालि में राजा मिलिंद कहा गया) ने उत्तर-पश्चिम भारत, गांधार और पंजाब पर शासन किया। उनकी राजधानी सागल (वर्तमान सियालकोट) थी। यूनानी दर्शन, सुकराती तर्कशास्त्र और युद्धकला में निष्णात राजा मिलिंद को विद्वानों से शास्त्रार्थ करने का व्यसन था। वे भारत के बड़े-बड़े पंडितों और दार्शनिकों को अपने तर्कों से पराजित कर देते थे। निराश होकर उन्होंने एक बार कहा—'यह भारतवर्ष कितना रिक्त है! क्या यहाँ ऐसा कोई संन्यासी नहीं है जो मेरे संशयों का निवारण कर सके?'\n\nतब संघ ने युवा और प्रखर बौद्ध भिक्षु नागसेन को शास्त्रार्थ हेतु भेजा। पाँच सौ यवन सरदारों की उपस्थिति में राजसभा में यह ऐतिहासिक संवाद हुआ, जिसे 'मिलिंदपञ्हो' (मिलिंद के प्रश्न) के नाम से जाना जाता है। राजा ने पूछा—'हे भदंत, आपका नाम क्या है? आप कौन हैं?' नागसेन ने कहा—'महाराज, मुझे नागसेन कहा जाता है, परंतु यह केवल एक व्यावहारिक नाम है; वास्तव में यहाँ कोई स्वतंत्र 'आत्मा' नहीं है।'\n\nराजा ने आश्चर्य से पूछा—'यदि आत्मा नहीं है, तो कर्म कौन करता है? पाप-पुण्य का फल कौन भोगता है?' तब नागसेन ने 'रथ' का अमर दृष्टांत दिया—'महाराज, क्या पहिए रथ हैं? क्या धुरी रथ है? क्या लगाम रथ है?' राजा ने कहा—'नहीं, इन सबके मिलने से रथ की संज्ञा बनती है।' नागसेन ने समझाया—'ठीक वैसे ही रूप, वेदना, संज्ञा, संस्कार और विज्ञान—इन पांच स्कंधों के संयोग से मनुष्य कहलाता है, स्वतंत्र कोई आत्मा नहीं।' नागसेन के तर्कों से राजा मिलिंद इतने मुग्ध हुए कि उन्होंने बौद्ध धर्म स्वीकार कर लिया। उन्होंने अपने सिक्कों पर धम्मचक्र अंकित कराया और बुद्ध के अनन्य उपासक बने।",
    "trial": "Milinda had to surrender his formidable intellectual vanity and pride in Greek dialectical superiority, humbly opening his mind to the counter-intuitive Eastern truth of Anatta (non-self) before a penniless Buddhist mendicant in full view of his royal court.",
    "trialLocal": "राजा मिलिंद की सबसे बड़ी परीक्षा अपने यूनानी बौद्धिक अहंकार को त्यागना और एक अकिंचन भिक्षु के समक्ष सत्य की गहराई को स्वीकार कर नतमस्तक होना था। उन्होंने तर्क को अहंकार का अस्त्र न बनाकर सत्य-खोज का माध्यम बनाया।",
    "teaching": "The self is not a static, immortal soul trapped in a physical shell, but a dynamic, ever-changing stream of interconnected mental and physical processes (Khandhas). When you see reality as it truly is, the delusion of 'I' and 'mine' dissolves, ending suffering.",
    "teachingLocal": "मनुष्य कोई स्थिर या अपरिवर्तनीय आत्मा नहीं है, बल्कि विचारों और अनुभवों का निरंतर बहता हुआ प्रवाह है। जब 'मैं' और 'मेरा' का भ्रम टूट जाता है, तभी मनुष्य समस्त संशयों और दुखों से मुक्त होता है।",
    "moral": "Do not use intellectual intelligence to defeat others or defend prejudices. Welcome genuine debate with an open heart, for true wisdom begins where personal vanity ends.",
    "moralLocal": "बुद्धि का उपयोग दूसरों को नीचा दिखाने के लिए नहीं, बल्कि सत्य को जानने के लिए करो। जब मनुष्य अहंकार छोड़कर खुले मन से संवाद करता है, तभी उसे वास्तविक ज्ञान की प्राप्ति होती है।",
    "legacy": "The dialogue between King Milinda and Nagasena, recorded in the *Milinda Panha*, stands as one of the greatest masterpieces of world philosophical literature, harmonizing ancient Greek logic with Indian Buddhist metaphysics.",
    "legacyLocal": "राजा मिलिंद और नागसेन का संवाद 'मिलिंदपञ्हो' विश्व दर्शन का अमूल्य ग्रंथ है। इसने यूनानी सभ्यता और भारतीय बौद्ध दर्शन के अद्भुत मिलन का ऐसा उदाहरण प्रस्तुत किया जो आज भी अद्वितीय है।",
    "source": "Milinda Panha (The Questions of King Milinda) & Plutarch's Moralia",
    "sourceLocal": "मिलिंदपञ्हो (मिलिंद के प्रश्न) एवं प्लूटार्क की मोरालिया",
    "sourceCitations": [
      {
        "sourceName": "Milinda Panha",
        "sourceRef": "Book II, Chapter 1: The Simile of the Chariot",
        "tier": 1
      },
      {
        "sourceName": "Plutarch's Moralia",
        "sourceRef": "Praecepta Gerendae Reipublicae (821D–E), On the Tomb of Menander",
        "tier": 2
      }
    ],
    "illustrationPrompt": "Indo-Greek King Milinda in royal Hellenistic armor and diadem sitting in his palace hall in Sagala, leaning forward with intense curiosity to listen to the calm Buddhist monk Nagasena gesturing toward a wooden chariot.",
    "quote": {
      "text": "Just as the word 'chariot' is used when parts are assembled, so by convention do we say 'a living being' when the five aggregates are present.",
      "attribution": "Milinda Panha, II.1"
    },
    "quoteLocal": {
      "text": "जैसे भिन्न-भिन्न अंगों के जुड़ने से 'रथ' शब्द का प्रयोग होता है, वैसे ही पांच स्कंधों के संयोग से व्यावहारिक रूप में 'जीव' कहा जाता है।",
      "attribution": "मिलिंदपञ्हो, २.१"
    }
  },
  {
    "id": "xuanzang",
    "name": "Xuanzang (Hiuen Tsang)",
    "nameLocal": "ह्वेन त्सांग (युआन च्वांग)",
    "era": "602–664 CE",
    "eraLocal": "६०२-६६४ ईस्वी",
    "tradition": "buddhist",
    "region": "Luoyang (China) / Nalanda / Silk Road",
    "regionLocal": "लुओयांग (चीन) / नालंदा / रेशम मार्ग",
    "emoji": "🗺️",
    "tagline": "The intrepid Chinese pilgrim-scholar who defied imperial bans to undertake a 16-year epic journey across deserts and mountains to Nalanda, preserving Indian scriptures for humanity.",
    "taglineLocal": "महान चीनी यात्री और विद्वान, जिन्होंने शाही प्रतिबंधों को तोड़कर नालंदा तक १६ वर्षों की दुर्गम यात्रा की और भारतीय ज्ञान-धरोहर को विश्व के लिए अमर कर दिया।",
    "journey": "Born as Chen Hui near Luoyang in Henan during the Sui dynasty, he was ordained as a Buddhist monk at the age of thirteen, demonstrating an astonishing intellect that swiftly exhausted the Buddhist treatises available in China. Troubled by contradictory translations and obscure textual passages in Chinese sutras regarding the nature of Buddhahood and Yogacara philosophy, Xuanzang resolved upon an audacity of faith: he would travel to the source of the Dhamma—India—to study the original Sanskrit manuscripts at Nalanda Mahavihara. In 629 CE, when Emperor Taizong of the Tang dynasty issued an imperial decree forbidding citizens from traveling abroad due to border conflicts, twenty-seven-year-old Xuanzang slipped through the city gates of Chang'an under the cover of night, embarking on an epic sixteen-year, ten-thousand-mile odyssey alone on foot and horseback.\n\nHis journey was an epic of superhuman endurance. Crossing the scorching, bone-strewn sands of the Taklamakan Desert where hallucinations and mirages drove travelers mad, he dropped his water bag and nearly died of thirst during four days and five nights of delirious wandering, sustained only by reciting the Heart Sutra. He crossed the icy glaciers of the Tian Shan and Hindu Kush mountains where a third of his caravan froze to death, outwitted desert bandits, and navigated violent river pirates on the Ganga. Finally, in 637 CE, he arrived at the sacred gates of Nalanda Mahavihara in Bihar. The hundred-and-six-year-old supreme abbot, Acharya Silabhadra, broke into tears upon receiving him, revealing that the Bodhisattva Avalokiteshvara had prophesied in a dream that a Chinese monk would arrive to master the profound Yogacarabhumi Shastra.\n\nFor five intensive years, Xuanzang studied at Nalanda, mastering Sanskrit grammar, Buddhist logic, and Abhidharma philosophy, rising to become one of the university’s top scholars. Emperor Harsha Vardhana of Kanauj honored Xuanzang by convening a grand theological convocation in Kanauj attended by twenty kings and thousands of scholars, where Xuanzang defended Mahayana philosophy without a single opponent being able to refute his thesis. Turning down Harsha’s lavish offers of royal patronage, Xuanzang returned to China in 645 CE carrying six hundred and fifty-seven original Sanskrit manuscripts, several sacred Buddha relics, and golden statues on twenty pack-horses. Welcomed with imperial honors by Emperor Taizong, Xuanzang spent his remaining nineteen years heading a royal translation bureau, translating seventy-four monumental Sanskrit works into classical Chinese and writing the *Great Tang Records on the Western Regions*, the single most important historical and geographical document for modern archaeology in India and Central Asia.",
    "journeyLocal": "चीन के लुओयांग में जन्मे ह्वेन त्सांग तेरह वर्ष की आयु में भिक्षु बने। चीनी भाषा में उपलब्ध बौद्ध ग्रंथों में विरोधाभास देखकर उनके मन में मूल संस्कृत ग्रंथों को उनके उद्गम स्थल—भारत—जाकर पढ़ने की तीव्र तड़प उठी। ६२९ ईस्वी में जब तांग सम्राट ने सीमा पार करने पर प्रतिबंध लगा रखा था, तो सत्ताईस वर्षीय ह्वेन त्सांग रात्रि के अंधेरे में गुप्त रूप से अकेले ही भारत की १६ वर्षों की ऐतिहासिक यात्रा पर निकल पड़े।\n\nउन्होंने तकलामकान रेगिस्तान के दहकते अंगारों को पार किया, जहाँ पानी की मशक गिर जाने पर वे चार दिन और पांच रात बिना जल के तड़पते रहे, परंतु 'हृदय सूत्र' के जाप से उनके प्राण बचे। उन्होंने हिंदूकुश और तियानशान के बर्फीले दर्रों को पार किया जहाँ उनके कई साथी बर्फ में जम कर मर गए। डाकुओं और गंगा के लुटेरों से बचते हुए अंततः वे ६३७ ईस्वी में नालंदा विश्वविद्यालय के द्वारों पर पहुँचे। नालंदा के १०६ वर्षीय कुलपति आचार्य शीलभद्र ने रोते हुए उनका स्वागत किया और बताया कि अवलोकितेश्वर ने स्वप्न में इस चीनी भिक्षु के आने का पूर्वाभास दिया था।\n\nह्वेन त्सांग ने नालंदा में पांच वर्षों तक संस्कृत और दर्शन का गहन अध्ययन किया। सम्राट हर्षवर्धन ने उनके सम्मान में कन्नौज में एक विशाल धर्मसभा का आयोजन किया, जिसमें बीस राजाओं और सहस्रों पंडितों के समक्ष ह्वेन त्सांग ने अपने ज्ञान का लोहा मनवाया। ६४५ ईस्वी में वे ६५७ दुर्लभ संस्कृत पाण्डुलिपियां घोड़ों पर लादकर चीन लौटे। सम्राट ताइजोंग ने उनका भव्य स्वागत किया। जीवन के अंतिम उन्नीस वर्षों में उन्होंने इन ग्रंथों का चीनी भाषा में अनुवाद किया और 'सी-यू-की' (पश्चिमी देशों का वृत्तांत) लिखा, जो आज भी भारत के प्राचीन इतिहास और पुरातत्व का सबसे प्रामाणिक दस्तावेज है।",
    "trial": "Xuanzang survived near-death from dehydration in the desert, freezing blizzards in the mountains, capture by pirates who intended to sacrifice him on a river altar, and constant mortal danger across thousands of miles, relying solely on unshakeable faith in the Triple Gem.",
    "trialLocal": "रेगिस्तान में प्यास से मृत्यु के निकट पहुँचना, बर्फीले तूफानों को झेलना और नदी के लुटेरों द्वारा बलि वेदी पर चढ़ाए जाने से बाल-बाल बचना ह्वेन त्सांग की भयानक परीक्षाएं थीं। उन्होंने प्राणों की बाजी लगाकर भारत की ज्ञान-संपदा को सुरक्षित किया।",
    "teaching": "The pursuit of truth demands total surrender of personal comfort and fear. When your intention is pure and dedicated to the spiritual illumination of humanity, mountains move, deserts give way, and the Divine protects your steps.",
    "teachingLocal": "सत्य की खोज में सुख-सुविधा और भय का पूर्ण विसर्जन करना पड़ता है। यदि तुम्हारा संकल्प मानवता को अज्ञान से मुक्त करने का है, तो प्रकृति और परमात्मा तुम्हारी रक्षा करते हैं और असंभव मार्ग भी खुल जाते हैं।",
    "moral": "Cultural and geographical boundaries are artificial barriers before the universal thirst for wisdom. A true seeker travels to the ends of the earth to drink from the fountain of truth and shares it selflessly with the world.",
    "moralLocal": "ज्ञान की कोई सीमा या देश नहीं होता। सच्चा साधक सत्य को खोजने के लिए पृथ्वी के किसी भी कोने में जा सकता है और उस ज्ञान को बिना किसी स्वार्थ के संपूर्ण मानवता में बांट देता है।",
    "legacy": "Without Xuanzang's meticulous travelogue, modern archaeologists like Alexander Cunningham would never have rediscovered Nalanda, Sarnath, Kushinagar, or Lumbini. His translations preserved hundreds of lost Sanskrit philosophical masterpieces in the Chinese Buddhist Canon.",
    "legacyLocal": "ह्वेन त्सांग के यात्रा-वृत्तांत के बिना आज नालंदा, सारनाथ, कुशीनगर और लुंबिनी जैसे बौद्ध तीर्थों की पुनः खोज असंभव थी। उनके अनुवादों के कारण भारत की वह दार्शनिक धरोहर आज तक सुरक्षित है जो मूल रूप से भारत में नष्ट हो गई थी।",
    "source": "Great Tang Records on the Western Regions & The Life of Xuanzang (Huili)",
    "sourceLocal": "ग्रेट तांग रिकॉर्ड्स ऑन द वेस्टर्न रीजन्स एवं द लाइफ ऑफ ह्वेन त्सांग (हुइली)",
    "sourceCitations": [
      {
        "sourceName": "Great Tang Records on the Western Regions",
        "sourceRef": "Fascicle IX, Description of Nalanda Mahavihara",
        "tier": 1
      },
      {
        "sourceName": "The Life of Hiuen-Tsiang (Huili & Yancong)",
        "sourceRef": "Book III, Arrival at Nalanda and Studies under Silabhadra",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Master Xuanzang in pilgrim robes and travel sandals with a wooden scroll-backpack towering over his shoulders, walking purposefully across the golden sand dunes of the Silk Road with a walking staff.",
    "quote": {
      "text": "I would rather take one single step toward the West and die, than take a step backward to the East and live.",
      "attribution": "Xuanzang's Vow at the Jade Gate"
    },
    "quoteLocal": {
      "text": "पश्चिम (भारत) की ओर एक कदम बढ़ाकर मर जाना मुझे स्वीकार है, परंतु पूर्व (चीन) की ओर पीछे कदम हटाकर जीवित रहना मुझे स्वीकार नहीं।",
      "attribution": "ह्वेन त्सांग की ऐतिहासिक प्रतिज्ञा"
    }
  },
  {
    "id": "eknath",
    "name": "Sant Eknath",
    "nameLocal": "संत एकनाथ",
    "era": "1533–1599 CE",
    "eraLocal": "१५३३-१५९९ ईस्वी",
    "tradition": "hindu",
    "region": "Paithan (Maharashtra)",
    "regionLocal": "पैठण (महाराष्ट्र)",
    "emoji": "💧",
    "tagline": "The saint of Paithan who conquered anger through infinite patience, poured sacred Ganga water into the throat of a dying donkey, and restored Sant Dnyaneshwar's Bhavartha Dipika.",
    "taglineLocal": "पैठण के परम संत जिन्होंने असीम शांति से क्रोध को जीता, प्यास से तड़पते गधे को गंगाजल पिलाया और ज्ञानेश्वरी का उद्धार किया।",
    "journey": "Born into a devout family in the ancient pilgrimage city of Paithan on the banks of the Godavari River, Eknath lost both his parents in infancy and was lovingly raised by his grandfather Chakrapani. From early boyhood, his heart was drawn to divine contemplation. At the age of twelve, guided by a divine voice inside the temple of Shiva, he traveled to the hill fort of Daulatabad to seek spiritual discipleship under Swami Janardana, a saintly disciple of Lord Dattatreya. For six unbroken years, Eknath served his Guru with immaculate devotion, managing fort accounts by day and practicing intense meditation by night. Janardana Swami initiated him into the sublime mysteries of the Bhagavata Purana, directing him to undertake a barefoot pilgrimage across the sacred geography of India.\n\nEknath traveled to Kashi (Varanasi), where he spent years immersed in scriptural study and composed a landmark commentary on the Eleventh Canto of the Srimad Bhagavata, known affectionately across Maharashtra as the *Eknathi Bhagavata*. Returning to Paithan, he lived as an ideal householder saint (Grihastha), proving that true spirituality does not require abandonment of familial duties, but the consecration of all daily actions to God. During a period when conservative scholars strictly reserved religious wisdom for Sanskrit-knowing elites, Eknath fearlessly composed thousands of melodious abhangas, devotional songs, and theatrical spiritual folk-dramas (Bharuds) in the Marathi mother tongue, using humor and everyday allegories to awaken the masses to ethical living and divine devotion.\n\nHis compassion crossed every caste and species boundary. When an impoverished outcaste family invited him to their home for dinner on the day of ancestral rites (Shraddha), Eknath accepted their meal with joyous reverence, shocking the orthodox Brahmin assembly of Paithan who promptly placed him under social boycott. Unmoved by their condemnation, Eknath proved through miraculous spiritual realization that the Divine indwells every living being. One day, returning on foot from Prayagraj carrying two pots of sacred Ganga water intended for anointing the Lingam at Rameswaram thousands of miles south, he encountered a donkey collapsing on the scorching desert road, convulsing in the final agony of dehydration. While fellow pilgrims urged him to preserve the sacred water for the deity, Eknath knelt in the burning sand, cradled the dying animal’s head in his lap, and poured the entire vessel of Ganga water down its parched throat, proclaiming with tears of love: 'Here is my Lord Rameswaram, crying out in thirst!'",
    "journeyLocal": "महाराष्ट्र के पावन तीर्थ पैठण में गोदावरी के तट पर जन्मे एकनाथ बाल्यकाल से ही ईश्वर-प्रेम में लीन रहते थे। बारह वर्ष की आयु में वे देवगिरि (दौलताबाद) के दुर्गपाल स्वामी जनार्दन के चरणों में पहुँचे, जो भगवान दत्तात्रेय के परम भक्त थे। एकनाथ ने छह वर्षों तक गुरु की ऐसी निष्काम सेवा की कि गुरु ने उन्हें भागवत धर्म के गूढ़ रहस्यों में दीक्षित किया।\n\nकाशी जाकर उन्होंने 'श्रीमद्भागवत' के एकादश स्कंध पर अपनी अमर मराठी टीका 'एकनाथी भागवत' लिखी। जब रूढ़िवादी पंडितों ने धर्म-ग्रंथों को केवल संस्कृत में सीमित कर रखा था, तब एकनाथ ने लोक-भाषा मराठी में भावपूर्ण 'अभंग' और 'भारूड़' रचकर सामान्य जनता को भक्ति का मार्ग दिखाया। उन्होंने पैठण में गृहस्थ आश्रम में रहकर सिद्ध किया कि परिवार में रहकर भी पूर्ण वीतराग जीवन जिया जा सकता है।\n\nउनकी करुणा जाति और योनि के समस्त भेदों से परे थी। जब एक निर्धन अछूत परिवार ने उन्हें अपने घर भोजन के लिए बुलाया, तो उन्होंने बिना किसी संकोच के उनका आतिथ्य स्वीकार किया, जिसके कारण तत्कालीन समाज ने उनका बहिष्कार कर दिया। उनकी सबसे प्रसिद्ध परीक्षा तब हुई जब वे प्रयागराज से रामेश्वरम में महादेव का अभिषेक करने हेतु कांवड़ में गंगाजल ला रहे थे। तपती दोपहर में एक गधा प्यास से छटपटाकर मरने की स्थिति में था। साथियों के विरोध के बावजूद एकनाथ ने रामेश्वरम के लिए लाया हुआ समस्त पवित्र गंगाजल उस मरते हुए गधे के मुख में उंडेल दिया और कहा—'मेरे रामेश्वरम तो इसी रूप में प्यासे खड़े थे!'",
    "trial": "Eknath's most iconic trial was his miraculous conquest of anger. A mischievous skeptic in Paithan was hired to break Eknath's legendary equanimity. As Eknath emerged from the sacred Godavari after his morning bath, the man spat betel-juice onto his clean robes. Unshaken and smiling gently, Eknath simply turned back, bathed again, and stepped onto the shore. The man spat upon him again. Eknath bathed again. This was repeated one hundred and eight consecutive times without Eknath showing a flicker of annoyance. Exhausted and weeping in remorse, the antagonist collapsed at his feet, begging for forgiveness.",
    "trialLocal": "संत एकनाथ की शांति की परीक्षा लेने के लिए एक ईर्ष्यालु व्यक्ति ने गोदावरी से स्नान कर लौटते समय उन पर पान की पीक थूक दी। एकनाथ बिना कुछ कहे पुनः स्नान करने चले गए। उस व्यक्ति ने लगातार १०८ बार उन पर थूका, और एकनाथ ने १०८ बार शांत भाव से स्नान किया। अंततः वह व्यक्ति उनके चरणों में गिरकर क्षमा मांगने लगा।",
    "teaching": "God does not dwell exclusively in temple sanctums or sacred rivers; the Supreme Lord resides in the heart of every breathing creature—human, beast, and outcaste alike. True holiness is the complete eradication of anger, pride, and disgust.",
    "teachingLocal": "ईश्वर केवल मंदिरों की मूर्तियों या तीर्थों में नहीं, बल्कि संसार के प्रत्येक प्राणी के हृदय में वास करता है। जब तक तुम्हारे मन में किसी भी जीव के प्रति घृणा या क्रोध है, तब तक तुम्हारी पूजा अधूरी है।",
    "moral": "Patience and forbearance are the supreme weapons of a spiritual soul. Even the most hardened malice melts away when confronted with relentless, unshakeable forgiveness.",
    "moralLocal": "क्रोध को केवल शांति और क्षमा से ही जीता जा सकता है। जब तुम बदले की भावना छोड़ देते हो, तो तुम्हारा सबसे बड़ा शत्रु भी तुम्हारे आगे नतमस्तक हो जाता है।",
    "legacy": "Sant Eknath revitalized the Varkari tradition of Maharashtra, bridging classical scriptural scholarship with popular vernacular devotion. His critical editing and restoration of Sant Dnyaneshwar's *Bhavartha Dipika* (Dnyaneshwari) in 1584 saved the text from corruption.",
    "legacyLocal": "संत एकनाथ ने महाराष्ट्र के वारकरी संप्रदाय को नई ऊर्जा दी। १५८४ में उन्होंने संत ज्ञानेश्वर की 'ज्ञानेश्वरी' की मूल प्रति का संशोधन कर उसे विकृत होने से बचाया। उनके अभंग आज भी महाराष्ट्र के घर-घर में गाए जाते हैं।",
    "source": "Eknathi Bhagavata & Bhaktalilamrita (Mahipati)",
    "sourceLocal": "एकनाथी भागवत एवं भक्तलीलामृत (महीपति)",
    "sourceCitations": [
      {
        "sourceName": "Eknathi Bhagavata",
        "sourceRef": "Adhyaya 11, Exposition on Bhagavata Dharma",
        "tier": 1
      },
      {
        "sourceName": "Bhaktalilamrita",
        "sourceRef": "Chapters 13–24, Life and Miracles of Sant Eknath",
        "tier": 2
      }
    ],
    "illustrationPrompt": "Sant Eknath kneeling with profound tenderness in the hot desert sand, cradling the head of a thirsty dying donkey in his arm while gently pouring sacred Ganga water into its open mouth from a brass pot.",
    "quote": {
      "text": "Whoever sees God in all beings, and serves the suffering without regard to caste or species, has truly bathed in all the sacred rivers of the world.",
      "attribution": "Eknathi Bhagavata, 11.29"
    },
    "quoteLocal": {
      "text": "जो समस्त प्राणियों में परमात्मा को देखता है और जाति या योनि का भेद किए बिना दुखियों की सेवा करता है, उसने संसार के समस्त तीर्थों में स्नान कर लिया है।",
      "attribution": "एकनाथी भागवत, ११.२९"
    }
  },
  {
    "id": "maitreyi",
    "name": "Brahmavadini Maitreyi",
    "nameLocal": "ब्रह्मवादिनी मैत्रेयी",
    "era": "Vedic Upanishadic Era",
    "eraLocal": "वैदिक उपनिषद् काल",
    "tradition": "hindu",
    "region": "Mithila (Videha Kingdom)",
    "regionLocal": "मिथिला (विदेह राज्य)",
    "emoji": "🪔",
    "tagline": "The Vedic philosopher-sage of the Brihadaranyaka Upanishad who rejected imperial wealth and gold, asking: 'What shall I do with that which cannot make me immortal?'",
    "taglineLocal": "बृहदारण्यक उपनिषद् की प्रखर ब्रह्मवादिनी जिन्होंने समस्त धन-संपदा को ठुकरा कर पूछा—'जिससे मुझे अमृतत्व न मिले, उसका मैं क्या करूँ?'",
    "journey": "Living during the golden philosophical epoch of the Videha Kingdom under the righteous King Janaka, Maitreyi was revered as one of the preeminent Brahmavadinis—female seers of the Rigvedic tradition who dedicated their lives to the contemplation and realization of Brahman. She was married to the legendary sage Maharishi Yajnavalkya, the supreme master of the Shukla Yajurveda. While Yajnavalkya’s second wife, Katyayani, was naturally inclined toward the domestic duties of home and agrarian estate, Maitreyi was renowned as an intellectual titan whose mind soared constantly in the transcendent realms of metaphysics, the nature of the self, and the mystery of cosmic reality.\n\nWhen Yajnavalkya reached the twilight of his earthly householder life and resolved to renounce all worldly ties to enter the fourth stage of life—the homelessness of the Sannyasin—he summoned Maitreyi and Katyayani to divide his vast wealth, comprising thousands of dairy cows, gold coins, landed estates, grain barns, and household treasures. Calling Maitreyi to his side, Yajnavalkya said: 'Beloved Maitreyi, I am departing from this house into the forest. Let me make a final settlement of all my wealth between you and Katyayani.'\n\nMaitreyi looked at her husband with piercing, unclouded philosophical vision and asked a historic question that reverberates through the millennia: 'My Lord, if this entire earth, filled to the brim with boundless gold, jewels, and imperial riches, were given to me, would I become immortal through it?' Yajnavalkya smiled gently and replied with absolute honesty: 'No, my dear. Your life would be like the life of the wealthy, full of physical conveniences; but through material wealth, there is no hope of immortality whatsoever.'\n\nHearing these words, Maitreyi uttered her immortal declaration: 'Yenaaham na amrita syaam, kim aham tena kuryaam?'—'What shall I do with that which cannot make me immortal? Whatever you know, my Lord, of the secret path to the Deathless, tell me that alone!' Overjoyed by her profound dispassion, Yajnavalkya sat beside her and delivered the celebrated discourse of the *Brihadaranyaka Upanishad*, revealing the sublime truth of the Atman: 'Verily, not for the sake of the husband is the husband dear, but for the sake of the Self (Atman) is the husband dear. Not for the sake of the wife is the wife dear, but for the sake of the Self is the wife dear... The Self alone is to be seen, heard, reflected upon, and deeply meditated upon; for when the Self is known, all this universe is known.'",
    "journeyLocal": "राजा जनक की पावन नगरी मिथिला में जन्मी मैत्रेयी वैदिक काल की महानतम ब्रह्मवादिनी ऋषिका थीं। वे महर्षि याज्ञवल्क्य की विदुषी पत्नी थीं। जहां उनकी दूसरी पत्नी कात्यायनी गृहस्थ-कार्यों में कुशल थीं, वहीं मैत्रेयी का चित्त निरंतर ब्रह्म-विद्या और आत्मा के गूढ़ रहस्यों के चिंतन में लीन रहता था।\n\nजब महर्षि याज्ञवल्क्य ने गृहस्थ जीवन का त्याग कर वन में संन्यास लेने का निर्णय किया, तो उन्होंने अपनी समस्त संपत्ति—सहस्रों गाएं, स्वर्ण और भूमि—का दोनों पत्नियों में बंटवारा करने का प्रस्ताव रखा। उन्होंने मैत्रेयी से कहा कि वे अपना हिस्सा लेकर सुखपूर्वक रहें।\n\nमैत्रेयी ने उस समय वह ऐतिहासिक प्रश्न पूछा जिसने भारतीय दर्शन की दिशा बदल दी—'भगवन्! यदि यह संपूर्ण पृथ्वी धन और सुवर्ण से परिपूर्ण होकर मुझे मिल जाए, तो क्या उससे मैं अमर हो जाऊंगी?' याज्ञवल्क्य ने उत्तर दिया—'नहीं, तुम्हारा जीवन भी धनवानों जैसा साधन-संपन्न तो हो जाएगा, परंतु धन से अमरता की कोई आशा नहीं है।'\n\nयह सुनते ही मैत्रेयी ने समस्त धन-संपदा को एक तिनके के समान ठुकराते हुए कहा—'येनाहं नामृता स्यां किमहं तेन कुर्याम्?' (जिससे मुझे अमरता न मिले, उस धन का मैं क्या करूँ? आप मुझे वही ज्ञान दीजिए जिससे मुक्ति प्राप्त हो)। उनकी इस निष्काम पिपासा से गद्गद होकर याज्ञवल्क्य ने उन्हें 'बृहदारण्यक उपनिषद्' का वह अमर उपदेश दिया—'न वा अरे पत्युः कामाय पतिः प्रियो भवति, आत्मनस्तु कामाय पतिः प्रियो भवति...' (पति, पत्नी, संतान या धन स्वयं के लिए प्रिय नहीं होते, बल्कि आत्मा के लिए प्रिय होते हैं। आत्मा ही देखने योग्य, सुनने योग्य और ध्यान करने योग्य है)।",
    "trial": "Maitreyi’s supreme trial was turning down vast imperial wealth, land, and security at the moment of her husband's departure, choosing the austere, uncertain path of self-inquiry because her soul refused to compromise with transient worldly mirages.",
    "trialLocal": "सुरक्षा और विशाल धन-दौलत के प्रस्ताव को ठुकरा कर आत्म-ज्ञान के कठिन मार्ग को चुनना मैत्रेयी का महान त्याग था। उन्होंने यह सिद्ध किया कि एक विदुषी नारी के लिए भौतिक ऐश्वर्य नहीं, अपितु आत्म-साक्षात्कार ही जीवन का परम ध्येय है।",
    "teaching": "Material wealth and worldly possessions can provide physical comfort, but they can never grant immortality or freedom from grief. The true source of all love and value in the universe is the radiant, eternal Self (Atman); know the Self, and all is known.",
    "teachingLocal": "संसार का समस्त धन मिलकर भी मनुष्य को अमरता या वास्तविक शांति नहीं दे सकता। समस्त संबंधों और वस्तुओं का मूल आधार आत्मा ही है; आत्मा को जानना, सुनना और उसमें स्थित होना ही जीवन का सर्वोच्च कर्तव्य है।",
    "moral": "Do not waste your precious human life accumulating possessions that end with the grave. Direct your intellect toward that eternal truth which outlasts time, decay, and death.",
    "moralLocal": "उन नश्वर वस्तुओं के संग्रह में अपना जीवन व्यर्थ मत गंवाओ जो मृत्यु के साथ छूट जाने वाली हैं। अपनी ऊर्जा को उस अमर तत्व की खोज में लगाओ जो कभी नष्ट नहीं होता।",
    "legacy": "Maitreyi stands in global philosophical history as the shining symbol of female intellectual and spiritual sovereignty, proving that the highest peaks of Vedic Upanishadic wisdom were scaled by women.",
    "legacyLocal": "मैत्रेयी वैदिक दर्शन में नारी प्रज्ञा और वैराग्य का सर्वोच्च प्रतीक हैं। बृहदारण्यक उपनिषद् में उनका संवाद आज भी विश्व दर्शन में आत्म-अन्वेषण का सर्वोत्कृष्ट आख्यान माना जाता है।",
    "source": "Brihadaranyaka Upanishad (Yajnavalkya-Maitreyi Samvada)",
    "sourceLocal": "बृहदारण्यक उपनिषद् (याज्ञवल्क्य-मैत्रेयी संवाद)",
    "sourceCitations": [
      {
        "sourceName": "Brihadaranyaka Upanishad",
        "sourceRef": "Chapter 2, Brahmana 4 & Chapter 4, Brahmana 5",
        "tier": 1
      },
      {
        "sourceName": "Shatapatha Brahmana",
        "sourceRef": "Kanda XIV, Adhyaya 5, Discourse on the Atman",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Brahmavadini Maitreyi seated gracefully in a Vedic forest hermitage facing Maharishi Yajnavalkya, declining heaps of gold coins with tranquil, luminous detachment, her hand raised in philosophical inquiry.",
    "quote": {
      "text": "What shall I do with that which cannot make me immortal? Teach me, my Lord, that alone which leads to the Deathless.",
      "attribution": "Brihadaranyaka Upanishad, 2.4.3"
    },
    "quoteLocal": {
      "text": "येनाहं नामृता स्यां किमहं तेन कुर्याम्? यदेव भगवान् वेद तदेव मे ब्रूहि॥",
      "attribution": "बृहदारण्यक उपनिषद्, २.४.३"
    }
  },
  {
    "id": "markandeya",
    "name": "Rishi Markandeya",
    "nameLocal": "ऋषि मार्कण्डेय",
    "era": "Ancient Puranic Era",
    "eraLocal": "प्राचीन पौराणिक काल",
    "tradition": "hindu",
    "region": "Bhrigu Ashrama / Coastal Saurashtra",
    "regionLocal": "भृगु आश्रम / सौराष्ट्र तट",
    "emoji": "🔱",
    "tagline": "The boy-sage whose unshakeable surrender to Mahadeva defeated Yamaraja's death-noose at age sixteen, blessed to witness cosmic dissolution and author the Devi Mahatmya.",
    "taglineLocal": "बाल-ऋषि जिनकी शिव-भक्ति ने यमराज के मृत्यु-पाश को भी निष्फल कर दिया, जिन्हें १६ वर्ष की अमरता मिली और जिन्होंने 'दुर्गा सप्तशती' की रचना की।",
    "journey": "Born as the miraculous son of Rishi Mrikandu and his virtuous wife Marudvati through severe austerities to Lord Shiva, Markandeya was granted under a solemn celestial covenant. Shiva offered Mrikandu a choice: 'Will you have a dull, wicked son who will live for a hundred years, or an exceptionally radiant, virtuous, and wise son who will live for only sixteen years?' Without hesitation, the parents chose the radiant son endowed with wisdom. From early childhood, Markandeya was bathed in Vedic study, humility, and sweet devotion to Mahadeva, growing into a youth of peerless purity. As his sixteenth birthday approached, noticing his parents weeping in secret anguish, Markandeya gently asked the reason for their grief. Upon learning of his destined short lifespan, he embraced his parents with fearless serenity, assuring them that destiny itself must bow before the feet of the Lord of Time (Kalantaka).\n\nMarkandeya retired to the seashore, consecrated a sacred clay Shiva Lingam upon the sand, and entered into unbroken meditative absorption, chanting the sacred Mahamrityunjaya mantra and the panchakshara mantra ('Om Namah Shivaya'). When the fateful moment arrived, Yamaraja, the Lord of Death, arrived personally riding his dark buffalo, bearing his dreaded death-noose (Yama-pasha). The celestial emissaries of Yama could not approach the boy due to the blazing fire of his devotion. Yamaraja stepped forward, cast his black noose, and looped it around the boy’s neck. As the cold noose tightened, Markandeya did not panic or flee; he threw both arms around the sacred Shiva Lingam in absolute surrender, crying out: 'O Mahadeva! O Refuge of the helpless!'\n\nInstantly, the stone Lingam split open with a thunderous roar. Out stepped Lord Shiva as Kalantaka—the Destroyer of Death Himself. With his third eye blazing, Mahadeva struck Yamaraja with his trident (Trishula) and planted his foot upon Death’s chest, protecting the helpless child. Yamaraja fell prostrate, begging for mercy and acknowledging the supreme sovereignty of devotion. Shiva restored Yamaraja and blessed the boy Markandeya: 'You shall forever remain sixteen years of age, unaffected by old age, disease, and death (Chiranjivi)!' Markandeya lived across countless cosmic dissolutions (Mahapralaya), beholding the divine child Krishna floating upon a banyan leaf (Vatapatrasayi) sucking his toe amidst the waters of deluge, and later composed the immortal *Markandeya Purana*, containing the foundational scripture of the Divine Mother—the *Devi Mahatmya* (Durga Saptashati).",
    "journeyLocal": "ऋषि मृकण्डु और मरुद्वती ने पुत्र प्राप्ति हेतु भगवान शिव की कठोर तपस्या की। शिवजी ने प्रकट होकर वरदान दिया—'तुम्हें सौ वर्ष जीने वाला मूर्ख पुत्र चाहिए अथवा मात्र सोलह वर्ष की आयु वाला परम ज्ञानी और पुण्यात्मा पुत्र?' माता-पिता ने सोलह वर्ष के ज्ञानी पुत्र को चुना और बालक मार्कण्डेय का जन्म हुआ। मार्कण्डेय बाल्यकाल से ही अत्यंत तेजस्वी और शिव-भक्ति में लीन रहते थे। जब सोलहवां वर्ष समीप आया और माता-पिता को रोते देखा, तो मार्कण्डेय ने कहा—'आप चिंता न करें, काल के स्वामी महाकाल के चरणों में मृत्यु भी नतमस्तक होती है।'\n\nवे समुद्र तट पर शिवलिंग की स्थापना कर 'महामृत्युंजय मंत्र' और 'ॐ नमः शिवाय' का अखंड जाप करने लगे। नियत समय पर यमराज स्वयं अपने भैंसे पर सवार होकर काल-पाश लेकर आए। मार्कण्डेय के तपोबल के कारण यमदूत उनके पास न जा सके। तब यमराज ने स्वयं अपना भयानक पाश फेंका, जो बालक के गले के साथ शिवलिंग पर भी जा गिरा। बालक मार्कण्डेय ने दोनों भुजाओं से शिवलिंग को कसकर पकड़ लिया और पुकारा—'हे देवाधिदेव महादेव! रक्षा करो!'\n\nउसी क्षण शिवलिंग से प्रचंड गर्जना के साथ महाकाल प्रकट हो गए। उन्होंने यमराज की छाती पर त्रिशूल से प्रहार किया और मृत्यु को परास्त कर दिया। यमराज ने थर-थर कांपते हुए क्षमा मांगी। भगवान शिव ने प्रसन्न होकर बालक मार्कण्डेय को वरदान दिया—'तुम सदा सोलह वर्ष के ही रहोगे, काल और मृत्यु का तुम पर कभी कोई प्रभाव नहीं पड़ेगा।' मार्कण्डेय अमर (चिरंजीवी) हो गए। उन्होंने महाप्रलय के जल में वटपत्र पर शयन करते हुए बाल-मुकुंद के दर्शन किए और आगे चलकर 'मार्कण्डेय पुराण' व 'दुर्गा सप्तशती' की रचना की।",
    "trial": "Markandeya faced the terrifying physical presence of Yamaraja and the suffocating noose of Death at the tender age of sixteen, conquering the instinctual mortal terror of demise by throwing his entire being into unconditional surrender at the feet of Shiva.",
    "trialLocal": "सोलह वर्ष की सुकुमार आयु में साक्षात यमराज के मृत्यु-पाश का सामना करना और भयभीत हुए बिना केवल भगवान शिव के शिवलिंग को अपनी शरण बना लेना मार्कण्डेय की अगाध निष्ठा की अंतिम परीक्षा थी।",
    "teaching": "Death, fear, and karmic destiny have dominion only over the physical body and the ego. When the soul surrenders completely to the Divine, identifying with the immortal Supreme Consciousness, Death itself is conquered.",
    "teachingLocal": "मृत्यु और भय केवल शरीर और अहंकार को ही डरा सकते हैं। जब आत्मा स्वयं को अमर परमात्मा के चरणों में समर्पित कर देती है, तो मृत्यु का पाश भी मुक्ति का साधन बन जाता है। सच्ची भक्ति काल को भी जीत लेती है।",
    "moral": "Do not fear the brevity of life or the inevitability of physical mortality. A single moment lived in pure, courageous devotion to truth is worth more than a century of fearful, selfish existence.",
    "moralLocal": "जीवन के वर्षों की गिनती से अधिक जीवन की गहराई महत्वपूर्ण है। भय और स्वार्थ में सौ वर्ष जीने से श्रेष्ठ है कि मनुष्य सत्य और परमात्मा के प्रेम में निर्भय होकर जीवन जिए।",
    "legacy": "Rishi Markandeya's supreme triumph over Death is celebrated as the origin of the Mahamrityunjaya victory. His compositions, particularly the *Devi Mahatmya*, form the liturgical heart of Navratri and Shakti worship across the Hindu world.",
    "legacyLocal": "मार्कण्डेय ऋषि की साधना ने विश्व को मृत्युंजय चेतना का वरदान दिया। उनके द्वारा रचित 'दुर्गा सप्तशती' आज भी भारत भर में शक्ति-उपासना और नवरात्रि का सर्वोच्च प्राणवान ग्रंथ है।",
    "source": "Markandeya Purana & Shiva Purana (Rudra Samhita)",
    "sourceLocal": "मार्कण्डेय पुराण एवं शिव पुराण (रुद्र संहिता)",
    "sourceCitations": [
      {
        "sourceName": "Shiva Purana",
        "sourceRef": "Rudra Samhita, Yuddha Khanda: Deliverance of Markandeya",
        "tier": 1
      },
      {
        "sourceName": "Markandeya Purana",
        "sourceRef": "Devi Mahatmya (Durga Saptashati), Chapters 1–13",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Sixteen-year-old Markandeya tightly embracing a glowing stone Shiva Lingam with tears of pure devotion, as Lord Shiva with trident and crescent moon steps out from the fractured stone, holding back the shadowed figure of Yamaraja.",
    "quote": {
      "text": "We worship the Three-Eyed Lord Shiva, the fragrant nourisher of all beings; may He liberate us from death unto immortality, even as a ripe cucumber falls severed from its vine.",
      "attribution": "Rigveda, 7.59.12 (Mahamrityunjaya Mantra)"
    },
    "quoteLocal": {
      "text": "त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्। उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्॥",
      "attribution": "ऋग्वेद, ७.५९.१२ (महामृत्युंजय मंत्र)"
    }
  },
  {
    "id": "sister-nivedita",
    "name": "Sister Nivedita (Margaret Noble)",
    "nameLocal": "भगिनी निवेदिता (मार्गरेट नोबल)",
    "era": "1867–1911 CE",
    "eraLocal": "१८६७-१९११ ईस्वी",
    "tradition": "hindu",
    "region": "Ballymena (Ireland) / Kolkata (Bengal)",
    "regionLocal": "आयरलैंड / कोलकाता (बंगाल)",
    "emoji": "⚡",
    "tagline": "The Irish lioness and foremost disciple of Swami Vivekananda who dedicated her entire life, intellect, and breath to the spiritual upliftment and freedom of Mother India.",
    "taglineLocal": "स्वामी विवेकानंद की प्रखर शिष्या, जिन्होंने भारत को अपनी माता मानकर अपना सर्वस्व देश की स्वतंत्रता, नारी शिक्षा और पीड़ितों की सेवा में समर्पित कर दिया।",
    "journey": "Born as Margaret Elizabeth Noble in County Tyrone, Ireland, she was an exceptionally brilliant educator and intellectual who ran an innovative school in London. In November 1895, in a quiet London drawing room, she first heard Swami Vivekananda speak. Captivated by his towering personality, fearless reason, and the oceanic breadth of Vedanta philosophy, she spent months questioning, debating, and testing every concept. Recognizing her lion-like courage, Vivekananda challenged her: 'India cannot yet produce great women, she must borrow them from other nations. Her culture, her history, her women need a voice. I will stand by you unto death, whether you work for India or not, whether you die for her or not.' Accepting the call of her spiritual destiny, Margaret sailed to Kolkata in January 1898.\n\nOn March 25, 1898, Vivekananda initiated her into the vows of Brahmacharya, giving her the sacred spiritual name Nivedita—'The Dedicated One'—consecrating her life as an offering to God and Mother India. She took up residence in a modest mud-and-brick house in the conservative, orthodox neighborhood of Bagbazar in North Kolkata. There, she established a revolutionary school for impoverished Indian girls and young widows, teaching them literacy, science, needlework, and patriotic pride. When the horrific bubonic plague epidemic devastated Kolkata in 1899, while citizens and British officials fled in terror, Sister Nivedita formed a relief squad of youths, personally cleaning filthy open sewers with broom and basket, disinfecting infected slums, and nursing dying, vomiting plague patients in her own lap with boundless maternal tenderness.\n\nFollowing Vivekananda’s Mahasamadhi in 1902, Nivedita threw herself into the storm of India’s freedom struggle. Resigning from the formal monastic committee of the Ramakrishna Math to protect the monastery from British sedition laws, she became the fiery muse of Indian nationalism. She financially supported scientists like Jagadish Chandra Bose when the colonial administration denied him research facilities, inspired artists like Abanindranath Tagore to create indigenous Indian art, and secretly guided young revolutionaries like Aurobindo Ghosh and Bagha Jatin. Exhausting her physical health through relentless labor, writing, and famine relief in Bengal, she passed away in Darjeeling at the young age of forty-three, whispering her final words: 'The boat is sinking, but I shall yet see the sunrise.'",
    "journeyLocal": "आयरलैंड में जन्मी मार्गरेट नोबल लंदन की एक अत्यंत मेधावी और प्रतिष्ठित शिक्षिका थीं। १८९५ में लंदन में जब उन्होंने पहली बार स्वामी विवेकानंद के विचार सुने, तो वेदांत के सार्वभौमिक दर्शन ने उनके हृदय को झकझोर दिया। स्वामी जी ने उनकी असाधारण योग्यता देखकर उनसे कहा—'भारत को तुम्हारी आवश्यकता है। यदि तुम भारत के लिए कार्य करोगी, तो मैं मृत्यु पर्यंत तुम्हारे साथ खड़ा रहूंगा।' गुरु के आह्वान पर मार्गरेट अपना सुखद जीवन छोड़कर १८९८ में कोलकाता आ गईं।\n\nस्वामी विवेकानंद ने उन्हें ब्रह्मचर्य की दीक्षा देकर नाम दिया 'निवेदिता'—अर्थात जो पूर्णतः समर्पित हो चुकी है। वे उत्तर कोलकाता के बागबाजार में एक साधारण मकान में रहीं और भारतीय बालिकाओं व बाल-विधवाओं के लिए एक क्रांतिकारी विद्यालय प्रारंभ किया। १८९९ में जब कोलकाता में प्लेग की भयानक महामारी फैली और लोग डरकर भाग रहे थे, तब भगिनी निवेदिता ने अपनी जान जोखिम में डालकर स्वयं झाड़ू उठाकर गंदी नालियों को साफ किया और प्लेग से तड़पते हुए रोगियों को अपनी गोद में रखकर उनकी सेवा की।\n\n१९०२ में स्वामी जी के महासमाधि के पश्चात उन्होंने भारत के स्वाधीनता संग्राम में अपना जीवन झोंक दिया। उन्होंने जगदीश चंद्र बोस जैसे भारतीय वैज्ञानिकों को ब्रिटिश भेदभाव से बचाकर शोध कार्य में सहयोग दिया, अवनींद्रनाथ टैगोर को भारतीय कला के पुनरुत्थान हेतु प्रेरित किया और महर्षि अरविंद जैसे क्रांतिकारियों का मार्गदर्शन किया। बंगाल के अकाल और बाढ़ में सेवा करते हुए उनका स्वास्थ्य बिगड़ गया और मात्र तैंतालीस वर्ष की आयु में दार्जिलिंग में उनका देहावसान हुआ। उनकी समाधि पर लिखा है—'यहाँ भगिनी निवेदिता विश्राम कर रही हैं, जिन्होंने अपना सर्वस्व भारत को अर्पित कर दिया।'",
    "trial": "Sister Nivedita endured the harsh colonial tropical climate, malicious harassment from British intelligence police who tracked her every move, the crushing loneliness of living as an alien woman in orthodox 19th-century Calcutta, and personal exhaustion during the bubonic plague, offering her life as an unreserved oblation.",
    "trialLocal": "एक विदेशी महिला होकर १९वीं सदी के रूढ़िवादी समाज में स्वयं को ढालना, ब्रिटिश गुप्तचरों के उत्पीड़न को सहना और प्लेग जैसी जानलेवा महामारी के बीच दिन-रात मल-मूत्र साफ कर रोगियों की सेवा करना उनकी निष्काम साधना की अग्निपरीक्षा थी।",
    "teaching": "True love for a nation is not empty rhetoric, but dedicated service to its humblest citizens. Educate women, cherish your indigenous culture with fierce dignity, and see the Divine Mother pulsating in the soul of your motherland.",
    "teachingLocal": "देश-प्रेम केवल नारों में नहीं, बल्कि उसके दीन-हीन नागरिकों की सेवा में है। जब तक देश की नारी शिक्षित और सशक्त नहीं होगी, तब तक कोई राष्ट्र महान नहीं बन सकता। अपनी संस्कृति और स्वाभिमान की रक्षा के लिए सर्वस्व न्योछावर कर देना ही सच्ची साधना है।",
    "moral": "Spiritual dedication knows no barriers of race, nationality, or birth. When an individual offers their heart with pure, unconditional love to a noble cause, their sacrifice becomes an eternal beacon of inspiration.",
    "moralLocal": "सच्चे समर्पण के लिए जन्म या देश की सीमाएं कोई मायने नहीं रखतीं। यदि तुम्हारा हृदय पवित्र है, तो तुम किसी भी पराई भूमि को अपनी मां बनाकर उसके चरणों में अपना जीवन सार्थक कर सकते हो।",
    "legacy": "Sister Nivedita is remembered as the 'Lokamata' (Mother of the People) in Bengal. Her school in Kolkata still educates thousands of girls, and her pioneering designs for India's national flag featuring Indra’s thunderbolt (Vajra) symbolized the power of supreme self-sacrifice.",
    "legacyLocal": "रवींद्रनाथ टैगोर ने उन्हें 'लोकमता' कहा। उनके द्वारा स्थापित विद्यालय आज भी चल रहा है। उन्होंने भारत के राष्ट्रीय ध्वज के लिए 'वज्र' का प्रतीक सुझाया था, जो दधीचि के महात्याग और आत्म-बलिदान की अमर शक्ति का प्रतीक है।",
    "source": "The Master as I Saw Him & The Web of Indian Life (Sister Nivedita)",
    "sourceLocal": "द मास्टर ऐज आई सॉ हिम एवं द वेब ऑफ इंडियन लाइफ (भगिनी निवेदिता)",
    "sourceCitations": [
      {
        "sourceName": "The Master as I Saw Him",
        "sourceRef": "Chapter 1, The Inception of the Work in England",
        "tier": 1
      },
      {
        "sourceName": "Sister Nivedita of Ramakrishna-Vivekananda (Pravrajika Atmaprana)",
        "sourceRef": "Chapter 7, The Plague and the Dedication",
        "tier": 2
      }
    ],
    "illustrationPrompt": "Sister Nivedita in simple flowing white robes with rudraksha beads walking through the narrow rain-slicked alleys of Bagbazar during the plague, holding a lamp and medicine basket to nurse an impoverished child.",
    "quote": {
      "text": "The whole of India is our motherland; her service is our religion; her freedom is our prayer. Let us offer our lives like fragrant flowers at her feet.",
      "attribution": "Sister Nivedita's Call to Youth"
    },
    "quoteLocal": {
      "text": "संपूर्ण भारत हमारी मातृभूमि है; उसकी सेवा ही हमारा धर्म है; उसकी स्वतंत्रता ही हमारी प्रार्थना है। आओ, हम अपने जीवन को उसके चरणों में सुगंधित पुष्पों की भांति अर्पित कर दें।",
      "attribution": "भगिनी निवेदिता का आह्वान"
    }
  },
  {
    "id": "vyasa",
    "name": "Maharishi Veda Vyasa",
    "nameLocal": "महर्षि वेदव्यास (कृष्ण द्वैपायन)",
    "era": "Dwapara Yuga / Treta Transition",
    "eraLocal": "द्वापर युग / महाभारत काल",
    "tradition": "hindu",
    "region": "Kalpi / Kurukshetra / Badrinath",
    "regionLocal": "कालपी / कुरुक्षेत्र / बद्रीनाथ",
    "emoji": "📜",
    "tagline": "The immortal Adi-Guru who organized the singular Veda into four, composed the colossal 100,000-verse Mahabharata, and gifted humanity the Bhagavata Purana.",
    "taglineLocal": "सनातन संस्कृति के आदि-गुरु, जिन्होंने एक वेद को चार भागों में विभक्त किया, महाभारत महाकाव्य रचा और 'श्रीमद्भागवत' के माध्यम से भक्ति का अमृत दिया।",
    "journey": "Born on an island in the Yamuna river to the great sage Parashara and the fisherwoman Satyavati (Matsyagandha), he was named Krishna Dvaipayana because of his dark complexion (Krishna) and his birthplace on an island (Dvaipa). Recognizing that as human civilization progressed into the spiritual degeneration of Kali Yuga, the intellectual capacity and lifespan of human beings would decline drastically, making it impossible for seekers to master the vast, unfragmented cosmic ocean of Vedic revelation, Vyasa undertook a monumental intellectual and spiritual organization. He divided the single eternal Veda into four distinct, coherent samhitas: Rigveda, Yajurveda, Samaveda, and Atharvaveda, entrusting each collection to his foremost disciples Paila, Vaishampayana, Jaimini, and Sumantu, earning the timeless title 'Veda Vyasa'—the Editor and Organizer of the Vedas.\n\nYet his literary and spiritual genius did not stop with Vedic preservation. Knowing that abstract ritual and metaphysical hymns would remain inaccessible to ordinary householders, farmers, and women, Vyasa composed the Fifth Veda—the colossal epic *Mahabharata*, consisting of one hundred thousand verses (Shatasahasri Samhita). Enlisting Lord Ganesha as his divine scribe under the mutual covenant that Ganesha would write without pause while Vyasa would dictate verses so deep that Ganesha would have to pause to comprehend them, Vyasa wove the encyclopedic tapestry of Indian civilization, embedding the crown jewel of world spiritual philosophy—the *Srimad Bhagavad Gita*—at its sacred center. He also authored the foundational *Brahma Sutras* (Vedanta Sutras), synthesizing the contradictory passages of the Upanishads into an indestructible edifice of non-dual philosophy.\n\nDespite having completed this superhuman labor of literature and philosophy, Vyasa sat despondent and sorrowful on the banks of the Saraswati River at Badarikashrama, feeling an unexplainable void and unrest in his soul. At that moment, the celestial sage Devarshi Narada arrived and revealed the subtle defect: 'O Vyasa, you have written of duty, war, politics, ritual, and philosophy; but you have not yet sung exclusively of the unconditioned love, beauty, and sublime sweetness of the Supreme Personality of Godhead, Lord Sri Krishna!' Awakened by Narada's guidance, Vyasa entered deep Samadhi and composed the twelve cantos of the *Srimad Bhagavata Purana*, pouring out the nectar of pure divine love (Prema Bhakti) and attaining absolute spiritual fulfillment before teaching it to his liberated son, Shukadeva.",
    "journeyLocal": "यमुना के एक द्वीप पर महर्षि पराशर और सत्यवती के पुत्र के रूप में जन्मे कृष्ण द्वैपायन को साक्षात भगवान नारायण का साहित्यिक अवतार माना जाता है। उन्होंने देखा कि कलियुग के आगमन के साथ मनुष्यों की आयु, स्मृति और बुद्धि क्षीण हो जाएगी और वे एक विशाल वेद को धारण नहीं कर सकेंगे। अतः उन्होंने कृपापूर्वक उस आदि-वेद को चार भागों में विभक्त किया—ऋग्वेद, यजुर्वेद, सामवेद और अथर्ववेद। इस युगांतरकारी कार्य के कारण उन्हें 'वेदव्यास' की उपाधि प्राप्त हुई।\n\nसामान्य जन, स्त्रियों और श्रमजीवियों तक ज्ञान पहुँचाने के लिए उन्होंने 'पंचम वेद' के रूप में एक लाख श्लोकों वाले महाग्रंथ 'महाभारत' की रचना की। भगवान श्रीगणेश उनके लेखक बने। महाभारत के भीतर ही उन्होंने भगवान श्री कृष्ण द्वारा अर्जुन को दिए गए अमर उपदेश 'श्रीमद्भगवद्गीता' को संकलित किया। इसके अतिरिक्त उन्होंने समस्त उपनिषदों के सार रूप में 'ब्रह्मसूत्र' की रचना की, जो भारतीय दर्शन का सर्वोच्च प्रमाण-ग्रंथ बना।\n\nपरंतु इतना विशाल साहित्य रचने के बाद भी जब वे सरस्वती नदी के तट पर उदास और अशांत बैठे थे, तब देवर्षि नारद ने उन्हें बताया—'हे व्यास! आपने धर्म, अर्थ, काम और मोक्ष का विस्तार से वर्णन किया, परंतु भगवान श्री कृष्ण के पावन प्रेम और उनकी विशुद्ध भक्ति का विशद गान नहीं किया; इसीलिए आपका चित्त अशांत है।' नारद जी की प्रेरणा से व्यास जी ने समाधिस्थ होकर अठारह हजार श्लोकों वाले 'श्रीमद्भागवत महापुराण' की रचना की, जिसमें प्रेम-भक्ति की रसधार प्रवाहित कर उन्होंने परम तृप्ति प्राप्त की और यह ज्ञान अपने आत्मज्ञानी पुत्र शुकदेव जी को प्रदान किया।",
    "trial": "Vyasa endured the heart-wrenching tragedy of watching his own descendants—the Kauravas and Pandavas—destroy themselves in the catastrophic fratricidal war of Kurukshetra. As both an eyewitness and chronicler of civilizational collapse, he bore the profound grief of holding up the mirror of Dharma to a dying age without succumbing to despair.",
    "trialLocal": "व्यास जी की सबसे बड़ी परीक्षा कुरुक्षेत्र के महाविनाश को अपनी आंखों से देखना था। अपने ही कुल के विनाश के साक्षी होकर भी उन्होंने सत्य और धर्म का पक्ष कभी नहीं छोड़ा और उस महात्रासदी को मानवता के लिए एक अमर नीति-काव्य में बदल दिया।",
    "teaching": "Dharma is eternal; pleasure and pain are transient. Listen to the essence of all religion: do not do unto others what you would find painful if done unto yourself. In just two half-verses, I state the essence of eighteen puranas: helping others is virtue; harming others is sin.",
    "teachingLocal": "धर्म शाश्वत है, सुख-दुख अनित्य हैं। अठारह पुराणों का सार केवल दो वचनों में समाहित है—दूसरों का उपकार करना ही सबसे बड़ा पुण्य है, और दूसरों को पीड़ा पहुँचाना ही सबसे बड़ा पाप है। जो व्यवहार तुम्हें स्वयं के लिए अप्रिय लगे, वह दूसरों के साथ कभी मत करो।",
    "moral": "Intellectual brilliance, philosophy, and worldly knowledge are incomplete without heart-centered devotion and selfless love. True wisdom finds its crown not in complex theories, but in pure kindness and surrender to the Divine.",
    "moralLocal": "बड़ी-बड़ी पोथियां और दर्शन तब तक अधूरे हैं जब तक अंतःकरण में भगवान के प्रति प्रेम और जीवों के प्रति दया न हो। विद्या का सच्चा फल परोपकार और अंतर्मुखी शांति है।",
    "legacy": "Maharishi Vyasa is celebrated as the Adi-Guru of Sanatana Dharma, commemorated every year on the full moon of Ashadha as Guru Purnima (Vyasa Purnima). His Mahabharata, Gita, Puranas, and Brahma Sutras constitute the spiritual backbone of Indian culture.",
    "legacyLocal": "व्यास जी सनातन संस्कृति के गुरुओं के गुरु हैं। आषाढ़ पूर्णिमा को उनके सम्मान में 'गुरु पूर्णिमा' (व्यास पूर्णिमा) के रूप में मनाया जाता है। उनके द्वारा रचित साहित्य आज भी भारतीय चिंतन और आस्था का प्राण है।",
    "source": "Mahabharata (Svargarohana Parva) & Srimad Bhagavata Purana",
    "sourceLocal": "महाभारत (स्वर्गारोहण पर्व) एवं श्रीमद्भागवत महापुराण",
    "sourceCitations": [
      {
        "sourceName": "Mahabharata",
        "sourceRef": "Svargarohana Parva 5, Verses 49–51 (Bharata Savitri)",
        "tier": 1
      },
      {
        "sourceName": "Srimad Bhagavata Purana",
        "sourceRef": "Skandha 1, Adhyayas 4–7, The Conversation of Vyasa and Narada",
        "tier": 1
      }
    ],
    "illustrationPrompt": "Venerable Maharishi Veda Vyasa with long flowing grey beard and ascetic matted locks, dictating verses in a sacred mountain cave in Badrinath while Lord Ganesha sits writing with his broken tusk on palm leaves.",
    "quote": {
      "text": "In just two half-verses I proclaim that which has been stated in millions of scriptures: helping others is virtue; causing pain to others is sin.",
      "attribution": "Ashtadasha Purana Sara"
    },
    "quoteLocal": {
      "text": "श्लोकार्धेन प्रवक्ष्यामि यदुक्तं ग्रन्थकोटिभिः। परोपकारः पुण्याय पापाय परपीडनम्॥",
      "attribution": "अष्टादश पुराण सार"
    }
  }
];

// ── Tradition Metadata ─────────────────────────────────────────────────────

export const TRADITION_META: Record<string, { label: string; labelLocal: string; dharmVeerLocal: string; emoji: string; color: string }> = {
  hindu:    { label: 'Sanatan Dharma', labelLocal: 'सनातन धर्म', dharmVeerLocal: 'धर्म वीर', emoji: '🪷', color: 'rgba(255, 120, 0, 0.12)' },
  sikh:     { label: 'Sikhi',          labelLocal: 'ਸਿੱਖੀ',     dharmVeerLocal: 'ਧਰਮ ਵੀਰ', emoji: '☬', color: 'rgba(0, 100, 255, 0.12)' },
  buddhist: { label: 'Buddha Dhamma',  labelLocal: 'बुद्ध धम्म', dharmVeerLocal: 'धर्म वीर', emoji: '☸️', color: 'rgba(255, 200, 0, 0.12)' },
  jain:     { label: 'Jain Dharma',    labelLocal: 'जैन धर्म',   dharmVeerLocal: 'धर्म वीर', emoji: '🤲', color: 'rgba(0, 200, 50, 0.12)' },
  sufi:     { label: 'Sufi Path',      labelLocal: 'सूफ़ी मार्ग', dharmVeerLocal: 'धर्म वीर', emoji: '🕊️', color: 'rgba(140, 90, 220, 0.12)' },
  tribal:   { label: 'Adivasi Wisdom', labelLocal: 'आदिवासी ज्ञान', dharmVeerLocal: 'धर्म वीर', emoji: '🌿', color: 'rgba(60, 160, 90, 0.12)' },
};

// ── Rotation logic ─────────────────────────────────────────────────────────

/**
 * Returns the Dharm Veer for today from a given roster. Changes every
 * calendar day. Tradition-aware: shuffles same-tradition heroes higher in
 * the rotation.
 *
 * This is the SAME algorithm (epoch, IST offset, day-index, weighted pool)
 * as web's `selectDharmVeerOfTheDayFromRoster` in
 * `src/lib/dharm-veer-db.ts` — deliberately kept byte-for-byte equivalent
 * so native and web never disagree on "today's hero" for the same roster.
 *
 * Callers should pass the roster fetched from `GET /api/dharm-veer/roster`
 * (the canonical, DB-backed source). `DHARM_VEERS` below is a 12-hero local
 * fixture kept only as a last-resort, explicitly-opted-into fallback — it is
 * intentionally NOT the default `roster` here, so a caller can't silently
 * end up back on stale local content without asking for it by name.
 */
export function selectDharmVeerOfTheDayFromRoster(
  roster: DharmVeer[],
  userTradition?: string | null
): DharmVeer {
  const effectiveRoster = roster.length > 0 ? roster : DHARM_VEERS;

  const epoch = new Date('2024-01-01').getTime();
  const now   = new Date();
  // Use spiritual date (midnight IST offset) so it changes consistently
  const ist   = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const dayN  = Math.floor((ist.getTime() - epoch) / (1000 * 60 * 60 * 24));
  const slot  = dayN; // one hero per day

  if (!userTradition) {
    return effectiveRoster[slot % effectiveRoster.length];
  }

  // Build a weighted pool: same-tradition heroes appear twice, others once.
  // This ensures variety — never stuck cycling only 8 (or 1) heroes.
  const same  = effectiveRoster.filter(h => h.tradition === userTradition);
  const other = effectiveRoster.filter(h => h.tradition !== userTradition);
  const pool  = [...same, ...same, ...other]; // tradition heroes weighted 2×

  return (pool.length > 0 ? pool : effectiveRoster)[slot % (pool.length > 0 ? pool.length : effectiveRoster.length)];
}

/**
 * @deprecated Local-fixture-only rotation. Kept only for reference / true
 * offline fallback callers that have explicitly decided to accept stale,
 * non-canonical content. New code should fetch the roster from
 * `GET /api/dharm-veer/roster` and call `selectDharmVeerOfTheDayFromRoster`
 * instead — see `app/dharm-veer.tsx`.
 */
export function getDharmVeerOfTheDay(userTradition?: string | null): DharmVeer {
  return selectDharmVeerOfTheDayFromRoster(DHARM_VEERS, userTradition);
}

// ── Client-side Rotation logic ─────────────────────────────────────────────

/**
 * Pure function to select a Dharm Veer for the user based on history and tradition.
 * Implements a no-repeat window (default 14) and tradition-awareness.
 */
export function selectDharmVeer({
  userTradition,
  historyIds,
  roster,
  festivalTags = [],
  noRepeatWindow = 14,
}: {
  userTradition?: string | null;
  historyIds: string[];
  roster: DharmVeer[];
  festivalTags?: string[];
  noRepeatWindow?: number;
}): DharmVeer {
  if (roster.length === 0) {
    throw new Error('selectDharmVeer requires a non-empty roster');
  }
  type TaggedDharmVeer = DharmVeer & { tags?: string[] };

  // 1. Separate heroes by tradition
  const sameTradition = roster.filter(h => h.tradition === userTradition);
  const otherTradition = roster.filter(h => h.tradition !== userTradition);

  // 2. Identify recently seen based on window
  const recentIds = new Set(historyIds.slice(-noRepeatWindow));

  // 3. Find candidates not seen recently
  const freshSame = sameTradition.filter(h => !recentIds.has(h.id));
  const freshOther = otherTradition.filter(h => !recentIds.has(h.id));

  // 4. Boost by festival/tags if provided
  if (festivalTags.length > 0) {
    const freshBoosted = [...freshSame, ...freshOther].find(h =>
      festivalTags.some(tag => (h as TaggedDharmVeer).tags?.includes(tag))
    );
    if (freshBoosted) return freshBoosted;
  }

  // 5. Prefer fresh same-tradition heroes
  if (freshSame.length > 0) {
    return freshSame[0]; // Could shuffle deterministically, but first available is fine for a stable roster
  }

  // 6. Occasional cross-tradition (if no fresh same-tradition)
  if (freshOther.length > 0) {
    return freshOther[0];
  }

  // 7. Graceful degradation: roster is exhausted (smaller than no-repeat window).
  // Pick the least recently shown item from their tradition (the one that appeared earliest in history)
  if (sameTradition.length > 0) {
    // Sort sameTradition by index in historyIds (lower index = older)
    // If not in history, index is -1, which shouldn't happen here since freshSame is empty
    const sortedByOldest = [...sameTradition].sort((a, b) => {
      const idxA = historyIds.indexOf(a.id);
      const idxB = historyIds.indexOf(b.id);
      return idxA - idxB;
    });
    return sortedByOldest[0];
  }

  // 8. Absolute fallback
  return roster[0];
}
