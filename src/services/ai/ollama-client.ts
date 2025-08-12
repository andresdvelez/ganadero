import { translations } from "@/lib/constants/translations";
import { aiModuleSpecs } from "@/modules/ai-specs";

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

    const defaultHost = isTauri
      ? `http://127.0.0.1:${process.env.NEXT_PUBLIC_LLAMA_PORT || 11434}`
      : process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:11434"
      : "/api/ollama"; // proxy only on web prod

    this._ollamaHost = (
      lsHost ||
      config.ollamaHost ||
      process.env.NEXT_PUBLIC_OLLAMA_HOST ||
      defaultHost
    ).replace(/\/$/, "");

    this.model =
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
      const res = await fetch(`${base.replace(/\/$/, "")}/api/tags`);
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

    // 2) Browser prod fallback: attempt direct localhost (user's machine)
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
    // Prefer cloud when online; server will decide if key exists
    const online = this.hasInternet();

    if (online) {
      try {
        return await this.processCloudQuery(query, context);
      } catch {
        // fall through to local
      }
    }

    const isLocalAvailable = await this.checkLocalAvailability();

    if (isLocalAvailable) {
      return this.processLocalQuery(query, context);
    }

    // Last attempt: try cloud even if earlier failed (in case network recovered quickly)
    try {
      return await this.processCloudQuery(query, context);
    } catch {}

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
      const response = await fetch(`${this._ollamaHost}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      });

      if (!response.ok) throw new Error("Error de Ollama local");
      const data = await response.json();
      const content = data?.message?.content || data?.content || "";
      return this.parseAIResponse(content);
    } catch (error) {
      console.error("Error en consulta local:", error);
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
    const { z } = require("zod");

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
  if (!aiClientInstance) aiClientInstance = new AIClient();
  return aiClientInstance;
}
export function setAIClientHost(host: string) {
  const client = getAIClient();
  client.setHost(host);
}
