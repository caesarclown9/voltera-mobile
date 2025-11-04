#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

async function checkRelations() {
  // Проверяем локации со станциями
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, stations(id, serial_number, location_id)");

  console.log("Локации и станции:");
  locations?.forEach((loc) => {
    console.log(`- ${loc.name} (${loc.id})`);
    if (loc.stations?.length > 0) {
      loc.stations.forEach((st) => {
        console.log(
          `  └─ ${st.serial_number} (location_id: ${st.location_id})`,
        );
      });
    } else {
      console.log("  └─ НЕТ СТАНЦИЙ");
    }
  });

  // Проверяем станции отдельно
  const { data: stations } = await supabase
    .from("stations")
    .select("id, serial_number, location_id");

  console.log("\nВсе станции:");
  stations?.forEach((st) => {
    console.log(
      `- ${st.serial_number} (id: ${st.id}, location_id: ${st.location_id})`,
    );
  });
}

checkRelations();
