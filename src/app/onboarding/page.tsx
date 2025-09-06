"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bindDeviceLocally, provisionFromClerk } from "@/lib/auth/offline-auth";
import { addToast } from "@/components/ui/toast";
import { robustDeviceId } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Edit3,
  X,
  Image as ImageIcon,
  Bot,
  Volume2,
  VolumeX,
  CheckCircle2,
  Laptop,
  Download,
} from "lucide-react";
import { AIInputBar } from "@/components/ai/ai-input-bar";
import { useDropzone } from "react-dropzone";

type WizardStep = "org" | "farm" | "confirm";

function slugify(input: string): string {
  const accentMap: Record<string, string> = {
    á: "a",
    é: "e",
    í: "i",
    ó: "o",
    ú: "u",
    ñ: "n",
    ü: "u",
  };
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[áéíóúñü]/g, (m) => accentMap[m] || m)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const utils = trpc.useUtils();

  // Estado local (borradores) — no se crea nada hasta confirmar
  const [current, setCurrent] = useState<WizardStep>("org");
  const [orgDraft, setOrgDraft] = useState<{ name: string }>({ name: "" });
  const [farmDraft, setFarmDraft] = useState<{ name: string; code: string }>({
    name: "",
    code: "",
  });
  const [deviceLinked, setDeviceLinked] = useState(false);
  const [passA, setPassA] = useState("");
  const [passB, setPassB] = useState("");
  const [created, setCreated] = useState<null | {
    orgId: string;
    orgName: string;
    farmId: string;
    farmName: string;
    farmCode: string;
  }>(null);

  // Autorellenar código de finca a partir del nombre (prefijo fn-)
  useEffect(() => {
    if (!farmDraft.name) return;
    const base = slugify(farmDraft.name);
    // Solo autocompletar si el usuario no lo ha modificado manualmente
    setFarmDraft((prev) => {
      const userModified = prev.code && !prev.code.startsWith("fn-");
      return userModified ? prev : { ...prev, code: base ? `fn-${base}` : "" };
    });
  }, [farmDraft.name]);

  // Para usuarios que ya tienen organización, los mostramos pero mantenemos el wizard
  const { data: myOrgs } = trpc.org.myOrganizations.useQuery(undefined, {
    enabled: !!isLoaded,
  });
  const alreadyHasOrg = (myOrgs?.length || 0) > 0;

  // Mutaciones finales (se disparan solo en confirmar)
  const createOrg = trpc.org.createOrganization.useMutation();
  const createFarm = trpc.farm.create.useMutation();
  const registerDevice = trpc.device.register.useMutation();
  const setPassStatus = trpc.device.setPasscodeStatus.useMutation();

  const deviceId = useMemo(() => robustDeviceId(), []);
  // Chat state
  type ChatMsg = {
    id: string;
    role: "ai" | "user";
    text?: string;
    kind?: "logo-drop" | "summary";
    summary?: { org: string; farm: string; code: string };
  };
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState("");
  const [locked, setLocked] = useState(false); // lock after summary
  const [pendingEdit, setPendingEdit] = useState<
    null | "org" | "farmName" | "farmCode"
  >(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(
    () => endRef.current?.scrollIntoView({ behavior: "smooth" }),
    [messages]
  );
  const [isTyping, setIsTyping] = useState(false);
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  const [os, setOs] = useState<"mac" | "windows" | "other">("other");
  useEffect(() => {
    try {
      setIsDesktopApp(
        typeof window !== "undefined" && !!(window as any).__TAURI__
      );
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      if (/Mac OS X|Macintosh/i.test(ua)) setOs("mac");
      else if (/Windows NT|Win64|WOW64/i.test(ua)) setOs("windows");
      else setOs("other");
    } catch {}
  }, []);

  // Voz: síntesis y reconocimiento
  const [voiceOn, setVoiceOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [listenStartedAt, setListenStartedAt] = useState<number | null>(null);
  const [listenElapsedMs, setListenElapsedMs] = useState<number>(0);
  // Persistir preferencia del narrador
  useEffect(() => {
    try {
      const v =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ONBOARDING_VOICE_ON")
          : null;
      if (v !== null) setVoiceOn(v === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (typeof window !== "undefined")
        window.localStorage.setItem("ONBOARDING_VOICE_ON", voiceOn ? "1" : "0");
    } catch {}
  }, [voiceOn]);
  const speak = (text: string) => {
    if (!voiceOn) return;
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window))
        return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-CO";
      u.rate = 1;
      u.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };
  const startListening = () => {
    if (typeof window === "undefined") return;
    const SR: any =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (!SR) {
      addToast({
        variant: "warning",
        title: "Voz no soportada en este navegador",
      });
      return;
    }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "es-CO";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript || "";
      if (t) setInputText((prev) => (prev ? prev + " " + t : t));
    };
    rec.onend = () => {
      setIsListening(false);
      setListenStartedAt(null);
      if (audioStreamRef.current) {
        try {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
        audioStreamRef.current = null;
      }
    };
    // Setup analyser for waveform under user gesture
    const setupAnalyser = async () => {
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
    };
    rec.onstart = () => {
      setIsListening(true);
      setListenStartedAt(Date.now());
      setListenElapsedMs(0);
      setupAnalyser();
    };
    rec.start();
  };
  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    setIsListening(false);
    setListenStartedAt(null);
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      audioStreamRef.current = null;
    }
  };

  // Logo de la organización (temporal en cliente)
  const [orgLogo, setOrgLogo] = useState<{
    dataUrl: string;
    fileName?: string;
  } | null>(null);
  const [awaitingLogoFor, setAwaitingLogoFor] = useState<null | "org" | "farm">(
    null
  );

  function proceedToFarm() {
    const msg2 = "¡Perfecto! Ahora dime el nombre de tu primera finca.";
    setMessages((p) => [
      ...p,
      { id: `${Date.now()}-ai2`, role: "ai", text: msg2 },
    ]);
    speak(msg2);
    setCurrent("farm");
    setAwaitingLogoFor(null);
  }

  // Intenciones de omitir/continuar sin subir logo
  function isSkipLogoIntent(t: string): boolean {
    return /\b(omitir|omito|salt(ar|o)|continu(ar|o)|seguir|despues|después|mas tarde|más tarde|luego|no quiero subir|sin logo|subir(\s+)?despues|otro momento|después)\b/.test(
      t
    );
  }

  // Pequeñas charlas y saludos
  function isGreetingOrSmalltalk(text: string): boolean {
    const t = text.toLowerCase().trim();
    return /(hola|buenas|buenos dias|buenas tardes|buenas noches|qué tal|que tal|hey|ola|gracias|ok|vale|listo|perfecto)/.test(
      t
    );
  }

  function persuasiveAsk(
    kind: "organización" | "finca" | "código",
    example: string
  ) {
    const article = kind === "código" ? "el" : "la";
    const variants = [
      `¡Gracias por tu mensaje! Para avanzar necesito ${article} ${kind}. Por favor escribe solo ${article} ${kind}. Ej.: ${example}.`,
      `Entiendo, y para seguir configurando todo, requiero ${article} ${kind}. Escribe únicamente ${article} ${kind}. Ej.: ${example}.`,
      `Sigamos paso a paso: compárteme ${article} ${kind}. Solo ${article} ${kind}, por favor. Ej.: ${example}.`,
    ];
    const msg = variants[Math.floor(Math.random() * variants.length)];
    setMessages((p) => [
      ...p,
      { id: `${Date.now()}-pers-${kind}` as any, role: "ai", text: msg },
    ]);
    speak(msg);
  }

  // Parseo robusto de órdenes de edición: "cambiar/editar/modificar ... por X" (tolera typos comunes)
  function parseEditCommand(
    raw: string
  ): null | { field: "org" | "farmName" | "farmCode"; value: string } {
    // Eliminar tildes sin usar propiedades Unicode (compatibilidad amplia)
    const t = raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const wantsEdit =
      /(cambiar|cambir|editar|edite|edites|modificar|modifiques|modifique|actualizar|actualices|actualice|cambies)\b/.test(
        t
      );
    if (!wantsEdit) return null;

    let field: null | "org" | "farmName" | "farmCode" = null;
    if (/(organizacion|organizacion|org|empresa)\b/.test(t)) field = "org";
    if (/(finca|nombre\s+de\s+la\s+finca)\b/.test(t))
      field = field || "farmName";
    if (/(codigo|c[oó]digo|code)\b/.test(t)) field = "farmCode";
    if (!field) return null;

    // extraer valor después de "por" o "a" o comillas
    const m =
      raw.match(/\bpor\s+"?([^\"\n]+)\"?$/i) ||
      raw.match(/\ba\s+"?([^\"\n]+)\"?$/i);
    let value = m ? m[1].trim() : "";
    if (!value) {
      // fallback: última frase después del campo
      const idx = t.indexOf("por ");
      if (idx >= 0) value = raw.slice(idx + 4).trim();
    }
    value = value.replace(/^el\s+|^la\s+/i, "").trim();
    if (!value) return { field, value: "" };
    return { field, value };
  }

  // Heurísticas para diferenciar respuesta vs. aclaración/pregunta
  function isClarificationOrQuestion(text: string): boolean {
    const t = text.toLowerCase().trim();
    if (!t) return true;
    if (/https?:\/\//i.test(t) || /@/.test(t)) return true; // enlaces/correos → no es un nombre
    if (t.includes("?") || t.includes("¿")) return true;
    // Interrogativos en cualquier posición (con o sin tilde) y motivos
    if (
      /(por que|por qué|porque|para que|para qué|que|qué|como|cómo|donde|dónde|cuando|cuándo|cual|cuál|quien|quién)\b/.test(
        t
      )
    )
      return true;
    // Peticiones de explicación/ayuda en diversas formas
    if (
      /((me\s+)?puedes?\s+explicar|explicame|explícame|no\s+entiendo|ayuda|necesito\s+saber|me\s+puedes?\s+decir|por\s+favor\s+explica|razon|razón|motivo)/.test(
        t
      )
    )
      return true;
    if (/^(si|sí|no|ok|vale|listo|dale|bien)$/i.test(t)) return true;
    return false;
  }

  // Sanitización y validación de nombres para evitar entradas problemáticas
  function sanitizeName(input: string): string {
    const normalized = (input || "").normalize("NFC");
    const removedBad = normalized.replace(
      /[^A-Za-z0-9 \u00C0-\u017F\.\-&'_]/g,
      ""
    );
    return removedBad.replace(/\s+/g, " ").trim();
  }

  function validateNameLike(
    raw: string,
    opts: { minLen: number; kindLabel: string }
  ): { ok: boolean; cleaned: string; reason?: string } {
    const cleaned = sanitizeName(raw);
    if (!/[A-Za-z\u00C0-\u017F]/.test(cleaned)) {
      return {
        ok: false,
        cleaned,
        reason: `Escribe solo el nombre (${opts.kindLabel}) con letras. Ej.: "Ganadería La Esperanza"`,
      };
    }
    if (/https?:\/\//i.test(raw) || /@/.test(raw)) {
      return {
        ok: false,
        cleaned,
        reason: "No incluyas enlaces ni correos. Escribe solo el nombre.",
      };
    }
    if (cleaned.replace(/\s+/g, "").length < opts.minLen) {
      return {
        ok: false,
        cleaned,
        reason: `El nombre (${opts.kindLabel}) debe tener al menos ${opts.minLen} caracteres.`,
      };
    }
    if (cleaned.length > 120) {
      return {
        ok: false,
        cleaned,
        reason: "El nombre es muy largo. Usa máximo 120 caracteres.",
      };
    }
    return { ok: true, cleaned };
  }

  function respondToClarification(step: WizardStep) {
    if (step === "org") {
      const variants = [
        "Usamos el nombre para crear tu espacio de trabajo y vincular permisos, fincas y facturación a tu organización.",
        "El nombre identifica tu empresa en Ganado.co y evita mezclar datos con otras organizaciones.",
        "Con el nombre configuramos acceso offline y servicios como alertas, reportes y sincronización.",
      ];
      const hint =
        "Por favor, escribe solo el nombre. Ej.: 'Ganadería La Esperanza'.";
      const msg = `${
        variants[Math.floor(Math.random() * variants.length)]
      } ${hint}`;
      setMessages((p) => [
        ...p,
        { id: `${Date.now()}-clar-org`, role: "ai", text: msg },
      ]);
      speak(msg);
      return;
    }
    if (step === "farm") {
      const msg =
        "Para completar tu espacio necesitamos al menos una finca. Escribe el nombre, por ejemplo: 'La Primavera'.";
      setMessages((p) => [
        ...p,
        { id: `${Date.now()}-clar-farm`, role: "ai", text: msg },
      ]);
      speak(msg);
      return;
    }
    const msg =
      "Estamos en la etapa de confirmación. Puedes confirmar o decirme qué deseas editar (organización, nombre o código de la finca).";
    setMessages((p) => [
      ...p,
      { id: `${Date.now()}-clar-conf`, role: "ai", text: msg },
    ]);
    speak(msg);
  }

  // Heurística simple para detectar frases fuera de tema (no parecen nombre propio)
  function isLikelyOffTopicSentence(input: string): boolean {
    const t = (input || "").toLowerCase();
    // Palabras de tiempo o contexto narrativo
    if (
      /(ayer|hoy|mañana|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|semana|mes|año)/.test(
        t
      )
    )
      return true;
    // Verbos comunes en pasado/presente que sugieren relato de acciones
    if (
      /(compr[ée]|compre|compraba|lleg[oó]|llego|llegaba|fui|estaba|hice|tenia|tenía|queria|quería|necesit[oó]|necesito|pedi|pedí|pedi[aá]|pediamos)/.test(
        t
      )
    )
      return true;
    // Demasiadas palabras para un nombre
    const words = t.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 9) return true;
    // Tiene puntuación de frase
    if (/[\.!?;,]/.test(t)) return true;
    return false;
  }

  // Acciones estilo ChatGPT
  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ variant: "success", title: "Mensaje copiado" });
    } catch {
      addToast({ variant: "warning", title: "No se pudo copiar" });
    }
  };

  const handleEditMessage = (id: string) => {
    const msg = messages.find((m) => m.id === id && m.role === "user");
    if (!msg) return;
    setInputText(msg.text || "");
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setLocked(false);
  };

  const handleSend = () => {
    setIsTyping(true);
    try {
      const text = inputText.trim();
      if (!text) return;
      // Si estamos esperando el logo, interpretar intención de omitir/continuar
      if (awaitingLogoFor) {
        const lower = text.toLowerCase();
        const wantsSkip = isSkipLogoIntent(lower);
        const parsedWhileAwaiting = parseEditCommand(text);
        if (wantsSkip) {
          // Continuar sin logo
          setInputText("");
          setAwaitingLogoFor(null);
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-u`, role: "user", text },
          ]);
          proceedToFarm();
          return;
        }
        if (parsedWhileAwaiting) {
          // Permitir editar aunque aún esté visible el dropzone
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-u`, role: "user", text },
          ]);
          setAwaitingLogoFor(null);
          if (parsedWhileAwaiting.field === "org") {
            if (parsedWhileAwaiting.value) {
              const v = validateNameLike(parsedWhileAwaiting.value, {
                minLen: 3,
                kindLabel: "organización",
              });
              if (!v.ok) {
                setMessages((p) => [
                  ...p,
                  {
                    id: `${Date.now()}-await-orgx`,
                    role: "ai",
                    text: v.reason || "Ese nombre no parece válido.",
                  },
                ]);
              } else {
                setOrgDraft({ name: v.cleaned });
                const summaryBlock: ChatMsg = {
                  id: `${Date.now()}-await-sum-org`,
                  role: "ai",
                  kind: "summary",
                  summary: {
                    org: v.cleaned,
                    farm: farmDraft.name,
                    code: farmDraft.code,
                  },
                };
                setMessages((p) => [
                  ...p,
                  {
                    id: `${Date.now()}-await-org2`,
                    role: "ai",
                    text: `He actualizado la organización a ${v.cleaned}.`,
                  },
                  {
                    id: `${Date.now()}-await-orgtxt`,
                    role: "ai",
                    text: "Este es el resumen actualizado:",
                  },
                  summaryBlock,
                  {
                    id: `${Date.now()}-await-orgcta`,
                    role: "ai",
                    text: "Confirma para continuar o dime si quieres editar algo más.",
                  },
                ]);
                setLocked(true);
              }
            } else {
              respondToClarification("org");
            }
          } else if (parsedWhileAwaiting.field === "farmName") {
            if (parsedWhileAwaiting.value) {
              const v = validateNameLike(parsedWhileAwaiting.value, {
                minLen: 2,
                kindLabel: "finca",
              });
              if (!v.ok) {
                setMessages((p) => [
                  ...p,
                  {
                    id: `${Date.now()}-await-farmx`,
                    role: "ai",
                    text: v.reason || "Ese nombre no parece válido.",
                  },
                ]);
              } else {
                setFarmDraft((prev) => ({ ...prev, name: v.cleaned }));
                const summaryBlock: ChatMsg = {
                  id: `${Date.now()}-await-sum-farm`,
                  role: "ai",
                  kind: "summary",
                  summary: {
                    org: alreadyHasOrg
                      ? myOrgs?.[0]?.name ?? orgDraft.name
                      : orgDraft.name,
                    farm: v.cleaned,
                    code: farmDraft.code,
                  },
                };
                setMessages((p) => [
                  ...p,
                  {
                    id: `${Date.now()}-await-farm2`,
                    role: "ai",
                    text: `He actualizado el nombre de la finca a ${v.cleaned}.`,
                  },
                  {
                    id: `${Date.now()}-await-farmtxt`,
                    role: "ai",
                    text: "Este es el resumen actualizado:",
                  },
                  summaryBlock,
                  {
                    id: `${Date.now()}-await-farmcta`,
                    role: "ai",
                    text: "Confirma para continuar o dime si quieres editar algo más.",
                  },
                ]);
                setLocked(true);
              }
            } else {
              respondToClarification("farm");
            }
          } else if (parsedWhileAwaiting.field === "farmCode") {
            const code = (parsedWhileAwaiting.value || "").toLowerCase();
            if (!/^fn-[a-z0-9-]{3,}$/.test(code)) {
              setMessages((p) => [
                ...p,
                {
                  id: `${Date.now()}-await-codex`,
                  role: "ai",
                  text: "El código debe iniciar con fn- y usar solo letras, números y guiones.",
                },
              ]);
            } else {
              setFarmDraft((prev) => ({ ...prev, code }));
              const summaryBlock: ChatMsg = {
                id: `${Date.now()}-await-sum-code`,
                role: "ai",
                kind: "summary",
                summary: {
                  org: alreadyHasOrg
                    ? myOrgs?.[0]?.name ?? orgDraft.name
                    : orgDraft.name,
                  farm: farmDraft.name,
                  code,
                },
              };
              setMessages((p) => [
                ...p,
                {
                  id: `${Date.now()}-await-code2`,
                  role: "ai",
                  text: `He actualizado el código de la finca a ${code}.`,
                },
                {
                  id: `${Date.now()}-await-codetxt`,
                  role: "ai",
                  text: "Este es el resumen actualizado:",
                },
                summaryBlock,
                {
                  id: `${Date.now()}-await-codecta`,
                  role: "ai",
                  text: "Confirma para continuar o dime si quieres editar algo más.",
                },
              ]);
              setLocked(true);
            }
          }
          return;
        }
        // Guía mientras esperamos logo
        const hint =
          "Para continuar, sube el logo aquí o escribe 'Subir después' (puedes decir: continuar, seguir, omitir logo, más tarde).";
        setInputText("");
        setMessages((p) => [
          ...p,
          { id: `${Date.now()}-logo-hint`, role: "ai", text: hint },
        ]);
        speak(hint);
        return;
      }
      setMessages((p) => [...p, { id: `${Date.now()}-u`, role: "user", text }]);
      setInputText("");
      // Intento directo de edición en cualquier estado (ej.: "cambia/cambies/edita/edites ... por X")
      const parsedGlobal = parseEditCommand(text);
      if (parsedGlobal) {
        if (parsedGlobal.field === "org") {
          if (parsedGlobal.value) {
            const v = validateNameLike(parsedGlobal.value, {
              minLen: 3,
              kindLabel: "organización",
            });
            if (!v.ok) {
              setMessages((p) => [
                ...p,
                {
                  id: `${Date.now()}-g-orgx`,
                  role: "ai",
                  text: v.reason || "Ese nombre no parece válido.",
                },
              ]);
            } else {
              setOrgDraft({ name: v.cleaned });
              const summaryBlock: ChatMsg = {
                id: `${Date.now()}-g-sum-org`,
                role: "ai",
                kind: "summary",
                summary: {
                  org: v.cleaned,
                  farm: farmDraft.name,
                  code: farmDraft.code,
                },
              };
              setMessages((p) => [
                ...p,
                {
                  id: `${Date.now()}-g-org2`,
                  role: "ai",
                  text: `He actualizado la organización a ${v.cleaned}.`,
                },
                {
                  id: `${Date.now()}-g-orgtxt`,
                  role: "ai",
                  text: "Este es el resumen actualizado:",
                },
                summaryBlock,
                {
                  id: `${Date.now()}-g-orgcta`,
                  role: "ai",
                  text: "Confirma para continuar o dime si quieres editar algo más.",
                },
              ]);
              setLocked(true);
            }
          } else {
            respondToClarification("org");
          }
          return;
        }
        if (parsedGlobal.field === "farmName") {
          if (parsedGlobal.value) {
            const v = validateNameLike(parsedGlobal.value, {
              minLen: 2,
              kindLabel: "finca",
            });
            if (!v.ok) {
              setMessages((p) => [
                ...p,
                {
                  id: `${Date.now()}-g-farmx`,
                  role: "ai",
                  text: v.reason || "Ese nombre no parece válido.",
                },
              ]);
            } else {
              setFarmDraft((prev) => ({ ...prev, name: v.cleaned }));
              const summaryBlock: ChatMsg = {
                id: `${Date.now()}-g-sum-farm`,
                role: "ai",
                kind: "summary",
                summary: {
                  org: alreadyHasOrg
                    ? myOrgs?.[0]?.name ?? orgDraft.name
                    : orgDraft.name,
                  farm: v.cleaned,
                  code: farmDraft.code,
                },
              };
              setMessages((p) => [
                ...p,
                {
                  id: `${Date.now()}-g-farm2`,
                  role: "ai",
                  text: `He actualizado el nombre de la finca a ${v.cleaned}.`,
                },
                {
                  id: `${Date.now()}-g-farmtxt`,
                  role: "ai",
                  text: "Este es el resumen actualizado:",
                },
                summaryBlock,
                {
                  id: `${Date.now()}-g-farmcta`,
                  role: "ai",
                  text: "Confirma para continuar o dime si quieres editar algo más.",
                },
              ]);
              setLocked(true);
            }
          } else {
            respondToClarification("farm");
          }
          return;
        }
        if (parsedGlobal.field === "farmCode") {
          const code = (parsedGlobal.value || "").toLowerCase();
          if (!/^fn-[a-z0-9-]{3,}$/.test(code)) {
            setMessages((p) => [
              ...p,
              {
                id: `${Date.now()}-g-codex`,
                role: "ai",
                text: "El código debe iniciar con fn- y usar solo letras, números y guiones.",
              },
            ]);
          } else {
            setFarmDraft((prev) => ({ ...prev, code }));
            const summaryBlock: ChatMsg = {
              id: `${Date.now()}-g-sum-code`,
              role: "ai",
              kind: "summary",
              summary: {
                org: alreadyHasOrg
                  ? myOrgs?.[0]?.name ?? orgDraft.name
                  : orgDraft.name,
                farm: farmDraft.name,
                code,
              },
            };
            setMessages((p) => [
              ...p,
              {
                id: `${Date.now()}-g-code2`,
                role: "ai",
                text: `He actualizado el código de la finca a ${code}.`,
              },
              {
                id: `${Date.now()}-g-codetxt`,
                role: "ai",
                text: "Este es el resumen actualizado:",
              },
              summaryBlock,
              {
                id: `${Date.now()}-g-codecta`,
                role: "ai",
                text: "Confirma para continuar o dime si quieres editar algo más.",
              },
            ]);
            setLocked(true);
          }
          return;
        }
      }
      // Intento de edición directa: "cambiar/editar <campo> a <valor>"
      const low = text.toLowerCase();
      const wantsChange = /\b(cambiar|editar)\b/.test(low);
      const extractAfterA = (t: string) => {
        const m = t.match(/\ba\s+(.+)$/);
        return m ? m[1].trim() : "";
      };
      if (wantsChange) {
        if (/organ/i.test(low)) {
          const val = extractAfterA(text);
          if (val) {
            setOrgDraft({ name: val });
            const msg = `Nuevo dato guardado: organización = ${val}.`;
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-chg1`, role: "ai", text: msg },
            ]);
            speak(msg);
          } else {
            setPendingEdit("org");
            const ask = "¿Cuál es el nuevo nombre de tu organización?";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-ask-org`, role: "ai", text: ask },
            ]);
            speak(ask);
            return;
          }
        } else if (/c[oó]digo|code/i.test(low)) {
          const val = extractAfterA(text).toLowerCase();
          if (val) {
            if (!/^fn-[a-z0-9-]{3,}$/.test(val)) {
              const msg =
                "El código debe iniciar con fn- y usar solo letras, números y guiones.";
              setMessages((p) => [
                ...p,
                { id: `${Date.now()}-chg2x`, role: "ai", text: msg },
              ]);
              speak(msg);
              return;
            }
            setFarmDraft((prev) => ({ ...prev, code: val }));
            const msg = `Nuevo dato guardado: código de la finca = ${val}.`;
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-chg2`, role: "ai", text: msg },
            ]);
            speak(msg);
          } else {
            setPendingEdit("farmCode");
            const ask = "¿Cuál es el nuevo código? (ej. fn-mi-finca)";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-ask-code`, role: "ai", text: ask },
            ]);
            speak(ask);
            return;
          }
        } else if (/finca|nombre/i.test(low)) {
          const val = extractAfterA(text);
          if (val) {
            setFarmDraft((prev) => ({ ...prev, name: val }));
            const msg = `Nuevo dato guardado: nombre de la finca = ${val}.`;
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-chg3`, role: "ai", text: msg },
            ]);
            speak(msg);
          } else {
            setPendingEdit("farmName");
            const ask = "¿Cuál es el nuevo nombre de tu finca?";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-ask-name`, role: "ai", text: ask },
            ]);
            speak(ask);
            return;
          }
        }
        // Si estamos en edición confirmada, volver al siguiente faltante o resumen
        if (!orgDraft.name && !alreadyHasOrg) {
          const ask = "Escribe el nombre de tu organización.";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-next1`, role: "ai", text: ask },
          ]);
          speak(ask);
          setCurrent("org");
          setLocked(false);
          return;
        }
        if (!farmDraft.name) {
          const ask = "Ahora dime el nombre de tu finca.";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-next2`, role: "ai", text: ask },
          ]);
          speak(ask);
          setCurrent("farm");
          setLocked(false);
          return;
        }
        if (!farmDraft.code) {
          const ask = "Escribe el código de tu finca (ej. fn-mi-finca).";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-next3`, role: "ai", text: ask },
          ]);
          speak(ask);
          setCurrent("farm");
          setLocked(false);
          return;
        }
        // Todo completo → mostrar resumen y bloquear (como bloque con estilo)
        const currentOrgName = alreadyHasOrg
          ? myOrgs?.[0]?.name ?? orgDraft.name
          : orgDraft.name;
        const summaryBlock: ChatMsg = {
          id: `${Date.now()}-sumblock`,
          role: "ai",
          kind: "summary",
          summary: {
            org: currentOrgName,
            farm: farmDraft.name,
            code: farmDraft.code,
          },
        };
        setMessages((p) => [
          ...p,
          {
            id: `${Date.now()}-sum1`,
            role: "ai",
            text: "Perfecto, actualicé tus datos. Este es el resumen actualizado:",
          },
          summaryBlock,
          {
            id: `${Date.now()}-sum3`,
            role: "ai",
            text: "Confirma para continuar o indica qué deseas editar.",
          },
        ]);
        speak(
          "Perfecto, actualicé tus datos. Revisa el resumen y confirma para continuar."
        );
        setLocked(true);
        return;
      }

      // Si hay una edición pendiente (preguntamos por el nuevo valor)
      if (pendingEdit) {
        if (pendingEdit === "org") {
          if (isClarificationOrQuestion(text) || text.length < 2) {
            const msg =
              "Ese nombre es muy corto. Escribe un nombre más descriptivo, por favor.";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-porgx`, role: "ai", text: msg },
            ]);
            speak(msg);
            return;
          }
          const v = validateNameLike(text, {
            minLen: 3,
            kindLabel: "organización",
          });
          if (!v.ok) {
            const msg =
              v.reason || "El nombre de tu organización no parece válido.";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-porgx2`, role: "ai", text: msg },
            ]);
            speak(msg);
            return;
          }
          setOrgDraft({ name: v.cleaned });
          const msg = `Nuevo dato guardado: organización = ${v.cleaned}.`;
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-porg`, role: "ai", text: msg },
          ]);
          speak(msg);
        }
        if (pendingEdit === "farmName") {
          if (isClarificationOrQuestion(text) || text.length < 2) {
            const msg = "Ese nombre es muy corto. Inténtalo nuevamente.";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-pfnamex`, role: "ai", text: msg },
            ]);
            speak(msg);
            return;
          }
          const v = validateNameLike(text, { minLen: 2, kindLabel: "finca" });
          if (!v.ok) {
            const msg =
              v.reason || "Ese nombre no parece válido. Inténtalo nuevamente.";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-pfnamex2`, role: "ai", text: msg },
            ]);
            speak(msg);
            return;
          }
          setFarmDraft((prev) => ({ ...prev, name: v.cleaned }));
          const msg = `Nuevo dato guardado: nombre de la finca = ${v.cleaned}.`;
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-pfname`, role: "ai", text: msg },
          ]);
          speak(msg);
        }
        if (pendingEdit === "farmCode") {
          const code = text.toLowerCase();
          if (!/^fn-[a-z0-9-]{3,}$/.test(code)) {
            const msg =
              "El código debe iniciar con fn- y usar solo letras, números y guiones.";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-pfcodex`, role: "ai", text: msg },
            ]);
            speak(msg);
            return;
          }
          setFarmDraft((prev) => ({ ...prev, code }));
          const msg = `Nuevo dato guardado: código de la finca = ${code}.`;
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-pfcode`, role: "ai", text: msg },
          ]);
          speak(msg);
        }
        setPendingEdit(null);
        // Continuar con faltantes o resumen
        if (!orgDraft.name && !alreadyHasOrg) {
          const ask = "Escribe el nombre de tu organización.";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-next1b`, role: "ai", text: ask },
          ]);
          speak(ask);
          setCurrent("org");
          setLocked(false);
          return;
        }
        if (!farmDraft.name) {
          const ask = "Ahora dime el nombre de tu finca.";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-next2b`, role: "ai", text: ask },
          ]);
          speak(ask);
          setCurrent("farm");
          setLocked(false);
          return;
        }
        if (!farmDraft.code) {
          const ask = "Escribe el código de tu finca (ej. fn-mi-finca).";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-next3b`, role: "ai", text: ask },
          ]);
          speak(ask);
          setCurrent("farm");
          setLocked(false);
          return;
        }
        const currentOrgName2 = alreadyHasOrg
          ? myOrgs?.[0]?.name ?? orgDraft.name
          : orgDraft.name;
        const summaryBlock2: ChatMsg = {
          id: `${Date.now()}-sumblock2`,
          role: "ai",
          kind: "summary",
          summary: {
            org: currentOrgName2,
            farm: farmDraft.name,
            code: farmDraft.code,
          },
        };
        setMessages((p) => [
          ...p,
          {
            id: `${Date.now()}-sum4`,
            role: "ai",
            text: "Actualicé tus respuestas. Este es el resumen:",
          },
          summaryBlock2,
          {
            id: `${Date.now()}-sum6`,
            role: "ai",
            text: "Confirma para continuar o dime si quieres editar algo más.",
          },
        ]);
        speak(
          "Actualicé tus respuestas. Revisa el resumen y confirma para continuar."
        );
        setLocked(true);
        return;
      }

      // reglas simples de validación/onboarding guiado
      const step = current;
      if (step === "org" && !alreadyHasOrg) {
        if (isGreetingOrSmalltalk(text)) {
          persuasiveAsk("organización", "Ganadería La Esperanza");
          return;
        }
        if (isClarificationOrQuestion(text)) {
          respondToClarification("org");
          return;
        }
        // Si parece claramente fuera de tema, pedir confirmación explícita
        if (isLikelyOffTopicSentence(text)) {
          const msgc =
            "Lo que escribiste parece una frase y no un nombre. ¿Es realmente el nombre de tu organización? Si no, por favor escribe solo el nombre (ej.: Ganadería La Esperanza).";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-ai1c`, role: "ai", text: msgc },
          ]);
          speak(msgc);
          return;
        }
        const v = validateNameLike(text, {
          minLen: 3,
          kindLabel: "organización",
        });
        if (!v.ok) {
          const msg =
            v.reason || "El nombre de tu organización no parece válido.";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-ai1`, role: "ai", text: msg },
          ]);
          speak(msg);
          return;
        }
        setOrgDraft({ name: v.cleaned });
        const msgLogo =
          "¿Quieres subir el logo de tu organización? Puedes arrastrarlo aquí o continuar sin logo.";
        setMessages((p) => [
          ...p,
          { id: `${Date.now()}-ai2a`, role: "ai", text: msgLogo },
          { id: `${Date.now()}-logo`, role: "ai", kind: "logo-drop" },
        ]);
        speak(msgLogo);
        setAwaitingLogoFor("org");
        return;
      }
      if (step === "farm") {
        if (!farmDraft.name) {
          if (isGreetingOrSmalltalk(text)) {
            persuasiveAsk("finca", "La Primavera");
            return;
          }
          if (isClarificationOrQuestion(text)) {
            respondToClarification("farm");
            return;
          }
          if (isLikelyOffTopicSentence(text)) {
            const msgc =
              "Parece una frase y no un nombre de finca. Escribe solo el nombre (ej.: La Primavera).";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-ai3c`, role: "ai", text: msgc },
            ]);
            speak(msgc);
            return;
          }
          const v = validateNameLike(text, { minLen: 2, kindLabel: "finca" });
          if (!v.ok) {
            const msg3 =
              v.reason || "Ese nombre no parece válido. Inténtalo nuevamente.";
            setMessages((p) => [
              ...p,
              { id: `${Date.now()}-ai3`, role: "ai", text: msg3 },
            ]);
            speak(msg3);
            return;
          }
          const genCode = `fn-${slugify(v.cleaned)}`;
          setFarmDraft((prev) => ({ ...prev, name: v.cleaned, code: genCode }));
          setCurrent("confirm");
          const summary = `Organización: ${
            alreadyHasOrg ? myOrgs?.[0]?.name ?? orgDraft.name : orgDraft.name
          }\nFinca: ${v.cleaned}\nCódigo asignado: ${genCode}`;
          const nextMsgs: ChatMsg[] = [
            ...messages,
            {
              id: `${Date.now()}-ai6`,
              role: "ai",
              text: "He asignado automáticamente un código a tu finca.",
            },
            { id: `${Date.now()}-ai7`, role: "ai", text: summary },
            {
              id: `${Date.now()}-ai8`,
              role: "ai",
              text: "Confirma para continuar o dime si deseas editar la organización o el nombre de la finca.",
            },
          ];
          setMessages(nextMsgs);
          speak(
            "He asignado automáticamente un código a tu finca. Revisa el resumen y confirma para continuar."
          );
          setLocked(true);
          return;
        }
      }
      if (locked) {
        // Edición guiada (acepta comandos tipo "cambiar ... por X")
        const lower = text.toLowerCase();
        const parsed = parseEditCommand(text);
        if (parsed) {
          if (parsed.field === "org") {
            if (parsed.value) {
              const v = validateNameLike(parsed.value, {
                minLen: 3,
                kindLabel: "organización",
              });
              if (!v.ok) {
                setMessages((p) => [
                  ...p,
                  {
                    id: `${Date.now()}-clar-orgx`,
                    role: "ai",
                    text: v.reason || "Ese nombre no parece válido.",
                  },
                ]);
              } else {
                setOrgDraft({ name: v.cleaned });
                const currentOrgName = v.cleaned;
                const summaryBlock: ChatMsg = {
                  id: `${Date.now()}-sumlock-org`,
                  role: "ai",
                  kind: "summary",
                  summary: {
                    org: currentOrgName,
                    farm: farmDraft.name,
                    code: farmDraft.code,
                  },
                };
                setMessages((p) => [
                  ...p,
                  {
                    id: `${Date.now()}-clar-org2`,
                    role: "ai",
                    text: `He actualizado la organización a ${v.cleaned}.`,
                  },
                  {
                    id: `${Date.now()}-sumlock-orgtxt`,
                    role: "ai",
                    text: "Este es el resumen actualizado:",
                  },
                  summaryBlock,
                  {
                    id: `${Date.now()}-sumlock-orgcta`,
                    role: "ai",
                    text: "Confirma para continuar o dime si quieres editar algo más.",
                  },
                ]);
                setLocked(true);
              }
            } else {
              respondToClarification("org");
            }
            return;
          }
          if (parsed.field === "farmName") {
            if (parsed.value) {
              const v = validateNameLike(parsed.value, {
                minLen: 2,
                kindLabel: "finca",
              });
              if (!v.ok) {
                setMessages((p) => [
                  ...p,
                  {
                    id: `${Date.now()}-clar-farmx`,
                    role: "ai",
                    text: v.reason || "Ese nombre no parece válido.",
                  },
                ]);
              } else {
                setFarmDraft((prev) => ({ ...prev, name: v.cleaned }));
                const summaryBlock: ChatMsg = {
                  id: `${Date.now()}-sumlock-farm`,
                  role: "ai",
                  kind: "summary",
                  summary: {
                    org: alreadyHasOrg
                      ? myOrgs?.[0]?.name ?? orgDraft.name
                      : orgDraft.name,
                    farm: v.cleaned,
                    code: farmDraft.code,
                  },
                };
                setMessages((p) => [
                  ...p,
                  {
                    id: `${Date.now()}-clar-farm2`,
                    role: "ai",
                    text: `He actualizado el nombre de la finca a ${v.cleaned}.`,
                  },
                  {
                    id: `${Date.now()}-sumlock-farmtxt`,
                    role: "ai",
                    text: "Este es el resumen actualizado:",
                  },
                  summaryBlock,
                  {
                    id: `${Date.now()}-sumlock-farmcta`,
                    role: "ai",
                    text: "Confirma para continuar o dime si quieres editar algo más.",
                  },
                ]);
                setLocked(true);
              }
            } else {
              respondToClarification("farm");
            }
            return;
          }
          if (parsed.field === "farmCode") {
            const code = (parsed.value || "").toLowerCase();
            if (!/^fn-[a-z0-9-]{3,}$/.test(code)) {
              setMessages((p) => [
                ...p,
                {
                  id: `${Date.now()}-clar-codex`,
                  role: "ai",
                  text: "El código debe iniciar con fn- y usar solo letras, números y guiones.",
                },
              ]);
            } else {
              setFarmDraft((prev) => ({ ...prev, code }));
              const summaryBlock: ChatMsg = {
                id: `${Date.now()}-sumlock-code`,
                role: "ai",
                kind: "summary",
                summary: {
                  org: alreadyHasOrg
                    ? myOrgs?.[0]?.name ?? orgDraft.name
                    : orgDraft.name,
                  farm: farmDraft.name,
                  code,
                },
              };
              setMessages((p) => [
                ...p,
                {
                  id: `${Date.now()}-clar-code2`,
                  role: "ai",
                  text: `He actualizado el código de la finca a ${code}.`,
                },
                {
                  id: `${Date.now()}-sumlock-codetxt`,
                  role: "ai",
                  text: "Este es el resumen actualizado:",
                },
                summaryBlock,
                {
                  id: `${Date.now()}-sumlock-codecta`,
                  role: "ai",
                  text: "Confirma para continuar o dime si quieres editar algo más.",
                },
              ]);
              setLocked(true);
            }
            return;
          }
        }
        if (/organ/i.test(lower)) {
          setLocked(false);
          setCurrent("org");
          const msg9 = "Claro, ¿cuál es el nuevo nombre de tu organización?";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-ai9`, role: "ai", text: msg9 },
          ]);
          speak(msg9);
          return;
        }
        if (/finca|nombre/i.test(lower)) {
          setLocked(false);
          setCurrent("farm");
          setFarmDraft((prev) => ({ ...prev, name: "" }));
          const msg10 = "Entendido, escribe el nuevo nombre de tu finca.";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-ai10`, role: "ai", text: msg10 },
          ]);
          speak(msg10);
          return;
        }
        if (/c[oó]digo|code/i.test(lower)) {
          setLocked(false);
          setCurrent("farm");
          const msg11 = "Escribe el nuevo código (ej. fn-mi-finca).";
          setMessages((p) => [
            ...p,
            { id: `${Date.now()}-ai11`, role: "ai", text: msg11 },
          ]);
          speak(msg11);
          return;
        }
        const msg12 =
          "Sigamos enfocados en el onboarding. Dime si quieres editar organización, nombre de la finca o su código.";
        setMessages((p) => [
          ...p,
          { id: `${Date.now()}-ai12`, role: "ai", text: msg12 },
        ]);
        speak(msg12);
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Saludo inicial automático del agente
  useEffect(() => {
    if (!isLoaded) return;
    if (messages.length > 0) return;
    const hiName = user?.firstName ? `, ${user.firstName}` : "";
    const intro = `¡Hola${hiName}! Soy tu asistente de configuración en Ganado.co.`;
    const prompt = alreadyHasOrg
      ? `Ya encontré tu organización ${myOrgs?.[0]?.name}. Continuemos: ¿cómo se llama tu primera finca?`
      : `Empecemos por tu organización. ¿Cómo se llama?`;
    const m1: ChatMsg = { id: `${Date.now()}-w1`, role: "ai", text: intro };
    const m2: ChatMsg = { id: `${Date.now()}-w2`, role: "ai", text: prompt };
    setMessages([m1, m2]);
    speak(`${intro} ${prompt}`);
    // set current accordingly
    setCurrent(alreadyHasOrg ? "farm" : "org");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, alreadyHasOrg]);

  async function handleLinkDevice(orgId?: string) {
    if (!user) return;
    try {
      // 0) Asegurar que el dispositivo quede vinculado LOCALMENTE al usuario actual
      await bindDeviceLocally({
        deviceId,
        clerkId: user.id,
        name: "Este equipo",
        platform: typeof navigator !== "undefined" ? navigator.platform : "web",
        orgId,
      });

      // 1) Si el usuario ingresó passcode, provisionar identidad offline local
      if (passA || passB) {
        if (passA.length < 6) {
          addToast({
            variant: "warning",
            title: "La clave debe tener al menos 6 caracteres",
          });
          return;
        }
        if (passA !== passB) {
          addToast({ variant: "warning", title: "Las claves no coinciden" });
          return;
        }
        await provisionFromClerk({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName ?? undefined,
          avatarUrl: user.imageUrl,
          orgId,
          passcode: passA,
        });
      }

      // 2) Registrar dispositivo en backend
      await registerDevice.mutateAsync({
        deviceId,
        name: "Este equipo",
        platform: typeof navigator !== "undefined" ? navigator.platform : "web",
        orgId,
      });
      if (passA && passA.length >= 6) {
        try {
          await setPassStatus.mutateAsync({ deviceId, hasPasscode: true });
        } catch {}
      }
      await bindDeviceLocally({
        deviceId,
        clerkId: user.id,
        name: "Este equipo",
        platform: typeof navigator !== "undefined" ? navigator.platform : "web",
      });
      setDeviceLinked(true);
      addToast({ variant: "success", title: "Dispositivo vinculado" });
    } catch (e: any) {
      addToast({
        variant: "error",
        title: "No se pudo vincular",
        description: e?.message,
      });
    }
  }

  async function handleConfirmAndCreate() {
    try {
      // Crear organización si el usuario no tenía
      let orgId: string | null = null;
      let orgName: string = orgDraft.name;
      if (!alreadyHasOrg) {
        if (!orgDraft.name || orgDraft.name.trim().length < 2) {
          addToast({
            variant: "warning",
            title: "Escribe el nombre de la organización",
          });
          setCurrent("org");
          return;
        }
        const org = await createOrg.mutateAsync({ name: orgDraft.name.trim() });
        orgId = org.id;
        orgName = org.name;
        await utils.org.myOrganizations.invalidate();
      } else {
        // Si ya tiene, usar la primera
        orgId = myOrgs?.[0]?.id ?? null;
        orgName = myOrgs?.[0]?.name ?? orgDraft.name;
      }

      if (!orgId) throw new Error("No se obtuvo organización");

      // Crear finca
      if (!farmDraft.name || !farmDraft.code) {
        addToast({
          variant: "warning",
          title: "Completa nombre y código de la finca",
        });
        setCurrent("farm");
        return;
      }
      const farm = await createFarm.mutateAsync({
        orgId,
        code: farmDraft.code,
        name: farmDraft.name.trim(),
      } as any);
      try {
        window.localStorage.setItem("ACTIVE_FARM_ID", farm.id);
      } catch {}
      await utils.farm.list.invalidate();

      // Si el usuario ya vinculó el dispositivo antes de crear la organización,
      // repetir registro para asociar la org recien creada
      if (deviceLinked) {
        try {
          await registerDevice.mutateAsync({ deviceId, orgId });
        } catch {}
      }

      setCreated({
        orgId,
        orgName,
        farmId: (farm as any).id,
        farmName: farmDraft.name.trim(),
        farmCode: farmDraft.code,
      });
      addToast({ variant: "success", title: "¡Todo listo!" });
      try {
        router.replace("/settings/billing?welcome=1");
      } catch {}
    } catch (e: any) {
      addToast({
        variant: "error",
        title: "No se pudo completar",
        description: e?.message,
      });
    }
  }

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen p-6 bg-gradient-mesh">
      <div className="max-w-5xl mx-auto">
        <div className="sticky top-2 z-20 flex items-center justify-center mb-6 bg-white/60 backdrop-blur rounded-full py-2">
          <Image
            src="/brand/full-logo-black-nobg.png"
            alt="Ganado AI"
            width={220}
            height={48}
          />
        </div>
        {/* Contenedor de chat tipo isla */}
        <motion.div
          layout
          transition={{ type: "spring", duration: 0.35, bounce: 0 }}
          className="island p-4 md:p-6 relative pb-4"
        >
          {/* Burbuja switch del narrador */}
          <VoiceSwitchBubble
            enabled={voiceOn}
            onToggle={() => {
              const willEnable = !voiceOn;
              if (willEnable) {
                try {
                  const lastAi = [...messages]
                    .reverse()
                    .find((m) => m.role === "ai" && m.text);
                  if (
                    typeof window !== "undefined" &&
                    "speechSynthesis" in window
                  ) {
                    try {
                      window.speechSynthesis.cancel();
                    } catch {}
                  }
                  if (lastAi?.text) {
                    try {
                      if (
                        typeof window !== "undefined" &&
                        "speechSynthesis" in window
                      ) {
                        const u = new SpeechSynthesisUtterance(lastAi.text);
                        u.lang = "es-CO";
                        u.rate = 1;
                        u.pitch = 1;
                        window.speechSynthesis.speak(u);
                      }
                    } catch {}
                  }
                } catch {}
                addToast({ variant: "success", title: "Narrador activado" });
              } else {
                try {
                  if (
                    typeof window !== "undefined" &&
                    "speechSynthesis" in window
                  ) {
                    window.speechSynthesis.cancel();
                  }
                } catch {}
                addToast({ variant: "warning", title: "Narrador desactivado" });
              }
              setVoiceOn(willEnable);
            }}
          />
          <style>{`
            .dot1{animation:visibility 3s linear infinite}
            @keyframes visibility{0%{opacity:1}65%{opacity:1}66%{opacity:0}100%{opacity:0}}
            .dot2{animation:visibility2 3s linear infinite}
            @keyframes visibility2{0%{opacity:0}21%{opacity:0}22%{opacity:1}65%{opacity:1}66%{opacity:0}100%{opacity:0}}
            .dot3{animation:visibility3 3s linear infinite}
            @keyframes visibility3{0%{opacity:0}43%{opacity:0}44%{opacity:1}65%{opacity:1}66%{opacity:0}100%{opacity:0}}
          `}</style>
          <div className="text-lg font-semibold mb-1">
            ¡Hola{user?.firstName ? `, ${user.firstName}` : ""}! Bienvenido a
            Ganado.co
          </div>
          <div className="text-sm text-neutral-600 mb-4 mt-3 pr-28">
            Soy tu asistente de configuración. Juntos vamos a preparar tu
            espacio. Te haré preguntas cortas y te iré guiando. Si tienes dudas,
            pregúntame “¿para qué sirve esto?” y te explico. Puedes responder
            por texto o usando tu voz.
          </div>
          {/* Progreso */}
          {(() => {
            const step1 = alreadyHasOrg || !!orgDraft.name;
            const step2 = !!farmDraft.name && !!farmDraft.code;
            const done = (step1 ? 1 : 0) + (step2 ? 1 : 0) + (locked ? 1 : 0);
            const pct = Math.min(100, Math.round((done / 3) * 100));
            return (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                  <span>Progreso</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })()}
          {/* Mensajes (estilo ChatGPT) */}
          <div className="space-y-3 max-h-[52vh] overflow-auto pr-1 transition-[max-height] duration-300 ease-in-out">
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {m.role === "user" ? (
                    <div className="ml-auto max-w-[75%]">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-100 text-neutral-900 px-3 py-2 text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm">
                        {m.text}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-2 text-neutral-500">
                        <button
                          type="button"
                          aria-label="Copiar mensaje"
                          className="p-1 rounded hover:bg-neutral-200/60"
                          onClick={() => handleCopyMessage(m.text || "")}
                          title="Copiar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Editar y reenviar"
                          className="p-1 rounded hover:bg-neutral-200/60"
                          onClick={() => handleEditMessage(m.id)}
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : m.kind === "logo-drop" ? (
                    <LogoDropMessage
                      onUploaded={(d) => {
                        setOrgLogo(d);
                        // Avanzar automáticamente a la siguiente indicación
                        proceedToFarm();
                      }}
                      current={orgLogo}
                      onClear={() => {
                        setOrgLogo(null);
                        // El usuario decide subir después
                        proceedToFarm();
                      }}
                      disabled={awaitingLogoFor !== "org"}
                    />
                  ) : m.kind === "summary" && m.summary ? (
                    <div className="max-w-[85%] w-full">
                      <div className="rounded-xl border border-neutral-200 bg-white/70 p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-neutral-700">
                          <Bot className="w-4 h-4" />
                          <span className="text-xs uppercase tracking-wide">
                            Generado por AI
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1 pr-3 text-neutral-500">
                                  Organización
                                </td>
                                <td className="py-1 font-medium text-neutral-900">
                                  {m.summary.org}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-3 text-neutral-500">
                                  Finca
                                </td>
                                <td className="py-1 font-medium text-neutral-900">
                                  {m.summary.farm}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-3 text-neutral-500">
                                  Código
                                </td>
                                <td className="py-1 font-mono text-neutral-900">
                                  {m.summary.code}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        {/* Faja de paso final */}
                        {locked && (
                          <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-center gap-2 text-blue-800">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Paso final — revisa y confirma para terminar tu
                              configuración.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w:[85%] max-w-[85%] text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-800">
                      {m.text}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={endRef} />
            {isTyping && (
              <div className="max-w-[85%] text-[15px] text-neutral-600 select-none">
                <span className="inline-block align-middle">Escribiendo</span>
                <span className="inline-block align-middle ml-1">
                  <span className="dot1">.</span>
                  <span className="dot2">.</span>
                  <span className="dot3">.</span>
                </span>
              </div>
            )}
          </div>
          {/* Input unificado del asistente o solo acciones si está bloqueado */}
          <div className="mt-4">
            {!locked ? (
              (() => {
                // Determinar placeholder contextual
                let ph = "Escribe una respuesta o una pregunta…";
                if (awaitingLogoFor) {
                  ph =
                    "Sube el logo en el recuadro o escribe 'Subir después' para continuar";
                } else if (pendingEdit === "org") {
                  ph =
                    "Nombre de la organización (Ej.: Ganadería La Esperanza)";
                } else if (pendingEdit === "farmName") {
                  ph = "Nombre de la finca (Ej.: La Primavera)";
                } else if (pendingEdit === "farmCode") {
                  ph = "Código de la finca (Ej.: fn-mi-finca)";
                } else if (current === "org" && !alreadyHasOrg) {
                  ph =
                    "Nombre de la organización (Ej.: Ganadería La Esperanza)";
                } else if (current === "farm" && !farmDraft.name) {
                  ph = "Nombre de la finca (Ej.: La Primavera)";
                }
                return (
                  <AIInputBar
                    value={inputText}
                    onChange={(v) => setInputText(v)}
                    onSend={handleSend}
                    onMic={() =>
                      isListening ? stopListening() : startListening()
                    }
                    isListening={isListening}
                    elapsedMs={listenElapsedMs}
                    disabled={false}
                    placeholder={ph}
                    hideWebSearchToggle
                    analyser={audioAnalyserRef.current}
                  />
                );
              })()
            ) : (
              <div className="flex gap-2">
                <Button
                  color="primary"
                  onPress={handleConfirmAndCreate}
                  isLoading={createOrg.isPending || createFarm.isPending}
                >
                  Confirmar y continuar
                </Button>
                <Button
                  variant="flat"
                  onPress={() => {
                    setLocked(false);
                    setMessages((p) => [
                      ...p,
                      {
                        id: `${Date.now()}-ai13`,
                        role: "ai",
                        text: "¿Qué deseas editar de tu información ingresada?",
                      },
                    ]);
                  }}
                >
                  Seguir editando
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Bloque opcional: vinculación de dispositivo como isla aparte cuando current === "confirm" y no locked */}
        {current === "confirm" && !created && (
          <div className="mt-4 island p-4 md:p-6">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Laptop className="w-4 h-4" />
              Aplicación de escritorio
            </div>
            {!isDesktopApp ? (
              <div>
                <div className="mb-3">
                  <div className="text-lg font-semibold">
                    Descarga la app de escritorio
                  </div>
                  <p className="text-sm text-neutral-600">
                    Elige tu sistema para instalar Ganado Desktop y habilitar
                    sincronización y trabajo offline.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-neutral-200 bg-white/70 p-4 shadow-sm">
                    <div className="text-base font-medium mb-1">macOS</div>
                    <p className="text-sm text-neutral-600 mb-3">
                      Descarga el instalador para Mac y continúa el onboarding
                      desde la app.
                    </p>
                    <a
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black text-white text-sm shadow hover:opacity-90"
                      href={
                        process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
                        "/download"
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src="/brand/apple-logo.svg"
                        alt="Apple"
                        className="w-4 h-4"
                      />
                      <span>Descargar para macOS</span>
                    </a>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white/70 p-4 shadow-sm">
                    <div className="text-base font-medium mb-1">Windows</div>
                    <p className="text-sm text-neutral-600 mb-3">
                      Obtén el instalador para Windows y termina la vinculación
                      allí.
                    </p>
                    <a
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black text-white text-sm shadow hover:opacity-90"
                      href={
                        process.env.NEXT_PUBLIC_DESKTOP_WIN_DOWNLOAD_URL ||
                        "/download"
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src="/brand/windows-logo.svg"
                        alt="Windows"
                        className="w-4 h-4"
                      />
                      <span>Descargar para Windows</span>
                    </a>
                  </div>
                </div>
                <div className="text-xs text-neutral-500 mt-3">
                  Después de instalarla, abre Ganado Desktop e inicia sesión
                  para vincular este dispositivo automáticamente.
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <Input
                    type="password"
                    label="Clave local (mín. 6)"
                    placeholder="••••••"
                    value={passA}
                    onChange={(e) =>
                      setPassA((e.target as HTMLInputElement).value)
                    }
                  />
                  <Input
                    type="password"
                    label="Confirmar clave"
                    placeholder="••••••"
                    value={passB}
                    onChange={(e) =>
                      setPassB((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    color="secondary"
                    isLoading={registerDevice.isPending}
                    onPress={() => handleLinkDevice(undefined)}
                  >
                    Vincular este dispositivo
                  </Button>
                </div>
                {deviceLinked && (
                  <div className="mt-2 text-xs text-green-700">
                    Dispositivo vinculado correctamente.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* Botón secundario: cerrar sesión */}
        <div className="sticky bottom-2 z-20 mt-8 flex justify-center">
          <Button
            variant="flat"
            onPress={() => {
              try {
                signOut({ redirectUrl: "/" });
              } catch {}
            }}
          >
            Salir y cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Componente de mensaje especial para subir logo ---
function LogoDropMessage({
  onUploaded,
  current,
  onClear,
  disabled,
}: {
  onUploaded: (d: { dataUrl: string; fileName?: string }) => void;
  current: { dataUrl: string; fileName?: string } | null;
  onClear: () => void;
  disabled?: boolean;
}) {
  const onDrop = (accepted: File[]) => {
    if (!accepted || accepted.length === 0) return;
    const file = accepted[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      onUploaded({ dataUrl, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp", ".svg"] },
    maxFiles: 1,
    disabled: !!disabled,
  });

  return (
    <div className="max-w-[85%]">
      <div className="text-[15px] text-neutral-800 mb-1">
        Logo de la organización
      </div>
      <div
        {...getRootProps()}
        className={`rounded-2xl border border-dashed ${
          disabled
            ? "border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-60"
            : "border-neutral-300 bg-white/70 cursor-pointer hover:border-neutral-400"
        } px-4 py-6 text-center transition-colors`}
      >
        <input {...getInputProps()} />
        {current?.dataUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.dataUrl}
              alt="Logo"
              className="max-h-28 rounded-md shadow-sm"
            />
            <button
              type="button"
              className="absolute -top-2 -right-2 bg-neutral-900 text-white rounded-full p-1"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              aria-label="Quitar logo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-600">
            <ImageIcon className="w-8 h-8" />
            <span className="text-sm">
              {isDragActive
                ? "Suelta el archivo aquí"
                : "Arrastra o haz clic para subir tu logo"}
            </span>
            <span className="text-xs text-neutral-500">
              SVG, PNG o JPG (máx. 2MB)
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          disabled={!!disabled}
          className={`px-3 py-1.5 rounded-full text-xs ${
            disabled
              ? "bg-neutral-300 text-neutral-600 cursor-not-allowed"
              : "bg-neutral-900 text-white hover:opacity-90"
          }`}
        >
          Subir después
        </button>
        {current?.dataUrl && (
          <span className="text-xs text-green-700">Logo cargado ✓</span>
        )}
      </div>
    </div>
  );
}

function StepItem({
  index,
  title,
  active,
  done,
  onClick,
}: {
  index: number;
  title: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-xl border transition-all ${
        active
          ? "bg-primary-50 border-primary-200 text-primary-700"
          : done
          ? "bg-white border-neutral-200 text-neutral-700"
          : "bg-white border-neutral-200 text-neutral-500"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 grid place-items-center rounded-full text-xs font-semibold ${
            done
              ? "bg-green-600 text-white"
              : active
              ? "bg-primary-600 text-white"
              : "bg-neutral-200 text-neutral-700"
          }`}
        >
          {done ? "✓" : index}
        </div>
        <div className="text-sm font-medium">{title}</div>
      </div>
    </button>
  );
}

