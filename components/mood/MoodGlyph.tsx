import React from 'react';
import Svg, { Circle, Path, Line } from 'react-native-svg';

export interface MoodGlyphProps {
  mood: string;
  color: string;
  size?: number;
}

export function MoodGlyph({ mood, color, size = 28 }: MoodGlyphProps) {
  const renderGlyph = (): React.ReactNode => {
    switch (mood.toLowerCase()) {
      case 'anxious':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Circle cx="16" cy="16" r="3" stroke={color} fill="none" strokeWidth="2" />
            <Circle cx="16" cy="16" r="6" stroke={color} fill="none" strokeWidth="2" />
            <Circle cx="16" cy="16" r="9" stroke={color} fill="none" strokeWidth="2" />
            <Circle cx="16" cy="16" r="12" stroke={color} fill="none" strokeWidth="2" />
          </Svg>
        );

      case 'grieving':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Path
              d="M 16 6 Q 12 10 12 15 Q 12 22 16 26 Q 20 22 20 15 Q 20 10 16 6"
              stroke={color}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );

      case 'angry':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Line x1="8" y1="9" x2="13" y2="23" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="14" y1="9" x2="19" y2="23" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="20" y1="9" x2="25" y2="23" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          </Svg>
        );

      case 'scattered':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Circle cx="8" cy="8" r="2" stroke={color} fill="none" strokeWidth="2" />
            <Circle cx="24" cy="10" r="2" stroke={color} fill="none" strokeWidth="2" />
            <Circle cx="14" cy="16" r="2" stroke={color} fill="none" strokeWidth="2" />
            <Circle cx="10" cy="26" r="2" stroke={color} fill="none" strokeWidth="2" />
            <Circle cx="26" cy="24" r="2" stroke={color} fill="none" strokeWidth="2" />
            <Circle cx="20" cy="6" r="2" stroke={color} fill="none" strokeWidth="2" />
          </Svg>
        );

      case 'lost':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Path
              d="M 20.5 8.4 A 10 10 0 1 0 20.5 23.6 A 8 8 0 0 1 20.5 8.4 Z"
              stroke={color}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );

      case 'joyful':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Circle cx="16" cy="16" r="4" stroke={color} fill="none" strokeWidth="2" />
            <Line x1="16" y1="4" x2="16" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <Line x1="16" y1="24" x2="16" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <Line x1="4" y1="16" x2="8" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <Line x1="24" y1="16" x2="28" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <Line x1="7" y1="7" x2="9.9" y2="9.9" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <Line x1="22.1" y1="22.1" x2="25" y2="25" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <Line x1="25" y1="7" x2="22.1" y2="9.9" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <Line x1="9.9" y1="22.1" x2="7" y2="25" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </Svg>
        );

      case 'seeking':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Circle cx="10" cy="10" r="6" stroke={color} fill="none" strokeWidth="2" />
            <Line x1="15" y1="15" x2="24" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </Svg>
        );

      case 'lonely':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Path
              d="M 8 20 Q 16 10 24 20"
              stroke={color}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Line x1="6" y1="18" x2="10" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <Line x1="26" y1="18" x2="22" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </Svg>
        );

      case 'overwhelmed':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Path
              d="M 4 8 Q 8 12 16 8 Q 24 4 28 8"
              stroke={color}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 4 16 Q 8 20 16 16 Q 24 12 28 16"
              stroke={color}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 4 24 Q 8 28 16 24 Q 24 20 28 24"
              stroke={color}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );

      case 'grateful':
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Circle cx="16" cy="16" r="2.5" stroke={color} fill={color} />
            <Path d="M 16 13.5 Q 12 9 16 5 Q 20 9 16 13.5 Z" stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 16 18.5 Q 12 23 16 27 Q 20 23 16 18.5 Z" stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 18 14.5 Q 23 11 26 6 Q 24 13 18 14.5 Z" stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 14 17.5 Q 9 21 6 26 Q 8 19 14 17.5 Z" stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 14 14.5 Q 9 11 6 6 Q 8 13 14 14.5 Z" stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M 18 17.5 Q 23 21 26 26 Q 24 19 18 17.5 Z" stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );

      default:
        return (
          <Svg viewBox="0 0 32 32" width={size} height={size}>
            <Circle cx="16" cy="16" r="8" stroke={color} fill="none" strokeWidth="2" />
          </Svg>
        );
    }
  };

  return <>{renderGlyph()}</>;
}
