# Casos de ouro: no mínimo três por capacidade, incluindo o que deve falhar

## A regra em uma frase
Toda capacidade que um sistema afirma ter precisa de pelo menos três casos de teste de comportamento, escolhidos por categoria (leitura, escrita, auditoria), com severidade declarada e pelo menos um caso desenhado para falhar se a implementação for falsa.

## Por que existe
Um teste de unidade que confere a saída de uma função não prova que a função é chamada no caminho que o produto promete. Sem teste de comportamento, uma capacidade pode existir só no papel e ninguém percebe, porque nada quebra.

Exemplo: um módulo de proteção de dados pessoais exporta funções que devolvem o texto sem tocar nele. O verificador de tipos, o linter e dezenas de testes de unidade passam. Uma rota do produto importa essas funções e a documentação promete mascaramento de CPF. Na prática, todo CPF enviado volta intacto na resposta. Um único caso de comportamento que envia um CPF e confere que a resposta não o contém falha no primeiro dia e expõe o problema.

Um conjunto de testes sem critério claro de aprovação também vira texto de enchimento, aquilo que um agente produz para cumprir a cota.

## O que muda na prática
- Cada caso tem identificador, descrição da intenção, a ferramenta chamada, a entrada, o que deve aparecer na resposta, o que não pode aparecer e a severidade: "bloqueia" derruba a entrega, "avisa" só registra.
- Capacidades de leitura: um caso comum, um caso de resultado vazio (resposta limpa, sem erro) e um caso que confere que nenhum dado pessoal vaza.
- Capacidades de escrita: um caso válido, um com entrada malformada que precisa ser recusada com mensagem clara, e um de repetição com a mesma chave que não duplica efeito.
- Capacidades que cruzam clientes ou tocam dado sensível: um caso que prova isolamento entre clientes, uma varredura de segredos na resposta e conferência de que a ação deixou rastro de auditoria.
- A suíte falha se tiver menos de três casos. Defina um limiar de aprovação antes da rodada (Exemplo: 80%) e não libere para produção abaixo dele.

## Como adotar
1. Liste as capacidades que você declara em README, catálogo ou resposta de descoberta.
2. Para cada uma, escreva três casos pelas categorias acima. Pergunte: se a implementação fosse um esboço que devolve vazio, este caso falharia?
3. Proíba esboços silenciosos em código de conformidade: em vez de devolver vazio, o esboço lança erro.
4. Rode a suíte periodicamente contra produção. Queda na taxa de aprovação é regressão silenciosa.
5. Aponte as lacunas em voz alta: capacidade sem suíte é a primeira da fila.
