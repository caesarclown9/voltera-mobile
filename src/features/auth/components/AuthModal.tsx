import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignUpForm'
import { useAuthStatus } from '../hooks/useAuth'
import { X } from 'lucide-react'

interface AuthModalProps {
  isOpen?: boolean
  onClose?: () => void
  allowSkip?: boolean // Можно ли пропустить авторизацию
  requireAuth?: boolean // Требуется ли обязательная авторизация
}

export function AuthModal({
  isOpen: controlledIsOpen,
  onClose,
  allowSkip = true,
  requireAuth = false
}: AuthModalProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [hasSkipped, setHasSkipped] = useState(false)
  const { isAuthenticated, isInitialized } = useAuthStatus()

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

  // Показываем модалку при первом запуске если пользователь не авторизован и не пропускал
  useEffect(() => {
    // Не показываем модалку до завершения инициализации
    if (!isInitialized) {
      return
    }

    const skippedAuth = localStorage.getItem('skipped_auth')
    if (skippedAuth) {
      setHasSkipped(true)
    }

    if (!isAuthenticated && !skippedAuth && !requireAuth) {
      setInternalIsOpen(true)
    } else if (!isAuthenticated && requireAuth) {
      setInternalIsOpen(true)
    }
  }, [isAuthenticated, requireAuth, isInitialized])

  const handleAuthSuccess = () => {
    setInternalIsOpen(false)
    onClose?.()
  }

  const handleSkip = () => {
    if (allowSkip && !requireAuth) {
      localStorage.setItem('skipped_auth', 'true')
      setHasSkipped(true)
      setInternalIsOpen(false)
      onClose?.()
    }
  }

  const switchToSignUp = () => {
    setMode('signup')
  }

  const switchToSignIn = () => {
    setMode('signin')
  }

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={allowSkip && !requireAuth ? handleSkip : undefined}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          {mode === 'signin' ? (
            <SignInForm
              onSuccess={handleAuthSuccess}
              onSwitchToSignUp={switchToSignUp}
            />
          ) : (
            <SignUpForm
              onSuccess={handleAuthSuccess}
              onSwitchToSignIn={switchToSignIn}
            />
          )}

          {/* Кнопка "Продолжить без входа" */}
          {allowSkip && !requireAuth && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handleSkip}
              className="mt-4 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Продолжить без входа
            </motion.button>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  )
}