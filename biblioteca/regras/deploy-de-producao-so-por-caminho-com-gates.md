# Deploy em produção só por um caminho com verificações automáticas

## A regra em uma frase
Nada vai para um ambiente com tráfego de cliente por cópia manual: o deploy passa por um roteiro que busca a configuração na fonte oficial, valida, faz backup, testa o resultado e desfaz sozinho se o teste falhar.

## Por que existe
Quando a publicação depende de alguém reconstruir o site na própria máquina, o erro é uma questão de tempo.

Exemplo: numa loja online, alguém reconstrói o site localmente sem as variáveis de ambiente do serviço e copia o resultado para produção. O pacote sai com a URL do banco de dados vazia, e o catálogo público passa a mostrar "nenhum produto encontrado" até alguém perceber. Não faltou cuidado individual. Faltaram controles que tornassem o erro impossível: fonte única de configuração, teste depois da publicação e volta automática.

## O que muda na prática
- A configuração vem da fonte oficial do ambiente, nunca do shell local. Quem constrói sem ela embute valor vazio em silêncio.
- As chaves são testadas contra o fornecedor antes do build, porque chave rotacionada e não atualizada é comum.
- Depois do build, verifica-se que o pacote contém os valores esperados. Se não contém, aborta antes de copiar.
- O estado atual é copiado como backup, para voltar rapidamente.
- O teste pós-deploy olha comportamento, não só o código 200. Um site pode responder 200 e estar vazio.
- Se o teste falha, o roteiro restaura o backup sem esperar uma pessoa.
- Mudança visual exige captura de tela em celular e desktop com o console limpo.
- Qualquer ato irreversível (migração destrutiva, troca de DNS, cobrança) continua exigindo decisão humana.

## Como adotar
1. Escreva um roteiro de deploy por aplicação com os passos acima.
2. Configure uma verificação automática que recuse qualquer cópia direta para o servidor fora desse roteiro.
3. Trate produção visível como zona protegida: tocar nela exige roteiro, confirmação e um teste que falha de forma visível.
4. Se decidir que algum canal sobe sozinho, registre por escrito o motivo (reversível, com verificação de saúde) e limite a exceção a esse canal.
