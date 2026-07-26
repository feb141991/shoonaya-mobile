// Shared with components/home/GreetingPicker.tsx — moved out of
// app/(tabs)/index.tsx (where these previously lived as unexported module
// constants) so the picker can offer the exact same pool instead of a
// second, easily-drifting copy.
export const GREETING_POOLS: Record<string, string[]> = {
  hindu: ['Jai Shri Ram', 'Hari Om', 'Om Namah Shivaya', 'Radhe Radhe'],
  sikh: ['Sat Sri Akal', 'Waheguru Ji Ka Khalsa'],
  buddhist: ['Namo Buddhaya', 'Om Mani Padme Hum'],
  jain: ['Jai Jinendra', 'Namo Arihantanam'],
  default: ['Jai Shri Ram', 'Om Namah Shivaya', 'Hari Om', 'Pranam'],
};

export function getGreetingPool(tradition: string | null): string[] {
  return (tradition && GREETING_POOLS[tradition]) || GREETING_POOLS.default;
}

export function getTraditionGreeting(tradition: string | null, seed: number) {
  const pool = getGreetingPool(tradition);
  return pool[seed % pool.length];
}

export function getTimeGreeting(hour: number): string | null {
  if (hour >= 5 && hour < 12) return 'Suprabhat';
  if (hour >= 17 && hour < 20) return 'Shubh Sandhya';
  if (hour >= 20 || hour < 5) return 'Shubh Ratri';
  return null;
}
