"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AIBubbleProps {
  onClose?: () => void;
}

export function AIBubble({ onClose }: AIBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setMessage("");
    setIsThinking(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Entiendo tu consulta. ¿En qué más puedo ayudarte?",
        },
      ]);
      setIsThinking(false);
    }, 1200);
  };

  const handleVoiceInput = () => {
    setIsListening((v) => !v);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      {!isExpanded && (
        <Button
          onPress={() => setIsExpanded(true)}
          className="island px-3 py-2 flex items-center gap-2"
          aria-label="Abrir asistente"
        >
          <Sparkles className="w-5 h-5 text-primary-purple" />
          <span>Asistente</span>
        </Button>
      )}

      {/* Expanded Chat */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="island w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-200/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-full grid place-items-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="font-medium">Asistente IA</div>
              </div>
              <Button
                onPress={() => setIsExpanded(false)}
                isIconOnly
                aria-label="Cerrar asistente"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </Button>
            </div>

            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center text-neutral-500 text-sm">
                  Escribe tu mensaje para comenzar
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm",
                        msg.role === "user"
                          ? "bg-gradient-primary text-white"
                          : "bg-neutral-100"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isThinking && (
                <div className="text-sm text-neutral-500">Pensando…</div>
              )}
            </div>

            <div className="p-3 border-t border-neutral-200/50 flex gap-2">
              <Button
                onPress={handleVoiceInput}
                className={cn(
                  "p-2 rounded-lg",
                  isListening
                    ? "bg-gradient-primary text-white"
                    : "bg-neutral-100 text-neutral-600"
                )}
                aria-label={
                  isListening ? "Desactivar micrófono" : "Activar micrófono"
                }
              >
                <Mic className="w-5 h-5" />
              </Button>
              <Input
                ref={inputRef as any}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Escribe tu mensaje..."
                className="flex-1"
              />
              <Button onPress={handleSend} className={cn("p-2 rounded-lg", message.trim() ? "bg-gradient-primary text-white" : "bg-neutral-100 text-neutral-400")} aria-label="Enviar mensaje">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
