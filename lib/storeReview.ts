import { Alert, Linking, Platform } from 'react-native';
import { STORE_LINKS } from './constants';

/**
 * Opens the native store review page for Shoonaya on iOS App Store or Android Google Play.
 * Falls back to the web store listing if the native market/review scheme is unavailable.
 */
export async function openStoreReview(): Promise<boolean> {
  const isIos = Platform.OS === 'ios';
  const primaryUrl = isIos ? STORE_LINKS.iosReview : STORE_LINKS.androidMarket;
  const fallbackUrl = isIos ? STORE_LINKS.ios : STORE_LINKS.android;

  try {
    const canOpen = await Linking.canOpenURL(primaryUrl);
    if (canOpen) {
      await Linking.openURL(primaryUrl);
      return true;
    }
  } catch {
    // Primary deep link not handled (e.g. simulator without store app)
  }

  try {
    const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
    if (canOpenFallback) {
      await Linking.openURL(fallbackUrl);
      return true;
    }
  } catch {
    // Both failed
  }

  Alert.alert('Store Unavailable', 'The store page could not be opened on this device.');
  return false;
}
