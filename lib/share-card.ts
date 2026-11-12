import type { RefObject } from 'react';
import { Alert, PixelRatio, Platform, type View } from 'react-native';
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
    // A card can carry the person's own name and practice numbers, and react-native-view-shot leaves its file in a temp folder or
    // the cache root where nothing removes it. The file module is loaded here, on first share, so the screens that import this
    // helper do not load it at startup. The device module keeps the card in the purged private-export directory (AGENTS 25).
    const { shareCapturedImage } = await import('./privateExportFilesDevice');
    const shared = await shareCapturedImage(
      () =>
        captureRef(ref, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
          width: size.width * factor,
          height: size.height * factor,
          fileName: options.fileName.replace(/\.png$/i, ''),
        }),
      {
        mimeType: 'image/png',
        dialogTitle: options.dialogTitle ?? 'Share Shoonaya',
        UTI: 'public.png',
      },
    );
    if (!shared) {
      Alert.alert(options.fallbackMessage ?? 'Sharing is not available on this device.');
      return false;
    }
    return true;
  } catch (error) {
    console.error('[share-card] failed to capture/share card', error);
    Alert.alert('Could not create the share card. Please try again.');
    return false;
  }
}
