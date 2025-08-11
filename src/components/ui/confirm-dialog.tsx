"use client";

import { useState, useCallback } from "react";
import { HeroModal } from "./hero-modal";
import { Button } from "@/components/ui/button";

export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    resolve?: (v: boolean) => void;
  }>({ open: false });

  const confirm = useCallback(
    (
      opts: {
        title?: string;
        message?: string;
        confirmText?: string;
        cancelText?: string;
      } = {}
    ) => {
      return new Promise<boolean>((resolve) => {
        setState({ open: true, resolve, ...opts });
      });
    },
    []
  );

  const dialog = (
    <HeroModal
      open={state.open}
      onClose={() => state.resolve?.(false)}
      title={state.title || "¿Confirmar?"}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="bordered" onPress={() => state.resolve?.(false)}>
            {state.cancelText || "Cancelar"}
          </Button>
          <Button
            className="bg-red-600 text-white"
            onPress={() => state.resolve?.(true)}
          >
            {state.confirmText || "Confirmar"}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-neutral-700">
        {state.message || "Esta acción no se puede deshacer."}
      </p>
    </HeroModal>
  );

  return { confirm, dialog } as const;
}
