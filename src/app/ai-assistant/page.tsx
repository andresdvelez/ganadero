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
import { AIInputBar } from "@/components/ai/ai-input-bar";
import { AISidebar } from "@/components/ai/ai-sidebar";
import { ModuleLauncher } from "@/components/modules/module-launcher";
import { HealthNewEmbedded } from "@/components/embedded/health-new-embedded";
import { MilkNewEmbedded } from "@/components/embedded/milk-new-embedded";
import { HeroModal } from "@/components/ui/hero-modal";
import { HeroDrawer } from "@/components/ui/hero-drawer";
import { InventoryProductNew } from "@/components/embedded/inventory-product-new";
import { InventoryMovementNew } from "@/components/embedded/inventory-movement-new";
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
    type: "animals.create" | "health.create" | "milk.create";
    props?: any;
  } | null>(null);
  const [drawerTool, setDrawerTool] = useState<{
    type: "inventory.create" | "inventory.movement";
    props?: any;
  } | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [listenStartedAt, setListenStartedAt] = useState<number | null>(null);
  const [listenElapsedMs, setListenElapsedMs] = useState<number>(0);
  const [levels, setLevels] = useState<number[] | undefined>(undefined);
  const [webSearch, setWebSearch] = useState<boolean>(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

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

  // Listen to sidebar event to open modules
  useEffect(() => {
    const handler = () => setModulesOpen(true);
    window.addEventListener("open-modules", handler as any);
    return () => window.removeEventListener("open-modules", handler as any);
  }, []);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages, inlineTool]);

  // ticking timer for mic UI
  useEffect(() => {
    if (!isListening || !listenStartedAt) return;
    const id = setInterval(() => {
      setListenElapsedMs(Date.now() - listenStartedAt);
    }, 200);
    return () => clearInterval(id);
  }, [isListening, listenStartedAt]);

  // analyser loop for waveform
  useEffect(() => {
    if (!isListening || !audioAnalyserRef.current) return;
    const analyser = audioAnalyserRef.current;
    const fft = 256;
    analyser.fftSize = fft;
    const bufferLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLen);
    const render = () => {
      analyser.getByteTimeDomainData(data);
      // Convert to normalized levels across the bar count
      const bars = 64;
      const step = Math.floor(bufferLen / bars);
      const arr: number[] = [];
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++)
          sum += Math.abs(data[i * step + j] - 128);
        const avg = sum / step; // 0..128
        arr.push(Math.min(1, avg / 64));
      }
      setLevels(arr);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isListening]);

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
      if (intent?.module === "health" && intent?.action === "create") {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Abrí el formulario para registrar un evento de salud.",
          timestamp: new Date(),
          module: intent.module,
          action: intent.action,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setInlineTool({ type: "health.create" });
        return;
      }
      if (intent?.module === "milk" && intent?.action === "create") {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Abrí el formulario para registrar producción de leche.",
          timestamp: new Date(),
          module: intent.module,
          action: intent.action,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setInlineTool({ type: "milk.create" });
        return;
      }
      if (intent?.module === "inventory" && intent?.action === "create") {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Abrí el panel para crear un producto de inventario.",
          timestamp: new Date(),
          module: intent.module,
          action: intent.action,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setDrawerTool({ type: "inventory.create" });
        return;
      }
      if (intent?.module === "inventory" && intent?.action === "movement") {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Abrí el panel para registrar un movimiento de stock.",
          timestamp: new Date(),
          module: intent.module,
          action: intent.action,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setDrawerTool({ type: "inventory.movement" });
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
        webSearch:
          webSearch &&
          (typeof navigator === "undefined" || navigator.onLine !== false),
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
      if (response.module === "health" && response.action === "create") {
        setInlineTool({ type: "health.create" });
        return;
      }
      if (response.module === "milk" && response.action === "create") {
        setInlineTool({ type: "milk.create" });
        return;
      }
      if (response.module === "inventory" && response.action === "create") {
        setDrawerTool({ type: "inventory.create" });
        return;
      }
      if (response.module === "inventory" && response.action === "movement") {
        setDrawerTool({ type: "inventory.movement" });
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
    // Prepare WebAudio stream for visual levels
    async function setupAnalyser() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const ctx = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        src.connect(analyser);
        audioAnalyserRef.current = analyser;
        audioStreamRef.current = stream;
      } catch {}
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
      setListenStartedAt(null);
      setLevels(undefined);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      return;
    }
    recognition.onstart = () => {
      setIsListening(true);
      setListenStartedAt(Date.now());
      setListenElapsedMs(0);
      setupAnalyser();
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setIsListening(false);
      setListenStartedAt(null);
      setLevels(undefined);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      handleSend(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setListenStartedAt(null);
      setLevels(undefined);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      setListenStartedAt(null);
      setLevels(undefined);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
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
                  <HeroModal
                    open={!!inlineTool}
                    onClose={() => setInlineTool(null)}
                    title={
                      inlineTool?.type === "animals.create"
                        ? "Registrar nuevo animal"
                        : inlineTool?.type === "health.create"
                        ? "Registrar evento de salud"
                        : inlineTool?.type === "milk.create"
                        ? "Registrar producción de leche"
                        : undefined
                    }
                    size="lg"
                  >
                    {inlineTool?.type === "animals.create" && (
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
                    )}
                    {inlineTool?.type === "health.create" && (
                      <HealthNewEmbedded
                        onCompleted={() => {
                          setInlineTool(null);
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: (Date.now() + 3).toString(),
                              role: "assistant",
                              content:
                                "Evento de salud registrado correctamente.",
                              timestamp: new Date(),
                            },
                          ]);
                        }}
                        onClose={() => setInlineTool(null)}
                      />
                    )}
                    {inlineTool?.type === "milk.create" && (
                      <MilkNewEmbedded
                        onCompleted={() => {
                          setInlineTool(null);
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: (Date.now() + 3).toString(),
                              role: "assistant",
                              content:
                                "Registro de leche guardado correctamente.",
                              timestamp: new Date(),
                            },
                          ]);
                        }}
                        onClose={() => setInlineTool(null)}
                      />
                    )}
                  </HeroModal>

                  <HeroDrawer
                    open={!!drawerTool}
                    onClose={() => setDrawerTool(null)}
                    title={
                      drawerTool?.type === "inventory.create"
                        ? "Nuevo producto"
                        : drawerTool?.type === "inventory.movement"
                        ? "Movimiento de stock"
                        : undefined
                    }
                    width={520}
                  >
                    {drawerTool?.type === "inventory.create" && (
                      <InventoryProductNew
                        onCompleted={() => {
                          setDrawerTool(null);
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: (Date.now() + 3).toString(),
                              role: "assistant",
                              content: "Producto creado correctamente.",
                              timestamp: new Date(),
                            },
                          ]);
                        }}
                        onClose={() => setDrawerTool(null)}
                      />
                    )}
                    {drawerTool?.type === "inventory.movement" && (
                      <InventoryMovementNew
                        onCompleted={() => {
                          setDrawerTool(null);
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: (Date.now() + 3).toString(),
                              role: "assistant",
                              content: "Movimiento registrado correctamente.",
                              timestamp: new Date(),
                            },
                          ]);
                        }}
                        onClose={() => setDrawerTool(null)}
                      />
                    )}
                  </HeroDrawer>

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
                    isListening={isListening}
                    listenElapsedMs={listenElapsedMs}
                    levels={levels}
                    webSearch={webSearch}
                    onToggleWebSearch={setWebSearch}
                    analyser={audioAnalyserRef.current}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Bottom input with same design as hero */}
          {messages.length > 0 && (
            <div className="bg-white border-t border-neutral-200 p-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="max-w-4xl mx-auto">
                <AIInputBar
                  value={input}
                  onChange={(v) => setInput(v)}
                  onSend={() => handleSend()}
                  onMic={handleVoiceInput}
                  isListening={isListening}
                  elapsedMs={listenElapsedMs}
                  disabled={isLoading}
                  levels={levels}
                  webSearch={webSearch}
                  onToggleWebSearch={setWebSearch}
                  analyser={audioAnalyserRef.current}
                />
              </div>
            </div>
          )}
          {modulesOpen && (
            <ModuleLauncher
              open={modulesOpen}
              onClose={() => setModulesOpen(false)}
            />
          )}
        </div>
      </DashboardLayout>
    </TRPCProvider>
  );
}
