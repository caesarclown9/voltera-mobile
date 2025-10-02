interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  identifier?: string
}

interface RequestRecord {
  count: number
  resetTime: number
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanup()
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, record] of this.requests.entries()) {
        if (record.resetTime < now) {
          this.requests.delete(key)
        }
      }
    }, 60000) // Clean up every minute
  }

  public isAllowed(config: RateLimitConfig): boolean {
    const identifier = config.identifier || 'global'
    const now = Date.now()
    const record = this.requests.get(identifier)

    if (!record || record.resetTime < now) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return true
    }

    if (record.count >= config.maxRequests) {
      return false
    }

    record.count++
    return true
  }

  public getRemainingRequests(config: RateLimitConfig): number {
    const identifier = config.identifier || 'global'
    const record = this.requests.get(identifier)
    
    if (!record || record.resetTime < Date.now()) {
      return config.maxRequests
    }

    return Math.max(0, config.maxRequests - record.count)
  }

  public getResetTime(config: RateLimitConfig): number | null {
    const identifier = config.identifier || 'global'
    const record = this.requests.get(identifier)
    
    if (!record || record.resetTime < Date.now()) {
      return null
    }

    return record.resetTime
  }

  public reset(identifier?: string) {
    if (identifier) {
      this.requests.delete(identifier)
    } else {
      this.requests.clear()
    }
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.requests.clear()
  }
}

export const rateLimiter = new RateLimiter()

export function withRateLimit<T extends (...args: any[]) => any>(
  fn: T,
  config: Omit<RateLimitConfig, 'identifier'>
): T {
  return ((...args: Parameters<T>) => {
    const identifier = `${fn.name || 'anonymous'}_${JSON.stringify(args)}`
    
    if (!rateLimiter.isAllowed({ ...config, identifier })) {
      const resetTime = rateLimiter.getResetTime({ ...config, identifier })
      const waitTime = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 0
      throw new Error(`Rate limit exceeded. Please try again in ${waitTime} seconds.`)
    }

    return fn(...args)
  }) as T
}

export const API_RATE_LIMITS = {
  AUTH: {
    maxRequests: 5,
    windowMs: 60000 // 5 requests per minute
  },
  STATIONS: {
    maxRequests: 30,
    windowMs: 60000 // 30 requests per minute
  },
  CHARGING: {
    maxRequests: 10,
    windowMs: 60000 // 10 requests per minute
  },
  PAYMENT: {
    maxRequests: 3,
    windowMs: 60000 // 3 requests per minute
  },
  DEFAULT: {
    maxRequests: 60,
    windowMs: 60000 // 60 requests per minute
  }
}