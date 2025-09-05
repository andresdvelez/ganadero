"use client";

import { Input } from "@/components/ui/input";
import { FieldError, UseFormRegister } from "react-hook-form";
import { RanchFormData } from "../RanchFormLogic";

interface NumberFieldProps {
  name: keyof RanchFormData;
  label: string;
  placeholder?: string;
  required?: boolean;
  register: UseFormRegister<RanchFormData>;
  error?: FieldError;
  min?: number;
  max?: number;
}

export function NumberField({
  name,
  label,
  placeholder,
  required,
  register,
  error,
  min,
  max,
}: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        id={name}
        type="number"
        placeholder={placeholder}
        min={min}
        max={max}
        {...register(name, { valueAsNumber: true })}
        isInvalid={!!error}
        errorMessage={error?.message}
      />
    </div>
  );
}