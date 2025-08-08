#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd());
const appDir = path.join(projectRoot, 'src', 'app');

const backups = [
  ['_api_bak', 'api'],
  ['_middleware_bak.ts', 'middleware.ts'],
  ['_animals_bak', 'animals'],
  ['_breeding_bak', 'breeding'],
  ['_health_bak', 'health'],
  ['_inventory_bak', 'inventory'],
  ['_lab_bak', 'lab'],
  ['_milk_bak', 'milk'],
  ['_pastures_bak', 'pastures'],
  ['_sign-in_bak', 'sign-in'],
  ['_sign-up_bak', 'sign-up'],
  ['_offline_bak', 'offline'],
];

function moveBack(fromRel, toRel) {
  const from = path.join(appDir, fromRel);
  const to = path.join(appDir, toRel);
  if (fs.existsSync(from)) {
    const toDir = path.dirname(to);
    fs.mkdirSync(toDir, { recursive: true });
    fs.renameSync(from, to);
    console.log(`[postbuild] Restored ${fromRel} -> ${toRel}`);
  }
}

if (process.env.TAURI !== '1' && process.env.TAURI !== 'true') {
  console.log('[postbuild] TAURI env not set, skipping');
  process.exit(0);
}

for (const [from, to] of backups) moveBack(from, to); 