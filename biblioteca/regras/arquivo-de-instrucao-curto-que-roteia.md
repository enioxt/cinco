# Arquivo de instrução é índice: curto, com ponteiros, e a memória vem antes do limite

## A regra em uma frase
Os arquivos que o agente lê sempre devem ser curtos e rotear para arquivos temáticos carregados sob demanda, e nenhum limite de tamanho entra em vigor antes de resolver duplicação e substituição na memória.

## Por que existe
Modelos de linguagem seguem bem uma quantidade limitada de instruções antes de a aderência degradar (heurística de mercado, não dado verificado aqui), e o próprio sistema já consome parte desse orçamento. Em arquivos longos, regras no meio são ignoradas em silêncio, e adicionar uma regra pode fazer o modelo seguir menos das outras. Exemplo: numa equipe, o maior problema não são as linhas dos arquivos principais, e sim a memória, com centenas de arquivos pequenos sem substituição, sem decaimento e sem deduplicação. Um limite de linhas sem isso é falsa segurança.

## O que muda na prática
- Estrutura: arquivo principal curto, detalhe em arquivos temáticos, evidência em documentos profundos que se referenciam e nunca se copiam.
- Arquivos de comando longos são condensados por revisão humana, não por corte automático, porque cortar a lógica de fases às cegas faz perder passos. O aviso de tamanho não bloqueia.
- Memória: um fato por arquivo, checar parentes e a chave da afirmação antes de escrever, atualizar ou substituir em vez de criar mais um arquivo. Entradas frias vão para um arquivo morto.
- Metadados mínimos, só dois: data da última atualização e status (atual, revisar, pesquisar, histórico). Uma varredura periódica muda para "revisar" o que passou do prazo que você definir, senão o campo apodrece.
- Regra de estilo vai para um verificador de estilo; comportamento determinístico vai para um gatilho automático.

## Como adotar
1. Meça seus arquivos de instrução e a memória, antes de definir qualquer teto.
2. Resolva primeiro a duplicação na escrita da memória.
3. Mova detalhe para arquivos temáticos com importação sob demanda.
4. Comece com relatório, depois aviso, e só então decida se bloqueia. Escolha um teto que caiba no seu ritmo.
5. Alinhe os limites declarados em documentos diferentes antes de aplicar.
