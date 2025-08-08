"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TRPCProvider } from "@/lib/trpc/provider";
import { translations } from "@/lib/constants/translations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAIClient, setAIClientHost } from "@/services/ai/ollama-client";
import {
  Send,
  Mic,
  MicOff,
  Loader2,
  Bot,
  User,
  Sparkles,
  Download,
  Server,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { moduleRegistry } from "@/modules";
import { trpc } from "@/lib/trpc/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  module?: string;
  action?: string;
  data?: any;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const aiClient = getAIClient();
  const router = useRouter();
  const routeIntent = trpc.ai.routeIntent.useMutation();
  const checkLocal = trpc.ai.checkLocalModel.useMutation();
  const ensureLocal = trpc.ai.ensureLocalModel.useMutation();
  const [localModelAvailable, setLocalModelAvailable] = useState<
    boolean | null
  >(null);
  const [isTauri, setIsTauri] = useState(false);

  const [dlProgress, setDlProgress] = useState<{
    downloaded: number;
    total: number;
  } | null>(null);
  const [llamaRunning, setLlamaRunning] = useState(false);

  const MODEL_URL = process.env.NEXT_PUBLIC_MODEL_DOWNLOAD_URL || "";
  const MODEL_SHA = process.env.NEXT_PUBLIC_MODEL_SHA256 || undefined;
  const LLAMA_BIN_URL = process.env.NEXT_PUBLIC_LLAMA_BINARY_URL || "";
  const LLAMA_PORT = Number(process.env.NEXT_PUBLIC_LLAMA_PORT || 11434);

  // Sample commands for quick actions
  const sampleCommands = [
    "Agregar una vaca nueva",
    "Ver animales que necesitan vacunación",
    "Registrar un parto",
    "Generar reporte mensual",
  ];

  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && !!(window as any).__TAURI__);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        const res = await checkLocal.mutateAsync();
        setLocalModelAvailable(res.available);
      } catch {
        setLocalModelAvailable(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    const unsubs: Array<() => void> = [];
    const t = (window as any).__TAURI__;
    if (t?.event) {
      t.event
        .listen("model-download-progress", (e: any) => {
          const payload = e?.payload as any;
          if (payload && typeof payload.downloaded === "number") {
            setDlProgress({
              downloaded: payload.downloaded,
              total: payload.total || 0,
            });
          }
        })
        .then((un: any) => unsubs.push(un));
    }
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [isTauri]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Primero: intentar enrutar intención para acciones CRUD/navegación
      const intent = await routeIntent.mutateAsync({
        query: userMessage.content,
      });
      if (intent?.action === "list_modules" && intent?.data?.modules) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Estos son los módulos disponibles:",
          timestamp: new Date(),
          module: "assistant",
          action: "list_modules",
          data: intent.data,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }
      if (intent?.navigateTo) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Abriendo la pantalla solicitada...",
          timestamp: new Date(),
          module: intent.module ?? undefined,
          action: intent.action ?? undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        router.push(intent.navigateTo);
        return;
      }

      const response = await aiClient.processQuery(input, {
        currentModule: "chat",
        recentMessages: messages.slice(-5),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        module: response.module,
        action: response.action,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.module && response.action) {
        const mod =
          moduleRegistry[response.module as keyof typeof moduleRegistry];
        const act = mod?.actions?.[response.action];
        if (act) {
          const result = await act.run(response.data);
          if (result?.navigateTo) router.push(result.navigateTo);
        }
      }
    } catch (error) {
      console.error("Error procesando consulta:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Lo siento, ocurrió un error procesando tu consulta. Por favor, intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (
      !(typeof window !== "undefined" && "webkitSpeechRecognition" in window) &&
      !(typeof window !== "undefined" && "SpeechRecognition" in window)
    ) {
      alert("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = "es-CO";
    recognition.continuous = false;
    recognition.interimResults = false;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Error en reconocimiento de voz:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSampleCommand = (command: string) => {
    setInput(command);
    inputRef.current?.focus();
  };

  const startLocalAI = async () => {
    if (!isTauri) return;
    const { tauri } = (window as any).__TAURI__;
    try {
      const binPath = await tauri.invoke("download_llama_binary");
      const modelPath = await tauri.invoke("download_model", {
        url: MODEL_URL,
        sha256Hex: MODEL_SHA || null,
      });
      await tauri.invoke("start_llama_server", {
        modelPath,
        port: LLAMA_PORT,
      });
      setAIClientHost(`http://127.0.0.1:${LLAMA_PORT}`);
      setLocalModelAvailable(true);
      setLlamaRunning(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <TRPCProvider>
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="bg-white border-b border-ranch-200 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-pasture-100 rounded-lg">
                <Bot className="h-6 w-6 text-pasture-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-ranch-900">
                  {translations.ai.title}
                </h1>
                <p className="text-sm text-ranch-600">
                  Tu asistente inteligente para gestión ganadera
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-ranch-50 p-4 space-y-4">
            {localModelAvailable === false && (
              <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm">
                    Modelo local no disponible. Puedes descargar{" "}
                    <strong>deepseek-r1</strong> para usar la IA sin conexión.
                  </p>
                  <Button
                    size="sm"
                    variant="solid"
                    color="primary"
                    isLoading={ensureLocal.isPending}
                    onPress={async () => {
                      if (isTauri) {
                        await startLocalAI();
                      } else {
                        const res = await ensureLocal.mutateAsync({
                          model:
                            process.env.NEXT_PUBLIC_OLLAMA_MODEL ||
                            "deepseek-r1:latest",
                        });
                        if (res.ok) {
                          const chk = await checkLocal.mutateAsync();
                          setLocalModelAvailable(chk.available);
                        }
                      }
                    }}
                    className="bg-violet-600 hover:bg-violet-700 text-white shadow-md"
                  >
                    <Download className="h-4 w-4 mr-1" /> Descargar modelo
                  </Button>
                </div>
                {dlProgress && (
                  <div className="mt-2 text-xs">
                    <div className="h-2 bg-amber-200 rounded">
                      <div
                        className="h-2 bg-violet-600 rounded"
                        style={{
                          width:
                            dlProgress.total > 0
                              ? `${Math.min(
                                  100,
                                  Math.round(
                                    (dlProgress.downloaded / dlProgress.total) *
                                      100
                                  )
                                )}%`
                              : "10%",
                        }}
                      />
                    </div>
                    <p className="mt-1">
                      {dlProgress.total > 0
                        ? `${(dlProgress.downloaded / (1024 * 1024)).toFixed(
                            1
                          )} MB / ${(dlProgress.total / (1024 * 1024)).toFixed(
                            1
                          )} MB`
                        : `Descargando... ${(
                            dlProgress.downloaded /
                            (1024 * 1024)
                          ).toFixed(1)} MB`}
                    </p>
                  </div>
                )}
                {llamaRunning && (
                  <div className="flex items-center gap-2 text-green-700 text-sm mt-2">
                    <Server className="h-4 w-4" /> IA local en ejecución en{" "}
                    {`127.0.0.1:${LLAMA_PORT}`}
                  </div>
                )}
              </div>
            )}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 text-pasture-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-ranch-900 mb-2">
                    ¡Hola! Soy tu asistente Ganado AI
                  </h2>
                  <p className="text-ranch-600 max-w-md">
                    Puedo ayudarte a gestionar tu finca, registrar animales,
                    programar vacunaciones y mucho más. ¿En qué puedo ayudarte
                    hoy?
                  </p>
                </div>

                {/* Sample Commands */}
                <div className="w-full max-w-2xl">
                  <p className="text-sm text-ranch-600 mb-3">
                    Comandos de ejemplo:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sampleCommands.map((command) => (
                      <button
                        key={command}
                        onClick={() => handleSampleCommand(command)}
                        className="text-left px-4 py-2 bg-white rounded-lg border border-ranch-200 hover:bg-ranch-50 transition-colors text-sm text-ranch-700"
                      >
                        {command}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-start space-x-2 max-w-[70%]",
                        message.role === "user"
                          ? "flex-row-reverse space-x-reverse"
                          : ""
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          message.role === "user"
                            ? "bg-ranch-100"
                            : "bg-pasture-100"
                        )}
                      >
                        {message.role === "user" ? (
                          <User className="h-5 w-5 text-ranch-600" />
                        ) : (
                          <Bot className="h-5 w-5 text-pasture-600" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "px-4 py-2 rounded-lg",
                          message.role === "user"
                            ? "bg-ranch-500 text-white"
                            : "bg-white border border-ranch-200"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.module === "assistant" &&
                          message.action === "list_modules" && (
                            <div className="mt-3 border-t pt-3">
                              <p className="text-sm font-medium mb-2">
                                Módulos disponibles
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(message as any).data?.modules?.map(
                                  (m: any) => (
                                    <div
                                      key={m.id}
                                      className="border rounded-lg p-2 flex items-center justify-between"
                                    >
                                      <div>
                                        <p className="text-sm font-medium">
                                          {m.name}
                                        </p>
                                        <p className="text-xs text-ranch-600">
                                          /{m.id}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {m.hasList && (
                                          <Button
                                            size="sm"
                                            variant="bordered"
                                            onPress={() =>
                                              router.push(`/${m.id}`)
                                            }
                                          >
                                            Ver
                                          </Button>
                                        )}
                                        {m.hasCreate && (
                                          <Button
                                            size="sm"
                                            color="primary"
                                            onPress={() =>
                                              router.push(`/${m.id}/new`)
                                            }
                                          >
                                            Nuevo
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        {message.module && (
                          <p className="text-xs mt-2 opacity-70">
                            Módulo: {message.module}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-2 bg-white border border-ranch-200 rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-pasture-600" />
                      <span className="text-ranch-600">Pensando...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-ranch-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={translations.ai.placeholder}
                    className="w-full px-4 py-2 border border-ranch-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ranch-500 resize-none"
                    rows={1}
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />
                </div>
                <Button
                  onPress={handleVoiceInput}
                  variant="bordered"
                  isIconOnly
                  className={cn(isListening && "bg-red-100 border-red-300")}
                >
                  {isListening ? (
                    <MicOff className="h-5 w-5 text-red-600" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  onPress={handleSend}
                  isDisabled={!input.trim() || isLoading}
                  color="primary"
                  className="bg-pasture-500 hover:bg-pasture-600 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </TRPCProvider>
  );
}
