export function parse(text: string) {
  // SAFETY: callers pass the output of JSON.stringify(number).
  return JSON.parse(text) as number;
}
