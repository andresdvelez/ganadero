"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Switch } from "@heroui/react";

export function AIInputBar({
  value,
  onChange,
  onSend,
  onMic,
  isListening,
  elapsedMs,
  disabled,
  placeholder,
  className,
  levels,
  webSearch,
  onToggleWebSearch,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onMic: () => void;
  isListening?: boolean;
  elapsedMs?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  levels?: number[];
  webSearch?: boolean;
  onToggleWebSearch?: (v: boolean) => void;
}) {
  const hasText = (value || "").trim().length > 0;
  const timeLabel = useMemo(() => {
    if (!elapsedMs || elapsedMs < 0) return "";
    const sec = Math.floor(elapsedMs / 1000);
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [elapsedMs]);

  return (
    <div className={cn("relative w-full", className)}>
      {isListening ? (
        <div className="h-16 rounded-[28px] bg-neutral-900 text-white border border-neutral-800 shadow-sm pr-44 pl-4 flex items-center">
          <div className="w-full flex items-center gap-4">
            <div className="flex-1">
              <WaveBars levels={levels} />
            </div>
            <span className="text-sm tabular-nums opacity-80">{timeLabel}</span>
          </div>
        </div>
      ) : (
        <Input
          aria-label="Campo de solicitud a la IA"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder={
            placeholder || "Escribe una tarea o pregúntame lo que quieras…"
          }
          variant="flat"
          onKeyDown={(e: any) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={disabled}
          classNames={
            {
              inputWrapper:
                "h-16 rounded-[28px] bg-white border border-neutral-200 shadow-sm pr-44 pl-2 transition-all",
              input:
                "h-12 rounded-[20px] bg-neutral-100 text-[16px] px-4 placeholder:text-neutral-500",
            } as any
          }
        />
      )}

      {/* Web search toggle */}
      <div className="absolute right-[6.5rem] top-1/2 -translate-y-1/2 flex items-center gap-2 text-neutral-600 select-none">
        <span className="hidden sm:inline text-sm">Web search</span>
        <Switch
          size="sm"
          isSelected={!!webSearch}
          onValueChange={(v) => onToggleWebSearch?.(v)}
          aria-label="Buscar en la web"
        />
      </div>

      {/* Mic button moves when send appears (send hidden during listening) */}
      <Button
        isIconOnly
        aria-label="Hablar"
        onPress={onMic}
        disabled={disabled}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full bg-white text-neutral-700 shadow-sm border border-neutral-200 h-10 w-10 transition-all",
          isListening ? "right-2" : hasText ? "right-[3.75rem]" : "right-2"
        )}
      >
        <Mic className="h-5 w-5" />
      </Button>

      {/* Send button appears with slide/opacity */}
      <Button
        isIconOnly
        aria-label="Enviar"
        onPress={onSend}
        disabled={!hasText || disabled || isListening}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-blue-600 text-white hover:bg-blue-700 h-10 w-10 transition-all",
          isListening
            ? "opacity-0 translate-x-2 pointer-events-none"
            : hasText
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-2 pointer-events-none"
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}

function WaveBars({ levels }: { levels?: number[] }) {
  const bars = levels && levels.length > 0 ? levels : undefined;
  if (bars) {
    return (
      <div className="flex items-end justify-between h-6 w-full">
        {bars.map((v, i) => (
          <span
            key={i}
            className="bg-white/80 rounded-sm inline-block"
            style={{ width: 2, height: Math.max(3, Math.min(20, 3 + v * 18)) }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-end justify-between h-6 w-full">
      {Array.from({ length: 64 }).map((_, i) => (
        <span
          key={i}
          className="bg-white/70 rounded-sm inline-block animate-pulse"
          style={{
            width: 2,
            height: 6 + ((i * 7) % 12),
            animationDelay: `${(i % 6) * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}
