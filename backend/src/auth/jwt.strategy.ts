import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type AuthedWallet = {
  walletAddress: string;
};

type ReqWithCookies = {
  cookies?: Record<string, string | undefined>;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: unknown) => {
          if (!req || typeof req !== 'object') return null;
          const r = req as ReqWithCookies;
          const token = r.cookies?.jwt;
          return typeof token === 'string' && token.length > 0 ? token : null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev_secret_change_me',
    });
  }

  validate(payload: { walletAddress?: string }): AuthedWallet {
    return { walletAddress: String(payload.walletAddress ?? '').toLowerCase() };
  }
}
