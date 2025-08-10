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

// Chat history
export interface OfflineChat {
  id?: number;
  uuid: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfflineChatMessage {
  id?: number;
  chatUuid: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface OfflineIdentity {
  id?: number;
  clerkId: string;
  orgId?: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  passcodeHash: string;
  passcodeSalt: string;
  encryptionSalt: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceInfo {
  id?: number;
  deviceId: string;
  boundClerkId: string;
  boundOrgId?: string;
  name?: string;
  platform?: string;
  boundAt: Date;
}

export interface SyncState {
  id?: number;
  lastPullCursor?: string;
  lastSyncedAt?: Date;
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
  chats!: Table<OfflineChat>;
  chatMessages!: Table<OfflineChatMessage>;
  identities!: Table<OfflineIdentity>;
  deviceInfo!: Table<DeviceInfo>;
  syncState!: Table<SyncState>;

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

    // Version 3: chat history
    this.version(3)
      .stores({
        chats: "++id, uuid, userId, updatedAt, title",
        chatMessages: "++id, chatUuid, createdAt, role",
      })
      .upgrade(() => {
        // nothing to migrate
      });

    // Version 4: offline identity for device unlock
    this.version(4)
      .stores({
        identities: "++id, clerkId, email, orgId",
      })
      .upgrade(() => {
        // nothing to migrate
      });

    // Version 5: device binding info
    this.version(5)
      .stores({
        deviceInfo: "++id, deviceId, boundClerkId, boundOrgId",
      })
      .upgrade(() => {
        // nothing to migrate
      });

    // Version 6: sync state
    this.version(6)
      .stores({
        syncState: "++id",
      })
      .upgrade(() => {});
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

export async function getSyncState(): Promise<SyncState> {
  const s = await db.syncState.toCollection().first();
  if (s) return s;
  const def: SyncState = { lastPullCursor: undefined, lastSyncedAt: undefined };
  await db.syncState.add(def);
  return (await db.syncState.toCollection().first()) as SyncState;
}

export async function setSyncState(partial: Partial<SyncState>) {
  const s = await getSyncState();
  await db.syncState.update(s.id!, { ...s, ...partial });
}
