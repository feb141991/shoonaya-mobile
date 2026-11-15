import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Animated, StyleSheet } from 'react-native';

import { JapaBeadRing } from '@/components/japa/JapaBeadRing';
import { BEAD_RADIUS, HOOK_TUCK, PENDANT_SWAY, PRACTICE_CENTER_Y, PRACTICE_PENDANT, PRACTICE_RADIUS_Y, PRACTICE_SVG_WIDTH } from '@/lib/japaBeadRing';
import { getMalaSkin } from '@/lib/mala-skins';

function ringElement({ skin = 'default', ringScale = 1, sway = 0 }: { skin?: string; ringScale?: number; sway?: number } = {}) {
  const value = (n: number) => new Animated.Value(n).interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  return (
    <JapaBeadRing
      count={0}
      malaSkin={getMalaSkin(skin)}
      brandColor="#d98a1d"
      ringScale={ringScale}
      offsetY={0}
      bloomIndex={null}
      pulseRadius={value(0)}
      pulseOpacity={value(0)}
      bloomRadius={value(0)}
      bloomOpacity={value(0)}
      tapScale={value(0)}
      swayRotate={new Animated.Value(sway).interpolate({ inputRange: [-1, 1], outputRange: [`-${PENDANT_SWAY.maxDegrees}deg`, `${PENDANT_SWAY.maxDegrees}deg`] })}
    />
  );
}

const pendantStyle = () => StyleSheet.flatten(screen.getByTestId('japa-pendant').props.style) as { top: number; left: number; width: number; height: number; transform: Array<Record<string, number | string>> };

describe('JapaBeadRing pendant', () => {
  it('hangs the guru pendant under a standard mala, with its hook inside the guru bead', async () => {
    await render(ringElement());
    const style = pendantStyle();
    const ringBottom = PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y;
    expect(style.top).toBeGreaterThan(ringBottom);
    expect(style.top).toBeLessThan(ringBottom + BEAD_RADIUS.sumeru);
    expect(ringBottom + BEAD_RADIUS.sumeru - style.top).toBe(HOOK_TUCK);
    expect(style.width).toBe(PRACTICE_PENDANT.width);
    expect(style.height).toBe(PRACTICE_PENDANT.height);
  });

  it('draws the pendant behind the beads, so the hook comes out of the guru bead', async () => {
    await render(ringElement());
    const root = screen.toJSON() as { children: Array<{ type: string; props: Record<string, unknown> }> };
    const order = root.children.map((child) => (child.props.testID === 'japa-pendant' ? 'pendant' : 'other'));
    // the pendant is the first thing drawn; the bead ring (the SVG) is drawn after it
    expect(order[0]).toBe('pendant');
    expect(root.children.length).toBeGreaterThan(1);
  });

  it('hangs no pendant under the crown-style malas', async () => {
    for (const skin of ['sphatik-crystal', 'vaijayanti-bead', 'navaratna-gems']) {
      const { unmount } = await render(ringElement({ skin }));
      expect(screen.queryByTestId('japa-pendant')).toBeNull();
      await unmount();
    }
  });

  it('swings about its top ring: shifted up, rotated, shifted back down by half its height', async () => {
    await render(ringElement({ sway: 1 }));
    const half = PRACTICE_PENDANT.height / 2;
    expect(pendantStyle().transform).toEqual([{ translateY: -half }, { rotate: `${PENDANT_SWAY.maxDegrees}deg` }, { translateY: half }]);
  });

  it('swings to the other side for the opposite kick, and sits straight at rest', async () => {
    await render(ringElement({ sway: -1 }));
    expect(pendantStyle().transform[1]).toEqual({ rotate: `-${PENDANT_SWAY.maxDegrees}deg` });
    await screen.unmount();
    await render(ringElement({ sway: 0 }));
    expect(String(pendantStyle().transform[1].rotate)).toMatch(/^-?0(\.0+)?deg$/);
  });

  it('scales the pendant and the drawing together with the screen', async () => {
    await render(ringElement({ ringScale: 0.5 }));
    const style = pendantStyle();
    expect(style.width).toBe(PRACTICE_PENDANT.width * 0.5);
    expect(style.height).toBe(PRACTICE_PENDANT.height * 0.5);
    expect(style.transform[0]).toEqual({ translateY: -(PRACTICE_PENDANT.height * 0.5) / 2 });
    expect(style.left).toBe((PRACTICE_SVG_WIDTH / 2 - PRACTICE_PENDANT.width / 2) * 0.5);
  });
});
