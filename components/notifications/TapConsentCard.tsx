import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppIdentity } from '@/lib/appIdentity';
import { FONTS, TYPE } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  applyNotificationTapConsent,
  readServerNotificationTapConsent,
  saveNotificationTapConsent,
} from '@/lib/notificationTapConsent';
import {
  afterNotNow,
  afterYes,
  parseTapPromptState,
  shouldShowTapPrompt,
  type TapPromptState,
} from '@/lib/notificationTapPrompt';
import { readUserScoped, USER_SCOPED_NAMES, writeUserScoped } from '@/lib/userScopedStorage';

type Theme = { text: string; dim: string };

/**
 * One-time, dismissible "Help improve reminders" question (AGENTS.md section 28). Shown at the top of the notifications
 * inbox, never on Home, only after a week with the app, only while the server confirms the choice is off, and at most
 * twice. "Not now" and "Yes" carry the same weight; nothing is pre-selected and nothing happens until a button is pressed.
 */
export function TapConsentCard({ theme }: { theme: Theme }) {
  const identity = useAppIdentity();
  const { language } = useLanguage();
  const isHindi = language === 'hi';
  const t = (en: string, hi: string) => (isHindi ? hi : en);
  const userId = identity.kind === 'authenticated' ? identity.userId : null;
  const [state, setState] = useState<TapPromptState | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setVisible(false);
    setState(null);
    setFailed(false);
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const owner = { kind: 'authenticated', userId } as const;
      const now = Date.now();
      const stored = parseTapPromptState(await readUserScoped(owner, USER_SCOPED_NAMES.notificationTapPrompt), now);
      // The first time this account is seen on this device starts the one-week wait.
      await writeUserScoped(owner, USER_SCOPED_NAMES.notificationTapPrompt, JSON.stringify(stored));
      const choice = await readServerNotificationTapConsent(userId);
      if (cancelled) return;
      setState(stored);
      setVisible(shouldShowTapPrompt(stored, now, choice));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const save = useCallback(async (next: TapPromptState) => {
    if (!userId) return;
    await writeUserScoped({ kind: 'authenticated', userId }, USER_SCOPED_NAMES.notificationTapPrompt, JSON.stringify(next));
  }, [userId]);

  const onNotNow = useCallback(async () => {
    if (!state || !userId) return;
    const next = afterNotNow(state, Date.now());
    setVisible(false);
    setState(next);
    await save(next);
  }, [save, state, userId]);

  const onYes = useCallback(async () => {
    if (!state || !userId || busy) return;
    setBusy(true);
    setFailed(false);
    const saved = await saveNotificationTapConsent(userId, true);
    if (saved) {
      await applyNotificationTapConsent(userId, true);
      const next = afterYes(state, Date.now());
      setState(next);
      await save(next);
      setVisible(false);
    } else {
      setFailed(true);
    }
    setBusy(false);
  }, [busy, save, state, userId]);

  if (!visible || !state) return null;

  return (
    <Card style={{ gap: 12 }} accessibilityLabel={t('Help improve reminders', 'स्मरण बेहतर बनाने में मदद करें')}>
      <Text style={{ ...TYPE.section, fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, color: theme.text }}>
        {t('Help improve reminders?', 'स्मरण बेहतर बनाने में मदद करें?')}
      </Text>
      <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 13, lineHeight: isHindi ? 21 : 19, color: theme.dim }}>
        {t(
          'If you say yes, we record which reminder you tap, when, and your app version, linked to your account, for up to 90 days, so we can send fewer reminders that do not help. This includes practice reminders, which can reflect your religious practice. We never record what you read or wrote. You can turn it off any time in Settings, and the records are deleted.',
          'यदि आप हाँ कहें, तो हम आपके खाते से जोड़कर दर्ज करेंगे कि आपने कौन-सा स्मरण, कब खोला और आपका ऐप संस्करण क्या है (अधिकतम 90 दिन), ताकि कम और अधिक उपयोगी स्मरण भेजे जा सकें। इसमें साधना के स्मरण भी शामिल हैं, जो आपकी धार्मिक साधना दर्शा सकते हैं। आपने क्या पढ़ा या लिखा, यह कभी दर्ज नहीं होता। आप सेटिंग्स में कभी भी इसे बंद कर सकते हैं और रिकॉर्ड हटा दिए जाएँगे।'
        )}
      </Text>
      {failed ? (
        <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 12, lineHeight: 18, color: theme.dim }}>
          {t('Could not save your choice right now. Nothing was turned on.', 'अभी आपका चुनाव सहेजा नहीं जा सका। कुछ भी चालू नहीं हुआ।')}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label={t('Not now', 'अभी नहीं')} variant="secondary" onPress={() => { void onNotNow(); }} style={{ flex: 1 }} />
        <Button label={t('Yes, help', 'हाँ, मदद करें')} variant="secondary" loading={busy} onPress={() => { void onYes(); }} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}
