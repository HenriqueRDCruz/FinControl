import { Decimal } from '@prisma/client/runtime/library';

export function toPlainDecimal<T extends Record<string, unknown>>(
  entity: T,
  fields: (keyof T)[],
): T {
  const result = { ...entity };
  for (const field of fields) {
    const value = result[field];
    if (value instanceof Decimal) {
      result[field] = value.toNumber() as T[keyof T];
    }
  }
  return result;
}

export function toPlainDecimalList<T extends Record<string, unknown>>(
  entities: T[],
  fields: (keyof T)[],
): T[] {
  return entities.map((entity) => toPlainDecimal(entity, fields));
}
