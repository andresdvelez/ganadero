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
import { AnimalNewEmbedded } from "@/components/embedded/animal-new-embedded";
import { AIAssistantDashboard } from "@/components/ai/ai-dashboard";
import {
  db,
  generateUUID,
  OfflineChat,
  OfflineChatMessage,
  addToSyncQueue,
} from "@/lib/dexie";
// Sidebar is now handled globally in the layout

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
  const [chatUuid, setChatUuid] = useState<string | null>(null);
  const [chatList, setChatList] = useState<OfflineChat[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const aiClient = getAIClient();
  const router = useRouter();
  const routeIntent = trpc.ai.routeIntent.useMutation();
  const checkLocal = trpc.ai.checkLocalModel.useMutation();
  const ensureLocal = trpc.ai.ensureLocalModel.useMutation();
  const cloud = trpc.ai.checkCloudAvailable.useQuery();
  const cloudAvailable = !!cloud.data?.available;
  const [localModelAvailable, setLocalModelAvailable] = useState<
    boolean | null
  >(null);
  const [isTauri, setIsTauri] = useState(false);

  const [dlProgress, setDlProgress] = useState<{
    downloaded: number;
    total: number;
  } | null>(null);
  const [llamaRunning, setLlamaRunning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [inlineTool, setInlineTool] = useState<{
    type: "animals.create";
    props?: any;
  } | null>(null);

  const MODEL_URL =
    process.env.NEXT_PUBLIC_MODEL_DOWNLOAD_URL ||
    "https://huggingface.co/ganado/ollama/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q8_0.gguf?download=true";
  const MODEL_SHA = process.env.NEXT_PUBLIC_MODEL_SHA256 || null;
  const LLAMA_BIN_URL = process.env.NEXT_PUBLIC_LLAMA_BINARY_URL || "";
  const LLAMA_PORT = Number(process.env.NEXT_PUBLIC_LLAMA_PORT || 11434);
  const PREFERRED_MODEL =
    process.env.NEXT_PUBLIC_OLLAMA_MODEL || "deepseek-r1-qwen-1_5b:latest";

  // Sample commands for quick actions
  const sampleCommands = [
    "Agregar una vaca nueva",
    "Ver animales que necesitan vacunación",
    "Registrar un parto",
    "Generar reporte mensual",
  ];

  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && !!(window as any).__TAURI__);
    // Load recent chats
    (async () => {
      try {
        const items = await db.chats
          .orderBy("updatedAt")
          .reverse()
          .limit(20)
          .toArray();
        setChatList(items);
      } catch {}
    })();
    // Hook up module launcher opener
    const openListener = () => {
      const ev = new CustomEvent("open-modules");
      window.dispatchEvent(ev);
    };
    // Listen for layout chat events
    const onNewChat = () => {
      setChatUuid(null);
      setMessages([]);
      setInput("");
    };
    const onOpenChat = async (e: any) => {
      const uuid = e?.detail?.uuid as string;
      if (!uuid) return;
      setChatUuid(uuid);
      const msgs = await db.chatMessages
        .where({ chatUuid: uuid })
        .sortBy("createdAt");
      setMessages(
        msgs.map((m) => ({
          id: String(m.id),
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        })) as Message[]
      );
    };
    window.addEventListener("ai-new-chat", onNewChat as any);
    window.addEventListener("ai-open-chat", onOpenChat as any);

    // If running inside Tauri, force AI client to use the local Ollama host directly
    try {
      const isTauriEnv =
        typeof window !== "undefined" && !!(window as any).__TAURI__;
      if (isTauriEnv) {
        setAIClientHost(`http://127.0.0.1:${LLAMA_PORT}`);
      }
    } catch {}

    // Debug override via query param: ?forceLocal=1|0|true|false
    try {
      const usp = new URLSearchParams(window.location.search);
      const force = usp.get("forceLocal");
      if (force !== null) {
        const truthy = ["1", "true", "yes"].includes(force.toLowerCase());
        const falsy = ["0", "false", "no"].includes(force.toLowerCase());
        if (truthy) setLocalModelAvailable(true);
        else if (falsy) setLocalModelAvailable(false);
      }
    } catch {}

    // Client-side probe of local model to drive overlay reliably
    (async () => {
      try {
        const available = await aiClient.checkLocalAvailability();
        setLocalModelAvailable((prev) => (prev === true ? true : !!available));
      } catch {
        setLocalModelAvailable((prev) => (prev === true ? true : false));
      }
    })();

    return () => {
      window.removeEventListener("ai-new-chat", onNewChat as any);
      window.removeEventListener("ai-open-chat", onOpenChat as any);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, inlineTool]);

  useEffect(() => {
    (async () => {
      try {
        const res = await checkLocal.mutateAsync();
        setLocalModelAvailable((prev) =>
          prev === true ? true : !!res.available
        );
      } catch {
        setLocalModelAvailable((prev) => (prev === true ? true : false));
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

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput(overrideText ? "" : "");
    setIsLoading(true);

    try {
      // Ensure chat exists
      let currentChatUuid = chatUuid;
      if (!currentChatUuid) {
        currentChatUuid = generateUUID();
        const title = textToSend.slice(0, 60);
        await db.chats.add({
          uuid: currentChatUuid,
          userId: "dev-user",
          title,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as OfflineChat);
        setChatUuid(currentChatUuid);
        setChatList(
          await db.chats.orderBy("updatedAt").reverse().limit(20).toArray()
        );
        window.dispatchEvent(new Event("ai-chat-updated"));
      }
      // Persist user message
      await db.chatMessages.add({
        chatUuid: currentChatUuid!,
        role: "user",
        content: textToSend,
        createdAt: new Date(),
      } as OfflineChatMessage);
      // Queue sync for user message
      await addToSyncQueue(
        "create",
        "ai_conversation",
        `${currentChatUuid}-user-${Date.now()}`,
        {
          sessionId: currentChatUuid,
          role: "user",
          content: textToSend,
          createdAt: new Date().toISOString(),
        },
        "dev-user"
      );

      // Primero: intentar enrutar intención para acciones CRUD/navegación
      const intent = await routeIntent.mutateAsync({
        query: userMessage.content,
      });

      // Mostrar herramientas inline en lugar de navegar
      if (intent?.module === "animals" && intent?.action === "create") {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Abrí el formulario para registrar un nuevo animal.",
          timestamp: new Date(),
          module: intent.module,
          action: intent.action,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setInlineTool({ type: "animals.create" });
        return;
      }

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
        // router.push(intent.navigateTo) => ahora evitamos navegación
        return;
      }

      const response = await aiClient.processQuery(textToSend, {
        currentModule: "chat",
        recentMessages: messages.slice(-5),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: String(response.content ?? ""),
        timestamp: new Date(),
        module: response.module,
        action: response.action,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      // Persist assistant message and update chat timestamp/title if needed
      if (currentChatUuid) {
        await db.chatMessages.add({
          chatUuid: currentChatUuid,
          role: "assistant",
          content: assistantMessage.content,
          createdAt: new Date(),
        } as OfflineChatMessage);
        await db.chats
          .where({ uuid: currentChatUuid })
          .modify({ updatedAt: new Date() });
        window.dispatchEvent(new Event("ai-chat-updated"));
        // Queue sync for assistant message
        await addToSyncQueue(
          "create",
          "ai_conversation",
          `${currentChatUuid}-assistant-${Date.now()}`,
          {
            sessionId: currentChatUuid,
            role: "assistant",
            content: assistantMessage.content,
            createdAt: new Date().toISOString(),
          },
          "dev-user"
        );
      }

      if (response.module === "animals" && response.action === "create") {
        setInlineTool({ type: "animals.create" });
        return;
      }

      if (response.module && response.action) {
        const mod =
          moduleRegistry[response.module as keyof typeof moduleRegistry];
        const act = mod?.actions?.[response.action];
        if (act) {
          const result = await act.run(response.data);
          // evitamos navegar, sólo informamos
          if (result?.message) {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: String(result.message ?? ""),
                timestamp: new Date(),
              },
            ]);
          }
        }
      }
    } catch (error) {
      console.error("Error procesando consulta:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Lo siento, ocurrió un error procesando tu consulta. Por favor, intenta de nuevo." +
          (error instanceof Error && error.message
            ? `\nDetalle: ${error.message}`
            : ""),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      // Si falla, no sobreescribir disponibilidad si ya se detectó verdadero
      setLocalModelAvailable((prev) => (prev === true ? true : false));
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
      setIsListening(false);
      // Auto-send immediately after transcription ends
      handleSend(transcript);
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
      setIsDownloading(true);
      const binPath = await tauri.invoke("download_llama_binary");
      const modelPath = await tauri.invoke("download_model", {
        url: MODEL_URL,
        sha256Hex: MODEL_SHA,
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
    } finally {
      setIsDownloading(false);
    }
  };

  const isOnline =
    typeof navigator === "undefined" ? true : navigator.onLine !== false;
  const overlayVisible = !isOnline && localModelAvailable === false;

  return (
    <TRPCProvider>
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Header removed per new design */}

          {/* Messages + Inline Tools */}
          <div className="flex-1 overflow-y-auto p-0">
            {/* Conversation content only; sidebar handled in layout */}
            {messages.length > 0 ? (
              <div className="flex h-full">
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Inline tool remains */}
                  {inlineTool?.type === "animals.create" && (
                    <div className="max-w-3xl mx-auto mb-4">
                      <AnimalNewEmbedded
                        onCompleted={() => {
                          setInlineTool(null);
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: (Date.now() + 3).toString(),
                              role: "assistant",
                              content: "Animal registrado correctamente.",
                              timestamp: new Date(),
                            },
                          ]);
                        }}
                        onClose={() => setInlineTool(null)}
                      />
                    </div>
                  )}

                  <div
                    className={cn(
                      "mx-auto max-w-3xl space-y-4",
                      inlineTool ? "mt-4" : ""
                    )}
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "animate-message",
                          message.role === "user"
                            ? "flex justify-end"
                            : "flex justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-start gap-3 w-full",
                            message.role === "user" ? "flex-row-reverse" : ""
                          )}
                        >
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full grid place-items-center",
                              message.role === "user"
                                ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                                : "bg-neutral-100 text-neutral-700"
                            )}
                          >
                            {message.role === "user" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-3 max-w-[80%] transition-all",
                              message.role === "user"
                                ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md"
                                : "bg-white border border-neutral-200 shadow-sm text-neutral-800"
                            )}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {message.content}
                            </p>
                            {message.module && (
                              <p className="text-[11px] mt-2 opacity-70">
                                Módulo sugerido: {message.module}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="mx-auto max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-white border border-neutral-200 px-4 py-2 shadow-sm">
                          <span className="typing-dots" />
                          <span className="text-neutral-600">Pensando…</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <AIAssistantDashboard
                  value={input}
                  onChange={(v) => setInput(v)}
                  onSend={() => handleSend()}
                  onMic={handleVoiceInput}
                  onSample={(cmd) => handleSampleCommand(cmd)}
                  userName={undefined}
                  modelOverlay={{
                    visible: overlayVisible,
                    isLoading: ensureLocal.isPending || isDownloading,
                    onDownload: async () => {
                      if (isTauri) {
                        await startLocalAI();
                      } else {
                        const res = await ensureLocal.mutateAsync({
                          model: PREFERRED_MODEL,
                        });
                        if (res.ok) {
                          const chk = await checkLocal.mutateAsync();
                          setLocalModelAvailable(chk.available);
                        }
                      }
                    },
                  }}
                  debugText={`localModelAvailable: ${String(
                    localModelAvailable
                  )}, cloudAvailable: ${String(cloudAvailable)}`}
                />
              </div>
            )}
          </div>

          {/* Input Area (hidden on empty-state dashboard) */}
          {messages.length > 0 && (
            <div className="bg-white border-t border-ranch-200 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
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
          )}
        </div>
      </DashboardLayout>
    </TRPCProvider>
  );
}
