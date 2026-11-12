import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { buildSanskaraPayload, guardSanskaraRead, type SanskaraExport, type SanskaraRecord } from '../lib/sanskaraContract';
import {
  DOWNLOAD_NOTE,
  OWN_TIMELINE_NAME,
  confirmLabel,
  dataSubjects,
  deleteCall,
  deleteHeading,
  deleteWarning,
  deletedMessage,
  exportFileBody,
  exportFileName,
  milestoneCount,
  roleLabel,
  type DataSubject,
} from '../lib/sanskaraData';
import {
  EXPORT_DIALOG_TITLE,
  EXPORT_MIME_TYPE,
  EXPORT_UTI,
  SharingUnavailableError,
  shareSanskaraExportWith,
  type ExportFileDeps,
} from '../lib/sanskaraExportShare';

const ROOT = join(__dirname, '..');
const source = (path: string) => readFileSync(join(ROOT, path), 'utf8');

const ME = '11111111-1111-4111-8111-111111111111';
const KID = '22222222-2222-4222-8222-222222222222';
const KID_2 = '33333333-3333-4333-8333-333333333333';
const ADULT = '44444444-4444-4444-8444-444444444444';
const RECORD = '55555555-5555-4555-8555-555555555555';
const GENERATED = '2026-11-05T10:00:00.123456+00:00';

const record = (over: Partial<SanskaraRecord> = {}): SanskaraRecord => ({
  id: RECORD, rite_key: 'custom', custom_title: 'Annaprashana', sensitivity: 'A', planned_date: '2027-01-01', completed_date: null, version: 1,
  private: { notes: 'a private note', location: 'home', performed_by: null, expected_due_date: null, version: 1 },
  ...over,
});
type Subject = SanskaraExport['subjects'][number];
const subject = (over: Partial<Subject> & Pick<Subject, 'id' | 'kind' | 'role'>): Subject => ({
  display_name: null, birth_date: null, records: [], grants: [], ...over,
});
const exportOf = (subjects: Subject[]): SanskaraExport => ({ generated_at: GENERATED, subjects });
const mine = subject({ id: ME, kind: 'account', role: 'owner', records: [record(), record(), record()] });
const kid = subject({ id: KID, kind: 'dependent', role: 'manager', display_name: 'Aarav', birth_date: '2020-03-04', records: [record()] });
const grown = subject({ id: ADULT, kind: 'dependent', role: 'former_manager', display_name: 'Meera', birth_date: '2008-01-01', records: [record(), record()] });

// ── The fixtures are what the server really sends ──────────────────────────────────────────────────────────────────────

test('the fixtures pass the real export contract, so the tests below are about real shapes', () => {
  assert.equal(guardSanskaraRead('export', exportOf([mine, kid, grown])), true);
  assert.equal(guardSanskaraRead('export', exportOf([])), true, 'a person with no timelines');
});

test('export contract: a malformed or widened export is refused before anything is shown or written', () => {
  const ok = exportOf([mine]);
  assert.equal(guardSanskaraRead('export', { ...ok, extra: 1 }), false, 'an unknown top-level key');
  assert.equal(guardSanskaraRead('export', { generated_at: GENERATED }), false, 'no subjects');
  assert.equal(guardSanskaraRead('export', { ...ok, generated_at: 'yesterday' }), false, 'a timestamp that is not one');
  assert.equal(guardSanskaraRead('export', exportOf([{ ...mine, role: 'viewer' as never }])), false, 'a role the export never sends');
  assert.equal(guardSanskaraRead('export', exportOf([{ ...mine, id: 'not-a-uuid' }])), false);
  assert.equal(guardSanskaraRead('export', exportOf([{ ...mine, password: 'x' } as never])), false, 'an extra subject field');
  assert.equal(guardSanskaraRead('export', exportOf([{ ...mine, records: [{ ...record(), extra: 1 } as never] }])), false);
  assert.equal(guardSanskaraRead('export', null), false);
  assert.equal(guardSanskaraRead('export', []), false);
  assert.equal(guardSanskaraRead('export', ''), false);
});

// ── What the sheet lists ───────────────────────────────────────────────────────────────────────────────────────────────

