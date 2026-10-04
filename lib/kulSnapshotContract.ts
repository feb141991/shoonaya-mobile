import type { KulEventType, KulRole, KulTaskType } from "./kul-types";
import type {
  KulFamilyMember,
  KulMember,
  KulMessage,
  KulSnapshot,
  KulTask,
  KulTirthaItem,
} from "./kul";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isString(value: unknown): value is string { return typeof value === "string"; }
function isNullableString(value: unknown): value is string | null { return value === null || isString(value); }
function isIsoDate(value: unknown): value is string {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const isRole = (value: unknown): value is KulRole => value === "guardian" || value === "sadhak";
const EVENT_TYPES = new Set<KulEventType>(["birthday", "anniversary", "death_anniversary", "puja", "satsang", "custom"]);
const TASK_TYPES = new Set<KulTaskType>(["read", "recite", "practice", "memorise"]);
const TRADITIONS = new Set(["hindu", "sikh", "buddhist", "jain", "other"]);

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isTimezone(value: unknown): value is string {
  if (!isString(value) || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function isKulMember(value: unknown): value is KulMember {
  return isRecord(value) && isString(value.id) && isString(value.userId) && isRole(value.role) &&
      isString(value.joinedAt) && (value.profile === null || (isRecord(value.profile) &&
      isString(value.profile.id) && value.profile.id === value.userId && isNullableString(value.profile.full_name) &&
      isNullableString(value.profile.username) && isNullableString(value.profile.avatar_url) &&
      isNullableString(value.profile.tradition) && isNullableString(value.profile.sampradaya)));
}

function isKulTask(value: unknown): value is KulTask {
  return isRecord(value) && isString(value.id) && isString(value.title) &&
    isNullableString(value.description) && TASK_TYPES.has(value.task_type as KulTaskType) &&
    isNullableString(value.content_ref) && (value.due_date === null || isIsoDate(value.due_date)) &&
    typeof value.completed === "boolean" && isNullableString(value.completed_at) &&
    isString(value.assigned_to) && isString(value.assigned_by);
}

function isKulMessage(value: unknown): value is KulMessage {
  return isRecord(value) && isString(value.id) && isString(value.content) &&
    isString(value.sender_id) && isNullableString(value.reaction) && isString(value.created_at);
}

function isKulFamilyMember(value: unknown): value is KulFamilyMember {
  return isRecord(value) && isString(value.id) && isString(value.name) &&
    isNullableString(value.role) && (value.generation === null || (typeof value.generation === "number" && Number.isInteger(value.generation))) &&
    isNullableString(value.parent_id) && isNullableString(value.spouse_id) && typeof value.is_alive === "boolean";
}

function isKulTirthaItem(value: unknown): value is KulTirthaItem {
  return isRecord(value) && isString(value.id) && isString(value.placeId) &&
    isString(value.name) && isString(value.tradition) && TRADITIONS.has(value.tradition) && isNullableString(value.deity) &&
    isNullableString(value.address) && typeof value.latitude === "number" && Number.isFinite(value.latitude) &&
    value.latitude >= -90 && value.latitude <= 90 && typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180 &&
    (value.status === "wishlist" || value.status === "visited") &&
    (value.visitedAt === null || isIsoDate(value.visitedAt)) &&
    ((value.status === "wishlist") === (value.visitedAt === null)) &&
    isNullableString(value.notes) && isString(value.createdAt);
}

export function isKulSnapshot(value: unknown): value is KulSnapshot {
  if (!isRecord(value) || !isString(value.userId) || !isIsoDate(value.today) ||
    !(value.role === null || isRole(value.role)) || !Array.isArray(value.members) ||
    !Array.isArray(value.tasks) || !Array.isArray(value.messages) ||
    !Array.isArray(value.familyMembers) || !Array.isArray(value.events) ||
    !Array.isArray(value.tirthaWishes)) return false;
  if (value.kul === null) return value.role === null && value.members.length === 0 &&
    value.tasks.length === 0 && value.messages.length === 0 && value.familyMembers.length === 0 &&
    value.events.length === 0 && value.tirthaWishes.length === 0;
  if (!isRecord(value.kul) || !isString(value.kul.id) || !isString(value.kul.name) ||
    !isString(value.kul.avatarEmoji) || !isString(value.kul.createdAt) ||
    !isNullableString(value.kul.inviteCode) || !isRecord(value.kul.lineage) ||
    !isRecord(value.kul.calendarReference)) return false;
  const lineage = value.kul.lineage;
  const lineageFields = ["gotra", "pravara", "kuldeviName", "kuldevtaName", "kuldeviPlaceId", "kuldevtaPlaceId", "ancestralOrigin", "kulacharaNotes"];
  if (lineageFields.some((field) => !isNullableString(lineage[field]))) return false;
  const calendar = value.kul.calendarReference;
  if (!isString(calendar.label) || !calendar.label.trim() || !isTimezone(calendar.timezone) ||
    (calendar.monthSystem !== "amanta" && calendar.monthSystem !== "purnimanta") ||
    !isNullableNumber(calendar.latitude) || !isNullableNumber(calendar.longitude) ||
    (calendar.latitude !== null && (calendar.latitude < -90 || calendar.latitude > 90)) ||
    (calendar.longitude !== null && (calendar.longitude < -180 || calendar.longitude > 180)) ||
    ((calendar.latitude === null) !== (calendar.longitude === null))) return false;
  if (!value.members.every(isKulMember) || !value.tasks.every(isKulTask) ||
    !value.messages.every(isKulMessage) || !value.familyMembers.every(isKulFamilyMember) ||
    !value.tirthaWishes.every(isKulTirthaItem)) return false;
  const members = value.members as KulMember[];
  if (!members.some((member) => member.userId === value.userId && member.role === value.role) ||
    members.filter((member) => member.role === "guardian").length !== 1) return false;
  return value.events.every((raw) => {
    if (!isRecord(raw)) return false;
    if (!isString(raw.id) || !isString(raw.title) || !EVENT_TYPES.has(raw.event_type as KulEventType) ||
      !isIsoDate(raw.event_date) || !(raw.resolved_civil_date === null || isIsoDate(raw.resolved_civil_date)) ||
      (raw.date_system !== "gregorian" && raw.date_system !== "tithi") ||
      !isNullableString(raw.description) || !isNullableString(raw.member_id) ||
      typeof raw.recurring !== "boolean" || typeof raw.masa_is_adhika !== "boolean" ||
      raw.tithi_resolution !== "sunrise" || !isNullableString(raw.tithi_label) ||
      !isNullableString(raw.calculation_location)) return false;
    if (raw.date_system === "gregorian") return raw.masa === null && raw.paksha === null && raw.tithi === null && raw.month_system === null && !raw.masa_is_adhika;
    return typeof raw.masa === "number" && Number.isInteger(raw.masa) && raw.masa >= 1 && raw.masa <= 12 &&
      (raw.paksha === "shukla" || raw.paksha === "krishna") &&
      typeof raw.tithi === "number" && Number.isInteger(raw.tithi) && raw.tithi >= 1 && raw.tithi <= 15 &&
      (raw.month_system === "amanta" || raw.month_system === "purnimanta") && raw.recurring;
  });
}
