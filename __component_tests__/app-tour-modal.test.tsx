import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';

import { AppTourModal } from '@/components/tour/AppTourModal';
import { themeColor } from '@/lib/constants';

// AppTourModal was split into the modal and four slide components (components/tour). The compiler checks each prop's
// type, but it cannot see a slide that is handed the wrong width or colour scheme, a control that calls the wrong
// handler, or a bead that stops counting. These tests press the real controls of the whole tour and read what a
// person would read. __tests__/app-tour-modal.test.ts still pins the layout rules (flex: 1 on label rows) as text.
//
// Mocked: what a render on Node cannot run (the colour scheme, and the Supabase client that Button reaches through the
// language context: its URL polyfill is an ES module Node cannot load, and a render outside a LanguageProvider falls
// back to English without calling it) and the haptics from jest.setup.ts. The modal, the four slides, Button and
// PressableSurface are real. Not covered, and not claimed: how it looks or feels on a device, the real swipe and its
// paging, real haptics, light and dark rendering by eye, large text, and Android.

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const mockScheme = { current: 'light' as 'light' | 'dark' };
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockScheme.current }));

const impact = Haptics.impactAsync as unknown as jest.Mock;
const selection = Haptics.selectionAsync as unknown as jest.Mock;
const WIDTH = Dimensions.get('window').width;

const EN_TITLES = ['Panchang & Sacred Days', 'Japa & Daily Rituals', 'Bhakti, Pathshala & Stories', 'Kutumb & Mandali'];
const HI_TITLES = ['पंचांग व पावन पर्व', 'जप व दैनिक अनुष्ठान', 'भक्ति, पाठ व अमर गाथाएं', 'कुटुम्ब व सत्संग मंडली'];

async function open(props: { isHindi?: boolean; onClose?: () => void } = {}) {
  const onClose = props.onClose ?? jest.fn();
  await render(<AppTourModal visible onClose={onClose} isHindi={props.isHindi} />);
  return onClose;
}

const press = (label: string) => fireEvent.press(screen.getByLabelText(label));
const next = () => press('Next tour slide');
const previous = () => press('Previous tour slide');
// The pager's scrollTo is the jest.fn the React Native jest preset puts on every ScrollView; it is cleared between tests.
const scrollTo = ScrollView.prototype.scrollTo as unknown as jest.Mock;
type Host = ReturnType<typeof screen.getByText>;
const hostsOfType = (type: string) => screen.container.queryAll((node) => node.type === type);

// The root view of a slide is the nearest ancestor of its title that has a width: the pager gives each slide one screen.
function slideRoot(title: string): Host {
  let node: Host | null = screen.getByText(title);
  while (node && StyleSheet.flatten(node.props.style)?.width === undefined) node = node.parent;
  if (!node) throw new Error(`no slide root above "${title}"`);
  return node;
}

// The four story-style progress bars at the top: the only views 3.5 high that share the row equally.
function progressColours(): Array<unknown> {
  return screen.container
    .queryAll((node) => node.type === 'View')
    .map((view) => StyleSheet.flatten(view.props.style))
    .filter((style) => style?.height === 3.5 && style?.flex === 1)
    .map((style) => style?.backgroundColor);
}

beforeEach(() => {
  mockScheme.current = 'light';
});

