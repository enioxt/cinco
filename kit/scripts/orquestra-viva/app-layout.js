/* app-layout.js — MODOS-TELA-25-50-100-001 (corte Enio 05/09, verbatim: "testar um modo
   rápido de deixar ele ali com 25% de tela, 50%, 100%; o usuário pode escolher facilmente
   qual o foco dele em cada tipo de tela, escolher o que aparece mais, primeiro, maior,
   tudo isso, modular"). Só USA (nunca declara) IDs/funções de app-nucleo.js/app-gavetas.js
   — vem por ÚLTIMO na concatenação (mesmo padrão de app-agentes.js). Domínio: seletor de
   modo no cabeçalho (25/50/100) + ponte app→casca nativa (postMessage) + layout por modo
   (destaque/ordem/"+N") + editor de layout (gaveta ⚙ layout, grava via POST /api/perfil). */

// window.EGOS_MODO é injetado pela casca nativa (WebKit2.UserScript, START — corre ANTES
// de qualquer script do documento) via egos-app-nativo.py; fora da casca (navegador/PWA)
// fica undefined e o padrão é "100" (tela cheia normal de um navegador).
window.__modoAtual = window.EGOS_MODO || "100";

var MODULOS_PARA_MAIS = null; // cache do último "faltando" calculado (usado no tooltip do card +N)

// ── PONTE APP→CASCA ──────────────────────────────────────────────────────────────
var NA_CASCA_NATIVA = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.egos);

function enviarModoParaCasca(modo) {
  if (!NA_CASCA_NATIVA) return false;
  try {
    window.webkit.messageHandlers.egos.postMessage(JSON.stringify({ acao: "modo", modo: modo }));
    return true;
  } catch (e) {
    return false;
  }
}

// ── RÉGUA DE LAYOUT (mesma régua de scripts/lib/perfil.ts::layoutParaModo — replicada em
// JS porque o navegador não importa TS; golden de perfil.ts prova a régua uma vez, este
// arquivo só a aplica) ────────────────────────────────────────────────────────────
function layoutEfetivo(perfil, modo) {
  var l = perfil && perfil.layouts && perfil.layouts[modo];
  if (l && Array.isArray(l.modulos) && l.modulos.length) return l;
  return { modulos: (perfil && Array.isArray(perfil.modulos)) ? perfil.modulos.slice() : [] };
}

// destaque sempre vem primeiro (spec: "vem primeiro em 25"; aplicado nos 3 modos por
// previsibilidade — o card "maior" é sempre o 1º, não só no minimapa).
function ordemComDestaque(layout) {
  var ordem = layout.modulos.slice();
  if (layout.destaque && ordem.indexOf(layout.destaque) !== -1) {
    ordem = [layout.destaque].concat(ordem.filter(function (m) { return m !== layout.destaque; }));
  }
  return ordem;
}

function garantirCardMais() {
  var card = document.getElementById("mod-mais");
  if (card) return card;
  var grade = document.getElementById("grade-modulos");
  card = document.createElement("button");
  card.type = "button";
  card.id = "mod-mais";
  card.className = "modulo-card";
  card.setAttribute("data-tt-titulo", "mais módulos");
  card.setAttribute("data-vocab", "arrumacao_da_tela");
  card.innerHTML =
    '<div class="mod-topo">' +
    '<div class="mod-icone" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></div>' +
    '<div class="mod-titulos"><div class="mod-titulo">mais módulos</div></div>' +
    '<div class="mod-numero" id="mod-mais-numero">+0</div>' +
    "</div>";
  card.addEventListener("click", function () {
    if (typeof abrirGaveta === "function") abrirGaveta("layout-overlay");
    if (typeof renderizarEditorLayout === "function") renderizarEditorLayout();
  });
  if (grade) grade.appendChild(card);
  return card;
}

// modo 25% (minimapa) só cabe 3-4 cards fisicamente (spec: "em 25 só 3-4 cards cabem") —
// o teto vale SEMPRE nesse modo, tanto pro layout derivado (perfil.modulos inteiro, caso
// comum quando ninguém editou o modo 25 ainda) quanto pra um layout explícito com mais de
// 4 módulos. destaque sempre sobrevive ao corte (ordemComDestaque já o deixa em 1º).
var LIMITE_MODO_25 = 4;
// TODOS-OS-LIGADOS-NA-HOME-001 (corte Enio 08/09, print: janela de 1365px em "25%" com 4 de 8
// módulos ligados escondidos atrás de "+4"): o teto corta pelo ESPAÇO REAL, não pelo nome do
// modo — só quando a viewport é estreita (minimapa de verdade). Em tela larga, ligado = visível.
var LARGURA_MINIMAPA_MAX = 720;
function tetoAplicavel(modo) {
  return modo === "25" && (window.innerWidth || 0) > 0 && window.innerWidth <= LARGURA_MINIMAPA_MAX;
}

