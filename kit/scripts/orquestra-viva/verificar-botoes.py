#!/usr/bin/env python3
"""
verificar-botoes.py — APP-TESTE-DE-BOTAO-001 (corte Enio 07/09).

Motor DETERMINÍSTICO, sem navegador, sem rede, que prova as 4 direções do
vínculo comportamento(JS) <-> tela(HTML) <-> rotas(TS) do EGOS APP
(scripts/orquestra-viva.*). Fato gerador: 100% do vínculo passa por `id`
literal via getElementById, ZERO querySelector, e nada testava esse fio —
renomear um id no HTML quebra um handler em silêncio.

Direção 1 (JS→HTML, a que pega rename): getElementById('X') literal no JS
  → X tem de existir como id="X" no HTML. Só chamadas com argumento LITERAL
  (string entre aspas) entram no veredito bloqueante — chamadas com template
  literal (`mod-${x}`) ou variável pura (id) são reportadas à parte como
  NÃO-VERIFICÁVEL ESTATICAMENTE (R-SUCESSO-PARCIAL-001: declarado, não escondido).

Direção 2 (HTML→JS, botão órfão): todo <button id="X"> do HTML tem de ter
  pelo menos 1 referência a X em algum lugar do JS (getElementById literal,
  padrão de template que bate com X, valor de data-abre, querySelector, ou
  qualquer substring entre aspas/crases). Sem isso = 🟡 (pode ser decorativo
  ou tratado por delegação) — NUNCA 🔴, é advisory.

Direção 3 (fetch→rota): fetch('/api/...') literal no JS → a rota (sem
  querystring) tem de estar registrada em orquestra-viva.ts como
  `url.pathname === "/xxx"`.

Direção 4 (data-abre→gaveta): data-abre="btn-X" no HTML → id="btn-X" tem de
  existir em algum lugar do HTML.

--simular-template <mapa.json>: aplica a renomeação MENTALMENTE (não toca
  em arquivo nenhum) e reporta quantos ids hoje-referenciados-e-existentes
  deixariam de existir.

Uso:
  verificar-botoes.py [--repo DIR] [--html PATH] [--js-dir DIR]
                       [--routes-ts PATH] [--simular-template MAPA.json]
                       [--json]

Sem args: roda contra o estado REAL do repo (a partir da localização do
próprio script). --html/--js-dir/--routes-ts servem para apontar cópias
mutadas em diretório temporário (golden de mutação real) SEM duplicar
nenhuma linha de lógica de checagem — mesmo motor, entrada diferente
(R-PARIDADE-REAL-001: nunca reimplementar o verificador para "testar o
verificador").

Saída: JSON no stdout com os 4 números + denominador de cada um
(R-UNIVERSO-DECLARADO-001 / R-SUCESSO-PARCIAL-001). Exit 1 se qualquer 🔴.
"""
from __future__ import annotations

import argparse
import glob
import json
import re
import sys
from pathlib import Path

RE_GETBYID_CALL = re.compile(r"getElementById\(\s*([^)]*?)\s*\)")
RE_LITERAL_ARG = re.compile(r"""^(['"])((?:(?!\1).)*)\1$""")
RE_TEMPLATE_ARG = re.compile(r"^`(.*)`$")
RE_HTML_ID = re.compile(r'\bid="([^"]+)"')
RE_HTML_BUTTON_ID_TAG = re.compile(r"<button\b[^>]*>", re.S)
RE_DATA_ABRE = re.compile(r'data-abre="([^"]+)"')
RE_FETCH_LITERAL = re.compile(r"""fetch\(\s*(['"])((?:(?!\1).)*)\1""")
RE_ROUTE_LITERAL = re.compile(r"""url\.pathname\s*===\s*(['"])((?:(?!\1).)*)\1""")
RE_QUERYSELECTOR_LITERAL = re.compile(r"""querySelector(?:All)?\(\s*(['"])((?:(?!\1).)*)\1""")
# id CRIADO pelo próprio JS (innerHTML com literal `id="X"`, ou `el.id = "X"`) — o card/nó
# nasce em runtime e é usado logo em seguida; não é "quebrado", é dinâmico por desenho.
# Exclui valor com "$" (isso é interpolação de template, não literal — ex.: id="${id}").
RE_JS_CRIA_ID_HTML = re.compile(r'id="([^"$]+)"')
RE_JS_CRIA_ID_ASSIGN = re.compile(r"""\.id\s*=\s*(['"])([^'"$]+)\1""")


def template_to_regex(template_body: str) -> re.Pattern:
    """`mod-${prefixo}-numero` -> ^mod-[\\w-]+-numero$ (aproximação: qualquer
    valor de runtime cabe em [\\w-]+ — id HTML não tem espaço/pontuação)."""
    partes = re.split(r"\$\{[^}]*\}", template_body)
    return re.compile("^" + r"[\w-]+".join(re.escape(p) for p in partes) + "$")


