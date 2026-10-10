import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View, useColorScheme } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Card } from "@/components/ui/Card";
import { PressableSurface } from "@/components/ui/PressableSurface";
import { SacredLoader } from "@/components/ui/SacredLoader";
import { Screen } from "@/components/ui/Screen";
import { AuthGate } from "@/components/ui/AuthGate";
import {
  COLORS,
  FONTS,
  MIN_TOUCH_TARGET,
  SHADOWS,
  TYPE,
  themeColor,
} from "@/lib/constants";
import { useAppIdentity } from "@/lib/appIdentity";
import {
  joinKulByToken,
  previewKulInvitation,
  type UniversalKulPreview,
} from "@/lib/kul";

export default function KulJoinScreen() {
  const isDark = useColorScheme() === "dark";
  const theme = themeColor(isDark);
  const router = useRouter();
  const identity = useAppIdentity();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [preview, setPreview] = useState<UniversalKulPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authGateVisible, setAuthGateVisible] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!token) {
      setError("No invitation link found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await previewKulInvitation(token);
      setPreview(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid or expired family invitation link.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const handleJoin = async () => {
    if (identity.kind !== "authenticated") {
      setAuthGateVisible(true);
      return;
    }
    if (!token || !preview) return;

    setJoining(true);
    setError(null);
    try {
      await joinKulByToken(identity.userId, token);
      router.replace({ pathname: "/kul", params: { section: "family" } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not join family circle. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <Screen header={{ title: "Family Invitation" }} style={{ paddingHorizontal: 16 }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 24,
        }}
      >
        {loading ? (
          <SacredLoader
            title="Verifying Invitation"
            subtitle="Fetching family circle details…"
          />
        ) : error || !preview ? (
          <Card
            tone="auto"
            style={{
              width: "100%",
              backgroundColor: theme.card,
              borderColor: COLORS.dangerBorder,
              gap: 14,
              padding: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Feather name="alert-circle" size={28} color={COLORS.danger} />
              <Text style={{ ...TYPE.cardHeading, color: theme.text, flex: 1 }}>
                Invalid Invitation
              </Text>
            </View>
            <Text style={{ ...TYPE.body, color: theme.dim }}>
              {error || "This invitation link is no longer valid or has expired."}
            </Text>
            <PressableSurface
              accessibilityLabel="Go to Family KUL"
              onPress={() => router.replace("/kul")}
              haptic="selection"
              style={{
                minHeight: MIN_TOUCH_TARGET,
                borderRadius: 14,
                backgroundColor: theme.brand,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ ...TYPE.label, color: COLORS.ink }}>
                Go to Family Circle
              </Text>
            </PressableSurface>
          </Card>
        ) : (
          <Card
            elevated
            tone="auto"
            style={{
              width: "100%",
              backgroundColor: theme.card,
              borderColor: theme.premiumBorder,
              gap: 20,
              padding: 24,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                backgroundColor: theme.brandSoft,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 36 }}>{preview.avatarEmoji}</Text>
            </View>

            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ ...TYPE.hero, color: theme.text, textAlign: "center" }}>
                {preview.kulName}
              </Text>
              <Text style={{ ...TYPE.body, color: theme.dim, textAlign: "center" }}>
                Invited by {preview.guardianName || "Family Guardian"}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                backgroundColor: theme.cardSoft,
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 14,
                width: "100%",
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
                  {preview.memberCount}
                </Text>
                <Text style={{ ...TYPE.caption, color: theme.dim }}>
                  {preview.memberCount === 1 ? "Member" : "Members"}
                </Text>
              </View>
            </View>

            <Text
              style={{
                ...TYPE.caption,
                color: theme.dim,
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              Joining will connect your profile to this private family circle,
              giving you access to shared dates, practice goals, and family heritage.
            </Text>

            <PressableSurface
              accessibilityLabel="Join Family Circle"
              disabled={joining}
              onPress={() => void handleJoin()}
              haptic="impact"
              style={{
                width: "100%",
                minHeight: MIN_TOUCH_TARGET,
                borderRadius: 16,
                backgroundColor: theme.brand,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: joining ? 0.7 : 1,
                boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              }}
            >
              {joining ? (
                <ActivityIndicator size="small" color={COLORS.ink} />
              ) : (
                <Feather name="users" size={18} color={COLORS.ink} />
              )}
              <Text style={{ ...TYPE.label, color: COLORS.ink }}>
                {joining ? "Joining Family…" : "Join Family Circle"}
              </Text>
            </PressableSurface>

            <PressableSurface
              accessibilityLabel="Cancel"
              onPress={() => router.replace("/kul")}
              haptic="selection"
              style={{
                minHeight: MIN_TOUCH_TARGET,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ ...TYPE.caption, color: theme.dim }}>Cancel</Text>
            </PressableSurface>
          </Card>
        )}

        <AuthGate
          visible={authGateVisible}
          onClose={() => setAuthGateVisible(false)}
          title="Sign in to join family circle"
          message="Sign in or create an account to accept this family invitation."
        />
      </View>
    </Screen>
  );
}
