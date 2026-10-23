import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const detailScreen = readFileSync(new URL("../app/settings/detail-screen.tsx", import.meta.url), "utf8");
const settingsScreen = readFileSync(new URL("../app/settings.tsx", import.meta.url), "utf8");
const reminderTimePicker = readFileSync(new URL("../components/settings/ReminderTimePicker.tsx", import.meta.url), "utf8");

describe("Settings bottom nav clearance and compact time picker", () => {
  it("clears bottom nav in detail-screen.tsx with insets.bottom + NAV_BAR_CLEARANCE", () => {
    assert.match(detailScreen, /import \{ NAV_BAR_CLEARANCE \} from '@\/lib\/nav-bar';/);
    assert.match(detailScreen, /import \{ useSafeAreaInsets \} from 'react-native-safe-area-context';/);
    assert.match(detailScreen, /const insets = useSafeAreaInsets\(\);/);
    assert.match(detailScreen, /paddingBottom: insets\.bottom \+ NAV_BAR_CLEARANCE/);
  });

  it("clears bottom nav in settings.tsx with insets.bottom + NAV_BAR_CLEARANCE", () => {
    assert.match(settingsScreen, /import \{ NAV_BAR_CLEARANCE \} from '@\/lib\/nav-bar';/);
    assert.match(settingsScreen, /import \{ useSafeAreaInsets \} from 'react-native-safe-area-context';/);
    assert.match(settingsScreen, /const insets = useSafeAreaInsets\(\);/);
    assert.match(settingsScreen, /paddingBottom: insets\.bottom \+ NAV_BAR_CLEARANCE/);
  });

  it("uses compact dropdown buttons and modal selection in ReminderTimePicker", () => {
    assert.match(reminderTimePicker, /Modal/);
    assert.match(reminderTimePicker, /Select Hour/);
    assert.match(reminderTimePicker, /Select Minute/);
    assert.match(reminderTimePicker, /setPickerOpen/);
  });
});
