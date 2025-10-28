# 📜 Правила Разработки Voltera Mobile App

> **Эти правила ОБЯЗАТЕЛЬНЫ для соблюдения при любых изменениях в проекте.**
>
> Последнее обновление: 2025-10-15

---

## 🎯 Основные Принципы

### 1️⃣ Целостность и Консистентность Проекта

**ПРАВИЛО:** Весь проект должен быть единым целым. Одинаковая функциональность должна быть реализована одинаково во всех местах.

#### Что это значит:

- ✅ **Единый стиль кода** - используем TypeScript с strict mode
- ✅ **Единообразие паттернов** - одинаковая структура hooks, services, components
- ✅ **Консистентная обработка ошибок** - везде используем try-catch с логированием
- ✅ **Единая система состояния** - React Query для server state, Zustand для client state
- ✅ **Согласованность именования** - camelCase для переменных/функций, PascalCase для компонентов

#### Примеры:

**❌ ПЛОХО:**

```typescript
// В одном файле
async function getUser(userId: string) {
  return await supabase.from("users").select("*").eq("id", userId).single();
}

// В другом файле
function fetchUserById(id: string) {
  const { data } = supabase.from("users").select("*").eq("id", id).single();
  return data;
}
```

**✅ ХОРОШО:**

```typescript
// Везде одинаково через React Query hook
export function useUser(userId: string) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
```

---

### 2️⃣ Анализ Перед Действием

**ПРАВИЛО:** Сначала ПОЛНОСТЬЮ разбираемся в контексте, потом действуем.

#### Обязательные шаги перед любым изменением:

1. **Понять текущую реализацию**
   - Прочитать весь связанный код
   - Понять почему это сделано именно так
   - Найти все зависимости

2. **Проанализировать проблему**
   - Точно определить корневую причину
   - Проверить browser console и Capacitor logs
   - Воспроизвести на Android/iOS (если возможно)

3. **Оценить влияние изменений**
   - Какие компоненты затронуты?
   - Какие тесты сломаются?
   - Повлияет ли на Android/iOS по-разному?
   - Повлияет ли на производительность?
   - Повлияет ли на безопасность?

4. **Спланировать решение**
   - Продумать архитектуру изменений
   - Определить необходимые тесты
   - Проверить совместимость с Capacitor

5. **Проверить альтернативы**
   - Есть ли более простое решение?
   - Существует ли Capacitor plugin для этого?
   - Не создаем ли мы технический долг?

#### Чек-лист перед изменением:

```
□ Прочитал весь связанный код
□ Понял почему это работает сейчас
□ Нашел все зависимости (grep/search)
□ Проверил тесты для этого модуля
□ Понял какие тесты могут сломаться
□ Оценил влияние на Android и iOS
□ Спланировал изменения (если большие - написал план)
□ Проверил что не нарушаю другие правила
```

---

### 3️⃣ Сохранение Существующего Функционала

**ПРАВИЛО:** Не меняем существующий функционал кардинально. Только рефакторинг и улучшения.

#### Разрешено:

- ✅ Рефакторинг без изменения поведения
- ✅ Добавление новых hooks/components
- ✅ Оптимизация производительности (если поведение остается прежним)
- ✅ Исправление багов
- ✅ Улучшение обработки ошибок

#### Запрещено:

- ❌ Изменение API контрактов без обсуждения
- ❌ Удаление существующих endpoints/hooks
- ❌ Изменение поведения без обратной совместимости
- ❌ Переписывание больших блоков "с нуля" без крайней необходимости

#### Если НЕОБХОДИМО кардинальное изменение:

1. **ОСТАНОВИСЬ и СПРОСИ пользователя**
2. Объясни почему текущая реализация не подходит
3. Предложи альтернативы
4. Получи явное подтверждение
5. Документируй breaking changes

---

### 4️⃣ Системный Подход к Исправлению Ошибок

**ПРАВИЛО:** Нашел ошибку - проверь ВСЕ возможные места с такой же ошибкой. Исправляем все сразу.

#### Алгоритм:

1. **Идентифицировать паттерн ошибки**

   ```bash
   # Пример: нашли неправильный импорт
   grep -r "import.*from 'deprecated-package'" src/
   grep -r "@deprecated" src/
   ```

2. **Найти все вхождения**
   - Использовать grep/rg для поиска
   - Проверить похожие файлы
   - Проверить тесты

3. **Исправить все вхождения за один раз**
   - Не оставлять "на потом"
   - Сделать один commit со всеми исправлениями
   - Назвать commit понятно: "fix: replace deprecated imports across project"

4. **Проверить что ничего не пропущено**
   - Повторить поиск после исправлений
   - Запустить тесты
   - Проверить что приложение запускается на Android/iOS

