# Segurança de dados em sistemas construídos com IA: dado sintético primeiro

## A regra em uma frase
O dado real de pessoa nunca entra no ambiente de desenvolvimento nem no contexto de um modelo externo: o sistema se constrói e se testa com dado sintético, e o real só passa por anonimização ou por modelo local isolado.

## Por que existe
Sistemas com IA pedem exemplos reais mais cedo e mais fundo que sistemas tradicionais. O padrão de falha se repete: alguém usa um caso real para testar rápido, o dado vai parar no repositório ou num log, ninguém nota porque parece código, e o sistema vai a público antes da limpeza. Git agrava, porque guarda todo o histórico: remover o arquivo não apaga o dado, que segue acessível por clones antigos, ramos apagados e forks. A purga exige reescrever o histórico, forçar o envio e pedir a coleta de lixo ao servidor, e ainda assim vale revogar toda credencial exposta.

## O que muda na prática
1. Desenvolvimento e testes usam dado sintético com a mesma estrutura do real. Quando for inevitável usar real, anonimize antes.
2. Dado real em contexto de modelo externo é proibido: pode vazar na resposta, ser retido pelo fornecedor, entrar em ajuste fino e aparecer nos logs da API.
3. Defesa em camadas: sintético primeiro, varredura de segredos e dados pessoais no commit, varredura antes de publicar, controle de acesso, criptografia, consentimento granular e monitoramento contínuo.
4. Consentimento padrão desligado, por finalidade, reversível com um clique e acompanhado de exportação e exclusão com prova.
5. Decisão automatizada sobre pessoa tem revisão humana, e o prazo legal de notificação de incidente tem roteiro escrito.
6. Logs guardam identificadores, não dado pessoal.
7. Os sete vetores a vigiar: repositório, banco, aplicação pública, logs, contexto do modelo, esteira de integração e arquivos web (cópias antigas de páginas).

## Como adotar
- Gere dados falsos com bibliotecas de geração e valide a estrutura por esquema.
- Instale varredura de segredos e de dados pessoais antes do commit e na integração contínua.
- Habilite a varredura nativa de segredos do host de código.
- Ao descobrir dado no histórico: pare de commitar, mapeie, purgue, reescreva o histórico, revogue credenciais e confirme com um clone novo que sobrou zero.
- Mantenha um checklist por fase: antes de codar, durante, antes de ir a público e em produção.
