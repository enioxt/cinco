# Troca justa — protocolo em estudo

> Estado: **CONCEPT** · versão documental inicial: 2026-10-05. Este diretório não cria obrigação financeira, sociedade, royalty nem direito automático. Ele descreve como o Cinco pode **observar contribuição, preservar proveniência, apoiar acordos humanos e aprender com resultados reais** sem transformar pessoas em score.

A visão humana está em [`../TROCA_JUSTA.md`](../TROCA_JUSTA.md). Aqui ficam as peças operacionais.

## O sistema em uma linha

**evidência → claim de contribuição → contexto/contraditório → proposta → acordo humano → resultado → revisão → aprendizado → nova política candidata**

A política nova nunca reescreve silenciosamente o passado. Recibo antigo só muda por **adendo explícito**, mantendo a versão anterior e quem concordou com a mudança.

## Arquivos

- [`PROTOCOLO.md`](PROTOCOLO.md) — unidade de contribuição, tipos de evidência, proveniência, contestação, reconhecimento e fluxo completo.
- [`SCHEMA.json`](SCHEMA.json) — contrato mínimo, legível por máquina, de um recibo de participação.
- [`RECIBO_EXEMPLO.json`](RECIBO_EXEMPLO.json) — exemplo 100% sintético; nenhuma pessoa ou valor real.
- [`EVALS.md`](EVALS.md) — como o mecanismo aprende sem autoalteração desgovernada e sem Goodhart virar regra econômica.
- [`ROADMAP.md`](ROADMAP.md) — fases, gates e critérios para sair de CONCEPT até uma capacidade federável.

## Leis desta camada

1. **Sem score geral da pessoa.** O sistema avalia claims, evidências, decisões e resultados; não atribui nota humana global.
2. **Fato, interpretação e acordo são campos diferentes.** Um commit pode provar que algo foi feito; não prova sozinho quanto aquilo vale economicamente.
3. **Evidência invisível também pode existir.** Mentoria, contexto, introdução, cuidado, julgamento e contribuição histórica entram como claims declarados/corroborados, não são apagados só porque não geraram log.
4. **Causalidade não é presumida.** “A ajudou B” é diferente de “sem A o resultado não existiria”. Contrafactuais ficam marcados como hipótese.
5. **A IA propõe; afetados decidem.** Nenhuma divisão, pagamento, cessão, publicação ou mudança de direito é automática.
6. **Discordar não apaga histórico.** Contestação adiciona estado e evidência; não reescreve o evento original.
7. **Privacidade por campo.** O recibo pode ter parte privada e uma projeção pública sanitizada.
8. **Aprender é versionar.** Toda melhoria de regra tem versão, evidência, eval, responsável, data, rollback e HITL.
9. **Métrica não vira alvo sem contramétrica.** Se um indicador puder induzir comportamento artificial, o sistema precisa procurar o efeito adverso antes de promover a regra.
10. **Profundidade antes de escala.** Validar em poucos trabalhos reais, com confiança e revisão posterior, antes de tentar transformar a rede inteira em mecanismo econômico.

## O que pode se autoaperfeiçoar

O sistema pode aprender a:

- descobrir contribuições que o formulário atual esquece;
- pedir evidência melhor e menos invasiva;
- reduzir campos que ninguém usa;
- detectar duplicidade de claims;
- distinguir autoria, execução, origem, revisão, infraestrutura, risco e manutenção;
- sugerir perguntas de contraditório;
- comparar alternativas de reconhecimento;
- prever onde o acordo tende a gerar disputa — como **alerta**, nunca como veredito;
- detectar categorias de contribuição sistematicamente invisibilizadas;
- melhorar sua própria régua com replay de casos anteriores;
- explicar por que uma política candidata parece melhor que a atual.

O sistema **não** pode, por autoaperfeiçoamento:

- alterar um acordo econômico já aceito;
- criar dívida moral;
- converter amizade em percentual;
- inferir consentimento;
- publicar informação privada;
- pagar, cobrar ou redistribuir valor;
- promover uma política que não foi testada e aprovada.

A meta não é construir “a fórmula justa”. É construir uma infraestrutura em que a justiça da troca fique **mais observável, discutível, corrigível e aprendível** a cada uso.