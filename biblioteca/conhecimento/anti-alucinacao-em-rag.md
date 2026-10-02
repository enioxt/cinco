# Anti-alucinação em RAG: sete técnicas para o sistema não inventar

**O que é:** um catálogo de técnicas para reduzir resposta inventada em sistemas que respondem sobre uma base de documentos. É um catálogo de ideias, não uma garantia: nenhuma técnica elimina a alucinação sozinha, e cada uma precisa ser provada no seu próprio sistema.

> Frase honesta para uso externo: "múltiplas camadas de validação: fonte citada, recusa quando não há base suficiente e validação depois da geração."

## O problema

Um sistema que responde perguntas sobre uma base de conhecimento pode:

- inventar informação que não está nos documentos;
- citar o documento errado como fonte;
- alucinar de forma silenciosa quando a base é grande, porque ninguém percebe até agir com base na resposta.

Exemplo: o usuário pergunta "qual é o meu saldo?" e o sistema responde com um valor exato "conforme o contrato de 2023", sendo que nenhum contrato diz isso. A pessoa age com base num número falso.

## As sete técnicas

### 1. Proveniência
Toda resposta devolve a cadeia de citação: qual documento, qual trecho, com que confiança, por qual método de recuperação. A interface mostra a citação em destaque, com link para o documento. Vantagem: a pessoa clica e confere em segundos. Se o documento não menciona, ela percebe na hora.

### 2. Avaliação comportamental com casos de ouro
Teste automático que verifica se o sistema realmente diz a verdade, e não só se o código está correto. Exemplos de casos: a resposta cita fonte, não inventa dado fora da base, recusa apropriadamente quando pedem para inventar um número. Detalhes em "Avaliação comportamental de IA" e na regra de casos de ouro comportamentais.

### 3. Compressão do contexto
Em vez de passar todos os trechos encontrados ao modelo, passa só o essencial: busca, reordenação por relevância e remoção de redundância (três trechos que falam da mesma cláusula viram um). O modelo recebe um contexto claro e confunde menos. Também gasta menos.

### 4. Validação ética depois da geração
Um filtro que roda sobre a resposta já gerada, independente do prompt ter sido seguido. Procura: dado numérico sem fonte, afirmação absoluta sem ressalva ("definitivamente", "100% seguro"), promessa de ação que o sistema não pode cumprir. Cada violação tem gravidade e desconta de uma nota; violação crítica ou erro reprova a resposta, que é então corrigida antes de ir ao usuário.

### 5. Busca híbrida
Combinar busca por significado (vetores) com busca por palavra-chave exata, fundindo os rankings. A busca exata evita "esquecer" um termo importante; a semântica entende sinônimos ("quando acaba" é "vencimento"). Uma combinação simples e conhecida de rankings é a fusão por posição recíproca. Melhor recuperação, menos alucinação.

### 6. Pontuação de confiança
O sistema devolve o quão confiante está, combinando a qualidade da recuperação e a autoavaliação do modelo. A interface usa isso: confiança alta aparece normalmente, média aparece com aviso para conferir a fonte e baixa diz "o sistema não tem certeza". Cuidado: a autoavaliação de um modelo é fraca como sinal isolado, e os pesos da combinação precisam ser calibrados com dados reais.

### 7. Ranking de fonte e atualidade
Preferir documentos recentes e de fontes confiáveis. Registrar, por documento, a data que consta nele, a data de processamento, um nível de confiança da fonte (assinatura digital, metadados) e um hash de integridade. Evita confundir o contrato de 2024 com o de 2023.

## Prioridade sugerida

1. **Primeiro:** proveniência, casos de ouro e validação depois da geração.
2. **Em seguida:** pontuação de confiança, busca híbrida e compressão de contexto.
3. **Depois:** ranking de fonte e rotina semanal em que as piores respostas reais viram casos de ouro.

## Antipadrões

- "Vamos rodar o modelo e confiar que ele não alucina." A alucinação é silenciosa.
- "Os testes unitários passam, então está bom." Teste de função isolada não prova o comportamento do sistema inteiro (ver a regra de casos de ouro comportamentais).
- "Avaliação só antes do lançamento." Deve rodar toda semana em produção.
- Achar que só a proveniência basta. Ela prova qual documento foi usado, não que a interpretação está certa. Use proveniência, avaliação comportamental e validação depois da geração juntas.

## Perguntas frequentes

**Quanto custa rodar a avaliação toda semana?** Depende do tamanho do conjunto e do modelo usado como juiz; um modelo pequeno costuma bastar. Meça o custo na primeira rodada e compare com o que um defeito silencioso custaria.

**A proveniência deixa o sistema lento?** Não. É metadado: se você já devolve o trecho, a proveniência não custa tempo.

**E se a base for enorme?** Busca híbrida, compressão de contexto e pontuação de confiança ficam ainda mais importantes, e a avaliação comportamental fica mais crítica.
