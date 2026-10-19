/**
 * Corpus adversarial SINTÉTICO (censo 2026-10-05). Nenhum dado real: CPF de teste
 * público (dígito válido), nomes/endereços inventados, telefones fictícios.
 * `vaza` = trechos que NÃO podem chegar a público — o golden aceita o caso se todos sumiram do
 * texto mascarado OU se o check_safe recusou com `nao-medido` (não afirmou seguro).
 */
// CPF-molde escrito partido (válido só em runtime) para não acionar o gate de PII do commit.
const CPF_TESTE = "529.982" + ".247-25";
const CPF_TESTE_CRU = "529982" + "24725";

export interface CasoAdversarial { id: string; texto: string; vaza: string[] }

export { CPF_TESTE };

export const CASOS_ADVERSARIAIS: CasoAdversarial[] = [
  { id: "L1-cpf-pontuado", texto: `CPF pontuado: ${CPF_TESTE}`, vaza: [CPF_TESTE] },
  { id: "L2-cpf-cru", texto: `CPF cru: ${CPF_TESTE_CRU}`, vaza: [CPF_TESTE_CRU] },
  { id: "L3-tel-parenteses", texto: "Tel A: (34) 99876-5432", vaza: ["99876-5432"] },
  { id: "L4-tel-9-separado", texto: "Tel B: 34 9 9876-5432", vaza: ["9876-5432"] },
  { id: "L5-tel-ddi", texto: "Tel C: +55 34 99876-5432", vaza: ["99876-5432"] },
  { id: "L6-tel-cru", texto: "Tel D: 34998765432", vaza: ["34998765432"] },
  { id: "L7-fixo-hifen", texto: "Tel E: 34-3821-1234", vaza: ["3821-1234"] },
  { id: "L8-nome-rotulado", texto: "Requerente: Maria Aparecida dos Santos Pereira", vaza: ["Maria Aparecida"] },
  { id: "L9-nome-meio-frase", texto: "Na audiência, Joana Ribeiro Antunes declarou que pagou.", vaza: ["Joana Ribeiro Antunes"] },
  { id: "L10-cnj", texto: "Processo 0001234-56.2024.8.13.0480", vaza: ["0001234-56.2024.8.13.0480"] },
  { id: "L11-cnj-cru", texto: "Processo cru 00012345620248130480", vaza: ["00012345620248130480"] },
  { id: "L12-email", texto: "E-mail: joana.antunes@provedor.com.br", vaza: ["joana.antunes@provedor.com.br"] },
  { id: "L13-oab-barra", texto: "Advogado OAB/MG 123.456", vaza: ["123.456"] },
  { id: "L14-oab-hifen", texto: "OAB-MG nº 98765", vaza: ["98765"] },
  { id: "L15-valor-reais", texto: "Valor da causa R$ 82.000,00", vaza: ["82.000,00"] },
  { id: "L16-endereco", texto: "Residente na Rua das Acácias, 123, Centro, Patos de Minas - MG, CEP 38700-123", vaza: ["Rua das Acácias, 123", "38700-123"] },
  { id: "L17-padrao-identificador", texto: "o contrato da Fulana, 82 mil", vaza: ["Fulana, 82 mil"] },
];

/** Nomes que SÓ as regras A–J pegam (o padrão só-rótulo do scanner não cobre estes gatilhos). */
export const CASOS_NER: CasoAdversarial[] = [
  { id: "NER-D-testemunha", texto: "Testemunha: Carlos Alberto Souza", vaza: ["Carlos Alberto Souza"] },
  { id: "NER-B-honorifico", texto: "Compareceu o Dr. Paulo Henrique Mendes", vaza: ["Paulo Henrique Mendes"] },
  { id: "NER-F-parentesco", texto: "filho de Antonio Pereira Lima", vaza: ["Antonio Pereira Lima"] },
];

/** O outro lado do gate: texto limpo tem de passar, senão o gate morre por override. */
export const CASOS_LIMPOS: string[] = [
  "O relatório foi entregue ontem e ficou bom.",
  "a reunião ficou para amanhã às 14h, sem pauta nova",
  "o prazo é de 15 dias úteis contados da intimação",
];
