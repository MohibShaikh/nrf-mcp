#!/usr/bin/env node
/**
 * nRF MCP Server
 * Build, flash, and read logs from nRF boards via Claude or any MCP client.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { toolBuild } from "./tools/build.js";
import { toolFlash } from "./tools/flash.js";
import { toolReadUart } from "./tools/uart.js";
import { toolReset, toolListBoards } from "./tools/board.js";
import { toolGetBuildInfo } from "./tools/buildinfo.js";
import { configSummary } from "./config.js";

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "build",
    description:
      "Build a Zephyr/nRF firmware sample using the nRF Connect SDK toolchain.",
    inputSchema: {
      type: "object",
      properties: {
        sample_path: {
          type: "string",
          description: "Absolute path to the sample directory.",
        },
        board: {
          type: "string",
          description:
            "Board target (e.g. nrf54l15dk/nrf54l15/cpuapp). Auto-detected from build/.vscode-nrf-connect.json if omitted.",
        },
        pristine: {
          type: "boolean",
          description: "Clean build (west build --pristine). Default false.",
        },
      },
      required: ["sample_path"],
    },
  },
  {
    name: "flash",
    description:
      "Flash firmware to a connected nRF board. Optionally build first.",
    inputSchema: {
      type: "object",
      properties: {
        sample_path: {
          type: "string",
          description: "Absolute path to the sample directory.",
        },
        board: {
          type: "string",
          description: "Board target. Auto-detected if omitted.",
        },
        build_first: {
          type: "boolean",
          description: "Build before flashing. Default false.",
        },
        snr: {
          type: "string",
          description: "J-Link serial number for multi-board setups.",
        },
      },
      required: ["sample_path"],
    },
  },
  {
    name: "read_uart_logs",
    description:
      "Read UART logs from a connected nRF board for a given number of seconds.",
    inputSchema: {
      type: "object",
      properties: {
        port: {
          type: "string",
          description:
            "Serial port (e.g. /dev/ttyACM0). Auto-detects first Nordic port if omitted.",
        },
        duration_s: {
          type: "integer",
          description: "How many seconds to read. Default 5.",
        },
        baud: {
          type: "integer",
          description: "Baud rate. Default 115200.",
        },
      },
      required: [],
    },
  },
  {
    name: "reset_board",
    description: "Hard reset the nRF board via nrfjprog.",
    inputSchema: {
      type: "object",
      properties: {
        snr: {
          type: "string",
          description:
            "J-Link serial number. Resets first found board if omitted.",
        },
      },
      required: [],
    },
  },
  {
    name: "list_boards",
    description:
      "List connected nRF J-Link boards and their serial numbers.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_build_info",
    description:
      "Read build_info.yml and .vscode-nrf-connect.json from a sample's build directory.",
    inputSchema: {
      type: "object",
      properties: {
        sample_path: {
          type: "string",
          description: "Absolute path to the sample directory.",
        },
      },
      required: ["sample_path"],
    },
  },
];

// ─── Server ──────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "nrf-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = (args ?? {}) as Record<string, unknown>;

  let text: string;

  switch (name) {
    case "build":
      text = await toolBuild(a);
      break;
    case "flash":
      text = await toolFlash(a);
      break;
    case "read_uart_logs":
      text = await toolReadUart(a);
      break;
    case "reset_board":
      text = await toolReset(a);
      break;
    case "list_boards":
      text = await toolListBoards(a);
      break;
    case "get_build_info":
      text = await toolGetBuildInfo(a);
      break;
    default:
      text = `Unknown tool: ${name}`;
  }

  return { content: [{ type: "text", text }] };
});

// ─── Start ───────────────────────────────────────────────────────────────────

process.stderr.write(`nRF MCP Server starting...\n${configSummary()}\n`);

const transport = new StdioServerTransport();
await server.connect(transport);
