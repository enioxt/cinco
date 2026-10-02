# Tela só está pronta com mapa, teste real, prova e dois vistos

## A regra em uma frase
Nenhuma página ou funcionalidade de interface é dada como pronta sem entrada no mapa de funcionalidades, teste de uso real, prova (captura de tela, console limpo, tempos) e o aval de duas pessoas: quem testou e quem decide sobre o produto.

## Por que existe
Interface quebra de formas que o teste automático de função não vê: um botão que aponta para uma página inexistente, um cabeçalho diferente entre páginas, um dado estagnado que diz "indisponível", uma tela branca quando a API falha. A experiência humana inclui digitar, clicar duas vezes seguidas, voltar no navegador. Sem um mapa e uma confirmação manual dos dois lados, "feito" significa que ninguém olhou a tela real, e isso costuma ser a origem de retrabalho.

## O que muda na prática
- Um mapa por aplicativo, com uma linha por página: rota, elementos (cabeçalho, botões, links, formulários), APIs chamadas, estados (carregando, erro, vazio), última verificação e dois vistos. Página nova entra no mapa no mesmo commit.
- Seis critérios pegam a maioria dos defeitos: a rota responde como esperado, cabeçalho e navegação resolvem, links sem quebra, cada API devolve o contrato esperado, console sem erros e prova visual.
- Segunda onda: formulários (vazio, válido, inválido, acentos, colar texto), navegação (ir e voltar, clique duplo, link direto) e velocidade, com tetos de tempo definidos por você.
- Um rastreador automático com modelo barato percorre as rotas e descreve as regressões. O que exige julgamento (está feio? o fluxo confunde?) fica com o aval humano.
- Sem os dois vistos, a funcionalidade é conceito, não entrega.

## Como adotar
1. Crie o arquivo do mapa e preencha as páginas existentes.
2. Rode a matriz de critérios e anexe as provas.
3. Peça o visto de quem testou e depois o de quem decide, olhando a página real.
4. Melhore os critérios a cada defeito real encontrado, começando pelos poucos que pegam a maior parte dos problemas.
