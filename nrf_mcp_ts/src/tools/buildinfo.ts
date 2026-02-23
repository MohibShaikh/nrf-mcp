import { existsSync, readFileSync } from "fs";
import { join } from "path";

export async function toolGetBuildInfo(
  args: Record<string, unknown>
): Promise<string> {
  const samplePath = args.sample_path as string;
  const buildDir = join(samplePath, "build");
  const parts: string[] = [];

  const vscodeFile = join(buildDir, ".vscode-nrf-connect.json");
  if (existsSync(vscodeFile)) {
    parts.push("=== .vscode-nrf-connect.json ===");
    parts.push(readFileSync(vscodeFile, "utf8"));
  } else {
    parts.push("=== .vscode-nrf-connect.json: NOT FOUND ===");
  }

  const buildInfoFile = join(buildDir, "build_info.yml");
  if (existsSync(buildInfoFile)) {
    parts.push("=== build_info.yml ===");
    parts.push(readFileSync(buildInfoFile, "utf8"));
  } else {
    parts.push("=== build_info.yml: NOT FOUND ===");
  }

  const domainsFile = join(buildDir, "domains.yaml");
  if (existsSync(domainsFile)) {
    parts.push("=== domains.yaml ===");
    parts.push(readFileSync(domainsFile, "utf8"));
  }

  return parts.join("\n\n");
}
