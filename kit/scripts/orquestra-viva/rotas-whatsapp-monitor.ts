/**
 * rotas-whatsapp-monitor.ts — GET /api/whatsapp/monitor (WPP-OBSERVABILIDADE-001, 15/09).
 * Rota FINA: lê só a ÚLTIMA linha de ~/.egos/uso/whatsapp-monitor.jsonl, gravada a cada 60s
 * pelo timer egos-whatsapp-monitor.timer (scripts/whatsapp-monitor.ts). NUNCA remede na hora
 * (journalctl/systemctl/tmux por requisição HTTP seria caro e duplicaria o que o timer já faz)
 * — mesmo contrato de rotas-uso.ts: sempre 200, fonte ausente/ilegível vira "⚪ ..." dentro da
 * resposta, nunca 500 (R13-c).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

function jsonlPath(): string {
  const dir = process.env["EGOS_USO_OUT_DIR"] ?? join(process.env["HOME"] ?? homedir(), ".egos", "uso");
  return join(dir, "whatsapp-monitor.jsonl");
}

export async function tratarWhatsappMonitorGet(): Promise<Response> {
  const caminho = jsonlPath();
  if (!existsSync(caminho)) {
    return Response.json({
      ts: null,
      status: "⚪ NAO-MEDIDO — whatsapp-monitor.jsonl ainda não existe (timer não rodou nesta máquina)",
      itens: [], resumo: { verde: 0, amarelo: 0, vermelho: 0, naoMedido: 0 },
      tempos: [], contagensPorCanal: {},
    });
  }
  try {
    const linhas = readFileSync(caminho, "utf-8").split("\n").filter(Boolean);
    const ultima = linhas[linhas.length - 1];
    if (!ultima) throw new Error("arquivo vazio");
    const j = JSON.parse(ultima);
    const idadeSeg = j.ts ? Math.round((Date.now() - Date.parse(j.ts)) / 1000) : null;
    return Response.json({ ...j, idadeSeg, status: idadeSeg !== null && idadeSeg > 180 ? `⚪ última medição há ${idadeSeg}s (timer pode ter parado)` : null });
  } catch (e) {
    return Response.json({
      ts: null,
      status: `⚪ NAO-MEDIDO — falha ao ler/parsear ${caminho}: ${(e as Error).message}`,
      itens: [], resumo: { verde: 0, amarelo: 0, vermelho: 0, naoMedido: 0 },
      tempos: [], contagensPorCanal: {},
    });
  }
}
