#!/usr/bin/env node
import fs from "fs";
import path from "path";

function getTargetTriple() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "darwin") {
    if (arch === "arm64") return { triple: "aarch64-apple-darwin", ext: "" };
    if (arch === "x64") return { triple: "x86_64-apple-darwin", ext: "" };
  } else if (platform === "win32") {
    if (arch === "x64")
      return { triple: "x86_64-pc-windows-msvc", ext: ".exe" };
    if (arch === "arm64")
      return { triple: "aarch64-pc-windows-msvc", ext: ".exe" };
  } else if (platform === "linux") {
    if (arch === "x64") return { triple: "x86_64-unknown-linux-gnu", ext: "" };
    if (arch === "arm64")
      return { triple: "aarch64-unknown-linux-gnu", ext: "" };
  }
  throw new Error(`Plataforma/arquitectura no soportada: ${platform} ${arch}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dst) {
  fs.copyFileSync(src, dst);
  if (process.platform !== "win32") {
    fs.chmodSync(dst, 0o755);
  }
}

(function main() {
  const { triple, ext } = getTargetTriple();
  const projectRoot = process.cwd();
  const sidecarDir = path.join(projectRoot, "src-tauri", "sidecar");
  ensureDir(sidecarDir);

  const nodeSrc = process.execPath; // ejecutable de Node actual
  const nodeBase = `node-${triple}${ext}`;
  const nodeDst = path.join(sidecarDir, nodeBase);

  if (fs.existsSync(nodeDst)) {
    console.log(`[prepare-node-sidecar] Ya existe ${nodeBase}, omitiendo.`);
    return;
  }

  console.log(`[prepare-node-sidecar] Copiando ${nodeSrc} -> ${nodeDst}`);
  copyFile(nodeSrc, nodeDst);
  console.log(`[prepare-node-sidecar] Listo: ${nodeBase}`);
})();
