import fs from 'node:fs';
import path from 'node:path';

interface BenchmarkSample {
  name: string;
  hz: number; // ops per sec
  mean: number; // ms per op
  min: number;
  max: number;
  p75?: number;
  p99?: number;
  rme?: number; // relative margin of error %
  sampleCount?: number;
}

interface BenchmarkGroup {
  fullName: string;
  benchmarks: BenchmarkSample[];
}

interface BenchmarkFile {
  filepath: string;
  groups: BenchmarkGroup[];
}

interface BenchmarkJson {
  files: BenchmarkFile[];
}

interface ComparisonRow {
  group: string;
  name: string;
  baselineHz: number;
  baselineMeanMs: number;
  currentHz: number;
  currentMeanMs: number;
  deltaPercent: number; // positive = faster ops/sec
  status: 'faster' | 'stable' | 'slower' | 'regression';
}

function parseBenchmarkJson(filePath: string): Map<string, BenchmarkSample> {
  const content = fs.readFileSync(filePath, 'utf8');
  const data: BenchmarkJson = JSON.parse(content);
  const map = new Map<string, BenchmarkSample>();

  for (const file of data.files || []) {
    for (const group of file.groups || []) {
      const cleanGroup = group.fullName.replace(/^bench\/.*? > /, '');
      for (const bench of group.benchmarks || []) {
        const key = `${cleanGroup} > ${bench.name}`;
        map.set(key, bench);
      }
    }
  }

  return map;
}

export function compareBenchmarks(
  baseFile: string,
  currFile: string,
  regressionThreshold = 20, // alert if >20% slower
): {
  rows: ComparisonRow[];
  markdown: string;
  hasRegression: boolean;
} {
  const baseMap = parseBenchmarkJson(baseFile);
  const currMap = parseBenchmarkJson(currFile);

  const rows: ComparisonRow[] = [];
  let hasRegression = false;

  for (const [key, curr] of currMap.entries()) {
    const base = baseMap.get(key);
    const lastArrow = key.lastIndexOf(' > ');
    const group = lastArrow !== -1 ? key.slice(0, lastArrow) : '';
    const name = lastArrow !== -1 ? key.slice(lastArrow + 3) : key;

    if (!base) {
      rows.push({
        group,
        name,
        baselineHz: 0,
        baselineMeanMs: 0,
        currentHz: curr.hz,
        currentMeanMs: curr.mean,
        deltaPercent: 0,
        status: 'stable',
      });
      continue;
    }

    // Delta % in ops/sec: positive is good (more ops/sec)
    const deltaPercent = ((curr.hz - base.hz) / base.hz) * 100;

    let status: ComparisonRow['status'] = 'stable';
    if (deltaPercent > 5) {
      status = 'faster';
    } else if (deltaPercent < -regressionThreshold) {
      status = 'regression';
      hasRegression = true;
    } else if (deltaPercent < -5) {
      status = 'slower';
    }

    rows.push({
      group,
      name,
      baselineHz: base.hz,
      baselineMeanMs: base.mean,
      currentHz: curr.hz,
      currentMeanMs: curr.mean,
      deltaPercent,
      status,
    });
  }

  // Format Markdown report
  const lines: string[] = [];
  lines.push('### ⚡ Benchmark Performance Comparison');
  lines.push('');
  lines.push(
    '| Benchmark Suite | Baseline (ops/sec) | Current (ops/sec) | Latency (mean) | Delta | Status |',
  );
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const row of rows) {
    const baselineStr =
      row.baselineHz > 0
        ? `${Math.round(row.baselineHz).toLocaleString()}/s`
        : 'N/A (new)';
    const currentStr = `${Math.round(row.currentHz).toLocaleString()}/s`;
    const latencyStr =
      row.currentMeanMs < 1
        ? `${(row.currentMeanMs * 1000).toFixed(1)} µs`
        : `${row.currentMeanMs.toFixed(3)} ms`;

    let deltaStr = '—';
    if (row.baselineHz > 0) {
      const sign = row.deltaPercent > 0 ? '+' : '';
      deltaStr = `${sign}${row.deltaPercent.toFixed(1)}%`;
    }

    let statusBadge = '➖ Stable';
    if (row.status === 'faster') {
      statusBadge = '🚀 Faster';
    } else if (row.status === 'slower') {
      statusBadge = '⚠️ Slower';
    } else if (row.status === 'regression') {
      statusBadge = '🚨 **Regression**';
    }

    lines.push(
      `| **${row.group}** › ${row.name} | ${baselineStr} | ${currentStr} | ${latencyStr} | ${deltaStr} | ${statusBadge} |`,
    );
  }

  lines.push('');
  if (hasRegression) {
    lines.push(
      `> ⚠️ **Warning**: Performance regression detected exceeding the ${regressionThreshold}% threshold.`,
    );
  } else {
    lines.push(
      '> ✅ **Passed**: All benchmarks perform within expected variance thresholds.',
    );
  }

  return {
    rows,
    markdown: lines.join('\n'),
    hasRegression,
  };
}

// CLI Execution
if (process.argv[1]?.endsWith('bench-compare.ts')) {
  const args = process.argv.slice(2);
  const baseFile = args[0] || 'temp/bench-baseline.json';
  const currFile = args[1] || 'temp/bench-results.json';
  const outFile = args.find((a) => a.startsWith('--out='))?.split('=')[1];
  const thresholdArg = args
    .find((a) => a.startsWith('--threshold='))
    ?.split('=')[1];
  const threshold = thresholdArg ? parseInt(thresholdArg, 10) : 20;

  if (!fs.existsSync(baseFile)) {
    console.warn(`Baseline file not found: ${baseFile}. Skipping comparison.`);
    process.exit(0);
  }
  if (!fs.existsSync(currFile)) {
    console.error(`Current benchmark file not found: ${currFile}`);
    process.exit(1);
  }

  const { markdown, hasRegression } = compareBenchmarks(
    baseFile,
    currFile,
    threshold,
  );

  console.log(markdown);

  if (outFile) {
    fs.mkdirSync(path.dirname(path.resolve(process.cwd(), outFile)), {
      recursive: true,
    });
    fs.writeFileSync(path.resolve(process.cwd(), outFile), markdown, 'utf8');
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n${markdown}\n`);
  }

  if (hasRegression && process.argv.includes('--fail-on-regression')) {
    process.exit(1);
  }
}
