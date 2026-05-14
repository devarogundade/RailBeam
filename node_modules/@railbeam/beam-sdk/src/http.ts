import type { ZodType } from "zod";
import { BeamApiError } from "./errors.js";

export type BeamHttpClientOptions = {
  baseUrl: string;
  /** Sent as `X-Beam-Chain-Id` on every request (backend / facilitator parity). */
  chainId: number;
  getAccessToken: () => string | undefined;
  fetchImpl: typeof fetch;
};

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export class BeamHttpClient {
  constructor(private readonly opts: BeamHttpClientOptions) {}

  get chainId(): number {
    return this.opts.chainId;
  }

  private headers(
    init?: HeadersInit,
    contentTypeJson = true,
  ): Headers {
    const h = new Headers(init);
    if (contentTypeJson && !h.has("Content-Type")) {
      h.set("Content-Type", "application/json");
    }
    h.set("X-Beam-Chain-Id", String(this.opts.chainId));
    const token = this.opts.getAccessToken();
    if (token) {
      h.set("Authorization", `Bearer ${token}`);
    }
    return h;
  }

  async requestJson<T>(
    method: string,
    path: string,
    opts: {
      query?: Record<string, string | number | boolean | undefined | null>;
      body?: unknown;
      parse?: ZodType<T>;
    } = {},
  ): Promise<T> {
    let url = joinUrl(this.opts.baseUrl, path);
    if (opts.query) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.query)) {
        if (v === undefined || v === null) continue;
        sp.set(k, String(v));
      }
      const q = sp.toString();
      if (q) url += `?${q}`;
    }
    const res = await this.opts.fetchImpl(url, {
      method,
      headers: this.headers(),
      body:
        opts.body === undefined
          ? undefined
          : typeof opts.body === "string"
            ? opts.body
            : JSON.stringify(opts.body),
    });
    const text = await readErrorBody(res);
    if (!res.ok) {
      throw new BeamApiError(`Beam API HTTP ${res.status}`, {
        status: res.status,
        bodyText: text,
      });
    }
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new BeamApiError("Beam API returned non-JSON body", {
        status: res.status,
        bodyText: text,
      });
    }
    if (opts.parse) {
      return opts.parse.parse(data);
    }
    return data as T;
  }

  async requestFormData<T>(
    method: string,
    path: string,
    form: FormData,
    parse?: ZodType<T>,
  ): Promise<T> {
    const url = joinUrl(this.opts.baseUrl, path);
    const h = this.headers(undefined, false);
    const res = await this.opts.fetchImpl(url, {
      method,
      headers: h,
      body: form,
    });
    const text = await readErrorBody(res);
    if (!res.ok) {
      throw new BeamApiError(`Beam API HTTP ${res.status}`, {
        status: res.status,
        bodyText: text,
      });
    }
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new BeamApiError("Beam API returned non-JSON body", {
        status: res.status,
        bodyText: text,
      });
    }
    if (parse) {
      return parse.parse(data);
    }
    return data as T;
  }

  async requestBinary(method: string, path: string): Promise<ArrayBuffer> {
    const url = joinUrl(this.opts.baseUrl, path);
    const res = await this.opts.fetchImpl(url, {
      method,
      headers: this.headers(),
    });
    if (!res.ok) {
      const text = await readErrorBody(res);
      throw new BeamApiError(`Beam API HTTP ${res.status}`, {
        status: res.status,
        bodyText: text,
      });
    }
    return res.arrayBuffer();
  }
}
