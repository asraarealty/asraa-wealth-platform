type Level = "info" | "warn" | "error";

export function securityLog(
  level: Level,
  event: string,
  details: Record<string, unknown> = {}
) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}