test('subjects: own timeline first, then children by name, with the right rows deletable', () => {
  const rows = dataSubjects(exportOf([grown, kid, mine]));
  assert.deepEqual(rows.map((r) => r.name), [OWN_TIMELINE_NAME, 'Aarav', 'Meera']);
  assert.deepEqual(rows.map((r) => r.deletable), [true, true, false]);
  assert.deepEqual(rows.map((r) => r.milestones), [3, 1, 2]);
  assert.deepEqual(rows.map((r) => r.id), [ME, KID, ADULT]);
});

test('subjects: only the person and a current manager may delete; a former manager may not', () => {
  const row = (role: Subject['role'], kind: Subject['kind'] = 'dependent') =>
    dataSubjects(exportOf([subject({ id: KID, kind, role, display_name: 'Aarav' })]))[0];
  assert.equal(row('owner', 'account').deletable, true);
  assert.equal(row('manager').deletable, true);
  assert.equal(row('former_manager').deletable, false);
});

test('subjects: the order is stable for equal names and a blank name never reaches the screen empty', () => {
  const a = subject({ id: KID, kind: 'dependent', role: 'manager', display_name: 'Ira' });
  const b = subject({ id: KID_2, kind: 'dependent', role: 'manager', display_name: 'Ira' });
  assert.deepEqual(dataSubjects(exportOf([a, b])).map((r) => r.id), [KID, KID_2]);
  assert.deepEqual(dataSubjects(exportOf([b, a])).map((r) => r.id), [KID_2, KID]);
  assert.equal(dataSubjects(exportOf([subject({ id: KID, kind: 'dependent', role: 'manager', display_name: '   ' })]))[0].name, 'Child');
  assert.equal(dataSubjects(exportOf([subject({ id: KID, kind: 'dependent', role: 'manager', display_name: null })]))[0].name, 'Child');
  assert.equal(dataSubjects(exportOf([subject({ id: KID, kind: 'dependent', role: 'manager', display_name: '  Aarav ' })]))[0].name, 'Aarav');
});

test('subjects: an empty export lists nothing', () => {
  assert.deepEqual(dataSubjects(exportOf([])), []);
});

test('the person\'s own timeline is never named after anyone, even if the server sent a name', () => {
  const rows = dataSubjects(exportOf([subject({ id: ME, kind: 'account', role: 'owner', display_name: 'Someone Else' })]));
  assert.equal(rows[0].name, OWN_TIMELINE_NAME);
});

test('milestone counts read naturally', () => {
  assert.equal(milestoneCount(0), '0 milestones');
  assert.equal(milestoneCount(1), '1 milestone');
  assert.equal(milestoneCount(2), '2 milestones');
});

test('a former manager is told it is read-only and why it ends', () => {
  const [row] = dataSubjects(exportOf([grown]));
  assert.match(roleLabel(row), /Read-only/);
  assert.match(roleLabel(row), /12 months/);
  assert.equal(roleLabel(dataSubjects(exportOf([mine]))[0]), 'Yours');
  assert.equal(roleLabel(dataSubjects(exportOf([kid]))[0]), 'You manage this');
});

// ── The file ───────────────────────────────────────────────────────────────────────────────────────────────────────────

