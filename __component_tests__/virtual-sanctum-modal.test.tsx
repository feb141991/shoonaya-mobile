import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Animated, StyleSheet } from 'react-native';

import { VirtualSanctumActions } from '@/components/tirtha/VirtualSanctumActions';
import { VirtualSanctumModal } from '@/components/tirtha/VirtualSanctumModal';
import { VirtualSanctumStage } from '@/components/tirtha/VirtualSanctumStage';
import { COLORS, themeColor } from '@/lib/constants';
import type { TempleSanctumNode, YatraTradition } from '@/lib/yatra-data';
import { SANATAN_SANCTUM_PROFILE, type SanctumProfile } from '@/lib/yatra-sanctum-profile';

// VirtualSanctumModal was split into a stage, an action row, a tab bar and a tab body (components/tirtha). The
// compiler checks each prop's type and __tests__/virtual-sanctum-prop-wiring.test.ts checks the call sites, but
// neither can see a button inside a component that calls the wrong handler, or a pill that selects the wrong tab.
// These tests press the real controls of the whole modal and read what a person would read.
//
// Mocked: what a render on Node cannot run (audio, network, router, the colour scheme) and the petal shower, which is
// replaced by a recorder so a test can see when it is asked to show. The four pieces and everything else are real.
// Not covered, and not claimed: how it looks or feels on a device, the swing and glow animations, real haptics,
// real audio, and Android.

const mockAudio = {
  loadAndPlay: jest.fn<(source: string, loop?: boolean, onComplete?: () => void) => Promise<boolean>>(async () => true),
  pause: jest.fn(async () => undefined),
  resume: jest.fn(async () => undefined),
  stop: jest.fn(async () => undefined),
  setRate: jest.fn(async () => undefined),
  setVolume: jest.fn(async () => undefined),
};
jest.mock('@/hooks/useAudioPlayer', () => ({ useAudioPlayer: () => mockAudio }));

type TtsResponse = { ok: boolean; json: () => Promise<{ audioContent?: string }> };
const mockApiFetch = jest.fn<(path: string, init?: { method?: string; body?: string }) => Promise<TtsResponse>>();
jest.mock('@/lib/api', () => ({
  apiFetch: (path: string, init?: { method?: string; body?: string }) => mockApiFetch(path, init),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => undefined,
}));

const mockScheme = { current: 'light' as 'light' | 'dark' };
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockScheme.current }));

const mockShower: { props: { show: boolean; onComplete?: () => void; count?: number } | null } = { props: null };
jest.mock('@/components/ui/FlowerShowerOverlay', () => ({
  FlowerShowerOverlay: (props: { show: boolean; onComplete?: () => void; count?: number }) => {
    mockShower.props = props;
    return null;
  },
}));

// Made-up fixture text on purpose: this tests wiring, and must not pass for temple content.
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
  offerings: ['Fixture offering one', 'Fixture offering two'],
  stotraOrChant: { title: 'Fixture Chant', description: 'Fixture chant description.', audioUrl: 'https://example.test/chant.mp3' },
  colorAccent: '#000000',
  latitude: 0,
  longitude: 0,
};

const TEMPLE_WITHOUT_AUDIO_URL: TempleSanctumNode = {
  ...TEMPLE,
  stotraOrChant: { title: 'Fixture Chant', description: 'Fixture chant description.' },
};

const TEMPLE_WITHOUT_CHANT: TempleSanctumNode = { ...TEMPLE, stotraOrChant: undefined };

const impact = Haptics.impactAsync as unknown as jest.Mock;

// The tradition is the circuit's, not the shrine's (lib/yatra-sanctum-profile.ts). Every test below that does not say otherwise
// is a Hindu circuit, which is exactly what the sanctum showed for every shrine before profiles existed.
async function open(temple: TempleSanctumNode | null = TEMPLE, onClose: () => void = jest.fn(), tradition: YatraTradition = 'sanatan') {
  await render(<VirtualSanctumModal temple={temple} tradition={tradition} visible onClose={onClose} />);
  return onClose;
}

beforeEach(() => {
  mockScheme.current = 'light';
  mockShower.props = null;
});

