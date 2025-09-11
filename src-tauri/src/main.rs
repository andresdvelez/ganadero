#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{create_dir_all, File, OpenOptions};
use std::io::{BufWriter, Write};
use std::process::{Child, Command, Stdio};
use std::net::TcpStream;
use tauri::Manager;
use tokio::time::sleep;
use std::time::Duration;

static SERVER_CHILD: tauri::async_runtime::Mutex<Option<Child>> = tauri::async_runtime::Mutex::const_new(None);
static OLLAMA_CHILD: tauri::async_runtime::Mutex<Option<Child>> = tauri::async_runtime::Mutex::const_new(None);

fn load_env_from_file(path: &std::path::Path) -> std::collections::HashMap<String, String> {
  let mut map = std::collections::HashMap::new();
  if !path.exists() { return map; }
  if let Ok(content) = std::fs::read_to_string(path) {
    for line in content.lines() {
      let trimmed = line.trim();
      if trimmed.is_empty() || trimmed.starts_with('#') { continue; }
      if let Some(idx) = trimmed.find('=') {
        let (k, vraw) = trimmed.split_at(idx);
        let v = &vraw[1..];
        let val = v.trim().trim_matches('"').trim_matches('\'');
        map.insert(k.trim().to_string(), val.to_string());
      }
    }
  }
  map
}

