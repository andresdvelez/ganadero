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
  widget?:
    | {
        type: "chart";
        title: string;
        chart:
          | {
              kind: "pie";
              data: Array<{ label: string; value: number; color?: string }>;
            }
          | {
              kind: "bar";
              data: Array<{ label: string; value: number }>;
              max?: number;
            }
          | { kind: "line"; data: Array<{ x: string; y: number }> };
      }
    | undefined;
  lowStock?: Array<{
    productId: string;
    name: string;
    code?: string | null;
    current: number;
    min: number;
  }>;
  invoiceSummary?: {
    invoiceId: string;
    productId: string;
    qty: number;
    unitCost?: number;
  };
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
  const [candidatePreviews, setCandidatePreviews] = useState<
    Record<string, { content: string }>
  >({});
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [runningTools, setRunningTools] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [period, setPeriod] = useState<{ from?: string; to?: string }>({});
  const [postMovementCreate, setPostMovementCreate] = useState<null | {
    kind: "create-invoice";
    context: { productId: string; suggestedQty?: number };
  }>(null);
  const [attachTargetInvoiceId, setAttachTargetInvoiceId] = useState<
    string | null
  >(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);

  // New TRPC hooks for AI context/memories
  const recordMessage = trpc.ai.recordMessage.useMutation();
  const utils = trpc.useUtils();
  const confirmMemories = trpc.ai.confirmMemories.useMutation();
  const summarizeSession = trpc.ai.summarizeSession.useMutation();
  const recordChoice = trpc.ai.recordChoice.useMutation();
  const createApInvoice = trpc.financeAp.createInvoice.useMutation();
  const updateProductCost = trpc.inventory.updateProductCost.useMutation();
  const alertsCountQuery = trpc.alerts.listInstances.useQuery({ status: "open", limit: 10 }, { refetchInterval: 30000 });
  const alertsEvaluate = trpc.alerts.evaluateAll.useMutation();

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

  // Utilities: chart render + download
  const downloadSvg = (node: SVGSVGElement | null, filename: string) => {
    if (!node) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(node);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadPngFromSvg = async (
    node: SVGSVGElement | null,
    filename: string
  ) => {
    if (!node) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(node);
    const img = new Image();
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = url;
    });
    const w = Number(node.getAttribute("width") || 600);
    const h = Number(node.getAttribute("height") || 300);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }, "image/png");
  };

  const downloadCsv = (rows: Array<Record<string, any>>, filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const ChartWidget: React.FC<{ message: Message }> = ({ message }) => {
    const ref = useRef<SVGSVGElement | null>(null);
    if (!message.widget || message.widget.type !== "chart") return null;
    const w = 520;
    const h = 240;
    const padding = 28;
    const { chart, title } = message.widget;
    return (
      <Card className="mt-2 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">{title}</div>
          <Button
            size="sm"
            variant="flat"
            onPress={() => downloadSvg(ref.current, title)}
          >
            Descargar SVG
          </Button>
          <Button
            size="sm"
            variant="flat"
            onPress={() => downloadPngFromSvg(ref.current, title)}
          >
            Descargar PNG
          </Button>
          {Array.isArray((message as any).dataCsv) &&
            (message as any).dataCsv.length > 0 && (
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  downloadCsv((message as any).dataCsv, `${title}`)
                }
              >
                Exportar CSV
              </Button>
            )}
        </div>
        {chart.kind === "pie" && (
          <svg ref={ref} width={w} height={h} role="img">
            <g transform={`translate(${w / 2}, ${h / 2})`}>
              {(() => {
                const total =
                  chart.data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
                let start = -Math.PI / 2;
                const radius = Math.min(w, h) / 2 - 10;
                return chart.data.map((d, i) => {
                  const angle = (Math.max(0, d.value) / total) * Math.PI * 2;
                  const end = start + angle;
                  const x1 = Math.cos(start) * radius;
                  const y1 = Math.sin(start) * radius;
                  const x2 = Math.cos(end) * radius;
                  const y2 = Math.sin(end) * radius;
                  const large = angle > Math.PI ? 1 : 0;
                  const color =
                    d.color ||
                    ["#6D28D9", "#F59E0B", "#10B981", "#EF4444", "#3B82F6"][
                      i % 5
                    ];
                  const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
                  const mid = start + angle / 2;
                  const lx = Math.cos(mid) * (radius + 14);
                  const ly = Math.sin(mid) * (radius + 14);
                  start = end;
                  return (
                    <g key={i}>
                      <path d={path} fill={color} opacity={0.9} />
                      <text
                        x={lx}
                        y={ly}
                        fontSize={11}
                        textAnchor="middle"
                        fill="#111"
                      >
                        {d.label} (
                        {Math.round((Math.max(0, d.value) / total) * 100)}%)
                      </text>
                    </g>
                  );
                });
              })()}
            </g>
          </svg>
        )}
        {chart.kind === "bar" && (
          <svg ref={ref} width={w} height={h} role="img">
            <g transform={`translate(${padding}, ${padding})`}>
              {(() => {
                const innerW = w - padding * 2;
                const innerH = h - padding * 2;
                const max =
                  chart.max || Math.max(1, ...chart.data.map((d) => d.value));
                const bw = innerW / chart.data.length;
                return (
                  <>
                    <line
                      x1={0}
                      y1={innerH}
                      x2={innerW}
                      y2={innerH}
                      stroke="#ddd"
                    />
                    {chart.data.map((d, i) => {
                      const bh = (d.value / max) * (innerH - 12);
                      const x = i * bw + 6;
                      const y = innerH - bh;
                      return (
                        <g key={i}>
                          <rect
                            x={x}
                            y={y}
                            width={bw - 12}
                            height={bh}
                            fill="#6D28D9"
                            opacity={0.9}
                            rx={4}
                          />
                          <text
                            x={x + (bw - 12) / 2}
                            y={innerH + 12}
                            fontSize={11}
                            textAnchor="middle"
                            fill="#444"
                          >
                            {d.label}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </g>
          </svg>
        )}
        {chart.kind === "line" && (
          <svg ref={ref} width={w} height={h} role="img">
            <g transform={`translate(${padding}, ${padding})`}>
              {(() => {
                const innerW = w - padding * 2;
                const innerH = h - padding * 2;
                const max = Math.max(1, ...chart.data.map((d) => d.y));
                const step = innerW / Math.max(1, chart.data.length - 1);
                const points = chart.data.map(
                  (d, i) =>
                    [i * step, innerH - (d.y / max) * (innerH - 8)] as const
                );
                const dAttr = points
                  .map((p, i) =>
                    i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`
                  )
                  .join(" ");
                return (
                  <>
                    <path
                      d={dAttr}
                      fill="none"
                      stroke="#6D28D9"
                      strokeWidth={2}
                    />
                    {points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p[0]}
                        cy={p[1]}
                        r={3}
                        fill="#6D28D9"
                      />
                    ))}
                    {chart.data.map((d, i) => (
                      <text
                        key={i}
                        x={i * step}
                        y={innerH + 12}
                        fontSize={11}
                        textAnchor="middle"
                        fill="#444"
                      >
                        {d.x}
                      </text>
                    ))}
                  </>
                );
              })()}
            </g>
          </svg>
        )}
      </Card>
    );
  };

  // Simple date range inference from natural text (es)
  const inferDateRange = (text: string): { from?: Date; to?: Date } => {
    const now = new Date();
    const lower = text.toLowerCase();
    if (/hoy\b/.test(lower)) {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from, to: now };
    }
    if (/este mes|mes actual/.test(lower)) {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: now };
    }
    const m = lower.match(/últimos?\s+(\d+)\s+d[ií]as/);
    if (m) {
      const n = Math.max(1, parseInt(m[1] || "7", 10));
      const from = new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
      return { from, to: now };
    }
    return {};
  };

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
    setMessages((prev) => [userMessage]);
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

      // Heuristic: if user asked explicitly for a chart of tasks, generate pie by status
      const chartRequested =
        /\b(graf(ica|ico|íca|íco)|chart|gráfica|gráfico)\b/i.test(
          userMessage.content
        );
      if (chartRequested && /tareas?/i.test(userMessage.content)) {
        const toolId = `tool-${Date.now()}`;
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Generando gráfica de tareas…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Preparando una gráfica de tareas por estado…",
            timestamp: new Date(),
          },
        ]);
        (async () => {
          try {
            const tasks = await utils.tasks.getAll.fetch();
            const counts: Record<string, number> = {
              open: 0,
              in_progress: 0,
              done: 0,
            };
            tasks.forEach((t: any) => {
              counts[t.status] = (counts[t.status] || 0) + 1;
            });
            const chartMsg: Message = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: "Aquí está la distribución de tareas por estado.",
              timestamp: new Date(),
              widget: {
                type: "chart",
                title: "Tareas por estado",
                chart: {
                  kind: "pie",
                  data: [
                    { label: "Abiertas", value: counts.open || 0 },
                    { label: "En progreso", value: counts.in_progress || 0 },
                    { label: "Completadas", value: counts.done || 0 },
                  ],
                },
              },
            };
            setMessages((prev) => [...prev, chartMsg]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude construir la gráfica ahora mismo.",
                timestamp: new Date(),
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
      }

      // Heuristic charts for other modules
      if (chartRequested && /salud/i.test(userMessage.content)) {
        const toolId = `tool-${Date.now()}`;
        const range =
          period.from || period.to
            ? {
                from: period.from ? new Date(period.from) : undefined,
                to: period.to ? new Date(period.to) : undefined,
              }
            : inferDateRange(userMessage.content);
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Generando gráfica de salud…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Preparando costos de salud por tipo y mes…",
            timestamp: new Date(),
          },
        ]);
        (async () => {
          try {
            const k = await utils.health.kpis.fetch({
              from: range.from?.toISOString(),
              to: range.to?.toISOString(),
            });
            // Acumular costos por tipo (último mes o rango seleccionado) y exportable
            const sumByType = new Map<string, number>();
            (k.series || []).forEach((row: any) => {
              sumByType.set(
                row.type,
                (sumByType.get(row.type) || 0) + (row.cost || 0)
              );
            });
            const data = Array.from(sumByType.entries()).map(
              ([label, value]) => ({ label, value })
            );
            const chartMsg: Message = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: "Costo de salud por tipo.",
              timestamp: new Date(),
              widget: {
                type: "chart",
                title: "Salud: costo por tipo",
                chart: { kind: "bar", data },
              },
              dataCsv: k.series,
            } as any;
            setMessages((prev) => [...prev, chartMsg]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude construir la gráfica de salud.",
                timestamp: new Date(),
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
      }

      if (chartRequested && /leche|producci[oó]n/i.test(userMessage.content)) {
        const toolId = `tool-${Date.now()}`;
        const range =
          period.from || period.to
            ? {
                from: period.from ? new Date(period.from) : undefined,
                to: period.to ? new Date(period.to) : undefined,
              }
            : inferDateRange(userMessage.content);
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Generando gráfica de leche…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Preparando una gráfica de litros por día…",
            timestamp: new Date(),
          },
        ]);
        (async () => {
          try {
            const list = await utils.milk.list.fetch({ limit: 100 });
            const filtered = list.filter((r: any) => {
              const d = new Date(r.recordedAt);
              return (
                (range.from ? d >= range.from : true) &&
                (range.to ? d <= range.to : true)
              );
            });
            const map = new Map<string, number>();
            filtered.forEach((r: any) => {
              const d = new Date(r.recordedAt);
              const key = `${d.getFullYear()}-${(d.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
              map.set(key, (map.get(key) || 0) + (r.liters || 0));
            });
            const data = Array.from(map.entries())
              .sort(([a], [b]) => (a < b ? -1 : 1))
              .map(([x, y]) => ({ x, y }));
            const chartMsg: Message = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: "Serie de producción de leche por día.",
              timestamp: new Date(),
              widget: {
                type: "chart",
                title: "Leche por día",
                chart: { kind: "line", data },
              },
            };
            setMessages((prev) => [...prev, chartMsg]);

            // KPIs: herd avg CCS and top liters (CSV)
            const k = await utils.milk.kpis.fetch({
              from: range.from?.toISOString(),
              to: range.to?.toISOString(),
              top: 10,
            });
            const herdMsg: Message = {
              id: (Date.now() + 3).toString(),
              role: "assistant",
              content: `CCS promedio del rebaño: ${Math.round(
                k.herdAvgCCS || 0
              ).toLocaleString()}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, herdMsg]);
            const topLitersCsv = (k.topLiters || []).map((t: any) => ({
              animal: `${t.animal?.name || "(sin nombre)"} #${
                t.animal?.tagNumber || t.animalId
              }`,
              liters: t.liters,
            }));
            const topMsg: Message = {
              id: (Date.now() + 4).toString(),
              role: "assistant",
              content: "Top animales por litros en el periodo.",
              timestamp: new Date(),
              widget: {
                type: "chart",
                title: "Top litros por animal",
                chart: {
                  kind: "bar",
                  data: (k.topLiters || []).map((t: any) => ({
                    label: t.animal?.tagNumber || t.animalId,
                    value: t.liters,
                  })),
                },
              },
              dataCsv: topLitersCsv,
            } as any;
            setMessages((prev) => [...prev, topMsg]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude construir la gráfica de leche.",
                timestamp: new Date(),
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
      }

      if (chartRequested && /inventario/i.test(userMessage.content)) {
        const toolId = `tool-${Date.now()}`;
        const range =
          period.from || period.to
            ? {
                from: period.from ? new Date(period.from) : undefined,
                to: period.to ? new Date(period.to) : undefined,
              }
            : inferDateRange(userMessage.content);
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Generando gráfica de inventario…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Preparando movimientos de stock por tipo…",
            timestamp: new Date(),
          },
        ]);
        (async () => {
          try {
            const moves = await utils.inventory.listMovements.fetch({
              limit: 100,
            });
            const filtered = moves.filter((r: any) => {
              const d = new Date(r.occurredAt);
              return (
                (range.from ? d >= range.from : true) &&
                (range.to ? d <= range.to : true)
              );
            });
            const counts: Record<string, number> = { in: 0, out: 0, adjust: 0 };
            filtered.forEach(
              (m: any) => (counts[m.type] = (counts[m.type] || 0) + 1)
            );
            const chartMsg: Message = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: "Movimientos de stock por tipo.",
              timestamp: new Date(),
              widget: {
                type: "chart",
                title: "Inventario: movimientos",
                chart: {
                  kind: "bar",
                  data: [
                    { label: "Entradas", value: counts.in || 0 },
                    { label: "Salidas", value: counts.out || 0 },
                    { label: "Ajustes", value: counts.adjust || 0 },
                  ],
                },
              },
            };
            setMessages((prev) => [...prev, chartMsg]);

            // Low stock dashboard
            const k = await utils.inventory.kpis.fetch({
              from: range.from?.toISOString(),
              to: range.to?.toISOString(),
              topLow: 10,
            });
            const lowArr = (k.lowStock || []).map((r: any) => ({
              productId: r.product.id,
              name: r.product.name,
              code: r.product.code,
              current: r.current,
              min: r.min,
            }));
            const lowMsg: Message = {
              id: (Date.now() + 3).toString(),
              role: "assistant",
              content: lowArr.length
                ? "Productos con stock bajo:"
                : "No hay productos con stock bajo.",
              timestamp: new Date(),
              lowStock: lowArr,
            };
            setMessages((prev) => [...prev, lowMsg]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude construir la gráfica de inventario.",
                timestamp: new Date(),
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
      }

      if (
        chartRequested &&
        /finanzas?|ingresos|egresos/i.test(userMessage.content)
      ) {
        const toolId = `tool-${Date.now()}`;
        const range =
          period.from || period.to
            ? {
                from: period.from ? new Date(period.from) : undefined,
                to: period.to ? new Date(period.to) : undefined,
              }
            : inferDateRange(userMessage.content);
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Generando gráfica de finanzas…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Preparando resumen de ingresos vs egresos…",
            timestamp: new Date(),
          },
        ]);
        (async () => {
          try {
            const k = await utils.finance.kpis.fetch({
              from: range.from?.toISOString(),
              to: range.to?.toISOString(),
            });
            const pieMsg: Message = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: "Totales de ingresos vs egresos en el periodo.",
              timestamp: new Date(),
              widget: {
                type: "chart",
                title: "Finanzas: Ingresos vs Egresos",
                chart: {
                  kind: "pie",
                  data: [
                    { label: "Ingresos", value: k.income },
                    { label: "Egresos", value: k.expense },
                  ],
                },
              },
            };
            setMessages((prev) => [...prev, pieMsg]);
            const barMsg: Message = {
              id: (Date.now() + 3).toString(),
              role: "assistant",
              content: "Margen por categoría.",
              timestamp: new Date(),
              widget: {
                type: "chart",
                title: "Finanzas: Margen por categoría",
                chart: {
                  kind: "bar",
                  data: (k.byCategory || []).map((c: any) => ({
                    label: c.label,
                    value: c.margin,
                  })),
                },
              },
            };
            setMessages((prev) => [...prev, barMsg]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude construir la gráfica de finanzas.",
                timestamp: new Date(),
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
      }

      if (
        chartRequested &&
        /reproducci[oó]n|pren[eé]z|iep/i.test(userMessage.content)
      ) {
        const toolId = `tool-${Date.now()}`;
        const range =
          period.from || period.to
            ? {
                from: period.from ? new Date(period.from) : undefined,
                to: period.to ? new Date(period.to) : undefined,
              }
            : inferDateRange(userMessage.content);
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Generando KPIs de reproducción…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content:
              "Preparando tasa de concepción por mes e IEP por categoría…",
            timestamp: new Date(),
          },
        ]);
        (async () => {
          try {
            const k = await utils.breedingAdv.kpis.fetch({
              from: range.from?.toISOString(),
              to: range.to?.toISOString(),
            });
            const lineMsg: Message = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: "Concepciones confirmadas por mes.",
              timestamp: new Date(),
              widget: {
                type: "chart",
                title: "Reproducción: concepciones/mes",
                chart: {
                  kind: "line",
                  data: (k.trend || []).map((t: any) => ({
                    x: t.period,
                    y: t.value,
                  })),
                },
              },
              dataCsv: k.trend,
            } as any;
            const barMsg: Message = {
              id: (Date.now() + 3).toString(),
              role: "assistant",
              content: "IEP promedio por categoría.",
              timestamp: new Date(),
              widget: {
                type: "chart",
                title: "Reproducción: IEP por categoría",
                chart: {
                  kind: "bar",
                  data: (k.iepByCategory || []).map((c: any) => ({
                    label: c.label,
                    value: c.avgIEP,
                  })),
                },
              },
              dataCsv: k.iepByCategory,
            } as any;
            setMessages((prev) => [...prev, lineMsg, barMsg]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude construir las gráficas de reproducción.",
                timestamp: new Date(),
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
      }

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
              ? "Gracias por tu mensaje. Utilizando el módulo de Finanzas para registrar una transacción."
              : "Gracias por tu mensaje. Abriendo el módulo de Finanzas.",
          timestamp: new Date(),
          module: intent.module,
          action: intent.action,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        // Navegar directo al módulo (si existe página), sin abrir launcher
        try {
          router.push("/finance");
        } catch {}
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
          router.push("/pastures/new");
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
      if (intent?.module === "tasks") {
        if (intent?.action === "list") {
          const toolId = `tool-${Date.now()}`;
          setRunningTools((prev) => [
            ...prev,
            { id: toolId, label: "Consultando tareas…" },
          ]);
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content:
                "Voy a listar todas las tareas registradas en el sistema…",
              timestamp: new Date(),
              module: "tasks",
              action: "list",
            },
          ]);
          (async () => {
            try {
              const list = await utils.tasks.getAll.fetch();
              const items = list
                .map(
                  (t: any) =>
                    `- ${t.title} [${t.status}]${
                      t.dueDate
                        ? ` (vence ${new Date(t.dueDate).toLocaleDateString()})`
                        : ""
                    }`
                )
                .join("\n");
              const content =
                items.length > 0
                  ? `Estas son tus tareas:\n${items}`
                  : "No encontré tareas. Puedes crearlas desde el módulo de tareas.";
              setMessages((prev) => [
                ...prev,
                {
                  id: (Date.now() + 2).toString(),
                  role: "assistant",
                  content,
                  timestamp: new Date(),
                  module: "tasks",
                  action: "list",
                },
              ]);
            } catch {
              setMessages((prev) => [
                ...prev,
                {
                  id: (Date.now() + 2).toString(),
                  role: "assistant",
                  content: "No pude consultar tareas ahora mismo.",
                  timestamp: new Date(),
                  module: "tasks",
                  action: "list",
                },
              ]);
            } finally {
              setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
            }
          })();
          setIsLoading(false);
          return;
        }
      }
      if (intent?.module === "health" && intent?.action === "list") {
        const toolId = `tool-${Date.now()}`;
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Consultando salud…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Voy a listar los últimos eventos de salud…",
            timestamp: new Date(),
            module: "health",
            action: "list",
          },
        ]);
        (async () => {
          try {
            const list = await utils.health.list.fetch({ limit: 50 });
            const items = list
              .map(
                (r: any) =>
                  `- ${r.type || "Evento"} (${new Date(
                    r.performedAt
                  ).toLocaleDateString()})`
              )
              .join("\n");
            const content =
              items.length > 0
                ? `Eventos de salud recientes:\n${items}`
                : "No encontré eventos de salud.";
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content,
                timestamp: new Date(),
                module: "health",
                action: "list",
              },
            ]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude consultar salud ahora mismo.",
                timestamp: new Date(),
                module: "health",
                action: "list",
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
        setIsLoading(false);
        return;
      }
      if (intent?.module === "milk" && intent?.action === "list") {
        const toolId = `tool-${Date.now()}`;
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Consultando leche…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Voy a listar los últimos registros de leche…",
            timestamp: new Date(),
            module: "milk",
            action: "list",
          },
        ]);
        (async () => {
          try {
            const list = await utils.milk.list.fetch({ limit: 50 });
            const items = list
              .map(
                (r: any) =>
                  `- ${r.session}: ${r.liters} L (${new Date(
                    r.recordedAt
                  ).toLocaleDateString()})`
              )
              .join("\n");
            const content =
              items.length > 0
                ? `Registros de leche recientes:\n${items}`
                : "No encontré registros de leche.";
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content,
                timestamp: new Date(),
                module: "milk",
                action: "list",
              },
            ]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude consultar leche ahora mismo.",
                timestamp: new Date(),
                module: "milk",
                action: "list",
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
        setIsLoading(false);
        return;
      }
      if (intent?.module === "inventory" && intent?.action === "list") {
        const toolId = `tool-${Date.now()}`;
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Consultando inventario…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Voy a listar los productos más recientes…",
            timestamp: new Date(),
            module: "inventory",
            action: "list",
          },
        ]);
        (async () => {
          try {
            const list = await utils.inventory.listProducts.fetch({
              limit: 50,
            });
            const items = list
              .map(
                (p: any) =>
                  `- ${p.name}${p.code ? ` [${p.code}]` : ""}${
                    p.minStock ? ` (mín ${p.minStock})` : ""
                  }`
              )
              .join("\n");
            const content =
              items.length > 0
                ? `Productos recientes:\n${items}`
                : "No encontré productos de inventario.";
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content,
                timestamp: new Date(),
                module: "inventory",
                action: "list",
              },
            ]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude consultar inventario ahora mismo.",
                timestamp: new Date(),
                module: "inventory",
                action: "list",
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
        setIsLoading(false);
        return;
      }
      if (intent?.module === "finance" && intent?.action === "list") {
        const toolId = `tool-${Date.now()}`;
        setRunningTools((prev) => [
          ...prev,
          { id: toolId, label: "Consultando finanzas…" },
        ]);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Voy a listar los últimos movimientos de finanzas…",
            timestamp: new Date(),
            module: "finance",
            action: "list",
          },
        ]);
        (async () => {
          try {
            const list = await utils.finance.getAll.fetch();
            const items = list
              .slice(0, 50)
              .map(
                (t: any) =>
                  `- ${t.type === "income" ? "+" : "-"}$${(
                    t.amount || 0
                  ).toLocaleString()}${
                    t.category ? ` (${t.category})` : ""
                  } ${new Date(t.date).toLocaleDateString()}`
              )
              .join("\n");
            const content =
              items.length > 0
                ? `Movimientos recientes:\n${items}`
                : "No encontré movimientos de finanzas.";
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content,
                timestamp: new Date(),
                module: "finance",
                action: "list",
              },
            ]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "No pude consultar finanzas ahora mismo.",
                timestamp: new Date(),
                module: "finance",
                action: "list",
              },
            ]);
          } finally {
            setRunningTools((prev) => prev.filter((t) => t.id !== toolId));
          }
        })();
        setIsLoading(false);
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
        router.push("/pastures/new");
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

  useEffect(() => {
    (async () => {
      if (!pendingCandidates) return;
      setIsGeneratingPreviews(true);
      const previews: Record<string, { content: string }> = {};
      try {
        // limitar a 2 mejores candidatos
        const top = pendingCandidates.modules.slice(0, 2);
        for (const c of top) {
          try {
            const res = await aiClient.processQuery(
              pendingCandidates.originalText,
              {
                currentModule: c.id,
                recentMessages: messages.slice(-3),
              }
            );
            previews[c.id] = { content: String(res.content || "") };
          } catch {
            previews[c.id] = { content: "(Sin vista previa disponible)" };
          }
        }
      } finally {
        setCandidatePreviews(previews);
        setIsGeneratingPreviews(false);
      }
    })();
  }, [pendingCandidates]);

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
          <div className="p-2 border-b border-neutral-200 flex items-center justify-between gap-3">
            <div className="text-sm text-neutral-600">Periodo seleccionado: {period.from || "(desde)"} → {period.to || "(hasta)"}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="flat" onPress={() => alertsEvaluate.mutate()}>Evaluar alertas</Button>
              <div className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Alertas abiertas: {alertsCountQuery.data?.length ?? 0}</div>
            </div>
          </div>
          {/* hidden input for invoice attachment */}
          <input
            aria-label="Adjuntar factura"
            ref={attachInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f || !attachTargetInvoiceId) return;
              try {
                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    const base64 = (reader.result as string) || "";
                    await addToSyncQueue(
                      "create",
                      "invoice_attachment",
                      generateUUID(),
                      {
                        invoiceId: attachTargetInvoiceId,
                        fileName: f.name,
                        mimeType: f.type,
                        dataUrl: base64,
                        createdAt: new Date().toISOString(),
                      },
                      "dev-user"
                    );
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: (Date.now() + 5).toString(),
                        role: "assistant",
                        content: "Adjunto en cola de sincronización.",
                        timestamp: new Date(),
                      },
                    ]);
                  } catch {}
                };
                reader.readAsDataURL(f);
              } finally {
                setAttachTargetInvoiceId(null);
                if (attachInputRef.current) attachInputRef.current.value = "";
              }
            }}
          />
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
                        defaults={drawerTool?.props?.defaults || undefined}
                        onCompleted={async (payload) => {
                          setDrawerTool(null);
                          // If requested, create a draft purchase invoice after movement
                          (async () => {
                            try {
                              if (
                                postMovementCreate?.kind === "create-invoice"
                              ) {
                                const supplierId =
                                  payload?.supplierId ||
                                  drawerTool?.props?.defaults?.supplierId ||
                                  undefined;
                                if (supplierId) {
                                  const qty =
                                    payload?.quantity ||
                                    drawerTool?.props?.defaults?.quantity ||
                                    postMovementCreate.context.suggestedQty ||
                                    1;
                                  const unitCost =
                                    payload?.unitCost ||
                                    drawerTool?.props?.defaults?.unitCost ||
                                    0;
                                  const created =
                                    await createApInvoice.mutateAsync({
                                      supplierId,
                                      date: new Date().toISOString(),
                                      items: [
                                        {
                                          productId:
                                            postMovementCreate.context
                                              .productId,
                                          quantity: qty,
                                          unitCost,
                                        },
                                      ],
                                    } as any);
                                  // Update product standard cost if provided
                                  if (unitCost && utils) {
                                    try {
                                      await updateProductCost.mutateAsync({
                                        productId:
                                          postMovementCreate.context.productId,
                                        cost: unitCost,
                                      } as any);
                                    } catch {}
                                  }
                                  setMessages((prev) => [
                                    ...prev,
                                    {
                                      id: (Date.now() + 4).toString(),
                                      role: "assistant",
                                      content:
                                        "Factura de compra (borrador) creada a partir del reorden.",
                                      timestamp: new Date(),
                                      invoiceSummary: {
                                        invoiceId: (created as any)?.id || "",
                                        productId:
                                          postMovementCreate.context.productId,
                                        qty: Number(qty) || 0,
                                        unitCost: unitCost || undefined,
                                      },
                                    },
                                  ]);
                                } else {
                                  setMessages((prev) => [
                                    ...prev,
                                    {
                                      id: (Date.now() + 4).toString(),
                                      role: "assistant",
                                      content:
                                        "Movimiento registrado. Para crear la factura, selecciona un proveedor en el formulario.",
                                      timestamp: new Date(),
                                    },
                                  ]);
                                }
                              }
                            } catch {}
                            setPostMovementCreate(null);
                          })();
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
                            {Array.isArray(message.lowStock) &&
                              message.lowStock.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {message.lowStock.map((it) => (
                                    <div
                                      key={it.productId}
                                      className="flex items-center justify-between gap-3 text-sm"
                                    >
                                      <div>
                                        {it.name}
                                        {it.code ? ` [${it.code}]` : ""} —{" "}
                                        {it.current} (mín {it.min})
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="flat"
                                        onPress={() => {
                                          const qty = Math.max(
                                            0,
                                            it.min - it.current
                                          );
                                          setDrawerTool({
                                            type: "inventory.movement",
                                            props: {
                                              defaults: {
                                                productId: it.productId,
                                                type: "in",
                                                quantity:
                                                  qty > 0 ? qty : undefined,
                                                occurredAt: new Date()
                                                  .toISOString()
                                                  .slice(0, 10),
                                              },
                                            },
                                          });
                                        }}
                                      >
                                        Reordenar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="solid"
                                        onPress={() => {
                                          const qty = Math.max(
                                            0,
                                            it.min - it.current
                                          );
                                          setDrawerTool({
                                            type: "inventory.movement",
                                            props: {
                                              defaults: {
                                                productId: it.productId,
                                                type: "in",
                                                quantity:
                                                  qty > 0 ? qty : undefined,
                                                occurredAt: new Date()
                                                  .toISOString()
                                                  .slice(0, 10),
                                              },
                                            },
                                          });
                                          setPostMovementCreate({
                                            kind: "create-invoice",
                                            context: {
                                              productId: it.productId,
                                              suggestedQty:
                                                qty > 0 ? qty : undefined,
                                            },
                                          });
                                        }}
                                      >
                                        Reordenar + Factura
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            {message.invoiceSummary && (
                              <div className="mt-3 space-y-2 text-sm">
                                <div>
                                  Factura creada (borrador). Cantidad:{" "}
                                  {message.invoiceSummary.qty}
                                  {message.invoiceSummary.unitCost
                                    ? ` @ $${message.invoiceSummary.unitCost}`
                                    : ""}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="flat"
                                    onPress={() => router.push("/finance")}
                                  >
                                    Ver finanzas
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="flat"
                                    onPress={() => router.push("/inventory")}
                                  >
                                    Ver inventario
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="solid"
                                    onPress={() => {
                                      setAttachTargetInvoiceId(
                                        message.invoiceSummary!.invoiceId
                                      );
                                      attachInputRef.current?.click();
                                    }}
                                  >
                                    Adjuntar PDF/Imagen
                                  </Button>
                                </div>
                              </div>
                            )}
                            {message.widget?.type === "chart" && (
                              <ChartWidget message={message} />
                            )}
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
                      <div className="mx-auto max-w-5xl mt-2">
                        <div className="rounded-2xl bg-white border border-neutral-200 p-3 shadow-sm">
                          <div className="text-sm text-neutral-700 mb-3">
                            ¿Te refieres a alguno de estos módulos? Compara y
                            elige:
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {pendingCandidates.modules.slice(0, 2).map((c) => (
                              <div
                                key={c.id}
                                className="rounded-xl border border-neutral-200 p-3 bg-neutral-50"
                              >
                                <div className="text-sm font-medium mb-2">
                                  Respuesta usando {c.id}
                                </div>
                                <div className="text-sm text-neutral-700 whitespace-pre-wrap min-h-[64px]">
                                  {isGeneratingPreviews
                                    ? "Generando vista previa…"
                                    : candidatePreviews[c.id]?.content ||
                                      "(Sin vista previa)"}
                                </div>
                                <div className="mt-3 flex justify-end">
                                  <Button
                                    size="sm"
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
                                        keywords: JSON.stringify(
                                          choice.keywords
                                        ),
                                        tone: choice.tone || null,
                                        candidates: JSON.stringify(
                                          choice.candidates
                                        ),
                                        synced: false,
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                      });
                                      await addToSyncQueue(
                                        "create",
                                        "ai_choice",
                                        `${
                                          chatUuid || ""
                                        }-choice-${Date.now()}`,
                                        choice,
                                        "dev-user"
                                      );
                                      try {
                                        await recordChoice.mutateAsync(choice);
                                      } catch {}
                                      setPendingCandidates(null);
                                      setMessages((prev) => [
                                        ...prev,
                                        {
                                          id: (Date.now() + 1).toString(),
                                          role: "assistant",
                                          content: `Gracias por tu respuesta. Utilizando el módulo de ${c.id}.`,
                                          timestamp: new Date(),
                                          module: c.id,
                                        },
                                      ]);
                                      // Ruteo/ejecución directa similar al flujo de los chips
                                      const forced =
                                        await routeIntent.mutateAsync({
                                          query: `${pendingCandidates.originalText} [module:${c.id}]`,
                                        });
                                      if (c.id === "pastures") {
                                        const doList =
                                          !forced?.action ||
                                          forced.action === "list";
                                        if (doList) {
                                          const list =
                                            await utils.pasture.getAll.fetch();
                                          const items = list
                                            .map(
                                              (p) =>
                                                `- ${p.name}${
                                                  p.areaHa
                                                    ? ` (${p.areaHa} ha)`
                                                    : ""
                                                }`
                                            )
                                            .join("\n");
                                          const content =
                                            items.length > 0
                                              ? `Estas son tus pasturas registradas:\n${items}`
                                              : "No encontré pasturas registradas.";
                                          setMessages((prev) => [
                                            ...prev,
                                            {
                                              id: (Date.now() + 2).toString(),
                                              role: "assistant",
                                              content,
                                              timestamp: new Date(),
                                              module: "pastures",
                                              action: "list",
                                            },
                                          ]);
                                          return;
                                        } else if (
                                          forced?.action === "create"
                                        ) {
                                          router.push("/pastures/new");
                                          return;
                                        }
                                      }
                                      if (
                                        c.id === "animals" &&
                                        (forced?.action === "create" ||
                                          !forced?.action)
                                      ) {
                                        setInlineTool({
                                          type: "animals.create",
                                        });
                                        return;
                                      }
                                      if (
                                        c.id === "health" &&
                                        (forced?.action === "create" ||
                                          !forced?.action)
                                      ) {
                                        setInlineTool({
                                          type: "health.create",
                                        });
                                        return;
                                      }
                                      if (
                                        c.id === "milk" &&
                                        (forced?.action === "create" ||
                                          !forced?.action)
                                      ) {
                                        setInlineTool({ type: "milk.create" });
                                        return;
                                      }
                                      if (c.id === "inventory") {
                                        if (forced?.action === "movement") {
                                          setDrawerTool({
                                            type: "inventory.movement",
                                          });
                                          return;
                                        }
                                        setDrawerTool({
                                          type: "inventory.create",
                                        });
                                        return;
                                      }
                                      if (c.id === "finance") {
                                        try {
                                          router.push("/finance");
                                        } catch {}
                                        return;
                                      }
                                    }}
                                  >
                                    Elegir esta
                                  </Button>
                                </div>
                              </div>
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
