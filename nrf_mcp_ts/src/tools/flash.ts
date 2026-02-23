import { existsSync, readFileSync } from "fs";
import { join, basename } from "path";
import { WEST } from "../config.js";
import { run, fmt } from "./run.js";

function getBoardFromVsCode(samplePath: string): string | null {
  const cfgPath = join(samplePath, "build", ".vscode-nrf-connect.json");
  if (!existsSync(cfgPath)) return null;
  try {
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    return cfg.board ?? null;
  } catch {
    return null;
  }
}

export async function toolFlash(
  args: Record<string, unknown>
): Promise<string> {
  const samplePath = args.sample_path as string;
  const buildFirst = (args.build_first as boolean | undefined) ?? false;
  const snr = args.snr as string | undefined;
  const parts: string[] = [];

  if (buildFirst) {
    let board = (args.board as string | undefined) ?? null;
    if (!board) board = getBoardFromVsCode(samplePath);
    if (!board) return "ERROR: No board specified for build step.";

    const buildResult = run(
      WEST,
      ["build", "-b", board, "--build-dir", "build"],
      samplePath,
      300_000
    );
    parts.push(fmt(buildResult, `BUILD ${basename(samplePath)}`));
    if (!buildResult.ok) return parts.join("\n\n");
  }

  const flashArgs = ["flash", "--build-dir", "build"];
  if (snr) flashArgs.push("--snr", snr);

  const flashResult = run(WEST, flashArgs, samplePath, 120_000);
  parts.push(fmt(flashResult, `FLASH ${basename(samplePath)}`));

  return parts.join("\n\n");
}
