interface ErrorInfo {
  message: string
  stack?: string
  context?: Record<string, unknown>
  url?: string
  line?: number
  column?: number
  timestamp?: string
  userAgent?: string
}

class ErrorMonitor {
  private queue: ErrorInfo[] = []
  private isOnline = navigator.onLine

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flush()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack
      })
    })
  }

  captureError(error: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Error captured:', error)
      return
    }

    this.queue.push({
      ...error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    })

    if (this.isOnline) {
      this.flush()
    }
  }

  private async flush() {
    if (this.queue.length === 0) return

    const errors = [...this.queue]
    this.queue = []

    try {
      const endpoint = import.meta.env['VITE_ERROR_MONITORING_ENDPOINT']
      if (!endpoint) return

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors })
      })
    } catch {
      this.queue.unshift(...errors)
    }
  }

  captureException(error: Error, context?: Record<string, any>) {
    this.captureError({
      message: error.message,
      stack: error.stack,
      context
    })
  }
}

export const errorMonitor = new ErrorMonitor()

export function withErrorBoundary<T extends (...args: never[]) => unknown>(
  fn: T,
  context?: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args)
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorMonitor.captureException(error, { context, args })
          throw error
        })
      }
      return result
    } catch (error) {
      errorMonitor.captureException(error as Error, { context, args })
      throw error
    }
  }) as T
}