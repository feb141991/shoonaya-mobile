import type { RefObject } from 'react';
import { Alert, type View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '@/components/share/ShoonayaShareCard';

export async function shareCapturedShoonayaCard(
  ref: RefObject<View | null>,
  options: {
    fileName: string;
    dialogTitle?: string;
    fallbackMessage?: string;
  },
) {
  if (!ref.current) {
    Alert.alert('Share card is still preparing. Please try again.');
    return false;
  }

  try {
    const uri = await captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: SHARE_CARD_WIDTH * 3,
      height: SHARE_CARD_HEIGHT * 3,
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
