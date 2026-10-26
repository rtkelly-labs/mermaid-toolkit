#!/usr/bin/env node
import { runCli } from '../dist/cli.mjs';

runCli().then((code) => {
  process.exit(code);
});
