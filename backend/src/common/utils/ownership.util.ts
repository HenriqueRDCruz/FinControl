import { NotFoundException } from '@nestjs/common';

/**
 * PADRAO DE AUTORIZACAO POR USUARIO — usar em TODOS os modulos de negocio.
 * Toda query de leitura/atualizacao/exclusao de uma entidade privada DEVE
 * incluir userId vindo de @CurrentUser() (nunca de params/body) no where.
 * Resposta e sempre 404, nunca 403.
 */
export function assertFound<T>(value: T | null | undefined, message: string): T {
  if (!value) {
    throw new NotFoundException(message);
  }
  return value;
}
