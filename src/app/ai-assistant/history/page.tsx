"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function AIHistoryPage() {
  const params = useSearchParams();
  const limit = 20;
  const q = trpc.ai.listSessions.useQuery({ limit });
  const sessions = q.data || [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Historial de chats</h1>
      <div className="grid gap-2">
        {sessions.map((s: any) => (
          <a
            key={s.sessionId}
            className="px-3 py-2 rounded-lg border hover:bg-neutral-50"
            href={`/ai-assistant?open=${encodeURIComponent(s.sessionId)}`}
          >
            <div className="text-sm font-medium">{s.sessionId}</div>
            <div className="text-xs text-neutral-600">{new Date(s.updatedAt).toLocaleString()}</div>
          </a>
        ))}
      </div>
    </div>
  );
}


