"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { db, generateUUID, addToSyncQueue } from "@/lib/dexie";
import { generateTagNumber } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import QRCode from "qrcode";
import Compressor from "compressorjs";
import { useDropzone } from "react-dropzone";
import { QrCode, Loader2, X, Camera, Save } from "lucide-react";

const animalSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  species: z.string().min(1, "Especie es requerida"),
  breed: z.string().optional(),
  sex: z.enum(["male", "female"]),
  birthDate: z.string().optional(),
  weight: z.number().optional(),
  color: z.string().optional(),
  motherId: z.string().optional(),
  fatherId: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type AnimalFormData = z.infer<typeof animalSchema>;

export function AnimalNewEmbedded({
  onCompleted,
  onClose,
}: {
  onCompleted?: () => void;
  onClose?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [tagNumber] = useState(generateTagNumber());

  const createAnimalMutation = trpc.animal.create.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AnimalFormData>({
    resolver: zodResolver(animalSchema),
    defaultValues: { species: "cattle", sex: "female" },
  });

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      new Compressor(file, {
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        success(result) {
          const reader = new FileReader();
          reader.onloadend = () => setPhoto(reader.result as string);
          reader.readAsDataURL(result);
        },
        error(err) {
          console.error("Error comprimiendo imagen:", err);
        },
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
  });

  const generateQR = async () => {
    try {
      const qrData = {
        type: "animal",
        tag: tagNumber,
        name: watch("name"),
        id: generateUUID(),
      };
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: { dark: "#844831", light: "#FFFFFF" },
      });
      setQrCode(qrDataUrl);
    } catch (error) {
      console.error("Error generando QR:", error);
    }
  };

  const onSubmit = async (data: AnimalFormData) => {
    setIsLoading(true);
    try {
      const animalId = generateUUID();
      const animalData = {
        ...data,
        uuid: animalId,
        tagNumber,
        imageUrl: photo ?? undefined,
        qrCode: qrCode ?? undefined,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        userId: "dev-user",
        status: "active",
        synced: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      await db.animals.add(animalData);
      await addToSyncQueue(
        "create",
        "animal",
        animalId,
        animalData,
        "dev-user"
      );
      if (navigator.onLine) {
        try {
          await createAnimalMutation.mutateAsync({
            name: data.name,
            species: data.species || "cattle",
            breed: data.breed,
            sex: data.sex,
            birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            weight: data.weight,
            color: data.color,
            motherId: data.motherId,
            fatherId: data.fatherId,
          });
        } catch (error) {
          console.log("Error sincronizando, se guardó localmente:", error);
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("animals-changed"));
      }
      onCompleted?.();
    } catch (error) {
      console.error("Error creando animal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl border border-ranch-200 rounded-lg bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">Nuevo animal</h3>
        <div className="flex gap-2">
          {onClose && (
            <Button type="button" variant="bordered" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            form="animalForm"
            className="bg-ranch-500 hover:bg-ranch-600 text-white"
          >
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
        </div>
      </div>
      <form
        id="animalForm"
        onSubmit={handleSubmit(onSubmit)}
        className="p-4 space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Foto del Animal</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-ranch-300 rounded-lg p-6 text-center cursor-pointer hover:border-ranch-500 transition-colors"
            >
              <input {...getInputProps()} />
              {photo ? (
                <div className="relative">
                  <img
                    src={photo}
                    alt="Animal"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhoto(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                    aria-label="Eliminar foto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="h-12 w-12 text-ranch-400 mx-auto" />
                  <p className="text-ranch-600">
                    {isDragActive
                      ? "Suelta la imagen aquí"
                      : "Arrastra una imagen o haz clic para seleccionar"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-amber-700 mb-2">
              Nota: Generar el QR no guarda el registro. Debes presionar
              Guardar.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ranch-700 mb-1">
                  Nombre *
                </label>
                <input
                  {...register("name")}
                  className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  placeholder="Ej: Bella"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-ranch-700 mb-1">
                  Especie
                </label>
                <select
                  {...register("species")}
                  className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                >
                  <option value="cattle">Bovino</option>
                  <option value="sheep">Ovino</option>
                  <option value="goat">Caprino</option>
                  <option value="pig">Porcino</option>
                  <option value="horse">Equino</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ranch-700 mb-1">
                  Raza
                </label>
                <input
                  {...register("breed")}
                  className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  placeholder="Ej: Holstein"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ranch-700 mb-1">
                  Sexo *
                </label>
                <select
                  {...register("sex")}
                  className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                >
                  <option value="female">Hembra</option>
                  <option value="male">Macho</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ranch-700 mb-1">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  {...register("birthDate")}
                  className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ranch-700 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register("weight", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  placeholder="Ej: 450"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ranch-700 mb-1">
                  Color
                </label>
                <input
                  {...register("color")}
                  className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  placeholder="Ej: Blanco y negro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ranch-700 mb-1">
                  Ubicación
                </label>
                <input
                  {...register("location")}
                  className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  placeholder="Ej: Potrero 3"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ranch-700 mb-1">
                Notas
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                placeholder="Información adicional..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Código QR</CardTitle>
          </CardHeader>
          <CardContent>
            {qrCode ? (
              <div className="text-center">
                <img src={qrCode} alt="QR Code" className="mx-auto mb-4" />
                <p className="text-sm text-ranch-600">
                  Código QR generado para etiqueta #{tagNumber}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Button
                  type="button"
                  onClick={generateQR}
                  variant="bordered"
                  isDisabled={!watch("name")}
                >
                  <QrCode className="h-5 w-5 mr-2" /> Generar Código QR
                </Button>
                {!watch("name") && (
                  <p className="text-sm text-ranch-600 mt-2">
                    Ingresa el nombre del animal primero
                  </p>
                )}
              </div>
            )}
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