test('file name: the date from the export, never a name', () => {
  assert.equal(exportFileName(GENERATED), 'shoonaya-sanskara-2026-11-05.json');
  assert.equal(exportFileName('2026-12-31T23:59:59Z'), 'shoonaya-sanskara-2026-12-31.json');
  for (const bad of ['', 'yesterday', '20261105', '2026-11-05', '../../etc/passwd', 'Aarav']) {
    assert.equal(exportFileName(bad), 'shoonaya-sanskara-export.json', `"${bad}" must not become part of a file name`);
  }
  const name = exportFileName(GENERATED);
  assert.doesNotMatch(name, /Aarav|Meera|\.\.|\//);
});

test('file body: exactly what the server sent, nothing added, nothing dropped', () => {
  const exp = exportOf([mine, kid, grown]);
  const body = exportFileBody(exp);
  assert.deepEqual(JSON.parse(body), exp);
  assert.equal(guardSanskaraRead('export', JSON.parse(body)), true, 'the file is itself a valid export');
  assert.match(body, /a private note/, 'the notes are in the copy: it is the person\'s own data');
});

// ── Delete ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

const rowFor = (s: Subject): DataSubject => dataSubjects(exportOf([s]))[0];

test('delete call: the person\'s own timeline uses delete-mine, a child uses delete-dependent with that child\'s id', () => {
  assert.deepEqual(deleteCall(rowFor(mine)), { action: 'delete-mine', input: {} });
  assert.deepEqual(deleteCall(rowFor(kid)), { action: 'delete-dependent', input: { subjectId: KID } });
});

test('delete call: a former manager has no delete call at all', () => {
  assert.equal(deleteCall(rowFor(grown)), null);
  assert.equal(deleteCall({ ...rowFor(kid), deletable: false }), null);
});

test('delete call: what is built passes the same payload builder every write goes through', () => {
  const request = '66666666-6666-4666-8666-666666666666';
  const child = deleteCall(rowFor(kid));
  assert.ok(child && child.action === 'delete-dependent');
  assert.deepEqual(buildSanskaraPayload('delete-dependent', child.input, request), { requestId: request, subjectId: KID });
  const own = deleteCall(rowFor(mine));
  assert.ok(own && own.action === 'delete-mine');
  assert.deepEqual(buildSanskaraPayload('delete-mine', own.input, request), { requestId: request });
  assert.throws(() => buildSanskaraPayload('delete-dependent', { subjectId: 'Aarav' }, request), /SanskaraError/, 'a name is not an id');
  assert.throws(() => buildSanskaraPayload('delete-dependent', { subjectId: KID } as never, 'not-a-uuid'), /SanskaraError/);
  assert.throws(() => buildSanskaraPayload('delete-mine', { subjectId: KID } as never, request), /SanskaraError/, 'delete-mine takes no subject');
});

test('delete warning for a child: names who loses it, says it is for every manager and cannot be undone', () => {
  const text = deleteWarning(rowFor(kid)).join(' ');
  assert.match(text, /Aarav's/);
  assert.match(text, /1 milestone\b/);
  assert.match(text, /every manager/);
  assert.match(text, /cannot be undone/);
  assert.match(text, /Download a copy first/);
  assert.match(text, /shared/i);
  assert.equal(deleteHeading(rowFor(kid)), "Delete Aarav's timeline?");
});

test('delete warning for the person\'s own timeline: counts the milestones, says it cannot be undone', () => {
  const text = deleteWarning(rowFor(mine)).join(' ');
  assert.match(text, /3 milestones/);
  assert.match(text, /cannot be undone/);
  assert.match(text, /Download a copy first/);
  assert.doesNotMatch(text, /every manager/, 'the person\'s own timeline has no other managers');
  assert.equal(deleteHeading(rowFor(mine)), 'Delete my timeline?');
});

test('delete confirmation labels are spoken in full', () => {
  assert.equal(confirmLabel(rowFor(kid), false), "Delete Aarav's timeline forever");
  assert.equal(confirmLabel(rowFor(kid), true), "Try again: delete Aarav's timeline forever");
  assert.equal(confirmLabel(rowFor(mine), false), 'Delete my timeline forever');
  assert.equal(deletedMessage(rowFor(kid)), "Aarav's timeline was deleted.");
  assert.equal(deletedMessage(rowFor(mine)), 'Your timeline was deleted.');
});

test('download note tells the person the file is not encrypted', () => {
  assert.match(DOWNLOAD_NOTE, /not encrypted/);
  assert.match(DOWNLOAD_NOTE, /notes/);
});

// ── Sharing the file ───────────────────────────────────────────────────────────────────────────────────────────────────

function deps(over: Partial<ExportFileDeps> = {}) {
  const calls: string[] = [];
  const seen: { name?: string; body?: string; uri?: string; options?: unknown } = {};
  const base: ExportFileDeps = {
    isSharingAvailable: async () => { calls.push('available'); return true; },
    removeFiles: () => { calls.push('remove'); },
    writeFile: (name, body) => { calls.push('write'); seen.name = name; seen.body = body; return 'file:///cache/sanskara-export/' + name; },
    share: async (uri, options) => { calls.push('share'); seen.uri = uri; seen.options = options; },
  };
  return { calls, seen, deps: { ...base, ...over } as ExportFileDeps };
}

test('sharing: checks that sharing exists, clears older copies, writes, then shares, in that order', async () => {
  const { calls, seen, deps: d } = deps();
  const exp = exportOf([mine, kid]);
  await shareSanskaraExportWith(d, exp);
  assert.deepEqual(calls, ['available', 'remove', 'write', 'share']);
  assert.equal(seen.name, 'shoonaya-sanskara-2026-11-05.json');
  assert.equal(seen.body, exportFileBody(exp));
  assert.equal(seen.uri, 'file:///cache/sanskara-export/shoonaya-sanskara-2026-11-05.json');
  assert.deepEqual(seen.options, { mimeType: EXPORT_MIME_TYPE, UTI: EXPORT_UTI, dialogTitle: EXPORT_DIALOG_TITLE });
  assert.equal(EXPORT_MIME_TYPE, 'application/json');
});

test('sharing: when sharing does not exist nothing is written to the disk', async () => {
  const { calls, deps: d } = deps({ isSharingAvailable: async () => { calls.push('available'); return false; } });
  await assert.rejects(() => shareSanskaraExportWith(d, exportOf([mine])), SharingUnavailableError);
  assert.deepEqual(calls, ['available'], 'no remove, no write, no share');
});

test('sharing: if the share fails the file is removed again and the share error is the one raised', async () => {
  const boom = new Error('share sheet failed');
  const { calls, deps: d } = deps({ share: async () => { calls.push('share'); throw boom; } });
  await assert.rejects(() => shareSanskaraExportWith(d, exportOf([mine])), (e) => e === boom);
  assert.deepEqual(calls, ['available', 'remove', 'write', 'share', 'remove']);
});

test('sharing: a failing cleanup never hides the share error', async () => {
  const boom = new Error('share sheet failed');
  let removals = 0;
  const { deps: d } = deps({
    share: async () => { throw boom; },
    removeFiles: () => { removals += 1; if (removals > 1) throw new Error('disk busy'); },
  });
  await assert.rejects(() => shareSanskaraExportWith(d, exportOf([mine])), (e) => e === boom);
});

test('sharing: after a successful share the file is left in place (the receiving app may read it later)', async () => {
  const { calls, deps: d } = deps();
  await shareSanskaraExportWith(d, exportOf([mine]));
  assert.equal(calls.at(-1), 'share', 'nothing removes the file after the share sheet resolves');
  assert.equal(calls.filter((c) => c === 'remove').length, 1, 'only the clean-up before writing');
});

test('sharing: if the file cannot be written the share sheet is never opened', async () => {
  const { calls, deps: d } = deps({ writeFile: () => { calls.push('write'); throw new Error('disk full'); } });
  await assert.rejects(() => shareSanskaraExportWith(d, exportOf([mine])), /disk full/);
  assert.equal(calls.includes('share'), false);
});

// ── The data layer ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('fetchSanskaraExport asks the export route for this identity, checks the shape, and keeps nothing', () => {
  const lib = source('lib/sanskara.ts');
  const fn = /export async function fetchSanskaraExport[\s\S]*?\n}\n/.exec(lib)?.[0] ?? '';
  assert.match(fn, /apiFetch\('\/api\/native\/sanskara\/export', \{ expectedUserId: userId \}\)/);
  assert.match(fn, /handleReadResponse\('export', response, userId\)/, 'the response goes through the contract guard');
  assert.doesNotMatch(fn, /overviewCache|AsyncStorage|setItem/, 'the export is private notes: never cached, never stored');
});

