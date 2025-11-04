/**
 * Утилиты форматирования для приложения
 */

/**
 * Форматирует секунды в читаемый формат времени
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 0) return "0 мин";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }

  if (minutes > 0) {
    return `${minutes} мин${secs > 0 ? ` ${secs} с` : ""}`;
  }

  return `${secs} с`;
};

/**
 * Форматирует дату и время в локальный формат
 */
export const formatDateTime = (dateStr?: string | Date | null): string => {
  if (!dateStr) return "—";

  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;

    if (isNaN(date.getTime())) return "—";

    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

/**
 * Форматирует только время из даты
 */
export const formatTime = (dateStr?: string | Date | null): string => {
  if (!dateStr) return "—";

  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;

    if (isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

/**
 * Форматирует только дату
 */
export const formatDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return "—";

  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;

    if (isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

/**
 * Форматирует число с фиксированным количеством знаков после запятой
 */
export const formatNumber = (
  value: number | undefined | null,
  decimals: number = 2,
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return "0";
  }

  return value.toFixed(decimals);
};

/**
 * Форматирует цену с валютой
 */
export const formatPrice = (
  amount: number | undefined | null,
  currency: string = "KGS",
  decimals: number = 2,
): string => {
  const formattedAmount = formatNumber(amount, decimals);
  return `${formattedAmount} ${currency}`;
};

/**
 * Форматирует процент
 */
export const formatPercent = (
  value: number | undefined | null,
  decimals: number = 0,
): string => {
  const formattedValue = formatNumber(value, decimals);
  return `${formattedValue}%`;
};

/**
 * Форматирует энергию в кВт·ч
 */
export const formatEnergy = (
  kwh: number | undefined | null,
  decimals: number = 2,
): string => {
  const formattedValue = formatNumber(kwh, decimals);
  return `${formattedValue} кВт·ч`;
};

/**
 * Форматирует мощность в кВт
 */
export const formatPower = (
  kw: number | undefined | null,
  decimals: number = 1,
): string => {
  const formattedValue = formatNumber(kw, decimals);
  return `${formattedValue} кВт`;
};
