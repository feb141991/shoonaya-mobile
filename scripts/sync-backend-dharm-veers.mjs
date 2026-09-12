import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { HEROES_1_TO_4 } from './data/cornerstone-1-to-4.mjs';
import { HEROES_5_TO_8 } from './data/cornerstone-5-to-8.mjs';
import { HEROES_9_TO_12 } from './data/cornerstone-9-to-12.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALL_12 = [...HEROES_1_TO_4, ...HEROES_5_TO_8, ...HEROES_9_TO_12];
const backendDir = '/Users/Business(C)/Sanatan Sangam/Shoonaya';

if (!fs.existsSync(backendDir)) {
  console.log('Backend directory not found:', backendDir);
  process.exit(0);
}

// 1. Update scripts/dharm-veer-english-export.json in backend if it exists
const exportJsonPath = path.join(backendDir, 'scripts/dharm-veer-english-export.json');
if (fs.existsSync(exportJsonPath)) {
  const exportData = JSON.parse(fs.readFileSync(exportJsonPath, 'utf8'));
  let updatedCount = 0;

  // Map mobile IDs to potential backend export IDs
  const idAliases = {
    'guru-nanak': 'guru-nanak-dev',
    'guru-teg-bahadur': 'guru-tegh-bahadur',
    'mahavira-trials': 'lord-mahavira',
    'buddha': 'siddhartha-gautama',
    'vivekananda': 'swami-vivekananda',
  };

  for (const hero of ALL_12) {
    const targetSlugs = [hero.id, idAliases[hero.id]].filter(Boolean);
    const item = exportData.find(d => targetSlugs.includes(d.slug));
    if (item) {
      item.journey = hero.journey;
      item.trial = hero.trial;
      item.teaching = hero.teaching;
      item.moral = hero.moral;
      item.legacy = hero.legacy;
      item.tagline = hero.tagline;
      item.source = hero.source;
      item.sourceCitations = hero.sourceCitations;
      if (hero.journeyLocal) item.journey_local = hero.journeyLocal;
      if (hero.trialLocal) item.trial_local = hero.trialLocal;
      if (hero.teachingLocal) item.teaching_local = hero.teachingLocal;
      if (hero.moralLocal) item.moral_local = hero.moralLocal;
      if (hero.legacyLocal) item.legacy_local = hero.legacyLocal;
      if (hero.taglineLocal) item.tagline_local = hero.taglineLocal;
      if (hero.journeyPa) item.journey_pa = hero.journeyPa;
      if (hero.trialPa) item.trial_pa = hero.trialPa;
      if (hero.teachingPa) item.teaching_pa = hero.teachingPa;
      if (hero.moralPa) item.moral_pa = hero.moralPa;
      if (hero.legacyPa) item.legacy_pa = hero.legacyPa;
      if (hero.taglinePa) item.tagline_pa = hero.taglinePa;
      if (hero.namePa) item.name_pa = hero.namePa;
      updatedCount++;
    }
  }

  fs.writeFileSync(exportJsonPath, JSON.stringify(exportData, null, 2), 'utf8');
  console.log(`Updated ${updatedCount} heroes in backend dharm-veer-english-export.json`);
}

// 2. Update DharmVeer interface in backend src/lib/dharm-veer.ts to support citations & legacy
const backendDharmVeerTs = path.join(backendDir, 'src/lib/dharm-veer.ts');
if (fs.existsSync(backendDharmVeerTs)) {
  let code = fs.readFileSync(backendDharmVeerTs, 'utf8');
  if (!code.includes('sourceCitations?:')) {
    code = code.replace(
      'source?: string;',
      `legacy?: string;\n  legacyLocal?: string;\n  legacyPa?: string;\n  source?: string;\n  sourceLocal?: string;\n  sourcePa?: string;\n  sourceCitations?: Array<{\n    sourceName: string;\n    sourceRef?: string;\n    tier?: number;\n  }>;`
    );
    fs.writeFileSync(backendDharmVeerTs, code, 'utf8');
    console.log('Updated backend src/lib/dharm-veer.ts interface');
  }
}

console.log('Backend synchronization complete.');
