import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { themeColor } from '@/lib/constants';
import type { ReaderTheme } from '@/lib/readerAppearance';

// Lets shared UI primitives (Surface/Card, Button) follow the reader's paper
// theme when they are rendered inside a reader, without changing them anywhere
// else. ReaderShell provides it; outside a reader the value is null and
// primitives keep following the device colour scheme exactly as before.

export type ReaderAppearanceValue = { isDark: boolean; theme: ReaderTheme };

export const ReaderAppearanceContext = createContext<ReaderAppearanceValue | null>(null);

/** Reader paper colours inside a reader, the device scheme everywhere else. */
export function useSchemeOrReaderAppearance(): ReaderAppearanceValue {
  const reader = useContext(ReaderAppearanceContext);
  const systemDark = useColorScheme() === 'dark';
  return reader ?? { isDark: systemDark, theme: themeColor(systemDark) };
}
