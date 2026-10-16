import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sid: string;
  sub: string; // user id
  email: string;
  userRole: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly db: DataSource
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!payload.sid || !/^[a-f0-9-]{36}$/.test(payload.sid))
      throw new UnauthorizedException('Sign in again');
    const [session] = await this.db.query(
      'SELECT credential_hash FROM auth_sessions WHERE id=$1 AND user_id=$2 AND revoked=false AND expires_at>now()',
      [payload.sid, user.id]
    );
    if (
      !session ||
      session.credential_hash !== createHash('sha256').update(user.passwordHash).digest('hex')
    )
      throw new UnauthorizedException('Session ended. Sign in again.');
    // Return the user object that will be attached to request.user
    return {
      id: user.id,
      email: user.email,
      userRole: user.userRole,
      isVerified: user.isVerified,
    };
  }
}
