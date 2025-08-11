"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card, CardContent } from "./card";
import { Button } from "./button";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  addToast: (t: Omit<ToastItem, "id"> & { id?: string }) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let latestContextRef: ToastContextValue | null = null;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current[id];
    if (timer) clearTimeout(timer);
    delete timersRef.current[id];
  }, []);

  const addToast = useCallback<ToastContextValue["addToast"]>(
    (t) => {
      const id = t.id ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const duration = t.durationMs ?? 4000;
      const variant = t.variant ?? "info";
      setToasts((prev) => [
        {
          id,
          title: t.title,
          description: t.description,
          variant,
          durationMs: duration,
        },
        ...prev,
      ]);
      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({ addToast, removeToast }),
    [addToast, removeToast]
  );

  useEffect(() => {
    latestContextRef = value;
    return () => {
      latestContextRef = null;
    };
  }, [value]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-3 right-3 z-[1000] flex flex-col gap-2 w-[min(92vw,380px)]">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  const { title, description, variant, actionLabel, onAction } = toast;
  const color =
    variant === "success"
      ? "border-green-500"
      : variant === "error"
      ? "border-red-500"
      : variant === "warning"
      ? "border-yellow-500"
      : "border-blue-500";
  const badgeBg =
    variant === "success"
      ? "bg-green-500"
      : variant === "error"
      ? "bg-red-500"
      : variant === "warning"
      ? "bg-yellow-500"
      : "bg-blue-500";
  return (
    <Card className={`border-l-4 ${color} shadow-md`}>
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <div className={`mt-1 h-2.5 w-2.5 rounded-full ${badgeBg}`} />
          <div className="flex-1 text-left">
            {title && <div className="font-semibold text-sm">{title}</div>}
            {description && (
              <div className="text-sm text-neutral-700">{description}</div>
            )}
          </div>
          {actionLabel && onAction && (
            <Button
              size="sm"
              variant="flat"
              onPress={onAction}
              aria-label={actionLabel}
            >
              {actionLabel}
            </Button>
          )}
          <Button
            size="sm"
            variant="light"
            onPress={onClose}
            aria-label="Cerrar"
          >
            Cerrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider is missing in the tree");
  return ctx;
}

// Global helper to match the requested API: addToast(...)
export function addToast(toast: Omit<ToastItem, "id"> & { id?: string }) {
  if (!latestContextRef) return "";
  return latestContextRef.addToast(toast);
}
