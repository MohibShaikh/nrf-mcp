"""
nRF MCP Server
Lets Claude build, flash, and read logs from nRF54L15DK boards.
"""

import asyncio
import json
import os
import subprocess
import time
from pathlib import Path

import serial
import serial.tools.list_ports
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

# ─── Config ───────────────────────────────────────────────────────────────────

def _auto_detect_toolchain() -> str:
    """Find newest toolchain in ~/ncs/toolchains/ that contains west."""
    ncs_dir = Path.home() / "ncs" / "toolchains"
    if not ncs_dir.exists():
        return ""
    candidates = [
        d for d in ncs_dir.iterdir()
        if (d / "usr" / "local" / "bin" / "west").exists()
        or (d / "bin" / "west").exists()
    ]
    if not candidates:
        return ""
    return str(sorted(candidates)[-1])

def _find_west(toolchain: str) -> str:
    for candidate in [
        Path(toolchain) / "usr" / "local" / "bin" / "west",
        Path(toolchain) / "bin" / "west",
    ]:
        if candidate.exists():
            return str(candidate)
    return "west"

def _auto_detect_sdk() -> str:
    ncs_dir = Path.home() / "ncs"
    if not ncs_dir.exists():
        return ""
    versions = sorted(
        d for d in ncs_dir.iterdir()
        if d.name.startswith("v") and (d / "zephyr").exists()
    )
    return str(versions[-1]) if versions else ""

TOOLCHAIN = os.environ.get("NRF_TOOLCHAIN") or _auto_detect_toolchain()
SDK       = os.environ.get("NRF_SDK") or _auto_detect_sdk()
WEST      = os.environ.get("NRF_WEST") or _find_west(TOOLCHAIN)
JLINK_DIR = os.environ.get("JLINK_DIR", "/opt/SEGGER/JLink")

