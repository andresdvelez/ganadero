"use client";

import { ReactNode } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}


