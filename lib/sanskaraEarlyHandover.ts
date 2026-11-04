import type { SanskaraEarlyHandoverStatus } from './sanskaraContract';

/**
 * What the early hand-over card says and offers, decided from the status the server sent for this manager. The server
 * still decides every action; this only keeps the buttons to ones that can succeed and says plainly what each does.
 *
 * Nothing here is cached or inferred from dates: the status is the answer to "may I act right now".
 */
export type EarlyActionId = 'start' | 'restart' | 'approve' | 'confirm' | 'cancel';

export type EarlyAction = { id: EarlyActionId; label: string; primary: boolean };

export type EarlyHandoverView = {
  title: string;
  body: string;
  actions: EarlyAction[];
  /** The card opens by itself when this manager has something to do. */
  needsAttention: boolean;
  icon: 'users' | 'clock' | 'user-check' | 'alert-circle';
};

/** What the start dialog and the final confirmation say. Shown before anything moves; the move cannot be undone. */
export function earlyStartWarning(name: string): { title: string; body: string } {
  return {
    title: `Hand ${name} their own timeline?`,
    body: `${name}'s milestones will move to ${name}'s own Shoonaya account, and you and every other manager will lose access to them. This cannot be undone.\n\nEvery manager must agree first. ${name} needs their own account with their date of birth saved in the profile.`,
  };
}

export function earlyConfirmWarning(name: string, who: string): { title: string; body: string } {
  return {
    title: `Hand over to ${who}?`,
    body: `Only continue if this account is ${name}'s own. The milestones will move now, you and every other manager will lose access, and this cannot be undone.`,
  };
}

/** What the manager who confirmed is told once the records have moved. */
export function earlyConfirmedMessage(result: { moved: number; dropped_as_duplicates: number }): string {
  const n = result.moved;
  const moved = `${n} ${n === 1 ? 'milestone was' : 'milestones were'} handed over.`;
  if (!(result.dropped_as_duplicates > 0)) return `Done. ${moved} You no longer have access to them.`;
  const d = result.dropped_as_duplicates;
  return `Done. ${moved} ${d} ${d === 1 ? 'was' : 'were'} not added, because their own timeline already had a record for the same rite. You no longer have access to them.`;
}

/** What the child is told after entering a code from an early hand-over: nothing has moved yet. */
export const EARLY_ACCEPTED_MESSAGE =
  'Your code was accepted. Nothing has moved yet: the parent who started this must now confirm that this account is yours.';

function who(person: NonNullable<SanskaraEarlyHandoverStatus['acceptor']>): string {
  const full = person.full_name?.trim();
  const user = person.username?.trim();
  if (full && user) return `${full} (@${user})`;
  return full || (user ? `@${user}` : 'an account');
}

const CANCEL: EarlyAction = { id: 'cancel', label: 'Cancel hand-over', primary: false };

export function earlyHandoverView(status: SanskaraEarlyHandoverStatus, name: string): EarlyHandoverView | null {
  const { state } = status;

  if (state === 'none') {
    // Off, or not open for this child: nothing is offered, and nothing is said about why (the floor is a policy, not a fact for the screen).
    if (!status.available) return null;
    return {
      title: `Hand ${name} their own timeline`,
      body: `${name} can take over their milestones before turning 18, with every manager's agreement. They move to ${name}'s own account and you lose access.`,
      actions: [{ id: 'start', label: 'Start hand-over', primary: true }],
      needsAttention: false,
      icon: 'users',
    };
  }

  const progress = `${status.approvals_have} of ${status.approvals_total} managers have agreed.`;
  // Cancelling stays possible when the feature has been switched off or the child is no longer eligible: it only ends a hand-over.
  const cancelOnly = !status.available && state !== 'expired';

  if (cancelOnly) {
    return {
      title: 'Hand-over is no longer available',
      body: `A hand-over for ${name} was in progress, but it cannot continue now. Nothing has moved. You can cancel it.`,
      actions: [CANCEL],
      needsAttention: false,
      icon: 'alert-circle',
    };
  }

  if (state === 'awaiting_approval') {
    const actions: EarlyAction[] = [];
    if (!status.i_approved) actions.push({ id: 'approve', label: 'I agree', primary: true });
    if (status.i_started) actions.push({ id: 'restart', label: 'Start again with a new code', primary: false });
    actions.push(CANCEL);
    return {
      title: status.i_approved ? 'Waiting for the other managers' : `Agree to hand ${name} their own timeline?`,
      body: status.i_approved
        ? `${progress} Everyone must agree before ${name} can use the code. Nothing has moved.`
        : `${progress} If you agree, ${name}'s milestones can move to ${name}'s own account, and you will lose access to them. This cannot be undone.`,
      actions,
      needsAttention: !status.i_approved,
      icon: 'users',
    };
  }

  if (state === 'ready') {
    const actions: EarlyAction[] = [];
    if (status.i_started) actions.push({ id: 'restart', label: 'Start again with a new code', primary: false });
    actions.push(CANCEL);
    return {
      title: `Waiting for ${name} to enter the code`,
      body: `Every manager has agreed. ${name} enters the code on their own account. Nothing has moved yet.`,
      actions,
      needsAttention: false,
      icon: 'clock',
    };
  }

  if (state === 'awaiting_confirmation') {
    if (status.i_started && status.acceptor) {
      const label = who(status.acceptor);
      return {
        title: `Is this ${name}?`,
        body: `${label} entered the code. Only confirm if this account is ${name}'s own. Nothing moves until you confirm.`,
        actions: [{ id: 'confirm', label: 'Yes, hand over', primary: true }, { id: 'cancel', label: 'No, cancel', primary: false }],
        needsAttention: true,
        icon: 'user-check',
      };
    }
    if (status.i_started) {
      // The account that entered the code can no longer be shown (it was deleted). Never confirm into the unknown.
      return {
        title: 'The account that used the code is gone',
        body: 'Nothing has moved. Start again with a new code if you still want to hand over.',
        actions: [{ id: 'restart', label: 'Start again with a new code', primary: true }, CANCEL],
        needsAttention: false,
        icon: 'alert-circle',
      };
    }
    return {
      title: 'Waiting for the manager who started this',
      body: `${name} entered the code. The manager who started the hand-over must confirm it. Nothing has moved.`,
      actions: [CANCEL],
      needsAttention: false,
      icon: 'clock',
    };
  }

  // expired
  return {
    title: 'The code has expired',
    body: `The hand-over for ${name} ran out of time. Nothing has moved.${status.available ? ' You can start again.' : ''}`,
    actions: status.available ? [{ id: 'restart', label: 'Start again with a new code', primary: true }, CANCEL] : [CANCEL],
    needsAttention: false,
    icon: 'alert-circle',
  };
}
