import { ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
// Custom header makes browser cross-origin requests preflight; exact Origin validation
// also excludes sibling subdomains. SameSite is an additional cookie control.
export function sessionRequest(req: Request) {
  const allowed = process.env.FRONTEND_URL || 'http://127.0.0.1:8930';
  if (
    req.headers['x-profilepays-request'] !== '1' ||
    (req.headers.origin && req.headers.origin !== allowed)
  )
    throw new ForbiddenException('Use the ProfilePays site to manage your session');
}
export const sessionCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
};
export function setSessionCookie(res: Response, token: string) {
  res.clearCookie('refreshToken', { ...sessionCookie, path: '/' });
  res.cookie('refreshToken', token, { ...sessionCookie, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.setHeader('Cache-Control', 'no-store');
}
export function clearSessionCookie(res: Response) {
  res.clearCookie('refreshToken', sessionCookie);
  res.clearCookie('refreshToken', { ...sessionCookie, path: '/' });
  res.setHeader('Cache-Control', 'no-store');
}
