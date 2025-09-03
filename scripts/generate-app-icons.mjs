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

async function generateSquareBaseBuffer(inputPath, size = 1024, zoom = 1.4) {
  // Recorta al centro con zoom adicional y redimensiona a cuadrado
  const meta = await sharp(inputPath).metadata();
  const minSide = Math.min(meta.width || size, meta.height || size);
  const cropSide = Math.max(1, Math.floor(minSide / zoom));
  const left = Math.max(0, Math.floor(((meta.width || cropSide) - cropSide) / 2));
  const top = Math.max(0, Math.floor(((meta.height || cropSide) - cropSide) / 2));
  return await sharp(inputPath)
    .extract({ left, top, width: cropSide, height: cropSide })
    .resize(size, size)
    .png()
    .toBuffer();
}

async function applyRoundedCorners(baseBuffer, size, radiusRatio = 0.2) {
  const radius = Math.round(size * radiusRatio);
  const svg = `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`;
  return await sharp(baseBuffer)
    .composite([{ input: Buffer.from(svg), blend: "dest-in" }])
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

  // Base 1024x1024 a partir del centro con zoom para hacer el ícono más protagonista
  const baseBuffer = await generateSquareBaseBuffer(sourceImage, 1024, 1.45);

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

  // Tauri icon base 1024x1024 con esquinas redondeadas (macOS/Windows no aplican máscara automática)
  const tauriIcon = path.join(tauriIconsDir, "icon.png");
  const rounded1024 = await applyRoundedCorners(baseBuffer, 1024, 0.22);
  await sharp(rounded1024).png().toFile(tauriIcon);
  console.log(`[icons] generado ${path.relative(projectRoot, tauriIcon)} (1024x1024)`);
}

main().catch((err) => {
  console.error("[icons] Error:", err);
  process.exit(1);
});


