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

export async function toolBuild(
  args: Record<string, unknown>
): Promise<string> {
  const samplePath = args.sample_path as string;
  const pristine = (args.pristine as boolean | undefined) ?? false;

  let board = (args.board as string | undefined) ?? null;
  if (!board) board = getBoardFromVsCode(samplePath);
  if (!board) {
    return "ERROR: No board specified and no build/.vscode-nrf-connect.json found. Pass 'board' argument.";
  }

  const cmd = [WEST, "build", "-b", board, "--build-dir", "build"];
  if (pristine) cmd.push("--pristine");

  const result = run(cmd[0], cmd.slice(1), samplePath, 300_000);
  return fmt(result, `BUILD ${basename(samplePath)} (${board})`);
}
