#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { encode as encodeICO } from "@fiahfy/ico";
import { encode as encodeICNS } from "@fiahfy/icns";

const projectRoot = process.cwd();
const iconsDir = path.join(projectRoot, "src-tauri", "icons");
const basePng = path.join(iconsDir, "icon.png");

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function toPngBuffer(size) {
  const buffer = await sharp(basePng)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return buffer;
}

async function writeFile(target, buffer) {
  await fs.promises.writeFile(target, buffer);
  console.log(`[tauri-icons] escrito ${path.relative(projectRoot, target)}`);
}

async function generatePngs() {
  const map = [
    [32, path.join(iconsDir, "32x32.png")],
    [128, path.join(iconsDir, "128x128.png")],
    [256, path.join(iconsDir, "128x128@2x.png")],
  ];
  for (const [size, outPath] of map) {
    const buf = await toPngBuffer(size);
    await writeFile(outPath, buf);
  }
}

async function generateICO() {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = [];
  for (const s of sizes) {
    const data = await toPngBuffer(s);
    images.push({ data, width: s, height: s });
  }
  const ico = await encodeICO(images);
  await writeFile(path.join(iconsDir, "icon.ico"), ico);
}

async function generateICNS() {
  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  const images = [];
  for (const s of sizes) {
    const data = await toPngBuffer(s);
    images.push({ data, width: s, height: s, format: "png" });
  }
  const icns = await encodeICNS(images);
  await writeFile(path.join(iconsDir, "icon.icns"), icns);
}

async function main() {
  await ensureDir(iconsDir);
  if (!fs.existsSync(basePng)) {
    console.error(`[tauri-icons] No se encontró base ${basePng}. Genérala primero.`);
    process.exit(1);
  }
  await generatePngs();
  await Promise.all([generateICO(), generateICNS()]);
}

main().catch((e) => {
  console.error("[tauri-icons] Error:", e);
  process.exit(1);
});


