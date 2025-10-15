-- Account deletion and anonymization setup
-- Safe to run multiple times (IF NOT EXISTS guards where possible)

-- 1) Columns on clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS delete_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS anonymized BOOLEAN NOT NULL DEFAULT false;

-- 2) Ensure RLS enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 3) Basic SELECT policy (owner can read own row)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'Clients select own'
  ) THEN
    CREATE POLICY "Clients select own" ON public.clients FOR SELECT USING (auth.uid() = id);
  END IF;
END$$;

-- 4) RPC to request deletion (no need to grant UPDATE on table)
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.clients
    SET delete_requested_at = timezone('utc', now())
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO anon, authenticated;

-- 5) Admin-only anonymization function (execute via service role)
CREATE OR REPLACE FUNCTION public.anonymize_client(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove user-favorites
  IF to_regclass('public.user_favorites') IS NOT NULL THEN
    DELETE FROM public.user_favorites WHERE user_id = p_client_id;
  END IF;

  -- Optional unlink of charging sessions (if schema allows)
  IF to_regclass('public.charging_sessions') IS NOT NULL THEN
    BEGIN
      UPDATE public.charging_sessions SET user_id = NULL WHERE user_id = p_client_id;
    EXCEPTION WHEN OTHERS THEN
      -- ignore if FKs disallow; keep linkage
      NULL;
    END;
  END IF;

  -- Optional unlink of payment transactions (retain records for compliance)
  IF to_regclass('public.payment_transactions_odengi') IS NOT NULL THEN
    BEGIN
      UPDATE public.payment_transactions_odengi SET client_id = NULL WHERE client_id = p_client_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Anonymize client row
  UPDATE public.clients
     SET email = NULL,
         name = 'Deleted User',
         phone = NULL,
         anonymized = true,
         deleted_at = timezone('utc', now())
   WHERE id = p_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_client(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymize_client(uuid) TO service_role;



