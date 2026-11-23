import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../strategies/jwt.strategy';

describe('JwtStrategy', () => {
  const payload = { sub: 'u1', email: 'ana@exemplo.com', type: 'access' as const };
  let users: { findById: jest.Mock };
  let strategy: JwtStrategy;

  beforeEach(() => {
    users = { findById: jest.fn().mockResolvedValue({ id: 'u1', email: 'ana@exemplo.com' }) };
    const config = { getOrThrow: jest.fn().mockReturnValue('segredo-de-teste') };
    strategy = new JwtStrategy(config as unknown as ConfigService, users as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('confirma o usuario no banco na primeira vez', async () => {
    await expect(strategy.validate(payload)).resolves.toEqual({ userId: 'u1', email: 'ana@exemplo.com' });
    expect(users.findById).toHaveBeenCalledTimes(1);
  });

  it('nao volta ao banco a cada requisicao dentro do periodo de cache', async () => {
    await strategy.validate(payload);
    await strategy.validate(payload);
    await strategy.validate(payload);
    expect(users.findById).toHaveBeenCalledTimes(1);
  });

  it('volta ao banco depois que o cache expira', async () => {
    const now = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    await strategy.validate(payload);

    nowSpy.mockReturnValue(now + 61_000);
    await strategy.validate(payload);

    expect(users.findById).toHaveBeenCalledTimes(2);
  });

  it('recusa usuario que nao existe mais e nao o guarda em cache', async () => {
    users.findById.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.findById).toHaveBeenCalledTimes(2);
  });

  it('recusa token que nao e de acesso', async () => {
    await expect(strategy.validate({ ...payload, type: 'refresh' as never })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users.findById).not.toHaveBeenCalled();
  });
});
