"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AnimalPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (id: string) => void;
}) {
  const animals = trpc.animal.getAll.useQuery();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = animals.data || [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(
      (a: any) =>
        a.name?.toLowerCase().includes(s) ||
        a.tagNumber?.toLowerCase().includes(s)
    );
  }, [animals.data, q]);

  return (
    <div className="space-y-2">
      <Input
        aria-label="Buscar animal"
        placeholder="Buscar por nombre o arete..."
        value={q}
        onChange={(e: any) => setQ(e.target.value)}
      />
      <div className="max-h-60 overflow-auto divide-y">
        {filtered.map((a: any) => (
          <button
            key={a.id}
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-neutral-50"
            onClick={() => onChange(a.id)}
          >
            <div className="text-sm font-medium">{a.name || "Sin nombre"}</div>
            <div className="text-xs text-neutral-500">#{a.tagNumber}</div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-neutral-500 px-3 py-4">
            Sin resultados
          </div>
        )}
      </div>
    </div>
  );
}
