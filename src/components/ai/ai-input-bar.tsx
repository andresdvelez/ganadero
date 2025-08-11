"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

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
              "h-16 rounded-[28px] bg-white border border-neutral-200 shadow-sm pr-20 pl-2 transition-all",
            input:
              "h-12 rounded-[20px] bg-neutral-100 text-[16px] px-4 placeholder:text-neutral-500",
          } as any
        }
      />

      {/* Listening overlay (waveform + timer) */}
      {isListening && (
        <div className="pointer-events-none absolute inset-0 flex items-center pl-16 pr-24">
          <div className="flex items-center gap-3 text-neutral-700">
            <WaveBars />
            <span className="text-sm font-medium tabular-nums">
              {timeLabel}
            </span>
          </div>
        </div>
      )}

      {/* Mic button moves when send appears */}
      <Button
        isIconOnly
        aria-label="Hablar"
        onPress={onMic}
        disabled={disabled}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full bg-white text-neutral-700 shadow-sm border border-neutral-200 h-10 w-10 transition-all",
          hasText ? "right-[3.75rem]" : "right-2"
        )}
      >
        <Mic className="h-5 w-5" />
      </Button>

      {/* Send button appears with slide/opacity */}
      <Button
        isIconOnly
        aria-label="Enviar"
        onPress={onSend}
        disabled={!hasText || disabled}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-blue-600 text-white hover:bg-blue-700 h-10 w-10 transition-all",
          hasText
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-2 pointer-events-none"
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}

function WaveBars() {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] bg-neutral-700 rounded-sm inline-block animate-pulse"
          style={{
            height: `${6 + ((i * 7) % 12)}px`,
            animationDelay: `${(i % 5) * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}
