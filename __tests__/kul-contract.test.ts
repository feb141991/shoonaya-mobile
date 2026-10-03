import assert from "node:assert/strict";
import test from "node:test";

import { canRetainKulSnapshot, getKulTaskHref } from "../lib/kul-contract";

test("KUL tasks resolve only to known Native practice routes", () => {
  assert.equal(getKulTaskHref("read"), "/pathshala");
  assert.equal(getKulTaskHref("recite"), "/shloka");
  assert.equal(getKulTaskHref("memorise"), "/shloka");
  assert.equal(getKulTaskHref("practice"), "/(tabs)/japa");
});

test("KUL private snapshot is retained only for its original signed-in owner", () => {
  assert.equal(canRetainKulSnapshot("user-a", "user-a"), true);
  assert.equal(canRetainKulSnapshot("user-a", "user-b"), false);
  assert.equal(canRetainKulSnapshot(null, "user-a"), false);
});
