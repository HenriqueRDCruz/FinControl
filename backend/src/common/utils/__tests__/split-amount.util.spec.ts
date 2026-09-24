import { splitAmount } from '../split-amount.util';

describe('splitAmount', () => {
  it('divide um valor exato igualmente', () => {
    expect(splitAmount(100, 2)).toEqual([50, 50]);
  });

  it('coloca o resto de arredondamento na primeira parcela e a soma bate com o total', () => {
    const result = splitAmount(100, 3);
    expect(result).toEqual([33.34, 33.33, 33.33]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
  });

  it('funciona com 1 parcela (compra a vista no cartao)', () => {
    expect(splitAmount(250.5, 1)).toEqual([250.5]);
  });

  it('funciona com valores que ja tem centavos', () => {
    const result = splitAmount(99.97, 4);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 100) / 100).toBe(99.97);
  });
});
