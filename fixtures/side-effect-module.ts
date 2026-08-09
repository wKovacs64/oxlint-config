globalThis.__sideEffect = true;

declare global {
  var __sideEffect: boolean;
}
