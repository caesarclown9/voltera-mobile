import { useState } from 'react';
import { ChevronLeft, CreditCard, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBalance } from '@/features/balance/hooks/useBalance';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { data: balance } = useBalance();
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'wallet' | null>(null);

  // Моковые данные истории платежей
  const paymentHistory = [
    {
      id: 1,
      date: '2024-01-15',
      amount: 500,
      method: 'Visa **** 1234',
      status: 'success'
    },
    {
      id: 2,
      date: '2024-01-10',
      amount: 1000,
      method: 'Mastercard **** 5678',
      status: 'success'
    },
    {
      id: 3,
      date: '2024-01-05',
      amount: 250,
      method: 'MBank',
      status: 'failed'
    }
  ];

  const paymentMethods = [
    {
      id: 'card',
      name: 'Банковская карта',
      icon: '💳',
      description: 'Visa, Mastercard'
    },
    {
      id: 'wallet',
      name: 'Электронный кошелек',
      icon: '📱',
      description: 'MBank, O!Деньги, Элсом'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold ml-2">Платежи</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Текущий баланс */}
        <div className="bg-gradient-to-r from-green-500 to-cyan-500 rounded-2xl p-6 text-white">
          <div className="text-sm opacity-90">Текущий баланс</div>
          <div className="text-3xl font-bold mt-1">{balance?.balance || 0} сом</div>
          <button
            onClick={() => navigate('/profile')}
            className="mt-4 bg-white/20 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Пополнить
          </button>
        </div>

        {/* Способы оплаты */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Способы оплаты</h2>
          <div className="space-y-3">
            {paymentMethods.map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id as 'card' | 'wallet')}
                className={`w-full bg-white rounded-xl p-4 flex items-center gap-3 transition-all ${
                  selectedMethod === method.id ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="text-2xl">{method.icon}</div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{method.name}</div>
                  <div className="text-sm text-gray-500">{method.description}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${
                  selectedMethod === method.id
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300'
                }`}>
                  {selectedMethod === method.id && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* История платежей */}
        <div>
          <h2 className="text-lg font-semibold mb-3">История платежей</h2>
          <div className="space-y-3">
            {paymentHistory.map(payment => (
              <div key={payment.id} className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      payment.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {payment.status === 'success'
                        ? <CheckCircle className="w-5 h-5 text-green-600" />
                        : <XCircle className="w-5 h-5 text-red-600" />
                      }
                    </div>
                    <div>
                      <div className="font-medium">+{payment.amount} сом</div>
                      <div className="text-sm text-gray-500">{payment.method}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {new Date(payment.date).toLocaleDateString('ru-RU')}
                    </div>
                    <div className={`text-xs ${
                      payment.status === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {payment.status === 'success' ? 'Успешно' : 'Отклонено'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}