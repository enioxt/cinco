# Policy Candidate — template

> Uma policy-candidate é uma proposta de melhorar **o mecanismo**. Não altera recibos antigos, não muda pagamento e não vira regra só porque a IA sugeriu.

**ID:** TJ-POL-___  
**Estado:** EXPERIMENTAL / CANDIDATE / PILOT / ADOPTED / REJECTED / DEPRECATED  
**Criada em:**  
**Origem:** qual receipt/learning receipt/benchmark gerou a hipótese?  
**Policy atual:**  
**Versão proposta:**  

## 1. Achado observado

**O que aconteceu:**  

**Universo/denominador:** em quantos casos vimos isso?  

**Evidências:**  

**O que permanece NÃO-MEDIDO:**  

Sem denominador ou sem caso reproduzível, normalmente o output deve ser “pergunta para próxima rodada”, não policy.

## 2. Hipótese de melhoria

**Mudança proposta:**  

**Por que esperamos melhora:**  

**Qual problema ela NÃO tenta resolver:**  

## 3. Pessoas e direitos afetados

Esta mudança toca:

- [ ] dinheiro/divisão
- [ ] autoria
- [ ] privacidade
- [ ] consentimento
- [ ] visibilidade pública
- [ ] retenção/apagamento
- [ ] apenas UX/perguntas
- [ ] outro: 

Mudança material em dinheiro, autoria, privacidade ou consentimento exige HITL explícito e régua mais alta.

## 4. Goodhart / gaming

**Qual métrica ou comportamento a policy influencia?**  

**Como alguém racional poderia otimizar a métrica sem melhorar o propósito?**  

**Contramétrica / checagem qualitativa:**  

**Sinal de regressão:**  

## 5. Viés de observabilidade

A policy favorece quem deixa mais rastros digitais?

- [ ] checado off-platform
- [ ] checado ensino/mentoria anterior
- [ ] checado erro evitado
- [ ] checado coordenação/cuidado
- [ ] checado manutenção pós-entrega
- [ ] checado contribuição histórica

**Lacunas:**  

## 6. Privacidade e segurança

**Novos dados coletados:**  
**São necessários?**  
**Podem ficar locais?**  
**Projeção sanitizada:**  
**Risco de egress:**  
**Rollback de dados:**  

## 7. Evals

### Goldens afetados

- G__:

### Replay

**Casos anteriores usados:**  
**Holdout/independência:**  
**Policy atual produziu:**  
**Policy candidata produziu:**  

### Resultado

| dimensão | atual | candidata | leitura |
| --- | --- | --- | --- |
| cobertura |  |  |  |
| claims errados |  |  |  |
| ausentes |  |  |  |
| contestação |  |  |  |
| fricção |  |  |  |
| privacidade |  |  |  |
| gaming/contramétrica |  |  |  |
| estabilidade pós-resultado |  |  |  |

## 8. Crítica independente

**Revisor/modelo/pessoa independente:**  
**Principal objeção:**  
**Foi respondida como:** aceita / mitigada / não resolvida  

## 9. Decisão

- [ ] ADOPT
- [ ] ADAPT
- [ ] REJECT
- [ ] DEFER — falta evidência

**Decidido por:**  
**Data:**  
**Justificativa:**  

Agente não marca decisão humana em nome da pessoa.

## 10. Implantação

**Versão efetiva:**  
**Gatilho de ativação:**  
**Changelog:**  
**Migração necessária:**  
**Receipts antigos:** permanecem intactos / outro (explicar)  

## 11. Rollback

**Como voltar à policy anterior:**  
**Que dados/artefatos precisam ser preservados:**  
**Qual sinal dispara rollback:**  

## 12. Revisão futura

**Revisar quando:** número de novos casos / tipo de incidente / data apenas se necessária  
**Pergunta de revisão:**  

Uma policy sem revisão e rollback vira dogma; uma policy que se autoativa vira autoridade não consentida.