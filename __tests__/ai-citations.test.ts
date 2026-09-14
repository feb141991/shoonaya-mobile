import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { isScriptureCitation, parseAiMessageCitations } from '../lib/ai-citations';

describe('Dharma Mitra citation presentation', () => {
  it('marks supported source labels while leaving ordinary brackets unstyled', () => {
    assert.deepEqual(
      parseAiMessageCitations('Practice steadily [Bhagavad Gita 6.26] [optional].'),
      [
        { text: 'Practice steadily ', isCitation: false },
        { text: '[Bhagavad Gita 6.26]', isCitation: true },
        { text: ' ', isCitation: false },
        { text: '[optional]', isCitation: false },
        { text: '.', isCitation: false },
      ]
    );
  });

  it('recognizes Hindi and Gurmukhi citation labels', () => {
    assert.equal(isScriptureCitation('भगवद गीता 2.47'), true);
    assert.equal(isScriptureCitation('ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਅੰਗ 1'), true);
    assert.equal(isScriptureCitation('सामान्य टिप्पणी'), false);
  });

  it('does not consume malformed or multiline brackets as a citation', () => {
    assert.deepEqual(parseAiMessageCitations('Text [Bhagavad Gita\n6.26] end'), [
      { text: 'Text [Bhagavad Gita\n6.26] end', isCitation: false },
    ]);
  });

  it('keeps the whole assistant response available to long-press copy', () => {
    const source = readFileSync(new URL('../app/ai-chat.tsx', import.meta.url), 'utf8');
    assert.match(source, /onLongPress=\{async \(\) => \{/);
    assert.match(source, /Clipboard\.setStringAsync\(item\.text\)/);
    assert.match(source, /Haptics\.impactAsync/);
  });
});