ENV = {
    **os.environ,
    "PATH": f"{TOOLCHAIN}/usr/local/bin:{TOOLCHAIN}/bin:{os.environ.get('PATH', '')}",
    "ZEPHYR_BASE": f"{SDK}/zephyr",
    "ZEPHYR_SDK_INSTALL_DIR": TOOLCHAIN,
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def run(cmd: list[str], cwd: str | None = None, timeout: int = 300) -> dict:
    """Run a subprocess, return stdout/stderr/returncode."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            env=ENV,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "ok": result.returncode == 0,
        }
    except subprocess.TimeoutExpired:
        return {"returncode": -1, "stdout": "", "stderr": "Timeout", "ok": False}
    except FileNotFoundError as e:
        return {"returncode": -1, "stdout": "", "stderr": str(e), "ok": False}


def fmt(result: dict, label: str) -> str:
    """Format a subprocess result for display."""
    status = "OK" if result["ok"] else f"FAILED (exit {result['returncode']})"
    out = []
    out.append(f"=== {label}: {status} ===")
    if result["stdout"].strip():
        out.append(result["stdout"].strip())
    if result["stderr"].strip():
        out.append("--- stderr ---")
        out.append(result["stderr"].strip())
    return "\n".join(out)


def get_vscode_config(sample_path: str) -> dict | None:
    """Read .vscode-nrf-connect.json from sample's build dir."""
    cfg = Path(sample_path) / "build" / ".vscode-nrf-connect.json"
    if cfg.exists():
        return json.loads(cfg.read_text())
    return None


# ─── MCP Server ───────────────────────────────────────────────────────────────

server = Server("nrf-mcp")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="build",
            description="Build a Zephyr/nRF firmware sample using the nRF Connect SDK toolchain.",
            inputSchema={
                "type": "object",
                "properties": {
                    "sample_path": {
                        "type": "string",
                        "description": "Absolute path to the sample directory (e.g. /home/tsd/ncs/v2.9.2/ncs-zigbee/samples/ble_pi_direct/peripheral)",
                    },
                    "board": {
                        "type": "string",
                        "description": "Board target (e.g. nrf54l15dk/nrf54l15/cpuapp). If omitted, reads from build/.vscode-nrf-connect.json.",
                    },
                    "pristine": {
                        "type": "boolean",
                        "description": "Clean build (west build --pristine). Default false.",
                    },
                },
                "required": ["sample_path"],
            },
        ),
        Tool(
            name="flash",
            description="Flash firmware to a connected nRF board. Optionally build first.",
            inputSchema={
                "type": "object",
                "properties": {
                    "sample_path": {
                        "type": "string",
                        "description": "Absolute path to the sample directory.",
                    },
                    "board": {
                        "type": "string",
                        "description": "Board target. If omitted, reads from build/.vscode-nrf-connect.json.",
                    },
                    "build_first": {
                        "type": "boolean",
                        "description": "Build before flashing. Default false.",
                    },
                    "snr": {
                        "type": "string",
                        "description": "J-Link serial number for multi-board setups.",
                    },
                },
                "required": ["sample_path"],
            },
        ),
        Tool(
            name="read_uart_logs",
            description="Read UART logs from a connected nRF board for a given number of seconds.",
            inputSchema={
                "type": "object",
                "properties": {
                    "port": {
                        "type": "string",
                        "description": "Serial port (e.g. /dev/ttyACM0). If omitted, auto-detects first Nordic port.",
                    },
                    "duration_s": {
                        "type": "integer",
                        "description": "How many seconds to read. Default 5.",
                    },
                    "baud": {
                        "type": "integer",
                        "description": "Baud rate. Default 115200.",
                    },
                },
                "required": [],
            },
        ),
        Tool(
            name="reset_board",
            description="Hard reset the nRF board via nrfjprog.",
            inputSchema={
                "type": "object",
                "properties": {
                    "snr": {
                        "type": "string",
                        "description": "J-Link serial number. If omitted, resets first found board.",
                    },
                },
                "required": [],
            },
        ),
        Tool(
            name="list_boards",
            description="List connected nRF J-Link boards and their serial numbers.",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": [],
            },
        ),
        Tool(
            name="get_build_info",
            description="Read build_info.yml and .vscode-nrf-connect.json from a sample's build directory.",
            inputSchema={
                "type": "object",
                "properties": {
                    "sample_path": {
                        "type": "string",
                        "description": "Absolute path to the sample directory.",
                    },
                },
                "required": ["sample_path"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "build":
        return await tool_build(arguments)
    elif name == "flash":
        return await tool_flash(arguments)
    elif name == "read_uart_logs":
        return await tool_read_uart(arguments)
    elif name == "reset_board":
        return await tool_reset(arguments)
    elif name == "list_boards":
        return await tool_list_boards(arguments)
    elif name == "get_build_info":
        return await tool_get_build_info(arguments)
    else:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]


# ─── Tool Implementations ─────────────────────────────────────────────────────

async def tool_build(args: dict) -> list[TextContent]:
    sample_path = args["sample_path"]
    pristine = args.get("pristine", False)

    # Resolve board from arg or .vscode-nrf-connect.json
    board = args.get("board")
    if not board:
        cfg = get_vscode_config(sample_path)
        if cfg:
            board = cfg.get("board")
    if not board:
        return [TextContent(type="text", text="ERROR: No board specified and no build/.vscode-nrf-connect.json found. Pass 'board' argument.")]

    cmd = [WEST, "build", "-b", board, "--build-dir", "build"]
    if pristine:
        cmd.append("--pristine")

    result = run(cmd, cwd=sample_path, timeout=300)
    return [TextContent(type="text", text=fmt(result, f"BUILD {Path(sample_path).name} ({board})"))]


async def tool_flash(args: dict) -> list[TextContent]:
    sample_path = args["sample_path"]
    build_first = args.get("build_first", False)
    snr = args.get("snr")
    output = []

    # Optionally build first
    if build_first:
        board = args.get("board")
        if not board:
            cfg = get_vscode_config(sample_path)
            if cfg:
                board = cfg.get("board")
        if not board:
            return [TextContent(type="text", text="ERROR: No board specified for build step.")]

        build_result = run([WEST, "build", "-b", board, "--build-dir", "build"], cwd=sample_path)
        output.append(fmt(build_result, f"BUILD {Path(sample_path).name}"))
        if not build_result["ok"]:
            return [TextContent(type="text", text="\n\n".join(output))]

    # Flash
    cmd = [WEST, "flash", "--build-dir", "build"]
    if snr:
        cmd += ["--snr", snr]

    flash_result = run(cmd, cwd=sample_path, timeout=120)
    output.append(fmt(flash_result, f"FLASH {Path(sample_path).name}"))

    return [TextContent(type="text", text="\n\n".join(output))]


async def tool_read_uart(args: dict) -> list[TextContent]:
    port = args.get("port")
    duration_s = args.get("duration_s", 5)
    baud = args.get("baud", 115200)

    # Auto-detect Nordic USB CDC port
    if not port:
        for p in serial.tools.list_ports.comports():
            if "Nordic" in (p.manufacturer or "") or "nRF" in (p.description or ""):
                port = p.device
                break
        if not port:
            # Fall back to first ACM port
            for p in serial.tools.list_ports.comports():
                if "ACM" in p.device or "ttyUSB" in p.device:
                    port = p.device
                    break

    if not port:
        ports = [p.device for p in serial.tools.list_ports.comports()]
        return [TextContent(type="text", text=f"ERROR: No serial port found. Available: {ports}")]

    lines = []
    try:
        with serial.Serial(port, baud, timeout=1) as ser:
            end_time = time.time() + duration_s
            while time.time() < end_time:
                line = ser.readline()
                if line:
                    lines.append(line.decode("utf-8", errors="replace").rstrip())
    except serial.SerialException as e:
        return [TextContent(type="text", text=f"ERROR opening {port}: {e}")]

    if not lines:
        return [TextContent(type="text", text=f"No output from {port} in {duration_s}s (baud={baud})")]

    output = f"=== UART LOG {port} ({duration_s}s, {baud} baud) ===\n"
    output += "\n".join(lines)
    return [TextContent(type="text", text=output)]


async def tool_reset(args: dict) -> list[TextContent]:
    snr = args.get("snr")
    nrfjprog = f"{TOOLCHAIN}/bin/nrfjprog"

    # Fall back to system nrfjprog
    if not Path(nrfjprog).exists():
        nrfjprog = "nrfjprog"

    cmd = [nrfjprog, "--reset"]
    if snr:
        cmd += ["--snr", snr]

    result = run(cmd, timeout=30)
    return [TextContent(type="text", text=fmt(result, "RESET"))]


async def tool_list_boards(args: dict) -> list[TextContent]:
    nrfjprog = f"{TOOLCHAIN}/bin/nrfjprog"
    if not Path(nrfjprog).exists():
        nrfjprog = "nrfjprog"

    result = run([nrfjprog, "--ids"], timeout=15)

    # Also list serial ports for context
    ports = []
    for p in serial.tools.list_ports.comports():
        ports.append(f"  {p.device} — {p.description} [{p.manufacturer}]")

    output = fmt(result, "J-LINK BOARDS")
    output += "\n\n=== SERIAL PORTS ===\n"
    output += "\n".join(ports) if ports else "  (none found)"

    return [TextContent(type="text", text=output)]


async def tool_get_build_info(args: dict) -> list[TextContent]:
    sample_path = args["sample_path"]
    build_dir = Path(sample_path) / "build"
    output = []

    # .vscode-nrf-connect.json
    vscode_cfg = build_dir / ".vscode-nrf-connect.json"
    if vscode_cfg.exists():
        output.append("=== .vscode-nrf-connect.json ===")
        output.append(vscode_cfg.read_text())
    else:
        output.append("=== .vscode-nrf-connect.json: NOT FOUND ===")

    # build_info.yml
    build_info = build_dir / "build_info.yml"
    if build_info.exists():
        output.append("=== build_info.yml ===")
        output.append(build_info.read_text())
    else:
        output.append("=== build_info.yml: NOT FOUND ===")

    # domains.yaml (sysbuild)
    domains = build_dir / "domains.yaml"
    if domains.exists():
        output.append("=== domains.yaml ===")
        output.append(domains.read_text())

    return [TextContent(type="text", text="\n\n".join(output))]


# ─── Entry Point ──────────────────────────────────────────────────────────────

async def _run():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


def main():
    asyncio.run(_run())


if __name__ == "__main__":
    main()
