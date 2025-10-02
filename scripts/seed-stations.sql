-- Скрипт для добавления тестовых станций в Supabase
-- Выполните этот скрипт в Supabase SQL Editor

-- Очистка существующих данных (опционально)
-- DELETE FROM connectors;
-- DELETE FROM stations;
-- DELETE FROM locations;

-- Добавляем локации в Кыргызстане
INSERT INTO locations (id, name, address, city, latitude, longitude, created_at, updated_at)
VALUES
  ('loc_1', 'EvPower Бишкек Центр', 'ул. Киевская 114', 'Бишкек', 42.8746, 74.5698, NOW(), NOW()),
  ('loc_2', 'EvPower Филармония', 'пр. Чуй 253', 'Бишкек', 42.8775, 74.6036, NOW(), NOW()),
  ('loc_3', 'EvPower Ала-Арча', 'ул. Ахунбаева 98', 'Бишкек', 42.8486, 74.5947, NOW(), NOW()),
  ('loc_4', 'EvPower Ош Базар', 'ул. Абдрахманова 134', 'Бишкек', 42.8674, 74.5916, NOW(), NOW()),
  ('loc_5', 'EvPower Дордой Плаза', 'ул. Ибраимова 115', 'Бишкек', 42.8754, 74.6142, NOW(), NOW()),
  ('loc_6', 'EvPower Ош Центр', 'ул. Ленина 331', 'Ош', 40.5283, 72.7985, NOW(), NOW()),
  ('loc_7', 'EvPower Ош Аэропорт', 'ул. Масалиева 23', 'Ош', 40.6089, 72.7935, NOW(), NOW()),
  ('loc_8', 'EvPower Джалал-Абад', 'ул. Токтогула 28', 'Джалал-Абад', 40.9332, 72.9801, NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = NOW();

-- Добавляем станции
INSERT INTO stations (
  id,
  serial_number,
  location_id,
  model,
  manufacturer,
  power_capacity,
  connector_types,
  status,
  connectors_count,
  price_per_kwh,
  session_fee,
  currency,
  is_available,
  created_at,
  updated_at
)
VALUES
  -- Станции в Бишкеке
  ('st_1', 'EVP-BIS-001', 'loc_1', 'HPC150', 'ABB', 150, ARRAY['CCS2', 'CHAdeMO'], 'active', 2, 15.50, 25.00, 'KGS', true, NOW(), NOW()),
  ('st_2', 'EVP-BIS-002', 'loc_1', 'AC22', 'Schneider', 22, ARRAY['Type2'], 'active', 2, 12.00, 0.00, 'KGS', true, NOW(), NOW()),

  ('st_3', 'EVP-BIS-003', 'loc_2', 'DC60', 'Delta', 60, ARRAY['CCS2'], 'active', 1, 14.00, 20.00, 'KGS', true, NOW(), NOW()),
  ('st_4', 'EVP-BIS-004', 'loc_2', 'AC43', 'ABB', 43, ARRAY['Type2'], 'active', 2, 12.50, 0.00, 'KGS', true, NOW(), NOW()),

  ('st_5', 'EVP-BIS-005', 'loc_3', 'HPC350', 'Tritium', 350, ARRAY['CCS2'], 'active', 1, 18.00, 30.00, 'KGS', true, NOW(), NOW()),
  ('st_6', 'EVP-BIS-006', 'loc_3', 'AC22', 'Phoenix', 22, ARRAY['Type2'], 'maintenance', 2, 11.50, 0.00, 'KGS', false, NOW(), NOW()),

  ('st_7', 'EVP-BIS-007', 'loc_4', 'DC120', 'Efacec', 120, ARRAY['CCS2', 'CHAdeMO'], 'active', 2, 16.00, 25.00, 'KGS', true, NOW(), NOW()),

  ('st_8', 'EVP-BIS-008', 'loc_5', 'AC7', 'Wallbox', 7.4, ARRAY['Type2'], 'active', 1, 10.00, 0.00, 'KGS', true, NOW(), NOW()),
  ('st_9', 'EVP-BIS-009', 'loc_5', 'DC50', 'Circontrol', 50, ARRAY['CCS2'], 'active', 1, 13.50, 20.00, 'KGS', true, NOW(), NOW()),

  -- Станции в Оше
  ('st_10', 'EVP-OSH-001', 'loc_6', 'HPC150', 'ABB', 150, ARRAY['CCS2', 'CHAdeMO'], 'active', 2, 15.00, 25.00, 'KGS', true, NOW(), NOW()),
  ('st_11', 'EVP-OSH-002', 'loc_6', 'AC22', 'Schneider', 22, ARRAY['Type2'], 'active', 2, 11.00, 0.00, 'KGS', true, NOW(), NOW()),

  ('st_12', 'EVP-OSH-003', 'loc_7', 'DC60', 'Delta', 60, ARRAY['CCS2'], 'offline', 1, 13.00, 20.00, 'KGS', false, NOW(), NOW()),

  -- Станция в Джалал-Абаде
  ('st_13', 'EVP-JAL-001', 'loc_8', 'DC120', 'Efacec', 120, ARRAY['CCS2', 'CHAdeMO'], 'active', 2, 14.50, 25.00, 'KGS', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET
  status = EXCLUDED.status,
  is_available = EXCLUDED.is_available,
  price_per_kwh = EXCLUDED.price_per_kwh,
  updated_at = NOW();

-- Добавляем коннекторы для каждой станции
INSERT INTO connectors (
  id,
  station_id,
  connector_type,
  power_kw,
  status,
  created_at,
  updated_at
)
VALUES
  -- Коннекторы для st_1 (HPC150)
  ('con_1_1', 'st_1', 'CCS2', 150, 'available', NOW(), NOW()),
  ('con_1_2', 'st_1', 'CHAdeMO', 150, 'available', NOW(), NOW()),

  -- Коннекторы для st_2 (AC22)
  ('con_2_1', 'st_2', 'Type2', 22, 'available', NOW(), NOW()),
  ('con_2_2', 'st_2', 'Type2', 22, 'occupied', NOW(), NOW()),

  -- Коннекторы для st_3 (DC60)
  ('con_3_1', 'st_3', 'CCS2', 60, 'available', NOW(), NOW()),

  -- Коннекторы для st_4 (AC43)
  ('con_4_1', 'st_4', 'Type2', 43, 'available', NOW(), NOW()),
  ('con_4_2', 'st_4', 'Type2', 43, 'available', NOW(), NOW()),

  -- Коннекторы для st_5 (HPC350)
  ('con_5_1', 'st_5', 'CCS2', 350, 'available', NOW(), NOW()),

  -- Коннекторы для st_6 (AC22 - maintenance)
  ('con_6_1', 'st_6', 'Type2', 22, 'faulted', NOW(), NOW()),
  ('con_6_2', 'st_6', 'Type2', 22, 'faulted', NOW(), NOW()),

  -- Коннекторы для st_7 (DC120)
  ('con_7_1', 'st_7', 'CCS2', 120, 'available', NOW(), NOW()),
  ('con_7_2', 'st_7', 'CHAdeMO', 120, 'occupied', NOW(), NOW()),

  -- Коннекторы для st_8 (AC7)
  ('con_8_1', 'st_8', 'Type2', 7.4, 'available', NOW(), NOW()),

  -- Коннекторы для st_9 (DC50)
  ('con_9_1', 'st_9', 'CCS2', 50, 'available', NOW(), NOW()),

  -- Коннекторы для st_10 (HPC150 Ош)
  ('con_10_1', 'st_10', 'CCS2', 150, 'available', NOW(), NOW()),
  ('con_10_2', 'st_10', 'CHAdeMO', 150, 'available', NOW(), NOW()),

  -- Коннекторы для st_11 (AC22 Ош)
  ('con_11_1', 'st_11', 'Type2', 22, 'available', NOW(), NOW()),
  ('con_11_2', 'st_11', 'Type2', 22, 'available', NOW(), NOW()),

  -- Коннекторы для st_12 (DC60 Ош - offline)
  ('con_12_1', 'st_12', 'CCS2', 60, 'faulted', NOW(), NOW()),

  -- Коннекторы для st_13 (DC120 Джалал-Абад)
  ('con_13_1', 'st_13', 'CCS2', 120, 'available', NOW(), NOW()),
  ('con_13_2', 'st_13', 'CHAdeMO', 120, 'available', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- Проверка результатов
SELECT
  l.city,
  COUNT(DISTINCT l.id) as locations_count,
  COUNT(DISTINCT s.id) as stations_count,
  COUNT(DISTINCT c.id) as connectors_count
FROM locations l
LEFT JOIN stations s ON s.location_id = l.id
LEFT JOIN connectors c ON c.station_id = s.id
GROUP BY l.city
ORDER BY l.city;