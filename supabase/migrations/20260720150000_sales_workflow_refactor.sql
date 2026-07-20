
-- ============================================================
-- V3: Sales workflow refactor
-- Simplify sales_session_items schema + add unsold_handling
-- ============================================================

-- Add unsold_handling column to sales_sessions
-- NULL = not decided yet, TRUE = add to stock, FALSE = treat as loss
ALTER TABLE public.sales_sessions
ADD COLUMN unsold_handling boolean DEFAULT NULL;

-- Simplify sales_session_items: remove closing_stock (calculated from opening_stock - unsold)
-- Keep: opening_stock, unsold, price_at_sale, quantity_sold
-- Remove: closing_stock, restocked (no longer used in new workflow)
ALTER TABLE public.sales_session_items
DROP COLUMN IF EXISTS closing_stock,
DROP COLUMN IF EXISTS restocked;

-- Update close_sales_session to use new logic
CREATE OR REPLACE FUNCTION public.close_sales_session(_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s RECORD;
  it RECORD;
  q_sold numeric(14,4);
  rev numeric(14,4) := 0;
  loss_val numeric(14,4) := 0;
  unsold_handling boolean;
BEGIN
  SELECT * INTO s FROM public.sales_sessions WHERE id = _session_id FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'Session introuvable'; END IF;
  IF s.status = 'closed' THEN RAISE EXCEPTION 'Session déjà clôturée'; END IF;
  IF NOT public.has_bakery_access(s.bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  -- Get unsold_handling (must be set before closing)
  unsold_handling := s.unsold_handling;
  IF unsold_handling IS NULL THEN RAISE EXCEPTION 'Vous devez décider ce que faire des invendus avant de clôturer'; END IF;

  FOR it IN SELECT ssi.*, p.material_cost, p.name AS product_name FROM public.sales_session_items ssi
             JOIN public.products p ON p.id = ssi.product_id
             WHERE ssi.session_id = _session_id
  LOOP
    -- Formula: quantity_sold = opening_stock - unsold
    q_sold := GREATEST(it.opening_stock - it.unsold, 0);
    UPDATE public.sales_session_items SET quantity_sold = q_sold, unit_cost_at_sale = it.material_cost WHERE id = it.id;

    -- Record sale
    IF q_sold > 0 THEN
      rev := rev + (q_sold * it.price_at_sale);
      INSERT INTO public.stock_ledger (bakery_id, kind, ref_id, product_id, delta_quantity, delta_value, user_id, note)
      VALUES (s.bakery_id, 'sale', s.id, it.product_id, -q_sold, q_sold * it.price_at_sale, s.created_by, s.name);
    END IF;

    -- Handle unsold: either add back to stock or record as loss
    IF it.unsold > 0 THEN
      IF unsold_handling = true THEN
        -- Add unsold back to stock
        UPDATE public.products SET stock = stock + it.unsold, updated_at = now() WHERE id = it.product_id;
        INSERT INTO public.stock_ledger (bakery_id, kind, ref_id, product_id, delta_quantity, delta_value, user_id, note)
        VALUES (s.bakery_id, 'adjustment', s.id, it.product_id, it.unsold, 0, s.created_by, s.name || ' (invendus retournés au stock)');
      ELSE
        -- Treat unsold as loss
        loss_val := loss_val + (it.unsold * it.material_cost);
        INSERT INTO public.stock_ledger (bakery_id, kind, ref_id, product_id, delta_quantity, delta_value, user_id, note)
        VALUES (s.bakery_id, 'loss', s.id, it.product_id, -it.unsold, -(it.unsold * it.material_cost), s.created_by, s.name || ' (invendus - perte)');
      END IF;
    END IF;

    -- Decrement stock by quantity_sold (always leave inventory)
    UPDATE public.products SET stock = GREATEST(stock - q_sold, 0), updated_at = now() WHERE id = it.product_id;
  END LOOP;

  UPDATE public.sales_sessions SET status='closed', closed_at=now(), total_revenue=rev, total_loss_value=loss_val, updated_at=now() WHERE id=_session_id;
END; $$;
REVOKE ALL ON FUNCTION public.close_sales_session(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.close_sales_session(uuid) TO authenticated;

-- Update RPC: modify create sales session to accept unsold_handling
CREATE OR REPLACE FUNCTION public.create_sales_session(
  _bakery_id uuid,
  _name text,
  _session_date date,
  _items jsonb,
  _unsold_handling boolean DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_session_id uuid;
BEGIN
  IF NOT public.has_bakery_access(_bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  INSERT INTO public.sales_sessions (bakery_id, name, session_date, notes, unsold_handling, created_by, status)
  VALUES (_bakery_id, _name, _session_date, _notes, _unsold_handling, auth.uid(), 'open')
  RETURNING id INTO new_session_id;

  IF _items IS NOT NULL AND jsonb_array_length(_items) > 0 THEN
    INSERT INTO public.sales_session_items (bakery_id, session_id, product_id, opening_stock, unsold, price_at_sale)
    SELECT _bakery_id, new_session_id,
           (elem->>'product_id')::uuid,
           (elem->>'opening_stock')::numeric,
           (elem->>'unsold')::numeric,
           (elem->>'price_at_sale')::numeric
    FROM jsonb_array_elements(_items) elem;
  END IF;

  RETURN new_session_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_sales_session(uuid,text,date,jsonb,boolean,text) TO authenticated;

