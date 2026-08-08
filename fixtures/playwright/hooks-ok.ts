import { useState } from "react";

// Playwright files are exempt from React hooks/compiler rules.
export function maybeHook(cond: boolean) {
  if (cond) {
    return useState(0);
  }
  return null;
}
