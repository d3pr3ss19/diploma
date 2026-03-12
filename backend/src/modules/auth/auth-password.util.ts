import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const HASH_PREFIX = 'scrypt';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [prefix, salt, storedHash] = passwordHash.split('$');

  if (prefix !== HASH_PREFIX || !salt || !storedHash) {
    return false;
  }

  const computed = scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, 'hex');

  if (stored.length !== computed.length) {
    return false;
  }

  return timingSafeEqual(stored, computed);
}
