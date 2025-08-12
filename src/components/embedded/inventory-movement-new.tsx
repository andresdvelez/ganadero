"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { addToast } from "@/components/ui/toast";
import React from "react";

const schema = z.object({
  productId: z.string().min(1, "Producto requerido"),
  type: z.enum(["in", "out", "adjust"]),
  quantity: z.number().positive("Cantidad > 0"),
  unitCost: z.number().optional(),
  reason: z.string().optional(),
  supplierId: z.string().optional(),
  occurredAt: z.string().min(1, "Fecha requerida"),
});
export type MovementFormData = z.infer<typeof schema>;

export function InventoryMovementNew({
  onCompleted,
  onClose,
  defaults,
}: {
  onCompleted?: (payload?: {
    productId: string;
    quantity: number;
    unitCost?: number;
    supplierId?: string;
  }) => void;
  onClose?: () => void;
  defaults?: Partial<MovementFormData>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const create = trpc.inventory.createMovement.useMutation();
  const products = trpc.inventory.listProducts.useQuery({ limit: 200 });
  const suppliers = trpc.inventory.listSuppliers.useQuery({ limit: 200 });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MovementFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "in",
      occurredAt: new Date().toISOString().slice(0, 10),
    },
  });

  // Apply defaults from props
  React.useEffect(() => {
    if (!defaults) return;
    if (defaults.productId) setValue("productId", defaults.productId);
    if (defaults.type) setValue("type", defaults.type);
    if (typeof defaults.quantity === "number")
      setValue("quantity", defaults.quantity);
    if (typeof defaults.unitCost === "number")
      setValue("unitCost", defaults.unitCost);
    if (typeof defaults.reason === "string")
      setValue("reason", defaults.reason);
    if (typeof defaults.occurredAt === "string")
      setValue("occurredAt", defaults.occurredAt);
    if (typeof defaults.supplierId === "string")
      setValue("supplierId", defaults.supplierId);
  }, [defaults, setValue]);

  const onSubmit = async (data: MovementFormData) => {
    setIsLoading(true);
    try {
      await create.mutateAsync({
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        unitCost: data.unitCost,
        reason: data.reason,
        relatedEntity: data.supplierId,
        occurredAt: new Date(data.occurredAt),
      });
      addToast({ variant: "success", title: "Movimiento registrado" });
      onCompleted?.({
        productId: data.productId,
        quantity: data.quantity,
        unitCost: data.unitCost,
        supplierId: data.supplierId,
      });
    } catch (error: any) {
      addToast({
        variant: "error",
        title: "Error registrando movimiento",
        description: error?.message || "Intenta nuevamente",
        actionLabel: "Reintentar",
        onAction: () => handleSubmit(onSubmit)(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Movimiento de stock</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Producto *</label>
            <select
              {...register("productId")}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Seleccione…</option>
              {(products.data || []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="text-red-500 text-sm mt-1">
                {errors.productId.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo *</label>
            <select
              {...register("type")}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
              <option value="adjust">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cantidad *</label>
            <input
              type="number"
              step="0.01"
              {...register("quantity", { valueAsNumber: true })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {errors.quantity && (
              <p className="text-red-500 text-sm mt-1">
                {errors.quantity.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Proveedor</label>
            <select
              {...register("supplierId")}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Seleccione…</option>
              {(suppliers.data || []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Costo unitario
            </label>
            <input
              type="number"
              step="0.01"
              {...register("unitCost", { valueAsNumber: true })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha *</label>
            <input
              type="date"
              {...register("occurredAt")}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {errors.occurredAt && (
              <p className="text-red-500 text-sm mt-1">
                {errors.occurredAt.message}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Motivo</label>
            <input
              {...register("reason")}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onClose && (
          <Button type="button" variant="bordered" onPress={onClose}>
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
  );
}
