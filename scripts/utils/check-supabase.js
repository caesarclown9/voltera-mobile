#!/usr/bin/env node

/**
 * Утилита для проверки данных в Supabase
 * Использование: node scripts/check-supabase.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: join(__dirname, "..", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ Отсутствуют переменные окружения VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log("🔍 Проверка базы данных Supabase...\n");

  try {
    // Проверяем локации
    const { data: locations, error: locError } = await supabase
      .from("locations")
      .select("*")
      .limit(10);

    if (locError) {
      console.error("❌ Ошибка при получении локаций:", locError);
    } else {
      console.log(`✅ Локации: ${locations?.length || 0} записей`);
      if (locations && locations.length > 0) {
        console.log("   Примеры:");
        locations.slice(0, 3).forEach((loc) => {
          console.log(`   - ${loc.name} (${loc.city})`);
        });
      }
    }

    // Проверяем станции
    const { data: stations, error: stError } = await supabase
      .from("stations")
      .select("*")
      .limit(10);

    if (stError) {
      console.error("❌ Ошибка при получении станций:", stError);
    } else {
      console.log(`\n✅ Станции: ${stations?.length || 0} записей`);
      if (stations && stations.length > 0) {
        console.log("   Примеры:");
        stations.slice(0, 3).forEach((st) => {
          console.log(
            `   - ${st.serial_number} (${st.model}, ${st.power_capacity}кВт)`,
          );
        });
      }
    }

    // Проверяем коннекторы
    const { data: connectors, error: conError } = await supabase
      .from("connectors")
      .select("*")
      .limit(10);

    if (conError) {
      console.error("❌ Ошибка при получении коннекторов:", conError);
    } else {
      console.log(`\n✅ Коннекторы: ${connectors?.length || 0} записей`);
      if (connectors && connectors.length > 0) {
        const types = [...new Set(connectors.map((c) => c.connector_type))];
        console.log(`   Типы: ${types.join(", ")}`);
      }
    }

    // Проверяем пользователей
    const { data: clients, error: clError } = await supabase
      .from("clients")
      .select("*")
      .limit(10);

    if (clError) {
      console.error("❌ Ошибка при получении клиентов:", clError);
    } else {
      console.log(`\n✅ Клиенты: ${clients?.length || 0} записей`);
    }

    // Проверяем сессии зарядки
    const { data: sessions, error: sesError } = await supabase
      .from("charging_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (sesError) {
      console.error("❌ Ошибка при получении сессий:", sesError);
    } else {
      console.log(`\n✅ Сессии зарядки: ${sessions?.length || 0} последних`);
      if (sessions && sessions.length > 0) {
        const statuses = [...new Set(sessions.map((s) => s.status))];
        console.log(`   Статусы: ${statuses.join(", ")}`);
      }
    }

    // Статистика
    console.log("\n📊 Общая статистика:");

    const { count: locCount } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true });

    const { count: stCount } = await supabase
      .from("stations")
      .select("*", { count: "exact", head: true });

    const { count: conCount } = await supabase
      .from("connectors")
      .select("*", { count: "exact", head: true });

    const { count: clCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });

    const { count: sesCount } = await supabase
      .from("charging_sessions")
      .select("*", { count: "exact", head: true });

    console.log(`   Локации: ${locCount || 0}`);
    console.log(`   Станции: ${stCount || 0}`);
    console.log(`   Коннекторы: ${conCount || 0}`);
    console.log(`   Клиенты: ${clCount || 0}`);
    console.log(`   Сессии: ${sesCount || 0}`);

    console.log("\n✨ Проверка завершена!");
  } catch (error) {
    console.error("❌ Произошла ошибка:", error);
  }
}

// Запускаем проверку
checkDatabase();
