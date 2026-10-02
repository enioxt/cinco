# Mencionar não é provar: "concluído" exige evidência verificável

## A regra em uma frase
Toda afirmação de que algo está pronto precisa de uma prova que um terceiro consiga verificar, e citar o nome do arquivo na descrição da tarefa não é prova.

## Por que existe
Exemplo: uma tarefa é marcada como concluída sem que nada tenha rodado. A verificação que deveria pegar o caso aceita como evidência qualquer menção a um arquivo de código na descrição, e as travas locais podem ser ignoradas por um processo automático com estado desatualizado. Várias falhas pequenas se somam.

A verificação olhava o nome do arquivo, não o conteúdo no momento do uso. É o problema clássico de checar uma referência e usar outra coisa. Também é a lei de Goodhart em ação: o indicador (a descrição cita um arquivo) virou o alvo e se afastou do objetivo (o trabalho foi feito).

## O que muda na prática
- Tarefa concluída carrega um resumo criptográfico do artefato produzido e uma data de fechamento. A verificação confere que o arquivo existe e que o conteúdo ainda bate.
- Para algo que roda, a prova é o resultado real: status e corpo da resposta, contagem em banco, log de teste.
- Alterações vindas de outra sessão, de outro agente ou de um subagente são não confiáveis por padrão e se reverificam na fronteira.
- Quem escreve uma regra não é quem aprova a mudança nela.
- Toda verificação nova declara quatro coisas: qual é a prova, qual é a camada local, qual camada independente continua valendo se a local for ignorada e qual camada roda onde o autor não tem controle.

## Como adotar
1. Empilhe camadas que falhem fechadas: aviso rápido no commit, auditoria periódica do estado real do repositório e verificação no servidor ou na integração contínua.
2. Coloque a camada que importa onde quem commita não manda. Proteção de branch com verificações obrigatórias resolve boa parte.
3. Todo atalho para pular verificações exige registro de quem, quando e por quê.
4. Faça o campo de evidência ser estruturado e não vazio. Texto livre vira menção.
5. Reverifique os achados mais importantes de qualquer relatório de subagente antes de citá-lo.
