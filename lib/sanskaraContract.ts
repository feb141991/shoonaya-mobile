import { parseDateInput } from './date-input';
import { ApiRequestError } from './user-facing-error';

export const SANSKARA_REMINDERS_LIVE = false;
export const SANSKARA_SCHEMA_VERSION = 1;
export type SanskaraPrivate = { notes: string | null; location: string | null; performed_by: string | null; expected_due_date: string | null; version: number };
export type SanskaraRecord = { id: string; rite_key: string; custom_title: string | null; sensitivity: 'A' | 'B'; planned_date: string | null; completed_date: string | null; version: number; private: SanskaraPrivate | null };
export type SanskaraTimeline = { subject_id: string; records: SanskaraRecord[] };
export type SanskaraDependent = { id: string; display_name: string; birth_date: string; kul_family_member_id: string | null; can_edit: boolean; can_manage: boolean; records: SanskaraRecord[] };
export type SanskaraPerson = { id: string; username: string | null; full_name: string | null };
export type SanskaraSharedRecord = { record_id: string; subject: { id: string; kind: 'account' | 'dependent'; label: string | null }; shared_by: SanskaraPerson; rite_key: string; custom_title: string | null; sensitivity: 'A' | 'B'; completed: boolean; planned_date?: string | null; completed_date?: string | null };
export type SanskaraAccess = { id: string; scope: 'record' | 'timeline'; record_id: string | null; created_at: string; shared_by_me: boolean; grantee: SanskaraPerson };
export type SanskaraReminder = { id: string; record_id: string; lead_days: number; enabled: boolean };
export type SanskaraExport = { generated_at: string; subjects: Array<{ id: string; kind: 'account' | 'dependent'; display_name: string | null; birth_date: string | null; role: 'owner' | 'manager' | 'former_manager'; records: SanskaraRecord[]; grants: Array<{ scope: 'record' | 'timeline'; record_id: string | null; created_at: string; revoked_at: string | null }> }> };
export type SanskaraOverview = { timeline: SanskaraTimeline; dependents: SanskaraDependent[]; shared: SanskaraSharedRecord[] };
export type SanskaraReads = { timeline: SanskaraTimeline; dependents: SanskaraDependent[]; 'shared-with-me': SanskaraSharedRecord[]; access: SanskaraAccess[]; reminders: SanskaraReminder[]; export: SanskaraExport };
export type SanskaraWrites = {
  'create-dependent': { name: string; birthDate: string; kulFamilyMemberId?: string | null };
  'set-kul-link': { subjectId: string; kulFamilyMemberId: string | null };
  'create-record': { subjectId: string; riteKey: 'custom'; customTitle: string; plannedDate?: string | null };
  'update-record': { recordId: string; customTitle?: string | null; plannedDate?: string | null; expectedVersion: number };
  'save-private': { recordId: string; notes?: string | null; location?: string | null; performedBy?: string | null; expectedDueDate?: string | null; expectedVersion: number };
  'set-completion': { recordId: string; completedDate: string | null; expectedVersion: number };
  'delete-record': { recordId: string }; 'delete-dependent': { subjectId: string }; 'delete-mine': Record<string, never>;
  'add-manager': { subjectId: string; accountId: string }; 'remove-manager': { subjectId: string; accountId: string };
  'grant-view': { subjectId: string; recordId: string | null; granteeId: string }; 'revoke-grant': { grantId: string };
  'start-claim': { subjectId: string }; 'cancel-claim': { subjectId: string }; 'accept-claim': { token: string };
  'set-reminder': { recordId: string; leadDays: number; enabled: boolean };
};
type Replayed = { replayed?: true };
export type SanskaraWriteResults = {
  'create-dependent': { id: string }; 'set-kul-link': { id: string; linked: boolean };
  'create-record': { id: string; version: number }; 'update-record': { id: string; version: number };
  'save-private': { id: string; private_version: number }; 'set-completion': { id: string; version: number };
  'delete-record': { id: string; deleted: boolean }; 'delete-dependent': { id: string; deleted: boolean }; 'delete-mine': { deleted: boolean };
  'add-manager': { id: string }; 'remove-manager': { id: string }; 'grant-view': { id: string };
  'revoke-grant': { id: string; revoked: boolean; already_revoked: boolean };
  'start-claim': { claim_id: string; expires_at: string; token?: string };
  'cancel-claim': { cancelled: number }; 'accept-claim': { moved: number; dropped_as_duplicates: number };
  'set-reminder': { id: string | null; enabled: boolean; generation: number | null };
};
export type SanskaraWriteResult<K extends keyof SanskaraWrites> = SanskaraWriteResults[K] & Replayed;

