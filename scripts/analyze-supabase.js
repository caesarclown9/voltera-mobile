const { createClient } = require('@supabase/supabase-js');

// Читаем конфигурацию из .env.supabase
require('dotenv').config({ path: '.env.supabase' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDatabase() {
  console.log('🔍 Analyzing Supabase Database Structure\n');

  try {
    // 1. Получаем список таблиц
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      // Альтернативный способ - попробуем известные таблицы
      console.log('📊 Checking known tables:\n');

      const knownTables = ['clients', 'users', 'charging_sessions', 'transactions', 'stations', 'locations'];

      for (const table of knownTables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (!error) {
            console.log(`✅ Table '${table}' exists (${count || 0} rows)`);
          } else {
            console.log(`❌ Table '${table}' not found or no access`);
          }
        } catch (e) {
          console.log(`❌ Table '${table}' error:`, e.message);
        }
      }
    } else {
      console.log('📊 Database tables:', tables.map(t => t.table_name).join(', '));
    }

    // 2. Проверяем структуру таблицы clients
    console.log('\n👥 Checking clients table structure:');
    const { data: clientSample, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .limit(1);

    if (!clientError && clientSample && clientSample[0]) {
      console.log('Columns:', Object.keys(clientSample[0]).join(', '));
      console.log('Sample:', JSON.stringify(clientSample[0], null, 2));
    } else if (clientError) {
      console.log('Error accessing clients table:', clientError.message);
    }

    // 3. Проверяем auth.users
    console.log('\n🔐 Checking auth.users:');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (!usersError) {
      console.log(`Total users: ${users.length}`);
      if (users.length > 0) {
        console.log('Sample user structure:', {
          id: users[0].id,
          email: users[0].email,
          phone: users[0].phone,
          created_at: users[0].created_at,
          metadata_keys: Object.keys(users[0].user_metadata || {})
        });
      }
    } else {
      console.log('Error accessing auth.users:', usersError.message);
    }

    // 4. Проверяем RLS политики
    console.log('\n🔒 Checking RLS policies on clients table:');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'clients' })
      .select('*');

    if (!policiesError && policies) {
      console.log('RLS policies found:', policies.length);
    } else {
      console.log('Could not check RLS policies (may need custom function)');
    }

    // 5. Проверяем функции
    console.log('\n🔧 Checking database functions:');
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_type', 'FUNCTION');

    if (!functionsError && functions) {
      console.log('Functions:', functions.map(f => f.routine_name).join(', '));
    } else {
      console.log('Could not list functions');
    }

    // 6. Тестируем связь между auth.users и clients
    console.log('\n🔗 Testing auth.users <-> clients relationship:');
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
      users && users[0] ? users[0].id : 'test-id'
    );

    if (user && !authError) {
      const { data: client, error: clientLinkError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', user.id)
        .single();

      if (client && !clientLinkError) {
        console.log('✅ User-Client link works: auth.users.id = clients.id');
      } else {
        console.log('⚠️ No matching client for user or different linking');
      }
    }

  } catch (error) {
    console.error('Analysis error:', error);
  }
}

analyzeDatabase().then(() => {
  console.log('\n✅ Analysis complete');
  process.exit(0);
});