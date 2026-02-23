import { SerialPort } from "serialport";
import { ReadlineParser } from "serialport";

async function findNordicPort(): Promise<string | null> {
  const ports = await SerialPort.list();

  // Prefer Nordic USB CDC port
  for (const p of ports) {
    if (
      p.manufacturer?.includes("Nordic") ||
      p.pnpId?.includes("Nordic") ||
      p.vendorId === "1915" // Nordic Semiconductor USB VID
    ) {
      return p.path;
    }
  }

  // Fall back to first ACM/USB port
  for (const p of ports) {
    if (p.path.includes("ACM") || p.path.includes("ttyUSB")) {
      return p.path;
    }
  }

  return null;
}

export async function toolReadUart(
  args: Record<string, unknown>
): Promise<string> {
  const durationS = (args.duration_s as number | undefined) ?? 5;
  const baud = (args.baud as number | undefined) ?? 115200;

  let port = args.port as string | undefined;
  if (!port) {
    port = (await findNordicPort()) ?? undefined;
  }

  if (!port) {
    const available = await SerialPort.list();
    const portList = available.map((p) => p.path).join(", ") || "(none)";
    return `ERROR: No serial port found. Available: ${portList}`;
  }

  return new Promise((resolve) => {
    const lines: string[] = [];
    let sp: SerialPort;

    try {
      sp = new SerialPort({ path: port!, baudRate: baud });
    } catch (e) {
      resolve(`ERROR opening ${port}: ${String(e)}`);
      return;
    }

    const parser = sp.pipe(new ReadlineParser({ delimiter: "\n" }));

    parser.on("data", (line: string) => {
      lines.push(line.trimEnd());
    });

    sp.on("error", (err) => {
      resolve(`ERROR on ${port}: ${err.message}`);
    });

    setTimeout(() => {
      sp.close();
      if (lines.length === 0) {
        resolve(`No output from ${port} in ${durationS}s (baud=${baud})`);
      } else {
        resolve(
          `=== UART LOG ${port} (${durationS}s, ${baud} baud) ===\n${lines.join("\n")}`
        );
      }
    }, durationS * 1000);
  });
}
