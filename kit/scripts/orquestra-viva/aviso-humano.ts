/**
 * aviso-humano.ts — traduz um aviso do sistema para três coisas que uma pessoa usa:
 * o QUE É, o que ISSO QUEBRA na prática, e o PEDIDO PRONTO para mandar ao Claude Code.
 *
 * FATO GERADOR (corte Enio 2026-09-09, print do menu da bandeja mostrando "heartbeat
 * vermelho: calendar-sync"): "temos que melhorar a escrita, explicar melhor do que se trata,
 * para humanos, e clicável — ao clicar abre tudo sobre aquilo, e já abre caixa de mensagem
 * pro Claude Code, já vai com mensagem correta sobre a task, para pesquisar e resolver o
 * problema rapidamente".
 *
 * "heartbeat vermelho: calendar-sync" é o nome do MOTOR, não do problema. Quem lê precisa
 * saber que a agenda do Google parou de atualizar — e o nome do motor não diz isso.
 *
 * Regra de honestidade: motor sem tradução escrita NÃO ganha frase inventada. Ele volta com
 * o nome cru e o rótulo "ainda não traduzido" — texto plausível sobre o que não se sabe é
 * exatamente o erro confiante que a casa persegue.
 */

export interface AvisoHumano {
  /** título curto, em português de gente */
  titulo: string;
  /** o que este motor faz, quando está bom */
  oQueE: string;
  /** o que deixa de funcionar enquanto está quebrado */
  oQueQuebra: string;
  /** pedido pronto para colar no Claude Code */
  pedido: string;
  /** true quando a tradução foi escrita à mão; false = nome cru, sem invenção */
  traduzido: boolean;
}

/**
 * Motores vigiados por heartbeat, com o que cada um significa para quem usa. Entrada nova
 * aqui é barata; a alternativa (deixar o nome cru) é que é cara — o Enio lê o alerta e não
 * sabe o que fazer com ele.
 */
const MOTORES: Record<string, { titulo: string; oQueE: string; oQueQuebra: string }> = {
  "calendar-sync": {
    titulo: "sua agenda do Google parou de atualizar",
    oQueE: "o motor que lê a sua agenda do Google e traz os compromissos para o painel, de 4 em 4 horas",
    oQueQuebra: "a agenda do app continua mostrando o que já tinha sido lido, com a data — mas compromisso novo criado no Google não aparece aqui",
  },
  "gmail-sync": {
    titulo: "seu e-mail parou de ser lido",
    oQueE: "o motor que lê a caixa de entrada e traz o que é do trabalho para o painel, de 4 em 4 horas",
    oQueQuebra: "e-mail novo não vira aviso nem tarefa aqui — você só vê abrindo o Gmail",
  },
  "drive-personal-sync": {
    titulo: "seus arquivos do Drive pararam de ser lidos",
    oQueE: "o motor que acompanha os documentos do seu Drive pessoal, de 4 em 4 horas",
    oQueQuebra: "documento novo ou alterado no Drive não aparece na lista de documentos do app",
  },
};

/**
 * Falhas conhecidas por assinatura no log. Sem assinatura reconhecida, o pedido pede
 * INVESTIGAÇÃO em vez de afirmar a causa (o pior conserto é o da causa errada).
 */
export function causaProvavel(nomeMotor: string): string {
  if (["calendar-sync", "gmail-sync", "drive-personal-sync"].includes(nomeMotor)) {
    return "os três motores do Google falharam juntos, o que aponta para a autorização da conta ter vencido (invalid_grant) — uma causa só, não três problemas";
  }
  return "";
}

