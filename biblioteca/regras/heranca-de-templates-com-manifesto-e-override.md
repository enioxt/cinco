# Herança de templates com manifesto e override declarado

## A regra em uma frase
Todo template de domínio declara em um manifesto o que herda do núcleo universal, o que sobrescreve e por quê, e só é entregue quando cumpre uma lista fixa de campos e atinge uma nota mínima.

## Por que existe
Quando cada template inventa o próprio formato, a herança do núcleo vira letra morta: ninguém sabe o que o template de advocacia, o de saúde e o de contabilidade têm em comum, nem se o mais novo respeita o que o mais antigo respeitava. A solução é um protocolo pequeno e verificável por máquina.

## O que muda na prática
- O manifesto abre com campos obrigatórios: nome (igual ao da pasta), setor, versão, status (ativo, obsoleto ou rascunho) e a que núcleo pertence. Opcionais: conselho profissional, leis do setor, regras herdadas, sobrescritas e específicas.
- Quem muda o comportamento de uma regra do núcleo (para endurecer ou para se adaptar a uma lei setorial) escreve isso num arquivo de sobrescritas, declarativo, com justificativa e referência à norma. Cada item do manifesto precisa ter entrada correspondente nesse arquivo.
- Regras de dano irreversível (publicar sem aprovação, expor segredo, apagar histórico) não aceitam sobrescrita em nenhum template.
- Todo template cumpre uma lista fixa de campos canônicos: objetivo, público, casos de uso, fontes esperadas, entregáveis, regras herdadas, regras específicas, integrações, riscos, validação humana, nota de qualidade, anti-alucinação, limites da IA, exemplos, status e versão.
- A nota segue uma escala curta com níveis de entrega. Nos níveis mais baixos não se entrega. No nível intermediário (herança declarada, casos de uso, um teste de fumaça) entrega-se internamente. No nível alto (todos os campos, vários testes) pode-se mostrar a terceiros. No topo, só depois de uso real prolongado por um cliente.

## Como adotar
1. Escolha o conjunto de regras universais da sua equipe e dê a cada uma um identificador estável.
2. Crie o manifesto-modelo com os campos acima e peça que todo template novo parta dele.
3. Escreva um verificador simples que leia o cabeçalho, confira nome, versão e datas e avise quando faltar seção.
4. Faça o verificador barrar template ativo abaixo da nota mínima que você definir.
5. Trate o primeiro template que passa da nota alta como exemplo vivo e aponte para ele, em vez de copiar texto para a documentação.
