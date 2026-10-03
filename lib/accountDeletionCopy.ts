import type { AppLanguage } from '@/lib/language-runtime';

// All user-facing copy for the account-deletion flow (sheet, Profile banner,
// startup restore prompt, Settings/Profile alerts), en/hi/pa, following the
// screen-local Record<AppLanguage, ...> convention (e.g. PUSH_STATUS_COPY).
//
// Every claim here must match what the backend actually does (Shoonaya):
// - push and routine in-app notifications stop while is_deleting is true
//   (push-server + notifications trigger); account/security notices still go
// - discovery (Mandali search, nearby, member profile) and leaderboards
//   (Shruti, monthly challenge) hide the profile
// - nothing is deleted for 30 days; streaks are NOT frozen
// - "turn off reminders" writes the reminder flags off with no timer
// - Kul has no leadership hand-over yet
// Hindi/Punjabi are first-pass translations pending native-speaker review.

type Bullet = { lead: string; text: string };

export type AccountDeletionCopy = {
  headerTag: string;
  dismiss: string;
  close: string;
  step1Title: (name: string) => string;
  step1Body: string;
  summaryUnavailable: string;
  stats: { streak: string; karma: string; seva: string; relics: string };
  streakValue: (days: number) => string;
  journalWarning: (count: number) => string;
  kulCreated: (names: string) => string;
  exportData: string;
  keepAccount: string;
  continueNext: string;
  continue: string;
  step2Title: string;
  step2Intro: string;
  todayTitle: string;
  todayBullets: Bullet[];
  graceTitle: string;
  graceBullets: Bullet[];
  step3Title: string;
  step3Intro: string;
  pauseTitle: string;
  pauseBody: string;
  reasonsTitle: string;
  otherPlaceholder: string;
  stay: string;
  proceedFinal: string;
  step4Title: string;
  step4Before: string;
  step4After: string;
  finalNote: string;
  scheduleButton: string;
  neverMind: string;
  pauseFailed: string;
  scheduleFailed: string;
  reasonLabels: Record<string, string>;

  bannerTitle: string;
  bannerBody: string;
  bannerPurgeOn: (date: string) => string;
  bannerDaysLeft: (days: number) => string;
  bannerCancel: string;
  cancelFailed: string;

  restoreTitle: string;
  restoreBody: (days: number | null) => string;
  restoreKeep: string;
  restoreAction: string;
  restoredTitle: string;
  restoredBody: string;
  restoreFailedTitle: string;
  restoreFailedHint: string;
  checkConnection: string;

  scheduledTitle: string;
  scheduledBody: string;
  scheduleFailedTitle: string;
  remindersOffTitle: string;
  remindersOffBody: string;
  cancelledTitle: string;
  cancelledBody: string;
  cancelFailedTitle: string;
  dangerZoneNote: string;
};

