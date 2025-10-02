import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import type { TransactionHistoryItem } from '../types';

interface TransactionCardProps {
  transaction: TransactionHistoryItem;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getIcon = () => {
    switch (transaction.type) {
      case 'topup':
        return <ArrowDownCircle className="w-6 h-6 text-green-600" />;
      case 'charge':
        return <ArrowUpCircle className="w-6 h-6 text-red-600" />;
      case 'refund':
        return <RefreshCw className="w-6 h-6 text-blue-600" />;
    }
  };

  const getAmountColor = () => {
    switch (transaction.type) {
      case 'topup':
      case 'refund':
        return 'text-green-600';
      case 'charge':
        return 'text-red-600';
    }
  };

  const getPaymentMethodText = () => {
    switch (transaction.paymentMethod) {
      case 'qr_odengi':
        return 'O!Dengi';
      case 'card_obank':
        return 'Банковская карта';
      case 'token':
        return 'Сохранённая карта';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-gray-900">{transaction.description}</p>
              <p className="text-sm text-gray-500 mt-1">{formatDate(transaction.timestamp)}</p>
              {transaction.paymentMethod && (
                <p className="text-xs text-gray-400 mt-1">{getPaymentMethodText()}</p>
              )}
            </div>

            {/* Amount */}
            <div className="text-right">
              <p className={`font-semibold ${getAmountColor()}`}>
                {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} сом
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Баланс: {transaction.balance_after.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status badge if not success */}
      {transaction.status !== 'success' && (
        <div className="mt-3">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            transaction.status === 'pending'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {transaction.status === 'pending' ? 'В обработке' : 'Ошибка'}
          </span>
        </div>
      )}
    </div>
  );
}