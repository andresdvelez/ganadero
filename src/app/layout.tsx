import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { Providers } from "@/providers/heroui-provider";
import "./globals.css";
// import { GlobalShell } from "@/components/layout/global-shell";

export const metadata: Metadata = {
  title: "Ganado AI - Plataforma de Gestión Ganadera",
  description: "Gestión ganadera inteligente con asistente de IA",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6B46C1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const appBody = (
    <html lang="es">
      <body className="font-sans antialiased bg-neutral-50 text-neutral-900">
        {/* Splash screen overlay (web/app) con imagen centrada */}
        <div
          id="__splash"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "#0f2621",
            backgroundImage: "url(/brand/splash-screen.jpeg)",
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div
            id="__splash_layer"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "18px",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.0))",
              color: "#fff",
              fontFamily:
                "system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 720,
                display: "flex",
                gap: 12,
                alignItems: "center",
                justifyContent: "flex-start",
                backdropFilter: "blur(2px)",
              }}
            >
              <div
                className="spinner"
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <div id="__splash_msg" style={{ fontSize: 14 }}>
                Preparando Ganado AI…
              </div>
            </div>
          </div>
        </div>
        {/* Auto-recover de chunks desincronizados tras despliegue */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  // Defiere cualquier redirección hasta completar boot local en Tauri.
  // En web, solo redirige si estás en pantallas de auth y no hay conexión.
  try{
    var p = location.pathname || '';
    var isAuth = p.startsWith('/sign-in') || p.startsWith('/sign-up');
    var isPublic = isAuth || p.startsWith('/device-unlock') || p.startsWith('/offline') || p.startsWith('/download');
    function afterBoot(cb){
      try{
        if (!window.__TAURI__) { cb(); return; }
      }catch{ cb(); return; }
      var maxMs = 6000, step = 150, waited = 0;
      var iv = setInterval(function(){
        try{
          if ((window.__BOOT_DONE__ === true) || waited >= maxMs) {
            clearInterval(iv); cb();
          }
        }catch{}
        waited += step;
      }, step);
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (isAuth) {
        afterBoot(function(){ try{ location.replace('/offline'); }catch{} });
      }
      // Para rutas no públicas, dejamos que AuthGate maneje la navegación tras el boot
    }
  }catch{}
  // Ocultar splash
  function hideSplash(){
    try{
      var el = document.getElementById('__splash');
      if(!el) return;
      el.style.opacity='0';
      el.style.transition='opacity 260ms ease';
      // No remover el nodo para no interferir con la hidratación/insertBefore de React
      setTimeout(function(){ try{ el.style.display='none'; el.setAttribute('aria-hidden','true'); }catch{} }, 280);
    }catch{}
  }
  // En Tauri NO ocultar por fallback: solo cuando el boot local termine
  try{
    if(!window.__TAURI__){
      // En web, sí permitimos fallback por UX
      try{ setTimeout(hideSplash, 1800); }catch{}
      if(document.readyState==='complete') { hideSplash(); }
      else { window.addEventListener('load', hideSplash); }
    }
  }catch{}

  function clearAndReload(){
    try{ if (sessionStorage.getItem('NEXT_RECOVERED_ONCE') === '1') { return; } }catch{}
    try{ sessionStorage.setItem('NEXT_RECOVERED_ONCE','1'); }catch{}
    try{localStorage.removeItem('NEXT_CACHE');}catch{}
    if('caches' in window){caches.keys().then(keys => Promise.all(keys.map(k=>caches.delete(k)))).catch(()=>{}).finally(()=>{try{navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).finally(()=>location.reload(true));}catch(e){location.reload(true);}});} else { try{navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).finally(()=>location.reload(true));}catch(e){location.reload(true);} }
  }
  function showBootError(message){
    try{
      var c = document.createElement('div');
      c.id='__boot_error';
      c.style.cssText='position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.96);font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial';
      c.innerHTML='<div style="max-width:640px;width:90%;background:#fff;border:1px solid #fecaca;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);padding:16px 18px;color:#111">\
        <div style="font-weight:600;color:#b91c1c;font-size:18px;margin-bottom:6px">Ocurrió un error al cargar la aplicación</div>\
        <div style="font-size:14px;color:#374151;margin-bottom:10px">Es posible que tengas archivos en caché de una versión anterior.</div>\
        <div style="background:#fee2e2;color:#991b1b;padding:10px;border-radius:10px;font-size:13px;word-break:break-word;">'+(message||'Error de carga de módulos')+'</div>\
        <div style="display:flex;gap:10px;margin-top:12px">\
          <button id="__boot_retry" style="padding:8px 12px;border-radius:10px;border:1px solid #d1d5db;background:#fff;cursor:pointer">Reintentar</button>\
          <button id="__boot_repair" style="padding:8px 12px;border-radius:10px;border:1px solid #ef4444;background:#ef4444;color:#fff;cursor:pointer">Reparar y recargar</button>\
        </div>\
      </div>';
      document.body.appendChild(c);
      document.getElementById('__boot_retry')?.addEventListener('click', function(){ location.reload(); });
      document.getElementById('__boot_repair')?.addEventListener('click', function(){ clearAndReload(); });
    }catch{}
  }
  window.addEventListener('error', function(e){
    var msg = (e && e.message) || '';
    if(msg && (msg.includes('ChunkLoadError') || msg.includes('Loading chunk'))){ showBootError(msg); }
  });
  window.addEventListener('unhandledrejection', function(e){
    try{
      var msg = (e && e.reason && (e.reason.message||e.reason.toString())) || '';
      if(msg.includes('ChunkLoadError') || msg.includes('Loading chunk')){ showBootError(msg); }
    }catch{}
  });
  // En Tauri, desregistrar SW al inicio para evitar Workbox 404
  try{ if(window.__TAURI__){ navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))); } }catch{}

  // Crear UI de logs/acciones en el splash de inmediato (antes del boot)
  function ensureSplashUI(){
    try{
      var layer = document.getElementById('__splash_layer');
      if(!layer) return null;
      var pre = document.getElementById('__splash_log');
      if(!pre){
        var title = document.getElementById('__splash_log_title');
        if(!title){
          title = document.createElement('div');
          title.id='__splash_log_title';
          title.textContent='Registros del arranque';
          title.style.cssText='margin-top:10px;width:100%;max-width:720px;font-size:12px;color:rgba(255,255,255,0.85);font-weight:600;';
          layer.appendChild(title);
        }
        pre = document.createElement('pre');
        pre.id='__splash_log';
        pre.style.cssText='margin:6px 0 0 0;max-height:22vh;overflow:auto;font-size:11px;line-height:1.2;background:rgba(0,0,0,0.25);padding:8px;border-radius:8px;white-space:pre-wrap;width:100%;max-width:720px;';
        layer.appendChild(pre);
        var wrap = document.getElementById('__splash_actions');
        if(!wrap){
          wrap = document.createElement('div');
          wrap.id='__splash_actions';
          wrap.style.cssText='margin-top:10px;display:flex;gap:8px;width:100%;max-width:720px;justify-content:flex-start;';
          var btnRetry = document.createElement('button');
          btnRetry.id='__splash_btn_retry';
          btnRetry.textContent='Reintentar';
          btnRetry.style.cssText='padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.08);color:#fff;cursor:pointer;backdrop-filter:blur(3px)';
          var btnCopy = document.createElement('button');
          btnCopy.id='__splash_btn_copy';
          btnCopy.textContent='Copiar log';
          btnCopy.style.cssText='padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.08);color:#fff;cursor:pointer;backdrop-filter:blur(3px)';
          wrap.appendChild(btnRetry); wrap.appendChild(btnCopy);
          layer.appendChild(wrap);
        }
      }
      return pre;
    }catch{return null}
  }
  try{ ensureSplashUI(); }catch{}

  // Boot secuencial de IA local durante splash (solo Tauri, bloqueante)
  async function bootLocalAI(){
    if(!window.__TAURI__) return;
    if(window.__BOOT_BUSY__===true) return; // evitar paralelos
    try{ window.__BOOT_BUSY__ = true; }catch{}
    var msgEl = document.getElementById('__splash_msg');
    function setMsg(t){ try{ if(msgEl) msgEl.textContent=t; }catch{} }
    function degradeAndProceed(reason){
      // No avanzar a la app si la IA no está lista: bloquear hasta intervención o éxito
      try{ console.warn('[BOOT][blocked_until_ready]', reason); }catch{}
      try{ window.__BOOT_DEGRADED__ = true; }catch{}
      try{ window.__BOOT_BUSY__ = false; }catch{}
      setMsg('No fue posible preparar la IA local. Reintenta o copia el log.');
      // Mantener el splash visible; los botones de reintento/copiar log ya están disponibles
    }
    // Asegurar UI y enlazar acciones ahora
    var logBox = ensureSplashUI();
    (function(){
      try{
        var btnRetryEl = document.getElementById('__splash_btn_retry');
        var btnCopyEl = document.getElementById('__splash_btn_copy');
        if(btnRetryEl && !(btnRetryEl as any).dataset?.bound){
          (btnRetryEl as any).dataset = { bound: '1' };
          btnRetryEl.addEventListener('click', function(){
            try{ if(logBox) (logBox as any).textContent=''; }catch{}
            try{ window.__BOOT_DONE__ = false; window.__BOOT_BUSY__ = false; }catch{}
            try{ setMsg('Reintentando…'); }catch{}
            try{ bootLocalAI(); }catch{}
          });
        }
        if(btnCopyEl && !(btnCopyEl as any).dataset?.bound){
          (btnCopyEl as any).dataset = { bound: '1' };
          btnCopyEl.addEventListener('click', function(){
            try{ navigator.clipboard?.writeText(((document.getElementById('__splash_log')||{}) as any).textContent||''); }catch{}
          });
        }
      }catch{}
    })();
    function log(line){
      try{
        if(!logBox) return;
        var text = (logBox.textContent||'');
        var lines = (text+"\n"+line).split('\n');
        if(lines.length>120) lines = lines.slice(lines.length-120);
        logBox.textContent = lines.join('\n');
        logBox.scrollTop = logBox.scrollHeight;
      }catch{}
    }
    // Watchdog de 60s: informar si se tarda demasiado (sin salir del splash)
    var start = Date.now();
    var watchdog = setInterval(function(){
      try{
        if(Date.now()-start > 60000){
          clearInterval(watchdog);
          setMsg('Esto está tardando más de lo esperado…');
          log('[BOOT][watchdog] >60s sin completar; esperando intervención del usuario');
          degradeAndProceed('watchdog_timeout');
        }
      }catch{}
    }, 1000);
    // Helper para evitar esperas infinitas en invocaciones Tauri
    async function withTimeout(p, ms, label){
      var to;
      return Promise.race([
        p,
        new Promise(function(_, reject){ to = setTimeout(function(){ reject(new Error('timeout:'+label)); }, ms); })
      ]).finally(function(){ try{ clearTimeout(to); }catch{} });
    }
    try{
      setMsg('Iniciando servidor de IA local…');
      await withTimeout(window.__TAURI__.invoke('start_ollama_server', { port: Number(window.process?.env?.NEXT_PUBLIC_LLAMA_PORT||11434) }), 12000, 'start_ollama_server');
      log('[BOOT] sidecar/ollama server start solicitado');
    }catch(e){ setMsg('Intentando abrir Ollama…'); }
    try{
      setMsg('Verificando/creando modelo DeepSeek…');
      // Modelo más ligero por defecto para respuesta inicial más rápida
      await withTimeout(window.__TAURI__.invoke('ensure_ollama_model_available', { tag: 'deepseek-r1:7b', modelPath: null }), 25000, 'ensure_model');
      setMsg('Modelo verificado.');
      log('[BOOT] modelo deepseek-r1:7b verificado');
    }catch(e){
      // Registrar error pero no bloquear: degradar y continuar
      log('[BOOT][error] ensure_ollama_model_available: '+(e&&e.message?e.message:String(e)));
      clearInterval(watchdog);
      degradeAndProceed('ensure_model_failed');
      return;
    }
    // Precalentar con consulta mínima con estrategia de host: proxy 4317 → directo 11434
    async function warm(host){
      const controller = new AbortController();
      const to = setTimeout(()=>controller.abort(), 15000);
      try{
        log('[BOOT] warmup host='+host);
        const res = await fetch(host+'/api/chat', { method:'POST', signal: controller.signal, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model: 'deepseek-r1:7b', messages:[{role:'user', content:'ok'}], stream:false, options:{ num_predict: 16 } }) });
        clearTimeout(to);
        if(!res.ok){ throw new Error('status '+res.status); }
        const j = await res.json().catch(()=>({}));
        log('[BOOT] warmup ok ('+(j?.created_at||'no ts')+')');
        return true;
      }catch(err){
        clearTimeout(to);
        log('[BOOT][error] warmup fail '+String(err));
        return false;
      }
    }
    // Probar primero sidecar proxy, luego puerto directo
    var sidecar = 'http://127.0.0.1:4317/api/ollama';
    var direct = 'http://127.0.0.1:'+Number(window.process?.env?.NEXT_PUBLIC_LLAMA_PORT||11434);
    var ok = false;
    // pequeño ping a /api/tags para elegir host rápidamente
    async function ping(base){
      const c = new AbortController();
      const t = setTimeout(()=>c.abort(), 4000);
      try{
        const r = await fetch(base+'/api/tags', { signal: c.signal });
        clearTimeout(t);
        return r.ok;
      }catch(e){ clearTimeout(t); return false; }
    }
    try{
      setMsg('Calentando modelo local…');
      let base = sidecar;
      const sidecarOk = await ping(sidecar);
      if(!sidecarOk){ log('[BOOT] sidecar no responde, probando puerto directo'); base = direct; }
      // Guardar host elegido para el cliente
      try{ localStorage.setItem('OLLAMA_HOST', base); }catch{}
      ok = await warm(base);
      if(!ok && base!==direct){ ok = await warm(direct); if(ok){ try{ localStorage.setItem('OLLAMA_HOST', direct); }catch{} } }
    }catch(err){ log('[BOOT][error] '+String(err)); }
    if(!ok){
      log('[BOOT][warn] warmup falló en ambos hosts, continuando degradado');
      clearInterval(watchdog);
      degradeAndProceed('warmup_failed');
      return;
    }
    // Listo: marcar flag y ocultar splash
    try{ window.__BOOT_DONE__ = true; }catch{}
    try{ window.__BOOT_BUSY__ = false; }catch{}
    clearInterval(watchdog);
    setMsg('Modelo local listo.');
    setTimeout(hideSplash, 200);
  }

  try{ window.__BOOT_BUSY__ = false; bootLocalAI(); }catch{}

  // Si la app pierde conexión en caliente, iniciar IA local automáticamente
  try{
    window.addEventListener('offline', function(){ try{ bootLocalAI(); }catch{} });
  }catch{}
})();
`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );

  if (!hasClerk) return appBody;

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/onboarding"
      localization={{
        ...esES,
        locale: "es-CO",
        signIn: {
          ...esES.signIn,
          start: {
            ...esES.signIn?.start,
            title: "Inicia sesión en Ganado AI",
            subtitle:
              "Bienvenido de nuevo, por favor inicia sesión para continuar",
          },
        },
        signUp: {
          ...esES.signUp,
          start: {
            ...esES.signUp?.start,
            title: "Crea tu cuenta",
            subtitle: "Completa los datos para empezar",
          },
        },
      }}
    >
      {appBody}
    </ClerkProvider>
  );
}
