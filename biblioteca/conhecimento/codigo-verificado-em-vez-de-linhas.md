# Código verificado em vez de linhas de código

**O que é:** uma explicação de por que contar linhas de código deixou de medir valor na era da IA, e uma métrica melhor: a parte do código que está verificada.

## Linhas de código: o que foram

LOC (do inglês, linhas de código) é a contagem física de linhas em arquivos-fonte. Serviu historicamente como aproximação para estimar projetos (modelos como o COCOMO partem de milhares de linhas), medir produtividade e densidade de defeitos (defeitos por mil linhas).

Limites que já existiam antes da IA:

- **paradoxo da verbosidade:** beneficia quem escreve código ruim e longo;
- **dependência de linguagem:** uma mesma lógica ocupa mais linhas numa linguagem do que em outra;
- **desincentivo a refatorar e a reaproveitar:** apagar código melhora o sistema e piora o número.

## O que a IA mudou

Com modelos de linguagem gerando milhares de linhas em segundos, escrever código passou a custar quase nada. O gargalo passou a ser ler, validar, depurar e governar. Código não verificado se acumula como inchaço e dívida técnica escondida.

A métrica que ainda faz sentido é o **código verificado**: a parte do código que

1. passa em linters e verificações estáticas rigorosas, sem erros;
2. tem testes automatizados que exercitam a lógica na integração contínua;
3. está ligada a um caso de uso real e ativo (não é código morto);
4. é protegida por políticas de segurança (controle de acesso, detecção de segredos).

## Tipos de ativo e como validar

| Categoria | O que é | Alavancagem | Como se valida |
|---|---|---|---|
| Código escrito | lógica manuscrita por pessoas | alta (define regras) | revisão por pares, histórico |
| Código gerado | texto padrão gerado por IA | baixa (revisão cara) | integração contínua, linters, tipos |
| Código útil | lógica central (análise, algoritmos) | média | testes unitários |
| Prompts e políticas | regras e guias para IA | altíssima (governa o fluxo) | execução de tarefas, avaliações |
| Ferramentas e agentes | extensões e laços autônomos | altíssima (capacidade de agir) | testes de integração e de ponta a ponta |
| Capacidades reutilizáveis | módulos comuns importados por vários projetos | máxima (reuso sem duplicação) | verificações automáticas antes de integrar o código |

## Para quem isso serve

Para quem precisa explicar, a clientes ou a uma equipe, por que "quantas linhas" não responde "quanto vale". O que vale é o que está provado, em uso e protegido, e o que se reaproveita sem duplicar.
