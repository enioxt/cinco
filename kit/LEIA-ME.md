<!-- GERADO por kit/gerar-cartoes.ts a partir de kit/ferramentas.json. Não edite à mão: edite o JSON e rode: bun kit/gerar-cartoes.ts -->

# O kit — ferramentas de verdade, incompletas de propósito

Isto não é maquete nem promessa: são 5 motores que rodaram na noite de 29→30/08/2026, com teste automático próprio. Em 17/10/2026 rodamos os testes de novo e deram os mesmos 54 golden tests passando (o nome técnico para "caso de teste que prova um comportamento específico, não só que o código não quebrou"). Nada aqui finge estar mais pronto do que está — o que falta está na seção "Incompleto de propósito".

**Você não precisa entender o código.** Cada cartão abaixo diz o que a ferramenta é, o que faz, por que está no kit e mostra casos de uso com o comando e a prova. Se preferir, cole o `LEIA-ME.md` inteiro na sua inteligência artificial (Claude Code, Cursor, Windsurf, o que você já usa) e peça para ela rodar os comandos.

---

## Por que estas 5

São o menor conjunto que faz **várias sessões de IA trabalharem juntas na mesma máquina, sem servidor**: a `fila` passa o trabalho de uma sessão para outra; a `orquestra-entrar` dá a cada sessão um papel e um território; o `vigia-ambiente` acorda a sessão quando algo muda; a `orquestra-viva` deixa ver a fila ao vivo; a `cronica` conta o que aconteceu.

Isto é a razão do desenho, não uma medição de ganho: não testamos tirar uma peça de cada vez para ver o que piora. O que medimos está em cada cartão, no campo "por que está no kit".

## O que cada ferramenta faz (1 frase cada)

| ferramenta | o que faz |
| --- | --- |
| `scripts/fila.ts` | Uma caixa de entrada em disco para cada agente: uma sessão posta um pedido, outra pega e devolve o resultado, sem servidor nenhum. |
| `scripts/orquestra-viva.ts` + `scripts/orquestra-viva.html` + `scripts/orquestra-viva.sh` | O motor que lê a fila ao vivo e a serve em uma porta local; a tela que o acompanha foi aposentada no EGOS. |
| `scripts/vigia-ambiente.sh` | Um vigia que dorme, acorda de tempos em tempos, compara o ambiente e só avisa quando algo de fato mudou. |
| `scripts/orquestra-entrar.sh` | A porta única de entrada de uma sessão nova: ela diz qual papel vai exercer e recebe o resumo certo para esse papel. |
| `scripts/cronica.ts` | Conta em prosa o que a orquestra fez, a partir dos fatos medidos na fila. |

## Os cartões

*Medido em 17/10/2026. Contagem de referências ao nome do arquivo no código do EGOS (o núcleo privado onde estes motores nascem e rodam). Referência é menção no código, não é número de execuções. Quem baixa o kit não consegue repetir essa contagem; o que qualquer um repete é o teste de cada ferramenta.*

### fila

**O que é.** Uma caixa de entrada em disco para cada agente: uma sessão posta um pedido, outra pega e devolve o resultado, sem servidor nenhum.

**O que faz.**

- Guarda cada pedido como um arquivo, em três pastas: pendentes, em andamento, concluídos.
- Na hora de pegar, o arquivo é movido por renomeação: duas sessões nunca pegam o mesmo pedido.
- O comando `estado` diz, sem enfeite, quem está escutando, quem caiu e qual pedido está parado há tempo demais.

**Por que está no kit.** É o coração do kit: sem a fila, as outras quatro não têm o que ler, vigiar ou contar. No EGOS ela liga as sessões de IA, o painel e o WhatsApp entre si, e é a ferramenta mais usada das cinco.

- referências no código do EGOS: 108
- alarme em produção: o timer egos-fila-sem-leitor está ativo e avisa quando há pedido na fila e ninguém lendo
- testes: 21 golden tests passando

**Imagem (no site).** Diagrama de quatro caixas: postar, pendentes, em andamento e concluídos, em sequência. Tudo é arquivo no seu disco (~/.egos/fila). Sem rede, sem servidor.

**Casos de uso.**

