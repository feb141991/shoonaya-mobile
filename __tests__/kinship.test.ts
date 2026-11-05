import assert from 'node:assert/strict';
import test from 'node:test';
import { getKinshipTier } from '../lib/kinship';

test('getKinshipTier returns human kinship labels and tooltips for all generations', () => {
  const root = getKinshipTier(1);
  assert.equal(root.label, 'Root Ancestor');
  assert.equal(root.hindiLabel, 'मूल पूर्वज');
  assert.match(root.tooltip, /Kutumb Vansh/);

  const grand = getKinshipTier(2);
  assert.equal(grand.label, 'Grandparents');
  assert.equal(grand.hindiLabel, 'दादा-दादी');

  const parents = getKinshipTier(3);
  assert.equal(parents.label, "Parents' Gen");
  assert.equal(parents.hindiLabel, 'माता-पिता');

  const current = getKinshipTier(4);
  assert.equal(current.label, 'Current Gen');
  assert.equal(current.hindiLabel, 'समकालीन');

  const next = getKinshipTier(5);
  assert.equal(next.label, 'Next Gen');
  assert.equal(next.hindiLabel, 'संतान');

  const grandChildren = getKinshipTier(6);
  assert.equal(grandChildren.label, 'Grandchildren');
});
