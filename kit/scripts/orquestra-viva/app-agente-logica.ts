/**
 * app-agente-logica.ts — IDEMPOTENCIA-ENVIO-PAINEL-001 (corte Enio 15/09, bug medido: o Enio
 * escreveu "oi" UMA vez no campo da aba Agentes e a mensagem chegou 6x idêntica na sessão
 * tmux). Causa raiz: zero idempotência em toda a cadeia — nem no cliente (nenhuma guarda
 * contra religar o listener do botão de envio no mesmo elemento) nem no servidor (POST sem
 * chave de dedup, ver `envioRepetido` em rotas-agente-canal.ts).
 *
 * FONTE ÚNICA da decisão pura do lado cliente (deveMontarListener/marcarMontado) — o
 * navegador NÃO importa TS (mesmo motivo documentado em app-notificacoes.js/
 * app-toast-logica.ts: "mirror aqui porque o navegador não importa TS"), então
 * app-agente.js MIRRORA esta checagem inline (~2 linhas, comentada "mirror de
 * app-agente-logica.ts"). Mudou aqui → mudar lá também, na mesma revisão.
 */

/** Dataset mínimo que a guarda precisa — o único campo lido/escrito é `ligado`. */
export interface DatasetMontagem {
  ligado?: string;
}

/** deveMontarListener — PURA: true só na 1ª chamada para um dado elemento (dataset ainda sem
 *  a marca). Chamar a função de montagem N vezes sobre o MESMO elemento nunca liga o listener
 *  mais de 1 vez — é essa a guarda que faltava e permitiu 1 clique virar 6 injeções. */
export function deveMontarListener(dataset: DatasetMontagem): boolean {
  return dataset.ligado !== "1";
}

/** marcarMontado — grava a marca. Chamar antes de `addEventListener` (não depois) — se o
 *  registro do listener lançar, a 2ª chamada não deve achar "já montado" sem ter montado nada;
 *  isso é decisão de quem chama, esta função só grava. */
export function marcarMontado(dataset: DatasetMontagem): void {
  dataset.ligado = "1";
}
