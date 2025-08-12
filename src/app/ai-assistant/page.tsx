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
  Edit3,
  Flag,
  Repeat2,
  PauseCircle,
  PlayCircle,
  MoreHorizontal,
  Copy,
  Reply,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button as HeroUIButton,
} from "@heroui/react";
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
  const [isPaused, setIsPaused] = useState(false);
  const [editFromMessageId, setEditFromMessageId] = useState<string | null>(
    null
  );
  const [checkpoints, setCheckpoints] = useState<
    Array<{ messageId: string; createdAt: Date; label?: string }>
  >([]);
  const pastureList = trpc.pasture.getAll.useQuery(undefined, {
    enabled: false,
  });
  const longPressTimerRef = useRef<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    messageId: string | null;
  }>({ open: false, x: 0, y: 0, messageId: null });
  const [checkpointsOpen, setCheckpointsOpen] = useState(false);
  const [pendingCandidates, setPendingCandidates] = useState<{
    modules: Array<{ id: string; score: number }>;
    originalText: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<null | {
    kind: "navigate" | "open-inline" | "open-drawer";
    summary: string;
    payload: any;
  }>(null);

  // New TRPC hooks for AI context/memories
  const recordMessage = trpc.ai.recordMessage.useMutation();
  const utils = trpc.useUtils();
  const confirmMemories = trpc.ai.confirmMemories.useMutation();
  const summarizeSession = trpc.ai.summarizeSession.useMutation();
  const recordChoice = trpc.ai.recordChoice.useMutation();

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
    if (isPaused) {
      addToast({
        variant: "warning",
        title: "Chat en pausa",
        description: "Reanuda para enviar mensajes.",
      });
      return;
    }
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
    setCheckpoints((prev) => [
      ...prev,
      {
        messageId: userMessage.id,
        createdAt: new Date(),
        label: textToSend.slice(0, 40),
      },
    ]);

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
      if (intent?.module === "unknown" && intent?.data?.candidates?.length) {
        setPendingCandidates({
          modules: intent.data.candidates,
          originalText: userMessage.content,
        });
        setIsLoading(false);
        return;
      }
      if (intent?.module === "finance") {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            intent?.action === "create"
              ? "Abrí el módulo de Finanzas para registrar una transacción."
              : "Abrí el módulo de Finanzas.",
          timestamp: new Date(),
          module: intent.module,
          action: intent.action,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        // open launcher or navigate
        setModulesOpen(true);
        // You can also push to a dedicated finance page if present
        // router.push("/_/finance");
        setIsLoading(false);
        return;
      }
      // Inline handling for pastures
      if (intent?.module === "pastures") {
        if (intent?.action === "list") {
          const list = await utils.pasture.getAll.fetch();
          const items = list
            .map((p) => `- ${p.name}${p.areaHa ? ` (${p.areaHa} ha)` : ""}`)
            .join("\n");
          const content =
            items.length > 0
              ? `Estas son tus pasturas registradas:\n${items}`
              : "No encontré pasturas registradas.";
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content,
              timestamp: new Date(),
              module: "pastures",
              action: "list",
            },
          ]);
          // Persist assistant message
          await db.chatMessages.add({
            chatUuid: currentChatUuid!,
            role: "assistant",
            content,
            createdAt: new Date(),
          } as OfflineChatMessage);
          await db.chats
            .where({ uuid: currentChatUuid! })
            .modify({ updatedAt: new Date() });
          setIsLoading(false);
          return;
        }
        if (intent?.action === "create") {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Abrí el formulario para registrar un nuevo potrero.",
            timestamp: new Date(),
            module: intent.module,
            action: intent.action,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          router.push("/_/pastures/new");
          setIsLoading(false);
          return;
        }
      }
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

      if (response.module === "pastures" && response.action === "list") {
        const list = await utils.pasture.getAll.fetch();
        const items = list
          .map((p) => `- ${p.name}${p.areaHa ? ` (${p.areaHa} ha)` : ""}`)
          .join("\n");
        const extra =
          items.length > 0
            ? `\n\n${items}`
            : "\n\nNo encontré pasturas registradas.";
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: extra,
            timestamp: new Date(),
            module: "pastures",
            action: "list",
          },
        ]);
        await db.chatMessages.add({
          chatUuid: currentChatUuid!,
          role: "assistant",
          content: extra,
          createdAt: new Date(),
        } as OfflineChatMessage);
        await db.chats
          .where({ uuid: currentChatUuid! })
          .modify({ updatedAt: new Date() });
        return;
      }
      if (response.module === "pastures" && response.action === "create") {
        router.push("/_/pastures/new");
        return;
      }
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

  const handleResendLast = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    await handleSend(lastUser.content);
  };

  const handleContinue = async () => {
    await handleSend("continúa");
  };

  const startEditFrom = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    setEditFromMessageId(messageId);
    setInput(msg.content);
    inputRef.current?.focus();
  };

  const applyEditForkIfNeeded = () => {
    if (!editFromMessageId) return false;
    const idx = messages.findIndex((m) => m.id === editFromMessageId);
    if (idx <= 0) return false;
    const subset = messages.slice(0, idx);
    setMessages(subset);
    setChatUuid(null); // force new session
    setEditFromMessageId(null);
    return true;
  };

  // Refs por mensaje para saltar a un checkpoint
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollToMessage = (messageId: string) => {
    const el = messageRefs.current[messageId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const restoreToCheckpoint = (messageId: string) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const subset = messages.slice(0, idx + 1);
    setMessages(subset);
    setChatUuid(null); // Fork desde aquí
    addToast({
      variant: "success",
      title: "Restaurado",
      description: "La conversación se restauró al checkpoint.",
    });
  };

  // Intercept Enter send to fork when editing
  const onSendWithFork = async () => {
    const forked = applyEditForkIfNeeded();
    await handleSend();
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

  const confirmAndExecute = async () => {
    if (!pendingAction) return;
    const act = pendingAction;
    setPendingAction(null);
    if (act.kind === "navigate") {
      router.push(act.payload.href);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 9).toString(),
          role: "assistant",
          content: `Navegué a ${act.payload.href}.`,
          timestamp: new Date(),
        },
      ]);
    } else if (act.kind === "open-inline") {
      setInlineTool(act.payload);
    } else if (act.kind === "open-drawer") {
      setDrawerTool(act.payload);
    }
    // registrar elección HITL
    try {
      if (chatUuid) {
        const choice = {
          sessionId: chatUuid,
          messageId: null,
          chosenModule: act.payload?.moduleId || "ui",
          chosenAction: act.kind,
          keywords: ["confirm"],
          tone: "direct",
          candidates: [],
        } as any;
        await recordChoice.mutateAsync(choice);
        await addToSyncQueue(
          "create",
          "ai_choice",
          generateUUID(),
          { ...choice, createdAt: new Date().toISOString() },
          "dev-user"
        );
      }
    } catch {}
  };

  const cancelPending = () => setPendingAction(null);

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
                        ref={(el) => {
                          messageRefs.current[message.id] = el;
                        }}
                        className={cn(
                          "animate-message",
                          message.role === "user"
                            ? "flex justify-end"
                            : "flex justify-start"
                        )}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            open: true,
                            x: e.clientX,
                            y: e.clientY,
                            messageId: message.id,
                          });
                        }}
                        onPointerDown={(e) => {
                          if (longPressTimerRef.current)
                            window.clearTimeout(longPressTimerRef.current);
                          const px = (e as any).clientX || 0;
                          const py = (e as any).clientY || 0;
                          longPressTimerRef.current = window.setTimeout(() => {
                            setContextMenu({
                              open: true,
                              x: px,
                              y: py,
                              messageId: message.id,
                            });
                          }, 550);
                        }}
                        onPointerUp={() => {
                          if (longPressTimerRef.current)
                            window.clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }}
                        onPointerLeave={() => {
                          if (longPressTimerRef.current)
                            window.clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }}
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
                              "relative rounded-2xl px-4 py-3 max-w-[80%] transition-all",
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
                    {contextMenu.open && contextMenu.messageId && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() =>
                            setContextMenu({
                              open: false,
                              x: 0,
                              y: 0,
                              messageId: null,
                            })
                          }
                        />
                        <div
                          className="fixed z-50 bg-white border border-neutral-200 rounded-lg shadow-lg min-w-[200px] p-1"
                          style={{ left: contextMenu.x, top: contextMenu.y }}
                          role="menu"
                        >
                          <div
                            role="menuitem"
                            tabIndex={0}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-neutral-100 flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setContextMenu({
                                open: false,
                                x: 0,
                                y: 0,
                                messageId: null,
                              });
                              startEditFrom(contextMenu.messageId!);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setContextMenu({
                                  open: false,
                                  x: 0,
                                  y: 0,
                                  messageId: null,
                                });
                                startEditFrom(contextMenu.messageId!);
                              }
                            }}
                          >
                            <Edit3 className="h-4 w-4" /> Editar
                          </div>
                          <div
                            role="menuitem"
                            tabIndex={0}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-neutral-100 flex items-center gap-2 cursor-pointer"
                            onClick={async () => {
                              const msg = messages.find(
                                (m) => m.id === contextMenu.messageId
                              );
                              if (msg) {
                                try {
                                  await navigator.clipboard.writeText(
                                    msg.content
                                  );
                                  addToast({
                                    variant: "success",
                                    title: "Copiado",
                                    description:
                                      "Mensaje copiado al portapapeles.",
                                  });
                                } catch {}
                              }
                              setContextMenu({
                                open: false,
                                x: 0,
                                y: 0,
                                messageId: null,
                              });
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                const msg = messages.find(
                                  (m) => m.id === contextMenu.messageId
                                );
                                if (msg) {
                                  try {
                                    await navigator.clipboard.writeText(
                                      msg.content
                                    );
                                    addToast({
                                      variant: "success",
                                      title: "Copiado",
                                      description:
                                        "Mensaje copiado al portapapeles.",
                                    });
                                  } catch {}
                                }
                                setContextMenu({
                                  open: false,
                                  x: 0,
                                  y: 0,
                                  messageId: null,
                                });
                              }
                            }}
                          >
                            <Copy className="h-4 w-4" /> Copiar
                          </div>
                          <div
                            role="menuitem"
                            tabIndex={0}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-neutral-100 flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              const msg = messages.find(
                                (m) => m.id === contextMenu.messageId
                              );
                              if (msg) {
                                setInput(`> ${msg.content.split("\n")[0]}\n`);
                                inputRef.current?.focus();
                              }
                              setContextMenu({
                                open: false,
                                x: 0,
                                y: 0,
                                messageId: null,
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                const msg = messages.find(
                                  (m) => m.id === contextMenu.messageId
                                );
                                if (msg) {
                                  setInput(`> ${msg.content.split("\n")[0]}\n`);
                                  inputRef.current?.focus();
                                }
                                setContextMenu({
                                  open: false,
                                  x: 0,
                                  y: 0,
                                  messageId: null,
                                });
                              }
                            }}
                          >
                            <Reply className="h-4 w-4" /> Responder
                          </div>
                          <div
                            role="menuitem"
                            tabIndex={0}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-neutral-100 flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              const id = contextMenu.messageId!;
                              const msg = messages.find((m) => m.id === id);
                              setCheckpoints((prev) => [
                                ...prev,
                                {
                                  messageId: id,
                                  createdAt: new Date(),
                                  label: (msg?.content || "").slice(0, 40),
                                },
                              ]);
                              addToast({
                                variant: "success",
                                title: "Checkpoint creado",
                              });
                              setContextMenu({
                                open: false,
                                x: 0,
                                y: 0,
                                messageId: null,
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                const id = contextMenu.messageId!;
                                const msg = messages.find((m) => m.id === id);
                                setCheckpoints((prev) => [
                                  ...prev,
                                  {
                                    messageId: id,
                                    createdAt: new Date(),
                                    label: (msg?.content || "").slice(0, 40),
                                  },
                                ]);
                                addToast({
                                  variant: "success",
                                  title: "Checkpoint creado",
                                });
                                setContextMenu({
                                  open: false,
                                  x: 0,
                                  y: 0,
                                  messageId: null,
                                });
                              }
                            }}
                          >
                            <Flag className="h-4 w-4" /> Checkpoint
                          </div>
                        </div>
                      </>
                    )}

                    {/* Disambiguation candidates prompt */}
                    {pendingCandidates && (
                      <div className="mx-auto max-w-3xl mt-2">
                        <div className="rounded-2xl bg-white border border-neutral-200 p-3 shadow-sm">
                          <div className="text-sm text-neutral-700 mb-2">
                            ¿Te refieres a alguno de estos módulos?
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pendingCandidates.modules.map((c) => (
                              <Button
                                key={c.id}
                                size="sm"
                                variant="flat"
                                onPress={async () => {
                                  const choice = {
                                    sessionId: chatUuid || "",
                                    messageId:
                                      messages[messages.length - 1]?.id ||
                                      undefined,
                                    chosenModule: c.id,
                                    chosenAction: undefined,
                                    keywords: pendingCandidates.originalText
                                      .split(/\s+/)
                                      .slice(0, 6),
                                    tone: undefined,
                                    candidates: pendingCandidates.modules,
                                  } as any;
                                  // local record
                                  await db.aiChoices.add({
                                    uuid: generateUUID(),
                                    userId: "dev-user",
                                    sessionId: choice.sessionId,
                                    messageId: choice.messageId,
                                    chosenModule: choice.chosenModule,
                                    chosenAction: choice.chosenAction,
                                    keywords: JSON.stringify(choice.keywords),
                                    tone: choice.tone || null,
                                    candidates: JSON.stringify(
                                      choice.candidates
                                    ),
                                    synced: false,
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                  });
                                  // queue to sync
                                  await addToSyncQueue(
                                    "create",
                                    "ai_choice",
                                    `${chatUuid || ""}-choice-${Date.now()}`,
                                    choice,
                                    "dev-user"
                                  );
                                  // try server record (best effort)
                                  try {
                                    await recordChoice.mutateAsync(choice);
                                  } catch {}
                                  setPendingCandidates(null);
                                  // proceed by routing to chosen module
                                  setMessages((prev) => [
                                    ...prev,
                                    {
                                      id: (Date.now() + 1).toString(),
                                      role: "assistant",
                                      content: `Entendido. Abrí el módulo ${c.id}.`,
                                      timestamp: new Date(),
                                      module: c.id,
                                    },
                                  ]);
                                  setModulesOpen(true);
                                }}
                              >
                                {c.id}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {pendingAction && (
                      <div className="mx-auto max-w-3xl">
                        {pendingCandidates && (
                          <div className="mb-3 p-3 border rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                            ¿Te refieres a{" "}
                            {pendingCandidates.modules
                              .map((m) =>
                                m.id === "finance" ? "Finanzas" : m.id
                              )
                              .join(" o ")}
                            ?
                          </div>
                        )}
                        {pendingAction && (
                          <div className="mb-3 p-3 border rounded-lg bg-blue-50 text-blue-800 text-sm flex items-center justify-between gap-2">
                            <span>{pendingAction.summary}</span>
                            <div className="flex gap-2">
                              <Button onPress={confirmAndExecute}>Sí</Button>
                              <Button
                                variant="bordered"
                                onPress={cancelPending}
                              >
                                No
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                {/* Timeline de checkpoints */}
                {checkpoints.length > 0 && (
                  <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between">
                    <div className="text-sm text-neutral-600">
                      {checkpoints.length} checkpoints
                    </div>
                    <Button
                      variant="flat"
                      onPress={() => setCheckpointsOpen(true)}
                    >
                      Ver checkpoints
                    </Button>
                  </div>
                )}
                <AIInputBar
                  value={input}
                  onChange={(v) => setInput(v)}
                  onSend={() => onSendWithFork()}
                  onMic={handleVoiceInput}
                  isListening={isListening}
                  elapsedMs={listenElapsedMs}
                  disabled={isLoading}
                  levels={levels}
                  webSearch={webSearch}
                  onToggleWebSearch={setWebSearch}
                  analyser={audioAnalyserRef.current}
                />
                <div className="max-w-4xl mx-auto mt-3 flex gap-2">
                  <Button
                    variant="flat"
                    onPress={() => setIsPaused((v) => !v)}
                    startContent={
                      isPaused ? (
                        <PlayCircle className="h-4 w-4" />
                      ) : (
                        <PauseCircle className="h-4 w-4" />
                      )
                    }
                  >
                    {isPaused ? "Reanudar" : "Pausar"}
                  </Button>
                  <Button variant="flat" onPress={handleResendLast}>
                    Reenviar último
                  </Button>
                  <Button variant="flat" onPress={handleContinue}>
                    Continuar
                  </Button>
                </div>
              </div>
            </div>
          )}
          {modulesOpen && (
            <ModuleLauncher
              open={modulesOpen}
              onClose={() => setModulesOpen(false)}
            />
          )}
          <HeroDrawer
            open={checkpointsOpen}
            onClose={() => setCheckpointsOpen(false)}
            title="Checkpoints"
            width={520}
          >
            <div className="space-y-2">
              {checkpoints.length === 0 && (
                <p className="text-sm text-neutral-600">No hay checkpoints.</p>
              )}
              {checkpoints.map((cp, idx) => {
                const msg = messages.find((m) => m.id === cp.messageId);
                return (
                  <div
                    key={cp.messageId + idx}
                    className="border border-neutral-200 rounded-lg p-2 flex items-start gap-2"
                  >
                    <div className="flex-1">
                      <input
                        className="w-full text-sm border border-neutral-200 rounded px-2 py-1 mb-1"
                        value={cp.label || ""}
                        placeholder={
                          (msg?.content || "").slice(0, 40) || "Etiqueta"
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setCheckpoints((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, label: v } : it
                            )
                          );
                        }}
                      />
                      <div className="text-xs text-neutral-500">
                        {new Date(cp.createdAt).toLocaleString()}
                      </div>
                      {msg && (
                        <div className="text-xs text-neutral-600 mt-1 truncate">
                          {msg.content}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => scrollToMessage(cp.messageId)}
                      >
                        Saltar
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        onPress={() => restoreToCheckpoint(cp.messageId)}
                      >
                        Restaurar
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={() =>
                          setCheckpoints((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </HeroDrawer>
        </div>
      </DashboardLayout>
    </TRPCProvider>
  );
}
