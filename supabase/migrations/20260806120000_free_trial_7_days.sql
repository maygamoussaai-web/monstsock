-- ============================================================================
-- 1) Essai gratuit : 14 -> 7 jours (valeur par défaut de la colonne)
-- ============================================================================
ALTER TABLE public.subscriptions
  ALTER COLUMN trial_end SET DEFAULT (now() + interval '7 days');

COMMENT ON COLUMN public.invitation_codes.plan IS
  'Plan associe au code (monthly | annual | trial=7 jours). Cote MonStock, a la consommation du code, recopier ce plan; si trial, fixer subscriptions.trial_end a +7 jours au lieu de definir un plan payant.';

-- ============================================================================
-- 2) Table de suivi "un essai gratuit par personne, jamais deux fois"
--    Cle = email (pas user_id) pour empecher aussi le contournement par
--    suppression/recreation de compte avec la meme adresse.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trial_usage (
  email   text PRIMARY KEY,
  user_id uuid,
  used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_usage ENABLE ROW LEVEL SECURITY;
-- Aucune policy : la table n'est lue/ecrite que par les fonctions SECURITY DEFINER
-- ci-dessous (proprietaires de la table), jamais directement par les clients.

COMMENT ON TABLE public.trial_usage IS
  'Empeche un meme email de beneficier plusieurs fois de l''essai gratuit de 7 jours (inscription directe, code trial, claim_bakery).';

-- ============================================================================
-- 3) handle_new_user : trigger appele a la creation du compte auth.
--    - Avec code d'inscription : comportement existant conserve (monthly /
--      annual / trial via code), mais le "trial via code" respecte desormais
--      la regle une-seule-fois.
--    - SANS code d'inscription : nouveau parcours "essai gratuit direct"
--      accessible depuis la page d'inscription.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_bakery_id uuid;
  bakery_name text;
  invite_code text;
  owner_phone text;
  v_email text;
  v_already_trialed boolean;
  code_row public.invitation_codes%ROWTYPE;
BEGIN
  IF NEW.raw_user_meta_data->>'bakery_name' IS NULL THEN
    RETURN NEW;
  END IF;

  invite_code := NEW.raw_user_meta_data->>'invitation_code';
  owner_phone := NEW.raw_user_meta_data->>'phone';
  bakery_name := NEW.raw_user_meta_data->>'bakery_name';
  v_email := lower(btrim(NEW.email));

  v_already_trialed := EXISTS (SELECT 1 FROM public.trial_usage WHERE email = v_email);

  IF invite_code IS NOT NULL AND btrim(invite_code) <> '' THEN
    -- Parcours avec code d'inscription (inchange, sauf la duree du trial)
    SELECT * INTO code_row FROM public.invitation_codes
      WHERE code = invite_code AND used = false
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Code d''inscription invalide ou déjà utilisé';
    END IF;

    INSERT INTO public.bakeries (name) VALUES (bakery_name) RETURNING id INTO new_bakery_id;
    INSERT INTO public.bakery_members (bakery_id, user_id, role, phone) VALUES (new_bakery_id, NEW.id, 'owner', owner_phone);

    UPDATE public.invitation_codes
      SET used = true, used_by = NEW.id, used_at = now()
      WHERE id = code_row.id;

    IF code_row.plan = 'monthly' THEN
      INSERT INTO public.subscriptions (user_id, bakery_id, status, plan, subscription_start, subscription_end, invitation_code_id)
        VALUES (NEW.id, new_bakery_id, 'active', 'monthly', now(), now() + interval '1 month', code_row.id);
    ELSIF code_row.plan = 'annual' THEN
      INSERT INTO public.subscriptions (user_id, bakery_id, status, plan, subscription_start, subscription_end, invitation_code_id)
        VALUES (NEW.id, new_bakery_id, 'active', 'annual', now(), now() + interval '1 year', code_row.id);
    ELSIF v_already_trialed THEN
      -- Code "trial" mais email a deja consomme son essai gratuit une fois :
      -- le compte et la boulangerie sont bien crees (le code est consomme),
      -- mais aucun nouvel essai n'est accorde ; abonnement cree "expired"
      -- pour que le boulanger soit invite a s'abonner immediatement.
      INSERT INTO public.subscriptions (user_id, bakery_id, status, trial_start, trial_end, invitation_code_id)
        VALUES (NEW.id, new_bakery_id, 'expired', now(), now(), code_row.id);
    ELSE
      INSERT INTO public.subscriptions (user_id, bakery_id, status, trial_start, trial_end, invitation_code_id)
        VALUES (NEW.id, new_bakery_id, 'trial', now(), now() + interval '7 days', code_row.id);
      INSERT INTO public.trial_usage (email, user_id) VALUES (v_email, NEW.id)
        ON CONFLICT (email) DO NOTHING;
    END IF;

  ELSE
    -- Nouveau parcours : essai gratuit de 7 jours directement depuis la page
    -- d'inscription, sans code. Un seul essai gratuit par adresse email, a vie.
    IF v_already_trialed THEN
      RAISE EXCEPTION 'Vous avez déjà bénéficié de l''essai gratuit de 7 jours avec cette adresse e-mail. Contactez-nous pour un abonnement.';
    END IF;

    INSERT INTO public.bakeries (name) VALUES (bakery_name) RETURNING id INTO new_bakery_id;
    INSERT INTO public.bakery_members (bakery_id, user_id, role, phone) VALUES (new_bakery_id, NEW.id, 'owner', owner_phone);

    INSERT INTO public.subscriptions (user_id, bakery_id, status, trial_start, trial_end)
      VALUES (NEW.id, new_bakery_id, 'trial', now(), now() + interval '7 days');

    INSERT INTO public.trial_usage (email, user_id) VALUES (v_email, NEW.id)
      ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN NEW;
