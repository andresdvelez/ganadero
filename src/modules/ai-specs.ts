export interface AIModuleActionSpec {
  id: string; // e.g. "list", "create"
  label: string;
  description?: string;
  // Keywords/patterns that indicate this action in natural language
  patterns?: string[]; // plain tokens, accents stripped during match
  // Example commands the user might say
  examples?: string[];
  // Optional parameter descriptors to help LLM structure data
  params?: Array<{
    name: string;
    type: "string" | "number" | "date" | "boolean";
    required?: boolean;
    description?: string;
  }>;
}

export interface AIModuleSpec {
  id: string; // route-safe id (matches moduleRegistry key when possible)
  name: string; // human friendly
  category?: string;
  description?: string;
  tags?: string[]; // synonyms/keywords for matching
  actions: AIModuleActionSpec[];
}

// Helper keyword sets for common actions (es-CO)
const ACTION_PATTERNS = {
  list: ["ver", "listar", "mostrar", "abrir", "consultar", "ir a", "revisar"],
  create: [
    "crear",
    "registrar",
    "agregar",
    "añadir",
    "nuevo",
    "cargar",
    "ingresar",
  ],
};

export const aiModuleSpecs: AIModuleSpec[] = [
  {
    id: "animals",
    name: "Animales",
    category: "Productividad",
    description:
      "Gestión de inventario vivo: identificación, altas/bajas, trazabilidad.",
    tags: ["ganado", "vacas", "novillos", "terneros", "arete", "aretes"],
    actions: [
      {
        id: "list",
        label: "Ver animales",
        patterns: ACTION_PATTERNS.list,
        examples: [
          "Ver mis animales",
          "Listar el inventario de ganado",
          "Mostrar las vacas",
        ],
      },
      {
        id: "create",
        label: "Registrar animal",
        patterns: ACTION_PATTERNS.create,
        examples: [
          "Registrar un nuevo animal",
          "Agregar una vaca",
          "Añadir ternero nuevo",
        ],
        params: [
          { name: "tagNumber", type: "string", description: "Arete o placa" },
          { name: "name", type: "string" },
          { name: "sex", type: "string" },
          { name: "breed", type: "string" },
          { name: "birthDate", type: "date" },
          { name: "weight", type: "number" },
        ],
      },
    ],
  },
  {
    id: "health",
    name: "Salud",
    category: "Salud y Reproducción",
    description:
      "Vacunas, tratamientos, desparasitaciones, eventos sanitarios.",
    tags: [
      "vacunación",
      "vacuna",
      "tratamiento",
      "desparasitación",
      "medicación",
      "enfermedad",
      "veterinario",
    ],
    actions: [
      {
        id: "list",
        label: "Ver salud",
        patterns: ACTION_PATTERNS.list,
        examples: ["Ver calendarios de salud", "Listar tratamientos"],
      },
      {
        id: "create",
        label: "Registrar evento de salud",
        patterns: ACTION_PATTERNS.create,
        examples: [
          "Registrar vacuna aftosa",
          "Agregar desparasitación",
          "Añadir tratamiento de mastitis",
        ],
        params: [
          { name: "animalTag", type: "string" },
          { name: "type", type: "string" },
          { name: "medication", type: "string" },
          { name: "dosage", type: "string" },
          { name: "performedAt", type: "date" },
        ],
      },
    ],
  },
  {
    id: "breeding",
    name: "Reproducción",
    category: "Salud y Reproducción",
    description: "Ciclos, inseminaciones, chequeos de preñez, partos.",
    tags: ["calor", "celo", "servicio", "inseminación", "preñez", "parto"],
    actions: [
      {
        id: "list",
        label: "Ver reproducción",
        patterns: ACTION_PATTERNS.list,
        examples: ["Ver servicios", "Listar partos"],
      },
      {
        id: "create",
        label: "Registrar evento reproductivo",
        patterns: ACTION_PATTERNS.create,
        examples: ["Registrar inseminación", "Agregar parto"],
        params: [
          { name: "animalTag", type: "string" },
          { name: "eventType", type: "string" },
          { name: "eventDate", type: "date" },
          { name: "sire", type: "string" },
        ],
      },
    ],
  },
  {
    id: "milk",
    name: "Lechería",
    category: "Productividad",
    description: "Control lechero: litros, sólidos, eventos.",
    tags: ["ordeño", "litros", "control lechero", "grasa", "proteína"],
    actions: [
      {
        id: "list",
        label: "Ver control lechero",
        patterns: ACTION_PATTERNS.list,
        examples: ["Ver registros de ordeño", "Listar producción de leche"],
      },
      {
        id: "create",
        label: "Registrar ordeño",
        patterns: ACTION_PATTERNS.create,
        examples: ["Registrar 18 litros para la vaca 101"],
        params: [
          { name: "animalTag", type: "string" },
          { name: "session", type: "string" },
          { name: "liters", type: "number" },
          { name: "recordedAt", type: "date" },
        ],
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventario",
    category: "Administración",
    description: "Productos, bodegas y movimientos de stock.",
    tags: ["bodega", "insumos", "producto", "stock", "salida", "entrada"],
    actions: [
      { id: "list", label: "Ver inventario", patterns: ACTION_PATTERNS.list },
      {
        id: "create",
        label: "Crear producto",
        patterns: ACTION_PATTERNS.create,
        params: [
          { name: "code", type: "string" },
          { name: "name", type: "string" },
          { name: "unit", type: "string" },
        ],
      },
      {
        id: "movement",
        label: "Registrar movimiento de stock",
        patterns: [
          ...ACTION_PATTERNS.create,
          "entrada",
          "salida",
          "ajuste",
          "agregar stock",
          "sacar stock",
          "registrar stock",
        ],
        params: [
          { name: "productCode", type: "string" },
          { name: "type", type: "string" },
          { name: "quantity", type: "number" },
          { name: "unitCost", type: "number" },
          { name: "occurredAt", type: "date" },
        ],
      },
    ],
  },
  {
    id: "tasks",
    name: "Tareas",
    category: "Productividad",
    description: "Planificación y seguimiento de tareas en la finca.",
    tags: ["pendientes", "actividad", "recordatorio"],
    actions: [
      { id: "list", label: "Ver tareas", patterns: ACTION_PATTERNS.list },
      { id: "create", label: "Crear tarea", patterns: ACTION_PATTERNS.create },
    ],
  },
  {
    id: "finance",
    name: "Finanzas",
    category: "Administración",
    description: "Costos, ingresos y egresos.",
    tags: ["costos", "ingresos", "egresos", "flujo"],
    actions: [
      { id: "list", label: "Ver finanzas", patterns: ACTION_PATTERNS.list },
      {
        id: "create",
        label: "Registrar transacción",
        patterns: ACTION_PATTERNS.create,
      },
    ],
  },
  {
    id: "reports",
    name: "Reportes",
    category: "Administración",
    description: "Informes operativos y productivos.",
    tags: ["informe", "exportar", "PDF"],
    actions: [
      { id: "list", label: "Ver reportes", patterns: ACTION_PATTERNS.list },
    ],
  },
  {
    id: "sensors",
    name: "Sensores",
    category: "Integración",
    description: "Lecturas IoT y telemetría.",
    tags: ["iot", "temperatura", "humedad", "collares"],
    actions: [
      { id: "list", label: "Ver sensores", patterns: ACTION_PATTERNS.list },
      {
        id: "create",
        label: "Agregar sensor",
        patterns: ACTION_PATTERNS.create,
      },
    ],
  },
  {
    id: "weather",
    name: "Clima",
    category: "Integración",
    description: "Pronóstico y estación meteorológica.",
    tags: ["pronóstico", "THI", "HLI"],
    actions: [
      { id: "list", label: "Ver clima", patterns: ACTION_PATTERNS.list },
    ],
  },
  {
    id: "locations",
    name: "Ubicaciones",
    category: "Administración",
    description: "Georreferenciación y mapas de la finca.",
    tags: ["mapas", "georreferenciación", "potreros"],
    actions: [
      { id: "list", label: "Ver ubicaciones", patterns: ACTION_PATTERNS.list },
      {
        id: "create",
        label: "Crear ubicación",
        patterns: ACTION_PATTERNS.create,
      },
    ],
  },
  {
    id: "alerts",
    name: "Alertas",
    category: "Administración",
    description: "Alertas configurables por métricas y eventos.",
    tags: ["alertas", "notificaciones"],
    actions: [
      { id: "list", label: "Ver alertas", patterns: ACTION_PATTERNS.list },
      { id: "create", label: "Crear alerta", patterns: ACTION_PATTERNS.create },
    ],
  },
  {
    id: "devices",
    name: "Dispositivos",
    category: "Integración",
    description: "Básculas, lectores RFID y otros equipos.",
    tags: ["básculas", "rfid", "equipo"],
    actions: [
      { id: "list", label: "Ver dispositivos", patterns: ACTION_PATTERNS.list },
      {
        id: "create",
        label: "Agregar dispositivo",
        patterns: ACTION_PATTERNS.create,
      },
    ],
  },
  {
    id: "pastures",
    name: "Potreros",
    category: "Productividad",
    description:
      "Pasturas y Nutrición: potreros, áreas y ocupación para rotación.",
    tags: [
      "pastura",
      "pasturas",
      "potrero",
      "potreros",
      "pastoreo",
      "praderas",
      "rotación",
      "forraje",
      "lotes",
      "nutricion",
      "nutrición",
    ],
    actions: [
      { id: "list", label: "Ver potreros", patterns: ACTION_PATTERNS.list },
      {
        id: "create",
        label: "Crear potrero",
        patterns: ACTION_PATTERNS.create,
      },
    ],
  },
  {
    id: "lab",
    name: "Laboratorio",
    category: "Integración",
    description: "Muestras, exámenes y resultados de laboratorio.",
    tags: ["examen", "muestra", "lab", "antibiograma"],
    actions: [
      { id: "list", label: "Ver exámenes", patterns: ACTION_PATTERNS.list },
      {
        id: "create",
        label: "Solicitar examen",
        patterns: ACTION_PATTERNS.create,
      },
    ],
  },
];

export type AIModuleId = (typeof aiModuleSpecs)[number]["id"];
