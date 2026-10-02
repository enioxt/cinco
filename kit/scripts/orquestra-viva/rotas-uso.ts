/**
 * rotas-uso.ts — GET /api/uso?janela=agora|hoje|7d (USO-TEMPO-REAL-MULTI-TENANT-001).
 * Camada HTTP fina sobre coletores-uso.ts — mesmo contrato de tratarHistoricoGet: sempre
 * 200, fonte ilegível/ausente vira "⚪ ..." dentro da resposta (=R13-c), nunca 500.
 */
import { agregarUso } from "./coletores-uso";

const JANELAS = new Set(["agora", "hoje", "7d"]);

export async function tratarUsoGet(url: URL): Promise<Response> {
  const pedida = url.searchParams.get("janela") ?? "hoje";
  const janela = (JANELAS.has(pedida) ? pedida : "hoje") as "agora" | "hoje" | "7d";
  return Response.json(agregarUso(janela));
}
