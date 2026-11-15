export interface StandardRole {
  label: string;
  hindi: string;
  role: string;
  defaultGen: number;
}

export const STANDARD_ROLES: StandardRole[] = [
  { label: 'Father', hindi: 'पिता / जनक', role: 'पिता (Father)', defaultGen: 2 },
  { label: 'Mother', hindi: 'माता / जननी', role: 'माता (Mother)', defaultGen: 2 },
  { label: 'Paternal Grandfather', hindi: 'पितामह / दादाजी', role: 'पितामह (Pitamaha)', defaultGen: 1 },
  { label: 'Paternal Grandmother', hindi: 'पितामही / दादीजी', role: 'पितामही (Pitamahi)', defaultGen: 1 },
  { label: 'Maternal Grandfather', hindi: 'मातामह / नानाजी', role: 'मातामह (Matamaha)', defaultGen: 1 },
  { label: 'Maternal Grandmother', hindi: 'मातामही / नानीजी', role: 'मातामही (Matamahi)', defaultGen: 1 },
  { label: 'Spouse', hindi: 'धर्मपत्नी / पति', role: 'धर्मपत्नी (Spouse)', defaultGen: 3 },
  { label: 'Son', hindi: 'पुत्र / बेटा', role: 'पुत्र (Son)', defaultGen: 4 },
  { label: 'Daughter', hindi: 'पुत्री / बेटी', role: 'पुत्री (Daughter)', defaultGen: 4 },
  { label: 'Elder Brother', hindi: 'अग्रज / बड़े भाई', role: 'अग्रज (Brother)', defaultGen: 3 },
  { label: 'Younger Brother', hindi: 'अनुज / छोटे भाई', role: 'अनुज (Brother)', defaultGen: 3 },
  { label: 'Sister', hindi: 'भगिनी / बहन', role: 'भगिनी (Sister)', defaultGen: 3 },
  { label: 'Paternal Uncle (Elder)', hindi: 'तात / ताऊजी', role: 'तात / ताऊजी (Tauji)', defaultGen: 2 },
  { label: 'Paternal Uncle (Younger)', hindi: 'चाचाजी', role: 'चाचाजी (Chachaji)', defaultGen: 2 },
  { label: 'Maternal Uncle', hindi: 'मातुल / मामाजी', role: 'मामाजी (Mamaji)', defaultGen: 2 },
  { label: 'Maternal Aunt', hindi: 'मौसीजी', role: 'मौसीजी (Masiji)', defaultGen: 2 },
  { label: 'Paternal Aunt', hindi: 'बुआजी', role: 'बुआजी (Buaji)', defaultGen: 2 },
  { label: 'Cousin', hindi: 'चचेरा / ममेरा भाई-बहन', role: 'मातुल-पुत्र (Cousin)', defaultGen: 3 },
  { label: 'Self / Living Seeker', hindi: 'आत्मज / स्वयं', role: 'आत्मज (Self)', defaultGen: 3 },
  { label: 'Other / Custom', hindi: 'अन्य संबंध', role: '', defaultGen: 3 },
];

