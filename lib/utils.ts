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
