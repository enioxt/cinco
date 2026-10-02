# Paridade entre o que existe e o que está registrado

## A regra em uma frase
Tudo o que entra no repositório como pacote, aplicativo ou habilidade precisa aparecer no registro de capacidades, e a verificação também confere a qualidade da entrada, não só a existência dela.

## Por que existe
Quando o inventário do disco e o registro de capacidades são mantidos à mão, eles divergem: itens existem sem registro, e nenhuma entrada carrega data de verificação. Uma checagem que olha só um padrão estreito de nomes deixa o resto passar, e uma checagem que aponta para uma pasta que mudou de lugar fica morta sem que ninguém note.

Mesmo com a checagem de existência funcionando, sobra um furo: ela confere se o nome está no registro, mas não olha o estado da entrada. Um item marcado como "não verificado" passa como se estivesse em dia. Existência provada não é qualidade provada.

## O que muda na prática
- Uma verificação dedicada, com uma responsabilidade só, em vez de estender a antiga e misturar assuntos. Isso facilita revisar, desativar e testar isoladamente.
- A verificação barra apenas adições novas. O passivo antigo aparece como aviso numa varredura de auditoria.
- Os itens antigos entram numa lista de carência com prazo. Passada a data, qualquer divergência passa a bloquear.
- Um modo opcional de qualidade exige que o estado da entrada seja "verificado" ou "parcial".
- A passagem para modo sempre rígido só acontece depois de migrar os formatos antigos, promover ou rebaixar os não verificados e observar um período em modo não bloqueante.

## Como adotar
1. Conte o que existe no disco e o que está no registro. A diferença é o seu ponto de partida.
2. Escreva uma verificação pequena que olhe só os arquivos novos do commit e procure o nome de cada um no registro.
3. Liste o passivo numa carência com data e responsável, e agende o dia em que a carência acaba.
4. Quando a existência estiver estável, acrescente a checagem de estado, primeiro como aviso.
5. Confira de vez em quando se cada verificação ainda aponta para algo que existe.
