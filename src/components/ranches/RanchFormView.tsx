"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue, Control } from "react-hook-form";
import { RanchFormData } from "./RanchFormLogic";
import { TextField } from "./fields/TextField";
import { SelectField } from "./fields/SelectField";

interface RanchFormViewProps {
  register: UseFormRegister<RanchFormData>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  errors: FieldErrors<RanchFormData>;
  watch: UseFormWatch<RanchFormData>;
  setValue: UseFormSetValue<RanchFormData>;
  control: Control<RanchFormData>;
  isLoading: boolean;
  onCancel?: () => void;
  owners?: { id: string; name: string; email: string }[];
}

export function RanchFormView({
  register,
  handleSubmit,
  errors,
  control,
  isLoading,
  onCancel,
  owners = [],
}: RanchFormViewProps) {
  const ownerOptions = owners.map(owner => ({
    value: owner.name,
    label: `${owner.name} (${owner.email})`
  }));

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nueva Finca</h1>
        {onCancel && (
          <Button
            variant="flat"
            onPress={onCancel}
            startContent={<X className="h-4 w-4" />}
          >
            Cancelar
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Data Section */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Básicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                name="ranchCode"
                label="Código de Finca"
                placeholder="ej. LD-005"
                required
                register={register}
                error={errors.ranchCode}
              />
              <TextField
                name="farmName"
                label="Nombre de la finca"
                placeholder="ej. GANADERÍA LAS BRISAS"
                required
                register={register}
                error={errors.farmName}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                name="location"
                label="Localización"
                placeholder="ej. Vereda La Esperanza"
                required
                register={register}
                error={errors.location}
              />
              <TextField
                name="officialNumber"
                label="Número oficial"
                placeholder="ej. 12345"
                required
                register={register}
                error={errors.officialNumber}
              />
            </div>
            <SelectField
              name="owner"
              label="Propietario"
              options={ownerOptions}
              control={control}
              error={errors.owner}
              required
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button
              type="button"
              variant="flat"
              onPress={onCancel}
              isDisabled={isLoading}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            color="primary"
            startContent={<Save className="h-4 w-4" />}
            isLoading={isLoading}
          >
            Guardar Finca
          </Button>
        </div>
      </form>
    </div>
  );
}