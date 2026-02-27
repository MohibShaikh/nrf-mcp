import { execFileSync } from "child_process";
import { ENV } from "../config.js";

export interface RunResult {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

export function run(
  cmd: string,
  args: string[],
  cwd?: string,
  timeoutMs = 300_000
): RunResult {
  try {
    const stdout = execFileSync(cmd, args, {
      cwd,
      env: ENV,
      timeout: timeoutMs,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, code: 0, stdout, stderr: "" };
  } catch (e: unknown) {
    const err = e as {
      status?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      ok: false,
      code: err.status ?? -1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? String(e),
    };
  }
}

const MAX_LINES = 60;

function truncate(text: string, maxLines: number, keep: "tail" | "head" = "tail"): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  const omitted = lines.length - maxLines;
  if (keep === "tail") {
    return `... (${omitted} lines omitted) ...\n` + lines.slice(-maxLines).join("\n");
  }
  return lines.slice(0, maxLines).join("\n") + `\n... (${omitted} lines omitted) ...`;
}

export function fmt(result: RunResult, label: string): string {
  const status = result.ok ? "OK" : `FAILED (exit ${result.code})`;
  const parts = [`=== ${label}: ${status} ===`];
  if (result.stdout.trim()) {
    // On success, short summary; on failure, keep the tail where errors live
    parts.push(truncate(result.stdout.trim(), result.ok ? 20 : MAX_LINES, "tail"));
  }
  if (result.stderr.trim()) {
    parts.push("--- stderr ---");
    parts.push(truncate(result.stderr.trim(), MAX_LINES, "tail"));
  }
  return parts.join("\n");
}