const en: AccountDeletionCopy = {
  headerTag: 'Account deletion',
  dismiss: 'Dismiss',
  close: 'Close',
  step1Title: (name) => (name ? `Before you go, ${name}` : 'Before you go'),
  step1Body: 'Your account holds your practice history, earned relics and journal reflections.',
  summaryUnavailable: "We couldn't load your practice summary right now. Your streaks, karma, relics and journal are all part of your account and would be removed after the 30-day grace period.",
  stats: { streak: 'Streak', karma: 'Karma', seva: 'Seva', relics: 'Relics' },
  streakValue: (days) => `${days}d`,
  journalWarning: (count) => `You have ${count} journal ${count === 1 ? 'reflection' : 'reflections'}. They are permanently removed when the 30-day grace period ends.`,
  kulCreated: (names) => `You created ${names}. Other members keep their own accounts, but let your family know before you go.`,
  exportData: 'Download my practice data (.json) first',
  keepAccount: 'Keep my account',
  continueNext: 'Continue',
  continue: 'Continue',
  step2Title: 'What happens next?',
  step2Intro: 'What changes today, and what happens after 30 days:',
  todayTitle: 'Starting today',
  todayBullets: [
    { lead: 'Reminders stop', text: 'Japa, Nitya, vrat, festival and community notifications stop. Notices about your account or its security can still reach you.' },
    { lead: 'Profile hidden', text: 'You no longer appear in Mandali discovery or on community leaderboards.' },
    { lead: 'Nothing deleted yet', text: 'Your practice history, journal and relics stay in your account for the 30 days.' },
  ],
  graceTitle: '30-day grace period',
  graceBullets: [
    { lead: 'Change your mind', text: 'Sign in and tap "Cancel deletion" on your Profile or in Settings to restore everything.' },
    { lead: 'After 30 days', text: 'Your account and personal records are permanently deleted.' },
  ],
  step3Title: 'Consider a quieter step',
  step3Intro: "If the reminders or a busy season are the problem, you don't need to delete your account:",
  pauseTitle: 'Turn off all reminders instead',
  pauseBody: 'They stay off until you turn them back on in Settings. Your streaks, journal and relics are untouched.',
  reasonsTitle: 'Why are you leaving? (Optional)',
  otherPlaceholder: 'Tell us what we can improve…',
  stay: "I'll stay",
  proceedFinal: 'Go to final confirmation',
  step4Title: 'Confirm account deletion',
  step4Before: 'To start your 30-day grace period, type ',
  step4After: ' below:',
  finalNote: 'You can cancel anytime in the next 30 days by signing in and tapping "Cancel deletion" on your Profile.',
  scheduleButton: 'Schedule account deletion',
  neverMind: 'Never mind, keep my account',
  pauseFailed: 'Could not turn off reminders. Please try again.',
  scheduleFailed: 'Could not schedule deletion. Please try again.',
  reasonLabels: {
    taking_break: 'Taking a temporary spiritual break',
    too_many_notifications: 'Too many notifications or reminders',
    privacy_concerns: 'Privacy or data concerns',
    not_useful: 'Not finding the practice features helpful',
    technical_issues: 'App performance or technical bugs',
    other: 'Other reason',
  },

  bannerTitle: 'Account deletion scheduled',
  bannerBody: 'Reminders are off and your profile is hidden from discovery and leaderboards. Nothing is deleted until the date below.',
  bannerPurgeOn: (date) => `Permanently deleted on ${date}`,
  bannerDaysLeft: (days) => ` (${days} ${days === 1 ? 'day' : 'days'} left)`,
  bannerCancel: 'Cancel deletion & restore account',
  cancelFailed: 'Could not cancel deletion.',

  restoreTitle: 'Account deletion scheduled',
  restoreBody: (days) => `Your account will be permanently deleted ${days === null ? 'soon' : `in ${days} ${days === 1 ? 'day' : 'days'}`}. Reminders are off until then. Restore your account now?`,
  restoreKeep: 'Keep deletion scheduled',
  restoreAction: 'Restore my account',
  restoredTitle: 'Account restored',
  restoredBody: 'Welcome back 🙏 Your account and practice history are safe. Reminders you had on will resume.',
  restoreFailedTitle: 'Could not restore your account',
  restoreFailedHint: 'You can also cancel from Settings or your Profile.',
  checkConnection: 'Check your connection and try again.',

  scheduledTitle: 'Deletion scheduled (30-day grace period)',
  scheduledBody: 'Reminders have stopped and your profile is hidden. Nothing is deleted for 30 days — you can cancel anytime from your Profile or this screen.',
  scheduleFailedTitle: 'Could not schedule deletion',
  remindersOffTitle: 'Reminders turned off',
  remindersOffBody: 'All reminders are off until you turn them back on here. Your streaks, journal and relics are untouched.',
  cancelledTitle: 'Deletion cancelled',
  cancelledBody: 'Welcome back 🙏 Your account and practice history are safe.',
  cancelFailedTitle: 'Could not cancel deletion',
  dangerZoneNote: 'Deleting starts a 30-day cancellable grace period. Reminders stop immediately; your data is permanently removed after 30 days unless you cancel first.',
};

