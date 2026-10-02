# Núcleo selado e camada livre: cada usuário cuida do seu, o núcleo é auditável

## A regra em uma frase
Quando várias pessoas usam sua própria instância de um sistema governado, separe um núcleo protegido (as regras que dão confiança) de uma camada livre (preferências), sele o núcleo com verificação de integridade e prometa só o que a verificação pode sustentar: o núcleo é auditável, não inviolável.

## Por que existe
Cada vez mais gente usa assistentes de programação e quer personalizar o sistema. A dificuldade está em dar autonomia sem deixar a pessoa quebrar o que torna o resultado confiável. Quem tem acesso de administrador na própria máquina sempre consegue adulterar o que quiser. Selo, somente leitura e restauração automática detectam desvio acidental, provam a origem e deixam trilha, mas não impedem má-fé. Prometer "inviolável" seria vender uma garantia falsa.

## O que muda na prática
- Núcleo: motor determinístico, regras de citação, pontos de aprovação humana e testes de integridade. Fica fora do repositório de trabalho, assinado, com lista de resumos criptográficos conferida na execução. Se não bater, o sistema recusa rodar e avisa em voz alta.
- Camada livre: pesos, modelos de documento, prazos, tom. Edita-se à vontade, com validação de esquema antes de aplicar, cópia automática antes de cada edição e retorno com um comando.
- Fronteira limpa: a configuração que o usuário customiza vive em arquivo separado, fora do selo. Senão, qualquer ajuste quebraria a integridade.
- Restauração só sobre o que o selo cobre, nunca sobre a camada livre, e por pedido explícito, para não disputar com o usuário.
- Papéis dentro de uma instância: núcleo (ninguém edita), administrador (camada ampla, propõe mudança do núcleo), perfis estreitos (só as próprias preferências). Tentativa de quebra gera aviso ao responsável pelo núcleo.
- Contrato honesto escrito no README: "administrador malicioso está fora do escopo".

## Como adotar
1. Liste o que pertence ao núcleo e o que pertence ao usuário, e separe em arquivos.
2. Selo e verificação na inicialização, com falha visível.
3. Cópias antes de edição e validação de esquema.
4. Adie o circuito de propostas, notificações e aprovação assíncrona entre instâncias até haver várias instâncias customizando de verdade.
5. Para propor mudanças do núcleo, reuse a revisão de código com responsáveis designados em vez de construir um canal novo.
