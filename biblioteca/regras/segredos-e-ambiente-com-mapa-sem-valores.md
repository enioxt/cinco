# Segredos e ambiente: valores ficam locais, o mapa vai para o git

## A regra em uma frase
Arquivo com valores reais nunca entra em repositório, e o que viaja é um inventário de nomes, responsáveis e integrações, sem nenhum valor.

## Por que existe
Exemplo: numa equipe com muitos projetos, os arquivos de ambiente se espalham e o mesmo nome de chave (a do provedor de IA, a do banco) tem valores diferentes em cada projeto. Juntar tudo num arquivo único e plano corromperia credenciais.

Outros episódios do mesmo domínio: um arquivo de ambiente tinha a mesma chave duas vezes, a boa no início e uma morta mais abaixo. O carregador usa a última, todo consumidor recebeu erro de autorização, e quem abria o arquivo lia a primeira e concluía que estava certo. E um serviço desativado de propósito continuou aparecendo em várias fontes vivas, que faziam o monitor acusar "offline" para um endereço que não existia mais.

## O que muda na prática
- Arquivos com valores reais ficam fora do git. O arquivo de ignorados não basta, porque a opção de forçar a inclusão o contorna, então vale também uma verificação por nome de arquivo.
- Existe um arquivo consolidado, separado por projeto, gerado por ferramenta. Quem edita o consolidado à mão cria divergência silenciosa. Edita-se a fonte e regera-se.
- Permissão restrita ao próprio usuário em tudo que tem valor. Transferência entre máquinas só cifrada, com a senha por outro canal.
- Configuração de servidores e integrações nunca carrega segredo literal, só referência a variável.
- Duplicata da mesma chave no mesmo arquivo é detectada como erro.
- Um agendador que roda dentro de um repositório descobre a raiz pelo git, não por variável de ambiente, que difere entre máquinas e envelhece.
- Desativar um endereço segue o roteiro de troca de segredo: varrer todo consumidor do endereço antigo e testar o novo antes de declarar concluído.

## Como adotar
1. Gere o inventário (nome, projeto, integração) com uma ferramenta, sem valores.
2. Bloqueie no commit os nomes de arquivo de ambiente, exceto exemplos e versões cifradas.
3. Verifique duplicatas de chave e valores vazios que sobrescrevem valores reais.
4. Ao desativar um domínio, rode uma busca por ele em todos os repositórios e documentos operacionais.
