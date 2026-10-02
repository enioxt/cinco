# Prove a existência com carimbo de tempo e a custódia com cadeia de resumos

## A regra em uma frase
Para provar que uma regra ou um documento existia numa data sem ter sido alterado, publique o resumo criptográfico dele em um registro de tempo público, e para provar o caminho de um artefato por um fluxo, encadeie os registros de modo que qualquer adulteração quebre a cadeia.

## Por que existe
Uma assinatura de commit prova autoria, mas não prova data, porque o relógio pode ser ajustado. Um carimbo de tempo ancorado numa rede pública prova que o resumo existia antes de um bloco. Só o resumo entra na rede, sem conteúdo nem dado pessoal.

O limite é importante. O carimbo prova existência e integridade. Não prova que as regras foram seguidas, nem que quem as escreveu agiu de boa-fé. Conformidade exige outra camada de atestação por decisão.

Na cadeia de custódia, cada registro guarda o resumo do conteúdo, o resumo do anterior e um número de sequência. Alterar, apagar ou reordenar um registro quebra a ligação, e a verificação aponta o primeiro ponto quebrado. O registro guarda só resumos e metadados, nunca o conteúdo bruto.

## O que muda na prática
- A ordem a confiar: carimbo para existência, cadeia para custódia, atestação por decisão para conformidade.
- O registro de tempo precisa do momento do registro armazenado junto. Sem ele, a verificação recalcula outro resumo e acusa todas as cadeias como quebradas. Isso aparece num teste de ida e volta com o banco.
- A verificação local de arquivos em disco fica no aplicativo que os possui, nunca no núcleo comum.
- Cuidado com a alegação sem implementação: dizer "cadeia imutável" sem que o mecanismo (gatilho de banco, por exemplo) exista de fato é afirmação sem prova.
- Mantenha as implementações em duas linguagens equivalentes, com os mesmos vetores de teste.

## Como adotar
1. Calcule o resumo dos seus documentos fundadores a cada mudança.
2. Submeta a um serviço público de carimbo e guarde a prova.
3. Para fluxos regulados, encadeie os registros com o resumo anterior.
4. Verifique de ponta a ponta contra o banco real.
