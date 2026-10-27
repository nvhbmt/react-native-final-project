import { type ClassValue, clsx } from 'clsx'

/**
 * Ghép className có điều kiện: `cn('px-4', active && 'bg-primary', { 'opacity-50': disabled })`.
 *
 * Không cần `tailwind-merge`: @tamagui/tailwind tự xử lý class xung đột theo thứ tự
 * (class đứng sau thắng), nên `cn('p-4', className)` cho phép `className` ghi đè `p-4`.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
