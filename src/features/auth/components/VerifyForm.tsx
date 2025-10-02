import { useState } from 'react'

interface VerifyFormProps {
  phoneNumber: string
  onVerify: (code: string) => void
  onBack: () => void
  isLoading?: boolean
  error?: string
}

export function VerifyForm({ phoneNumber, onVerify, onBack, isLoading, error }: VerifyFormProps) {
  const [code, setCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length === 6) {
      onVerify(code)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Введите код подтверждения
        </h2>
        <p className="text-gray-600">
          Код отправлен на номер {phoneNumber}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={code}
            onChange={handleCodeChange}
            placeholder="123456"
            className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={6}
            autoFocus
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={code.length !== 6 || isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Проверка...' : 'Подтвердить'}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="w-full text-gray-600 py-2 hover:text-gray-800 transition-colors"
          >
            Изменить номер телефона
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <button className="text-blue-600 hover:text-blue-800 text-sm">
          Отправить код повторно
        </button>
      </div>
    </div>
  )
}