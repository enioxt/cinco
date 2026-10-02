---
name: video-narrativo-de-imagens
description: Monta um vídeo narrativo a partir de imagens que já contam uma história (memória, trajetória, origem, relato de experiência). Cenas longas, câmera lenta, pouco texto. Traz a conta de resolução que decide se a câmera pode se mover e o cuidado com histórias de pessoas reais. Não serve para vídeo técnico curto de 30 segundos.
---

# Vídeo narrativo de imagens

Irmão lento do vídeo de cortes secos. Mesma ideia de montagem, gramática oposta.

| | Vídeo de cortes secos | Vídeo narrativo |
|---|---|---|
| Duração segura da cena | 1,2 a 3,5 s | **4 a 8 s** |
| O que carrega | tipografia | **a imagem** |
| Câmera | corte seco | **movimento lento e contínuo** |
| Texto | é o conteúdo | **é legenda, e quase sempre sobra** |
| Serve para | promo técnico | **origem, memória, relato de experiência** |

Escolher errado é o erro mais caro. Corte seco numa história de família parece propaganda de banco. Câmera lenta num promo técnico parece apresentação corporativa. Teste: a pessoa precisa **olhar** ou **ler**? Olhar: vídeo narrativo.

## 1. Meça a resolução antes de escrever o roteiro

Câmera que aproxima numa imagem pequena vira borrão, e o defeito só aparece no vídeo final. É aritmética.

```bash
identify -format "%wx%h\n" imagens/*.png | sort -u
```

Com largura nativa `L` e largura da saída `S`, a imagem aparece a `S/L` do tamanho real. Somando um zoom de câmera `Z`, o esticamento total é `S/L x Z`. Acima de 1,0 está esticando.

Descubra o zoom real da sua ferramenta de montagem lendo a configuração, não de memória. Zoom de aproximação típico fica entre 1,3 e 1,8.

Exemplo de cálculo, com imagens de 1672 x 941 e um zoom de 1,58:

| Saída | Esticamento total |
|---|---|
| 1920 x 1080 | 1,81 (estica 81%) |
| 1280 x 720 | 1,21 (estica 21%) |
| 1024 x 576 | 0,97 (praticamente 1:1) |

Entre 0% e uns 25% de esticamento, decida **olhando um quadro parado**. Acima disso, nem olhe: já é borrão.

Reescalar as imagens antes **não resolve**: aumenta o arquivo sem aumentar a informação. **Para imagem nova, gere no dobro da largura de saída** (para 1080p com câmera em movimento, gere a 3840 px).

## 2. História de pessoa real: separe o que pode do que não pode

Imagem de trajetória pessoal quase sempre é biografia. Antes de qualquer roteiro, duas colunas, e a decisão final é da pessoa dona da história:

- **Pode (verdade emocional):** o que se sentiu, o que mudou, o que se descobriu.
- **Não pode (história literal):** nome de gente viva, endereço, cidade identificável, ano exato, rosto de familiar, o que aconteceu com quem.

Na dúvida, a frase é literal: corte e pergunte. Imagens de biografia não vão para repositório público nem para nuvem.

Cuidado extra: **a legenda que nomeia o que a imagem só insinua** fura a fronteira. A imagem sugere e cada um lê o que quiser; a legenda transforma símbolo em declaração, e declaração não se desfaz. Quando o limite da cena é justamente o que ela não diz, a cena fica muda.

## 3. Ritmo

- Cena de 4 a 8 s. Abaixo de 4 s o olho não termina de ler; acima de 8 s sem movimento nem narração, morre.
- Uma imagem, um momento, uma ideia. Duas ideias numa imagem significa que faltou imagem.
- Movimento contínuo sempre. Imagem totalmente parada por mais de 2 s parece defeito do player. Ken Burns, deriva lenta, revelação por borda.
- Câmera com velocidade constante. Aceleração e desaceleração parecem transição de aplicativo, não câmera.
- A primeira imagem entra devagar, revelando o contexto. A última segura mais que todas e sai parada.
- Dissolve entre cenas é permitido aqui. Texto sobre imagem: no máximo uma linha por cena, e nunca descrevendo o que a imagem já mostra.

## 4. A história em três atos

Antes do roteiro, três respostas escritas:

1. **De onde para onde?** Toda narrativa é um deslocamento. Sem os dois pontos é álbum.
2. **Qual é a virada?** A imagem exata em que deixa de ser uma coisa e passa a ser outra. Se não dá para apontar uma, faltou história, não imagem.
3. **O que a pessoa leva?** Se a resposta é "conheceu a trajetória", o vídeo não termina.

| Ato | Fatia | Carrega |
|---|---|---|
| I, o mundo antes | cerca de 25% | como era e o que faltava |
| II, a virada | cerca de 50% | o que mudou e o custo |
| III, o depois | cerca de 25% | o que ficou e para quem serve |

A imagem da virada segura mais tempo que todas as outras. É a única regra de duração inegociável.

## 5. Fases (cada uma para e confirma)

1. **Ordenar e olhar as imagens.** Numere e **abra cada uma**. Descreva em uma linha. A ordem narrativa é da pessoa; não a deduza do nome do arquivo.
2. **Cuidado com a biografia** (seção 2).
3. **Conta de resolução** (seção 1). Defina a saída antes de existir cena.
4. **Roteiro**: tabela de momentos e, para cada um, "Na tela / Movimento / Por quê". Aprove a estrutura antes do texto completo.
5. **Montagem.**
6. **Conferência quadro a quadro**: um quadro parado no meio de cada cena. Procure rosto cortado pela borda no fim do movimento, imagem esticada, legenda sobre área clara sem contraste, e a mesma pessoa mudando de aparência entre cenas.
7. **Passada de design** nos três piores quadros. Corrija os dois piores, não os sete.
8. **Exportar** em MP4. Publicar é decisão da pessoa.

## O que denuncia narrativa gerada por IA

| Sinal | Conserto |
|---|---|
| A mesma pessoa com rosto diferente entre cenas | Escolha o subconjunto coerente e descarte o resto: menos imagens, mesma história |
| Luz vindo de lados opostos em cenas seguidas | Reordene ou separe com uma cena de outro assunto |
| Todas as cenas com a mesma duração | Varie 4 s, 6,5 s, 8 s |
| Legenda descrevendo a imagem | Corte a legenda; se a imagem precisa dela, a imagem está errada |
| Aproximação de câmera em toda cena | Metade das cenas fica parada, com deriva mínima |
| Música cobrindo tudo | Silêncio também é um momento; a virada quase sempre pede que a trilha saia |
