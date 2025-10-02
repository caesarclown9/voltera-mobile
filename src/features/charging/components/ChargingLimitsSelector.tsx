import { useState, useEffect } from 'react';
import { Zap, DollarSign, Info } from 'lucide-react';

interface ChargingLimitsSelectorProps {
  balance: number;
  pricePerKwh: number;
  maxPowerKw: number;
  onLimitsChange: (limits: ChargingLimits) => void;
  disabled?: boolean;
}

export interface ChargingLimits {
  type: 'energy' | 'amount' | 'none';
  energy_kwh?: number;
  amount_som?: number;
  estimatedDuration?: number; // в минутах
  estimatedCost?: number;
  estimatedEnergy?: number;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];
const QUICK_ENERGY = [5, 10, 20, 30, 50]; // кВт·ч

export function ChargingLimitsSelector({
  balance,
  pricePerKwh,
  maxPowerKw,
  onLimitsChange,
  disabled = false
}: ChargingLimitsSelectorProps) {
  const [limitType, setLimitType] = useState<'energy' | 'amount' | 'none'>('amount');
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [selectedEnergy, setSelectedEnergy] = useState(10);
  const [customValue, setCustomValue] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // Минимальные и максимальные значения
  const MIN_AMOUNT = 50;
  const MAX_AMOUNT = Math.min(2000, balance);
  const MIN_ENERGY = 1; // кВт·ч
  const MAX_ENERGY = 100; // кВт·ч

  // Расчёты
  const calculateEstimates = () => {
    let estimates: Partial<ChargingLimits> = {};

    if (limitType === 'amount') {
      const energy = selectedAmount / pricePerKwh;
      estimates = {
        estimatedEnergy: energy,
        estimatedCost: selectedAmount,
        estimatedDuration: (energy / maxPowerKw) * 60 // минуты
      };
    } else if (limitType === 'energy') {
      const cost = selectedEnergy * pricePerKwh;
      estimates = {
        estimatedEnergy: selectedEnergy,
        estimatedCost: cost,
        estimatedDuration: (selectedEnergy / maxPowerKw) * 60 // минуты
      };
    } else {
      // Полная зарядка
      estimates = {
        estimatedEnergy: undefined,
        estimatedCost: undefined,
        estimatedDuration: undefined
      };
    }

    return estimates;
  };

  // Обновляем лимиты при изменении параметров
  useEffect(() => {
    const estimates = calculateEstimates();
    const limits: ChargingLimits = {
      type: limitType,
      ...(limitType === 'amount' && { amount_som: selectedAmount }),
      ...(limitType === 'energy' && { energy_kwh: selectedEnergy }),
      ...estimates
    };
    onLimitsChange(limits);
  }, [limitType, selectedAmount, selectedEnergy, pricePerKwh, maxPowerKw]);

  const handleQuickAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomValue('');
  };

  const handleQuickEnergySelect = (energy: number) => {
    setSelectedEnergy(energy);
    setCustomValue('');
  };

  const handleCustomValueChange = (value: string) => {
    if (/^\d*\.?\d*$/.test(value)) {
      setCustomValue(value);
      const numValue = parseFloat(value) || 0;

      if (limitType === 'amount') {
        setSelectedAmount(Math.min(Math.max(numValue, MIN_AMOUNT), MAX_AMOUNT));
      } else if (limitType === 'energy') {
        setSelectedEnergy(Math.min(Math.max(numValue, MIN_ENERGY), MAX_ENERGY));
      }
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'н/д';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}ч ${mins}мин`;
    }
    return `${mins} мин`;
  };

  return (
    <div className="space-y-4">
      {/* Выбор типа лимита */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setLimitType('amount')}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-medium transition-all ${
            limitType === 'amount'
              ? 'bg-white text-cyan-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <DollarSign className="w-4 h-4" />
          <span>По сумме</span>
        </button>

        <button
          onClick={() => setLimitType('energy')}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-medium transition-all ${
            limitType === 'energy'
              ? 'bg-white text-cyan-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Zap className="w-4 h-4" />
          <span>По энергии</span>
        </button>

        <button
          onClick={() => setLimitType('none')}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-medium transition-all ${
            limitType === 'none'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>Полный бак</span>
        </button>
      </div>

      {/* Информационная подсказка */}
      <div className="relative">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Info className="w-4 h-4" />
          <span>Как работают лимиты?</span>
        </button>

        {showInfo && (
          <div className="absolute top-8 left-0 right-0 z-10 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="space-y-2 text-sm">
              <div>
                <strong>По сумме:</strong> Зарядка остановится когда будет потрачена указанная сумма
              </div>
              <div>
                <strong>По энергии:</strong> Зарядка остановится после получения указанного количества кВт·ч
              </div>
              <div>
                <strong>Полный бак:</strong> Зарядка до полного заряда батареи
              </div>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="mt-2 text-xs text-cyan-600 hover:text-cyan-700"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>

      {/* Контент в зависимости от типа лимита */}
      {limitType === 'amount' && (
        <div className="space-y-4">
          {/* Быстрый выбор суммы */}
          <div className="grid grid-cols-5 gap-2">
            {QUICK_AMOUNTS.map(amount => (
              <button
                key={amount}
                onClick={() => handleQuickAmountSelect(amount)}
                disabled={disabled || amount > balance}
                className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                  selectedAmount === amount && !customValue
                    ? 'bg-cyan-500 text-white'
                    : amount > balance
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {amount}с
              </button>
            ))}
          </div>

          {/* Ползунок */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Сумма зарядки</span>
              <span className="text-lg font-bold text-cyan-600">{selectedAmount} сом</span>
            </div>

            <input
              type="range"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step="10"
              value={selectedAmount}
              onChange={(e) => {
                setSelectedAmount(Number(e.target.value));
                setCustomValue('');
              }}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                  ((selectedAmount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT)) * 100
                }%, #e5e7eb ${
                  ((selectedAmount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT)) * 100
                }%, #e5e7eb 100%)`
              }}
            />

            <div className="flex justify-between text-xs text-gray-500">
              <span>{MIN_AMOUNT} сом</span>
              <span>{MAX_AMOUNT} сом (макс)</span>
            </div>
          </div>

          {/* Ручной ввод */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Или введите свою сумму
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customValue}
                onChange={(e) => handleCustomValueChange(e.target.value)}
                placeholder={`${MIN_AMOUNT}-${MAX_AMOUNT}`}
                disabled={disabled}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
              />
              <span className="flex items-center px-3 text-gray-500">сом</span>
            </div>
          </div>
        </div>
      )}

      {limitType === 'energy' && (
        <div className="space-y-4">
          {/* Быстрый выбор энергии */}
          <div className="grid grid-cols-5 gap-2">
            {QUICK_ENERGY.map(energy => (
              <button
                key={energy}
                onClick={() => handleQuickEnergySelect(energy)}
                disabled={disabled || energy * pricePerKwh > balance}
                className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                  selectedEnergy === energy && !customValue
                    ? 'bg-cyan-500 text-white'
                    : energy * pricePerKwh > balance
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {energy}кВт
              </button>
            ))}
          </div>

          {/* Ползунок */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Количество энергии</span>
              <span className="text-lg font-bold text-cyan-600">{selectedEnergy} кВт·ч</span>
            </div>

            <input
              type="range"
              min={MIN_ENERGY}
              max={MAX_ENERGY}
              step="1"
              value={selectedEnergy}
              onChange={(e) => {
                setSelectedEnergy(Number(e.target.value));
                setCustomValue('');
              }}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                  ((selectedEnergy - MIN_ENERGY) / (MAX_ENERGY - MIN_ENERGY)) * 100
                }%, #e5e7eb ${
                  ((selectedEnergy - MIN_ENERGY) / (MAX_ENERGY - MIN_ENERGY)) * 100
                }%, #e5e7eb 100%)`
              }}
            />

            <div className="flex justify-between text-xs text-gray-500">
              <span>{MIN_ENERGY} кВт·ч</span>
              <span>{MAX_ENERGY} кВт·ч (макс)</span>
            </div>
          </div>

          {/* Ручной ввод */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Или введите количество кВт·ч
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customValue}
                onChange={(e) => handleCustomValueChange(e.target.value)}
                placeholder={`${MIN_ENERGY}-${MAX_ENERGY}`}
                disabled={disabled}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
              />
              <span className="flex items-center px-3 text-gray-500">кВт·ч</span>
            </div>
          </div>
        </div>
      )}

      {limitType === 'none' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-green-900">Полная зарядка</h4>
              <p className="text-sm text-green-700 mt-1">
                Автомобиль будет заряжаться до полного заполнения батареи.
                Зарядка остановится автоматически при достижении 100%.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Расчётная информация */}
      {limitType !== 'none' && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
          <h4 className="font-medium text-gray-900 mb-2">Предварительный расчёт:</h4>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Получите энергии:</span>
            <span className="font-semibold">
              {limitType === 'amount'
                ? `~${(selectedAmount / pricePerKwh).toFixed(2)}`
                : selectedEnergy} кВт·ч
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Стоимость:</span>
            <span className="font-semibold">
              {limitType === 'energy'
                ? `~${(selectedEnergy * pricePerKwh).toFixed(0)}`
                : selectedAmount} сом
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Время зарядки:</span>
            <span className="font-semibold">
              ~{formatDuration(
                limitType === 'amount'
                  ? ((selectedAmount / pricePerKwh) / maxPowerKw) * 60
                  : (selectedEnergy / maxPowerKw) * 60
              )}
            </span>
          </div>

          {/* Предупреждение о недостатке средств */}
          {limitType === 'energy' && selectedEnergy * pricePerKwh > balance && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ Недостаточно средств. Требуется ~{(selectedEnergy * pricePerKwh).toFixed(0)} сом
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}