describe('AppTourModal', () => {
  it('opens on the first of four slides, with Skip and Next, and no Previous', async () => {
    await open();
    expect(screen.getByText('TOUR 1 OF 4')).toBeTruthy();
    expect(screen.getByLabelText('Skip tour')).toBeTruthy();
    expect(screen.getByLabelText('Next tour slide')).toBeTruthy();
    expect(screen.queryByLabelText('Previous tour slide')).toBeNull();
    expect(screen.queryByLabelText('Enter Shoonaya Sanctuary')).toBeNull();
    for (const title of EN_TITLES) expect(screen.getByText(title)).toBeTruthy();
  });

  it('renders nothing while it is not visible', async () => {
    await render(<AppTourModal visible={false} onClose={jest.fn()} />);
    expect(screen.queryByText('TOUR 1 OF 4')).toBeNull();
    expect(screen.queryByLabelText('Close tour')).toBeNull();
  });

  describe('moving between slides', () => {
    it('walks forward one slide per Next, swaps Previous in for Skip, and swaps Enter Sanctuary in for Next on the last slide', async () => {
      await open();
      await next();
      expect(screen.getByText('TOUR 2 OF 4')).toBeTruthy();
      expect(screen.getByLabelText('Previous tour slide')).toBeTruthy();
      expect(screen.queryByLabelText('Skip tour')).toBeNull();

      await next();
      expect(screen.getByText('TOUR 3 OF 4')).toBeTruthy();
      expect(screen.getByLabelText('Next tour slide')).toBeTruthy();
      expect(screen.queryByLabelText('Enter Shoonaya Sanctuary')).toBeNull();

      await next();
      expect(screen.getByText('TOUR 4 OF 4')).toBeTruthy();
      expect(screen.getByLabelText('Enter Shoonaya Sanctuary')).toBeTruthy();
      expect(screen.queryByLabelText('Next tour slide')).toBeNull();
      expect(screen.getByLabelText('Previous tour slide')).toBeTruthy();
    });

    it('scrolls the pager by exactly one screen width per step, in the right direction', async () => {
      await open();
      await next();
      expect(scrollTo).toHaveBeenLastCalledWith({ x: WIDTH, animated: true });
      await next();
      expect(scrollTo).toHaveBeenLastCalledWith({ x: WIDTH * 2, animated: true });
      await next();
      expect(scrollTo).toHaveBeenLastCalledWith({ x: WIDTH * 3, animated: true });
      await previous();
      expect(scrollTo).toHaveBeenLastCalledWith({ x: WIDTH * 2, animated: true });
      expect(screen.getByText('TOUR 3 OF 4')).toBeTruthy();
      await previous();
      await previous();
      expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: true });
      expect(screen.getByText('TOUR 1 OF 4')).toBeTruthy();
      expect(screen.getByLabelText('Skip tour')).toBeTruthy();
      expect(screen.queryByLabelText('Previous tour slide')).toBeNull();
    });

    it('follows a swipe to the nearest slide, ignores a swipe to a place that is not a slide, and carries on from where the swipe ended', async () => {
      const swipeTo = (x: number) =>
        act(async () => {
          fireEvent(hostsOfType('RCTScrollView')[0], 'momentumScrollEnd', { nativeEvent: { contentOffset: { x, y: 0 } } });
        });
      await open();

      // Slide n sits n screens along. 1.4 screens along is nearer the second slide, 1.6 is nearer the third.
      await swipeTo(WIDTH * 1.4);
      expect(screen.getByText('TOUR 2 OF 4')).toBeTruthy();
      await swipeTo(WIDTH * 1.6);
      expect(screen.getByText('TOUR 3 OF 4')).toBeTruthy();
      await swipeTo(WIDTH * 2);
      expect(screen.getByText('TOUR 3 OF 4')).toBeTruthy();

      // Just past the last slide (four screens along would be a fifth slide), far past it, and before the first.
      await swipeTo(WIDTH * 4);
      expect(screen.getByText('TOUR 3 OF 4')).toBeTruthy();
      await swipeTo(WIDTH * 9);
      expect(screen.getByText('TOUR 3 OF 4')).toBeTruthy();
      await swipeTo(-WIDTH);
      expect(screen.getByText('TOUR 3 OF 4')).toBeTruthy();

      await next();
      expect(screen.getByText('TOUR 4 OF 4')).toBeTruthy();
      expect(scrollTo).toHaveBeenLastCalledWith({ x: WIDTH * 3, animated: true });
    });

    it('fills the progress bars to match: past bars soft, the current bar solid, the rest plain', async () => {
      const theme = themeColor(false);
      await open();
      expect(progressColours()).toEqual([theme.brand, theme.borderSoft, theme.borderSoft, theme.borderSoft]);
      await next();
      expect(progressColours()).toEqual([theme.brandSoft, theme.brand, theme.borderSoft, theme.borderSoft]);
      await next();
      await next();
      expect(progressColours()).toEqual([theme.brandSoft, theme.brandSoft, theme.brandSoft, theme.brand]);
    });
  });

  describe('leaving the tour', () => {
    it('closes from Skip on the first slide', async () => {
      const onClose = await open();
      await press('Skip tour');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes from the close button on any slide', async () => {
      const onClose = await open();
      await press('Close tour');
      expect(onClose).toHaveBeenCalledTimes(1);
      await next();
      await next();
      await press('Close tour');
      expect(onClose).toHaveBeenCalledTimes(2);
      expect(selection).toHaveBeenCalledTimes(2);
    });

    it('closes from Enter Sanctuary on the last slide', async () => {
      const onClose = await open();
      await next();
      await next();
      await next();
      expect(onClose).not.toHaveBeenCalled();
      await press('Enter Shoonaya Sanctuary');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes from the Android back button', async () => {
      const onClose = await open();
      await act(async () => {
        hostsOfType('Modal')[0].props.onRequestClose?.();
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('never closes while moving between slides', async () => {
      const onClose = await open();
      await next();
      await next();
      await previous();
      await next();
      await next();
      await previous();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('the practice slide bead', () => {
    const beadLabel = (n: number) => `Count bead ${n}`;

    it('counts one bead per tap, with one light haptic, and changes nothing else', async () => {
      const onClose = await open();
      expect(screen.getByText('1 / 108')).toBeTruthy();
      expect(screen.getByText('Gentle tactile vibration like a real Mala')).toBeTruthy();
      expect(screen.queryByText('+1 bead counted · Works 100% offline')).toBeNull();
      impact.mockClear();

      await press(beadLabel(1));
      expect(screen.getByText('2 / 108')).toBeTruthy();
      expect(screen.getByLabelText(beadLabel(2))).toBeTruthy();
      expect(screen.getByText('+1 bead counted · Works 100% offline')).toBeTruthy();
      expect(screen.queryByText('Gentle tactile vibration like a real Mala')).toBeNull();
      expect(impact).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenLastCalledWith('light');

      await press(beadLabel(2));
      expect(screen.getByText('3 / 108')).toBeTruthy();
      expect(impact).toHaveBeenCalledTimes(2);

      expect(screen.getByText('TOUR 1 OF 4')).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled();
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('keeps the count while the person moves to other slides and back', async () => {
      await open();
      await press(beadLabel(1));
      await press(beadLabel(2));
      await next();
      await next();
      await previous();
      await previous();
      expect(screen.getByText('3 / 108')).toBeTruthy();
      expect(screen.getByLabelText(beadLabel(3))).toBeTruthy();
    });

    it('goes round the mala: the 108th bead shows 108 / 108 and the next tap starts again at 1', async () => {
      await open();
      for (let tapped = 1; tapped < 108; tapped++) await press(beadLabel(tapped));
      expect(screen.getByText('108 / 108')).toBeTruthy();
      expect(screen.getByLabelText(beadLabel(108))).toBeTruthy();
      await press(beadLabel(108));
      expect(screen.getByText('1 / 108')).toBeTruthy();
      expect(screen.getByLabelText(beadLabel(1))).toBeTruthy();
    });
  });

  describe('Hindi', () => {
    it('shows the Hindi position, controls and slide titles, and none of the English ones', async () => {
      await open({ isHindi: true });
      expect(screen.getByText('झलक 1 / 4')).toBeTruthy();
      expect(screen.getByLabelText('यात्रा बन्द करें')).toBeTruthy();
      expect(screen.getByLabelText('यात्रा छोड़ें')).toBeTruthy();
      expect(screen.getByLabelText('अगला पृष्ठ')).toBeTruthy();
      expect(screen.queryByText('TOUR 1 OF 4')).toBeNull();
      expect(screen.queryByLabelText('Next tour slide')).toBeNull();
      for (const title of HI_TITLES) expect(screen.getByText(title)).toBeTruthy();
      for (const title of EN_TITLES) expect(screen.queryByText(title)).toBeNull();

      await press('अगला पृष्ठ');
      expect(screen.getByText('झलक 2 / 4')).toBeTruthy();
      expect(screen.getByLabelText('पिछला पृष्ठ')).toBeTruthy();
      await press('अगला पृष्ठ');
      await press('अगला पृष्ठ');
      expect(screen.getByLabelText('शरणस्थली में प्रवेश करें')).toBeTruthy();
    });

    it('counts the bead in Hindi too', async () => {
      await open({ isHindi: true });
      await press('मनका 1 गिनें');
      expect(screen.getByText('2 / 108')).toBeTruthy();
      expect(screen.getByLabelText('मनका 2 गिनें')).toBeTruthy();
      expect(screen.getByText('+1 मनका गिना गया · 100% ऑफ़लाइन कार्य करता है')).toBeTruthy();
    });
  });

  describe('what each slide is handed', () => {
    it('gives every slide one full screen width', async () => {
      await open();
      for (const title of EN_TITLES) expect(StyleSheet.flatten(slideRoot(title).props.style).width).toBe(WIDTH);
    });

    it('colours the title of every slide from the light theme', async () => {
      await open();
      for (const title of EN_TITLES) expect(StyleSheet.flatten(screen.getByText(title).props.style).color).toBe(themeColor(false).text);
    });

    it('uses the dark theme on every slide in dark mode', async () => {
      mockScheme.current = 'dark';
      await open();
      for (const title of EN_TITLES) expect(StyleSheet.flatten(screen.getByText(title).props.style).color).toBe(themeColor(true).text);
      expect(themeColor(true).text).not.toBe(themeColor(false).text);
      expect(themeColor(true).brand).not.toBe(themeColor(false).brand);
      expect(progressColours()[0]).toBe(themeColor(true).brand);
    });
  });
});
