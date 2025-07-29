import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"; // ✅ correct

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}
