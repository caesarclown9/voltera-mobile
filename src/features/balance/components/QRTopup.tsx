import { useState, useEffect } from 'react'
import { useQRTopup, usePaymentMonitoring } from '../hooks/useBalance'
import { safeParseInt } from '../../../shared/utils/parsers'

interface QRTopupProps {
  onClose: () => void
  onSuccess: () => void
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000]

export function QRTopup({ onClose, onSuccess }: QRTopupProps) {
  const [step, setStep] = useState<'amount' | 'qr' | 'success'>('amount')
  const [amount, setAmount] = useState(100)
  const [customAmount, setCustomAmount] = useState('')
  const [qrData, setQrData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { mutateAsync: createQRTopup } = useQRTopup()
  const { paymentStatus, monitoring, monitorPayment } = usePaymentMonitoring()
  
  // Check payment status
  useEffect(() => {
    if (paymentStatus?.status === 1 && step === 'qr') {
      setStep('success')
      setTimeout(() => {
        onSuccess()
      }, 2000)
    }
  }, [paymentStatus, step, onSuccess])
  
  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount)
    setCustomAmount('')
  }
  
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d*$/.test(value)) {
      setCustomAmount(value)
      setAmount(safeParseInt(value, 0))
    }
  }
  
  const handleGenerateQR = async () => {
    if (amount < 10) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await createQRTopup({ amount, description: 'Пополнение баланса' })
      
      console.log('QR Topup API Response:', result) // Debug log
      
      if (result) {
        setQrData(result)
        setStep('qr')
        
        // Start monitoring payment
        monitorPayment(
          result.invoice_id,
          () => {
            setStep('success')
            setTimeout(() => {
              onSuccess()
            }, 2000)
          },
          (errorMessage: string) => {
            setError(errorMessage)
          }
        )
      }
    } catch (error) {
      
      setError('Не удалось создать QR код')
    } finally {
      setLoading(false)
    }
  }
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const getTimeLeft = () => {
    if (!qrData?.expires_at) return 0
    const expiresAt = new Date(qrData.expires_at).getTime()
    const now = new Date().getTime()
    return Math.max(0, Math.floor((expiresAt - now) / 1000))
  }
  
  const [timeLeft, setTimeLeft] = useState(getTimeLeft())
  
  // Update timer
  if (step === 'qr' && timeLeft > 0) {
    setTimeout(() => {
      setTimeLeft(getTimeLeft())
    }, 1000)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'amount' && 'Пополнение баланса'}
            {step === 'qr' && 'Сканируйте QR код'}
            {step === 'success' && 'Успешно!'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {/* Amount Selection */}
          {step === 'amount' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Выберите сумму пополнения
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {QUICK_AMOUNTS.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => handleAmountSelect(quickAmount)}
                      className={`py-3 px-4 rounded-lg border font-medium transition-colors ${
                        amount === quickAmount && !customAmount
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {quickAmount} сом
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label htmlFor="custom-amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Или введите свою сумму
                </label>
                <input
                  type="text"
                  id="custom-amount"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="input"
                  placeholder="Сумма в сомах"
                />
                {amount > 0 && amount < 10 && (
                  <p className="mt-1 text-sm text-red-600">
                    Минимальная сумма пополнения: 10 сом
                  </p>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">К пополнению:</span>
                  <span className="text-xl font-bold text-primary-600">{amount} сом</span>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              <button
                onClick={handleGenerateQR}
                disabled={amount < 10 || loading}
                className="w-full btn btn-primary"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-2"></div>
                    Генерация QR...
                  </div>
                ) : (
                  'Создать QR код'
                )}
              </button>
            </div>
          )}
          
          {/* QR Code Display */}
          {step === 'qr' && qrData && (
            <div className="space-y-6 text-center">
              <div>
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                  {qrData.qr_code ? (
                    <img 
                      src={`data:image/png;base64,${qrData.qr_code}`} 
                      alt="QR код для оплаты"
                      className="w-48 h-48 mx-auto"
                    />
                  ) : qrData.qr_code_url ? (
                    <img 
                      src={qrData.qr_code_url} 
                      alt="QR код для оплаты"
                      className="w-48 h-48 mx-auto"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400">QR код недоступен</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Сумма: <span className="font-semibold">{amount} сом</span>
                </p>
              </div>
              
              <div className="space-y-3">
                <p className="text-gray-700">
                  Сканируйте QR код в приложении O!Dengi или другого банка
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-yellow-800">
                      QR код истекает через: <span className="font-bold">{formatTime(timeLeft)}</span>
                    </span>
                  </div>
                </div>
                
                {monitoring && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-center">
                      <div className="spinner mr-2"></div>
                      <span className="text-blue-800">Ожидание оплаты...</span>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('amount')}
                  className="flex-1 btn btn-secondary"
                >
                  Изменить сумму
                </button>
                {qrData.payment_url ? (
                  <a
                    href={qrData.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 btn btn-primary text-center"
                  >
                    Открыть O!Dengi
                  </a>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex-1 btn btn-primary"
                  >
                    Закрыть
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Success */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Баланс пополнен!</h3>
                <p className="text-gray-600">
                  На ваш счет зачислено {paymentStatus?.amount} сом
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}