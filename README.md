# nrf-mcp

MCP server for nRF54L15DK — lets Claude (or any MCP client) build, flash, and read logs from nRF boards directly.

## What it does

| Tool | Description |
|------|-------------|
| `build` | Run `west build` with auto board detection |
| `flash` | Run `west flash`, optionally build first, supports multi-board via `--snr` |
| `read_uart_logs` | Stream UART logs from the board for N seconds |
| `reset_board` | Hard reset via `nrfjprog` |
| `list_boards` | List connected J-Link boards and serial ports |
| `get_build_info` | Read `build_info.yml` and `.vscode-nrf-connect.json` from a build dir |

## Packages

| Package | Platform | Install |
|---------|----------|---------|
| [`nrf_mcp_ts/`](./nrf_mcp_ts/) | npm (TypeScript) | `npm install -g nrf-mcp` |
| [`nrf_mcp/`](./nrf_mcp/) | PyPI (Python) | `pip install nrf-mcp` |

## Quick start

### Claude Code
```bash
claude mcp add nrf -- npx nrf-mcp
```

### Claude Desktop
```json
{
  "mcpServers": {
    "nrf": {
      "command": "npx",
      "args": ["nrf-mcp"]
    }
  }
}
```

## Prerequisites

- [nRF Connect SDK](https://developer.nordicsemi.com/nRF_Connect_SDK/doc/latest/nrf/installation.html)
- [J-Link tools](https://www.segger.com/downloads/jlink/)
- Node.js >= 18 (for TypeScript version) or Python >= 3.10 (for Python version)

## Auto-detection

No configuration needed for standard nRF Connect SDK installations. The server auto-detects:
- Toolchain from `~/ncs/toolchains/`
- SDK from `~/ncs/v*/`
- Board target from `build/.vscode-nrf-connect.json`

See [`nrf_mcp_ts/README.md`](./nrf_mcp_ts/README.md) for full configuration options.

## License

MIT
