"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Grid3X3, MessageSquareText, Home } from "lucide-react";

export function GlobalSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r bg-white/80 p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          className="flex-1 rounded-full bg-white shadow-sm"
          onPress={() => window.dispatchEvent(new CustomEvent("open-modules"))}
        >
          <Grid3X3 className="h-4 w-4 mr-2" /> Módulos
        </Button>
      </div>
      <nav className="flex flex-col gap-1">
        <Link
          href="/"
          className="px-3 py-2 rounded-xl hover:bg-neutral-100 flex items-center gap-2"
        >
          <Home className="h-4 w-4" /> Inicio
        </Link>
        <Link
          href="/ai-assistant"
          className="px-3 py-2 rounded-xl hover:bg-neutral-100 flex items-center gap-2"
        >
          <MessageSquareText className="h-4 w-4" /> Asistente IA
        </Link>
      </nav>
    </aside>
  );
}
