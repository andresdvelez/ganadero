"use client";

import { Input } from "@/components/ui/input";
import { FieldError, UseFormRegister } from "react-hook-form";
import { RanchFormData } from "../RanchFormLogic";

interface TelFieldProps {
  name: keyof RanchFormData;
  label: string;
  placeholder?: string;
  required?: boolean;
  register: UseFormRegister<RanchFormData>;
  error?: FieldError;
}

export function TelField({
  name,
  label,
  placeholder,
  required,
  register,
  error,
}: TelFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        id={name}
        type="tel"
        placeholder={placeholder}
        {...register(name)}
        isInvalid={!!error}
        errorMessage={error?.message}
      />
    </div>
  );
}