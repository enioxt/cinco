# Todo número do README é um contrato com um comando que o verifica

## A regra em uma frase
Cada afirmação quantitativa em um README é declarada em um manifesto com o comando que a reproduz e uma tolerância, e uma verificação compara o texto com a realidade a cada commit e em agenda periódica.

## Por que existe
Com IA, o código cresce mais rápido do que a documentação é atualizada. Sem verificação, o número escrito no README envelhece em silêncio: o texto diz uma contagem de páginas ou de interfaces, o código passa a ter outra, e ninguém percebe até um parceiro conferir. Um currículo ou uma página de apresentação pode até citar um serviço que já não é o usado. Isso corrói a confiança, e não é problema de redação: é de verificação de contrato.

Exemplo: um README diz "40 endpoints" e, seis meses depois, o projeto tem o dobro. Ninguém mentiu, ninguém lembrou de atualizar, e nada avisou.

## O que muda na prática
- Um manifesto por repositório lista cada afirmação com identificador, local no README, comando que produz um valor, tolerância (exata, percentual, absoluta, mínima ou máxima) e último valor verificado.
- Pareamento: o commit que muda código que afeta uma afirmação atualiza README ou manifesto no mesmo commit.
- Quem introduz uma afirmação nova declara no manifesto antes de escrever no README.
- Contorno só com razão escrita, registrada e revisada com regularidade.
- Uma rotina periódica roda tudo, atualiza o valor, abre uma proposta de correção em branch separada e nunca altera a principal.
- Manifesto sem atualização por muito tempo em repositório ativo é falha.
- **Deriva de status:** uma tarefa marcada pendente quando o trabalho já foi feito. Surge quando o mesmo status vive em dois lugares com identificadores diferentes. A cura é uma única fonte de status. Documentos de auditoria são retratos, não rastreadores, e o commit que fecha uma tarefa leva o identificador canônico no título.

## Como adotar
1. Liste cada número do seu README.
2. Para cada um, escreva um comando de uma linha que o reproduz.
3. Guarde-os em um arquivo versionado com tolerâncias.
4. Rode a verificação no commit e em agenda periódica que caiba no seu ritmo.
