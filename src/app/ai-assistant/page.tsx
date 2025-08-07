"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TRPCProvider } from "@/lib/trpc/provider";
import { translations } from "@/lib/constants/translations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAIClient } from "@/services/ai/ollama-client";
import { Send, Mic, MicOff, Loader2, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { moduleRegistry } from "@/modules";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  module?: string;
  action?: string;
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

  // Sample commands for quick actions
  const sampleCommands = [
    "Agregar una vaca nueva",
    "Ver animales que necesitan vacunación",
    "Registrar un parto",
    "Generar reporte mensual",
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
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
                    style={{
                      minHeight: "40px",
                      maxHeight: "120px",
                    }}
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
