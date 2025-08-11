import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { getAIClient } from "@/services/ai/ollama-client";

// -------- Helpers --------
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w.length > 1);
}

function extractMemories(text: string): Array<{
  content: string;
  importance: number;
  tags?: string;
  source?: string;
}> {
  const t = text;
  const memories: Array<{
    content: string;
    importance: number;
    tags?: string;
    source?: string;
  }> = [];

  // Nombre de la finca / organización
  const finca = t.match(
    /mi\s+(finca|granja|hacienda|organizacion)\s+(se\s+)?llama\s+([a-zA-Z0-9\s\-_.]+)/i
  );
  if (finca && finca[3])
    memories.push({
      content: `ranchName=${finca[3].trim()}`,
      importance: 3,
      tags: "perfil,preferencia",
      source: "chat",
    });

  // Ubicación / región
  const zona = t.match(
    /(estoy|vivo|ubicacion|mi\s+zona|mi\s+municipio|mi\s+ciudad)\s+(es|en)\s+([a-zA-Z0-9\s\-_.]+)/i
  );
  if (zona && zona[3])
    memories.push({
      content: `location=${zona[3].trim()}`,
      importance: 2,
      tags: "perfil,ubicacion",
      source: "chat",
    });

  // Zona horaria
  const tz = t.match(
    /(mi\s+)?zona\s+horaria\s+(es|:)\s*([A-Za-z_/\-]+)|timezone\s*[:]?\s*([A-Za-z_/\-]+)/i
  );
  const tzValue = tz?.[3] || tz?.[4];
  if (tzValue)
    memories.push({
      content: `timezone=${tzValue}`,
      importance: 2,
      tags: "preferencia,timezone",
      source: "chat",
    });

  // Preferencia de unidades
  const prefUnidad = t.match(
    /prefiero\s+(litros|kilos|kilogramos|libras|hectareas|acres)/i
  );
  if (prefUnidad && prefUnidad[1])
    memories.push({
      content: `unitPreference=${prefUnidad[1].toLowerCase()}`,
      importance: 2,
      tags: "preferencia,unidad",
      source: "chat",
    });

  // Idioma o tono preferido
  const idioma = t.match(
    /(hablame|respon(d|de)me|quiero\s+que\s+me\s+habl(es|en))\s+en\s+(espanol|ingles)/i
  );
  if (idioma && idioma[3])
    memories.push({
      content: `language=${idioma[3].toLowerCase()}`,
      importance: 2,
      tags: "preferencia,idioma",
      source: "chat",
    });
  const tono = t.match(
    /prefiero\s+un\s+tono\s+(formal|informal|tecnico|amigable)/i
  );
  if (tono && tono[1])
    memories.push({
      content: `tone=${tono[1].toLowerCase()}`,
      importance: 2,
      tags: "preferencia,tono",
      source: "chat",
    });

  // Objetivo
  const objetivo = t.match(
    /(mi\s+objetivo|meta|prioridad)\s+(es|:)\s+(.+?)\.?$/i
  );
  if (objetivo && objetivo[3])
    memories.push({
      content: `goal=${objetivo[3].trim()}`,
      importance: 2,
      tags: "objetivo",
      source: "chat",
    });

  return memories;
}

function buildTfIdfCosine(
  query: string,
  docs: string[]
): { idx: number; score: number }[] {
  const corpus = docs.map((d) => tokenize(d));
  const qTokens = tokenize(query);
  const N = corpus.length + 1;
  const df = new Map<string, number>();

  // DF for corpus
  for (const doc of corpus) {
    const uniq = new Set(doc);
    for (const t of uniq) df.set(t, (df.get(t) || 0) + 1);
  }
  // Include query tokens in DF to smooth
  for (const t of new Set(qTokens)) df.set(t, (df.get(t) || 0) + 1);

  function idf(term: string) {
    const n = df.get(term) || 1;
    return Math.log((N + 1) / (n + 1)) + 1;
  }

  function vec(tokens: string[]) {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const v = new Map<string, number>();
    for (const [t, f] of tf.entries()) v.set(t, (f / tokens.length) * idf(t));
    return v;
  }

  const qv = vec(qTokens);
  function cosine(a: Map<string, number>, b: Map<string, number>) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (const [, va] of a) na += va * va;
    for (const [, vb] of b) nb += vb * vb;
    const keys = new Set([...a.keys(), ...b.keys()]);
    for (const k of keys) dot += (a.get(k) || 0) * (b.get(k) || 0);
    const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
    return dot / denom;
  }

  const scores: { idx: number; score: number }[] = [];
  for (let i = 0; i < corpus.length; i++) {
    const dv = vec(corpus[i]);
    scores.push({ idx: i, score: cosine(qv, dv) });
  }
  return scores.sort((a, b) => b.score - a.score);
}

