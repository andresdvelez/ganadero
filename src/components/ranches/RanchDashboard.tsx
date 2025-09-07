"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import {
  UserPlus,
  Calendar,
  BarChart3,
  Edit,
  Phone,
  MapPin
} from "lucide-react";
import { DashboardLayout } from "../layout/dashboard-layout";

interface RanchDashboardProps {
  ranchId: string;
}

export function RanchDashboard({ ranchId }: RanchDashboardProps) {
  const getRanchQuery = trpc.farm.getById.useQuery(
    { id: ranchId },
    { enabled: !!ranchId }
  );

  const ranch = getRanchQuery.data;

  if (getRanchQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!ranch) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-600">Finca no encontrada</h1>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{ranch.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <span className="flex items-center gap-1">
                <span className="font-medium">Código:</span> {ranch.code}
              </span>
              {ranch.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {ranch.location}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="flat"
            startContent={<Edit className="h-4 w-4" />}
            onPress={() => {
              window.location.href = `/ranches/${ranchId}/edit`;
            }}
          >
            Editar Finca
          </Button>
        </div>

        {/* Ranch Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-gray-700">Propietario</h4>
              <p className="text-gray-900">{ranch.ownerName || "Sin especificar"}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700">Número Oficial</h4>
              <p className="text-gray-900">{ranch.officialNumber || "Sin especificar"}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700">Teléfono</h4>
              <p className="text-gray-900">{ranch.phone || "Sin especificar"}</p>
            </div>
            {ranch.address && (
              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-700">Dirección</h4>
                <p className="text-gray-900">{ranch.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalles de Contacto - Always Visible */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Detalles de Contacto</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <label className="text-sm font-semibold text-gray-700">Teléfono Principal</label>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {ranch.phone || <span className="text-gray-500 italic">Sin especificar</span>}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  <label className="text-sm font-semibold text-gray-700">Teléfono Hacienda</label>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {ranch.ranchPhone || <span className="text-gray-500 italic">Sin especificar</span>}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-4 w-4 text-purple-600 font-bold text-xs">NIT</span>
                  <label className="text-sm font-semibold text-gray-700">Número NIT</label>
                </div>
                <p className="text-lg font-medium text-gray-900">
                  {ranch.nit || <span className="text-gray-500 italic">Sin especificar</span>}
                </p>
              </div>
            </div>

            {(ranch.address || ranch.directions) && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
                <h4 className="font-semibold text-blue-800 mb-3">Información de Ubicación</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ranch.address && (
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">Dirección</label>
                      <p className="text-gray-900">{ranch.address}</p>
                    </div>
                  )}
                  {ranch.directions && (
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">¿Cómo llegar?</label>
                      <p className="text-gray-900">{ranch.directions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Criador - Always Visible */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <UserPlus className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Información del Criador</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <div className="text-center">
                <div className="mb-3">
                  <UserPlus className="h-12 w-12 text-orange-600 mx-auto mb-2" />
                  <label className="text-sm font-semibold text-orange-700">Nombre del Criador</label>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {ranch.breederName || <span className="text-gray-500 italic text-lg">Sin especificar</span>}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-sm text-gray-600 text-center">
                <span className="font-medium">Estado:</span> {ranch.breederName ? "Criador asignado" : "Pendiente de asignar criador"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Visitantes y Fechas - Always Visible */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Visitantes y Fechas Importantes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <label className="text-sm font-semibold text-green-700 block mb-1">Fecha de Inicio</label>
                  <p className="text-lg font-bold text-gray-900">
                    {ranch.startDate
                      ? new Date(ranch.startDate).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })
                      : <span className="text-gray-500 italic text-sm">Sin especificar</span>}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <label className="text-sm font-semibold text-blue-700 block mb-1">Última Entrada de Datos</label>
                  <p className="text-lg font-bold text-gray-900">
                    {ranch.lastDataEntryAt
                      ? new Date(ranch.lastDataEntryAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })
                      : <span className="text-gray-500 italic text-sm">Sin especificar</span>}
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <label className="text-sm font-semibold text-purple-700 block mb-1">Última Visita</label>
                  <p className="text-lg font-bold text-gray-900">
                    {ranch.lastVisitAt
                      ? new Date(ranch.lastVisitAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })
                      : <span className="text-gray-500 italic text-sm">Sin especificar</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h4 className="font-semibold text-gray-700 mb-3 text-center">Resumen de Actividad</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <span className="font-semibold text-gray-700">Días desde inicio: </span>
                  <span className="text-gray-900 font-bold">
                    {ranch.startDate 
                      ? Math.floor((new Date().getTime() - new Date(ranch.startDate).getTime()) / (1000 * 60 * 60 * 24))
                      : "N/A"}
                  </span>
                </div>
                <div className="text-center">
                  <span className="font-semibold text-gray-700">Días desde última visita: </span>
                  <span className="text-gray-900 font-bold">
                    {ranch.lastVisitAt 
                      ? Math.floor((new Date().getTime() - new Date(ranch.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24))
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existencias y U.G.G. Card - Always Visible */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Existencias y U.G.G.</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{ranch.maleCount || 0}</div>
                <div className="text-sm text-blue-700 font-medium">Machos</div>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-lg border border-pink-200">
                <div className="text-3xl font-bold text-pink-600">{ranch.femaleCount || 0}</div>
                <div className="text-sm text-pink-700 font-medium">Hembras</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-3xl font-bold text-purple-600">{ranch.uggValue || 0}</div>
                <div className="text-sm text-purple-700 font-medium">Total U.G.G.</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm font-bold text-green-600">
                  {ranch.uggAsOf
                    ? new Date(ranch.uggAsOf).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                    : "Sin calcular"}
                </div>
                <div className="text-sm text-green-700 font-medium">Último Cálculo U.G.G.</div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <span className="font-semibold text-gray-700">Total Animales: </span>
                  <span className="text-gray-900 font-bold">{(ranch.maleCount || 0) + (ranch.femaleCount || 0)}</span>
                </div>
                <div className="text-center">
                  <span className="font-semibold text-gray-700">Ratio M/H: </span>
                  <span className="text-gray-900 font-bold">
                    {ranch.femaleCount > 0 
                      ? `1:${Math.round((ranch.femaleCount / (ranch.maleCount || 1)) * 100) / 100}`
                      : "N/A"}
                  </span>
                </div>
                <div className="text-center">
                  <span className="font-semibold text-gray-700">U.G.G. por Animal: </span>
                  <span className="text-gray-900 font-bold">
                    {((ranch.maleCount || 0) + (ranch.femaleCount || 0)) > 0 
                      ? Math.round(((ranch.uggValue || 0) / ((ranch.maleCount || 0) + (ranch.femaleCount || 0))) * 100) / 100
                      : "0"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}