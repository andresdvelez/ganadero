"use client";

import React, { ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

export function HeroModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) || null;
    const container = document.createElement("div");
    container.setAttribute("data-hero-modal-root", "");
    document.body.appendChild(container);
    containerRef.current = container;
    return () => {
      try {
        if (container.parentNode) document.body.removeChild(container);
      } catch {}
      containerRef.current = null;
      try {
        if (previouslyFocused.current) previouslyFocused.current.focus?.();
      } catch {}
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        // simple focus trap
        const root = document.getElementById("hero-modal-content");
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const firstFocusable = document
      .getElementById("hero-modal-content")
      ?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    firstFocusable?.focus?.();
  }, [open]);

  if (!open || !containerRef.current) return null;

  const maxWidth =
    size === "sm"
      ? "max-w-md"
      : size === "md"
      ? "max-w-2xl"
      : size === "lg"
      ? "max-w-3xl"
      : "max-w-5xl";

  const node = (
    <div
      className="fixed inset-0 z-[60]"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? "hero-modal-title" : undefined}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={cn("relative mx-auto px-4", maxWidth)}>
        <div className="mt-10" />
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="text-[15px] font-semibold" id="hero-modal-title">
              {title}
            </div>
            <Button
              isIconOnly
              variant="light"
              aria-label="Cerrar"
              onPress={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div
            id="hero-modal-content"
            className="p-4 max-h-[70vh] overflow-auto"
          >
            {children}
          </div>
          {footer && (
            <div className="px-4 py-3 border-t bg-neutral-50">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, containerRef.current);
}
