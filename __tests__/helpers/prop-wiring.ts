import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

// Shared checker for "a screen was split into components; are its props wired
// name={name}?" (AGENTS.md section 32, used by storybook-prop-wiring.test.ts and
// virtual-sanctum-prop-wiring.test.ts; its own behaviour is tested in
// prop-wiring-helper.test.ts).
//
// The compiler checks that each prop has the right TYPE, so it cannot see a swap
// between two values of the same type (parchmentBg={parchmentBorder},
// onComplete={onBack}, handleLightDiya={handleRingBell}). The rule that closes
// the gap: at every call site of the split-out components a prop is passed as
// name={name}, from a local of the same name. A value that needs computing is
// computed into a same-named local first. Then a wrong wiring is a call site
// whose two sides differ, which this reads without running the screen. It also
// checks each component is used exactly once and that the props passed are
// exactly the props its Props type declares.
//
// This is a structural check on one screen's call sites, not a behaviour test:
// a render test that presses the controls (AGENTS.md section 37) proves more
// where the component test harness exists.

export type Attribute = {
  name: string;
  // The identifier the value is, when it is exactly one identifier; otherwise null.
  wiredAs: string | null;
  spread: boolean;
};

export type CallSite = { tag: string; attributes: Attribute[] };

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

// Every JSX element in the view whose tag matches `tag`, with how each attribute is passed.
export function callSites(viewSource: string, tag: RegExp): CallSite[] {
  const source = parse('view.tsx', viewSource);
  const sites: CallSite[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const name = node.tagName.getText(source);
      if (tag.test(name)) {
        sites.push({ tag: name, attributes: node.attributes.properties.map((property) => toAttribute(property, source)) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return sites;
}

// Every way the view can pass a component the wrong thing. Empty means wired.
// `tag` selects the split-out components in the view; `componentDir` is only named in messages.
export function findWiringProblems(
  viewSource: string,
  components: Record<string, string[]>,
  tag: RegExp,
  componentDir: string,
): string[] {
  const problems: string[] = [];
  const sites = callSites(viewSource, tag);

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
      problems.push(`${site.tag} is used in the view but has no component file in ${componentDir}`);
    }
  }
  return problems;
}

// Reads every component file in `dir` (relative to `root`) whose name matches `file`, and its declared props.
// Fails if a file does not export its function or declares no props, so a parser that finds nothing cannot pass.
export function loadComponents(root: string, dir: string, file: RegExp): Record<string, string[]> {
  const components: Record<string, string[]> = {};
  const files = readdirSync(join(root, dir))
    .filter((entry) => file.test(entry))
    .sort();
  for (const entry of files) {
    const name = entry.replace(/\.tsx$/, '');
    const text = readFileSync(join(root, dir, entry), 'utf8');
    assert.ok(text.includes(`export function ${name}(`), `${entry} must export function ${name}`);
    const props = declaredProps(text, name);
    assert.ok(props && props.length > 0, `${entry} must declare type ${name}Props with at least one prop`);
    components[name] = props;
  }
  return components;
}

// Replace one attribute inside one call site of the real view, in memory. The edit must hit
// exactly one place, so a reformatted view cannot turn a mutation into a no-op that appears to pass.
export function mutateCallSite(source: string, tag: string, from: string, to: string): string {
  const start = source.indexOf(`<${tag}\n`);
  assert.notEqual(start, -1, `${tag} call site not found`);
  const end = source.indexOf('/>', start) + 2;
  const element = source.slice(start, end);
  assert.equal(element.split(from).length - 1, 1, `${from} must appear once in <${tag}>`);
  return source.slice(0, start) + element.replace(from, to) + source.slice(end);
}
