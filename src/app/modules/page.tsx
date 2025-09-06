"use client";

import { useMemo, useState } from "react";
import { moduleRegistry } from "@/modules";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Search, Tag } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function ModulesExplorerPage() {
  const modules = useMemo(() => Object.values(moduleRegistry), []);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    modules.forEach((m) => m.category && set.add(m.category));
    return ["Todos", ...Array.from(set)] as string[];
  }, [modules]);

  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    modules.forEach((m) => {
      const key = m.category || "Otros";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [modules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter((m) => {
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.tags || []).some((t: string) => t.toLowerCase().includes(q));
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
      const key = (m as any).category || "Otros";
      if (!map.has(key)) map.set(key, [] as any);
      (map.get(key) as any).push(m);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold">Explorar módulos</h1>
            <p className="text-neutral-600">
              Busca y abre cualquier módulo de la plataforma.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-3">
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
                  className={
                    activeCategory === c || (!activeCategory && c === "Todos")
                      ? "bg-violet-600 text-white"
                      : "bg-neutral-100"
                  }
                  onPress={() => setActiveCategory(c === "Todos" ? null : c)}
                >
                  {c}
                  {c !== "Todos" && (
                    <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[11px] bg-white/90 text-violet-700">
                      {countsByCategory.get(c) || 0}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="text-xs text-neutral-500 mb-3">
            {filtered.length} resultados
          </div>

          <div className="space-y-6">
            {grouped.map(([cat, items]) => (
              <section key={cat}>
                <h2 className="text-sm font-semibold text-neutral-500 mb-2">
                  {cat}{" "}
                  <span className="ml-1 text-[11px] text-neutral-400">
                    ({(items as any[]).length})
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {(items as any[]).map((m: any) => (
                    <Link
                      key={m.id}
                      href={(m.path || `/${m.id}`).replace(/^\/\_\//, "/")}
                      className="rounded-2xl border border-neutral-200 bg-white hover:shadow-md transition-shadow p-4 flex flex-col gap-2"
                    >
                      <div className="text-sm font-medium text-neutral-800 line-clamp-2">
                        {m.name}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {(m.path || `/${m.id}`).replace(/^\/\_\//, "/")}
                      </div>
                      {m.tags && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {m.tags.slice(0, 3).map((t: string) => (
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
              </section>
            ))}

            {filtered.length === 0 && (
              <div className="text-center text-neutral-500 py-10">
                No se encontraron módulos
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
