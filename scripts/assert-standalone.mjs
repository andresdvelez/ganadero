#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const standaloneServer = path.join(root, '.next', 'standalone', 'server.js');
const staticDir = path.join(root, '.next', 'static');

function fail(msg) {
  console.error(`[assert-standalone] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(standaloneServer)) {
  fail('No se encontró .next/standalone/server.js. Asegúrate de ejecutar `next build` sin errores.');
}
if (!fs.existsSync(staticDir)) {
  fail('No se encontró .next/static. Revisa el build de Next.');
}

console.log('[assert-standalone] OK: server.js y static presentes');


