import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('Tirtha Sacred Visit Flow & Modal Contract', () => {
  const tirthaSrc = readFileSync(new URL('../app/(tabs)/tirtha.tsx', import.meta.url), 'utf8');

  it('normalizes single-letter OSM types (w, n, r) to canonical way, node, relation', () => {
    assert.match(
      tirthaSrc,
      /function normalizeOsmSourceId/,
      'Must contain normalizeOsmSourceId helper'
    );
    assert.match(
      tirthaSrc,
      /rawSub === 'w' \|\| rawSub === 'way' \? 'way'/,
      'Must normalize w/way to way'
    );
    assert.match(
      tirthaSrc,
      /rawSub === 'r' \|\| rawSub === 'relation' \? 'relation'/,
      'Must normalize r/relation to relation'
    );
  });

  it('guarantees templeToPlaceRow produces canonical IDs matching backend contract', () => {
    assert.match(
      tirthaSrc,
      /sourceId = normalizeOsmSourceId\(temple\.id\.slice\('osm:'\.length\)\)/,
      'Must normalize OSM sourceId in templeToPlaceRow'
    );
    assert.match(
      tirthaSrc,
      /const normalizedId = source === 'osm' \? `osm:\$\{sourceId\}` : temple\.id;/,
      'Must produce canonical normalizedId for osm sources'
    );
  });

  it('provides a tappable backdrop on the check-in modal to dismiss when tapping outside', () => {
    assert.match(
      tirthaSrc,
      /<Pressable[^>]*style=\{StyleSheet\.absoluteFill\}[^>]*onPress=\{closeCheckIn\}/,
      'Modal must provide a Pressable backdrop filling the screen to dismiss when tapping outside'
    );
  });

  it('includes an explicit Close ("X") button in the sheet header', () => {
    assert.match(
      tirthaSrc,
      /<Feather name="x" size=\{18\} color=\{dim\} \/>/,
      'Header must provide an explicit Close (x) icon button'
    );
    assert.match(
      tirthaSrc,
      /<PressableSurface[^>]*onPress=\{closeCheckIn\}[^>]*accessibilityLabel="Close sheet"/,
      'Close icon button must trigger closeCheckIn'
    );
  });

  it('renders check-in errors inside the sheet rather than trapping the devotee', () => {
    assert.match(
      tirthaSrc,
      /\{checkinError \? \(/,
      'Must conditionally render checkinError inside the sheet'
    );
    assert.match(
      tirthaSrc,
      /setCheckinError\(errorData\?\.error \|\| 'Could not save this place\.'\)/,
      'Must surface server error inside modal'
    );
  });

  it('provides an explicit Cancel button alongside Save visit', () => {
    assert.match(
      tirthaSrc,
      /<PressableSurface[^>]*onPress=\{closeCheckIn\}[^>]*>\s*<Text[^>]*>\s*Cancel\s*<\/Text>/,
      'Must provide an explicit Cancel button below Save visit'
    );
  });
});