// --- Burbuja de switch del narrador ---
function VoiceSwitchBubble({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="absolute top-2 right-2 z-10">
      <button
        type="button"
        aria-label={
          enabled ? "Narrador de voz: encendido" : "Narrador de voz: apagado"
        }
        title={
          enabled ? "Narrador de voz: encendido" : "Narrador de voz: apagado"
        }
        onClick={onToggle}
        className="relative inline-block h-10 w-[92px] rounded-full border border-neutral-200 bg-white/80 shadow-sm backdrop-blur-md transition-colors"
      >
        {/* Track icons */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
          <Volume2 className="w-5 h-5" />
        </span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
          <VolumeX className="w-5 h-5" />
        </span>
        {/* Knob con icono */}
        <span
          className={`absolute top-1 left-1 grid place-items-center h-8 w-8 rounded-full transition-transform duration-200 ${
            enabled
              ? "translate-x-0 bg-blue-600"
              : "translate-x-[52px] bg-neutral-200"
          }`}
        >
          {enabled ? (
            <Volume2 className="w-4 h-4 text-white" />
          ) : (
            <VolumeX className="w-4 h-4 text-neutral-600" />
          )}
        </span>
        <span className="sr-only">
          {enabled ? "Apagar narrador" : "Encender narrador"}
        </span>
      </button>
      <div className="mt-1 text-center text-[10px] leading-none">
        <span className="inline-block px-1.5 py-0.5 rounded bg-white/90 text-neutral-700 shadow-sm">
          Narrador
        </span>
      </div>
    </div>
  );
}
