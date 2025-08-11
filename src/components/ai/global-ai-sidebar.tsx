"use client";

import { useEffect, useState } from "react";
import { AISidebar } from "@/components/ai/ai-sidebar";
import { db, OfflineChat } from "@/lib/dexie";

export function GlobalAISidebar() {
  const [chatList, setChatList] = useState<OfflineChat[]>([]);
  const [activeUuid, setActiveUuid] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const items = await db.chats
          .orderBy("updatedAt")
          .reverse()
          .limit(50)
          .toArray();
        setChatList(items);
      } catch {}
    })();
  }, []);

  return (
    <AISidebar
      chats={chatList.map((c) => ({
        uuid: c.uuid,
        title: c.title,
        updatedAt: c.updatedAt,
      }))}
      activeChatUuid={activeUuid}
      onNewChat={() => window.dispatchEvent(new Event("ai-new-chat"))}
      onSelectChat={(uuid) => {
        setActiveUuid(uuid);
        window.dispatchEvent(
          new CustomEvent("ai-open-chat", { detail: { uuid } })
        );
      }}
    />
  );
}
