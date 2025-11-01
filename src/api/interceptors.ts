import type { AxiosResponse, AxiosError } from "axios";
import type { APIError } from "./types";

// Type for error response data from API
interface ApiErrorResponse {
  error?: string;
  message?: string;
  code?: string;
}

// Response interceptor для нормализации ошибок
export const handleApiError = (
  error: AxiosError<ApiErrorResponse>,
): APIError => {
  if (error.response) {
    // Ошибка от сервера
    const { status, data } = error.response;
    return {
      success: false,
      error: data?.error || data?.message || "Произошла ошибка на сервере",
      message: data?.message || "Произошла ошибка на сервере",
      code: data?.code,
      status,
    };
  } else if (error.request) {
    // Нет ответа от сервера
    return {
      success: false,
      error: "Сервер недоступен. Проверьте подключение к интернету.",
      message: "Сервер недоступен. Проверьте подключение к интернету.",
      code: "NETWORK_ERROR",
    };
  } else {
    // Ошибка в настройке запроса
    return {
      success: false,
      error: error.message || "Неизвестная ошибка",
      message: error.message || "Неизвестная ошибка",
      code: "UNKNOWN_ERROR",
    };
  }
};

// Utility для обработки успешных ответов
export const handleApiResponse = <T>(response: AxiosResponse<T>): T => {
  return response.data;
};

// Типы для типизированных API вызовов
export type ApiResponse<T> = Promise<T>;
export type ApiErrorHandler = (error: APIError) => void;
