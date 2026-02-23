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

export function fmt(result: RunResult, label: string): string {
  const status = result.ok ? "OK" : `FAILED (exit ${result.code})`;
  const parts = [`=== ${label}: ${status} ===`];
  if (result.stdout.trim()) parts.push(result.stdout.trim());
  if (result.stderr.trim()) {
    parts.push("--- stderr ---");
    parts.push(result.stderr.trim());
  }
  return parts.join("\n");
}
