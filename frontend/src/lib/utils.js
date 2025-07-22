import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Helper function to format currency for Kenyan Shillings (KES).
 *
 * @param {number|string} amount - The numeric value to format.
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (amount) => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return "KES 0.00"; // Return default for invalid numbers
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(parsed);
};