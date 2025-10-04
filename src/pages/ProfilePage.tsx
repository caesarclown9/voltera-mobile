import { ChevronLeft, LogOut, Phone, Mail, Clock, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStatus, useLogout } from '../features/auth/hooks/useAuth';
import { useBalance } from '../features/balance/hooks/useBalance';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStatus();
  const { data: balanceData } = useBalance();
  const logoutMutation = useLogout();
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full bg-yellow-400 hover:bg-yellow-500"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Ваш профиль</h1>
          <div className="w-10" /> {/* Пустое место для симметрии */}
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white mt-2 p-6">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">👤</span>
          </div>
          {user && (
            <>
              <p className="text-xl font-semibold mb-2">{user.name || 'Пользователь'}</p>
              {user.email && (
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600">Баланс</p>
                <p className="text-2xl font-bold text-green-600">{balanceData?.balance || 0} {balanceData?.currency || 'сом'}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-3">
        <button
          onClick={() => navigate('/history')}
          className="w-full bg-cyan-500 text-white py-4 rounded-xl font-semibold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
        >
          <Clock className="w-5 h-5" />
          История зарядок
        </button>

        <button
          onClick={() => navigate('/payments')}
          className="w-full bg-cyan-500 text-white py-4 rounded-xl font-semibold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
        >
          <DollarSign className="w-5 h-5" />
          История платежей
        </button>

        {/* Logout/Login Button */}
        {user ? (
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="w-full bg-red-500 text-white py-4 rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {logoutMutation.isPending ? 'Выход...' : 'Выйти из аккаунта'}
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            Войти в аккаунт
          </button>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-white mt-2 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <h3 className="text-lg font-semibold">
            EvPower - Революция в зарядке электромобилей в Кыргызстане!
          </h3>
        </div>
        
        <p className="text-gray-600 mb-4">
          Оплата происходит через сервис О!Деньги, ваши платежи защищены.
        </p>
        
        <p className="text-gray-600 mb-6">
          Всегда можете позвонить нам на горячую линию.
        </p>
        
        <button 
          onClick={() => window.open('tel:+996555123456', '_self')}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Телефон поддержки
        </button>
      </div>
    </div>
  );
};