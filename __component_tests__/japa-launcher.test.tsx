import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { JapaLauncherScreen } from '@/components/japa/JapaLauncherScreen';
import { themeColor } from '@/lib/constants';
import { getJapaSoundById } from '@/lib/japa-audio';
import { pickDharmaFact } from '@/lib/dharma-facts';
import { getMalaSkin } from '@/lib/mala-skins';
import { getMalaVolumeMilestone } from '@/lib/mala-milestones';
import { getNityaRankProgress } from '@/lib/nitya-rank';

// Children that are not under test and reach into notifications, storage and the network.
jest.mock('@/components/japa/ContextualJapaReminderPrompt', () => ({ ContextualJapaReminderPrompt: 'ContextualJapaReminderPrompt' }));

type LauncherProps = ComponentProps<typeof JapaLauncherScreen>;

function props(overrides: Partial<LauncherProps> = {}): LauncherProps {
  return {
    isDark: false,
    cardBg: '#fff',
    text: '#000',
    dim: '#666',
    theme: themeColor(false),
    loading: false,
    traditionLabel: 'Hindu',
    authenticatedUserId: null,
    japaReminderEnabled: null,
    japaAlreadyDoneToday: false,
    syncPendingCount: 0,
    syncFailedCount: 0,
    syncQueueUnavailable: false,
    mantra: { key: 'gayatri', label: 'Gayatri Mantra', devanagari: 'गायत्री मंत्र', transliteration: 'Gāyatrī Mantra', meaning: 'A universal mantra of light and wisdom.', tradition: 'all' as const },
    malaSkin: getMalaSkin('default'),
    targetRounds: 1,
    streak: 3,
    selectedSoundId: 'off',
    activeSound: getJapaSoundById('off'),
    rank: getNityaRankProgress('hindu', 3),
    volume: getMalaVolumeMilestone(300),
    fact: pickDharmaFact('hindu'),
    reduceMotion: false,
    onConfigureReminder: jest.fn(),
    onReviewSync: jest.fn(),
    onSelectTargetRounds: jest.fn(),
    onChangeMala: jest.fn(),
    onOpenSound: jest.fn(),
    onOpenInsights: jest.fn(),
    onStart: jest.fn(),
    ...overrides,
  };
}

describe('JapaLauncherScreen', () => {
  it('shows the chosen mantra, the mala and the practice summary', async () => {
    await render(<JapaLauncherScreen {...props()} />);
    expect(screen.getByText('Choose your practice')).toBeTruthy();
    expect(screen.getByText('Gayatri Mantra')).toBeTruthy();
    expect(screen.getByText('Japa Mala · Hindu')).toBeTruthy();
    expect(screen.getByText('1 × 108')).toBeTruthy();
    expect(screen.getByText('3 days')).toBeTruthy();
    expect(screen.queryByText('Japa complete for today')).toBeNull();
  });

  it('starts the practice when Begin Japa is pressed', async () => {
    const onStart = jest.fn();
    await render(<JapaLauncherScreen {...props({ onStart })} />);
    await fireEvent.press(screen.getByLabelText('Begin Japa'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('opens the sound sheet from the Ambient sound card and names the current sound', async () => {
    const onOpenSound = jest.fn();
    await render(<JapaLauncherScreen {...props({ onOpenSound })} />);
    expect(screen.getByText('Sound: Off')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Ambient sound. Current sound is Off'));
    expect(onOpenSound).toHaveBeenCalledTimes(1);
  });

  it('changes the mala from the Change mala card, which says which mala is current', async () => {
    const onChangeMala = jest.fn();
    await render(<JapaLauncherScreen {...props({ onChangeMala })} />);
    await fireEvent.press(screen.getByLabelText(/^Change mala\. Current mala is /));
    expect(onChangeMala).toHaveBeenCalledTimes(1);
  });

  it('opens the insights from the top-right button and from Recent sessions', async () => {
    const onOpenInsights = jest.fn();
    await render(<JapaLauncherScreen {...props({ onOpenInsights })} />);
    await fireEvent.press(screen.getByLabelText('Japa insights'));
    await fireEvent.press(screen.getByLabelText('View recent Japa sessions'));
    expect(onOpenInsights).toHaveBeenCalledTimes(2);
  });

  it('tells someone when today\'s japa is already done', async () => {
    await render(<JapaLauncherScreen {...props({ japaAlreadyDoneToday: true })} />);
    expect(screen.getByText('Japa complete for today')).toBeTruthy();
  });

  it('shows a loader and no controls while the practice data is loading', async () => {
    await render(<JapaLauncherScreen {...props({ loading: true })} />);
    expect(screen.queryByLabelText('Begin Japa')).toBeNull();
    expect(screen.queryByText('Choose your practice')).toBeNull();
  });

  it('offers a review of rounds that could not be saved, and counts waiting ones', async () => {
    const onReviewSync = jest.fn();
    await render(<JapaLauncherScreen {...props({ syncFailedCount: 2, syncPendingCount: 1, onReviewSync })} />);
    expect(screen.getByText('1 round is waiting to sync.')).toBeTruthy();
    expect(screen.getByText(/2 rounds couldn.t be saved/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('2 rounds could not be saved. Review'));
    expect(onReviewSync).toHaveBeenCalledTimes(1);
  });

  it('says so when the pending saves cannot be checked, instead of showing nothing', async () => {
    await render(<JapaLauncherScreen {...props({ syncQueueUnavailable: true })} />);
    expect(screen.getByText('Could not check pending saves.')).toBeTruthy();
  });

  it('shows the current sound by name once one is chosen', async () => {
    await render(<JapaLauncherScreen {...props({ selectedSoundId: 'tanpura-a', activeSound: { ...getJapaSoundById('off'), label: 'Tanpura (Key A)', subtitle: 'Deep' } })} />);
    expect(screen.getByText('Tanpura (Key A)')).toBeTruthy();
    expect(screen.getByLabelText('Ambient sound. Current sound is Tanpura (Key A)')).toBeTruthy();
  });
});
