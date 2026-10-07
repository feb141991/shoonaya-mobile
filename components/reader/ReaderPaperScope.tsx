import { useMemo, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';

import { ReaderAppearanceContext } from '@/lib/readerAppearanceContext';
import { useReaderAppearance } from '@/lib/useReaderAppearance';

/**
 * Applies the reader paper theme to shared primitives (Screen, SacredLoader,
 * Card, Button) for a reader screen's own loading / error / empty states,
 * which render outside ReaderShell. ReaderShell provides the same context
 * for the page itself.
 */
export function ReaderPaperScope({ children }: { children: ReactNode }) {
  const { isDark, theme } = useReaderAppearance();
  const value = useMemo(() => ({ isDark, theme }), [isDark, theme]);
  return (
    <ReaderAppearanceContext.Provider value={value}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ReaderAppearanceContext.Provider>
  );
}
