# EGOS — plugins e pacotes abertos

Este repositório é o espelho público dos plugins do [EGOS](https://egos.ia.br/portas/). Ele traz só os pacotes dos plugins, gerados a partir do repositório principal, que é privado. Cada atualização passa por varredura de segredo e de dado pessoal antes de chegar aqui.

## O que tem aqui

| Pasta | O que é | Como instalar |
|---|---|---|
| `packages/guard-brasil` | Biblioteca que acha e mascara dado pessoal brasileiro (CPF, CNPJ, RG, telefone, e-mail, placa) antes de o texto ir para uma IA | `npm install @egosbr/guard-brasil` ou `bun add @egosbr/guard-brasil` |
| `packages/guard-brasil-mcp` | O Guard Brasil como servidor MCP, para usar de dentro de um cliente de IA | `bunx @egosbr/guard-brasil-mcp` (precisa do Bun) |
| `packages/egosbr` | Liga o seu cliente de IA ao conector público do EGOS em um comando | `npx egosbr` ou `bunx egosbr` |
| `plugins/guard-brasil` | Plugin "Posso compartilhar isso?": confere o texto antes de você mandar | veja `plugins/guard-brasil/README.md` |
| `plugins/egos-publicador` | Plugin que transforma trabalho provado em post por canal, com revisão humana antes de publicar | veja `plugins/egos-publicador/skills/publish-proven-work/SKILL.md` |

O validador dos pacotes de plugin fica em `scripts/plugins/validate-plugin-packages.ts` (`bun scripts/plugins/validate-plugin-packages.ts`).

## Melhorar ou relatar erro

Abra uma issue em <https://github.com/enioxt/egos-plugins/issues>. Pull requests são lidos, mas a mudança aceita entra no repositório principal e volta para cá na próxima sincronização. Por isso, o histórico daqui não tem os commits de lá.

## Licença

MIT, a mesma de cada pacote (`license` no `package.json`). Veja `LICENSE`.

Faz parte do EGOS. Todas as portas de entrada estão em <https://egos.ia.br/portas/>.
