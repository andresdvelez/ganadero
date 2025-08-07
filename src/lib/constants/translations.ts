// Traducciones en español para la aplicación Ganado AI

export const translations = {
  // Common
  common: {
    loading: "Cargando...",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    add: "Agregar",
    search: "Buscar",
    filter: "Filtrar",
    export: "Exportar",
    import: "Importar",
    close: "Cerrar",
    confirm: "Confirmar",
    back: "Volver",
    next: "Siguiente",
    previous: "Anterior",
    yes: "Sí",
    no: "No",
    all: "Todos",
    none: "Ninguno",
    select: "Seleccionar",
    noData: "Sin datos disponibles",
    error: "Error",
    success: "Éxito",
    warning: "Advertencia",
    info: "Información",
  },

  // Navigation
  navigation: {
    dashboard: "Panel Principal",
    animals: "Animales",
    health: "Salud",
    breeding: "Reproducción",
    pastures: "Potreros",
    inventory: "Inventario",
    finance: "Finanzas",
    reports: "Reportes",
    settings: "Configuración",
    profile: "Perfil",
    logout: "Cerrar Sesión",
    help: "Ayuda",
    notifications: "Notificaciones",
  },

  // Animals Module
  animals: {
    title: "Gestión de Animales",
    addAnimal: "Agregar Animal",
    editAnimal: "Editar Animal",
    deleteAnimal: "Eliminar Animal",
    animalDetails: "Detalles del Animal",
    animalList: "Lista de Animales",
    totalAnimals: "Total de Animales",

    // Animal Fields
    name: "Nombre",
    tagNumber: "Número de Etiqueta",
    species: "Especie",
    breed: "Raza",
    sex: "Sexo",
    birthDate: "Fecha de Nacimiento",
    age: "Edad",
    weight: "Peso",
    color: "Color",
    status: "Estado",
    mother: "Madre",
    father: "Padre",
    location: "Ubicación",
    qrCode: "Código QR",
    nfcTag: "Etiqueta NFC",

    // Species
    cattle: "Bovino",
    sheep: "Ovino",
    goat: "Caprino",
    pig: "Porcino",
    horse: "Equino",

    // Sex
    male: "Macho",
    female: "Hembra",

    // Status
    active: "Activo",
    sold: "Vendido",
    deceased: "Fallecido",
    pregnant: "Preñada",
    lactating: "En Lactancia",
    dry: "Seca",

    // Messages
    animalAdded: "Animal agregado exitosamente",
    animalUpdated: "Animal actualizado exitosamente",
    animalDeleted: "Animal eliminado exitosamente",
    confirmDelete: "¿Está seguro de eliminar este animal?",
  },

  // Health Module
  health: {
    title: "Gestión de Salud",
    addRecord: "Agregar Registro",
    healthHistory: "Historial de Salud",
    vaccination: "Vacunación",
    treatment: "Tratamiento",
    deworming: "Desparasitación",
    checkup: "Revisión",

    // Fields
    type: "Tipo",
    date: "Fecha",
    description: "Descripción",
    medication: "Medicamento",
    dosage: "Dosis",
    veterinarian: "Veterinario",
    cost: "Costo",
    notes: "Notas",
    nextDueDate: "Próxima Fecha",

    // Messages
    recordAdded: "Registro de salud agregado",
    upcomingVaccinations: "Vacunaciones Próximas",
    recentTreatments: "Tratamientos Recientes",
  },

  // Breeding Module
  breeding: {
    title: "Gestión de Reproducción",
    addRecord: "Agregar Registro",
    breedingHistory: "Historial Reproductivo",

    // Event Types
    heat: "Celo",
    insemination: "Inseminación",
    pregnancyCheck: "Chequeo de Preñez",
    birth: "Parto",

    // Fields
    eventType: "Tipo de Evento",
    eventDate: "Fecha del Evento",
    sire: "Semental",
    inseminationType: "Tipo de Inseminación",
    pregnancyStatus: "Estado de Preñez",
    expectedDueDate: "Fecha Esperada de Parto",
    actualBirthDate: "Fecha Real de Parto",
    offspringCount: "Número de Crías",

    // Insemination Types
    natural: "Natural",
    artificial: "Artificial",

    // Pregnancy Status
    confirmed: "Confirmada",
    notConfirmed: "No Confirmada",
    unknown: "Desconocida",
  },

  // Dashboard
  dashboard: {
    welcome: "Bienvenido a Ganado AI",
    overview: "Resumen General",
    quickActions: "Acciones Rápidas",
    recentActivity: "Actividad Reciente",
    statistics: "Estadísticas",

    // Stats Cards
    totalAnimals: "Total de Animales",
    healthAlerts: "Alertas de Salud",
    pregnantAnimals: "Animales Preñados",
    recentBirths: "Nacimientos Recientes",

    // Weather
    weather: "Clima",
    temperature: "Temperatura",
    humidity: "Humedad",
    precipitation: "Precipitación",
  },

  // Sync & Offline
  sync: {
    syncing: "Sincronizando...",
    synced: "Sincronizado",
    offline: "Sin Conexión",
    online: "En Línea",
    pendingChanges: "Cambios Pendientes",
    lastSync: "Última Sincronización",
    syncError: "Error de Sincronización",
    syncComplete: "Sincronización Completa",
    conflictResolution: "Resolución de Conflictos",
  },

  // AI Assistant
  ai: {
    title: "Asistente IA",
    placeholder: "Escribe tu pregunta o comando...",
    thinking: "Pensando...",
    suggestions: "Sugerencias",
    voiceInput: "Entrada de Voz",
    clearChat: "Limpiar Chat",

    // Sample Commands
    sampleCommands: {
      addAnimal: "Agregar una nueva vaca llamada Bella",
      checkHealth: "Mostrar animales que necesitan vacunación",
      breeding: "Registrar inseminación para vaca #1234",
      report: "Generar reporte mensual de producción",
    },
  },

  // Settings
  settings: {
    title: "Configuración",
    general: "General",
    notifications: "Notificaciones",
    privacy: "Privacidad",
    security: "Seguridad",
    modules: "Módulos",
    backup: "Respaldo",
    restore: "Restaurar",
    language: "Idioma",
    theme: "Tema",
    ranch: "Finca",

    // Ranch Settings
    ranchName: "Nombre de la Finca",
    ranchLocation: "Ubicación",
    timezone: "Zona Horaria",
    currency: "Moneda",
    units: "Unidades",

    // Units
    metric: "Métrico",
    imperial: "Imperial",
  },

  // Errors
  errors: {
    generic: "Ocurrió un error inesperado",
    network: "Error de conexión",
    notFound: "No encontrado",
    unauthorized: "No autorizado",
    validation: "Error de validación",
    required: "Este campo es requerido",
    invalidEmail: "Email inválido",
    minLength: "Mínimo {min} caracteres",
    maxLength: "Máximo {max} caracteres",
  },

  // Time
  time: {
    today: "Hoy",
    yesterday: "Ayer",
    tomorrow: "Mañana",
    week: "Semana",
    month: "Mes",
    year: "Año",
    days: "días",
    hours: "horas",
    minutes: "minutos",
    seconds: "segundos",
    ago: "hace",
  },
};
