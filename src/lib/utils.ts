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
    return `web-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
  try {
    const nav = typeof navigator !== "undefined" ? navigator : ({} as any);
    const scr = typeof screen !== "undefined" ? screen : ({} as any);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const data = [
      nav.userAgent,
      nav.platform,
      (nav as any).hardwareConcurrency || "",
      scr.width,
      scr.height,
      scr.colorDepth,
      tz,
      (window as any).devicePixelRatio || "",
    ].join("::");
    const enc = new TextEncoder().encode(data);
    const hashBuffer = (window.crypto as any).subtle.digest("SHA-256", enc);
    const ls = (window as any).localStorage as Storage | undefined;
    const cached = ls?.getItem("_device_id");
    if (cached) return cached;
    const temp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    ls?.setItem("_device_id", temp);
    Promise.resolve(hashBuffer)
      .then((buf: ArrayBuffer) => {
        const arr = Array.from(new Uint8Array(buf));
        const hex = arr.map((b) => b.toString(16).padStart(2, "0")).join("");
        ls?.setItem("_device_id", hex);
      })
      .catch(() => {});
    return temp;
  } catch {
    const ls = (window as any).localStorage as Storage | undefined;
    let id = ls?.getItem("_device_id") || "";
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      ls?.setItem("_device_id", id);
    }
    return id;
  }
}
