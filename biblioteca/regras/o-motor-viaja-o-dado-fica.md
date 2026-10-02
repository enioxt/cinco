# O motor viaja, o dado pessoal fica

## A regra em uma frase
Tudo que nasce de um caso pessoal só está completo quando o método genérico foi separado do dado, registrado e provado para um segundo usuário com dados sintéticos.

## Por que existe
O padrão de risco é este: uma ferramenta nasce de um corpus pessoal, o extrator vira um script solto numa pasta temporária, e quando ele roda pela segunda vez ninguém sabe onde está. Sem a separação, o método não pode ser compartilhado (porque está misturado ao dado) nem reproduzido (porque ninguém sabe onde mora).

Exemplo: alguém monta uma ferramenta de extração a partir de suas próprias anotações. Funciona. Meses depois, uma colega quer usar, e descobre que o script depende de um caminho de pasta da primeira pessoa e de um arquivo que nunca foi versionado.

## O que muda na prática
Quatro critérios, cada um verificável:

1. Motor separado do dado. O código ou método genérico é versionado; o dado pessoal fica local. Prova: a lista de arquivos versionados contém o motor, e nenhum caminho de dado real.
2. Registro. Existe uma entrada no catálogo de capacidades, ligada a algo executável.
3. Prova de segundo usuário. Pelo menos um caso de teste sintético mostra o motor rodando para outro corpus, sem dado real.
4. Zero improviso. Nenhum script de produção vive em pasta temporária; rodou duas vezes, versiona.

Motor e dado ficam em lugares diferentes porque têm riscos diferentes. O motor se compartilha, revisa e melhora; o dado se protege.

A regra complementa a de descobrir antes de construir. Aquela olha antes de construir; esta olha depois da entrega.

## Como adotar
1. Ao fechar um trabalho pessoal que vale reaproveitar, faça quatro perguntas: o código está separado do dado? Está registrado? Roda com dado inventado? Algum script ficou fora do repositório?
2. Escreva primeiro o teste sintético: ele mostra se o motor realmente é genérico.
3. Mantenha o dado em pasta fora do repositório, com a lista de exclusão explícita.
