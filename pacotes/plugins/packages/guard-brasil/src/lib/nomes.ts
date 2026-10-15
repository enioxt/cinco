/**
 * Nomes de pessoa em texto livre (PT-BR) — sem LLM, só léxico + contexto.
 *
 * Achado de 10/10/2026: "sou a Maria Aparecida Silva" passava inteiro pelo Guard, porque os
 * detectores de nome só olhavam rótulo ("Nome:", "Dr.", "Paciente:") de documento policial/jurídico.
 * Em chat aberto a pessoa se apresenta em frase corrida. Este módulo cobre esse caso.
 *
 * Seis fontes de evidência, da mais forte para a mais fraca:
 *  1. gatilho de apresentação  — "sou a", "me chamo", "meu nome é", "chamo-me", "aqui é o";
 *  2. honorífico               — "Dr.", "Sra.", "Prof.", "Dona", "Seu", "Juiz", "Doutor"...;
 *  3. vocativo                 — "Olá, X", "Oi X", "Bom dia, X", "Prezado X", "Obrigada, X";
 *  4. sequência capitalizada   — 2 a 6 palavras com inicial maiúscula (+ da/de/do/dos/das/di/du,
 *                                e "e" entre dois nomes do léxico), aceita só se alguma palavra
 *                                está no léxico de prenomes/sobrenomes;
 *  5. prenome isolado          — uma palavra do léxico de prenomes, fora da lista de ambíguos.
 *
 * O que NÃO se mascara (precisão): instituições, ruas, leis, cidades e cargos — qualquer sequência
 * com palavra da lista de EXCEÇÕES ("Lei Maria da Penha", "Rua José Bonifácio", "Prefeitura de Patos
 * de Minas") ou logo depois de um marcador institucional minúsculo ("lei Maria da Penha", "Av. Getúlio
 * Vargas"). Palavras desconhecidas nunca disparam sozinhas, só dentro de gatilho/honorífico/vocativo.
 *
 * Limites declarados (README do pacote): nome fora do top 500 do IBGE e fora de gatilho/honorífico/
 * vocativo ("falei com Zuleide ontem") NÃO é pego; sobrenome sozinho também não.
 */

// SIMPLICITY_OVERRIDE: ~40% do arquivo é léxico (sobrenomes, exceções, marcadores), não lógica; a lógica é um
// detector único em 5 regras e separar os léxicos em arquivos só espalharia o que muda junto.
import { PRENOMES_IBGE } from './prenomes-ibge.js';

export interface NomeAchado {
  start: number;
  end: number;
  matched: string;
  motivo: 'gatilho' | 'honorifico' | 'vocativo' | 'lexico' | 'prenome';
}

const ASCII_MINUSCULO = /^[a-z]+$/;
const norm = (s: string): string => (ASCII_MINUSCULO.test(s) ? s : s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase());
const set = (txt: string): Set<string> => new Set(txt.split(/\s+/).filter(Boolean));

const PRENOMES = new Set(PRENOMES_IBGE);

/**
 * Sobrenomes comuns no Brasil (sem acento, minúsculos). FONTE: lista compilada à mão a partir do
 * conhecimento geral dos sobrenomes mais frequentes — o IBGE "Nomes no Brasil" só publica prenomes,
 * então esta lista NÃO foi medida contra uma base (⚪ no relatório do PR). Serve de reforço: sobrenome
 * sozinho nunca dispara, só soma com prenome ou com outro sobrenome.
 */
