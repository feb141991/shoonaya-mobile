import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import ts from 'typescript';

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
// The rule that closes that gap: at every <Storybook... /> call site a prop is
// passed as name={name}, from a local of the same name. A value that needs
// computing is computed into a same-named local first. Then a wrong wiring is
// a call site whose two sides differ, which this reads without running the
// screen. The same test checks that each component is used exactly once and
// that the props passed are exactly the props its Props type declares.
//
// It reads every components/reader/Storybook*.tsx by name, so a fifth
// component is checked as soon as it exists. A test that finds no components
// would pass anything, so finding them is asserted first.

const ROOT = join(__dirname, '..');
const VIEW = 'components/reader/PanchatantraStorybookView.tsx';
const READER_DIR = 'components/reader';
const KNOWN_COMPONENTS = [
  'StorybookBottomBar',
  'StorybookParchmentCard',
  'StorybookSceneIllustration',
  'StorybookTopBar',
];

type Attribute = {
  name: string;
  // The identifier the value is, when it is exactly one identifier; otherwise null.
  wiredAs: string | null;
  spread: boolean;
};

type CallSite = { tag: string; attributes: Attribute[] };

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

// The property names of `type <component>Props = { ... }`, or null if there is no such type.
export function declaredProps(componentSource: string, component: string): string[] | null {
  const source = parse(`${component}.tsx`, componentSource);
  for (const statement of source.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === `${component}Props` &&
      ts.isTypeLiteralNode(statement.type)
    ) {
      return statement.type.members.map((member) => (member.name ? member.name.getText(source) : '?'));
    }
  }
  return null;
}

function toAttribute(property: ts.JsxAttributeLike, source: ts.SourceFile): Attribute {
  if (ts.isJsxSpreadAttribute(property)) {
    return { name: property.expression.getText(source), wiredAs: null, spread: true };
  }
  const name = property.name.getText(source);
  const initializer = property.initializer;
  if (
    initializer &&
    ts.isJsxExpression(initializer) &&
    initializer.expression &&
    ts.isIdentifier(initializer.expression)
  ) {
    return { name, wiredAs: initializer.expression.text, spread: false };
  }
  return { name, wiredAs: null, spread: false };
}

export function callSites(viewSource: string): CallSite[] {
  const source = parse(VIEW, viewSource);
  const sites: CallSite[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(source);
      if (/^Storybook/.test(tag)) {
        sites.push({ tag, attributes: node.attributes.properties.map((property) => toAttribute(property, source)) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return sites;
}

// Every way the view can pass a component the wrong thing. Empty means wired.
export function findWiringProblems(viewSource: string, components: Record<string, string[]>): string[] {
  const problems: string[] = [];
  const sites = callSites(viewSource);

  for (const [name, declared] of Object.entries(components)) {
    const mine = sites.filter((site) => site.tag === name);
    if (mine.length !== 1) {
      problems.push(`${name} is used ${mine.length} times in the view, expected exactly 1`);
      continue;
    }
    const attributes = mine[0].attributes;

    for (const attribute of attributes) {
      if (attribute.spread) {
        problems.push(`${name}: {...${attribute.name}} hides which props are passed; write each as name={name}`);
      } else if (attribute.wiredAs !== attribute.name) {
        problems.push(
          `${name}: ${attribute.name}={${attribute.wiredAs ?? '<not a bare identifier>'}} must be ${attribute.name}={${attribute.name}}`,
        );
      }
    }

    const passed = attributes.filter((attribute) => !attribute.spread).map((attribute) => attribute.name);
    if (passed.length !== new Set(passed).size) {
      problems.push(`${name}: a prop is passed twice`);
    }
    for (const prop of new Set(passed)) {
      if (!declared.includes(prop)) problems.push(`${name}: ${prop} is passed but not declared in ${name}Props`);
    }
    for (const prop of declared) {
      if (!passed.includes(prop)) problems.push(`${name}: ${prop} is declared in ${name}Props but not passed`);
    }
  }

  for (const site of sites) {
    if (!(site.tag in components)) {
      problems.push(`${site.tag} is used in the view but has no component file in ${READER_DIR}`);
    }
  }
  return problems;
}

function loadComponents(): Record<string, string[]> {
  const components: Record<string, string[]> = {};
  const files = readdirSync(join(ROOT, READER_DIR))
    .filter((file) => /^Storybook.*\.tsx$/.test(file))
    .sort();
  for (const file of files) {
    const name = file.replace(/\.tsx$/, '');
    const text = readFileSync(join(ROOT, READER_DIR, file), 'utf8');
    assert.ok(text.includes(`export function ${name}(`), `${file} must export function ${name}`);
    const props = declaredProps(text, name);
    assert.ok(props && props.length > 0, `${file} must declare type ${name}Props with at least one prop`);
    components[name] = props;
  }
  return components;
}

const view = readFileSync(join(ROOT, VIEW), 'utf8');
const components = loadComponents();

describe('Storybook view: props are wired name={name}', () => {
  it('finds the four reader components and their declared props', () => {
    for (const name of KNOWN_COMPONENTS) {
      assert.ok(name in components, `${name} was not found in ${READER_DIR}`);
    }
  });

  it('passes every component exactly the props it declares, each from a local of the same name', () => {
    assert.deepEqual(findWiringProblems(view, components), []);
  });

  it('passes each component the same number of props as it declares', () => {
    const sites = callSites(view);
    for (const [name, declared] of Object.entries(components)) {
      const site = sites.find((candidate) => candidate.tag === name);
      assert.equal(site?.attributes.length, declared.length, name);
    }
  });
});

// Replace one attribute inside one call site of the real view, in memory. The
// edit must hit exactly one place, so a reformatted view cannot turn a
// mutation into a no-op that appears to pass.
function mutateCallSite(source: string, tag: string, from: string, to: string): string {
  const start = source.indexOf(`<${tag}\n`);
  assert.notEqual(start, -1, `${tag} call site not found`);
  const end = source.indexOf('/>', start) + 2;
  const element = source.slice(start, end);
  assert.equal(element.split(from).length - 1, 1, `${from} must appear once in <${tag}>`);
  return source.slice(0, start) + element.replace(from, to) + source.slice(end);
}

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
      const problems = findWiringProblems(mutated, components);
      assert.ok(
        problems.some((problem) => problem.includes(tag) && problem.includes(to)),
        problems.join('\n') || 'no problem reported',
      );
    });
  }

  it('flags a literal in place of a local', () => {
    const mutated = mutateCallSite(view, 'StorybookTopBar', 'title={title}', 'title="title"');
    assert.ok(findWiringProblems(mutated, components).some((problem) => problem.includes('title')));
  });

  it('flags a spread that hides what is passed', () => {
    const mutated = mutateCallSite(view, 'StorybookTopBar', 'moralText={moralText}', '{...{ moralText }}');
    const problems = findWiringProblems(mutated, components);
    assert.ok(problems.some((problem) => problem.includes('hides which props are passed')), problems.join('\n'));
    assert.ok(problems.some((problem) => problem.includes('moralText is declared')), problems.join('\n'));
  });

  it('flags a declared prop that is not passed', () => {
    const mutated = mutateCallSite(view, 'StorybookBottomBar', 'goToPage={goToPage}', '');
    const problems = findWiringProblems(mutated, components);
    assert.ok(problems.some((problem) => problem.includes('goToPage is declared')), problems.join('\n'));
  });

  it('flags a prop the component does not declare', () => {
    const mutated = mutateCallSite(view, 'StorybookTopBar', 'pinned={pinned}', 'pinned={pinned}\n        extra={pinned}');
    const problems = findWiringProblems(mutated, components);
    assert.ok(problems.some((problem) => problem.includes('extra is passed but not declared')), problems.join('\n'));
  });
});

