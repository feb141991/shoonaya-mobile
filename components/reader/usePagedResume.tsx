import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { TYPE, RADII } from '@/lib/constants';
import { clearReadingPosition, getReadingPosition, isResumablePage, saveReadingPosition } from '@/lib/readingProgress';
import type { ReaderTheme } from '@/lib/readerAppearance';

// Resume + keep-awake for paged readers (Panchatantra storybook, Pathshala
// lessons) — Phase 5 of docs/READER_EXPERIENCE_GRAND_PLAN.md. Scrolling
// readers get the same behaviour from ReaderShell (Phase 3).
//
// A page is offered for resume only when it is past the first and before the
// last: reaching the last page counts as finished and forgets the position.

export function usePagedResume({
  progressId,
  version,
  page,
  total,
  goTo,
  label,
  resumedText,
}: {
  progressId: string | null;
  version: string;
  page: number;
  total: number;
  goTo: (page: number) => void;
  /** Human label for a page, e.g. "Scene 4" / "Verse 3". */
  label: (page: number) => string;
  /** e.g. readerCopy(language).resumed */
  resumedText: (where: string) => string;
}) {
  const [banner, setBanner] = useState<string | null>(null);
  const restored = useRef<string | null>(null);
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  // Restore once per content + version, after the page count is known.
  useEffect(() => {
    if (!progressId || total <= 1) return;
    const key = `${progressId}@${version}`;
    if (restored.current === key) return;
    restored.current = key;
    let cancelled = false;
    void getReadingPosition(progressId, version).then((position) => {
      const target = position?.page;
      if (cancelled || !isResumablePage(target, total)) return;
      goToRef.current(target as number);
      setBanner(resumedText(label(target as number)));
    });
    return () => { cancelled = true; };
    // label/resumedText are presentation only; restoring once per key is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressId, version, total]);

  // Save as the reader moves (only after the restore check for this key ran).
  useEffect(() => {
    if (!progressId || total <= 1 || restored.current !== `${progressId}@${version}`) return;
    if (isResumablePage(page, total)) void saveReadingPosition(progressId, version, { page, label: label(page) });
    else if (page >= total - 1) void clearReadingPosition(progressId, version);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressId, version, page, total]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [banner]);

  // Keep the screen awake while this reader is in front.
  const tag = `paged-reader-${useId()}`;
  useFocusEffect(useCallback(() => {
    void activateKeepAwakeAsync(tag).catch(() => {});
    return () => { void deactivateKeepAwake(tag).catch(() => {}); };
  }, [tag]));

  const startOver = useCallback(() => {
    setBanner(null);
    goToRef.current(0);
    if (progressId) void clearReadingPosition(progressId, version);
  }, [progressId, version]);

  return { banner, startOver };
}

/** The "Resumed where you left off · Scene 4 · Start over" pill. */
export function PagedResumeBanner({
  text, startOverLabel, onStartOver, theme, accent,
}: {
  text: string;
  startOverLabel: string;
  onStartOver: () => void;
  theme: ReaderTheme;
  accent: string;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'center',
        paddingLeft: 14,
        paddingRight: 4,
        borderRadius: RADII.pill,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text maxFontSizeMultiplier={1.35} style={{ ...TYPE.caption, color: theme.text, flexShrink: 1 }}>{text}</Text>
      <Pressable
        onPress={onStartOver}
        accessibilityRole="button"
        accessibilityLabel={startOverLabel}
        style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}
      >
        <Text maxFontSizeMultiplier={1.35} style={{ ...TYPE.label, color: accent }}>{startOverLabel}</Text>
      </Pressable>
    </View>
  );
}
