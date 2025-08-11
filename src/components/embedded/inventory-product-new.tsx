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

const schema = z.object({
  code: z.string().min(1, "Código requerido"),
  name: z.string().min(1, "Nombre requerido"),
  unit: z.string().min(1, "Unidad requerida"),
  category: z.string().optional(),
  minStock: z.number().optional(),
  cost: z.number().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});
export type ProductFormData = z.infer<typeof schema>;

export function InventoryProductNew({
  onCompleted,
  onClose,
}: {
  onCompleted?: () => void;
  onClose?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const create = trpc.inventory.createProduct.useMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    try {
      await create.mutateAsync(data);
      addToast({ variant: "success", title: "Producto creado" });
      onCompleted?.();
    } catch (error: any) {
      addToast({
        variant: "error",
        title: "Error creando producto",
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
          <CardTitle>Nuevo producto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Código *</label>
            <input
              {...register("code")}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {errors.code && (
              <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre *</label>
            <input
              {...register("name")}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unidad *</label>
            <input
              {...register("unit")}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ej: kg, lt, und"
            />
            {errors.unit && (
              <p className="text-red-500 text-sm mt-1">{errors.unit.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <input
              {...register("category")}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Stock mínimo
            </label>
            <input
              type="number"
              step="0.01"
              {...register("minStock", { valueAsNumber: true })}
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Proveedor</label>
            <input
              {...register("supplier")}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea
              {...register("notes")}
              rows={3}
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
