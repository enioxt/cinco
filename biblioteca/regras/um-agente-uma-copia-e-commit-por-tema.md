# Um agente, uma cópia de trabalho, um commit por tema

## A regra em uma frase
Quem escreve ao lado de outra janela ou de agentes em segundo plano trabalha numa cópia isolada, declara o que vai tocar, commita só os próprios arquivos e faz cada commit tratar de um único tema que caiba numa revisão curta.

## Por que existe
Duas janelas no mesmo diretório compartilham a mesma área de preparação do git. Quando uma marca um arquivo para commit, ele entra na área comum e o commit da outra o leva junto. O resultado: commits falhando, área de preparação contaminada, edições revertidas, ponteiro da branch em corrida, e um commit com mensagem sobre documentação carregando também código de segurança de outra frente.

Exemplo: numa equipe de três pessoas, uma deixa muitos arquivos soltos e roda de novo uma sincronização, e outra herda uma área de preparação cheia de arquivos que não eram dela. O problema não é velocidade, é que a sujeira de uma janela vira prejuízo da outra. Um caso parecido: um espelho de configuração copiado por cima da versão versionada derruba arquivos em silêncio, e a mensagem do commit diz que nada mudou.

Diffs gigantes, por sua vez, não são revisados, são aprovados por cansaço. Misturar documentação, segurança e regras num só commit torna impossível rastrear a origem de cada alteração ou desfazer só uma parte. A cura nunca foi usar menos agentes: é isolar cada um e combinar um protocolo de conversa entre eles.

## O que muda na prática
- Um agente que escreve, uma cópia de trabalho física (por exemplo, uma árvore extra do próprio git). Compartilha-se apenas a pasta global de configuração.
- Antes de escrever, o agente registra intenção e arquivos que vai tocar num arquivo de linhas que os outros leem para evitar colisão. A cada avanço, uma linha: quando, quem, qual commit, quais arquivos, qual intenção.
- Todo commit nomeia os arquivos que leva. Antes de commitar, confira o que está preparado e retire o que for alheio. Nada de "adicionar tudo" em agente em segundo plano.
- Um commit trata de um tema. A mensagem descreve o tema ("verificação de dados pessoais antes do commit"), nunca "vários ajustes". Se o diff não cabe numa revisão de poucos minutos, ele se divide antes de seguir.
- Uma checagem simples pode avisar quando há arquivos demais preparados e perguntar: é um tema só? Há arquivos sem relação? Uma regra do sistema está junto com código? Se sim, divida.
- Antes de uma mudança grande, limpe o estado: o que já está pronto vai para commit, para que o diff novo seja só o novo.
- Com agentes em paralelo, o agente não commita aos poucos. Uma pessoa ou coordenador consolida por tema no fim, depois que todos terminaram.
- Ninguém acumula trabalho sem commitar e enviar. Defina um teto de commits ainda não publicados e um teto de arquivos soltos fora do commit atual, que caiba no seu ritmo, e conte só o que não faz parte do commit corrente, para que sempre haja um caminho de progresso e nunca um impasse.
- Arquivos que concentram decisão (lista de tarefas, regras fundamentais) têm um único escritor por vez. Um lote longo e ininterrupto pode registrar um bloqueio explícito, com dono, hora e motivo, que expira sozinho.
- Zonas protegidas não se tocam sem aprovação. Apagamento em massa é motivo para parar e alertar.
- Uma cópia que sincroniza configuração entre máquinas registra de onde veio e se recusa a encolher um arquivo além de um limite razoável.
- A divergência entre intenção e realidade é medida, não presumida: some detectores simples (tarefa pendente já feita, documento que afirma o que o código não faz, capacidade declarada sem prova, colisão entre agentes) e acompanhe a proporção de itens coerentes.

## Como adotar
1. Ao abrir uma sessão, descubra se há outra viva no mesmo diretório. Se houver e os objetivos divergem, crie uma cópia isolada antes de editar.
2. Proíba `git add -A` e `git add .` para agentes. Use caminhos explícitos, e prepare por arquivo ou por trecho.
3. Defina o formato do arquivo de intenção e o do histórico (só de acréscimo, sem servidor).
4. Adicione uma conferência antes do commit que liste os arquivos preparados e, opcionalmente, um teto que caiba no seu ritmo.
5. Nunca use `git stash` em repositório compartilhado. Faça um commit provisório.
6. Divida PRs grandes em camadas (dados, lógica, interface) e evite deixar muitos arquivos modificados soltos na árvore.
7. Calcule a divergência periodicamente e publique num quadro único. Adie serviços novos até o protocolo provar valor: o mais barato é um arquivo lido por todos.
