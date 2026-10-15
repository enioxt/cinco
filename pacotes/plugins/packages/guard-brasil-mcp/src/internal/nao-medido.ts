/**
 * nao-medido — o que sobra no texto JÁ MASCARADO e as regras não sabem classificar.
 *
 * PCA-332:a (2026-10-05). O MCP `guard_check_safe` respondia "No PII found" sempre que o scan
 * voltava vazio — e o scan não cobre nome no meio da frase sem rótulo, valor em R$, endereço,
 * OAB, nem telefone fora dos formatos conhecidos. "Não achei" virava "é seguro" (R13-c: "não
 * sei" nunca se apresenta como "ok"). Este módulo não MASCARA nada: só aponta o resíduo que
 * torna o veredito impossível de dar, para o chamador responder `nao-medido` em vez de 🟢.
 *
 * Roda sobre o texto mascarado de propósito: o que já virou `[X REMOVIDO]` saiu da conta, o que
 * sobrou é exatamente o que iria a público. Nasce restritivo (calibragem progressiva, R11.4):
 * falso-positivo aqui custa uma revisão humana; falso-negativo custa um vazamento assinado.
 */

export type SinalNaoMedido = 'nome-provavel' | 'valor' | 'endereco' | 'oab' | 'numero-residual' | 'codigo-interno';

export interface AchadoNaoMedido {
  sinal: SinalNaoMedido;
  /** Posição no texto analisado. O trecho em si NÃO é devolvido — quem chama já tem o texto. */
  start: number;
  end: number;
}

const MAI = 'A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÇ';
const MIN = 'a-záéíóúãõâêîôûàçü';
const PALAVRA_PROPRIA = `[${MAI}][${MIN}]+`;

/**
 * GUARD-RESIDUO-001 (2026-10-14): "ZK-ALPHA-99871" e "QX-77-OMEGA" saíam com naoMedido:[] e
 * safe:true — nenhuma regra os conhecia e nenhuma os apontava. Token que mistura letra e dígito
 * (com ou sem separador) tem cara de matrícula, protocolo, código de cadastro: não sabemos
 * classificar, então NÃO dizemos que é seguro. Exceção só para notação técnica/pública conhecida.
 */
const CODIGO_PUBLICO_CONHECIDO = new RegExp(
  '^(?:' +
    [
      'covid-19', 'sars-cov-2', 'h1n1', 'h5n1', 'cid-1[01]', 'iso-?\\d+(?:[-:]\\d+)*', 'nbr-?\\d+', 'abnt-?nbr-?\\d+',
      'utf-(?:8|16|32)', 'sha-?(?:1|256|384|512)', 'md5', 'base64', 'x86(?:-64)?', 'x64', 'arm64', 'ipv[46]', 'mp[34]', 'h26[45]',
      '[2-6]g', 'covid', 'g20', 'g7', 'web3', 'b2b', 'b2c',
      // rodovia federal/estadual: BR-040, MG-050
      '(?:br|ac|al|am|ap|ba|ce|df|es|go|ma|mg|ms|mt|pa|pb|pe|pi|pr|rj|rn|ro|rr|rs|sc|se|sp|to)-\\d{3}',
    ].join('|') +
    ')$',
  'i',
);
function pareceCodigoInterno(token: string): boolean {
  if (!/[A-Za-z]/.test(token) || !/\d/.test(token)) return false;
  if (token.replace(/[^A-Za-z0-9]/g, '').length < 5) return false;
  return !CODIGO_PUBLICO_CONHECIDO.test(token);
}

const REGRAS: Array<{ sinal: SinalNaoMedido; re: RegExp; aceita?: (m: string) => boolean }> = [
  // 2+ palavras capitalizadas seguidas (conectivo de/da/do/dos/das no meio) — "Joana Ribeiro Antunes".
  { sinal: 'nome-provavel', re: new RegExp(`${PALAVRA_PROPRIA}(?:\\s+(?:d[aeo]s?\\s+)?${PALAVRA_PROPRIA})+`, 'gu') },
  // Valor monetário: "R$ 82.000,00", "82 mil", "1,5 milhão".
  { sinal: 'valor', re: /R\$\s*\d|\b\d+(?:[.,]\d+)*\s*(?:mil|milh(?:ão|ões|ao|oes)|bilh(?:ão|ões|ao|oes))\b/giu },
  // Logradouro + número: "Rua das Acácias, 123".
  { sinal: 'endereco', re: /\b(?:Rua|R\.|Avenida|Av\.|Travessa|Tv\.|Alameda|Rodovia|Pra[çc]a|Estrada|Largo)\s+[^\n,;]{2,60},?\s*(?:n[º°o.]?\s*)?\d+/giu },
  // OAB em qualquer formato — identifica o profissional.
  { sinal: 'oab', re: /\bOAB\b/gu },
  // Sequência numérica com ≥8 dígitos que nenhuma regra classificou (telefone fora do formato etc.).
  { sinal: 'numero-residual', re: /\+?\d[\d\s().\-/]{6,}\d/gu, aceita: (m) => m.replace(/\D/g, '').length >= 8 },
  // Token alfanumérico com letra E dígito (ZK-ALPHA-99871, QX-77-OMEGA, AB12345) fora da notação pública conhecida.
  { sinal: 'codigo-interno', re: /(?<![\p{L}\d])[A-Za-z0-9]+(?:[-_./][A-Za-z0-9]+)*(?![\p{L}\d])/gu, aceita: pareceCodigoInterno },
];

/** Aponta o resíduo não-classificado. Lista vazia = nada que as regras não saibam medir. */
export function detectarNaoMedido(textoMascarado: string): AchadoNaoMedido[] {
  const achados: AchadoNaoMedido[] = [];
  for (const { sinal, re, aceita } of REGRAS) {
    const r = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = r.exec(textoMascarado)) !== null) {
      if (aceita && !aceita(m[0])) continue;
      achados.push({ sinal, start: m.index, end: m.index + m[0].length });
    }
  }
  return achados.sort((a, b) => a.start - b.start);
}
