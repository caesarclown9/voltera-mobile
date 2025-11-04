-- Создаем таблицу для избранных станций
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Уникальная комбинация пользователя и локации
  UNIQUE(user_id, location_id)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_location_id ON public.user_favorites(location_id);

-- Настраиваем RLS (Row Level Security)
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои избранные
CREATE POLICY "Users can view their own favorites"
  ON public.user_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователи могут добавлять в свои избранные
CREATE POLICY "Users can insert their own favorites"
  ON public.user_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут удалять из своих избранных
CREATE POLICY "Users can delete their own favorites"
  ON public.user_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Комментарии к таблице
COMMENT ON TABLE public.user_favorites IS 'Избранные станции пользователей';
COMMENT ON COLUMN public.user_favorites.user_id IS 'ID пользователя из auth.users';
COMMENT ON COLUMN public.user_favorites.location_id IS 'ID локации из таблицы locations';