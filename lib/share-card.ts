import type { RefObject } from 'react';
import { Alert, PixelRatio, Platform, type View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '@/components/share/ShoonayaShareCard';

export async function shareCapturedShoonayaCard(
  ref: RefObject<View | null>,
  options: {
    fileName: string;
    dialogTitle?: string;
    fallbackMessage?: string;
    /** Card size in points; defaults to the 9:16 card. Captured at 3×. */
    size?: { width: number; height: number };
  },
) {
  const size = options.size ?? { width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT };
  if (!ref.current) {
    Alert.alert('Share card is still preparing. Please try again.');
    return false;
  }

  // Target: 3× the card's points (1080 px wide). react-native-view-shot on iOS
  // draws `width`/`height` at the screen scale, so they are passed in points
  // there; Android takes pixels. (Passing pixels on iOS produced 3240×5760,
  // ~21 MB PNGs — measured on the iOS Simulator, 2026-10-08.)
  const factor = Platform.OS === 'ios' ? 3 / PixelRatio.get() : 3;

  try {
    const uri = await captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: size.width * factor,
      height: size.height * factor,
      fileName: options.fileName.replace(/\.png$/i, ''),
    });

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(options.fallbackMessage ?? 'Sharing is not available on this device.');
      return false;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: options.dialogTitle ?? 'Share Shoonaya',
      UTI: 'public.png',
    });
    return true;
  } catch (error) {
    console.error('[share-card] failed to capture/share card', error);
    Alert.alert('Could not create the share card. Please try again.');
    return false;
  }
}
