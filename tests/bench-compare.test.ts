import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compareBenchmarks } from '../scripts/bench-compare';

describe('Benchmark Suite & PR Comparison Tooling', () => {
  it('parses benchmark JSON and detects faster, stable, and regression statuses', () => {
    const tempDir = path.resolve(__dirname, '../temp/bench-test');
    fs.mkdirSync(tempDir, { recursive: true });

    const baseJson = {
      files: [
        {
          filepath: 'bench/render.bench.ts',
          groups: [
            {
              fullName: 'bench/render.bench.ts > renderSvg',
              benchmarks: [
                {
                  name: 'small (3 nodes)',
                  hz: 50000,
                  mean: 0.02,
                  min: 0.01,
                  max: 0.05,
                },
                {
                  name: 'large (100 nodes)',
                  hz: 2000,
                  mean: 0.5,
                  min: 0.4,
                  max: 0.8,
                },
              ],
            },
          ],
        },
      ],
    };

    const currJson = {
      files: [
        {
          filepath: 'bench/render.bench.ts',
          groups: [
            {
              fullName: 'bench/render.bench.ts > renderSvg',
              benchmarks: [
                {
                  // 20% faster
                  name: 'small (3 nodes)',
                  hz: 60000,
                  mean: 0.016,
                  min: 0.01,
                  max: 0.04,
                },
                {
                  // 30% slower -> regression
                  name: 'large (100 nodes)',
                  hz: 1400,
                  mean: 0.71,
                  min: 0.5,
                  max: 1.1,
                },
              ],
            },
          ],
        },
      ],
    };

    const basePath = path.join(tempDir, 'base.json');
    const currPath = path.join(tempDir, 'curr.json');

    fs.writeFileSync(basePath, JSON.stringify(baseJson), 'utf8');
    fs.writeFileSync(currPath, JSON.stringify(currJson), 'utf8');

    const result = compareBenchmarks(basePath, currPath, 20);

    expect(result.rows.length).toBe(2);
    expect(result.rows[0].status).toBe('faster');
    expect(result.rows[0].deltaPercent).toBeCloseTo(20, 1);

    expect(result.rows[1].status).toBe('regression');
    expect(result.hasRegression).toBe(true);

    expect(result.markdown).toContain('Benchmark Performance Comparison');
    expect(result.markdown).toContain('🚀 Faster');
    expect(result.markdown).toContain('🚨 **Regression**');
    expect(result.markdown).toContain('Warning');
  });

  it('marks benchmarks as stable when within noise threshold', () => {
    const tempDir = path.resolve(__dirname, '../temp/bench-test');
    fs.mkdirSync(tempDir, { recursive: true });

    const baseJson = {
      files: [
        {
          filepath: 'bench/render.bench.ts',
          groups: [
            {
              fullName: 'renderSvg',
              benchmarks: [
                {
                  name: 'stable op',
                  hz: 10000,
                  mean: 0.1,
                  min: 0.09,
                  max: 0.12,
                },
              ],
            },
          ],
        },
      ],
    };

    const currJson = {
      files: [
        {
          filepath: 'bench/render.bench.ts',
          groups: [
            {
              fullName: 'renderSvg',
              benchmarks: [
                {
                  name: 'stable op',
                  hz: 10200, // +2% within ±5%
                  mean: 0.098,
                  min: 0.09,
                  max: 0.11,
                },
              ],
            },
          ],
        },
      ],
    };

    const basePath = path.join(tempDir, 'stable-base.json');
    const currPath = path.join(tempDir, 'stable-curr.json');

    fs.writeFileSync(basePath, JSON.stringify(baseJson), 'utf8');
    fs.writeFileSync(currPath, JSON.stringify(currJson), 'utf8');

    const result = compareBenchmarks(basePath, currPath);
    expect(result.rows[0].status).toBe('stable');
    expect(result.hasRegression).toBe(false);
    expect(result.markdown).toContain('Passed');
  });
});
