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

## Prerequisites

- [nRF Connect SDK](https://developer.nordicsemi.com/nRF_Connect_SDK/doc/latest/nrf/installation.html) installed
- [J-Link tools](https://www.segger.com/downloads/jlink/) for flash/reset
- Node.js >= 18

## Installation

```bash
npm install -g nrf-mcp
```

Or run directly without installing:
```bash
npx nrf-mcp
```

## Claude Code setup

```bash
claude mcp add nrf -- npx nrf-mcp
```

With custom toolchain path:
```bash
claude mcp add nrf -e NRF_TOOLCHAIN=/path/to/toolchain -e NRF_SDK=/path/to/sdk -- npx nrf-mcp
```

## Claude Desktop setup

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "nrf": {
      "command": "npx",
      "args": ["nrf-mcp"],
      "env": {
        "NRF_TOOLCHAIN": "/path/to/ncs/toolchains/<hash>",
        "NRF_SDK": "/path/to/ncs/v2.x.x"
      }
    }
  }
}
```

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NRF_TOOLCHAIN` | Path to nRF managed toolchain | Auto-detected from `~/ncs/toolchains/` |
| `NRF_SDK` | Path to nRF Connect SDK | Auto-detected from `~/ncs/v*/` |
| `NRF_WEST` | Path to `west` binary | `$NRF_TOOLCHAIN/bin/west` |
| `NRFJPROG` | Path to `nrfjprog` binary | `$NRF_TOOLCHAIN/bin/nrfjprog` |
| `JLINK_DIR` | Path to J-Link installation | `/opt/SEGGER/JLink` |

## Auto-detection

If `NRF_TOOLCHAIN` and `NRF_SDK` are not set, the server auto-detects them from:
- Toolchain: newest entry in `~/ncs/toolchains/` that contains `bin/west`
- SDK: newest versioned directory in `~/ncs/v*/` that contains `zephyr/`

This works out of the box for standard nRF Connect SDK installations.

## Example usage

Once connected, ask Claude:

> "Build the peripheral firmware in `/path/to/my-sample/peripheral`"

> "Flash the ble_long_range peripheral sample"

> "Show me the UART logs from the board for 10 seconds"

> "What boards are connected?"

## Board target auto-detection

The server reads `.vscode-nrf-connect.json` from the sample's `build/` directory to determine the board target automatically — the same config VS Code uses. No need to specify the board manually if you've built with VS Code before.

## License

MIT
