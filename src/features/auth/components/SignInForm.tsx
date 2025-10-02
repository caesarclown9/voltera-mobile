import { useState } from 'react'
import { useSignIn } from '../hooks/useAuth'

interface SignInFormProps {
  onSuccess: () => void
  onSwitchToSignUp: () => void
}

export function SignInForm({ onSuccess, onSwitchToSignUp }: SignInFormProps) {
  const [loginField, setLoginField] = useState('') // Может быть email или телефон
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const signInMutation = useSignIn()
  
  const isPhoneNumber = (value: string) => {
    // Проверка, является ли значение телефоном (начинается с + и содержит только цифры)
    const phoneRegex = /^\+\d{10,15}$/
    return phoneRegex.test(value.replace(/\s/g, ''))
  }
  
  const isEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }
  
  const isValidLogin = isPhoneNumber(loginField) || isEmail(loginField)
  const isValid = isValidLogin && password.length >= 6
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValid) {
      return
    }

    try {
      const loginData = isPhoneNumber(loginField)
        ? { phone: loginField, password }
        : { email: loginField, password }

      const result = await signInMutation.mutateAsync(loginData)

      if (result.success) {
        onSuccess()
      }
    } catch (error) {
      // Ошибка обрабатывается в мутации
    }
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">⚡</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Вход в EvPower
        </h2>
        <p className="text-gray-600">
          Войдите в свой аккаунт
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="signin-login" className="block text-sm font-medium text-gray-700 mb-2">
            Номер/Почта
          </label>
          <input
            type="text"
            id="signin-login"
            value={loginField}
            onChange={(e) => setLoginField(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border ${
              loginField && !isValidLogin 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
            } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400`}
            placeholder="+996 XXX XXX XXX или email@example.com"
            required
          />
          {loginField && !isValidLogin && (
            <p className="mt-1 text-sm text-red-600">
              Введите корректный номер телефона или email
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-2">
            Пароль
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="signin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border ${
                password && password.length < 6 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
              } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 pr-12`}
              placeholder="Введите пароль"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {password && password.length < 6 && (
            <p className="mt-1 text-sm text-red-600">
              Пароль должен быть не менее 6 символов
            </p>
          )}
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isValid || signInMutation.isPending}
        >
          {signInMutation.isPending ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Вход...
            </div>
          ) : (
            'Войти'
          )}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Нет учетной записи?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-cyan-600 hover:text-cyan-700 font-medium underline"
          >
            Зарегистрироваться
          </button>
        </p>
      </div>
      
      {signInMutation.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            Неверный логин или пароль. Попробуйте еще раз.
          </p>
        </div>
      )}
    </div>
  )
}