// aplica o layout do modo dado — chamada no load (via aplicarPerfilNaHome, app-nucleo.js)
// e a cada troca de modo (clique/Ctrl+1-2-3), SEM recarregar a página.
function aplicarLayoutModo(modo) {
  var perfil = window.__perfilAtivo;
  if (!perfil || typeof MODULOS_CONHECIDOS === "undefined") return;
  window.__modoAtual = modo;
  var layout = layoutEfetivo(perfil, modo);
  var ordem = ordemComDestaque(layout).filter(function (id) { return MODULOS_CONHECIDOS.indexOf(id) !== -1; });
  var universo = (perfil.modulos && perfil.modulos.length ? perfil.modulos : MODULOS_CONHECIDOS)
    .filter(function (id) { return MODULOS_CONHECIDOS.indexOf(id) !== -1; });

  var mostrar = ordem;
  if (tetoAplicavel(modo) && ordem.length > LIMITE_MODO_25) mostrar = ordem.slice(0, LIMITE_MODO_25);
  var faltando = universo.filter(function (id) { return mostrar.indexOf(id) === -1; });

  var grade = document.getElementById("grade-modulos");
  MODULOS_CONHECIDOS.forEach(function (id) {
    var el = document.getElementById("mod-" + id);
    if (!el) return;
    el.hidden = mostrar.indexOf(id) === -1;
    el.classList.toggle("destaque", !!layout.destaque && layout.destaque === id);
  });
  mostrar.forEach(function (id) {
    var el = document.getElementById("mod-" + id);
    if (el && grade) grade.appendChild(el);
  });

  var cardMais = document.getElementById("mod-mais");
  if (modo === "25" && faltando.length) {
    MODULOS_PARA_MAIS = faltando;
    var card = garantirCardMais();
    card.hidden = false;
    var n = document.getElementById("mod-mais-numero");
    if (n) n.textContent = "+" + faltando.length;
    card.setAttribute("data-tt-abre", "Abre o editor de layout — " + faltando.length + " módulo(s) fora deste modo: " + faltando.join(", ") + ".");
    if (grade) grade.appendChild(card);
  } else {
    MODULOS_PARA_MAIS = [];
    if (cardMais) cardMais.hidden = true;
  }
  atualizarBotoesModo(modo);
}

function atualizarBotoesModo(modo) {
  var wrap = document.getElementById("modo-tela-wrap");
  if (!wrap) return;
  Array.prototype.forEach.call(wrap.querySelectorAll(".modo-tela-btn"), function (b) {
    b.setAttribute("aria-pressed", b.dataset.modo === modo ? "true" : "false");
  });
}

function trocarModo(modo) {
  enviarModoParaCasca(modo);
  aplicarLayoutModo(modo);
}

// ── EDITOR DE LAYOUT (gaveta ⚙ layout) ───────────────────────────────────────────
// derivado do VOCAB (fonte única) — o emoji vem de VOCAB.modulo[id].icone, separado de
// .humano, para que tirar/manter emoji seja decisão declarada e não efeito colateral de
// refatoração. Guard typeof: mesma convenção que MODULOS_CONHECIDOS já usa (app-nucleo.js).
var ROTULOS_MODULO_EDITOR = (typeof VOCAB === "undefined") ? {} :
  Object.fromEntries(MODULOS_CONHECIDOS.map(function (id) {
    return [id, (VOCAB.modulo[id].icone || "") + " " + VOCAB.modulo[id].humano];
  }));
var editorLayoutEstado = null;

function renderizarEditorLayout() {
  var perfil = window.__perfilAtivo;
  var modo = window.__modoAtual || "100";
  var nomeEl = document.getElementById("layout-modo-nome");
  if (nomeEl) nomeEl.textContent = modo + "%";
  if (!perfil || typeof MODULOS_CONHECIDOS === "undefined") return;
  var layout = layoutEfetivo(perfil, modo);
  var ordem = ordemComDestaque(layout).filter(function (id) { return MODULOS_CONHECIDOS.indexOf(id) !== -1; });
  var resto = MODULOS_CONHECIDOS.filter(function (id) { return ordem.indexOf(id) === -1; });
  var todos = ordem.concat(resto);
  var ligados = {};
  todos.forEach(function (id) { ligados[id] = ordem.indexOf(id) !== -1; });
  editorLayoutEstado = { modo: modo, modulos: todos, ligados: ligados, destaque: layout.destaque || null };
  redesenharListaEditor();
  var meta = document.getElementById("layout-meta");
  if (meta) meta.textContent = "editando o modo " + modo + "% — ligar/desligar, reordenar, marcar o destaque";
}

