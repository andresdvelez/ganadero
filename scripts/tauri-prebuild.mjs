#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd());
const appDir = path.join(projectRoot, 'src', 'app');
const publicDir = path.join(projectRoot, 'public');
const tauriDistDir = path.join(projectRoot, 'src-tauri', 'dist');
const tauriModelsDir = path.join(projectRoot, 'src-tauri', 'models');

// Ya no movemos rutas fuera antes del build. Mantener todo dentro para que Next standalone
// incluya API, auth y páginas offline en el paquete de Tauri.
const entriesToMove = [];

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

// Mantener las rutas; no hacer renombres para Tauri

// Copiar recursos necesarios a dist para la splash offline
try {
  fs.mkdirSync(tauriDistDir, { recursive: true });
  fs.mkdirSync(tauriModelsDir, { recursive: true });
  const splashSrc = path.join(publicDir, 'brand', 'splash-screen.jpeg');
  const splashDst = path.join(tauriDistDir, 'splash-screen.jpeg');
  if (fs.existsSync(splashSrc)) {
    fs.copyFileSync(splashSrc, splashDst);
    console.log('[prebuild] Copied public/brand/splash-screen.jpeg -> src-tauri/dist/splash-screen.jpeg');
  }
} catch (e) {
  console.warn('[prebuild] Could not copy splash assets:', e?.message || e);
}

// Copiar archivo .env preferido para que Prisma/Next standalone lo lean en runtime del bundle
try {
  const candidates = [
    path.join(projectRoot, '.env.tauri.local'),
    path.join(projectRoot, '.env.tauri'),
    path.join(projectRoot, '.env.production.local'),
    path.join(projectRoot, '.env.production'),
    path.join(projectRoot, '.env'),
  ];
  const envSrc = candidates.find((p) => fs.existsSync(p));
  const tauriRoot = path.join(projectRoot, 'src-tauri');
  const standaloneDir = path.join(tauriRoot, '.next', 'standalone');
  if (envSrc) {
    fs.mkdirSync(standaloneDir, { recursive: true });
    const envDst1 = path.join(tauriRoot, '.env');
    const envDst2 = path.join(standaloneDir, '.env');
    fs.copyFileSync(envSrc, envDst1);
    fs.copyFileSync(envSrc, envDst2);
    console.log(`[prebuild] Copied ${path.basename(envSrc)} -> src-tauri/.env and src-tauri/.next/standalone/.env`);
  } else {
    console.log('[prebuild] No .env candidate found; skipping copy');
  }
} catch (e) {
  console.warn('[prebuild] Could not copy env file:', e?.message || e);
}