import { fetch, Response } from "undici";

export type ResponseType = "json" | "text";

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  responseType?: ResponseType;
}

export interface HttpRequestWithBodyOptions extends HttpRequestOptions {
  body?: unknown;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
  headers: Headers;
}

export interface HttpClient {
  get<T = unknown>(url: string | URL, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  post<T = unknown>(url: string | URL, options?: HttpRequestWithBodyOptions): Promise<HttpResponse<T>>;
}

export class HttpRequestError extends Error {
  readonly status?: number;
  readonly url: string;
  readonly method: string;
  readonly body?: string;

  constructor(message: string, params: { url: string; method: string; status?: number; body?: string; cause?: unknown }) {
    super(message);
    this.name = "HttpRequestError";
    this.url = params.url;
    this.method = params.method;
    this.status = params.status;
    this.body = params.body;
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

interface HttpClientConfig {
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  userAgent?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_USER_AGENT = "tracking-agents-backend/0.1";

export function createHttpClient(config?: HttpClientConfig): HttpClient {
  const baseHeaders = {
    "user-agent": config?.userAgent ?? DEFAULT_USER_AGENT,
    ...config?.defaultHeaders,
  };

  const defaultTimeout = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async get<T = unknown>(input: string | URL, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
      const requestUrl = buildUrlWithQuery(input, options?.query);
      const headers = { ...baseHeaders, ...options?.headers };
      const timeoutMs = options?.timeoutMs ?? defaultTimeout;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const method = "GET";

      try {
        const response = await fetch(requestUrl, { method, headers, signal: controller.signal });
        const bodyText = await readBody(response, options?.responseType, method);

        if (!response.ok) {
          throw new HttpRequestError(`HTTP ${response.status} ${response.statusText} for ${requestUrl}`, {
            url: requestUrl.toString(),
            method,
            status: response.status,
            body: bodyText.raw,
          });
        }

        const data = bodyText.parsed as T;

        return {
          status: response.status,
          data,
          headers: response.headers,
        };
      } catch (error) {
        if (error instanceof HttpRequestError) {
          throw error;
        }

        if (isAbortError(error)) {
          throw new HttpRequestError(`Request to ${requestUrl} aborted (likely timeout after ${timeoutMs}ms)`, {
            url: requestUrl.toString(),
            method,
            cause: error,
          });
        }

        throw new HttpRequestError(`Request to ${requestUrl} failed`, {
          url: requestUrl.toString(),
          method,
          cause: error,
        });
      } finally {
        clearTimeout(timeout);
      }
    },

    async post<T = unknown>(input: string | URL, options?: HttpRequestWithBodyOptions): Promise<HttpResponse<T>> {
      const requestUrl = buildUrlWithQuery(input, options?.query);
      const headers: Record<string, string> = { ...baseHeaders, ...options?.headers };
      const timeoutMs = options?.timeoutMs ?? defaultTimeout;
      const method = "POST";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      if (options?.body !== undefined && !headers["content-type"]) {
        headers["content-type"] = "application/json";
      }

      try {
        const response = await fetch(requestUrl, {
          method,
          headers,
          body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
        const bodyText = await readBody(response, options?.responseType, method);

        if (!response.ok) {
          throw new HttpRequestError(`HTTP ${response.status} ${response.statusText} for ${requestUrl}`, {
            url: requestUrl.toString(),
            method,
            status: response.status,
            body: bodyText.raw,
          });
        }

        const data = bodyText.parsed as T;

        return {
          status: response.status,
          data,
          headers: response.headers,
        };
      } catch (error) {
        if (error instanceof HttpRequestError) {
          throw error;
        }

        if (isAbortError(error)) {
          throw new HttpRequestError(`Request to ${requestUrl} aborted (likely timeout after ${timeoutMs}ms)`, {
            url: requestUrl.toString(),
            method,
            cause: error,
          });
        }

        throw new HttpRequestError(`Request to ${requestUrl} failed`, {
          url: requestUrl.toString(),
          method,
          cause: error,
        });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function buildUrlWithQuery(input: string | URL, query?: Record<string, string | number | boolean | undefined>): URL {
  const url = typeof input === "string" ? new URL(input) : new URL(input.toString());

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function readBody(
  response: Response,
  responseType: ResponseType = "json",
  method: string
): Promise<{ raw: string; parsed: unknown }> {
  const raw = await response.text();

  if (responseType === "text") {
    return { raw, parsed: raw };
  }

  try {
    const parsed = raw.length ? JSON.parse(raw) : null;
    return { raw, parsed };
  } catch (error) {
    throw new HttpRequestError("Failed to parse JSON response", {
      url: response.url,
      method,
      status: response.status,
      body: raw,
      cause: error,
    });
  }
}

function isAbortError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { name?: string }).name === "AbortError");
}
