import { BadRequestException } from '@nestjs/common';
import { ZodError, type z } from 'zod';

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  raw: unknown,
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
