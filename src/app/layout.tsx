import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/providers/heroui-provider";
import "./globals.css";
import { GlobalShell } from "@/components/layout/global-shell";

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
        {/* Auto-recover de chunks desincronizados tras despliegue */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  function clearAndReload(){
    try{localStorage.removeItem('NEXT_CACHE');}catch{}
    if('caches' in window){caches.keys().then(keys => Promise.all(keys.map(k=>caches.delete(k)))).catch(()=>{}).finally(()=>{try{navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).finally(()=>location.reload(true));}catch(e){location.reload(true);}});} else { try{navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).finally(()=>location.reload(true));}catch(e){location.reload(true);} }
  }
  window.addEventListener('error', function(e){
    if(!e || !e.message) return;
    if(e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk')){
      clearAndReload();
    }
  });
  // En Tauri, desregistrar SW al inicio para evitar Workbox 404
  try{ if(window.__TAURI__){ navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))); } }catch{}
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
    >
      {appBody}
    </ClerkProvider>
  );
}
