import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import {
  hashPassword,
  verifyPassword,
  generateOpaqueToken,
  hashOpaqueToken,
} from '../common/utils/hash.util';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

const REFRESH_TOKEN_TTL_DAYS = 30;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 30;
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Nao foi possivel concluir o cadastro');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    await this.sendEmailVerification(user.id, user.email);
    return { user: this.usersService.toPublic(user) };
  }

  async login(dto: LoginDto, meta: { ip?: string; userAgent?: string }) {
    const user = await this.usersService.findByEmail(dto.email);

    const isValid = user
      ? await verifyPassword(user.passwordHash, dto.password)
      : await verifyPassword(DUMMY_HASH, dto.password);

    if (!user || !isValid) {
      throw new UnauthorizedException('E-mail ou senha invalidos');
    }

    const tokens = await this.issueTokenPair(user.id, user.email, meta);
    return { user: this.usersService.toPublic(user), ...tokens };
  }

  async refresh(rawRefreshToken: string, meta: { ip?: string; userAgent?: string }) {
    const tokenHash = hashOpaqueToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException('Sessao expirada, faca login novamente');
    }

    if (stored.revoked) {
      await this.logoutAll(stored.userId);
      throw new UnauthorizedException('Sessao invalida, faca login novamente');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessao expirada, faca login novamente');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.usersService.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    return this.issueTokenPair(user.id, user.email, meta);
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = hashOpaqueToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
    return { success: true };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return { success: true };
  }

  async sendEmailVerification(userId: string, email: string) {
    const token = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } });
    await this.mail.sendEmailVerification(email, token);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = hashOpaqueToken(dto.token);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token de verificacao invalido ou expirado');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (user) {
      const token = generateOpaqueToken();
      const tokenHash = hashOpaqueToken(token);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

      await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
      await this.mail.sendPasswordReset(user.email, token);
    }

    return {
      message: 'Se o e-mail informado estiver cadastrado, voce recebera as instrucoes em instantes.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashOpaqueToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token de redefinicao invalido ou expirado');
    }

    const passwordHash = await hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    ]);

    await this.logoutAll(record.userId);
    return { success: true };
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, type: 'access' },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      },
    );

    const rawRefreshToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt, ip: meta.ip, userAgent: meta.userAgent },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
