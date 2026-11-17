import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { VirtualSanctumModal } from '@/components/tirtha/VirtualSanctumModal';
import type { TempleSanctumNode } from '@/lib/yatra-data';

// The other sanctum render test uses the preset's Modal mock, which renders nothing while `visible` is false, as Android's Modal does.
// On iOS the real Modal keeps its children until the dismissal animation has finished (node_modules/react-native/Libraries/Modal/
// Modal.js, `_shouldShowModal`), so for a moment the sheet is still on screen after `visible` went false. This file replaces the
// Modal with one that always renders its children, to cover that moment: the chant must stop at once, the counts must not vanish
// under a sheet that is sliding away, and a sanctum opened again in that moment must still start over (AGENTS.md section 40).
// Not covered, and not claimed: the real Modal, its animation, and how long the lingering lasts on a device.

jest.mock('react-native/Libraries/Modal/Modal', () => ({
  __esModule: true,
  default: ({ children }: { children?: unknown }) => children ?? null,
}));

const mockAudio = {
  loadAndPlay: jest.fn<(source: string, loop?: boolean, onComplete?: () => void) => Promise<boolean>>(async () => true),
  pause: jest.fn(async () => undefined),
  resume: jest.fn(async () => undefined),
  stop: jest.fn(async () => undefined),
  setRate: jest.fn(async () => undefined),
  setVolume: jest.fn(async () => undefined),
};
jest.mock('@/hooks/useAudioPlayer', () => ({ useAudioPlayer: () => mockAudio }));
jest.mock('@/lib/api', () => ({ apiFetch: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), useFocusEffect: () => undefined }));
jest.mock('@/components/ui/FlowerShowerOverlay', () => ({ FlowerShowerOverlay: () => null }));

// Made-up fixture text on purpose: this tests lifecycle, and must not pass for temple content.
const TEMPLE: TempleSanctumNode = {
  id: 'fixture-temple',
  name: 'Fixture Temple',
  sanskritName: 'Fixture Sanskrit Name',
  deity: 'Fixture Deity',
  location: 'Fixture Town',
  stateOrRegion: 'Fixture State',
  sacredRiverOrKund: 'Fixture River',
  architecturalStyle: 'Fixture Style',
  sthalaPurana: 'Fixture sthala purana paragraph.',
  significance: 'Fixture significance paragraph.',
  offerings: ['Fixture offering one'],
  stotraOrChant: { title: 'Fixture Chant', description: 'Fixture chant description.', audioUrl: 'https://example.test/chant.mp3' },
  colorAccent: '#000000',
  latitude: 0,
  longitude: 0,
};

const sanctum = (visible: boolean) => <VirtualSanctumModal temple={TEMPLE} tradition="sanatan" visible={visible} onClose={jest.fn()} />;

beforeEach(() => {
  mockAudio.stop.mockClear();
  mockAudio.loadAndPlay.mockClear();
});

describe('VirtualSanctumModal while the Modal is still sliding away (iOS)', () => {
  it('stops a playing chant the moment the sanctum is closed, while the sheet is still on screen', async () => {
    await render(sanctum(true));
    await fireEvent.press(screen.getByLabelText('Play stotra audio'));
    expect(screen.getByLabelText('Pause stotra audio')).toBeTruthy();
    mockAudio.stop.mockClear();

    await screen.rerender(sanctum(false));

    expect(screen.getByLabelText('Close temple darshan')).toBeTruthy();
    expect(mockAudio.stop).toHaveBeenCalled();
    expect(screen.getByLabelText('Play stotra audio')).toBeTruthy();
  });

  it('keeps the counts on the sheet while it slides away, and starts over when it is opened again in that moment', async () => {
    await render(sanctum(true));
    await fireEvent.press(screen.getByLabelText('Ring Temple Bell'));
    await fireEvent.press(screen.getByLabelText('Perform Sacred Parikrama'));
    expect(screen.getByText('Ring Bell (1)')).toBeTruthy();

    await screen.rerender(sanctum(false));
    expect(screen.getByText('Ring Bell (1)')).toBeTruthy();

    await screen.rerender(sanctum(true));
    expect(screen.getByText('Ring Bell')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.queryByText('1')).toBeNull();
  });
});
