/**
 * Nome de pessoa em texto livre (PT-BR) — golden cases + taxa de falso positivo medida.
 * Só usa a API pública (maskPII, namedTokenize, GuardBrasil.inspect), de propósito: o mesmo arquivo
 * roda contra o código antigo (VERMELHO-ANTES) e contra o novo.
 */
import { describe, expect, test } from 'bun:test';
import { maskPII } from './pii-patterns.js';
import { namedTokenize } from './lib/tokenizer.js';
import { createGuardBrasil } from './guard.js';

const NOME = '[NOME REMOVIDO]';

describe('nomes em texto livre — casos pedidos', () => {
  test('"sou a Maria Aparecida Silva" é mascarado', () => {
    expect(maskPII('sou a Maria Aparecida Silva')).toBe(`sou a ${NOME}`);
  });

  test('"Lei Maria da Penha" é preservado (lei, não pessoa)', () => {
    expect(maskPII('Lei Maria da Penha')).toBe('Lei Maria da Penha');
    expect(maskPII('a lei Maria da Penha protege mulheres')).toBe('a lei Maria da Penha protege mulheres');
  });

  test('"Rua José Bonifácio, Patos de Minas" é preservado (rua e cidade)', () => {
    expect(maskPII('Rua José Bonifácio, Patos de Minas')).toBe('Rua José Bonifácio, Patos de Minas');
    expect(maskPII('Av. Getúlio Vargas, 120')).toBe('Av. Getúlio Vargas, 120');
  });

  test('"Dr. João Pedro Santos Lima, CRM 12345" mascara o nome E o CRM', () => {
    const r = maskPII('Dr. João Pedro Santos Lima, CRM 12345');
    expect(r).toBe(`Dr. ${NOME}, [REGISTRO PROFISSIONAL REMOVIDO]`);
    expect(r).not.toContain('12345');
    expect(r).not.toContain('Santos');
  });

  test('CRM/OAB só casam com número; a sigla solta fica', () => {
    expect(maskPII('o CRM exige inscrição')).toBe('o CRM exige inscrição');
    expect(maskPII('OAB/MG 123.456 e CRM/SP 98765')).toBe('[REGISTRO PROFISSIONAL REMOVIDO] e [REGISTRO PROFISSIONAL REMOVIDO]');
  });

  test('"Enio" não tem tratamento de dono: mascara como qualquer nome quando há contexto de nome', () => {
    expect(maskPII('Oi, Enio, tudo bem?')).toBe(`Oi, ${NOME}, tudo bem?`);
    expect(maskPII('meu nome é Enio')).toBe(`meu nome é ${NOME}`);
    expect(maskPII('Dr. Enio Rocha assina')).toBe(`Dr. ${NOME} assina`);
  });

  test('LIMITE CONHECIDO: nome fora do top 500 do IBGE, solto no meio da frase, não é pego', () => {
    // "Enio" não está nos 500 prenomes mais frequentes; sem gatilho/honorífico/vocativo o Guard não sabe que é gente.
    expect(maskPII('Enio vai aprovar o orçamento')).toBe('Enio vai aprovar o orçamento');
  });

  test('texto sem nome fica intocado', () => {
    for (const t of [
      'Quero um orçamento para geladeira de duas portas.',
      'Qual o prazo de entrega para Patos de Minas?',
      'O pedido 4521 foi enviado ontem e chega em 3 dias úteis.',
      'Bom dia! Gostaria de saber o preço do plano mensal.',
      'sou advogado e preciso de ajuda com um contrato',
      'Olá, Gostaria de saber o horário de funcionamento',
    ]) expect(maskPII(t)).toBe(t);
  });
});

describe('nomes em texto livre — gatilhos e formas de escrever', () => {
  const casos: Array<[string, string]> = [
    ['oi, me chamo ana, quero saber de geladeira', `oi, me chamo ${NOME}, quero saber de geladeira`],
    ['me chamo ana paula silva e quero ajuda', `me chamo ${NOME} e quero ajuda`],
    ['Meu nome é Carlos Eduardo de Souza.', `Meu nome é ${NOME}.`],
    ['chamo-me Joaquim Fagundes', `chamo-me ${NOME}`],
    ['Aqui é o Pedro, da loja', `Aqui é o ${NOME}, da loja`],
    ['Obrigada, Zuleide!', `Obrigada, ${NOME}!`],
    ['Prezado Sr. Marcos Antônio Pereira, segue o contrato', `Prezado Sr. ${NOME}, segue o contrato`],
    ['falei com João Pereira ontem', `falei com ${NOME} ontem`],
    ['MARIA APARECIDA SILVA solicitou a segunda via', `${NOME} solicitou a segunda via`],
    ['Maria e José chegaram cedo', `${NOME} chegaram cedo`],
  ];
  for (const [entrada, esperado] of casos) test(entrada, () => expect(maskPII(entrada)).toBe(esperado));

  test('nome ao lado de CPF e e-mail: cada dado mascarado uma vez só', () => {
    const r = maskPII('Sou a Ana Beatriz Costa, CPF 123.456.789-09, ana.costa@gmail.com');
    expect(r).toBe(`Sou a ${NOME}, CPF [CPF REMOVIDO], [EMAIL REMOVIDO]`);
  });

  test('e-mail com nome no usuário não vira nome + e-mail', () => {
    expect(maskPII('escreva para maria.silva@gmail.com')).toBe('escreva para [EMAIL REMOVIDO]');
  });
});