function redesenharListaEditor() {
  var ul = document.getElementById("layout-lista");
  if (!ul || !editorLayoutEstado) return;
  var e = editorLayoutEstado;
  ul.innerHTML = "";
  e.modulos.forEach(function (id, i) {
    var li = document.createElement("li");
    li.className = "layout-item";
    li.dataset.modulo = id;
    var ligado = !!e.ligados[id];
    var ehDestaque = e.destaque === id;
    li.innerHTML =
      '<span class="layout-item-nome">' + (ROTULOS_MODULO_EDITOR[id] || id) + "</span>" +
      '<span class="layout-item-botoes">' +
      '<button type="button" class="layout-btn" data-acao="subir"' + (i === 0 ? " disabled" : "") + ">▲ subir</button>" +
      '<button type="button" class="layout-btn" data-acao="descer"' + (i === e.modulos.length - 1 ? " disabled" : "") + ">▼ descer</button>" +
      '<button type="button" class="layout-btn layout-btn-destaque" data-acao="destaque" aria-pressed="' + ehDestaque + '">' + (ehDestaque ? "★ maior" : "☆ maior") + "</button>" +
      '<button type="button" class="layout-btn layout-btn-toggle" data-acao="toggle" aria-pressed="' + ligado + '">' + (ligado ? "ligado" : "desligado") + "</button>" +
      "</span>";
    ul.appendChild(li);
  });
  var n = e.modulos.filter(function (id) { return e.ligados[id]; }).length;
  var contagem = document.getElementById("layout-contagem");
  if (contagem) contagem.textContent = n + " de " + e.modulos.length + " módulos visíveis";
}

document.addEventListener("DOMContentLoaded", function () {
  var lista = document.getElementById("layout-lista");
  if (lista) {
    lista.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".layout-btn");
      if (!btn || !editorLayoutEstado) return;
      var li = btn.closest(".layout-item");
      var id = li.dataset.modulo;
      var e = editorLayoutEstado;
      var idx = e.modulos.indexOf(id);
      var acao = btn.dataset.acao;
      if (acao === "subir" && idx > 0) {
        e.modulos.splice(idx, 1); e.modulos.splice(idx - 1, 0, id);
      } else if (acao === "descer" && idx < e.modulos.length - 1) {
        e.modulos.splice(idx, 1); e.modulos.splice(idx + 1, 0, id);
      } else if (acao === "destaque") {
        e.destaque = e.destaque === id ? null : id;
      } else if (acao === "toggle") {
        e.ligados[id] = !e.ligados[id];
        if (!e.ligados[id] && e.destaque === id) e.destaque = null;
      }
      redesenharListaEditor();
    });
  }

  var btnAbrir = document.getElementById("btn-editor-layout");
  if (btnAbrir) {
    btnAbrir.addEventListener("click", function () {
      if (typeof abrirGaveta === "function") abrirGaveta("layout-overlay");
      renderizarEditorLayout();
    });
  }
  var btnFechar = document.getElementById("layout-fechar");
  if (btnFechar) btnFechar.addEventListener("click", function () { if (typeof fecharGaveta === "function") fecharGaveta("layout-overlay"); });

  var btnRestaurar = document.getElementById("layout-restaurar");
  if (btnRestaurar) {
    btnRestaurar.addEventListener("click", function () {
      var perfil = window.__perfilAtivo;
      var modo = window.__modoAtual || "100";
      if (perfil && perfil.layouts) delete perfil.layouts[modo];
      renderizarEditorLayout();
      aplicarLayoutModo(modo);
      var meta = document.getElementById("layout-meta");
      if (meta) meta.textContent = "🟡 restaurado ao padrão nesta janela — clique salvar para gravar em disco";
    });
  }

  var btnSalvar = document.getElementById("layout-salvar");
  if (btnSalvar) {
    btnSalvar.addEventListener("click", function () {
      var perfil = window.__perfilAtivo;
      var meta = document.getElementById("layout-meta");
      if (!perfil || !editorLayoutEstado) return;
      var e = editorLayoutEstado;
      var modulosLigados = e.modulos.filter(function (id) { return e.ligados[id]; });
      var novoLayout = { modulos: modulosLigados };
      if (e.destaque && modulosLigados.indexOf(e.destaque) !== -1) novoLayout.destaque = e.destaque;
      if (!perfil.layouts) perfil.layouts = {};
      perfil.layouts[e.modo] = novoLayout;
      if (meta) meta.textContent = "salvando…";
      fetch("/api/perfil", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ layouts: perfil.layouts }),
      })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (res) {
          if (res.status === 200 && res.j.ok) {
            if (meta) { meta.textContent = "🟢 arrumação salva"; meta.title = res.j.caminho; }
            aplicarLayoutModo(e.modo);
          } else if (meta) {
            meta.textContent = "🔴 " + (res.j.erro || "não consegui salvar");
            meta.title = "status HTTP " + res.status;
          }
        })
        .catch(function (err) { if (meta) meta.textContent = "🔴 falha ao salvar: " + err; });
    });
  }
});

