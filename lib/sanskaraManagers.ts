import type { SanskaraManagerPicker, SanskaraPerson } from './sanskaraContract';

/**
 * What the "Managers" card for one managed child says and offers (G4, contract E10). The server decides every action
 * (`sanskara_add_manager` accepts only a current member of the caller's Kul; `sanskara_remove_manager` refuses the last
 * manager); this only keeps the buttons to ones that can succeed and says plainly what each does.
 *
 * Nothing here is cached: the list is the answer to "who may see this child's records right now".
 */

export function managerLabel(person: Pick<SanskaraPerson, 'full_name' | 'username'>): string {
  const full = person.full_name?.trim();
  const user = person.username?.trim();
  if (full && user) return `${full} (@${user})`;
  return full || (user ? `@${user}` : 'A member of your Kul');
}

export type ManagersView = {
  title: string;
  body: string;
  /** Adding is offered only while there is room and someone to add. */
  canAdd: boolean;
  /** Stepping down is offered only to a manager who is not the last one. */
  canStepDown: boolean;
  /** True when the caller is the only manager: leaving or deleting the account would delete this child's timeline. */
  isSoleManager: boolean;
  /** Why adding is not possible, when it is not. */
  addHint: string | null;
};

export function managersView(picker: SanskaraManagerPicker, childName: string): ManagersView {
  const count = picker.managers.length;
  const isSoleManager = count === 1 && picker.managers[0]?.is_me === true;
  const roomLeft = count < picker.limit;
  const canAdd = roomLeft && picker.candidates.length > 0;
  const addHint = canAdd ? null
    : !roomLeft ? `${childName} already has the most managers allowed (${picker.limit}).`
    : 'Only a member of your own Kul who has agreed to religious-data use can be added. No one in your Kul can be added right now.';
  return {
    title: count === 1 ? 'Managers · only you' : `Managers · ${count}`,
    body: isSoleManager
      ? `You are the only manager of ${childName}'s timeline. If you delete your account, ${childName}'s milestones are deleted with it. Add another adult from your Kul to keep them.`
      : `These people can see and change ${childName}'s milestones. Anyone you add can also add or remove managers.`,
    canAdd,
    canStepDown: count > 1 && picker.managers.some((m) => m.is_me),
    isSoleManager,
    addHint,
  };
}

/** Shown before anything is added. Adding is immediate and the person does not have to accept (contract E6). */
export function addManagerWarning(childName: string, who: string): { title: string; body: string } {
  return {
    title: `Add ${who} as a manager?`,
    body: `${who} will immediately be able to see and change ${childName}'s milestones and notes, and to add or remove managers, including you. Only add someone you trust with this child's records.`,
  };
}

/** Shown before the caller leaves a child's managers. They lose access at once. */
export function stepDownWarning(childName: string): { title: string; body: string } {
  return {
    title: `Stop managing ${childName}?`,
    body: `You will no longer see ${childName}'s milestones. The other managers keep them. You cannot undo this yourself: one of them would have to add you again.`,
  };
}

/** Language-neutral list of the children's names for the account-deletion sheet: up to three, then "+N". */
export function soleManagerNames(names: string[]): string {
  const shown = names.slice(0, 3).join(', ');
  return names.length > 3 ? `${shown} +${names.length - 3}` : shown;
}
