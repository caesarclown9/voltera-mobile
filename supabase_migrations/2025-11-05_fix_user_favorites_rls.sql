-- ============================================================================
-- Миграция: Исправление RLS политик для user_favorites
-- Дата: 2025-11-05
-- Проблема: RLS политики сравнивали UUID с VARCHAR без приведения типов
-- Решение: Добавляем ::text к auth.uid() для корректного сравнения
-- ============================================================================

-- Шаг 1: Удаляем старые RLS политики (если они есть)
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can view own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Admins can view all favorites" ON public.user_favorites;

-- Шаг 2: Создаем ИСПРАВЛЕННЫЕ RLS политики с приведением типов
-- Политика: пользователи могут видеть только свои избранные
CREATE POLICY "Users can view own favorites"
  ON public.user_favorites
  FOR SELECT
  USING ((auth.uid())::text = user_id);

-- Политика: пользователи могут добавлять в свои избранные
CREATE POLICY "Users can insert own favorites"
  ON public.user_favorites
  FOR INSERT
  WITH CHECK ((auth.uid())::text = user_id);

-- Политика: пользователи могут удалять из своих избранных
CREATE POLICY "Users can delete own favorites"
  ON public.user_favorites
  FOR DELETE
  USING ((auth.uid())::text = user_id);

-- Политика: админы могут видеть все избранные
CREATE POLICY "Admins can view all favorites"
  ON public.user_favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id)::text = (auth.uid())::text
        AND u.role IN ('admin', 'superadmin', 'operator')
        AND u.is_active = true
    )
  );

-- Комментарии
COMMENT ON POLICY "Users can view own favorites" ON public.user_favorites IS
  'Пользователи могут видеть только свои избранные станции. Использует приведение типов (auth.uid())::text для сравнения с VARCHAR.';
COMMENT ON POLICY "Users can insert own favorites" ON public.user_favorites IS
  'Пользователи могут добавлять только свои избранные станции.';
COMMENT ON POLICY "Users can delete own favorites" ON public.user_favorites IS
  'Пользователи могут удалять только свои избранные станции.';
COMMENT ON POLICY "Admins can view all favorites" ON public.user_favorites IS
  'Администраторы могут видеть избранные станции всех пользователей.';
