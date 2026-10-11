export function parseTimeToHoursAndMinutes(timeStr?: string | null): { hour: number; minute: number } {
  if (!timeStr) return { hour: 12, minute: 0 };
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return { hour: 12, minute: 0 };
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  return {
    hour: isNaN(hour) || hour < 0 || hour > 23 ? 12 : hour,
    minute: isNaN(minute) || minute < 0 || minute > 59 ? 0 : minute,
  };
}

export function formatTime24(hour: number, minute: number): string {
  const h = Math.max(0, Math.min(23, hour)).toString().padStart(2, '0');
  const m = Math.max(0, Math.min(59, minute)).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function formatTime12Display(timeStr?: string | null): string | null {
  if (!timeStr || !timeStr.includes(':')) return null;
  const { hour, minute } = parseTimeToHoursAndMinutes(timeStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour.toString().padStart(2, '0')}:${displayMinute} ${period}`;
}

export const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
export const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const MINUTES = Array.from({ length: 60 }, (_, i) => i);
export const MINUTE_PRESETS = [0, 15, 30, 45];
