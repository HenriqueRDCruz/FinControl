import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access';
}

// O token já é assinado e expira em minutos; consultar o usuário no banco a cada requisição custa uma viagem
// ao banco toda vez. Guardamos por pouco tempo que o usuário existe (uma conta apagada perde o acesso em até 1 minuto).
const USER_CHECK_TTL_MS = 60_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly knownUsers = new Map<string, number>();

  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Token invalido');
    }
    const checkedUntil = this.knownUsers.get(payload.sub);
    if (checkedUntil && checkedUntil > Date.now()) {
      return { userId: payload.sub, email: payload.email };
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      this.knownUsers.delete(payload.sub);
      throw new UnauthorizedException('Usuario nao encontrado');
    }
    this.knownUsers.set(payload.sub, Date.now() + USER_CHECK_TTL_MS);
    return { userId: user.id, email: user.email };
  }
}
