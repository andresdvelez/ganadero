"use client";

import React, { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function HeroDrawer({
  open,
  onClose,
  title,
  children,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const container = document.createElement("div");
    container.setAttribute("data-hero-drawer-root", "");
    document.body.appendChild(container);
    containerRef.current = container;
    return () => {
      try {
        if (container.parentNode) document.body.removeChild(container);
      } catch {}
      containerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !containerRef.current) return null;

  const node = (
    <div className="fixed inset-0 z-[60]" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-0 h-full bg-white border-l border-neutral-200 shadow-2xl flex flex-col"
        style={{ width }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-[15px] font-semibold">{title}</div>
          <Button
            isIconOnly
            variant="light"
            aria-label="Cerrar"
            onPress={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );

  return createPortal(node, containerRef.current);
}
