"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

export function AIDock({
  onMic,
  onSend,
}: {
  onMic?: () => void;
  onSend?: (v: string) => void;
}) {
  const [value, setValue] = useState("");
  const router = useRouter();
  const aiRoute = trpc.ai.routeIntent.useMutation();

  async function handleSend() {
    const text = value.trim();
    if (!text) return;
    setValue("");
    try {
      const res = await aiRoute.mutateAsync({ query: text });
      if (res?.navigateTo) router.push(res.navigateTo);
      onSend?.(text);
    } catch (e) {
      onSend?.(text);
    }
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 px-4">
      <div className="mx-auto max-w-2xl ios-surface rounded-full p-2 flex items-center gap-2 shadow-lg">
        <button
          aria-label="Hablar"
          onClick={onMic}
          className="px-3 py-2 rounded-full bg-neutral-100"
        >
          🎤
        </button>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Pregunta o indica una acción..."
          className="flex-1 px-4 py-2 bg-transparent outline-none"
        />
        <button
          aria-label="Enviar"
          onClick={handleSend}
          className="px-3 py-2 rounded-full bg-primary-purple text-white"
        >
          →
        </button>
      </div>
    </div>
  );
}
