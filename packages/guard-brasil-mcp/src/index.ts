#!/usr/bin/env bun
/**
 * @egosbr/guard-brasil-mcp v0.2.1
 *
 * MCP Server (stdio; HTTP remoto em http.ts) — Guard Brasil PII/LGPD detection.
 * Migrated 2026-05-13 from custom JSON-RPC to official @modelcontextprotocol/sdk
 * (MCP-F1-004 — Codex GPT-5.5 review recommendation).
 *
 * Connect via Claude Code:
 *   { "mcpServers": { "guard-brasil": { "command": "bun", "args": ["packages/guard-brasil-mcp/src/index.ts"] } } }
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGuardServer } from "./server.js";

const server = createGuardServer();
await server.connect(new StdioServerTransport());
