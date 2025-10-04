import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Читаем конфигурацию из .env.supabase
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.supabase') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDatabase() {
  console.log('🔍 Analyzing Supabase Database Structure\n');
  console.log('URL:', supabaseUrl);
  console.log('---\n');

  try {
    // 1. Проверяем известные таблицы
    console.log('📊 Checking tables:\n');
    const knownTables = ['clients', 'users', 'charging_sessions', 'transactions', 'stations', 'locations'];

    for (const table of knownTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`✅ Table '${table}' exists (${count || 0} rows)`);
        } else {
          console.log(`❌ Table '${table}': ${error.message}`);
        }
      } catch (e) {
        console.log(`❌ Table '${table}' error:`, e.message);
      }
    }

    // 2. Проверяем структуру таблицы clients
    console.log('\n👥 Checking clients table structure:');
    const { data: clientSample, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .limit(1);

    if (!clientError) {
      if (clientSample && clientSample.length > 0) {
        console.log('Columns:', Object.keys(clientSample[0]).join(', '));
        // Скрываем чувствительные данные
        const sample = { ...clientSample[0] };
        if (sample.email) sample.email = sample.email.substring(0, 3) + '***';
        if (sample.phone) sample.phone = sample.phone.substring(0, 4) + '***';
        console.log('Sample structure:', JSON.stringify(sample, null, 2));
      } else {
        console.log('Table is empty');
      }
    } else {
      console.log('Error accessing clients table:', clientError.message);
    }

    // 3. Проверяем auth.users
    console.log('\n🔐 Checking auth.users:');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (!usersError && users) {
      console.log(`Total users: ${users.length}`);
      if (users.length > 0) {
        console.log('Sample user structure:', {
          id: users[0].id,
          email: users[0].email ? users[0].email.substring(0, 3) + '***' : null,
          phone: users[0].phone ? users[0].phone.substring(0, 4) + '***' : null,
          created_at: users[0].created_at,
          metadata_keys: Object.keys(users[0].user_metadata || {}),
          app_metadata_keys: Object.keys(users[0].app_metadata || {})
        });

        // Проверяем связь
        const { data: linkedClient } = await supabase
          .from('clients')
          .select('id, email, phone, balance')
          .eq('id', users[0].id)
          .single();

        if (linkedClient) {
          console.log('✅ User-Client link confirmed for user:', users[0].id);
        } else {
          console.log('⚠️ No client record for user:', users[0].id);
        }
      }
    } else {
      console.log('Error accessing auth.users:', usersError?.message);
    }

    // 4. Анализируем все найденные таблицы
    console.log('\n📋 Detailed table analysis:');

    // Проверяем clients подробно
    const { data: clientColumns } = await supabase
      .from('clients')
      .select('*')
      .limit(0);

    if (clientColumns !== null) {
      console.log('\nClients table ready for use ✅');
    }

    // 5. Проверяем связь с EvPower API
    console.log('\n🔗 Integration points:');
    console.log('- Auth: Supabase Auth (email/phone)');
    console.log('- User data: clients table (id, email, phone, balance)');
    console.log('- Charging/Stations: External EvPower API');
    console.log('- Payment: External EvPower API');

  } catch (error) {
    console.error('Analysis error:', error);
  }
}

analyzeDatabase().then(() => {
  console.log('\n✅ Analysis complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});