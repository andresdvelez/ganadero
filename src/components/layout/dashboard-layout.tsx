"use client";

import { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  Home,
  Home as Cow,
  Heart,
  Baby,
  Warehouse,
  DollarSign,
  FileText,
  Settings,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/constants/translations";

const navigation = [
  { name: translations.navigation.dashboard, href: "/", icon: Home },
  { name: translations.navigation.animals, href: "/animals", icon: Cow },
  { name: translations.navigation.health, href: "/health", icon: Heart },
  { name: translations.navigation.breeding, href: "/breeding", icon: Baby },
  {
    name: translations.navigation.inventory,
    href: "/inventory",
    icon: Warehouse,
  },
  { name: translations.navigation.finance, href: "/finance", icon: DollarSign },
  { name: translations.navigation.reports, href: "/reports", icon: FileText },
  { name: translations.navigation.settings, href: "/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 px-3 py-4 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          "ios-surface",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-2 py-2">
          <Link href="/" className="flex items-center gap-2">
            <Cow className="h-7 w-7 text-violet-600" />
            <span className="text-lg font-semibold text-slate-800">
              Ganado AI
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-full hover:bg-white/60"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl",
                  isActive
                    ? "bg-white/80 shadow-sm text-slate-900"
                    : "hover:bg-white/60 text-slate-700"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* AI Assistant CTA */}
        <div className="mt-auto p-3">
          <Link
            href="/ai-assistant"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">{translations.ai.title}</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 ios-toolbar">
          <div className="flex h-14 items-center justify-between px-3 sm:px-5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-full hover:bg-white/60"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5 text-slate-700" />
            </button>

            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-slate-600">En Línea</span>
            </div>

            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{ elements: { avatarBox: "h-8 w-8" } }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-5">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
