"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef } from "react";
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
  analyser,
  hideWebSearchToggle,
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
  analyser?: AnalyserNode | null;
  hideWebSearchToggle?: boolean;
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

  // Oscilloscope canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const scaleRef = useRef<number>(1.6);

  useEffect(() => {
    if (!isListening || !analyser || !canvasRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const context = ctx as CanvasRenderingContext2D;
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.5;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function resize() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const logicalW = canvas.clientWidth || 100;
      const logicalH = canvas.clientHeight || 20;
      canvas.width = Math.floor(logicalW * dpr);
      canvas.height = Math.floor(logicalH * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
      const WIDTH = canvas.clientWidth;
      const HEIGHT = canvas.clientHeight;
      // clear
      context.clearRect(0, 0, WIDTH, HEIGHT);
      // baseline
      context.strokeStyle = "#e5e7eb"; // neutral-200
      context.setLineDash([3, 4]);
      context.beginPath();
      context.moveTo(0, HEIGHT / 2);
      context.lineTo(WIDTH, HEIGHT / 2);
      context.stroke();
      context.setLineDash([]);

      // auto-gain based on average absolute deviation
      let sumAbs = 0;
      for (let i = 0; i < bufferLength; i++)
        sumAbs += Math.abs(dataArray[i] - 128);
      const avgAbs = sumAbs / bufferLength; // 0..128
      const currentAmp = Math.max(1, avgAbs);
      const targetFill = 0.42; // target 42% of half-height
      const proposedScale = Math.min(
        4,
        Math.max(0.8, (targetFill * 128) / currentAmp)
      );
      // smooth scale to avoid jitter
      scaleRef.current =
        scaleRef.current + (proposedScale - scaleRef.current) * 0.15;

      // waveform
      context.lineWidth = 3;
      context.strokeStyle = "#6b7280"; // neutral-500 line for more contraste
      context.beginPath();
      const sliceWidth = WIDTH / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const centered = (dataArray[i] - 128) / 128; // -1..1
        const y = HEIGHT / 2 + centered * (HEIGHT / 2) * scaleRef.current;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
        x += sliceWidth;
      }
      context.lineTo(WIDTH, HEIGHT / 2);
      context.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      rafRef.current = null;
    };
  }, [isListening, analyser]);

  return (
    <div className={cn("relative w-full", className)}>
      {isListening ? (
        <div className="h-16 rounded-[28px] bg-white text-neutral-700 border border-neutral-200 shadow-sm pr-44 pl-4 flex items-center">
          <div className="w-full flex items-center gap-4">
            <div className="flex-1 h-6">
              <canvas ref={canvasRef} className="w-full h-full" />
            </div>
            <span className="text-sm tabular-nums text-neutral-600">
              {timeLabel}
            </span>
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
                "h-16 rounded-[28px] bg-white border border-neutral-200 shadow-sm pr-44 pl-2 transition-all focus:outline-none focus:ring-0 focus-visible:ring-0 outline-none ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
              input:
                "h-12 rounded-[20px] bg-neutral-100 text-[16px] px-4 placeholder:text-neutral-500 focus:outline-none",
            } as any
          }
        />
      )}

      {/* Web search toggle */}
      {!hideWebSearchToggle && (
        <div className="absolute right-[6.5rem] top-1/2 -translate-y-1/2 flex items-center gap-2 text-neutral-600 select-none">
          <span className="hidden sm:inline text-sm">Búsqueda web</span>
          <Switch
            size="sm"
            isSelected={!!webSearch}
            onValueChange={(v) => onToggleWebSearch?.(v)}
            aria-label="Buscar en la web"
          />
        </div>
      )}

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
            className="bg-neutral-400 rounded-sm inline-block"
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
          className="bg-neutral-400/80 rounded-sm inline-block animate-pulse"
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