const SOBRENOMES = set(`
silva santos oliveira souza sousa rodrigues ferreira alves pereira lima gomes costa ribeiro martins
carvalho almeida lopes soares fernandes vieira barbosa rocha dias nascimento andrade moreira nunes
marques machado mendes freitas cardoso ramos goncalves santana teixeira araujo cavalcante cavalcanti
monteiro moura correia pinto azevedo reis campos borges medeiros miranda lacerda castro cunha pires
melo mello batista barros duarte morais moraes tavares coelho franco bezerra braga guimaraes fonseca
peixoto neves leite sampaio siqueira viana xavier amaral cordeiro antunes brito calixto camargo faria
farias garcia lemos magalhaes matos mota nogueira paiva pimentel ramalho rezende resende salgado
sales sobral toledo valente vasconcelos vargas veloso cruz abreu aguiar albuquerque alencar amorim
assis bastos bittencourt caldeira cabral chaves coutinho damasceno diniz domingues esteves figueiredo
frota furtado gouveia henriques holanda jesus lobo macedo maciel menezes mesquita muniz neto novaes
ornelas padilha paes paixao passos portela prado queiroz quintana rangel rebelo ribas rios salles
sanches serra simoes tenorio trindade vaz ventura vidal vilela
`);

/**
 * Prenomes que também são palavra comum, lugar ou título: não bastam sozinhos ("Rosa é uma cor",
 * "Vitória", "Israel"). Dentro de uma sequência com sobrenome continuam contando ("Rosa Silva").
 */
const AMBIGUOS = set(`
rosa vitoria gloria graca paz luz aparecida aparecido conceicao socorro natal marco domingos divino
divina vera mara lara eva iris ruth olinda ari ane geni nair israel oscar lourdes fatima salete ione
ines elvira carmelita quiteria
`);

/** Palavras que NUNCA são nome de pessoa neste contexto: instituição, lugar, cargo, profissão, nacionalidade. */
const EXCECOES = set(`
lei leis decreto portaria resolucao instrucao norma sumula codigo constituicao emenda medida edital processo artigo
projeto programa plano operacao campanha civil legal
rua avenida av alameda travessa praca rodovia estrada largo beco bairro vila jardim parque distrito
cidade municipio comarca estado estados uniao pais regiao zona area setor
prefeitura ministerio policia universidade instituto fundacao associacao sindicato cooperativa empresa companhia
grupo sociedade conselho comissao comite agencia autarquia secretaria superintendencia procuradoria defensoria
promotoria assembleia senado congresso camara tribunal justica receita governo departamento diretoria gerencia
coordenacao delegacia forum vara juizo cartorio escritorio servico servicos sistema sistemas
banco caixa casa casas loja lojas supermercado mercado farmacia drogaria hospital clinica restaurante pousada
hotel posto padaria shopping magazine mercadoria igreja paroquia capela santuario cemiterio escola colegio
faculdade centro biblioteca museu teatro estadio ponte viaduto fazenda sitio chacara loteamento residencial
edificio condominio bloco conjunto
federal estadual municipal nacional distrital regional publico publica geral titular substituto substituta
auxiliar adjunto chefe presidente vice relator revisor militar civil
brasil brasileiro brasileira brasileiros brasileiras portugal argentina uruguai paraguai chile bolivia peru
colombia venezuela mexico canada europa europeia asia africa america mercosul
acre alagoas amapa amazonas bahia ceara goias maranhao mato grosso minas gerais para paraiba parana
pernambuco piaui rondonia roraima sul norte leste oeste sudeste nordeste tocantins espirito
rio sao santa santo belo horizonte alegre grande campo foz nova novo velha velho
brasilia manaus belem fortaleza recife salvador curitiba florianopolis goiania cuiaba teresina aracaju maceio
patos uberlandia uberaba contagem betim montes claros ribeirao preto campinas guarulhos osasco janeiro
senhor senhora senhores senhoras srs equipe time pessoal galera gente amigos amigas colegas clientes cliente
usuario usuaria advogado advogada medico medica engenheiro engenheira estudante produtor produtora servidor
servidora morador moradora empresario empresaria aluno aluna dono dona-de-casa funcionario funcionaria
atendente suporte contato cadastro pedido nossa
`.replace(/dona-de-casa/, ''));

