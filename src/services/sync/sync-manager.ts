import { db, SyncQueueItem } from "@/lib/dexie";
import { prisma } from "@/lib/prisma";

export class SyncManager {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  constructor() {
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private setupEventListeners() {
    // Listen for online/offline events
    this.onlineListener = () => {
      console.log("Conexión restaurada - iniciando sincronización");
      this.sync();
    };

    this.offlineListener = () => {
      console.log("Sin conexión - modo offline activado");
    };

    window.addEventListener("online", this.onlineListener);
    window.addEventListener("offline", this.offlineListener);
  }

  private startPeriodicSync() {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.sync();
      }
    }, 30000);
  }

  async sync(): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    conflicts: number;
  }> {
    if (this.isSyncing || !navigator.onLine) {
      return { success: false, synced: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      // Get all pending items from sync queue
      const pendingItems = await db.syncQueue
        .where("status")
        .equals("pending")
        .or("status")
        .equals("failed")
        .toArray();

      console.log(`Sincronizando ${pendingItems.length} elementos pendientes`);

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);

          // Mark as synced
          await db.syncQueue.update(item.id!, {
            status: "synced",
            syncedAt: new Date(),
          });

          synced++;
        } catch (error: any) {
          console.error(`Error sincronizando elemento ${item.id}:`, error);

          if (error.code === "CONFLICT") {
            // Handle conflict
            await db.syncQueue.update(item.id!, {
              status: "conflict",
              errorMessage: error.message,
            });
            conflicts++;
          } else {
            // Mark as failed and increment retry count
            await db.syncQueue.update(item.id!, {
              status: "failed",
              retryCount: (item.retryCount || 0) + 1,
              errorMessage: error.message,
            });
            failed++;
          }
        }
      }

      // Clean up old synced items (older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      await db.syncQueue
        .where("status")
        .equals("synced")
        .and((item) => item.createdAt < sevenDaysAgo)
        .delete();

      console.log(
        `Sincronización completada: ${synced} exitosos, ${failed} fallidos, ${conflicts} conflictos`
      );

      return { success: true, synced, failed, conflicts };
    } catch (error) {
      console.error("Error en sincronización:", error);
      return { success: false, synced, failed, conflicts };
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const data = JSON.parse(item.data);

    switch (item.entityType) {
      case "animal":
        await this.syncAnimal(item.operation, item.entityId, data);
        break;
      case "health_record":
        await this.syncHealthRecord(item.operation, item.entityId, data);
        break;
      case "breeding_record":
        await this.syncBreedingRecord(item.operation, item.entityId, data);
        break;
      default:
        throw new Error(`Tipo de entidad no soportado: ${item.entityType}`);
    }
  }

  private async syncAnimal(
    operation: string,
    entityId: string,
    data: any
  ): Promise<void> {
    const response = await fetch("/api/sync/animal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation,
        entityId,
        data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 409) {
        // Conflict detected
        const conflictError = new Error(error.message || "Conflicto detectado");
        (conflictError as any).code = "CONFLICT";
        throw conflictError;
      }
      throw new Error(error.message || "Error sincronizando animal");
    }

    // Update local database with server response
    const result = await response.json();
    if (result.data && operation !== "delete") {
      const localAnimal = await db.animals
        .where("uuid")
        .equals(entityId)
        .first();
      if (localAnimal) {
        await db.animals.update(localAnimal.id!, {
          ...result.data,
          synced: true,
        });
      }
    }
  }

  private async syncHealthRecord(
    operation: string,
    entityId: string,
    data: any
  ): Promise<void> {
    const response = await fetch("/api/sync/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation,
        entityId,
        data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 409) {
        const conflictError = new Error(error.message || "Conflicto detectado");
        (conflictError as any).code = "CONFLICT";
        throw conflictError;
      }
      throw new Error(error.message || "Error sincronizando registro de salud");
    }

    const result = await response.json();
    if (result.data && operation !== "delete") {
      const localRecord = await db.healthRecords
        .where("uuid")
        .equals(entityId)
        .first();
      if (localRecord) {
        await db.healthRecords.update(localRecord.id!, {
          ...result.data,
          synced: true,
        });
      }
    }
  }

  private async syncBreedingRecord(
    operation: string,
    entityId: string,
    data: any
  ): Promise<void> {
    const response = await fetch("/api/sync/breeding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation,
        entityId,
        data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 409) {
        const conflictError = new Error(error.message || "Conflicto detectado");
        (conflictError as any).code = "CONFLICT";
        throw conflictError;
      }
      throw new Error(
        error.message || "Error sincronizando registro reproductivo"
      );
    }

    const result = await response.json();
    if (result.data && operation !== "delete") {
      const localRecord = await db.breedingRecords
        .where("uuid")
        .equals(entityId)
        .first();
      if (localRecord) {
        await db.breedingRecords.update(localRecord.id!, {
          ...result.data,
          synced: true,
        });
      }
    }
  }

  async getConflicts(): Promise<SyncQueueItem[]> {
    return await db.syncQueue.where("status").equals("conflict").toArray();
  }

  async resolveConflict(
    itemId: number,
    resolution: "local" | "remote",
    mergedData?: any
  ): Promise<void> {
    const item = await db.syncQueue.get(itemId);
    if (!item) {
      throw new Error("Elemento no encontrado");
    }

    if (resolution === "local") {
      // Keep local version - retry sync with force flag
      await db.syncQueue.update(itemId, {
        status: "pending",
        data: mergedData ? JSON.stringify(mergedData) : item.data,
        retryCount: 0,
      });
    } else {
      // Accept remote version - mark as resolved
      await db.syncQueue.update(itemId, {
        status: "synced",
        syncedAt: new Date(),
      });

      // Update local data with remote version
      // This would need to fetch the remote version
      // Implementation depends on your conflict resolution strategy
    }
  }

  getSyncStatus(): { isOnline: boolean; isSyncing: boolean } {
    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
    };
  }

  async getPendingCount(): Promise<number> {
    return await db.syncQueue
      .where("status")
      .anyOf(["pending", "failed"])
      .count();
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.onlineListener) {
      window.removeEventListener("online", this.onlineListener);
    }
    if (this.offlineListener) {
      window.removeEventListener("offline", this.offlineListener);
    }
  }
}

// Singleton instance
let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance && typeof window !== "undefined") {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance!;
}
