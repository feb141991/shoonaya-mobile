import type { Feather } from '@expo/vector-icons';
import { COLORS, FEATURE_COLORS } from '@/lib/constants';
import type { MandaliPostType } from '@/lib/mandali';

export const POST_TYPE_META: Record<MandaliPostType, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  update: { label: 'Update', icon: 'message-circle', color: FEATURE_COLORS.mandali.updateAccent },
  question: { label: 'Question', icon: 'help-circle', color: FEATURE_COLORS.mandali.questionAccent },
  announcement: { label: 'Announcement', icon: 'volume-2', color: FEATURE_COLORS.mandali.announcementAccent },
  event: { label: 'Event', icon: 'calendar', color: FEATURE_COLORS.mandali.eventAccent },
};

export const FILTER_OPTIONS: Array<{ value: MandaliPostType | 'all'; label: string; icon: keyof typeof Feather.glyphMap; color: string }> = [
  { value: 'all', label: 'All', icon: 'grid', color: COLORS.brandGold },
  { value: 'update', label: 'Updates', icon: POST_TYPE_META.update.icon, color: POST_TYPE_META.update.color },
  { value: 'event', label: 'Events', icon: POST_TYPE_META.event.icon, color: POST_TYPE_META.event.color },
  { value: 'question', label: 'Questions', icon: POST_TYPE_META.question.icon, color: POST_TYPE_META.question.color },
  { value: 'announcement', label: 'Announcements', icon: POST_TYPE_META.announcement.icon, color: POST_TYPE_META.announcement.color },
];

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
