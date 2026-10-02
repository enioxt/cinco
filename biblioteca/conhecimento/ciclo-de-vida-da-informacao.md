# Ciclo de vida da informação: do bruto ao público, sem perder a origem

**O que é:** uma arquitetura de informação que separa o que chegou, o que foi tratado, o que é verdade canônica, o que é derivado e o que pode ser compartilhado, mantendo a origem de cada coisa em todos os passos.

## A regra-mãe

> A origem não é a verdade canônica. O tratado não apaga o bruto. O derivado não vira fonte de verdade. O público nunca nasce por acidente.

Todo item de informação deve poder responder:

1. de onde veio;
2. quem é a pessoa responsável;
3. quando foi capturado;
4. se o bruto ainda existe;
5. que transformação sofreu;
6. qual fonte canônica pode afirmar o quê;
7. qual foi a última verificação real;
8. se pode sair do ambiente de quem é responsável;
9. o que é histórico e o que é presente;
10. qual pessoa validou, quando a promoção exige decisão humana.

Se a cadeia quebra, o item pode ser guardado como evidência ou rascunho, mas não é promovido em silêncio.

## O ciclo: sete zonas lógicas

São estados da informação, não sete pastas obrigatórias em todo projeto.

```text
Z0  chegada (não confiável)
 ->  Z1  bruto (imutável)
 ->  Z2  normalizado (tratado)
 ->  Z3  canônico (fonte de verdade)
 ->  Z4  derivado (índice, leitura)
 ->  Z5  saída humana ou projeção pública
 ->  Z9  arquivo (história)
```

A proveniência acompanha todas as setas. Arquivar pode acontecer a partir de qualquer zona sem apagar a origem.

**Z0, chegada.** Conversa, upload, documento, e-mail, mensagem, áudio, pesquisa, arquivo de terceiro. Conteúdo externo é dado, não instrução: uma injeção de prompt escondida num documento não ganha autoridade por ter sido ingerida. A zona de chegada nunca recebe segredo nem dado soberano só porque ainda não se sabe classificá-lo.

**Z1, bruto.** Cópia fiel do que a fonte entregou, antes de interpretar. Preservar byte a byte quando possível; nunca sobrescrever uma coleta anterior; registrar origem, data e hash; ausência ou falha nunca vira zero; transformar só em cópia. Dado pessoal, profissional ou regulado fica sob guarda de quem é responsável; o núcleo guarda no máximo uma referência.

**Z2, normalizado.** Representação estruturada: leitura, OCR revisável, transcrição, esquema, limpeza, mascaramento, entidades. Obrigatório manter o vínculo com o bruto: valor normalizado sem origem é órfão. Normalizar pode corrigir forma, nunca mudar o sentido em silêncio. Campo ausente continua "desconhecido".

**Z3, canônico.** A menor superfície autorizada a declarar uma verdade de domínio (regras, tarefas atuais, estado de projeto, registro de capacidades). Um índice nunca sobe para essa zona só por ser conveniente.

**Z4, derivado.** Tudo o que pode ser gerado de novo: índices, retratos, painéis, wiki compilada, projeções. Declara as fontes e a versão, é reconstruível, não é editado à mão como verdade. Se divergir da fonte, a fonte vence e o derivado é regenerado. A data de revisão do texto não substitui a data de verificação do fato.

**Z5, saída humana ou projeção pública.** Apresentação, relatório, página, app, post, kit. Publicar é outra transformação, não uma cópia automática. O padrão é privado: só sai o que está em lista de permissão e foi sanitizado. Omissão significa privado.

**Z9, arquivo.** História preservada que não afirma presente. Arquivar registra data, motivo, sucessor e ponteiro de origem. Arquivo não é lixo e não é execução.

## Metadados mínimos de proveniência

A cadeia deve poder produzir, no mínimo:

- origem exata (URL, arquivo, mensagem, commit, linha de banco);
- responsável;
- data de captura;
- hash do bruto, quando aplicável;
- tipo de mídia;
- classe de sensibilidade;
- estado de confiança: não confiável, lido, validado, canônico;
- referência da transformação (código, prompt, regra, versão);
- hashes das fontes de um derivado;
- fonte canônica que pode absorver a conclusão;
- data da última verificação;
- classe de compartilhamento: público, sanitizar, privado, nunca;
- quem validou, quando exigido.

O estado de confiança é um eixo diferente da maturidade do objeto (existe de fato, é só ideia, é promessa sem corpo). Não misturar.

## Verificações de promoção