describe('Storybook view: the checker on small inputs', () => {
  const declared = { StorybookBox: ['a', 'b'] };
  const wrap = (body: string) => `export function V() { return (${body}); }`;

  it('accepts a call site that passes each declared prop from its own name', () => {
    assert.deepEqual(findWiringProblems(wrap('<StorybookBox a={a} b={b} />'), declared), []);
  });

  it('rejects a swap, a rename, an inline value and a string', () => {
    assert.equal(findWiringProblems(wrap('<StorybookBox a={b} b={b} />'), declared).length, 1);
    assert.equal(findWiringProblems(wrap('<StorybookBox a={a} b={b.x} />'), declared).length, 1);
    assert.equal(findWiringProblems(wrap('<StorybookBox a={a} b={1 + 1} />'), declared).length, 1);
    assert.equal(findWiringProblems(wrap('<StorybookBox a="a" b={b} />'), declared).length, 1);
  });

  it('rejects a missing, an extra and a repeated prop', () => {
    assert.deepEqual(findWiringProblems(wrap('<StorybookBox a={a} />'), declared), [
      'StorybookBox: b is declared in StorybookBoxProps but not passed',
    ]);
    assert.deepEqual(findWiringProblems(wrap('<StorybookBox a={a} b={b} c={c} />'), declared), [
      'StorybookBox: c is passed but not declared in StorybookBoxProps',
    ]);
    assert.ok(findWiringProblems(wrap('<StorybookBox a={a} a={a} b={b} />'), declared).some((p) => p.includes('twice')));
  });

  it('rejects a component used zero or two times, and a component with no file', () => {
    assert.deepEqual(findWiringProblems(wrap('<div />'), declared), [
      'StorybookBox is used 0 times in the view, expected exactly 1',
    ]);
    assert.deepEqual(findWiringProblems(wrap('<><StorybookBox a={a} b={b} /><StorybookBox a={a} b={b} /></>'), declared), [
      'StorybookBox is used 2 times in the view, expected exactly 1',
    ]);
    assert.deepEqual(findWiringProblems(wrap('<><StorybookBox a={a} b={b} /><StorybookGhost x={x} /></>'), declared), [
      'StorybookGhost is used in the view but has no component file in components/reader',
    ]);
  });

  it('reads a component that wraps children as one call site', () => {
    assert.deepEqual(findWiringProblems(wrap('<StorybookBox a={a} b={b}>x</StorybookBox>'), declared), []);
  });

  it('reads the declared props out of a Props type, and null when there is none', () => {
    const source = 'type StorybookBoxProps = { a: string; b?: () => void; };\nexport function StorybookBox() {}';
    assert.deepEqual(declaredProps(source, 'StorybookBox'), ['a', 'b']);
    assert.equal(declaredProps('export function StorybookBox() {}', 'StorybookBox'), null);
  });
});
