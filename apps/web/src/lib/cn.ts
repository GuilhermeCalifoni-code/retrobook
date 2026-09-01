import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Une classes condicionais resolvendo conflitos do Tailwind (a ultima vence). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