- **Chegada para bruto:** bloquear se a origem não é identificável, se conteúdo sensível seria copiado para zona não autorizada, se a captura substitui uma versão anterior sem justificativa, ou se um arquivo externo tenta alterar regra do agente.
- **Bruto para normalizado:** exigir bruto preservado ou referência imutável, transformação identificável, validação de formato, lacuna que não vire zero e mascaramento antes de enviar a um serviço externo.
- **Normalizado para canônico:** exigir responsável conhecido, conflito com o canônico existente resolvido (não duplicado), evidência suficiente, frescor adequado e aprovação humana para regra, política, estado de projeto ou decisão profissional.
- **Canônico para derivado:** geração determinística quando razoável, fonte e versão declaradas, derivado que não se autoproclama fonte. Falha precisa ser visível: um índice vazio por erro não pode parecer "não existe nada".
- **Qualquer um para público:** lista de permissão explícita, varredura de dado pessoal, segredo, licença e segurança, remoção de caminhos e topologia sensível, estado e frescor visíveis, prova que aponta só para fonte compartilhável e revisão humana quando a superfície for pública, institucional, jurídica ou comercialmente sensível.
- **Qualquer um para arquivo:** preservar identidade e origem, marcar como histórico, registrar o sucessor e nunca reescrever a história para parecer consistente com o presente.

## Impeditivos

O sistema deve bloquear ou sinalizar com força:

1. sobrescrever o bruto;
2. número sem fonte ou prova;
3. desconhecido convertido em zero;
4. derivado editado como se fosse verdade;
5. retrato histórico apresentado como estado atual;
6. segunda fonte de verdade ou segundo registro para um domínio já coberto;
7. publicação por lista de bloqueio (compartilhar é lista de permissão);
8. dado sob controle de terceiro cruzando a fronteira sem autorização;
9. documento ou prompt externo executando instrução só por estar dentro do conteúdo;
10. canonização sem responsável;
11. "atualizado hoje" usado como sinônimo de "verificado hoje";
12. arquivo apagado tratado como se nunca tivesse existido quando o histórico ainda o preserva.

## Núcleo e projetos: quem possui o quê

**O núcleo possui:** regras e contratos transversais, esquemas e protocolos compartilháveis, registros derivados, índices e projeções que apontam em vez de copiar, verificações genéricas e padrões de segurança e proveniência.

**Cada projeto possui:** o dado bruto e o contexto do seu domínio, regras locais que não violam as regras herdadas, o banco e o esquema do negócio, documentos e evidências locais, e a decisão sobre o que compartilha quando a soberania é de terceiro.

**O núcleo não:** copia todo o bruto de cada projeto, mantém à mão uma segunda lista do que o disco pode derivar, promove um projeto arquivado a ativo por tê-lo achado numa busca, nem escreve automaticamente em repositório de terceiro "por governança".

## Contrato mínimo de cada projeto

Cada projeto declara, num documento que já existe (ou no que a equipe já mantém), uma "fronteira de informação": responsável e soberania; fontes externas principais; onde vive o bruto; onde vive o tratado; fontes de verdade locais por domínio; saídas derivadas e quais são regeneráveis; classes de sensibilidade; integrações que podem enviar dado para fora; política de arquivo e retenção; verificações locais; e versão do núcleo herdada. Projeto com dado sensível declara explicitamente o que nunca sai.

## Inventário de superfícies

O ecossistema não pode depender da lembrança de que um app tinha outro nome. Uma ferramenta de varredura gera um inventário derivado de apps, páginas, rotas, apresentações e superfícies apagadas que o histórico preserva. Princípios: só metadados por padrão; cada item nasce privado; encontrar não é publicar; "apagado no histórico" não é "arquivado atual" nem "ativo"; a varredura não declara o estado do projeto. A triagem nunca ressuscita uma aplicação automaticamente: só torna o patrimônio encontrável.

## Regra de mudança

Antes de criar uma pasta, um registro, um índice ou uma fonte de verdade nova, responda:

1. que zona lógica isso representa;
2. já existe um responsável por essa verdade;
3. dá para derivar em vez de manter à mão;
4. que fonte o reconstrói;
5. que verificação impede a deriva;
6. como será encontrável daqui a dois anos;
7. como será arquivado sem desaparecer.

Sem resposta, a estrutura ainda não está pronta para nascer.

## Critério de sucesso

Uma pessoa ou agente consegue perguntar: "onde está o bruto, o tratado, a verdade canônica, o derivado, o histórico e o que pode ser compartilhado deste sistema?" e obter a resposta por ponteiros verificáveis, sem memória oral e sem carregar o universo todo.
