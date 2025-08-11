"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AISidebarChatItem {
  uuid: string;
  title: string;
  updatedAt: Date | string;
}

export function AISidebar({
  chats,
  activeChatUuid,
  onNewChat,
  onSelectChat,
}: {
  chats: AISidebarChatItem[];
  activeChatUuid?: string | null;
  onNewChat: () => void;
  onSelectChat: (uuid: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => c.title.toLowerCase().includes(q));
  }, [chats, query]);

  return (
    <aside className="flex flex-col w-72 border-l bg-white/80 p-3 gap-3">
      <div className="flex gap-2">
        <Button
          onPress={onNewChat}
          className="flex-1 rounded-full bg-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo chat
        </Button>
        <Button
          isIconOnly
          className="rounded-full bg-white shadow-sm"
          aria-label="Buscar módulos"
          onPress={() => window.dispatchEvent(new CustomEvent("open-modules"))}
        >
          <Grid3X3 className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          placeholder="Buscar chats"
          aria-label="Buscar chats"
          value={query}
          onChange={(e: any) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="text-xs uppercase tracking-wide text-neutral-500 px-1 mt-1">
        Chats
      </div>

      <div
        className="overflow-auto"
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        {filtered.length === 0 ? (
          <div className="text-sm text-neutral-500 px-2 py-4">No hay chats</div>
        ) : (
          <div className="space-y-1">
            {filtered.map((c) => (
              <button
                key={c.uuid}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100",
                  activeChatUuid === c.uuid && "bg-neutral-100"
                )}
                onClick={() => onSelectChat(c.uuid)}
              >
                <div className="text-sm font-medium text-neutral-800 line-clamp-2">
                  {c.title}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {new Date(c.updatedAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
