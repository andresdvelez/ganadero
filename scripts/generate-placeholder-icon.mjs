#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";

const projectRoot = process.cwd();
const iconsDir = path.join(projectRoot, "src-tauri", "icons");
const iconPng = path.join(iconsDir, "icon.png");

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function isLikelyValidPng(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (buf.length < 8) return false;
    const sig = buf.slice(0, 8).toString("hex");
    return sig === "89504e470d0a1a0a" && buf.length > 1024; // >1KB heurística
  } catch {
    return false;
  }
}

async function generatePlaceholderIcon() {
  await ensureDir(iconsDir);
  const shouldGenerate = !isLikelyValidPng(iconPng);
  if (!shouldGenerate) {
    console.log("[icon] icon.png existente y válido, no se regenera");
    return;
  }
  const width = 1024;
  const height = 1024;
  const background = { r: 107, g: 70, b: 193, alpha: 1 }; // violeta
  const img = sharp({
    create: {
      width,
      height,
      channels: 4,
      background,
    },
  });
  await img.png().toFile(iconPng);
  console.log(
    "[icon] Generado placeholder src-tauri/icons/icon.png (1024x1024)"
  );
}

generatePlaceholderIcon().catch((err) => {
  console.error("[icon] Error generando icono:", err);
  process.exit(1);
});
