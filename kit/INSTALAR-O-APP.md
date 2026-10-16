# Instalar o EGOS APP na sua máquina

Este guia leva você de "tenho a pasta do kit" até "o painel está aberto na minha tela",
e depois mostra como levar os seus dados embora e como apagar tudo. Foi escrito depois de
rodar cada passo numa máquina limpa simulada, e cada frase abaixo que diz "você vai ver"
é o que apareceu de verdade.

**Você não precisa de conta, de senha nem de chave de ninguém.** Nada aqui pede que você
mande algo para o autor do kit. Nada é instalado no sistema: sem serviço, sem programa
que abre sozinho, sem `sudo` para o app em si. O app é uma pasta que você põe onde quiser
e uma pasta de dados sua, `~/.egos`.

## O que é

Um painel que roda só na sua máquina e mostra, numa tela no navegador, o que os seus
agentes de IA estão fazendo: pedidos pendentes, sessões abertas, agenda, documentos. Ele
escuta só o endereço `127.0.0.1`, que ninguém de fora da sua máquina alcança.

## O que você precisa antes

| Item | Para quê | Como saber se você já tem |
| --- | --- | --- |
| Ubuntu (ou outro Linux) | onde o painel roda | você está usando |
| Um terminal | digitar os comandos abaixo (no Ubuntu: `Ctrl+Alt+T`) | abre uma janela preta ou roxa com texto |
| `curl` | baixar o bun no passo 1 | digite `curl --version` |
| `bun` | é o programa que executa o app | digite `bun --version` (se der erro, o passo 1 instala) |
| Um navegador | ver o painel | qualquer um serve; o Google Chrome abre sozinho numa janela própria |
| A pasta do kit | o app em si | uma pasta com `scripts/` e `config/` dentro |

Os comandos abaixo funcionam em qualquer pasta. Onde aparecer `~`, isso quer dizer "a sua
pasta pessoal".

## Passo a passo

**1. Instale o bun (só se ainda não tiver).**

```
curl -fsSL https://bun.sh/install | bash
```

Feche o terminal e abra outro. Confira:

```
bun --version
```

Deve aparecer um número de versão, por exemplo `1.3.14`.

**2. Entre na pasta do kit.**

```
cd ~/kit
ls scripts/orquestra-viva.ts config/perfil.default.json
```

Troque `~/kit` pelo lugar onde você colocou a pasta. O `ls` deve listar os dois arquivos
sem reclamar. Se reclamar que não existe, você está na pasta errada.

**3. Diga ao app onde ele mora e desligue o aviso para fora.**

```
export EGOS_REPO_DIR="$PWD"
export EGOS_GUARD_SONDA_OFF=1
```