1. **Passar uma tarefa de uma sessão para outra**
   - Situação: Você tem uma sessão coordenando e outra que só implementa. A coordenadora precisa entregar um pedido à forja sem copiar e colar.
   - Comando:

     ```
     bun kit/scripts/fila.ts postar forja "ajustar o botao da tela inicial" --corpo "trocar a cor" --de coordenadora
     ```

   - O que acontece: O pedido vira um arquivo JSON na pasta pendentes da forja e o comando mostra o caminho.

     ```
     postado: ~/.egos/fila/forja/pendentes/1792257667348-ajustar-o-botao-da-tela-inicial.json
     ```

   - Prova: Teste g1 (postar e listar) de fila.test.sh. A saída acima é real, de uma execução em 17/10/2026 numa pasta temporária.

2. **Duas sessões disputam o mesmo pedido**
   - Situação: Duas janelas estão escutando a forja ao mesmo tempo. Só uma pode ficar com o pedido.
   - Comando:

     ```
     bun kit/scripts/fila.ts pegar forja --sessao a1b2c3d4
     bun kit/scripts/fila.ts pegar forja --sessao e5f6a7b8
     ```

   - O que acontece: A primeira recebe o pedido completo e ele passa para em-andamento com o nome da sessão. A segunda recebe a palavra "vazio".

     ```
     (1ª sessão) o JSON do pedido, com executadoPor: a1b2c3d4
     (2ª sessão) vazio
     ```

   - Prova: Teste g3: 20 rodadas de disputa simultânea, exatamente 1 vencedor em 20 de 20.

3. **Entregar o resultado e conferir quem está de pé**
   - Situação: A forja terminou. Ela devolve o resultado e você quer saber se alguém ainda está escutando a fila.
   - Comando:

     ```
     bun kit/scripts/fila.ts concluir <caminho-do-pedido> --resultado "botao trocado, teste passou"
     bun kit/scripts/fila.ts estado
     ```

   - O que acontece: O pedido vai para concluídos com o resultado gravado. O `estado` resume a fila e acusa quando ninguém está escutando.

     ```
     forja: 0 pendente(s) · 0 em andamento · 1 concluido(s) · 🔴 SEM ESCUTA (agente surdo — rearmar)
     ```

   - Prova: Testes g4 (concluir move e grava o resultado) e g7b (escuta que morreu aparece como órfã ou sem escuta). Saída real de 17/10/2026.

4. **Achar o pedido que ninguém terminou**
   - Situação: Uma sessão pegou um pedido e sumiu. Horas depois ninguém sabe que ele está parado.
   - Comando:

     ```
     bun kit/scripts/fila.ts estado
     ```

   - O que acontece: Pedido em andamento há mais de 30 minutos (o teto pode ser mudado em EGOS_FILA_TETO_MIN) aparece como ÓRFÃO-SUSPEITO na linha do agente. Dentro do teto, não há alarme falso.
   - Prova: Testes g9a (acima do teto grita) e g9b (dentro do teto não grita).

