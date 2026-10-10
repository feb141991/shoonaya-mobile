import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const qrSource = readFileSync(new URL("../components/ui/QrCodeView.tsx", import.meta.url), "utf8");
const modalSource = readFileSync(new URL("../components/kul/KulInviteModal.tsx", import.meta.url), "utf8");
const joinSource = readFileSync(new URL("../app/kul/join.tsx", import.meta.url), "utf8");

test("KUL share QR uses a standards-compliant encoder rather than a decorative matrix", () => {
  assert.match(qrSource, /from "react-native-qrcode-svg"/);
  assert.match(qrSource, /value=\{value\}/);
  assert.match(qrSource, /quietZone=\{8\}/);
  assert.doesNotMatch(qrSource, /hash|Pseudo-random|isModuleActive/);
});

test("KUL invitations share the verified canonical app-link host", () => {
  assert.match(modalSource, /https:\/\/www\.shoonaya\.com\/kul\/join\?token=/);
  assert.doesNotMatch(modalSource, /shoonaya:\/\/kul\/join\?code=/);
});

test("KUL join requires an explicit user action after preview", () => {
  assert.match(joinSource, /previewKulInvitation\(token\)/);
  assert.match(joinSource, /Join Family Circle/);
  assert.match(joinSource, /onPress=\{\(\) => void handleJoin\(\)\}/);
});
