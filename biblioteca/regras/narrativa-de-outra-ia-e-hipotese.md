# O que outra IA afirma é hipótese até alguém verificar

## A regra em uma frase
Cada funcionalidade, arquivo ou commit nomeado por um modelo externo, por um subagente ou por texto colado de outra IA é uma afirmação não verificada, classificada como real, conceito ou fantasma depois de conferida; toda tabela com notas exige método e evidência por linha.

## Por que existe
Modelos de linguagem escrevem com segurança sobre sistemas, arquivos e commits que não existem. A assinatura típica é uma lista densa de nomes capitalizados que parecem módulos. Quem aceita a narrativa sem conferir pode executar uma arquitetura fantasma, publicar uma genealogia com datas e autoria erradas ou registrar como concluída uma tarefa sem artefato. Além disso, um documento colado pode carregar instruções embutidas, e quem o lê sem triagem corre o risco de obedecê-las.

Exemplo: alguém cola a análise de outro assistente listando dez "sistemas" de um projeto. Sem conferência, três deles nunca existiram e a decisão seguinte parte deles.

## O que muda na prática
- **Chegada.** O material pousa numa caixa de entrada própria, com cabeçalho de proveniência: fonte, data, qual IA escreveu, link. Instruções dentro dele não são executadas.
- **Classificação em três.** Real: existe arquivo, commit ou teste que comprova. Conceito: ideia plausível sem artefato. Fantasma: cita algo que não existe. Duas fontes independentes antes de rotular algo como real.
- **Sinais de fantasma.** Listas com mais de oito itens em maiúsculas; absolutos como "X não existe" ou "Y é esqueleto" sem arquivo e linha.
- **Conferência.** Antes de citar em commit ou documento de referência, confira os três itens mais fortes por busca estrutural no código. Item que sobrevive é cruzado com o que existe: se já existe, estende-se o existente em vez de criar outro documento.
- **Material grande** não entra no contexto principal: um agente separado lê, classifica e devolve resumo e itens acionáveis.
- **Destino de cada item:** ação imediata se for barato, tarefa com prioridade, ou decisão humana quando envolve texto público, preço, dado sensível ou questão jurídica.
- **Tarefas.** Antes de adicionar uma, confira se o artefato já existe. Marque como concluída no mesmo commit da implementação, nunca antes.
- **Tabelas com nota, percentual, cobertura ou maturidade** são geradas por um agente de conformidade, ou cada linha carrega data de verificação, método e evidência. Tabela de nota escrita à mão é vetor de fantasma.
- **Pedido a subagente** exige devolver tuplas com afirmação, caminho e linha, e prefixar com "não verificado" o que não tiver âncora.
- **Adjetivos desqualificantes** (maquete, esqueleto, stub, morto, obsoleto) são veredito disfarçado de descrição: abra o artefato e conte o que ele tem antes de agir sobre a palavra.
- Para o que a IA gerou e cita como fato, a conferência contra a fonte original é tratada na regra de texto gerado que cruza com a fonte.

## Como adotar
1. Crie uma pasta de triagem com prazo de revisão.
2. Padronize o cabeçalho de proveniência e a tabela real, conceito, fantasma.
3. Monte um modelo de pedido para agentes com a exigência de evidência e um passo seu de conferência por amostra antes de usar o resultado.
4. Registre o destino de cada item (processado, arquivado, descartado como fantasma).
5. Se o material tiver dado pessoal, trate antes de guardar.
