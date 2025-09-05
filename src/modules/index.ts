export interface RanchModule {
  id: string;
  name: string;
  category?: string; // e.g., "Productividad", "Salud", "Administración", "Integración"
  tags?: string[]; // keywords to enhance search in launcher
  path?: string; // route path to list view
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
    path: "/animals",
    tags: ["inventario vivo", "ganado", "registro"],
    actions: {
      list: {
        label: "Ver animales",
        async run() {
          return { navigateTo: "/animals" };
        },
      },
      create: {
        label: "Agregar animal",
        async run() {
          return { navigateTo: "/animals/new" };
        },
      },
    },
  },
  health: {
    id: "health",
    name: "Salud",
    category: "Salud y Reproducción",
    path: "/health",
    tags: ["vacunación", "tratamientos", "desparasitación"],
    actions: {
      list: {
        label: "Ver salud",
        async run() {
          return { navigateTo: "/health" };
        },
      },
      create: {
        label: "Agregar registro de salud",
        async run() {
          return { navigateTo: "/health/new" };
        },
      },
    },
  },
  breeding: {
    id: "breeding",
    name: "Reproducción",
    category: "Salud y Reproducción",
    path: "/breeding",
    tags: ["partos", "montas", "inseminación"],
    actions: {
      list: {
        label: "Ver reproducción",
        async run() {
          return { navigateTo: "/breeding" };
        },
      },
      create: {
        label: "Nuevo evento",
        async run() {
          return { navigateTo: "/breeding/new" };
        },
      },
    },
  },
  inventory: {
    id: "inventory",
    name: "Inventario",
    category: "Administración",
    path: "/inventory",
    tags: ["productos", "bodega", "stock"],
    actions: {
      list: {
        label: "Ver inventario",
        async run() {
          return { navigateTo: "/inventory" };
        },
      },
      create: {
        label: "Nuevo producto",
        async run() {
          return { navigateTo: "/inventory/new" };
        },
      },
    },
  },
  finance: {
    id: "finance",
    name: "Finanzas",
    category: "Administración",
    path: "/finance",
    tags: ["costos", "ingresos", "egresos"],
    actions: {
      list: {
        label: "Ver finanzas",
        async run() {
          return { navigateTo: "/finance" };
        },
      },
      create: {
        label: "Registrar transacción",
        async run() {
          return { navigateTo: "/finance/new" };
        },
      },
    },
  },
  reports: {
    id: "reports",
    name: "Reportes",
    category: "Administración",
    path: "/reports",
    tags: ["informes", "exportar"],
    actions: {
      list: {
        label: "Ver reportes",
        async run() {
          return { navigateTo: "/reports" };
        },
      },
    },
  },
  pastures: {
    id: "pastures",
    name: "Potreros",
    category: "Productividad",
    path: "/pastures",
    tags: ["rotación", "forraje", "mapa"],
    actions: {
      list: {
        label: "Ver potreros",
        async run() {
          return { navigateTo: "/pastures" };
        },
      },
      create: {
        label: "Nuevo potrero",
        async run() {
          return { navigateTo: "/pastures/new" };
        },
      },
    },
  },
  weather: {
    id: "weather",
    name: "Clima",
    category: "Integración",
    path: "/weather",
    tags: ["pronóstico", "estación"],
    actions: {
      list: {
        label: "Ver clima",
        async run() {
          return { navigateTo: "/weather" };
        },
      },
    },
  },
  tasks: {
    id: "tasks",
    name: "Tareas",
    category: "Productividad",
    path: "/tasks",
    tags: ["pendientes", "gestión"],
    actions: {
      list: {
        label: "Ver tareas",
        async run() {
          return { navigateTo: "/tasks" };
        },
      },
      create: {
        label: "Crear tarea",
        async run() {
          return { navigateTo: "/tasks/new" };
        },
      },
    },
  },
  milk: {
    id: "milk",
    name: "Lechería",
    category: "Productividad",
    path: "/milk",
    tags: ["producción", "control lechero"],
    actions: {
      list: {
        label: "Control lechero",
        async run() {
          return { navigateTo: "/milk" };
        },
      },
      create: {
        label: "Nuevo registro",
        async run() {
          return { navigateTo: "/milk/new" };
        },
      },
    },
  },
  lab: {
    id: "lab",
    name: "Laboratorio",
    category: "Integración",
    path: "/lab",
    tags: ["exámenes", "muestreo"],
    actions: {
      list: {
        label: "Ver exámenes",
        async run() {
          return { navigateTo: "/lab" };
        },
      },
      create: {
        label: "Nuevo examen",
        async run() {
          return { navigateTo: "/lab/new" };
        },
      },
    },
  },
  sensors: {
    id: "sensors",
    name: "Sensores",
    category: "Integración",
    path: "/sensors",
    tags: ["iot", "telemetría"],
    actions: {
      list: {
        label: "Ver sensores",
        async run() {
          return { navigateTo: "/sensors" };
        },
      },
    },
  },
  locations: {
    id: "locations",
    name: "Ubicaciones",
    category: "Administración",
    path: "/locations",
    tags: ["georreferenciación", "mapas"],
    actions: {
      list: {
        label: "Ver ubicaciones",
        async run() {
          return { navigateTo: "/locations" };
        },
      },
    },
  },
  ranches: {
    id: "ranches",
    name: "Haciendas",
    category: "Administración",
    path: "/ranches",
    tags: ["fincas", "propiedades", "gestión"],
    actions: {
      list: {
        label: "Ver haciendas",
        async run() {
          return { navigateTo: "/ranches" };
        },
      },
      create: {
        label: "Nueva hacienda",
        async run() {
          return { navigateTo: "/ranches/new" };
        },
      },
    },
  },
};
