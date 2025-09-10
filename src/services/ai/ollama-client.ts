import { translations } from "@/lib/constants/translations";
import { aiModuleSpecs } from "@/modules/ai-specs";
import { z } from "zod";

// AI Client configuration
interface AIResponse {
  content: string;
  module?: string;
  action?: string;
  data?: any;
}

interface AIClientConfig {
  ollamaHost?: string;
  openaiKey?: string;
  model?: string;
}

export class AIClient {
  private model: string;
  private _ollamaHost: string;
  private useCloud: boolean = false;

  constructor(config: AIClientConfig = {}) {
    const isBrowser = typeof window !== "undefined";
    const isTauri = isBrowser && !!(window as any).__TAURI__;

    // Allow runtime override via localStorage key 'OLLAMA_HOST'
    let lsHost: string | null = null;
    try {
      if (isBrowser) lsHost = window.localStorage.getItem("OLLAMA_HOST");
    } catch {}

    const tauriLocal = `http://127.0.0.1:${
      process.env.NEXT_PUBLIC_LLAMA_PORT || 11434
    }`;
    const defaultHost =
      process.env.NODE_ENV === "development"
        ? "http://127.0.0.1:11434"
        : "/api/ollama"; // proxy solo en web prod

    // En Tauri: preferir SIEMPRE el proxy interno del servidor Node sidecar (evita CORS)
    // Puerto del sidecar (ver TRPCProvider): 4317
    if (isTauri) {
      const tauriProxy = "http://127.0.0.1:4317/api/ollama";
      this._ollamaHost = (lsHost || tauriProxy).replace(/\/$/, "");
    } else {
      this._ollamaHost = (
        lsHost ||
        config.ollamaHost ||
        process.env.NEXT_PUBLIC_OLLAMA_HOST ||
        defaultHost
      ).replace(/\/$/, "");
    }

    // Permitir override por localStorage (ej: OLLAMA_MODEL)
    let lsModel: string | null = null;
    try {
      if (isBrowser) lsModel = window.localStorage.getItem("OLLAMA_MODEL");
    } catch {}

    this.model =
      lsModel ||
      config.model ||
      process.env.NEXT_PUBLIC_OLLAMA_MODEL ||
      "deepseek-r1-qwen-1_5b:latest";
  }

