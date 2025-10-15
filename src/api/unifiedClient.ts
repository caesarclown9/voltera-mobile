import { z } from "zod";

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
    const resp = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : null,
      signal: controller.signal,
    });

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const textResponse = await resp.text();
      console.error(`Backend non-JSON response: ${resp.status} ${contentType}`);
      throw new TransportError(
        `Backend error (${resp.status}): ${textResponse || "No message"}`,
        { status: resp.status },
      );
    }

    const json = (await resp.json()) as unknown;
    if (!resp.ok) {
      const message =
        (json as Record<string, unknown>)?.["error"] || `HTTP ${resp.status}`;
      throw new TransportError(String(message), { status: resp.status });
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      // Упрощенное логирование для production - избегаем тяжелых операций
      console.error(
        `❌ Validation failed: ${options.method ?? "GET"} ${url} (${parsed.error.errors.length} errors)`,
      );
      throw new TransportError("Response validation failed", {
        status: resp.status,
        code: "INVALID_RESPONSE",
      });
    }
    return parsed.data;
  };

  try {
    const retries = options.retries ?? defaultOptions.retries;
    let attempt = 0;
    let delay = 300;
    // Экспоненциальный бэкофф только для идемпотентных запросов
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

export class ApiError extends Error {
  public code: string;
  public status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  client_not_found: "Клиент не найден",
  station_unavailable: "Станция недоступна",
  insufficient_balance: "Недостаточно средств на балансе",
  connector_occupied: "Коннектор уже используется",
  session_not_found: "Сессия зарядки не найдена",
  station_offline: "Станция не в сети",
  payment_not_found: "Платеж не найден",
  payment_expired: "Время оплаты истекло",
  invalid_amount: "Некорректная сумма",
  provider_error: "Ошибка платежной системы",
  internal_error: "Внутренняя ошибка сервера",
  invalid_request: "Некорректный запрос",
  timeout: "Превышено время ожидания",
  network_error: "Ошибка сети",
  unauthorized: "Требуется авторизация",
  forbidden: "Доступ запрещен",
  not_found: "Не найдено",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? error.message ?? "Неизвестная ошибка";
  }

  if (isObject(error)) {
    // axios-like error shape
    const resp = error["response"];
    if (isObject(resp)) {
      const data = resp["data"];
      if (isObject(data)) {
        const code =
          typeof data["error"] === "string"
            ? (data["error"] as string)
            : undefined;
        const message =
          typeof data["message"] === "string"
            ? (data["message"] as string)
            : undefined;
        if (code) return ERROR_MESSAGES[code] ?? message ?? "Ошибка сервера";
        if (message) return message;
      }
    }

    // generic { error, message }
    const code =
      typeof error["error"] === "string"
        ? (error["error"] as string)
        : undefined;
    const message =
      typeof error["message"] === "string"
        ? (error["message"] as string)
        : undefined;
    if (code) return ERROR_MESSAGES[code] ?? message ?? "Неизвестная ошибка";
    if (message) return message;
  }

  return "Неизвестная ошибка";
}
