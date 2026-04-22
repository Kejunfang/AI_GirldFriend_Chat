import "server-only";

type LogMeta = Record<string, unknown> | undefined;

function writeLog(
  level: "info" | "warn" | "error" | "debug",
  message: string,
  meta?: LogMeta,
) {
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  const method =
    level === "error"
      ? console.error.bind(console)
      : level === "warn"
        ? console.warn.bind(console)
        : console.info.bind(console);

  method(`[ai-companion] ${message}${payload}`);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => writeLog("info", message, meta),
  warn: (message: string, meta?: LogMeta) => writeLog("warn", message, meta),
  error: (message: string, meta?: LogMeta) => writeLog("error", message, meta),
  debug: (message: string, meta?: LogMeta) => writeLog("debug", message, meta),
};
