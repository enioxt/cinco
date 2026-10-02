# Cobertura de proteção se mede pelo que roda, não pelo que está configurado

## A regra em uma frase
Um repositório só está protegido por uma verificação se o git de fato a executa no commit, e isso se prova pelo que roda, nunca pela leitura de uma configuração.

## Por que existe
Exemplo: um registro diz que cinco repositórios estão cobertos por um conjunto de verificações automáticas. Todos têm os arquivos no lugar, mas só um os executa. Nos outros, o ponto de entrada do commit aponta para outro lugar, as verificações estão mortas há dias, e cada commit termina com "pronto para commitar".

O mesmo defeito aparece em variações. Um instalador sobrescreve o script de commit que a pessoa já tinha escrito. Dois instaladores disputam o mesmo ponto e o último vence calado, de modo que verificações de dados pessoais deixam de rodar sem aviso. Um instalador executado do diretório errado apaga as verificações de outro repositório. Um script de commit chama a verificação de privacidade, vê o achado impresso e deixa o commit passar mesmo assim. E uma cópia congelada na instalação nunca é atualizada.

Em todos os casos, a leitura da configuração diz "coberto" e a execução diz o contrário.

## O que muda na prática
- Uma ferramenta resolve o caminho real (configuração do git, links, encadeadores) e diz quais verificações executam. Mecanismo que ela não reconhece conta como não coberto.
- Existe um conjunto mínimo de verificações que vale para todos os repositórios. Acrescentar um nome a ele liga a verificação em todos, sem editar cada um.
- O repositório pode acrescentar verificações, nunca subtrair.
- Verificação alheia é preservada e encadeada. Todos os elos rodam, e qualquer falha barra.
- Uma verificação nova entra como aviso e só vira bloqueio depois de calibrada.
- A cobertura é medida em dois ambientes: onde o repositório principal existe e onde só há a cópia local.
- Chamar a verificação não é obedecer a ela. O script de commit precisa propagar o código de saída.

## Como adotar
1. Escreva uma ferramenta que lista, por repositório, o que o git executa.
2. Prove com um commit de teste cujo conteúdo a verificação deveria barrar.
3. Faça o instalador exigir o diretório-alvo e preservar o script de commit existente.
4. Atualize as cópias por comparação de conteúdo contra o histórico do repositório principal, não por data.
