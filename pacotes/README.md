# pacotes

Código aberto do EGOS que antes morava em repositórios separados. Cada pasta trouxe o histórico do repositório de origem (`git log -- pacotes/<pasta>`); o repositório antigo ficou arquivado no GitHub, só para leitura, com um aviso apontando para cá.

| pasta | veio de | como se atualiza |
|---|---|---|
| `plugins/` | github.com/enioxt/egos-plugins | **gerada**: o espelho do EGOS escreve aqui a partir do núcleo, com varredura de segredos e de termos reservados antes de cada envio. Não edite à mão; peça melhoria em issue. |
| `radio-philein/` | github.com/enioxt/radio-philein | à mão, por pull request. Ao vivo em cinco.ia.br/radio. |
| `egos-governance-skill/` | github.com/enioxt/egos-governance-skill | à mão, por pull request. |
| `anonimizador/` | github.com/enioxt/guard-brasil-skill (`tools/anonimizador-offline/`, arquivado) | à mão, por pull request. Cópia do estado final, **sem histórico** (o histórico antigo tem documentos internos). Ferramenta de arquivo único que roda offline; a página do Anonimizador no egos.ia.br aponta para cá. |
| `egos-semente/` | github.com/enioxt/egos-semente (`PANORAMA.md` e `prompts/ORQUESTRADOR.md`) | à mão, por pull request. Só estes dois arquivos, como cópia do estado final, **sem histórico**; o resto do repositório de origem não é público. O `PANORAMA.md` é gerado no núcleo privado: mudança de conteúdo entra lá. |

Licença: a de cada pasta (arquivo `LICENSE` dentro dela); na falta, a do cinco.