/**
 * Papéis que PRECEDEM nome de pessoa ("Cliente João Batista", "Advogado Pedro Alves"): saem do início
 * da sequência e o resto é avaliado. Continuam em EXCECOES para gatilho/vocativo ("sou Cliente").
 */
const PAPEIS = set(`
cliente clientes usuario usuaria advogado advogada medico medica engenheiro engenheira estudante produtor
produtora servidor servidora morador moradora empresario empresaria aluno aluna funcionario funcionaria
atendente
`);

/** Saudações em maiúscula colada ao nome ("Prezado João", "Bom Dia Maria"): saem do início da sequência. */
const SAUDACOES = set(`
ola oi prezado prezada prezados prezadas caro cara querido querida obrigado obrigada atenciosamente cordialmente
abracos abraco bom boa dia tarde noite valeu salve
`);

/** Honoríficos/cargos que antecedem nome de pessoa (sem acento). */
const HONORIFICOS = set(`
dr dra sr sra srta prof profa dom dona seu padre pastor frei doutor doutora professor professora senhor senhora
juiz juiza desembargador desembargadora ministro ministra senador senadora deputado deputada vereador vereadora
prefeito prefeita delegado delegada promotor promotora procurador procuradora defensor defensora
`);

const PARTICULAS = new Set(['da', 'de', 'do', 'dos', 'das', 'di', 'du']);

/** Frases-lugar/lei que contêm prenomes de verdade e não são gente. */
const FRASES_PRESERVADAS = [
  'pedro leopoldo', 'paulo afonso', 'francisco beltrao', 'joao pessoa', 'joao monlevade', 'teofilo otoni',
  'governador valadares', 'presidente prudente', 'maria da penha', 'santos dumont',
];

/**
 * Marcadores institucionais que, logo ANTES de uma sequência, indicam que ela é nome de rua/lei/lugar
 * ("lei Maria da Penha", "Av. Getúlio Vargas", "Hospital de Clínicas", "Fundação Oswaldo Cruz").
 * Aplicado ao trecho anterior já normalizado (sem acento, minúsculo).
 */
const MARCADORES_ANTES = set(`
av avenida rua r pca praca rod rodovia al alameda tv trav travessa est estrada lg largo lei leis decreto
projeto programa operacao fundacao instituto hospital escola colegio biblioteca museu teatro estadio ponte
viaduto bairro vila jardim parque distrito cidade municipio comarca fazenda sitio loteamento residencial
edificio condominio banco supermercado mercado farmacia drogaria clinica restaurante pousada hotel posto
padaria igreja paroquia capela santuario cemiterio bloco premio medalha ordem lagoa rio serra morro
cachoeira usina aeroporto rodoviaria estacao terminal loja lojas casa casas universidade faculdade centro
associacao sindicato cooperativa empresa grupo sociedade cartorio forum vara delegacia secretaria
ministerio prefeitura camara tribunal policia departamento
`);
const PREPOSICOES = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no']);

// ─── Tokenização ──────────────────────────────────────────────────────────────

interface Tok {
  t: string;
  n: string;
  start: number;
  end: number;
  cap: boolean;
}

