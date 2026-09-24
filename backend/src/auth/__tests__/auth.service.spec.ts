import { Test } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as hashUtil from '../../common/utils/hash.util';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    refreshToken: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    emailVerificationToken: { create: jest.Mock };
    passwordResetToken: { findUnique: jest.Mock; create: jest.Mock };
    user: { update: jest.Mock };
    $transaction: jest.Mock;
  };
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock; create: jest.Mock; toPublic: jest.Mock };

  beforeEach(async () => {
    prisma = {
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
      },
      emailVerificationToken: { create: jest.fn().mockResolvedValue({}) },
      passwordResetToken: { findUnique: jest.fn(), create: jest.fn().mockResolvedValue({}) },
      user: { update: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      toPublic: jest.fn((u) => ({ id: u.id, name: u.name, email: u.email })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('secret'), get: jest.fn() },
        },
        { provide: MailService, useValue: { sendEmailVerification: jest.fn(), sendPasswordReset: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('register', () => {
    it('rejeita cadastro com e-mail ja existente', async () => {
      usersService.findByEmail.mockResolvedValue({ id: '1' });
      await expect(
        service.register({ name: 'Ana', email: 'ana@x.com', password: 'Senha123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('cria usuario com senha hasheada (nunca em texto plano)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const hashSpy = jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('hashed');
      usersService.create.mockResolvedValue({
        id: '1',
        name: 'Ana',
        email: 'ana@x.com',
        passwordHash: 'hashed',
        emailVerified: false,
        createdAt: new Date(),
      });

      await service.register({ name: 'Ana', email: 'ana@x.com', password: 'Senha123' });

      expect(hashSpy).toHaveBeenCalledWith('Senha123');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashed' }),
      );
    });
  });

  describe('login', () => {
    it('retorna erro generico quando o usuario nao existe (anti-enumeracao)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'naoexiste@x.com', password: 'Senha123' }, {}),
      ).rejects.toThrow('E-mail ou senha invalidos');
    });

    it('retorna a MESMA mensagem de erro para senha incorreta', async () => {
      usersService.findByEmail.mockResolvedValue({ id: '1', passwordHash: 'hash', email: 'ana@x.com' });
      jest.spyOn(hashUtil, 'verifyPassword').mockResolvedValue(false);

      await expect(
        service.login({ email: 'ana@x.com', password: 'errada' }, {}),
      ).rejects.toThrow('E-mail ou senha invalidos');
    });

    it('emite access token e refresh token em login valido', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: '1',
        passwordHash: 'hash',
        email: 'ana@x.com',
        name: 'Ana',
        emailVerified: true,
        createdAt: new Date(),
      });
      jest.spyOn(hashUtil, 'verifyPassword').mockResolvedValue(true);

      const result = await service.login({ email: 'ana@x.com', password: 'Senha123' }, {});

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(typeof result.refreshToken).toBe('string');
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rejeita refresh token inexistente', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('token-invalido', {})).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita refresh token expirado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: '1',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('token-expirado', {})).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('detecta reuso de refresh token ja revogado e derruba TODAS as sessoes (replay attack)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: '1',
        revoked: true,
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(service.refresh('token-reutilizado', {})).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: '1', revoked: false },
        data: { revoked: true },
      });
    });

    it('rotaciona o token: revoga o antigo e emite um novo par', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: '1',
        revoked: false,
        expiresAt: new Date(Date.now() + 100000),
      });
      usersService.findById.mockResolvedValue({ id: '1', email: 'ana@x.com' });

      const result = await service.refresh('token-valido', {});

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revoked: true },
      });
      expect(result.accessToken).toBe('signed.jwt.token');
    });
  });

  describe('resetPassword', () => {
    it('invalida todas as sessoes ativas ao redefinir a senha', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'pr1',
        userId: '1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      jest.spyOn(hashUtil, 'hashPassword').mockResolvedValue('novo-hash');

      await service.resetPassword({ token: 'token-valido', newPassword: 'NovaSenha123' });

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: '1', revoked: false },
        data: { revoked: true },
      });
    });
  });
});
