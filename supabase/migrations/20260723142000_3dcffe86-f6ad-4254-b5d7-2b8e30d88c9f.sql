
-- =============================================================
-- 1. Recette : quantité optionnelle
-- =============================================================
ALTER TABLE public.product_recipes DROP CONSTRAINT IF EXISTS product_recipes_quantity_per_unit_check;
ALTER TABLE public.product_recipes ALTER COLUMN quantity_per_unit DROP NOT NULL;
ALTER TABLE public.product_recipes
  ADD CONSTRAINT product_recipes_quantity_per_unit_check
  CHECK (quantity_per_unit IS NULL OR quantity_per_unit > 0);

-- =============================================================
-- 2. Codes d'inscription (invitation_codes)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  used boolean NOT NULL DEFAULT false,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invitation_codes TO authenticated;
GRANT ALL ON public.invitation_codes TO service_role;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invitation_codes_no_direct ON public.invitation_codes;
CREATE POLICY invitation_codes_no_direct ON public.invitation_codes FOR SELECT
  USING (false); -- accès uniquement via fonctions SECURITY DEFINER

-- =============================================================
-- 3. Abonnements
-- =============================================================
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('trial','active','expired','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('monthly','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL UNIQUE REFERENCES public.bakeries(id) ON DELETE CASCADE,
  status public.subscription_status NOT NULL DEFAULT 'trial',
  plan public.subscription_plan,
  trial_end timestamptz,
  subscription_end timestamptz,
  invitation_code_id uuid REFERENCES public.invitation_codes(id) ON DELETE SET NULL,
  whatsapp_contact text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT
  USING (public.has_bakery_access(bakery_id));

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- 4. Invitations d'employés
-- =============================================================
CREATE TABLE IF NOT EXISTS public.bakery_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bakery_invitations TO authenticated;
GRANT ALL ON public.bakery_invitations TO service_role;
ALTER TABLE public.bakery_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bakery_invitations_select_owner ON public.bakery_invitations;
CREATE POLICY bakery_invitations_select_owner ON public.bakery_invitations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bakery_members m
                 WHERE m.bakery_id = bakery_invitations.bakery_id
                   AND m.user_id = auth.uid() AND m.role = 'owner'));

-- =============================================================
-- 5. Journal d'activité
-- =============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_bakery_created_idx ON public.activity_log(bakery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_user_idx ON public.activity_log(user_id);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_log_select_owner ON public.activity_log;
CREATE POLICY activity_log_select_owner ON public.activity_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bakery_members m
                 WHERE m.bakery_id = activity_log.bakery_id
                   AND m.user_id = auth.uid() AND m.role = 'owner'));
DROP POLICY IF EXISTS activity_log_insert_member ON public.activity_log;
CREATE POLICY activity_log_insert_member ON public.activity_log FOR INSERT
  WITH CHECK (public.has_bakery_access(bakery_id) AND user_id = auth.uid());

-- =============================================================
-- 6. RLS bakeries : UPDATE réservé au owner
-- =============================================================
DROP POLICY IF EXISTS bakeries_update ON public.bakeries;
CREATE POLICY bakeries_update ON public.bakeries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.bakery_members m
                 WHERE m.bakery_id = bakeries.id AND m.user_id = auth.uid() AND m.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bakery_members m
                 WHERE m.bakery_id = bakeries.id AND m.user_id = auth.uid() AND m.role = 'owner'));

