import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_TRADITION,
  TRADITION_SYMBOLS,
  TRADITION_GREETINGS,
  TRADITION_PROMPTS,
  getTraditionSymbol,
  getTraditionGreeting,
  getTraditionPrompts,
} from '../lib/dharma-mitra-content';

describe('Dharma Mitra Tradition Content & Multi-Tradition Parity Suite', () => {
  it('defaults to neutral tradition to prevent unauthenticated/guest sectarian bias', () => {
    assert.equal(DEFAULT_TRADITION, 'neutral');
  });

  describe('getTraditionSymbol', () => {
    it('returns the canonical sacred symbol for each supported tradition', () => {
      assert.equal(getTraditionSymbol('hindu'), '🕉️');
      assert.equal(getTraditionSymbol('sikh'), '☬');
      assert.equal(getTraditionSymbol('buddhist'), '☸️');
      assert.equal(getTraditionSymbol('jain'), '🪷');
    });

    it('returns universal spark symbol for neutral, none, all, null, undefined, and unknown keys', () => {
      assert.equal(getTraditionSymbol('neutral'), '✨');
      assert.equal(getTraditionSymbol('none'), '✨');
      assert.equal(getTraditionSymbol('all'), '✨');
      assert.equal(getTraditionSymbol(null), '✨');
      assert.equal(getTraditionSymbol(undefined), '✨');
      assert.equal(getTraditionSymbol('unknown_tradition'), '✨');
    });

    it('handles case-insensitivity gracefully', () => {
      assert.equal(getTraditionSymbol('Hindu'), '🕉️');
      assert.equal(getTraditionSymbol('SIKH'), '☬');
      assert.equal(getTraditionSymbol('Buddhist'), '☸️');
      assert.equal(getTraditionSymbol('Jain'), '🪷');
      assert.equal(getTraditionSymbol('NEUTRAL'), '✨');
    });
  });

  describe('getTraditionGreeting', () => {
    it('returns appropriate greeting for Hindu tradition', () => {
      assert.equal(getTraditionGreeting('hindu'), 'Hari Om 🕉️');
    });

    it('returns appropriate greeting for Sikh tradition', () => {
      assert.equal(getTraditionGreeting('sikh'), 'Sat Sri Akal ☬');
    });

    it('returns appropriate greeting for Buddhist tradition', () => {
      assert.equal(getTraditionGreeting('buddhist'), 'Namo Buddhaya ☸️');
    });

    it('returns appropriate greeting for Jain tradition without dua hands', () => {
      const greeting = getTraditionGreeting('jain');
      assert.equal(greeting, 'Jai Jinendra 🙏');
      assert.ok(!greeting.includes('🤲'), 'Jain greeting must not contain Islamic dua emoji');
    });

    it('returns universal Namaste greeting for neutral, none, all, null, and undefined', () => {
      assert.equal(getTraditionGreeting('neutral'), 'Namaste 🙏');
      assert.equal(getTraditionGreeting('none'), 'Namaste 🙏');
      assert.equal(getTraditionGreeting('all'), 'Namaste 🙏');
      assert.equal(getTraditionGreeting(null), 'Namaste 🙏');
      assert.equal(getTraditionGreeting(undefined), 'Namaste 🙏');
    });
  });

  describe('getTraditionPrompts', () => {
    it('returns Gita and sadhana prompts for Hindu tradition', () => {
      const prompts = getTraditionPrompts('hindu');
      assert.ok(prompts.length >= 4);
      assert.ok(prompts.some((p) => p.includes('Gita')));
      assert.ok(prompts.some((p) => p.includes('sadhana')));
    });

    it('returns Ik Onkar, Nitnem, and Gurbani prompts for Sikh tradition', () => {
      const prompts = getTraditionPrompts('sikh');
      assert.ok(prompts.length >= 4);
      assert.ok(prompts.some((p) => p.includes('Ik Onkar')));
      assert.ok(prompts.some((p) => p.includes('Nitnem')));
      assert.ok(prompts.some((p) => p.includes('Gurbani')));
      // Does not leak Hindu concepts to Sikh users
      assert.ok(!prompts.some((p) => p.includes('Gita')));
    });

    it('returns Eightfold Path, Metta, and impermanence prompts for Buddhist tradition', () => {
      const prompts = getTraditionPrompts('buddhist');
      assert.ok(prompts.length >= 4);
      assert.ok(prompts.some((p) => p.includes('Eightfold Path')));
      assert.ok(prompts.some((p) => p.includes('Metta')));
      // Does not leak Hindu concepts to Buddhist users
      assert.ok(!prompts.some((p) => p.includes('Gita')));
    });

    it('returns Ahimsa, Namokar, and Anekantavada prompts for Jain tradition', () => {
      const prompts = getTraditionPrompts('jain');
      assert.ok(prompts.length >= 4);
      assert.ok(prompts.some((p) => p.includes('Ahimsa')));
      assert.ok(prompts.some((p) => p.includes('Namokar')));
      assert.ok(prompts.some((p) => p.includes('Anekantavada')));
      // Does not leak Hindu concepts to Jain users
      assert.ok(!prompts.some((p) => p.includes('Gita')));
    });

    it('returns non-sectarian universal prompts for neutral/guest users without leaking sectarian concepts', () => {
      for (const t of ['neutral', 'none', 'all', null, undefined]) {
        const prompts = getTraditionPrompts(t);
        assert.ok(prompts.length >= 4);
        assert.ok(!prompts.some((p) => p.includes('Gita')), `Neutral prompts for ${String(t)} must not mention Gita`);
        assert.ok(!prompts.some((p) => p.includes('Nitnem')), `Neutral prompts for ${String(t)} must not mention Nitnem`);
        assert.ok(!prompts.some((p) => p.includes('Namokar')), `Neutral prompts for ${String(t)} must not mention Namokar`);
        assert.ok(prompts.some((p) => p.includes('inner peace')));
        assert.ok(prompts.some((p) => p.includes('meditation')));
      }
    });
  });
});
