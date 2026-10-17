# Início Geral — protótipo da porta única

> **Data:** 2026-10-07  
> **Status:** protótipo reversível. Não substitui a home atual sem validação humana.  
> **Origem:** síntese da sessão Enio + Guarani sobre EGOS/Cinco, perfis, lentes, convite e rede local.

## Objetivo

Testar uma entrada mais simples para quem ainda não conhece as capacidades do Cinco:

> **O que você quer resolver?**
>
> Conte do seu jeito. O EGOS procura o que já existe, mostra o que consegue provar e ajuda você a decidir o próximo passo.

A hipótese é que a pessoa entende melhor o que fazer quando começa pelo próprio problema, e não pelo catálogo.

## O que este protótipo reutiliza

- o `conversa.js` existente;
- o nome público Cinco;
- o agente “EGOS” já apresentado no chat;
- a lógica atual de estado + prova;
- links para as capacidades já publicadas;
- nenhuma biblioteca externa.

## O que ele NÃO implementa

- convite persistido;
- vínculo com embaixador;
- QR code;
- perfil profissional;
- matching;
- reputação;
- pagamento;
- áudio/foto/arquivo no chat;
- nova conta ou novo tipo de usuário.

Esses itens aparecem na arquitetura do kernel como próximos experimentos, mas não devem ser fingidos no front-end.

## Hierarquia

1. **Conversa** — primeira ação.
2. **Atalhos de intenção** — ajudam quem ainda não sabe formular.
3. **Capacidades** — aparecem como caminhos que o sistema já possui, com estado/prova.
4. **Como funciona** — explicar entendimento → busca → prova → decisão.
5. **Contextos** — mostrar que a mesma base pode operar em áreas diferentes sem criar um app para cada uma.

## Critério de aceite da página

- funciona sem dependência de serviço de terceiro;
- o CTA abre o `conversa.js` já existente;
- não afirma que convite, matching ou perfil já existem;
- deixa claro que é protótipo;
- mantém caminho para `/capacidades/` e para a home atual;
- mobile-first e acessível por teclado;
- não coleta dado novo por conta própria.

## Próxima validação

Mostrar a página para pessoas que não acompanham o desenvolvimento e observar:

1. elas entendem o que fazer sem explicação?
2. clicam em conversa ou tentam procurar catálogo primeiro?
3. que frase usam para descrever o problema?
4. em que ponto perguntam “o que é EGOS/Cinco?”
5. que capability esperavam encontrar e não encontraram?

Só depois dessas respostas a home atual deve ser substituída ou fundida com este protótipo.
