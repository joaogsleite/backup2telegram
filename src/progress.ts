import { formatBytes, formatDuration } from "./format.js";

const BAR_WIDTH = 30;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return NaN;
  // big-integer instances and similar coerce via their decimal string form.
  return Number(String(value));
}

export interface ProgressBar {
  /**
   * Render progress. Accepts either a lone fraction 0..1 (upload style)
   * or byte counts (downloaded, total) (download style).
   */
  update(done: unknown, total?: unknown): void;
  finish(): void;
}

export function createProgressBar(
  label: string,
  totalBytes: number,
): ProgressBar {
  const startedAt = Date.now();
  let lastPct = -1;
  let finished = false;

  function update(done: unknown, total?: unknown): void {
    if (finished) return;
    const ratio =
      total === undefined
        ? toNumber(done)
        : toNumber(done) / Math.max(1, toNumber(total));
    if (!Number.isFinite(ratio)) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    const pct = Math.floor(clamped * 100);
    if (pct === lastPct) return;
    lastPct = pct;
    const filled = Math.round(clamped * BAR_WIDTH);
    const bar = "#".repeat(filled) + "-".repeat(BAR_WIDTH - filled);
    const now = Date.now();
    const elapsed = now - startedAt;
    const speed =
      now > startedAt && Number.isFinite(totalBytes) && totalBytes >= 0
        ? ` ${formatBytes((clamped * totalBytes) / (elapsed / 1000))}/s`
        : "";
    const line =
      `  ${label ? `${label} ` : ""}[${bar}] ${String(pct).padStart(3)}% ` +
      `(${formatBytes(clamped * totalBytes)}/${formatBytes(totalBytes)}) ` +
      `${formatDuration(elapsed)}${speed}`;
    process.stdout.write(
      `\r${line.padEnd(process.stdout.columns ?? line.length + 2)}`,
    );
  }

  function finish(): void {
    finished = true;
    process.stdout.write("\n");
  }

  return { update, finish };
}