END; $function$;

-- ============================================================================
-- 4) use_invitation_code : ajout de la duree 7 jours + verrou "une seule fois"
-- ============================================================================
CREATE OR REPLACE FUNCTION public.use_invitation_code(p_code text, p_bakery_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code_id uuid;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT lower(btrim(email)) INTO v_email FROM auth.users WHERE id = auth.uid();

  IF EXISTS (SELECT 1 FROM public.trial_usage WHERE email = v_email) THEN
    RETURN json_build_object('success', false, 'message', 'Vous avez déjà utilisé votre essai gratuit de 7 jours. Ce code ne peut pas servir à un nouvel essai.');
  END IF;

  SELECT id INTO v_code_id
  FROM public.invitation_codes
  WHERE code = p_code AND used = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Code invalide ou déjà utilisé');
  END IF;

  UPDATE public.invitation_codes
  SET used = true, used_by = auth.uid(), used_at = now()
  WHERE id = v_code_id;

  INSERT INTO public.subscriptions (user_id, bakery_id, status, trial_start, trial_end, invitation_code_id)
  VALUES (auth.uid(), p_bakery_id, 'trial', now(), now() + interval '7 days', v_code_id)
  ON CONFLICT (user_id) DO UPDATE
  SET bakery_id = p_bakery_id, status = 'trial',
      trial_start = now(), trial_end = now() + interval '7 days',
      invitation_code_id = v_code_id, updated_at = now();

  INSERT INTO public.trial_usage (email, user_id) VALUES (v_email, auth.uid())
  ON CONFLICT (email) DO NOTHING;

  RETURN json_build_object('success', true, 'message', 'Essai gratuit de 7 jours activé');
END;
$function$;

-- ============================================================================
-- 5) claim_bakery : meme correctif (7 jours + verrou une seule fois)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_bakery(_bakery_name text, _code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_bakery_id uuid;
  code_row public.invitation_codes%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  IF EXISTS (SELECT 1 FROM public.bakery_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Vous êtes déjà rattaché à une boulangerie';
  END IF;

  IF _bakery_name IS NULL OR btrim(_bakery_name) = '' THEN
    RAISE EXCEPTION 'Nom de la boulangerie obligatoire';
  END IF;
  IF _code IS NULL OR btrim(_code) = '' THEN
    RAISE EXCEPTION 'Code d''inscription obligatoire';
  END IF;

  SELECT lower(btrim(email)) INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO code_row FROM public.invitation_codes WHERE code = _code AND used = false FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code d''inscription invalide ou déjà utilisé';
  END IF;

  INSERT INTO public.bakeries (name) VALUES (_bakery_name) RETURNING id INTO new_bakery_id;
  INSERT INTO public.bakery_members (bakery_id, user_id, role) VALUES (new_bakery_id, auth.uid(), 'owner');

  UPDATE public.invitation_codes SET used = true, used_by = auth.uid(), used_at = now() WHERE id = code_row.id;

  IF EXISTS (SELECT 1 FROM public.trial_usage WHERE email = v_email) THEN
    INSERT INTO public.subscriptions (user_id, bakery_id, status, trial_start, trial_end, invitation_code_id)
    VALUES (auth.uid(), new_bakery_id, 'expired', now(), now(), code_row.id);
  ELSE
    INSERT INTO public.subscriptions (user_id, bakery_id, status, trial_start, trial_end, invitation_code_id)
    VALUES (auth.uid(), new_bakery_id, 'trial', now(), now() + interval '7 days', code_row.id);
    INSERT INTO public.trial_usage (email, user_id) VALUES (v_email, auth.uid())
      ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN new_bakery_id;
END; $function$;
