#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd());
const appDir = path.join(projectRoot, 'src', 'app');
const publicDir = path.join(projectRoot, 'public');
const tauriDistDir = path.join(projectRoot, 'src-tauri', 'dist');

const entriesToMove = [
  'api',
  'middleware.ts',
  'animals',
  'breeding',
  'health',
  'inventory',
  'lab',
  'milk',
  'pastures',
  'sign-in',
  'sign-up',
  'offline',
];

function moveIfExists(fromRel, toRel) {
  const from = path.join(appDir, fromRel);
  const to = path.join(appDir, toRel);
  if (fs.existsSync(from)) {
    // Asegurar carpeta destino
    const toDir = path.dirname(to);
    fs.mkdirSync(toDir, { recursive: true });
    fs.renameSync(from, to);
    console.log(`[prebuild] Moved ${fromRel} -> ${toRel}`);
  }
}

if (process.env.TAURI !== '1' && process.env.TAURI !== 'true') {
  console.log('[prebuild] TAURI env not set, skipping');
  process.exit(0);
}

moveIfExists('api', '_api_bak');
moveIfExists('middleware.ts', '_middleware_bak.ts');
for (const name of entriesToMove) {
  if (name !== 'api' && name !== 'middleware.ts') {
    moveIfExists(name, `_${name}_bak`);
  }
} 

// Copiar logo y recursos necesarios a dist para la splash offline
try {
  fs.mkdirSync(tauriDistDir, { recursive: true });
  const logoSrc = path.join(publicDir, 'logo.png');
  const logoDst = path.join(tauriDistDir, 'logo.png');
  if (fs.existsSync(logoSrc)) {
    fs.copyFileSync(logoSrc, logoDst);
    console.log('[prebuild] Copied public/logo.png -> src-tauri/dist/logo.png');
  }
} catch (e) {
  console.warn('[prebuild] Could not copy splash assets:', e?.message || e);
}