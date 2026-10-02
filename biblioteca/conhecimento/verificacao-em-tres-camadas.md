# Verificação em três camadas: definição, verificação e detecção

**O que é:** um padrão simples para validar um registro (por exemplo, a lista de agentes de um sistema) sem reler tudo a cada checagem e sem confundir o alarme com o fato.

## O problema

Validar um registro exige abrir a lista e conferir se cada item existe. Isso é lento. Pior: quando um detector de deriva roda sozinho, ele pode dar falso positivo, e sem uma verdade já confirmada guardada, cada alarme vira discussão.

## A solução

Três camadas, cada uma com um papel único:

| Camada | O que guarda | Para que serve | Quando atualiza |
|---|---|---|---|
| Definição | o que DEVERIA existir | fonte da declaração | quando um item muda |
| Verificação | o que FOI CONFIRMADO que existe, com data e hash | verdade já provada, de leitura rápida | sob demanda, com validade definida |
| Detecção | alertas de deriva | avisa; pode ter falso positivo | em rotina agendada |

A camada de verificação é um arquivo guardado, com a data da última validação, quem validou e, por item: se existe, quando foi verificado e um hash da prova. No fim, estatísticas: total, verificados, fantasmas (declarados mas inexistentes) e mortos.

## Modos do validador

- **conferir:** só checa se o arquivo de verificação está dentro da validade; sai com sucesso ou falha;
- **executar:** revalida tudo e grava o arquivo;
- **simular:** mostra o que faria, sem gravar.

## Quando atualizar

Não atualizar a cada execução. Só quando o registro de definição mudou, quando alguém pediu validação explícita, ou quando a verificação saiu da validade.

## Por que funciona

O detector pode errar, mas agora há uma verdade intermediária para comparar: se o alarme diz que algo sumiu e a verificação recente diz que existe, a discussão tem um ponto de partida. E a pergunta rotineira ("isso existe?") deixa de custar uma leitura completa.

## Como adotar

Defina uma validade para a camada de verificação que caiba no ritmo de mudança do seu registro (a mesma lógica serve para lista de serviços, de documentos ou de responsáveis). Guarde a data, quem validou e a prova por item, e só revalide quando a definição mudar, quando alguém pedir ou quando a validade vencer.
