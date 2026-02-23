# nRF MCP Server

MCP server that lets Claude directly interact with nRF54L15DK hardware — build, flash, read logs, reset.

## What It Does

Exposes nRF Connect SDK tooling as MCP tools so Claude can:
- Build Zephyr firmware (`west build`)
- Flash to connected board (`west flash`)
- Stream RTT/UART logs back in real time
- Reset the board
- Query connected boards (J-Link)

## Target Hardware

- **Primary:** nRF54L15DK (nrf54l15dk/nrf54l15/cpuapp)
- **SDK:** nRF Connect SDK v2.9.2 at `/home/tsd/ncs/v2.9.2/`
- **Samples:** `/home/tsd/ncs/v2.9.2/ncs-zigbee/samples/`

## Stack

- **Language:** Python
- **MCP framework:** `mcp` Python SDK (anthropic)
- **Build/flash:** wraps `west` CLI
- **Logs:** `pyserial` for UART, `pylink-square` for RTT via J-Link
- **Board detection:** `JLinkExe` / `nrfjprog`

## Planned Tools

| Tool | Description |
|------|-------------|
| `build` | Run `west build` with board and sample path |
| `flash` | Run `west flash`, optionally specify serial number for multi-board |
| `read_uart_logs` | Open UART port, stream logs for N seconds |
| `read_rtt_logs` | Stream RTT logs via J-Link for N seconds |
| `reset_board` | Hard reset via nrfjprog or west |
| `list_boards` | List connected J-Link boards and their serial numbers |
| `get_build_info` | Read `build_info.yml` from last build |

## Environment

- **Toolchain:** `/home/tsd/ncs/toolchains/b77d8c1312` — nRF-managed toolchain, NOT system gcc
- **SDK:** `/home/tsd/ncs/v2.9.2`
- **west binary:** `/home/tsd/ncs/toolchains/b77d8c1312/bin/west`
- **Board definitions:** `/home/tsd/ncs/v2.9.2/zephyr/boards/nordic/nrf54l15dk`
- **J-Link tools:** standard install path `/opt/SEGGER/JLink/`
- **UART device:** typically `/dev/ttyACM0` or `/dev/ttyACM1`

> **Why terminal builds fail:** The nRF Connect VS Code extension uses the managed toolchain at
> `/home/tsd/ncs/toolchains/b77d8c1312/`. Plain `west` in terminal uses system paths which
> don't have the right gcc/cmake versions. Always use the full toolchain path.

## Correct Build Command

```bash
export PATH=/home/tsd/ncs/toolchains/b77d8c1312/bin:$PATH

# Build
/home/tsd/ncs/toolchains/b77d8c1312/bin/west build \
  -b <board_target> \
  --build-dir build

# Flash
/home/tsd/ncs/toolchains/b77d8c1312/bin/west flash --build-dir build
```

## Board Targets (confirmed from VS Code builds)

| Sample | Board target |
|--------|-------------|
| `ble_pi_direct/peripheral` | `nrf54l15dk/nrf54l05/cpuapp` |
| `peripheral_uart_1` | `nrf54l15dk/nrf54l15/cpuapp` |

Note: `nrf54l05` vs `nrf54l15` — different CPU variants, check `.vscode-nrf-connect.json`
in the sample's `build/` dir to confirm the right target for each sample.

## Key Conventions

- Always use `/home/tsd/ncs/toolchains/b77d8c1312/bin/west`, never bare `west`
- `west build` output goes to `<sample_dir>/build/`
- For multi-board setups pass `--snr <serial>` to `west flash`
- RTT channel 0 is the default Zephyr log channel
- UART baud rate is 115200 for all nRF54L15 samples
- Check `build/.vscode-nrf-connect.json` in any sample to get its exact board target and toolchain

## Skills to Add

- `/flash` — build and flash in one shot with board target
- `/logs` — attach to UART or RTT and tail logs
- `/build` — build only, report errors back

## Related Paths

- nRF Connect SDK: `/home/tsd/ncs/v2.9.2/`
- Zigbee samples: `/home/tsd/ncs/v2.9.2/ncs-zigbee/samples/`
- BLE pi direct sample: `/home/tsd/ncs/v2.9.2/ncs-zigbee/samples/ble_pi_direct/`
- BLE long range sample: `/home/tsd/ncs/v2.9.2/ncs-zigbee/samples/ble_long_range/`