// ── INICIALIZAÇÃO: pílulas do cabeçalho + atalhos Ctrl+1/2/3 ────────────────────
(function () {
  var wrap = document.getElementById("modo-tela-wrap");
  if (wrap) {
    Array.prototype.forEach.call(wrap.querySelectorAll(".modo-tela-btn"), function (b) {
      if (!NA_CASCA_NATIVA) {
        var abre = b.getAttribute("data-tt-abre") || "";
        b.setAttribute("data-tt-abre", abre + " Fora da casca nativa: só troca o layout — não há janela pra mover.");
      }
      b.addEventListener("click", function () { trocarModo(b.dataset.modo); });
    });
  }
  document.addEventListener("keydown", function (ev) {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    var mapa = { "1": "25", "2": "50", "3": "100" };
    var alvo = mapa[ev.key];
    if (!alvo) return;
    ev.preventDefault();
    trocarModo(alvo);
  });
  atualizarBotoesModo(window.__modoAtual);
})();

// ── BIBLIOTECA-DE-PERFIS-001 (corte Enio 09/09) ────────────────────────────────────────
// "já temos vários templates para mudar totalmente, mas ainda não ligamos o botão de mudar".
// O mecanismo (template = perfil) fechou em 04/09; a TELA nunca existiu — trocar exigia
// variável de ambiente ou editar JSON à mão. Sem isto, compartilhar o app entrega algo que
// só o dono sabe configurar. Aqui o perfil vira um clique, com a verdade ao lado: quando o
// app foi aberto com perfil fixado por fora, o botão NÃO finge que muda — ele diz por quê.
(function () {
  function escaparP(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function cartaoPerfil(p, travado) {
    // dois perfis com o mesmo nome (o teu pessoal e o exemplo versionado) apareciam iguais —
    // a origem é o que os distingue, então ela vai no cartão.
    var marca = (p.ativo ? "● em uso agora" : "○") + (p.origem === "pessoal" ? " · o teu" : " · exemplo");
    var detalhe = [p.modulos + " módulos"]
      .concat(p.dominios && p.dominios.length ? [p.dominios.join(", ")] : [])
      .concat(p.integracoes && p.integracoes.length ? ["liga: " + p.integracoes.join(", ")] : [])
      .join(" · ");
    var botao = p.ativo || travado
      ? ""
      : '<button type="button" class="btn-usar-perfil" data-id="' + escaparP(p.id) + '" style="margin-top:6px;padding:4px 12px;border-radius:8px;border:1px solid var(--borda,#2a3346);background:transparent;color:inherit;cursor:pointer">usar este</button>';
    return '<div class="tile-integracao ' + (p.ativo ? "ativa" : "") + '" style="margin-bottom:8px">' +
      '<div class="ti-nome">' + marca + " " + escaparP(p.nome) + '</div>' +
      (p.descricao ? '<div class="ti-detalhe">' + escaparP(p.descricao) + "</div>" : "") +
      '<div class="ti-detalhe" style="color:var(--texto-fraco)">' + escaparP(detalhe) + "</div>" +
      botao + "</div>";
  }

  async function carregarPerfis() {
    var lista = document.getElementById("perfis-lista");
    var cont = document.getElementById("cont-perfis");
    var aviso = document.getElementById("perfis-aviso");
    if (!lista) return;
    try {
      var r = await fetch("/api/perfis");
      var j = await r.json();
      if (cont) cont.textContent = j.perfis.length;
      if (aviso) {
        var frases = [];
        if (j.travadoPorAmbiente) frases.push("🔒 este app foi aberto com um perfil fixado por fora — a troca aqui não teria efeito, então o botão não aparece");
        if (j.ilegiveis) frases.push("🔴 " + j.ilegiveis + " arquivo(s) de perfil não puderam ser lidos");
        aviso.hidden = frases.length === 0;
        aviso.textContent = frases.join(" · ");
      }
      lista.innerHTML = j.perfis.length
        ? j.perfis.map(function (p) { return cartaoPerfil(p, j.travadoPorAmbiente); }).join("")
        : '<div class="ti-detalhe">⚪ nenhum perfil encontrado</div>';
    } catch (e) {
      lista.innerHTML = '<div class="ti-detalhe">🔴 falha ao listar os perfis: ' + escaparP(e) + "</div>";
    }
  }

  document.addEventListener("click", async function (e) {
    var btn = e.target.closest && e.target.closest(".btn-usar-perfil");
    if (!btn) return;
    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "trocando…";
    try {
      var r = await fetch("/api/perfis/usar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: btn.dataset.id }),
      });
      var j = await r.json();
      btn.textContent = (j.ok ? "🟢 " : "🔴 ") + j.motivo.slice(0, 60);
      if (j.ok) setTimeout(function () { location.reload(); }, 1200);
      else btn.disabled = false;
    } catch (err) {
      btn.textContent = "🔴 " + err;
      btn.disabled = false;
    }
  });

  // a gaveta de layout já tem abridor registrado (GAVETA-ABRE-CARREGADA-001): encadeia,
  // não substitui — senão o editor de layout deixaria de carregar.
  window.__ABRIDORES = window.__ABRIDORES || {};
  var anterior = window.__ABRIDORES["layout-overlay"];
  window.__ABRIDORES["layout-overlay"] = function () {
    if (typeof anterior === "function") anterior();
    carregarPerfis();
  };
})();

