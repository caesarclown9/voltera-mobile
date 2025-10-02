/**
 * Централизованная система логирования
 * Автоматически отключает логи в production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  enabled: boolean
  level: LogLevel
  prefix?: string
}

class Logger {
  private config: LoggerConfig

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      enabled: import.meta.env.DEV || import.meta.env.VITE_DEBUG_MODE === 'true',
      level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',
      prefix: '[EvPower]',
      ...config,
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false
    
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }
    
    return levels[level] >= levels[this.config.level]
  }

  private formatMessage(level: LogLevel, message: string, _data?: unknown): string {
    const timestamp = new Date().toISOString()
    const prefix = this.config.prefix || ''
    return `${prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data), data || '')
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data), data || '')
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data), data || '')
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, error), error || '')
      
      // В production отправляем ошибки в систему мониторинга
      if (import.meta.env.PROD && error instanceof Error) {
        this.reportError(error, { context: message })
      }
    }
  }

  /**
   * Группирование логов
   */
  group(label: string, callback: () => void): void {
    if (this.config.enabled) {
      console.group(`${this.config.prefix} ${label}`)
      callback()
      console.groupEnd()
    } else {
      callback()
    }
  }

  /**
   * Измерение производительности
   */
  time(label: string): void {
    if (this.config.enabled) {
      console.time(`${this.config.prefix} ${label}`)
    }
  }

  timeEnd(label: string): void {
    if (this.config.enabled) {
      console.timeEnd(`${this.config.prefix} ${label}`)
    }
  }

  /**
   * Отправка ошибок в систему мониторинга (Sentry, LogRocket и т.д.)
   */
  private reportError(error: Error, context?: Record<string, unknown>): void {
    // Здесь будет интеграция с Sentry или другой системой мониторинга
    // Пока просто заглушка
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: context })
    }
  }

  /**
   * Создание логгера для конкретного модуля
   */
  createChild(moduleName: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix} [${moduleName}]`,
    })
  }
}

// Экспортируем singleton для использования во всем приложении
export const logger = new Logger()

// Экспортируем также класс для создания кастомных логгеров
export { Logger }

// Хелперы для быстрого доступа
export const logDebug = logger.debug.bind(logger)
export const logInfo = logger.info.bind(logger)
export const logWarn = logger.warn.bind(logger)
export const logError = logger.error.bind(logger)