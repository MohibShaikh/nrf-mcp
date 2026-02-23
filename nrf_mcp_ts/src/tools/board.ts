import { SerialPort } from "serialport";
import { NRFJPROG } from "../config.js";
import { run, fmt } from "./run.js";

export async function toolReset(
  args: Record<string, unknown>
): Promise<string> {
  const snr = args.snr as string | undefined;
  const resetArgs = ["--reset"];
  if (snr) resetArgs.push("--snr", snr);

  const result = run(NRFJPROG, resetArgs, undefined, 30_000);
  return fmt(result, "RESET");
}

export async function toolListBoards(
  _args: Record<string, unknown>
): Promise<string> {
  const result = run(NRFJPROG, ["--ids"], undefined, 15_000);
  const parts = [fmt(result, "J-LINK BOARDS")];

  const ports = await SerialPort.list();
  parts.push("=== SERIAL PORTS ===");
  if (ports.length === 0) {
    parts.push("  (none found)");
  } else {
    for (const p of ports) {
      parts.push(`  ${p.path} — ${p.manufacturer ?? "unknown"} [VID:${p.vendorId ?? "?"}]`);
    }
  }

  return parts.join("\n");
}
