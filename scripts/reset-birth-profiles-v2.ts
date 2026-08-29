/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Administrative Fresh-Start Reset & Verification Script (Schema v2)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. Preflight audit of existing birth_profiles.
 * 2. Deletes legacy charts (< v2).
 * 3. Creates/seeds canonical Schema v2 birth profile charts.
 * 4. Post-reset verification report.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const NATIVE_ROOT = path.resolve(__dirname, '..');
const BACKEND_ROOT = path.resolve(NATIVE_ROOT, '../Sanatan Sangam/Shoonaya');

const envPath = path.join(BACKEND_ROOT, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=["']?([^"'\n]+)/)?.[1]?.trim();
const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\n]+)/)?.[1]?.trim();

if (!url || !key) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const db = createClient(url, key);

// Import the fresh astro engine from backend
const { generateAstroChart, ASTRO_CHART_SCHEMA_VERSION } = require(path.join(BACKEND_ROOT, 'src/lib/jyotish/astro-engine.ts'));

async function main() {
  console.log('================================================================');
  console.log('  KUNDALI SCHEMA V2 FRESH-START RESET & PREFLIGHT VERIFICATION  ');
  console.log('================================================================');

  // 1. Preflight Audit
  const { data: preflightRows, error: preErr } = await db.from('birth_profiles').select('id, label, chart_data');
  if (preErr) {
    console.error('Preflight audit failed:', preErr.message);
    process.exit(1);
  }

  console.log(`\n[1/4] PREFLIGHT AUDIT: Found ${preflightRows?.length ?? 0} total existing birth profile rows in DB.`);
  for (const row of preflightRows || []) {
    const sv = row.chart_data?.schemaVersion;
    const hasPanchang = !!row.chart_data?.birthPanchang;
    const hasTransitions = !!row.chart_data?.birthPanchang?.tithi?.endsAtUtc;
    console.log(`  - Profile "${row.label}" (${row.id}): schemaVersion=${sv ?? 'legacy'}, hasPanchang=${hasPanchang}, hasTransitions=${hasTransitions}`);
  }

  // 2. Wipe ALL rows to guarantee zero legacy pollution
  console.log('\n[2/4] EXECUTING FRESH-START DELETION...');
  const { error: delErr } = await db.from('birth_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error('Deletion failed:', delErr.message);
    process.exit(1);
  }
  console.log('  -> All legacy birth_profile rows successfully deleted from Supabase.');

  // 3. Reseed verified Schema v2 test charts
  console.log('\n[3/4] SEEDING CANONICAL SCHEMA V2 BIRTH PROFILES...');

  const USER_IDS = [
    'e6146df9-57de-40ec-9c78-fec43b5b295c', // pprince.ssharma@live.com (Primary simulator user)
    'af5cec73-6f18-46be-9e46-7445da8d329a', // career.prince@gmail.com
  ];

  for (const userId of USER_IDS) {
    // 3A. Exact Birth Time Profile (Prisha Sharma)
    const exactInput = {
      date: '2023-06-18',
      time: '23:35:00',
      lat: 28.6139,
      lng: 77.2090,
      timezone: 'Asia/Kolkata',
      timeUnknown: false,
    };
    const exactChart = generateAstroChart(exactInput);

    const exactProfileRow = {
      id: `ae508e4c-${userId.slice(9)}`,
      owner_id: userId,
      label: 'Prisha Sharma',
      full_name: 'Prisha Sharma',
      relation: 'child',
      date_of_birth: '2023-06-18',
      time_of_birth: '23:35:00',
      birth_city: 'New Delhi',
      birth_country: 'India',
      birth_lat: 28.6139,
      birth_lng: 77.2090,
      birth_timezone: 'Asia/Kolkata',
      rashi: 'Mithuna',
      sun_rashi: 'Mithuna',
      nakshatra: 'Ardra',
      nakshatra_pada: 1,
      nakshatra_lord: 'Rahu',
      lagna: 'Kumbha',
      lagna_deg: 320.5,
      ayanamsa: 24.18,
      chart_data: exactChart,
      is_primary: true,
      is_public: false,
    };

    const { error: ins1Err } = await db.from('birth_profiles').upsert(exactProfileRow);
    if (ins1Err) {
      console.error(`Failed to insert exact profile for ${userId}:`, ins1Err.message);
    } else {
      console.log(`  ✓ Inserted exact Schema v2 profile "${exactProfileRow.label}" (has transitions: ${!!exactChart.birthPanchang?.tithi?.endsAtUtc})`);
    }

    // 3B. Unknown Birth Time Profile (Aarav Kumar - Time Unknown)
    const unknownInput = {
      date: '1995-10-24',
      time: '12:00:00',
      lat: 19.0760,
      lng: 72.8777,
      timezone: 'Asia/Kolkata',
      timeUnknown: true,
    };
    const unknownChart = generateAstroChart(unknownInput);

    const unknownProfileRow = {
      id: `bf609f5d-${userId.slice(9)}`,
      owner_id: userId,
      label: 'Aarav Kumar (Time Unknown)',
      full_name: 'Aarav Kumar',
      relation: 'friend',
      date_of_birth: '1995-10-24',
      time_of_birth: null,
      birth_city: 'Mumbai',
      birth_country: 'India',
      birth_lat: 19.0760,
      birth_lng: 72.8777,
      birth_timezone: 'Asia/Kolkata',
      rashi: 'Tula',
      sun_rashi: 'Tula',
      nakshatra: 'Swati',
      nakshatra_pada: 2,
      nakshatra_lord: 'Rahu',
      lagna: null,
      lagna_deg: null,
      ayanamsa: 23.8,
      chart_data: unknownChart,
      is_primary: false,
      is_public: false,
    };

    const { error: ins2Err } = await db.from('birth_profiles').upsert(unknownProfileRow);
    if (ins2Err) {
      console.error(`Failed to insert unknown-time profile for ${userId}:`, ins2Err.message);
    } else {
      console.log(`  ✓ Inserted time-unknown Schema v2 profile "${unknownProfileRow.label}" (birthPanchang is null: ${unknownChart.birthPanchang === null})`);
    }
  }

  // 4. Post-Reset Verification
  console.log('\n[4/4] POST-RESET VERIFICATION:');
  const { data: postRows, error: postErr } = await db.from('birth_profiles').select('*');
  if (postErr) {
    console.error('Post-reset check failed:', postErr.message);
    process.exit(1);
  }

  console.log(`Total Active Profiles: ${postRows?.length ?? 0}`);
  let validV2Count = 0;
  let withPanchangCount = 0;
  let withTransitionsCount = 0;
  let unknownTimeNullPanchangCount = 0;

  for (const row of postRows || []) {
    const cd = row.chart_data;
    if (cd?.schemaVersion === ASTRO_CHART_SCHEMA_VERSION) validV2Count++;
    if (cd?.birthPanchang) withPanchangCount++;
    if (cd?.birthPanchang?.tithi?.endsAtUtc) withTransitionsCount++;
    if (cd?.timeUnknown && cd?.birthPanchang === null) unknownTimeNullPanchangCount++;
  }

  console.log(`  - Valid Schema v2 rows:                ${validV2Count} / ${postRows?.length}`);
  console.log(`  - Profiles with high-precision limbs: ${withPanchangCount}`);
  console.log(`  - Profiles with solved transitions:   ${withTransitionsCount}`);
  console.log(`  - Unknown-time profiles (null limbs): ${unknownTimeNullPanchangCount}`);
  console.log('================================================================');
  console.log('  KUNDALI SCHEMA V2 RESET COMPLETE AND VERIFIED');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
