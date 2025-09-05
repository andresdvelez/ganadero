"use client";

import { Select, SelectItem } from "@/components/ui/select";
import { FieldError, UseFormRegister, Controller, Control } from "react-hook-form";
import { RanchFormData } from "../RanchFormLogic";

interface SelectFieldProps {
  name: keyof RanchFormData;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  control: Control<RanchFormData>;
  error?: FieldError;
}

export function SelectField({
  name,
  label,
  options,
  placeholder,
  required,
  control,
  error,
}: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            placeholder={placeholder}
            selectedKeys={field.value ? [String(field.value)] : []}
            onSelectionChange={(keys) => {
              const selectedValue = Array.from(keys)[0] as string;
              field.onChange(selectedValue === "true" ? true : selectedValue === "false" ? false : selectedValue);
            }}
            isInvalid={!!error}
            errorMessage={error?.message}
          >
            {options.map((option) => (
              <SelectItem key={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        )}
      />
    </div>
  );
}