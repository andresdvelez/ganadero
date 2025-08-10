import bcrypt from "bcryptjs";
import { db, OfflineIdentity, DeviceInfo } from "@/lib/dexie";
import {
  generateKey,
  generateSalt,
  setExternalEncryptionKey,
} from "@/services/encryption/crypto";

let unlocked = false;
let currentClerkId: string | null = null;

export function isUnlocked(): boolean {
  return unlocked;
}

export async function hasOfflineIdentity(): Promise<boolean> {
  const count = await db.identities.count();
  return count > 0;
}

export async function getOfflineIdentity(): Promise<
  OfflineIdentity | undefined
> {
  return await db.identities.toCollection().first();
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

export async function getBoundDevice(): Promise<DeviceInfo | undefined> {
  return await db.deviceInfo.toCollection().first();
}

export async function unlock(passcode: string): Promise<void> {
  const identity = await getOfflineIdentity();
  if (!identity) throw new Error("No hay identidad offline configurada");
  const device = await getBoundDevice();
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
}

export function lock(): void {
  unlocked = false;
  currentClerkId = null;
  setExternalEncryptionKey(null);
}
