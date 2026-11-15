import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { callSites, findWiringProblems, loadComponents, mutateCallSite } from './helpers/prop-wiring';

// Guard for the Panchatantra story reader after its split (AGENTS.md section 32).
//
// PanchatantraStorybookView.tsx hands its state to four components
// (StorybookTopBar, StorybookSceneIllustration, StorybookParchmentCard,
// StorybookBottomBar), 69 props in all. The compiler checks that each prop has
// the right TYPE, so it cannot see a swap between two values of the same type:
// parchmentBg={parchmentBorder}, pageIndex={safePage}, isFinalPage={isDark},
// onComplete={onBack}. Each of those compiles, renders and passes every other
// test in this repository.
//
// The rule that closes that gap, and how it is checked, is in
// helpers/prop-wiring.ts: at every <Storybook... /> call site a prop is passed
// as name={name}, and the props passed are exactly the props the component
// declares. This file applies it to the real view and proves it bites.
//
// It reads every components/reader/Storybook*.tsx by name, so a fifth
// component is checked as soon as it exists. A test that finds no components
// would pass anything, so finding them is asserted first.

const ROOT = join(__dirname, '..');
const VIEW = 'components/reader/PanchatantraStorybookView.tsx';
const READER_DIR = 'components/reader';
const TAG = /^Storybook/;
const KNOWN_COMPONENTS = [
  'StorybookBottomBar',
  'StorybookParchmentCard',
  'StorybookSceneIllustration',
  'StorybookTopBar',
];

const view = readFileSync(join(ROOT, VIEW), 'utf8');
const components = loadComponents(ROOT, READER_DIR, /^Storybook.*\.tsx$/);
const problemsIn = (source: string) => findWiringProblems(source, components, TAG, READER_DIR);

describe('Storybook view: props are wired name={name}', () => {
  it('finds the four reader components and their declared props', () => {
    for (const name of KNOWN_COMPONENTS) {
      assert.ok(name in components, `${name} was not found in ${READER_DIR}`);
    }
  });

  it('passes every component exactly the props it declares, each from a local of the same name', () => {
    assert.deepEqual(problemsIn(view), []);
  });

  it('passes each component the same number of props as it declares', () => {
    const sites = callSites(view, TAG);
    for (const [name, declared] of Object.entries(components)) {
      const site = sites.find((candidate) => candidate.tag === name);
      assert.equal(site?.attributes.length, declared.length, name);
    }
  });
});

describe('Storybook view: wiring the compiler accepts is still caught', () => {
  // Each of the first five compiles (same type, both in scope) and used to pass every test.
  const swaps: Array<[string, string, string, string]> = [
    ['two strings swapped', 'StorybookParchmentCard', 'parchmentBg={parchmentBg}', 'parchmentBg={parchmentBorder}'],
    ['page index from the pager position', 'StorybookSceneIllustration', 'pageIndex={pageIndex}', 'pageIndex={safePage}'],
    ['two booleans swapped', 'StorybookParchmentCard', 'isFinalPage={isFinalPage}', 'isFinalPage={isDark}'],
    ['heading font where the body font goes', 'StorybookParchmentCard', 'headingFontFamily={headingFontFamily}', 'headingFontFamily={textFontFamily}'],
    ['two callbacks swapped', 'StorybookBottomBar', 'onComplete={onComplete}', 'onComplete={onBack}'],
  ];
  for (const [label, tag, from, to] of swaps) {
    it(`flags ${label}`, () => {
      const mutated = mutateCallSite(view, tag, from, to);
      assert.notEqual(mutated, view);
      const problems = problemsIn(mutated);
      assert.ok(
        problems.some((problem) => problem.includes(tag) && problem.includes(to)),
        problems.join('\n') || 'no problem reported',
      );
    });
  }

  it('flags a literal in place of a local', () => {
    const mutated = mutateCallSite(view, 'StorybookTopBar', 'title={title}', 'title="title"');
    assert.ok(problemsIn(mutated).some((problem) => problem.includes('title')));
  });

  it('flags a spread that hides what is passed', () => {
    const mutated = mutateCallSite(view, 'StorybookTopBar', 'moralText={moralText}', '{...{ moralText }}');
    const problems = problemsIn(mutated);
    assert.ok(problems.some((problem) => problem.includes('hides which props are passed')), problems.join('\n'));
    assert.ok(problems.some((problem) => problem.includes('moralText is declared')), problems.join('\n'));
  });

  it('flags a declared prop that is not passed', () => {
    const mutated = mutateCallSite(view, 'StorybookBottomBar', 'goToPage={goToPage}', '');
    const problems = problemsIn(mutated);
    assert.ok(problems.some((problem) => problem.includes('goToPage is declared')), problems.join('\n'));
  });

  it('flags a prop the component does not declare', () => {
    const mutated = mutateCallSite(view, 'StorybookTopBar', 'pinned={pinned}', 'pinned={pinned}\n        extra={pinned}');
    const problems = problemsIn(mutated);
    assert.ok(problems.some((problem) => problem.includes('extra is passed but not declared')), problems.join('\n'));
  });
});
