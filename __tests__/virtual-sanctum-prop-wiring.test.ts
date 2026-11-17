import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { callSites, findWiringProblems, loadComponents, mutateCallSite } from './helpers/prop-wiring';

// Guard for the temple sanctum modal after its split (AGENTS.md section 32).
//
// VirtualSanctumModal.tsx keeps the state and handlers and hands them to four
// components (VirtualSanctumStage, VirtualSanctumActions, VirtualSanctumTabBar,
// VirtualSanctumTabContent), 34 props in all (each gets the tradition's `profile`). Several are the same type and
// close in meaning: handleLightDiya, handleRingBell, handleOfferFlower and
// handleParikrama are all `() => void`; flowersCount, bellRungCount and
// parikramaCount are all numbers. The compiler cannot see them swapped, and a
// swap compiles, renders and passes every other test (the ritual buttons would
// simply do each other's job).
//
// The rule and the checker are in helpers/prop-wiring.ts: at every
// <VirtualSanctum... /> call site a prop is passed as name={name}, and the props
// passed are exactly the props the component declares. This file applies it to
// the real modal and proves it bites. It reads every VirtualSanctum*.tsx in
// components/tirtha except the modal itself, so a fifth component is checked as
// soon as it exists; finding the four known ones is asserted first so a loader
// that finds nothing cannot pass.

const ROOT = join(__dirname, '..');
const MODAL = 'components/tirtha/VirtualSanctumModal.tsx';
const DIR = 'components/tirtha';
const TAG = /^VirtualSanctum(?!Modal)/;
const KNOWN_COMPONENTS = [
  'VirtualSanctumActions',
  'VirtualSanctumStage',
  'VirtualSanctumTabBar',
  'VirtualSanctumTabContent',
];

const modal = readFileSync(join(ROOT, MODAL), 'utf8');
const components = loadComponents(ROOT, DIR, /^VirtualSanctum(?!Modal).*\.tsx$/);
const problemsIn = (source: string) => findWiringProblems(source, components, TAG, DIR);

describe('Virtual sanctum modal: props are wired name={name}', () => {
  it('finds the four sanctum components and their declared props', () => {
    for (const name of KNOWN_COMPONENTS) {
      assert.ok(name in components, `${name} was not found in ${DIR}`);
    }
  });

  it('passes every component exactly the props it declares, each from a local of the same name', () => {
    assert.deepEqual(problemsIn(modal), []);
  });

  it('passes each component the same number of props as it declares', () => {
    const sites = callSites(modal, TAG);
    for (const [name, declared] of Object.entries(components)) {
      const site = sites.find((candidate) => candidate.tag === name);
      assert.equal(site?.attributes.length, declared.length, name);
    }
  });
});

describe('Virtual sanctum modal: wiring the compiler accepts is still caught', () => {
  // Each of the first five compiles (same type, both in scope) and used to pass every test.
  const swaps: Array<[string, string, string, string]> = [
    ['light-diya handler given the bell handler', 'VirtualSanctumActions', 'handleLightDiya={handleLightDiya}', 'handleLightDiya={handleRingBell}'],
    ['flower count given the bell count', 'VirtualSanctumActions', 'flowersCount={flowersCount}', 'flowersCount={bellRungCount}'],
    ['parikrama count given the flower count', 'VirtualSanctumStage', 'parikramaCount={parikramaCount}', 'parikramaCount={flowersCount}'],
    ['gold accent given the card surface', 'VirtualSanctumTabBar', 'goldAccent={goldAccent}', 'goldAccent={cardSurface}'],
    ['parikrama handler given the flower handler', 'VirtualSanctumActions', 'handleParikrama={handleParikrama}', 'handleParikrama={handleOfferFlower}'],
  ];
  for (const [label, tag, from, to] of swaps) {
    it(`flags ${label}`, () => {
      const mutated = mutateCallSite(modal, tag, from, to);
      assert.notEqual(mutated, modal);
      const problems = problemsIn(mutated);
      assert.ok(
        problems.some((problem) => problem.includes(tag) && problem.includes(to)),
        problems.join('\n') || 'no problem reported',
      );
    });
  }

  it('flags a literal in place of a local', () => {
    const mutated = mutateCallSite(modal, 'VirtualSanctumTabContent', 'audioState={audioState}', 'audioState="idle"');
    assert.ok(problemsIn(mutated).some((problem) => problem.includes('audioState')));
  });

  it('flags a spread that hides what is passed', () => {
    const mutated = mutateCallSite(modal, 'VirtualSanctumStage', 'sanctumBg={sanctumBg}', '{...{ sanctumBg }}');
    const problems = problemsIn(mutated);
    assert.ok(problems.some((problem) => problem.includes('hides which props are passed')), problems.join('\n'));
    assert.ok(problems.some((problem) => problem.includes('sanctumBg is declared')), problems.join('\n'));
  });

  it('flags a declared prop that is not passed', () => {
    const mutated = mutateCallSite(modal, 'VirtualSanctumTabBar', 'setActiveTab={setActiveTab}', '');
    const problems = problemsIn(mutated);
    assert.ok(problems.some((problem) => problem.includes('setActiveTab is declared')), problems.join('\n'));
  });

  it('flags a prop the component does not declare', () => {
    const mutated = mutateCallSite(modal, 'VirtualSanctumStage', 'temple={temple}', 'temple={temple}\n              extra={temple}');
    const problems = problemsIn(mutated);
    assert.ok(problems.some((problem) => problem.includes('extra is passed but not declared')), problems.join('\n'));
  });
});
