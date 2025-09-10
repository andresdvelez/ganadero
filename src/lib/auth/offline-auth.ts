import bcrypt from "bcryptjs";
import { db, OfflineIdentity, DeviceInfo } from "@/lib/dexie";
import { robustDeviceId } from "@/lib/utils";
import {
  generateKey,
  generateSalt,
  setExternalEncryptionKey,
} from "@/services/encryption/crypto";

let unlocked = false;
let currentClerkId: string | null = null;

function syncUnlockedFromSessionStorage(): void {
  // Mantener estado entre navegaciones/hidrataciones en el cliente.
  try {
    if (typeof window === "undefined") return;
    if (unlocked) return;
    const v = window.sessionStorage.getItem("OFFLINE_UNLOCKED");
    if (v === "1") unlocked = true;
  } catch {}
}

export function isUnlocked(): boolean {
  // Asegurar que reflejamos el estado persistido si existe
  syncUnlockedFromSessionStorage();
  return unlocked;
}

export async function hasOfflineIdentity(): Promise<boolean> {
  const count = await db.identities.count();
  return count > 0;
}

export async function getOfflineIdentity(): Promise<
  OfflineIdentity | undefined
> {
  // Preferir identidad asociada al binding local del dispositivo actual
  try {
    const did = robustDeviceId();
    const dev = await db.deviceInfo.where({ deviceId: did }).first();
    if (dev?.boundClerkId) {
      const match = await db.identities
        .where({ clerkId: dev.boundClerkId })
        .first();
      if (match) return match;
    }
  } catch {}
  // Fallback: la identidad más reciente
  const all = await db.identities.toArray();
  if (!all.length) return undefined;
  let latest = all[0]!;
  for (const it of all) {
    if (it.updatedAt && latest.updatedAt) {
      if (new Date(it.updatedAt) > new Date(latest.updatedAt)) latest = it;
    }
  }
  return latest;
}

export type ProvisionInput = {
  clerkId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  orgId?: string;
  passcode: string;
};

export async function provisionFromClerk(input: ProvisionInput): Promise<void> {
  const { passcode, ...profile } = input;
  const passcodeSalt = generateSalt();
  const encryptionSalt = generateSalt();
  const passcodeHash = await bcrypt.hash(passcode + passcodeSalt, 10);

  const existing = await db.identities
    .where({ clerkId: profile.clerkId })
    .first();
  const now = new Date();
  if (existing) {
    await db.identities.update(existing.id!, {
      ...profile,
      passcodeHash,
      passcodeSalt,
      encryptionSalt,
      updatedAt: now,
    });
  } else {
    await db.identities.add({
      ...profile,
      passcodeHash,
      passcodeSalt,
      encryptionSalt,
      createdAt: now,
      updatedAt: now,
    });
  }

  await unlock(passcode);
}

export async function bindDeviceLocally(params: {
  deviceId: string;
  clerkId: string;
  orgId?: string;
  name?: string;
  platform?: string;
}) {
  const rec: DeviceInfo = {
    deviceId: params.deviceId,
    boundClerkId: params.clerkId,
    boundOrgId: params.orgId,
    name: params.name,
    platform: params.platform,
    boundAt: new Date(),
  };
  const existing = await db.deviceInfo
    .where({ deviceId: params.deviceId })
    .first();
  if (existing) {
    await db.deviceInfo.update(existing.id!, rec);
  } else {
    await db.deviceInfo.add(rec);
  }
}

export async function getBoundDevice(
  deviceId?: string
): Promise<DeviceInfo | undefined> {
  if (deviceId) {
    return await db.deviceInfo.where({ deviceId }).first();
  }
  try {
    const id = robustDeviceId();
    const rec = await db.deviceInfo.where({ deviceId: id }).first();
    if (rec) return rec;
  } catch {}
  // Fallback (legacy): primer registro
  return await db.deviceInfo.toCollection().first();
}

export async function unlock(passcode: string): Promise<void> {
  const identity = await getOfflineIdentity();
  if (!identity) throw new Error("No hay identidad offline configurada");
  let currentId: string | undefined;
  try {
    currentId = robustDeviceId();
  } catch {}
  const device = await getBoundDevice(currentId);
  if (device && device.boundClerkId !== identity.clerkId) {
    throw new Error("Este dispositivo está vinculado a otra cuenta");
  }
  const valid = await bcrypt.compare(
    passcode + identity.passcodeSalt,
    identity.passcodeHash
  );
  if (!valid) throw new Error("Código incorrecto");
  const key = generateKey(passcode, identity.encryptionSalt);
  setExternalEncryptionKey(key);
  unlocked = true;
  currentClerkId = identity.clerkId;
  // Persistir estado de desbloqueo en la sesión del navegador para sobrevivir a navegación/rehidratación
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("OFFLINE_UNLOCKED", "1");
    }
  } catch {}
}

export function lock(): void {
  unlocked = false;
  currentClerkId = null;
  setExternalEncryptionKey(null);
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("OFFLINE_UNLOCKED");
    }
  } catch {}
}

// Verifica passcode y elimina el vínculo local del dispositivo actual
export async function unlinkLocalDeviceWithPasscode(params: {
  deviceId: string;
  passcode: string;
}): Promise<void> {
  // Validar passcode contra identidad local existente
  await unlock(params.passcode);
  // Borrar registro de deviceInfo para permitir nueva vinculación
  const existing = await db.deviceInfo
    .where({ deviceId: params.deviceId })
    .first();
  if (existing?.id) {
    await db.deviceInfo.delete(existing.id);
  }
  // Bloquear de nuevo por seguridad
  lock();
}