// ── GALERIA-DE-LAYOUTS-001 (corte Enio 15/09) ───────────────────────────────────────
// presets nomeados aplicáveis num clique + exportar/importar. Escreve pelo MESMO POST
// /api/perfil que o editor manual (linha ~256) — nenhuma rota nova de escrita de perfil,
// só a leitura/composição de qual preset vira layout (rotas-layout-presets.ts).
(function () {
  var presetAtivoNome = null;
  var layoutAnterior; // undefined = ainda não aplicou nada nesta sessão de tela

  function escaparG(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function persistirLayout(modo, layoutOuNulo, aoTerminar) {
    var perfil = window.__perfilAtivo;
    if (!perfil) return;
    var copia = Object.assign({}, perfil.layouts || {});
    if (layoutOuNulo) copia[modo] = layoutOuNulo; else delete copia[modo];
    fetch("/api/perfil", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ layouts: copia }),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok) { perfil.layouts = copia; aplicarLayoutModo(modo); }
        if (aoTerminar) aoTerminar(j);
      })
      .catch(function (err) { if (aoTerminar) aoTerminar({ ok: false, erro: String(err) }); });
  }

  function renderGaleria(presets) {
    var lista = document.getElementById("galeria-layouts-lista");
    var cont = document.getElementById("cont-presets");
    if (!lista) return;
    if (cont) cont.textContent = presets.length;
    lista.innerHTML = presets.map(function (p) {
      var ativoSelo = p.nome === presetAtivoNome ? " ● ativo agora" : "";
      return '<div class="tile-integracao" style="margin-bottom:8px">' +
        '<div class="ti-nome">' + escaparG(p.nome) + ativoSelo + '</div>' +
        '<div class="ti-detalhe">' + escaparG(p.descricao) + ' · densidade ' + escaparG(p.densidade) + ' · ' + p.modulos.length + ' módulo(s)</div>' +
        '<button type="button" class="layout-btn galeria-usar-preset" data-nome="' + escaparG(p.nome) + '" style="margin-top:6px">usar este layout</button>' +
        "</div>";
    }).join("") || '<div class="ti-detalhe">⚪ nenhum layout na galeria</div>';
  }

  function carregarGaleria() {
    fetch("/api/layout-presets")
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j.ok) renderGaleria(j.presets); })
      .catch(function () { /* galeria some silenciosamente só na falha de rede — o editor manual segue funcionando */ });
  }

  document.addEventListener("click", function (e) {
    var btnUsar = e.target.closest && e.target.closest(".galeria-usar-preset");
    if (btnUsar) {
      var modo = window.__modoAtual || "100";
      fetch("/api/layout-presets/aplicar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: btnUsar.dataset.nome, modo: modo }),
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.ok) { var meta = document.getElementById("galeria-preset-ativo"); if (meta) meta.textContent = "🔴 " + (j.erro || "falhou"); return; }
          layoutAnterior = j.anterior;
          persistirLayout(modo, j.layout, function (res) {
            var metaEl = document.getElementById("galeria-preset-ativo");
            if (res.ok) {
              presetAtivoNome = j.presetAplicado;
              if (metaEl) metaEl.textContent = "🟢 aplicado: " + j.presetAplicado;
              var voltar = document.getElementById("galeria-voltar-anterior");
              if (voltar) voltar.hidden = false;
              renderizarEditorLayout();
              carregarGaleria();
            } else if (metaEl) {
              metaEl.textContent = "🔴 " + (res.erro || "não consegui salvar");
            }
          });
        });
      return;
    }

    if (e.target.closest && e.target.closest("#galeria-voltar-anterior")) {
      var modoAtual = window.__modoAtual || "100";
      persistirLayout(modoAtual, layoutAnterior || null, function (res) {
        var metaEl = document.getElementById("galeria-preset-ativo");
        presetAtivoNome = null;
        if (metaEl) metaEl.textContent = res.ok ? "🟡 voltou ao layout anterior" : "🔴 " + (res.erro || "falhou");
        document.getElementById("galeria-voltar-anterior").hidden = true;
        renderizarEditorLayout();
        carregarGaleria();
      });
      return;
    }

    if (e.target.closest && e.target.closest("#galeria-exportar-atual")) {
      var perfil = window.__perfilAtivo;
      var modoExp = window.__modoAtual || "100";
      var layoutAtual = (perfil && perfil.layouts && perfil.layouts[modoExp]) || { modulos: (perfil && perfil.modulos) || [] };
      // densidade é ESTIMADA a partir da contagem (mesmos tetos de CAPACIDADE_POR_DENSIDADE
      // em scripts/lib/layout-presets.ts: alta=9/media=5/baixa=3) — o servidor não inventa,
      // quem decide o rótulo final é quem exporta.
      var n = (layoutAtual.modulos || []).length;
      var densidadeEstimativa = n >= 7 ? "alta" : n >= 4 ? "media" : "baixa";
      var preset = {
        nome: presetAtivoNome || "Meu layout",
        descricao: "exportado do EGOS APP em " + new Date().toISOString().slice(0, 10),
        destaque: layoutAtual.destaque || null,
        modulos: layoutAtual.modulos || [],
        densidade: densidadeEstimativa,
      };
      var ta = document.getElementById("galeria-json");
      if (ta) { ta.hidden = false; ta.value = JSON.stringify(preset, null, 2); ta.focus(); ta.select(); }
      return;
    }

    if (e.target.closest && e.target.closest("#galeria-importar-abrir")) {
      var taImp = document.getElementById("galeria-json");
      var acoes = document.getElementById("galeria-importar-acoes");
      if (taImp) { taImp.hidden = false; taImp.value = ""; taImp.focus(); }
      if (acoes) acoes.hidden = false;
      return;
    }

    if (e.target.closest && e.target.closest("#galeria-importar-confirmar")) {
      var taVal = document.getElementById("galeria-json");
      var metaImp = document.getElementById("galeria-import-meta");
      if (!taVal || !taVal.value.trim()) return;
      fetch("/api/layout-presets/importar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: taVal.value }),
      })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (res) {
          if (res.status === 200 && res.j.ok) {
            if (metaImp) metaImp.textContent = "🟢 layout \"" + res.j.preset.nome + "\" instalado — já aparece na galeria acima";
            carregarGaleria();
          } else if (metaImp) {
            metaImp.textContent = "🔴 " + (res.j.erro || "recusado");
          }
        })
        .catch(function (err) { if (metaImp) metaImp.textContent = "🔴 falha de rede: " + err; });
      return;
    }
  });

  window.__ABRIDORES = window.__ABRIDORES || {};
  var abridorAnteriorGaleria = window.__ABRIDORES["layout-overlay"];
  window.__ABRIDORES["layout-overlay"] = function () {
    if (typeof abridorAnteriorGaleria === "function") abridorAnteriorGaleria();
    carregarGaleria();
  };
})();
