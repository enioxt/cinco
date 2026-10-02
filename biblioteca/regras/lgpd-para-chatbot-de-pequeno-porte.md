# LGPD para chatbot de pequeno porte

## A regra em uma frase
Todo chatbot que trate dados de pessoas no Brasil declara papéis, base legal por fluxo, prazo de retenção, canal para os direitos do titular e plano de incidente antes de entrar no ar.

## Por que existe
Um prestador pequeno que opera chatbots para clientes costuma cair no regime simplificado que a autoridade de proteção de dados reserva a agentes de tratamento de pequeno porte. O regime simplifica a documentação, mas não dispensa o raciocínio: quem controla os dados, quem apenas opera, em que base cada mensagem é guardada e por quanto tempo. Esta regra é um roteiro prático, não parecer jurídico: valide com advogado antes de levar a um cliente de maior porte.

## O que muda na prática
- Cada bot declara em configuração o controlador (o cliente titular dos dados), o operador (o prestador) e o encarregado.
- A base legal vale por fluxo, não por conversa: atendimento iniciado pelo cliente (legítimo interesse), leitura humana das mensagens (consentimento, com aviso antes da primeira), retenção para garantia e suporte (execução de contrato), marketing posterior (consentimento separado, nunca pré-marcado). Uma mesma conversa pode ter mais de uma base, e cada mensagem carrega a sua.
- A retenção é em camadas: prazo curto para mensagem com dado pessoal bruto, prazo maior para a versão redigida, prazo ainda maior para registros de auditoria, e dado anonimizado sem prazo. Defina os prazos com seu advogado.
- Os direitos do titular (confirmação, acesso, correção, exclusão, portabilidade, revogação) têm comando no próprio canal e prazo de resposta definido.
- Incidente exige comunicação à autoridade, aos titulares e ao controlador. Confira o prazo vigente na norma, que muda.
- Mapa de terceiros (canal de mensagem, provedor do modelo, banco de dados) fica visível ao cliente final.
- Nenhuma decisão automatizada com efeito jurídico acontece sem revisão humana registrada.
- Dados sensíveis, crianças e transferência internacional ficam declarados como fora do escopo simplificado.

## Como adotar
1. Escreva uma tabela com fluxo, base legal, retenção e onde a base é gravada.
2. Coloque uma coluna de retenção com data de expiração e uma rotina diária que apague o vencido.
3. Faça comandos de privacidade simples no canal de atendimento, com verificação de identidade.
4. Marque uma auditoria periódica por amostragem: retenção vencida não apagada, dado pessoal não redigido, acesso administrativo sem escopo.
5. Revise com um advogado antes de ampliar para clientes maiores.
