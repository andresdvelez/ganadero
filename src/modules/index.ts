export interface RanchModule {
  id: string;
  name: string;
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
  finance: { id: "finance", name: "Finanzas", actions: {} },
  reports: { id: "reports", name: "Reportes", actions: {} },
  pastures: {
    id: "pastures",
    name: "Potreros",
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
  weather: { id: "weather", name: "Clima", actions: {} },
  tasks: { id: "tasks", name: "Tareas", actions: {} },
  milk: {
    id: "milk",
    name: "Lechería",
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
  sensors: { id: "sensors", name: "Sensores", actions: {} },
  locations: { id: "locations", name: "Ubicaciones", actions: {} },
};
