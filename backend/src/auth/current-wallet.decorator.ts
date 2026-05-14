import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthedWallet } from './jwt.strategy';

export const CurrentWallet = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedWallet => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthedWallet }>();
    const u = req.user;
    if (!u?.walletAddress) {
      throw new UnauthorizedException();
    }
    return u;
  },
);
