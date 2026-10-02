# Roteamento de LLM: quem está esperando, e o que acontece quando um caminho falha

## A regra em uma frase
Escolha o caminho de modelo por duas perguntas, nesta ordem (tem alguém esperando? precisa de uma linhagem que o seu modelo principal não é?), e trate caminho indisponível como ausente e dito, nunca como tentativa que falha em silêncio.

## Por que existe
Exemplo: uma equipe tinha um roteador com uma lista de exceções para decidir quando pagar. Lista de exceções envelhece: vários consumidores acabaram pagantes sem que ninguém tivesse decidido pagar, porque o campo que permitia o fallback pago vinha ligado por padrão e nenhuma chamada o desligava. Em paralelo, a lista de modelos gratuitos apodreceu mais de uma vez: modelos aposentados passaram a responder erro de modelo inexistente, e uma rotina de revisão ficou semanas morta por um desses erros, sem aviso.

Outro achado: um caminho que parecia o mais barato era lento por acidente de configuração, e o pago parecia razoável por causa de um efeito colateral que ninguém decidiu.

## O que muda na prática
1. Alguém esperando (mensagem de cliente, tela de administração): caminho de menor latência, porque a espera é do usuário.
2. Ninguém esperando (lote, insight de fundo): o caminho mais barato primeiro, com reserva. O recurso escasso é a atenção e a cota de quem trabalha, não os centavos.
3. Precisa de linhagem diferente: serviço esporádico de outra família de modelo, porque ali o dinheiro compra diversidade de raciocínio, não capacidade.
4. Conteúdo vazio é falha. Caminho bloqueado por teto de gasto ou sem o componente na máquina sai da cadeia, dito, em vez de falhar a cada chamada.
5. Todo caminho pago escreve num livro-caixa, e o teto é somado por fornecedor. Preço desconhecido não vira zero.
6. Confira os termos de uso de cada fornecedor antes de decidir qual credencial alimenta cada caminho.

## Como adotar
- Declare no código, por chamada, se há alguém esperando. Quem escreve a palavra assume a escolha.
- Exponha a cadeia montada em uma função inspecionável sem rede, para testá-la.
- Faça uma varredura por chave (nome de modelo em parâmetros), não por lista de arquivos, para achar modelo aposentado.
- Aposente um caminho gratuito de terceiros se ele já apodreceu mais de uma vez.
