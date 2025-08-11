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

const PERSIST_KEY = "form.health.create";

const healthSchema = z.object({
  animalId: z.string().min(1, "Animal es requerido"),
  type: z.string().min(1, "Tipo es requerido"),
  description: z.string().min(1, "Descripción es requerida"),
  medication: z.string().optional(),
  dosage: z.string().optional(),
  veterinarian: z.string().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
  performedAt: z.string().min(1, "Fecha requerida"),
  nextDueDate: z.string().optional(),
});

export type HealthFormData = z.infer<typeof healthSchema>;

export function HealthNewEmbedded({
  defaultAnimalId,
  onCompleted,
  onClose,
}: {
  defaultAnimalId?: string;
  onCompleted?: () => void;
  onClose?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const createMutation = trpc.health.create.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<HealthFormData>({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      animalId: defaultAnimalId || "",
      performedAt: new Date().toISOString().slice(0, 10),
    },
  });

  // persist simple form state to avoid loss on accidental close
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

  const onSubmit = async (data: HealthFormData) => {
    setIsLoading(true);
    try {
      const uuid = generateUUID();
      const payload = {
        uuid,
        userId: "dev-user",
        animalId: data.animalId,
        type: data.type,
        description: data.description,
        medication: data.medication,
        dosage: data.dosage,
        veterinarian: data.veterinarian,
        cost: data.cost,
        notes: data.notes,
        performedAt: new Date(data.performedAt),
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
        synced: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      await db.healthRecords.add(payload);
      await addToSyncQueue(
        "create",
        "health_record",
        uuid,
        payload,
        "dev-user"
      );

      if (navigator.onLine) {
        try {
          await createMutation.mutateAsync({
            animalId: data.animalId,
            type: data.type,
            description: data.description,
            medication: data.medication,
            dosage: data.dosage,
            veterinarian: data.veterinarian,
            cost: data.cost,
            notes: data.notes,
            performedAt: new Date(data.performedAt),
            nextDueDate: data.nextDueDate
              ? new Date(data.nextDueDate)
              : undefined,
          });
        } catch (e) {
          addToast({
            variant: "warning",
            title: "Sincronización pendiente",
            description:
              "Se guardó offline. Se sincronizará cuando haya internet.",
            durationMs: 5000,
          });
        }
      } else {
        addToast({
          variant: "info",
          title: "Guardado sin conexión",
          description: "El registro se sincronizará automáticamente.",
          durationMs: 4000,
        });
      }

      addToast({ variant: "success", title: "Salud registrada" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("health-changed"));
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
        <h3 className="font-semibold">Nuevo evento de salud</h3>
        <div className="flex gap-2">
          {onClose && (
            <Button type="button" variant="bordered" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            form="healthForm"
            className="bg-ranch-500 hover:bg-ranch-600 text-white"
          >
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
        </div>
      </div>
      <form
        id="healthForm"
        onSubmit={handleSubmit(onSubmit)}
        className="p-4 space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Información del evento</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Animal *</label>
              <AnimalPicker
                value={watch("animalId")}
                onChange={(id) => setValue("animalId", id)}
              />
              {errors.animalId && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.animalId.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo *</label>
              <input
                {...register("type")}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Vacuna, tratamiento..."
              />
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Descripción *
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Medicamento
              </label>
              <input
                {...register("medication")}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dosis</label>
              <input
                {...register("dosage")}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Veterinario
              </label>
              <input
                {...register("veterinarian")}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Costo</label>
              <input
                type="number"
                step="0.01"
                {...register("cost", { valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha *</label>
              <input
                type="date"
                {...register("performedAt")}
                className="w-full px-3 py-2 border rounded-lg"
              />
              {errors.performedAt && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.performedAt.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Próxima cita
              </label>
              <input
                type="date"
                {...register("nextDueDate")}
                className="w-full px-3 py-2 border rounded-lg"
              />
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
