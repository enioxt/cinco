# Expor um servidor MCP com segurança: transporte, autenticação, isolamento e ameaças

## A regra em uma frase
Nenhum servidor de ferramentas vai à internet sem modelo de ameaças escrito, autenticação com escopo por ferramenta, isolamento proporcional ao risco do cliente e interruptor global de emergência.

## Por que existe
Exemplo: uma revisão adversarial de um plano de colocar vários servidores MCP em produção encontra riscos críticos. O mais direto: ferramentas privadas expostas por HTTP sem modelo de ameaças permitem listar tarefas privadas e a infraestrutura. Outro: vazamento entre clientes por isolamento de linha mal testado. Um terceiro: o diff de um commit enviado a um modelo gratuito carrega segredos e dados pessoais para um fornecedor cuja retenção a equipe não controla. O quarto é o crescimento sem responsável: vários servidores, nenhum dono, nenhum objetivo de serviço.

## O que muda na prática
1. Transporte padrão da especificação, endpoint único por servidor, validação de origem contra ataque de rebinding de DNS.
2. Credencial de longa duração fora de produção. Em produção, token de curta duração com escopo por ferramenta e por cliente; para o cliente de maior risco, certificado de cliente com rotação.
3. Cliente sensível ganha instância própria (processo, banco e credenciais separados). Isolamento por linha de banco só para capacidades sem estado.
4. Cada ferramenta checa quem é o titular do objeto antes de devolver (autorização por objeto) e filtra campos conforme o escopo.
5. Busca de URL externa usa lista de permissão, bloqueia endereços internos e de metadados, resolve DNS antes e limita redirecionamentos.
6. Limite de taxa por token, tempo máximo, tamanho máximo e disjuntor para ferramenta com taxa de erro alta.
7. Poucos servidores agrupados por domínio de risco, em vez de dezenas minúsculos.
8. Diff para modelo externo passa por limpeza de segredos e dados pessoais, ou usa modelo local.

## Como adotar
- Escreva o modelo de ameaças com base na lista das principais falhas de segurança de API da OWASP antes do primeiro deploy.
- Marque responsável, plantão e maturidade (experimental até produção) por servidor, com teste comportamental para subir de nível.
- Inclua um teste de vazamento entre clientes em toda ferramenta nova.
- Tenha um interruptor que pausa tudo e um endpoint de revogação, e treine o uso.
