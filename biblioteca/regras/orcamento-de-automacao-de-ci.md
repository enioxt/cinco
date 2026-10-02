# Orçamento de automação de CI: poucas ações, sem agenda frequente, falha corrigida

## A regra em uma frase
A automação hospedada tem teto de quantidade, nenhuma agenda mais frequente que uma vez por dia, nenhuma verificação duplicada, e uma falha repetida se conserta ou se desliga declarando o motivo.

## Por que existe
Automação hospedada cobra por execução. Um fluxo de saúde agendado a cada poucos minutos gera milhares de execuções por mês, e vários outros fluxos repetindo as mesmas verificações multiplicam o consumo. Acréscimos razoáveis, um a um, viram consumo contínuo que estoura o limite de gasto sem que ninguém tenha decidido isso.

Um segundo problema aparece depois: a lista de fluxos "oficiais" no documento descreve a intenção, não o estado. Fluxos desligados continuam listados, e uma verificação central pode ficar meses fora do ar enquanto o texto a anuncia como proteção ativa.

## O que muda na prática
- Há um teto de arquivos de fluxo, e nenhum fluxo novo entra sem decisão humana.
- Agenda é no máximo diária. Checagem mais frequente roda em servidor próprio.
- Fluxo disparado por push e que instala dependências tem filtro de caminho ou cancela a execução anterior.
- A mesma verificação não roda em dois fluxos.
- Fluxo com falhas seguidas por defeito próprio é consertado ou desligado na mesma sessão. Desligar exige registrar a data, o motivo e o destino. Verificação desligada sem registro é garantia que não existe.
- Mudar plano ou limite de gasto é decisão de uma pessoa. O agente só reduz o consumo.

## Como adotar
1. Liste os fluxos e some as execuções por mês.
2. Escreva as regras acima como política curta e confira-a por uma verificação automática que também compare com o estado real do provedor.
3. Mantenha uma tabela de "desligados" com motivo e destino.
4. Aplique a checagem de fluxo novo no commit, em todo repositório, para que o freio não dependa do próprio CI.