---

### 5️⃣ Чистый Код без Костылей

**ПРАВИЛО:** Никаких костылей, дублирований функционала и кода. Код должен быть чистым и поддерживаемым.

#### Запрещено:

❌ **Дублирование кода:**

```typescript
// ПЛОХО - дублирование
function getUserChargingSessions(userId: string) {
  return supabase.from("charging_sessions").select("*").eq("user_id", userId);
}

function fetchChargingSessionsForUser(userId: string) {
  return supabase.from("charging_sessions").select("*").eq("user_id", userId);
}
```

❌ **Костыли вместо решения:**

```typescript
// ПЛОХО - игнорирование ошибки
try {
  const result = await startCharging(stationId);
} catch (error) {
  // TODO: fix this later
}
```

❌ **"Временные" решения:**

```typescript
// ПЛОХО - временный хардкод
if (stationId === "station-123") {
  // HACK: temporary fix
  return specialBehavior();
}
```

#### Разрешено:

✅ **DRY (Don't Repeat Yourself) с React Query:**

```typescript
// ХОРОШО - переиспользуемый hook
export function useChargingSessions(
  userId: string,
  options?: { limit?: number },
) {
  return useQuery({
    queryKey: ["charging-sessions", userId, options],
    queryFn: async () => {
      let query = supabase
        .from("charging_sessions")
        .select("*")
        .eq("user_id", userId);

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

✅ **Правильная обработка ошибок:**

```typescript
// ХОРОШО - логирование и показ пользователю
try {
  const result = await startCharging(stationId);
  return result;
} catch (error) {
  console.error("[Charging] Failed to start:", error);
  Toast.show({
    text: "Не удалось начать зарядку",
    duration: "long",
  });
  throw error;
}
```

---

### 6️⃣ Безопасность Данных

**ПРАВИЛО:** Никакого хардкода чувствительных данных. Все секреты в переменных окружения.

#### Запрещено хардкодить:

- ❌ API ключи (Supabase, Yandex Maps, OCPP)
- ❌ Пароли
- ❌ Database URLs
- ❌ Secret keys
- ❌ OAuth tokens

#### Правильный подход:

**❌ ПЛОХО:**

```typescript
const SUPABASE_URL = "https://xxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const YANDEX_MAPS_KEY = "a1b2c3d4-e5f6-g7h8...";
```

**✅ ХОРОШО:**

```typescript
// vite.config.ts импортирует из .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const YANDEX_MAPS_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
```

**✅ ХОРОШО (.env file):**

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_YANDEX_MAPS_API_KEY=a1b2c3d4-e5f6-g7h8...
```

#### Проверка перед commit:

```bash
# Проверить что нет секретов в коде
grep -r "supabase.*anon.*key.*=" --include="*.ts" --include="*.tsx" src/
grep -r "api.*key.*=" --include="*.ts" --include="*.tsx" src/
```

---

### 7️⃣ Коммуникация и Уточнения

**ПРАВИЛО:** Не придумываем от себя. Есть вопросы - СПРАШИВАЕМ.

#### Когда ОБЯЗАТЕЛЬНО спросить:

1. **Неясные требования**
   - "Сделай лучше" - что именно лучше?
   - "Исправь это" - что именно не так?
   - "Добавь функцию X" - какое поведение ожидается?

2. **Несколько вариантов решения**
   - Вариант A быстрее, но менее гибкий
   - Вариант B медленнее, но расширяемый
   - Какой выбрать?

3. **Потенциальные breaking changes**
   - Это изменение сломает совместимость с backend
   - Это изменение требует обновления всех пользователей
   - Продолжать?

4. **Платформо-специфичные решения**
   - Работает на Android, но не на iOS
   - Нужен ли native plugin?
   - Как протестировать?

---

## 🔧 Дополнительные Правила

### 8️⃣ Тестирование Обязательно

**ПРАВИЛО:** Любое изменение должно быть покрыто тестами.

#### Требования:

- ✅ **Unit tests** для hooks и utilities (Vitest)
- ✅ **Component tests** для UI компонентов (Testing Library)
- ✅ **Обновление тестов** при изменении существующего кода
- ✅ **Проверка coverage** - минимум 70%

#### Запуск тестов:

```bash
# Запустить все тесты
npm run test

# Запустить с UI
npm run test:ui

# Coverage отчет
npm run test:coverage

# Watch mode
npm run test:watch
```

#### Что тестировать:

1. **Happy path** - нормальное поведение
2. **Edge cases** - граничные случаи
3. **Error handling** - обработка ошибок
4. **Platform differences** - Android vs iOS различия
5. **Offline mode** - работа без интернета

---

### 9️⃣ Документирование Кода

**ПРАВИЛО:** Код должен быть понятен без объяснений. Но комментарии и JSDoc обязательны для сложной логики.

#### Обязательно документировать:

**1. Все экспортируемые функции/hooks:**

```typescript
/**
 * Hook для управления процессом зарядки
 *
 * @param stationId - ID зарядной станции
 * @returns Объект с методами управления зарядкой и текущим статусом
 *
 * @example
 * const { startCharging, stopCharging, status } = useCharging(stationId);
 * await startCharging();
 */
export function useCharging(stationId: string) {
  // ...
}
```

**2. Сложные алгоритмы:**

```typescript
// Рассчитываем стоимость с учетом тарифа и времени суток:
// - Дневной тариф (6:00-22:00): base price
// - Ночной тариф (22:00-6:00): base price * 0.7
const price = calculatePrice(kWh, timeOfDay);
```

**3. Capacitor-специфичный код:**

```typescript
/**
 * Сканирование QR-кода станции
 *
 * Требует разрешения на камеру.
 * На iOS работает только в нативном контексте.
 *
 * @throws {Error} Если разрешение отклонено
 */
export async function scanStationQR() {
  // ...
}
```

---

### 🔟 Следование Архитектуре Проекта

**ПРАВИЛО:** Соблюдай установленную архитектуру. Не изобретай новые паттерны.

#### Структура проекта:

```
src/
├── features/           # Feature-based структура
│   ├── auth/           # Аутентификация
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store.ts
│   │   └── types.ts
│   ├── charging/       # Управление зарядкой
│   ├── stations/       # Станции и карта
│   ├── balance/        # Баланс и платежи
│   └── history/        # История зарядок
├── shared/             # Переиспользуемые компоненты
│   ├── components/     # UI компоненты
│   ├── hooks/          # Общие hooks
│   └── utils/          # Утилиты
├── lib/                # Библиотеки и конфиги
│   ├── platform/       # Capacitor abstractions
│   ├── supabase.ts     # Supabase client
│   └── queryClient.ts  # React Query config
├── pages/              # Страницы (route components)
└── App.tsx             # Главный компонент
```

#### Правила размещения кода:

1. **Components - ТОНКИЕ**
   - Только UI логика
   - Вызов hooks
   - Обработка событий
   - НЕ ДОЛЖНО БЫТЬ бизнес-логики!

2. **Hooks - СРЕДНИЕ**
   - React Query для server state
   - Business logic
   - State management
   - Error handling

3. **Services - API CALLS**
   - Только вызовы API
   - Трансформация данных
   - Никакой UI логики

4. **Store (Zustand) - CLIENT STATE**
   - Локальное состояние (UI state)
   - Настройки
   - Кеш

#### Пример правильного разделения:

**❌ ПЛОХО - логика в компоненте:**

```typescript
function ChargingPage() {
    const [status, setStatus] = useState('idle');

    const startCharging = async () => {
        // ПЛОХО - API вызов в компоненте
        const { data } = await supabase
            .from('charging_sessions')
            .insert({ station_id: stationId, user_id: userId });

        setStatus('charging');
    };

    return <Button onClick={startCharging}>Start</Button>;
}
```

**✅ ХОРОШО - логика в hook:**

```typescript
// hooks/useCharging.ts
export function useCharging(stationId: string) {
    return useMutation({
        mutationFn: () => chargingService.startCharging(stationId),
        onSuccess: () => {
            queryClient.invalidateQueries(['charging-status']);
        }
    });
}

// services/chargingService.ts
export const chargingService = {
    async startCharging(stationId: string) {
        const { data, error } = await supabase
            .from('charging_sessions')
            .insert({ station_id: stationId });

        if (error) throw error;
        return data;
    }
};

// components/ChargingPage.tsx
function ChargingPage() {
    const { mutate: startCharging, isPending } = useCharging(stationId);

    return (
        <Button onClick={() => startCharging()} disabled={isPending}>
            {isPending ? 'Starting...' : 'Start Charging'}
        </Button>
    );
}
```

---

### 1️⃣1️⃣ Управление Версиями

**ПРАВИЛО:** Версии управляются автоматически через versionManager.

#### Обновление версии:

```bash
# 1. Обновить версию в package.json
npm version patch  # 1.0.1 -> 1.0.2
npm version minor  # 1.0.1 -> 1.1.0
npm version major  # 1.0.1 -> 2.0.0

# 2. Собрать (автоматически увеличит APP_BUILD)
npm run build

# 3. Синхронизировать с Capacitor
npx cap sync
```

#### Что происходит автоматически:

- `APP_BUILD` увеличивается в `src/lib/versionManager.ts`
- `versionCode` обновляется в `android/app/build.gradle`
- Миграции кешей при обновлении
- Очистка Service Worker cache

---

### 1️⃣2️⃣ Git и Commits

**ПРАВИЛО:** Чистая история коммитов. Осмысленные сообщения.

#### Формат commit message:

```
<type>: <subject>

<body (optional)>
```

**Types:**

- `feat:` - новая функциональность
- `fix:` - исправление бага
- `refactor:` - рефакторинг
- `docs:` - документация
- `test:` - тесты
- `chore:` - обслуживание (зависимости, конфиги)
- `perf:` - улучшение производительности
- `build:` - изменения в build системе

**Примеры:**

```bash
git commit -m "feat: add QR scanner for stations"
git commit -m "fix: resolve charging status update issue"
git commit -m "refactor: extract charging logic to hook"
```

---

### 1️⃣3️⃣ Capacitor и Платформы

**ПРАВИЛО:** Всегда тестируй на обеих платформах. Android ≠ iOS.

#### Платформо-специфичный код:

```typescript
import { Capacitor } from "@capacitor/core";

// Проверка платформы
if (Capacitor.getPlatform() === "ios") {
  // iOS-specific код
} else if (Capacitor.getPlatform() === "android") {
  // Android-specific код
}

// Проверка нативного контекста
if (Capacitor.isNativePlatform()) {
  // Работает только на мобильных
  await BarcodeScanner.scan();
}
```

#### Тестирование:

```bash
# Android
npx cap run android

# iOS (только на macOS)
npx cap run ios

# Web
npm run dev
```

---

### 1️⃣4️⃣ Управление Документацией

**ПРАВИЛО:** Документация ВСЕГДА актуальная. Никаких дубликатов и устаревшего контента.

#### Структура документации:

```
voltera-mobile/
├── README.md              # Главный обзор проекта
├── RULES.md               # Этот файл - правила разработки
├── CHANGELOG.md           # История изменений
├── IOS_DEPLOYMENT.md      # Гайд по деплою в App Store
└── release-backend-fin/   # Справочная документация backend (не коммитим)
```

#### Что ОБЯЗАТЕЛЬНО:

1. **Актуальность**
   - Изменил код → обнови документацию
   - Нашел устаревшее → исправь сразу

2. **Чеклисты с текущим статусом**
   - [x] Реализовано
   - [ ] В процессе
   - [ ] Запланировано

3. **Дата последнего обновления**
   ```markdown
   **Последнее обновление:** 2025-10-15
   **Версия:** 1.0.1
   **Build:** 37
   ```

---

### 1️⃣5️⃣ Code Review Checklist

**ПРАВИЛО:** Перед коммитом проверь этот чеклист.

```
ФУНКЦИОНАЛЬНОСТЬ:
□ Код делает то, что должен
□ Работает на Android
□ Работает на iOS (если возможно протестировать)
□ Работает в web (если применимо)
□ Обработаны edge cases

КАЧЕСТВО КОДА:
□ Следует правилам RULES.md
□ Нет дублирования кода
□ Нет хардкода секретов
□ TypeScript типы корректны
□ ESLint не ругается

АРХИТЕКТУРА:
□ Соответствует структуре проекта
□ Логика в hooks, не в компонентах
□ API вызовы в services

ТЕСТИРОВАНИЕ:
□ Написаны unit тесты (если применимо)
□ Тесты проходят (npm run test)

ДОКУМЕНТАЦИЯ:
□ README.md обновлен (если нужно)
□ CHANGELOG.md обновлен
□ JSDoc для экспортируемых функций

ПРОИЗВОДИТЕЛЬНОСТЬ:
□ React Query используется правильно
□ Нет лишних re-renders
□ Lazy loading где нужно

GIT:
□ Commit message осмысленный
□ Не коммитнул .env или секреты
□ Не коммитнул build артефакты

CAPACITOR:
□ Синхронизировал (npx cap sync)
□ Проверил что нативные функции работают
□ Обновил Info.plist/AndroidManifest (если нужно)
```

---

## 🔄 Обновление Правил

Эти правила могут дополняться по мере развития проекта.

**История изменений:**

- 2025-10-15: Создан файл RULES.md для Voltera Mobile
- Адаптирован под React/TypeScript/Capacitor архитектуру
- Добавлены правила для мобильной разработки

---

## ✅ Подтверждение

**Я, как AI-ассистент, подтверждаю что:**

1. Прочитал и понял все правила
2. Буду следовать им во всех изменениях
3. Буду использовать чек-листы перед финализацией
4. Буду задавать вопросы при неясностях
5. Не буду нарушать эти правила

**Дата:** 2025-10-15

---

**Эти правила - основа качественной разработки Voltera Mobile. Следуй им всегда!** 🚀
