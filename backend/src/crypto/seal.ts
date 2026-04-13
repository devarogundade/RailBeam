import crypto from 'crypto';

type SealedEnvelopeV1 = {
  v: 1;
  alg: 'aes-256-gcm';
  ivB64: string;
  tagB64: string;
  ctB64: string;
};

function isSealedEnvelopeV1(x: unknown): x is SealedEnvelopeV1 {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    r.v === 1 &&
    r.alg === 'aes-256-gcm' &&
    typeof r.ivB64 === 'string' &&
    typeof r.tagB64 === 'string' &&
    typeof r.ctB64 === 'string'
  );
}

function normalizePk(pk: string): string {
  const s = pk.trim();
  if (!s) return '';
  return s.startsWith('0x') ? s : `0x${s}`;
}

function pkToKey(pk: string): Buffer {
  const n = normalizePk(pk);
  if (!n || n === '0x') throw new Error('PRIVATE_KEY is missing');
  const hex = n.slice(2);
  const bytes = Buffer.from(hex, 'hex');
  return crypto.createHash('sha256').update(bytes).digest(); // 32 bytes
}

export function encryptString(value: string, pk: string): string {
  const key = pkToKey(pk);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const pt = Buffer.from(value, 'utf-8');
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();

  const env: SealedEnvelopeV1 = {
    v: 1,
    alg: 'aes-256-gcm',
    ivB64: iv.toString('base64'),
    tagB64: tag.toString('base64'),
    ctB64: ct.toString('base64'),
  };
  return JSON.stringify(env);
}

export function decryptString(encrypted: string, pk: string): string {
  const key = pkToKey(pk);
  const parsed: unknown = JSON.parse(encrypted);
  if (!isSealedEnvelopeV1(parsed)) {
    throw new Error('Unsupported encrypted string');
  }
  const env = parsed;
  const iv = Buffer.from(env.ivB64, 'base64');
  const tag = Buffer.from(env.tagB64, 'base64');
  const ct = Buffer.from(env.ctB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf-8');
}
