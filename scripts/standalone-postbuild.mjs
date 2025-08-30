#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const srcStatic = path.join(root, ".next", "static");
const dstStatic = path.join(root, ".next", "standalone", ".next", "static");
const srcPublic = path.join(root, "public");
const dstPublic = path.join(root, ".next", "standalone", "public");

// Copia adicional para Tauri: colocar .next dentro de src-tauri/.next (irá a Contents/Resources/.next)
const tauriRoot = path.join(root, "src-tauri");
const dstBundleNext = path.join(tauriRoot, ".next");
const dstBundleStandalone = path.join(dstBundleNext, "standalone");
const dstBundleStatic = path.join(dstBundleNext, "static");

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
  if (fs.existsSync(dstBundleStandalone)) {
    fs.rmSync(dstBundleStandalone, { recursive: true, force: true });
  }
  if (fs.existsSync(dstBundleStatic)) {
    fs.rmSync(dstBundleStatic, { recursive: true, force: true });
  }
  fs.mkdirSync(dstBundleStandalone, { recursive: true });
  fs.mkdirSync(dstBundleStatic, { recursive: true });

  // Copiar standalone completo
  const srcStandaloneRoot = path.join(root, ".next", "standalone");
  copyDir(srcStandaloneRoot, dstBundleStandalone);
  // Copiar static
  copyDir(srcStatic, dstBundleStatic);
  console.log("[standalone-postbuild] Copiado .next/{standalone,static} a src-tauri/.next/");
} catch (e) {
  console.warn("[standalone-postbuild] Error copiando recursos a src-tauri/.next:", e?.message || e);
}
