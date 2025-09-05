"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bindDeviceLocally, provisionFromClerk } from "@/lib/auth/offline-auth";
import { addToast } from "@/components/ui/toast";
import { robustDeviceId } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2 } from "lucide-react";

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
  type ChatMsg = { id: string; role: "ai" | "user"; text: string };
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState("");
  const [locked, setLocked] = useState(false); // lock after summary
  const [pendingEdit, setPendingEdit] = useState<null | "org" | "farmName" | "farmCode">(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  // Voz: síntesis y reconocimiento
  const [voiceOn, setVoiceOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speak = (text: string) => {
    if (!voiceOn) return;
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
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
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      addToast({ variant: "warning", title: "Voz no soportada en este navegador" });
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
    rec.onend = () => setIsListening(false);
    rec.start();
    setIsListening(true);
  };
  const stopListening = () => {
    try { recognitionRef.current?.stop?.(); } catch {}
    setIsListening(false);
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
      try { router.replace("/settings/billing?welcome=1"); } catch {}
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
        <div className="flex items-center justify-center mb-6">
          <Image src="/brand/full-logo-black-nobg.png" alt="Ganado AI" width={220} height={48} />
        </div>
        {/* Contenedor de chat tipo isla */}
        <div className="island p-4 md:p-6">
          <div className="text-lg font-semibold mb-1">¡Hola{user?.firstName ? `, ${user.firstName}` : ""}! Bienvenido a Ganado.co</div>
          <div className="text-sm text-neutral-600 mb-4">Soy tu asistente de configuración. Juntos vamos a preparar tu espacio. Te haré preguntas cortas y te iré guiando. Si tienes dudas, pregúntame “¿para qué sirve esto?” y te explico. Puedes responder por texto o usando tu voz.</div>
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
                  <div className="h-full bg-neutral-900 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}
          {/* Mensajes */}
          <div className="space-y-3 max-h-[52vh] overflow-auto pr-1">
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "ai" ? "bg-white/70 border border-neutral-200/60" : "bg-neutral-900 text-white ml-auto"}`}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
          {/* Input */}
          <div className="mt-4 flex items-center gap-2">
            <Input
              placeholder="Escribe tu respuesta…"
              value={inputText}
              onChange={(e) => setInputText((e.target as HTMLInputElement).value)}
              disabled={locked}
            />
            <Button
              color="primary"
              onPress={() => {
                const text = inputText.trim();
                if (!text) return;
                setMessages((p) => [...p, { id: `${Date.now()}-u`, role: "user", text }]);
                setInputText("");
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
                      setMessages((p) => [...p, { id: `${Date.now()}-chg1`, role: "ai", text: msg }]);
                      speak(msg);
                    } else {
                      setPendingEdit("org");
                      const ask = "¿Cuál es el nuevo nombre de tu organización?";
                      setMessages((p) => [...p, { id: `${Date.now()}-ask-org`, role: "ai", text: ask }]);
                      speak(ask);
                      return;
                    }
                  } else if (/c[oó]digo|code/i.test(low)) {
                    const val = extractAfterA(text).toLowerCase();
                    if (val) {
                      if (!/^fn-[a-z0-9-]{3,}$/.test(val)) {
                        const msg = "El código debe iniciar con fn- y usar solo letras, números y guiones.";
                        setMessages((p) => [...p, { id: `${Date.now()}-chg2x`, role: "ai", text: msg }]);
                        speak(msg);
                        return;
                      }
                      setFarmDraft((prev) => ({ ...prev, code: val }));
                      const msg = `Nuevo dato guardado: código de la finca = ${val}.`;
                      setMessages((p) => [...p, { id: `${Date.now()}-chg2`, role: "ai", text: msg }]);
                      speak(msg);
                    } else {
                      setPendingEdit("farmCode");
                      const ask = "¿Cuál es el nuevo código? (ej. fn-mi-finca)";
                      setMessages((p) => [...p, { id: `${Date.now()}-ask-code`, role: "ai", text: ask }]);
                      speak(ask);
                      return;
                    }
                  } else if (/finca|nombre/i.test(low)) {
                    const val = extractAfterA(text);
                    if (val) {
                      setFarmDraft((prev) => ({ ...prev, name: val }));
                      const msg = `Nuevo dato guardado: nombre de la finca = ${val}.`;
                      setMessages((p) => [...p, { id: `${Date.now()}-chg3`, role: "ai", text: msg }]);
                      speak(msg);
                    } else {
                      setPendingEdit("farmName");
                      const ask = "¿Cuál es el nuevo nombre de tu finca?";
                      setMessages((p) => [...p, { id: `${Date.now()}-ask-name`, role: "ai", text: ask }]);
                      speak(ask);
                      return;
                    }
                  }
                  // Si estamos en edición confirmada, volver al siguiente faltante o resumen
                  if (!orgDraft.name && !alreadyHasOrg) {
                    const ask = "Escribe el nombre de tu organización.";
                    setMessages((p) => [...p, { id: `${Date.now()}-next1`, role: "ai", text: ask }]);
                    speak(ask);
                    setCurrent("org");
                    setLocked(false);
                    return;
                  }
                  if (!farmDraft.name) {
                    const ask = "Ahora dime el nombre de tu finca.";
                    setMessages((p) => [...p, { id: `${Date.now()}-next2`, role: "ai", text: ask }]);
                    speak(ask);
                    setCurrent("farm");
                    setLocked(false);
                    return;
                  }
                  if (!farmDraft.code) {
                    const ask = "Escribe el código de tu finca (ej. fn-mi-finca).";
                    setMessages((p) => [...p, { id: `${Date.now()}-next3`, role: "ai", text: ask }]);
                    speak(ask);
                    setCurrent("farm");
                    setLocked(false);
                    return;
                  }
                  // Todo completo → mostrar resumen y bloquear
                  const summary2 = `Organización: ${alreadyHasOrg ? (myOrgs?.[0]?.name ?? orgDraft.name) : orgDraft.name}\nFinca: ${farmDraft.name}\nCódigo: ${farmDraft.code}`;
                  setMessages((p) => [...p,
                    { id: `${Date.now()}-sum1`, role: "ai", text: "Perfecto, actualicé tus datos. Este es el resumen actualizado:" },
                    { id: `${Date.now()}-sum2`, role: "ai", text: summary2 },
                    { id: `${Date.now()}-sum3`, role: "ai", text: "Confirma para continuar o indica qué deseas editar." },
                  ]);
                  speak("Perfecto, actualicé tus datos. Revisa el resumen y confirma para continuar.");
                  setLocked(true);
                  return;
                }

                // Si hay una edición pendiente (preguntamos por el nuevo valor)
                if (pendingEdit) {
                  if (pendingEdit === "org") {
                    if (text.length < 2) {
                      const msg = "Ese nombre es muy corto. Escribe un nombre más descriptivo, por favor.";
                      setMessages((p) => [...p, { id: `${Date.now()}-porgx`, role: "ai", text: msg }]);
                      speak(msg);
                      return;
                    }
                    setOrgDraft({ name: text });
                    const msg = `Nuevo dato guardado: organización = ${text}.`;
                    setMessages((p) => [...p, { id: `${Date.now()}-porg`, role: "ai", text: msg }]);
                    speak(msg);
                  }
                  if (pendingEdit === "farmName") {
                    if (text.length < 2) {
                      const msg = "Ese nombre es muy corto. Inténtalo nuevamente.";
                      setMessages((p) => [...p, { id: `${Date.now()}-pfnamex`, role: "ai", text: msg }]);
                      speak(msg);
                      return;
                    }
                    setFarmDraft((prev) => ({ ...prev, name: text }));
                    const msg = `Nuevo dato guardado: nombre de la finca = ${text}.`;
                    setMessages((p) => [...p, { id: `${Date.now()}-pfname`, role: "ai", text: msg }]);
                    speak(msg);
                  }
                  if (pendingEdit === "farmCode") {
                    const code = text.toLowerCase();
                    if (!/^fn-[a-z0-9-]{3,}$/.test(code)) {
                      const msg = "El código debe iniciar con fn- y usar solo letras, números y guiones.";
                      setMessages((p) => [...p, { id: `${Date.now()}-pfcodex`, role: "ai", text: msg }]);
                      speak(msg);
                      return;
                    }
                    setFarmDraft((prev) => ({ ...prev, code }));
                    const msg = `Nuevo dato guardado: código de la finca = ${code}.`;
                    setMessages((p) => [...p, { id: `${Date.now()}-pfcode`, role: "ai", text: msg }]);
                    speak(msg);
                  }
                  setPendingEdit(null);
                  // Continuar con faltantes o resumen
                  if (!orgDraft.name && !alreadyHasOrg) {
                    const ask = "Escribe el nombre de tu organización.";
                    setMessages((p) => [...p, { id: `${Date.now()}-next1b`, role: "ai", text: ask }]);
                    speak(ask);
                    setCurrent("org");
                    setLocked(false);
                    return;
                  }
                  if (!farmDraft.name) {
                    const ask = "Ahora dime el nombre de tu finca.";
                    setMessages((p) => [...p, { id: `${Date.now()}-next2b`, role: "ai", text: ask }]);
                    speak(ask);
                    setCurrent("farm");
                    setLocked(false);
                    return;
                  }
                  if (!farmDraft.code) {
                    const ask = "Escribe el código de tu finca (ej. fn-mi-finca).";
                    setMessages((p) => [...p, { id: `${Date.now()}-next3b`, role: "ai", text: ask }]);
                    speak(ask);
                    setCurrent("farm");
                    setLocked(false);
                    return;
                  }
                  const summary3 = `Organización: ${alreadyHasOrg ? (myOrgs?.[0]?.name ?? orgDraft.name) : orgDraft.name}\nFinca: ${farmDraft.name}\nCódigo: ${farmDraft.code}`;
                  setMessages((p) => [...p,
                    { id: `${Date.now()}-sum4`, role: "ai", text: "Actualicé tus respuestas. Este es el resumen:" },
                    { id: `${Date.now()}-sum5`, role: "ai", text: summary3 },
                    { id: `${Date.now()}-sum6`, role: "ai", text: "Confirma para continuar o dime si quieres editar algo más." },
                  ]);
                  speak("Actualicé tus respuestas. Revisa el resumen y confirma para continuar.");
                  setLocked(true);
                  return;
                }

                // reglas simples de validación/onboarding guiado
                const step = current;
                if (step === "org" && !alreadyHasOrg) {
                  if (text.length < 2) {
                    const msg = "Ese nombre es muy corto. Escribe el nombre completo de tu organización, por favor.";
                    setMessages((p) => [...p, { id: `${Date.now()}-ai1`, role: "ai", text: msg }]);
                    speak(msg);
                    return;
                  }
                  setOrgDraft({ name: text });
                  const msg2 = "¡Perfecto! Ahora dime el nombre de tu primera finca.";
                  setMessages((p) => [...p, { id: `${Date.now()}-ai2`, role: "ai", text: msg2 }]);
                  speak(msg2);
                  setCurrent("farm");
                  return;
                }
                if (step === "farm") {
                  if (!farmDraft.name) {
                    // primera respuesta será nombre
                    if (text.length < 2) {
                      const msg3 = "Ese nombre parece corto. ¿Cómo se llama tu finca?";
                      setMessages((p) => [...p, { id: `${Date.now()}-ai3`, role: "ai", text: msg3 }]);
                      speak(msg3);
                      return;
                    }
                    setFarmDraft((prev) => ({ ...prev, name: text }));
                    const msg4 = "Gracias. Ahora escribe el código de tu finca (ej. fn-mi-finca). Esto nos ayuda a identificarla de forma única.";
                    setMessages((p) => [...p, { id: `${Date.now()}-ai4`, role: "ai", text: msg4 }]);
                    speak(msg4);
                    return;
                  }
                  // segundo dato: código
                  const code = text.toLowerCase();
                  if (!/^fn-[a-z0-9-]{3,}$/.test(code)) {
                    const msg5 = "El código debe iniciar con fn- y usar solo letras, números y guiones. Inténtalo de nuevo.";
                    setMessages((p) => [...p, { id: `${Date.now()}-ai5`, role: "ai", text: msg5 }]);
                    speak(msg5);
                    return;
                  }
                  setFarmDraft((prev) => ({ ...prev, code }));
                  setCurrent("confirm");
                  // Resumen y bloqueo con acciones
                  const summary = `Organización: ${alreadyHasOrg ? (myOrgs?.[0]?.name ?? orgDraft.name) : orgDraft.name}\nFinca: ${farmDraft.name || "(pendiente)"}\nCódigo: ${code}`;
                  const nextMsgs: ChatMsg[] = [
                    ...messages,
                    { id: `${Date.now()}-ai6`, role: "ai", text: "Excelente. Este es el resumen de tu configuración:" },
                    { id: `${Date.now()}-ai7`, role: "ai", text: summary },
                    { id: `${Date.now()}-ai8`, role: "ai", text: "Si todo está bien, confirma para continuar. O dime qué deseas editar (organización, nombre o código de la finca)." },
                  ];
                  setMessages(nextMsgs);
                  speak("Excelente. Este es el resumen de tu configuración. Si todo está bien, confirma para continuar o dime qué deseas editar.");
                  setLocked(true);
                  return;
                }
                if (locked) {
                  // Edición guiada
                  const lower = text.toLowerCase();
                  if (/organ/i.test(lower)) {
                    setLocked(false);
                    setCurrent("org");
                    const msg9 = "Claro, ¿cuál es el nuevo nombre de tu organización?";
                    setMessages((p) => [...p, { id: `${Date.now()}-ai9`, role: "ai", text: msg9 }]);
                    speak(msg9);
                    return;
                  }
                  if (/finca|nombre/i.test(lower)) {
                    setLocked(false);
                    setCurrent("farm");
                    setFarmDraft((prev) => ({ ...prev, name: "" }));
                    const msg10 = "Entendido, escribe el nuevo nombre de tu finca.";
                    setMessages((p) => [...p, { id: `${Date.now()}-ai10`, role: "ai", text: msg10 }]);
                    speak(msg10);
                    return;
                  }
                  if (/c[oó]digo|code/i.test(lower)) {
                    setLocked(false);
                    setCurrent("farm");
                    const msg11 = "Escribe el nuevo código (ej. fn-mi-finca).";
                    setMessages((p) => [...p, { id: `${Date.now()}-ai11`, role: "ai", text: msg11 }]);
                    speak(msg11);
                    return;
                  }
                  const msg12 = "Sigamos enfocados en el onboarding. Dime si quieres editar organización, nombre de la finca o su código.";
                  setMessages((p) => [...p, { id: `${Date.now()}-ai12`, role: "ai", text: msg12 }]);
                  speak(msg12);
                }
              }}
              disabled={locked}
            >
              Enviar
            </Button>
            <Button
              aria-label={isListening ? "Detener micrófono" : "Hablar"}
              variant="flat"
              onPress={() => (isListening ? stopListening() : startListening())}
              disabled={locked}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              aria-label={voiceOn ? "Silenciar voz" : "Activar voz"}
              variant="light"
              onPress={() => setVoiceOn((v) => !v)}
            >
              <Volume2 className={`w-4 h-4 ${voiceOn ? "text-neutral-900" : "text-neutral-400"}`} />
            </Button>
            {locked && (
              <div className="flex gap-2">
                <Button color="primary" onPress={handleConfirmAndCreate} isLoading={createOrg.isPending || createFarm.isPending}>Confirmar y continuar</Button>
                <Button variant="flat" onPress={() => { setLocked(false); setMessages((p) => [...p, { id: `${Date.now()}-ai13`, role: "ai", text: "¿Qué deseas editar de tu información ingresada?" }]); }}>Seguir editando</Button>
              </div>
            )}
          </div>
        </div>

        {/* Bloque opcional: vinculación de dispositivo como isla aparte cuando current === "confirm" y no locked */}
        {current === "confirm" && !created && (
          <div className="mt-4 island p-4">
            <div className="text-sm font-medium mb-2">Vincular dispositivo (opcional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <Input type="password" label="Clave local (mín. 6)" placeholder="••••••" value={passA} onChange={(e) => setPassA((e.target as HTMLInputElement).value)} />
              <Input type="password" label="Confirmar clave" placeholder="••••••" value={passB} onChange={(e) => setPassB((e.target as HTMLInputElement).value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button asChild>
                <a href="/download" target="_blank" rel="noreferrer">Descargar app</a>
              </Button>
              <Button color="secondary" isLoading={registerDevice.isPending} onPress={() => handleLinkDevice(undefined)}>Vincular este dispositivo</Button>
            </div>
            {deviceLinked && <div className="mt-2 text-xs text-green-700">Dispositivo vinculado correctamente.</div>}
          </div>
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
