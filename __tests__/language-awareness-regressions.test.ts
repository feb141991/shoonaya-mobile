import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Native language preference reaches content requests and readers', () => {
  it('requests the selected locale for both guest and signed-in daily quizzes', () => {
    const quiz = read('app/quiz.tsx');
    assert.equal((quiz.match(/language=\$\{language\}/g) ?? []).length, 2);
    assert.match(quiz, /readQuizCache\(identity, language\)/);
    assert.match(quiz, /language, router\]/);
  });

  it('does not reuse a same-day quiz cached in a different language', () => {
    const cache = read('lib/quizCache.ts');
    assert.match(cache, /shoonaya\.quiz\.daily\.v2/);
    assert.match(cache, /state\.language !== preferredLanguage/);
  });

  it('offers Punjabi meaning language in Pathshala and preserves the global default for guests', () => {
    const lesson = read('app/pathshala/[pathId]/[lessonId].tsx');
    assert.match(lesson, /\['en', 'hi', 'pa'\]/);
    assert.match(lesson, /const language = languageOverride \?\? appLang/);
    assert.doesNotMatch(lesson, /setLanguage\('en'\)/);
    assert.match(lesson, /language,\s*\n\s*\}\),/);
  });

  it('does not present Hindi-only Vrat copy as Punjabi', () => {
    const vrat = read('app/vrat/[slug].tsx');
    assert.match(vrat, /readerLanguage === 'hi' && hasLocalVrat/);
    assert.doesNotMatch(vrat, /readerLanguage === 'hi' \|\| readerLanguage === 'pa'.*hasLocalVrat/);
  });

  it('lets reader defaults follow the selected app language until the reader is explicitly overridden', () => {
    for (const path of [
      'app/vrat/[slug].tsx',
      'app/festival/[slug].tsx',
      'app/dharm-veer/[id].tsx',
      'app/bhakti/stotram/[id].tsx',
      'app/bhakti/katha/[id].tsx',
    ]) {
      const source = read(path);
      assert.match(source, /readerLanguageOverride \?\? language/ , `${path} should track late-loaded account language`);
      assert.doesNotMatch(source, /useState\(language\)/, `${path} should not freeze the initial English value`);
    }
  });
});