#[tauri::command]
async fn download_model(url: String, sha256_hex: Option<String>, app: tauri::AppHandle, window: tauri::Window) -> Result<String, String> {
  let dir = app.path_resolver().app_data_dir().ok_or("app_data_dir not found")?;
  let models_dir = dir.join("models");
  if let Err(e) = create_dir_all(&models_dir) { return Err(format!("cannot create models dir: {}", e)); }
  let last_seg = url.split('/').last().unwrap_or("model.gguf");
  let no_query = last_seg.split('?').next().unwrap_or(last_seg);
  let no_fragment = no_query.split('#').next().unwrap_or(no_query);
  let filename = if no_fragment.is_empty() { "model.gguf" } else { no_fragment };
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

  // Validación rápida de tamaño (evitar archivos de pocos bytes o incompletos)
  if let Ok(meta) = std::fs::metadata(&target) {
    if meta.len() < 100 * 1024 * 1024 { // < 100MB se considera inválido para modelos GGUF
      return Err(format!("downloaded file too small ({} bytes)", meta.len()));
    }
  }

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

  // Validar tamaño mínimo para evitar descargas corruptas
  if let Ok(meta) = std::fs::metadata(&target) {
    if meta.len() < 100 * 1024 { // <100KB improbable para un binario válido
      return Err("downloaded llama-server seems corrupted (too small)".into());
    }
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

#[tauri::command]
fn find_available_model(app: tauri::AppHandle) -> Result<String, String> {
  // Escanear varias ubicaciones y elegir el .gguf de MAYOR tamaño
  let mut candidates: Vec<std::path::PathBuf> = Vec::new();
  if let Some(dir) = app.path_resolver().app_data_dir() {
    candidates.push(dir.join("models"));
  }
  if let Some(rd) = app.path_resolver().resource_dir() {
    candidates.push(rd.join("models"));
  }
  if cfg!(debug_assertions) {
    if let Ok(cwd) = std::env::current_dir() {
      candidates.push(cwd.join("src-tauri").join("models"));
    }
  }

  let mut best: Option<(u64, std::path::PathBuf)> = None;
  for dir in candidates {
    if let Ok(rd) = std::fs::read_dir(&dir) {
      for entry in rd.flatten() {
        let p = entry.path();
        if p.extension().and_then(|s| s.to_str()).unwrap_or("") == "gguf" {
          if let Ok(meta) = std::fs::metadata(&p) {
            let sz = meta.len();
            if best.as_ref().map(|(b, _)| sz > *b).unwrap_or(true) {
              best = Some((sz, p));
            }
          }
        }
      }
    }
  }

  if let Some((_, path)) = best { return Ok(path.to_string_lossy().into_owned()); }
  Err("no local model found".into())
}

#[tauri::command]
async fn start_ollama_server(app: tauri::AppHandle, port: u16) -> Result<(), String> {
  // Preparar archivo de log persistente
  let data_dir = app.path_resolver().app_data_dir().ok_or("app_data_dir not found")?;
  let logs_dir = data_dir.join("logs");
  let _ = std::fs::create_dir_all(&logs_dir);
  let log_path = logs_dir.join("ollama.log");
  let mut logf = OpenOptions::new().create(true).append(true).open(&log_path).map_err(|e| e.to_string())?;
  let _ = writeln!(logf, "[tauri] start_ollama_server: inicio puerto {}", port);
  // Enviar evento para UI de splash
  let _ = app.emit_all("boot-log", format!("[tauri] start_ollama_server puerto {}", port));
  // Chequeo previo: si ya responde /api/tags en este puerto, no hacer nada
  let pre_client = reqwest::Client::builder()
    .timeout(Duration::from_millis(800))
    .build()
    .map_err(|e| e.to_string())?;
  let pre_url = format!("http://127.0.0.1:{}/api/tags", port);
  if let Ok(resp) = pre_client.get(&pre_url).send().await {
    if resp.status().is_success() {
      let _ = writeln!(logf, "[tauri] start_ollama_server: ya estaba listo en {}", pre_url);
      let _ = app.emit_all("boot-log", format!("[tauri] ollama ya listo en {}", pre_url));
      return Ok(());
    }
  }
  // detener si ya hay uno
  {
    let mut guard = OLLAMA_CHILD.lock().await;
    if let Some(child) = guard.as_mut() { let _ = child.kill(); }
    *guard = None;
  }

  // Resolver binario de Ollama: OLLAMA_BIN, PATH, rutas comunes y binario empaquetado en Resources
  let candidate_env = std::env::var("OLLAMA_BIN").ok();
  let mut candidates = vec![
    candidate_env.clone().unwrap_or_else(|| "ollama".to_string()),
    "/opt/homebrew/bin/ollama".to_string(),
    "/usr/local/bin/ollama".to_string(),
    "/usr/bin/ollama".to_string(),
  ];
  // Añadir binario empaquetado: si existe comprimido (bin/ollama.gz), descomprimir a app_data/bin y usarlo
  if let Some(res_gz) = app.path_resolver().resolve_resource("bin/ollama.gz") {
    if res_gz.exists() {
      let app_bin_dir = data_dir.join("bin");
      let _ = std::fs::create_dir_all(&app_bin_dir);
      let target = app_bin_dir.join("ollama");
      if !target.exists() {
        if let Ok(bytes) = std::fs::read(&res_gz) {
          // Descomprimir gzip en memoria
          use std::io::Read;
          let mut gz = flate2::read::GzDecoder::new(&bytes[..]);
          let mut out: Vec<u8> = Vec::new();
          if gz.read_to_end(&mut out).is_ok() {
            if std::fs::write(&target, &out).is_ok() {
              #[cfg(unix)]
              {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(mut perms) = std::fs::metadata(&target).map(|m| m.permissions()) {
                  perms.set_mode(0o755);
                  let _ = std::fs::set_permissions(&target, perms);
                }
              }
            }
          }
        }
      }
      if target.exists() { candidates.push(target.to_string_lossy().into_owned()); }
    }
  }
  if let Some(res_bin) = app.path_resolver().resolve_resource("bin/ollama.exe") {
    if res_bin.exists() { candidates.push(res_bin.to_string_lossy().into_owned()); }
  }
  // Agregar candidatos dentro de la app Ollama (macOS)
  #[cfg(target_os = "macos")]
  {
    let home = std::env::var("HOME").unwrap_or_default();
    candidates.push("/Applications/Ollama.app/Contents/MacOS/ollama".to_string());
    if !home.is_empty() {
      candidates.push(format!("{}/Applications/Ollama.app/Contents/MacOS/ollama", home));
    }
  }

  let client = reqwest::Client::builder()
    .timeout(Duration::from_millis(800))
    .build()
    .map_err(|e| e.to_string())?;
  let url = format!("http://127.0.0.1:{}/api/tags", port);

  let mut last_err: Option<String> = None;
  let _ = writeln!(logf, "[tauri] start_ollama_server: candidatos {:?}", candidates);
  let _ = app.emit_all("boot-log", format!("[tauri] candidatos ollama: {:?}", candidates));
  // Directorio de modelos privado de la app para evitar corrupciones en ~/.ollama
  let app_models_root = data_dir.join("ollama-store");
  let _ = std::fs::create_dir_all(&app_models_root);
  for bin in candidates.clone() {
    let _ = writeln!(logf, "[tauri] intentando lanzar '{} serve'", bin);
    let mut cmd = Command::new(&bin);
    // Redirigir stdout/err al log para diagnósticos
    let out = OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap());
    let err = OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap());
    // Importante: OLLAMA_ORIGINS debe ir separado por comas, no por espacios,
    // para que Gin CORS no lo interprete como un único patrón y falle con
    // "only one * is allowed".
    let allowed_origins = "app://*,file://*,tauri://*,http://localhost,https://localhost,http://127.0.0.1,https://127.0.0.1";
    cmd.env("OLLAMA_HOST", format!("127.0.0.1:{}", port))
      .env("OLLAMA_MODELS", &app_models_root)
      .env("OLLAMA_ORIGINS", allowed_origins)
      .arg("serve")
      .stdout(Stdio::from(out))
      .stderr(Stdio::from(err));

    match cmd.spawn() {
      Ok(child) => {
        {
          let mut guard = OLLAMA_CHILD.lock().await;
          *guard = Some(child);
        }
        // Esperar readiness del endpoint /api/tags
        let mut ready = false;
        for _ in 0..120 { // ~24s
          if let Ok(resp) = client.get(&url).send().await {
            if resp.status().is_success() { ready = true; break; }
          }
          sleep(Duration::from_millis(200)).await;
        }
        if ready {
          let _ = writeln!(logf, "[tauri] ollama listo en {}", url);
          let _ = app.emit_all("boot-log", format!("[tauri] ollama listo en {}", url));
          return Ok(());
        }
        last_err = Some("ollama serve did not become ready".into());
        // Si no estuvo listo, matar e intentar siguiente candidato
        let mut guard = OLLAMA_CHILD.lock().await;
        if let Some(child) = guard.as_mut() { let _ = child.kill(); }
        *guard = None;
      },
      Err(e) => {
        let _ = writeln!(logf, "[tauri] fallo al ejecutar '{}': {}", bin, e);
        let _ = app.emit_all("boot-log", format!("[tauri] fallo al ejecutar '{}': {}", bin, e));
        last_err = Some(format!("{}", e));
      }
    }
  }
  
  // Fallback: en macOS, intentar abrir la app Ollama y esperar readiness
  #[cfg(target_os = "macos")]
  {
    if last_err.is_none() { last_err = Some("no candidate bin worked".into()); }
    let _ = writeln!(logf, "[tauri] intentando abrir Ollama.app");
    let _ = app.emit_all("boot-log", "[tauri] intentando abrir Ollama.app".to_string());
    let _ = Command::new("open")
      .arg("-a").arg("Ollama")
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .status();
    // Esperar hasta 24s
    let mut attempts = 0u32;
    while attempts < 120 {
      if let Ok(resp) = client.get(&url).send().await {
        if resp.status().is_success() { let _ = writeln!(logf, "[tauri] Ollama.app lista"); let _ = app.emit_all("boot-log", "[tauri] Ollama.app lista".to_string()); return Ok(()); }
      }
      sleep(Duration::from_millis(200)).await;
      attempts += 1;
    }
    last_err = Some("opened Ollama.app but server not ready".into());
  }
  let _ = writeln!(logf, "[tauri] cannot start ollama serve: {}", last_err.clone().unwrap_or_else(|| "unknown error".into()));
  let _ = app.emit_all("boot-log", format!("[tauri] cannot start ollama serve: {}", last_err.clone().unwrap_or_else(|| "unknown error".into())));
  Err(format!("cannot start ollama serve: {}", last_err.unwrap_or_else(|| "unknown error".into())))
}

