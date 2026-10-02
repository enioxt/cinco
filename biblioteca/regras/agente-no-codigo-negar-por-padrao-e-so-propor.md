# Assistente que mexe em código: negar por padrão, propor em vez de gravar

## A regra em uma frase
Um assistente com poder sobre código ou dados age só dentro de uma lista explícita de capacidades permitidas, tudo o mais é negado, e o que ele escreve chega como proposta (ramo, diferença, rascunho de revisão) que um humano aprova em canal autenticado.

## Por que existe
Exemplo: uma equipe pensa em ampliar o robô de atendimento de uma loja com camadas de permissão até que ele administre o próprio sistema. Uma revisão adversarial derruba o plano com seis falhas: o aplicativo de mensagens é um canal fraco para autorizar algo (troca de chip, sessão roubada, injeção de instrução); papéis em camadas são grossos demais; aprovar por mensagem não basta; alteração direta do robô no código quebra a revisão; permissão sozinha não protege; e misturar o robô do cliente com o de administração é a pior combinação, porque as superfícies têm risco e público diferentes.

## O que muda na prática
- Dois assistentes distintos: o do cliente, com privilégio mínimo e sem escrita em código, e o de desenvolvimento, em ambiente isolado.
- O canal de mensagens coleta o pedido, mas não autoriza. Revisar diferenças, gravar e implantar acontecem em painel web com sessão curta e segundo fator.
- Política por capacidade, versionada: usuário, ferramenta, recurso e ação. Quem não está na lista não executa. Comandos de shell são modelos tipados, sem montar texto livre.
- Toda chamada é registrada antes de rodar, não depois.
- Escrita é só em ramo temporário com rascunho de revisão; a incorporação ao ramo principal é humana.
- Sempre com aprovação humana: alteração em ramo protegido, envio ao repositório remoto, migração em produção, implantação, mudança de regra de governança, nova dependência, dado pessoal e comunicação externa.
- Conteúdo lido (arquivo, mensagem) nunca vira instrução de sistema.

## Como adotar
1. Escreva a matriz de capacidades antes de qualquer código e comece vazia.
2. Separe, em contas e ambientes diferentes, o assistente do cliente e o de desenvolvimento.
3. Faça o executor (que não é o modelo) conferir a lista, e deixe o modelo só propor.
4. Adie a abertura para ferramentas externas até a política estar madura.
5. Faça o modelo de ameaças primeiro e valide o atendimento ao cliente antes de investir no assistente de desenvolvimento.
