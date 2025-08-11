"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

interface DashboardLayoutProps {
  children: ReactNode;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export function DashboardLayout({
  children,
  leftSlot,
  rightSlot,
}: DashboardLayoutProps) {
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
      <div className="grid grid-cols-[auto,1fr,auto] min-h-0">
        {leftSlot ? (
          <div className="border-r bg-white/80 min-h-0">{leftSlot}</div>
        ) : (
          <div />
        )}
        <main className="p-4 overflow-auto min-h-0">{children}</main>
        {rightSlot ? (
          <div className="border-l bg-white/80 min-h-0">{rightSlot}</div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
