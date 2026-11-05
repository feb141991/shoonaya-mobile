import type { SanskaraExport } from './sanskaraContract';

/**
 * What the "Your Sanskāra data" sheet shows and says (AGENTS 25). Pure: no React, no storage, no network, so each rule below
 * is pinned by a test and none of it depends on a screen.
 *
 * The list is built from the server's own export, not from the Sanskāra overview, on purpose: the export (and the two delete
 * actions) work after a person has withdrawn religious-data consent, while the overview does not. Building the list from the
 * overview would hide exactly the people who most need to find these buttons.
 */

export type DataSubject = {
  id: string;
  kind: 'account' | 'dependent';
  /** "My timeline" for the person's own timeline, otherwise the name the manager gave the child. */
  name: string;
  role: 'owner' | 'manager' | 'former_manager';
  milestones: number;
  /** Only the person themself and a current manager may delete. A former manager (the child is 18) may read and download only. */
  deletable: boolean;
};

export const OWN_TIMELINE_NAME = 'My timeline';

export function milestoneCount(count: number): string {
  return count === 1 ? '1 milestone' : `${count} milestones`;
}

/** Own timeline first, then children by name. Order is stable for equal names, so a row never jumps when the list reloads. */
export function dataSubjects(exp: SanskaraExport): DataSubject[] {
  const rows = exp.subjects.map((s, index): { subject: DataSubject; index: number } => ({
    index,
    subject: {
      id: s.id,
      kind: s.kind,
      name: s.kind === 'account' ? OWN_TIMELINE_NAME : (s.display_name ?? '').trim() || 'Child',
      role: s.role,
      milestones: s.records.length,
      deletable: s.role === 'owner' || s.role === 'manager',
    },
  }));
  rows.sort((a, b) => {
    if (a.subject.kind !== b.subject.kind) return a.subject.kind === 'account' ? -1 : 1;
    return a.subject.name.localeCompare(b.subject.name) || a.index - b.index;
  });
  return rows.map((r) => r.subject);
}

export function roleLabel(subject: DataSubject): string {
  if (subject.role === 'owner') return 'Yours';
  if (subject.role === 'manager') return 'You manage this';
  return 'Read-only: access ends 12 months after the 18th birthday';
}

/** The file name carries the date only, never a name: it lands in Files, Downloads or an email attachment list. */
export function exportFileName(generatedAt: string): string {
  const day = /^(\d{4}-\d{2}-\d{2})T/.exec(generatedAt)?.[1];
  return `shoonaya-sanskara-${day ?? 'export'}.json`;
}

/** The server's answer, unchanged: a copy that is re-shaped on the device is no longer the record the server holds. */
export function exportFileBody(exp: SanskaraExport): string {
  return JSON.stringify(exp, null, 2);
}

export type DeleteCall =
  | { action: 'delete-mine'; input: Record<string, never> }
  | { action: 'delete-dependent'; input: { subjectId: string } };

/** The one write that deletes this timeline, or null when this person may not delete it. The server still decides. */
export function deleteCall(subject: DataSubject): DeleteCall | null {
  if (!subject.deletable) return null;
  return subject.kind === 'account'
    ? { action: 'delete-mine', input: {} }
    : { action: 'delete-dependent', input: { subjectId: subject.id } };
}

export function deleteHeading(subject: DataSubject): string {
  return subject.kind === 'account' ? 'Delete my timeline?' : `Delete ${subject.name}'s timeline?`;
}

/**
 * Said before anything is deleted. Each sentence is a fact read from the database function (sanskara_delete_dependent /
 * sanskara_delete_mine): any current manager deletes the child's timeline for every manager, shares go with it, and there is no
 * way back. A copy that was downloaded earlier is the only way back, so the warning says so.
 */
export function deleteWarning(subject: DataSubject): string[] {
  if (subject.kind === 'account') {
    return [
      `This permanently deletes your ${milestoneCount(subject.milestones)}, every note, place and name you saved on them, and every share you made.`,
      'It cannot be undone. Download a copy first if you want to keep one.',
    ];
  }
  return [
    `This permanently deletes ${subject.name}'s ${milestoneCount(subject.milestones)} and every note on them, for every manager of this timeline, not only for you.`,
    'Anyone it was shared with loses it. It cannot be undone. Download a copy first if you want to keep one.',
  ];
}

/** What a screen reader says on the button that actually deletes. "Try again" is said once a first attempt has failed. */
export function confirmLabel(subject: DataSubject, retry: boolean): string {
  const what = subject.kind === 'account' ? 'my timeline' : `${subject.name}'s timeline`;
  return retry ? `Try again: delete ${what} forever` : `Delete ${what} forever`;
}

export function deletedMessage(subject: DataSubject): string {
  return subject.kind === 'account' ? 'Your timeline was deleted.' : `${subject.name}'s timeline was deleted.`;
}

export const STALE_DELETE_MESSAGE = 'That timeline is no longer available to you. The list has been refreshed.';
export const EMPTY_MESSAGE = 'You have no Sanskāra timelines to download or delete.';
export const DOWNLOAD_NOTE =
  'The file holds every timeline you own, manage or can still read, with all dates, notes and places. It is not encrypted, so keep it somewhere private.';
export const SHARING_UNAVAILABLE_MESSAGE = 'Saving or sharing files is not available on this device.';
