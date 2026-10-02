# Prova de governança sem token: confiança que se verifica

**O que é:** uma conclusão de pesquisa sobre quando blockchain ajuda a provar que regras e decisões existiam e não foram alteradas, e por que, para governança, a resposta mais simples dispensa uma moeda própria. É recomendação de desenho, não produto.

## A tese

Confiança não se promete, se prova. Na prática: a própria resposta de um sistema carrega a prova (cita a fonte, a regra é código, a capacidade tem teste), em vez de a confiança ser representada por um ativo especulativo.

## O que blockchain acrescenta de verdade

Sobre o que já se tem de graça, só duas coisas:

1. **Remover o operador confiável:** uma cadeia pública não tem uma parte única que possa ser coagida ou cair.
2. **Não repúdio entre organizações** que desconfiam umas das outras e não compartilham uma autoridade certificadora.

Autoria, integridade, tempo e imutabilidade já vêm de commits assinados, registros de transparência e atestações de cadeia de suprimentos, a custo próximo de zero.

## O que se recomenda

Uma camada fina de procedência de governança, sem token, começando pelo que é gratuito:

- **âncora de tempo** do hash das regras, em cadeia pública, agrupando muitos hashes numa transação;
- **atestações assinadas** para decisões de rotina, e cadeia só para checkpoints de alto risco, quando um verificador externo concreto exigir;
- **armazenamento permanente** só para o que precisa ser permanente;
- **commits assinados e registro de transparência** como base.

Descartam-se um token negociável em governança e um explorador de cadeia próprio.

### A menor coisa que prova valor

Pegar um único objeto de governança (por exemplo, um registro de capacidades), gerar uma versão canônica, calcular o hash e ancorá-lo de mais de uma forma: commit assinado, registro de transparência, âncora de tempo e arquivo de prova guardado junto. Depois, um comando de verificação que qualquer pessoa roda e que reproduz as checagens.

## Quatro camadas de dado

A sensibilidade diminui e a permanência aumenta:

1. **Janela de contexto da IA:** raciocínio vivo, efêmero, nunca persiste cru.
2. **Memória operacional fora da cadeia:** documentos e bancos; pode conter dado pessoal, e por isso passa por varredura.
3. **Camada de prova:** só hashes, manifestos e atestações. Nunca conteúdo.
4. **Camada pública:** identificador da prova, data, versão, hash e link de verificação. Zero dado pessoal.

A varredura de dado pessoal roda na fronteira entre as camadas 2 e 3. Se houver dado pessoal no que seria hasheado, bloqueia. Ancora-se só o hash, nunca o corpo, o que preserva o direito ao esquecimento.

## A confiança real vem de verificação em código

Nenhuma destas peças depende de blockchain:

- **Validador pós-geração:** regras que detectam, nas respostas de IA, afirmações absolutas sem ressalva, dado fabricado, promessa de ação que o sistema não pode cumprir e siglas inventadas.
- **Cadeia de evidência:** cada resposta carrega a origem de cada afirmação (ferramenta, documento, cálculo, fato conferido por humano, inferência), com nível de confiança. É código que carrega a própria prova.
- **Varredura de dado pessoal** como portão obrigatório antes de qualquer hash ou âncora.

## O resumo honesto

Confiança como código: Git, assinatura e âncora de tempo gratuita, sem token. Qualquer dado sensível passa por aprovação humana antes de tocar qualquer âncora.
