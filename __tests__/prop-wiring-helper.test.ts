import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { declaredProps, findWiringProblems } from './helpers/prop-wiring';

// The checker in helpers/prop-wiring.ts on small inputs. The two screens that use
// it (storybook-prop-wiring.test.ts, virtual-sanctum-prop-wiring.test.ts) rely on
// these cases to show the checker itself catches what it claims to.

describe('prop wiring checker', () => {
  const declared = { StorybookBox: ['a', 'b'] };
  const TAG = /^Storybook/;
  const check = (source: string, components: Record<string, string[]> = declared) =>
    findWiringProblems(source, components, TAG, 'components/reader');
  const wrap = (body: string) => `export function V() { return (${body}); }`;

  it('accepts a call site that passes each declared prop from its own name', () => {
    assert.deepEqual(check(wrap('<StorybookBox a={a} b={b} />')), []);
  });

  it('rejects a swap, a rename, an inline value and a string', () => {
    assert.equal(check(wrap('<StorybookBox a={b} b={b} />')).length, 1);
    assert.equal(check(wrap('<StorybookBox a={a} b={b.x} />')).length, 1);
    assert.equal(check(wrap('<StorybookBox a={a} b={1 + 1} />')).length, 1);
    assert.equal(check(wrap('<StorybookBox a="a" b={b} />')).length, 1);
  });

  it('rejects a missing, an extra and a repeated prop', () => {
    assert.deepEqual(check(wrap('<StorybookBox a={a} />')), [
      'StorybookBox: b is declared in StorybookBoxProps but not passed',
    ]);
    assert.deepEqual(check(wrap('<StorybookBox a={a} b={b} c={c} />')), [
      'StorybookBox: c is passed but not declared in StorybookBoxProps',
    ]);
    assert.ok(check(wrap('<StorybookBox a={a} a={a} b={b} />')).some((p) => p.includes('twice')));
  });

  it('rejects a component used zero or two times, and a component with no file', () => {
    assert.deepEqual(check(wrap('<div />')), ['StorybookBox is used 0 times in the view, expected exactly 1']);
    assert.deepEqual(check(wrap('<><StorybookBox a={a} b={b} /><StorybookBox a={a} b={b} /></>')), [
      'StorybookBox is used 2 times in the view, expected exactly 1',
    ]);
    assert.deepEqual(check(wrap('<><StorybookBox a={a} b={b} /><StorybookGhost x={x} /></>')), [
      'StorybookGhost is used in the view but has no component file in components/reader',
    ]);
  });

  it('reads a component that wraps children as one call site', () => {
    assert.deepEqual(check(wrap('<StorybookBox a={a} b={b}>x</StorybookBox>')), []);
  });

  it('only looks at tags the pattern selects', () => {
    assert.deepEqual(check(wrap('<><StorybookBox a={a} b={b} /><Other z={q} /></>')), []);
    assert.deepEqual(
      findWiringProblems(wrap('<Other z={q} />'), { Other: ['z'] }, /^Other$/, 'components/x'),
      ['Other: z={q} must be z={z}'],
    );
  });

  it('reads the declared props out of a Props type, and null when there is none', () => {
    const source = 'type StorybookBoxProps = { a: string; b?: () => void; };\nexport function StorybookBox() {}';
    assert.deepEqual(declaredProps(source, 'StorybookBox'), ['a', 'b']);
    assert.equal(declaredProps('export function StorybookBox() {}', 'StorybookBox'), null);
  });
});
