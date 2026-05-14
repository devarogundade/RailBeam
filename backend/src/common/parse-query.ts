import { BadRequestException } from '@nestjs/common';
import { ZodError, type z } from 'zod';

/** Parse `req.query`-style flat strings (Nest may pass `string | string[]`). */
export function parseQueryRecord(
  raw: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) out[k] = undefined;
    else if (Array.isArray(v)) out[k] = v[0];
    else out[k] = v;
  }
  return out;
}

export function parseQuery<T extends z.ZodTypeAny>(
  schema: T,
  raw: Record<string, string | undefined>,
): z.infer<T> {
  try {
    return schema.parse(raw) as z.infer<T>;
  } catch (e) {
    if (e instanceof ZodError) {
      throw new BadRequestException(e.flatten());
    }
    throw e;
  }
}
