export function splitAmount(total: number, count: number): number[] {
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, i) => {
    const cents = i === 0 ? baseCents + remainder : baseCents;
    return cents / 100;
  });
}
