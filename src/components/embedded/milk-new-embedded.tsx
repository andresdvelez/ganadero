"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { db, generateUUID, addToSyncQueue } from "@/lib/dexie";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { AnimalPicker } from "./animal-picker";
import { addToast } from "@/components/ui/toast";

const PERSIST_KEY = "form.milk.create";

const milkSchema = z.object({
  animalId: z.string().optional(),
  session: z.enum(["AM", "PM", "TOTAL"]),
  liters: z.number().positive("Litros > 0"),
  fatPct: z.number().optional(),
  proteinPct: z.number().optional(),
  ccs: z.number().optional(),
  notes: z.string().optional(),
  recordedAt: z.string().min(1, "Fecha requerida"),
});

export type MilkFormData = z.infer<typeof milkSchema>;

export function MilkNewEmbedded({
  defaultAnimalId,
  onCompleted,
  onClose,
}: {
  defaultAnimalId?: string;
  onCompleted?: () => void;
  onClose?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const createMutation = trpc.milk.create.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MilkFormData>({
    resolver: zodResolver(milkSchema),
    defaultValues: {
      animalId: defaultAnimalId,
      session: "AM",
      recordedAt: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PERSIST_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        Object.entries(data).forEach(([k, v]) => setValue(k as any, v as any));
      }
    } catch {}
  }, [setValue]);
  useEffect(() => {
    const sub = watch((values) => {
      try {
        localStorage.setItem(PERSIST_KEY, JSON.stringify(values));
      } catch {}
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const onSubmit = async (data: MilkFormData) => {
    setIsLoading(true);
    try {
      const uuid = generateUUID();
      const payload = {
        uuid,
        userId: "dev-user",
        animalId: data.animalId,
        session: data.session,
        liters: data.liters,
        fatPct: data.fatPct,
        proteinPct: data.proteinPct,
        ccs: data.ccs,
        notes: data.notes,
        recordedAt: new Date(data.recordedAt),
        synced: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      await db.milkRecords.add(payload);
      await addToSyncQueue("create", "milk_record", uuid, payload, "dev-user");

      if (navigator.onLine) {
        try {
          await createMutation.mutateAsync({
            animalId: data.animalId,
            session: data.session,
            liters: data.liters,
            fatPct: data.fatPct,
            proteinPct: data.proteinPct,
            ccs: data.ccs,
            notes: data.notes,
            recordedAt: new Date(data.recordedAt),
          });
        } catch (e) {
          addToast({
            variant: "warning",
            title: "Sincronización pendiente",
            description:
              "Se guardó offline. Se sincronizará cuando haya internet.",
          });
        }
      } else {
        addToast({ variant: "info", title: "Guardado sin conexión" });
      }

      addToast({ variant: "success", title: "Registro de leche guardado" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("milk-changed"));
      }
      onCompleted?.();
    } catch (error: any) {
      addToast({
        variant: "error",
        title: "Error guardando",
        description: error?.message || "Intenta nuevamente",
        actionLabel: "Reintentar",
        onAction: () => handleSubmit(onSubmit)(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl border border-ranch-200 rounded-lg bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">Nuevo registro de leche</h3>
        <div className="flex gap-2">
          {onClose && (
            <Button type="button" variant="bordered" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            form="milkForm"
            className="bg-ranch-500 hover:bg-ranch-600 text-white"
          >
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
        </div>
      </div>
      <form
        id="milkForm"
        onSubmit={handleSubmit(onSubmit)}
        className="p-4 space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Animal</label>
              <AnimalPicker
                value={watch("animalId") as any}
                onChange={(id) => setValue("animalId", id)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sesión *</label>
              <select
                {...register("session")}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
                <option value="TOTAL">TOTAL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Litros *</label>
              <input
                type="number"
                step="0.01"
                {...register("liters", { valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              {errors.liters && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.liters.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Grasa (%)
              </label>
              <input
                type="number"
                step="0.01"
                {...register("fatPct", { valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Proteína (%)
              </label>
              <input
                type="number"
                step="0.01"
                {...register("proteinPct", { valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CCS</label>
              <input
                type="number"
                step="1"
                {...register("ccs", { valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha *</label>
              <input
                type="date"
                {...register("recordedAt")}
                className="w-full px-3 py-2 border rounded-lg"
              />
              {errors.recordedAt && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.recordedAt.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notas</label>
              <textarea
                {...register("notes")}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-3 -mx-4 flex justify-end gap-2">
          {onClose && (
            <Button type="button" variant="bordered" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            isDisabled={isLoading}
            className="bg-ranch-500 hover:bg-ranch-600 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Guardar
          </Button>
        </div>
      </form>
    </div>
  );
}
