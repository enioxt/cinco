# Cada afirmação tem um nível de confiança, e captura ruim limita o teto

## A regra em uma frase
Toda afirmação em um documento formal é classificada como confirmada, inferida, hipótese ou pendente, e dado vindo de captura de baixa fidelidade, como transcrição automática ou leitura de imagem, nunca sobe a confirmada sem uma segunda fonte independente.

## Por que existe
Documentos formais gerados com ajuda de IA falham de duas maneiras: entram dados que ninguém verificou e entram dados que nunca existiram na origem. Transcrições automáticas erram nomes próprios; leituras de imagem erram dígitos. Se esses dados entram direto como fato, um erro de captura vira conclusão.

Exemplo: a transcrição de um áudio grafa um sobrenome de forma parecida, mas errada. Sem teto de confiança, o nome segue para o documento final como se fosse conferido.

Os quatro níveis são neutros de domínio e valem tanto para o agente classificar as próprias afirmações quanto para um documento classificar o que afirma. A modalidade de origem (transcrição, leitura de imagem, entrada direta, inferência, revisado por pessoa) é um campo separado: não é um nível, ela impõe um teto.

## O que muda na prática
- **Quatro níveis fixos, vocabulário fechado.** Confirmada exige duas ou mais fontes independentes, ou prova documental. Inferida é uma fonte forte mais raciocínio. Hipótese é plausível sem confirmação. Pendente exige ação. Texto livre no lugar da tag não vale.
- **Teto por modalidade.** Nome próprio saído de transcrição nunca vira confirmado sem fonte adicional. Dado transcrito e dado de fonte oficial não passam pela mesma régua só porque parecem claros.
- **Data do fato não é data do registro.** Quando o ano é incerto, entra como inferida com a justificativa.
- **Antes de gerar:** um checklist determinístico, sem IA, classifica os requisitos mínimos num semáforo. Crítico ausente é vermelho e bloqueia; aviso ausente é amarelo e fica registrado. Antes de iniciar ou retomar uma análise, inventarie a pasta inteira da fonte bruta: material não inventariado é material esquecido.
- **Listas fechadas** de fontes aceitas e de leis citáveis, versionadas, para que fonte inventada ou informal não passe por rastreável.
- **Depois de gerar:** cada identificador detectável por padrão (telefone, número de protocolo, código) é procurado nos dados de origem. Presente no texto e ausente na fonte é erro que bloqueia a publicação e devolve o trecho para revisão humana, nunca é consertado sozinho. Para mídia, o resumo criptográfico do arquivo inserido precisa casar com o índice da fonte; se não casar, o item é marcado como recorte, com justificativa. (A conferência do texto gerado contra a fonte é desenvolvida na regra de texto gerado que cruza com a fonte.)
- **Remoção com rastro.** Remover uma afirmação antes do ato final preserva o texto riscado, com motivo, autor e data. Toda edição gera uma entrada auditável antes de ser aplicada, e o agente lê o histórico antes de reincluir algo já decidido.
- **A correção humana vira aprendizado:** o que estava errado e por quê é guardado e volta na próxima geração.

## Como adotar
1. Defina os quatro níveis, a lista de modalidades de origem e o teto por modalidade.
2. Marque cada afirmação do documento com nível e modalidade.
3. Escreva as pré-condições do seu documento como funções simples que devolvem verde, amarelo ou vermelho, e rode-as antes do modelo.
4. Bloqueie a promoção a confirmada quando a única fonte é de baixa fidelidade.
5. Depois da geração, extraia identificadores com expressões regulares e confira-os contra os dados de entrada.
6. Guarde as correções humanas num arquivo de aprendizados e leia-o antes de gerar de novo; substitua remoção por riscado.
