// The one database read behind the Solar Day place (rules in lib/solarDayLocation.ts).
import { supabase } from '@/lib/supabase';
import { resolveSolarDayLocation, type SolarDayLocation } from '@/lib/solarDayLocation';

export async function loadSolarDayLocation(userId: string): Promise<SolarDayLocation> {
  const result = await supabase
    .from('profiles')
    .select('latitude, longitude, timezone, city, neighbourhood')
    .eq('id', userId)
    .maybeSingle();
  return resolveSolarDayLocation(result);
}
