"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue, Control } from "react-hook-form";
import { RanchFormData } from "./RanchFormLogic";
import { TextField } from "./fields/TextField";
import { DateField } from "./fields/DateField";
import { TelField } from "./fields/TelField";
import { SelectField } from "./fields/SelectField";
import { UGGFieldGroup } from "./fields/UGGFieldGroup";

interface RanchFormViewProps {
  register: UseFormRegister<RanchFormData>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  errors: FieldErrors<RanchFormData>;
  watch: UseFormWatch<RanchFormData>;
  setValue: UseFormSetValue<RanchFormData>;
  control: Control<RanchFormData>;
  isLoading: boolean;
  onCancel?: () => void;
}

export function RanchFormView({
  register,
  handleSubmit,
  errors,
  watch,
  setValue,
  control,
  isLoading,
  onCancel,
}: RanchFormViewProps) {
  const historicalCostOptions = [
    { value: "true", label: "Sí" },
    { value: "false", label: "No" },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nueva Hacienda</h1>
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
                label="Código de Hacienda"
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
                register={register}
                error={errors.location}
              />
              <TextField
                name="officialNumber"
                label="Número oficial"
                register={register}
                error={errors.officialNumber}
              />
            </div>
            <TextField
              name="owner"
              label="Propietario"
              register={register}
              error={errors.owner}
            />
          </CardContent>
        </Card>

        {/* Contact and Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Contacto y Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TelField
                name="phone"
                label="Teléfono"
                register={register}
                error={errors.phone}
              />
              <TelField
                name="ranchPhone"
                label="Teléfono Hda"
                register={register}
                error={errors.ranchPhone}
              />
            </div>
            <TextField
              name="address"
              label="Dirección"
              register={register}
              error={errors.address}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                name="nit"
                label="NIT"
                register={register}
                error={errors.nit}
              />
              <TextField
                name="directions"
                label="¿Cómo llegar?"
                placeholder="Instrucciones de ubicación"
                register={register}
                error={errors.directions}
              />
            </div>
          </CardContent>
        </Card>

        {/* Breeder Section */}
        <Card>
          <CardHeader>
            <CardTitle>Criador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                name="breederCode"
                label="Código del Criador"
                placeholder="ej. EGC"
                register={register}
                error={errors.breederCode}
              />
              <TextField
                name="breederName"
                label="Nombre del Criador"
                placeholder="ej. EDUARDO GAITAN CAPERA"
                register={register}
                error={errors.breederName}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dates Section */}
        <Card>
          <CardHeader>
            <CardTitle>Fechas y Visitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateField
                name="startDate"
                label="Fecha de inicio"
                register={register}
                error={errors.startDate}
              />
              <DateField
                name="lastDataEntry"
                label="Última entrada de datos"
                register={register}
                error={errors.lastDataEntry}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateField
                name="updatedTo"
                label="Actualizado a"
                register={register}
                error={errors.updatedTo}
              />
              <DateField
                name="lastVisitDate"
                label="Fecha última visita"
                register={register}
                error={errors.lastVisitDate}
              />
            </div>
          </CardContent>
        </Card>

        {/* UGG Section */}
        <UGGFieldGroup
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
        />

        {/* Other Options Section */}
        <Card>
          <CardHeader>
            <CardTitle>Otras Opciones</CardTitle>
          </CardHeader>
          <CardContent>
            <SelectField
              name="historicalCostAccumulation"
              label="Acumulación histórica de costos"
              options={historicalCostOptions}
              control={control}
              error={errors.historicalCostAccumulation}
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
            Guardar Hacienda
          </Button>
        </div>
      </form>
    </div>
  );
}