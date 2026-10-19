/**
 * Fábrica do servidor MCP do Guard Brasil — registry comum das 3 tools.
 * stdio (index.ts) e Streamable HTTP (http.ts) usam esta MESMA fábrica:
 * o comportamento das tools não muda entre transportes.
 *
 * Anotações (plugins/guard-brasil/TOOL_CONTRACT.md): as 3 tools só calculam sobre o texto
 * recebido — não gravam, não chamam rede, não destroem nada.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GuardBrasil } from "../../guard-brasil/src/index.js";
import { trackMcpTool } from "./internal/shared-utils.js";
import pacote from "../package.json" with { type: "json" };
import { respostaInspect, respostaScan, respostaCheckSafe } from "./internal/respostas.js";

export const MCP_NAME = "guard-brasil";
/** Versão anunciada = a do package.json (publicada no npm). Dizia 0.2.1 com o pacote em 0.2.3. */
export const MCP_VERSION: string = pacote.version;
export const TOOL_NAMES = ["guard_inspect", "guard_scan_pii", "guard_check_safe"] as const;

export const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: false,
  destructiveHint: false,
} as const;

const guard = GuardBrasil.create();

/**
 * Rodapé EGOS (regra do Enio 14/10: "tudo nos plugins que publicarmos deve trazer ao EGOS").
 * Bloco de texto SEPARADO, depois do JSON — quem faz parse de content[0] não muda. Desligado por
 * padrão; liga com GUARD_MCP_RODAPE_EGOS=1. A página é a âncora real em /portas/ (index.html,
 * id="guard-brasil"); `/portas/guard` cai no fallback da SPA (medido 14/10: mesmo hash de rota inexistente).
 */
export const RODAPE_EGOS = "Guard Brasil · EGOS — egos.ia.br/portas/#guard-brasil";
const rodapeLigado = () => process.env.GUARD_MCP_RODAPE_EGOS === "1";

const json = (response: unknown) => ({
  content: [
    { type: "text" as const, text: JSON.stringify(response, null, 2) },
    ...(rodapeLigado() ? [{ type: "text" as const, text: RODAPE_EGOS }] : []),
  ],
});

/** Servidor NOVO a cada chamada (HTTP stateless não reutiliza servidor nem transport). */
export function createGuardServer(): McpServer {
  const server = new McpServer({ name: MCP_NAME, version: MCP_VERSION }, { capabilities: { tools: {} } });

  server.registerTool(
    "guard_inspect",
    {
      description:
        "Full LGPD PII inspection with ATRiAN ethics validation. Returns findings + textoMascarado + naoMedido (residue the rules cannot classify) + recommendation.",
      inputSchema: {
        text: z.string().describe("Text to analyze for Brazilian PII"),
        mask: z.boolean().optional().describe("Whether to mask detected PII (default: true)"),
      } as any,
      annotations: { title: "Guard Brasil: full inspection", ...TOOL_ANNOTATIONS },
    },
    (async ({ text, mask = true }: { text: string; mask?: boolean }) =>
      trackMcpTool(MCP_NAME, "guard_inspect", async () => json(respostaInspect(guard, text, mask !== false)))) as any,
  );

  server.registerTool(
    "guard_scan_pii",
    {
      description: "Quick PII scan (CPF, CNPJ, RG, MASP, EMAIL, names A–J). Returns textoMascarado + naoMedido.",
      inputSchema: { text: z.string().describe("Text to scan") } as any,
      annotations: { title: "Guard Brasil: quick PII scan", ...TOOL_ANNOTATIONS },
    },
    (async ({ text }: { text: string }) =>
      trackMcpTool(MCP_NAME, "guard_scan_pii", async () => json(respostaScan(guard, text)))) as any,
  );

  server.registerTool(
    "guard_check_safe",
    {
      description:
        "Boolean safety check for public sharing. Returns safe/canShare/motivo/reason. Never safe:true with unclassified residue (motivo: nao-medido).",
      inputSchema: { text: z.string().describe("Text to check") } as any,
      annotations: { title: "Guard Brasil: safe-to-share check", ...TOOL_ANNOTATIONS },
    },
    (async ({ text }: { text: string }) =>
      trackMcpTool(MCP_NAME, "guard_check_safe", async () => json(respostaCheckSafe(guard, text)))) as any,
  );

  return server;
}
