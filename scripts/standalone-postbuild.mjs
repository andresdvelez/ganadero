#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const srcStatic = path.join(root, ".next", "static");
const dstStatic = path.join(root, ".next", "standalone", ".next", "static");
const srcPublic = path.join(root, "public");
const dstPublic = path.join(root, ".next", "standalone", "public");

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
