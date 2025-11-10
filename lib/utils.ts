// A simple utility to convert snake_case strings to camelCase
const toCamel = (s: string): string => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

/**
 * Recursively converts object keys from snake_case to camelCase.
 * @param obj The object or array of objects to process.
 * @returns A new object with camelCase keys.
 */
export const mapToCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => mapToCamelCase(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => ({
            ...result,
            [toCamel(key)]: mapToCamelCase(obj[key]),
        }), {});
    }
    return obj;
};

export const formatDate = (date: Date): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (date: Date): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (price: number, country: string): string => {
  const currency = country === 'مصر' ? 'EGP' : 'LYD';
  const locale = country === 'مصر' ? 'ar-EG' : 'ar-LY';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(price);
  } catch (e) {
    // Fallback for environments that might not support these locales/currencies
    return `${currency} ${price.toFixed(2)}`;
  }
};

/**
 * Converts Eastern Arabic and Persian numerals in a string to Western Arabic numerals (0-9).
 * @param str The string to process.
 * @returns A new string with numerals normalized.
 */
export const normalizeNumerals = (str: string): string => {
    if (!str) return '';
    // Eastern Arabic to Western
    let normalizedStr = str.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 1632));
    // Persian to Western
    normalizedStr = normalizedStr.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 1776));
    return normalizedStr;
};
