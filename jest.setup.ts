// Shared setup for component tests (see jest.config.js). Mock only what a render cannot run: native modules and
// native views. Everything else (this app's components, hooks and lib code) runs for real.
//
// Why these are mocked by hand and not left to jest-expo: jest-expo finds each native module's mock by parsing stack
// traces, and its parser drops "(...)" from file paths, so a checkout under a folder such as /Users/Business(C)/
// fails to load any Expo native module. Mocking them here works from any folder name. (Factories `require` what they
// need inside, because jest only allows a mock factory to reference variables it creates itself.)
/* eslint-disable @typescript-eslint/no-require-imports */
import { jest } from '@jest/globals';

jest.mock('expo-font', () => ({
  isLoaded: () => true,
  isLoading: () => false,
  loadAsync: async () => undefined,
  useFonts: () => [true, null],
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Native views are mocked as host-component names (plain strings). A mock factory cannot create elements here: the
// NativeWind Babel plugin rewrites React.createElement into a helper that jest's hoisting then refuses to see.
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
// Icons render as a host element named Feather that keeps its props, so a test can find one by its icon name.
jest.mock('@expo/vector-icons/Feather', () => ({ __esModule: true, default: 'Feather' }));

// expo-router pulls in the whole navigation stack. Components under test only need these few hooks.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true }),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: 'Link',
}));

// AsyncStorage has an official in-memory mock for Jest.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Safe-area insets: all zero, on a 390 x 844 frame (set `insets` in a test's own jest.mock to try a notch).
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  SafeAreaProvider: ({ children }: { children?: unknown }) => children,
  SafeAreaView: 'SafeAreaView',
  initialWindowMetrics: { insets: { top: 0, bottom: 0, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } },
}));
