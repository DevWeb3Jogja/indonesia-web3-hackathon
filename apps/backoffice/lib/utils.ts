import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
