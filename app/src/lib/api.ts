import type { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Fetch JSON and validate with a Zod schema for end-to-end typed responses. */
export async function fetchTyped<TSchema extends z.ZodTypeAny>(
  input: RequestInfo | URL,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.infer<TSchema>> {
  const res = await fetch(input, init);
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(`Invalid JSON (${res.status})`, res.status);
  }
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }
  return schema.parse(json);
}
