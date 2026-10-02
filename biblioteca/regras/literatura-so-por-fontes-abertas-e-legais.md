# Literatura científica só por fontes abertas e legais

## A regra em uma frase
Agentes que buscam artigos acadêmicos usam apenas fontes de acesso aberto, falham de forma visível quando não encontram e registram os metadados com esquema declarado.

## Por que existe
Quem opera um sistema que busca literatura não deve assumir exposição legal desnecessária. Um resolvedor de versões abertas, um catálogo bibliográfico aberto, um servidor de preprints e um registro de identificadores entregam o conhecimento na mesma medida pelas versões abertas. Conhecimento livre e conformidade legal não são escolhas excludentes.

A segunda razão da regra é técnica. Funções de resolução, download e extração de texto costumam ser escritas como esboços que engolem erro e devolvem vazio, e o sistema segue como se tivesse funcionado. É o mesmo padrão dos esboços de conformidade que passam pelo teste sem fazer nada.

## O que muda na prática
- A cadeia de busca é fixa e aberta: resolvedor, catálogo, preprints, registro de identificadores. Nada fora dela entra no repositório nem nas habilidades versionadas.
- Pesquisa pessoal com outras fontes, se existir, fica local e fora do controle de versão, nunca em código ou material público.
- Paywall, erro 404 ou ausência de versão aberta geram exceção diagnóstica clara. Retorno vazio silencioso e mock são proibidos.
- Um teste de ponta a ponta serve de avaliação: resolve ao menos uma fonte, entrega um PDF válido e extrai um mínimo de texto que você define. Se falhar, o pipeline recusa a mudança.
- Metadados de artigos ficam em tabelas com tipos declarados, nunca em JSON solto. Acesso a cache e logs é restrito a papéis autenticados, e toda carga termina com uma contagem feita com a chave pública para provar que a leitura funciona.

## Como adotar
1. Liste de onde vem hoje o seu texto científico e marque o que não é aberto.
2. Substitua por um resolvedor de acesso aberto e um catálogo aberto, na ordem que preferir.
3. Faça cada etapa lançar erro com a causa em vez de devolver lista vazia.
4. Escreva um teste com um identificador conhecido que prove as três condições acima.
5. Mantenha o teste no fluxo de integração contínua.
