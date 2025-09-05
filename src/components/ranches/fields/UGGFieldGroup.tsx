"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";
import { NumberField } from "./NumberField";
import { DateField } from "./DateField";
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { RanchFormData } from "../RanchFormLogic";

interface UGGFieldGroupProps {
  register: UseFormRegister<RanchFormData>;
  errors: FieldErrors<RanchFormData>;
  watch: UseFormWatch<RanchFormData>;
  setValue: UseFormSetValue<RanchFormData>;
}

export function UGGFieldGroup({
  register,
  errors,
  watch,
  setValue,
}: UGGFieldGroupProps) {
  const males = watch("males");
  const females = watch("females");
  const uggLots = watch("uggLots");

  const calculateUGG = () => {
    const maleCount = Number(males) || 0;
    const femaleCount = Number(females) || 0;
    const lotsCount = Number(uggLots) || 0;
    
    const totalUGG = maleCount + femaleCount + lotsCount;
    setValue("totalUGG", totalUGG);
    setValue("uggDate", new Date().toISOString().split("T")[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Existencias y U.G.G.</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField
            name="males"
            label="Machos"
            register={register}
            error={errors.males}
            min={0}
          />
          <NumberField
            name="females"
            label="Hembras"
            register={register}
            error={errors.females}
            min={0}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField
            name="uggLots"
            label="UGG Lotes"
            register={register}
            error={errors.uggLots}
            min={0}
          />
          <DateField
            name="uggDate"
            label="Fecha U.G.G."
            register={register}
            error={errors.uggDate}
          />
        </div>

        <div className="flex items-center gap-4">
          <NumberField
            name="totalUGG"
            label="Total U.G.G."
            register={register}
            error={errors.totalUGG}
            min={0}
          />
          <Button
            type="button"
            variant="flat"
            color="primary"
            startContent={<Calculator className="h-4 w-4" />}
            onPress={calculateUGG}
            className="mt-8"
          >
            Calcular UGG
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}