describe('VirtualSanctumModal', () => {
  it('shows the temple, its stage and the Darshan tab first', async () => {
    await open();
    expect(screen.getByText('FIXTURE STATE · SACRED TIRTHA')).toBeTruthy();
    expect(screen.getByText('Fixture Temple')).toBeTruthy();
    expect(screen.getByText('Fixture Sanskrit Name')).toBeTruthy();
    expect(screen.getByText('Fixture Deity')).toBeTruthy();
    expect(screen.getByText('PARIKRAMA')).toBeTruthy();
    expect(screen.getByText('Fixture Town')).toBeTruthy();
    expect(screen.getByText('Fixture River')).toBeTruthy();
    expect(screen.getByText('Fixture Style')).toBeTruthy();
    expect(screen.getByText('Fixture significance paragraph.')).toBeTruthy();
    expect(screen.queryByText('Fixture sthala purana paragraph.')).toBeNull();
    expect(screen.queryByText('Fixture offering one')).toBeNull();
  });

  it('renders nothing without a temple, and nothing while closed', async () => {
    await open(null);
    expect(screen.queryByLabelText('Close temple darshan')).toBeNull();
    await render(<VirtualSanctumModal temple={TEMPLE} tradition="sanatan" visible={false} onClose={jest.fn()} />);
    expect(screen.queryByLabelText('Close temple darshan')).toBeNull();
  });

  it('closes from the close button, and stops the audio first', async () => {
    const onClose = await open();
    mockAudio.stop.mockClear();
    await fireEvent.press(screen.getByLabelText('Close temple darshan'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockAudio.stop).toHaveBeenCalledTimes(1);
  });

  it('stops the audio when the sanctum is closed from outside, and when another temple is opened', async () => {
    await render(<VirtualSanctumModal temple={TEMPLE} tradition="sanatan" visible onClose={jest.fn()} />);
    mockAudio.stop.mockClear();
    await screen.rerender(<VirtualSanctumModal temple={{ ...TEMPLE, id: 'another-temple' }} tradition="sanatan" visible onClose={jest.fn()} />);
    expect(mockAudio.stop).toHaveBeenCalled();
    mockAudio.stop.mockClear();
    await screen.rerender(<VirtualSanctumModal temple={{ ...TEMPLE, id: 'another-temple' }} tradition="sanatan" visible={false} onClose={jest.fn()} />);
    expect(mockAudio.stop).toHaveBeenCalled();
  });

  describe('diya', () => {
    it('lights and puts out the diya from the action button and from either diya on the stage, and nothing else changes', async () => {
      await open();
      expect(screen.getByText('Light Diya')).toBeTruthy();
      expect(screen.getAllByText('Tap to Light')).toHaveLength(2);

      await fireEvent.press(screen.getByLabelText('Light Ghee Diya'));
      expect(screen.getByText('Diya Lit')).toBeTruthy();
      expect(screen.getAllByText('Deepam')).toHaveLength(2);
      expect(impact).toHaveBeenLastCalledWith('medium');

      await fireEvent.press(screen.getByLabelText('Light left temple diya'));
      expect(screen.getByText('Light Diya')).toBeTruthy();
      expect(screen.getAllByText('Tap to Light')).toHaveLength(2);

      await fireEvent.press(screen.getByLabelText('Light right temple diya'));
      expect(screen.getByText('Diya Lit')).toBeTruthy();

      // Lighting a diya does not ring the bell, offer a flower or walk a parikrama.
      expect(screen.getByText('Ring Bell')).toBeTruthy();
      expect(screen.getByText('Offer Pushpam')).toBeTruthy();
      expect(screen.getByText('0')).toBeTruthy();
    });
  });

  describe('bell', () => {
    it('counts a ring from the action button and from the hanging bell, with a heavy tap, and nothing else changes', async () => {
      await open();
      await fireEvent.press(screen.getByLabelText('Ring Temple Bell'));
      expect(screen.getByText('Ring Bell (1)')).toBeTruthy();
      expect(impact).toHaveBeenLastCalledWith('heavy');

      await fireEvent.press(screen.getByLabelText('Ring sanctum bell'));
      expect(screen.getByText('Ring Bell (2)')).toBeTruthy();

      expect(screen.getByText('Light Diya')).toBeTruthy();
      expect(screen.getByText('Offer Pushpam')).toBeTruthy();
      expect(screen.getByText('0')).toBeTruthy();
    });
  });

  describe('parikrama', () => {
    it('adds one to the count on the stage, with a medium tap, and nothing else changes', async () => {
      await open();
      await fireEvent.press(screen.getByLabelText('Perform Sacred Parikrama'));
      expect(screen.getByText('1')).toBeTruthy();
      expect(impact).toHaveBeenLastCalledWith('medium');
      await fireEvent.press(screen.getByLabelText('Perform Sacred Parikrama'));
      expect(screen.getByText('2')).toBeTruthy();

      expect(screen.getByText('Ring Bell')).toBeTruthy();
      expect(screen.getByText('Offer Pushpam')).toBeTruthy();
      expect(screen.getByText('Light Diya')).toBeTruthy();
    });
  });

  describe('flowers', () => {
    it('counts each offering with a light tap and asks for the petal shower of 40, which ends when it says so', async () => {
      await open();
      expect(mockShower.props?.show).toBe(false);
      await fireEvent.press(screen.getByLabelText('Offer Sacred Flowers'));
      expect(screen.getByText('Offer Pushpam (1)')).toBeTruthy();
      expect(impact).toHaveBeenLastCalledWith('light');
      await waitFor(() => expect(mockShower.props?.show).toBe(true));
      expect(mockShower.props?.count).toBe(40);

      await act(async () => mockShower.props?.onComplete?.());
      expect(mockShower.props?.show).toBe(false);

      await fireEvent.press(screen.getByLabelText('Offer Sacred Flowers'));
      expect(screen.getByText('Offer Pushpam (2)')).toBeTruthy();
      await waitFor(() => expect(mockShower.props?.show).toBe(true));

      expect(screen.getByText('Ring Bell')).toBeTruthy();
      expect(screen.getByText('Light Diya')).toBeTruthy();
    });
  });

  describe('tabs', () => {
    it('shows one tab body at a time, each from its own pill', async () => {
      await open();

      await fireEvent.press(screen.getByText('Sthala Purana'));
      expect(screen.getByText('STHALA PURANA & SACRED ORIGINS')).toBeTruthy();
      expect(screen.getByText('Fixture sthala purana paragraph.')).toBeTruthy();
      expect(screen.queryByText('Fixture significance paragraph.')).toBeNull();
      expect(screen.queryByText('Fixture offering one')).toBeNull();

      await fireEvent.press(screen.getByText('Offerings'));
      expect(screen.getByText('TRADITIONAL OFFERINGS & RITUALS')).toBeTruthy();
      expect(screen.getByText('Fixture offering one')).toBeTruthy();
      expect(screen.getByText('Fixture offering two')).toBeTruthy();
      expect(screen.queryByText('Fixture sthala purana paragraph.')).toBeNull();
      expect(screen.queryByText('Fixture significance paragraph.')).toBeNull();

      await fireEvent.press(screen.getByText('Darshan'));
      expect(screen.getByText('Fixture significance paragraph.')).toBeTruthy();
      expect(screen.queryByText('Fixture offering one')).toBeNull();
    });

    it('fills the selected pill with the gold accent of the colour scheme, and only that pill', async () => {
      const pillColour = (label: string) => StyleSheet.flatten(screen.getByText(label).parent?.props.style).backgroundColor;

      await open();
      expect(pillColour('Darshan')).toBe(COLORS.brandGoldLight);
      expect(pillColour('Sthala Purana')).not.toBe(COLORS.brandGoldLight);
      await fireEvent.press(screen.getByText('Offerings'));
      expect(pillColour('Offerings')).toBe(COLORS.brandGoldLight);
      expect(pillColour('Darshan')).not.toBe(COLORS.brandGoldLight);
    });

    it('uses the dark gold accent in dark mode', async () => {
      mockScheme.current = 'dark';
      await open();
      expect(StyleSheet.flatten(screen.getByText('Darshan').parent?.props.style).backgroundColor).toBe(COLORS.brandGoldDark);
    });
  });

  describe('stotra audio', () => {
    it('plays the recording from its address, then pauses, resumes, and goes back to Chant when it ends', async () => {
      await open();
      expect(screen.getByText('Fixture Chant')).toBeTruthy();
      expect(screen.getByText('Authentic Chanting Recording')).toBeTruthy();
      expect(screen.getByText('Chant')).toBeTruthy();

      await fireEvent.press(screen.getByLabelText('Play stotra audio'));
      await waitFor(() => expect(screen.getByLabelText('Pause stotra audio')).toBeTruthy());
      expect(mockAudio.loadAndPlay).toHaveBeenCalledTimes(1);
      expect(mockAudio.loadAndPlay).toHaveBeenCalledWith('https://example.test/chant.mp3', false, expect.any(Function));
      expect(mockApiFetch).not.toHaveBeenCalled();
      expect(impact).toHaveBeenLastCalledWith('light');

      await fireEvent.press(screen.getByLabelText('Pause stotra audio'));
      await waitFor(() => expect(screen.getByText('Resume')).toBeTruthy());
      expect(mockAudio.pause).toHaveBeenCalledTimes(1);
      expect(mockAudio.resume).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByLabelText('Play stotra audio'));
      await waitFor(() => expect(screen.getByLabelText('Pause stotra audio')).toBeTruthy());
      expect(mockAudio.resume).toHaveBeenCalledTimes(1);
      expect(mockAudio.loadAndPlay).toHaveBeenCalledTimes(1);

      const whenFinished = mockAudio.loadAndPlay.mock.calls[0][2];
      await act(async () => whenFinished?.());
      expect(screen.getByText('Chant')).toBeTruthy();
      expect(screen.getByLabelText('Play stotra audio')).toBeTruthy();
    });

    it('recites the title and description through the speech service when there is no recording, and says nothing about a recording', async () => {
      mockApiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ audioContent: 'QUJD' }) });
      await open(TEMPLE_WITHOUT_AUDIO_URL);
      expect(screen.queryByText('Authentic Chanting Recording')).toBeNull();

      await fireEvent.press(screen.getByLabelText('Play stotra audio'));
      await waitFor(() => expect(screen.getByLabelText('Pause stotra audio')).toBeTruthy());
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      const [path, init] = mockApiFetch.mock.calls[0];
      expect(path).toBe('/api/tts');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body ?? '{}').text).toBe('Fixture Chant. Fixture chant description.');
      expect(mockAudio.loadAndPlay).toHaveBeenCalledWith('data:audio/mpeg;base64,QUJD', false, expect.any(Function));
    });

    it('goes back to Chant, and plays nothing, when the speech service answers with an error, even if the answer has a body', async () => {
      mockApiFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ audioContent: 'QUJD' }) });
      await open(TEMPLE_WITHOUT_AUDIO_URL);
      await fireEvent.press(screen.getByLabelText('Play stotra audio'));
      await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByText('Chant')).toBeTruthy());
      expect(mockAudio.loadAndPlay).not.toHaveBeenCalled();
    });

    it('goes back to Chant, and plays nothing, when the speech service answers without any audio', async () => {
      mockApiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await open(TEMPLE_WITHOUT_AUDIO_URL);
      await fireEvent.press(screen.getByLabelText('Play stotra audio'));
      await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByText('Chant')).toBeTruthy());
      expect(mockAudio.loadAndPlay).not.toHaveBeenCalled();
    });

    it('offers no audio control for a temple without a chant', async () => {
      await open(TEMPLE_WITHOUT_CHANT);
      expect(screen.queryByLabelText('Play stotra audio')).toBeNull();
      expect(screen.queryByText('Chant')).toBeNull();
    });
  });

  describe('live darshan', () => {
    it('closes the sanctum and opens Live Darshan', async () => {
      const onClose = await open();
      await fireEvent.press(screen.getByLabelText('Open Live Darshan Stream'));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/live-darshan');
    });
  });

  // The floor line used to be one Shaiva mantra printed for every temple (Vishnu, Krishna and Gurdwara shrines included).
  // It is now a recorded fact of a shrine (lib/yatra-data.ts, __tests__/yatra-sanctum-mantra.test.ts pins which ones).
  describe('sanctum floor line', () => {
    it('shows the mantra a shrine records, exactly as recorded', async () => {
      await open({ ...TEMPLE, sanctumFloorMantra: 'Fixture floor mantra' });
      expect(screen.getByText('Fixture floor mantra')).toBeTruthy();
    });

    it('shows no floor line for a shrine that records none, and never falls back to a default mantra', async () => {
      await open();
      expect(screen.queryByText(/✦/)).toBeNull();
      expect(screen.queryByText(/शिवाय/)).toBeNull();
      expect(screen.queryByText(/महादेव/)).toBeNull();
    });
  });

  // A shrine records no tradition; its circuit does, and the screen passes it in. Before this the sanctum showed the Hindu
  // mandir ritual set (Om, bell, diyas, flowers, "Sthala Purana") on the four Sikh Panj Takht gurdwaras too.
  // The same fixture shrine is rendered under each tradition, so the prop and nothing about the shrine is what changes.
  // Which sanctum actions belong at a gurdwara has not been reviewed by a Sikh reviewer: the ritual set is withheld, not decided.
  describe('what a shrine offers follows the tradition of its circuit', () => {
    const mandirControlLabels = [
      'Light Ghee Diya',
      'Light left temple diya',
      'Light right temple diya',
      'Ring sanctum bell',
      'Ring Temple Bell',
      'Offer Sacred Flowers',
    ];
    const mandirControlTexts = ['Light Diya', 'Tap to Light', 'Ring Bell', 'Offer Pushpam', '🔔', '🪔', '🌸'];

    function expectNoMandirRituals() {
      for (const label of mandirControlLabels) expect(screen.queryByLabelText(label)).toBeNull();
      for (const text of mandirControlTexts) expect(screen.queryByText(text)).toBeNull();
      expect(screen.queryByText(/diya|deepam|pushpam/i)).toBeNull();
    }

    it('a Hindu circuit keeps every control: Om, the bell, both diyas, flowers, the parikrama tally and Sthala Purana', async () => {
      await open(TEMPLE, jest.fn(), 'sanatan');
      expect(screen.getByText('🕉️')).toBeTruthy();
      expect(screen.queryByText('☬')).toBeNull();
      for (const label of mandirControlLabels) expect(screen.getAllByLabelText(label).length).toBeGreaterThan(0);
      expect(screen.getByText('Light Diya')).toBeTruthy();
      expect(screen.getByText('Offer Pushpam')).toBeTruthy();
      expect(screen.getByText('Ring Bell')).toBeTruthy();
      expect(screen.getByText('PARIKRAMA')).toBeTruthy();
      expect(screen.getByText('+1 Parikrama')).toBeTruthy();
      await fireEvent.press(screen.getByText('Sthala Purana'));
      expect(screen.getByText('STHALA PURANA & SACRED ORIGINS')).toBeTruthy();
      expect(screen.getByText('Fixture sthala purana paragraph.')).toBeTruthy();
    });

    it('a Sikh circuit shows the Khanda and none of the mandir ritual set, but keeps the shrine itself', async () => {
      await open(TEMPLE, jest.fn(), 'sikh');
      expect(screen.getByText('☬')).toBeTruthy();
      expect(screen.queryByText('🕉️')).toBeNull();
      expectNoMandirRituals();

      // The shrine is still all there: its name, deity, darshan text, chant card, offerings and Live Darshan.
      expect(screen.getByText('Fixture Temple')).toBeTruthy();
      expect(screen.getByText('Fixture Deity')).toBeTruthy();
      expect(screen.getByText('Fixture significance paragraph.')).toBeTruthy();
      expect(screen.getByText('Fixture Chant')).toBeTruthy();
      expect(screen.getByLabelText('Open Live Darshan Stream')).toBeTruthy();
      await fireEvent.press(screen.getByText('Offerings'));
      expect(screen.getByText('Fixture offering one')).toBeTruthy();
    });

    it('a Sikh circuit calls the second tab History, never Sthala Purana, and shows the same recorded text under it', async () => {
      await open(TEMPLE, jest.fn(), 'sikh');
      expect(screen.queryByText('Sthala Purana')).toBeNull();
      await fireEvent.press(screen.getByText('History'));
      expect(screen.getByText('HISTORY & ORIGINS')).toBeTruthy();
      expect(screen.queryByText('STHALA PURANA & SACRED ORIGINS')).toBeNull();
      expect(screen.getByText('Fixture sthala purana paragraph.')).toBeTruthy();
    });

    it('a Sikh circuit still offers the parikrama tally, and a press counts it without asking for flowers or the bell', async () => {
      await open(TEMPLE, jest.fn(), 'sikh');
      expect(screen.getByText('PARIKRAMA')).toBeTruthy();
      await fireEvent.press(screen.getByLabelText('Perform Sacred Parikrama'));
      expect(screen.getByText('1')).toBeTruthy();
      expect(impact).toHaveBeenLastCalledWith('medium');
      expect(mockShower.props?.show).toBe(false);
      expectNoMandirRituals();
    });

    it('centres the parikrama tally on the stage when no diyas stand beside it, and spreads it between them when they do', async () => {
      // PARIKRAMA's text sits in the ring, and the ring sits in the row that lays out the diyas and the ring.
      const rowJustify = () => StyleSheet.flatten(screen.getByText('PARIKRAMA').parent?.parent?.props.style).justifyContent;
      await open(TEMPLE, jest.fn(), 'sikh');
      expect(rowJustify()).toBe('center');
      await screen.unmount();
      await open(TEMPLE, jest.fn(), 'sanatan');
      expect(rowJustify()).toBe('space-between');
    });

    it.each([['jain'], ['buddhist'], ['SANATAN'], ['']])('a circuit whose tradition is %j gets no ritual controls, no tally and no symbol', async (tradition) => {
      await open(TEMPLE, jest.fn(), tradition as unknown as YatraTradition);
      expect(screen.queryByText('🕉️')).toBeNull();
      expect(screen.queryByText('☬')).toBeNull();
      expect(screen.queryByText('PARIKRAMA')).toBeNull();
      expect(screen.queryByLabelText('Perform Sacred Parikrama')).toBeNull();
      expectNoMandirRituals();
      // Nothing is lost of the shrine itself.
      expect(screen.getByText('Fixture Deity')).toBeTruthy();
      expect(screen.getByText('Fixture significance paragraph.')).toBeTruthy();
      expect(screen.getByText('History')).toBeTruthy();
    });

    // The two flags are independent: no shipped profile has the ritual set on and the tally off (or the reverse), but the type
    // allows it, and a piece that only worked when both moved together would break on the first profile that splits them.
    describe('the stage and the action row follow each flag on its own', () => {
      const stage = (profile: SanctumProfile) =>
        render(
          <VirtualSanctumStage
            bellRotation={new Animated.Value(0).interpolate({ inputRange: [-1, 0, 1], outputRange: ['-18deg', '0deg', '18deg'] })}
            diyaLit={false}
            handleLightDiya={jest.fn()}
            handleRingBell={jest.fn()}
            parikramaCount={0}
            profile={profile}
            sanctumBg={['#000000', '#111111']}
            temple={TEMPLE}
          />,
        );
      const actions = (profile: SanctumProfile) =>
        render(
          <VirtualSanctumActions
            bellRungCount={0}
            diyaLit={false}
            flowersCount={0}
            goldAccent="#000000"
            handleLightDiya={jest.fn()}
            handleOfferFlower={jest.fn()}
            handleParikrama={jest.fn()}
            handleRingBell={jest.fn()}
            isDark={false}
            parikramaCount={0}
            profile={profile}
            theme={themeColor(false)}
          />,
        );
      const ritualsOnly: SanctumProfile = { ...SANATAN_SANCTUM_PROFILE, showParikrama: false };
      const tallyOnly: SanctumProfile = { ...SANATAN_SANCTUM_PROFILE, showMandirRituals: false };

      it('stage: the ritual set without the tally draws the bell and both diyas, and no ring', async () => {
        await stage(ritualsOnly);
        expect(screen.getByLabelText('Ring sanctum bell')).toBeTruthy();
        expect(screen.getAllByText('Tap to Light')).toHaveLength(2);
        expect(screen.queryByText('PARIKRAMA')).toBeNull();
      });

      it('stage: the tally without the ritual set draws the ring alone, with no bell and no diyas', async () => {
        await stage(tallyOnly);
        expect(screen.getByText('PARIKRAMA')).toBeTruthy();
        expect(screen.queryByLabelText('Ring sanctum bell')).toBeNull();
        expect(screen.queryByText('Tap to Light')).toBeNull();
      });

      it('action row: the ritual set without the tally offers the three rituals and no +1 Parikrama', async () => {
        await actions(ritualsOnly);
        expect(screen.getByText('Light Diya')).toBeTruthy();
        expect(screen.getByText('Offer Pushpam')).toBeTruthy();
        expect(screen.getByText('Ring Bell')).toBeTruthy();
        expect(screen.queryByText('+1 Parikrama')).toBeNull();
      });

      it('action row: the tally without the ritual set offers +1 Parikrama alone', async () => {
        await actions(tallyOnly);
        expect(screen.getByText('+1 Parikrama')).toBeTruthy();
        expect(screen.queryByText('Light Diya')).toBeNull();
        expect(screen.queryByText('Offer Pushpam')).toBeNull();
        expect(screen.queryByText('Ring Bell')).toBeNull();
      });
    });

    it('follows the prop when it changes while the sanctum is open, and not the shrine', async () => {
      await open(TEMPLE, jest.fn(), 'sanatan');
      expect(screen.getByText('🕉️')).toBeTruthy();
      await screen.rerender(<VirtualSanctumModal temple={TEMPLE} tradition="sikh" visible onClose={jest.fn()} />);
      expect(screen.getByText('☬')).toBeTruthy();
      expect(screen.queryByText('🕉️')).toBeNull();
      expectNoMandirRituals();
    });
  });
});
