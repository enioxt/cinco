# Contribuindo com o cinco

Este é o repositório público do cinco. Ele é gerado a partir de um núcleo privado e espelha o que o site
cinco.ia.br publica, com os mesmos caminhos. Contribuições entram por pull request e são revisadas antes
de virar parte do núcleo.

## Como funciona

1. Abra um pull request contra a `main` com a mudança e uma frase dizendo o que ela corrige ou melhora.
2. A revisão confere se o texto é simples, se não há preço, nome de cliente ou dado pessoal, e se o que a página afirma tem prova.
3. Se a mudança for aceita, ela é aplicada no núcleo privado, que gera este repositório de novo. Por isso o
   commit que você vê aqui pode não ser o seu: a autoria é registrada no texto do commit.

## Autoria, participação e troca justa

Aceitar uma contribuição no repositório preserva a autoria, mas **não cria automaticamente participação financeira, sociedade ou direito sobre trabalhos futuros**.

Quando uma contribuição ajudar a gerar um serviço, projeto ou resultado econômico, as pessoas envolvidas podem registrar um **recibo de participação por resultado** e combinar de forma explícita como reconhecer autoria, execução, conhecimento, origem da oportunidade, revisão, infraestrutura, responsabilidade ou impacto anterior.

A proposta em estudo está em [`TROCA_JUSTA.md`](TROCA_JUSTA.md). Ela parte de duas ideias ao mesmo tempo:

- ninguém recebe só por pertencer ao grupo;
- ninguém deve ter uma contribuição real apagada só porque ela aconteceu antes, foi difícil de medir ou não apareceu como código.

Relação pessoal, amizade ou ajuda histórica podem ser reconhecidas por decisão humana, mas não são pontuadas automaticamente pelo sistema e não viram dívida social por algoritmo.

## O que dá para corrigir aqui

- Texto, páginas, busca, FAQ e aparência: os arquivos HTML, CSS e JS da raiz e das pastas.
- Erros de português, links quebrados, acessibilidade, contraste, leitura no celular.
- O kit em `kit/` e os exemplos sintéticos: sempre sem dado real.

## O que não mora aqui

- O chat (`/conversa/*`) e o login (`/entrar/*`) são servidos por um gateway em outro repositório. Aqui está só o cliente.
- Os geradores, os testes e a publicação do site ficam no núcleo privado.

## Regras que o site segue

- Nada de fora: nenhuma fonte, script ou imagem de outro domínio.
- Mesma casca em toda página: topo, rodapé e chat vêm de `casca.js`.
- Texto simples, em português, sem jargão interno, sem preço e sem nome de cliente, parceiro ou caso.
- O que o site afirma como "em uso" precisa ter prova que qualquer pessoa consiga abrir.
- Licença MIT: ao contribuir, você aceita que a sua mudança siga a mesma licença. A licença e eventual retribuição econômica são coisas diferentes; remuneração, royalties ou participação precisam de acordo próprio quando aplicável.
