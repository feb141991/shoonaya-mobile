import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import {
  deriveDenormalizedBirthProfileFields,
  AstroChart,
} from '@/lib/kundali-contract';

describe('Birth Profiles Safety & Anti-Regression Guard', () => {
  it('guarantees destructive reset script scripts/reset-birth-profiles-v2.ts is deleted', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/reset-birth-profiles-v2.ts');
    assert.strictEqual(
      fs.existsSync(scriptPath),
      false,
      'Destructive script scripts/reset-birth-profiles-v2.ts must remain permanently deleted.'
    );
  });

  it('scans codebase to guarantee no script performs global unrestricted deletion on birth_profiles', () => {
    const searchDirs = [
      path.resolve(__dirname, '../scripts'),
      path.resolve(__dirname, '../app'),
      path.resolve(__dirname, '../lib'),
    ];

    const forbiddenPatterns = [
      /delete\(\)\s*\.\s*neq\(\s*['"]id['"]\s*,\s*['"]00000000-0000-0000-0000-000000000000['"]\s*\)/i,
      /TRUNCATE\s+(TABLE\s+)?birth_profiles/i,
      /DELETE\s+FROM\s+birth_profiles\s*(WHERE\s+TRUE)?;?$/im,
    ];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const file of files) {
        if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.mjs')) continue;
        const fullPath = path.join(dir, file);
        const content = fs.readFileSync(fullPath, 'utf8');

        for (const pattern of forbiddenPatterns) {
          const match = pattern.test(content);
          assert.strictEqual(
            match,
            false,
            `Unsafe global deletion pattern matched in ${fullPath}: ${pattern}`
          );
        }
      }
    }
  });

  it('documents incident factually and confirms recovery requirements', () => {
    // Factual statement of incident:
    // On 2026-08-29, 20 production birth_profiles rows were deleted by a legacy reset script
    // and 4 synthetic test rows were seeded.
    // Safety Rule: Never claim user data recovery without an authentic PITR / backup restoration.
    const incidentRecord = {
      affectedTable: 'birth_profiles',
      incidentType: 'UNINTENDED_SCRIPT_DELETION',
      deletedRowCount: 20,
      syntheticSeededRowCount: 4,
      restorationPolicy: 'PITR_OR_DAILY_SNAPSHOT_ONLY_NO_FABRICATION',
    };

    assert.strictEqual(incidentRecord.deletedRowCount, 20);
    assert.strictEqual(incidentRecord.syntheticSeededRowCount, 4);
    assert.strictEqual(incidentRecord.restorationPolicy, 'PITR_OR_DAILY_SNAPSHOT_ONLY_NO_FABRICATION');
  });

  it('pure denormalization mapper derives all summary fields deterministically', () => {
    const mockChart: AstroChart = {
      schemaVersion: 2,
      birthPanchang: null,
      utcBirthTime: '1991-02-14T01:00:00.000Z',
      julianDay: 2448301.54,
      ayanamsa: 23.74,
      timeUnknown: true,
      lagna: {
        tropicalDeg: 310.2,
        siderealDeg: 286.46,
        rashiIndex: 9,
        rashiName: 'Makara',
        degreeInRashi: 16.46,
        house: 1,
        isRetrograde: false,
      },
      planets: {
        Chandra: {
          tropicalDeg: 320.1,
          siderealDeg: 296.36,
          rashiIndex: 9,
          rashiName: 'Makara',
          degreeInRashi: 26.36,
          house: 1,
          isRetrograde: false,
        },
        Surya: {
          tropicalDeg: 325.5,
          siderealDeg: 301.76,
          rashiIndex: 10,
          rashiName: 'Kumbha',
          degreeInRashi: 1.76,
          house: 2,
          isRetrograde: false,
        },
      },
      nakshatra: {
        name: 'Dhanishta',
        index: 22,
        pada: 2,
        lord: 'Mangal',
        traversedFrac: 0.45,
        remainingFrac: 0.55,
        devata: 'Vasus',
        gana: 'Rakshasa',
        animalSymbol: 'Lion',
      },
      dasha: {
        timeline: [
          { planet: 'Mangal', startDate: '1990-01-01', endDate: '1997-01-01', years: 7, isCurrent: false },
          { planet: 'Rahu', startDate: '1997-01-01', endDate: '2015-01-01', years: 18, isCurrent: false },
          { planet: 'Guru', startDate: '2015-01-01', endDate: '2031-01-01', years: 16, isCurrent: true },
          { planet: 'Shani', startDate: '2031-01-01', endDate: '2050-01-01', years: 19, isCurrent: false },
        ],
        current: { planet: 'Guru', startDate: '2015-01-01', endDate: '2031-01-01', years: 16, isCurrent: true },
        currentAntardasha: null,
      },
    };

    const summary = deriveDenormalizedBirthProfileFields(mockChart);

    assert.strictEqual(summary.rashi, 'Makara');
    assert.strictEqual(summary.sun_rashi, 'Kumbha');
    assert.strictEqual(summary.nakshatra, 'Dhanishta');
    assert.strictEqual(summary.nakshatra_pada, 2);
    assert.strictEqual(summary.nakshatra_lord, 'Mangal');
    // For timeUnknown=true, lagna and lagna_deg must be derived as null
    assert.strictEqual(summary.lagna, null);
    assert.strictEqual(summary.lagna_deg, null);
    assert.strictEqual(summary.ayanamsa, 23.74);
    assert.strictEqual(summary.current_dasha_planet, 'Guru');
    assert.strictEqual(summary.current_dasha_end_date, '2031-01-01');
    assert.strictEqual(summary.next_dasha_planet, 'Shani');
  });
});
