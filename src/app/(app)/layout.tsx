"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { GlobalAISidebar } from "@/components/ai/global-ai-sidebar";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout leftSlot={<GlobalAISidebar />}>{children}</DashboardLayout>
  );
}