test('the purge loads the file module only when it runs, so the root layout never loads it at startup', () => {
  const lib = source('lib/sanskara.ts');
  assert.match(lib, /import\('\.\/sanskaraExportDevice'\)/);
  assert.doesNotMatch(lib, /^import .*sanskaraExportDevice/m);
  assert.doesNotMatch(source('app/_layout.tsx'), /sanskaraExportDevice/);
});

// ── The device half ────────────────────────────────────────────────────────────────────────────────────────────────────

test('device file module: one cache directory, removed whole, nothing in the documents directory', () => {
  const device = source('lib/sanskaraExportDevice.ts');
  assert.match(device, /new FileSystem\.Directory\(FileSystem\.Paths\.cache, EXPORT_DIRECTORY\)/);
  assert.doesNotMatch(device, /Paths\.document|Paths\.bundle/);
  const remove = /export function removeSanskaraExportFiles[\s\S]*?\n}\n/.exec(device)?.[0] ?? '';
  assert.match(remove, /directory\.delete\(\)/, 'removing the directory removes every copy');
  assert.match(remove, /directory\.exists/);
  assert.doesNotMatch(device, /AsyncStorage/);
});

test('device file module adds no native module: both modules are already reached by Settings', () => {
  const device = source('lib/sanskaraExportDevice.ts');
  const settings = source('app/settings/detail-screen.tsx');
  // Settings ("Download your data") shipped with expo-file-system and expo-sharing. Since the private-export helper it reaches
  // both through lib/privateExportFilesDevice.ts, which imports exactly the same two modules (private-export-files.test.ts).
  assert.match(device, /from 'expo-file-system'/);
  assert.match(device, /from 'expo-sharing'/);
  assert.match(settings, /from '@\/lib\/privateExportFilesDevice'/);
  const privateDevice = source('lib/privateExportFilesDevice.ts');
  assert.match(privateDevice, /from 'expo-file-system'/);
  assert.match(privateDevice, /from 'expo-sharing'/);
});

