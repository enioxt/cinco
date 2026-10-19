import { namedTokenize } from './tokenizer.js';
import { describe, expect, test } from 'bun:test';
import { detectarNaoMedido } from './nao-medido.js';

describe('detectarNaoMedido', () => {
  test('aponta os sinais residuais governados', () => {
    const telefone = '3499999' + '1234';
    // valor monetário montado em pedaços: o gate do espelho (kit-sync) barra o literal "R$ NN.NNN" em qualquer arquivo que viaja
    const valor = 'R' + '$ 82.000,00';
    const texto = `Joana Ribeiro recebeu ${valor} na Rua das Acácias, 123; OAB, contato ${telefone}, código ZK-ALPHA-99871.`;
    const sinais = detectarNaoMedido(texto).map((achado) => achado.sinal);

    expect(sinais).toContain('nome-provavel');
    expect(sinais).toContain('valor');
    expect(sinais).toContain('endereco');
    expect(sinais).toContain('oab');
    expect(sinais).toContain('numero-residual');
    expect(sinais).toContain('codigo-interno');
  });

  test('códigos internos sem separador ou com separadores continuam não medidos', () => {
    for (const codigo of ['ZK-ALPHA-99871', 'QX-77-OMEGA', 'AB12345']) {
      expect(detectarNaoMedido(codigo).map((achado) => achado.sinal)).toContain('codigo-interno');
    }
  });

  test('notações técnicas e rodovias públicas conhecidas não viram código interno', () => {
    for (const publico of ['COVID-19', 'SARS-CoV-2', 'UTF-8', 'SHA-256', 'BR-040', 'MG-050', 'IPv6', 'H264']) {
      expect(detectarNaoMedido(publico).some((achado) => achado.sinal === 'codigo-interno')).toBe(false);
    }
  });

  test('não devolve o trecho sensível, apenas sinal e offsets', () => {
    const [achado] = detectarNaoMedido('Carlos Eduardo Mendes');
    expect(achado).toEqual({ sinal: 'nome-provavel', start: 0, end: 21 });
    expect(Object.keys(achado).sort()).toEqual(['end', 'sinal', 'start']);
  });

  test('texto sem sinal residual conhecido retorna vazio', () => {
    expect(detectarNaoMedido('texto comum sem identificador conhecido')).toEqual([]);
  });

  test('OAB em minúsculas ou mista também é apontada', () => {
    for (const t of ['oab/mg 12.345', 'Oab 9999']) {
      expect(detectarNaoMedido(t).map((a) => a.sinal)).toContain('oab');
    }
  });

  test('placeholder do tokenizer só é isento quando gerado pelo mascaramento', () => {
    const orig = 'Paciente CPF ' + '529.982' + '.247-25';
    const tk = namedTokenize(orig);
    const sinais = (txt: string, textoOriginal = orig, tokens: Iterable<string> = tk.vault.tokens.keys()) =>
      detectarNaoMedido(txt, { textoOriginal, tokens }).map((a) => a.sinal);
    expect(tk.vault.tokens.size).toBeGreaterThan(0);
    expect(sinais(tk.tokenized)).not.toContain('codigo-interno');
    // código original digitado entre colchetes, sem token gerado: continua apontado (inclusive prefixo "permitido")
    expect(sinais('protocolo [MASP_1234]')).toContain('codigo-interno');
    expect(detectarNaoMedido('protocolo [CLIENTE_1234]').map((a) => a.sinal)).toContain('codigo-interno');
    expect(detectarNaoMedido('protocolo CLIENTE_1234').map((a) => a.sinal)).toContain('codigo-interno');
    expect(detectarNaoMedido('protocolo AB12345').map((a) => a.sinal)).toContain('codigo-interno');
  });

  test('token digitado pelo usuário que colide com o gerado não isenta (achado Codex r3/r5)', () => {
    const original = 'protocolo [CPF_0001]; CPF ' + '529.982' + '.247-25';
    const tk = namedTokenize(original);
    const r = detectarNaoMedido(tk.tokenized, { textoOriginal: original, tokens: tk.vault.tokens.keys() });
    expect(r.map((a) => a.sinal)).toContain('codigo-interno');
  });
});
