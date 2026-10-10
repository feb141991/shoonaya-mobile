import { apiFetch } from "@/lib/api";
import {
  parseServerTimingHeader,
  recordServerTiming,
  type TelemetryIdentity,
} from "@/lib/telemetry";
import { getKulTaskHref } from "@/lib/kul-contract";
import { isKulSnapshot } from "@/lib/kulSnapshotContract";
import type {
  KulDateSystem,
  KulEventType,
  KulMonthSystem,
  KulPaksha,
  KulRole,
  KulTaskType,
  KulTithi,
} from "@/lib/kul-types";

export type { KulDateSystem, KulEventType, KulMonthSystem, KulPaksha, KulRole, KulTaskType, KulTithi } from "@/lib/kul-types";
export { isKulSnapshot } from "@/lib/kulSnapshotContract";

export type KulMember = {
  id: string;
  userId: string;
  role: KulRole;
  joinedAt: string;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    tradition: string | null;
    sampradaya: string | null;
  } | null;
};

export type KulTask = {
  id: string;
  title: string;
  description: string | null;
  task_type: KulTaskType;
  content_ref: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  assigned_to: string;
  assigned_by: string;
};

export type KulMessage = {
  id: string;
  content: string;
  sender_id: string;
  reaction: string | null;
  created_at: string;
};

export type KulFamilyMember = {
  id: string;
  name: string;
  role: string | null;
  generation: number | null;
  parent_id: string | null;
  spouse_id: string | null;
  is_alive: boolean;
};

export type KulLineage = {
  gotra: string | null;
  pravara: string | null;
  kuldeviName: string | null;
  kuldevtaName: string | null;
  kuldeviPlaceId: string | null;
  kuldevtaPlaceId: string | null;
  ancestralOrigin: string | null;
  kulacharaNotes: string | null;
};

export type KulCalendarReference = {
  label: string;
  timezone: string;
  monthSystem: KulMonthSystem;
  latitude: number | null;
  longitude: number | null;
};

export type KulEvent = {
  id: string;
  title: string;
  event_type: KulEventType;
  event_date: string;
  resolved_civil_date: string | null;
  date_system: KulDateSystem;
  masa: number | null;
  paksha: KulPaksha | null;
  tithi: number | null;
  month_system: KulMonthSystem | null;
  masa_is_adhika: boolean;
  tithi_resolution: "sunrise";
  tithi_label: string | null;
  calculation_location: string | null;
  recurring: boolean;
  description: string | null;
  member_id: string | null;
};

