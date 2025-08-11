"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function GlobalHeader() {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-4">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="Ganado AI" width={24} height={24} />
        <span className="font-semibold">Ganado AI</span>
      </Link>
      <nav className="flex items-center gap-3 text-sm text-neutral-600">
        <Link href="/offline" className="hover:text-neutral-900">
          Offline
        </Link>
        {hasClerk && <UserButton />}
      </nav>
    </header>
  );
}
