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
