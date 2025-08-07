"use client";

import { cn } from "@/lib/utils";
import { Send, Mic } from "lucide-react";

export function AIDock({
  placeholder = "Pregúntame lo que quieras...",
  onSend,
  onMic,
  className,
}: {
  placeholder?: string;
  onSend?: (value: string) => void;
  onMic?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("fixed left-0 right-0 bottom-4 sm:bottom-6 flex justify-center z-40", className)}>
      <div className="w-[92%] sm:w-[720px] rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_20px_40px_rgba(15,23,42,0.08)] flex items-center gap-2 px-3 py-2">
        <button aria-label="Hablar" onClick={onMic} className="shrink-0 w-9 h-9 rounded-full grid place-items-center text-violet-600 bg-violet-50">
          <Mic className="w-4 h-4" />
        </button>
        <input
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSend?.((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-slate-400"
        />
        <button aria-label="Enviar" onClick={() => {
            const input = (document.activeElement as HTMLInputElement) ?? undefined;
            if (input && input.tagName === 'INPUT') {
              onSend?.(input.value);
              input.value = '';
            }
          }}
          className="shrink-0 w-9 h-9 rounded-full grid place-items-center text-white bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-md">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
} 