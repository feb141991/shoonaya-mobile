import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedBenchUrl, parseSolarBenchMessage } from '../lib/solarBenchMessage';

const good = {
  secs: 300, fpsAvg: 41.2, frameMsP50: 24, frameMsP95: 38, frameMsP99: 55, pctOver33ms: 12.5, pctOver50ms: 2.1,
  drawCallsPerFrame: 1119, trianglesPerFrame: 463355, drawCpuMsAvg: 9.4, gpu: 'Adreno', validRun: true,
};
const wrap = (res: unknown, type = 'bench') => JSON.stringify({ type, res });

describe('Solar benchmark message', () => {
  it('accepts a well-formed result', () => {
    const r = parseSolarBenchMessage(wrap(good));
    assert.equal(r?.fpsAvg, 41.2);
    assert.equal(r?.validRun, true);
  });
  it('refuses other message types, malformed JSON, empty and non-string input', () => {
    assert.equal(parseSolarBenchMessage(wrap(good, 'other')), null);
    assert.equal(parseSolarBenchMessage('{not json'), null);
    assert.equal(parseSolarBenchMessage(''), null);
    assert.equal(parseSolarBenchMessage('   '), null);
    assert.equal(parseSolarBenchMessage(undefined), null);
    assert.equal(parseSolarBenchMessage(42), null);
    assert.equal(parseSolarBenchMessage('null'), null);
  });
  it('refuses missing, negative, non-finite or string numbers', () => {
    assert.equal(parseSolarBenchMessage(wrap({ ...good, fpsAvg: undefined })), null);
    assert.equal(parseSolarBenchMessage(wrap({ ...good, fpsAvg: -1 })), null);
    assert.equal(parseSolarBenchMessage(wrap({ ...good, fpsAvg: '41' })), null);
    assert.equal(parseSolarBenchMessage('{"type":"bench","res":{"fpsAvg":1e999}}'), null);
  });
  it('never reports a run as valid unless the page said so with a boolean', () => {
    assert.equal(parseSolarBenchMessage(wrap({ ...good, validRun: 'true' })), null);
    assert.equal(parseSolarBenchMessage(wrap({ ...good, validRun: false }))?.validRun, false);
  });
  it('bounds the message size and the GPU string', () => {
    assert.equal(parseSolarBenchMessage(wrap({ ...good, pad: 'x'.repeat(25000) })), null);
    assert.equal(parseSolarBenchMessage(wrap({ ...good, gpu: 'g'.repeat(500) }))?.gpu.length, 120);
  });
});

describe('Benchmark page address', () => {
  it('allows only http and https with a host', () => {
    assert.equal(isAllowedBenchUrl('http://192.168.1.5:8765/solar-4d-bench.html?bench=1'), true);
    assert.equal(isAllowedBenchUrl('https://example.com/x'), true);
    for (const bad of [undefined, '', '  ', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,hi', 'not a url', 'http://']) {
      assert.equal(isAllowedBenchUrl(bad as string | undefined), false, String(bad));
    }
  });
});
