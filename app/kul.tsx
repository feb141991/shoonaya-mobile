import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PressableSurface } from "@/components/ui/PressableSurface";
import { SacredLoader } from "@/components/ui/SacredLoader";
import { Screen } from "@/components/ui/Screen";
import { AuthGate } from "@/components/ui/AuthGate";
import { KulInviteModal } from "@/components/kul/KulInviteModal";
import { VanshGraphCanvas } from "@/components/kul/VanshGraphCanvas";
import { computeVanshLayout, getEligibleParentIds } from "@/lib/vanshLayout";
import {
  COLORS,
  FONTS,
  MIN_TOUCH_TARGET,
  RADII,
  SHADOWS,
  TYPE,
  themeColor,
} from "@/lib/constants";
import { NAV_BAR_CLEARANCE } from "@/lib/nav-bar";
import { captureAppIdentity, useAppIdentity } from "@/lib/appIdentity";
import { isFetchCancelled } from "@/lib/api";
import { canRetainKulSnapshot } from "@/lib/kul-contract";
import {
  readKulSnapshotCache,
  writeKulSnapshotCache,
} from "@/lib/kulSnapshotCache";
import {
  addKulFamilyMember,
  addExistingKulTirthaWish,
  assignKulTask,
  completeKulTask,
  createKul,
  deleteKulEvent,
  deleteKulFamilyMember,
  deleteKulTirthaWish,
  fetchKulSnapshot,
  getKulTaskHref,
  joinKul,
  leaveOrRemoveKulMember,
  saveKulEvent,
  searchKulTirtha,
  sendKulMessage,
  transferKulGuardian,
  updateKulFamilyMember,
  updateKulLineage,
  updateKulTirthaWish,
  type KulCalendarReference,
  type KulEvent,
  type KulEventType,
  type KulLineage,
  type KulMessage,
  type KulMonthSystem,
  type KulPaksha,
  type KulSnapshot,
  type KulTask,
  type KulTaskType,
  type KulTirthaSearchResult,
} from "@/lib/kul";
import { recordInteractionTiming, recordRefreshFailure, recordRouteOpen } from "@/lib/telemetry";

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
const MASA_NAMES = ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashwin", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"];
const TITHI_NAMES = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima / Amavasya"];

function localIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
  const routeParams = useLocalSearchParams<{ section?: string }>();
  const identity = useAppIdentity();
  const snapshotRef = useRef<KulSnapshot | null>(null);
  const activeOwnerRef = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<KulSnapshot | null>(null);
  const [snapshotIsStale, setSnapshotIsStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<HubSection>("home");
  const [authGateVisible, setAuthGateVisible] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
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
  const [eventDateSystem, setEventDateSystem] = useState<"gregorian" | "tithi">("gregorian");
  const [eventMasa, setEventMasa] = useState(1);
  const [eventPaksha, setEventPaksha] = useState<KulPaksha>("shukla");
  const [eventTithi, setEventTithi] = useState(1);
  const [eventMonthSystem, setEventMonthSystem] = useState<KulMonthSystem>("amanta");
  const [eventMasaIsAdhika, setEventMasaIsAdhika] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [editingFamilyMemberId, setEditingFamilyMemberId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [familyRelationship, setFamilyRelationship] = useState("");
  const [familyGeneration, setFamilyGeneration] = useState("1");
  const [familyParent, setFamilyParent] = useState("");
  const [familySpouse, setFamilySpouse] = useState("");
  const [familyIsAlive, setFamilyIsAlive] = useState(true);
  const [vanshViewMode, setVanshViewMode] = useState<"canvas" | "list">("canvas");
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);

  const [showLineageForm, setShowLineageForm] = useState(false);
  const [lineageDraft, setLineageDraft] = useState<KulLineage | null>(null);
  const [calendarLabel, setCalendarLabel] = useState("");
  const [calendarTimezone, setCalendarTimezone] = useState("Asia/Kolkata");
  const [calendarMonthSystem, setCalendarMonthSystem] = useState<KulMonthSystem>("amanta");
  const [calendarLatitude, setCalendarLatitude] = useState("23.1765");
  const [calendarLongitude, setCalendarLongitude] = useState("75.7885");

  const [tirthaQuery, setTirthaQuery] = useState("");
  const [tirthaSearchResults, setTirthaSearchResults] = useState<KulTirthaSearchResult[]>([]);
  const [tirthaSearchLoading, setTirthaSearchLoading] = useState(false);
  const [yatraFilter, setYatraFilter] = useState<"all" | "wishlist" | "visited">("all");

  const clearPrivateScreenState = useCallback(() => {
    snapshotRef.current = null;
    setSnapshot(null);
    setSnapshotIsStale(false);
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
    setEventDateSystem("gregorian");
    setEventMasa(1);
    setEventPaksha("shukla");
    setEventTithi(1);
    setEventMonthSystem("amanta");
    setEventMasaIsAdhika(false);
    setEditingEventId(null);
    setShowFamilyForm(false);
    setEditingFamilyMemberId(null);
    setFamilyName("");
    setFamilyRelationship("");
    setFamilyGeneration("1");
    setFamilyParent("");
    setFamilySpouse("");
    setFamilyIsAlive(true);
    setShowLineageForm(false);
    setLineageDraft(null);
    setCalendarLabel("");
    setCalendarTimezone("Asia/Kolkata");
    setCalendarMonthSystem("amanta");
    setCalendarLatitude("23.1765");
    setCalendarLongitude("75.7885");
    setTirthaQuery("");
    setTirthaSearchResults([]);
    setTirthaSearchLoading(false);
    setYatraFilter("all");
    setVanshViewMode("canvas");
    setSelectedFamilyMemberId(null);
  }, []);

  const loadSnapshot = useCallback(async (userId: string, isPull = false) => {
    const lease = captureAppIdentity();
    if (
      lease.identity.kind !== "authenticated" ||
      lease.identity.userId !== userId
    )
      return;
    const hadSnapshot = Boolean(snapshotRef.current);
    const startedAt = Date.now();
    let displayedCache = hadSnapshot;
    if (hadSnapshot) setRefreshing(isPull);
    else setLoading(true);

    // Read a bounded, encrypted, exact-owner disk snapshot in parallel with
    // the authoritative API request. If the live request wins the race, its
    // response remains authoritative and the older cache is ignored.
    if (!hadSnapshot) {
      void readKulSnapshotCache(userId).then((cached) => {
        if (!cached || !lease.isCurrent() || snapshotRef.current) return;
        snapshotRef.current = cached.snapshot;
        setSnapshot(cached.snapshot);
        setSnapshotIsStale(true);
        setError(null);
        setLoading(false);
        displayedCache = true;
      });
    }
    try {
      const next = await fetchKulSnapshot(userId);
      if (!lease.isCurrent()) return;
      snapshotRef.current = next;
      setSnapshot(next);
      setSnapshotIsStale(false);
      setError(null);
      void writeKulSnapshotCache(next);
      recordRouteOpen({ kind: "authenticated", userId }, "kul", {
        cacheHit: displayedCache,
        stale: false,
        durationMs: Date.now() - startedAt,
      });
    } catch (loadError) {
      if (!lease.isCurrent()) return;
      const hasFallback = Boolean(snapshotRef.current);
      if (!isFetchCancelled(loadError)) {
        recordRefreshFailure({ kind: "authenticated", userId }, "kul", {
          reason: "unknown",
          hadCachedData: hasFallback,
        });
      }
      setSnapshotIsStale(hasFallback);
      setError(hasFallback
        ? "Showing saved family information. Messages and date calculations may be out of date."
        : isFetchCancelled(loadError)
          ? "The connection paused before your family circle loaded. Tap Retry when ready."
          : "We couldn’t reach your family circle. Check your connection and try again.");
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
          setSnapshotIsStale(false);
          setLoading(true);
          setError(null);
        }
        void loadSnapshot(identity.userId);
      } else {
        if (activeOwnerRef.current !== null) clearPrivateScreenState();
        activeOwnerRef.current = null;
        snapshotRef.current = null;
        setSnapshot(null);
        setSnapshotIsStale(false);
        setLoading(identity.kind === "loading");
        setError(null);
      }
    }, [clearPrivateScreenState, identity, loadSnapshot]),
  );

  const currentUserId =
    identity.kind === "authenticated" ? identity.userId : null;
  useEffect(() => {
    if (routeParams.section === "family") setActiveSection("family");
  }, [routeParams.section]);
  const kul = snapshot?.kul ?? null;
  const memberNameById = useMemo(() => {
    const result = new Map<string, string>();
    for (const member of snapshot?.members ?? []) {
      result.set(member.userId, personLabel(member.profile));
    }
    return result;
  }, [snapshot?.members]);
  const deceasedFamilyMembers = useMemo(
    () => (snapshot?.familyMembers ?? []).filter((member) => !member.is_alive),
    [snapshot?.familyMembers],
  );
  const familyMemberById = useMemo(
    () => new Map((snapshot?.familyMembers ?? []).map((member) => [member.id, member])),
    [snapshot?.familyMembers],
  );
  const familyTreeLayout = useMemo(
    () => computeVanshLayout(snapshot?.familyMembers ?? [], kul?.lineage),
    [snapshot?.familyMembers, kul?.lineage],
  );
  const familyTreeNodeById = useMemo(
    () => new Map(familyTreeLayout.nodes.map((node) => [node.data.id, node])),
    [familyTreeLayout.nodes],
  );
  const selectedFamilyMember = selectedFamilyMemberId
    ? familyMemberById.get(selectedFamilyMemberId) ?? null
    : null;
  const selectedTreeNode = selectedFamilyMember
    ? familyTreeNodeById.get(selectedFamilyMember.id) ?? null
    : null;
  const eligibleFamilyParentIds = useMemo(
    () => new Set(getEligibleParentIds(snapshot?.familyMembers ?? [], editingFamilyMemberId)),
    [snapshot?.familyMembers, editingFamilyMemberId],
  );
  const upcomingEvents = useMemo(() => {
    const today = snapshot?.today ?? localIsoDate();
    return (snapshot?.events ?? [])
      .map((event) => ({ event, date: event.resolved_civil_date }))
      .filter((entry) => entry.date === null || entry.date >= today)
      .sort((a, b) => (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31"))
      .slice(0, 5);
  }, [snapshot?.events, snapshot?.today]);
  const pendingTasks = useMemo(
    () => (snapshot?.tasks ?? []).filter((task) => !task.completed),
    [snapshot?.tasks],
  );

  const patchSnapshot = useCallback((update: (current: KulSnapshot) => KulSnapshot) => {
    const current = snapshotRef.current;
    if (!current) return;
    const next = update(current);
    snapshotRef.current = next;
    setSnapshot(next);
    void writeKulSnapshotCache(next);
  }, []);

  const tirthaSearchRequestRef = useRef(0);
  useEffect(() => {
    const query = tirthaQuery.trim();
    if (identity.kind !== "authenticated" || activeSection !== "family" || query.length < 2) {
      tirthaSearchRequestRef.current += 1;
      setTirthaSearchResults([]);
      setTirthaSearchLoading(false);
      return;
    }
    const requestId = ++tirthaSearchRequestRef.current;
    const lease = captureAppIdentity();
    const timer = setTimeout(() => {
      const startedAt = Date.now();
      setTirthaSearchLoading(true);
      void searchKulTirtha(identity.userId, query)
        .then((results) => {
          if (requestId !== tirthaSearchRequestRef.current || !lease.isCurrent()) return;
          setTirthaSearchResults(results);
        })
        .catch(() => {
          if (requestId !== tirthaSearchRequestRef.current || !lease.isCurrent()) return;
          setTirthaSearchResults([]);
        })
        .finally(() => {
          if (requestId === tirthaSearchRequestRef.current && lease.isCurrent()) {
            setTirthaSearchLoading(false);
            recordInteractionTiming({ kind: "authenticated", userId: identity.userId }, "kul_tirtha_search", Date.now() - startedAt);
          }
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      if (tirthaSearchRequestRef.current === requestId) {
        tirthaSearchRequestRef.current += 1;
      }
    };
  }, [activeSection, identity, tirthaQuery]);

  const runMutation = useCallback(
    async <T,>(
      operation: (userId: string) => Promise<T>,
      options: { apply?: (result: T) => void; reload?: boolean; successMessage?: string } = {},
    ): Promise<boolean> => {
      if (!currentUserId) {
        setAuthGateVisible(true);
        return false;
      }
      if (snapshotIsStale) {
        Alert.alert(
          "Refresh your family circle",
          "Reconnect and refresh before changing family details, so this action uses your latest role and membership.",
        );
        return false;
      }
      const lease = captureAppIdentity();
      if (
        lease.identity.kind !== "authenticated" ||
        lease.identity.userId !== currentUserId
      )
        return false;
      setWorking(true);
      const startedAt = Date.now();
      try {
        const result = await operation(currentUserId);
        if (!lease.isCurrent()) return false;
        options.apply?.(result);
        if (options.reload !== false) await loadSnapshot(currentUserId, true);
        recordInteractionTiming({ kind: "authenticated", userId: currentUserId }, "kul_mutation", Date.now() - startedAt);
        if (options.successMessage) Alert.alert("KUL", options.successMessage);
        return true;
      } catch (mutationError) {
        if (lease.isCurrent()) recordInteractionTiming({ kind: "authenticated", userId: currentUserId }, "kul_mutation", Date.now() - startedAt);
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
    [currentUserId, loadSnapshot, snapshotIsStale],
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
    const success = await runMutation(
      (userId) => sendKulMessage(userId, content),
      {
        reload: false,
        apply: (message) => patchSnapshot((current) => ({
          ...current,
          messages: [...current.messages, message]
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .slice(-30),
        })),
      },
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
    const success = await runMutation(
      (userId) => assignKulTask(userId, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        taskType,
        assignedTo: taskAssignee,
        dueDate: taskDueDate.trim() || undefined,
      }),
      {
        reload: false,
        apply: (task) => patchSnapshot((current) => ({
          ...current,
          tasks: [...current.tasks, task]
            .sort((a, b) => Number(a.completed) - Number(b.completed) ||
              (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31"))
            .slice(0, 25),
        })),
      },
    );
    if (success) {
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
      setShowTaskForm(false);
    }
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim() || (eventDateSystem === "gregorian" && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim()))) {
      Alert.alert("Add a name and date", eventDateSystem === "gregorian" ? "Use a date in YYYY-MM-DD format." : "Choose a lunar month, paksha, and tithi.");
      return;
    }
    if (eventType === "death_anniversary") {
      const selectedMember = familyMemberById.get(eventMember);
      if (!selectedMember || selectedMember.is_alive) {
        Alert.alert(
          "Choose a deceased family member",
          "Mark the person as deceased in your family tree, then link their remembrance date here.",
        );
        return;
      }
      if (eventDateSystem === "gregorian" && !eventRecurring) {
        Alert.alert("Yearly remembrance", "A family remembrance date must repeat yearly.");
        return;
      }
    }
    const common = {
      title: eventTitle.trim(),
      eventType,
      description: eventDescription.trim() || undefined,
      memberId: eventMember || undefined,
    };
    const input = eventDateSystem === "tithi"
      ? { ...common, dateSystem: "tithi" as const, recurring: true as const, masa: eventMasa, paksha: eventPaksha, tithi: eventTithi, monthSystem: eventMonthSystem, masaIsAdhika: eventMasaIsAdhika }
      : { ...common, dateSystem: "gregorian" as const, eventDate: eventDate.trim(), recurring: eventRecurring };
    const success = await runMutation(
      (userId) => saveKulEvent(userId, input, editingEventId ?? undefined),
      {
        reload: false,
        apply: (saved) => patchSnapshot((current) => ({
          ...current,
          events: editingEventId
            ? current.events.map((event) => event.id === saved.id ? saved : event)
            : [...current.events, saved],
        })),
      },
    );
    if (success) {
      setEventTitle("");
      setEventDescription("");
      setEventMember("");
      setEventRecurring(false);
      setEventDateSystem("gregorian");
      setEditingEventId(null);
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
    const success = await runMutation(
      (userId) => editingFamilyMemberId
        ? updateKulFamilyMember(userId, {
            memberId: editingFamilyMemberId,
            name: familyName.trim(),
            relationship: familyRelationship.trim() || null,
            generation,
            parentId: familyParent || null,
            spouseId: familySpouse || null,
            isAlive: familyIsAlive,
          })
        : addKulFamilyMember(userId, {
            name: familyName.trim(),
            relationship: familyRelationship.trim() || undefined,
            generation,
            parentId: familyParent || undefined,
          }),
      {
        reload: false,
        apply: (saved) => patchSnapshot((current) => ({
          ...current,
          familyMembers: editingFamilyMemberId
            ? current.familyMembers.map((member) => member.id === saved.id ? saved : member)
            : [...current.familyMembers, saved].sort((a, b) => (a.generation ?? 0) - (b.generation ?? 0)),
        })),
      },
    );
    if (success) {
      setFamilyName("");
      setFamilyRelationship("");
      setFamilyParent("");
      setFamilySpouse("");
      setFamilyIsAlive(true);
      setEditingFamilyMemberId(null);
      setShowFamilyForm(false);
    }
  };

  const beginEditFamilyMember = (member: KulSnapshot["familyMembers"][number]) => {
    setEditingFamilyMemberId(member.id);
    setFamilyName(member.name);
    setFamilyRelationship(member.role ?? "");
    setFamilyGeneration(String(member.generation ?? 0));
    setFamilyParent(member.parent_id ?? "");
    setFamilySpouse(member.spouse_id ?? "");
    setFamilyIsAlive(member.is_alive);
    setShowFamilyForm(true);
  };

  const beginEditEvent = (event: KulEvent) => {
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventType(event.event_type);
    setEventDescription(event.description ?? "");
    setEventMember(event.member_id ?? "");
    setEventDateSystem(event.date_system);
    setEventDate(event.event_date);
    setEventRecurring(event.event_type === "death_anniversary" ? true : event.recurring);
    if (event.date_system === "tithi") {
      setEventMasa(event.masa ?? 1);
      setEventPaksha(event.paksha ?? "shukla");
      setEventTithi(event.tithi ?? 1);
      setEventMonthSystem(event.month_system ?? kul?.calendarReference.monthSystem ?? "amanta");
      setEventMasaIsAdhika(event.masa_is_adhika);
    }
    setShowEventForm(true);
  };

  const beginEditLineage = () => {
    if (!kul) return;
    setLineageDraft({ ...kul.lineage });
    setCalendarLabel(kul.calendarReference.label);
    setCalendarTimezone(kul.calendarReference.timezone);
    setCalendarMonthSystem(kul.calendarReference.monthSystem);
    setCalendarLatitude(String(kul.calendarReference.latitude ?? 23.1765));
    setCalendarLongitude(String(kul.calendarReference.longitude ?? 75.7885));
    setEventMonthSystem(kul.calendarReference.monthSystem);
    setShowLineageForm(true);
  };

  const saveLineage = async () => {
    if (!lineageDraft || !kul) return;
    const latitude = Number(calendarLatitude);
    const longitude = Number(calendarLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !calendarTimezone.trim() || !calendarLabel.trim()) {
      Alert.alert("Check the family calendar", "Add a valid timezone, reference label, latitude, and longitude.");
      return;
    }
    const success = await runMutation(
      (userId) => updateKulLineage(userId, {
        ...lineageDraft,
        calendarReference: {
          label: calendarLabel.trim(),
          timezone: calendarTimezone.trim(),
          monthSystem: calendarMonthSystem,
          latitude,
          longitude,
        } satisfies KulCalendarReference,
      }),
      {
        reload: false,
        apply: () => patchSnapshot((current) => current.kul ? ({
          ...current,
          kul: { ...current.kul, lineage: lineageDraft, calendarReference: {
            label: calendarLabel.trim(), timezone: calendarTimezone.trim(), monthSystem: calendarMonthSystem, latitude, longitude,
          } },
        }) : current),
      },
    );
    if (success) setShowLineageForm(false);
  };

  const copyLineageForSankalpa = async () => {
    if (!kul) return;
    const lines = [
      kul.lineage.gotra ? `Gotra: ${kul.lineage.gotra}` : null,
      kul.lineage.pravara ? `Pravara: ${kul.lineage.pravara}` : null,
    ].filter((value): value is string => value !== null);
    if (lines.length === 0) {
      Alert.alert("Lineage not added", "A guardian can add the family Gotra or Pravara first.");
      return;
    }
    try {
      await Clipboard.setStringAsync(lines.join("\n"));
      Alert.alert("Copied", "Confirm the traditional sankalpa wording with your family or lineage guide.");
    } catch {
      Alert.alert("Could not copy", "Please try again.");
    }
  };

  const openPlaceInTirtha = (placeId: string) => {
    router.push({ pathname: "/(tabs)/tirtha", params: { kulPlaceId: placeId } });
  };

  const removeFamilyRecord = (member: KulSnapshot["familyMembers"][number]) => {
    Alert.alert("Remove family record?", `Remove ${member.name} from the family tree? Related links to this record will be cleared.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void runMutation(
        (userId) => deleteKulFamilyMember(userId, member.id),
        { reload: false, apply: () => {
          setSelectedFamilyMemberId((selectedId) => selectedId === member.id ? null : selectedId);
          patchSnapshot((current) => ({ ...current, familyMembers: current.familyMembers.filter((row) => row.id !== member.id).map((row) => ({ ...row, parent_id: row.parent_id === member.id ? null : row.parent_id, spouse_id: row.spouse_id === member.id ? null : row.spouse_id })) }));
        } },
      ) },
    ]);
  };

  const removeFamilyEvent = (event: KulEvent) => {
    Alert.alert("Delete family date?", `Remove ${event.title} from this family's calendar?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void runMutation(
        (userId) => deleteKulEvent(userId, event.id),
        { reload: false, apply: () => patchSnapshot((current) => ({ ...current, events: current.events.filter((row) => row.id !== event.id) })) },
      ) },
    ]);
  };

  const addSearchResultToYatra = async (place: KulTirthaSearchResult) => {
    if (!currentUserId) return;
    const success = await runMutation(
      (userId) => addExistingKulTirthaWish(userId, place.id),
      { reload: false, apply: (wish) => patchSnapshot((current) => ({ ...current, tirthaWishes: current.tirthaWishes.some((item) => item.placeId === wish.placeId) ? current.tirthaWishes : [wish, ...current.tirthaWishes] })) },
    );
    if (success) setTirthaQuery("");
  };

  const setYatraStatus = (placeId: string, status: "wishlist" | "visited") => {
    void runMutation(
      (userId) => updateKulTirthaWish(userId, { placeId, status }),
      { reload: false, apply: (updated) => patchSnapshot((current) => ({ ...current, tirthaWishes: current.tirthaWishes.map((wish) => wish.placeId === updated.placeId ? updated : wish) })) },
    );
  };

  const removeYatraPlace = (placeId: string, name: string) => {
    Alert.alert("Remove from family Yatra?", `Remove ${name} from the shared list?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void runMutation(
        (userId) => deleteKulTirthaWish(userId, placeId),
        { reload: false, apply: () => patchSnapshot((current) => ({ ...current, tirthaWishes: current.tirthaWishes.filter((wish) => wish.placeId !== placeId) })) },
      ) },
    ]);
  };

  const leaveFamilyCircle = () => {
    if (!currentUserId) return;
    Alert.alert(
      "Leave this family circle?",
      "If other members remain, the oldest member becomes guardian when needed. If you are the last member, the KUL and its private family records are deleted.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => void runMutation(
          (userId) => leaveOrRemoveKulMember(userId, userId),
          { reload: true },
        ) },
      ],
    );
  };

  const manageKulMember = (member: KulSnapshot["members"][number]) => {
    if (!currentUserId || snapshot?.role !== "guardian" || member.userId === currentUserId) return;
    const transfer = () => void runMutation((userId) => transferKulGuardian(userId, member.userId), { reload: true });
    const remove = () => Alert.alert("Remove this member?", "Their account will leave the KUL. Shared KUL records remain with the other members.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove member", style: "destructive", onPress: () => void runMutation((userId) => leaveOrRemoveKulMember(userId, member.userId), { reload: true }) },
    ]);
    Alert.alert(personLabel(member.profile), "Manage family access", [
      { text: "Cancel", style: "cancel" },
      { text: "Transfer guardian role", onPress: transfer },
      { text: "Remove member", style: "destructive", onPress: remove },
    ]);
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

        {identity.kind === "authenticated" && snapshot && snapshotIsStale ? (
          <Card
            tone="auto"
            style={{
              backgroundColor: theme.cardSoft,
              borderColor: theme.border,
              gap: 10,
            }}
          >
            <Text style={{ ...TYPE.body, color: theme.text }}>
              {error ?? "You’re viewing a saved family snapshot. Messages and date calculations may be out of date."}
            </Text>
            <ActionButton
              label={refreshing ? "Refreshing…" : "Refresh family circle"}
              icon="refresh-cw"
              secondary
              disabled={refreshing}
              onPress={() => void loadSnapshot(currentUserId!, true)}
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
              {snapshot.role === "guardian" && (
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
                      Family invitation link & QR
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
                      {kul.inviteCode ? `Code: ${kul.inviteCode}` : "Share Link"}
                    </Text>
                  </View>
                  <PressableSurface
                    accessibilityLabel="Open universal invite link and QR modal"
                    onPress={() => setShowInviteModal(true)}
                    haptic="selection"
                    style={{
                      minHeight: MIN_TOUCH_TARGET,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      backgroundColor: theme.brand,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Feather name="share-2" size={16} color={COLORS.ink} />
                    <Text style={{ ...TYPE.label, color: COLORS.ink }}>
                      Invite
                    </Text>
                  </PressableSurface>
                </View>
              )}
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
                        {snapshot.role === "guardian" && member.userId !== currentUserId ? (
                          <PressableSurface accessibilityLabel={`Manage ${personLabel(member.profile)}`} onPress={() => manageKulMember(member)} style={{ minHeight: MIN_TOUCH_TARGET, width: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" }}>
                            <Feather name="more-horizontal" size={18} color={theme.dim} />
                          </PressableSurface>
                        ) : null}
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
                    action={snapshot.role === "guardian" ? showEventForm ? "Close" : editingEventId ? "Edit date" : "Add date" : undefined}
                    onAction={
                      snapshot.role === "guardian"
                        ? () => { setEditingEventId(null); setShowEventForm((value) => !value); }
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
                      {eventType === "death_anniversary" ? (
                        <>
                          <Text style={{ ...TYPE.label, color: theme.text }}>Remembering</Text>
                          {deceasedFamilyMembers.length > 0 ? (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                              {deceasedFamilyMembers.map((member) => (
                                <Choice
                                  key={member.id}
                                  label={`${member.name}${member.role ? ` · ${member.role}` : ""}`}
                                  selected={eventMember === member.id}
                                  onPress={() => setEventMember(member.id)}
                                  theme={theme}
                                />
                              ))}
                            </View>
                          ) : (
                            <Text style={{ ...TYPE.caption, color: theme.dim }}>
                              Add a person in your family tree and mark them as deceased before creating a remembrance date.
                            </Text>
                          )}
                        </>
                      ) : null}
                      <Text style={{ ...TYPE.caption, color: theme.dim }}>Calendar type</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                        <Choice label="Civil date" selected={eventDateSystem === "gregorian"} onPress={() => setEventDateSystem("gregorian")} theme={theme} />
                        <Choice label="Lunar tithi" selected={eventDateSystem === "tithi"} onPress={() => { setEventDateSystem("tithi"); setEventRecurring(true); setEventMonthSystem(kul.calendarReference.monthSystem); }} theme={theme} />
                      </View>
                      {eventDateSystem === "gregorian" ? (
                        <Field accessibilityLabel="Family event date" value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" theme={theme} maxLength={10} />
                      ) : (
                        <View style={{ gap: 8, borderRadius: 15, backgroundColor: theme.cardSoft, padding: 12 }}>
                          <Text style={{ ...TYPE.caption, color: theme.dim }}>
                            {eventType === "death_anniversary"
                              ? "For a Pitru Paksha remembrance, enter the tithi your family follows. KUL resolves its civil date at sunrise for this family calendar; it does not calculate a Shraddha muhurta."
                              : "The next date is calculated at sunrise using your family calendar reference. Confirm ritual timing with your tradition."}
                          </Text>
                          <Text style={{ ...TYPE.caption, color: theme.dim }}>Lunar month</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                            {MASA_NAMES.map((name, index) => <Choice key={name} label={name} selected={eventMasa === index + 1} onPress={() => setEventMasa(index + 1)} theme={theme} />)}
                          </View>
                          <Text style={{ ...TYPE.caption, color: theme.dim }}>Paksha</Text>
                          <View style={{ flexDirection: "row", gap: 7 }}>
                            <Choice label="Shukla" selected={eventPaksha === "shukla"} onPress={() => setEventPaksha("shukla")} theme={theme} />
                            <Choice label="Krishna" selected={eventPaksha === "krishna"} onPress={() => setEventPaksha("krishna")} theme={theme} />
                          </View>
                          <Text style={{ ...TYPE.caption, color: theme.dim }}>Tithi</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                            {TITHI_NAMES.map((name, index) => <Choice key={`${eventPaksha}-${index}`} label={index === 14 ? eventPaksha === "shukla" ? "Purnima · 15" : "Amavasya · 15" : `${name} · ${index + 1}`} selected={eventTithi === index + 1} onPress={() => setEventTithi(index + 1)} theme={theme} />)}
                          </View>
                          <Text style={{ ...TYPE.caption, color: theme.dim }}>Month convention</Text>
                          <View style={{ flexDirection: "row", gap: 7 }}>
                            <Choice label="Amanta" selected={eventMonthSystem === "amanta"} onPress={() => setEventMonthSystem("amanta")} theme={theme} />
                            <Choice label="Purnimanta" selected={eventMonthSystem === "purnimanta"} onPress={() => setEventMonthSystem("purnimanta")} theme={theme} />
                          </View>
                          <View style={{ flexDirection: "row", gap: 7 }}>
                            <Choice label="Regular month" selected={!eventMasaIsAdhika} onPress={() => setEventMasaIsAdhika(false)} theme={theme} />
                            <Choice label="Adhika month" selected={eventMasaIsAdhika} onPress={() => setEventMasaIsAdhika(true)} theme={theme} />
                          </View>
                        </View>
                      )}
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
                            onPress={() => {
                              setEventType(item.id);
                              if (item.id === "death_anniversary") setEventRecurring(true);
                            }}
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
                      {eventDateSystem === "gregorian" && eventType !== "death_anniversary" ? <View
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
                      </View> : eventDateSystem === "tithi" ? <Text style={{ ...TYPE.caption, color: theme.brand }}>Lunar tithi dates repeat yearly and are resolved for this family’s timezone and location.</Text> : <Text style={{ ...TYPE.caption, color: theme.brand }}>Family remembrance dates repeat yearly.</Text>}
                      <ActionButton
                        label={working ? "Saving…" : editingEventId ? "Update family date" : "Save family date"}
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
                            {date ? formatDate(date) : "Date could not be resolved from the current family calendar reference"}
                            {event.date_system === "tithi" && event.tithi_label ? ` · ${event.tithi_label}` : event.recurring ? " · yearly" : ""}
                            {event.event_type === "death_anniversary" && event.member_id && familyMemberById.has(event.member_id)
                              ? ` · ${familyMemberById.get(event.member_id)?.name}`
                              : ""}
                            {event.calculation_location ? ` · ${event.calculation_location}` : ""}
                          </Text>
                        </View>
                        {snapshot.role === "guardian" ? <View style={{ flexDirection: "row", gap: 4 }}>
                          <PressableSurface accessibilityLabel={`Edit ${event.title}`} onPress={() => beginEditEvent(event)} style={{ minHeight: MIN_TOUCH_TARGET, width: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" }}><Feather name="edit-2" size={15} color={theme.dim} /></PressableSurface>
                          <PressableSurface accessibilityLabel={`Delete ${event.title}`} onPress={() => removeFamilyEvent(event)} style={{ minHeight: MIN_TOUCH_TARGET, width: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" }}><Feather name="trash-2" size={15} color={theme.dim} /></PressableSurface>
                        </View> : null}
                      </View>
                    ))
                  ) : (
                    <Text style={{ ...TYPE.body, color: theme.dim }}>
                      No family dates coming up yet.
                    </Text>
                  )}
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>
                    Family dates stay private to this KUL. A tithi date follows
                    the selected family calendar; confirm ritual timing with
                    your family tradition.
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
                                      void runMutation(
                                        (userId) => completeKulTask(userId, task.id),
                                        {
                                          reload: false,
                                          apply: (result) => patchSnapshot((current) => ({
                                            ...current,
                                            tasks: current.tasks.map((row) => row.id === result.id
                                              ? { ...row, completed: true, completed_at: result.completed_at ?? row.completed_at }
                                              : row),
                                          })),
                                        },
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
                        : editingFamilyMemberId ? "Edit person" : "Add person"
                      : undefined
                  }
                  onAction={
                    snapshot.role === "guardian"
                      ? () => { setEditingFamilyMemberId(null); setShowFamilyForm((value) => !value); }
                      : undefined
                  }
                />
                <View style={{ borderTopWidth: 1, borderTopColor: theme.borderSoft, paddingTop: 12, gap: 10 }}>
                  <SectionHeading
                    title="Kul Parampara & Gotra"
                    theme={theme}
                    action={snapshot.role === "guardian" ? showLineageForm ? "Close" : "Edit lineage" : undefined}
                    onAction={snapshot.role === "guardian" ? () => showLineageForm ? setShowLineageForm(false) : beginEditLineage() : undefined}
                  />
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>Private family archive · shared only with KUL members</Text>
                  {showLineageForm && lineageDraft ? (
                    <View style={{ gap: 9 }}>
                      <Field accessibilityLabel="Gotra" value={lineageDraft.gotra ?? ""} onChangeText={(value) => setLineageDraft((current) => current ? { ...current, gotra: value || null } : current)} placeholder="Gotra" theme={theme} maxLength={120} />
                      <Field accessibilityLabel="Pravara" value={lineageDraft.pravara ?? ""} onChangeText={(value) => setLineageDraft((current) => current ? { ...current, pravara: value || null } : current)} placeholder="Pravara" theme={theme} maxLength={240} />
                      <Field accessibilityLabel="Kuldevi" value={lineageDraft.kuldeviName ?? ""} onChangeText={(value) => setLineageDraft((current) => current ? { ...current, kuldeviName: value || null } : current)} placeholder="Kuldevi name" theme={theme} maxLength={120} />
                      <Field accessibilityLabel="Kuldevta" value={lineageDraft.kuldevtaName ?? ""} onChangeText={(value) => setLineageDraft((current) => current ? { ...current, kuldevtaName: value || null } : current)} placeholder="Kuldevta name" theme={theme} maxLength={120} />
                      <Field accessibilityLabel="Ancestral origin" value={lineageDraft.ancestralOrigin ?? ""} onChangeText={(value) => setLineageDraft((current) => current ? { ...current, ancestralOrigin: value || null } : current)} placeholder="Ancestral village / region" theme={theme} maxLength={160} />
                      <Field accessibilityLabel="Kulachara notes" value={lineageDraft.kulacharaNotes ?? ""} onChangeText={(value) => setLineageDraft((current) => current ? { ...current, kulacharaNotes: value || null } : current)} placeholder="Family customs and observances" theme={theme} maxLength={2000} multiline />
                      {tirthaSearchResults.length ? <View style={{ gap: 6 }}>
                        <Text style={{ ...TYPE.caption, color: theme.dim }}>Link a Tirtha place</Text>
                        {tirthaSearchResults.slice(0, 8).map((place) => <View key={`lineage-${place.id}`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ ...TYPE.caption, color: theme.text, flex: 1 }} numberOfLines={1}>{place.name}</Text>
                          <Choice label="Kuldevi" selected={lineageDraft.kuldeviPlaceId === place.id} onPress={() => setLineageDraft((current) => current ? { ...current, kuldeviPlaceId: place.id } : current)} theme={theme} />
                          <Choice label="Kuldevta" selected={lineageDraft.kuldevtaPlaceId === place.id} onPress={() => setLineageDraft((current) => current ? { ...current, kuldevtaPlaceId: place.id } : current)} theme={theme} />
                        </View>)}
                      </View> : null}
                      <Text style={{ ...TYPE.caption, color: theme.dim }}>Family lunar calendar reference</Text>
                      <Field accessibilityLabel="Calendar reference label" value={calendarLabel} onChangeText={setCalendarLabel} placeholder="Reference place · e.g. Ujjain reference" theme={theme} maxLength={100} />
                      <Field accessibilityLabel="Calendar timezone" value={calendarTimezone} onChangeText={setCalendarTimezone} placeholder="IANA timezone · Asia/Kolkata" theme={theme} maxLength={80} />
                      <Field accessibilityLabel="Calendar latitude" value={calendarLatitude} onChangeText={setCalendarLatitude} placeholder="Latitude" theme={theme} maxLength={20} />
                      <Field accessibilityLabel="Calendar longitude" value={calendarLongitude} onChangeText={setCalendarLongitude} placeholder="Longitude" theme={theme} maxLength={20} />
                      <View style={{ flexDirection: "row", gap: 7 }}>
                        <Choice label="Amanta" selected={calendarMonthSystem === "amanta"} onPress={() => setCalendarMonthSystem("amanta")} theme={theme} />
                        <Choice label="Purnimanta" selected={calendarMonthSystem === "purnimanta"} onPress={() => setCalendarMonthSystem("purnimanta")} theme={theme} />
                      </View>
                      <ActionButton label={working ? "Saving…" : "Save lineage & calendar"} disabled={working} onPress={() => void saveLineage()} theme={theme} isDark={isDark} />
                    </View>
                  ) : (
                    <View style={{ gap: 6 }}>
                      <Text style={{ ...TYPE.body, color: theme.text }}>Gotra: {kul?.lineage.gotra || "Not added"}{kul?.lineage.pravara ? ` · Pravara: ${kul.lineage.pravara}` : ""}</Text>
                      {kul?.lineage.gotra || kul?.lineage.pravara ? <PressableSurface accessibilityLabel="Copy Gotra and Pravara for family sankalpa" onPress={() => void copyLineageForSankalpa()} style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", gap: 7 }}><Feather name="copy" size={14} color={theme.brand} /><Text style={{ ...TYPE.caption, color: theme.brand }}>Copy lineage details for sankalpa</Text></PressableSurface> : null}
                      <Text style={{ ...TYPE.body, color: theme.text }}>Kuldevi: {kul?.lineage.kuldeviName || "Not added"}</Text>
                      {kul?.lineage.kuldeviPlaceId ? <PressableSurface onPress={() => openPlaceInTirtha(kul.lineage.kuldeviPlaceId!)} style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", gap: 7 }}><Feather name="map-pin" size={15} color={theme.brand} /><Text style={{ ...TYPE.caption, color: theme.brand }}>View Kuldevi temple in Tirtha</Text></PressableSurface> : null}
                      <Text style={{ ...TYPE.body, color: theme.text }}>Kuldevta: {kul?.lineage.kuldevtaName || "Not added"}</Text>
                      {kul?.lineage.kuldevtaPlaceId ? <PressableSurface onPress={() => openPlaceInTirtha(kul.lineage.kuldevtaPlaceId!)} style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", gap: 7 }}><Feather name="map-pin" size={15} color={theme.brand} /><Text style={{ ...TYPE.caption, color: theme.brand }}>View Kuldevta temple in Tirtha</Text></PressableSurface> : null}
                      <Text style={{ ...TYPE.body, color: theme.text }}>Ancestral origin: {kul?.lineage.ancestralOrigin || "Not added"}</Text>
                      {kul?.lineage.kulacharaNotes ? <Text style={{ ...TYPE.body, color: theme.dim }}>{kul.lineage.kulacharaNotes}</Text> : null}
                      <Text style={{ ...TYPE.caption, color: theme.dim }}>Lunar dates use {kul?.calendarReference.label}, {kul?.calendarReference.timezone}, {kul?.calendarReference.monthSystem}. Resolve ceremonial timing with your family tradition.</Text>
                    </View>
                  )}
                  <Field accessibilityLabel="Search sacred Tirtha places" value={tirthaQuery} onChangeText={setTirthaQuery} placeholder="Search Tirtha catalog to link a temple" theme={theme} maxLength={80} />
                  {tirthaSearchLoading ? <ActivityIndicator color={theme.brand} /> : null}
                </View>
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
                          {snapshot.familyMembers.filter((member) => eligibleFamilyParentIds.has(member.id)).map((member) => (
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
                    {snapshot.familyMembers.length > 1 ? (
                      <>
                        <Text style={{ ...TYPE.caption, color: theme.dim }}>Optional spouse / partner link</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                          <Choice label="No link" selected={!familySpouse} onPress={() => setFamilySpouse("")} theme={theme} />
                          {snapshot.familyMembers.filter((member) => member.id !== editingFamilyMemberId).slice(0, 20).map((member) => <Choice key={`spouse-${member.id}`} label={member.name} selected={familySpouse === member.id} onPress={() => setFamilySpouse(member.id)} theme={theme} />)}
                        </View>
                      </>
                    ) : null}
                    {editingFamilyMemberId ? (
                      <View style={{ flexDirection: "row", gap: 7 }}>
                        <Choice label="Living" selected={familyIsAlive} onPress={() => setFamilyIsAlive(true)} theme={theme} />
                        <Choice label="Remembered" selected={!familyIsAlive} onPress={() => setFamilyIsAlive(false)} theme={theme} />
                      </View>
                    ) : null}
                    <ActionButton
                      label={working ? "Saving…" : editingFamilyMemberId ? "Save family record" : "Add to family tree"}
                      disabled={working}
                      onPress={() => void handleAddFamilyMember()}
                      theme={theme}
                      isDark={isDark}
                    />
                  </View>
                ) : null}
                {snapshot.familyMembers.length ? (
                  <View style={{ gap: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: 8,
                      }}
                    >
                      <Text style={{ ...TYPE.caption, color: theme.dim }}>
                        {vanshViewMode === "canvas"
                          ? "Interactive lineage tree · drag to explore · pinch to zoom"
                          : "Family list"}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <Choice
                          label="Tree Canvas"
                          selected={vanshViewMode === "canvas"}
                          onPress={() => setVanshViewMode("canvas")}
                          theme={theme}
                        />
                        <Choice
                          label="List"
                          selected={vanshViewMode === "list"}
                          onPress={() => setVanshViewMode("list")}
                          theme={theme}
                        />
                      </View>
                    </View>

                    {vanshViewMode === "canvas" ? (
                      <>
                        <VanshGraphCanvas
                          layout={familyTreeLayout}
                          selectedMemberId={selectedFamilyMemberId}
                          onSelectMember={(member) =>
                            setSelectedFamilyMemberId((prev) =>
                              prev === member.id ? null : member.id
                            )
                          }
                          isGuardian={snapshot.role === "guardian"}
                        />
                      </>
                    ) : (
                      <View style={{ gap: 8 }}>
                        {familyTreeLayout.nodes.map((node) => {
                          const member = node.data;
                          const selected = selectedFamilyMemberId === member.id;
                          const parentName = node.resolvedParentId
                            ? familyMemberById.get(node.resolvedParentId)?.name
                            : null;
                          return (
                            <View
                              key={member.id}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                minHeight: MIN_TOUCH_TARGET,
                                gap: 8,
                                paddingLeft: Math.min(node.generation - 1, 4) * 12,
                                borderTopWidth: 1,
                                borderTopColor: theme.borderSoft,
                              }}
                            >
                              <PressableSurface
                                accessibilityRole="button"
                                accessibilityLabel={`${member.name}, ${member.role || "Family member"}, generation ${node.generation}${parentName ? `, child of ${parentName}` : ""}`}
                                accessibilityState={{ selected }}
                                onPress={() => setSelectedFamilyMemberId((previous) => previous === member.id ? null : member.id)}
                                style={{
                                  minHeight: MIN_TOUCH_TARGET,
                                  flex: 1,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 10,
                                  borderRadius: RADII.md,
                                  paddingHorizontal: 8,
                                  borderWidth: selected ? 1 : 0,
                                  borderColor: theme.brand,
                                  backgroundColor: selected ? theme.brandSoft : theme.cardSoft,
                                }}
                              >
                                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.brandSoft, alignItems: "center", justifyContent: "center" }}>
                                  <Feather name="user" size={16} color={theme.brand} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ ...TYPE.label, color: theme.text }}>
                                    {member.name}
                                  </Text>
                                  <Text style={{ ...TYPE.caption, color: theme.dim }}>
                                    {member.role || "Family member"} · Generation {node.generation}
                                    {member.generation == null ? " · inferred" : ""}
                                    {member.generation != null && member.generation !== node.generation ? ` · recorded as ${member.generation}` : ""}
                                  </Text>
                                </View>
                                {parentName ? <Feather name="corner-down-right" size={15} color={theme.dim} /> : null}
                              </PressableSurface>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ) : (
                  <EmptyState
                    title="Your family story starts here"
                    subtitle="Guardians can add the people and relationships your family wants to preserve."
                  />
                )}
                {selectedFamilyMember ? (
                  <View
                    style={{
                      borderRadius: RADII.lg,
                      borderWidth: 1,
                      borderColor: theme.borderSoft,
                      backgroundColor: theme.cardSoft,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ ...TYPE.label, color: theme.text }}>
                          {selectedFamilyMember.name}
                        </Text>
                        <Text style={{ ...TYPE.caption, color: theme.dim }}>
                          {selectedFamilyMember.role || "Family member"} · Generation {selectedTreeNode?.generation ?? selectedFamilyMember.generation ?? 1}
                          {selectedFamilyMember.generation == null ? " (inferred from family links)" : ""}
                          {selectedTreeNode && selectedFamilyMember.generation != null && selectedFamilyMember.generation !== selectedTreeNode.generation ? ` (recorded as ${selectedFamilyMember.generation}; adjusted to keep the parent link downward)` : ""}
                          {selectedFamilyMember.is_alive ? " · Living" : " · Remembered"}
                        </Text>
                      </View>
                      <PressableSurface
                        accessibilityLabel={`Clear selection for ${selectedFamilyMember.name}`}
                        onPress={() => setSelectedFamilyMemberId(null)}
                        style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" }}
                      >
                        <Feather name="x" size={17} color={theme.dim} />
                      </PressableSurface>
                    </View>
                    {snapshot.role === "guardian" ? (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <PressableSurface
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${selectedFamilyMember.name}`}
                          onPress={() => beginEditFamilyMember(selectedFamilyMember)}
                          style={{ minHeight: MIN_TOUCH_TARGET, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: RADII.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10 }}
                        >
                          <Feather name="edit-2" size={15} color={theme.brand} />
                          <Text style={{ ...TYPE.caption, color: theme.brand }}>Edit person</Text>
                        </PressableSurface>
                        <PressableSurface
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${selectedFamilyMember.name} from family tree`}
                          onPress={() => removeFamilyRecord(selectedFamilyMember)}
                          style={{ minHeight: MIN_TOUCH_TARGET, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: RADII.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10 }}
                        >
                          <Feather name="trash-2" size={15} color={theme.dim} />
                          <Text style={{ ...TYPE.caption, color: theme.dim }}>Remove</Text>
                        </PressableSurface>
                      </View>
                    ) : null}
                  </View>
                ) : null}
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
                <View style={{ borderTopWidth: 1, borderTopColor: theme.borderSoft, paddingTop: 12, gap: 10 }}>
                  <SectionHeading title="Family Yatra & Tirthas" theme={theme} />
                  <Text style={{ ...TYPE.body, color: theme.dim }}>Build a shared pilgrimage list from the Tirtha catalog and record places your family has visited together.</Text>
                  <Field accessibilityLabel="Search Tirtha catalog" value={tirthaQuery} onChangeText={setTirthaQuery} placeholder="Search temples, gurudwaras, viharas…" theme={theme} maxLength={80} />
                  <ActionButton label="Browse nearby in Tirtha" icon="map-pin" secondary onPress={() => router.push("/(tabs)/tirtha")} theme={theme} isDark={isDark} />
                  {tirthaSearchLoading ? <ActivityIndicator color={theme.brand} /> : null}
                  {tirthaQuery.trim().length >= 2 && !tirthaSearchLoading && tirthaSearchResults.length === 0 ? <Text style={{ ...TYPE.caption, color: theme.dim }}>No catalog matches. Browse Tirtha to discover nearby places, then add one from its detail card.</Text> : null}
                  {tirthaSearchResults.map((place) => {
                    const added = snapshot.tirthaWishes.some((wish) => wish.placeId === place.id);
                    return <View key={place.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: theme.borderSoft }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...TYPE.label, color: theme.text }}>{place.name}</Text>
                        <Text style={{ ...TYPE.caption, color: theme.dim }}>{place.tradition}{place.deity ? ` · ${place.deity}` : ""}{place.address ? ` · ${place.address}` : ""}</Text>
                      </View>
                      {showLineageForm && lineageDraft ? <View style={{ gap: 3 }}>
                        <PressableSurface accessibilityLabel={`Link ${place.name} as Kuldevi temple`} onPress={() => setLineageDraft((current) => current ? { ...current, kuldeviPlaceId: place.id, kuldeviName: current.kuldeviName || place.name } : current)} style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center" }}><Text style={{ ...TYPE.caption, color: theme.brand }}>Link Kuldevi</Text></PressableSurface>
                        <PressableSurface accessibilityLabel={`Link ${place.name} as Kuldevta temple`} onPress={() => setLineageDraft((current) => current ? { ...current, kuldevtaPlaceId: place.id, kuldevtaName: current.kuldevtaName || place.name } : current)} style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center" }}><Text style={{ ...TYPE.caption, color: theme.brand }}>Link Kuldevta</Text></PressableSurface>
                      </View> : null}
                      <PressableSurface accessibilityLabel={added ? `${place.name} is on family Yatra` : `Add ${place.name} to family Yatra`} disabled={added || working} onPress={() => void addSearchResultToYatra(place)} style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" }}><Feather name={added ? "check" : "plus-circle"} size={20} color={theme.brand} /></PressableSurface>
                    </View>;
                  })}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                    <Choice label={`All · ${snapshot.tirthaWishes.length}`} selected={yatraFilter === "all"} onPress={() => setYatraFilter("all")} theme={theme} />
                    <Choice label={`Wishlist · ${snapshot.tirthaWishes.filter((wish) => wish.status === "wishlist").length}`} selected={yatraFilter === "wishlist"} onPress={() => setYatraFilter("wishlist")} theme={theme} />
                    <Choice label={`Visited · ${snapshot.tirthaWishes.filter((wish) => wish.status === "visited").length}`} selected={yatraFilter === "visited"} onPress={() => setYatraFilter("visited")} theme={theme} />
                  </View>
                  {snapshot.tirthaWishes.filter((wish) => yatraFilter === "all" || wish.status === yatraFilter).length ? snapshot.tirthaWishes.filter((wish) => yatraFilter === "all" || wish.status === yatraFilter).map((wish) => <View key={wish.id} style={{ borderTopWidth: 1, borderTopColor: theme.borderSoft, paddingTop: 9, gap: 6 }}>
                    <Text style={{ ...TYPE.label, color: theme.text }}>{wish.name}</Text>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>{wish.tradition}{wish.deity ? ` · ${wish.deity}` : ""}{wish.status === "visited" && wish.visitedAt ? ` · Visited ${formatDate(wish.visitedAt)}` : " · On family wishlist"}</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      <PressableSurface accessibilityLabel={`Open ${wish.name} in Tirtha`} onPress={() => openPlaceInTirtha(wish.placeId)} haptic="selection" style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, backgroundColor: theme.brandSoft, borderRadius: 12 }}><Feather name="map-pin" size={13} color={theme.brand} /><Text style={{ ...TYPE.caption, color: theme.brand }}>Open in Tirtha</Text></PressableSurface>
                      <PressableSurface accessibilityLabel={wish.status === "visited" ? `Move ${wish.name} to wishlist` : `Mark ${wish.name} visited`} onPress={() => setYatraStatus(wish.placeId, wish.status === "visited" ? "wishlist" : "visited")} haptic="selection" style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, borderWidth: 1, borderColor: theme.border, borderRadius: 12 }}><Feather name={wish.status === "visited" ? "rotate-ccw" : "check-circle"} size={13} color={theme.brand} /><Text style={{ ...TYPE.caption, color: theme.text }}>{wish.status === "visited" ? "Wishlist" : "Mark visited"}</Text></PressableSurface>
                      <PressableSurface accessibilityLabel={`Remove ${wish.name} from family Yatra`} onPress={() => removeYatraPlace(wish.placeId, wish.name)} style={{ minHeight: MIN_TOUCH_TARGET, width: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" }}><Feather name="trash-2" size={14} color={theme.dim} /></PressableSurface>
                    </View>
                  </View>) : <Text style={{ ...TYPE.body, color: theme.dim }}>Your family Yatra list is empty. Search the catalog or add a temple from Tirtha.</Text>}
                </View>
                <View style={{ borderTopWidth: 1, borderTopColor: theme.borderSoft, paddingTop: 12, gap: 8 }}>
                  <SectionHeading title="Family access" theme={theme} />
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>A KUL has one guardian. If a guardian leaves, the oldest remaining member is promoted. The last member leaving deletes the private family space.</Text>
                  <ActionButton label="Leave family KUL" icon="log-out" secondary onPress={leaveFamilyCircle} theme={theme} isDark={isDark} disabled={working} />
                </View>
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
      {kul && currentUserId && snapshot?.role === "guardian" ? (
        <KulInviteModal
          visible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          userId={currentUserId}
          isGuardian
          manualInviteCode={kul.inviteCode ?? ""}
          kulName={kul.name}
          avatarEmoji={kul.avatarEmoji}
          theme={theme}
          isDark={isDark}
        />
      ) : null}
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
        minHeight: MIN_TOUCH_TARGET,
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