O primeiro comando é importante. Sem ele o app procura os próprios arquivos numa pasta
que só existe na máquina do autor, e a lista de perfis do passo 6 aparece vazia. O segundo
evita a única chamada que o app faz para a internet sem você pedir (explicada em "O que
sai da sua máquina"). Esses dois valem só para este terminal; se você abrir outro,
repita.

**4. Suba o painel.**

```
bash scripts/orquestra-viva.sh
```

Você vai ver:

```
orquestra-viva: subindo servidor…
orquestra-viva: de pé em http://127.0.0.1:4599
orquestra-viva: janela aberta (Chrome --app)
```

Uma janela do Chrome abre com o painel. **Se você não tem o Chrome**, a última linha vira
`[ERROR] ... google-chrome não encontrado` e o comando termina com erro, mas o painel já
está de pé: abra `http://127.0.0.1:4599` em qualquer navegador e siga em frente.

Se a porta 4599 já estiver ocupada por outra coisa, use outra:
`EGOS_ORQUESTRA_PORT=4700 bash scripts/orquestra-viva.sh` (e troque 4599 por 4700 abaixo).

**5. Confira que subiu.**

```
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4599/estado
```

O esperado é `200`.

**6. Deixe o app com a sua cara.**

O kit traz um perfil de exemplo, e ele é do autor: o nome é "Enio" e as pastas listadas
são as dele. Ele serve de modelo. Copie e edite o seu:

```
mkdir -p ~/.egos
cp config/perfil.default.json ~/.egos/perfil.json
```

Abra `~/.egos/perfil.json` num editor de texto e troque pelo menos `nome` e `repos`
(as pastas de projetos que você quer que o painel enxergue). Recarregue a página. Pela
própria tela também dá para trocar o perfil e o layout; o app grava sempre dentro de
`~/.egos`, e guarda o perfil anterior ao lado, com o final `.bak`.

## O que você vai ver, e o que é normal

Numa máquina recém-preparada quase todos os cartões mostram `⚪ NÃO-MEDIDO` ou
"módulo não instalado nesta máquina". **Isso não é defeito.** Quer dizer que aquele cartão
depende de uma peça que você ainda não tem: WhatsApp, Google Agenda, e-mail, gastos, os
documentos do autor. O painel prefere dizer "não medi" a mostrar um número inventado.
Vermelho (🔴) é o que merece atenção; cinza (⚪) é "ainda sem esta peça".

O que funciona já no primeiro minuto, sem configurar nada: a tela, o estado geral, o
perfil, a fila de pedidos entre agentes (`scripts/fila.ts`) e a lista de documentos
(vazia até você apontar pastas).

## Onde ficam os seus dados

**Tudo fica em `~/.egos`**, uma pasta só, na sua máquina. Depois do passo a passo acima
ela tem:

| Arquivo | O que é |
| --- | --- |
| `perfil.json` | o seu perfil (e `perfil.json.bak`, o anterior) |
| `orquestra-viva.log` | o registro do servidor, útil quando algo falha |
| `fila/` | os pedidos entre agentes, se você usar o `fila.ts` |

Nenhum desses arquivos guarda senha ou chave. O app só guarda uma chave se você mesmo a
digitar num arquivo de configuração de uma peça opcional (WhatsApp, e-mail).

## Levar os seus dados embora (exportar)

Um comando junta tudo num arquivo só:

```
tar czf ~/meus-dados-egos.tgz -C ~ .egos
```

Para colocar de volta em outra máquina (ou na mesma, depois de reinstalar):

```
tar xzf ~/meus-dados-egos.tgz -C ~
```

Foi testado nos dois sentidos: o arquivo sai, e o conteúdo volta idêntico numa pasta pessoal
diferente.

## Desinstalar

São três passos, e nenhum precisa de `sudo`.

1. **Pare o painel.** Na mesma pasta do kit:

   ```
   bash scripts/orquestra-viva.sh --parar
   ```

   Deve aparecer `orquestra-viva: parado (pid ...)`. Esse comando usa o programa `lsof`.
   Se a sua máquina não o tiver, ele diz "nada ouvindo" mesmo com o painel aberto; nesse
   caso, feche o painel achando o processo com `ps aux | grep orquestra-viva`.
2. **Exporte os seus dados**, se quiser guardá-los (seção acima).
3. **Apague as pastas.** Saia da pasta do kit e apague as duas:

   ```
   cd ~
   rm -rf ~/kit ~/.egos
   ```

   Troque `~/kit` pelo lugar onde a pasta do kit está.

Depois disso não sobra nada do app na sua máquina. O que ficou só é o `bun`, que você pode
querer para outras coisas; para tirá-lo, apague a pasta `~/.bun` e a linha que o instalador
acrescentou ao seu arquivo `~/.bashrc`.

## O que sai da sua máquina

O app roda local, e o que ele faz na internet é pouco e está aqui por inteiro:

- **Uma chamada sem chave, ligada de fábrica:** ao carregar o cartão do Guard Brasil, o app
  pergunta a um servidor do autor se ele está no ar (`/health`, sem enviar dado nenhum,
  mas o servidor vê o seu endereço de internet; sem internet, o cartão mostra 🔴 "offline"). O
  passo 3 desliga isso com `EGOS_GUARD_SONDA_OFF=1`, e o cartão passa a dizer
  "⚪ sonda desligada".
- **Só se você configurar:** Google Agenda e Gmail usam as **suas** credenciais do Google;
  WhatsApp usa o **seu** servidor da Evolution API; o resumo em prosa (`cronica.ts`) chama
  o Claude Code que você já tiver instalado. Sem essas configurações, esses cartões ficam
  em ⚪ e nada sai.

O painel não tem senha própria, porque só a sua máquina o alcança. Quem senta no seu
computador vê o painel.

## Se algo não der certo

| O que apareceu | O que fazer |
| --- | --- |
| `bun: command not found` | refaça o passo 1 e abra um terminal novo |
| `servidor não respondeu em 10s — ver ~/.egos/orquestra-viva.log` | leia esse arquivo: `tail -20 ~/.egos/orquestra-viva.log`; costuma ser porta ocupada (use `EGOS_ORQUESTRA_PORT=4700`) |
| A lista de perfis aparece vazia | você esqueceu o `export EGOS_REPO_DIR="$PWD"` do passo 3 neste terminal |
| `google-chrome não encontrado` | esperado sem o Chrome; abra `http://127.0.0.1:4599` no seu navegador |

## O que ainda não foi provado

Este guia foi ensaiado numa **pasta pessoal vazia e com caminho de programas mínimo**
dentro de uma máquina Ubuntu que já tinha o `bun`. Isso prova a pasta do kit, o app, os
dados, o exportar e o desinstalar. **Não prova** ainda: instalar o `bun` do zero
(o instalador dele também precisa do programa `unzip`), rodar com um usuário realmente
novo do sistema, o Chrome abrindo em máquina que nunca o abriu, e Windows ou Mac (este
guia é só Linux). Quem fizer o primeiro teste de ponta a ponta numa máquina de verdade:
anote onde travou, é exatamente para isso que ele serve.