// ── The sheet and where it is mounted ──────────────────────────────────────────────────────────────────────────────────

const sheet = () => source('components/sanskara/SanskaraDataSheet.tsx');
const screen = () => source('app/kul/sanskara.tsx');

test('sheet: lists from the export, not the overview, so it works after consent is withdrawn', () => {
  const s = sheet();
  assert.match(s, /fetchSanskaraExport\(uid\)/);
  assert.doesNotMatch(s, /fetchSanskaraOverview|SanskaraConsentRequiredError|consentRequired/);
});

test('sheet: private data is dropped when it closes or the identity changes, and late responses are discarded', () => {
  const s = sheet();
  const effect = /useEffect\(\(\) => \{[\s\S]*?\}, \[visible, userId, load\]\);/.exec(s)?.[0] ?? '';
  assert.match(effect, /leaseRef\.current \+= 1;/);
  assert.match(effect, /setData\(null\)/);
  assert.match(effect, /setConfirming\(null\)/);
  assert.match(effect, /requestIdRef\.current = null/);
  assert.match(effect, /return \(\) => \{\s*leaseRef\.current \+= 1;/, 'a pending response is invalidated on cleanup too');
  assert.ok((s.match(/lease !== leaseRef\.current/g) ?? []).length >= 5, 'every async step checks that it is still current');
});

test('sheet: never writes the export to storage or the file system itself', () => {
  const s = sheet();
  assert.doesNotMatch(s, /AsyncStorage|SecureStore|expo-file-system|FileSystem|writeFile|setItem/);
  assert.match(s, /shareSanskaraExport\(data\)/);
});

test('sheet: a retry of a failed delete reuses the same request id, and a new confirmation makes a new one', () => {
  const s = sheet();
  assert.match(s, /executeSanskaraWrite\(userId, 'delete-mine', call\.input, requestId\)/);
  assert.match(s, /executeSanskaraWrite\(userId, 'delete-dependent', call\.input, requestId\)/);
  assert.match(s, /const requestId = requestIdRef\.current \?\? generateSanskaraUuid\(\);/);
  const start = /const startDelete = useCallback[\s\S]*?\}, \[\]\);/.exec(s)?.[0] ?? '';
  assert.match(start, /requestIdRef\.current = generateSanskaraUuid\(\)/);
  const cancel = /const cancelDelete = useCallback[\s\S]*?\}, \[\]\);/.exec(s)?.[0] ?? '';
  assert.match(cancel, /requestIdRef\.current = null/);
});

test('sheet: after a delete the older downloaded copy is removed and the screen is told', () => {
  const s = sheet();
  const ok = /if \(lease !== leaseRef\.current\) return;\s*\/\/ A copy downloaded earlier[\s\S]*?onChanged\(target\.id\);/.exec(s)?.[0] ?? '';
  assert.match(ok, /purgeSanskaraExportFiles\(\)/);
  assert.match(ok, /previous\.subjects\.filter\(\(s\) => s\.id !== target\.id\)/);
});

test('sheet: a 404 on delete means the list is stale, not that deleting failed; it reloads instead of looping', () => {
  const s = sheet();
  assert.match(s, /error instanceof ApiRequestError && error\.status === 404/);
  assert.match(s, /onChanged\(null\);\s*void load\(userId, lease\);/);
});

