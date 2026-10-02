# Rede de nós: o mapa de camadas e o sobrenome de camada

**O que é:** um método para nomear e descrever, sem ambiguidade, as camadas de uma rede de agentes, serviços e pessoas: quem existe, como se relaciona e por onde a informação circula. Este texto descreve uma prática de nomeação, não um produto que o leitor possa conferir aqui.

A metáfora vem do micélio biológico, uma rede distribuída de conexão e sinalização. Ela orienta o desenho e não autoriza nenhuma afirmação científica além da evidência.

## Regra de nomeação: sobrenome de camada

Quando um mesmo nome passa a designar coisas diferentes, a confusão custa caro. A regra é manter o nome e acrescentar o sobrenome da camada sempre que houver risco de ambiguidade.

| Camada | Pergunta que responde |
|---|---|
| Grafo | quem existe e como se relaciona? |
| Registro | quais nós conhecidos fazem parte da rede? |
| Barramento | que evento circulou dentro do ambiente local? |
| Fluxo externo | como sinais selecionados saem do ambiente local, já sanitizados? |
| Protocolo | como regras e contratos se propagam entre os nós? |
| Projeção | o que pode ser mostrado, de forma sanitizada, para humanos? |

Não fundir as funções: o barramento de eventos não é banco de dados de negócio, a fila de trabalho não é o barramento, e a projeção é leitura derivada, nunca fonte da verdade.

## Método: real, parcial, conceito

- **Real:** há implementação e prova que o leitor pode abrir.
- **Parcial:** há implementação útil com uma lacuna declarada.
- **Conceito:** desenho ou nome reservado; não se anuncia como funcionando.

"Parte real" não promove a experiência inteira. Uma camada só muda de estado com prova citada, e o estado publicado carrega a data da última verificação.

Nesta biblioteca não se afirma o estado de nenhuma camada: qualquer estado atribuído a uma implementação específica é **declarado pelo autor, não verificável aqui**. Quem adotar o método deve classificar as suas próprias camadas, com as suas provas.

## Um nó precisa de identidade completa

Um nó só entra plenamente na rede com sete campos: nome canônico, objetivo (o que "feito" significa), regras (o que pode e o que nunca pode), fronteiras de dados, relações, ambiente de execução e estado com prova. Um nó real sem esses campos entra como "provisório": visível, ainda não integrado.

Para pessoas, a rede guarda só o necessário para cooperação verificável: identificador, relações consentidas, fontes de prova e limites de visibilidade. Temperamento, biografia e inferência de IA não viram atributo público.

## Projeção pública: o que sai

```text
fonte de verdade -> grafo e registro -> classificação de compartilhamento
   -> projeção sanitizada -> superfície pública -> prova, quando houver
```

O princípio é descartar por padrão: o que não está numa lista de permissão não chega à superfície pública. O rótulo exibido vem de um conjunto fixo, nunca é copiado do conteúdo do evento, e passa por varredura de dado pessoal antes de sair. Repositório privado vira, no máximo, um conceito anônimo ("desenvolvimento ativo"); mensagem vira o tipo do evento, sem conteúdo.

## Regra de mudança

Toda mudança declara que camada toca. Antes de mudar o estado de uma camada: medir, registrar a prova, atualizar a descrição e só depois atualizar o que é público. Nunca criar um segundo registro manual concorrente e nunca escrever uma narrativa pública que transforme conceito ou parcial em real.
