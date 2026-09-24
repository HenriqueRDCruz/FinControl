import { computeInvoiceCycle, addCycles, compareCycles } from '../invoice-cycle.util';

describe('computeInvoiceCycle', () => {
  it('compra NO dia de fechamento entra na fatura do mes corrente', () => {
    expect(computeInvoiceCycle(new Date(2026, 7, 10), 10)).toEqual({ month: 8, year: 2026 });
  });

  it('compra ANTES do fechamento entra na fatura do mes corrente', () => {
    expect(computeInvoiceCycle(new Date(2026, 7, 5), 10)).toEqual({ month: 8, year: 2026 });
  });

  it('compra DEPOIS do fechamento entra na fatura do mes seguinte', () => {
    expect(computeInvoiceCycle(new Date(2026, 7, 15), 10)).toEqual({ month: 9, year: 2026 });
  });

  it('vira o ano corretamente quando a compra e em dezembro apos o fechamento', () => {
    expect(computeInvoiceCycle(new Date(2026, 11, 20), 10)).toEqual({ month: 1, year: 2027 });
  });
});

describe('addCycles', () => {
  it('avanca meses dentro do mesmo ano', () => {
    expect(addCycles({ month: 8, year: 2026 }, 2)).toEqual({ month: 10, year: 2026 });
  });

  it('vira o ano ao avancar alem de dezembro', () => {
    expect(addCycles({ month: 11, year: 2026 }, 3)).toEqual({ month: 2, year: 2027 });
  });

  it('n = 0 retorna o mesmo ciclo', () => {
    expect(addCycles({ month: 5, year: 2026 }, 0)).toEqual({ month: 5, year: 2026 });
  });
});

describe('compareCycles', () => {
  it('detecta ciclo anterior, igual e posterior', () => {
    expect(compareCycles({ month: 1, year: 2026 }, { month: 2, year: 2026 })).toBeLessThan(0);
    expect(compareCycles({ month: 2, year: 2026 }, { month: 2, year: 2026 })).toBe(0);
    expect(compareCycles({ month: 1, year: 2027 }, { month: 12, year: 2026 })).toBeGreaterThan(0);
  });
});
