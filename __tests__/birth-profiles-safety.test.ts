import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

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
    const backendRoot = path.resolve(__dirname, '../../Sanatan Sangam/Shoonaya');
    const searchDirs = [
      path.resolve(__dirname, '../scripts'),
      path.resolve(__dirname, '../app'),
      path.resolve(__dirname, '../lib'),
      path.join(backendRoot, 'scripts'),
      path.join(backendRoot, 'src'),
      path.join(backendRoot, 'supabase'),
    ];

    const forbiddenPatterns = [
      /delete\(\)\s*\.\s*neq\(\s*['"]id['"]\s*,\s*['"]00000000-0000-0000-0000-000000000000['"]\s*\)/i,
      /TRUNCATE\s+(TABLE\s+)?birth_profiles/i,
      /DELETE\s+FROM\s+(?:public\.)?birth_profiles\s*(?:WHERE\s+TRUE)?;?$/im,
      /from\(\s*['"]birth_profiles['"]\s*\)\s*\.\s*delete\(\)\s*\.\s*(?:neq\(\s*['"]id['"]|not\()/is,
    ];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const file of files) {
        if (!/\.(?:ts|tsx|js|mjs|cjs|sql|sh)$/.test(file)) continue;
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

  it('keeps a durable incident record with a non-executable recovery policy', () => {
    const incidentPath = path.resolve(__dirname, '../docs/KUNDALI_DATA_INCIDENT_2026-08-29.md');
    const incident = fs.readFileSync(incidentPath, 'utf8');
    assert.match(incident, /deleted 20 existing rows/);
    assert.match(incident, /four deterministic synthetic rows/);
    assert.match(incident, /Do not execute direct deletion or quarantine SQL/);
  });
});
