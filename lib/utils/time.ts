export function getNow() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function toDurationMs(startedAt: number) {
  return Number((getNow() - startedAt).toFixed(2));
}
