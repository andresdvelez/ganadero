"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { GlobalAISidebar } from "@/components/ai/global-ai-sidebar";

export function GlobalShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout leftSlot={<GlobalAISidebar />}>{children}</DashboardLayout>
  );
}
