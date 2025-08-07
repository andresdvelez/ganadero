"use client";

import { motion } from "framer-motion";
import { Mic, Pause, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type AIOrbState = "idle" | "listening" | "responding";

interface AIOrbProps {
  state?: AIOrbState;
  size?: number; // px
  className?: string;
  onMicToggle?: () => void;
}

/**
 * A futuristic glowing orb that reacts to assistant state.
 * - idle: subtle float + soft glow
 * - listening: pulsing ring + stronger glow
 * - responding: slow spin with traveling highlights
 */
export function AIOrb({ state = "idle", size = 220, className, onMicToggle }: AIOrbProps) {
  const intensity = useMemo(() => ({
    idle: 0.35,
    listening: 0.65,
    responding: 0.55,
  } as const)[state], [state]);

  return (
    <div className={cn("relative select-none", className)} style={{ width: size, height: size }}>
      {/* Soft outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(168,85,247,.45) 0%, rgba(59,130,246,.28) 35%, transparent 70%)" }}
        animate={{ opacity: [0.6 * intensity, 0.85 * intensity, 0.6 * intensity], scale: [1, 1.05, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orb base */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Core gradient */}
        <div className="absolute inset-0 rounded-full"
             style={{ background: "radial-gradient(65% 65% at 50% 40%, #e9d5ff 0%, #a78bfa 35%, #7c3aed 60%, #3b82f6 100%)" }} />
        {/* Sweeping highlights */}
        <motion.div
          className="absolute -inset-12 rounded-full opacity-70"
          style={{ background: "conic-gradient(from 0deg, rgba(255,255,255,.15), rgba(255,255,255,0) 30%, rgba(255,255,255,.2) 60%, rgba(255,255,255,0) 85%, rgba(255,255,255,.15))" }}
          animate={{ rotate: state === "responding" ? 360 : 140 }}
          transition={{ duration: state === "responding" ? 6 : 9, repeat: Infinity, ease: "linear" }}
        />
        {/* Bands */}
        <motion.div
          className="absolute inset-[10%] rounded-full"
          style={{
            background: `radial-gradient(40% 30% at 50% 40%, rgba(255,255,255,.6) 0%, rgba(255,255,255,0) 70%),
               radial-gradient(30% 25% at 60% 70%, rgba(255,255,255,.4) 0%, rgba(255,255,255,0) 70%)`,
            mixBlendMode: "screen",
          }}
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full mix-blend-screen"
             style={{ background: "radial-gradient(35% 35% at 50% 60%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 70%)" }} />
      </motion.div>

      {/* Listening ring */}
      <motion.div
        className="absolute -inset-3 rounded-full border-2"
        style={{ borderColor: "rgba(168,85,247,.6)" }}
        initial={false}
        animate={ state === "listening" ? { opacity: [0.35, 0.9, 0.35], scale: [1, 1.07, 1] } : { opacity: 0.15, scale: 1 }}
        transition={{ duration: 1.6, repeat: state === "listening" ? Infinity : 0, ease: "easeInOut" }}
      />

      {/* Orbiting particles */}
      {[0,1,2,3,4].map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{ background: "#f0abfc", left: "50%", top: "50%" }}
          animate={{
            x: [Math.cos(i) * (size * 0.45), Math.cos(i + Math.PI) * (size * 0.45), Math.cos(i) * (size * 0.45)],
            y: [Math.sin(i) * (size * 0.18), Math.sin(i + Math.PI) * (size * 0.18), Math.sin(i) * (size * 0.18)],
            opacity: [0.7, 0.25, 0.7],
            scale: [1, 0.8, 1],
          }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Center icon hint */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Sparkles className="w-8 h-8 text-white/95 drop-shadow" />
      </div>

      {/* Mic control */}
      {onMicToggle && (
        <button
          aria-label="Alternar micrófono"
          onClick={onMicToggle}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/90 border border-white/30 shadow-md backdrop-blur hover:shadow-lg text-violet-700 text-sm flex items-center gap-1"
        >
          {state === "listening" ? <Pause className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{state === "listening" ? "Escuchando" : "Hablar"}</span>
        </button>
      )}
    </div>
  );
} 