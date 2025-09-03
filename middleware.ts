import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes: auth pages, offline unlock, offline page, downloads, static assets
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/_/(device-unlock|offline|download)(/.*)?",
  "/device-unlock(.*)",
  "/offline(.*)",
  "/download(.*)",
  "/manifest.json",
  "/sw.js",
  "/workbox-:path*",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // En Tauri (app de escritorio), no aplicar autenticación ni redirecciones desde middleware
  if (process.env.TAURI === "1" || process.env.TAURI === "true") {
    return NextResponse.next();
  }

  // Salir inmediatamente para recursos de Next estáticos
  if (pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  // Redirect legacy /_/ paths to clean paths
  if (pathname.startsWith("/_/download")) {
    const url = req.nextUrl.clone();
    url.pathname = "/download";
    return NextResponse.redirect(url, 308);
  }
  if (pathname.startsWith("/_/device-unlock")) {
    const url = req.nextUrl.clone();
    url.pathname = "/device-unlock";
    return NextResponse.redirect(url, 308);
  }
  if (pathname.startsWith("/_/offline")) {
    const url = req.nextUrl.clone();
    url.pathname = "/offline";
    return NextResponse.redirect(url, 308);
  }
  // Generic redirect: any /_/segment → /segment (Next private folders)
  if (pathname.startsWith("/_/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/_\/+/, "/");
    return NextResponse.redirect(url, 308);
  }

  // Do not enforce protection on API routes, but still let Clerk run to set auth context
  const isApiRoute =
    pathname.startsWith("/api/") || pathname.startsWith("/trpc");

  if (!isPublicRoute(req) && !isApiRoute) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Excluir explícitamente recursos internos de Next y APIs
    "/((?!api|trpc|_next/static|_next/image|_next/webpack-hmr|favicon.ico|sw.js|workbox-.*|manifest.json).*)",
  ],
};
