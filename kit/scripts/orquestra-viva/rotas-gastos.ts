/**
 * rotas-gastos.ts — GET /api/gastos?periodo=hoje|7d|30d|mes (GASTOS-VISIVEIS-001).
 * Camada HTTP fina sobre coletores-gastos.ts — mesmo contrato de tratarUsoGet: sempre 200,
 * fonte ilegível/ausente vira "⚪ ..." dentro da resposta (=R13-c), nunca 500.
 */
import { agregarGastos, motivoGastosIndisponivel, type Periodo } from "./coletores-gastos";

const PERIODOS = new Set(["hoje", "7d", "30d", "mes"]);

export async function tratarGastosGet(url: URL): Promise<Response> {
  const motivo = motivoGastosIndisponivel();
  if (motivo) return Response.json({ disponivel: false, motivo });
  const pedido = url.searchParams.get("periodo") ?? "hoje";
  const periodo = (PERIODOS.has(pedido) ? pedido : "hoje") as Periodo;
  const resp = await agregarGastos(periodo);
  return Response.json(resp);
}
