"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic,
  Image as ImageIcon,
  MessageSquare,
  Settings,
  Heart,
  Server,
  BarChart3,
  Plus,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AIAssistantDashboard({
  value,
  onChange,
  onSend,
  onMic,
  onSample,
  userName,
  modelOverlay,
  debugText,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onMic: () => void;
  onSample: (v: string) => void;
  userName?: string | null;
  modelOverlay?: {
    visible: boolean;
    onDownload: () => void;
    isLoading?: boolean;
  };
  debugText?: string;
}) {
  const categories = useMemo(
    () => [
      { id: "productive", title: "Gestión Productiva", icon: Settings },
      { id: "health", title: "Salud y Reproducción", icon: Heart },
      { id: "tech", title: "Integración Tecnológica", icon: Server },
      { id: "admin", title: "Gestión Administrativa", icon: BarChart3 },
      { id: "shortcuts", title: "Crear acceso rápidos", icon: Plus },
    ],
    []
  );

  const overlayActive = !!modelOverlay?.visible;

  return (
    <div className={cn("w-full flex flex-col items-center", "bg-amber-50", "min-h-[calc(100vh-4rem)]")}>
      <div className="text-center mt-8 sm:mt-12 mb-5 sm:mb-7">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight">
          Hola
        </h1>
        <p className="mt-2 text-2xl text-neutral-700">¿Qué puedo hacer por ti?</p>
      </div>

      {/* Big input bar with inner light field */}
      <div className={cn("relative w-full max-w-4xl", overlayActive && "opacity-60")}
      >
        <Input
          aria-label="Campo de solicitud a la IA"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder="Escribe una tarea o pregúntame lo que quieras…"
          variant="flat"
          onKeyDown={(e: any) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={overlayActive}
          classNames={{
            inputWrapper:
              "h-16 rounded-[28px] bg-white border border-neutral-200 shadow-sm pr-16 pl-2",
            input: "h-12 rounded-[20px] bg-neutral-100 text-[16px] px-4",
          } as any}
        />
        {/* Mic button inside input on right */}
        <Button
          isIconOnly
          aria-label="Hablar"
          onPress={onMic}
          disabled={overlayActive}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white text-neutral-700 shadow-sm border border-neutral-200 h-10 w-10"
        >
          <Mic className="h-5 w-5" />
        </Button>
        {/* Action chips under the left edge */}
        <div className="absolute left-3 -bottom-8 flex items-center gap-3 pointer-events-none">
          <Button
            isIconOnly
            variant="solid"
            className="h-12 w-12 rounded-full bg-white text-neutral-700 shadow-[0_10px_20px_rgba(0,0,0,0.08)] border border-neutral-200 pointer-events-auto"
            aria-label="Adjuntar"
            disabled={overlayActive}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            isIconOnly
            variant="solid"
            className="h-12 w-12 rounded-full bg-white text-neutral-700 shadow-[0_10px_20px_rgba(0,0,0,0.08)] border border-neutral-200 pointer-events-auto"
            aria-label="Imagen"
            disabled={overlayActive}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            isIconOnly
            variant="solid"
            className="h-12 w-12 rounded-full bg-white text-neutral-700 shadow-[0_10px_20px_rgba(0,0,0,0.08)] border border-neutral-200 pointer-events-auto"
            aria-label="Plantillas"
            disabled={overlayActive}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>

        {overlayActive && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="px-4 py-3 rounded-2xl bg-white/90 backdrop-blur border border-neutral-200 shadow-sm text-center">
              <p className="text-sm text-neutral-700 mb-2">
                No tienes un modelo de IA local. Descárgalo para usar el
                asistente sin conexión.
              </p>
              <Button
                onPress={modelOverlay?.onDownload}
                isLoading={modelOverlay?.isLoading}
                className="rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                Descargar modelo
              </Button>
              {debugText && (
                <p className="mt-2 text-[11px] text-neutral-500">{debugText}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Category cards */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 w-full max-w-6xl">
        {categories.map(({ id, title, icon: Icon }) => (
          <div
            key={id}
            className={cn(
              "rounded-[26px] bg-white border border-neutral-200 shadow-sm p-6",
              "flex flex-col items-start gap-4"
            )}
          >
            <div className="w-14 h-14 rounded-full grid place-items-center bg-neutral-100">
              <Icon className="w-5 h-5 text-neutral-700" />
            </div>
            <div className="text-neutral-800 text-[17px] font-medium leading-tight">
              {title}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-neutral-600 text-sm">Explora preguntas y usos frecuentes ↑</div>
    </div>
  );
}
