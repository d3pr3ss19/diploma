import { createHmac, randomUUID } from 'crypto';

import { Role } from './role.enum';

type AuthTokenPayload = {
  sub: number;
  role: Role;
  type: 'access' | 'refresh';
  exp: number;
  jti: string;
};

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function parseBase64url<T>(input: string): T | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const json = Buffer.from(normalized + pad, 'base64').toString('utf-8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function sign(data: string, secret: string): string {
  return base64url(createHmac('sha256', secret).update(data).digest());
}

function secret(): string {
  return process.env.AUTH_JWT_SECRET ?? 'dev-jwt-secret-change-me';
}

export function createToken(payload: Omit<AuthTokenPayload, 'exp' | 'jti'> & { ttlSeconds: number }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body: AuthTokenPayload = {
    sub: payload.sub,
    role: payload.role,
    type: payload.type,
    exp: Math.floor(Date.now() / 1000) + payload.ttlSeconds,
    jti: randomUUID()
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(body));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret());

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, secret());
  if (expectedSignature !== encodedSignature) {
    return null;
  }

  const payload = parseBase64url<AuthTokenPayload>(encodedPayload);
  if (!payload) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    return null;
  }

  if (!payload.sub || !payload.jti || !Object.values(Role).includes(payload.role)) {
    return null;
  }

  return payload;
}