const hi: AccountDeletionCopy = {
  headerTag: 'खाता हटाना',
  dismiss: 'बंद करें',
  close: 'बंद करें',
  step1Title: (name) => (name ? `जाने से पहले, ${name}` : 'जाने से पहले'),
  step1Body: 'आपके खाते में आपकी साधना का इतिहास, अर्जित अवशेष और जर्नल चिंतन सुरक्षित हैं।',
  summaryUnavailable: 'अभी आपकी साधना का सारांश लोड नहीं हो सका। आपकी स्ट्रीक, कर्म, अवशेष और जर्नल आपके खाते का हिस्सा हैं और 30 दिन की अवधि के बाद हटा दिए जाएँगे।',
  stats: { streak: 'स्ट्रीक', karma: 'कर्म', seva: 'सेवा', relics: 'अवशेष' },
  streakValue: (days) => `${days} दिन`,
  journalWarning: (count) => `आपके ${count} जर्नल चिंतन हैं। 30 दिन की अवधि पूरी होने पर ये स्थायी रूप से हटा दिए जाएँगे।`,
  kulCreated: (names) => `आपने ${names} बनाया है। अन्य सदस्यों के खाते बने रहेंगे, पर जाने से पहले अपने परिवार को बता दें।`,
  exportData: 'पहले मेरा साधना डेटा (.json) डाउनलोड करें',
  keepAccount: 'मेरा खाता रखें',
  continueNext: 'आगे बढ़ें',
  continue: 'आगे बढ़ें',
  step2Title: 'आगे क्या होगा?',
  step2Intro: 'आज से क्या बदलेगा, और 30 दिन बाद क्या होगा:',
  todayTitle: 'आज से',
  todayBullets: [
    { lead: 'रिमाइंडर बंद', text: 'जप, नित्य, व्रत, त्योहार और समुदाय की सूचनाएँ बंद हो जाएँगी। आपके खाते या उसकी सुरक्षा से जुड़ी सूचनाएँ फिर भी आ सकती हैं।' },
    { lead: 'प्रोफ़ाइल छिपी', text: 'आप मंडली खोज और समुदाय लीडरबोर्ड में दिखाई नहीं देंगे।' },
    { lead: 'अभी कुछ नहीं हटेगा', text: 'आपकी साधना का इतिहास, जर्नल और अवशेष 30 दिनों तक आपके खाते में रहेंगे।' },
  ],
  graceTitle: '30 दिन की अवधि',
  graceBullets: [
    { lead: 'मन बदल जाए तो', text: 'साइन इन करें और प्रोफ़ाइल या सेटिंग्स में "हटाना रद्द करें" दबाएँ — सब कुछ वापस मिल जाएगा।' },
    { lead: '30 दिन बाद', text: 'आपका खाता और व्यक्तिगत रिकॉर्ड स्थायी रूप से हटा दिए जाएँगे।' },
  ],
  step3Title: 'एक हल्का कदम सोचें',
  step3Intro: 'अगर रिमाइंडर या व्यस्त समय परेशानी है, तो खाता हटाने की ज़रूरत नहीं:',
  pauseTitle: 'इसके बजाय सभी रिमाइंडर बंद करें',
  pauseBody: 'जब तक आप सेटिंग्स में इन्हें फिर चालू नहीं करते, ये बंद रहेंगे। आपकी स्ट्रीक, जर्नल और अवशेष जस के तस रहेंगे।',
  reasonsTitle: 'आप क्यों जा रहे हैं? (वैकल्पिक)',
  otherPlaceholder: 'बताएँ हम क्या बेहतर कर सकते हैं…',
  stay: 'मैं रुकूँगा/रुकूँगी',
  proceedFinal: 'अंतिम पुष्टि पर जाएँ',
  step4Title: 'खाता हटाने की पुष्टि करें',
  step4Before: '30 दिन की अवधि शुरू करने के लिए नीचे ',
  step4After: ' लिखें:',
  finalNote: 'अगले 30 दिनों में कभी भी साइन इन करके प्रोफ़ाइल पर "हटाना रद्द करें" दबाकर आप इसे रद्द कर सकते हैं।',
  scheduleButton: 'खाता हटाना निर्धारित करें',
  neverMind: 'रहने दें, मेरा खाता रखें',
  pauseFailed: 'रिमाइंडर बंद नहीं हो सके। कृपया फिर कोशिश करें।',
  scheduleFailed: 'खाता हटाना निर्धारित नहीं हो सका। कृपया फिर कोशिश करें।',
  reasonLabels: {
    taking_break: 'कुछ समय के लिए आध्यात्मिक विराम',
    too_many_notifications: 'बहुत ज़्यादा सूचनाएँ या रिमाइंडर',
    privacy_concerns: 'निजता या डेटा की चिंता',
    not_useful: 'साधना की सुविधाएँ उपयोगी नहीं लगीं',
    technical_issues: 'ऐप धीमा है या तकनीकी खराबी',
    other: 'कोई और कारण',
  },

  bannerTitle: 'खाता हटाना निर्धारित है',
  bannerBody: 'रिमाइंडर बंद हैं और आपकी प्रोफ़ाइल खोज व लीडरबोर्ड से छिपी है। नीचे दी गई तारीख़ तक कुछ नहीं हटेगा।',
  bannerPurgeOn: (date) => `${date} को स्थायी रूप से हटेगा`,
  bannerDaysLeft: (days) => ` (${days} दिन बाकी)`,
  bannerCancel: 'हटाना रद्द करें और खाता वापस पाएँ',
  cancelFailed: 'हटाना रद्द नहीं हो सका।',

  restoreTitle: 'खाता हटाना निर्धारित है',
  restoreBody: (days) => `आपका खाता ${days === null ? 'जल्द' : `${days} दिन में`} स्थायी रूप से हटा दिया जाएगा। तब तक रिमाइंडर बंद हैं। क्या अभी अपना खाता वापस पाना चाहेंगे?`,
  restoreKeep: 'हटाना निर्धारित रहने दें',
  restoreAction: 'मेरा खाता वापस पाएँ',
  restoredTitle: 'खाता वापस मिल गया',
  restoredBody: 'स्वागत है 🙏 आपका खाता और साधना का इतिहास सुरक्षित है। जो रिमाइंडर चालू थे, वे फिर शुरू होंगे।',
  restoreFailedTitle: 'खाता वापस नहीं मिल सका',
  restoreFailedHint: 'आप सेटिंग्स या प्रोफ़ाइल से भी रद्द कर सकते हैं।',
  checkConnection: 'कनेक्शन जाँचकर फिर कोशिश करें।',

  scheduledTitle: 'खाता हटाना निर्धारित (30 दिन की अवधि)',
  scheduledBody: 'रिमाइंडर बंद हो गए हैं और आपकी प्रोफ़ाइल छिपी है। 30 दिनों तक कुछ नहीं हटेगा — आप प्रोफ़ाइल या इसी स्क्रीन से कभी भी रद्द कर सकते हैं।',
  scheduleFailedTitle: 'खाता हटाना निर्धारित नहीं हो सका',
  remindersOffTitle: 'रिमाइंडर बंद',
  remindersOffBody: 'जब तक आप यहाँ इन्हें फिर चालू नहीं करते, सभी रिमाइंडर बंद रहेंगे। आपकी स्ट्रीक, जर्नल और अवशेष जस के तस हैं।',
  cancelledTitle: 'हटाना रद्द हुआ',
  cancelledBody: 'स्वागत है 🙏 आपका खाता और साधना का इतिहास सुरक्षित है।',
  cancelFailedTitle: 'हटाना रद्द नहीं हो सका',
  dangerZoneNote: 'खाता हटाने पर 30 दिन की अवधि शुरू होती है, जिसे रद्द किया जा सकता है। रिमाइंडर तुरंत बंद हो जाते हैं; रद्द न करने पर 30 दिन बाद आपका डेटा स्थायी रूप से हट जाता है।',
};

