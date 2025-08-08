import { translations } from "@/lib/constants/translations";

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
    this._ollamaHost =
      config.ollamaHost || process.env.NEXT_PUBLIC_OLLAMA_HOST || "/api/ollama"; // proxy a servidor gestionado
    this.model =
      config.model ||
      process.env.NEXT_PUBLIC_OLLAMA_MODEL ||
      "deepseek-r1:latest";
  }

  get ollamaHost() {
    return this._ollamaHost;
  }
  setHost(newHost: string) {
    this._ollamaHost = newHost.replace(/\/$/, "");
  }

  async checkLocalAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this._ollamaHost}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        return (
          data.models?.some((m: any) => m.name?.includes("deepseek")) || false
        );
      }
    } catch (error) {
      // Silenciar en cliente web cuando Ollama no está disponible
    }
    return false;
  }

  async processQuery(query: string, context?: any): Promise<AIResponse> {
    const isLocalAvailable = await this.checkLocalAvailability();

    if (isLocalAvailable) {
      return this.processLocalQuery(query, context);
    } else if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      return this.processCloudQuery(query, context);
    } else {
      return {
        content:
          "El asistente de IA no está disponible en este momento. Por favor, verifica la configuración.",
        module: "error",
      };
    }
  }

  private async processLocalQuery(
    query: string,
    context?: any
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt();
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
          format: "json",
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
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(query, context);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Error en API de IA");
      }

      const data = await response.json();
      return this.parseAIResponse(data.content);
    } catch (error) {
      console.error("Error en consulta cloud:", error);
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    return `Eres el orquestador de módulos de Ganado AI para Colombia. Siempre responde en JSON válido y en español colombiano.

Dispones de módulos y acciones:
- animals: ["list", "create"]
- health: ["list", "create"]

Reglas:
- Si el usuario pide navegar a una sección/listar, usa action "list".
- Si el usuario pide registrar/crear/agregar, usa action "create".
- Incluye en data los parámetros extraídos (por ejemplo, { name, weight, type }).
- Formato de respuesta estricto:
{
  "content": "mensaje breve para el usuario",
  "module": "animals|health|dashboard",
  "action": "list|create|none",
  "data": { }
}`;
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
    }

    return prompt;
  }

  private parseAIResponse(content: string): AIResponse {
    try {
      const parsed = JSON.parse(content);
      return {
        content: parsed.content || content,
        module: parsed.module,
        action: parsed.action,
        data: parsed.data,
      };
    } catch (error) {
      // Si no es JSON válido, devolver como contenido simple
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
          case "date":
            schema[field.name] = z.date();
            break;
          case "select":
            schema[field.name] = z.enum(field.options || []);
            break;
          default:
            schema[field.name] = z.any();
        }
      });
    }

    return z.object(schema);
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

// Singleton instance
let aiClientInstance: AIClient | null = null;

export function getAIClient(): AIClient {
  if (!aiClientInstance) {
    aiClientInstance = new AIClient();
  }
  return aiClientInstance;
}

export function setAIClientHost(host: string) {
  if (!aiClientInstance) {
    aiClientInstance = new AIClient({ ollamaHost: host });
  } else {
    aiClientInstance.setHost(host);
  }
}
