import type { ImageSourcePropType } from 'react-native';

export type TraditionKey = 'hindu' | 'sikh' | 'buddhist' | 'jain';
export type AppLanguage = 'en' | 'hi' | 'pa';

export type SacredTimePeriod = 'early_morning' | 'daytime' | 'evening' | 'night';

export type TextTreatment = 'light' | 'dark' | 'ambient_auto';

export type FocalPoint = {
  x: number; // 0.0 to 1.0 (0 = left, 0.5 = center, 1 = right)
  y: number; // 0.0 to 1.0 (0 = top, 0.5 = center, 1 = bottom)
};

export type StartupScene = {
  assetId: string;
  source: ImageSourcePropType;
  traditions: Array<TraditionKey | 'neutral'>;
  sacredTimes: SacredTimePeriod[];
  textTreatment: TextTreatment;
  cropMode: 'cover' | 'contain';
  focalPoint: FocalPoint;
  sourceRightsId: string;
  accessibilityLabel: Record<AppLanguage, string>;
  reviewStatus: 'approved' | 'pending_review' | 'in_review' | 'archived';
  version: string;
};

export type StartupGreeting = {
  title: Record<AppLanguage, string>;
  subtitle: Record<AppLanguage, string>;
  sacredPeriodName: Record<AppLanguage, string>;
};

export type StartupPreferences = {
  tradition: TraditionKey | 'neutral';
  language: AppLanguage;
  timezone: string;
};
