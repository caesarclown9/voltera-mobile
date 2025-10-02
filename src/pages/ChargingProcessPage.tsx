import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Battery, 
  Zap, 
  Clock, 
  DollarSign, 
  Activity,
  XCircle,
  ChevronLeft,
  Loader2,
  WifiOff
} from 'lucide-react';
import { useCharging } from '../features/charging/hooks/useCharging';
import { useChargingStatusPolling, ChargingStates } from '../features/charging/hooks/useChargingStatusPolling';
import { PricingBreakdown } from '../features/pricing/components/PricingBreakdown';
import { pricingService } from '../features/pricing/pricingService';
import type { PricingResult } from '../features/pricing/types';
import { useAuthStore } from '../features/auth/store';
import { useToast } from '../shared/hooks/useToast';
import { logAndHandleError } from '../shared/utils/errorHandling';

export const ChargingProcessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams();
  const localSessionId = sessionId || '';

  // Получаем stationId и лимиты из state (переданы из ChargingPage)
  const stationId = location.state?.stationId || 'EVI-0011';
  const chargingLimits = location.state?.chargingLimits;
  const [currentPricing, setCurrentPricing] = useState<PricingResult | null>(null);
  const { user } = useAuthStore();
  const toast = useToast();
  
  // Hooks
  const { stopCharging, isStoppingCharging } = useCharging();
  
  // Правильный HTTP polling каждые 10 секунд
  const { 
    chargingData, 
    isLoading, 
    error,
    isPolling 
  } = useChargingStatusPolling(localSessionId, {
    initialStationId: stationId,
    onStatusChange: () => {
      // Status changes are handled internally
    },
    onComplete: (data) => {
      // Сохраняем финальные данные для страницы завершения
      sessionStorage.setItem('lastChargingData', JSON.stringify(data));
      setTimeout(() => {
        navigate(`/charging-complete/${localSessionId}`);
      }, 2000);
    },
    onError: (_err) => {
      // Логируем только если это не начальная ошибка связывания
      // console.error('Polling error:', _err);
    }
  });
  
  // Загружаем тариф для станции
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const pricing = await pricingService.calculatePricing(
          stationId,
          undefined,
          user?.id
        );
        setCurrentPricing(pricing);
      } catch (error) {
        const handled = logAndHandleError(error, 'ChargingProcessPage.loadPricing');
        toast.error(handled.message);
      }
    };
    
    loadPricing();
  }, [stationId, user?.id]);
  
  // Расчет прогресса
  const calculateProgress = () => {
    if (!chargingData) return 0;
    
    // Если есть прогресс от backend
    if (chargingData.progressPercent !== undefined) {
      return chargingData.progressPercent;
    }
    
    // Иначе рассчитываем сами
    if (chargingData.limitType === 'energy' && chargingData.limitValue) {
      return Math.min((chargingData.energyConsumedKwh / chargingData.limitValue) * 100, 100);
    }
    
    // По умолчанию считаем что цель 10 кВт·ч
    return Math.min((chargingData.energyConsumedKwh / 10) * 100, 100);
  };
  
  // Форматирование времени с секундами
  const formatTimeWithSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleStopCharging = async () => {
    if (!localSessionId) return;
    
    const result = await stopCharging(localSessionId);
    if (result.success) {
      // Сохраняем данные о возврате для страницы завершения
      if (result.data) {
        sessionStorage.setItem('chargingStopResult', JSON.stringify(result.data));
      }
      navigate(`/charging-complete/${localSessionId}`);
    } else {
      // Показываем ошибку пользователю
      toast.error(result.message || 'Не удалось остановить зарядку');
    }
  };
  
  // Обработка завершения уже в хуке через onComplete
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-600 mx-auto" />
          <p className="mt-4 text-gray-600">Загружаем данные зарядки...</p>
        </div>
      </div>
    );
  }
  
  // Ошибка загрузки данных
  if (error && !chargingData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="w-16 h-16 text-orange-500 mx-auto" />
          <p className="mt-4 text-xl text-gray-800">Ошибка получения данных</p>
          <p className="mt-2 text-sm text-gray-600">{error.message}</p>
          <button 
            onClick={() => navigate('/stations')}
            className="mt-6 px-6 py-3 bg-cyan-500 text-white rounded-lg"
          >
            К станциям
          </button>
        </div>
      </div>
    );
  }
  
  // Нет данных
  if (!chargingData && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <p className="mt-4 text-xl text-gray-800">Сессия зарядки не найдена</p>
          <button 
            onClick={() => navigate('/stations')}
            className="mt-6 px-6 py-3 bg-cyan-500 text-white rounded-lg"
          >
            К станциям
          </button>
        </div>
      </div>
    );
  }
  
  const progress = calculateProgress();
  // Показываем кнопку остановки только при статусе 'started'
  const isCharging = chargingData?.status === ChargingStates.STARTED || 
                     chargingData?.status === ChargingStates.CHARGING;
  
  return (
    <div className={`min-h-screen bg-gradient-to-b from-cyan-50 to-white ${isCharging ? 'pb-40' : 'pb-20'}`}>
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Процесс зарядки</h1>
          <div className="w-10" />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Station Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{chargingData?.stationId || stationId}</h2>
              <p className="text-sm text-gray-500">Коннектор #1</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              chargingData?.status === ChargingStates.STARTED || chargingData?.status === ChargingStates.CHARGING ? 'bg-green-100 text-green-700' : 
              chargingData?.status === ChargingStates.PREPARING ? 'bg-yellow-100 text-yellow-700' :
              chargingData?.status === ChargingStates.FINISHING ? 'bg-orange-100 text-orange-700' :
              chargingData?.status === ChargingStates.STOPPED || chargingData?.status === ChargingStates.COMPLETED ? 'bg-blue-100 text-blue-700' :
              chargingData?.status === ChargingStates.ERROR ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {chargingData?.status === ChargingStates.STARTED || chargingData?.status === ChargingStates.CHARGING ? 'Заряжается' : 
               chargingData?.status === ChargingStates.PREPARING ? 'Подготовка' :
               chargingData?.status === ChargingStates.FINISHING ? 'Завершение' :
               chargingData?.status === ChargingStates.STOPPED || chargingData?.status === ChargingStates.COMPLETED ? 'Завершено' : 
               chargingData?.status === ChargingStates.ERROR ? 'Ошибка' :
               chargingData?.status || 'Ожидание'}
            </div>
          </div>
          
          {/* Progress Circle */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="#e5e7eb"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="#06b6d4"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
              <Battery className="w-12 h-12 text-cyan-600 mb-2" />
              <span className="text-3xl font-bold">
                {chargingData?.evBatterySoc !== undefined 
                  ? `${Math.round(chargingData.evBatterySoc)}%`
                  : Math.round(progress) + '%'
                }
              </span>
              <span className="text-xs text-gray-500 text-center">
                {chargingData?.evBatterySoc !== undefined 
                  ? 'Заряд авто'
                  : 'Прогресс'
                }
              </span>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Power */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-600">Мощность</span>
              </div>
              <p className="text-2xl font-bold">{(chargingData?.chargingPower || 0).toFixed(1)}</p>
              <p className="text-xs text-gray-500">кВт</p>
            </div>

            {/* Energy */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Получено</span>
              </div>
              <p className="text-2xl font-bold">{(chargingData?.energyConsumedKwh || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                кВт⋅ч
                {chargingLimits?.type === 'energy' && chargingLimits.energy_kwh && (
                  <span className="text-gray-400"> / {chargingLimits.energy_kwh}</span>
                )}
              </p>
            </div>

            {/* Time */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">Время</span>
              </div>
              <p className="text-2xl font-bold">{formatTimeWithSeconds(chargingData?.duration || 0)}</p>
              <p className="text-xs text-gray-500">чч:мм:сс</p>
            </div>

            {/* Cost */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-cyan-500" />
                <span className="text-sm text-gray-600">Стоимость</span>
              </div>
              <p className="text-2xl font-bold">{(chargingData?.currentAmount || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                KGS
                {chargingLimits?.type === 'amount' && chargingLimits.amount_som && (
                  <span className="text-gray-400"> / {chargingLimits.amount_som}</span>
                )}
              </p>
            </div>
          </div>

          {/* Charging Limits Info */}
          {chargingLimits && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <span className="font-medium">Тип зарядки:</span>
                <span>
                  {chargingLimits.type === 'none' && 'Полный бак'}
                  {chargingLimits.type === 'amount' && `Лимит ${chargingLimits.amount_som} сом`}
                  {chargingLimits.type === 'energy' && `Лимит ${chargingLimits.energy_kwh} кВт·ч`}
                </span>
              </div>
              {chargingLimits.type !== 'none' && (
                <div className="text-xs text-blue-600 mt-1">
                  Зарядка остановится автоматически при достижении лимита
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Pricing Breakdown */}
        {currentPricing && chargingData && (
          <div className="mt-6">
            <PricingBreakdown
              energyKwh={chargingData.energyConsumedKwh}
              durationMinutes={Math.floor(chargingData.duration / 60)}
              pricing={currentPricing}
              compact={true}
            />
          </div>
        )}
        
        {/* Real-time updates indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-600">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            chargingData?.stationOnline ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <span>
            {isPolling ? 'Обновление каждые 15 секунд' : 'Ожидание данных...'}
            {!chargingData?.stationOnline && ' (станция офлайн)'}
          </span>
        </div>
        
        {/* Completion Message */}
        {chargingData?.status === ChargingStates.COMPLETED && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700 font-semibold">Зарядка завершена!</p>
            <p className="text-sm text-green-600 mt-1">Перенаправление...</p>
          </div>
        )}
      </div>
      
      {/* Fixed Stop Button - учитываем высоту bottom navigation (64px) */}
      {isCharging && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 z-40">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleStopCharging}
              disabled={isStoppingCharging}
              className="w-full bg-red-500 text-white py-4 rounded-xl font-semibold 
                       hover:bg-red-600 transition-colors disabled:opacity-50 
                       disabled:cursor-not-allowed flex items-center justify-center gap-2
                       shadow-lg"
            >
              {isStoppingCharging ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Останавливаем...
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Остановить зарядку
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};