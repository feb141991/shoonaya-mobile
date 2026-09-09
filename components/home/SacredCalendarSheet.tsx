import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useReducedMotion } from '@/components/ui/Motion';
import { COLORS, FONTS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const COPY = {
  en: { title: 'Sacred Calendar', intro: 'Keep verified sacred days in your calendar.', subscribe: 'Subscribe for updates', download: 'Download calendar file', snapshot: 'Save a one-time copy. It will not receive updates.', close: 'Close', retry: 'Retry', profile: 'Review calendar settings', missing: 'Choose your calendar profile, tradition and location in Settings first.', unavailable: 'Subscriptions are not available yet. You can still download a calendar file or try again later.', failed: 'The calendar could not be loaded. Please try again.', signin: 'Sign in to use your Sacred Calendar.', includes: 'All verified sacred days', empty: 'No verified events are available for these settings yet.', preview: 'Upcoming preview', add: 'Add subscription', copy: 'Copy subscription link', copied: 'Link copied', opened: 'Subscription link opened. Finish adding it in your calendar app.', handoff: 'Could not open a calendar app. Copy the link and follow the instructions below.', revoke: 'Revoke subscription link', revoked: 'Link revoked. Remove the subscribed calendar from your calendar app as well.', privacy: 'Anyone with this link can read this calendar. Keep it private. Revoke it here to stop access.', refresh: 'Calendar apps refresh on their own schedule. Manage reminders in your calendar app.', settings: 'These settings stay with this subscription. To change them, revoke the link, update Calendar settings and subscribe again.', instructions: 'Apple Calendar: use Add subscription. Google Calendar on a computer: Other calendars → From URL. Outlook on the web: Add calendar → Subscribe from web. Paste the copied link.', busy: 'Preparing calendar…' },
  hi: { title: 'पवित्र कैलेंडर', intro: 'सत्यापित पवित्र दिन अपने कैलेंडर में रखें।', subscribe: 'अपडेट के लिए सदस्यता लें', download: 'कैलेंडर फ़ाइल डाउनलोड करें', snapshot: 'एक बार की प्रति सहेजें। इसमें अपडेट नहीं आएँगे।', close: 'बंद करें', retry: 'पुनः प्रयास', profile: 'कैलेंडर सेटिंग देखें', missing: 'पहले सेटिंग में कैलेंडर प्रोफ़ाइल, परंपरा और स्थान चुनें।', unavailable: 'सदस्यता अभी उपलब्ध नहीं है। कैलेंडर फ़ाइल डाउनलोड करें या बाद में प्रयास करें।', failed: 'कैलेंडर लोड नहीं हो सका। फिर प्रयास करें।', signin: 'अपना पवित्र कैलेंडर उपयोग करने के लिए साइन इन करें।', includes: 'सभी सत्यापित पवित्र दिन', empty: 'इन सेटिंग के लिए अभी सत्यापित दिन उपलब्ध नहीं हैं।', preview: 'आने वाले दिन', add: 'सदस्यता जोड़ें', copy: 'सदस्यता लिंक कॉपी करें', copied: 'लिंक कॉपी हुआ', opened: 'सदस्यता लिंक खुला। अपने कैलेंडर ऐप में जोड़ना पूरा करें।', handoff: 'कैलेंडर ऐप नहीं खुला। लिंक कॉपी करें और नीचे दिए निर्देश अपनाएँ।', revoke: 'सदस्यता लिंक रद्द करें', revoked: 'लिंक रद्द हुआ। अपने कैलेंडर ऐप से भी यह कैलेंडर हटाएँ।', privacy: 'इस लिंक वाला कोई भी व्यक्ति यह कैलेंडर पढ़ सकता है। इसे निजी रखें। पहुँच रोकने के लिए यहाँ रद्द करें।', refresh: 'कैलेंडर ऐप अपने समय पर अपडेट करते हैं। रिमाइंडर अपने कैलेंडर ऐप में सेट करें।', settings: 'ये सेटिंग सदस्यता के साथ रहेंगी। बदलने के लिए लिंक रद्द करें, कैलेंडर सेटिंग बदलें और फिर सदस्यता लें।', instructions: 'Apple Calendar: सदस्यता जोड़ें। कंप्यूटर पर Google Calendar: Other calendars → From URL। Outlook वेब: Add calendar → Subscribe from web। कॉपी किया लिंक पेस्ट करें।', busy: 'कैलेंडर तैयार हो रहा है…' },
  pa: { title: 'ਪਵਿੱਤਰ ਕੈਲੰਡਰ', intro: 'ਪ੍ਰਮਾਣਿਤ ਪਵਿੱਤਰ ਦਿਨ ਆਪਣੇ ਕੈਲੰਡਰ ਵਿੱਚ ਰੱਖੋ।', subscribe: 'ਅੱਪਡੇਟ ਲਈ ਮੈਂਬਰ ਬਣੋ', download: 'ਕੈਲੰਡਰ ਫਾਈਲ ਡਾਊਨਲੋਡ ਕਰੋ', snapshot: 'ਇੱਕ ਵਾਰ ਦੀ ਕਾਪੀ ਸੰਭਾਲੋ। ਇਸ ਵਿੱਚ ਅੱਪਡੇਟ ਨਹੀਂ ਆਉਣਗੇ।', close: 'ਬੰਦ ਕਰੋ', retry: 'ਮੁੜ ਕੋਸ਼ਿਸ਼', profile: 'ਕੈਲੰਡਰ ਸੈਟਿੰਗ ਵੇਖੋ', missing: 'ਪਹਿਲਾਂ ਸੈਟਿੰਗ ਵਿੱਚ ਕੈਲੰਡਰ ਪ੍ਰੋਫਾਈਲ, ਪਰੰਪਰਾ ਅਤੇ ਸਥਾਨ ਚੁਣੋ।', unavailable: 'ਮੈਂਬਰਸ਼ਿਪ ਅਜੇ ਉਪਲਬਧ ਨਹੀਂ। ਕੈਲੰਡਰ ਫਾਈਲ ਡਾਊਨਲੋਡ ਕਰੋ ਜਾਂ ਬਾਅਦ ਵਿੱਚ ਕੋਸ਼ਿਸ਼ ਕਰੋ।', failed: 'ਕੈਲੰਡਰ ਲੋਡ ਨਹੀਂ ਹੋਇਆ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।', signin: 'ਆਪਣਾ ਪਵਿੱਤਰ ਕੈਲੰਡਰ ਵਰਤਣ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ।', includes: 'ਸਾਰੇ ਪ੍ਰਮਾਣਿਤ ਪਵਿੱਤਰ ਦਿਨ', empty: 'ਇਨ੍ਹਾਂ ਸੈਟਿੰਗਾਂ ਲਈ ਅਜੇ ਪ੍ਰਮਾਣਿਤ ਦਿਨ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।', preview: 'ਆਉਣ ਵਾਲੇ ਦਿਨ', add: 'ਮੈਂਬਰਸ਼ਿਪ ਜੋੜੋ', copy: 'ਮੈਂਬਰਸ਼ਿਪ ਲਿੰਕ ਕਾਪੀ ਕਰੋ', copied: 'ਲਿੰਕ ਕਾਪੀ ਹੋਇਆ', opened: 'ਮੈਂਬਰਸ਼ਿਪ ਲਿੰਕ ਖੁੱਲ੍ਹਿਆ। ਆਪਣੇ ਕੈਲੰਡਰ ਐਪ ਵਿੱਚ ਜੋੜਨਾ ਪੂਰਾ ਕਰੋ।', handoff: 'ਕੈਲੰਡਰ ਐਪ ਨਹੀਂ ਖੁੱਲ੍ਹਿਆ। ਲਿੰਕ ਕਾਪੀ ਕਰੋ ਅਤੇ ਹੇਠਾਂ ਦਿੱਤੇ ਨਿਰਦੇਸ਼ ਵਰਤੋ।', revoke: 'ਮੈਂਬਰਸ਼ਿਪ ਲਿੰਕ ਰੱਦ ਕਰੋ', revoked: 'ਲਿੰਕ ਰੱਦ ਹੋਇਆ। ਆਪਣੇ ਕੈਲੰਡਰ ਐਪ ਤੋਂ ਵੀ ਕੈਲੰਡਰ ਹਟਾਓ।', privacy: 'ਇਸ ਲਿੰਕ ਵਾਲਾ ਕੋਈ ਵੀ ਇਹ ਕੈਲੰਡਰ ਪੜ੍ਹ ਸਕਦਾ ਹੈ। ਇਸ ਨੂੰ ਨਿੱਜੀ ਰੱਖੋ। ਪਹੁੰਚ ਰੋਕਣ ਲਈ ਇੱਥੇ ਰੱਦ ਕਰੋ।', refresh: 'ਕੈਲੰਡਰ ਐਪ ਆਪਣੇ ਸਮੇਂ ਤੇ ਅੱਪਡੇਟ ਕਰਦੇ ਹਨ। ਰਿਮਾਈਂਡਰ ਆਪਣੇ ਕੈਲੰਡਰ ਐਪ ਵਿੱਚ ਸੈੱਟ ਕਰੋ।', settings: 'ਇਹ ਸੈਟਿੰਗਾਂ ਮੈਂਬਰਸ਼ਿਪ ਨਾਲ ਰਹਿਣਗੀਆਂ। ਬਦਲਣ ਲਈ ਲਿੰਕ ਰੱਦ ਕਰੋ, ਕੈਲੰਡਰ ਸੈਟਿੰਗਾਂ ਬਦਲੋ ਅਤੇ ਮੁੜ ਮੈਂਬਰ ਬਣੋ।', instructions: 'Apple Calendar: ਮੈਂਬਰਸ਼ਿਪ ਜੋੜੋ। ਕੰਪਿਊਟਰ ਤੇ Google Calendar: Other calendars → From URL। Outlook ਵੈਬ: Add calendar → Subscribe from web। ਕਾਪੀ ਕੀਤਾ ਲਿੰਕ ਪੇਸਟ ਕਰੋ।', busy: 'ਕੈਲੰਡਰ ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ…' },
} as const;

type Subscription = { active: boolean; url: string | null; settings: { calendarProfile: string; tradition: string; sampradaya: string | null; timezone: string; location: string | null }; preview: { id: string; name: string; date: string }[]; count: number };

export function SacredCalendarSheet({ onClose, onDownload, downloading, lang }: { onClose: () => void; onDownload: () => void; downloading: boolean; lang: 'en' | 'hi' | 'pa' }) {
  const theme = themeColor(useColorScheme() === 'dark');
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const copy = COPY[lang];
  const [detail, setDetail] = useState(false);
  const [data, setData] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const owner = useRef<string | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (owner.current && session?.user.id !== owner.current) { mounted.current = false; onClose(); }
    });
    return () => { mounted.current = false; listener.subscription.unsubscribe(); };
  }, [onClose]);

  const request = async (method: 'GET' | 'POST' | 'DELETE' = 'GET') => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(null); setNotice(null);
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) throw new Error('Unauthorized');
      owner.current = auth.session.user.id;
      const response = await apiFetch('/api/calendar/subscription', { method, expectedUserId: owner.current });
      if (response.status === 204) {
        if (mounted.current) { setData(null); setNotice(copy.revoked); setDetail(false); }
        return;
      }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'CALENDAR_UNAVAILABLE');
      const { data: latest } = await supabase.auth.getSession();
      if (!mounted.current || latest.session?.user.id !== owner.current) return;
      setData(body as Subscription);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'CALENDAR_UNAVAILABLE');
    } finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };

  const openSubscription = async () => {
    if (!data?.url) return;
    try {
      const url = new URL(data.url);
      if (url.protocol !== 'https:') throw new Error('Invalid feed');
      await Linking.openURL(url.toString().replace(/^https:/, 'webcal:'));
      if (mounted.current) setNotice(copy.opened);
    } catch { if (mounted.current) setNotice(copy.handoff); }
  };
  const message = error === 'CALENDAR_PROFILE_REQUIRED' ? copy.missing : error === 'Unauthorized' ? copy.signin : error === 'SUBSCRIPTION_UNAVAILABLE' ? copy.unavailable : copy.failed;
  return (
    <Modal transparent animationType={reducedMotion ? 'none' : 'fade'} visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end', paddingTop: insets.top + SPACING.md }}>
        <Card tone="auto" accessibilityViewIsModal style={{ maxHeight: '95%', gap: SPACING.md, paddingBottom: insets.bottom + SPACING.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Text accessibilityRole="header" style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: theme.text, flex: 1 }}>{copy.title}</Text>
            <Button label={copy.close} variant="ghost" size="sm" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ gap: SPACING.md }}>
            <Text style={{ ...TYPE.body, color: theme.dim }}>{copy.intro}</Text>
            {!detail ? <Button label={copy.subscribe} onPress={() => { setDetail(true); void request(); }} /> : null}
            {detail && busy ? <Text accessibilityLiveRegion="polite" style={{ ...TYPE.body, color: theme.dim }}>{copy.busy}</Text> : null}
            {detail && error ? <><Text accessibilityRole="alert" style={{ ...TYPE.body, color: theme.dim }}>{message}</Text><Button label={copy.retry} variant="secondary" onPress={() => void request()} /></> : null}
            {detail && data ? <>
              <Text style={{ ...TYPE.label, color: theme.text }}>{copy.includes}</Text>
              <Text style={{ ...TYPE.body, color: theme.dim }}>{[data.settings.calendarProfile, data.settings.sampradaya ?? data.settings.tradition, data.settings.location, data.settings.timezone].filter(Boolean).join(' · ')}</Text>
              <Text style={{ ...TYPE.label, color: theme.text }}>{copy.preview}</Text>
              {data.count === 0 ? <Text style={{ ...TYPE.body, color: theme.dim }}>{copy.empty}</Text> : data.preview.map(event => <Text key={event.id} style={{ ...TYPE.body, color: theme.text }}>{event.date} · {event.name}</Text>)}
              <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.privacy}</Text>
              {!data.active ? <Button label={copy.subscribe} loading={busy} onPress={() => void request('POST')} /> : <>
                {Platform.OS === 'ios' ? <Button label={copy.add} disabled={busy} onPress={() => void openSubscription()} /> : null}
                <Button label={copy.copy} variant="secondary" disabled={busy || !data.url} onPress={() => { void Clipboard.setStringAsync(data.url!).then(() => setNotice(copy.copied)).catch(() => setNotice(copy.handoff)); }} />
                <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.instructions}</Text>
                <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.settings}</Text>
                <Button label={copy.revoke} variant="ghost" loading={busy} onPress={() => Alert.alert(copy.revoke, copy.revoked, [{ text: copy.close, style: 'cancel' }, { text: copy.revoke, style: 'destructive', onPress: () => void request('DELETE') }])} />
              </>}
              <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.refresh}</Text>
            </> : null}
            {notice ? <Text accessibilityLiveRegion="polite" style={{ ...TYPE.body, color: theme.brand }}>{notice}</Text> : null}
            <Button label={copy.profile} variant="ghost" onPress={() => { onClose(); router.push('/settings/detail-screen?section=calendar'); }} />
            <Button label={copy.download} variant="secondary" loading={downloading} onPress={onDownload} />
            <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.snapshot}</Text>
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}