  get ollamaHost() {
    return this._ollamaHost;
  }
  setHost(newHost: string) {
    const cleaned = newHost.replace(/\/$/, "");
    this._ollamaHost = cleaned;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("OLLAMA_HOST", cleaned);
      }
    } catch {}
  }

  private hasInternet(): boolean {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine !== false;
  }

  async checkLocalAvailability(): Promise<boolean> {
    const preferred =
      process.env.NEXT_PUBLIC_OLLAMA_MODEL || "deepseek-r1-qwen-1_5b:latest";

    const tryCheck = async (base: string) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${base.replace(/\/$/, "")}/api/tags`, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) return false;
      const data = await res.json();
      const models: Array<{ name?: string }> = data?.models || [];
      const hasPreferred = models.some((m) => m.name === preferred);
      if (hasPreferred) {
        this.model = preferred;
        return true;
      }
      const deepseekAny = models.find((m) =>
        (m.name || "").includes("deepseek")
      );
      if (deepseekAny?.name) {
        this.model = deepseekAny.name;
        return true;
      }
      return models.length > 0;
    };

    // 1) Try current host first
    try {
      const ok = await tryCheck(this._ollamaHost);
      if (ok) return true;
    } catch {}

    // 2) En Tauri: intentar puerto directo de Ollama si el proxy no está disponible
    try {
      const isBrowser = typeof window !== "undefined";
      const isTauri = isBrowser && !!(window as any).__TAURI__;
      if (isTauri) {
        const port = Number(process.env.NEXT_PUBLIC_LLAMA_PORT || 11434);
        const direct = `http://127.0.0.1:${port}`;
        const ok = await tryCheck(direct);
        if (ok) {
          this.setHost(direct);
          return true;
        }
      }
    } catch {}

    // 3) En navegador (no Tauri), intentar localhost directo como fallback
    try {
      const isBrowser = typeof window !== "undefined";
      const isTauri = isBrowser && !!(window as any).__TAURI__;
      if (isBrowser && !isTauri) {
        const port = Number(process.env.NEXT_PUBLIC_LLAMA_PORT || 11434);
        const direct = `http://127.0.0.1:${port}`;
        const ok = await tryCheck(direct);
        if (ok) {
          this.setHost(direct);
          return true;
        }
      }
    } catch {}

    return false;
  }

  async processQuery(query: string, context?: any): Promise<AIResponse> {
    // Si estamos offline, no intentes nube primero para evitar "pensando..." indefinido
    const online = this.hasInternet();

    if (online) {
      try {
        return await this.processCloudQuery(query, context);
      } catch {
        // Si falla la nube, probar local
      }
    }

    const isLocalAvailable = await this.checkLocalAvailability();

    if (isLocalAvailable) {
      return this.processLocalQuery(query, context);
    }

    // Último intento: solo probar nube si volvimos a estar online
    if (this.hasInternet()) {
      try {
        return await this.processCloudQuery(query, context);
      } catch {}
    }

    return {
      content:
        "El asistente de IA no está disponible en este momento. Por favor, verifica la configuración.",
      module: "error",
    };
  }

  private async processLocalQuery(
    query: string,
    context?: any
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(query, context);

    try {
      const emitLog = (line: string) => {
        try {
          if (typeof (context as any)?.onLog === "function") {
            (context as any).onLog(line);
          }
        } catch {}
      };
      console.log(
        "[AI] online=",
        this.hasInternet(),
        "ollamaHost=",
        this._ollamaHost,
        "model=",
        this.model
      );
      emitLog(
        `[LOCAL] start online=${this.hasInternet()} host=${
          this._ollamaHost
        } model=${this.model}`
      );
      const sendChat = async (host: string, abortFirstByteMs: number) => {
        const controller = new AbortController();
        const externalSignal: AbortSignal | undefined = (context as any)
          ?.signal;
        let onExternalAbort: (() => void) | null = null;
        if (externalSignal) {
          if (externalSignal.aborted) {
            emitLog(`[LOCAL] aborted_by_user (pre-send)`);
            throw new Error("ABORTED_BY_USER");
          }
          onExternalAbort = () => {
            try {
              controller.abort();
            } catch {}
            emitLog(`[LOCAL] aborted_by_user (runtime)`);
          };
          try {
            externalSignal.addEventListener("abort", onExternalAbort, {
              once: true,
            } as any);
          } catch {}
        }
        const globalTimeout = setTimeout(() => controller.abort(), 1000 * 300);
        emitLog(
          `[LOCAL] chat:POST ${host.replace(
            /\/$/,
            ""
          )}/api/chat firstByte=${abortFirstByteMs}ms`
        );
        const response = await fetch(`${host.replace(/\/$/, "")}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: true,
            keep_alive: "5m",
            options: { num_predict: 256, temperature: 0.2 },
          }),
          signal: controller.signal,
          // @ts-expect-error Node fetch extensions
          duplex: "half",
        });
        if (!response.ok || !response.body) {
          clearTimeout(globalTimeout);
          try {
            if (externalSignal && onExternalAbort)
              externalSignal.removeEventListener(
                "abort",
                onExternalAbort as any
              );
          } catch {}
          emitLog(
            `[LOCAL] error: respuesta sin cuerpo status=${response.status}`
          );
          throw new Error("Error de Ollama local (sin cuerpo)");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let firstChunk = false;
        let abortedForWarmup = false;
        let buffer = "";
        emitLog(`[LOCAL] waiting first byte (${abortFirstByteMs}ms)`);
        const firstChunkTimer = setTimeout(() => {
          if (!firstChunk) {
            abortedForWarmup = true;
            try {
              controller.abort();
            } catch {}
            emitLog(
              `[LOCAL] warmup_required: no first byte in ${abortFirstByteMs}ms`
            );
          }
        }, abortFirstByteMs);

        while (true) {
          let read;
          try {
            read = await reader.read();
          } catch (e) {
            clearTimeout(firstChunkTimer);
            clearTimeout(globalTimeout);
            try {
              if (externalSignal && onExternalAbort)
                externalSignal.removeEventListener(
                  "abort",
                  onExternalAbort as any
                );
            } catch {}
            if (abortedForWarmup) throw new Error("WARMUP_REQUIRED");
            emitLog(`[LOCAL] read_error ${(e as any)?.message || e}`);
            throw e;
          }
          const { value, done } = read;
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            newlineIndex = buffer.indexOf("\n");
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              if (!firstChunk) {
                firstChunk = true;
                emitLog(`[LOCAL] first_chunk`);
              }
              if (obj?.done === true) {
                clearTimeout(firstChunkTimer);
                clearTimeout(globalTimeout);
                try {
                  if (externalSignal && onExternalAbort)
                    externalSignal.removeEventListener(
                      "abort",
                      onExternalAbort as any
                    );
                } catch {}
                emitLog(`[LOCAL] done len=${accumulated.length}`);
                return this.parseAIResponse(accumulated.trim());
              }
              const part = obj?.message?.content ?? obj?.content ?? "";
              if (part) accumulated += part;
              try {
                if (typeof (context as any)?.onPartial === "function") {
                  (context as any).onPartial(accumulated);
                }
              } catch {}
              if (part)
                emitLog(
                  `[LOCAL] chunk +${part.length} total=${accumulated.length}`
                );
            } catch {
              // Si una línea no es JSON válido, la ignoramos pero mantenemos el buffer
            }
          }
          // Si es el primer paquete pero aún no pudimos parsear JSON completo,
          // emite un onPartial mínimo para quitar el loader si hay texto legible
          if (!firstChunk && buffer.length > 0) {
            firstChunk = true;
            try {
              if (typeof (context as any)?.onPartial === "function") {
                // Forzar a quitar loader aunque aún no haya texto (UI lo maneja)
                (context as any).onPartial(" ");
              }
            } catch {}
            emitLog(`[LOCAL] first_bytes buffered=${buffer.length}`);
          }
        }
        clearTimeout(firstChunkTimer);
        clearTimeout(globalTimeout);
        try {
          if (externalSignal && onExternalAbort)
            externalSignal.removeEventListener("abort", onExternalAbort as any);
        } catch {}
        emitLog(`[LOCAL] end_of_stream len=${accumulated.length}`);
        return this.parseAIResponse(accumulated.trim());
      };

      const warmup = async (host: string) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1000 * 120);
        try {
          emitLog(
            `[LOCAL] warmup:POST ${host.replace(/\/$/, "")}/api/generate`
          );
          const r = await fetch(`${host.replace(/\/$/, "")}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: this.model,
              prompt: "ok",
              stream: false,
              options: { num_predict: 16, temperature: 0.2 },
            }),
            signal: controller.signal,
            // @ts-expect-error Node fetch extensions
            duplex: "half",
          });
          clearTimeout(timeout);
          if (!r.ok) throw new Error("warmup failed");
          emitLog(`[LOCAL] warmup:ok`);
        } catch (e) {
          clearTimeout(timeout);
          emitLog(`[LOCAL] warmup:fail ${(e as any)?.message || e}`);
        }
      };

      // 1) Intentar con host actual; si no llega primer byte en 10s, calentar y reintentar
      try {
        return await sendChat(this._ollamaHost, 10_000);
      } catch (e: any) {
        if (e?.message === "WARMUP_REQUIRED") {
          await warmup(this._ollamaHost);
          return await sendChat(this._ollamaHost, 30_000);
        }
        // Si el proxy 4317 falla, probar directo 11434 como fallback rápido en Tauri
        try {
          const port = Number(process.env.NEXT_PUBLIC_LLAMA_PORT || 11434);
          const direct = `http://127.0.0.1:${port}`;
          if (this._ollamaHost !== direct) {
            emitLog(`[LOCAL] fallback:direct ${direct}`);
            await warmup(direct);
            const res = await sendChat(direct, 30_000);
            this.setHost(direct);
            return res;
          }
        } catch {}
        emitLog(`[LOCAL] error ${(e as any)?.message || e}`);
        throw e;
      }
    } catch (error) {
      console.error(
        "[AI][local] host=",
        this._ollamaHost,
        "model=",
        this.model
      );
      console.error("Error en consulta local:", error);
      try {
        if (typeof (context as any)?.onLog === "function") {
          (context as any).onLog(
            `[LOCAL] fatal ${(error as any)?.message || error}`
          );
        }
      } catch {}
      throw error;
    }
  }

  private async processCloudQuery(
    query: string,
    context?: any
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    let userPrompt = this.buildUserPrompt(query, context);
    if (context?.webSearch) {
      try {
        const s = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (s.ok) {
          const data = await s.json();
          const items = (data?.results || []) as Array<{
            title: string;
            url: string;
            snippet: string;
          }>;
          if (items.length > 0) {
            const snippetText = items
              .map((it) => `- ${it.title}\n${it.url}\n${it.snippet}`)
              .join("\n\n");
            userPrompt = `Consulta del usuario: ${query}\n\nFragmentos web relevantes:\n${snippetText}\n\nResponde usando los fragmentos cuando apliquen, citando las URLs.`;
          }
        }
      } catch {}
    }

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:
          process.env.NEXT_PUBLIC_OPENROUTER_MODEL ||
          "deepseek/deepseek-r1-0528:free",
        webSearch: !!context?.webSearch,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Error en API de IA: ${body}`);
    }

    const data = await response.json();
    return this.parseAIResponse(data.content);
  }

  private buildSystemPrompt(context?: any): string {
    let prompt = `Eres el orquestador de módulos de Ganado AI para Colombia. Siempre responde en JSON válido y en español colombiano.
    No utilices inglés bajo ninguna circunstancia. Si el usuario escribe en otro idioma, responde en español y aclara que mantienes el idioma español por consistencia.
    Al mencionar módulos o acciones en mensajes al usuario, usa nombres en español (Animales, Salud, Reproducción, Lechería, Inventario, Tareas, Finanzas, Reportes, Sensores, Clima, Ubicaciones, Alertas, Dispositivos, Potreros, Laboratorio).
    Dispones de módulos y acciones:
    ${aiModuleSpecs
      .map(
        (m) => `- ${m.id}: [${m.actions.map((a) => `"${a.id}"`).join(", ")}]`
      )
      .join("\n")} 
    Reglas:
    - Si el usuario pide navegar a una sección/listar, usa action "list".
    - Si el usuario pide registrar/crear/agregar, usa action "create".
    - Incluye en data los parámetros extraídos (por ejemplo, { name, weight, type }).
    - Formato de respuesta estricto:
    {
      "content": "mensaje breve para el usuario",
      "module": "<moduleId>",
      "action": "<actionId|none>",
      "data": { }
    }`;

    // Dominio ganadero (conocimientos base para software de fincas)
    prompt += `\n\nConocimientos de dominio (ganadería):
- Identificación y trazabilidad: arete/siniiga, raza, sexo, fecha de nacimiento, lote/potrero.
- Reproducción: celos, servicios, preñeces, partos, abortos, intervalos parto–parto.
- Sanidad: calendario de vacunación (aftosa, brucelosis, clostridiales), desparasitación, tratamientos y diagnósticos.
- Producción de leche: ordeños, litros por día, sólidos, eventos de mastitis, secado.
- Nutrición y pasturas: rotación de potreros, aforo, suplementos, sales.
- Inventario y movimientos: altas/bajas, compras/ventas, traslados entre lotes.
- Bioseguridad y bienestar: cuarentena de ingresos, registros de mortalidad.
Responde priorizando prácticas locales y terminología usada en Colombia.`;

    if (context?.webSearch) {
      prompt += `\n\nEl usuario habilitó búsqueda web. Si la pregunta requiere datos actualizados (precios, normas recientes, noticias sanitarias), explícitalo y asume que recibirás extractos del sistema; si no los tienes, responde con tu mejor criterio y recomienda verificar fuentes.`;
    }

    if (context?.profile || context?.memories?.length > 0) {
      prompt += "\n\nContexto del usuario:\n";
      if (context.profile) {
        const p = context.profile;
        prompt += `Bio: ${p.bio || "N/A"}\n`;
        try {
          const prefs = p.preferences ? JSON.parse(p.preferences) : {};
          if (prefs.language) prompt += `Idioma preferido: ${prefs.language}\n`;
          if (prefs.tone) prompt += `Tono preferido: ${prefs.tone}\n`;
        } catch {}
        try {
          const goals = p.goals ? JSON.parse(p.goals) : [];
          if (goals.length > 0) prompt += `Objetivos: ${goals.join(", ")}\n`;
        } catch {}
      }
      if (context.memories?.length > 0) {
        prompt += "Memorias clave:\n";
        for (const m of context.memories) {
          prompt += `- ${m.content}\n`;
        }
      }
    }
    if (
      context?.recentMessages &&
      Array.isArray(context.recentMessages) &&
      context.recentMessages.length > 0
    ) {
      try {
        const serialized = context.recentMessages
          .slice(-10)
          .map((m: any) => `${m.role}: ${m.content}`)
          .join("\n");
        prompt += `\n\nHistorial reciente (para mantener continuidad):\n${serialized}`;
      } catch {}
    }
    return prompt;
  }

  private buildUserPrompt(query: string, context?: any): string {
    let prompt = query;

    if (context) {
      prompt += `\n\nContexto adicional:\n`;
      if (context.currentModule) {
        prompt += `Módulo actual: ${context.currentModule}\n`;
      }
      if (context.recentAnimals) {
        prompt += `Animales recientes: ${JSON.stringify(
          context.recentAnimals
        )}\n`;
      }
      if (context.pendingTasks) {
        prompt += `Tareas pendientes: ${JSON.stringify(
          context.pendingTasks
        )}\n`;
      }
      if (
        context.recentMessages &&
        Array.isArray(context.recentMessages) &&
        context.recentMessages.length > 0
      ) {
        try {
          const lastTwo = context.recentMessages
            .slice(-2)
            .map((m: any) => `${m.role}: ${m.content}`)
            .join("\n");
          prompt += `\nÚltimos turnos:\n${lastTwo}\n`;
        } catch {}
      }
    }

    return prompt;
  }

  private parseAIResponse(content: string): AIResponse {
    // 1) Try to extract fenced JSON ```json ... ``` or ``` ... ```
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenceMatch ? fenceMatch[1] : content;

    try {
      const parsed = JSON.parse(candidate);
      return {
        content: parsed.content || "",
        module: parsed.module,
        action: parsed.action,
        data: parsed.data,
      };
    } catch (_e) {
      // If still not JSON, return as plain text
      return { content };
    }
  }

  // Método para generar formularios dinámicos basados en IA
  async generateFormSchema(description: string): Promise<any> {
    const query = `Genera un esquema de formulario Zod para: ${description}. 
    Incluye validaciones apropiadas para ganadería colombiana.`;

    const response = await this.processQuery(query);

    // Aquí parseamos la respuesta para generar un esquema Zod
    return this.convertToZodSchema(response.data || {});
  }

  private convertToZodSchema(data: any): any {
    // Implementación básica - expandir según necesidad
    const schema: any = {};

    if (data.fields) {
      data.fields.forEach((field: any) => {
        switch (field.type) {
          case "string":
            schema[field.name] = z
              .string()
              .min(1, field.required ? "Requerido" : undefined);
            break;
          case "number":
            schema[field.name] = z
              .number()
              .positive(
                field.validation?.positive ? "Debe ser positivo" : undefined
              );
            break;
          default:
            schema[field.name] = z.any();
        }
      });
    }

    return schema;
  }

  // Método para routing de módulos basado en intención
  async routeToModule(
    query: string
  ): Promise<{ module: string; action?: string; params?: any }> {
    const response = await this.processQuery(query, {
      requestModuleRouting: true,
    });

    return {
      module: response.module || "dashboard",
      action: response.action,
      params: response.data,
    };
  }
}

let aiClientInstance: AIClient | null = null;
export function getAIClient() {
  // Si estamos en el navegador y es Tauri, asegurar instancia con host local absoluto
  if (typeof window !== "undefined" && (window as any).__TAURI__) {
    if (!aiClientInstance || aiClientInstance.ollamaHost.startsWith("/")) {
      aiClientInstance = new AIClient();
    }
  } else if (!aiClientInstance) {
    aiClientInstance = new AIClient();
  }
  return aiClientInstance;
}
export function setAIClientHost(host: string) {
  const client = getAIClient();
  client.setHost(host);
}
