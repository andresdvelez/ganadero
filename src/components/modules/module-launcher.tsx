"use client";

import { useMemo, useState } from "react";
import { moduleRegistry } from "@/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, Search, Tag } from "lucide-react";
import Link from "next/link";

export function ModuleLauncher({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const modules = useMemo(() => Object.values(moduleRegistry), []);
  const categories = useMemo(() => {
    const set = new Set<string>();
    modules.forEach((m) => m.category && set.add(m.category));
    return ["Todos", ...Array.from(set)];
  }, [modules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter((m) => {
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchesCategory =
        !activeCategory ||
        activeCategory === "Todos" ||
        m.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [modules, query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((m) => {
      const key = m.category || "Otros";
      if (!map.has(key)) map.set(key, [] as any);
      (map.get(key) as any).push(m);
    });
    return Array.from(map.entries());
  }, [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-6xl rounded-2xl bg-white shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Explorar módulos</h3>
          <Button
            isIconOnly
            variant="light"
            onPress={onClose}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              aria-label="Buscar módulos"
              placeholder="Buscar por nombre o etiqueta…"
              className="pl-9"
              value={query}
              onChange={(e: any) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-auto">
            {categories.map((c) => (
              <Button
                key={c}
                variant={
                  activeCategory === c || (!activeCategory && c === "Todos")
                    ? "solid"
                    : "flat"
                }
                className={cn(
                  activeCategory === c || (!activeCategory && c === "Todos")
                    ? "bg-violet-600 text-white"
                    : "bg-neutral-100"
                )}
                onPress={() => setActiveCategory(c === "Todos" ? null : c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto space-y-6">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <h4 className="text-sm font-semibold text-neutral-500 mb-2">
                {cat}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {items.map((m) => (
                  <Link
                    key={m.id}
                    href={`/${m.id}`}
                    onClick={onClose}
                    className={cn(
                      "rounded-2xl border border-neutral-200 bg-white hover:shadow-md transition-shadow p-4",
                      "flex flex-col gap-2"
                    )}
                  >
                    <div className="text-sm font-medium text-neutral-800 line-clamp-2">
                      {m.name}
                    </div>
                    <div className="text-xs text-neutral-500">/{m.id}</div>
                    {m.tags && (
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {m.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[11px]"
                          >
                            <Tag className="h-3 w-3" /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-neutral-500 py-10">
              No se encontraron módulos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
