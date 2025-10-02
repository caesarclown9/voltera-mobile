# 📋 Backend Update Requirements

## Необходимые изменения в Backend для синхронизации с Mobile App

### 1. 🔄 Синхронизация баланса

**Проблема:** Баланс хранится в двух местах - Supabase и EvPower API

**Решение:**
```python
# При любом изменении баланса в EvPower API
async def update_balance(client_id: str, new_balance: float, transaction_type: str):
    # 1. Обновляем в вашей БД
    await update_evpower_balance(client_id, new_balance)

    # 2. Синхронизируем с Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    result = await supabase.table('clients').update({
        'balance': new_balance,
        'updated_at': datetime.now().isoformat()
    }).eq('id', client_id).execute()

    # 3. Записываем транзакцию в Supabase
    await supabase.table('transactions').insert({
        'client_id': client_id,
        'type': transaction_type,  # 'topup', 'charge', 'refund'
        'amount': amount_changed,
        'balance_before': old_balance,
        'balance_after': new_balance,
        'created_at': datetime.now().isoformat()
    }).execute()
```

### 2. 📝 Сохранение истории зарядок

**Добавить эндпоинт для синхронизации:**
```python
@app.post("/api/v1/charging/sync-history")
async def sync_charging_history(session_data: ChargingSession):
    # Сохраняем в Supabase для быстрого доступа
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    await supabase.table('charging_sessions').insert({
        'id': session_data.session_id,
        'client_id': session_data.client_id,
        'station_id': session_data.station_id,
        'connector_id': session_data.connector_id,
        'start_time': session_data.start_time,
        'end_time': session_data.end_time,
        'energy_consumed': session_data.energy_consumed,
        'total_cost': session_data.total_cost,
        'status': session_data.status
    }).execute()
```

### 3. 🆔 Унификация Client ID

**Текущая проблема:** Разные ID в разных системах

**Решение:**
- Использовать UUID из Supabase Auth как единственный client_id
- При регистрации через EvPower API создавать запись в Supabase

```python
@app.post("/api/v1/auth/register")
async def register(data: RegisterData):
    # 1. Создаём пользователя в Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    auth_result = await supabase.auth.admin.create_user({
        'email': data.email,
        'password': data.password,
        'user_metadata': {'phone': data.phone}
    })

    # 2. Используем Supabase UUID как client_id
    client_id = auth_result.user.id

    # 3. Создаём запись в вашей БД с этим же ID
    await create_evpower_client(
        client_id=client_id,  # Тот же UUID
        phone=data.phone,
        email=data.email
    )
```

### 4. 🔐 Валидация токенов

**Добавить middleware для проверки Supabase токенов:**
```python
async def verify_supabase_token(authorization: str = Header()):
    token = authorization.replace("Bearer ", "")

    # Проверяем токен через Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    user = await supabase.auth.get_user(token)

    if not user:
        raise HTTPException(401, "Invalid token")

    # Возвращаем client_id (он же user.id)
    return user.id
```

### 5. 📊 Эндпоинты для истории

**Новые эндпоинты:**
```python
# История зарядок из Supabase (быстрый доступ)
@app.get("/api/v1/charging/history/{client_id}")
async def get_charging_history(client_id: str, limit: int = 50):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    result = await supabase.table('charging_sessions')\
        .select('*')\
        .eq('client_id', client_id)\
        .order('created_at', desc=True)\
        .limit(limit)\
        .execute()

    return result.data

# История транзакций
@app.get("/api/v1/balance/history/{client_id}")
async def get_transaction_history(client_id: str, limit: int = 50):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    result = await supabase.table('transactions')\
        .select('*')\
        .eq('client_id', client_id)\
        .order('created_at', desc=True)\
        .limit(limit)\
        .execute()

    return result.data
```

### 6. 🔄 WebSocket для real-time синхронизации

**Отправлять обновления баланса через WebSocket:**
```python
async def broadcast_balance_update(client_id: str, new_balance: float):
    await websocket_manager.send_personal_message(
        message={
            'type': 'balance_update',
            'client_id': client_id,
            'balance': new_balance,
            'timestamp': datetime.now().isoformat()
        },
        client_id=client_id
    )
```

### 7. 📱 Webhooks для синхронизации

**Добавить webhook для Supabase:**
```python
@app.post("/api/v1/webhooks/supabase")
async def supabase_webhook(
    payload: dict,
    signature: str = Header(alias="X-Supabase-Signature")
):
    # Проверяем подпись
    if not verify_webhook_signature(payload, signature, SUPABASE_WEBHOOK_SECRET):
        raise HTTPException(401, "Invalid signature")

    # Обрабатываем события
    if payload['type'] == 'INSERT' and payload['table'] == 'clients':
        # Новый пользователь в Supabase - создаём в EvPower
        await create_evpower_client(payload['record'])

    elif payload['type'] == 'UPDATE' and payload['table'] == 'clients':
        # Обновление данных пользователя
        await sync_client_data(payload['record'])
```

## 🎯 Приоритеты внедрения:

1. **Критично (сразу):**
   - Синхронизация баланса при пополнении
   - Сохранение истории зарядок в Supabase
   - Использование единого UUID как client_id

2. **Важно (в течение недели):**
   - Эндпоинты для истории
   - WebSocket обновления баланса

3. **Желательно (позже):**
   - Webhook синхронизация
   - Полная миграция на Supabase Auth

## ⚠️ Важные моменты:

1. **Безопасность баланса:**
   - Баланс ТОЛЬКО увеличивается через подтверждённые платежи
   - Баланс ТОЛЬКО уменьшается через завершённые зарядки
   - Все изменения логируются в transactions

2. **Консистентность данных:**
   - При любом изменении в одной системе - синхронизация с другой
   - При конфликтах - EvPower API является источником правды для зарядок
   - Supabase является источником правды для auth и профилей

3. **Обратная совместимость:**
   - Старые эндпоинты продолжают работать
   - Новые эндпоинты добавляются параллельно
   - Постепенная миграция без breaking changes

## 📞 Контакты для обсуждения:
- Mobile Dev: [ваш контакт]
- Backend Dev: [контакт backend]

---
*Последнее обновление: 2025-09-25*