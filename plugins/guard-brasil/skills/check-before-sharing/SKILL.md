---
name: check-before-sharing
description: Use this when the user wants to share, paste, publish, send, upload, or expose text that may contain Brazilian personal data. Do not use as a legal opinion or as a guarantee of perfect anonymization.
---

# Guard Brasil — revisar antes de compartilhar

## Objetivo

Ajudar a pessoa a reduzir exposição acidental de dados pessoais brasileiros sem transformar uma varredura técnica em parecer jurídico ou garantia de anonimização.

## Quando usar

Use quando a intenção for, por exemplo:

- “posso compartilhar este texto?”;
- “tire os dados pessoais antes de eu colar isso na IA”;
- “anonimize/mascare este relatório”;
- “tem CPF, telefone ou e-mail aqui?”;
- “prepare uma versão pública deste conteúdo”.

## Quando não usar

Não use para:

- afirmar conformidade LGPD completa;
- garantir anonimização irreversível;
- determinar base legal de tratamento sem análise jurídica própria;
- criar score de risco/periculosidade de uma pessoa;
- reidentificar alguém a partir de dados mascarados;
- substituir revisão humana em material sensível.

## Fluxo

1. **Defina o destino.** Pergunte apenas se o risco muda materialmente conforme o destino e isso ainda não estiver claro. Ex.: público na internet vs. documento interno autorizado.
2. **Prefira o MCP Guard Brasil quando disponível.** Use `guard_inspect` para revisão ampla; `guard_scan_pii` para varredura rápida; `guard_check_safe` para preflight de compartilhamento.
3. **Nunca invente resultado de scanner.** Se as ferramentas Guard não estiverem disponíveis, diga que o preflight automatizado não foi executado e faça somente revisão textual assistida.
4. **Separe três classes:**
   - detectado;
   - mascarado/proposto para remoção;
   - `não medido` / incerto.
5. **Não ecoe PII desnecessariamente.** Ao explicar o achado, prefira categoria e posição/contexto mínimo em vez do valor integral.
6. **Entregue a versão segura como rascunho.** A pessoa decide se publica/envia.
7. **Para ações externas, exija HITL.** Guard não publica, envia nem altera sistemas por conta própria.

## Formato mínimo de saída

- **Leitura:** seguro / precisa revisão / não foi possível concluir.
- **Detectado:** categorias, não uma lista desnecessária dos valores pessoais.
- **Versão mascarada:** quando solicitada e sustentada pela ferramenta/revisão.
- **Não medido:** resíduos ou limitações relevantes.
- **Próximo passo:** revisar, remover, confirmar ou compartilhar.

## Regra de verdade

Nunca converta ausência de detecção em “não há dado pessoal”. Use linguagem como:

> “A varredura não detectou PII nas categorias medidas; isso não garante ausência de dado pessoal fora dessas regras.”

Se `naoMedido` existir, ele deve ficar visível e não pode coexistir com uma afirmação absoluta de segurança.

## Privacidade operacional

- Não grave o texto bruto em logs deliberadamente.
- Não envie o texto para serviços adicionais sem necessidade e consentimento.
- Não inclua PII em telemetria, nomes de arquivo, URLs ou receipts.
- Se houver dúvida entre utilidade e minimização, minimize.
