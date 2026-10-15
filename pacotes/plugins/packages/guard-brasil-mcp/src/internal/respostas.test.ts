import { describe, expect, test } from "bun:test";
import { GuardBrasil } from "../../../guard-brasil/src/index.js";
import { respostaCheckSafe, respostaInspect, respostaScan } from "./respostas.js";
import { CASOS_ADVERSARIAIS, CASOS_LIMPOS, CASOS_NER, CPF_TESTE, type CasoAdversarial } from "./casos-adversariais.js";

const guard = GuardBrasil.create({ telemetry: false });

/** Protegido = nada de `vaza` sobra no mascarado, OU o check recusou com nao-medido. */
function protegido(c: CasoAdversarial): boolean {
  const insp = respostaInspect(guard, c.texto);
  const check = respostaCheckSafe(guard, c.texto);
  const limpo = c.vaza.every((v) => !(insp.textoMascarado ?? c.texto).includes(v));
  return limpo || (check.safe === false && check.motivo === "nao-medido");
}

describe("PCA-332 — corpus adversarial: nunca 🟢 com dado vazando", () => {
  for (const c of CASOS_ADVERSARIAIS) {
    test(c.id, () => {
      expect(protegido(c)).toBe(true);
      expect(respostaCheckSafe(guard, c.texto).safe).toBe(false);
    });
  }
});

describe("PCA-332 — regras de nome A–J ligadas no inspect", () => {
  for (const c of CASOS_NER) {
    test(c.id, () => {
      const insp = respostaInspect(guard, c.texto);
      // NER tem de MASCARAR (não só cair em nao-medido): o nome some do texto devolvido.
      for (const v of c.vaza) expect(insp.textoMascarado).not.toContain(v);
      expect(insp.findings.some((f) => f.type === "name")).toBe(true);
    });
  }
  test("nerRules:false volta ao padrão só-rótulo (o liga/desliga é real)", () => {
    // nomes:false também: o detector de nome em texto livre (0.3.0) mascararia "Carlos Alberto Souza" por conta própria.
    const off = GuardBrasil.create({ telemetry: false, nerRules: false, nomes: false });
    expect(off.inspect("Testemunha: Carlos Alberto Souza").output).toContain("Carlos Alberto Souza");
  });
});

describe("PCA-332 — texto limpo passa (o gate não pode barrar tudo)", () => {
  for (const t of CASOS_LIMPOS) {
    test(t, () => {
      const check = respostaCheckSafe(guard, t);
      expect(check).toMatchObject({ safe: true, canShare: true, motivo: "limpo" });
      expect(respostaInspect(guard, t).textoMascarado).toBe(t);
    });
  }
});

describe("PCA-332 — contrato do MCP", () => {
  test("inspect devolve textoMascarado; mask:false não devolve", () => {
    expect(respostaInspect(guard, `CPF ${CPF_TESTE}`).textoMascarado).not.toContain(CPF_TESTE);
    expect(respostaInspect(guard, `CPF ${CPF_TESTE}`, false)).not.toHaveProperty("textoMascarado");
  });
  test("scan devolve textoMascarado e hasName", () => {
    const r = respostaScan(guard, "Testemunha: Carlos Alberto Souza");
    expect(r.hasName).toBe(true);
    expect(r.textoMascarado).not.toContain("Carlos");
  });
  test("check_safe com PII classificada: pii-detectada, não nao-medido", () => {
    expect(respostaCheckSafe(guard, `CPF ${CPF_TESTE}`).motivo).toBe("pii-detectada");
  });
  test("resposta nao-medido não ecoa o trecho (só o sinal)", () => {
    // Nome que o Guard NÃO reconhece (prenome fora do top 500 do IBGE, sobrenomes fora do léxico): é aqui que o nao-medido vale.
    const r = respostaCheckSafe(guard, "Na audiência, Zuleide Fagundes Pimenteira declarou");
    expect(JSON.stringify(r)).not.toContain("Zuleide");
    expect(r.naoMedido).toContain("nome-provavel");
  });
});

// GUARD-RESIDUO-001 (2026-10-14). VERMELHO-ANTES: os 3 códigos abaixo saíam naoMedido:[] e safe:true.
describe("resíduo com cara de código interno → nao-medido, nunca safe:true", () => {
  for (const texto of [
    "Identificador interno ZK-ALPHA-99871 pertence ao cadastro reservado do setor.",
    "Código privado não padronizado: QX-77-OMEGA.",
    "Matrícula do sistema AB12345 consta na planilha.",
  ]) {
    test(texto, () => {
      const insp = respostaInspect(guard, texto);
      const check = respostaCheckSafe(guard, texto);
      expect(insp.naoMedido).toContain("codigo-interno");
      expect(check.safe).toBe(false);
      expect(check.canShare).toBe(false);
      expect(check.motivo).toBe("nao-medido");
    });
  }
  // Notação pública conhecida não é código interno (sem regressão de falso positivo).
  for (const texto of [
    "A BR-040 e a MG-050 estão em obras; vacina contra COVID-19 disponível.",
    "Arquivo em UTF-8 com hash SHA-256 e padrão ISO 27001.",
    "O 5G chegou e o Windows x64 também.",
  ]) {
    test(`não aponta: ${texto}`, () => {
      expect(respostaInspect(guard, texto).naoMedido).not.toContain("codigo-interno");
    });
  }
});
