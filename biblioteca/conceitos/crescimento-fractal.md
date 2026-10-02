# Crescimento fractal: do rascunho ao módulo independente

**O que é:** uma ideia de como um módulo de software amadurece em quatro fases, da semente solta até virar um sistema próprio com responsável próprio. É um desenho conceitual, usado como critério de decisão, não um protocolo implementado.

## As quatro fases

### 1. A semente
Scripts soltos, rascunhos em HTML, APIs improvisadas. Mora em lugar descartável. A pergunta única: isso convence uma pessoa que importa? Se não convence, morre barato.

### 2. O broto
A semente foi aceita e ganha integração formal dentro de um projeto que já existe: rotas, páginas, funções. Passa a ter responsável e testes.

### 3. A raiz funda
O módulo começa a pedir atenção desproporcional. Tem usuários próprios ou processos independentes, e a infraestrutura compartilhada já não aguenta o seu ritmo.

### 4. A emancipação
O módulo se separa do núcleo no dia a dia, mas mantém as regras de governança que herdou. Ganha endereço, banco e servidores próprios, e passa a ser mantido por uma pessoa responsável por ele.

## Por que começar na fase 1 de propósito

Hospedar uma página estática simples não é esconder a aplicação. É colocá-la de propósito na fase de semente, para reduzir risco e não sujar o núcleo complexo, sob as mesmas regras de governança.

## Estado

Conceito. Serve como critério para decidir onde cada coisa deve morar, e não descreve nenhuma implementação.
