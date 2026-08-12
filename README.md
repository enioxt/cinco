# Rádio Philein

> Uma rádio que roda o dia inteiro sem transmitir um byte de áudio: a página marca o compasso,
> e o play acontece no player de cada pessoa. **Ao vivo em [cinco.ia.br/radio](https://cinco.ia.br/radio/)**.

## Como funciona (o truque inteiro cabe em 3 linhas)

1. `playlist.json` tem as faixas com a duração de cada uma e uma âncora de tempo.
2. A página calcula `(agora − âncora) mod duração_total` e descobre **que faixa estaria tocando neste segundo** — quem entra às 14h vê o que "está no ar" às 14h.
3. O botão de play abre a faixa no player da própria pessoa (busca no YouTube por ora; embeds oficiais virão). **Nenhum áudio é hospedado ou transmitido aqui.**

Sem backend, sem banco, sem streaming — um HTML, um JSON e o relógio.

## Características do player

- **No ar agora** com barra de progresso sincronizada ao segundo (todo mundo vê a mesma faixa no mesmo ponto)
- **A seguir** + programação completa com durações
- Play externo por faixa (o som é seu, o compasso é nosso)
- Tema claro/escuro automático, tipografia-primeiro, zero dependências
- Título da aba acompanha a faixa (▶ como se estivesse tocando)

## Em desenvolvimento (herdado da Philein original — colabore!)

A Philein nasceu como rádio comunitária dentro de outro projeto (sugestão de músicas, fila votada,
estações, integração Spotify e bot de Telegram), foi pausada, e renasce aqui como standalone aberto.
As funcionalidades aparecem na página **ofuscadas, sem ação, com aviso** — é o roadmap em público:

- [ ] Sugerir música · [ ] Votar na fila · [ ] Estações da comunidade
- [ ] Player embutido (Spotify/YouTube oficial) · [ ] Bot no Telegram
- [ ] Curadoria oficial da playlist (a atual é demonstração — era rock 2002/2003)

**Como contribuir:** abra uma issue com ideia/sugestão de faixa, ou um PR corrigindo durações,
melhorando o player, ou atacando um item do roadmap. Regra da casa: o que não está pronto, a tela
avisa — nada de botão que finge funcionar.

## Rodar local

Sirva a pasta com qualquer servidor estático (`python3 -m http.server`) e abra `index.html`.

## Licença

MIT — use, melhore, redistribua.

— Enio Rocha · [github.com/enioxt](https://github.com/enioxt) · parte do [cinco](https://cinco.ia.br)
