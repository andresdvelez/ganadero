"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { translations } from "@/lib/constants/translations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/dexie";
import Link from "next/link";
import {
  Plus,
  Search,
  Calendar,
  Syringe,
  Pill,
  Bug,
  Stethoscope,
  AlertTriangle,
  Clock,
  DollarSign,
  Filter,
  Heart,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface HealthRecord {
  id?: number;
  uuid: string;
  animalId: string;
  animalName?: string;
  type: string;
  description: string;
  medication?: string;
  dosage?: string;
  veterinarian?: string;
  cost?: number;
  notes?: string;
  performedAt: Date;
  nextDueDate?: Date;
  synced: boolean;
}

export default function HealthClient() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HealthRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHealthRecords();
  }, []);
  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, filterType, showUpcoming]);

  const loadHealthRecords = async () => {
    try {
      const healthRecords = await db.healthRecords.toArray();
      const animals = await db.animals.toArray();
      const enrichedRecords = healthRecords.map((record) => ({
        ...record,
        animalName:
          animals.find((a) => a.uuid === record.animalId)?.name ||
          "Desconocido",
      }));
      setRecords(enrichedRecords);
    } catch (error) {
      console.error("Error loading health records:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.animalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.medication?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterType !== "all") {
      filtered = filtered.filter((r) => r.type === filterType);
    }
    if (showUpcoming) {
      const today = new Date();
      const thirty = new Date();
      thirty.setDate(today.getDate() + 30);
      filtered = filtered.filter(
        (r) =>
          r.nextDueDate &&
          new Date(r.nextDueDate) >= today &&
          new Date(r.nextDueDate) <= thirty
      );
    }
    filtered.sort(
      (a, b) =>
        new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );
    setFilteredRecords(filtered);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "vaccination":
        return <Syringe className="h-5 w-5" />;
      case "treatment":
        return <Pill className="h-5 w-5" />;
      case "deworming":
        return <Bug className="h-5 w-5" />;
      case "checkup":
        return <Stethoscope className="h-5 w-5" />;
      default:
        return <Heart className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "vaccination":
        return "bg-sky-100 text-sky-700";
      case "treatment":
        return "bg-pasture-100 text-pasture-700";
      case "deworming":
        return "bg-cattle-100 text-cattle-700";
      case "checkup":
        return "bg-ranch-100 text-ranch-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "vaccination":
        return translations.health.vaccination;
      case "treatment":
        return translations.health.treatment;
      case "deworming":
        return translations.health.deworming;
      case "checkup":
        return translations.health.checkup;
      default:
        return type;
    }
  };

  const upcomingAlerts = (() => {
    const today = new Date();
    const seven = new Date();
    seven.setDate(today.getDate() + 7);
    return records.filter(
      (r) =>
        r.nextDueDate &&
        new Date(r.nextDueDate) >= today &&
        new Date(r.nextDueDate) <= seven
    );
  })();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-ranch-900">
              {translations.health.title}
            </h1>
            <p className="text-ranch-600 mt-1">
              Registros totales: {records.length}
            </p>
          </div>
          <Link href="/health/new">
            <Button className="bg-pasture-500 hover:bg-pasture-600 text-white">
              <Plus className="h-5 w-5 mr-2" />
              {translations.health.addRecord}
            </Button>
          </Link>
        </div>

        {upcomingAlerts.length > 0 && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {translations.health.upcomingVaccinations}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingAlerts.map((a) => (
                  <div
                    key={a.uuid}
                    className="flex justify-between items-center p-2 bg-white rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getTypeIcon(a.type)}
                      <div>
                        <p className="font-medium text-ranch-900">
                          {a.animalName}
                        </p>
                        <p className="text-sm text-ranch-600">
                          {a.description}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-yellow-700">
                      {a.nextDueDate && formatDate(a.nextDueDate)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ranch-600">Vacunaciones</p>
                  <p className="text-2xl font-bold text-ranch-900">
                    {records.filter((r) => r.type === "vaccination").length}
                  </p>
                </div>
                <Syringe className="h-8 w-8 text-sky-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ranch-600">Tratamientos</p>
                  <p className="text-2xl font-bold text-ranch-900">
                    {records.filter((r) => r.type === "treatment").length}
                  </p>
                </div>
                <Pill className="h-8 w-8 text-pasture-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ranch-600">Desparasitaciones</p>
                  <p className="text-2xl font-bold text-ranch-900">
                    {records.filter((r) => r.type === "deworming").length}
                  </p>
                </div>
                <Bug className="h-8 w-8 text-cattle-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ranch-600">Costo Total</p>
                  <p className="text-2xl font-bold text-ranch-900">
                    {formatCurrency(
                      records.reduce((s, r) => s + (r.cost || 0), 0)
                    )}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ranch-400" />
                  <input
                    type="text"
                    placeholder="Buscar por animal, descripción o medicamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-ranch-600" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  aria-label="Filtrar por tipo"
                  className="px-4 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                >
                  <option value="all">Todos</option>
                  <option value="vaccination">
                    {translations.health.vaccination}
                  </option>
                  <option value="treatment">
                    {translations.health.treatment}
                  </option>
                  <option value="deworming">
                    {translations.health.deworming}
                  </option>
                  <option value="checkup">{translations.health.checkup}</option>
                </select>
              </div>
              <Button
                variant={showUpcoming ? "solid" : "bordered"}
                onClick={() => setShowUpcoming(!showUpcoming)}
                className={
                  showUpcoming ? "bg-yellow-500 hover:bg-yellow-600" : ""
                }
              >
                <Clock className="h-5 w-5 mr-2" /> Próximos 30 días
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-ranch-600">{translations.common.loading}</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Stethoscope className="h-12 w-12 text-ranch-400 mx-auto mb-4" />
              <p className="text-ranch-600">
                {searchTerm || filterType !== "all" || showUpcoming
                  ? "No se encontraron registros con los filtros aplicados"
                  : translations.common.noData}
              </p>
              <Link href="/health/new">
                <Button className="mt-4 bg-pasture-500 hover:bg-pasture-600 text-white">
                  <Plus className="h-5 w-5 mr-2" />
                  {translations.health.addRecord}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <Card
                key={record.uuid}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-2 rounded-lg ${
                          getTypeColor(record.type).split(" ")[0]
                        }`}
                      >
                        {getTypeIcon(record.type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-ranch-900">
                            {record.animalName}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                              record.type
                            )}`}
                          >
                            {getTypeLabel(record.type)}
                          </span>
                        </div>
                        <p className="text-ranch-700">{record.description}</p>
                        {record.medication && (
                          <p className="text-sm text-ranch-600">
                            <span className="font-medium">Medicamento:</span>{" "}
                            {record.medication}
                            {record.dosage && ` - ${record.dosage}`}
                          </p>
                        )}
                        {record.veterinarian && (
                          <p className="text-sm text-ranch-600">
                            <span className="font-medium">Veterinario:</span>{" "}
                            {record.veterinarian}
                          </p>
                        )}
                        {record.notes && (
                          <p className="text-sm text-ranch-600 italic">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm text-ranch-600">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        {formatDate(record.performedAt)}
                      </p>
                      {record.nextDueDate && (
                        <p className="text-sm font-medium text-yellow-700">
                          Próxima: {formatDate(record.nextDueDate)}
                        </p>
                      )}
                      {record.cost && (
                        <p className="text-sm font-medium text-green-700">
                          {formatCurrency(record.cost)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
