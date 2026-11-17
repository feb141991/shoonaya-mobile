/* eslint-disable @typescript-eslint/no-require-imports -- a jest.mock factory can only reference what it requires itself */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import YatraDetailScreen from '@/app/yatra/[id]';
import { getYatraById } from '@/lib/yatra-data';

// app/yatra/[id].tsx owns the circuit and hands the sanctum the circuit's tradition. VirtualSanctumModal's own tests render the
// modal with each tradition, but they cannot see a screen that forgets to pass it or passes a fixed one: `tradition="sanatan"`
// typed into the screen compiles and passes every modal test. This renders the real screen for each circuit, taps a shrine on a
// stand-in for the map, and reads what the sanctum and the banner show.
//
// Mocked: what a render on Node cannot run (audio, network, route params, the colour scheme) and the SVG map, which is replaced
// by one button per shrine that selects it. The screen, the modal and its four pieces are real. Not covered, and not claimed:
// how any of it looks on a device, the map itself, and Android.

jest.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    loadAndPlay: jest.fn(async () => true),
    pause: jest.fn(async () => undefined),
    resume: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    setRate: jest.fn(async () => undefined),
    setVolume: jest.fn(async () => undefined),
  }),
}));
jest.mock('@/lib/api', () => ({ apiFetch: jest.fn() }));

const mockParams: { id: string } = { id: '12-jyotirlingas' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => undefined,
  usePathname: () => '/yatra',
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => 'light' }));
jest.mock('@/components/ui/FlowerShowerOverlay', () => ({ FlowerShowerOverlay: () => null }));

jest.mock('@/components/tirtha/YatraGraphCanvas', () => {
  const { Pressable, Text } = require('react-native');
  const React = require('react');
  return {
    YatraGraphCanvas: ({ yatra, onSelectTemple }: { yatra: { temples: Array<{ id: string; name: string }> }; onSelectTemple: (temple: unknown) => void }) =>
      React.createElement(
        React.Fragment,
        null,
        ...yatra.temples.map((temple) =>
          React.createElement(
            Pressable,
            { key: temple.id, onPress: () => onSelectTemple(temple), accessibilityLabel: `Select ${temple.id}` },
            React.createElement(Text, null, temple.name),
          ),
        ),
      ),
  };
});

const MANDIR_CONTROLS = ['Light Ghee Diya', 'Light left temple diya', 'Light right temple diya', 'Ring sanctum bell', 'Ring Temple Bell', 'Offer Sacred Flowers'];

async function openShrine(circuitId: string, shrineId: string) {
  mockParams.id = circuitId;
  await render(<YatraDetailScreen />);
  await fireEvent.press(screen.getByLabelText(`Select ${shrineId}`));
}

beforeEach(() => {
  mockParams.id = '12-jyotirlingas';
});

describe('the circuit screen hands the sanctum its own circuit\'s tradition', () => {
  it('a Hindu circuit (the Jyotirlingas): the banner and the sanctum are what they always were', async () => {
    await openShrine('12-jyotirlingas', 'somnath');
    expect(screen.getByText('Pinch to zoom and drag to explore pilgrimage routes. Tap any sacred temple for virtual darshan, diya lighting, and stotras.')).toBeTruthy();
    expect(screen.getByText('🕉️')).toBeTruthy();
    expect(screen.queryByText('☬')).toBeNull();
    for (const label of MANDIR_CONTROLS) expect(screen.getAllByLabelText(label).length).toBeGreaterThan(0);
    expect(screen.getByText('Sthala Purana')).toBeTruthy();
  });

  it('the other Hindu circuit (Char Dham) gets the same, so a Vishnu or Jagannath shrine is not treated as anything else', async () => {
    await openShrine('char-dham', 'badrinath');
    expect(screen.getByText('🕉️')).toBeTruthy();
    for (const label of MANDIR_CONTROLS) expect(screen.getAllByLabelText(label).length).toBeGreaterThan(0);
  });

  it('the Sikh circuit: no diya line in the banner, the Khanda in the sanctum, and none of the mandir controls', async () => {
    await openShrine('sikh-panj-takht', 'akal-takht');
    expect(screen.getByText('Pinch to zoom and drag to explore pilgrimage routes. Tap any sacred site for virtual darshan and its history.')).toBeTruthy();
    expect(screen.queryByText(/diya|stotra/i)).toBeNull();
    expect(screen.getByText('☬')).toBeTruthy();
    expect(screen.queryByText('🕉️')).toBeNull();
    for (const label of MANDIR_CONTROLS) expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.queryByText('Sthala Purana')).toBeNull();
  });

  it('every Sikh shrine of the circuit, not only the first, is shown without the mandir controls', async () => {
    const sikh = getYatraById('sikh-panj-takht');
    expect(sikh?.temples.length).toBeGreaterThanOrEqual(4);
    mockParams.id = 'sikh-panj-takht';
    await render(<YatraDetailScreen />);
    for (const shrine of sikh?.temples ?? []) {
      await fireEvent.press(screen.getByLabelText(`Select ${shrine.id}`));
      expect(screen.getByText('☬')).toBeTruthy();
      expect(screen.queryByText('🕉️')).toBeNull();
      for (const label of MANDIR_CONTROLS) expect(screen.queryByLabelText(label)).toBeNull();
    }
  });
});
