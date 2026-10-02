# Portabilidade entre sistemas operacionais

## A regra em uma frase
Todo script, habilidade e verificação automática precisa rodar em Windows, Linux, WSL e macOS, e ferramenta ausente deve produzir um aviso verdadeiro, nunca uma falha enganosa; e todo artefato feito para rodar na máquina de outra pessoa declara onde foi provado, onde só foi relatado e o que não foi medido.

## Por que existe
Portabilidade quebra de formas pequenas e repetidas. Exemplo: uma ferramenta de leitura de JSON ausente faz a verificação do commit concluir que há falha, e o git apresenta o problema como conflito de merge. Um caminho absoluto de binário num script de compilação trava a verificação no computador de quem não é o autor. Dois arquivos que diferem só por maiúsculas e minúsculas convivem no Linux, mas colidem no Windows. Um redirecionamento de saída escrito para o shell errado cria um arquivo chamado "null" na pasta de trabalho.

O segundo problema é a confiança sem medição. Exemplo: um instalador afirma no cabeçalho que funciona em qualquer máquina com git, mas só rodou em Linux. Os consertos acumulados, todos achados em Linux, dão aparência de maduro. No primeiro contato com Windows, um parceiro encontra dois defeitos da mesma família, suposição de POSIX: o caminho raiz do repositório vem numa forma e a comparação de prefixo usa outra, e a criação de link simbólico exige privilégio e, sem ele, o shell copia em silêncio em vez de falhar. A cópia perde a pasta de verificações, a verificação automática cai no modo fechado e bloqueia todo commit, numa máquina sem a fonte, para quem não consegue consertar.

Duas lições saem desse tipo de episódio. O instalador prova rodando, não existindo: perguntar se o arquivo existe e é executável não prova que ele faz o que promete. E mensagem de erro só manda fazer o que quem lê consegue fazer: mandar reinstalar com uma ferramenta que a máquina do outro, por desenho, não tem, não ajuda ninguém.

## O que muda na prática
- Nunca se grava caminho absoluto de uma máquina. A raiz do projeto vem de uma variável de ambiente; na falta dela, do repositório git; na falta de ambos, do diretório atual.
- Redirecionamentos de saída seguem a sintaxe do shell em uso. Prefere-se rodar em um shell de estilo Unix para usar o descarte padrão.
- Cada ferramenta usada nas verificações é classificada como obrigatória ou preferida, com alternativa explícita. Ausência não pode gerar mensagem enganosa.
- Toda mudança em arquivo de dependências passa por um pré-voo antes do commit: instalar, checar tipos e fazer um teste rápido do código afetado. Bibliotecas mudam o comportamento entre versões menores, e descobrir isso depois do commit contamina o rebase seguinte.
- Scripts chamam o executável pelo nome, e não por caminho absoluto.
- Dois caminhos versionados que diferem só por maiúscula ou minúscula são proibidos. A busca de duplicatas é uma linha de comando.
- O início de cada sessão sinaliza sinais de infraestrutura velha: relatórios desatualizados, disco quase cheio, rebase parado, marcadores de conflito versionados.
- Instalador, kit ou script feito para máquina alheia carrega no próprio arquivo uma frase de suporte com três listas: plataformas provadas, relatadas e "não medido". Plataforma não medida não entra na frase de suporte.
- O modo de falha da plataforma não medida vira teste simulável na que você tem: copiar em vez de linkar é uma linha de teste e custa meio segundo.
- Inferir suporte pela ausência de reclamação é proibido: ninguém reclamou porque ninguém usou.
- Quando um incidente previsto acontece, pergunte quantas portas o remédio fechou.

## Como adotar
1. Rode uma busca por caminhos absolutos de usuário no seu código e corrija um a um.
2. Liste as ferramentas das suas verificações e escreva a alternativa de cada uma.
3. Inclua o pré-voo de dependências no seu fluxo de commit.
4. Escreva "provado em, relatado em, não medido em" no topo do seu instalador.
5. Peça a alguém com outro sistema operacional, sem as suas ferramentas, que rode o fluxo uma vez e leia as mensagens de erro.
