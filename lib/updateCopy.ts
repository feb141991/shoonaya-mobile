import type { AppLanguage } from '@/lib/language-runtime';

export interface UpdateCopy {
  checkAction: string;
  checkingAction: string;
  requiredTitle: string;
  requiredMessage: (version: string, notes: string) => string;
  updateOnStore: string;
  optionalVersionTitle: string;
  optionalVersionMessage: (version: string, notes: string) => string;
  optionalBuildTitle: string;
  optionalBuildMessage: (version: string, notes: string) => string;
  remindLater: string;
  updateNow: string;
  otaTitle: string;
  otaMessage: string;
  later: string;
  restartNow: string;
  restartFailedTitle: string;
  restartFailedMessage: string;
  storeOpenFailedTitle: string;
  storeOpenFailedMessage: (url: string) => string;
  upToDateTitle: string;
  upToDateMessage: (version: string) => string;
  unavailableTitle: string;
  unavailableMessage: string;
}

const copy: Record<AppLanguage, UpdateCopy> = {
  en: {
    checkAction: 'Check for updates',
    checkingAction: 'Checking for updates…',
    requiredTitle: 'Update Required',
    requiredMessage: (version, notes) => `A new version of Shoonaya (v${version}) is required to continue.${notes}`,
    updateOnStore: 'Update on Store',
    optionalVersionTitle: 'New Version Available ✨',
    optionalVersionMessage: (version, notes) => `Shoonaya v${version} is available.${notes}`,
    optionalBuildTitle: 'New Build Available ✨',
    optionalBuildMessage: (version, notes) => `A newer Shoonaya build is available for version v${version}.${notes}`,
    remindLater: 'Remind Me Later',
    updateNow: 'Update Now',
    otaTitle: 'Sacred Update Ready ✨',
    otaMessage: 'A fresh update with the latest improvements has been downloaded. Would you like to restart Shoonaya now to apply it?',
    later: 'Later',
    restartNow: 'Restart Now',
    restartFailedTitle: 'Could not restart',
    restartFailedMessage: 'Please close and reopen Shoonaya to finish applying the update.',
    storeOpenFailedTitle: 'Could not open the app store',
    storeOpenFailedMessage: (url) => `Please open this link in your browser to update Shoonaya:\n${url}`,
    upToDateTitle: 'Up to Date',
    upToDateMessage: (version) => `You are running the latest version of Shoonaya (${version}).`,
    unavailableTitle: 'Update Check Unavailable',
    unavailableMessage: 'Shoonaya could not reach the update service. Please try again when your connection is available.',
  },
  hi: {
    checkAction: 'अपडेट जाँचें',
    checkingAction: 'अपडेट जाँचे जा रहे हैं…',
    requiredTitle: 'अपडेट आवश्यक है',
    requiredMessage: (version, notes) => `जारी रखने के लिए Shoonaya का नया संस्करण (v${version}) आवश्यक है।${notes}`,
    updateOnStore: 'स्टोर से अपडेट करें',
    optionalVersionTitle: 'नया संस्करण उपलब्ध है ✨',
    optionalVersionMessage: (version, notes) => `Shoonaya v${version} उपलब्ध है।${notes}`,
    optionalBuildTitle: 'नया बिल्ड उपलब्ध है ✨',
    optionalBuildMessage: (version, notes) => `Shoonaya v${version} का नया बिल्ड उपलब्ध है।${notes}`,
    remindLater: 'बाद में याद दिलाएँ',
    updateNow: 'अभी अपडेट करें',
    otaTitle: 'नया अपडेट तैयार है ✨',
    otaMessage: 'नया अपडेट डाउनलोड हो गया है। इसे लागू करने के लिए क्या आप अभी Shoonaya को फिर से शुरू करना चाहेंगे?',
    later: 'बाद में',
    restartNow: 'अभी फिर से शुरू करें',
    restartFailedTitle: 'फिर से शुरू नहीं हो सका',
    restartFailedMessage: 'अपडेट पूरा करने के लिए Shoonaya को बंद करके फिर से खोलें।',
    storeOpenFailedTitle: 'ऐप स्टोर नहीं खुल सका',
    storeOpenFailedMessage: (url) => `Shoonaya अपडेट करने के लिए इस लिंक को ब्राउज़र में खोलें:\n${url}`,
    upToDateTitle: 'नवीनतम संस्करण',
    upToDateMessage: (version) => `आपके Shoonaya में नवीनतम संस्करण (${version}) है।`,
    unavailableTitle: 'अपडेट की जाँच नहीं हो सकी',
    unavailableMessage: 'Shoonaya अपडेट सेवा से संपर्क नहीं कर सका। इंटरनेट उपलब्ध होने पर फिर से प्रयास करें।',
  },
  pa: {
    checkAction: 'ਅੱਪਡੇਟ ਦੀ ਜਾਂਚ ਕਰੋ',
    checkingAction: 'ਅੱਪਡੇਟ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ…',
    requiredTitle: 'ਅੱਪਡੇਟ ਲੋੜੀਂਦਾ ਹੈ',
    requiredMessage: (version, notes) => `ਜਾਰੀ ਰੱਖਣ ਲਈ Shoonaya ਦਾ ਨਵਾਂ ਵਰਜਨ (v${version}) ਲੋੜੀਂਦਾ ਹੈ।${notes}`,
    updateOnStore: 'ਸਟੋਰ ਤੋਂ ਅੱਪਡੇਟ ਕਰੋ',
    optionalVersionTitle: 'ਨਵਾਂ ਵਰਜਨ ਉਪਲਬਧ ਹੈ ✨',
    optionalVersionMessage: (version, notes) => `Shoonaya v${version} ਉਪਲਬਧ ਹੈ।${notes}`,
    optionalBuildTitle: 'ਨਵਾਂ ਬਿਲਡ ਉਪਲਬਧ ਹੈ ✨',
    optionalBuildMessage: (version, notes) => `Shoonaya v${version} ਦਾ ਨਵਾਂ ਬਿਲਡ ਉਪਲਬਧ ਹੈ।${notes}`,
    remindLater: 'ਬਾਅਦ ਵਿੱਚ ਯਾਦ ਦਿਵਾਓ',
    updateNow: 'ਹੁਣੇ ਅੱਪਡੇਟ ਕਰੋ',
    otaTitle: 'ਨਵਾਂ ਅੱਪਡੇਟ ਤਿਆਰ ਹੈ ✨',
    otaMessage: 'ਨਵਾਂ ਅੱਪਡੇਟ ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ ਹੈ। ਇਸਨੂੰ ਲਾਗੂ ਕਰਨ ਲਈ ਕੀ ਤੁਸੀਂ ਹੁਣ Shoonaya ਮੁੜ ਚਾਲੂ ਕਰਨਾ ਚਾਹੋਗੇ?',
    later: 'ਬਾਅਦ ਵਿੱਚ',
    restartNow: 'ਹੁਣੇ ਮੁੜ ਚਾਲੂ ਕਰੋ',
    restartFailedTitle: 'ਮੁੜ ਚਾਲੂ ਨਹੀਂ ਹੋ ਸਕਿਆ',
    restartFailedMessage: 'ਅੱਪਡੇਟ ਪੂਰਾ ਕਰਨ ਲਈ Shoonaya ਬੰਦ ਕਰਕੇ ਮੁੜ ਖੋਲ੍ਹੋ।',
    storeOpenFailedTitle: 'ਐਪ ਸਟੋਰ ਨਹੀਂ ਖੁੱਲ੍ਹ ਸਕਿਆ',
    storeOpenFailedMessage: (url) => `Shoonaya ਅੱਪਡੇਟ ਕਰਨ ਲਈ ਇਹ ਲਿੰਕ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਖੋਲ੍ਹੋ:\n${url}`,
    upToDateTitle: 'ਤਾਜ਼ਾ ਵਰਜਨ',
    upToDateMessage: (version) => `ਤੁਹਾਡੇ Shoonaya ਵਿੱਚ ਨਵੀਨਤਮ ਵਰਜਨ (${version}) ਹੈ।`,
    unavailableTitle: 'ਅੱਪਡੇਟ ਦੀ ਜਾਂਚ ਨਹੀਂ ਹੋ ਸਕੀ',
    unavailableMessage: 'Shoonaya ਅੱਪਡੇਟ ਸੇਵਾ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਕਰ ਸਕਿਆ। ਇੰਟਰਨੈੱਟ ਉਪਲਬਧ ਹੋਣ ਤੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
};

export function getUpdateCopy(language?: string | null): UpdateCopy {
  return copy[language === 'hi' || language === 'pa' ? language : 'en'];
}
