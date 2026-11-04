import { formatParsedDate } from '@/lib/date-input';
import type { HandoverStage } from '@/lib/sanskaraHandover';

export type HandoverBannerCopy = {
  title: string;
  body: string;
  cta: string | null;
  tone: 'info' | 'warning';
  icon: 'clock' | 'share-2' | 'alert-circle';
};

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/**
 * What the banner says. Everything is decided from the stage (dates only); the server still decides whether the hand-over is
 * allowed. No claim is made about the child beyond the name the manager already sees on this screen.
 */
export function handoverBannerCopy(name: string, stage: HandoverStage): HandoverBannerCopy | null {
  if (stage.stage === 'approaching') {
    return {
      title: `${name} turns 18 on ${formatParsedDate(stage.adultOn)}`,
      body: `From that day you can hand ${name}'s timeline over to their own account. You will have 12 months. Until then you keep managing it.`,
      cta: null,
      tone: 'info',
      icon: 'clock',
    };
  }
  if (stage.stage !== 'open') return null;

  const end = formatParsedDate(stage.windowEndsOn);
  if (stage.urgency === 'last_week') {
    return {
      title: stage.daysLeft === 1 ? `Last day to hand over ${name}'s timeline` : `Only ${days(stage.daysLeft)} left to hand over ${name}'s timeline`,
      body: `On ${end} these milestones are deleted. Pass them to ${name}'s own account before then.`,
      cta: 'Hand over now',
      tone: 'warning',
      icon: 'alert-circle',
    };
  }
  if (stage.urgency === 'closing') {
    return {
      title: `${days(stage.daysLeft)} left to hand over ${name}'s timeline`,
      body: `On ${end} these milestones are deleted. Pass them to ${name}'s own account before then.`,
      cta: 'Hand over',
      tone: 'warning',
      icon: 'alert-circle',
    };
  }
  return {
    title: `Hand over ${name}'s timeline`,
    body: `${name} is now 18. You can pass these milestones to their own account until ${end} (${days(stage.daysLeft)} left). After that they are deleted.`,
    cta: 'Hand over',
    tone: 'info',
    icon: 'share-2',
  };
}

const milestones = (n: number) => `${n} ${n === 1 ? 'milestone' : 'milestones'}`;

/**
 * What the person who accepts a hand-over is told. The server moves the milestones and drops any it already has a record
 * for (the same rite), so the person's own record wins. That is stated whenever it happened: a silent drop would look like data loss.
 */
export function acceptResultMessage(result: { moved: number; dropped_as_duplicates: number }): string {
  const moved = `${milestones(result.moved)} ${result.moved === 1 ? 'was' : 'were'} added to your timeline.`;
  if (!(result.dropped_as_duplicates > 0)) return `Done. ${moved}`;
  const dropped = result.dropped_as_duplicates;
  return `Done. ${moved} ${milestones(dropped)} ${dropped === 1 ? 'was' : 'were'} not added, because your timeline already has a record for the same rite. Your own ${dropped === 1 ? 'record was' : 'records were'} kept.`;
}

