import assert from 'node:assert/strict';
import test from 'node:test';

import { pathFromUrlLike, resolveNativeRoute } from '../lib/routes';

test('family remembrance notification opens the KUL family dates section', () => {
  const actionUrl = '/kul?section=family';
  assert.equal(resolveNativeRoute(actionUrl, '/notifications'), actionUrl);
  assert.equal(
    resolveNativeRoute(pathFromUrlLike(`https://www.shoonaya.com${actionUrl}`)!, '/notifications'),
    actionUrl,
  );
});