export type KulTirthaItem = {
  id: string;
  placeId: string;
  name: string;
  tradition: string;
  deity: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  status: "wishlist" | "visited";
  visitedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type KulTirthaSearchResult = {
  id: string;
  name: string;
  tradition: string;
  deity: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
};

export type KulSnapshot = {
  userId: string;
  today: string;
  kul: null | {
    id: string;
    name: string;
    avatarEmoji: string;
    createdAt: string;
    inviteCode: string | null;
    lineage: KulLineage;
    calendarReference: KulCalendarReference;
  };
  role: KulRole | null;
  members: KulMember[];
  tasks: KulTask[];
  messages: KulMessage[];
  familyMembers: KulFamilyMember[];
  events: KulEvent[];
  tirthaWishes: KulTirthaItem[];
};

type AuthIdentity = TelemetryIdentity;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isString(value: unknown): value is string { return typeof value === "string"; }

function isKulTirthaSearchPayload(value: unknown): value is { places: KulTirthaSearchResult[] } {
  if (!isRecord(value) || !Array.isArray(value.places)) return false;
  const traditions = new Set(["hindu", "sikh", "buddhist", "jain", "other"]);
  return value.places.every((place) => isRecord(place) && isString(place.id) && isString(place.name) &&
    isString(place.tradition) && traditions.has(place.tradition) &&
    (place.deity === null || isString(place.deity)) &&
    (place.address === null || isString(place.address)) &&
    typeof place.latitude === "number" && Number.isFinite(place.latitude) && place.latitude >= -90 && place.latitude <= 90 &&
    typeof place.longitude === "number" && Number.isFinite(place.longitude) && place.longitude >= -180 && place.longitude <= 180);
}

async function requestJson<T>(
  path: string,
  userId: string,
  options: Omit<Parameters<typeof apiFetch>[1], "expectedUserId"> = {},
  validate?: (value: unknown) => value is T,
): Promise<T> {
  const response = await apiFetch(path, { ...options, expectedUserId: userId });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(payload) && isString(payload.error)
      ? payload.error
      : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  const timing = parseServerTimingHeader(response.headers.get("Server-Timing"));
  if (timing) recordServerTiming({ kind: "authenticated", userId } satisfies AuthIdentity, "kul", timing);
  if (validate && !validate(payload)) throw new Error("The family response was incomplete. Refresh and try again.");
  return payload as T;
}

export function fetchKulSnapshot(userId: string) {
  return requestJson<KulSnapshot>("/api/native/kul", userId, {},
    (value): value is KulSnapshot => isKulSnapshot(value) && value.userId === userId);
}

export function createKul(userId: string, input: { name: string; emoji: string }) {
  return requestJson<{ success: true }>("/api/native/kul", userId, { method: "POST", body: JSON.stringify({ action: "create", ...input }) });
}
export function joinKul(userId: string, inviteCode: string) {
  return requestJson<{ success: true }>("/api/native/kul", userId, { method: "POST", body: JSON.stringify({ action: "join", inviteCode }) });
}
export type UniversalKulInvitation = {
  token: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  createdAt: string;
};
export type UniversalKulPreview = {
  kulName: string;
  avatarEmoji: string;
  guardianName: string;
  memberCount: number;
  expiresAt: string | null;
};
export function fetchKulInvitationToken(userId: string) {
  return requestJson<{ success: true; invitation: UniversalKulInvitation }>("/api/native/kul/invitation", userId);
}
export async function previewKulInvitation(token: string): Promise<UniversalKulPreview> {
  const res = await apiFetch(`/api/native/kul/invitation?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const err: unknown = await res.json().catch(() => null);
    throw new Error(isRecord(err) && isString(err.error) ? err.error : "Invitation not found");
  }
  const payload: unknown = await res.json();
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.invitation)) {
    throw new Error("The family invitation response was incomplete.");
  }
  const invitation = payload.invitation;
  if (!isString(invitation.kulName) || !isString(invitation.avatarEmoji) ||
      !isString(invitation.guardianName) || typeof invitation.memberCount !== "number" ||
      (invitation.expiresAt !== null && !isString(invitation.expiresAt))) {
    throw new Error("The family invitation response was incomplete.");
  }
  return invitation as UniversalKulPreview;
}
export function joinKulByToken(userId: string, token: string) {
  return requestJson<{ success: true; alreadyMember: boolean; kul?: unknown }>(
    "/api/native/kul/invitation",
    userId,
    { method: "POST", body: JSON.stringify({ action: "join_token", token }) }
  );
}
export function regenerateKulInvitationLink(userId: string, options?: { maxUses?: number; expiresDays?: number }) {
  return requestJson<{ success: true; invitation: UniversalKulInvitation }>(
    "/api/native/kul/invitation",
    userId,
    { method: "POST", body: JSON.stringify({ action: "regenerate", ...options }) }
  );
}
export function revokeKulInvitationLink(userId: string) {
  return requestJson<{ success: true }>("/api/native/kul/invitation", userId, { method: "POST", body: JSON.stringify({ action: "revoke" }) });
}
export function sendKulMessage(userId: string, content: string) {
  return requestJson<KulMessage>("/api/native/kul/messages", userId, { method: "POST", body: JSON.stringify({ content }) });
}
export function assignKulTask(userId: string, input: { title: string; description?: string; taskType: KulTaskType; assignedTo: string; dueDate?: string }) {
  return requestJson<KulTask>("/api/native/kul/tasks", userId, { method: "POST", body: JSON.stringify(input) });
}
export function completeKulTask(userId: string, taskId: string) {
  return requestJson<{ id: string; completed: true; completed_at?: string; alreadyCompleted?: boolean }>("/api/native/kul/tasks", userId, { method: "PATCH", body: JSON.stringify({ taskId, completed: true }) });
}

export type KulEventInput = {
  title: string;
  eventType: KulEventType;
  description?: string;
  memberId?: string;
} & (
  | { dateSystem: "gregorian"; eventDate: string; recurring: boolean }
  | ({ dateSystem: "tithi"; recurring: true } & KulTithi)
);
export function saveKulEvent(userId: string, input: KulEventInput, eventId?: string) {
  return requestJson<KulEvent>("/api/native/kul/events", userId, {
    method: eventId ? "PATCH" : "POST",
    body: JSON.stringify({ ...input, ...(eventId ? { eventId } : {}) }),
  });
}
export function deleteKulEvent(userId: string, eventId: string) {
  return requestJson<{ success: true }>("/api/native/kul/events", userId, { method: "DELETE", body: JSON.stringify({ eventId }) });
}
export function addKulFamilyMember(userId: string, input: { name: string; relationship?: string; generation?: number; parentId?: string }) {
  return requestJson<KulFamilyMember>("/api/native/kul/family", userId, { method: "POST", body: JSON.stringify(input) });
}
export function updateKulFamilyMember(userId: string, input: { memberId: string; name?: string; relationship?: string | null; generation?: number | null; parentId?: string | null; spouseId?: string | null; isAlive?: boolean }) {
  return requestJson<KulFamilyMember>("/api/native/kul/family", userId, { method: "PATCH", body: JSON.stringify(input) });
}
export function deleteKulFamilyMember(userId: string, memberId: string) {
  return requestJson<{ success: true }>("/api/native/kul/family", userId, { method: "DELETE", body: JSON.stringify({ memberId }) });
}
export function updateKulLineage(userId: string, input: Partial<KulLineage> & Partial<{ calendarReference: Partial<KulCalendarReference> }>) {
  const { calendarReference, ...lineage } = input;
  return requestJson<{ success: true }>("/api/native/kul/lineage", userId, {
    method: "PATCH",
    body: JSON.stringify({ ...lineage, ...(calendarReference ? {
      calendarReferenceLabel: calendarReference.label,
      calendarTimezone: calendarReference.timezone,
      calendarMonthSystem: calendarReference.monthSystem,
      calendarLatitude: calendarReference.latitude,
      calendarLongitude: calendarReference.longitude,
    } : {}) }),
  });
}
export function transferKulGuardian(userId: string, targetUserId: string) {
  return requestJson<{ success: true }>("/api/native/kul/members", userId, { method: "PATCH", body: JSON.stringify({ targetUserId }) });
}
export function leaveOrRemoveKulMember(userId: string, targetUserId: string) {
  return requestJson<{ success: true; deletedLastMember?: boolean }>("/api/native/kul/members", userId, { method: "DELETE", body: JSON.stringify({ targetUserId }) });
}

export async function searchKulTirtha(userId: string, query: string) {
  const result = await requestJson<{ places: KulTirthaSearchResult[] }>(
    `/api/native/kul/tirtha?q=${encodeURIComponent(query)}`,
    userId,
    {},
    isKulTirthaSearchPayload,
  );
  return result.places;
}
export type TirthaPlaceImport = {
  id: string; source: string; source_id: string; name: string; tradition: string;
  lat: number; lon: number; address?: string | null; website?: string | null;
  phone?: string | null; opening_hours?: string | null; deity?: string | null; sampradaya?: string | null;
};
export async function addKulTirthaWish(userId: string, place: TirthaPlaceImport): Promise<KulTirthaItem & { alreadyExists?: boolean }> {
  const ensured = await apiFetch("/api/tirtha/place", { method: "POST", expectedUserId: userId, body: JSON.stringify(place) });
  if (!ensured.ok) throw new Error("Could not add this sacred place to the catalog.");
  return requestJson<KulTirthaItem & { alreadyExists?: boolean }>("/api/native/kul/tirtha", userId, { method: "POST", body: JSON.stringify({ placeId: place.id }) });
}
export function addExistingKulTirthaWish(userId: string, placeId: string) {
  return requestJson<KulTirthaItem>("/api/native/kul/tirtha", userId, { method: "POST", body: JSON.stringify({ placeId }) });
}
export function updateKulTirthaWish(userId: string, input: { placeId: string; status: "wishlist" | "visited"; notes?: string | null }) {
  return requestJson<KulTirthaItem>("/api/native/kul/tirtha", userId, { method: "PATCH", body: JSON.stringify(input) });
}
export function deleteKulTirthaWish(userId: string, placeId: string) {
  return requestJson<{ success: true }>("/api/native/kul/tirtha", userId, { method: "DELETE", body: JSON.stringify({ placeId }) });
}
export function fetchKulMembership(userId: string) {
  return requestJson<{ kulId: string; role: KulRole; wishPlaceIds: string[] } | null>(
    "/api/native/kul/membership",
    userId,
    {},
    (value): value is { kulId: string; role: KulRole; wishPlaceIds: string[] } | null =>
      value === null || (isRecord(value) && isString(value.kulId) &&
        (value.role === "guardian" || value.role === "sadhak") &&
        Array.isArray(value.wishPlaceIds) && value.wishPlaceIds.every(isString)),
  );
}
export function fetchTirthaPlace(userId: string, placeId: string) {
  return requestJson<{ placeId: string; temple: import("@/lib/overpass").Temple }>(
    `/api/native/tirtha/place?placeId=${encodeURIComponent(placeId)}`,
    userId,
    {},
    (value): value is { placeId: string; temple: import("@/lib/overpass").Temple } =>
      isRecord(value) && value.placeId === placeId && isRecord(value.temple) &&
      value.temple.id === placeId && isString(value.temple.name) &&
      typeof value.temple.lat === "number" && Number.isFinite(value.temple.lat) &&
      typeof value.temple.lon === "number" && Number.isFinite(value.temple.lon),
  );
}

export { getKulTaskHref };
