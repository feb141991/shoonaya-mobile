import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { NAV_BAR_CLEARANCE } from "@/lib/nav-bar";
import { captureAppIdentity, useAppIdentity } from "@/lib/appIdentity";
import { canRetainKulSnapshot } from "@/lib/kul-contract";
import {
  addKulFamilyMember,
  assignKulTask,
  completeKulTask,
  createKul,
  createKulEvent,
  fetchKulSnapshot,
  getKulTaskHref,
  joinKul,
  sendKulMessage,
  type KulEvent,
  type KulEventType,
  type KulMessage,
  type KulSnapshot,
  type KulTask,
  type KulTaskType,
} from "@/lib/kul";

type HubSection = "home" | "sabha" | "practice" | "family";

const SECTIONS: Array<{
  id: HubSection;
  title: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { id: "home", title: "Home", icon: "home" },
  { id: "sabha", title: "Sabha", icon: "message-circle" },
  { id: "practice", title: "Practice", icon: "check-circle" },
  { id: "family", title: "Family", icon: "users" },
];

const EMOJIS = ["🏡", "🪔", "🌿", "🕉️", "🪷", "🙏"];
const TASK_TYPES: Array<{ id: KulTaskType; label: string }> = [
  { id: "read", label: "Read" },
  { id: "recite", label: "Recite" },
  { id: "practice", label: "Practice" },
  { id: "memorise", label: "Memorise" },
];
const EVENT_TYPES: Array<{ id: KulEventType; label: string }> = [
  { id: "birthday", label: "Birthday" },
  { id: "anniversary", label: "Anniversary" },
  { id: "death_anniversary", label: "Remembrance" },
  { id: "puja", label: "Puja" },
  { id: "satsang", label: "Satsang" },
  { id: "custom", label: "Other" },
];

function localIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function eventDisplayDate(event: KulEvent, today: string) {
  const [year, month, day] = event.event_date.split("-").map(Number);
  if (!event.recurring || event.event_date >= today) return event.event_date;
  const thisYear = Number(today.slice(0, 4));
  const thisYearDate = `${thisYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (thisYearDate >= today) return thisYearDate;
  const nextYear = thisYear + 1;
  const candidate = new Date(Date.UTC(nextYear, month - 1, day));
  // A Feb 29 anniversary is observed on Feb 28 in a non-leap year.
  if (candidate.getUTCMonth() !== month - 1) candidate.setUTCDate(0);
  return candidate.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function personLabel(
  profile:
    { full_name: string | null; username: string | null } | null | undefined,
) {
  return (
    profile?.full_name?.trim() ||
    (profile?.username ? `@${profile.username}` : "Family member")
  );
}

function taskRouteLabel(taskType: KulTaskType) {
  if (taskType === "read") return "Open Pathshala";
  if (taskType === "practice") return "Open Japa";
  return "Open Shloka";
}

function Field({
  value,
  onChangeText,
  placeholder,
  theme,
  multiline = false,
  accessibilityLabel,
  maxLength,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  theme: ReturnType<typeof themeColor>;
  multiline?: boolean;
  accessibilityLabel: string;
  maxLength?: number;
}) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.dim}
      maxLength={maxLength}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      style={{
        minHeight: multiline ? 96 : MIN_TOUCH_TARGET,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.cardSoft,
        color: theme.text,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 8,
        fontFamily: FONTS.sans,
        fontSize: 15,
      }}
    />
  );
}

function ActionButton({
  label,
  onPress,
  theme,
  isDark,
  disabled = false,
  secondary = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof themeColor>;
  isDark: boolean;
  disabled?: boolean;
  secondary?: boolean;
  icon?: keyof typeof Feather.glyphMap;
}) {
  return (
    <PressableSurface
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      haptic="selection"
      style={{
        minHeight: MIN_TOUCH_TARGET,
        borderRadius: 15,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: secondary ? theme.cardSoft : theme.brand,
        borderWidth: secondary ? 1 : 0,
        borderColor: theme.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: disabled ? 0.55 : 1,
        boxShadow: secondary
          ? undefined
          : isDark
            ? SHADOWS.sm.dark
            : SHADOWS.sm.light,
      }}
    >
      {icon ? (
        <Feather
          name={icon}
          size={16}
          color={secondary ? theme.text : COLORS.ink}
        />
      ) : null}
      <Text
        style={{ ...TYPE.label, color: secondary ? theme.text : COLORS.ink }}
      >
        {label}
      </Text>
    </PressableSurface>
  );
}

function SectionHeading({
  title,
  action,
  onAction,
  theme,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  theme: ReturnType<typeof themeColor>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <Text style={{ ...TYPE.section, color: theme.brand }}>{title}</Text>
      {action && onAction ? (
        <PressableSurface
          onPress={onAction}
          haptic="selection"
          style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center" }}
        >
          <Text style={{ ...TYPE.label, color: theme.brand }}>{action}</Text>
        </PressableSurface>
      ) : null}
    </View>
  );
}

export default function KulScreen() {
  const isDark = useColorScheme() === "dark";
  const theme = themeColor(isDark);
  const router = useRouter();
  const identity = useAppIdentity();
  const snapshotRef = useRef<KulSnapshot | null>(null);
  const activeOwnerRef = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<KulSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<HubSection>("home");
  const [authGateVisible, setAuthGateVisible] = useState(false);
  const [working, setWorking] = useState(false);

  const [newKulName, setNewKulName] = useState("");
  const [newKulEmoji, setNewKulEmoji] = useState("🏡");
  const [inviteCode, setInviteCode] = useState("");
  const [messageDraft, setMessageDraft] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskType, setTaskType] = useState<KulTaskType>("practice");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(localIsoDate());
  const [eventType, setEventType] = useState<KulEventType>("custom");
  const [eventDescription, setEventDescription] = useState("");
  const [eventMember, setEventMember] = useState("");
  const [eventRecurring, setEventRecurring] = useState(false);

  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [familyRelationship, setFamilyRelationship] = useState("");
  const [familyGeneration, setFamilyGeneration] = useState("1");
  const [familyParent, setFamilyParent] = useState("");

  const clearPrivateScreenState = useCallback(() => {
    snapshotRef.current = null;
    setSnapshot(null);
    setLoading(true);
    setRefreshing(false);
    setError(null);
    setWorking(false);
    setActiveSection("home");
    setAuthGateVisible(false);
    setNewKulName("");
    setNewKulEmoji("🏡");
    setInviteCode("");
    setMessageDraft("");
    setShowTaskForm(false);
    setTaskTitle("");
    setTaskDescription("");
    setTaskType("practice");
    setTaskAssignee("");
    setTaskDueDate("");
    setShowEventForm(false);
    setEventTitle("");
    setEventDate(localIsoDate());
    setEventType("custom");
    setEventDescription("");
    setEventMember("");
    setEventRecurring(false);
    setShowFamilyForm(false);
    setFamilyName("");
    setFamilyRelationship("");
    setFamilyGeneration("1");
    setFamilyParent("");
  }, []);

  const loadSnapshot = useCallback(async (userId: string, isPull = false) => {
    const lease = captureAppIdentity();
    if (
      lease.identity.kind !== "authenticated" ||
      lease.identity.userId !== userId
    )
      return;
    if (snapshotRef.current) setRefreshing(isPull);
    else setLoading(true);
    try {
      const next = await fetchKulSnapshot(userId, localIsoDate());
      if (!lease.isCurrent()) return;
      snapshotRef.current = next;
      setSnapshot(next);
      setError(null);
    } catch (loadError) {
      if (!lease.isCurrent()) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your family circle.",
      );
    } finally {
      if (lease.isCurrent()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (identity.kind === "authenticated") {
        const changedOwner = activeOwnerRef.current !== identity.userId;
        if (changedOwner) {
          // Drafts and snapshots are private to the account that created them.
          clearPrivateScreenState();
          activeOwnerRef.current = identity.userId;
        }
        if (
          !canRetainKulSnapshot(snapshotRef.current?.userId, identity.userId)
        ) {
          // KUL messages and family records are private. Never leave the
          // previous account's snapshot visible while the next account loads.
          snapshotRef.current = null;
          setSnapshot(null);
          setLoading(true);
          setError(null);
        }
        void loadSnapshot(identity.userId);
      } else {
        if (activeOwnerRef.current !== null) clearPrivateScreenState();
        activeOwnerRef.current = null;
        snapshotRef.current = null;
        setSnapshot(null);
        setLoading(identity.kind === "loading");
        setError(null);
      }
    }, [clearPrivateScreenState, identity, loadSnapshot]),
  );

  const currentUserId =
    identity.kind === "authenticated" ? identity.userId : null;
  const kul = snapshot?.kul ?? null;
  const memberNameById = useMemo(() => {
    const result = new Map<string, string>();
    for (const member of snapshot?.members ?? []) {
      result.set(member.userId, personLabel(member.profile));
    }
    return result;
  }, [snapshot?.members]);
  const upcomingEvents = useMemo(() => {
    const today = localIsoDate();
    return (snapshot?.events ?? [])
      .map((event) => ({ event, date: eventDisplayDate(event, today) }))
      .filter((entry) => entry.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [snapshot?.events]);
  const pendingTasks = useMemo(
    () => (snapshot?.tasks ?? []).filter((task) => !task.completed),
    [snapshot?.tasks],
  );

  const runMutation = useCallback(
    async (
      operation: (userId: string) => Promise<unknown>,
      successMessage?: string,
    ) => {
      if (!currentUserId) {
        setAuthGateVisible(true);
        return false;
      }
      const lease = captureAppIdentity();
      if (
        lease.identity.kind !== "authenticated" ||
        lease.identity.userId !== currentUserId
      )
        return false;
      setWorking(true);
      try {
        await operation(currentUserId);
        if (!lease.isCurrent()) return false;
        await loadSnapshot(currentUserId, true);
        if (successMessage) Alert.alert("KUL", successMessage);
        return true;
      } catch (mutationError) {
        if (lease.isCurrent())
          Alert.alert(
            "Could not complete that action",
            mutationError instanceof Error
              ? mutationError.message
              : "Please try again.",
          );
        return false;
      } finally {
        if (lease.isCurrent()) setWorking(false);
      }
    },
    [currentUserId, loadSnapshot],
  );

  const handleCreateKul = async () => {
    const name = newKulName.trim();
    if (name.length < 2) {
      Alert.alert(
        "Add a family name",
        "Use at least two characters for your KUL name.",
      );
      return;
    }
    const success = await runMutation((userId) =>
      createKul(userId, { name, emoji: newKulEmoji }),
    );
    if (success) setNewKulName("");
  };

  const handleJoinKul = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      Alert.alert(
        "Enter an invite code",
        "Ask a family guardian for their KUL invite code.",
      );
      return;
    }
    const success = await runMutation((userId) => joinKul(userId, code));
    if (success) setInviteCode("");
  };

  const handleSendMessage = async () => {
    const content = messageDraft.trim();
    if (!content) return;
    const success = await runMutation((userId) =>
      sendKulMessage(userId, content),
    );
    if (success) setMessageDraft("");
  };

  const handleAssignTask = async () => {
    if (!taskTitle.trim() || !taskAssignee) {
      Alert.alert(
        "Complete the task details",
        "Add a title and choose a family member.",
      );
      return;
    }
    const success = await runMutation((userId) =>
      assignKulTask(userId, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        taskType,
        assignedTo: taskAssignee,
        dueDate: taskDueDate.trim() || undefined,
      }),
    );
    if (success) {
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
      setShowTaskForm(false);
    }
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim())) {
      Alert.alert("Add a name and date", "Use a date in YYYY-MM-DD format.");
      return;
    }
    const success = await runMutation((userId) =>
      createKulEvent(userId, {
        title: eventTitle.trim(),
        eventType,
        eventDate: eventDate.trim(),
        description: eventDescription.trim() || undefined,
        memberId: eventMember || undefined,
        recurring: eventRecurring,
      }),
    );
    if (success) {
      setEventTitle("");
      setEventDescription("");
      setEventMember("");
      setShowEventForm(false);
    }
  };

  const handleAddFamilyMember = async () => {
    const generation = Number(familyGeneration);
    if (
      !familyName.trim() ||
      !Number.isInteger(generation) ||
      generation < 0 ||
      generation > 20
    ) {
      Alert.alert(
        "Check the family details",
        "Add a name and a generation from 0 to 20.",
      );
      return;
    }
    const success = await runMutation((userId) =>
      addKulFamilyMember(userId, {
        name: familyName.trim(),
        relationship: familyRelationship.trim() || undefined,
        generation,
        parentId: familyParent || undefined,
      }),
    );
    if (success) {
      setFamilyName("");
      setFamilyRelationship("");
      setFamilyParent("");
      setShowFamilyForm(false);
    }
  };

  const copyInviteCode = async () => {
    if (!kul?.inviteCode) return;
    try {
      await Clipboard.setStringAsync(kul.inviteCode);
      Alert.alert(
        "Invite code copied",
        "Share it privately with a family member.",
      );
    } catch {
      Alert.alert(
        "Could not copy the code",
        "You can select and copy the invite code above.",
      );
    }
  };

  if (identity.kind === "loading" || (loading && !snapshot && currentUserId)) {
    return (
      <Screen header={{ title: "Family KUL" }}>
        <SacredLoader
          title="Opening your family circle"
          subtitle="Bringing your family space together…"
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={{ title: "Family KUL" }}
      style={{ paddingHorizontal: 16 }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          currentUserId ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadSnapshot(currentUserId, true)}
              tintColor={theme.brand}
            />
          ) : undefined
        }
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: NAV_BAR_CLEARANCE + 36,
          gap: 16,
        }}
      >
        {identity.kind !== "authenticated" ? (
          <Card
            elevated
            tone="auto"
            style={{
              backgroundColor: theme.card,
              borderColor: theme.border,
              gap: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text style={{ fontSize: 30 }}>🏡</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
                  Your family circle
                </Text>
                <Text style={{ ...TYPE.body, color: theme.dim, marginTop: 3 }}>
                  Create a KUL or join your family with an invite code.
                </Text>
              </View>
            </View>
            <ActionButton
              label="Sign in to continue"
              icon="lock"
              onPress={() => setAuthGateVisible(true)}
              theme={theme}
              isDark={isDark}
            />
          </Card>
        ) : null}

        {identity.kind === "authenticated" && !snapshot && error ? (
          <Card
            tone="auto"
            style={{
              backgroundColor: theme.card,
              borderColor: COLORS.dangerBorder,
              gap: 12,
            }}
          >
            <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
              Could not load your family circle
            </Text>
            <Text style={{ ...TYPE.body, color: theme.dim }}>{error}</Text>
            <ActionButton
              label="Retry"
              icon="refresh-cw"
              secondary
              onPress={() => void loadSnapshot(currentUserId!, true)}
              theme={theme}
              isDark={isDark}
            />
          </Card>
        ) : null}

        {identity.kind === "authenticated" && snapshot && !kul ? (
          <>
            <Card
              elevated
              tone="auto"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                gap: 14,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Text style={{ fontSize: 30 }}>🏡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
                    Start your family KUL
                  </Text>
                  <Text
                    style={{ ...TYPE.body, color: theme.dim, marginTop: 3 }}
                  >
                    Bring family practice, meaningful dates, and stories
                    together in a private circle.
                  </Text>
                </View>
              </View>
              <Field
                accessibilityLabel="Family KUL name"
                value={newKulName}
                onChangeText={setNewKulName}
                placeholder="For example, Sharma Family"
                theme={theme}
                maxLength={60}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {EMOJIS.map((emoji) => (
                  <PressableSurface
                    key={emoji}
                    accessibilityLabel={`Choose ${emoji} family emblem`}
                    accessibilityState={{ selected: newKulEmoji === emoji }}
                    onPress={() => setNewKulEmoji(emoji)}
                    haptic="selection"
                    style={{
                      width: 48,
                      height: 48,
                      minHeight: 48,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor:
                        newKulEmoji === emoji ? theme.brand : theme.border,
                      backgroundColor:
                        newKulEmoji === emoji
                          ? theme.brandSoft
                          : theme.cardSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  </PressableSurface>
                ))}
              </View>
              <ActionButton
                label={working ? "Creating…" : "Create family KUL"}
                icon="plus"
                disabled={working}
                onPress={() => void handleCreateKul()}
                theme={theme}
                isDark={isDark}
              />
            </Card>
            <Card
              tone="auto"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                gap: 12,
              }}
            >
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
                Already have an invite?
              </Text>
              <Text style={{ ...TYPE.body, color: theme.dim }}>
                Enter the code shared by your family guardian.
              </Text>
              <Field
                accessibilityLabel="KUL invite code"
                value={inviteCode}
                onChangeText={(value) => setInviteCode(value.toUpperCase())}
                placeholder="Invite code"
                theme={theme}
                maxLength={16}
              />
              <ActionButton
                label={working ? "Joining…" : "Join family KUL"}
                icon="log-in"
                disabled={working}
                onPress={() => void handleJoinKul()}
                theme={theme}
                isDark={isDark}
                secondary
              />
            </Card>
          </>
        ) : null}

        {identity.kind === "authenticated" && kul && snapshot ? (
          <>
            <Card
              elevated
              tone="auto"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.premiumBorder,
                gap: 14,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.brandSoft,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{kul.avatarEmoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ ...TYPE.hero, color: theme.text }}
                    numberOfLines={2}
                  >
                    {kul.name}
                  </Text>
                  <Text
                    style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}
                  >
                    {snapshot.members.length} family{" "}
                    {snapshot.members.length === 1 ? "member" : "members"} ·{" "}
                    {snapshot.role === "guardian" ? "Guardian" : "Member"}
                  </Text>
                </View>
              </View>
              {snapshot.role === "guardian" && kul.inviteCode ? (
                <View
                  style={{
                    borderRadius: 16,
                    padding: 12,
                    backgroundColor: theme.cardSoft,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>
                      Family invite code
                    </Text>
                    <Text
                      selectable
                      style={{
                        ...TYPE.label,
                        color: theme.text,
                        letterSpacing: 1.2,
                        marginTop: 2,
                      }}
                    >
                      {kul.inviteCode}
                    </Text>
                  </View>
                  <PressableSurface
                    accessibilityLabel="Copy family invite code"
                    onPress={() => void copyInviteCode()}
                    haptic="selection"
                    style={{
                      minHeight: MIN_TOUCH_TARGET,
                      borderRadius: 12,
                      paddingHorizontal: 11,
                      backgroundColor: theme.brandSoft,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Feather name="copy" size={14} color={theme.brand} />
                    <Text style={{ ...TYPE.caption, color: theme.brand }}>
                      Copy
                    </Text>
                  </PressableSurface>
                </View>
              ) : null}
            </Card>

            <View style={{ flexDirection: "row", gap: 6 }}>
              {SECTIONS.map((section) => {
                const selected = activeSection === section.id;
                return (
                  <PressableSurface
                    key={section.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setActiveSection(section.id)}
                    haptic="selection"
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 15,
                      borderWidth: 1,
                      borderColor: selected ? theme.brand : theme.border,
                      backgroundColor: selected ? theme.brandSoft : theme.card,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 3,
                    }}
                  >
                    <Feather
                      name={section.icon}
                      size={16}
                      color={selected ? theme.brand : theme.dim}
                    />
                    <Text
                      style={{
                        ...TYPE.chip,
                        color: selected ? theme.brand : theme.dim,
                      }}
                    >
                      {section.title}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>

            {error ? (
              <Card
                tone="auto"
                style={{
                  backgroundColor: theme.card,
                  borderColor: COLORS.dangerBorder,
                  gap: 10,
                }}
              >
                <Text style={{ ...TYPE.body, color: theme.text }}>{error}</Text>
                <ActionButton
                  label="Retry"
                  icon="refresh-cw"
                  secondary
                  onPress={() => void loadSnapshot(currentUserId!, true)}
                  theme={theme}
                  isDark={isDark}
                />
              </Card>
            ) : null}

            {activeSection === "home" ? (
              <>
                <Card
                  tone="auto"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    gap: 12,
                  }}
                >
                  <SectionHeading
                    title="Your family"
                    theme={theme}
                    action="See family"
                    onAction={() => setActiveSection("family")}
                  />
                  <View style={{ gap: 10 }}>
                    {snapshot.members.map((member) => (
                      <View
                        key={member.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: theme.brandSoft,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ ...TYPE.label, color: theme.brand }}>
                            {(
                              personLabel(member.profile)
                                .replace(/^@/, "")
                                .slice(0, 1) || "F"
                            ).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...TYPE.label, color: theme.text }}>
                            {personLabel(member.profile)}
                          </Text>
                          <Text style={{ ...TYPE.caption, color: theme.dim }}>
                            {member.role === "guardian"
                              ? "Guardian"
                              : "Family member"}
                            {member.profile?.tradition
                              ? ` · ${member.profile.tradition}`
                              : ""}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>

                <Card
                  tone="auto"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    gap: 10,
                  }}
                >
                  <SectionHeading
                    title="Family dates"
                    theme={theme}
                    action={
                      snapshot.role === "guardian" ? "Add date" : undefined
                    }
                    onAction={
                      snapshot.role === "guardian"
                        ? () => setShowEventForm((value) => !value)
                        : undefined
                    }
                  />
                  {showEventForm && snapshot.role === "guardian" ? (
                    <View style={{ gap: 10, paddingBottom: 8 }}>
                      <Field
                        accessibilityLabel="Family event name"
                        value={eventTitle}
                        onChangeText={setEventTitle}
                        placeholder="Date or gathering name"
                        theme={theme}
                        maxLength={100}
                      />
                      <Field
                        accessibilityLabel="Family event date"
                        value={eventDate}
                        onChangeText={setEventDate}
                        placeholder="YYYY-MM-DD"
                        theme={theme}
                        maxLength={10}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 7,
                        }}
                      >
                        {EVENT_TYPES.map((item) => (
                          <Choice
                            key={item.id}
                            label={item.label}
                            selected={eventType === item.id}
                            onPress={() => setEventType(item.id)}
                            theme={theme}
                          />
                        ))}
                      </View>
                      <Field
                        accessibilityLabel="Family event description"
                        value={eventDescription}
                        onChangeText={setEventDescription}
                        placeholder="Optional note"
                        theme={theme}
                        maxLength={500}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 7,
                        }}
                      >
                        <Choice
                          label="One time"
                          selected={!eventRecurring}
                          onPress={() => setEventRecurring(false)}
                          theme={theme}
                        />
                        <Choice
                          label="Repeats yearly"
                          selected={eventRecurring}
                          onPress={() => setEventRecurring(true)}
                          theme={theme}
                        />
                      </View>
                      <ActionButton
                        label={working ? "Saving…" : "Save family date"}
                        disabled={working}
                        onPress={() => void handleAddEvent()}
                        theme={theme}
                        isDark={isDark}
                      />
                    </View>
                  ) : null}
                  {upcomingEvents.length ? (
                    upcomingEvents.map(({ event, date }) => (
                      <View
                        key={event.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingVertical: 7,
                          borderTopWidth: 1,
                          borderTopColor: theme.borderSoft,
                        }}
                      >
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            backgroundColor: theme.brandSoft,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Feather
                            name={
                              event.event_type === "satsang"
                                ? "users"
                                : "calendar"
                            }
                            size={18}
                            color={theme.brand}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...TYPE.label, color: theme.text }}>
                            {event.title}
                          </Text>
                          <Text style={{ ...TYPE.caption, color: theme.dim }}>
                            {formatDate(date)}
                            {event.recurring ? " · yearly" : ""}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ ...TYPE.body, color: theme.dim }}>
                      No family dates coming up yet.
                    </Text>
                  )}
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>
                    Family dates stay private to this KUL and are separate from
                    sacred observances.
                  </Text>
                </Card>

                <Card
                  tone="auto"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    gap: 10,
                  }}
                >
                  <SectionHeading
                    title="Practice together"
                    theme={theme}
                    action="View tasks"
                    onAction={() => setActiveSection("practice")}
                  />
                  {pendingTasks.slice(0, 3).length ? (
                    pendingTasks
                      .slice(0, 3)
                      .map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          assignee={
                            memberNameById.get(task.assigned_to) ??
                            "Family member"
                          }
                          theme={theme}
                          onOpen={() =>
                            router.push(getKulTaskHref(task.task_type))
                          }
                        />
                      ))
                  ) : (
                    <Text style={{ ...TYPE.body, color: theme.dim }}>
                      No open family tasks. A guardian can add a gentle practice
                      intention.
                    </Text>
                  )}
                </Card>
              </>
            ) : null}

            {activeSection === "sabha" ? (
              <Card
                tone="auto"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  gap: 12,
                }}
              >
                <SectionHeading title="Family Sabha" theme={theme} />
                <Text style={{ ...TYPE.body, color: theme.dim }}>
                  A private place for your family to share reflections and
                  updates.
                </Text>
                <Field
                  accessibilityLabel="Write a family Sabha message"
                  value={messageDraft}
                  onChangeText={setMessageDraft}
                  placeholder="Share something with your family…"
                  theme={theme}
                  multiline
                  maxLength={500}
                />
                <ActionButton
                  label={working ? "Sending…" : "Send to family"}
                  icon="send"
                  disabled={working || !messageDraft.trim()}
                  onPress={() => void handleSendMessage()}
                  theme={theme}
                  isDark={isDark}
                />
                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.border,
                    marginVertical: 2,
                  }}
                />
                {snapshot.messages.length ? (
                  snapshot.messages.map((message) => (
                    <MessageRow
                      key={message.id}
                      message={message}
                      author={
                        memberNameById.get(message.sender_id) ?? "Family member"
                      }
                      theme={theme}
                    />
                  ))
                ) : (
                  <Text style={{ ...TYPE.body, color: theme.dim }}>
                    Start the first family conversation.
                  </Text>
                )}
                {snapshot.messages.length >= 30 ? (
                  <Text
                    style={{
                      ...TYPE.caption,
                      color: theme.dim,
                      textAlign: "center",
                    }}
                  >
                    Showing the latest 30 messages.
                  </Text>
                ) : null}
              </Card>
            ) : null}

            {activeSection === "practice" ? (
              <Card
                tone="auto"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  gap: 12,
                }}
              >
                <SectionHeading
                  title="Family practice"
                  theme={theme}
                  action={
                    snapshot.role === "guardian"
                      ? showTaskForm
                        ? "Close"
                        : "Assign task"
                      : undefined
                  }
                  onAction={
                    snapshot.role === "guardian"
                      ? () => setShowTaskForm((value) => !value)
                      : undefined
                  }
                />
                <Text style={{ ...TYPE.body, color: theme.dim }}>
                  Tasks are invitations to practice together. Completing one
                  opens the matching Native practice.
                </Text>
                {showTaskForm && snapshot.role === "guardian" ? (
                  <View style={{ gap: 10 }}>
                    <Field
                      accessibilityLabel="Practice task title"
                      value={taskTitle}
                      onChangeText={setTaskTitle}
                      placeholder="A small practice intention"
                      theme={theme}
                      maxLength={100}
                    />
                    <Field
                      accessibilityLabel="Practice task description"
                      value={taskDescription}
                      onChangeText={setTaskDescription}
                      placeholder="Optional details"
                      theme={theme}
                      maxLength={500}
                      multiline
                    />
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}
                    >
                      {TASK_TYPES.map((item) => (
                        <Choice
                          key={item.id}
                          label={item.label}
                          selected={taskType === item.id}
                          onPress={() => setTaskType(item.id)}
                          theme={theme}
                        />
                      ))}
                    </View>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>
                      Assign to
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}
                    >
                      {snapshot.members.map((member) => (
                        <Choice
                          key={member.userId}
                          label={personLabel(member.profile)}
                          selected={taskAssignee === member.userId}
                          onPress={() => setTaskAssignee(member.userId)}
                          theme={theme}
                        />
                      ))}
                    </View>
                    <Field
                      accessibilityLabel="Task due date"
                      value={taskDueDate}
                      onChangeText={setTaskDueDate}
                      placeholder="Optional due date · YYYY-MM-DD"
                      theme={theme}
                      maxLength={10}
                    />
                    <ActionButton
                      label={working ? "Assigning…" : "Assign practice"}
                      disabled={working}
                      onPress={() => void handleAssignTask()}
                      theme={theme}
                      isDark={isDark}
                    />
                  </View>
                ) : null}
                {snapshot.tasks.length ? (
                  snapshot.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      assignee={
                        memberNameById.get(task.assigned_to) ?? "Family member"
                      }
                      theme={theme}
                      onOpen={() => router.push(getKulTaskHref(task.task_type))}
                      onComplete={
                        currentUserId &&
                        (task.assigned_to === currentUserId ||
                          snapshot.role === "guardian") &&
                        !task.completed
                          ? () =>
                              Alert.alert(
                                "Complete this practice?",
                                "Mark the family task as complete?",
                                [
                                  { text: "Cancel", style: "cancel" },
                                  {
                                    text: "Complete",
                                    onPress: () =>
                                      void runMutation((userId) =>
                                        completeKulTask(userId, task.id),
                                      ),
                                  },
                                ],
                              )
                          : undefined
                      }
                      busy={working}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No family tasks yet"
                    subtitle="A guardian can assign a practice intention for the family."
                  />
                )}
              </Card>
            ) : null}

            {activeSection === "family" ? (
              <Card
                tone="auto"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  gap: 12,
                }}
              >
                <SectionHeading
                  title="Vansh · family roots"
                  theme={theme}
                  action={
                    snapshot.role === "guardian"
                      ? showFamilyForm
                        ? "Close"
                        : "Add person"
                      : undefined
                  }
                  onAction={
                    snapshot.role === "guardian"
                      ? () => setShowFamilyForm((value) => !value)
                      : undefined
                  }
                />
                <Text style={{ ...TYPE.body, color: theme.dim }}>
                  Keep family relationships and stories together. Personal birth
                  details are not collected in this Native flow.
                </Text>
                {showFamilyForm && snapshot.role === "guardian" ? (
                  <View style={{ gap: 10 }}>
                    <Field
                      accessibilityLabel="Family tree person's name"
                      value={familyName}
                      onChangeText={setFamilyName}
                      placeholder="Name"
                      theme={theme}
                      maxLength={80}
                    />
                    <Field
                      accessibilityLabel="Relationship to the family"
                      value={familyRelationship}
                      onChangeText={setFamilyRelationship}
                      placeholder="Relationship · e.g. Grandmother"
                      theme={theme}
                      maxLength={50}
                    />
                    <Field
                      accessibilityLabel="Family generation number"
                      value={familyGeneration}
                      onChangeText={setFamilyGeneration}
                      placeholder="Generation number"
                      theme={theme}
                      maxLength={2}
                    />
                    {snapshot.familyMembers.length ? (
                      <>
                        <Text style={{ ...TYPE.caption, color: theme.dim }}>
                          Optional parent in this tree
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 7,
                          }}
                        >
                          <Choice
                            label="No parent selected"
                            selected={!familyParent}
                            onPress={() => setFamilyParent("")}
                            theme={theme}
                          />
                          {snapshot.familyMembers.slice(0, 20).map((member) => (
                            <Choice
                              key={member.id}
                              label={member.name}
                              selected={familyParent === member.id}
                              onPress={() => setFamilyParent(member.id)}
                              theme={theme}
                            />
                          ))}
                        </View>
                      </>
                    ) : null}
                    <ActionButton
                      label={working ? "Saving…" : "Add to family tree"}
                      disabled={working}
                      onPress={() => void handleAddFamilyMember()}
                      theme={theme}
                      isDark={isDark}
                    />
                  </View>
                ) : null}
                {snapshot.familyMembers.length ? (
                  <View style={{ gap: 8 }}>
                    {snapshot.familyMembers.map((member) => (
                      <View
                        key={member.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          minHeight: 54,
                          gap: 10,
                          paddingLeft: Math.min(member.generation ?? 0, 4) * 12,
                          borderTopWidth: 1,
                          borderTopColor: theme.borderSoft,
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: theme.brandSoft,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Feather name="user" size={16} color={theme.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...TYPE.label, color: theme.text }}>
                            {member.name}
                          </Text>
                          <Text style={{ ...TYPE.caption, color: theme.dim }}>
                            {member.role || "Family member"}
                            {member.generation != null
                              ? ` · Generation ${member.generation}`
                              : ""}
                          </Text>
                        </View>
                        {member.parent_id ? (
                          <Feather
                            name="corner-down-right"
                            size={15}
                            color={theme.dim}
                          />
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    title="Your family story starts here"
                    subtitle="Guardians can add the people and relationships your family wants to preserve."
                  />
                )}
                {snapshot.familyMembers.length >= 100 ? (
                  <Text
                    style={{
                      ...TYPE.caption,
                      color: theme.dim,
                      textAlign: "center",
                    }}
                  >
                    Showing up to 100 family records.
                  </Text>
                ) : null}
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <AuthGate
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        title="Join your family KUL"
        message="Sign in to create or join a private family circle."
      />
    </Screen>
  );
}

function Choice({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof themeColor>;
}) {
  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      haptic="selection"
      style={{
        minHeight: 40,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? theme.brand : theme.border,
        backgroundColor: selected ? theme.brandSoft : theme.cardSoft,
        paddingHorizontal: 12,
        justifyContent: "center",
      }}
    >
      <Text
        style={{ ...TYPE.caption, color: selected ? theme.brand : theme.dim }}
      >
        {label}
      </Text>
    </PressableSurface>
  );
}

function TaskRow({
  task,
  assignee,
  theme,
  onOpen,
  onComplete,
  busy = false,
}: {
  task: KulTask;
  assignee: string;
  theme: ReturnType<typeof themeColor>;
  onOpen: () => void;
  onComplete?: () => void;
  busy?: boolean;
}) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.borderSoft,
        paddingTop: 10,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <Feather
          name={task.completed ? "check-circle" : "circle"}
          size={19}
          color={task.completed ? COLORS.success : theme.brand}
          style={{ marginTop: 1 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ ...TYPE.label, color: theme.text }}>{task.title}</Text>
          <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>
            {task.task_type} · {assignee}
            {task.due_date ? ` · Due ${formatDate(task.due_date)}` : ""}
          </Text>
          {task.description ? (
            <Text style={{ ...TYPE.body, color: theme.dim, marginTop: 4 }}>
              {task.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, paddingLeft: 28 }}>
        <PressableSurface
          accessibilityLabel={taskRouteLabel(task.task_type)}
          onPress={onOpen}
          haptic="selection"
          style={{
            minHeight: MIN_TOUCH_TARGET,
            borderRadius: 13,
            paddingHorizontal: 12,
            backgroundColor: theme.brandSoft,
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Feather name="arrow-up-right" size={14} color={theme.brand} />
          <Text style={{ ...TYPE.caption, color: theme.brand }}>
            {taskRouteLabel(task.task_type)}
          </Text>
        </PressableSurface>
        {onComplete ? (
          <PressableSurface
            accessibilityLabel="Mark family practice complete"
            disabled={busy}
            onPress={onComplete}
            haptic="selection"
            style={{
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: 13,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color={theme.brand} />
            ) : (
              <Feather name="check" size={14} color={theme.brand} />
            )}
            <Text style={{ ...TYPE.caption, color: theme.text }}>Complete</Text>
          </PressableSurface>
        ) : null}
        {task.completed ? (
          <Text
            style={{
              ...TYPE.caption,
              color: COLORS.success,
              alignSelf: "center",
            }}
          >
            Done
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MessageRow({
  message,
  author,
  theme,
}: {
  message: KulMessage;
  author: string;
  theme: ReturnType<typeof themeColor>;
}) {
  return (
    <View
      style={{
        paddingVertical: 9,
        borderTopWidth: 1,
        borderTopColor: theme.borderSoft,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text
          style={{ ...TYPE.label, color: theme.text, flex: 1 }}
          numberOfLines={1}
        >
          {author}
        </Text>
        <Text style={{ ...TYPE.caption, color: theme.dim }}>
          {new Date(message.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </Text>
      </View>
      <Text style={{ ...TYPE.body, color: theme.text, marginTop: 5 }}>
        {message.content}
      </Text>
    </View>
  );
}
