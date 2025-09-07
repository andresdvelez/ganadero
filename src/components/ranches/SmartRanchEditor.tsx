"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIInputBar } from "@/components/ai/ai-input-bar";
import { AIOrb, AIOrbState } from "@/components/ai/ai-orb";
import {
  Edit,
  Check,
  X,
  Sparkles,
  Mic,
  Calendar,
  Phone,
  MapPin,
  UserPlus,
  BarChart3,
  Brain,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { addToast } from "@/components/ui/toast";

interface SmartField {
  key: string;
  label: string;
  value: string | number | null;
  type: 'text' | 'phone' | 'date' | 'number' | 'select';
  section: 'contact' | 'breeder' | 'dates' | 'livestock';
  canAutoCalculate?: boolean;
  suggestions?: string[];
  voiceHints?: string[];
}

interface SmartRanchEditorProps {
  ranch: any;
  onUpdate: (field: string, value: any) => Promise<void>;
  onBulkUpdate: (updates: Record<string, any>) => Promise<void>;
}

export function SmartRanchEditor({ ranch, onUpdate, onBulkUpdate }: SmartRanchEditorProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [aiPrompt, setAIPrompt] = useState("");
  const [orbState, setOrbState] = useState<AIOrbState>("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceContext, setVoiceContext] = useState<string>("");
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'es-ES';
      recognitionInstance.maxAlternatives = 1;

      recognitionInstance.onstart = () => {
        setIsListening(true);
        setOrbState("listening");
        setVoiceContext("");
      };

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice recognition result:', transcript);
        setVoiceContext(`Escuché: "${transcript}"`);
        setAIPrompt(transcript);

        // Show immediate feedback
        addToast({
          variant: "info",
          title: "Procesando comando",
          description: `Analizando: "${transcript}"`
        });

        // Automatically process the voice command
        setTimeout(() => {
          processAICommand(transcript);
        }, 500);
      };

      recognitionInstance.onerror = (event: any) => {
        setIsListening(false);
        setOrbState("idle");
        setVoiceContext(`Error: ${event.error}`);

        addToast({
          variant: "warning",
          title: "Error de reconocimiento de voz",
          description: `No se pudo procesar el audio: ${event.error}`
        });
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        setOrbState("idle");
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // AI command processing with enhanced feedback
  const processAICommand = async (command: string) => {
    setIsProcessing(true);
    setOrbState("responding");

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Parse command and extract data updates
    const updates = parseVoiceCommand(command);

    if (Object.keys(updates).length > 0) {
      try {
        await onBulkUpdate(updates);
        addToast({
          variant: "success",
          title: "Datos actualizados",
          description: `Se actualizaron ${Object.keys(updates).length} campos: ${Object.keys(updates).join(', ')}`
        });
        setVoiceContext(`✅ Actualizado: ${Object.keys(updates).join(', ')}`);
      } catch (error) {
        addToast({
          variant: "warning",
          title: "Error al actualizar",
          description: "No se pudieron guardar los cambios"
        });
        setVoiceContext(`❌ Error al actualizar datos`);
      }
    } else {
      addToast({
        variant: "warning",
        title: "No se entendió el comando",
        description: "Intenta decir: 'El teléfono es 3123456789' o 'El criador es Juan Pérez'"
      });
      setVoiceContext(`❓ No se detectaron campos para actualizar`);
    }

    setIsProcessing(false);
    setOrbState("idle");
    setAIPrompt("");
  };

  // Enhanced command parsing with better voice pattern recognition
  const parseVoiceCommand = (command: string): Record<string, any> => {
    const updates: Record<string, any> = {};
    const lowerCommand = command.toLowerCase();
    console.log('Parsing command:', lowerCommand);

    // Phone number extraction - more flexible patterns
    const phonePatterns = [
      /(?:teléfono|telefono|número|numero).*?(\d{10,})/,
      /(?:el|mi)?\s*teléfono.*?es.*?(\d{10,})/,
      /(\d{10,})/  // Just numbers if nothing else matches
    ];

    for (const pattern of phonePatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        updates.phone = match[1];
        break;
      }
    }

    // Ranch phone extraction
    const ranchPhonePatterns = [
      /(?:teléfono|telefono).*?(?:hacienda|finca|rancho).*?(\d{10,})/,
      /(?:hacienda|finca|rancho).*?(?:teléfono|telefono).*?(\d{10,})/
    ];

    for (const pattern of ranchPhonePatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        updates.ranchPhone = match[1];
        break;
      }
    }

    // Breeder name extraction - more flexible patterns
    const breederPatterns = [
      /(?:criador|creador).*?es\s+(.+?)(?:\.|,|$|\s+y\s|\s+el\s)/,
      /(?:criador|creador).*?se\s+llama\s+(.+?)(?:\.|,|$|\s+y\s|\s+el\s)/,
      /(?:el|la)?\s*(?:criador|creador)\s+(.+?)(?:\.|,|$|\s+y\s|\s+el\s)/
    ];

    for (const pattern of breederPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        updates.breederName = match[1].trim();
        break;
      }
    }

    // NIT extraction
    const nitPatterns = [
      /(?:nit|número de identificación).*?(\d{6,}-?\d?)/,
      /(?:el|mi)?\s*nit.*?es.*?(\d{6,}-?\d?)/
    ];

    for (const pattern of nitPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        updates.nit = match[1];
        break;
      }
    }

    // Address extraction
    const addressPatterns = [
      /(?:dirección|direccion).*?es\s+(.+?)(?:\.|,|$|\s+y\s|\s+el\s)/,
      /(?:ubicado|ubicada|está|esta).*?en\s+(.+?)(?:\.|,|$|\s+y\s|\s+el\s)/,
      /(?:la|mi)?\s*dirección.*?(.+?)(?:\.|,|$|\s+y\s|\s+el\s)/
    ];

    for (const pattern of addressPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        updates.address = match[1].trim();
        break;
      }
    }

    // Date extraction - more flexible formats
    const datePatterns = [
      /(?:fecha.*?(?:inicio|comienzo)).*?(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(?:inicio|comenzó|empezó).*?(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{1,2}\/\d{1,2}\/\d{4})/  // Just date if nothing else matches
    ];

    for (const pattern of datePatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        try {
          const [day, month, year] = match[1].split('/');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          updates.startDate = date.toISOString();
        } catch (e) {
          // Ignore invalid dates
        }
        break;
      }
    }

    return updates;
  };

  const smartFields: SmartField[] = [
    // Contact Details
    { key: 'phone', label: 'Teléfono Principal', value: ranch.phone, type: 'phone', section: 'contact', voiceHints: ['teléfono principal', 'número de teléfono'] },
    { key: 'ranchPhone', label: 'Teléfono Hacienda', value: ranch.ranchPhone, type: 'phone', section: 'contact', voiceHints: ['teléfono hacienda', 'teléfono finca'] },
    { key: 'nit', label: 'Número NIT', value: ranch.nit, type: 'text', section: 'contact', voiceHints: ['NIT', 'número de identificación'] },
    { key: 'address', label: 'Dirección', value: ranch.address, type: 'text', section: 'contact' },
    { key: 'directions', label: '¿Cómo llegar?', value: ranch.directions, type: 'text', section: 'contact' },

    // Breeder Info
    { key: 'breederName', label: 'Nombre del Criador', value: ranch.breederName, type: 'text', section: 'breeder', voiceHints: ['criador', 'nombre del criador'] },

    // Dates
    { key: 'startDate', label: 'Fecha de Inicio', value: ranch.startDate, type: 'date', section: 'dates', voiceHints: ['fecha de inicio', 'fecha inicio'] },
    { key: 'lastVisitAt', label: 'Última Visita', value: ranch.lastVisitAt, type: 'date', section: 'dates', voiceHints: ['última visita', 'fecha visita'] },

    // Livestock (auto-calculated from database)
    { key: 'maleCount', label: 'Machos', value: ranch.maleCount, type: 'number', section: 'livestock', canAutoCalculate: true },
    { key: 'femaleCount', label: 'Hembras', value: ranch.femaleCount, type: 'number', section: 'livestock', canAutoCalculate: true },
  ];

  const startEditing = (field: SmartField) => {
    setActiveField(field.key);
    setEditingValue(field.value?.toString() || "");
  };

  const saveField = async () => {
    if (!activeField) return;

    await onUpdate(activeField, editingValue);
    setActiveField(null);
    setEditingValue("");

    addToast({
      variant: "success",
      title: "Campo actualizado",
      description: "Los datos se guardaron correctamente"
    });
  };

  const cancelEditing = () => {
    setActiveField(null);
    setEditingValue("");
  };

  const handleVoiceToggle = () => {
    if (!recognition) {
      addToast({
        variant: "warning",
        title: "Reconocimiento de voz no disponible",
        description: "Tu navegador no soporta reconocimiento de voz o necesita permisos de micrófono"
      });
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (error) {
        addToast({
          variant: "warning",
          title: "Error al iniciar reconocimiento",
          description: "Asegúrate de haber dado permisos de micrófono"
        });
      }
    }
  };

  const SmartFieldComponent = ({ field }: { field: SmartField }) => {
    const isEditing = activeField === field.key;
    const isEmpty = !field.value;

    return (
      <motion.div
        layout
        className={cn(
          "bg-gray-50 rounded-lg p-4 border transition-all duration-200",
          isEditing && "border-blue-300 bg-blue-50/50",
          isEmpty && "border-dashed border-gray-300 bg-gray-50/50"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            {field.canAutoCalculate && <Brain className="h-4 w-4 text-blue-500" />}
            {field.label}
          </label>
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEditing(field)}
              className="h-6 w-6 p-0 hover:bg-blue-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <input
              type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              placeholder={`Ingrese ${field.label.toLowerCase()}`}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveField} className="h-7 px-2">
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEditing} className="h-7 px-2">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className={cn(
              "text-lg font-medium",
              isEmpty ? "text-gray-400 italic" : "text-gray-900"
            )}>
              {field.value || "Sin especificar"}
            </p>
            {field.canAutoCalculate && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs text-blue-600 hover:bg-blue-100"
                onClick={() => addToast({
                  variant: "info",
                  title: "Cálculo automático",
                  description: "Este valor se calcula automáticamente desde la base de datos"
                })}
              >
                <Zap className="h-3 w-3 mr-1" />
                Auto
              </Button>
            )}
          </div>
        )}

        {field.voiceHints && (
          <div className="mt-2 text-xs text-gray-500">
            <Mic className="h-3 w-3 inline mr-1" />
            Di: "{field.voiceHints.join('" o "')}"
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* AI Assistant Toggle */}
      <Card className="border-gradient-to-r from-purple-200 to-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Asistente IA para Fincas</CardTitle>
                <p className="text-sm text-gray-600">
                  Actualiza datos usando comandos de voz o texto natural
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <AIOrb
                  state={orbState}
                  size={120}
                  onMicToggle={handleVoiceToggle}
                  className="shrink-0"
                />
                <div className="flex-1 w-full">
                  <AIInputBar
                    value={aiPrompt}
                    onChange={setAIPrompt}
                    onSend={() => processAICommand(aiPrompt)}
                    onMic={handleVoiceToggle}
                    isListening={isListening}
                    disabled={isProcessing}
                    placeholder="Ej: 'El teléfono es 3123456789, el criador es Juan Pérez'"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Comandos de ejemplo:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                  <div>• "El teléfono es 3123456789"</div>
                  <div>• "El criador es Juan Pérez"</div>
                  <div>• "La fecha de inicio es 15/01/2024"</div>
                  <div>• "El NIT es 900123456-7"</div>
                  <div>• "La dirección es Calle 123"</div>
                  <div>• "El teléfono de la hacienda es 3009876543"</div>
                </div>
              </div>

              {voiceContext && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">🎤 {voiceContext}</p>
                </div>
              )}
            </CardContent>
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Detalles de Contacto</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {smartFields.filter(f => f.section === 'contact').map(field => (
              <SmartFieldComponent key={field.key} field={field} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Breeder Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <UserPlus className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Información del Criador</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {smartFields.filter(f => f.section === 'breeder').map(field => (
              <SmartFieldComponent key={field.key} field={field} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dates and Visits */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Visitantes y Fechas Importantes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {smartFields.filter(f => f.section === 'dates').map(field => (
              <SmartFieldComponent key={field.key} field={field} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Livestock Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Existencias y U.G.G.</CardTitle>
            <div className="ml-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addToast({
                  variant: "info",
                  title: "Recálculo automático",
                  description: "Los datos de ganado se actualizarán automáticamente desde la base de datos"
                })}
              >
                <Brain className="h-4 w-4 mr-2" />
                Recalcular
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Stats - Display Only */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{ranch.maleCount || 0}</div>
              <div className="text-sm text-blue-700 font-medium">Machos</div>
              <div className="text-xs text-blue-600 mt-1 flex items-center justify-center gap-1">
                <Brain className="h-3 w-3" />
                Auto-calculado
              </div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="text-3xl font-bold text-pink-600">{ranch.femaleCount || 0}</div>
              <div className="text-sm text-pink-700 font-medium">Hembras</div>
              <div className="text-xs text-pink-600 mt-1 flex items-center justify-center gap-1">
                <Brain className="h-3 w-3" />
                Auto-calculado
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl font-bold text-purple-600">{ranch.uggValue || 0}</div>
              <div className="text-sm text-purple-700 font-medium">Total U.G.G.</div>
              <div className="text-xs text-purple-600 mt-1 flex items-center justify-center gap-1">
                <Brain className="h-3 w-3" />
                Auto-calculado
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-bold text-green-600">
                {ranch.uggAsOf
                  ? new Date(ranch.uggAsOf).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })
                  : "Sin calcular"}
              </div>
              <div className="text-sm text-green-700 font-medium">Último Cálculo U.G.G.</div>
              <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Actualizado hoy
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}