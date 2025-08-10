import CryptoJS from "crypto-js";

// Generate a secure key from user password and salt
export function generateKey(password: string, salt: string): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  }).toString();
}

// Encrypt data
export function encrypt(data: any, key: string): string {
  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, key).toString();
}

// Decrypt data
export function decrypt(encryptedData: string, key: string): any {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Error decrypting data:", error);
    return null;
  }
}

// Hash sensitive data (one-way)
export function hash(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

// Generate random salt
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
}

// Secure storage wrapper for browser
export class SecureStorage {
  private key: string;

  constructor(userKey: string) {
    const salt = this.getSalt();
    this.key = generateKey(userKey, salt);
  }

  private getSalt(): string {
    let salt = localStorage.getItem("_app_salt");
    if (!salt) {
      salt = generateSalt();
      localStorage.setItem("_app_salt", salt);
    }
    return salt;
  }

  setItem(key: string, value: any): void {
    const encrypted = encrypt(value, this.key);
    localStorage.setItem(key, encrypted);
  }

  getItem(key: string): any {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    return decrypt(encrypted, this.key);
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    const salt = this.getSalt();
    localStorage.clear();
    localStorage.setItem("_app_salt", salt);
  }
}

// Encrypt sensitive fields in Dexie
export function encryptSensitiveFields(data: any, fields: string[]): any {
  const key = getEncryptionKey();
  const encrypted = { ...data };

  fields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) {
      encrypted[field] = encrypt(data[field], key);
    }
  });

  return encrypted;
}

// Decrypt sensitive fields from Dexie
export function decryptSensitiveFields(data: any, fields: string[]): any {
  const key = getEncryptionKey();
  const decrypted = { ...data };

  fields.forEach((field) => {
    if (data[field]) {
      const decryptedValue = decrypt(data[field], key);
      if (decryptedValue !== null) {
        decrypted[field] = decryptedValue;
      }
    }
  });

  return decrypted;
}

// Get or generate encryption key for the session
let sessionKey: string | null = null;
let externalKey: string | null = null;

export function setExternalEncryptionKey(key: string | null): void {
  externalKey = key;
  if (!key) {
    // Clear ephemeral session key as well on lock, if present
    sessionKey = null;
    try {
      sessionStorage.removeItem("_session_key");
    } catch {}
  }
}

export function getEncryptionKey(): string {
  if (externalKey) {
    return externalKey;
  }
  if (!sessionKey) {
    // In production, this should be derived from user auth
    // For now, generate a session key
    try {
      const stored = sessionStorage.getItem("_session_key");
      if (stored) {
        sessionKey = stored;
      } else {
        sessionKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
        sessionStorage.setItem("_session_key", sessionKey);
      }
    } catch {
      // sessionStorage may be unavailable in some environments
      sessionKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
    }
  }
  return sessionKey;
}

// Clear encryption key on logout
export function clearEncryptionKey(): void {
  sessionKey = null;
  externalKey = null;
  try {
    sessionStorage.removeItem("_session_key");
  } catch {}
}
