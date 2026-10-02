# Documento HTML para humanos: um arquivo só, em português claro, fiel à fonte

## A regra em uma frase
Todo HTML feito para uma pessoa ler é um arquivo único que abre sem internet, explica em português o que a fonte técnica diz, não inventa nada além dela e carrega no rodapé de onde veio e quando foi gerado.

## Por que existe
A documentação técnica costuma ser escrita para máquina: densa, cheia de sigla, boa para outro agente de IA e ruim para quem decide. O HTML existe para ser a camada humana. Quando ele depende de uma biblioteca baixada de um servidor externo, quebra no avião, no e-mail encaminhado ou no pendrive. Quando é só o texto técnico convertido, o leitor continua sem entender. E quando o gerador "melhora" o conteúdo, aparecem percentuais e prazos que a fonte nunca disse.

Há ainda um risco silencioso: o HTML envelhece. A fonte muda, o HTML continua igual, e ninguém percebe qual dos dois está certo.

## O que muda na prática
- Um arquivo, com estilo e script embutidos. Sem fonte baixada de servidor, sem ícone de biblioteca, sem chamada a endereço de fora. Ícones são desenhos inline.
- Didático de verdade: termo técnico explicado na primeira vez que aparece, exemplo concreto depois da definição, frases e parágrafos curtos, destaques para regra e aviso.
- Fidelidade: número, prazo, nome de sistema e classificação só entram se estão na fonte. Se a fonte marca algo como conceito e não como real, o HTML mantém essa marca.
- Documento com várias seções ganha índice lateral, modo escuro e leitura boa no celular, com tabela rolando na horizontal em vez de cortar.
- Rodapé com caminho da fonte, data de geração e versão. Sem nome de pessoa, e-mail, telefone ou endereço interno.
- O par mora junto: cada texto técnico mestre tem seu HTML irmão, com o mesmo nome. Sem data no nome do arquivo.

## Como adotar
1. Escolha uma pasta única para os HTMLs de leitura e um nome idêntico ao da fonte.
2. Monte um molde com estilo, índice, alternância de tema e rodapé. Todo documento novo parte dele.
3. Faça uma lista de conferência antes de entregar: abre offline sem erro, tema escuro funciona, celular legível, rodapé completo, nenhum dado fora da fonte.
4. Regenere o HTML sempre que a fonte mudar e deixe a data de geração visível, para o desencontro aparecer a olho nu.
5. Use um modelo mais forte para documento crítico ou público, e um mais barato para o resto.