**Código.** [scripts/fila.ts](https://github.com/enioxt/cinco/blob/main/kit/scripts/fila.ts) · testes: [scripts/fila.test.sh](https://github.com/enioxt/cinco/blob/main/kit/scripts/fila.test.sh)

**Pergunte ao EGOS.** Cole na sua IA: Quero entender a ferramenta "fila" do kit do cinco (https://cinco.ia.br/kit/). Uma caixa de entrada em disco para cada agente: uma sessão posta um pedido, outra pega e devolve o resultado, sem servidor nenhum. O código está em https://github.com/enioxt/cinco/blob/main/kit/scripts/fila.ts. Explique em linguagem simples, com um exemplo do meu dia a dia, se serve para o meu caso e o que eu precisaria instalar. Se você tiver o conector do EGOS (https://mcp.egos.ia.br/portas/mcp), use-o para me responder.

Conector do EGOS: `https://mcp.egos.ia.br/portas/mcp` (como ligar: https://egos.ia.br/portas).

**Sugerir melhoria.** Abra uma issue: https://github.com/enioxt/cinco/issues/new?title=%5Bkit%2Ffila%5D%20melhoria

### orquestra-viva

**O que é.** O motor que lê a fila ao vivo e a serve em uma porta local; a tela que o acompanha foi aposentada no EGOS.

**O que faz.**

- Sobe um servidor só na sua máquina (127.0.0.1, porta 4599) que responde o estado da fila em JSON.
- Aceita um PING ou uma mensagem para um agente e a coloca na fila, mas recusa agente que não existe.
- Diz se a escuta de cada agente está viva ou órfã. O kit ainda traz a tela HTML antiga, que mostra isso.

**Por que está no kit.** O motor segue sendo a ponte entre a fila em disco e qualquer tela que queira mostrá-la. A tela dele deixou de ser o painel do EGOS em 07/10/2026: o painel do EGOS hoje é o EGOS App v2, que lê o mesmo estado. Fica no kit porque o motor é reaproveitável; não o apresente como o painel.

- referências no código do EGOS: 54
- situação da tela: aposentada em 07/10/2026; o painel do EGOS é o EGOS App v2
- testes: 6 golden tests passando

**Imagem (no site).** Diagrama de três caixas: fila em disco, motor na porta local 4599 e a tela no navegador. O motor não sai da sua máquina: escuta só em 127.0.0.1.

**Casos de uso.**

1. **Ver o estado da fila no navegador**
   - Situação: Você quer olhar o que está pendente e quem está escutando sem digitar comando.
   - Comando:

     ```
     bash kit/scripts/orquestra-viva.sh
     ```

   - O que acontece: Sobe o motor em http://127.0.0.1:4599 (e tenta abrir a janela com o Chrome; sem Chrome, abra o endereço à mão). O caminho /estado devolve a fila em JSON.
   - Prova: Teste g1: /estado lista o pedido pendente com o título correto. Teste g6: se a fila não existe, /estado responde sem erro 500.

2. **Saber se a escuta de um agente está viva**
   - Situação: Um agente parece parado. Você quer saber se o processo que escuta ainda existe.
   - Comando:

     ```
     curl http://127.0.0.1:4599/estado
     ```

   - O que acontece: Cada agente vem com o estado da escuta: viva quando o processo existe, órfã quando a presença ficou para trás.
   - Prova: Teste g2 (escuta viva com o pid do próprio shell) e g3 (presença com pid morto vira órfã).

3. **Mandar um PING a um agente**
   - Situação: Você quer cutucar a forja para ver se ela responde.
   - Comando:

     ```
     curl -X POST http://127.0.0.1:4599/comando -H 'content-type: application/json' -d '{"acao":"ping","agente":"forja"}'
     ```

   - O que acontece: Um pedido "PING" cai na pasta pendentes da forja. Se o agente não existe, a resposta é 400 e nenhum arquivo é criado.
   - Prova: Teste g4 (o PING cria o pedido em pendentes) e g5 (agente inexistente: 400 e zero arquivo criado).

**Código.** [scripts/orquestra-viva.ts](https://github.com/enioxt/cinco/blob/main/kit/scripts/orquestra-viva.ts) · [scripts/orquestra-viva.html](https://github.com/enioxt/cinco/blob/main/kit/scripts/orquestra-viva.html) · [scripts/orquestra-viva.sh](https://github.com/enioxt/cinco/blob/main/kit/scripts/orquestra-viva.sh) · testes: [scripts/orquestra-viva.test.sh](https://github.com/enioxt/cinco/blob/main/kit/scripts/orquestra-viva.test.sh)

**Pergunte ao EGOS.** Cole na sua IA: Quero entender a ferramenta "orquestra-viva" do kit do cinco (https://cinco.ia.br/kit/). O motor que lê a fila ao vivo e a serve em uma porta local; a tela que o acompanha foi aposentada no EGOS. O código está em https://github.com/enioxt/cinco/blob/main/kit/scripts/orquestra-viva.ts. Explique em linguagem simples, com um exemplo do meu dia a dia, se serve para o meu caso e o que eu precisaria instalar. Se você tiver o conector do EGOS (https://mcp.egos.ia.br/portas/mcp), use-o para me responder.

Conector do EGOS: `https://mcp.egos.ia.br/portas/mcp` (como ligar: https://egos.ia.br/portas).

**Sugerir melhoria.** Abra uma issue: https://github.com/enioxt/cinco/issues/new?title=%5Bkit%2Forquestra-viva%5D%20melhoria

### vigia-ambiente

**O que é.** Um vigia que dorme, acorda de tempos em tempos, compara o ambiente e só avisa quando algo de fato mudou.

**O que faz.**

- Compara o conteúdo (o hash) dos arquivos que você listar, o veredito de um sentinela e o commit mais recente do git.
- Termina assim que acha uma mudança real, e o fim do processo é o que acorda a sessão. Tocar num arquivo sem mudar o conteúdo não conta.
- Se um arquivo some ou não dá para ler, diz o estado (AUSENTE, NAO-MEDIDO) em vez de ficar em silêncio.

**Por que está no kit.** Uma sessão de IA só enxerga o que busca quando um turno roda: ela não tem ouvido. O vigia é o ouvido, e foi escrito depois de dois alarmes falsos reais (um arquivo re-escrito igual e um carimbo de hora que muda a cada rodada). É a ferramenta menos referenciada das cinco: o uso é pequeno e foi mexida hoje.

- referências no código do EGOS: 2 (mexida no dia da medição)
- testes: 7 golden tests passando

**Imagem (no site).** Diagrama de quatro caixas: arquivos e commit, comparar hash, igual segue dormindo, diferente avisa. Sem rede. Só disco e git.

**Casos de uso.**

1. **Ser acordada quando um arquivo muda**
   - Situação: Você deixa o ambiente aberto e quer que a sessão só volte a trabalhar quando um arquivo importante mudar.
   - Comando:

     ```
     EGOS_VIGIA_FILES=/caminho/do/arquivo.txt EGOS_VIGIA_INTERVALO=1 EGOS_VIGIA_CICLOS=3 bash kit/scripts/vigia-ambiente.sh
     ```

   - O que acontece: O vigia arma, dorme, e ao ver o hash novo imprime a diferença e termina.

     ```
     vigia armado 2026-10-17T14:21:13-03:00 — 1 arquivo(s), intervalo 1s
     === MUDANCA DETECTADA 2026-10-17T14:21:15-03:00 (ciclo 2) ===
     < cc419094a83bfb26723ba8d64b6e6aab  arquivo.txt
     > e27b69e122564ad3ea8b9b357ec528fc  arquivo.txt
     ```

   - Prova: Teste g1 (arquivo vigiado mudou: detecta). Saída real de 17/10/2026, com o caminho trocado por arquivo.txt.

2. **Não acordar por reflexo**
   - Situação: Um programa regrava o próprio arquivo de estado a cada minuto com o mesmo conteúdo. Não é novidade e não deve acordar ninguém.
   - Comando:

     ```
     bash kit/scripts/vigia-ambiente.sh
     ```

   - O que acontece: Regravar com conteúdo idêntico, ou mudar só o carimbo de hora do sentinela, passa em silêncio. Sem mudança, o vigia expira dizendo que expirou.
   - Prova: Testes g7 (regravação idêntica: silêncio), g2 (carimbo do sentinela: silêncio) e g5 (nada mudou: expira dito).

3. **Perceber um commit novo ou um arquivo que apareceu**
   - Situação: Outra janela commitou, ou um arquivo esperado finalmente chegou.
   - Comando:

     ```
     bash kit/scripts/vigia-ambiente.sh
     ```

   - O que acontece: O avanço do HEAD do git conta como mudança. Um arquivo que estava AUSENTE e passa a existir também.
   - Prova: Testes g6 (HEAD avançou: detecta) e g4 (AUSENTE e depois existe: detecta). O veredito do sentinela mudando de no-ar para caído também (g3).

**Código.** [scripts/vigia-ambiente.sh](https://github.com/enioxt/cinco/blob/main/kit/scripts/vigia-ambiente.sh) · testes: [scripts/vigia-ambiente.test.sh](https://github.com/enioxt/cinco/blob/main/kit/scripts/vigia-ambiente.test.sh)

**Pergunte ao EGOS.** Cole na sua IA: Quero entender a ferramenta "vigia-ambiente" do kit do cinco (https://cinco.ia.br/kit/). Um vigia que dorme, acorda de tempos em tempos, compara o ambiente e só avisa quando algo de fato mudou. O código está em https://github.com/enioxt/cinco/blob/main/kit/scripts/vigia-ambiente.sh. Explique em linguagem simples, com um exemplo do meu dia a dia, se serve para o meu caso e o que eu precisaria instalar. Se você tiver o conector do EGOS (https://mcp.egos.ia.br/portas/mcp), use-o para me responder.

Conector do EGOS: `https://mcp.egos.ia.br/portas/mcp` (como ligar: https://egos.ia.br/portas).

**Sugerir melhoria.** Abra uma issue: https://github.com/enioxt/cinco/issues/new?title=%5Bkit%2Fvigia-ambiente%5D%20melhoria

### orquestra-entrar

**O que é.** A porta única de entrada de uma sessão nova: ela diz qual papel vai exercer e recebe o resumo certo para esse papel.

**O que faz.**

- Exige um papel (coordenadora, forja, revisor ou codex-despacho) e entrega o resumo daquele papel: onde escreve, o que faz, o que nunca faz.
- Trava a janela: uma janela é um papel. Pedir outro papel na mesma janela é barrado com saída 3.
- Ao final, arma a escuta da fila do papel. Com `--so-brief` só mostra o resumo, sem efeito nenhum.

**Por que está no kit.** Num teste de 30/08/2026 a mesma janela virou novata e forja sem ninguém perceber. Obrigar a escolher o papel na entrada dá a cada sessão um território claro. É um script curto e de uso raro: o último commit dele no EGOS é de 30/08/2026.

- referências no código do EGOS: 6
- último commit no EGOS: 30/08/2026
- testes: 5 golden tests passando

**Imagem (no site).** Diagrama de três caixas: escolher o papel, receber o resumo e travar a janela, depois escutar a fila. O papel fica gravado na pasta ~/.egos/orquestra.

**Casos de uso.**

1. **Ler o que cada papel faz antes de entrar**
   - Situação: Você vai abrir uma sessão de revisão e quer ler o resumo do papel antes, sem criar nada.
   - Comando:

     ```
     bash kit/scripts/orquestra-entrar.sh revisor --so-brief
     ```

   - O que acontece: Imprime o resumo do revisor e termina. Nada é gravado e nenhuma escuta é armada.

     ```
     Território: LEITURA — este papel não escreve arquivo nenhum.
     Faz: pega job (bun scripts/fila.ts pegar revisor --sessao <id8>), tenta REFUTAR
     o diff/claim indicado (correção, segurança, regressão, teste que falta), devolve
     veredito com evidência:
     ```

   - Prova: Teste g5 (--so-brief não registra papel). Saída real de 17/10/2026, trecho do resumo.

2. **Entrar de verdade e reentrar sem problema**
   - Situação: Você abre a janela como forja, trabalha, fecha o turno e volta no turno seguinte.
   - Comando:

     ```
     bash kit/scripts/orquestra-entrar.sh forja
     ```

   - O que acontece: Na primeira vez grava o papel da janela. Entrar de novo no mesmo papel passa direto.
   - Prova: Testes g1 (entrada limpa grava o papel da janela) e g2 (reentrada no mesmo papel passa).

3. **Barrar a janela que tenta virar dois papéis**
   - Situação: Uma janela que entrou como forja pede para ser revisora. Sem trava, ela acumularia os dois papéis e ninguém perceberia.
   - Comando:

     ```
     bash kit/scripts/orquestra-entrar.sh revisor
     ```

   - O que acontece: A entrada é recusada com saída 3, a mensagem manda fechar a janela e abrir outra, e a marca do papel anterior fica intacta.
   - Prova: Teste g3 (troca de papel é barrada: saída 3, marca intacta). Teste g4: marca de janela já fechada é varrida.

**Código.** [scripts/orquestra-entrar.sh](https://github.com/enioxt/cinco/blob/main/kit/scripts/orquestra-entrar.sh) · testes: [scripts/orquestra-entrar.test.sh](https://github.com/enioxt/cinco/blob/main/kit/scripts/orquestra-entrar.test.sh)

**Pergunte ao EGOS.** Cole na sua IA: Quero entender a ferramenta "orquestra-entrar" do kit do cinco (https://cinco.ia.br/kit/). A porta única de entrada de uma sessão nova: ela diz qual papel vai exercer e recebe o resumo certo para esse papel. O código está em https://github.com/enioxt/cinco/blob/main/kit/scripts/orquestra-entrar.sh. Explique em linguagem simples, com um exemplo do meu dia a dia, se serve para o meu caso e o que eu precisaria instalar. Se você tiver o conector do EGOS (https://mcp.egos.ia.br/portas/mcp), use-o para me responder.

Conector do EGOS: `https://mcp.egos.ia.br/portas/mcp` (como ligar: https://egos.ia.br/portas).

**Sugerir melhoria.** Abra uma issue: https://github.com/enioxt/cinco/issues/new?title=%5Bkit%2Forquestra-entrar%5D%20melhoria

### cronica

**O que é.** Conta em prosa o que a orquestra fez, a partir dos fatos medidos na fila.

**O que faz.**

- O comando `coletar` monta uma ficha de fatos: agentes, pedidos concluídos, tempos de espera e execução, commits recentes.
- O comando `gerar` pede a um modelo de linguagem (o Claude Code que você já tem instalado) que narre, com a regra de não inventar número fora da ficha.
- Fila vazia é dita vazia. Sem Claude instalado, o modo de teste (`EGOS_CRONICA_FAKE=1`) mostra o formato sem gastar nada.

**Por que está no kit.** Quem trabalha com várias sessões perde o fio do que cada uma entregou. A crônica transforma a fila num relato curto. O teste prova o modo determinístico (FAKE), que é o que aparece abaixo; não prova a qualidade do texto que o modelo real escreve.

- referências no código do EGOS: 12
- testes: 15 golden tests passando (todos no modo FAKE ou com o claude simulado)

**Imagem (no site).** Saída real do modo de teste: a crônica FAKE cita a forja, o pedido concluído e os totais. Saída real do modo FAKE, de 17/10/2026. O texto de um modelo real varia.

```
$ EGOS_CRONICA_FAKE=1 bun kit/scripts/cronica.ts gerar
narrado: ~/.egos/cronica/historia.md

[FAKE] Crônica gerada sem chamar claude.
forja concluiu "ajustar o botao da tela inicial"
(esperou 0min, executou 0min) — 1 concluído(s) no total,
0 pendente(s), 0 em andamento. Commits recentes: 0.
```

**Casos de uso.**

1. **Ver o formato sem gastar nada**
   - Situação: Você não tem o Claude Code instalado, ou só quer ver o que a crônica entrega.
   - Comando:

     ```
     EGOS_CRONICA_FAKE=1 bun kit/scripts/cronica.ts gerar
     ```

   - O que acontece: Escreve historia.md com os fatos da fila, sem chamar modelo nenhum. É a mesma saída da imagem do cartão.
   - Prova: Testes g2 (a história é escrita e cita os agentes) e g2b (historia.json traz os fatos e o tom padrão).

2. **Olhar a ficha de fatos antes de narrar**
   - Situação: Você quer conferir os números que o modelo vai receber.
   - Comando:

     ```
     bun kit/scripts/cronica.ts coletar
     ```

   - O que acontece: Imprime a ficha em JSON: por agente, pedidos pendentes, em andamento e concluídos, cada um com título, quem pediu, hora e resultado.
   - Prova: Teste g1: a ficha conta certo (2 agentes, 4 pedidos, latências corretas).

3. **Fila vazia ou arquivo estragado**
   - Situação: A fila nunca existiu, ou um pedido ficou com o JSON corrompido.
   - Comando:

     ```
     EGOS_CRONICA_FAKE=1 bun kit/scripts/cronica.ts gerar
     ```

   - O que acontece: Fila vazia vira uma história que diz que está vazia, sem inventar. O arquivo corrompido é contado como ilegível e o programa não cai.
   - Prova: Testes g4a e g4b (fila vazia ou inexistente é dita vazia) e g5 (2 JSON corrompidos contados, sem queda).

4. **Escolher o tom da narrativa**
   - Situação: Você quer a crônica mais seca, ou mais calorosa.
   - Comando:

     ```
     bun kit/scripts/cronica.ts gerar --tom "seco e objetivo"
     ```

   - O que acontece: O tom passa a valer na hora e fica guardado: a próxima geração sem --tom reaproveita o último. Tom acima de 200 caracteres é recusado.
   - Prova: Testes g3b (--tom muda o tom guardado), g3c (gerar sem --tom reusa) e g8 (tom acima de 200 caracteres: 400).

**Código.** [scripts/cronica.ts](https://github.com/enioxt/cinco/blob/main/kit/scripts/cronica.ts) · testes: [scripts/cronica.test.sh](https://github.com/enioxt/cinco/blob/main/kit/scripts/cronica.test.sh)

**Pergunte ao EGOS.** Cole na sua IA: Quero entender a ferramenta "cronica" do kit do cinco (https://cinco.ia.br/kit/). Conta em prosa o que a orquestra fez, a partir dos fatos medidos na fila. O código está em https://github.com/enioxt/cinco/blob/main/kit/scripts/cronica.ts. Explique em linguagem simples, com um exemplo do meu dia a dia, se serve para o meu caso e o que eu precisaria instalar. Se você tiver o conector do EGOS (https://mcp.egos.ia.br/portas/mcp), use-o para me responder.

Conector do EGOS: `https://mcp.egos.ia.br/portas/mcp` (como ligar: https://egos.ia.br/portas).

**Sugerir melhoria.** Abra uma issue: https://github.com/enioxt/cinco/issues/new?title=%5Bkit%2Fcronica%5D%20melhoria

## Como rodar (precisa do `bun` instalado)

```
# se ainda não tem o bun:
curl -fsSL https://bun.sh/install | bash

# um exemplo — postar um pedido para o agente "forja" e ver o estado da fila:
bun kit/scripts/fila.ts postar forja "meu primeiro pedido" --de eu
bun kit/scripts/fila.ts estado

# subir o motor da fila ao vivo (http://127.0.0.1:4599):
bash kit/scripts/orquestra-viva.sh
```

Se você não quer digitar nada disso, é exatamente aqui que a sua IA entra — peça a ela para rodar os comandos acima e te mostrar o resultado.

## Leia antes de rodar

- **Tudo roda local.** Nenhuma ferramenta aqui faz chamada de rede para fora, com uma exceção declarada: `cronica.ts` no modo `gerar` chama o Claude Code CLI já instalado na sua máquina (`claude -p ...`) para escrever a narrativa — se você não tem o Claude Code instalado/autenticado, rode com `EGOS_CRONICA_FAKE=1` na frente do comando (o motor testa e mostra o formato sem gastar nada).
- O servidor do `orquestra-viva.ts` escuta só em `127.0.0.1` — não é alcançável por fora da sua máquina, por desenho.
- As ferramentas escrevem estado em `~/.egos/` (fila, crônica) — é uma pasta de trabalho da sua máquina, fora do git, específica de cada computador. Isso é intencional: o motor viaja no repositório, o dado fica com você (P4 do EGOS).
- `orquestra-entrar.sh`, no papel "forja", tenta isolar o trabalho num worktree próprio chamando um script chamado `worktree-seguro.sh` — **esse script não veio junto neste kit** (ver "Incompleto de propósito" abaixo); sem ele, a entrada como forja avisa e segue sem isolar automaticamente.
- `orquestra-viva.sh` tenta abrir uma janela dedicada com `google-chrome --app`; se você não tem o Chrome, abra `http://127.0.0.1:4599` manualmente em qualquer navegador — funciona igual, só sem esse atalho.
- Nenhum destes motores tem autenticação própria: quem tem acesso ao disco da máquina tem acesso à fila. Foram desenhados para UMA máquina de confiança, não para dividir entre pessoas que não confiam entre si sentadas no mesmo computador.

## Como conferir que os testes passam de verdade

Cada ferramenta trouxe o próprio teste (arquivo `*.test.sh`) — rode e veja a saída real, sem precisar acreditar em ninguém:

```
bash kit/scripts/fila.test.sh
bash kit/scripts/orquestra-viva.test.sh
bash kit/scripts/vigia-ambiente.test.sh
bash kit/scripts/orquestra-entrar.test.sh
bash kit/scripts/cronica.test.sh
```

Cada linha `🟢` é um comportamento específico provado (não "não quebrou", e sim "faz o que diz que faz"). A saída que vale é a da SUA máquina — rode e veja; nenhuma prova nossa substitui a sua.

## Baixar os arquivos

Tudo aqui é **licença MIT** — livre para usar, copiar, modificar e forkar; no universo que nasce na sua máquina, o sol é você. Os arquivos, um a um (clique com o direito → salvar como, ou peça à sua IA para baixar):

> **O que está aqui pode mudar de casa.** Tudo isso eu compartilho de boa-fé, sem pedir nada em troca. Mas pode acontecer de eu fechar um acordo pra trabalhar em algum item só com uma pessoa ou empresa — daí ele sai daqui e para de receber versão nova publicada neste kit. O que você já baixou sob esta licença MIT continua seu, nos termos dela — isso não se desfaz, é como a MIT funciona. Tem interesse em algo específico? Me chama antes, pelo contato em [cinco.ia.br](https://cinco.ia.br/#marcar).

- [LEIA-ME.md](LEIA-ME.md) — este arquivo, feito para colar inteiro na sua IA
- [scripts/fila.ts](scripts/fila.ts) · [scripts/fila.test.sh](scripts/fila.test.sh)
- [scripts/orquestra-viva.ts](scripts/orquestra-viva.ts) · [scripts/orquestra-viva.html](scripts/orquestra-viva.html) · [scripts/orquestra-viva.sh](scripts/orquestra-viva.sh) · [scripts/orquestra-viva.test.sh](scripts/orquestra-viva.test.sh)
- [scripts/vigia-ambiente.sh](scripts/vigia-ambiente.sh) · [scripts/vigia-ambiente.test.sh](scripts/vigia-ambiente.test.sh)
- [scripts/orquestra-entrar.sh](scripts/orquestra-entrar.sh) · [scripts/orquestra-entrar.test.sh](scripts/orquestra-entrar.test.sh)
- [scripts/cronica.ts](scripts/cronica.ts) · [scripts/cronica.test.sh](scripts/cronica.test.sh)

De onde isto vem: [cinco.ia.br](https://cinco.ia.br) é o convite e o mapa vivo; [egos.ia.br](https://egos.ia.br) é a federação EGOS, onde estes motores nasceram e rodam todo dia; [github.com/enioxt](https://github.com/enioxt) é o mapa geral dos repositórios.

## Incompleto de propósito

Isto não é a lista do que deu errado — é a lista do que ainda não construímos, dita alto de propósito, porque terminar escondendo o que falta é pior do que chegar incompleto.

- **Presença entre máquinas diferentes (a federação de verdade) ainda não existe.** Hoje a fila e a "escuta viva" só enxergam processos da MESMA máquina (o motor confere o pid local); combinar a fila da sua máquina com a de outra pessoa — o próximo passo real da federação — ainda não foi construído. É exatamente aqui que a próxima pessoa entra.
- **Sem restart automático (o que chamamos de F2).** Se o processo que "escuta" (`fila.ts esperar`) cair — a máquina reiniciar, o processo morrer — ele não volta sozinho. Alguém (ou um cron, que também não vem pronto aqui) precisa rearmar. `fila.ts estado` mostra honestamente quando isso aconteceu (escuta "órfã" ou "sem escuta"); ele nunca finge que está tudo bem.
- **`orquestra-entrar.sh` espera um script de isolamento (`worktree-seguro.sh`) que não está neste kit.** Sem ele, o papel "forja" ainda funciona, só não cria automaticamente um espaço de trabalho isolado — isso fica manual até alguém trazer esse motor também.
- **`cronica.ts` depende de um LLM externo (via Claude Code CLI) para narrar de verdade.** Sem ele instalado e autenticado, só roda no modo de teste (`EGOS_CRONICA_FAKE=1`), que prova o formato mas não escreve a história real.
- **A tela do `orquestra-viva` que vem no kit não é a que o EGOS usa hoje.** O EGOS aposentou essa tela em 07/10/2026 e usa o EGOS App v2. A tela do kit continua funcionando como veio, mas não recebe melhoria nova; o motor por trás dela é o que segue.
- **Não existe autenticação nem separação de usuários.** Pensado para uma pessoa, uma máquina, um nível de confiança. Multiusuário na mesma máquina é território ainda não desenhado.

## Antes de tudo: o que você precisa para rodar isto

Peça por peça, degrau por degrau, com o custo de cada uma e o que dá para fazer de graça — IDE, Supabase, Evolution API, modelo. Está em **[O-QUE-VOCE-PRECISA.html](O-QUE-VOCE-PRECISA.html)**. O degrau 1 não custa nada e já entrega valor; só suba quando o anterior estiver de pé.

## O convite

Cada lacuna acima é um convite, não uma desculpa. Se alguma dessas peças é exatamente o que você sabe construir — federação entre máquinas, restart automático, isolamento por worktree, outra forma de narrar o que a orquestra fez — é aqui que você entra. O motor que já existe está testado e a prova está colada acima; o que falta, falta de verdade, e está escrito para que a próxima pessoa não precise adivinhar por onde continuar.

Achou algo errado ou pouco claro em qualquer campo desta página? Cada campo tem um botão "sugerir melhoria" que abre uma issue já preenchida em [github.com/enioxt/cinco/issues](https://github.com/enioxt/cinco/issues). Se preferir mexer no texto direto, o caminho de sempre continua valendo: um pull request, como diz o [CONTRIBUINDO.md](https://github.com/enioxt/cinco/blob/main/CONTRIBUINDO.md).