const PALAVRA = /\p{L}[\p{L}\p{M}]*(?:['’-]\p{L}[\p{L}\p{M}]*)*/gu;

interface Flags { pre: boolean; amb: boolean; sob: boolean; exc: boolean }
const FLAGS = new Map<string, Flags>();
/** Pertinência da palavra (normalizada) nos léxicos; memoizada porque o vocabulário real é pequeno. */
function flags(n: string): Flags {
  let f = FLAGS.get(n);
  if (f) return f;
  const ps = /['’-]/.test(n) ? n.split(/['’-]/).filter(Boolean) : [n];
  const pre = ps.some((p) => PRENOMES.has(p));
  f = {
    pre,
    // prenome que também é palavra/lugar/título: só conta junto de sobrenome ou em contexto forte
    amb: pre && ps.filter((p) => PRENOMES.has(p)).every((p) => AMBIGUOS.has(p)),
    sob: ps.some((p) => SOBRENOMES.has(p)),
    exc: ps.some((p) => EXCECOES.has(p)),
  };
  if (FLAGS.size > 50_000) FLAGS.clear();
  FLAGS.set(n, f);
  return f;
}
const ehPrenome = (n: string): boolean => flags(n).pre;
const ehSobrenome = (n: string): boolean => flags(n).sob;
const ehAmbiguo = (n: string): boolean => flags(n).amb;
const ehExcecao = (n: string): boolean => flags(n).exc;
const ehLexico = (n: string): boolean => flags(n).pre || flags(n).sob;

function tokenizar(text: string): Tok[] {
  const out: Tok[] = [];
  for (const m of text.matchAll(PALAVRA)) {
    const t = m[0];
    const n = norm(t.length < 2 ? t : ASCII_MINUSCULO.test(t) ? t : t.toLowerCase());
    const inicialMaiuscula = /^\p{Lu}/u.test(t);
    const temMinuscula = /\p{Ll}/u.test(t);
    // TUDO-MAIÚSCULO só vale como nome se a palavra está no léxico ("MARIA SILVA"); "MINISTÉRIO" não é.
    const cap = !PARTICULAS.has(n) && inicialMaiuscula && t.length >= 2 && (temMinuscula || (t.length >= 3 && ehLexico(n)));
    out.push({ t, n, start: m.index!, end: m.index! + t.length, cap });
  }
  return out;
}

const ESPACO = /^[ \t ]+$/;
const ESPACO_OU_PONTO = /^\.?[ \t ]+$/;

/** Palavra colada em e-mail, URL, @usuário ou caminho: não é nome falado. */
function colada(text: string, tk: Tok): boolean {
  const antes = text[tk.start - 1] ?? '';
  const depois = text[tk.end] ?? '';
  if ('@/\\_#'.includes(antes) && antes !== '') return true;
  if (depois !== '' && '@/\\_'.includes(depois)) return true;
  if (antes === '.' && /\p{L}/u.test(text[tk.start - 2] ?? '')) return true;
  if (depois === '.' && /\p{L}/u.test(text[tk.end + 1] ?? '')) return true;
  return false;
}

function capitalizadasAntesTemExcecao(toks: Tok[], i: number): boolean {
  for (let k = i - 1; k >= 0; k--) {
    if (!ESPACO.test(textoEntre(toks, k, k + 1)) || !toks[k]!.cap) return false;
    if (ehExcecao(toks[k]!.n) && !PAPEIS.has(toks[k]!.n)) return true;
  }
  return false;
}

function precedeMarcador(text: string, start: number): boolean {
  const trecho = norm(text.slice(Math.max(0, start - 60), start));
  if (!/\s$/.test(trecho)) return false;
  const palavras = trecho.trim().split(/\s+/);
  while (palavras.length > 1 && PREPOSICOES.has(palavras[palavras.length - 1]!)) palavras.pop();
  return MARCADORES_ANTES.has((palavras[palavras.length - 1] ?? '').replace(/\.$/, ''));
}

// ─── Captura de um nome a partir de um índice ────────────────────────────────

interface Captura {
  de: number;
  ate: number;
  palavras: Tok[];
  cortada: boolean;
}

/**
 * Lê palavras de nome a partir de `i`. `minusculas`: aceita prenome/sobrenome do léxico em minúscula
 * (gente digita "me chamo ana paula" no chat). Corta na primeira palavra de EXCEÇÃO.
 */
function capturar(toks: Tok[], i: number, minusculas: boolean): Captura | null {
  const primeiro = toks[i];
  if (!primeiro) return null;
  const abreMinuscula = !primeiro.cap && minusculas && ehPrenome(primeiro.n) && !ehAmbiguo(primeiro.n);
  if (!primeiro.cap && !abreMinuscula) return null;

  const acc: Tok[] = [primeiro];
  let ult = i;
  while (acc.length < 6) {
    const k = ult + 1;
    const t = toks[k];
    if (!t || !ESPACO.test(textoEntre(toks, ult, k))) break;
    if (t.cap) {
      acc.push(t);
      ult = k;
      continue;
    }
    if (PARTICULAS.has(t.n)) {
      const prox = toks[k + 1];
      const nomeDepois = prox && (prox.cap || (abreMinuscula && ehLexico(prox.n)));
      if (nomeDepois && ESPACO.test(textoEntre(toks, k, k + 1))) {
        acc.push(t, prox);
        ult = k + 1;
        continue;
      }
      break;
    }
    if (abreMinuscula && ehLexico(t.n) && !ehAmbiguo(t.n)) {
      acc.push(t);
      ult = k;
      continue;
    }
    break;
  }

  let cortada = false;
  const idxExc = acc.findIndex((w) => !PARTICULAS.has(w.n) && ehExcecao(w.n));
  let palavras = acc;
  if (idxExc >= 0) {
    palavras = acc.slice(0, idxExc);
    cortada = true;
  }
  while (palavras.length > 0 && PARTICULAS.has(palavras[palavras.length - 1]!.n)) palavras = palavras.slice(0, -1);
  if (palavras.length === 0) return null;
  const ultima = palavras[palavras.length - 1]!;
  return { de: palavras[0]!.start, ate: ultima.end, palavras, cortada };
}

// `textoEntre` precisa do texto original; guardado em escopo de módulo durante a detecção.
let TEXTO = '';
const textoEntre = (toks: Tok[], a: number, b: number): string => TEXTO.slice(toks[a]!.end, toks[b]!.start);

const nucleo = (c: Captura): Tok[] => c.palavras.filter((w) => !PARTICULAS.has(w.n));

// ─── Detecção ─────────────────────────────────────────────────────────────────

const GATILHO_FORTE =
  /(?<![\p{L}])(?:eu\s+sou|sou|me\s+chamo|meu\s+nome\s+(?:completo\s+)?(?:é|e)|chamo-me|my\s+name\s+is)\s+(?:(?:o|a|do|da)\s+)?/giu;
const GATILHO_FRACO = /(?<![\p{L}])aqui\s+(?:é|e)\s+(?:(?:o|a|do|da)\s+)?/giu;
const VOCATIVO =
  /(?<![\p{L}])(?:ol[áa]|oi|ei|opa|salve|fala|e\s+a[íi]|obrigad[oa]|valeu|bom\s+dia|boa\s+(?:tarde|noite)|prezad[oa]s?|querid[oa]s?|tchau|grato|grata|atenciosamente|cordialmente|abra[çc]os?|att\.?)\s*[,;:!-]?\s+/giu;

/** Depois da palavra: pontuação ou fim do texto (e não "Olá, Gostaria de…"). */
function terminaNome(text: string, ate: number): boolean {
  const resto = text.slice(ate);
  return resto === '' || /^\s*(?:[,.!?;:)\]"'»]|$|\n)/u.test(resto);
}

/** Índice do primeiro token que começa em `offset` ou depois (busca binária; tokens vêm em ordem). */
function tokenNoOffset(toks: Tok[], offset: number): number {
  let lo = 0;
  let hi = toks.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (toks[mid]!.start >= offset) hi = mid;
    else lo = mid + 1;
  }
  return lo < toks.length ? lo : -1;
}

