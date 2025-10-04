#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugFlow() {
  console.log('🔍 Отладка потока загрузки станций:\n');

  // 1. Проверяем что в Supabase
  console.log('1️⃣ Данные в Supabase:');
  const { data: locations } = await supabase
    .from('locations')
    .select(`
      id,
      name,
      address,
      city,
      latitude,
      longitude,
      stations (
        id,
        serial_number,
        model,
        manufacturer,
        power_capacity,
        connector_types,
        status,
        connectors_count,
        price_per_kwh,
        session_fee,
        currency,
        is_available
      )
    `)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  console.log('Locations:', JSON.stringify(locations, null, 2));

  // 2. Что возвращает stationService.getAllStations()
  console.log('\n2️⃣ После обработки stationService:');

  if (locations && locations.length > 0) {
    const location = locations[0];
    const allStations = location.stations || [];

    console.log('- Location ID:', location.id);
    console.log('- Location Name:', location.name);
    console.log('- Stations count:', allStations.length);
    console.log('- First station:', allStations[0]);

    // Проверяем доступность
    let hasAvailable = false;
    allStations.forEach(station => {
      if (station.is_available === true || station.status === 'active') {
        hasAvailable = true;
      }
    });

    console.log('- Has available stations:', hasAvailable);
    console.log('- Location will have is_available:', hasAvailable || allStations.some(s => s.status === 'active'));
  }

  // 3. Проверяем коннекторы
  console.log('\n3️⃣ Коннекторы:');
  const { data: connectors } = await supabase
    .from('connectors')
    .select('*');

  console.log('Total connectors:', connectors?.length || 0);
  if (connectors && connectors.length > 0) {
    console.log('Connector types:', [...new Set(connectors.map(c => c.connector_type))]);
  }
}

debugFlow();