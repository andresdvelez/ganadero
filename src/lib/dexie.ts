import Dexie, { Table } from "dexie";

export interface OfflineAnimal {
  id?: number;
  uuid: string;
  userId: string;
  name: string;
  tagNumber: string;
  species: string;
  breed?: string;
  sex: string;
  birthDate?: Date;
  weight?: number;
  color?: string;
  status: string;
  motherId?: string;
  fatherId?: string;
  imageUrl?: string;
  metadata?: string;
  qrCode?: string;
  nfcId?: string;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfflineHealthRecord {
  id?: number;
  uuid: string;
  userId: string;
  animalId: string;
  type: string;
  description: string;
  medication?: string;
  dosage?: string;
  veterinarian?: string;
  cost?: number;
  notes?: string;
  performedAt: Date;
  nextDueDate?: Date;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfflineBreedingRecord {
  id?: number;
  uuid: string;
  userId: string;
  animalId: string;
  eventType: string;
  eventDate: Date;
  sireId?: string;
  inseminationType?: string;
  pregnancyStatus?: string;
  expectedDueDate?: Date;
  actualBirthDate?: Date;
  offspringCount?: number;
  notes?: string;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Inventory (Insumos)
export interface OfflineProduct {
  id?: number;
  uuid: string;
  userId: string;
  code: string;
  name: string;
  category?: string;
  unit: string; // unidad de medida
  minStock?: number;
  currentStock: number;
  cost?: number;
  supplier?: string;
  notes?: string;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfflineStockMovement {
  id?: number;
  uuid: string;
  userId: string;
  productUuid: string;
  type: "in" | "out" | "adjust";
  quantity: number;
  unitCost?: number;
  reason?: string; // compra, salida a evento, ajuste, etc.
  relatedEntity?: string; // referencia (evento, factura)
  occurredAt: Date;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Leche (Producción)
export interface OfflineMilkRecord {
  id?: number;
  uuid: string;
  userId: string;
  animalId?: string; // individual opcional
  session: "AM" | "PM" | "TOTAL";
  liters: number;
  fatPct?: number;
  proteinPct?: number;
  ccs?: number; // conteo células somáticas
  notes?: string;
  recordedAt: Date;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Potreros
export interface OfflinePasture {
  id?: number;
  uuid: string;
  userId: string;
  name: string;
  areaHa?: number;
  currentGroup?: string; // lote/grupo ocupando
  occupancySince?: Date;
  notes?: string;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Laboratorio (Exámenes)
export interface OfflineLabExam {
  id?: number;
  uuid: string;
  userId: string;
  animalId?: string;
  examType: string; // mastitis, bromatológico, suelo, etc.
  sampleType?: string;
  labName?: string;
  requestedAt: Date;
  resultAt?: Date;
  result?: string; // JSON string de resultados
  antibiogram?: string; // JSON si aplica
  notes?: string;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncQueueItem {
  id?: number;
  uuid: string;
  userId: string;
  operation: "create" | "update" | "delete";
  entityType: string;
  entityId: string;
  data: string;
  status: "pending" | "syncing" | "synced" | "failed" | "conflict";
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
  syncedAt?: Date;
}

export class GanadoDB extends Dexie {
  animals!: Table<OfflineAnimal>;
  healthRecords!: Table<OfflineHealthRecord>;
  breedingRecords!: Table<OfflineBreedingRecord>;
  products!: Table<OfflineProduct>;
  stockMovements!: Table<OfflineStockMovement>;
  milkRecords!: Table<OfflineMilkRecord>;
  pastures!: Table<OfflinePasture>;
  labExams!: Table<OfflineLabExam>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super("GanadoDB");

    this.version(1).stores({
      animals: "++id, uuid, userId, tagNumber, status, synced",
      healthRecords: "++id, uuid, userId, animalId, type, performedAt, synced",
      breedingRecords:
        "++id, uuid, userId, animalId, eventType, eventDate, synced",
      syncQueue: "++id, uuid, userId, status, entityType, createdAt",
    });

    // New tables in version 2
    this.version(2)
      .stores({
        products:
          "++id, uuid, userId, code, name, category, currentStock, synced",
        stockMovements:
          "++id, uuid, userId, productUuid, type, occurredAt, synced",
        milkRecords:
          "++id, uuid, userId, animalId, session, recordedAt, synced",
        pastures: "++id, uuid, userId, name, synced",
        labExams: "++id, uuid, userId, animalId, examType, requestedAt, synced",
      })
      .upgrade(() => {
        // no data migration required for new tables
      });
  }
}

export const db = new GanadoDB();

// Helper function to generate UUID
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper function to add item to sync queue
export async function addToSyncQueue(
  operation: "create" | "update" | "delete",
  entityType: string,
  entityId: string,
  data: any,
  userId: string
): Promise<void> {
  await db.syncQueue.add({
    uuid: generateUUID(),
    userId,
    operation,
    entityType,
    entityId,
    data: JSON.stringify(data),
    status: "pending",
    retryCount: 0,
    createdAt: new Date(),
  });
}
