"use client";

import { Sparkles } from "lucide-react";

export function AIHubHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-neutral-200 text-sm text-primary-purple">
        <Sparkles className="w-4 h-4" /> Asistente IA
      </div>
      <h2 className="mt-3 text-2xl font-bold text-primary-dark">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-text-secondary text-sm max-w-xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
} 