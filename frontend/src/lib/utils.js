import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Safely format a number to a fixed decimal places
 * Handles cases where the value might be a string or null/undefined
 */
export const formatNumber = (value, decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return decimals === 1 ? '0.0' : '0.00';
  return num.toFixed(decimals);
};

/**
 * Safely format currency (PKR)
 */
export const formatCurrency = (value) => {
  return `PKR ${formatNumber(value, 2)}`;
};

/**
 * Safely parse a number from string or number
 */
export const safeParseFloat = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Safely parse an integer from string or number
 */
export const safeParseInt = (value, defaultValue = 0) => {
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
};
