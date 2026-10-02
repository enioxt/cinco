---
name: revisao-estrutural
description: Revisão de um projeto, pasta ou conjunto de documentos para eliminar duplicidade, mapas errados, documentos velhos e afirmações sem prova, corrigindo na mesma passada. Use quando duas fontes parecem mandar no mesmo assunto, quando números divergem ou quando um índice não bate com o que existe no disco.
---

# Revisão estrutural

O objetivo não é um relatório bonito. É deixar o conjunto mais verdadeiro, menor e mais difícil de interpretar errado, por pessoas e por IAs.

**Regra-mãe:** achar, provar, classificar, corrigir, apontar, verificar. Revisão que lista o erro e deixa o mapa errado no caminho de leitura está incompleta.

## Quando usar

- duas fontes parecem ser "a verdade" do mesmo assunto;
- um índice, README ou registro contradiz o que existe de fato;
- o mesmo número aparece com valores diferentes (agentes, ferramentas, produtos);
- documentos antigos ainda parecem atuais;
- antes de compartilhar uma área como método reutilizável.

Não substitui: diagnóstico rápido de saúde, limpeza física de arquivos, redesenho de regras, revisão comum de código.

## Princípios

1. **Descubra antes de criar.** Procure o que já existe antes de escrever outro documento ou ferramenta.
2. **Um assunto, uma autoridade.** O índice aponta, a fonte afirma, as cópias só apontam.
3. **O que existe no disco vence o que o texto diz.** Afirmação sem evidência executável é hipótese.
4. **Retrato datado não governa o presente.** Auditoria antiga guarda história, não vira mapa vivo.
5. **Confira o mapa nos dois sentidos.** O que o mapa lista e não existe; o que existe e o mapa ignora.
6. **A história fica no controle de versão.** Não crie pasta de "arquivo morto" só para guardar texto que o histórico já preserva.
7. **Lista de remoção é hipótese.** Antes de apagar, confirme que ninguém usa.
8. **Sem pontuação falsa.** Não dê nota de 0 a 100 como veredito. Priorize por evidência, gravidade e ação.
9. **Corrija na mesma passada** o que for simples, reversível e provado.
10. **Falha visível.** O que não foi medido fica como "não medido". Dúvida fica como "incerto".

## Duas classificações, nunca misturadas

**A. Confiança na afirmação** (quatro níveis fixos)
- Confirmada: existe evidência verificável (código, teste, dado, execução).
- Inferida: decorre de evidência, mas ninguém conferiu direto.
- Hipótese: intenção ou proposta, sem prova de funcionamento.
- Pendente: ainda não medida. Afirmação contrariada pelo que existe não ganha nível: é corrigida ou removida.

**B. Ciclo de vida do documento**
- AUTORIDADE · DERIVADO ou PONTEIRO · RETRATO (datado) · HISTÓRICO · DEFASADO · DUPLICADO · OBSOLETO.

Um fato confirmado pode morar num documento DEFASADO, e um documento AUTORIDADE pode conter afirmação sem prova. Revise os dois eixos.

## Antes de contar, classifique a espécie

Nunca some coisas de natureza diferente numa contagem só (papéis, automações, ambientes de execução, procedimentos, modelos de pedido). Se dois documentos dão números diferentes, a primeira pergunta é: "número de quê?".

## Protocolo

**Fase 0: escopo.** Arquivo, pasta, projeto ou conjunto de projetos? Quais são as fontes candidatas a autoridade? O que não pode ser tocado (segredos, dado pessoal, ação irreversível)?

**Fase 1: o que já existe.** Procure procedimentos, fontes de verdade, verificadores e auditorias anteriores.

**Fase 2: censo nos dois sentidos.**
- Do mapa para o disco: o caminho existe? O ponto de entrada existe? Quem consome? O status declarado tem prova recente? O ponteiro resolve?
- Do disco para o mapa: está registrado? Na espécie certa? Tem dono? Cria uma fonte concorrente?
- Não declare cobertura total com uma busca que devolveu só os primeiros resultados. Use a lista real do sistema de arquivos ou do provedor.

**Fase 3: arqueologia antes de apagar.** Olhe o histórico do arquivo. Pergunta obrigatória: "que erro anterior este artefato evita?". Sem resposta, sem consumidor e sem dono, é candidato forte a obsoleto, ainda sujeito a nova verificação.

**Fase 4: mapa de autoridade.** Monte-o a partir do texto, como produto derivado e regenerável, com um leitor definido (quem vai usá-lo); um grafo persistente e autônomo, sem leitor, morre. Para cada assunto: entrada, fonte, registro ou código, verificador, derivados, retratos. Marque conflitos: duas fontes para um assunto, cópia que guarda estado que muda, derivado que virou autoridade informal, documento gerado editado à mão.

**Fase 5: prova das afirmações.** Cada achado importante tem evidência forte (caminho e trecho, comando, teste, estado vivo, decisão registrada). Ordem de confiança para estado observável: execução ou teste atual, depois código ou registro atual, depois fonte datada, depois derivados, depois retratos, depois memória.

**Fase 6: decidir a ação.** Uma por achado:
- MANTER · TRANSFORMAR EM PONTEIRO · FUNDIR (incorporar o que é único e eliminar a concorrência) · SUBSTITUIR (apontar o sucessor) · ARQUIVAR (só se tem valor próprio fora do histórico) · APAGAR (sem valor único nem consumidor) · CONSERTAR O VERIFICADOR · RECLASSIFICAR · ADIAR (só com gatilho claro).

Evite "criar relatório novo" como ação. Corrija a fonte que causa a leitura errada.

**Fase 7: revisão independente.** Obrigatória se a mudança altera regra, muda a fonte de verdade, remove algo com dependentes ou redefine uma classificação. Peça a outro revisor (ou a outro modelo) que tente **refutar**: que evidência contradiz esta consolidação? O que quebra se o arquivo sumir? Há consumidor que o censo não viu? Estamos confundindo "não achei prova" com "provei que não existe"?

**Fase 8: corrigir o caminho de leitura.** A revisão não termina enquanto uma IA nova ainda puder cair primeiro no mapa errado. Atualize índices para apontar à fonte responsável pelo assunto, troque números em texto por ponteiros para a fonte viva, ponha aviso no topo de documento histórico, separe contagens por espécie.

**Fase 9: verificar e fechar.**
- [ ] censo nos dois sentidos feito
- [ ] afirmações principais classificadas (confirmada, inferida, hipótese, pendente)
- [ ] documentos classificados por ciclo de vida
- [ ] nenhuma fonte concorrente nova criada
- [ ] caminhos e ponteiros alterados resolvem
- [ ] revisão independente feita quando exigida
- [ ] pendências restantes têm dono, prova que falta e gatilho (não "revisar depois")

## Entrega

Sem nota. Entregue: onde começar a ler agora; o que foi corrigido (com caminhos); o que virou ponteiro, foi removido ou reclassificado; o que continua incerto e que prova falta; próximas revisões por risco de "mapa errado".

## Não fazer

- criar `AUDITORIA_FINAL_V7` para competir com a fonte de verdade;
- copiar um registro vivo para o README;
- trocar só o número ("14" por "15") sem tirar a causa da divergência;
- tratar "ativo" num arquivo de configuração como prova de que rodou;
- chamar de agente qualquer coisa que tenha "agent" no nome;
- apagar história única antes da arqueologia;
- declarar "todos revisados" com busca que devolveu só uma parte.

## Critério de sucesso

Depois da revisão, uma IA nova chega ao mapa certo numa passada, e todo estado que muda tem um dono verificável em vez de várias narrativas.
