import { BadRequestException, Body, Controller, Delete, Get, Header, Headers, HttpException, Injectable, Module, OnModuleDestroy, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { Public } from '../auth/decorators/public.decorator';

type Session = { owner: string; publish: Buffer; view: Buffer; expiresAt: number; frame?: string; capturedAt?: number; lastWrite: number; lastRead: number };
const digest = (value: string) => createHash('sha256').update(value).digest();
const LIFETIME = 15 * 60_000;
const FRESHNESS = 6_000;

/** One-process pilot relay. Frames and grants deliberately disappear on restart. */
@Injectable()
export class SupportService implements OnModuleDestroy {
  private sessions = new Map<string, Session>();
  private cleaner = setInterval(() => this.cleanup(), 2_000).unref();
  onModuleDestroy() { clearInterval(this.cleaner); this.sessions.clear(); }
  private cleanup() {
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= Date.now()) this.sessions.delete(id);
      else if (session.capturedAt && Date.now() - session.capturedAt >= FRESHNESS) session.frame = undefined;
    }
  }
  create(owner: string) {
    if (!owner) throw new UnauthorizedException();
    this.cleanup();
    // A refresh must not strand the owner for fifteen minutes. Replacement revokes old links.
    for (const [id, session] of this.sessions) if (session.owner === owner) this.sessions.delete(id);
    if (this.sessions.size >= 20) throw new HttpException('Screen sharing is busy. Please try again later.', 429);
    const id = randomUUID(), publishToken = randomBytes(32).toString('base64url'), viewToken = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + LIFETIME;
    this.sessions.set(id, { owner, publish: digest(publishToken), view: digest(viewToken), expiresAt, lastWrite: 0, lastRead: 0 });
    return { id, publishToken, viewToken, expiresAt };
  }
  private authorize(id: string, authorization: string, role: 'publish' | 'view' | 'either') {
    this.cleanup();
    const session = this.sessions.get(id);
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization || '')?.[1];
    if (!session || !token) throw new UnauthorizedException('Screen session expired, stopped, or link is invalid.');
    const hash = digest(token);
    const allowed = (role !== 'view' && timingSafeEqual(hash, session.publish)) || (role !== 'publish' && timingSafeEqual(hash, session.view));
    if (!allowed) throw new UnauthorizedException('This link cannot perform that action.');
    return session;
  }
  publish(id: string, authorization: string, body: unknown) {
    const session = this.authorize(id, authorization, 'publish');
    if (Date.now() - session.lastWrite < 800) throw new HttpException('Send at most one frame per second.', 429);
    const frame = (body as any)?.frame;
    if (!body || Object.keys(body).length !== 1 || typeof frame !== 'string' || frame.length > 85_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(frame)) throw new BadRequestException('Expected a JPEG frame of at most 63 KB.');
    const bytes = Buffer.from(frame, 'base64');
    if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) throw new BadRequestException('Only JPEG frames are accepted.');
    session.frame = frame;
    session.capturedAt = session.lastWrite = Date.now();
    return { expiresAt: session.expiresAt, capturedAt: session.capturedAt };
  }
  read(id: string, authorization: string) {
    const session = this.authorize(id, authorization, 'view');
    if (Date.now() - session.lastRead < 300) throw new HttpException('Please wait before refreshing the screen.', 429);
    session.lastRead = Date.now();
    return { expiresAt: session.expiresAt, capturedAt: session.capturedAt || null, frame: session.frame || null, status: session.frame ? 'live' : session.capturedAt ? 'paused' : 'waiting' };
  }
  stop(id: string, authorization: string) { this.authorize(id, authorization, 'either'); this.sessions.delete(id); return { stopped: true }; }
  stopOwned(id: string, owner: string) {
    if (this.sessions.get(id)?.owner !== owner) throw new UnauthorizedException();
    this.sessions.delete(id);
    return { stopped: true };
  }
}

@Controller('support/sessions')
export class SupportController {
  constructor(private readonly service: SupportService) {}
  @Post() @Header('Cache-Control', 'no-store')
  create(@Req() request: any) { return this.service.create(request.user.id); }
  @Delete(':id/owned') @Header('Cache-Control', 'no-store')
  stopOwned(@Param('id') id: string, @Req() request: any) { return this.service.stopOwned(id, request.user.id); }
  // Public only bypasses account JWT; separate scoped capabilities are always required.
  @Public() @Post(':id/frame') @Header('Cache-Control', 'no-store')
  publish(@Param('id') id: string, @Headers('authorization') authorization: string, @Body() body: unknown) { return this.service.publish(id, authorization, body); }
  @Public() @Get(':id/frame') @Header('Cache-Control', 'no-store')
  read(@Param('id') id: string, @Headers('authorization') authorization: string) { return this.service.read(id, authorization); }
  @Public() @Delete(':id') @Header('Cache-Control', 'no-store')
  stop(@Param('id') id: string, @Headers('authorization') authorization: string) { return this.service.stop(id, authorization); }
}

@Module({ controllers: [SupportController], providers: [SupportService] })
export class SupportModule {}
