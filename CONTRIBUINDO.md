# Contribuindo com o cinco

Este é o repositório público do cinco. Ele é gerado a partir de um núcleo privado e espelha o que o site
cinco.ia.br publica, com os mesmos caminhos. Contribuições entram por pull request e são revisadas antes
de virar parte do núcleo.

## Como funciona

1. Abra um pull request contra a `main` com a mudança e uma frase dizendo o que ela corrige ou melhora.
2. A revisão confere se o texto é simples, se não há preço, nome de cliente ou dado pessoal, e se o que a página afirma tem prova.
3. Se a mudança for aceita, ela é aplicada no núcleo privado, que gera este repositório de novo. Por isso o
   commit que você vê aqui pode não ser o seu: a autoria é registrada no texto do commit.

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
- Licença MIT: ao contribuir, você aceita que a sua mudança siga a mesma licença.
