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
    ],
  },
  {
    id: "pastures",
    name: "Potreros",
    category: "Productividad",
    description: "Potreros, áreas y ocupación para rotación.",
    tags: ["pastoreo", "praderas", "rotación", "forraje", "lotes"],
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
