#!/usr/bin/env node
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

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

function downloadNodeDarwin(archLabel /* 'arm64' | 'x64' */) {
  const version = process.version.replace(/^v/, "");
  const url = `https://nodejs.org/dist/v${version}/node-v${version}-darwin-${archLabel}.tar.gz`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `node-${archLabel}-`));
  const tgz = path.join(tmp, `node-${archLabel}.tar.gz`);
  console.log(
    `[prepare-node-sidecar] Descargando Node ${version} ${archLabel} desde ${url}`
  );
  execSync(`curl -fsSL ${url} -o ${tgz}`, { stdio: "inherit" });
  execSync(`tar -xzf ${tgz} -C ${tmp}`, { stdio: "inherit" });
  const extractedDir = fs
    .readdirSync(tmp)
    .map((f) => path.join(tmp, f))
    .find(
      (p) => fs.statSync(p).isDirectory() && /node-v/.test(path.basename(p))
    );
  if (!extractedDir) throw new Error("No se pudo extraer Node descargado");
  const nodeBin = path.join(extractedDir, "bin", "node");
  if (!fs.existsSync(nodeBin))
    throw new Error("Binario node no encontrado tras extracción");
  return nodeBin;
}

(function main() {
  const { triple, ext } = getTargetTriple();
  const projectRoot = process.cwd();
  const sidecarDir = path.join(projectRoot, "src-tauri", "sidecar");
  ensureDir(sidecarDir);

  const nodeSrc = process.execPath; // ejecutable de Node actual
  const nodeBase = `node-${triple}${ext}`;
  const nodeDst = path.join(sidecarDir, nodeBase);
  const nodePlain = path.join(sidecarDir, `node${ext}`);

  // Copia con sufijo por triple (host)
  if (fs.existsSync(nodeDst)) {
    console.log(`[prepare-node-sidecar] Ya existe ${nodeBase}, omitiendo.`);
  } else {
    console.log(`[prepare-node-sidecar] Copiando ${nodeSrc} -> ${nodeDst}`);
    copyFile(nodeSrc, nodeDst);
    console.log(`[prepare-node-sidecar] Listo: ${nodeBase}`);
  }

  // Si estamos en macOS, también preparar el binario de la otra arquitectura para Universal 2
  let armNodePath = null;
  let x64NodePath = null;
  if (process.platform === "darwin") {
    const otherArch = process.arch === "arm64" ? "x64" : "arm64";
    const otherTriple =
      otherArch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
    const otherDst = path.join(sidecarDir, `node-${otherTriple}`);

    // Rutas de ambos
    armNodePath = path.join(sidecarDir, "node-aarch64-apple-darwin");
    x64NodePath = path.join(sidecarDir, "node-x86_64-apple-darwin");

    if (!fs.existsSync(otherDst)) {
      try {
        const downloadedNode = downloadNodeDarwin(otherArch);
        console.log(
          `[prepare-node-sidecar] Copiando ${downloadedNode} -> ${otherDst}`
        );
        copyFile(downloadedNode, otherDst);
      } catch (e) {
        console.error(
          `[prepare-node-sidecar] Error preparando Node ${otherArch} para Universal:`,
          e
        );
        process.exit(1);
      }
    } else {
      console.log(
        `[prepare-node-sidecar] Ya existe ${path.basename(
          otherDst
        )}, omitiendo.`
      );
    }

    // Crear binario universal combinando ambos
    const universalOut = path.join(sidecarDir, "node-universal-apple-darwin");
    try {
      if (!fs.existsSync(armNodePath) || !fs.existsSync(x64NodePath)) {
        throw new Error(
          "Faltan uno o ambos binarios arm64/x86_64 para crear universal"
        );
      }
      console.log(
        `[prepare-node-sidecar] Creando binario universal con lipo -> ${universalOut}`
      );
      execSync(
        `lipo -create -output "${universalOut}" "${armNodePath}" "${x64NodePath}"`,
        { stdio: "inherit" }
      );
      fs.chmodSync(universalOut, 0o755);
    } catch (e) {
      console.error(
        `[prepare-node-sidecar] No se pudo crear node-universal-apple-darwin:`,
        e
      );
      process.exit(1);
    }
  }

  // Copia también como nombre genérico esperado por Tauri (externalBin) y runtime
  console.log(`[prepare-node-sidecar] Asegurando sidecar/node${ext}`);
  copyFile(nodeSrc, nodePlain);
})();