export const aiRouter = createTRPCRouter({
  // ---------- Infra endpoints previos (checkLocalModel, checkCloudAvailable, ensureLocalModel) ----------
  checkLocalModel: publicProcedure.mutation(async () => {
    const base =
      process.env.NEXT_PUBLIC_OLLAMA_HOST ||
      process.env.OLLAMA_SERVER_URL ||
      "http://127.0.0.1:11434";
    try {
      const url = `${base.replace(/\/$/, "")}/api/tags`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return { available: false };
      const data = (await res.json()) as any;
      const hasModel = (data?.models || []).some((m: any) =>
        m?.name?.startsWith("deepseek-r1")
      );
      return { available: hasModel };
    } catch {
      return { available: false };
    }
  }),

  checkCloudAvailable: publicProcedure.query(async () => ({
    available: !!process.env.OPENROUTER_API_KEY,
  })),

  ensureLocalModel: publicProcedure
    .input(z.object({ model: z.string().default("deepseek-r1:latest") }))
    .mutation(async ({ input }) => {
      const base =
        process.env.NEXT_PUBLIC_OLLAMA_HOST ||
        process.env.OLLAMA_SERVER_URL ||
        "http://127.0.0.1:11434";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000 * 60 * 10);
      try {
        const url = `${base.replace(/\/$/, "")}/api/pull`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: input.model, stream: false }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok)
          throw new Error("No fue posible descargar el modelo local");
        return { ok: true };
      } catch (e: any) {
        clearTimeout(timeout);
        return { ok: false, error: e?.message ?? String(e) };
      }
    }),

  // ---------- Memorias / Perfil / Conversaciones ----------
  recordMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        role: z.enum(["user", "assistant", "system"]).default("user"),
        content: z.string(),
        moduleContext: z.string().nullable().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");

      await prisma.aIConversation.create({
        data: {
          userId,
          sessionId: input.sessionId,
          role: input.role,
          content: input.content,
          moduleContext: input.moduleContext ?? undefined,
          metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
        },
      });

      let suggested: Array<{ id: string; content: string }> = [];
      if (input.role === "user") {
        const extracted = extractMemories(input.content);
        if (extracted.length > 0) {
          for (const m of extracted) {
            const created = await prisma.aIMemory.create({
              data: {
                userId,
                content: m.content,
                importance: Math.max(1, m.importance - 1),
                tags: ((m.tags || "") + ",unconfirmed").trim(),
                source: m.source,
              },
            });
            suggested.push({ id: created.id, content: created.content });
          }
        }
      }

      return { ok: true, suggestedMemories: suggested };
    }),

  confirmMemories: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        importance: z.number().min(1).max(5).default(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");
      for (const id of input.ids) {
        const m = await prisma.aIMemory.findFirst({ where: { id, userId } });
        if (!m) continue;
        const newTags =
          (m.tags || "")
            .split(",")
            .filter((t) => t.trim() && t.trim() !== "unconfirmed")
            .join(",") || null;
        await prisma.aIMemory.update({
          where: { id },
          data: { importance: input.importance, tags: newTags },
        });
      }
      return { ok: true };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        bio: z.string().nullable().optional(),
        preferences: z.any().nullable().optional(),
        goals: z.any().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");
      const prefs = input.preferences
        ? JSON.stringify(input.preferences)
        : null;
      const goals = input.goals ? JSON.stringify(input.goals) : null;
      await prisma.aIUserProfile.upsert({
        where: { userId },
        update: {
          bio: input.bio ?? undefined,
          preferences: prefs ?? undefined,
          goals: goals ?? undefined,
        },
        create: { userId, bio: input.bio ?? null, preferences: prefs, goals },
      });
      return { ok: true };
    }),

  addMemory: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        importance: z.number().min(1).max(5).default(2),
        tags: z.string().nullable().optional(),
        source: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");
      await prisma.aIMemory.create({
        data: {
          userId,
          content: input.content,
          importance: input.importance,
          tags: input.tags ?? undefined,
          source: input.source ?? undefined,
        },
      });
      return { ok: true };
    }),

  listMemories: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        tagged: z.string().nullable().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");
      return prisma.aIMemory.findMany({
        where: {
          userId,
          ...(input.tagged
            ? { tags: { contains: input.tagged, mode: "insensitive" } }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }],
        take: input.limit,
      });
    }),

  updateMemory: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().nullable().optional(),
        importance: z.number().min(1).max(5).nullable().optional(),
        tags: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");
      const data: any = {};
      if (input.content !== undefined) data.content = input.content;
      if (input.importance !== undefined && input.importance !== null)
        data.importance = input.importance;
      if (input.tags !== undefined) data.tags = input.tags;
      await prisma.aIMemory.update({ where: { id: input.id }, data });
      return { ok: true };
    }),

  deleteMemory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");
      await prisma.aIMemory.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  searchMemories: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");
      const mems = await prisma.aIMemory.findMany({
        where: { userId },
        take: 500,
      });
      const docs = mems.map((m) => `${m.content} ${m.tags || ""}`);
      const ranking = buildTfIdfCosine(input.query, docs).slice(0, input.limit);
      return ranking.map((r) => ({ memory: mems[r.idx], score: r.score }));
    }),

  getContext: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().nullable().optional(),
        recent: z.number().min(0).max(50).default(8),
        memories: z.number().min(1).max(50).default(10),
        query: z.string().nullable().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");
      const profile = await prisma.aIUserProfile.findUnique({
        where: { userId },
      });
      const recents = input.sessionId
        ? await prisma.aIConversation.findMany({
            where: { userId, sessionId: input.sessionId },
            orderBy: { createdAt: "desc" },
            take: input.recent,
          })
        : [];

      let selectedMemories;
      if (input.query) {
        const mems = await prisma.aIMemory.findMany({
          where: { userId },
          take: 500,
        });
        const docs = mems.map((m) => `${m.content} ${m.tags || ""}`);
        const ranking = buildTfIdfCosine(input.query, docs).slice(
          0,
          input.memories
        );
        selectedMemories = ranking.map((r) => mems[r.idx]);
      } else {
        selectedMemories = await prisma.aIMemory.findMany({
          where: { userId },
          orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
          take: input.memories,
        });
      }

      return { profile, memories: selectedMemories, recent: recents.reverse() };
    }),

  summarizeSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        take: z.number().min(5).max(100).default(30),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userId } = ctx;
      if (!userId) throw new Error("UNAUTHORIZED");
      const messages = await prisma.aIConversation.findMany({
        where: { userId, sessionId: input.sessionId },
        orderBy: { createdAt: "desc" },
        take: input.take,
      });
      const ordered = messages.reverse();
      const ai = getAIClient();
      const joined = ordered.map((m) => `${m.role}: ${m.content}`).join("\n");
      const prompt = `Resume la conversación en 5-8 frases con hechos clave y preferencias detectadas, en formato de viñetas. No incluyas datos sensibles. Texto:\n${joined}`;
      const res = await ai.processQuery(prompt);
      const summaryText = res.content || "Resumen de la sesión";
      const memory = await prisma.aIMemory.create({
        data: {
          userId,
          content: `session:${input.sessionId} summary: ${summaryText}`,
          importance: 4,
          tags: `summary,session:${input.sessionId}`,
          source: "summary",
        },
      });
      return { ok: true, memoryId: memory.id };
    }),

  // ---------- Intent routing ----------
  routeIntent: protectedProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ input }) => {
      const q = input.query
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      const isAnimalContext =
        /\banimal(es)?\b|\bvaca\b|\bternero\b|\btoro\b|\bganado\b/.test(q);
      const wantsCreate =
        /\b(agregar|registrar|crear|anadir|nuevo|cargar)\b/.test(q) ||
        /\b(nuevo\s+animal)\b/.test(q);
      const wantsList = /\b(ver|listar|mostrar)\b/.test(q);
      if (isAnimalContext && wantsCreate)
        return { module: "animals", action: "create", data: {} } as any;
      if (isAnimalContext && wantsList)
        return { module: "animals", action: "list", data: {} } as any;
      const isHealth = /salud|vacuna|tratamiento|enfermedad/.test(q);
      if (isHealth && wantsCreate)
        return { module: "health", action: "create", data: {} } as any;
      if (isHealth && wantsList)
        return { module: "health", action: "list", data: {} } as any;
      return { module: "dashboard", action: "none", data: {} } as any;
    }),
});
