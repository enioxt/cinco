# Regras e código viajam por caminhos diferentes

## A regra em uma frase
Regra de governança se distribui copiando arquivo a partir de uma fonte canônica; código compartilhado se distribui como pacote versionado, e usar um mecanismo só para os dois produz os problemas de ambos.

## Por que existe
Exemplo: numa equipe com vários repositórios, o mesmo módulo utilitário existia copiado em três lugares, e as regras propagadas não tinham nenhum registro de versão. Cada problema estava tratado com a ferramenta do outro: código como se fosse regra (copiado, divergindo) e regra como se fosse informação solta (sem registro, sem como saber se a cópia estava em dia).

Há um motivo para a separação. Regra é texto, lido no lugar por pessoa e por agente. Se virasse pacote, toda edição exigiria publicar, subir versão e instalar em vários repositórios, e a fricção mataria a adoção. Código é executável, tem tipos e testes. Copiado entre repositórios, o drift é garantido.

Há também o caso inverso: duas cópias idênticas de um módulo podem ser duplicação intencional, quando um dos pacotes é publicado de forma independente e embute a cópia de propósito. E uma consolidação deve parar quando aquilo que ela supostamente liga não existe: unificar versionaria uma mentira.

## O que muda na prática
- Regras têm um canônico e são propagadas por cópia, com um registro do conteúdo propagado e da data.
- Uma checagem compara o registro com o canônico e falha se houver divergência, pronta para rodar antes do commit.
- Repositórios que podem virar públicos não recebem ponteiro para caminho privado. Recebem um arquivo autocontido que declara a origem das regras.
- Código compartilhado vira um pacote consumido por versão dentro do mesmo espaço de trabalho e por versão publicada fora dele.
- Duplicação intencional se declara nos dois arquivos e ganha um teste que falha se as cópias divergirem.

## Como adotar
1. Liste o que você copia entre repositórios e classifique cada item: texto de regra ou código executável.
2. Para o texto, escolha um repositório canônico, gere um registro com o resumo do conteúdo e adicione uma checagem de divergência ao seu fluxo de commit.
3. Para o código, extraia para um pacote e consuma por versão. Se precisar manter cópia, escreva o motivo e adicione um teste de igualdade.
4. Antes de consolidar qualquer coisa, confirme que o que ela diz existir de fato existe.
5. Em repositório que pode ficar público, procure caminhos privados e contexto pessoal antes da primeira publicação.
