"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home as Cow,
  Heart,
  Baby,
  Warehouse,
  DollarSign,
  FileText,
  Leaf,
  CloudSun,
  ClipboardList,
  MilkOff,
  FlaskConical,
  Radar,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ModuleItem {
  id: string;
  name: string;
  href?: string;
}

const moduleIcon: Record<string, any> = {
  animals: Cow,
  health: Heart,
  breeding: Baby,
  inventory: Warehouse,
  finance: DollarSign,
  reports: FileText,
  pastures: Leaf,
  weather: CloudSun,
  tasks: ClipboardList,
  milk: MilkOff,
  lab: FlaskConical,
  sensors: Radar,
  locations: MapPin,
};

export function ModuleGrid({
  modules,
  onSelect,
  className,
}: {
  modules: ModuleItem[];
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4",
        className
      )}
    >
      {modules.map((m) => {
        const Icon = moduleIcon[m.id] || Users;
        const content = (
          <div
            className={cn(
              "group aspect-square rounded-2xl border border-white/40",
              "bg-white/70 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_8px_20px_rgba(15,23,42,0.06)]",
              "flex flex-col items-center justify-center px-1 text-center",
              "hover:shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_14px_30px_rgba(15,23,42,0.12)] transition-shadow"
            )}
          >
            <div className="w-9 h-9 rounded-xl grid place-items-center mb-1 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] sm:text-xs text-slate-700 leading-tight line-clamp-2">
              {m.name}
            </span>
          </div>
        );
        return m.href ? (
          <Link key={m.id} href={m.href} className="block">
            {content}
          </Link>
        ) : (
          <Button
            key={m.id}
            onPress={() => onSelect?.(m.id)}
            className="block"
            variant="light"
          >
            {content}
          </Button>
        );
      })}
    </div>
  );
}