def ler(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def coletar_getelementbyid(js_files: list[Path]) -> dict:
    """Retorna {literais: [(id, arquivo, linha)], templates: [(regex_src, arquivo, linha)],
    variaveis: [(expressao, arquivo, linha)]}"""
    literais, templates, variaveis = [], [], []
    for jf in js_files:
        linhas = ler(jf).splitlines()
        for i, linha in enumerate(linhas, start=1):
            for m in RE_GETBYID_CALL.finditer(linha):
                arg = m.group(1).strip()
                lit = RE_LITERAL_ARG.match(arg)
                if lit:
                    literais.append((lit.group(2), str(jf), i))
                    continue
                tpl = RE_TEMPLATE_ARG.match(arg)
                if tpl:
                    templates.append((tpl.group(1), str(jf), i))
                    continue
                variaveis.append((arg, str(jf), i))
    return {"literais": literais, "templates": templates, "variaveis": variaveis}


def coletar_html_ids(html: str) -> set[str]:
    return set(RE_HTML_ID.findall(html))


def coletar_botoes_com_id(html: str) -> list[str]:
    ids = []
    for tag in RE_HTML_BUTTON_ID_TAG.finditer(html):
        m = re.search(r'\bid="([^"]+)"', tag.group(0))
        if m:
            ids.append(m.group(1))
    return ids


def coletar_fetch(js_files: list[Path]) -> list[tuple[str, str, int]]:
    achados = []
    for jf in js_files:
        linhas = ler(jf).splitlines()
        for i, linha in enumerate(linhas, start=1):
            for m in RE_FETCH_LITERAL.finditer(linha):
                achados.append((m.group(2), str(jf), i))
    return achados


def coletar_rotas(routes_ts_text: str) -> set[str]:
    return set(m.group(2) for m in RE_ROUTE_LITERAL.finditer(routes_ts_text))


def coletar_querysel_ids(js_files: list[Path]) -> set[str]:
    """querySelector('#foo') / querySelectorAll('#foo') -> 'foo'."""
    achados = set()
    for jf in js_files:
        texto = ler(jf)
        for m in RE_QUERYSELECTOR_LITERAL.finditer(texto):
            sel = m.group(2)
            if sel.startswith("#") and re.match(r"^#[\w-]+$", sel):
                achados.add(sel[1:])
    return achados


def coletar_ids_criados_em_js(js_files: list[Path]) -> set[str]:
    """Ids que o próprio JS cria em runtime (innerHTML literal ou `.id = 'X'`) —
    o card nasce dinamicamente e é lido logo depois; não é vínculo quebrado."""
    criados = set()
    for jf in js_files:
        texto = ler(jf)
        criados.update(RE_JS_CRIA_ID_HTML.findall(texto))
        criados.update(m.group(2) for m in RE_JS_CRIA_ID_ASSIGN.finditer(texto))
    return criados


def direcao1_js_para_html(gid: dict, html_ids: set[str], ids_criados_em_js: set[str]) -> dict:
    literais = gid["literais"]
    distintos = sorted(set(x[0] for x in literais))
    primeira_ocorrencia = {}
    for id_, arq, ln in literais:
        primeira_ocorrencia.setdefault(id_, (arq, ln))
    quebrados = []
    resolvidos_via_js = []
    for id_ in distintos:
        if id_ in html_ids:
            continue
        if id_ in ids_criados_em_js:
            resolvidos_via_js.append(id_)
            continue
        arq, ln = primeira_ocorrencia[id_]
        quebrados.append({"id": id_, "arquivo": arq, "linha": ln})
    return {
        "chamadas_literais": len(literais),
        "ids_distintos_referenciados": len(distintos),
        "ids_existem": len(distintos) - len(quebrados),
        "ids_quebrados": quebrados,
        "ids_resolvidos_via_js_dinamico": resolvidos_via_js,
        "templates_nao_verificados": len(gid["templates"]),
        "variaveis_nao_verificadas": len(gid["variaveis"]),
    }


def direcao2_html_para_js(botoes_ids: list[str], gid: dict, html: str, js_files: list[Path]) -> dict:
    literais_set = set(x[0] for x in gid["literais"])
    template_regexes = [template_to_regex(t[0]) for t in gid["templates"]]
    data_abre_alvos = set(RE_DATA_ABRE.findall(html))
    queryselector_ids = coletar_querysel_ids(js_files)
    js_concat = "\n".join(ler(jf) for jf in js_files)

    def referenciado(id_: str) -> bool:
        if id_ in literais_set:
            return True
        if id_ in data_abre_alvos:
            return True
        if id_ in queryselector_ids:
            return True
        if any(rx.match(id_) for rx in template_regexes):
            return True
        # fallback amplo: id aparece como substring literal em algum lugar do JS
        # (cobre closest()/matches()/comparações de string que os padrões acima não pegam)
        return id_ in js_concat

    distintos = sorted(set(botoes_ids))
    orfaos = [id_ for id_ in distintos if not referenciado(id_)]
    return {
        "botoes_distintos": len(distintos),
        "botoes_referenciados": len(distintos) - len(orfaos),
        "botoes_orfaos": orfaos,
    }


def direcao3_fetch_para_rota(fetches: list[tuple[str, str, int]], rotas: set[str]) -> dict:
    primeira_ocorrencia = {}
    for url_, arq, ln in fetches:
        caminho = url_.split("?", 1)[0]
        if not caminho.startswith("/"):
            continue
        primeira_ocorrencia.setdefault(caminho, (arq, ln))
    distintas = sorted(primeira_ocorrencia)
    quebradas = []
    for caminho in distintas:
        if caminho not in rotas:
            arq, ln = primeira_ocorrencia[caminho]
            quebradas.append({"rota": caminho, "arquivo": arq, "linha": ln})
    return {
        "rotas_distintas_chamadas": len(distintas),
        "rotas_existem": len(distintas) - len(quebradas),
        "rotas_quebradas": quebradas,
    }


def direcao4_data_abre(html: str) -> dict:
    alvos = RE_DATA_ABRE.findall(html)
    html_ids = coletar_html_ids(html)
    distintos = sorted(set(alvos))
    quebrados = [a for a in distintos if a not in html_ids]
    return {
        "gavetas_distintas_referenciadas": len(distintos),
        "gavetas_existem": len(distintos) - len(quebrados),
        "gavetas_quebradas": quebrados,
    }


def simular_template(mapa: dict, gid: dict, html_ids: set[str]) -> dict:
    literais = sorted(set(x[0] for x in gid["literais"]))
    quebrariam = []
    for id_ in literais:
        if id_ in html_ids and id_ in mapa and mapa[id_] != id_:
            quebrariam.append({"id_antigo": id_, "id_novo": mapa[id_]})
    return {
        "botoes_hoje_funcionando": sum(1 for i in literais if i in html_ids),
        "parariam_de_funcionar": len(quebrariam),
        "lista": quebrariam,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=None)
    ap.add_argument("--html", default=None)
    ap.add_argument("--js-dir", default=None)
    ap.add_argument("--routes-ts", default=None)
    ap.add_argument("--simular-template", default=None)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    script_dir = Path(__file__).resolve().parent  # scripts/orquestra-viva/
    repo = Path(args.repo).resolve() if args.repo else script_dir.parent.parent

    html_path = Path(args.html).resolve() if args.html else (repo / "scripts" / "orquestra-viva.html")
    js_dir = Path(args.js_dir).resolve() if args.js_dir else script_dir
    routes_ts_path = Path(args.routes_ts).resolve() if args.routes_ts else (repo / "scripts" / "orquestra-viva.ts")

    if not html_path.exists():
        print(f"[ERROR] HTML não encontrado: {html_path}", file=sys.stderr)
        return 2
    if not routes_ts_path.exists():
        print(f"[ERROR] routes-ts não encontrado: {routes_ts_path}", file=sys.stderr)
        return 2

    js_files = sorted(Path(p) for p in glob.glob(str(js_dir / "app-*.js")))
    if not js_files:
        print(f"[ERROR] nenhum app-*.js encontrado em {js_dir}", file=sys.stderr)
        return 2

    html = ler(html_path)
    html_ids = coletar_html_ids(html)
    ids_criados_em_js = coletar_ids_criados_em_js(js_files)
    gid = coletar_getelementbyid(js_files)
    fetches = coletar_fetch(js_files)
    rotas = coletar_rotas(ler(routes_ts_path))

    d1 = direcao1_js_para_html(gid, html_ids, ids_criados_em_js)
    d2 = direcao2_html_para_js(coletar_botoes_com_id(html), gid, html, js_files)
    d3 = direcao3_fetch_para_rota(fetches, rotas)
    d4 = direcao4_data_abre(html)

    resultado = {
        "direcao1_js_para_html": d1,
        "direcao2_html_para_js": d2,
        "direcao3_fetch_para_rota": d3,
        "direcao4_data_abre_para_gaveta": d4,
    }

    if args.simular_template:
        mapa = json.loads(Path(args.simular_template).read_text(encoding="utf-8"))
        resultado["simulacao_template"] = simular_template(mapa, gid, html_ids)

    vermelhos = len(d1["ids_quebrados"]) + len(d3["rotas_quebradas"]) + len(d4["gavetas_quebradas"])
    resultado["vermelhos_total"] = vermelhos

    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    return 1 if vermelhos > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
