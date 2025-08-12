"use client";

import { useEffect, useState } from "react";

export function Tabs({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  // Listen to custom events and notify parent onValueChange
  useEffect(() => {
    const handler = (e: any) => {
      const v = e.detail?.value;
      if (v) onValueChange(v);
    };
    window.addEventListener("tabs:change", handler as any);
    return () => window.removeEventListener("tabs:change", handler as any);
  }, [onValueChange]);
  return <div data-tabs>{children}</div>;
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex gap-2 rounded-lg border p-1 bg-white">
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="px-3 py-1.5 rounded-md text-sm hover:bg-neutral-50 data-[active=true]:bg-neutral-200"
      data-value={value}
      onClick={() => {
        const ev = new CustomEvent("tabs:change", { detail: { value } });
        window.dispatchEvent(ev);
      }}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: any) => setActive(e.detail?.value || null);
    window.addEventListener("tabs:change", handler as any);
    return () => window.removeEventListener("tabs:change", handler as any);
  }, []);
  return <div hidden={active !== null && active !== value}>{children}</div>;
}