test('sheet: every failure a person sees goes through describeSanskaraFailure, never the error text', () => {
  const s = sheet();
  assert.equal((s.match(/describeSanskaraFailure\(/g) ?? []).length, 3, 'load, download and delete');
  assert.doesNotMatch(s, /\.message\b|\.status\b(?!\s*===\s*404)/);
});

test('sheet: the buttons that act are at least 44 points, the sheet reserves the bottom inset, and rows wrap safely', () => {
  const s = sheet();
  assert.match(s, /useSafeAreaInsets\(\)/);
  assert.match(s, /Math\.max\(insets\.bottom, SPACING\.lg\)/);
  assert.match(s, /width: MIN_TOUCH_TARGET,\s*height: MIN_TOUCH_TARGET/, 'the close button');
  assert.match(s, /PressableSurface/, 'every other action uses the 44-point surface');
  assert.match(s, /<View style=\{styles\.fill\}>[\s\S]{0,200}\{subject\.name\}/, 'the name column in a row is flex: 1 (AGENTS 17)');
  assert.match(s, /flexWrap: 'wrap'/, 'the two confirmation buttons wrap under large text');
  assert.match(s, /fill: \{\s*flex: 1,\s*\}/, 'styles.fill really is flex: 1');
});

test('sheet: colours come from tokens, not literals', () => {
  const s = sheet();
  assert.doesNotMatch(s, /#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  assert.match(s, /COLORS\.bottomSheetScrim/);
});

test('screen: the sheet is mounted outside every state branch, so it opens while loading, on error and without consent', () => {
  const s = screen();
  const mount = s.indexOf('<SanskaraDataSheet');
  assert.ok(mount > 0);
  const handover = s.indexOf('<SanskaraHandoverModal');
  assert.ok(mount < handover, 'mounted beside the other sheets');
  const consentBranch = s.indexOf(') : consentRequired ? (');
  const sharedBranch = s.indexOf(") : activeSubject.kind === 'shared' ? (");
  assert.ok(consentBranch > 0 && sharedBranch > consentBranch);
  assert.ok(mount > s.indexOf('{/* Milestone Details & Actions Sheet */}'), 'after the whole loading / consent / error / content chain, not inside it');
  assert.match(s, /onPress=\{\(\) => setShowData\(true\)\}[\s\S]{0,200}accessibilityLabel="Your Sanskāra data: download a copy or delete"/, 'a top-bar button, present in every state');
  assert.match(s, /Download or delete my data/, 'the consent card offers it too');
});

test('screen: the sheet closes when the identity changes, and a deleted tab is left', () => {
  const s = screen();
  const adopt = /const adopt = \(id: string \| null\) => \{[\s\S]*?\n    \};/.exec(s)?.[0] ?? '';
  assert.match(adopt, /setShowData\(false\)/);
  const changed = /const handleDataChanged = useCallback\([\s\S]*?\n  \);/.exec(s)?.[0] ?? '';
  assert.match(changed, /setActiveTab\(\(tab\) => \(tab === deletedId \? 'me' : tab\)\)/);
  assert.match(changed, /loadData\(currentUserId, true\)/);
});

test('layout: a downloaded copy is removed at sign-out and on an account switch', () => {
  const layout = source('app/_layout.tsx');
  assert.match(layout, /import \{ clearSanskaraCache, purgeSanskaraExportFiles \} from '@\/lib\/sanskara';/);
  const signedOut = /if \(event === 'SIGNED_OUT'\) \{[\s\S]*?\n      \}/.exec(layout)?.[0] ?? '';
  assert.match(signedOut, /purgeSanskaraExportFiles\(\)/);
  // Anchored on the account-switch condition itself, not on a character window after another call: a window breaks whenever a
  // neighbouring purge adds a line (it matched a different block when the private-export purge was added, 2026-11-06).
  const switchBlock = /if \(previousRouteKey && previousRouteKey !== session\.user\.id\) \{[\s\S]*?\n      \}/.exec(layout)?.[0] ?? '';
  assert.match(switchBlock, /clearAllUserScopedStorage\(\)/, 'the block found is the account switch');
  assert.match(switchBlock, /purgeSanskaraExportFiles\(\)/);
});
