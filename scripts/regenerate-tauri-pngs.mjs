#!/usr/bin/env node
import path from "path";
import fs from "fs";
import sharp from "sharp";

const projectRoot = process.cwd();
const iconsDir = path.join(projectRoot, "src-tauri", "icons");
const basePng = path.join(iconsDir, "icon.png");

async function ensureDir(dir){
  await fs.promises.mkdir(dir, { recursive: true });
}

async function writeSize(size, filename){
  const out = path.join(iconsDir, filename);
  await sharp(basePng)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`[tauri-pngs] ${filename} (${size}x${size})`);
}

async function main(){
  await ensureDir(iconsDir);
  if(!fs.existsSync(basePng)){
    console.error(`[tauri-pngs] No existe ${basePng}`);
    process.exit(1);
  }
  await writeSize(32, "32x32.png");
  await writeSize(128, "128x128.png");
  await writeSize(256, "128x128@2x.png");
}

main().catch((e)=>{ console.error("[tauri-pngs] Error:", e); process.exit(1); });


