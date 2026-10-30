import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDharmVeerDetail, preferExpandedDharmVeer } from '../lib/dharmVeerDetail';
import type { DharmVeer } from '../lib/dharm-veer';

describe('fetchDharmVeerDetail', () => {
  it('fetches hero from /api/dharm-veer/detail without calling roster', async () => {
    const calls: Array<{ path: string; expectedUserId: string }> = [];
    const mockHero: DharmVeer = {
      id: 'rani-lakshmibai',
      name: 'Rani Lakshmibai',
      tradition: 'hindu',
      era: '1857',
      region: 'Jhansi',
      emoji: '⚔️',
      tagline: 'Warrior Queen of Jhansi',
      journey: 'Long journey of courage and leadership in 1857...',
      trial: 'British siege of Jhansi...',
      teaching: 'Freedom requires courage...',
      moral: 'Duty above personal comfort.',
    };

    const fetcher = async (path: string, options: { expectedUserId: string }) => {
      calls.push({ path, expectedUserId: options.expectedUserId });
      return new Response(JSON.stringify({ hero: mockHero }), { status: 200 });
    };

    const result = await fetchDharmVeerDetail('rani-lakshmibai', 'user-1', fetcher);
    assert.deepEqual(result, mockHero);
    assert.deepEqual(calls, [
      { path: '/api/dharm-veer/detail?id=rani-lakshmibai', expectedUserId: 'user-1' },
    ]);
  });

  it('falls back to /api/dharm-veer/roster only on 404', async () => {
    const calls: string[] = [];
    const mockHero: DharmVeer = {
      id: 'bhagat-singh',
      name: 'Bhagat Singh',
      tradition: 'sikh',
      era: '1907-1931',
      region: 'Punjab',
      emoji: '✊',
      tagline: 'Shaheed-e-Azam',
      journey: 'Sacrifice for Indian independence...',
      trial: 'Lahore conspiracy case...',
      teaching: 'Inquilab Zindabad...',
      moral: 'Selfless sacrifice.',
    };

    const fetcher = async (path: string) => {
      calls.push(path);
      if (path.startsWith('/api/dharm-veer/detail')) {
        return new Response('{}', { status: 404 });
      }
      return new Response(JSON.stringify({ roster: [mockHero] }), { status: 200 });
    };

    const result = await fetchDharmVeerDetail('bhagat-singh', 'user-1', fetcher);
    assert.deepEqual(result, mockHero);
    assert.deepEqual(calls, [
      '/api/dharm-veer/detail?id=bhagat-singh',
      '/api/dharm-veer/roster',
    ]);
  });

  it('throws on 503 without falling back to roster', async () => {
    const calls: string[] = [];
    const fetcher = async (path: string) => {
      calls.push(path);
      return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 503 });
    };

    await assert.rejects(
      () => fetchDharmVeerDetail('rani-lakshmibai', 'user-1', fetcher),
      /Story unavailable/,
    );
    assert.deepEqual(calls, ['/api/dharm-veer/detail?id=rani-lakshmibai']);
  });

  it('throws on 401 without falling back to roster', async () => {
    const calls: string[] = [];
    const fetcher = async (path: string) => {
      calls.push(path);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    };

    await assert.rejects(
      () => fetchDharmVeerDetail('rani-lakshmibai', 'user-1', fetcher),
      /Story unavailable/,
    );
    assert.deepEqual(calls, ['/api/dharm-veer/detail?id=rani-lakshmibai']);
  });

  it('returns null when hero is null (unknown hero)', async () => {
    const fetcher = async () => new Response(JSON.stringify({ hero: null }), { status: 200 });
    const result = await fetchDharmVeerDetail('unknown-hero', 'user-1', fetcher);
    assert.equal(result, null);
  });
});

describe('preferExpandedDharmVeer', () => {
  it('prefers offline cornerstone when offline journey is longer', () => {
    const remote: DharmVeer = {
      id: 'test',
      name: 'Test',
      tradition: 'hindu',
      era: 'Modern',
      region: 'India',
      emoji: '🕉️',
      tagline: 'Tag',
      journey: 'Short remote journey',
      trial: 'Trial',
      teaching: 'Teaching',
      moral: 'Moral',
    };
    const offline: DharmVeer = {
      ...remote,
      journey: 'Much longer offline cornerstone journey with 500 words of rich Dharmic detail...',
    };

    const preferred = preferExpandedDharmVeer(remote, offline);
    assert.equal(preferred?.journey, offline.journey);
  });

  it('prefers remote when remote journey is longer', () => {
    const offline: DharmVeer = {
      id: 'test',
      name: 'Test',
      tradition: 'hindu',
      era: 'Modern',
      region: 'India',
      emoji: '🕉️',
      tagline: 'Tag',
      journey: 'Short offline journey',
      trial: 'Trial',
      teaching: 'Teaching',
      moral: 'Moral',
    };
    const remote: DharmVeer = {
      ...offline,
      journey: 'Longer remote journey freshly reviewed by the council...',
    };

    const preferred = preferExpandedDharmVeer(remote, offline);
    assert.equal(preferred?.journey, remote.journey);
  });
});
