"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="flex items-center justify-between px-4 h-14 border-b bg-white">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Ganado AI" width={28} height={28} />
          <div className="font-semibold">Ganado AI</div>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/_/offline-setup"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Offline
          </Link>
          {hasClerk && <UserButton />}
        </nav>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
