import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateTagNumber(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${timestamp}-${randomStr}`.toUpperCase();
}

/**
 * Devuelve true si la app corre instalada: Tauri o PWA standalone.
 * Seguro para SSR: en servidor devuelve false.
 */
export function isAppInstalledRuntime(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const isTauri = Boolean((window as any).__TAURI__ || (window as any).__TAURI_IPC__);
    const byMedia = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
    const byIOS = (navigator as any).standalone === true;
    return Boolean(isTauri || byMedia || byIOS);
  } catch {
    return false;
  }
}

export function calculateAge(birthDate: Date | string): string {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const today = new Date();
  const ageInMonths =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());

  if (ageInMonths < 12) {
    return `${ageInMonths} ${ageInMonths === 1 ? "mes" : "meses"}`;
  }

  const years = Math.floor(ageInMonths / 12);
  const months = ageInMonths % 12;

  if (months === 0) {
    return `${years} ${years === 1 ? "año" : "años"}`;
  }

  return `${years} ${years === 1 ? "año" : "años"}, ${months} ${
    months === 1 ? "mes" : "meses"
  }`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function robustDeviceId(): string {
  // SSR-safe: si no hay window, devolver un id efímero
  if (typeof window === "undefined") {
    return `ssr-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
  try {
    const ls = (window as any).localStorage as Storage | undefined;
    // Compat: si ya existe un id nuevo, úsalo
    let id = ls?.getItem("_device_uid");
    if (id) return id;
    // Compat con versiones anteriores
    const legacy = ls?.getItem("_device_id");
    if (legacy && legacy.length > 0 && legacy.length < 128) {
      // Promover el legacy a uid para mantener consistencia local
      ls?.setItem("_device_uid", legacy);
      return legacy;
    }
    // Generar UUID v4 aleatorio y persistente (mejor para evitar colisiones entre equipos similares)
    const bytes = new Uint8Array(16);
    (window.crypto || ({} as any).crypto)?.getRandomValues?.(bytes);
    // formato v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    ls?.setItem("_device_uid", id);
    return id;
  } catch {
    // Fallback aleatorio si algo falla con crypto/localStorage
    return `rnd-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}
