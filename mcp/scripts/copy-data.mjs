#!/usr/bin/env node
// tsc only emits .ts — carry the bundled index over to build/ alongside it.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(ROOT, 'build/data'), { recursive: true });
copyFileSync(join(ROOT, 'src/data/index.json'), join(ROOT, 'build/data/index.json'));
console.log('copied src/data/index.json -> build/data/index.json');