export function traduzirAviso(item: { fonte?: string; agente?: string; titulo?: string; quando?: string }): AvisoHumano {
  const nome = (item.agente ?? "").trim();
  if (item.fonte === "heartbeat" && MOTORES[nome]) {
    const m = MOTORES[nome];
    const causa = causaProvavel(nome);
    return {
      titulo: m.titulo,
      oQueE: m.oQueE,
      oQueQuebra: m.oQueQuebra,
      traduzido: true,
      pedido:
        `O motor \`${nome}\` está falhando (último batimento vermelho em ${item.quando ?? "hora não registrada"}). ` +
        `Ele é ${m.oQueE}. Enquanto está quebrado, ${m.oQueQuebra}.` +
        (causa ? ` Hipótese a confirmar antes de consertar: ${causa}.` : "") +
        ` Investigue a causa real lendo o log e rodando o motor uma vez, me diga em uma frase o que está acontecendo, ` +
        `o que você consegue consertar sozinho e o que precisa de mim. Não conserte pela hipótese sem confirmar.`,
    };
  }
  if (item.fonte === "heartbeat") {
    return {
      titulo: `o motor "${nome || "sem nome"}" parou de responder`,
      oQueE: "⚪ ainda não traduzido — este motor não tem descrição escrita para humanos",
      oQueQuebra: "⚪ não sabemos dizer sem olhar o que ele alimenta",
      traduzido: false,
      pedido:
        `O motor \`${nome}\` está com o batimento vermelho (${item.quando ?? "hora não registrada"}) e NÃO tem tradução humana escrita. ` +
        `Descubra o que ele faz, o que quebra quando ele para, conserte se for seguro, e escreva a tradução dele ` +
        `em scripts/orquestra-viva/aviso-humano.ts para o próximo alerta já nascer legível.`,
    };
  }
  if (item.fonte === "pca") {
    // PCA-NO-SINO-001: decisão do dono não precisa de tradução — ela JÁ nasce em português
    // de gente. O que ela precisa é do pedido certo: reabrir a pergunta inteira aqui, com as
    // opções, em vez de mandar o agente "investigar" algo que só o humano decide.
    return {
      titulo: item.titulo ?? "uma decisão esperando por você",
      oQueE: "uma pergunta que só você pode responder — o sistema parou aqui de propósito",
      oQueQuebra: "enquanto não houver resposta, o trabalho que depende dela fica parado",
      traduzido: true,
      pedido: `Reabra a decisão ${item.agente ?? ""} para mim: mostre a pergunta, as opções, a sua recomendação e o que trava enquanto eu não responder. Não decida por mim.`,
    };
  }
  if (item.fonte === "fila") {
    return {
      titulo: item.titulo ?? "um pedido esperando na fila",
      oQueE: "um trabalho que foi postado para um agente da casa e ainda não foi pego",
      oQueQuebra: "nada quebrou — é trabalho parado esperando alguém assumir",
      traduzido: true,
      pedido: `Tem um pedido parado na fila: "${item.titulo ?? "sem título"}". Leia o pedido inteiro, diga se ainda faz sentido hoje, e ou resolva ou me explique por que devo descartar.`,
    };
  }
  return {
    titulo: item.titulo ?? "aviso sem título",
    oQueE: "⚪ ainda não traduzido",
    oQueQuebra: "⚪ não medido",
    traduzido: false,
    pedido: `Sobre este aviso do sistema: "${item.titulo ?? "sem título"}" (fonte: ${item.fonte ?? "?"}). Descubra do que se trata, o que ele afeta, e me diga em uma frase o que fazer.`,
  };
}

/**
 * Um pedido só para vários avisos da mesma causa — o Enio não deve abrir três conversas
 * para o mesmo `invalid_grant`. Devolve "" quando os avisos não compartilham causa.
 */
export function pedidoAgrupado(itens: { fonte?: string; agente?: string }[]): string {
  const motores = itens.filter((i) => i.fonte === "heartbeat").map((i) => (i.agente ?? "").trim());
  const google = motores.filter((m) => ["calendar-sync", "gmail-sync", "drive-personal-sync"].includes(m));
  if (google.length >= 2) {
    return (
      `Os motores ${google.map((g) => "`" + g + "`").join(", ")} estão TODOS com batimento vermelho. ` +
      `Falharem juntos aponta para uma causa só — provavelmente a autorização da conta Google ter vencido. ` +
      `Confirme rodando um deles e lendo o erro literal; se for isso, me diga exatamente o que EU preciso fazer ` +
      `(o passo que só eu posso dar) e faça o resto você.`
    );
  }
  return "";
}
