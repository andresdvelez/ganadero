"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addToast } from "@/components/ui/toast";

export default function AISettingsPage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Asistente de IA - Configuración
      </h1>
      <ProfileSection />
      <MemoriesSection />
    </div>
  );
}

function ProfileSection() {
  const ctxQuery = trpc.ai.getContext.useQuery({ recent: 0, memories: 0 });
  const updateProfile = trpc.ai.updateProfile.useMutation();

  const [bio, setBio] = useState<string>("");
  const [language, setLanguage] = useState<string>("es");
  const [tone, setTone] = useState<string>("amigable");
  const [goals, setGoals] = useState<string>("");

  useEffect(() => {
    const p = ctxQuery.data?.profile as any;
    if (p) {
      setBio(p.bio || "");
      try {
        const prefs = p.preferences ? JSON.parse(p.preferences) : {};
        if (prefs.language) setLanguage(String(prefs.language));
        if (prefs.tone) setTone(String(prefs.tone));
      } catch {}
      try {
        const gs = p.goals ? JSON.parse(p.goals) : [];
        if (Array.isArray(gs)) setGoals(gs.join(", "));
      } catch {}
    }
  }, [ctxQuery.data]);

  const onSave = async () => {
    try {
      const preferences = { language, tone };
      const goalsArray = goals
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await updateProfile.mutateAsync({ bio, preferences, goals: goalsArray });
      addToast({ variant: "success", title: "Perfil actualizado" });
      ctxQuery.refetch();
    } catch (e: any) {
      addToast({
        variant: "error",
        title: "Error al guardar",
        description: e?.message || String(e),
      });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-lg font-medium">Perfil del asistente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-neutral-600">
              Biografía / contexto del usuario
            </label>
            <Input
              value={bio}
              onChange={(e: any) => setBio(e.target.value)}
              placeholder="Describe tu finca, experiencia, etc."
            />
          </div>
          <div>
            <label className="text-sm text-neutral-600">Idioma</label>
            <Input
              value={language}
              onChange={(e: any) => setLanguage(e.target.value)}
              placeholder="es / en"
            />
          </div>
          <div>
            <label className="text-sm text-neutral-600">Tono</label>
            <Input
              value={tone}
              onChange={(e: any) => setTone(e.target.value)}
              placeholder="amigable / formal / técnico"
            />
          </div>
          <div>
            <label className="text-sm text-neutral-600">
              Metas (separadas por coma)
            </label>
            <Input
              value={goals}
              onChange={(e: any) => setGoals(e.target.value)}
              placeholder="Mejorar productividad, reducir costos, ..."
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onPress={onSave}
            isDisabled={updateProfile.isPending}
            color="primary"
          >
            {updateProfile.isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            variant="bordered"
            onPress={() => ctxQuery.refetch()}
            isDisabled={ctxQuery.isLoading}
          >
            Recargar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MemoriesSection() {
  const [showOnlyUnconfirmed, setShowOnlyUnconfirmed] =
    useState<boolean>(false);
  const [limit, setLimit] = useState<number>(50);

  const listMemories = trpc.ai.listMemories.useQuery({ limit });
  const updateMemory = trpc.ai.updateMemory.useMutation();
  const deleteMemory = trpc.ai.deleteMemory.useMutation();
  const confirmMemories = trpc.ai.confirmMemories.useMutation();

  const memories = useMemo(() => {
    const raw = listMemories.data || [];
    if (showOnlyUnconfirmed)
      return raw.filter((m: any) =>
        (m.tags || "").toLowerCase().includes("unconfirmed")
      );
    return raw;
  }, [listMemories.data, showOnlyUnconfirmed]);

  const [selection, setSelection] = useState<Record<string, boolean>>({});

  const toggleSelect = (id: string) =>
    setSelection((s) => ({ ...s, [id]: !s[id] }));
  const clearSelection = () => setSelection({});

  const onSaveRow = async (
    id: string,
    fields: Partial<{ content: string; importance: number; tags: string }>
  ) => {
    try {
      await updateMemory.mutateAsync({ id, ...fields });
      addToast({ variant: "success", title: "Memoria actualizada" });
      listMemories.refetch();
    } catch (e: any) {
      addToast({
        variant: "error",
        title: "Error al actualizar",
        description: e?.message || String(e),
      });
    }
  };

  const onDeleteRow = async (id: string) => {
    try {
      await deleteMemory.mutateAsync({ id });
      addToast({ variant: "success", title: "Memoria eliminada" });
      listMemories.refetch();
    } catch (e: any) {
      addToast({
        variant: "error",
        title: "Error al eliminar",
        description: e?.message || String(e),
      });
    }
  };

  const onConfirmSelected = async () => {
    const ids = Object.entries(selection)
      .filter(([id, v]) => !!v)
      .map(([id]) => id);
    if (ids.length === 0) {
      addToast({ variant: "info", title: "No hay memorias seleccionadas" });
      return;
    }
    try {
      await confirmMemories.mutateAsync({ ids, importance: 3 });
      addToast({ variant: "success", title: "Memorias confirmadas" });
      clearSelection();
      listMemories.refetch();
    } catch (e: any) {
      addToast({
        variant: "error",
        title: "Error al confirmar",
        description: e?.message || String(e),
      });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Memorias del asistente</h2>
          <div className="flex gap-2 items-center">
            <label className="text-sm text-neutral-600 flex items-center gap-1">
              <input
                type="checkbox"
                checked={showOnlyUnconfirmed}
                onChange={(e) => setShowOnlyUnconfirmed(e.target.checked)}
              />
              Mostrar solo no confirmadas
            </label>
            <Button
              onPress={() => listMemories.refetch()}
              isDisabled={listMemories.isLoading}
              variant="bordered"
            >
              Recargar
            </Button>
            <Button
              onPress={onConfirmSelected}
              color="primary"
              isDisabled={confirmMemories.isPending}
            >
              Confirmar seleccionadas
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 text-neutral-700">
                <th className="p-2 w-8"></th>
                <th className="p-2 text-left">Contenido</th>
                <th className="p-2">Importancia</th>
                <th className="p-2">Tags</th>
                <th className="p-2 w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {memories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-neutral-500">
                    {listMemories.isLoading ? "Cargando..." : "No hay memorias"}
                  </td>
                </tr>
              ) : (
                memories.map((m: any) => (
                  <MemoryRow
                    key={m.id}
                    memory={m}
                    selected={!!selection[m.id]}
                    onToggle={() => toggleSelect(m.id)}
                    onSave={onSaveRow}
                    onDelete={() => onDeleteRow(m.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MemoryRow({
  memory,
  selected,
  onToggle,
  onSave,
  onDelete,
}: {
  memory: any;
  selected: boolean;
  onToggle: () => void;
  onSave: (
    id: string,
    fields: Partial<{ content: string; importance: number; tags: string }>
  ) => void;
  onDelete: () => void;
}) {
  const [content, setContent] = useState<string>(memory.content || "");
  const [importance, setImportance] = useState<number>(memory.importance || 1);
  const [tags, setTags] = useState<string>(memory.tags || "");

  useEffect(() => {
    setContent(memory.content || "");
    setImportance(memory.importance || 1);
    setTags(memory.tags || "");
  }, [memory.id]);

  return (
    <tr className="border-t">
      <td className="p-2 text-center align-top">
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td className="p-2">
        <Input
          value={content}
          onChange={(e: any) => setContent(e.target.value)}
        />
      </td>
      <td className="p-2 text-center">
        <Input
          value={importance}
          onChange={(e: any) => setImportance(Number(e.target.value) || 1)}
          type="number"
          min={1}
          max={5}
          className="w-20 mx-auto text-center"
        />
      </td>
      <td className="p-2">
        <Input value={tags} onChange={(e: any) => setTags(e.target.value)} />
      </td>
      <td className="p-2 text-center">
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            onPress={() => onSave(memory.id, { content, importance, tags })}
          >
            Guardar
          </Button>
          <Button size="sm" variant="bordered" onPress={onDelete}>
            Eliminar
          </Button>
        </div>
      </td>
    </tr>
  );
}
