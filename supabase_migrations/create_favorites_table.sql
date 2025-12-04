-- Создаем таблицу для избранных станций
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  location_id VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Уникальная комбинация пользователя и локации
  UNIQUE(user_id, location_id)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_location_id ON public.user_favorites(location_id);

-- Настраиваем RLS (Row Level Security)
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои избранные
-- ВАЖНО: Приводим auth.uid() к text для сравнения с VARCHAR
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

-- Комментарии к таблице
COMMENT ON TABLE public.user_favorites IS 'Избранные станции пользователей';
COMMENT ON COLUMN public.user_favorites.user_id IS 'ID пользователя из таблицы clients (не auth.users!)';
COMMENT ON COLUMN public.user_favorites.location_id IS 'ID локации из таблицы locations';