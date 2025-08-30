#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const srcStatic = path.join(root, ".next", "static");
const dstStatic = path.join(root, ".next", "standalone", ".next", "static");
const srcPublic = path.join(root, "public");
const dstPublic = path.join(root, ".next", "standalone", "public");

// Copia adicional para Tauri: colocar .next dentro de src-tauri/resources/.next
const tauriResources = path.join(root, "src-tauri", "resources");
const dstResourcesNext = path.join(tauriResources, ".next");
const dstResourcesStandalone = path.join(dstResourcesNext, "standalone");
const dstResourcesStatic = path.join(dstResourcesNext, "static");

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dst, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyDir(srcStatic, dstStatic);
copyDir(srcPublic, dstPublic);

console.log(
  "[standalone-postbuild] Copiado .next/static y public dentro de .next/standalone"
);

// Asegurar recursos empaquetados dentro del .app de Tauri en ruta estable (/Contents/Resources/.next)
try {
  // Limpiar destino previo para evitar residuos
  if (fs.existsSync(dstResourcesStandalone)) {
    fs.rmSync(dstResourcesStandalone, { recursive: true, force: true });
  }
  if (fs.existsSync(dstResourcesStatic)) {
    fs.rmSync(dstResourcesStatic, { recursive: true, force: true });
  }
  fs.mkdirSync(dstResourcesStandalone, { recursive: true });
  fs.mkdirSync(dstResourcesStatic, { recursive: true });

  // Copiar standalone completo
  const srcStandaloneRoot = path.join(root, ".next", "standalone");
  copyDir(srcStandaloneRoot, dstResourcesStandalone);
  // Copiar static
  copyDir(srcStatic, dstResourcesStatic);
  console.log("[standalone-postbuild] Copiado .next/{standalone,static} a src-tauri/resources/.next/");
} catch (e) {
  console.warn("[standalone-postbuild] Error copiando recursos a src-tauri/resources:", e?.message || e);
}
