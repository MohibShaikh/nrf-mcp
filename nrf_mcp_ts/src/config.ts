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

import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";

const IS_WIN = platform() === "win32";
const IS_MAC = platform() === "darwin";
const PATH_SEP = IS_WIN ? ";" : ":";

function autoDetectToolchain(): string | null {
  // nRF Connect SDK installs toolchains under ~/ncs/toolchains/<hash>/
  const ncsDir = join(homedir(), "ncs", "toolchains");
  if (!existsSync(ncsDir)) return null;

  // West can be at bin/west, usr/local/bin/west, or bin/west.exe (Windows)
  const entries = readdirSync(ncsDir).filter(
    (e) =>
      existsSync(join(ncsDir, e, "bin", "west")) ||
      existsSync(join(ncsDir, e, "bin", "west.exe")) ||
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
    ...(IS_WIN ? [join(toolchain, "bin", "west.exe")] : []),
  ];
  return candidates.find(existsSync) ?? join(toolchain, "bin", "west");
}

export const WEST = process.env.NRF_WEST ?? findWest(TOOLCHAIN);

function defaultJlinkDir(): string {
  const candidates = [
    "/opt/SEGGER/JLink",                                          // Linux
    "/Applications/SEGGER/JLink",                                 // macOS
    "C:\\Program Files\\SEGGER\\JLink",                           // Windows
    "C:\\Program Files (x86)\\SEGGER\\JLink",                     // Windows x86
  ];
  return candidates.find(existsSync) ?? candidates[0];
}

export const JLINK_DIR = process.env.JLINK_DIR ?? defaultJlinkDir();

function findNrfjprog(toolchain: string): string {
  const ext = IS_WIN ? ".exe" : "";
  const candidates = [
    join(toolchain, "usr", "local", "bin", `nrfjprog${ext}`),
    join(toolchain, "bin", `nrfjprog${ext}`),
    `/opt/nrf-command-line-tools/bin/nrfjprog`,                                         // Linux
    `/usr/local/bin/nrfjprog`,                                                          // Linux (symlink)
    `/Applications/Nordic Semiconductor/nrf-command-line-tools/bin/nrfjprog`,            // macOS
    `C:\\Program Files\\Nordic Semiconductor\\nrf-command-line-tools\\bin\\nrfjprog.exe`, // Windows
    `C:\\Program Files (x86)\\Nordic Semiconductor\\nrf-command-line-tools\\bin\\nrfjprog.exe`,
  ];
  return candidates.find(existsSync) ?? "nrfjprog";
}

export const NRFJPROG = process.env.NRFJPROG ?? findNrfjprog(TOOLCHAIN);

// Python site-packages inside the toolchain (for west and its deps)
const TOOLCHAIN_PYTHON_SITE = TOOLCHAIN
  ? (() => {
      const pyLib = join(TOOLCHAIN, "usr", "local", "lib");
      if (existsSync(pyLib)) {
        const pyVer = readdirSync(pyLib).find((e) => e.startsWith("python3"));
        if (pyVer) return join(pyLib, pyVer, "site-packages");
      }
      return "";
    })()
  : "";

export const ENV: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: `${join(TOOLCHAIN, "usr", "local", "bin")}${PATH_SEP}${join(TOOLCHAIN, "bin")}${PATH_SEP}${process.env.PATH ?? ""}`,
  PYTHONPATH: TOOLCHAIN_PYTHON_SITE || process.env.PYTHONPATH || "",
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
