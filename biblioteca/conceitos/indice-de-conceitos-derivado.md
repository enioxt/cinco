# Índice de conceitos: achar a verdade sem criar uma segunda

**O que é:** um contrato para construir um índice de busca que ajuda a achar conceitos pelo nome antigo, apelido ou tradução, sem nunca se tornar fonte de verdade.

> A fonte de verdade diz o que é; o índice ajuda a encontrá-la.

## O problema

Num projeto que dura anos, os nomes mudam. Busca textual simples exige saber o nome certo e pode colocar um documento histórico ao lado de algo que funciona hoje sem explicar a diferença. O índice resolve descoberta, não verdade:

`nome ou apelido -> conceito -> fonte de verdade -> capacidade -> prova`

## Regras

1. O índice é derivado: pode ser apagado e gerado de novo, e tem um leitor definido.
2. Nenhum campo derivado vence a fonte que ele aponta.
3. Conceito sem fonte explícita fica como histórico ou não resolvido; nunca ganha estado "real" só por ter sido indexado.
4. Todo resultado público informa estado e frescor.
5. Conteúdo privado ou sensível não entra na projeção pública só porque o indexador o encontrou.
6. Não criar um segundo registro de capacidades.

## Registro mínimo de cada conceito

- nome canônico e apelidos (um apelido nunca cria identidade nova);
- fonte de verdade a abrir;
- estado, que pode ser uma lista quando o conceito tem camadas (real, parcial, conceito, histórico);
- data da última verificação e data da última revisão do texto, que são coisas diferentes: revisar o texto não verifica o fato;
- capacidades relacionadas, por ponteiro e nunca por cópia;
- fontes históricas, sempre marcadas como histórico;
- classe de compartilhamento;
- provas públicas que a pessoa pode abrir.

## Classes de compartilhamento

| Classe | Pode sair para o público? |
|---|---|
| pública | sim |
| pública após sanitização | sim, depois de remover dado pessoal, segredo e dado de terceiros |
| comunidade | só em superfície autenticada e autorizada |
| privada | não |
| sensível | não; no máximo a existência genérica, quando autorizado |

## Fluxo desejado

```text
fontes de verdade + registro de capacidades
   -> extração determinística
   -> validação de referências e estado
   -> classificação de compartilhamento
   -> índice local completo
   -> sanitização por lista de permissão
   -> índice público estático
```

Nunca: acervo privado publicado automaticamente.

## Ordem dos resultados

Do mais para o menos relevante: correspondência de nome ou apelido, fonte vigente, capacidade com prova recente, documentação atual ao redor, histórico. O resultado mostra nome atual, apelidos, estado, última verificação, fonte e uma ação para abrir a prova. Um documento antigo nunca aparece com o mesmo peso visual da fonte atual.

## Critérios de aceite

- o índice é gerado, nunca editado à mão;
- duas execuções com as mesmas fontes produzem saída idêntica;
- um apelido resolve para o conceito certo sem criar nó novo;
- histórico não aparece como funcionalidade atual sem estado explícito;
- as duas datas (verificação e revisão) ficam distintas;
- item privado ou sensível nunca entra na saída pública.

O primeiro teste de valor não é indexar tudo. É uma pessoa buscar um termo e chegar à verdade atual, com histórico e prova separados.
