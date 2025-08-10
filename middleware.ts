import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes: auth pages, offline unlock, offline page, downloads, static assets
const isPublicRoute = createRouteMatcher([
  "/_/(sign-in|sign-up|device-unlock|offline|download)(/.*)?",
  "/manifest.json",
  "/sw.js",
  "/workbox-:path*",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  // Protect API and app routes when online; offline access is handled client-side via AuthGate
  await auth.protect();
});

export const config = {
  matcher: [
    // Run on all routes except Next internals and static files
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public).*)",
  ],
};
