#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const tauriIconsDir = path.join(projectRoot, "src-tauri", "icons");
const sourceImage = path.join(publicDir, "brand", "app-logo.jpeg");

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function fileExists(file) {
  try {
    await fs.promises.access(file, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function generateSquareBaseBuffer(inputPath, size = 1024) {
  // Recorta al centro y redimensiona a un cuadrado (iOS aplica el enmascarado de bordes)
  return await sharp(inputPath)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function writeIconFromBuffer(baseBuffer, outPath, size) {
  await sharp(baseBuffer)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`[icons] generado ${path.relative(projectRoot, outPath)} (${size}x${size})`);
}

async function main() {
  if (!(await fileExists(sourceImage))) {
    console.error(`[icons] No se encontró la imagen fuente: ${sourceImage}`);
    process.exit(1);
  }

  await ensureDir(publicDir);
  await ensureDir(tauriIconsDir);

  // Base 1024x1024 a partir del centro (buffer en memoria para evitar clone())
  const baseBuffer = await generateSquareBaseBuffer(sourceImage, 1024);

  // Public PWA icons (mantener rutas ya usadas por la app)
  const icon192 = path.join(publicDir, "icon-192.png");
  const icon384 = path.join(publicDir, "icon-384.png");
  const icon512 = path.join(publicDir, "icon-512.png");
  await writeIconFromBuffer(baseBuffer, icon192, 192);
  await writeIconFromBuffer(baseBuffer, icon384, 384);
  await writeIconFromBuffer(baseBuffer, icon512, 512);

  // Apple touch icon adicional (no rompe nada si no se usa)
  const appleTouch = path.join(publicDir, "apple-touch-icon.png");
  await writeIconFromBuffer(baseBuffer, appleTouch, 180);

  // Tauri icon base 1024x1024
  const tauriIcon = path.join(tauriIconsDir, "icon.png");
  await sharp(baseBuffer).png().toFile(tauriIcon);
  console.log(`[icons] generado ${path.relative(projectRoot, tauriIcon)} (1024x1024)`);
}

main().catch((err) => {
  console.error("[icons] Error:", err);
  process.exit(1);
});


