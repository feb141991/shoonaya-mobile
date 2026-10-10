import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Share, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";

import { Card } from "@/components/ui/Card";
import { PressableSurface } from "@/components/ui/PressableSurface";
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from "@/lib/constants";
import {
  fetchKulInvitationToken,
  regenerateKulInvitationLink,
  revokeKulInvitationLink,
  type UniversalKulInvitation,
} from "@/lib/kul";
import { QrCodeView } from "@/components/ui/QrCodeView";

export function KulInviteModal({
  visible,
  onClose,
  userId,
  isGuardian,
  manualInviteCode,
  kulName,
  avatarEmoji,
  theme,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  isGuardian: boolean;
  manualInviteCode: string;
  kulName: string;
  avatarEmoji: string;
  theme: ReturnType<typeof themeColor>;
  isDark: boolean;
}) {
  const [invitation, setInvitation] = useState<UniversalKulInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchKulInvitationToken(userId);
      if (res?.invitation) {
        setInvitation(res.invitation);
      }
    } catch {
      setError("The share link could not be loaded. The manual code still works.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) {
      void loadToken();
    }
  }, [visible, loadToken]);

  const deepLink = invitation
    ? `https://www.shoonaya.com/kul/join?token=${invitation.token}`
    : null;

  const copyLink = async () => {
    if (!deepLink) return;
    await Clipboard.setStringAsync(deepLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(manualInviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareLink = async () => {
    try {
      await Share.share({
        title: `Join ${kulName} on Shoonaya`,
        message: deepLink
          ? `You are invited to join our family circle ${avatarEmoji} ${kulName} on Shoonaya! Tap the link to join:\n${deepLink}\n\nManual Code: ${manualInviteCode}`
          : `You are invited to join our family circle ${avatarEmoji} ${kulName} on Shoonaya. Manual Code: ${manualInviteCode}`,
      });
    } catch {
      setError("The share sheet could not be opened. Copy the link or manual code instead.");
    }
  };

  const handleRegenerate = async (options?: { maxUses?: number; expiresDays?: number }) => {
    if (actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await regenerateKulInvitationLink(userId, options);
      if (res?.invitation) {
        setInvitation(res.invitation);
      }
    } catch {
      setError("The invitation link could not be regenerated. The previous link remains unchanged.");
    } finally {
      setActionLoading(false);
    }
  };

  const chooseRegenerationPolicy = () => {
    Alert.alert(
      "Create a new invitation link",
      "The current link will stop working. Choose a safety limit for the replacement.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "10 uses", onPress: () => { void handleRegenerate({ maxUses: 10 }); } },
        { text: "Expires in 7 days", onPress: () => { void handleRegenerate({ expiresDays: 7 }); } },
        { text: "No limit", onPress: () => { void handleRegenerate(); } },
      ],
    );
  };

  const revoke = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await revokeKulInvitationLink(userId);
      setInvitation(null);
    } catch {
      setError("The invitation link could not be revoked. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = () => {
    Alert.alert(
      "Revoke invitation link?",
      "People with the current link will no longer be able to join. The manual code remains available.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Revoke", style: "destructive", onPress: () => { void revoke(); } },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: "flex-end" }}>
        <PressableSurface style={{ position: "absolute", inset: 0 }} onPress={onClose} />
        <Card
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            backgroundColor: theme.bg,
            borderColor: theme.border,
            padding: 24,
            gap: 18,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 26 }}>{avatarEmoji}</Text>
              <View>
                <Text style={{ ...TYPE.hero, color: theme.text, fontSize: 18 }}>Invite Family to {kulName}</Text>
                <Text style={{ ...TYPE.caption, color: theme.dim }}>Universal deep-link & QR code</Text>
              </View>
            </View>
            <PressableSurface
              accessibilityLabel="Close family invitation"
              onPress={onClose}
              style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: RADII.pill, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="x" size={20} color={theme.text} />
            </PressableSurface>
          </View>

          {/* QR Code Container */}
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 10 }}>
            {loading ? (
              <ActivityIndicator color={theme.brand} size="large" />
            ) : deepLink ? (
              <View
                style={{
                  padding: 16,
                  backgroundColor: COLORS.onMediaWhite,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                }}
              >
                <QrCodeView value={deepLink} size={170} />
              </View>
            ) : (
              <Text style={{ ...TYPE.caption, color: theme.dim, textAlign: "center" }}>
                Use the manual code below until a new share link is created.
              </Text>
            )}
            <Text style={{ ...TYPE.micro, color: theme.dim, marginTop: 8, textAlign: "center" }}>
              Scan with device camera or Shoonaya scanner
            </Text>
          </View>

          {/* Actions: Share, Copy Link */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <PressableSurface
              onPress={() => void shareLink()}
              disabled={actionLoading}
              style={{
                flex: 1,
                minHeight: MIN_TOUCH_TARGET,
                borderRadius: RADII.pill,
                backgroundColor: theme.brand,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Feather name="share-2" size={16} color={COLORS.ink} />
              <Text style={{ ...TYPE.label, color: COLORS.ink }}>Share Link</Text>
            </PressableSurface>

            <PressableSurface
              onPress={() => void copyLink()}
              disabled={!deepLink || actionLoading}
              style={{
                flex: 1,
                minHeight: MIN_TOUCH_TARGET,
                borderRadius: RADII.pill,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.cardSoft,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Feather name={copiedLink ? "check" : "copy"} size={16} color={theme.text} />
              <Text style={{ ...TYPE.label, color: theme.text }}>{copiedLink ? "Copied!" : "Copy Link"}</Text>
            </PressableSurface>
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={{ ...TYPE.caption, color: COLORS.danger, textAlign: "center" }}>
              {error}
            </Text>
          ) : null}

          {/* Manual Code Fallback */}
          <View
            style={{
              padding: 14,
              borderRadius: 16,
              backgroundColor: theme.cardSoft,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>Manual Code Fallback</Text>
              <Text style={{ ...TYPE.title, color: theme.text, letterSpacing: 1.5, marginTop: 2 }}>{manualInviteCode}</Text>
            </View>
            <PressableSurface
              onPress={() => void copyCode()}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                paddingHorizontal: 12,
                borderRadius: RADII.pill,
                backgroundColor: theme.brandSoft,
              }}
            >
              <Text style={{ ...TYPE.caption, color: theme.brand, fontFamily: FONTS.sansSemiBold }}>
                {copiedCode ? "Copied" : "Copy Code"}
              </Text>
            </PressableSurface>
          </View>

          {/* Guardian Governance Controls */}
          {isGuardian ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
              <PressableSurface
                onPress={chooseRegenerationPolicy}
                disabled={actionLoading}
                style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 }}
              >
                <Feather name="refresh-cw" size={14} color={theme.brand} />
                <Text style={{ ...TYPE.caption, color: theme.brand, fontFamily: FONTS.sansSemiBold }}>Regenerate Link</Text>
              </PressableSurface>

              {invitation ? (
                <PressableSurface
                  onPress={handleRevoke}
                  disabled={actionLoading}
                  style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 }}
                >
                  <Feather name="slash" size={14} color={COLORS.danger} />
                  <Text style={{ ...TYPE.caption, color: COLORS.danger, fontFamily: FONTS.sansSemiBold }}>Revoke Link</Text>
                </PressableSurface>
              ) : null}
            </View>
          ) : null}
        </Card>
      </View>
    </Modal>
  );
}
