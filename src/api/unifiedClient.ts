import { z } from "zod";
// import { Capacitor } from "@capacitor/core"; // Reserved for future native HTTP implementation
import { Http } from "@capacitor-community/http";
import { ApiError, handleApiError } from "@/shared/errors/apiErrors";

// Re-export for backward compatibility
export { ApiError, handleApiError };

export class TransportError extends Error {
  public status: number | undefined;
  public code: string | undefined;
  constructor(message: string, opts?: { status?: number; code?: string }) {
    super(message);
    this.name = "TransportError";
    this.status = opts?.status;
    this.code = opts?.code;
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
};

const defaultOptions: Required<Pick<RequestOptions, "timeoutMs" | "retries">> =
  {
    timeoutMs: 10000,
    retries: 2,
  };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isIdempotent(method?: string) {
  return !method || method === "GET";
}

export async function fetchJson<T>(
  url: string,
  options: RequestOptions,
  schema: z.ZodType<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? defaultOptions.timeoutMs,
  );

  const makeOnce = async (): Promise<T> => {
    // Use Capacitor HTTP on native platforms, browser fetch on web
    // Note: Currently using fetch for all platforms due to better stability
    const isNative = false; // Capacitor.isNativePlatform();

    let json: unknown;
    let status: number;
    let contentType: string;

    if (isNative) {
      // Native platform: use @capacitor-community/http
      if (!Http || typeof Http.request !== "function") {
        throw new Error("Capacitor HTTP plugin not available");
      }

      try {
        const timeoutSeconds = Math.ceil(
          (options.timeoutMs ?? defaultOptions.timeoutMs) / 1000,
        );

        // Content-Type header is required for backend API
        const allHeaders = {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        };

        // Filter out null/undefined header values to prevent Java NPE
        const cleanHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(allHeaders)) {
          if (value != null && value !== undefined && value !== "") {
            cleanHeaders[key] = String(value);
          }
        }

        const requestParams = {
          url,
          method: options.method ?? "GET",
          headers: cleanHeaders,
          ...(options.body ? { data: options.body } : {}),
          connectTimeout: timeoutSeconds,
          readTimeout: timeoutSeconds,
        };

        const response = await Http.request(requestParams);

        status = response.status;
        contentType =
          response.headers?.["content-type"] ||
          response.headers?.["Content-Type"] ||
          "";
        json = response.data;

        // Capacitor HTTP doesn't throw on non-2xx, handle manually
        if (status < 200 || status >= 300) {
          const errorObj = json as Record<string, unknown>;
          const message =
            errorObj?.["error"] || errorObj?.["message"] || `HTTP ${status}`;
          const errorCode = (errorObj?.["error_code"] ||
            errorObj?.["error"]) as string | undefined;

          if (import.meta.env.DEV) {
            console.error(
              `[UnifiedClient] Native HTTP error: ${status} ${message}`,
            );
            console.error(`[UnifiedClient] URL: ${url}`);
            console.error(`[UnifiedClient] Method: ${options.method ?? "GET"}`);
            console.error(`[UnifiedClient] Error code: ${errorCode || "none"}`);
          }

          throw new TransportError(String(message), {
            status: status,
            code: errorCode,
          });
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[UnifiedClient] Capacitor HTTP error:", err);
          console.error("[UnifiedClient] URL:", url);
        }

        // Re-throw TransportError as-is, wrap others
        if (err instanceof TransportError) throw err;
        throw new TransportError(
          err instanceof Error ? err.message : "Network request failed",
          { status: 0 },
        );
      }
    } else {
      // Web platform: use browser fetch
      const resp = await fetch(url, {
        method: options.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
        body: options.body ? JSON.stringify(options.body) : null,
        signal: controller.signal,
      });

      status = resp.status;
      contentType = resp.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const textResponse = await resp.text();
        if (import.meta.env.DEV) {
          console.error(
            `[UnifiedClient] Backend non-JSON response: ${status} ${contentType}`,
          );
        }
        throw new TransportError(
          `Backend error (${status}): ${textResponse || "No message"}`,
          { status },
        );
      }

      json = (await resp.json()) as unknown;

      if (!resp.ok) {
        const errorObj = json as Record<string, unknown>;
        const message =
          errorObj?.["error"] || errorObj?.["message"] || `HTTP ${status}`;
        const errorCode = (errorObj?.["error_code"] || errorObj?.["error"]) as
          | string
          | undefined;
        throw new TransportError(String(message), {
          status,
          code: errorCode,
        });
      }
    }

    // Common validation logic for both platforms
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      if (import.meta.env.DEV) {
        console.error(
          `[UnifiedClient] Validation failed: ${options.method ?? "GET"} ${url}`,
        );
        console.error(
          "[UnifiedClient] Validation errors:",
          JSON.stringify(parsed.error.errors, null, 2),
        );
        console.error(
          "[UnifiedClient] Response data:",
          JSON.stringify(json, null, 2),
        );
      }
      throw new TransportError("Response validation failed", {
        status,
        code: "INVALID_RESPONSE",
      });
    }
    return parsed.data;
  };

  try {
    const retries = options.retries ?? defaultOptions.retries;
    let attempt = 0;
    let delay = 300;
    // Exponential backoff only for idempotent requests
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const result = await makeOnce();
        return result;
      } catch (err) {
        attempt++;
        const isAbort =
          err instanceof DOMException && err.name === "AbortError";
        const retryable =
          isIdempotent(options.method) && attempt <= retries && !isAbort;
        if (!retryable) throw err;
        await sleep(delay);
        delay = Math.min(delay * 2, 1500);
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}

export { z };

// ================== Error utilities for API boundary ==================
// NOTE: ApiError and handleApiError now imported from @/shared/errors/apiErrors
// DO NOT duplicate error handling code here!
