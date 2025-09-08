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
              alignItems: "flex-end",
              justifyContent: "center",
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
  // Ocultar splash al finalizar carga o tras un pequeño delay de seguridad
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
  // Fallback para asegurar que el splash no quede visible si no se dispara 'load'
  try{ setTimeout(hideSplash, 1800); }catch{}
  if(document.readyState==='complete') { hideSplash(); }
  else { window.addEventListener('load', hideSplash); }

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

  // Boot secuencial de IA local durante splash (solo Tauri)
  async function bootLocalAI(){
    if(!window.__TAURI__) return;
    var msgEl = document.getElementById('__splash_msg');
    function setMsg(t){ try{ if(msgEl) msgEl.textContent=t; }catch{} }
    try{
      setMsg('Iniciando servidor de IA local…');
      await window.__TAURI__.invoke('start_ollama_server', { port: Number(window.process?.env?.NEXT_PUBLIC_LLAMA_PORT||11434) });
    }catch(e){ setMsg('Intentando abrir Ollama…'); }
    try{
      setMsg('Verificando/creando modelo DeepSeek…');
      // Modelo más ligero por defecto para respuesta inicial más rápida
      await window.__TAURI__.invoke('ensure_ollama_model_available', { tag: 'deepseek-r1:7b', modelPath: null });
      setMsg('Modelo local listo.');
    }catch(e){ setMsg('No fue posible preparar el modelo local aún.'); }
    // Precalentar con consulta mínima
    try{
      await fetch('http://127.0.0.1:'+Number(window.process?.env?.NEXT_PUBLIC_LLAMA_PORT||11434)+'/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model: 'deepseek-r1:7b', messages:[{role:'user', content:'ok'}], stream:false, options:{ num_predict: 16 } })
      });
    }catch{}
    // Pequeña espera para dar feedback y luego ocultar splash
    try{ window.__BOOT_DONE__ = true; }catch{}
    setTimeout(hideSplash, 400);
  }

  try{ bootLocalAI(); }catch{}

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
