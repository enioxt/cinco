# Nada nasce sem viabilidade jurídica declarada

## A regra em uma frase
Antes do primeiro arquivo de qualquer construção nova, faz-se uma pesquisa jurídica que tenta derrubar a ideia, e o resultado é registrado em um de quatro estados que decidem se o trabalho pode começar.

## Por que existe
Exemplo: um plano que depende dos termos de um fornecedor só cai porque alguém leu esses termos. Se ninguém tivesse lido, a falha nasceria no código, com teste verde, e só apareceria quando o fornecedor agisse. Daí a utilidade de ter sempre uma camada de segurança que pesquise a viabilidade jurídica de toda ideia antes de ela virar obra.

## O que muda na prática
A construção nova carrega uma linha de viabilidade jurídica ao lado do gatilho, do critério de aceite e da justificativa de por que a alternativa mais simples não serve. Os estados são quatro:

- Liberado para experimentar: segue.
- Condicional: segue só se as condições estiverem escritas na própria declaração.
- Esperar advogado: fica barrado até existir parecer.
- Bloqueado: fica barrado.

A pesquisa é adversarial, isto é, procura o que derruba. Cobre os termos do fornecedor, regras profissionais da categoria (ordens e conselhos), proteção de dados, defesa do consumidor e tributação.

Um limite honesto: um controle automático confere que o estado foi escrito, não que a pesquisa foi bem feita. Isso continua sendo do humano. E ele só vê o que nasce em pastas de produto; ideia que nasce em script solto depende do reflexo de quem trabalha.

## Como adotar
1. Crie um modelo de "declaração de nascimento" curto e exija-o no primeiro commit de qualquer produto, pacote ou integração.
2. Inclua o campo de viabilidade com os quatro estados e o campo "condições".
3. Na pesquisa, leia os termos de uso de cada fornecedor do qual a ideia depende e procure a cláusula que a proíbe antes de procurar a que a permite.
4. Registre a data e as fontes consultadas.
5. Julgue apenas o que nasce agora. Projeto antigo não precisa ser cobrado retroativamente.
