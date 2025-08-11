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

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
