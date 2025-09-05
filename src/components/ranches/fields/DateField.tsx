"use client";

import { Input } from "@/components/ui/input";
import { FieldError, UseFormRegister } from "react-hook-form";
import { RanchFormData } from "../RanchFormLogic";

interface DateFieldProps {
  name: keyof RanchFormData;
  label: string;
  required?: boolean;
  register: UseFormRegister<RanchFormData>;
  error?: FieldError;
}

export function DateField({
  name,
  label,
  required,
  register,
  error,
}: DateFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        id={name}
        type="date"
        {...register(name)}
        isInvalid={!!error}
        errorMessage={error?.message}
      />
    </div>
  );
}