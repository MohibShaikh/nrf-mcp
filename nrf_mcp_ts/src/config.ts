/**
 * Configuration — all hardcoded paths replaced with env vars.
 *
 * Users set these in their MCP server config, e.g.:
 *   "env": {
 *     "NRF_TOOLCHAIN": "/home/user/ncs/toolchains/b77d8c1312",
 *     "NRF_SDK": "/home/user/ncs/v2.9.2"
 *   }
 *
 * Or they can be auto-detected from the nRF Connect SDK install.
 */

import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

function autoDetectToolchain(): string | null {
  // nRF Connect SDK installs toolchains under ~/ncs/toolchains/<hash>/
  const ncsDir = join(homedir(), "ncs", "toolchains");
  if (!existsSync(ncsDir)) return null;

  // West can be at bin/west or usr/local/bin/west depending on toolchain version
  const entries = readdirSync(ncsDir).filter(
    (e) =>
      existsSync(join(ncsDir, e, "bin", "west")) ||
      existsSync(join(ncsDir, e, "usr", "local", "bin", "west"))
  );
  if (entries.length === 0) return null;

  // Pick newest (last modified)
  entries.sort();
  return join(ncsDir, entries[entries.length - 1]);
}

function autoDetectSdk(): string | null {
  // Look for ~/ncs/v*/  directories
  const ncsDir = join(homedir(), "ncs");
  if (!existsSync(ncsDir)) return null;

  const versions = readdirSync(ncsDir)
    .filter((e) => e.startsWith("v") && existsSync(join(ncsDir, e, "zephyr")))
    .sort();

  if (versions.length === 0) return null;
  return join(ncsDir, versions[versions.length - 1]);
}

export const TOOLCHAIN =
  process.env.NRF_TOOLCHAIN ?? autoDetectToolchain() ?? "";

export const SDK = process.env.NRF_SDK ?? autoDetectSdk() ?? "";

function findWest(toolchain: string): string {
  const candidates = [
    join(toolchain, "usr", "local", "bin", "west"),
    join(toolchain, "bin", "west"),
  ];
  return candidates.find(existsSync) ?? join(toolchain, "bin", "west");
}

export const WEST = process.env.NRF_WEST ?? findWest(TOOLCHAIN);

export const JLINK_DIR =
  process.env.JLINK_DIR ?? "/opt/SEGGER/JLink";

function findNrfjprog(toolchain: string): string {
  const candidates = [
    join(toolchain, "usr", "local", "bin", "nrfjprog"),
    join(toolchain, "bin", "nrfjprog"),
  ];
  return candidates.find(existsSync) ?? "nrfjprog";
}

export const NRFJPROG = process.env.NRFJPROG ?? findNrfjprog(TOOLCHAIN);

export const ENV: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: `${join(TOOLCHAIN, "bin")}:${process.env.PATH ?? ""}`,
  ZEPHYR_BASE: join(SDK, "zephyr"),
  ZEPHYR_SDK_INSTALL_DIR: TOOLCHAIN,
};

export function configSummary(): string {
  return [
    `TOOLCHAIN : ${TOOLCHAIN || "(not found)"}`,
    `SDK       : ${SDK || "(not found)"}`,
    `WEST      : ${WEST}`,
    `NRFJPROG  : ${NRFJPROG}`,
    `JLINK_DIR : ${JLINK_DIR}`,
  ].join("\n");
}
