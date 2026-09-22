import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistribution,
  formatMarkdownReport,
  generateSyntheticSamples,
  runBenchmarkSeries,
  type BenchmarkReport,
} from '../scripts/benchmark-device-performance';

test('Benchmark Distribution -- calculation correctness', async (t) => {
  await t.test('handles empty sample array safely', () => {
    const stats = calculateDistribution([]);
    assert.equal(stats.count, 0);
    assert.equal(stats.min, 0);
    assert.equal(stats.p50, 0);
    assert.equal(stats.p95, 0);
  });

  await t.test('handles single sample correctly', () => {
    const stats = calculateDistribution([1200]);
    assert.equal(stats.count, 1);
    assert.equal(stats.min, 1200);
    assert.equal(stats.p50, 1200);
    assert.equal(stats.p75, 1200);
    assert.equal(stats.p95, 1200);
    assert.equal(stats.max, 1200);
    assert.equal(stats.mean, 1200);
    assert.equal(stats.stddev, 0);
  });

  await t.test('calculates accurate percentiles and moments on known array', () => {
    // 10 sorted values from 100 to 1000
    const values = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const stats = calculateDistribution(values);
    assert.equal(stats.count, 10);
    assert.equal(stats.min, 100);
    assert.equal(stats.max, 1000);
    assert.equal(stats.p50, 550); // median between 500 and 600
    assert.equal(stats.mean, 550);
    assert.ok(stats.p95 >= 950);
    assert.ok(stats.stddev > 280 && stats.stddev < 300);
  });
});

test('Benchmark Distribution -- synthetic generator calibration', async (t) => {
  await t.test('generates requested number of samples within plausible range', () => {
    const samples = generateSyntheticSamples(50, 1000, 100);
    assert.equal(samples.length, 50);
    const stats = calculateDistribution(samples);
    assert.ok(stats.min >= 50);
    assert.ok(stats.p50 > 800 && stats.p50 < 1200);
    assert.ok(stats.p95 > stats.p50);
  });
});

test('Benchmark Runner -- simulation and budget evaluation', async (t) => {
  await t.test('evaluates passing budget when p95 is below limit', async () => {
    const report = await runBenchmarkSeries({
      iterations: 15,
      simulated: true,
      coldP95LimitMs: 3000,
      warmP95LimitMs: 1000,
    });

    assert.equal(report.iterations, 15);
    assert.equal(report.coldLaunch.count, 15);
    assert.equal(report.warmLaunch.count, 15);
    assert.equal(report.passedBudget, true);

    const markdown = formatMarkdownReport(report);
    assert.ok(markdown.includes('# Device Performance Baseline Report'));
    assert.ok(markdown.includes('✅ ALL BUDGETS MET'));
    assert.ok(markdown.includes('synthetic simulation; not a physical-device measurement'));
  });

  await t.test('evaluates failing budget when p95 exceeds strict limit', async () => {
    const report = await runBenchmarkSeries({
      iterations: 10,
      simulated: true,
      coldP95LimitMs: 100, // unrealistically low budget to trigger fail
    });

    assert.equal(report.passedBudget, false);
    const markdown = formatMarkdownReport(report);
    assert.ok(markdown.includes('⚠️ BUDGET EXCEEDED'));
  });
});
