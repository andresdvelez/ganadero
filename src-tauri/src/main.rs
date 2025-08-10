#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{create_dir_all, File};
use std::io::{BufWriter, Write};
use std::process::{Child, Command, Stdio};
use tauri::Manager;
use tokio::time::sleep;

static SERVER_CHILD: tauri::async_runtime::Mutex<Option<Child>> = tauri::async_runtime::Mutex::const_new(None);

#[tauri::command]
async fn download_model(url: String, sha256_hex: Option<String>, app: tauri::AppHandle, window: tauri::Window) -> Result<String, String> {
  let dir = app.path_resolver().app_data_dir().ok_or("app_data_dir not found")?;
  let models_dir = dir.join("models");
  if let Err(e) = create_dir_all(&models_dir) { return Err(format!("cannot create models dir: {}", e)); }
  let filename = url.split('/').last().unwrap_or("model.gguf");
  let target = models_dir.join(filename);

  let client = reqwest::Client::new();
  let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
  let total = res.content_length().unwrap_or(0);
  let mut stream = res.bytes_stream();

  let file = File::create(&target).map_err(|e| e.to_string())?;
  let mut writer = BufWriter::new(file);
  let mut downloaded: u64 = 0;

  use futures_util::StreamExt;
  while let Some(chunk) = stream.next().await {
    let bytes = chunk.map_err(|e| e.to_string())?;
    writer.write_all(&bytes).map_err(|e| e.to_string())?;
    downloaded += bytes.len() as u64;
    let _ = window.emit("model-download-progress", serde_json::json!({"downloaded": downloaded, "total": total }));
  }
  writer.flush().map_err(|e| e.to_string())?;

  if let Some(expected) = sha256_hex {
    use sha2::{Digest, Sha256};
    use std::io::Read;
    let mut f = File::open(&target).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 8192];
    loop {
      let n = f.read(&mut buf).map_err(|e| e.to_string())?;
      if n == 0 { break; }
      hasher.update(&buf[..n]);
    }
    let got = hex::encode(hasher.finalize());
    if got.to_lowercase() != expected.to_lowercase() {
      return Err(format!("sha256 mismatch: got {}, expected {}", got, expected));
    }
  }

  Ok(target.to_string_lossy().into_owned())
}

#[tauri::command]
fn models_dir(app: tauri::AppHandle) -> Result<String, String> {
  let dir = app.path_resolver().app_data_dir().ok_or("app_data_dir not found")?;
  let md = dir.join("models");
  Ok(md.to_string_lossy().into_owned())
}

#[tauri::command]
async fn download_llama_binary(app: tauri::AppHandle) -> Result<String, String> {
  let dir = app.path_resolver().app_data_dir().ok_or("app_data_dir not found")?;
  let bin_dir = dir.join("bin");
  create_dir_all(&bin_dir).map_err(|e| e.to_string())?;

  // Fallback a un binario precompilado universal para macOS si no hay var
  let default_url = if cfg!(target_os = "macos") {
    "https://github.com/ggerganov/llama.cpp/releases/download/b3289/llama-server-macos-universal"
  } else if cfg!(target_os = "windows") {
    "https://github.com/ggerganov/llama.cpp/releases/download/b3289/llama-server.exe"
  } else {
    "https://github.com/ggerganov/llama.cpp/releases/download/b3289/llama-server"
  };
  let url = std::env::var("LLAMA_BINARY_URL").unwrap_or_else(|_| default_url.to_string());

  let filename = if cfg!(target_os = "windows") { "llama-server.exe" } else { "llama-server" };
  let target = bin_dir.join(filename);

  if target.exists() { return Ok(target.to_string_lossy().into_owned()); }

  let client = reqwest::Client::new();
  let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
  let bytes = res.bytes().await.map_err(|e| e.to_string())?;
  let mut f = File::create(&target).map_err(|e| e.to_string())?;
  f.write_all(&bytes).map_err(|e| e.to_string())?;

  #[cfg(unix)]
  {
    use std::os::unix::fs::PermissionsExt;
    let mut perms = std::fs::metadata(&target).map_err(|e| e.to_string())?.permissions();
    perms.set_mode(0o755);
    std::fs::set_permissions(&target, perms).map_err(|e| e.to_string())?;
  }

  Ok(target.to_string_lossy().into_owned())
}

