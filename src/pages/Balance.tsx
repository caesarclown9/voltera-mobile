import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BalanceCard } from '../features/balance/components/BalanceCard'
import { QRTopup } from '../features/balance/components/QRTopup'
import { useAuthStatus } from '../features/auth/hooks/useAuth'

export default function Balance() {
  const [showQRTopup, setShowQRTopup] = useState(false)
  const { isAuthenticated } = useAuthStatus()
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">💳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Требуется авторизация</h2>
          <p className="text-gray-600">Войдите в аккаунт для просмотра баланса</p>
        </div>
      </div>
    )
  }
  
  const handleTopupSuccess = () => {
    setShowQRTopup(false)
    // Balance will auto-refresh due to query invalidation
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/" className="text-gray-600 hover:text-gray-900 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Баланс</h1>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BalanceCard onTopupClick={() => setShowQRTopup(true)} />
        
        <div className="card mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">История операций</h3>
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>История операций пока пуста</p>
            <p className="text-sm mt-2">Здесь будут отображаться ваши транзакции</p>
          </div>
        </div>
      </main>
      
      {showQRTopup && (
        <QRTopup 
          onClose={() => setShowQRTopup(false)}
          onSuccess={handleTopupSuccess}
        />
      )}
    </div>
  )
}