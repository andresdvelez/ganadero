export interface RanchModule {
  id: string;
  name: string;
  category?: string; // e.g., "Productividad", "Salud", "Administración", "Integración"
  tags?: string[]; // keywords to enhance search in launcher
  actions: Record<
    string,
    {
      label: string;
      run: (params?: any) => Promise<{ navigateTo?: string; message?: string }>;
    }
  >;
}

export const moduleRegistry: Record<string, RanchModule> = {
  animals: {
    id: "animals",
    name: "Animales",
    category: "Productividad",
    tags: ["inventario vivo", "ganado", "registro"],
    actions: {
      list: {
        label: "Ver animales",
        async run() {
          return { navigateTo: "/_" };
        },
      },
      create: {
        label: "Agregar animal",
        async run() {
          return { navigateTo: "/_/new" };
        },
      },
    },
  },
  health: {
    id: "health",
    name: "Salud",
    category: "Salud y Reproducción",
    tags: ["vacunación", "tratamientos", "desparasitación"],
    actions: {
      list: {
        label: "Ver salud",
        async run() {
          return { navigateTo: "/_/health" };
        },
      },
      create: {
        label: "Agregar registro de salud",
        async run() {
          return { navigateTo: "/_/health/new" };
        },
      },
    },
  },
  breeding: {
    id: "breeding",
    name: "Reproducción",
    category: "Salud y Reproducción",
    tags: ["partos", "montas", "inseminación"],
    actions: {
      list: {
        label: "Ver reproducción",
        async run() {
          return { navigateTo: "/_/breeding" };
        },
      },
      create: {
        label: "Nuevo evento",
        async run() {
          return { navigateTo: "/_/breeding/new" };
        },
      },
    },
  },
  inventory: {
    id: "inventory",
    name: "Inventario",
    category: "Administración",
    tags: ["productos", "bodega", "stock"],
    actions: {
      list: {
        label: "Ver inventario",
        async run() {
          return { navigateTo: "/_/inventory" };
        },
      },
      create: {
        label: "Nuevo producto",
        async run() {
          return { navigateTo: "/_/inventory/new" };
        },
      },
    },
  },
  finance: {
    id: "finance",
    name: "Finanzas",
    category: "Administración",
    tags: ["costos", "ingresos", "egresos"],
    actions: {},
  },
  reports: {
    id: "reports",
    name: "Reportes",
    category: "Administración",
    tags: ["informes", "exportar"],
    actions: {},
  },
  pastures: {
    id: "pastures",
    name: "Potreros",
    category: "Productividad",
    tags: ["rotación", "forraje", "mapa"],
    actions: {
      list: {
        label: "Ver potreros",
        async run() {
          return { navigateTo: "/_/pastures" };
        },
      },
      create: {
        label: "Nuevo potrero",
        async run() {
          return { navigateTo: "/_/pastures/new" };
        },
      },
    },
  },
  weather: {
    id: "weather",
    name: "Clima",
    category: "Integración",
    tags: ["pronóstico", "estación"],
    actions: {},
  },
  tasks: {
    id: "tasks",
    name: "Tareas",
    category: "Productividad",
    tags: ["pendientes", "gestión"],
    actions: {},
  },
  milk: {
    id: "milk",
    name: "Lechería",
    category: "Productividad",
    tags: ["producción", "control lechero"],
    actions: {
      list: {
        label: "Control lechero",
        async run() {
          return { navigateTo: "/_/milk" };
        },
      },
      create: {
        label: "Nuevo registro",
        async run() {
          return { navigateTo: "/_/milk/new" };
        },
      },
    },
  },
  lab: {
    id: "lab",
    name: "Laboratorio",
    category: "Integración",
    tags: ["exámenes", "muestreo"],
    actions: {
      list: {
        label: "Ver exámenes",
        async run() {
          return { navigateTo: "/_/lab" };
        },
      },
      create: {
        label: "Nuevo examen",
        async run() {
          return { navigateTo: "/_/lab/new" };
        },
      },
    },
  },
  sensors: {
    id: "sensors",
    name: "Sensores",
    category: "Integración",
    tags: ["iot", "telemetría"],
    actions: {},
  },
  locations: {
    id: "locations",
    name: "Ubicaciones",
    category: "Administración",
    tags: ["georreferenciación", "mapas"],
    actions: {},
  },
};
