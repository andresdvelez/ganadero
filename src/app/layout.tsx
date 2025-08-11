import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/providers/heroui-provider";
import "./globals.css";
import { GlobalHeader } from "@/components/layout/global-header";
import { GlobalSidebar } from "@/components/layout/global-sidebar";

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
        <Providers>
          <GlobalHeader />
          <div className="min-h-[calc(100vh-3.5rem)] grid grid-cols-[16rem_1fr]">
            <GlobalSidebar />
            <main className="min-h-0 overflow-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );

  if (!hasClerk) return appBody;

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/onboarding"
    >
      {appBody}
    </ClerkProvider>
  );
}
