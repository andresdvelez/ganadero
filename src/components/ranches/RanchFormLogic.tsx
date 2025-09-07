"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RanchFormView } from "./RanchFormView";

const ranchSchema = z.object({
  ranchCode: z.string().min(1, "Código de Finca es requerido"),
  farmName: z.string().min(1, "Nombre de la finca es requerido"),
  location: z.string().min(1, "Localización es requerida"),
  officialNumber: z.string().min(1, "Número oficial es requerido"),
  owner: z.string().min(1, "Propietario es requerido"),
  phone: z.string().optional(),
  ranchPhone: z.string().optional(),
  address: z.string().optional(),
  nit: z.string().optional(),
  directions: z.string().optional(),
  breederCode: z.string().optional(),
  breederName: z.string().optional(),
  startDate: z.string().optional(),
  lastDataEntry: z.string().optional(),
  updatedTo: z.string().optional(),
  lastVisitDate: z.string().optional(),
  males: z.number().optional(),
  females: z.number().optional(),
  uggLots: z.number().optional(),
  uggDate: z.string().optional(),
  totalUGG: z.number().optional(),
  historicalCostAccumulation: z.boolean(),
});

export type RanchFormData = z.infer<typeof ranchSchema>;

interface RanchFormLogicProps {
  initialData?: Partial<RanchFormData>;
  onSubmit: (data: RanchFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  owners?: { id: string; name: string; email: string }[];
}

export function RanchFormLogic({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  owners,
}: RanchFormLogicProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RanchFormData>({
    resolver: zodResolver(ranchSchema),
    defaultValues: {
      historicalCostAccumulation: false,
      ...initialData,
    },
  });

  const handleFormSubmit = async (data: RanchFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Error submitting ranch form:", error);
    }
  };

  return (
    <RanchFormView
      register={register}
      handleSubmit={handleSubmit(handleFormSubmit)}
      errors={errors}
      watch={watch}
      setValue={setValue}
      control={control}
      isLoading={isLoading || isSubmitting}
      onCancel={onCancel}
      owners={owners}
    />
  );
}