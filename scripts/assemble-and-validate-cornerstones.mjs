import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { HEROES_1_TO_4 } from './data/cornerstone-1-to-4.mjs';
import { HEROES_5_TO_8 } from './data/cornerstone-5-to-8.mjs';
import { HEROES_9_TO_12 } from './data/cornerstone-9-to-12.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALL_12_HEROES = [
  ...HEROES_1_TO_4,
  ...HEROES_5_TO_8,
  ...HEROES_9_TO_12,
];

console.log(`\n======================================================`);
console.log(`DHARM VEER CORNERSTONE HEROES: CANONICAL 500+ WORD AUDIT`);
console.log(`======================================================\n`);

let passedCount = 0;
const results = [];

for (const hero of ALL_12_HEROES) {
  const englishText = [
    hero.journey,
    hero.trial,
    hero.teaching,
    hero.moral,
    hero.legacy || ''
  ].join(' ').trim();
  
  const wordCount = englishText.split(/\s+/).filter(Boolean).length;
  const hasLocal = Boolean(
    hero.nameLocal &&
    hero.journeyLocal &&
    hero.trialLocal &&
    hero.teachingLocal &&
    hero.moralLocal &&
    hero.legacyLocal &&
    hero.sourceLocal &&
    hero.quoteLocal
  );
  
  const isSikh = hero.tradition === 'sikh';
  const hasPa = !isSikh || Boolean(
    hero.namePa &&
    hero.journeyPa &&
    hero.trialPa &&
    hero.teachingPa &&
    hero.moralPa &&
    hero.legacyPa &&
    hero.sourcePa &&
    hero.quotePa
  );

  const citationCount = Array.isArray(hero.sourceCitations) ? hero.sourceCitations.length : 0;
  const isWordCountPass = wordCount >= 500;
  const isPass = isWordCountPass && hasLocal && hasPa && citationCount >= 2;

  if (isPass) passedCount++;

  results.push({
    id: hero.id,
    name: hero.name,
    tradition: hero.tradition,
    wordCount,
    isWordCountPass,
    hasLocal,
    hasPa,
    citationCount,
    status: isPass ? 'PASS' : 'FAIL',
  });
}

console.table(results);
console.log(`Audit Result: ${passedCount} / ${ALL_12_HEROES.length} passed all criteria.`);

if (passedCount !== ALL_12_HEROES.length) {
  console.error("FAILED: Some heroes did not meet the criteria.");
  process.exit(1);
}

// Write the updated DHARM_VEERS into shoonaya-mobile/lib/dharm-veer.ts
const targetFile = path.resolve(__dirname, '../lib/dharm-veer.ts');
let content = fs.readFileSync(targetFile, 'utf8');

// Replace export const DHARM_VEERS: DharmVeer[] = [ ... ];
const startIndex = content.indexOf('export const DHARM_VEERS: DharmVeer[] = [');
if (startIndex === -1) {
  console.error('Could not find DHARM_VEERS start index in dharm-veer.ts');
  process.exit(1);
}

const endIndex = content.indexOf('// ── Tradition Metadata ─────────────────────────────────────────────────────');
if (endIndex === -1) {
  console.error('Could not find Tradition Metadata end index in dharm-veer.ts');
  process.exit(1);
}

const newDharmVeersBlock = `export const DHARM_VEERS: DharmVeer[] = ${JSON.stringify(ALL_12_HEROES, null, 2)};\n\n`;
const updatedFileContent = content.slice(0, startIndex) + newDharmVeersBlock + content.slice(endIndex);

fs.writeFileSync(targetFile, updatedFileContent, 'utf8');
console.log(`\nSuccessfully injected all 12 expanded heroes into: ${targetFile}`);
