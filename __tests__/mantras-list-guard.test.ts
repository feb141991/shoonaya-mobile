import assert from 'node:assert/strict';
import test from 'node:test';

import { isMantraList, displayableTransliteration } from '../lib/mantras-list-guard';

const validMantra = {
  id: 'gayatri_mantra',
  tradition: 'hindu',
  nameEn: 'Gayatri Mantra',
  nameLocal: 'गायत्री मंत्र',
  tags: ['daily', 'peace'],
};

test('isMantraList accepts a list even when one entry has a malformed transliteration', () => {
  // Regression test for a bug caught in review: isMantraList used to gate the whole
  // array on textTransliteration's shape via Array.every, so one malformed value
  // rejected every otherwise-valid mantra in the list, not just that one row.
  const listWithBadTransliteration = [
    { ...validMantra, textTransliteration: 'Om Bhur Bhuva Svaha' },
    { ...validMantra, id: 'broken_entry', textTransliteration: 12345 }, // malformed: not a string
  ];
  assert.equal(isMantraList(listWithBadTransliteration), true);
});

test('isMantraList rejects a list missing a genuinely required field', () => {
  const listMissingNameLocal = [{ ...validMantra, nameLocal: undefined }];
  assert.equal(isMantraList(listMissingNameLocal), false);
});

test('isMantraList accepts a list where textTransliteration is simply absent', () => {
  const { textTransliteration: _unused, ...withoutField } = { ...validMantra, textTransliteration: undefined as unknown };
  assert.equal(isMantraList([withoutField]), true);
});

test('displayableTransliteration returns the string for a valid non-empty value', () => {
  assert.equal(displayableTransliteration('Gāyatrī Mantra'), 'Gāyatrī Mantra');
});

test('displayableTransliteration treats non-string, empty, and whitespace-only values as absent', () => {
  assert.equal(displayableTransliteration(undefined), null);
  assert.equal(displayableTransliteration(null), null);
  assert.equal(displayableTransliteration(''), null);
  assert.equal(displayableTransliteration('   '), null);
  assert.equal(displayableTransliteration(12345), null);
  assert.equal(displayableTransliteration({ not: 'a string' }), null);
});
