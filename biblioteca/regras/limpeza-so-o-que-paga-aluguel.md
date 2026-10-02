# Limpeza: só fica o que paga aluguel, e toda lista de remoção é hipótese

## A regra em uma frase
Arquivo, módulo, documento ou rotina só permanece se atende a uma necessidade atual, reduz um risco concreto ou é a única fonte de algo em uso, e nada é apagado sem evidência verificável.

## Por que existe
Um sistema que só cresce vira ruído, e para quem trabalha com IA vira também contexto desperdiçado. Mas limpar às cegas é pior. Listas de remoção produzidas por agentes e ferramentas de código morto costumam errar em proporção alta: itens com consumidor vivo que a busca por nome não achou, dependências marcadas como não usadas que na verdade são usadas, scripts apontados como mortos que a medição cuidadosa mostra em uso.

Também acontece o contrário: uma rotina sem agendamento na máquina local pode ter quem aponte para ela, como uma regra cadastrada, um plano de trabalho ou uma página pública. Estar sem agendamento local não significa estar morta.

## O que muda na prática
- Cada candidato é classificado antes de tocar: em uso, intenção, citado sem responsável, sem referência, substituído, obsoleto.
- Remoção carrega motivo checável. Sem evidência, o item vira "precisa de evidência" e fica.
- Primeiro se arquiva, que é reversível. Apagar de vez só vale para duplicata exata ou material regenerável.
- O que tem valor futuro plausível mas uso zero ganha um gatilho observável e um prazo definido por você. Sem gatilho no prazo, arquiva. "Pode ser útil" não é gatilho.
- Dependência não importada pode ser trava de segurança. Confira antes de remover.
- A limpeza vai por lote pequeno, com aprovação humana, e termina com a checagem de tipos e os testes verdes.

## Como adotar
1. Escreva os critérios antes de olhar qualquer arquivo.
2. Rode uma ferramenta de detecção por categoria e trate a saída como suspeita.
3. Para cada item, procure referências em todo o repositório, nas configurações, nos agendadores e nas páginas públicas.
4. Mova para uma pasta de arquivo, rode os testes e só então proponha apagar.
5. Acompanhe a tendência: o volume de arquivos e de tarefas abertas deve cair ao longo do tempo.