#[tauri::command]
async fn start_llama_server(app: tauri::AppHandle, model_path: String, port: u16) -> Result<(), String> {
  let dir = app.path_resolver().app_data_dir().ok_or("app_data_dir not found")?;
  let bin = dir.join("bin").join(if cfg!(target_os = "windows") { "llama-server.exe" } else { "llama-server" });
  if !bin.exists() { return Err("Binario llama-server no encontrado. Ejecuta download_llama_binary".into()); }

  // detener si ya hay uno
  {
    let mut guard = SERVER_CHILD.lock().await;
    if let Some(child) = guard.as_mut() { let _ = child.kill(); }
    *guard = None;
  }

  let child = Command::new(bin)
    .arg("--model").arg(model_path)
    .arg("--port").arg(port.to_string())
    .arg("--no-webui")
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn()
    .map_err(|e| e.to_string())?;

  {
    let mut guard = SERVER_CHILD.lock().await;
    *guard = Some(child);
  }
  Ok(())
}

#[tauri::command]
async fn stop_llama_server() -> Result<(), String> {
  let mut guard = SERVER_CHILD.lock().await;
  if let Some(child) = guard.as_mut() {
    let _ = child.kill();
  }
  *guard = None;
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![download_model, models_dir, download_llama_binary, start_llama_server, stop_llama_server])
    .setup(|app| {
      // En desarrollo: no arrancar Next standalone; Tauri ya carga devPath
      if cfg!(debug_assertions) {
        return Ok(());
      }

      // Producción: lanzar servidor Next standalone
      let app_dir = app.path_resolver().resource_dir().ok_or("resource_dir not found")?;
      let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf())).unwrap_or(app_dir.clone());
      let candidate_paths = [
        exe_dir.join("..").join("..").join(".next").join("standalone").join("server.js"),
        exe_dir.join("..").join("Resources").join(".next").join("standalone").join("server.js"),
        // Some bundles place app assets under Resources/_up_
        exe_dir.join("..").join("Resources").join("_up_").join(".next").join("standalone").join("server.js"),
        app_dir.join(".next").join("standalone").join("server.js"),
        app_dir.join("_up_").join(".next").join("standalone").join("server.js"),
      ];
      let server_js = candidate_paths.iter().find(|p| p.exists()).cloned();

      let port = std::env::var("NEXT_PORT").ok().and_then(|s| s.parse::<u16>().ok()).unwrap_or(4317);

      let mut started = false;
      if let Some(srv) = server_js {
        // Preferir sidecar node si existe
        let node_path = app
          .path_resolver()
          .resolve_resource("sidecar/node")
          .or_else(|| app.path_resolver().resolve_resource("sidecar/node-x86_64-apple-darwin"))
          .or_else(|| app.path_resolver().resolve_resource("sidecar/node-aarch64-apple-darwin"))
          .or_else(|| app.path_resolver().resolve_resource("sidecar/node.exe"));

        // Fallback: binario node copiado por externalBin en Contents/MacOS
        let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf()));
        let node_in_macos = exe_dir.as_ref().map(|d| d.join("node"));

        // Primer intento: sidecar/node si está presente
        if let Some(node_bin) = node_path.or(node_in_macos.filter(|p| p.exists())) {
          let mut cmd = Command::new(node_bin);
          let sidecar_attempt = cmd
            .arg(&srv)
            .env("PORT", port.to_string())
            .env("ALLOW_DEV_UNAUTH", "1")
            .current_dir(srv.parent().unwrap_or(&app_dir))
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();

          match sidecar_attempt {
            Ok(child) => {
              tauri::async_runtime::block_on(async {
                let mut guard = SERVER_CHILD.lock().await;
                *guard = Some(child);
              });
              started = true;
            }
            Err(_e) => {
              // Segundo intento: usar 'node' del sistema
              if let Ok(child) = Command::new("node")
                .arg(&srv)
                .env("PORT", port.to_string())
                .env("ALLOW_DEV_UNAUTH", "1")
                .current_dir(srv.parent().unwrap_or(&app_dir))
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn() {
                tauri::async_runtime::block_on(async {
                  let mut guard = SERVER_CHILD.lock().await;
                  *guard = Some(child);
                });
                started = true;
              }
            }
          }
        } else {
          // No hay sidecar: intentar directamente con 'node' del sistema
          if let Ok(child) = Command::new("node")
            .arg(&srv)
            .env("PORT", port.to_string())
            .env("ALLOW_DEV_UNAUTH", "1")
            .current_dir(srv.parent().unwrap_or(&app_dir))
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn() {
            tauri::async_runtime::block_on(async {
              let mut guard = SERVER_CHILD.lock().await;
              *guard = Some(child);
            });
            started = true;
          }
        }
      }

      if let Some(win) = app.get_window("main") {
        let w = win.clone();
        tauri::async_runtime::spawn(async move {
          sleep(std::time::Duration::from_millis(600)).await;
          if started {
            let _ = w.eval(&format!("window.location.replace('http://127.0.0.1:{}')", port));
          } else {
            // Fallback remoto si no hay Node en el sistema
            let _ = w.eval("window.location.replace('https://ganadero-nine.vercel.app')");
          }
        });

        // Auto-descarga e inicio del servidor local de IA en segundo plano (primer arranque)
        let app_handle = app.app_handle();
        tauri::async_runtime::spawn(async move {
          // Configuración por variables de entorno (opcional)
          let model_url = std::env::var("NEXT_PUBLIC_MODEL_DOWNLOAD_URL").ok()
            .or(Some("https://huggingface.co/ganado/ollama/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q8_0.gguf?download=true".to_string()));
          let model_sha = std::env::var("NEXT_PUBLIC_MODEL_SHA256").ok();
          let llama_port: u16 = std::env::var("NEXT_PUBLIC_LLAMA_PORT").ok().and_then(|s| s.parse::<u16>().ok()).unwrap_or(11434);

          // Asegurar binario llama
          let _ = download_llama_binary(app_handle.clone()).await;

          // Determinar si ya existe un modelo
          let models_dir = app_handle.path_resolver().app_data_dir().map(|p| p.join("models"));
          let existing_model = models_dir.as_ref().and_then(|dir| std::fs::read_dir(dir).ok()).and_then(|mut rd| {
            rd.find_map(|e| e.ok()).and_then(|e| {
              let p = e.path();
              if p.extension().and_then(|s| s.to_str()).unwrap_or("") == "gguf" { Some(p) } else { None }
              })
          });

          let model_path_res = if let Some(p) = existing_model { Ok(p.to_string_lossy().into_owned()) } else if let Some(url) = model_url.clone() {
            download_model(url, model_sha.clone(), app_handle.clone(), app_handle.get_window("main").unwrap()).await
          } else { Err("no model url configured".to_string()) };

          if let Ok(model_path) = model_path_res {
            let _ = start_llama_server(app_handle.clone(), model_path, llama_port).await;
          }
        });

        win.on_window_event(|event| {
          if let tauri::WindowEvent::CloseRequested { .. } = event {
            tauri::async_runtime::block_on(async {
              let mut guard = SERVER_CHILD.lock().await;
              if let Some(child) = guard.as_mut() { let _ = child.kill(); }
              *guard = None;
            });
          }
        });
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
} 