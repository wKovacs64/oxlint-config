/* oxlint-disable anti-slop/no-runtime-typeof -- these type guards parse JSON and rule options; the rule exempts type guards only through TypeScript return types, which JSDoc does not produce */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isString(value) {
  return typeof value === "string";
}
