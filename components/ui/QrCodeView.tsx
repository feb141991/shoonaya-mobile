import QRCode from "react-native-qrcode-svg";

import { COLORS } from "@/lib/constants";

/** Standards-compliant vector QR with error correction and a quiet zone. */
export function QrCodeView({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <QRCode
      value={value}
      size={size}
      color={COLORS.ink}
      backgroundColor={COLORS.onMediaWhite}
      ecl="M"
      quietZone={8}
    />
  );
}
