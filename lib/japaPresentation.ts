export function getMantraScriptFont(text: string | null | undefined, fonts: { serifBold: string; devanagariBold: string }): string {
  if (!text) return fonts.serifBold;
  return /[\u0900-\u097F]/.test(text) ? fonts.devanagariBold : fonts.serifBold;
}

export function getCompletionTitle(tradition: string | null): string {
  if (tradition === 'sikh') return 'Simran Complete';
  if (tradition === 'buddhist') return 'Meditation Complete';
  if (tradition === 'jain') return 'Japa Complete';
  return 'माला पूर्ण हुई';
}

export function getSpiritualTimeWindow(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 3 && hour < 6) return 'brahma_muhurta';
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 20) return 'sandhya';
  return 'night';
}

export function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export function capitalize(value: string | null | undefined): string {
  if (!value) return 'Dharma';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
