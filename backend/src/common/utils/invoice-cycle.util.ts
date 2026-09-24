export interface InvoiceCycle {
  month: number;
  year: number;
}

export function computeInvoiceCycle(purchaseDate: Date, closingDay: number): InvoiceCycle {
  const day = purchaseDate.getDate();
  let month = purchaseDate.getMonth() + 1;
  let year = purchaseDate.getFullYear();

  if (day > closingDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return { month, year };
}

export function addCycles(cycle: InvoiceCycle, n: number): InvoiceCycle {
  const totalMonths = cycle.month - 1 + n;
  const year = cycle.year + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12 + 1;
  return { month, year };
}

export function compareCycles(a: InvoiceCycle, b: InvoiceCycle): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}
