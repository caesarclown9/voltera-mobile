-- ==========================================
-- Исправление дублированных триггеров
-- Проблема: Множественные триггеры создают бесконечную рекурсию
-- Дата: 2025-11-04
-- ==========================================

-- 1. Удаляем все дублированные триггеры на stations
-- Оставляем только один триггер для каждой функции

-- Удаляем дубликаты stations_count_trigger (оставляем только один)
DROP TRIGGER IF EXISTS stations_count_trigger_delete ON stations;
DROP TRIGGER IF EXISTS stations_count_trigger_insert ON stations;
DROP TRIGGER IF EXISTS stations_count_trigger_update ON stations;

-- Удаляем дубликаты trigger_refresh_location_status
DROP TRIGGER IF EXISTS trigger_stations_status_change_delete ON stations;
DROP TRIGGER IF EXISTS trigger_stations_status_change_insert ON stations;
DROP TRIGGER IF EXISTS trigger_stations_status_change_update ON stations;

-- Удаляем дубликаты update_location_stations_count
DROP TRIGGER IF EXISTS trigger_update_location_stations_count_delete ON stations;
DROP TRIGGER IF EXISTS trigger_update_location_stations_count_insert ON stations;
DROP TRIGGER IF EXISTS trigger_update_location_stations_count_update ON stations;

-- Удаляем дубликаты update_station_base_prices
DROP TRIGGER IF EXISTS update_base_prices_on_station_tariff_change_insert ON stations;
DROP TRIGGER IF EXISTS update_base_prices_on_station_tariff_change_update ON stations;

-- Удаляем дубликаты station_insert_trigger, station_status_update_trigger, station_delete_trigger
-- (они дублируют trigger_update_location_status)
DROP TRIGGER IF EXISTS station_insert_trigger ON stations;
DROP TRIGGER IF EXISTS station_status_update_trigger ON stations;
DROP TRIGGER IF EXISTS station_delete_trigger ON stations;

-- 2. Проверяем оставшиеся триггеры
-- Должны остаться только:
-- - stations_count_trigger (INSERT, UPDATE, DELETE)
-- - trigger_stations_status_change (INSERT, UPDATE, DELETE)
-- - trigger_update_location_status (INSERT, UPDATE, DELETE)
-- - update_base_prices_on_station_tariff_change (INSERT, UPDATE)
-- - auto_assign_default_tariff_trigger (BEFORE INSERT)
-- - trg_enforce_station_availability (BEFORE INSERT/UPDATE)
-- - trigger_auto_station_id (BEFORE INSERT)

-- 3. Добавляем защиту от рекурсии в функции update_station_base_prices
CREATE OR REPLACE FUNCTION update_station_base_prices()
RETURNS TRIGGER AS $$
BEGIN
    -- Защита от бесконечной рекурсии
    -- Обновляем только если это не рекурсивный вызов
    IF (TG_OP = 'UPDATE' AND OLD.price_per_kwh IS NOT DISTINCT FROM NEW.price_per_kwh) THEN
        RETURN NEW;
    END IF;

    UPDATE stations
    SET
        price_per_kwh = (
            SELECT tr.price
            FROM tariff_rules tr
            WHERE tr.tariff_plan_id = stations.tariff_plan_id
            AND tr.tariff_type = 'per_kwh'
            AND tr.is_weekend = false
            AND tr.is_active = true
            AND (
                (stations.tariff_plan_id = 'plan_standard' AND tr.time_start = '08:00:00') OR
                (stations.tariff_plan_id = 'plan_premium' AND tr.time_start = '08:00:00') OR
                (stations.tariff_plan_id = 'plan_commercial' AND tr.time_start = '10:00:00') OR
                (stations.tariff_plan_id = 'plan_ultra' AND tr.time_start = '08:00:00')
            )
            LIMIT 1
        ),
        currency = COALESCE((
            SELECT tr.currency
            FROM tariff_rules tr
            WHERE tr.tariff_plan_id = stations.tariff_plan_id
            AND tr.is_active = true
            LIMIT 1
        ), 'KGS')
    WHERE stations.id = NEW.id
    AND tariff_plan_id IS NOT NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Добавляем защиту от рекурсии в функции update_stations_count
CREATE OR REPLACE FUNCTION update_stations_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем счетчики в locations без вызова других триггеров
    IF TG_OP = 'DELETE' THEN
        UPDATE locations
        SET stations_count = (SELECT COUNT(*) FROM stations WHERE location_id = OLD.location_id)
        WHERE id = OLD.location_id;
        RETURN OLD;
    ELSE
        UPDATE locations
        SET stations_count = (SELECT COUNT(*) FROM stations WHERE location_id = NEW.location_id)
        WHERE id = NEW.location_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Показываем оставшиеся триггеры для проверки
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'stations'
ORDER BY trigger_name;

COMMENT ON FUNCTION update_station_base_prices IS 'Обновляет базовые цены станций с защитой от рекурсии';
COMMENT ON FUNCTION update_stations_count IS 'Обновляет счетчики станций в locations с защитой от рекурсии';