export class SanskaraError extends ApiRequestError {
  constructor(status: number, readonly code: string | null = null, readonly field: string | null = null) {
    super(status, code);
    this.name = 'SanskaraError';
  }
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
export const isSanskaraUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const str = (v: unknown): v is string => typeof v === 'string';
const text = (v: unknown) => v === null || str(v);
const bool = (v: unknown) => typeof v === 'boolean';
const integer = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const version = (v: unknown) => integer(v) && (v as number) >= 1;
const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && parseDateInput(v, { allowFuture: true, minYear: 1 }).ok;
const optionalDate = (v: unknown) => v === null || date(v);
const timestamp = (v: unknown) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const uuidOrNull = (v: unknown) => v === null || isSanskaraUuid(v);
const fields = (v: Obj, required: string[], optional: string[] = []) => required.every((key) => Object.hasOwn(v, key)) && Object.keys(v).every((key) => required.includes(key) || optional.includes(key));
const list = <T>(v: unknown, guard: (item: unknown) => item is T): v is T[] => Array.isArray(v) && v.every(guard);
const person = (v: unknown): v is SanskaraPerson => obj(v) && fields(v, ['id', 'username', 'full_name']) && isSanskaraUuid(v.id) && text(v.username) && text(v.full_name);
export const isSanskaraPrivate = (v: unknown): v is SanskaraPrivate => obj(v) && fields(v, ['notes', 'location', 'performed_by', 'expected_due_date', 'version']) && text(v.notes) && text(v.location) && text(v.performed_by) && optionalDate(v.expected_due_date) && version(v.version);
export const isSanskaraRecord = (v: unknown): v is SanskaraRecord => obj(v) && fields(v, ['id', 'rite_key', 'custom_title', 'sensitivity', 'planned_date', 'completed_date', 'version', 'private']) && isSanskaraUuid(v.id) && str(v.rite_key) && v.rite_key.length > 0 && text(v.custom_title) && ['A', 'B'].includes(String(v.sensitivity)) && optionalDate(v.planned_date) && optionalDate(v.completed_date) && version(v.version) && (v.private === null || isSanskaraPrivate(v.private));
export const isSanskaraTimeline = (v: unknown): v is SanskaraTimeline => obj(v) && fields(v, ['subject_id', 'records']) && isSanskaraUuid(v.subject_id) && list(v.records, isSanskaraRecord);
export const isSanskaraDependent = (v: unknown): v is SanskaraDependent => obj(v) && fields(v, ['id', 'display_name', 'birth_date', 'kul_family_member_id', 'can_edit', 'can_manage', 'records']) && isSanskaraUuid(v.id) && str(v.display_name) && date(v.birth_date) && uuidOrNull(v.kul_family_member_id) && bool(v.can_edit) && bool(v.can_manage) && list(v.records, isSanskaraRecord);
export const isSanskaraSharedRecord = (v: unknown): v is SanskaraSharedRecord => obj(v) && fields(v, ['record_id', 'subject', 'shared_by', 'rite_key', 'custom_title', 'sensitivity', 'completed'], ['planned_date', 'completed_date']) && isSanskaraUuid(v.record_id) && obj(v.subject) && fields(v.subject, ['id', 'kind', 'label']) && isSanskaraUuid(v.subject.id) && ['account', 'dependent'].includes(String(v.subject.kind)) && text(v.subject.label) && person(v.shared_by) && str(v.rite_key) && text(v.custom_title) && bool(v.completed) && (v.sensitivity === 'A' ? !('planned_date' in v) && !('completed_date' in v) : v.sensitivity === 'B' && optionalDate(v.planned_date) && optionalDate(v.completed_date));
export const isSanskaraAccess = (v: unknown): v is SanskaraAccess => obj(v) && fields(v, ['id', 'scope', 'record_id', 'created_at', 'shared_by_me', 'grantee']) && isSanskaraUuid(v.id) && ['record', 'timeline'].includes(String(v.scope)) && uuidOrNull(v.record_id) && timestamp(v.created_at) && bool(v.shared_by_me) && person(v.grantee);
export const isSanskaraReminder = (v: unknown): v is SanskaraReminder => obj(v) && fields(v, ['id', 'record_id', 'lead_days', 'enabled']) && isSanskaraUuid(v.id) && isSanskaraUuid(v.record_id) && integer(v.lead_days) && (v.lead_days as number) <= 365 && bool(v.enabled);
export const isSanskaraExport = (v: unknown): v is SanskaraExport => obj(v) && fields(v, ['generated_at', 'subjects']) && timestamp(v.generated_at) && Array.isArray(v.subjects) && v.subjects.every((s) => obj(s) && fields(s, ['id', 'kind', 'display_name', 'birth_date', 'role', 'records', 'grants']) && isSanskaraUuid(s.id) && ['account', 'dependent'].includes(String(s.kind)) && text(s.display_name) && optionalDate(s.birth_date) && ['owner', 'manager', 'former_manager'].includes(String(s.role)) && list(s.records, isSanskaraRecord) && Array.isArray(s.grants) && s.grants.every((g) => obj(g) && fields(g, ['scope', 'record_id', 'created_at', 'revoked_at']) && ['record', 'timeline'].includes(String(g.scope)) && uuidOrNull(g.record_id) && timestamp(g.created_at) && (g.revoked_at === null || timestamp(g.revoked_at))));
export const isSanskaraOverview = (v: unknown): v is SanskaraOverview => obj(v) && fields(v, ['timeline', 'dependents', 'shared']) && isSanskaraTimeline(v.timeline) && list(v.dependents, isSanskaraDependent) && list(v.shared, isSanskaraSharedRecord);

export function guardSanskaraRead<K extends keyof SanskaraReads>(action: K, value: unknown): value is SanskaraReads[K] {
  switch (action) {
    case 'timeline': return isSanskaraTimeline(value);
    case 'dependents': return list(value, isSanskaraDependent);
    case 'shared-with-me': return list(value, isSanskaraSharedRecord);
    case 'access': return list(value, isSanskaraAccess);
    case 'reminders': return list(value, isSanskaraReminder);
    case 'export': return isSanskaraExport(value);
  }
  return false;
}

export function guardSanskaraWrite<K extends keyof SanskaraWrites>(action: K, v: unknown): v is SanskaraWriteResult<K> {
  if (!obj(v) || (v.replayed !== undefined && v.replayed !== true)) return false;
  const valid = (required: string[]) => fields(v, required, ['replayed']);
  switch (action) {
    case 'create-dependent': case 'add-manager': case 'remove-manager': case 'grant-view': return valid(['id']) && isSanskaraUuid(v.id);
    case 'set-kul-link': return valid(['id', 'linked']) && isSanskaraUuid(v.id) && bool(v.linked);
    case 'create-record': case 'update-record': case 'set-completion': return valid(['id', 'version']) && isSanskaraUuid(v.id) && version(v.version);
    case 'save-private': return valid(['id', 'private_version']) && isSanskaraUuid(v.id) && integer(v.private_version);
    case 'delete-record': case 'delete-dependent': return valid(['id', 'deleted']) && isSanskaraUuid(v.id) && bool(v.deleted);
    case 'delete-mine': return valid(['deleted']) && bool(v.deleted);
    case 'revoke-grant': return valid(['id', 'revoked', 'already_revoked']) && isSanskaraUuid(v.id) && bool(v.revoked) && bool(v.already_revoked);
    case 'start-claim': return fields(v, ['claim_id', 'expires_at'], ['token', 'replayed']) && isSanskaraUuid(v.claim_id) && timestamp(v.expires_at) && (v.replayed === true ? !('token' in v) : typeof v.token === 'string' && /^[a-f0-9]{64}$/i.test(v.token));
    case 'cancel-claim': return valid(['cancelled']) && integer(v.cancelled);
    case 'accept-claim': return valid(['moved', 'dropped_as_duplicates']) && integer(v.moved) && integer(v.dropped_as_duplicates);
    case 'set-reminder': return valid(['id', 'enabled', 'generation']) && uuidOrNull(v.id) && bool(v.enabled) && (v.generation === null || integer(v.generation));
  }
  return false;
}

const WRITE_FIELDS: Record<keyof SanskaraWrites, string[]> = {
  'create-dependent': ['name','birthDate','kulFamilyMemberId'], 'set-kul-link': ['subjectId','kulFamilyMemberId'],
  'create-record': ['subjectId','riteKey','customTitle','plannedDate'], 'update-record': ['recordId','customTitle','plannedDate','expectedVersion'],
  'save-private': ['recordId','notes','location','performedBy','expectedDueDate','expectedVersion'], 'set-completion': ['recordId','completedDate','expectedVersion'],
  'delete-record': ['recordId'], 'delete-dependent': ['subjectId'], 'delete-mine': [], 'add-manager': ['subjectId','accountId'], 'remove-manager': ['subjectId','accountId'],
  'grant-view': ['subjectId','recordId','granteeId'], 'revoke-grant': ['grantId'], 'start-claim': ['subjectId'], 'cancel-claim': ['subjectId'], 'accept-claim': ['token'], 'set-reminder': ['recordId','leadDays','enabled'],
};

/** Screen fields must already be canonical; never reinterpret ambiguous typed dates in a write. */
export function buildSanskaraPayload<K extends keyof SanskaraWrites>(action: K, input: SanskaraWrites[K], requestId: string, now = new Date()): SanskaraWrites[K] & { requestId: string } {
  const bad = (field: string): never => { throw new SanskaraError(400, 'sanskara_invalid_input', field); };
  if (!isSanskaraUuid(requestId)) bad('requestId');
  if (!obj(input)) bad('body');
  const out: Obj = { requestId };
  for (const field of Object.keys(input)) {
    if (!WRITE_FIELDS[action].includes(field)) bad(field);
    const value = (input as Obj)[field];
    if (value === undefined) continue;
    if (['subjectId','recordId','accountId','granteeId','grantId','kulFamilyMemberId'].includes(field)) {
      if (value === null && (field === 'kulFamilyMemberId' || (action === 'grant-view' && field === 'recordId'))) out[field] = null;
      else { if (!isSanskaraUuid(value)) bad(field); out[field] = (value as string).toLowerCase(); }
    } else if (['birthDate','plannedDate','completedDate','expectedDueDate'].includes(field)) {
      if (value === null && field !== 'birthDate') out[field] = null;
      else {
        if (!date(value) || (value as string) < (field === 'birthDate' ? '2000-01-01' : '1900-01-01') || (value as string) > '2200-01-01') bad(field);
        if (field === 'birthDate') {
          const today = now.toISOString().slice(0,10);
          const [year, month, day] = (value as string).split('-').map(Number);
          const majority = new Date(Date.UTC(year + 18, month - 1, day));
          // Postgres interval clamps leap birthdays to the last February day.
          if (majority.getUTCMonth() !== month - 1) majority.setUTCDate(0);
          if ((value as string) > today || majority.toISOString().slice(0,10) <= today) bad(field);
        }
        out[field] = value;
      }
    } else if (field === 'expectedVersion' || field === 'leadDays') {
      if (!integer(value) || (value as number) > (field === 'leadDays' ? 365 : 1_000_000)) bad(field);
      out[field] = value;
    } else if (field === 'enabled') { if (!bool(value)) bad(field); out[field] = value; }
    else if (field === 'token') { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) bad(field); out[field] = (value as string).toLowerCase(); }
    else if (field === 'riteKey') { if (value !== 'custom') bad(field); out[field] = value; }
    else {
      const max = field === 'name' ? 40 : field === 'customTitle' ? 60 : field === 'notes' ? 2000 : 120;
      if (value !== null && typeof value !== 'string') bad(field);
      const cleaned = typeof value === 'string' ? value.trim() : null;
      if (cleaned && (cleaned.length > max || (field === 'notes' ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(cleaned))) bad(field);
      out[field] = cleaned || null;
    }
  }
  const required = WRITE_FIELDS[action].filter((key) => !['kulFamilyMemberId','plannedDate','notes','location','performedBy','expectedDueDate','customTitle'].includes(key));
  if (action === 'set-kul-link') required.push('kulFamilyMemberId');
  if (action === 'create-record') required.push('customTitle');
  for (const key of required) if (!(key in out) || (out[key] === null && !((action === 'set-completion' && key === 'completedDate') || (action === 'grant-view' && key === 'recordId') || (action === 'set-kul-link' && key === 'kulFamilyMemberId')))) bad(key);
  return out as SanskaraWrites[K] & { requestId: string };
}
