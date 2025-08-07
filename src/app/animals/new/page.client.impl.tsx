"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { translations } from "@/lib/constants/translations";
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
import { ArrowLeft, Save, Camera, QrCode, Loader2, X } from "lucide-react";

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

type AnimalFormData = z.infer<typeof animalSchema>;

export default function NewAnimalClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [tagNumber] = useState(generateTagNumber());

  const createAnimalMutation = trpc.animal.create.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
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
        userId: "current-user-id",
        status: "active",
        synced: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.animals.add(animalData);
      await addToSyncQueue(
        "create",
        "animal",
        animalId,
        animalData,
        "current-user-id"
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
      router.push("/animals");
    } catch (error) {
      console.error("Error creando animal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-ranch-100 rounded-lg transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5 text-ranch-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-ranch-900">
                {translations.animals.addAnimal}
              </h1>
              <p className="text-ranch-600">Etiqueta: #{tagNumber}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ranch-700 mb-1">
                    {translations.animals.name} *
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
                    {translations.animals.species}
                  </label>
                  <select
                    {...register("species")}
                    className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  >
                    <option value="cattle">
                      {translations.animals.cattle}
                    </option>
                    <option value="sheep">{translations.animals.sheep}</option>
                    <option value="goat">{translations.animals.goat}</option>
                    <option value="pig">{translations.animals.pig}</option>
                    <option value="horse">{translations.animals.horse}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ranch-700 mb-1">
                    {translations.animals.breed}
                  </label>
                  <input
                    {...register("breed")}
                    className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                    placeholder="Ej: Holstein"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ranch-700 mb-1">
                    {translations.animals.sex} *
                  </label>
                  <select
                    {...register("sex")}
                    className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  >
                    <option value="female">
                      {translations.animals.female}
                    </option>
                    <option value="male">{translations.animals.male}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ranch-700 mb-1">
                    {translations.animals.birthDate}
                  </label>
                  <input
                    type="date"
                    {...register("birthDate")}
                    className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ranch-700 mb-1">
                    {translations.animals.weight} (kg)
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
                    {translations.animals.color}
                  </label>
                  <input
                    {...register("color")}
                    className="w-full px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                    placeholder="Ej: Blanco y negro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ranch-700 mb-1">
                    {translations.animals.location}
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

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="bordered"
              onClick={() => router.back()}
            >
              {translations.common.cancel}
            </Button>
            <Button
              type="submit"
              isDisabled={isLoading}
              className="bg-ranch-500 hover:bg-ranch-600 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              {translations.common.save}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
