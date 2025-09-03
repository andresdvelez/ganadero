#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { execFile } from "child_process";

const projectRoot = process.cwd();
const iconsDir = path.join(projectRoot, "src-tauri", "icons");
const basePng = path.join(iconsDir, "icon.png");
const iconsetDir = path.join(iconsDir, "app.iconset");
const icnsOut = path.join(iconsDir, "icon.icns");

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function writePng(name, size) {
  const out = path.join(iconsetDir, name);
  await sharp(basePng)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`[icns] ${name} (${size}x${size})`);
}

function runIconutil() {
  return new Promise((resolve, reject) => {
    execFile(
      "iconutil",
      ["-c", "icns", iconsetDir, "-o", icnsOut],
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr?.toString() || err.message));
        resolve(stdout?.toString() || "");
      }
    );
  });
}

async function main() {
  if (!fs.existsSync(basePng)) {
    console.error(`[icns] No existe base ${basePng}`);
    process.exit(1);
  }
  await ensureDir(iconsetDir);
  const entries = [
    ["icon_16x16.png", 16],
    ["icon_16x16@2x.png", 32],
    ["icon_32x32.png", 32],
    ["icon_32x32@2x.png", 64],
    ["icon_128x128.png", 128],
    ["icon_128x128@2x.png", 256],
    ["icon_256x256.png", 256],
    ["icon_256x256@2x.png", 512],
    ["icon_512x512.png", 512],
    ["icon_512x512@2x.png", 1024],
  ];
  for (const [name, size] of entries) {
    // eslint-disable-next-line no-await-in-loop
    await writePng(name, size);
  }
  await runIconutil();
  console.log(`[icns] generado ${path.relative(projectRoot, icnsOut)}`);
  // Limpieza: borrar el iconset temporal
  await fs.promises.rm(iconsetDir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error("[icns] Error:", e.message || e);
  process.exit(1);
});


