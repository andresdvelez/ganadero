"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { translations } from "@/lib/constants/translations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { db, addToSyncQueue } from "@/lib/dexie";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Home as Cow,
  Trash2,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AnimalNewEmbedded } from "@/components/embedded/animal-new-embedded";

export default function AnimalsClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [localAnimals, setLocalAnimals] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name?: string;
    status?: string;
  }>({});
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const params = useSearchParams();

  const updateMutation = trpc.animal.update.useMutation();
  const deleteMutation = trpc.animal.delete.useMutation();

  const {
    data: serverAnimals,
    isLoading,
    refetch,
    } = trpc.animal.getAll.useQuery(undefined, {
      enabled: isOnline,
      retry: false,
    });

  async function loadLocal() {
    try {
      const animals = await db.animals.toArray();
      setLocalAnimals(animals);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadLocal();
  }, []);

  useEffect(() => {
    const qp = params.get("q");
    if (qp != null) setSearchTerm(qp);
  }, [params]);

  useEffect(() => {
    const onChanged = () => {
      loadLocal();
      refetch();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("animals-changed", onChanged);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("animals-changed", onChanged);
      }
    };
  }, [refetch]);

  const allAnimals = isOnline && serverAnimals ? serverAnimals : localAnimals;
  const filteredAnimals = allAnimals.filter((animal: any) => {
    const matchesSearch =
      animal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.tagNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || animal.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  async function handleDelete(animal: any) {
    const ok = window.confirm(`Eliminar ${animal.name}?`);
    if (!ok) return;
    try {
      await db.animals.where({ uuid: animal.uuid }).delete();
      await addToSyncQueue(
        "delete",
        "animal",
        animal.uuid || animal.id,
        { id: animal.uuid || animal.id },
        "dev-user"
      );
      if (isOnline && animal.id) {
        await deleteMutation.mutateAsync({ id: animal.id });
      }
    } finally {
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("animals-changed"));
    }
  }

  function startEdit(animal: any) {
    setEditingId(animal.uuid || animal.id);
    setEditDraft({ name: animal.name, status: animal.status });
  }

  async function saveEdit(animal: any) {
    try {
      const patch = { ...editDraft } as any;
      await db.animals.where({ uuid: animal.uuid }).modify(patch);
      await addToSyncQueue(
        "update",
        "animal",
        animal.uuid || animal.id,
        { id: animal.uuid || animal.id, ...patch },
        "dev-user"
      );
      if (isOnline && animal.id) {
        await updateMutation.mutateAsync({
          id: animal.id,
          name: patch.name,
          status: patch.status,
        });
      }
    } finally {
      setEditingId(null);
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("animals-changed"));
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-ranch-900">
              {translations.animals.title}
            </h1>
            <p className="text-ranch-600 mt-1">
              {translations.animals.totalAnimals}: {filteredAnimals.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-ranch-500 hover:bg-ranch-600 text-white"
              onPress={() => setShowInlineCreate(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              {translations.animals.addAnimal}
            </Button>
          </div>
        </div>

        {showInlineCreate && (
          <div className="max-w-3xl">
            <AnimalNewEmbedded
              onCompleted={() => {
                setShowInlineCreate(false);
                if (typeof window !== "undefined")
                  window.dispatchEvent(new Event("animals-changed"));
              }}
              onClose={() => setShowInlineCreate(false)}
            />
          </div>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ranch-400" />
                  <input
                    type="text"
                    placeholder={`${translations.common.search}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-ranch-600" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filtrar por estado"
                  className="px-4 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                >
                  <option value="all">{translations.common.all}</option>
                  <option value="active">{translations.animals.active}</option>
                  <option value="sold">{translations.animals.sold}</option>
                  <option value="deceased">
                    {translations.animals.deceased}
                  </option>
                  <option value="pregnant">
                    {translations.animals.pregnant}
                  </option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && isOnline ? (
          <div className="text-center py-12">
            <p className="text-ranch-600">{translations.common.loading}</p>
          </div>
        ) : filteredAnimals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 space-y-4">
              <Cow className="h-12 w-12 text-ranch-400 mx-auto mb-2" />
              <p className="text-ranch-600">{translations.common.noData}</p>
              <Button
                className="bg-ranch-500 hover:bg-ranch-600 text-white"
                onPress={() => setShowInlineCreate(true)}
              >
                <Plus className="h-5 w-5 mr-2" />{" "}
                {translations.animals.addAnimal}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnimals.map((animal: any) => {
              const isEditing = editingId === (animal.uuid || animal.id);
              return (
                <Card key={animal.uuid || animal.id}>
                  <CardHeader className="flex-row items-center justify-between gap-3">
                    {isEditing ? (
                      <input
                        aria-label="Editar nombre"
                        title="Editar nombre"
                        placeholder="Nombre"
                        className="flex-1 px-3 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500"
                        defaultValue={animal.name}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, name: e.target.value }))
                        }
                      />
                    ) : (
                      <CardTitle className="flex-1">{animal.name}</CardTitle>
                    )}
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onPress={() => saveEdit(animal)}>
                            <Save className="h-4 w-4 mr-1" /> Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="bordered"
                            onPress={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4 mr-1" /> Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="bordered"
                            onPress={() => startEdit(animal)}
                          >
                            <Edit3 className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            className="bg-red-500 text-white"
                            onPress={() => handleDelete(animal)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-ranch-600">{animal.tagNumber}</p>
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Estado:</label>
                      {isEditing ? (
                        <select
                          aria-label="Cambiar estado"
                          title="Cambiar estado"
                          defaultValue={animal.status}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              status: e.target.value,
                            }))
                          }
                          className="px-2 py-1 border rounded"
                        >
                          <option value="active">Activo</option>
                          <option value="sold">Vendido</option>
                          <option value="deceased">Muerto</option>
                          <option value="pregnant">Preñado</option>
                        </select>
                      ) : (
                        <span className="text-sm text-ranch-700">
                          {animal.status}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