function juntar(spans: NomeAchado[]): NomeAchado[] {
  const ord = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: NomeAchado[] = [];
  for (const s of ord) {
    const ult = out[out.length - 1];
    if (ult && s.start < ult.end) {
      if (s.end > ult.end) {
        ult.end = s.end;
        ult.matched = TEXTO.slice(ult.start, ult.end);
      }
    } else out.push({ ...s });
  }
  return out;
}

/**
 * Acha nomes de pessoa em texto livre. Devolve spans sem sobreposição, em ordem de posição.
 * Sem LLM, sem rede; custo linear no tamanho do texto.
 */
export function detectarNomes(text: string): NomeAchado[] {
  if (!text || !/\p{Lu}|sou|chamo|nome|aqui|ol[áa]|oi/iu.test(text)) return [];
  TEXTO = text;
  const toks = tokenizar(text);
  const achados: NomeAchado[] = [];
  const marcar = (c: Captura, motivo: NomeAchado['motivo']) =>
    achados.push({ start: c.de, end: c.ate, matched: text.slice(c.de, c.ate), motivo });

  // 1) gatilhos de apresentação
  for (const [re, forte] of [[GATILHO_FORTE, true], [GATILHO_FRACO, false]] as const) {
    for (const m of text.matchAll(re)) {
      let i = tokenNoOffset(toks, m.index! + m[0].length);
      if (i < 0) continue;
      // "Instituto Sou da Paz", "Casa Sou Fã": o gatilho escrito em maiúscula, colado a outra palavra
      // capitalizada, é parte de um nome de organização, não apresentação.
      const g = tokenNoOffset(toks, m.index!);
      if (g > 0 && toks[g - 1]!.cap && toks[g]!.cap && ESPACO.test(textoEntre(toks, g - 1, g))) continue;
      // pula honorífico entre o gatilho e o nome ("sou a Dra. Ana")
      while (toks[i] && toks[i]!.cap && HONORIFICOS.has(toks[i]!.n) && i + 1 < toks.length &&
        ESPACO_OU_PONTO.test(textoEntre(toks, i, i + 1))) i++;
      const c = capturar(toks, i, true);
      if (!c || colada(text, c.palavras[0]!)) continue;
      const lex = nucleo(c).some((w) => ehLexico(w.n));
      if (c.cortada && !lex) continue;
      if (!forte && !lex && !terminaNome(text, c.ate)) continue;
      marcar(c, 'gatilho');
    }
  }

  // 2) honoríficos
  for (let i = 0; i < toks.length - 1; i++) {
    const h = toks[i]!;
    if (!h.cap || !HONORIFICOS.has(h.n) || !ESPACO_OU_PONTO.test(textoEntre(toks, i, i + 1))) continue;
    // "Praça Dom Pedro", "Escola Estadual Dom Pedro II", "Nossa Senhora Aparecida": o honorífico é parte de um
    // nome de lugar/instituição se a sequência capitalizada logo antes tem palavra de exceção, ou se um
    // marcador minúsculo o antecede.
    if (precedeMarcador(text, h.start) || capitalizadasAntesTemExcecao(toks, i)) continue;
    const c = capturar(toks, i + 1, false);
    if (!c || colada(text, c.palavras[0]!)) continue;
    const lex = nucleo(c).some((w) => ehLexico(w.n));
    if (c.cortada && !lex) continue;
    marcar(c, 'honorifico');
  }

  // 3) vocativos
  for (const m of text.matchAll(VOCATIVO)) {
    let i = tokenNoOffset(toks, m.index! + m[0].length);
    if (i < 0) continue;
    while (toks[i] && toks[i]!.cap && HONORIFICOS.has(toks[i]!.n) && i + 1 < toks.length &&
      ESPACO_OU_PONTO.test(textoEntre(toks, i, i + 1))) i++;
    const c = capturar(toks, i, true);
    if (!c || colada(text, c.palavras[0]!)) continue;
    const lex = nucleo(c).some((w) => ehLexico(w.n));
    if (c.cortada && !lex) continue;
    if (!lex && (nucleo(c).length > 3 || !terminaNome(text, c.ate))) continue;
    marcar(c, 'vocativo');
  }

  // 4 e 5) sequências capitalizadas com léxico, e prenome isolado
  for (let i = 0; i < toks.length; i++) {
    if (!toks[i]!.cap) continue;
    // monta a sequência bruta (mesma regra de capturar, mas com "e" entre dois nomes do léxico)
    const run: Tok[] = [toks[i]!];
    let ult = i;
    while (run.length < 40) {
      const k = ult + 1;
      const t = toks[k];
      if (!t || !ESPACO.test(textoEntre(toks, ult, k))) break;
      const prox = toks[k + 1];
      if (t.cap) { run.push(t); ult = k; continue; }
      if (PARTICULAS.has(t.n) && prox?.cap && ESPACO.test(textoEntre(toks, k, k + 1))) { run.push(t, prox); ult = k + 1; continue; }
      if (t.n === 'e' && prox?.cap && ehLexico(toks[ult]!.n) && ehLexico(prox.n) && ESPACO.test(textoEntre(toks, k, k + 1))) {
        run.push(t, prox); ult = k + 1; continue;
      }
      break;
    }
    const proximoI = ult + 1;
    // honorífico/papel no começo da sequência: não conta como palavra de nome
    let ini = 0;
    while (ini < run.length - 1 && (HONORIFICOS.has(run[ini]!.n) || PAPEIS.has(run[ini]!.n) || SAUDACOES.has(run[ini]!.n))) ini++;
    let corpo = run.slice(ini);
    const ant = precedeMarcador(text, corpo[0]!.start) || capitalizadasAntesTemExcecao(toks, i + ini);
    if (!ant && !corpo.some((w) => colada(text, w))) {
      // Palavra de exceção no meio: o que vem DEPOIS dela é nome de lei/rua/lugar ("Lei Maria da Penha") e
      // fica; o que vem ANTES pode ser gente colada numa instituição ("Juliano Moretti Pontifícia Universidade").
      const idxExc = corpo.findIndex((w) => !PARTICULAS.has(w.n) && w.n !== 'e' && ehExcecao(w.n));
      let antes = false;
      if (idxExc >= 0) {
        corpo = corpo.slice(0, idxExc);
        antes = true;
      }
      while (corpo.length > 0 && (PARTICULAS.has(corpo[corpo.length - 1]!.n) || corpo[corpo.length - 1]!.n === 'e')) corpo = corpo.slice(0, -1);
      const palavras = corpo.filter((w) => !PARTICULAS.has(w.n) && w.n !== 'e');
      const bruto = corpo.length ? norm(text.slice(corpo[0]!.start, corpo[corpo.length - 1]!.end)) : '';
      const fraseOk = !FRASES_PRESERVADAS.some((f) => bruto.includes(f));
      if (fraseOk && palavras.length > 0 && !(antes && palavras.length < 2)) {
        const np = palavras.filter((w) => ehPrenome(w.n) && !ehAmbiguo(w.n)).length;
        const amb = palavras.filter((w) => ehPrenome(w.n) && ehAmbiguo(w.n)).length;
        const ns = palavras.filter((w) => ehSobrenome(w.n)).length;
        let ok = false;
        if (palavras.length >= 2) ok = np >= 1 || (amb >= 1 && ns >= 1) || ns >= 2;
        else ok = np >= 1 && palavras[0]!.t.length >= 3;
        if (ok) {
          achados.push({
            start: corpo[0]!.start,
            end: corpo[corpo.length - 1]!.end,
            matched: text.slice(corpo[0]!.start, corpo[corpo.length - 1]!.end),
            motivo: palavras.length >= 2 ? 'lexico' : 'prenome',
          });
        }
      }
    }
    i = proximoI - 1;
  }

  return juntar(achados);
}

/** Substitui os nomes por `[NOME REMOVIDO]` (ou por `substituto`). */
export function mascararNomes(text: string, substituto = '[NOME REMOVIDO]'): string {
  const achados = detectarNomes(text);
  let out = text;
  for (const a of [...achados].sort((x, y) => y.start - x.start)) out = out.slice(0, a.start) + substituto + out.slice(a.end);
  return out;
}
