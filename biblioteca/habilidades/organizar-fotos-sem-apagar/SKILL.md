---
name: organizar-fotos-sem-apagar
description: Organiza um acervo pessoal de fotos e vídeos na máquina da própria pessoa. Inventaria, acha duplicatas exatas, separa prints, imagens de aplicativo e miniaturas em uma quarentena reversível, e nunca apaga nada. Use quando alguém quiser "organizar as fotos", "limpar o celular", "liberar espaço" ou processar um Google Takeout.
---

# Organizar fotos sem apagar

## A regra que sustenta tudo

**Esta habilidade nunca apaga um arquivo.** Ela move para uma pasta `_QUARENTENA/` e escreve um `DESFAZER.sh` ao lado. Quem apaga é a pessoa, quando quiser, com um comando que ela mesma digita.

Motivo: erro ao apagar foto é irreversível e silencioso. Ninguém sente falta da foto que sumiu, só descobre anos depois, procurando. Mover devolve a decisão a quem tem o contexto.

## Privacidade

Tudo roda na máquina da pessoa. Nenhuma imagem é enviada para fora, e o modelo não precisa ver o conteúdo das imagens: trabalha só com nomes, tamanhos e somas de verificação (hash). Se for preciso olhar uma foto para decidir, quem abre é a pessoa.

## O ciclo

```
PASTA DE ORIGEM
 -> INVENTÁRIO (conta e mede; não move nada)
 -> CLASSIFICA (duplicata exata, print, baixado de app, minúscula, fica)
 -> RELATÓRIO com amostra que dá para abrir
 -> A PESSOA CONFERE E DECIDE
 -> MOVE para _QUARENTENA/ (reversível)
 -> PROVA (contagem antes e depois bate)
```

## Passo a passo

### 1. Onde estão as fotos

Pergunte antes de rodar.

| Onde a pessoa diz que está | O que fazer |
|---|---|
| Google Fotos | Pedir em takeout.google.com só "Google Fotos", formato .zip. Demora horas do lado do Google: peça primeiro, o tempo corre sozinho |
| Celular | Ligar por cabo e copiar a pasta DCIM para o computador. Trabalhe na cópia, nunca no celular |
| HD externo ou pendrive | Aponte direto para a pasta |
| Espalhado | Junte tudo numa pasta-mãe. A varredura entra nas subpastas |

### 2. Ler o acervo (não move nada)

Com comandos comuns do sistema, produza:

- total de arquivos e espaço ocupado, separando fotos de vídeos (por extensão: jpg, jpeg, png, heic, webp, gif, mp4, mov, 3gp, avi);
- duplicatas exatas: arquivos com o mesmo hash, por exemplo `find . -type f -exec sha256sum {} +` ordenado e agrupado pelo hash. Dentro de cada grupo, a cópia mais antiga fica;
- prints de tela: nomes que começam com "Screenshot" ou "Captura de tela";
- imagens recebidas por aplicativo: pastas ou nomes padrão de mensageiros;
- minúsculas: menores que 50 KB, em geral ícone ou miniatura.

Mostre, por categoria, uma **amostra de 5 caminhos reais**, para a pessoa abrir.

### 3. Conferir a amostra com a pessoa

Este passo não se pula. Pergunte categoria por categoria:

- **Duplicata:** "este arquivo é igual, byte a byte, a este mais antigo. Pode ir?"
- **Print:** "alguns são comprovante, receita ou documento. Confere?"
- **Recebido por app:** "costuma ter meme junto com foto de família. Dê uma olhada."
- **Minúscula:** "menor que 50 KB. Normalmente é ícone, não foto."

Se a pessoa hesitar numa categoria, tire a categoria inteira desta rodada. Uma rodada tímida em que ela confia vale mais que uma agressiva que ela desfaz.

### 4. Aplicar

Mova (nunca apague) para `_QUARENTENA/<categoria>/`, mantendo a estrutura original de pastas. Gere o `DESFAZER.sh` com um `mv` de volta para cada arquivo, usando aspas em todos os caminhos (nomes com espaço e parênteses são comuns). Confira a contagem: arquivos que ficaram + arquivos em quarentena = total inicial. Se não bater, pare e avise para não apagar nada.

Não varra a própria quarentena numa segunda rodada.

### 5. Entregar as quatro linhas

```
Ficaram no acervo:  N arquivos
Em quarentena:      M arquivos, X GB
Desfazer:           bash <pasta>/_QUARENTENA/DESFAZER.sh
Apagar de vez:      rm -rf <pasta>/_QUARENTENA    (só você faz isso)
```

**Nunca rode o `rm` você mesmo.** Ofereça o comando; a pessoa executa.

## O que esta habilidade não faz

| Não faz | Por quê |
|---|---|
| Fotos quase iguais (rajada, mesma foto em duas resoluções) | Exige julgamento; engano apaga foto que importa. Use uma ferramenta própria para isso (por exemplo Czkawka) e confira foto a foto |
| Reconhecer rosto, lugar ou "foto bonita" | Classificar conteúdo de foto pessoal é decisão da pessoa, e exigiria mandar a imagem para fora da máquina |
| Apagar | É decisão da pessoa |
| Subir para nuvem | O acervo fica onde está |

## Ferramentas que já existem (não reconstrua)

- **GooglePhotosTakeoutHelper** com **exiftool**: devolve ao arquivo a data e o local que o Google guarda em arquivos .json separados no Takeout. Com o metadado dentro do arquivo, o acervo sobrevive a qualquer plataforma.
- **Immich** (instalação própria, acesso só pela máquina local): faz o papel de um Google Fotos na máquina da pessoa, com rostos, mapa, álbuns e aplicativo de celular.
- **Czkawka**: fotos parecidas por semelhança visual.

Procure o que já existe antes de escrever código novo: boa parte desta tarefa já tem solução madura.
