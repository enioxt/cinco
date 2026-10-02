# Federação em 9 camadas: como uma mensagem viaja entre pessoas e máquinas

**O que é:** um mapa do fluxo de trabalho entre nós soberanos (cada pessoa com a sua máquina e as suas regras), mostrando o que cada camada faz e onde a decisão humana corta o caminho. É um desenho de referência, não a descrição de uma instalação específica.

## As 9 camadas, de baixo para cima

Um erro comum é tratar mensageiro, editor com IA e repositório de código como camadas diferentes. São a mesma camada: canais. O que impede o sistema de virar bagunça são as camadas abaixo e acima dos canais.

| # | Camada | O que faz |
|---|---|---|
| 9 | Crônica e prova | registra o que aconteceu, de forma legível e auditável |
| 8 | Pulso e presença | mostra o que mudou e quem está ativo, medido e não suposto |
| 7 | Orquestrador (papel) | decide dentro de cada nó; um papel por vez |
| 6 | Canais | por onde a mensagem viaja: mensageiro, editor com IA, repositório, site |
| 5 | Fila | transforma a mensagem em tarefa com responsável, estado e prova |
| 4 | Guardião de fronteira | define o que pode cruzar cada porta; na dúvida, bloqueia |
| 3 | Identidade | quem é quem entre os canais |
| 2 | Constituição | as regras da pessoa, adotadas regra a regra |
| 1 | Máquina soberana | o dado, local, sempre |

Transversal a tudo: a decisão humana. Publicar, assinar, gastar, apagar e mudar o estado de um canal externo é ato de uma pessoa, nunca automático.

## Duas lacunas que o mapa declara

- **Vínculo de identidade (camada 3).** Número de telefone e conta de repositório são dois identificadores fortes sem amarração formal. Com poucas pessoas, o vínculo é social. Com muitas, quebra. A peça que falta é uma chave própria que assine o que viaja.
- **Do mensageiro para a fila (camadas 5 e 6).** Mensagem não vira tarefa por padrão. A ponte que fecha isso deve ser limitada a um grupo, e o texto que chega é tratado como dado, nunca como ordem.

## A camada humana: pessoa, capacidade e necessidade

A unidade de conexão é uma relação, com contexto e prova, entre uma pessoa, uma capacidade e uma necessidade. Quatro conceitos que não se misturam:

| Conceito | Significa | Exemplo |
|---|---|---|
| Atribuição | responsabilidade atual num contexto | "quem confirma o pedido neste teste" |
| Atributo | característica observável, publicável só com consentimento | "traduz assunto técnico para leigo" |
| Capacidade | algo que a pessoa consegue fazer e que aponta para prova | "orçamento", "revisão de evidência" |
| Necessidade | algo que precisa resolver ou aprender agora | "organizar pedidos que chegam por mensagem" |

Cada coisa tem um registro único, para não nascer cópia paralela: a capacidade é registrada uma vez e perfis apontam para ela; a ligação pessoa-capacidade é uma relação com evidência, não uma nova ficha; a vitrine pública mostra o que foi escolhido, não é a fonte da verdade. Campo desconhecido fica como "pendente". Inferência do sistema nunca vira atributo público por silêncio.

## Sugestão explicada, nunca ranking de gente

```text
necessidade expressa
   -> capacidades candidatas
   -> pessoas que demonstram essas capacidades
   -> prova, contexto, disponibilidade e limites de compartilhamento
   -> sugestão explicada ("por que apareceu" e "o que ainda não sabemos")
   -> as pessoas decidem se querem conversar
   -> acordo, entrega e nova evidência da capacidade
```

O sistema não calcula quem é melhor e não produz nota geral de pessoa. Só ordena por compatibilidade quando a régua é explícita e reproduzível, mostrando os critérios. Saber fazer algo não significa querer oferecer aquilo agora.

## A linha do que é público

Regra-mãe: uma fonte de status, duas peles, uma interna e uma pública. Vai para a vitrine o que foi escolhido: o que funciona, o que falta, as regras e as ferramentas com testes, gerados a partir de um manifesto, nunca digitados à mão. Nunca vai: telemetria interna, credencial, dado de terceiro, detalhe de infraestrutura, identidade de convidado antes do aceite dele.

## Sem chefe central

Cada nó é soberano. Entre nós ninguém manda: a coordenação é uma tarefa na fila compartilhada, aceita ou recusada por quem é responsável. Um orquestrador por nó, nunca um central.