const pa: AccountDeletionCopy = {
  headerTag: 'ਖਾਤਾ ਮਿਟਾਉਣਾ',
  dismiss: 'ਬੰਦ ਕਰੋ',
  close: 'ਬੰਦ ਕਰੋ',
  step1Title: (name) => (name ? `ਜਾਣ ਤੋਂ ਪਹਿਲਾਂ, ${name}` : 'ਜਾਣ ਤੋਂ ਪਹਿਲਾਂ'),
  step1Body: 'ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ ਤੁਹਾਡੀ ਸਾਧਨਾ ਦਾ ਇਤਿਹਾਸ, ਕਮਾਏ ਅਵਸ਼ੇਸ਼ ਅਤੇ ਜਰਨਲ ਵਿਚਾਰ ਸੁਰੱਖਿਅਤ ਹਨ।',
  summaryUnavailable: 'ਹੁਣੇ ਤੁਹਾਡੀ ਸਾਧਨਾ ਦਾ ਸਾਰ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਤੁਹਾਡੀ ਸਟ੍ਰੀਕ, ਕਰਮ, ਅਵਸ਼ੇਸ਼ ਅਤੇ ਜਰਨਲ ਤੁਹਾਡੇ ਖਾਤੇ ਦਾ ਹਿੱਸਾ ਹਨ ਅਤੇ 30 ਦਿਨਾਂ ਦੀ ਮਿਆਦ ਤੋਂ ਬਾਅਦ ਹਟਾ ਦਿੱਤੇ ਜਾਣਗੇ।',
  stats: { streak: 'ਸਟ੍ਰੀਕ', karma: 'ਕਰਮ', seva: 'ਸੇਵਾ', relics: 'ਅਵਸ਼ੇਸ਼' },
  streakValue: (days) => `${days} ਦਿਨ`,
  journalWarning: (count) => `ਤੁਹਾਡੇ ${count} ਜਰਨਲ ਵਿਚਾਰ ਹਨ। 30 ਦਿਨਾਂ ਦੀ ਮਿਆਦ ਖਤਮ ਹੋਣ 'ਤੇ ਇਹ ਪੱਕੇ ਤੌਰ 'ਤੇ ਹਟਾ ਦਿੱਤੇ ਜਾਣਗੇ।`,
  kulCreated: (names) => `ਤੁਸੀਂ ${names} ਬਣਾਇਆ ਹੈ। ਹੋਰ ਮੈਂਬਰਾਂ ਦੇ ਖਾਤੇ ਬਣੇ ਰਹਿਣਗੇ, ਪਰ ਜਾਣ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੇ ਪਰਿਵਾਰ ਨੂੰ ਦੱਸ ਦਿਓ।`,
  exportData: 'ਪਹਿਲਾਂ ਮੇਰਾ ਸਾਧਨਾ ਡਾਟਾ (.json) ਡਾਊਨਲੋਡ ਕਰੋ',
  keepAccount: 'ਮੇਰਾ ਖਾਤਾ ਰੱਖੋ',
  continueNext: 'ਅੱਗੇ ਵਧੋ',
  continue: 'ਅੱਗੇ ਵਧੋ',
  step2Title: 'ਅੱਗੇ ਕੀ ਹੋਵੇਗਾ?',
  step2Intro: 'ਅੱਜ ਤੋਂ ਕੀ ਬਦਲੇਗਾ, ਅਤੇ 30 ਦਿਨਾਂ ਬਾਅਦ ਕੀ ਹੋਵੇਗਾ:',
  todayTitle: 'ਅੱਜ ਤੋਂ',
  todayBullets: [
    { lead: 'ਰੀਮਾਈਂਡਰ ਬੰਦ', text: 'ਜਪ, ਨਿੱਤ, ਵਰਤ, ਤਿਉਹਾਰ ਅਤੇ ਭਾਈਚਾਰੇ ਦੀਆਂ ਸੂਚਨਾਵਾਂ ਬੰਦ ਹੋ ਜਾਣਗੀਆਂ। ਤੁਹਾਡੇ ਖਾਤੇ ਜਾਂ ਉਸਦੀ ਸੁਰੱਖਿਆ ਬਾਰੇ ਸੂਚਨਾਵਾਂ ਫਿਰ ਵੀ ਆ ਸਕਦੀਆਂ ਹਨ।' },
    { lead: 'ਪ੍ਰੋਫ਼ਾਈਲ ਲੁਕੀ', text: 'ਤੁਸੀਂ ਮੰਡਲੀ ਖੋਜ ਅਤੇ ਭਾਈਚਾਰਕ ਲੀਡਰਬੋਰਡਾਂ ਵਿੱਚ ਨਹੀਂ ਦਿਸੋਗੇ।' },
    { lead: 'ਹਾਲੇ ਕੁਝ ਨਹੀਂ ਮਿਟੇਗਾ', text: 'ਤੁਹਾਡੀ ਸਾਧਨਾ ਦਾ ਇਤਿਹਾਸ, ਜਰਨਲ ਅਤੇ ਅਵਸ਼ੇਸ਼ 30 ਦਿਨਾਂ ਲਈ ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ ਰਹਿਣਗੇ।' },
  ],
  graceTitle: '30 ਦਿਨਾਂ ਦੀ ਮਿਆਦ',
  graceBullets: [
    { lead: 'ਮਨ ਬਦਲ ਜਾਵੇ ਤਾਂ', text: 'ਸਾਈਨ ਇਨ ਕਰੋ ਅਤੇ ਪ੍ਰੋਫ਼ਾਈਲ ਜਾਂ ਸੈਟਿੰਗਾਂ ਵਿੱਚ "ਮਿਟਾਉਣਾ ਰੱਦ ਕਰੋ" ਦਬਾਓ — ਸਭ ਕੁਝ ਵਾਪਸ ਮਿਲ ਜਾਵੇਗਾ।' },
    { lead: '30 ਦਿਨਾਂ ਬਾਅਦ', text: 'ਤੁਹਾਡਾ ਖਾਤਾ ਅਤੇ ਨਿੱਜੀ ਰਿਕਾਰਡ ਪੱਕੇ ਤੌਰ \'ਤੇ ਮਿਟਾ ਦਿੱਤੇ ਜਾਣਗੇ।' },
  ],
  step3Title: 'ਇੱਕ ਹਲਕਾ ਕਦਮ ਸੋਚੋ',
  step3Intro: 'ਜੇ ਰੀਮਾਈਂਡਰ ਜਾਂ ਰੁਝੇਵਾਂ ਸਮੱਸਿਆ ਹੈ, ਤਾਂ ਖਾਤਾ ਮਿਟਾਉਣ ਦੀ ਲੋੜ ਨਹੀਂ:',
  pauseTitle: 'ਇਸ ਦੀ ਬਜਾਏ ਸਾਰੇ ਰੀਮਾਈਂਡਰ ਬੰਦ ਕਰੋ',
  pauseBody: 'ਜਦੋਂ ਤੱਕ ਤੁਸੀਂ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਇਹਨਾਂ ਨੂੰ ਮੁੜ ਚਾਲੂ ਨਹੀਂ ਕਰਦੇ, ਇਹ ਬੰਦ ਰਹਿਣਗੇ। ਤੁਹਾਡੀ ਸਟ੍ਰੀਕ, ਜਰਨਲ ਅਤੇ ਅਵਸ਼ੇਸ਼ ਜਿਉਂ ਦੇ ਤਿਉਂ ਰਹਿਣਗੇ।',
  reasonsTitle: 'ਤੁਸੀਂ ਕਿਉਂ ਜਾ ਰਹੇ ਹੋ? (ਵਿਕਲਪਿਕ)',
  otherPlaceholder: 'ਦੱਸੋ ਅਸੀਂ ਕੀ ਬਿਹਤਰ ਕਰ ਸਕਦੇ ਹਾਂ…',
  stay: 'ਮੈਂ ਰਹਾਂਗਾ/ਰਹਾਂਗੀ',
  proceedFinal: 'ਅੰਤਿਮ ਪੁਸ਼ਟੀ ਵੱਲ ਜਾਓ',
  step4Title: 'ਖਾਤਾ ਮਿਟਾਉਣ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ',
  step4Before: '30 ਦਿਨਾਂ ਦੀ ਮਿਆਦ ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਹੇਠਾਂ ',
  step4After: ' ਲਿਖੋ:',
  finalNote: 'ਅਗਲੇ 30 ਦਿਨਾਂ ਵਿੱਚ ਕਦੇ ਵੀ ਸਾਈਨ ਇਨ ਕਰਕੇ ਪ੍ਰੋਫ਼ਾਈਲ \'ਤੇ "ਮਿਟਾਉਣਾ ਰੱਦ ਕਰੋ" ਦਬਾ ਕੇ ਤੁਸੀਂ ਇਸਨੂੰ ਰੱਦ ਕਰ ਸਕਦੇ ਹੋ।',
  scheduleButton: 'ਖਾਤਾ ਮਿਟਾਉਣਾ ਨਿਰਧਾਰਤ ਕਰੋ',
  neverMind: 'ਰਹਿਣ ਦਿਓ, ਮੇਰਾ ਖਾਤਾ ਰੱਖੋ',
  pauseFailed: 'ਰੀਮਾਈਂਡਰ ਬੰਦ ਨਹੀਂ ਹੋ ਸਕੇ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  scheduleFailed: 'ਖਾਤਾ ਮਿਟਾਉਣਾ ਨਿਰਧਾਰਤ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  reasonLabels: {
    taking_break: 'ਕੁਝ ਸਮੇਂ ਲਈ ਅਧਿਆਤਮਿਕ ਵਿਰਾਮ',
    too_many_notifications: 'ਬਹੁਤ ਜ਼ਿਆਦਾ ਸੂਚਨਾਵਾਂ ਜਾਂ ਰੀਮਾਈਂਡਰ',
    privacy_concerns: 'ਨਿੱਜਤਾ ਜਾਂ ਡਾਟੇ ਦੀ ਚਿੰਤਾ',
    not_useful: 'ਸਾਧਨਾ ਦੀਆਂ ਸਹੂਲਤਾਂ ਲਾਭਦਾਇਕ ਨਹੀਂ ਲੱਗੀਆਂ',
    technical_issues: 'ਐਪ ਹੌਲੀ ਹੈ ਜਾਂ ਤਕਨੀਕੀ ਖ਼ਰਾਬੀ',
    other: 'ਕੋਈ ਹੋਰ ਕਾਰਨ',
  },

  bannerTitle: 'ਖਾਤਾ ਮਿਟਾਉਣਾ ਨਿਰਧਾਰਤ ਹੈ',
  bannerBody: 'ਰੀਮਾਈਂਡਰ ਬੰਦ ਹਨ ਅਤੇ ਤੁਹਾਡੀ ਪ੍ਰੋਫ਼ਾਈਲ ਖੋਜ ਤੇ ਲੀਡਰਬੋਰਡਾਂ ਤੋਂ ਲੁਕੀ ਹੈ। ਹੇਠਾਂ ਦਿੱਤੀ ਤਾਰੀਖ਼ ਤੱਕ ਕੁਝ ਨਹੀਂ ਮਿਟੇਗਾ।',
  bannerPurgeOn: (date) => `${date} ਨੂੰ ਪੱਕੇ ਤੌਰ 'ਤੇ ਮਿਟੇਗਾ`,
  bannerDaysLeft: (days) => ` (${days} ਦਿਨ ਬਾਕੀ)`,
  bannerCancel: 'ਮਿਟਾਉਣਾ ਰੱਦ ਕਰੋ ਅਤੇ ਖਾਤਾ ਵਾਪਸ ਲਓ',
  cancelFailed: 'ਮਿਟਾਉਣਾ ਰੱਦ ਨਹੀਂ ਹੋ ਸਕਿਆ।',

  restoreTitle: 'ਖਾਤਾ ਮਿਟਾਉਣਾ ਨਿਰਧਾਰਤ ਹੈ',
  restoreBody: (days) => `ਤੁਹਾਡਾ ਖਾਤਾ ${days === null ? 'ਜਲਦੀ' : `${days} ਦਿਨਾਂ ਵਿੱਚ`} ਪੱਕੇ ਤੌਰ 'ਤੇ ਮਿਟਾ ਦਿੱਤਾ ਜਾਵੇਗਾ। ਉਦੋਂ ਤੱਕ ਰੀਮਾਈਂਡਰ ਬੰਦ ਹਨ। ਕੀ ਹੁਣੇ ਆਪਣਾ ਖਾਤਾ ਵਾਪਸ ਲੈਣਾ ਚਾਹੋਗੇ?`,
  restoreKeep: 'ਮਿਟਾਉਣਾ ਨਿਰਧਾਰਤ ਰਹਿਣ ਦਿਓ',
  restoreAction: 'ਮੇਰਾ ਖਾਤਾ ਵਾਪਸ ਲਓ',
  restoredTitle: 'ਖਾਤਾ ਵਾਪਸ ਮਿਲ ਗਿਆ',
  restoredBody: 'ਜੀ ਆਇਆਂ ਨੂੰ 🙏 ਤੁਹਾਡਾ ਖਾਤਾ ਅਤੇ ਸਾਧਨਾ ਦਾ ਇਤਿਹਾਸ ਸੁਰੱਖਿਅਤ ਹੈ। ਜੋ ਰੀਮਾਈਂਡਰ ਚਾਲੂ ਸਨ, ਉਹ ਮੁੜ ਸ਼ੁਰੂ ਹੋਣਗੇ।',
  restoreFailedTitle: 'ਖਾਤਾ ਵਾਪਸ ਨਹੀਂ ਮਿਲ ਸਕਿਆ',
  restoreFailedHint: 'ਤੁਸੀਂ ਸੈਟਿੰਗਾਂ ਜਾਂ ਪ੍ਰੋਫ਼ਾਈਲ ਤੋਂ ਵੀ ਰੱਦ ਕਰ ਸਕਦੇ ਹੋ।',
  checkConnection: 'ਕਨੈਕਸ਼ਨ ਜਾਂਚ ਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',

  scheduledTitle: 'ਖਾਤਾ ਮਿਟਾਉਣਾ ਨਿਰਧਾਰਤ (30 ਦਿਨਾਂ ਦੀ ਮਿਆਦ)',
  scheduledBody: 'ਰੀਮਾਈਂਡਰ ਬੰਦ ਹੋ ਗਏ ਹਨ ਅਤੇ ਤੁਹਾਡੀ ਪ੍ਰੋਫ਼ਾਈਲ ਲੁਕੀ ਹੈ। 30 ਦਿਨਾਂ ਤੱਕ ਕੁਝ ਨਹੀਂ ਮਿਟੇਗਾ — ਤੁਸੀਂ ਪ੍ਰੋਫ਼ਾਈਲ ਜਾਂ ਇਸੇ ਸਕ੍ਰੀਨ ਤੋਂ ਕਦੇ ਵੀ ਰੱਦ ਕਰ ਸਕਦੇ ਹੋ।',
  scheduleFailedTitle: 'ਖਾਤਾ ਮਿਟਾਉਣਾ ਨਿਰਧਾਰਤ ਨਹੀਂ ਹੋ ਸਕਿਆ',
  remindersOffTitle: 'ਰੀਮਾਈਂਡਰ ਬੰਦ',
  remindersOffBody: 'ਜਦੋਂ ਤੱਕ ਤੁਸੀਂ ਇੱਥੇ ਇਹਨਾਂ ਨੂੰ ਮੁੜ ਚਾਲੂ ਨਹੀਂ ਕਰਦੇ, ਸਾਰੇ ਰੀਮਾਈਂਡਰ ਬੰਦ ਰਹਿਣਗੇ। ਤੁਹਾਡੀ ਸਟ੍ਰੀਕ, ਜਰਨਲ ਅਤੇ ਅਵਸ਼ੇਸ਼ ਜਿਉਂ ਦੇ ਤਿਉਂ ਹਨ।',
  cancelledTitle: 'ਮਿਟਾਉਣਾ ਰੱਦ ਹੋਇਆ',
  cancelledBody: 'ਜੀ ਆਇਆਂ ਨੂੰ 🙏 ਤੁਹਾਡਾ ਖਾਤਾ ਅਤੇ ਸਾਧਨਾ ਦਾ ਇਤਿਹਾਸ ਸੁਰੱਖਿਅਤ ਹੈ।',
  cancelFailedTitle: 'ਮਿਟਾਉਣਾ ਰੱਦ ਨਹੀਂ ਹੋ ਸਕਿਆ',
  dangerZoneNote: 'ਖਾਤਾ ਮਿਟਾਉਣ ਨਾਲ 30 ਦਿਨਾਂ ਦੀ ਮਿਆਦ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ, ਜਿਸਨੂੰ ਰੱਦ ਕੀਤਾ ਜਾ ਸਕਦਾ ਹੈ। ਰੀਮਾਈਂਡਰ ਤੁਰੰਤ ਬੰਦ ਹੋ ਜਾਂਦੇ ਹਨ; ਰੱਦ ਨਾ ਕਰਨ \'ਤੇ 30 ਦਿਨਾਂ ਬਾਅਦ ਤੁਹਾਡਾ ਡਾਟਾ ਪੱਕੇ ਤੌਰ \'ਤੇ ਹਟ ਜਾਂਦਾ ਹੈ।',
};

export const ACCOUNT_DELETION_COPY: Record<AppLanguage, AccountDeletionCopy> = { en, hi, pa };

export function accountDeletionCopy(language: AppLanguage | undefined | null): AccountDeletionCopy {
  return (language && ACCOUNT_DELETION_COPY[language]) || en;
}

/** Translated label for a server reason id; the server's English label for unknown ids. */
export function deletionReasonLabel(copy: AccountDeletionCopy, id: string, serverLabel: string): string {
  return copy.reasonLabels[id] ?? serverLabel;
}
