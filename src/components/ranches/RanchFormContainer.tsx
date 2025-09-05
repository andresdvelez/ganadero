"use client";

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
    <RanchFormAPI
      ranchId={ranchId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}