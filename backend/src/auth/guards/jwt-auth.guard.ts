import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const token = request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('Access token is required');
      }

      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token has expired');
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid access token');
      }

      throw err || new UnauthorizedException('Authentication failed');
    }

    return user;
  }
}