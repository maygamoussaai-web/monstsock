
-- V10 RPC wrappers (SECURITY DEFINER, bakery-scoped)

CREATE OR REPLACE FUNCTION public.record_purchase(
  _bakery_id uuid,
  _raw_material_id uuid,
  _quantity numeric,
  _unit_price numeric,
  _supplier text DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_bakery_access(_bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _quantity <= 0 OR _unit_price < 0 THEN RAISE EXCEPTION 'Valeurs invalides'; END IF;
  INSERT INTO public.raw_material_purchases
    (bakery_id, raw_material_id, quantity, unit_price, total_price, supplier, notes, created_by)
  VALUES
    (_bakery_id, _raw_material_id, _quantity, _unit_price,
     ROUND((_quantity * _unit_price)::numeric, 4), _supplier, _notes, auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_product_sale(
  _bakery_id uuid,
  _product_id uuid,
  _quantity numeric,
  _unit_price numeric,
  _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE cur_stock numeric(14,4); cur_cost numeric(14,4);
BEGIN
  IF NOT public.has_bakery_access(_bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _quantity <= 0 OR _unit_price < 0 THEN RAISE EXCEPTION 'Valeurs invalides'; END IF;
  SELECT stock, material_cost INTO cur_stock, cur_cost
    FROM public.products WHERE id = _product_id AND bakery_id = _bakery_id FOR UPDATE;
  IF cur_stock IS NULL THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF cur_stock < _quantity THEN RAISE EXCEPTION 'Stock insuffisant'; END IF;
  UPDATE public.products SET stock = stock - _quantity, updated_at = now() WHERE id = _product_id;
  INSERT INTO public.stock_ledger (bakery_id, kind, product_id, delta_quantity, delta_value, user_id, note)
  VALUES (_bakery_id, 'sale', _product_id, -_quantity, _quantity * _unit_price, auth.uid(), _notes);
END; $$;

CREATE OR REPLACE FUNCTION public.record_sale(
  _bakery_id uuid,
  _product_id uuid,
  _quantity numeric,
  _unit_price numeric,
  _notes text DEFAULT NULL
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT public.record_product_sale(_bakery_id, _product_id, _quantity, _unit_price, _notes); $$;

CREATE OR REPLACE FUNCTION public.record_loss(
  _bakery_id uuid,
  _product_id uuid,
  _raw_material_id uuid,
  _quantity numeric,
  _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE cur_stock numeric(14,4); cur_cost numeric(14,4); val numeric(14,4);
BEGIN
  IF NOT public.has_bakery_access(_bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  IF (_product_id IS NULL) = (_raw_material_id IS NULL) THEN
    RAISE EXCEPTION 'Renseigner un produit OU une matière';
  END IF;

  IF _product_id IS NOT NULL THEN
    SELECT stock, material_cost INTO cur_stock, cur_cost
      FROM public.products WHERE id = _product_id AND bakery_id = _bakery_id FOR UPDATE;
    IF cur_stock IS NULL THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
    IF cur_stock < _quantity THEN RAISE EXCEPTION 'Stock insuffisant'; END IF;
    val := _quantity * COALESCE(cur_cost, 0);
    UPDATE public.products SET stock = stock - _quantity, updated_at = now() WHERE id = _product_id;
    INSERT INTO public.stock_ledger (bakery_id, kind, product_id, delta_quantity, delta_value, user_id, note)
    VALUES (_bakery_id, 'loss', _product_id, -_quantity, -val, auth.uid(), _notes);
  ELSE
    SELECT stock, avg_cost INTO cur_stock, cur_cost
      FROM public.raw_materials WHERE id = _raw_material_id AND bakery_id = _bakery_id FOR UPDATE;
    IF cur_stock IS NULL THEN RAISE EXCEPTION 'Matière introuvable'; END IF;
    IF cur_stock < _quantity THEN RAISE EXCEPTION 'Stock insuffisant'; END IF;
    val := _quantity * COALESCE(cur_cost, 0);
    UPDATE public.raw_materials SET stock = stock - _quantity, updated_at = now() WHERE id = _raw_material_id;
    INSERT INTO public.stock_ledger (bakery_id, kind, raw_material_id, delta_quantity, delta_value, user_id, note)
    VALUES (_bakery_id, 'loss', _raw_material_id, -_quantity, -val, auth.uid(), _notes);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.record_batch(
  _bakery_id uuid,
  _name text,
  _template_id uuid,
  _notes text,
  _consumptions jsonb,
  _outputs jsonb,
  _auto_complete boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_bakery_access(_bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  INSERT INTO public.batches (bakery_id, name, template_id, notes, created_by)
  VALUES (_bakery_id, _name, _template_id, _notes, auth.uid())
  RETURNING id INTO new_id;

  IF _consumptions IS NOT NULL AND jsonb_array_length(_consumptions) > 0 THEN
    INSERT INTO public.batch_consumptions (bakery_id, batch_id, raw_material_id, quantity_used)
    SELECT _bakery_id, new_id,
           (elem->>'raw_material_id')::uuid,
           (elem->>'quantity_used')::numeric
    FROM jsonb_array_elements(_consumptions) elem;
  END IF;

  IF _outputs IS NOT NULL AND jsonb_array_length(_outputs) > 0 THEN
    INSERT INTO public.batch_outputs (bakery_id, batch_id, product_id, quantity_produced)
    SELECT _bakery_id, new_id,
           (elem->>'product_id')::uuid,
           (elem->>'quantity_produced')::numeric
    FROM jsonb_array_elements(_outputs) elem;
  END IF;

  IF _auto_complete THEN
    PERFORM public.complete_batch(new_id);
  END IF;
  RETURN new_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.record_purchase(uuid,uuid,numeric,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_product_sale(uuid,uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_sale(uuid,uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_loss(uuid,uuid,uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_batch(uuid,text,uuid,text,jsonb,jsonb,boolean) TO authenticated;
