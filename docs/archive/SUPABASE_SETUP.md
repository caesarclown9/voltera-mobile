# 🔧 Инструкция по настройке Supabase MCP

## Что нужно сделать:

### 1. Получите данные из Supabase Dashboard:

1. Войдите в [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект EvPower
3. Перейдите в **Settings → API**
4. Скопируйте следующие данные:

### 2. Заполните файл `.env.supabase`:

```bash
# URL вашего проекта (из раздела Configuration → URL)
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co

# Anon Key (из раздела Project API keys → anon public)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (из раздела Project API keys → service_role)
# ⚠️ ВАЖНО: Этот ключ даёт полный доступ к БД!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Project Ref (это часть между https:// и .supabase.co в URL)
SUPABASE_PROJECT_REF=xxxxxxxxxxxxxxxxxxxx

# Database Password (Settings → Database → Database password)
SUPABASE_DB_PASSWORD=your-db-password

# JWT Secret (Settings → API → JWT Settings → JWT Secret)
SUPABASE_JWT_SECRET=your-jwt-secret
```

### 3. Заполните `supabase-mcp-config.json`:

Вставьте в файл ваши реальные значения:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "ваш_url_здесь",
        "SUPABASE_SERVICE_ROLE_KEY": "ваш_service_role_key_здесь"
      }
    }
  }
}
```

### 4. Проверка подключения:

После заполнения я смогу:
- Посмотреть структуру таблиц в БД
- Проверить RLS политики
- Увидеть существующие функции и триггеры
- Проанализировать связи между таблицами
- Проверить данные пользователей и сессий

## 🔐 Безопасность:

1. **НИКОГДА** не коммитьте `.env.supabase` в git!
2. Добавьте в `.gitignore`:
```
.env.supabase
supabase-mcp-config.json
```

3. Service Role Key даёт полный доступ к БД - используйте только для разработки!

## Что мне нужно от вас:

Пожалуйста, вставьте:
1. **SUPABASE_URL** - URL вашего проекта
2. **SUPABASE_SERVICE_ROLE_KEY** - ключ сервисной роли

Это позволит мне подключиться к вашей БД и проанализировать:
- Какие таблицы есть для пользователей
- Как хранятся данные о балансе
- Есть ли таблицы для истории зарядок
- Как связаны client_id с auth.users
- Какие RLS политики настроены

После этого я смогу правильно интегрировать все API вызовы с соблюдением целостности проекта.