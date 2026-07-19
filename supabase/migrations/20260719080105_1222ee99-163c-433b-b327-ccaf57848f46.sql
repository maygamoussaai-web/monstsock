-- ============================================================
-- MonStock — Refonte complète (multi-tenant boulangerie)
-- ============================================================

-- Drop legacy
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP FUNCTION IF EXISTS public.apply_stock_movement() CASCADE;

-- Utility: updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============================================================
-- Enums
-- ============================================================
DO $$ BEGIN CREATE TYPE public.material_unit AS ENUM ('kg','g','L','mL','unite'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.product_unit AS ENUM ('unite','piece','kg','g'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.bakery_role AS ENUM ('owner','staff'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.batch_status AS ENUM ('draft','completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sales_status AS ENUM ('open','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ledger_kind AS ENUM ('purchase','batch_consume','batch_produce','sale','loss','adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Bakeries + membership
-- ============================================================
CREATE TABLE public.bakeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bakeries TO authenticated;
GRANT ALL ON public.bakeries TO service_role;
ALTER TABLE public.bakeries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bakery_members (
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.bakery_role NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bakery_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bakery_members TO authenticated;
GRANT ALL ON public.bakery_members TO service_role;
ALTER TABLE public.bakery_members ENABLE ROW LEVEL SECURITY;

-- Security definer accessors (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_bakery_access(_bakery_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bakery_members WHERE bakery_id = _bakery_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.current_bakery_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bakery_id FROM public.bakery_members WHERE user_id = auth.uid() ORDER BY created_at ASC LIMIT 1;
$$;

-- Policies for bakeries/members
CREATE POLICY "bakeries_select" ON public.bakeries FOR SELECT TO authenticated USING (public.has_bakery_access(id));
CREATE POLICY "bakeries_update" ON public.bakeries FOR UPDATE TO authenticated USING (public.has_bakery_access(id)) WITH CHECK (public.has_bakery_access(id));

CREATE POLICY "members_select_own" ON public.bakery_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_bakery_access(bakery_id));

-- Auto provision bakery on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_bakery_id uuid;
  bakery_name text;
BEGIN
  bakery_name := COALESCE(
    NEW.raw_user_meta_data->>'bakery_name',
    split_part(COALESCE(NEW.email, 'Ma boulangerie'), '@', 1) || ' — Boulangerie'
  );
  INSERT INTO public.bakeries (name) VALUES (bakery_name) RETURNING id INTO new_bakery_id;
  INSERT INTO public.bakery_members (bakery_id, user_id, role) VALUES (new_bakery_id, NEW.id, 'owner');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Raw materials
-- ============================================================
CREATE TABLE public.raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit public.material_unit NOT NULL,
  purchase_price numeric(14,4) NOT NULL CHECK (purchase_price > 0), -- prix d'achat unitaire de référence
  avg_cost numeric(14,4) NOT NULL DEFAULT 0, -- coût moyen pondéré
  stock numeric(14,4) NOT NULL DEFAULT 0,
  low_stock_threshold numeric(14,4) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_materials TO authenticated;
GRANT ALL ON public.raw_materials TO service_role;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raw_materials_all" ON public.raw_materials FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));
CREATE TRIGGER trg_raw_materials_updated BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- On insert: initialize avg_cost from purchase_price if 0
CREATE OR REPLACE FUNCTION public.init_avg_cost()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.avg_cost IS NULL OR NEW.avg_cost = 0 THEN NEW.avg_cost := NEW.purchase_price; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_raw_materials_init BEFORE INSERT ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.init_avg_cost();

-- ============================================================
-- Purchases (réapprovisionnements)
-- ============================================================
CREATE TABLE public.raw_material_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,4) NOT NULL CHECK (unit_price > 0),
  total_price numeric(14,4) NOT NULL CHECK (total_price > 0),
  supplier text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_material_purchases TO authenticated;
GRANT ALL ON public.raw_material_purchases TO service_role;
ALTER TABLE public.raw_material_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_all" ON public.raw_material_purchases FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));

CREATE OR REPLACE FUNCTION public.apply_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cur_stock numeric(14,4);
  cur_cost numeric(14,4);
  new_stock numeric(14,4);
  new_cost numeric(14,4);
BEGIN
  SELECT stock, avg_cost INTO cur_stock, cur_cost FROM public.raw_materials WHERE id = NEW.raw_material_id FOR UPDATE;
  new_stock := cur_stock + NEW.quantity;
  IF new_stock > 0 THEN
    new_cost := ((cur_stock * cur_cost) + (NEW.quantity * NEW.unit_price)) / new_stock;
  ELSE
    new_cost := NEW.unit_price;
  END IF;
  UPDATE public.raw_materials SET stock = new_stock, avg_cost = new_cost, purchase_price = NEW.unit_price, updated_at = now() WHERE id = NEW.raw_material_id;

  INSERT INTO public.stock_ledger (bakery_id, kind, ref_id, raw_material_id, delta_quantity, delta_value, user_id, note)
  VALUES (NEW.bakery_id, 'purchase', NEW.id, NEW.raw_material_id, NEW.quantity, NEW.total_price, NEW.created_by, NEW.notes);
  RETURN NEW;
END; $$;

-- ============================================================
-- Products
-- ============================================================
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit public.product_unit NOT NULL DEFAULT 'unite',
  sale_price numeric(14,4) NOT NULL CHECK (sale_price >= 0),
  stock numeric(14,4) NOT NULL DEFAULT 0,
  low_stock_threshold numeric(14,4) NOT NULL DEFAULT 0,
  material_cost numeric(14,4) NOT NULL DEFAULT 0, -- coût matière calculé à partir de la recette
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_all" ON public.products FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recipes
CREATE TABLE public.product_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity_per_unit numeric(14,6) NOT NULL CHECK (quantity_per_unit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, raw_material_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_recipes TO authenticated;
GRANT ALL ON public.product_recipes TO service_role;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_all" ON public.product_recipes FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));

CREATE OR REPLACE FUNCTION public.recompute_product_material_cost(_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.products p
  SET material_cost = COALESCE((
    SELECT SUM(r.quantity_per_unit * rm.avg_cost)
    FROM public.product_recipes r
    JOIN public.raw_materials rm ON rm.id = r.raw_material_id
    WHERE r.product_id = _product_id
  ), 0), updated_at = now()
  WHERE p.id = _product_id;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recipe_after_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_product_material_cost(COALESCE(NEW.product_id, OLD.product_id));
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_recipe_change AFTER INSERT OR UPDATE OR DELETE ON public.product_recipes
  FOR EACH ROW EXECUTE FUNCTION public.trg_recipe_after_change();

-- ============================================================
-- Batch templates
-- ============================================================
CREATE TABLE public.batch_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_templates TO authenticated;
GRANT ALL ON public.batch_templates TO service_role;
ALTER TABLE public.batch_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batch_templates_all" ON public.batch_templates FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));
CREATE TRIGGER trg_batch_templates_updated BEFORE UPDATE ON public.batch_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.batch_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.batch_templates(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  planned_quantity numeric(14,4) NOT NULL CHECK (planned_quantity > 0),
  UNIQUE (template_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_template_items TO authenticated;
GRANT ALL ON public.batch_template_items TO service_role;
ALTER TABLE public.batch_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batch_template_items_all" ON public.batch_template_items FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));

-- ============================================================
-- Batches (fournées)
-- ============================================================
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.batch_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  status public.batch_status NOT NULL DEFAULT 'draft',
  notes text,
  total_material_cost numeric(14,4) NOT NULL DEFAULT 0,
  produced_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batches_all" ON public.batches FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));
CREATE TRIGGER trg_batches_updated BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.batch_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity_used numeric(14,4) NOT NULL CHECK (quantity_used > 0),
  unit_cost numeric(14,4) NOT NULL DEFAULT 0,
  line_cost numeric(14,4) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_consumptions TO authenticated;
GRANT ALL ON public.batch_consumptions TO service_role;
ALTER TABLE public.batch_consumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batch_consumptions_all" ON public.batch_consumptions FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));

CREATE TABLE public.batch_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_produced numeric(14,4) NOT NULL CHECK (quantity_produced > 0),
  unit_material_cost numeric(14,4) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_outputs TO authenticated;
GRANT ALL ON public.batch_outputs TO service_role;
ALTER TABLE public.batch_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batch_outputs_all" ON public.batch_outputs FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));

-- Complete batch: decrement raw materials, increment product stock, allocate cost, write ledger
CREATE OR REPLACE FUNCTION public.complete_batch(_batch_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b RECORD;
  c RECORD;
  o RECORD;
  total_cost numeric(14,4) := 0;
  total_output numeric(14,4) := 0;
BEGIN
  SELECT * INTO b FROM public.batches WHERE id = _batch_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Fournée introuvable'; END IF;
  IF b.status = 'completed' THEN RAISE EXCEPTION 'Fournée déjà validée'; END IF;
  IF NOT public.has_bakery_access(b.bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  -- Validate stocks and compute costs
  FOR c IN SELECT bc.*, rm.avg_cost, rm.stock, rm.name FROM public.batch_consumptions bc
           JOIN public.raw_materials rm ON rm.id = bc.raw_material_id
           WHERE bc.batch_id = _batch_id
  LOOP
    IF c.stock < c.quantity_used THEN
      RAISE EXCEPTION 'Stock insuffisant pour %', c.name;
    END IF;
    UPDATE public.batch_consumptions SET unit_cost = c.avg_cost, line_cost = c.avg_cost * c.quantity_used WHERE id = c.id;
    UPDATE public.raw_materials SET stock = stock - c.quantity_used, updated_at = now() WHERE id = c.raw_material_id;
    total_cost := total_cost + (c.avg_cost * c.quantity_used);
    INSERT INTO public.stock_ledger (bakery_id, kind, ref_id, raw_material_id, delta_quantity, delta_value, user_id, note)
    VALUES (b.bakery_id, 'batch_consume', b.id, c.raw_material_id, -c.quantity_used, -(c.avg_cost * c.quantity_used), b.created_by, b.name);
  END LOOP;

  SELECT COALESCE(SUM(quantity_produced),0) INTO total_output FROM public.batch_outputs WHERE batch_id = _batch_id;
  IF total_output <= 0 THEN RAISE EXCEPTION 'Aucune production renseignée'; END IF;

  FOR o IN SELECT * FROM public.batch_outputs WHERE batch_id = _batch_id LOOP
    UPDATE public.batch_outputs SET unit_material_cost = CASE WHEN total_output>0 THEN total_cost * (o.quantity_produced / total_output) / o.quantity_produced ELSE 0 END WHERE id = o.id;
    UPDATE public.products SET stock = stock + o.quantity_produced, updated_at = now() WHERE id = o.product_id;
    INSERT INTO public.stock_ledger (bakery_id, kind, ref_id, product_id, delta_quantity, delta_value, user_id, note)
    VALUES (b.bakery_id, 'batch_produce', b.id, o.product_id,
            o.quantity_produced,
            (total_cost * (o.quantity_produced / total_output)),
            b.created_by, b.name);
  END LOOP;

  UPDATE public.batches SET status='completed', completed_at=now(), total_material_cost=total_cost, updated_at=now() WHERE id=_batch_id;
END; $$;
REVOKE ALL ON FUNCTION public.complete_batch(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_batch(uuid) TO authenticated;

-- ============================================================
-- Sales sessions
-- ============================================================
CREATE TABLE public.sales_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name text NOT NULL,
  status public.sales_status NOT NULL DEFAULT 'open',
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  total_revenue numeric(14,4) NOT NULL DEFAULT 0,
  total_loss_value numeric(14,4) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_sessions TO authenticated;
GRANT ALL ON public.sales_sessions TO service_role;
ALTER TABLE public.sales_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_sessions_all" ON public.sales_sessions FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));
CREATE TRIGGER trg_sales_sessions_updated BEFORE UPDATE ON public.sales_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sales_sessions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  opening_stock numeric(14,4) NOT NULL DEFAULT 0,
  restocked numeric(14,4) NOT NULL DEFAULT 0,
  closing_stock numeric(14,4) NOT NULL DEFAULT 0,
  unsold numeric(14,4) NOT NULL DEFAULT 0,
  price_at_sale numeric(14,4) NOT NULL DEFAULT 0,
  unit_cost_at_sale numeric(14,4) NOT NULL DEFAULT 0,
  quantity_sold numeric(14,4) NOT NULL DEFAULT 0,
  UNIQUE (session_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_session_items TO authenticated;
GRANT ALL ON public.sales_session_items TO service_role;
ALTER TABLE public.sales_session_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_session_items_all" ON public.sales_session_items FOR ALL TO authenticated
  USING (public.has_bakery_access(bakery_id)) WITH CHECK (public.has_bakery_access(bakery_id));

CREATE OR REPLACE FUNCTION public.close_sales_session(_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s RECORD;
  it RECORD;
  q_sold numeric(14,4);
  rev numeric(14,4) := 0;
  loss_val numeric(14,4) := 0;
BEGIN
  SELECT * INTO s FROM public.sales_sessions WHERE id = _session_id FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'Session introuvable'; END IF;
  IF s.status = 'closed' THEN RAISE EXCEPTION 'Session déjà clôturée'; END IF;
  IF NOT public.has_bakery_access(s.bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  FOR it IN SELECT ssi.*, p.material_cost, p.name AS product_name FROM public.sales_session_items ssi
            JOIN public.products p ON p.id = ssi.product_id
            WHERE ssi.session_id = _session_id
  LOOP
    q_sold := GREATEST(it.opening_stock + it.restocked - it.closing_stock - it.unsold, 0);
    UPDATE public.sales_session_items SET quantity_sold = q_sold, unit_cost_at_sale = it.material_cost WHERE id = it.id;

    IF q_sold > 0 THEN
      rev := rev + (q_sold * it.price_at_sale);
      INSERT INTO public.stock_ledger (bakery_id, kind, ref_id, product_id, delta_quantity, delta_value, user_id, note)
      VALUES (s.bakery_id, 'sale', s.id, it.product_id, -q_sold, q_sold * it.price_at_sale, s.created_by, s.name);
    END IF;
    IF it.unsold > 0 THEN
      loss_val := loss_val + (it.unsold * it.material_cost);
      INSERT INTO public.stock_ledger (bakery_id, kind, ref_id, product_id, delta_quantity, delta_value, user_id, note)
      VALUES (s.bakery_id, 'loss', s.id, it.product_id, -it.unsold, -(it.unsold * it.material_cost), s.created_by, s.name || ' (invendus)');
    END IF;
    -- Decrement stock by sold + unsold (both leave stock)
    UPDATE public.products SET stock = GREATEST(stock - (q_sold + it.unsold), 0), updated_at = now() WHERE id = it.product_id;
  END LOOP;

  UPDATE public.sales_sessions SET status='closed', closed_at=now(), total_revenue=rev, total_loss_value=loss_val, updated_at=now() WHERE id=_session_id;
END; $$;
REVOKE ALL ON FUNCTION public.close_sales_session(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.close_sales_session(uuid) TO authenticated;

-- ============================================================
-- Stock ledger (immuable)
-- ============================================================
CREATE TABLE public.stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  kind public.ledger_kind NOT NULL,
  ref_id uuid,
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  delta_quantity numeric(14,4) NOT NULL,
  delta_value numeric(14,4) NOT NULL DEFAULT 0,
  user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stock_ledger TO authenticated;
GRANT ALL ON public.stock_ledger TO service_role;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_select" ON public.stock_ledger FOR SELECT TO authenticated USING (public.has_bakery_access(bakery_id));
-- No INSERT/UPDATE/DELETE policy for authenticated → inserts happen only via SECURITY DEFINER functions
CREATE INDEX idx_ledger_bakery_created ON public.stock_ledger (bakery_id, created_at DESC);

-- Now that ledger exists, attach purchase trigger
CREATE TRIGGER trg_purchase_apply AFTER INSERT ON public.raw_material_purchases
  FOR EACH ROW EXECUTE FUNCTION public.apply_purchase();

-- Indexes
CREATE INDEX idx_raw_materials_bakery ON public.raw_materials(bakery_id);
CREATE INDEX idx_products_bakery ON public.products(bakery_id);
CREATE INDEX idx_purchases_bakery_created ON public.raw_material_purchases(bakery_id, created_at DESC);
CREATE INDEX idx_batches_bakery_created ON public.batches(bakery_id, created_at DESC);
CREATE INDEX idx_sales_bakery_created ON public.sales_sessions(bakery_id, created_at DESC);
