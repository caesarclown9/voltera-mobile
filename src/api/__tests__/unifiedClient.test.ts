import { describe, it, expect } from 'vitest'
import { ApiError, handleApiError } from '../unifiedClient'

describe('UnifiedClient', () => {
  describe('ApiError', () => {
    it('should create ApiError with code and message', () => {
      const error = new ApiError('test_code', 'Test message', 400)
      
      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe('test_code')
      expect(error.message).toBe('Test message')
      expect(error.status).toBe(400)
      expect(error.name).toBe('ApiError')
    })
  })

  describe('handleApiError', () => {
    it('should return localized message for known error codes', () => {
      const error = new ApiError('insufficient_balance', 'Insufficient balance')
      const message = handleApiError(error)
      
      expect(message).toBe('Недостаточно средств на балансе')
    })

    it('should return original message for unknown error codes', () => {
      const error = new ApiError('unknown_error', 'Something went wrong')
      const message = handleApiError(error)
      
      expect(message).toBe('Something went wrong')
    })

    it('should handle generic errors', () => {
      const error = new Error('Network error')
      const message = handleApiError(error)
      
      expect(message).toBe('Network error')
    })

    it('should handle errors without message', () => {
      const error = {}
      const message = handleApiError(error)
      
      expect(message).toBe('Неизвестная ошибка')
    })
  })
})