-- =============================================================
-- 7. Fonctions équipe
-- =============================================================
CREATE OR REPLACE FUNCTION public.is_bakery_owner(_bakery_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bakery_members
    WHERE bakery_id = _bakery_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.create_invitation(_bakery_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_token text;
  staff_count int;
BEGIN
  IF NOT public.is_bakery_owner(_bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT count(*) INTO staff_count FROM public.bakery_members
    WHERE bakery_id = _bakery_id AND role = 'staff';
  IF staff_count >= 3 THEN RAISE EXCEPTION 'Limite de 3 employés atteinte'; END IF;
  new_token := encode(gen_random_bytes(16), 'hex');
  INSERT INTO public.bakery_invitations (bakery_id, token, created_by)
    VALUES (_bakery_id, new_token, auth.uid());
  RETURN new_token;
END; $$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
  staff_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO inv FROM public.bakery_invitations WHERE token = _token FOR UPDATE;
  IF inv IS NULL THEN RAISE EXCEPTION 'Invitation introuvable'; END IF;
  IF inv.used_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation déjà utilisée'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'Invitation expirée'; END IF;
  IF EXISTS (SELECT 1 FROM public.bakery_members WHERE bakery_id = inv.bakery_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Vous êtes déjà membre de cette boulangerie';
  END IF;
  SELECT count(*) INTO staff_count FROM public.bakery_members
    WHERE bakery_id = inv.bakery_id AND role = 'staff';
  IF staff_count >= 3 THEN RAISE EXCEPTION 'Limite de 3 employés atteinte'; END IF;
  INSERT INTO public.bakery_members (bakery_id, user_id, role)
    VALUES (inv.bakery_id, auth.uid(), 'staff');
  UPDATE public.bakery_invitations SET used_by = auth.uid(), used_at = now()
    WHERE id = inv.id;
  RETURN inv.bakery_id;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_bakery_member(_bakery_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_bakery_owner(_bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'Impossible de se retirer soi-même'; END IF;
  DELETE FROM public.bakery_members
    WHERE bakery_id = _bakery_id AND user_id = _user_id AND role = 'staff';
END; $$;

CREATE OR REPLACE FUNCTION public.transfer_bakery_ownership(_bakery_id uuid, _new_owner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_bakery_owner(_bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bakery_members
    WHERE bakery_id = _bakery_id AND user_id = _new_owner AND role = 'staff') THEN
    RAISE EXCEPTION 'Le nouveau gérant doit être un employé actuel';
  END IF;
  UPDATE public.bakery_members SET role = 'staff'
    WHERE bakery_id = _bakery_id AND user_id = auth.uid();
  UPDATE public.bakery_members SET role = 'owner'
    WHERE bakery_id = _bakery_id AND user_id = _new_owner;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bakery_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_bakery_ownership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bakery_owner(uuid) TO authenticated;

-- =============================================================
-- 8. Trigger d'inscription : validation code + création subscription trial
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_bakery_id uuid;
  bakery_name text;
  code_text text;
  code_row public.invitation_codes;
BEGIN
  bakery_name := COALESCE(
    NEW.raw_user_meta_data->>'bakery_name',
    split_part(COALESCE(NEW.email, 'Ma boulangerie'), '@', 1) || ' — Boulangerie'
  );
  code_text := NULLIF(NEW.raw_user_meta_data->>'invitation_code', '');

  -- Si un code est fourni : le valider
  IF code_text IS NOT NULL THEN
    SELECT * INTO code_row FROM public.invitation_codes WHERE code = code_text FOR UPDATE;
    IF code_row IS NULL THEN
      RAISE EXCEPTION 'Code d''inscription invalide';
    END IF;
    IF code_row.used THEN
      RAISE EXCEPTION 'Ce code a déjà été utilisé';
    END IF;
  END IF;

  INSERT INTO public.bakeries (name) VALUES (bakery_name) RETURNING id INTO new_bakery_id;
  INSERT INTO public.bakery_members (bakery_id, user_id, role)
    VALUES (new_bakery_id, NEW.id, 'owner');

  IF code_text IS NOT NULL THEN
    UPDATE public.invitation_codes
      SET used = true, used_by = NEW.id, used_at = now()
      WHERE id = code_row.id;
    INSERT INTO public.subscriptions (bakery_id, status, trial_end, invitation_code_id)
      VALUES (new_bakery_id, 'trial', now() + interval '14 days', code_row.id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