describe('nomes em texto livre — opção nomes e integração', () => {
  const texto = 'sou a Maria Aparecida Silva e quero a segunda via';

  test('maskPII com nomes:false volta ao comportamento anterior', () => {
    expect(maskPII(texto, undefined, 'full', { nomes: false })).toBe(texto);
  });

  test('maskPII com lista de padrões explícita não mascara nome (a menos que "nome" esteja na lista)', () => {
    expect(maskPII('CPF 123.456.789-09, sou a Maria Aparecida Silva', ['cpf'])).toBe('CPF [CPF REMOVIDO], sou a Maria Aparecida Silva');
    expect(maskPII('CPF 123.456.789-09, sou a Maria Aparecida Silva', ['cpf', 'nome'])).toBe(`CPF [CPF REMOVIDO], sou a ${NOME}`);
  });

  test('GuardBrasil.inspect mascara por padrão e respeita nomes:false', () => {
    const ligado = createGuardBrasil({ telemetry: false }).inspect(texto);
    expect(ligado.output).toContain(NOME);
    expect(ligado.output).not.toContain('Aparecida');
    expect(ligado.safe).toBe(false);

    const desligado = createGuardBrasil({ telemetry: false, nomes: false }).inspect(texto);
    expect(desligado.output).toContain('Maria Aparecida Silva');
  });

  test('namedTokenize (caminho do site-agent) troca o nome por [NOME_0001] e respeita nomes:false', () => {
    const r = namedTokenize(texto);
    expect(r.tokenized).toBe('sou a [NOME_0001] e quero a segunda via');
    expect(r.vault.count).toBe(1);
    expect(namedTokenize(texto, { nomes: false }).tokenized).toBe(texto);
  });

  test('modo partial também mascara o nome', () => {
    expect(maskPII(texto, undefined, 'partial')).toBe(`sou a ${NOME} e quero a segunda via`);
  });
});

// ─── Medição: falso positivo em frase institucional ──────────────────────────
// 50 frases de instituições, leis, ruas e cidades SEM pessoa. Qualquer mudança no texto é falso positivo.
const INSTITUCIONAIS = [
  'A Prefeitura Municipal de Patos de Minas abriu o edital 04/2026.',
  'O Ministério da Saúde publicou a Portaria nº 123 no Diário Oficial da União.',
  'Conforme a Lei Geral de Proteção de Dados, o tratamento exige base legal.',
  'A Polícia Militar de Minas Gerais atendeu a ocorrência na Avenida Getúlio Vargas.',
  'O Tribunal de Justiça de Minas Gerais julgou o recurso na Comarca de Patos de Minas.',
  'A Universidade Federal de Uberlândia abriu inscrições para o mestrado.',
  'O Banco do Brasil e a Caixa Econômica Federal ofertam crédito rural.',
  'A Empresa Brasileira de Pesquisa Agropecuária divulgou o zoneamento agrícola.',
  'Reunião no Instituto Federal do Triângulo Mineiro na terça-feira.',
  'O Hospital Santa Casa de Misericórdia fica na Rua Major Gote.',
  'A Secretaria de Estado de Fazenda de Minas Gerais emitiu a resolução.',
  'Segundo o Código de Defesa do Consumidor, o prazo é de sete dias.',
  'O Marco Civil da Internet garante a neutralidade da rede.',
  'Participe da Campanha Nacional de Vacinação contra a gripe.',
  'A Fundação Oswaldo Cruz coordena o estudo.',
  'O Supremo Tribunal Federal e o Superior Tribunal de Justiça divergem.',
  'Visite o Parque Nacional da Serra da Canastra nas férias.',
  'O Sebrae Minas oferece consultoria para o Programa Nacional de Agricultura Familiar.',
  'A Câmara Municipal aprovou o projeto na Sessão Ordinária de segunda.',
  'Entregue os documentos no Cartório de Registro Civil de Pessoas Naturais.',
  'A Receita Federal do Brasil prorrogou o prazo do Imposto de Renda.',
  'A Associação Comercial e Industrial de Patos de Minas promove a Feira de Negócios.',
  'O Banco Central do Brasil mantém a taxa Selic.',
  'O Corpo de Bombeiros Militar realizou o treinamento no Distrito Industrial.',
  'Edital da Operação Carro Pipa em Pernambuco e na Bahia.',
  'A Companhia Energética de Minas Gerais informou a interrupção.',
  'O Mercado Livre e a Magazine Luiza ampliaram a entrega.',
  'O Santos Futebol Clube venceu o Atlético Mineiro.',
  'A Escola Estadual Dom Pedro II oferece ensino médio.',
  'A Defensoria Pública do Estado de São Paulo atende gratuitamente.',
  'Consulte o Diário Oficial de Minas Gerais e a Imprensa Oficial.',
  'O Conselho Regional de Medicina do Estado de Minas Gerais fiscaliza.',
  'O Ministério Público Federal instaurou o inquérito civil.',
  'A Praça Dom Pedro e o Largo São Francisco ficam no centro.',
  'A Lei Carolina Dieckmann tipificou crimes informáticos.',
  'O Estatuto da Criança e do Adolescente protege menores.',
  'Registre-se no Sistema Único de Saúde pela Unidade Básica de Saúde mais próxima.',
  'A Agência Nacional de Vigilância Sanitária proibiu o lote.',
  'O Rio Grande do Sul e Santa Catarina enfrentam enchentes.',
  'Feriado de Nossa Senhora Aparecida em outubro.',
  'A Câmara de Dirigentes Lojistas de Belo Horizonte divulgou o índice.',
  'O Projeto de Lei Maria Júlia tramita na Assembleia Legislativa.',
  'Compre na Casa Pedro Henrique ou no Supermercado Bretas.',
  'O Conselho Nacional de Justiça editou a Resolução 400.',
  'O Aeroporto Internacional Tancredo Neves recebe voos de Lisboa.',
  'A Rede Globo transmite o Campeonato Brasileiro.',
  'Procure o Procon de Patos de Minas ou o Juizado Especial Cível.',
  'A Rodovia Fernão Dias liga São Paulo a Belo Horizonte.',
  'A Fundação Getúlio Vargas divulgou o Índice Geral de Preços.',
  'O Instituto Brasileiro de Geografia e Estatística divulgou o Censo Demográfico.',
];

