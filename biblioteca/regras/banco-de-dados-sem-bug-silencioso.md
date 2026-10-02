# Banco de dados: escrever com o formato real, provar com a visão do consumidor

## A regra em uma frase
Toda escrita em banco usa tipos derivados do esquema real e termina com uma leitura feita com a mesma credencial que o usuário final usaria, porque inserir sem erro não prova que o dado aparece.

## Por que existe
Exemplo: um script de carga de produtos usa o nome de coluna `is_active`, e a coluna real se chama `active`. A API de acesso ao banco ignora campos desconhecidos em silêncio. O script diz "inseridos com sucesso", e todas as linhas ficam com o valor padrão de inativo. Por horas a vitrine mostra "nenhum produto encontrado" com linhas no banco. Há ainda outra camada: a política de segurança por linha depende de uma variável de sessão que a vitrine nunca define, então até as linhas ativas ficam invisíveis.

Num segundo exemplo, imagens de um banco de fotos são escolhidas só pela palavra-chave, e a vitrine exibe um carro inteiro como se fosse um pneu.

## O que muda na prática
- Escritas usam tipos gerados do esquema ou um validador que espelha o banco. Objeto solto com campo digitado à mão é proibido.
- Toda carga termina com uma leitura usando a credencial anônima, comparando a contagem esperada. Fazer essa conferência com a credencial de administrador mascara justamente os erros de permissão.
- Tabela lida pela vitrine declara, na mesma migração, a política para usuários anônimos. Política que depende de variável de sessão não definida deixa tudo invisível.
- Imagem de banco de fotos não entra sem alguém olhar. A ordem de preferência é foto real, campo vazio com um marcador, imagem gerada e conferida.
- Correções vão para o modelo comum, não para a cópia de um cliente. Correção feita em uma instância só vira dívida multiplicada pelo número de instâncias.
- Antes de uma atualização em massa por valor padrão, meça a distribuição real dos dados. Exemplo: um preenchimento com um único valor rotularia errado as conversas de um canal pessoal que estavam misturadas às de clientes.

## Como adotar
1. Gere os tipos do banco e importe-os nos scripts.
2. Escreva uma função de conferência que usa a credencial do consumidor e faz o script falhar se a contagem não bater.
3. Revise as políticas de acesso das tabelas públicas.
4. Antes de qualquer preenchimento retroativo, rode uma consulta agrupada.
