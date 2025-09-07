"use client";

import { DashboardLayout } from "../layout/dashboard-layout";
import { RanchFormAPI } from "./RanchFormAPI";

interface RanchFormContainerProps {
  ranchId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RanchFormContainer({
  ranchId,
  onSuccess,
  onCancel,
}: RanchFormContainerProps) {
  return (
    <DashboardLayout>
      <RanchFormAPI
        ranchId={ranchId}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </DashboardLayout>
  );
}