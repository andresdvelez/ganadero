"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Phone, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { DashboardLayout } from "../layout/dashboard-layout";

export function RanchListView() {
  const [searchTerm, setSearchTerm] = useState("");

  const ranchesQuery = trpc.farm.getAll.useQuery();

  const filteredRanches = ranchesQuery.data?.filter((ranch) =>
    ranch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ranch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ranch.ownerName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Fincas</h1>
          <Link href="/ranches/new">
            <Button
              color="primary"
              startContent={<Plus className="h-4 w-4" />}
            >
              Nueva Finca
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar fincas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {ranchesQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRanches.map((ranch) => (
              <Link key={ranch.id} href={`/ranches/${ranch.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{ranch.name}</CardTitle>
                    <div className="text-sm text-gray-500 font-mono">
                      {ranch.code}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ranch.ownerName && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Propietario:</span>
                        <span className="text-gray-600">{ranch.ownerName}</span>
                      </div>
                    )}

                    {ranch.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{ranch.location}</span>
                      </div>
                    )}

                    {ranch.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{ranch.phone}</span>
                      </div>
                    )}

                    {ranch.lastVisitAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          Última visita: {ranch.lastVisitAt.toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs text-gray-500">
                        Existencias: {(ranch.maleCount || 0) + (ranch.femaleCount || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        UGG: {ranch.uggValue || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {filteredRanches.length === 0 && !ranchesQuery.isLoading && (
          <Card>
            <CardContent className="text-center py-10">
              <div className="text-gray-500 mb-4">
                {searchTerm ? "No se encontraron fincas" : "No hay fincas registradas"}
              </div>
              <Link href="/ranches/new">
                <Button color="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera finca
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}