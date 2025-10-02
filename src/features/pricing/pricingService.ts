import { supabase } from '../../shared/config/supabase';
import { pricingCache } from './pricingCache';
import type { 
  PricingResult, 
  TariffRule,
  SessionCostBreakdown,
  CachedPricing
} from './types';
import { 
  DEFAULT_CURRENCY, 
  DEFAULT_RATE_PER_KWH, 
  CACHE_TTL 
} from './types';
import { parsePrice } from '../../shared/utils/parsers';

class PricingService {
  private cache = new Map<string, CachedPricing>();
  private initialized = false;

  /**
   * Инициализирует сервис и кэш
   */
  private async initialize() {
    if (this.initialized) return;
    await pricingCache.init();
    this.initialized = true;
  }

  /**
   * Рассчитывает текущий тариф для станции
   */
  async calculatePricing(
    stationId: string,
    connectorType?: string,
    clientId?: string,
    powerKw?: number
  ): Promise<PricingResult> {
    await this.initialize();
    
    // Проверяем memory кэш
    const cacheKey = `${stationId}-${connectorType}-${clientId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Проверяем IndexedDB кэш для offline режима
    const offlineCached = await pricingCache.getCachedPricing(stationId, connectorType, clientId);
    if (offlineCached) {
      // Обновляем memory кэш
      this.cache.set(cacheKey, {
        stationId: stationId,
        data: offlineCached,
        timestamp: Date.now()
      });
      return offlineCached;
    }

    try {
      // 1. Получаем данные станции с тарифным планом
      const { data: station, error: stationError } = await supabase
        .from('stations')
        .select(`
          id,
          serial_number,
          price_per_kwh,
          session_fee,
          currency,
          tariff_plan_id,
          location_id
        `)
        .eq('serial_number', stationId)
        .single();

      if (stationError || !station) {
        console.error('Error fetching station:', stationError);
        return this.getDefaultPricing();
      }

      // 2. Проверяем клиентский тариф (VIP, корпоративный)
      if (clientId) {
        const clientPricing = await this.getClientTariff(clientId, stationId);
        if (clientPricing) {
          await this.cacheResult(cacheKey, clientPricing);
          return clientPricing;
        }
      }

      // 3. Проверяем индивидуальную цену станции
      const stationPrice = parsePrice(station.price_per_kwh);
      if (stationPrice > 0) {
        const stationPricing: PricingResult = {
          rate_per_kwh: stationPrice,
          rate_per_minute: 0,
          session_fee: parsePrice(station.session_fee, 0),
          parking_fee_per_minute: 0,
          currency: station.currency || DEFAULT_CURRENCY,
          active_rule: 'Индивидуальный тариф станции',
          rule_details: { type: 'station_specific' },
          time_based: false,
          next_rate_change: null
        };
        await this.cacheResult(cacheKey, stationPricing);
        return stationPricing;
      }

      // 4. Ищем правило из тарифного плана
      if (station.tariff_plan_id) {
        const rule = await this.findApplicableRule(
          station.tariff_plan_id,
          connectorType,
          powerKw
        );

        if (rule) {
          const rulePricing = this.buildPricingFromRule(rule, station.tariff_plan_id);
          await this.cacheResult(cacheKey, rulePricing);
          return rulePricing;
        }
      }

      // 5. Возвращаем дефолтный тариф
      return this.getDefaultPricing();

    } catch (error) {
      console.error('Error calculating pricing:', error);
      return this.getDefaultPricing();
    }
  }

  /**
   * Получает клиентский тариф если есть
   */
  private async getClientTariff(
    clientId: string, 
    stationId: string
  ): Promise<PricingResult | null> {
    try {
      const now = new Date().toISOString();
      
      const { data: clientTariff, error } = await supabase
        .from('client_tariffs')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .lte('valid_from', now)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching client tariff:', error);
        return null;
      }

      if (!clientTariff) return null;

      // Если есть фиксированная ставка
      if (clientTariff.fixed_rate_per_kwh) {
        return {
          rate_per_kwh: clientTariff.fixed_rate_per_kwh,
          rate_per_minute: clientTariff.fixed_rate_per_minute || 0,
          session_fee: clientTariff.session_fee || 0,
          parking_fee_per_minute: 0,
          currency: DEFAULT_CURRENCY,
          active_rule: clientTariff.description || 'Персональный тариф',
          rule_details: { 
            type: 'client_fixed',
            tariff_id: clientTariff.id
          },
          time_based: false,
          next_rate_change: null,
          is_client_tariff: true
        };
      }

      // Если есть процент скидки, нужно получить базовый тариф
      if (clientTariff.discount_percent && clientTariff.tariff_plan_id) {
        const basePricing = await this.calculatePricing(stationId);
        return {
          ...basePricing,
          rate_per_kwh: basePricing.rate_per_kwh * (1 - clientTariff.discount_percent / 100),
          active_rule: `${basePricing.active_rule} (скидка ${clientTariff.discount_percent}%)`,
          is_client_tariff: true
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching client tariff:', error);
      return null;
    }
  }

  /**
   * Находит применимое правило тарифа
   */
  private async findApplicableRule(
    tariffPlanId: string,
    connectorType?: string,
    powerKw?: number
  ): Promise<TariffRule | null> {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
      const weekday = now.getDay() || 7; // 0=Sunday -> 7
      const isWeekend = weekday >= 6;

      // Получаем все активные правила для тарифного плана
      const { data: rules, error } = await supabase
        .from('tariff_rules')
        .select('*')
        .eq('tariff_plan_id', tariffPlanId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error || !rules || rules.length === 0) {
        console.error('Error fetching tariff rules:', error);
        return null;
      }

      // Фильтруем правила по условиям
      const applicableRules = rules.filter(rule => {
        // Проверка типа коннектора
        if (connectorType && rule.connector_type !== 'ALL' && rule.connector_type !== connectorType) {
          return false;
        }

        // Проверка мощности
        if (powerKw) {
          if (rule.power_min && powerKw < rule.power_min) return false;
          if (rule.power_max && powerKw > rule.power_max) return false;
        }

        // Проверка дня недели
        if (rule.days_of_week && rule.days_of_week.length > 0) {
          if (!rule.days_of_week.includes(weekday)) return false;
        } else if (rule.is_weekend !== null && rule.is_weekend !== undefined) {
          if (rule.is_weekend !== isWeekend) return false;
        }

        // Проверка времени
        if (rule.time_start && rule.time_end) {
          if (!this.isTimeInRange(currentTime, rule.time_start, rule.time_end)) {
            return false;
          }
        }

        // Проверка периода действия
        if (rule.valid_from && new Date(rule.valid_from) > now) return false;
        if (rule.valid_until && new Date(rule.valid_until) < now) return false;

        return true;
      });

      // Возвращаем правило с наивысшим приоритетом
      return applicableRules.length > 0 ? applicableRules[0] : null;

    } catch (error) {
      console.error('Error finding applicable rule:', error);
      return null;
    }
  }

  /**
   * Проверяет попадает ли время в диапазон
   */
  private isTimeInRange(current: string, start: string, end: string): boolean {
    // Если конец больше начала - обычный диапазон
    if (start <= end) {
      return current >= start && current <= end;
    }
    // Если конец меньше начала - диапазон через полночь
    return current >= start || current <= end;
  }

  /**
   * Создает PricingResult из правила тарифа
   */
  private buildPricingFromRule(rule: TariffRule, tariffPlanId: string): PricingResult {
    // Рассчитываем когда будет следующее изменение тарифа
    const nextChange = this.calculateNextRateChange(rule);

    return {
      rate_per_kwh: rule.price || 0,
      rate_per_minute: rule.price_per_minute || 0,
      session_fee: rule.session_fee || 0,
      parking_fee_per_minute: rule.parking_fee_per_minute || 0,
      currency: rule.currency || DEFAULT_CURRENCY,
      active_rule: rule.name || 'Тариф по расписанию',
      rule_details: {
        rule_id: rule.id,
        description: rule.description,
        time_based: !!(rule.time_start && rule.time_end),
        days: rule.days_of_week,
        weekend: rule.is_weekend
      },
      time_based: !!(rule.time_start && rule.time_end),
      next_rate_change: nextChange,
      tariff_plan_id: tariffPlanId
    };
  }

  /**
   * Рассчитывает время следующего изменения тарифа
   */
  private calculateNextRateChange(rule: TariffRule): Date | null {
    if (!rule.time_end) return null;

    const now = new Date();
    const [hours, minutes] = rule.time_end.split(':').map(Number);
    
    const nextChange = new Date(now);
    nextChange.setHours(hours, minutes, 0, 0);

    // Если время уже прошло сегодня, переносим на завтра
    if (nextChange <= now) {
      nextChange.setDate(nextChange.getDate() + 1);
    }

    return nextChange;
  }

  /**
   * Возвращает дефолтный тариф
   */
  private getDefaultPricing(): PricingResult {
    return {
      rate_per_kwh: DEFAULT_RATE_PER_KWH,
      rate_per_minute: 0,
      session_fee: 0,
      parking_fee_per_minute: 0,
      currency: DEFAULT_CURRENCY,
      active_rule: 'Базовый тариф',
      rule_details: { type: 'default' },
      time_based: false,
      next_rate_change: null
    };
  }

  /**
   * Кэширует результат
   */
  private async cacheResult(key: string, data: PricingResult): Promise<void> {
    // Memory кэш
    this.cache.set(key, {
      stationId: key.split('-')[0],
      data,
      timestamp: Date.now()
    });
    
    // IndexedDB кэш для offline
    const [stationId, connectorType, clientId] = key.split('-');
    await pricingCache.cachePricing(
      stationId, 
      connectorType === 'undefined' ? undefined : connectorType,
      clientId === 'undefined' ? undefined : clientId,
      data
    );
  }

  /**
   * Рассчитывает стоимость сессии
   */
  calculateSessionCost(
    energyKwh: number,
    durationMinutes: number,
    pricing: PricingResult
  ): SessionCostBreakdown {
    const breakdown: SessionCostBreakdown = {
      energy_cost: 0,
      time_cost: 0,
      session_fee: 0,
      parking_fee: 0,
      base_amount: 0,
      discount_amount: 0,
      final_amount: 0,
      currency: pricing.currency
    };

    // Расчет по энергии
    if (pricing.rate_per_kwh > 0) {
      breakdown.energy_cost = energyKwh * pricing.rate_per_kwh;
    }

    // Расчет по времени
    if (pricing.rate_per_minute > 0) {
      breakdown.time_cost = durationMinutes * pricing.rate_per_minute;
    }

    // Фиксированная плата за сессию
    if (pricing.session_fee > 0) {
      breakdown.session_fee = pricing.session_fee;
    }

    // Плата за парковку (если есть)
    if (pricing.parking_fee_per_minute > 0) {
      breakdown.parking_fee = durationMinutes * pricing.parking_fee_per_minute;
    }

    // Итоги
    breakdown.base_amount = 
      breakdown.energy_cost + 
      breakdown.time_cost + 
      breakdown.session_fee + 
      breakdown.parking_fee;

    breakdown.final_amount = breakdown.base_amount - breakdown.discount_amount;

    return breakdown;
  }

  /**
   * Получает тарифы на день для станции
   */
  async getDayPricingSchedule(
    stationId: string,
    connectorType?: string,
    clientId?: string
  ): Promise<Array<{ time: string; label: string; rate: number }>> {
    const schedule = [];
    const times = [
      { hour: 0, label: 'Ночь (00:00)' },
      { hour: 6, label: 'Утро (06:00)' },
      { hour: 9, label: 'Начало дня (09:00)' },
      { hour: 12, label: 'День (12:00)' },
      { hour: 15, label: 'После обеда (15:00)' },
      { hour: 18, label: 'Вечер (18:00)' },
      { hour: 21, label: 'Поздний вечер (21:00)' }
    ];

    for (const timeSlot of times) {
      // Временно меняем время для расчета
      const testDate = new Date();
      testDate.setHours(timeSlot.hour, 0, 0, 0);
      
      // Очищаем кэш для получения актуального тарифа
      const cacheKey = `${stationId}-${connectorType}-${clientId}`;
      this.cache.delete(cacheKey);
      
      const pricing = await this.calculatePricing(stationId, connectorType, clientId);
      
      schedule.push({
        time: `${timeSlot.hour.toString().padStart(2, '0')}:00`,
        label: timeSlot.label,
        rate: pricing.rate_per_kwh
      });
    }

    return schedule;
  }

  /**
   * Очищает кэш
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const pricingService = new PricingService();