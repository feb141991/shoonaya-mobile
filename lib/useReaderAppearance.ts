import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import type { ReaderPaperKey } from '@/lib/constants';
import { readerTheme, resolveReaderPaper, type ReaderTheme } from '@/lib/readerAppearance';
import { useReaderPrefs } from '@/lib/readerPrefs';

/**
 * Reader screens call this instead of useColorScheme() + themeColor(), so
 * their content follows the reader's paper theme (lib/readerAppearance.ts).
 */
export function useReaderAppearance(): { paper: ReaderPaperKey; isDark: boolean; theme: ReaderTheme } {
  const systemDark = useColorScheme() === 'dark';
  const { prefs } = useReaderPrefs();
  const paper = resolveReaderPaper(prefs.paper, systemDark);
  return useMemo(() => ({ paper, ...readerTheme(paper) }), [paper]);
}