// 30 frases COM pessoa, formas variadas (para medir quanto passa, não só quanto sobra).
const COM_PESSOA: Array<[string, string]> = [
  ['sou a Maria Aparecida Silva', 'Aparecida'],
  ['meu nome é Roberto Carlos Nunes', 'Roberto'],
  ['me chamo Fernanda Lima e preciso de ajuda', 'Fernanda'],
  ['oi, me chamo juliana, quero saber o preço', 'juliana'],
  ['Aqui é o Rodrigo Alves da contabilidade', 'Rodrigo'],
  ['O pedido foi feito por Carlos Eduardo Ferreira', 'Carlos'],
  ['Falei com Ana Paula Rodrigues ontem', 'Rodrigues'],
  ['Obrigado, Marcelo!', 'Marcelo'],
  ['Bom dia, Patrícia, tudo certo?', 'Patrícia'],
  ['Prezada Sra. Luciana Martins, segue a proposta', 'Luciana'],
  ['O Dr. Antônio Carlos Pereira atende às terças', 'Antônio'],
  ['A Dra. Camila Souza Barbosa assinou o laudo', 'Camila'],
  ['Prof. Ricardo Gomes ministra a aula', 'Ricardo'],
  ['Segundo José Roberto Almeida, o prazo venceu', 'Almeida'],
  ['Encaminhar para Francisca das Chagas Oliveira', 'Francisca'],
  ['Cliente João Batista dos Santos reclamou da entrega', 'Batista'],
  ['O vendedor Lucas Gabriel Costa enviou o orçamento', 'Lucas'],
  ['Atenciosamente, Beatriz Cardoso', 'Beatriz'],
  ['Valeu, Diego!', 'Diego'],
  ['Meu nome é Sandra Regina Moreira Dias', 'Sandra'],
  ['A reunião é com Gustavo Henrique Ramos às 15h', 'Gustavo'],
  ['Sou Mariana Teixeira, moradora do bairro', 'Mariana'],
  ['Pedro Henrique Cavalcante disse que não vai', 'Pedro'],
  ['Falar com Dona Rita de Cássia', 'Rita'],
  ['Seu Antônio pediu duas caixas', 'Antônio'],
  ['O réu Bruno Rafael Nascimento foi intimado', 'Bruno'],
  ['A testemunha Tatiane Gomes Ribeiro confirmou', 'Tatiane'],
  ['Eu sou o Thiago Martins, dono da padaria', 'Thiago'],
  ['oi, aqui é a Camila', 'Camila'],
  ['Falei com o Marcos e com a Juliana', 'Marcos'],
];

describe('nomes em texto livre — medição', () => {
  test('taxa de falso positivo em 50 frases institucionais < 5%', () => {
    expect(INSTITUCIONAIS.length).toBe(50);
    const falsos = INSTITUCIONAIS.filter((f) => maskPII(f) !== f);
    const taxa = falsos.length / INSTITUCIONAIS.length;
    if (falsos.length > 0) console.log('falsos positivos:', falsos.map((f) => `${f} => ${maskPII(f)}`));
    expect(taxa).toBeLessThan(0.05);
  });

  test('em 30 frases com pessoa, nenhuma deixa o nome-chave passar (recall >= 90%)', () => {
    const passaram = COM_PESSOA.filter(([f, chave]) => maskPII(f).includes(chave));
    if (passaram.length > 0) console.log('nomes que passaram:', passaram.map(([f]) => `${f} => ${maskPII(f)}`));
    expect(1 - passaram.length / COM_PESSOA.length).toBeGreaterThanOrEqual(0.9);
  });
});
