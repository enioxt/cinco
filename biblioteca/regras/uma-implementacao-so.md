# Uma implementação só: compartilhe por pacote, não por cópia

## A regra em uma frase
Capacidade compartilhada entre repositórios viaja como pacote versionado, e duas implementações da mesma operação protegida valem pela mais fraca, então apague uma e delegue à que tem a trava.

## Por que existe
Exemplo: um serviço é extraído para um repositório independente e três capacidades são copiadas para uma pasta nova. Poucos dias depois, um dos arquivos já tem tamanho diferente na cópia. Ninguém decidiu divergir; divergiu porque nada obriga a sincronizar uma cópia. Outro arquivo copiado já não corresponde a nenhum arquivo localizável na fonte.

Exemplo: um script de sincronização reimplementa em poucas linhas a instalação de um controle de commit que outro script já faz, com uma trava de preservação. A trava está correta desde o dia em que foi escrita; só não está naquele caminho. Como a disseminação roda esse script, cada disseminação desarma a cadeia de controles em vários repositórios. Na tela aparece "instalado com sucesso", e no disco o controle está morto.

## O que muda na prática
- Arquivo idêntico rastreado em dois repositórios é bug, não conveniência.
- Controles de commit podem resolver o problema por um intermediário que roda a versão viva da fonte quando ela existe na máquina e cai numa cópia só onde não existe. Biblioteca de código não tem esse truque: a importação resolve na montagem, então a resposta é um registro de pacotes.
- Não sincronize duas implementações. Apague uma e delegue.
- O sinal de detecção é simples: dois arquivos fazem a mesma operação de copiar ou ligar para o mesmo alvo protegido.
- Um arquivo com o mesmo nome e propósito em dois ou mais repositórios vira pacote, vira intermediário, ou tem exceção declarada com motivo.

## Como adotar
1. Liste arquivos com mesmo nome em seus repositórios e compare tamanho.
2. Para cada par, escolha pacote, intermediário ou exceção.
3. Para operações protegidas, procure todos os lugares que fazem a mesma coisa e deixe um só.
