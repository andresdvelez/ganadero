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
  ArrowUp,
  Mic,
  MicOff,
  Loader2,
  Bot,
  User,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { moduleRegistry } from "@/modules";
import { trpc } from "@/lib/trpc/client";
import { AnimalNewEmbedded } from "@/components/embedded/animal-new-embedded";
import { AIAssistantDashboard } from "@/components/ai/ai-dashboard";
import { AISidebar } from "@/components/ai/ai-sidebar";
import {
  db,
  generateUUID,
  OfflineChat,
  OfflineChatMessage,
  addToSyncQueue,
} from "@/lib/dexie";
import { addToast } from "@/components/ui/toast";

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
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);

  // New TRPC hooks for AI context/memories
  const recordMessage = trpc.ai.recordMessage.useMutation();
  const utils = trpc.useUtils();
  const confirmMemories = trpc.ai.confirmMemories.useMutation();
  const summarizeSession = trpc.ai.summarizeSession.useMutation();

  const MODEL_URL =
    process.env.NEXT_PUBLIC_MODEL_DOWNLOAD_URL ||
    "https://huggingface.co/ganado/ollama/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q8_0.gguf?download=true";
  const MODEL_SHA = process.env.NEXT_PUBLIC_MODEL_SHA256 || null;
  const LLAMA_PORT = Number(process.env.NEXT_PUBLIC_LLAMA_PORT || 11434);
  const PREFERRED_MODEL =
    process.env.NEXT_PUBLIC_OLLAMA_MODEL || "deepseek-r1-qwen-1_5b:latest";

  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && !!(window as any).__TAURI__);
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

    try {
      const isTauriEnv =
        typeof window !== "undefined" && !!(window as any).__TAURI__;
      if (isTauriEnv) setAIClientHost(`http://127.0.0.1:${LLAMA_PORT}`);
    } catch {}

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
      // auto summarize on unmount if there is a session
      if (chatUuid && messages.length >= 10) {
        summarizeSession.mutate({
          sessionId: chatUuid,
          take: Math.min(50, messages.length),
        });
      }
    };
  }, []);

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
  }, []);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages, inlineTool]);

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
      }

      // Persist user message locally and queue
      await db.chatMessages.add({
        chatUuid: currentChatUuid!,
        role: "user",
        content: textToSend,
        createdAt: new Date(),
      } as OfflineChatMessage);
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

      // Call server: record + get context with query for memory ranking
      try {
        const recorded = await recordMessage.mutateAsync({
          sessionId: currentChatUuid!,
          role: "user",
          content: textToSend,
        });
        if (recorded?.suggestedMemories?.length) {
          const id = addToast({
            variant: "info",
            title: "Preferencias detectadas",
            description: recorded.suggestedMemories
              .map((m: any) => `• ${m.content}`)
              .join("\n"),
            durationMs: 8000,
          });
          // Optionally we could render a UI accept button; here we auto-confirm important ones later
        }
      } catch {}

      // Intent quick path
      const intent = await routeIntent.mutateAsync({
        query: userMessage.content,
      });
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

      // Build richer context from server
      let context: any = null;
      try {
        context = await utils.ai.getContext.fetch({
          sessionId: currentChatUuid!,
          recent: 8,
          memories: 10,
          query: textToSend,
        });
      } catch {}

      const response = await aiClient.processQuery(textToSend, {
        currentModule: "chat",
        recentMessages: messages.slice(-5),
        profile: context?.profile || null,
        memories: context?.memories || [],
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

      // Persist assistant message + queue
      await db.chatMessages.add({
        chatUuid: currentChatUuid!,
        role: "assistant",
        content: assistantMessage.content,
        createdAt: new Date(),
      } as OfflineChatMessage);
      await db.chats
        .where({ uuid: currentChatUuid! })
        .modify({ updatedAt: new Date() });
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

      // Record assistant server-side (for summaries, future extractions if needed)
      try {
        await recordMessage.mutateAsync({
          sessionId: currentChatUuid!,
          role: "assistant",
          content: assistantMessage.content,
        });
      } catch {}

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
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Lo siento, ocurrió un error procesando tu consulta. Por favor, intenta de nuevo." +
            (error instanceof Error && error.message
              ? `\nDetalle: ${error.message}`
              : ""),
          timestamp: new Date(),
        },
      ]);
      setLocalModelAvailable((prev) => (prev === true ? true : false));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (
      !(
        typeof window !== "undefined" &&
        ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
      )
    ) {
      addToast({
        variant: "warning",
        title: "Sin soporte de voz",
        description: "Tu navegador no soporta reconocimiento de voz.",
      });
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
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setIsListening(false);
      setVoiceTranscript(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
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
      <DashboardLayout
        leftSlot={
          <AISidebar
            chats={chatList.map((c) => ({
              uuid: c.uuid,
              title: c.title,
              updatedAt: c.updatedAt,
            }))}
            activeChatUuid={chatUuid}
            onNewChat={() => window.dispatchEvent(new Event("ai-new-chat"))}
            onSelectChat={(uuid) =>
              window.dispatchEvent(
                new CustomEvent("ai-open-chat", { detail: { uuid } })
              )
            }
          />
        }
      >
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex-1 overflow-y-auto p-0">
            {messages.length > 0 ? (
              <div className="flex h-full">
                <div className="flex-1 overflow-y-auto p-6">
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
              <div className="flex h-full">
                <div className="flex-1 p-6">
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
                        if (isTauri) await startLocalAI();
                        else {
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
              </div>
            )}
          </div>

          {/* Unified input bar shown always */}
          <div className="bg-white border-t border-ranch-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-2">
                {/* Recording state UI */}
                {isListening || voiceTranscript !== null ? (
                  <div className="flex-1">
                    <div className="w-full h-12 rounded-full bg-neutral-900 text-white px-4 flex items-center justify-between">
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-xl">+</span>
                        <div className="flex-1">
                          {voiceTranscript ? (
                            <span className="text-neutral-200">
                              {voiceTranscript}
                            </span>
                          ) : (
                            <WaveIndicator />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="light"
                          isIconOnly
                          onPress={() => {
                            setIsListening(false);
                            setVoiceTranscript(null);
                          }}
                          aria-label="Cancelar"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                        <Button
                          color="primary"
                          isIconOnly
                          onPress={() => {
                            if (voiceTranscript) {
                              handleSend(voiceTranscript);
                              setVoiceTranscript(null);
                            }
                          }}
                          aria-label="Enviar"
                        >
                          <Check className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="w-full h-12 rounded-full bg-neutral-900 text-white px-4 flex items-center gap-3">
                        <span className="text-xl">+</span>
                        <input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && !e.shiftKey
                              ? (e.preventDefault(), handleSend())
                              : null
                          }
                          placeholder="Pregunta lo que quieras"
                          className="flex-1 bg-transparent outline-none placeholder:text-neutral-400"
                        />
                      </div>
                    </div>
                    <Button
                      onPress={handleVoiceInput}
                      variant="bordered"
                      isIconOnly
                      className={cn(isListening && "bg-red-100 border-red-300")}
                      aria-label="Voz"
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
                      isIconOnly
                      className="bg-pasture-500 hover:bg-pasture-600 text-white"
                      aria-label="Enviar"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowUp className="h-5 w-5" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </TRPCProvider>
  );
}

function WaveIndicator() {
  return (
    <div className="relative w-40 h-4">
      <div className="absolute inset-0 border-t border-dotted border-neutral-500/60" />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-16 bg-white/70 rounded-sm animate-pulse" />
    </div>
  );
}