#[tauri::command]
async fn stop_ollama_server() -> Result<(), String> {
  let mut guard = OLLAMA_CHILD.lock().await;
  if let Some(child) = guard.as_mut() { let _ = child.kill(); }
  *guard = None;
  Ok(())
}

#[tauri::command]
async fn ensure_ollama_model_available(app: tauri::AppHandle, tag: String, model_path: Option<String>) -> Result<(), String> {
  // Usar el almacén de modelos propio de la app para evitar blobs corruptos en ~/.ollama
  let data_dir = app.path_resolver().app_data_dir().ok_or("app_data_dir not found")?;
  let app_models_root = data_dir.join("ollama-store");
  let _ = std::fs::create_dir_all(&app_models_root);
  // Verifica si el tag ya existe consultando el endpoint local
  let port = std::env::var("NEXT_PUBLIC_LLAMA_PORT").ok().and_then(|s| s.parse::<u16>().ok()).unwrap_or(11434);
  let client = reqwest::Client::builder().timeout(Duration::from_millis(1500)).build().map_err(|e| e.to_string())?;
  let url = format!("http://127.0.0.1:{}/api/tags", port);
  if let Ok(resp) = client.get(&url).send().await {
    if let Ok(text) = resp.text().await {
      if text.contains(&format!("\"{}\"", tag)) {
        // Validación rápida: intento mínimo de chat para detectar modelo corrupto
        let chat_url = format!("http://127.0.0.1:{}/api/chat", port);
        let body = serde_json::json!({
          "model": tag,
          "messages": [{"role": "user", "content": "hola"}],
          "stream": false
        });
        if let Ok(r) = client.post(&chat_url).json(&body).send().await {
          if !r.status().is_success() {
            // Respuesta 5xx indica posible modelo corrupto
            let _ = app.emit_all("boot-log", format!("[tauri] modelo '{}' parece corrupto. Eliminando y re-creando…", tag));
            let _ = Command::new("ollama")
              .arg("rm").arg(&tag)
              .env("OLLAMA_HOST", format!("127.0.0.1:{}", port))
              .stdout(Stdio::null()).stderr(Stdio::null()).status();
          } else {
            let _ = app.emit_all("boot-log", format!("[tauri] modelo '{}' ya disponible", tag));
            return Ok(());
          }
        }
      }
    }
  }

  // Determinar ruta del GGUF
  let gguf = if let Some(p) = model_path { p } else { find_available_model(app.clone())? };

  // Crear Modelfile temporal
  let dir = app.path_resolver().app_data_dir().ok_or("app_data_dir not found")?;
  let tmp = dir.join("Modelfile");
  {
    let mut f = File::create(&tmp).map_err(|e| e.to_string())?;
    let line = format!("FROM \"{}\"\n", gguf.replace('"', "\\\""));
    f.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
  }

  // Ejecutar `ollama create <tag> -f <Modelfile>` buscando binarios en rutas comunes
  let candidate_env = std::env::var("OLLAMA_BIN").ok();
  let mut candidates = vec![
    candidate_env.clone().unwrap_or_else(|| "ollama".to_string()),
    "/opt/homebrew/bin/ollama".to_string(),
    "/usr/local/bin/ollama".to_string(),
    "/usr/bin/ollama".to_string(),
  ];
  // Añadir binario empaquetado en Resources/bin/ollama si existe
  if let Some(res_bin) = app.path_resolver().resolve_resource("bin/ollama") {
    if res_bin.exists() { candidates.push(res_bin.to_string_lossy().into_owned()); }
  }
  if let Some(res_bin) = app.path_resolver().resolve_resource("bin/ollama.exe") {
    if res_bin.exists() { candidates.push(res_bin.to_string_lossy().into_owned()); }
  }
  #[cfg(target_os = "macos")]
  {
    let home = std::env::var("HOME").unwrap_or_default();
    candidates.push("/Applications/Ollama.app/Contents/MacOS/ollama".to_string());
    if !home.is_empty() {
      candidates.push(format!("{}/Applications/Ollama.app/Contents/MacOS/ollama", home));
    }
  }

  let mut created = false;
  let models_env = app_models_root.to_string_lossy().into_owned();
  for bin in candidates {
    // Intento defensivo: borrar tag previo si existe para evitar referenciar blobs corruptos
    let _ = app.emit_all("boot-log", format!("[tauri] creando tag '{}' con binario {}", tag, bin));
    let _ = Command::new(&bin)
      .arg("rm")
      .arg(&tag)
      .env("OLLAMA_HOST", format!("127.0.0.1:{}", port))
      .env("OLLAMA_MODELS", &models_env)
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .status();

    let status = Command::new(&bin)
      .arg("create")
      .arg(&tag)
      .arg("-f").arg(&tmp)
      .env("OLLAMA_HOST", format!("127.0.0.1:{}", port))
      .env("OLLAMA_MODELS", &models_env)
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .status();
    match status {
      Ok(s) if s.success() => { created = true; let _ = app.emit_all("boot-log", format!("[tauri] tag '{}' creado", tag)); break; }
      _ => {}
    }
  }

  // Fallback macOS: abrir la app Ollama y reintentar una vez que el server esté listo
  #[cfg(target_os = "macos")]
  if !created {
    let _ = Command::new("open").arg("-a").arg("Ollama").stdout(Stdio::null()).stderr(Stdio::null()).status();
    // Esperar hasta 10s a que el server esté arriba
    let mut attempts = 0u32;
    while attempts < 50 {
      if let Ok(resp) = client.get(&url).send().await { if resp.status().is_success() { break; } }
      sleep(Duration::from_millis(200)).await;
      attempts += 1;
    }
    // Reintento con "ollama" en PATH
    // Borrar tag y recrear apuntando al GGUF desde nuestro almacén
    let _ = Command::new("ollama")
      .arg("rm").arg(&tag)
      .env("OLLAMA_HOST", format!("127.0.0.1:{}", port))
      .env("OLLAMA_MODELS", &models_env)
      .stdout(Stdio::null()).stderr(Stdio::null()).status();
    if let Ok(s) = Command::new("ollama")
      .arg("create").arg(&tag).arg("-f").arg(&tmp)
      .env("OLLAMA_HOST", format!("127.0.0.1:{}", port))
      .env("OLLAMA_MODELS", &models_env)
      .stdout(Stdio::null()).stderr(Stdio::null()).status() {
      if s.success() { created = true; }
    }
  }

  if !created { return Err("ollama create failed".into()); }
  // Validar carga real del modelo con un chat mínimo
  let chat_url = format!("http://127.0.0.1:{}/api/chat", port);
  let body = serde_json::json!({
    "model": tag,
    "messages": [{"role": "user", "content": "hola"}],
    "stream": false
  });
  match client.post(&chat_url).json(&body).send().await {
    Ok(r) if r.status().is_success() => Ok(()),
    _ => {
      // Borrar tag inválido y reportar error claro
      let _ = Command::new("ollama")
        .arg("rm").arg(&tag)
        .env("OLLAMA_HOST", format!("127.0.0.1:{}", port))
        .env("OLLAMA_MODELS", &models_env)
        .stdout(Stdio::null()).stderr(Stdio::null()).status();
      let _ = app.emit_all("boot-log", format!("[tauri] validación de chat falló para '{}': modelo dañado", tag));
      Err("Modelo local dañado o incompleto. Conéctate para re-descargar el modelo.".into())
    }
  }
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![download_model, models_dir, download_llama_binary, start_llama_server, stop_llama_server, find_available_model, start_ollama_server, stop_ollama_server, ensure_ollama_model_available])
    .setup(|app| {
      // Autoinicio del servidor de Ollama y preparación del modelo en segundo plano (dev y prod)
      {
        let handle = app.app_handle();
        tauri::async_runtime::spawn(async move {
          let port = std::env::var("NEXT_PUBLIC_LLAMA_PORT").ok().and_then(|s| s.parse::<u16>().ok()).unwrap_or(11434);
          // Copiar modelo desde Resources/models a app_data/models si no existe aún
          if let Some(res_dir) = handle.path_resolver().resource_dir() {
            let bundled = res_dir.join("models");
            if let Ok(mut rd) = std::fs::read_dir(&bundled) {
              while let Some(Ok(entry)) = rd.next() {
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()).unwrap_or("") == "gguf" {
                  if let Some(app_data) = handle.path_resolver().app_data_dir() {
                    let dst_dir = app_data.join("models");
                    let _ = std::fs::create_dir_all(&dst_dir);
                    let dst = dst_dir.join(p.file_name().unwrap_or_default());
                    if !dst.exists() {
                      let _ = std::fs::copy(&p, &dst);
                    }
                  }
                }
              }
            }
          }
          // Arrancar servidor
          let _ = start_ollama_server(handle.clone(), port).await;
          // Intentar asegurar modelo DeepSeek (tag por defecto)
          let _ = ensure_ollama_model_available(handle.clone(), "deepseek-r1-qwen-1_5b:latest".to_string(), None).await;
        });
      }
      // En desarrollo: no arrancar Next standalone; Tauri ya carga devPath
      if cfg!(debug_assertions) {
        return Ok(());
      }

      // Producción: preferir remoto si hay Internet; si no, lanzar servidor Next standalone
      let app_dir = app.path_resolver().resource_dir().ok_or("resource_dir not found")?;
      let data_dir = app.path_resolver().app_data_dir().ok_or("app_data_dir not found")?;
      let logs_dir = data_dir.join("logs");
      let _ = create_dir_all(&logs_dir);
      let log_path = logs_dir.join("standalone.log");
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
      // Ruta al .env en Resources y mapa cargado (para Prisma: DATABASE_URL)
      let env_file = app_dir.join(".env");
      let env_map = load_env_from_file(&env_file);

      let public_remote = std::env::var("PUBLIC_APP_URL").ok().unwrap_or("https://app.ganado.co".to_string());
      let prefer_remote = std::env::var("PREFER_REMOTE").ok().map(|v| v=="1"||v.to_lowercase()=="true").unwrap_or(false);

      let mut started = false;
      let mut attempted_start = false;

      // Decidir destino según conectividad SOLO si se prefiere remoto vía env
      if prefer_remote {
        if let Some(win) = app.get_window("main") {
          let w = win.clone();
          let remote = public_remote.clone();
          tauri::async_runtime::block_on(async {
            let client = reqwest::Client::builder().timeout(Duration::from_millis(1500)).build().unwrap();
            let mut online = false;
            if let Ok(resp) = client.get(&remote).header("Cache-Control", "no-store").send().await {
              online = resp.status().is_success();
            }
            if online {
              let _ = w.eval(&format!("window.location.replace('{}');", remote));
              return;
            }
          });
        }
      }

      if let Some(srv) = server_js {
        // Si el puerto ya está ocupado (posible instancia previa), considerarlo disponible
        let prebound = TcpStream::connect(("127.0.0.1", port)).is_ok();
        if prebound {
          started = true;
        } else {
        attempted_start = true;
        // Preferir sidecar node si existe
        // Candidatos sidecar en Resources; filtrar por existencia real
        let sidecar_candidates = [
          app.path_resolver().resolve_resource("sidecar/node"),
          app.path_resolver().resolve_resource("sidecar/node-x86_64-apple-darwin"),
          app.path_resolver().resolve_resource("sidecar/node-aarch64-apple-darwin"),
          app.path_resolver().resolve_resource("sidecar/node.exe"),
        ];
        let mut sidecar_existing: Option<std::path::PathBuf> = None;
        for c in sidecar_candidates.into_iter().flatten() {
          if c.exists() { sidecar_existing = Some(c); break; }
        }

        // Fallback: binarios node copiados por externalBin en Contents/MacOS
        let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf()));
        let node_in_macos_plain = exe_dir.as_ref().map(|d| d.join("node")).filter(|p| p.exists());
        let node_in_macos_x64 = exe_dir.as_ref().map(|d| d.join("node-x86_64-apple-darwin")).filter(|p| p.exists());
        let node_in_macos_arm = exe_dir.as_ref().map(|d| d.join("node-aarch64-apple-darwin")).filter(|p| p.exists());

        // Preferir sidecar existente; luego MacOS/node*, en orden plain -> x64 -> arm
        let prefer_node = sidecar_existing
          .or(node_in_macos_plain)
          .or(node_in_macos_x64)
          .or(node_in_macos_arm);

        // Primer intento: usar el binario preferido si existe
        // Permitir modo no autenticado SOLO en desarrollo o si ALLOW_DEV_UNAUTH=1 ya viene seteado
        let allow_dev_unauth = std::env::var("ALLOW_DEV_UNAUTH").ok().as_deref() == Some("1") || cfg!(debug_assertions);

        if let Some(node_bin) = prefer_node {
          let mut cmd = Command::new(node_bin);
          let sidecar_attempt = cmd
            .arg(&srv)
            .env("PORT", port.to_string())
            .env("HOST", "127.0.0.1")
            .envs(if allow_dev_unauth { vec![("ALLOW_DEV_UNAUTH", "1")] } else { vec![] as Vec<(&str,&str)> })
            .envs(env_map.iter().map(|(k,v)| (k.as_str(), v.as_str())))
            .current_dir(srv.parent().unwrap_or(&app_dir))
            .stdout(Stdio::from(OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap())))
            .stderr(Stdio::from(OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap())))
            .spawn();

          match sidecar_attempt {
            Ok(child) => {
              tauri::async_runtime::block_on(async {
                let mut guard = SERVER_CHILD.lock().await;
                *guard = Some(child);
              });
              // No marcar started aún; esperaremos readiness del puerto
            }
            Err(e) => {
              // Registrar error de spawn en log
              let mut f = OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap());
              let _ = writeln!(f, "[GanadoAI] Error al iniciar sidecar/node: {}", e);
              // Segundo intento: usar 'node' del sistema
              if let Ok(child) = Command::new("node")
                .arg(&srv)
                .env("PORT", port.to_string())
                .env("HOST", "127.0.0.1")
                .envs(if allow_dev_unauth { vec![("ALLOW_DEV_UNAUTH", "1")] } else { vec![] as Vec<(&str,&str)> })
                .envs(env_map.iter().map(|(k,v)| (k.as_str(), v.as_str())))
                .current_dir(srv.parent().unwrap_or(&app_dir))
                .stdout(Stdio::from(OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap())))
                .stderr(Stdio::from(OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap())))
                .spawn() {
                tauri::async_runtime::block_on(async {
                  let mut guard = SERVER_CHILD.lock().await;
                  *guard = Some(child);
                });
                // Esperar readiness del puerto
              } else {
                let mut f2 = OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap());
                let _ = writeln!(f2, "[GanadoAI] Error al iniciar 'node' del sistema");
              }
            }
          }
        } else {
          // No hay binario preferido: intentar directamente con 'node' del sistema
          if let Ok(child) = Command::new("node")
            .arg(&srv)
            .env("PORT", port.to_string())
            .env("HOST", "127.0.0.1")
            .envs(if allow_dev_unauth { vec![("ALLOW_DEV_UNAUTH", "1")] } else { vec![] as Vec<(&str,&str)> })
            .envs(env_map.iter().map(|(k,v)| (k.as_str(), v.as_str())))
            .current_dir(srv.parent().unwrap_or(&app_dir))
            .stdout(Stdio::from(OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap())))
            .stderr(Stdio::from(OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap())))
            .spawn() {
            tauri::async_runtime::block_on(async {
              let mut guard = SERVER_CHILD.lock().await;
              *guard = Some(child);
            });
            // Esperar readiness del puerto
          } else {
            let mut f3 = OpenOptions::new().create(true).append(true).open(&log_path).unwrap_or_else(|_| File::create(&log_path).unwrap());
            let _ = writeln!(f3, "[GanadoAI] No se encontró 'node' para iniciar el servidor");
          }
        }
        }
      } else {
        // No existe server.js en recursos: no podemos iniciar local, nos iremos a remoto si hay internet
      }

      if let Some(win) = app.get_window("main") {
        let w = win.clone();
        tauri::async_runtime::spawn(async move {
          // Esperar readiness REAL del standalone: requerir 200 en '/'
          let client = reqwest::Client::new();
          let mut attempts: u32 = 0;
          let max_attempts: u32 = 80; // ~24s (80*300ms)
          let mut ready = false;
          while attempts < max_attempts {
            let url = format!("http://127.0.0.1:{}/", port);
            match client.get(&url)
              .header("Cache-Control", "no-store")
              .send().await {
              Ok(resp) => {
                if resp.status().is_success() {
                  // Chequear cuerpo básico HTML para evitar redirección prematura con bundles no listos
                  if let Ok(text) = resp.text().await {
                    if text.contains("<!DOCTYPE html") || text.contains("<html") {
                      ready = true;
                      break;
                    }
                  }
                }
              }
              Err(_) => {}
            }
            attempts += 1;
            sleep(std::time::Duration::from_millis(300)).await;
          }

          if ready {
            let _ = w.eval(&format!(
              "(function(){{
                try{{
                  // Limpieza defensiva antes de la primera navegación para evitar chunks stale
                  if('caches' in window){{caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).catch(()=>{{}});}}
                  try{{navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister())));}}catch{{}}
                  try{{localStorage.removeItem('NEXT_CACHE');}}catch{{}}
                }}catch{{}}
                var ts=Date.now();
                console.log('[GanadoAI] Local server ready on {0}, navigating with bust=',ts);
                window.location.replace('http://127.0.0.1:{0}/?v='+ts);
              }})();",
              port
            ));
          } else {
            // Sin readiness: si offline, llevar directamente al unlock local; si online, ir a remoto
            let _ = w.eval(&format!(
              "(function(){{try{{var online=navigator.onLine; if(!online){{window.location.replace('http://127.0.0.1:{0}/device-unlock'); return;}} window.location.replace('https://app.ganado.co');}}catch(e){{}}}})();",
              port
            ));
          }
        });

        // Preparar modelo local: copiar desde Resources/models si existe, o descargar
        let app_handle = app.app_handle();
        let auto_model = std::env::var("AUTO_MODEL_SETUP").ok().map(|v| v=="1"||v.to_lowercase()=="true").unwrap_or(false);
        if auto_model {
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

          // Intentar copiar desde Resources/models si no hay modelo
          let model_path_res = if let Some(p) = existing_model {
            Ok(p.to_string_lossy().into_owned())
          } else {
            let resources_dir = app_handle.path_resolver().resource_dir();
            let bundled_model = resources_dir.as_ref().and_then(|rd| {
              let md = rd.join("models");
              std::fs::read_dir(&md).ok().and_then(|mut it| {
                it.find_map(|e| e.ok()).and_then(|e| {
                  let p = e.path();
                  if p.extension().and_then(|s| s.to_str()).unwrap_or("") == "gguf" { Some(p) } else { None }
                })
              })
            });

            if let Some(src) = bundled_model {
              if let Some(app_models) = models_dir.clone() {
                let _ = std::fs::create_dir_all(&app_models);
                let target = app_models.join(src.file_name().unwrap_or_else(|| std::ffi::OsStr::new("model.gguf")));
                if std::fs::copy(&src, &target).is_ok() {
                  Ok(target.to_string_lossy().into_owned())
                } else if let Some(url) = model_url.clone() {
                  download_model(url, model_sha.clone(), app_handle.clone(), app_handle.get_window("main").unwrap()).await
                } else {
                  Err("no model available".to_string())
                }
              } else if let Some(url) = model_url.clone() {
                download_model(url, model_sha.clone(), app_handle.clone(), app_handle.get_window("main").unwrap()).await
              } else {
                Err("no model available".to_string())
              }
            } else if let Some(url) = model_url.clone() {
              download_model(url, model_sha.clone(), app_handle.clone(), app_handle.get_window("main").unwrap()).await
            } else {
              Err("no model url configured".to_string())
            }
          };

          if let Ok(model_path) = model_path_res {
            let _ = start_llama_server(app_handle.clone(), model_path, llama_port).await;
          }
        });
        }

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