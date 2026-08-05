-- Helper central d'idempotence : renvoie true si l'action doit être appliquée,
-- false si cette référence a déjà été traitée (rejeu d'une action hors ligne).
CREATE OR REPLACE FUNCTION public.claim_client_ref(_ref uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _ref IS NULL THEN RETURN true; END IF;
  BEGIN
    INSERT INTO public.processed_client_refs(client_ref) VALUES (_ref);
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
  RETURN true;
END;
$$;

-- Ancienne signature en double (sans référence d'action)
DROP FUNCTION IF EXISTS public.record_quick_sale(uuid, uuid, numeric, numeric, numeric, numeric);

-- ---------------------------------------------------------------- purchases
DROP FUNCTION IF EXISTS public.record_purchase(uuid, uuid, numeric, numeric, text);
CREATE FUNCTION public.record_purchase(
  p_bakery_id uuid, p_raw_material_id uuid, p_quantity numeric, p_unit_price numeric,
  p_supplier text DEFAULT NULL::text, p_client_ref uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_exists boolean;
  v_old_stock numeric;
  v_old_avg_cost numeric;
  v_new_avg_cost numeric;
  v_mat_name text;
BEGIN
  IF NOT public.user_has_bakery_access(p_bakery_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF NOT public.subscription_active(p_bakery_id) THEN RAISE EXCEPTION 'Abonnement inactif ou expiré'; END IF;
  IF NOT public.claim_client_ref(p_client_ref) THEN RETURN NULL; END IF;

  SELECT EXISTS(SELECT 1 FROM raw_materials WHERE id=p_raw_material_id AND bakery_id=p_bakery_id) INTO v_exists;
  IF NOT v_exists THEN RAISE EXCEPTION 'Matière première introuvable pour cette boulangerie'; END IF;
  SELECT stock,avg_cost,name INTO v_old_stock,v_old_avg_cost,v_mat_name FROM raw_materials WHERE id=p_raw_material_id AND bakery_id=p_bakery_id;
  IF (v_old_stock+p_quantity)>0 THEN
    v_new_avg_cost := ((v_old_stock*COALESCE(v_old_avg_cost,0))+(p_quantity*p_unit_price))/(v_old_stock+p_quantity);
  ELSE
    v_new_avg_cost := p_unit_price;
  END IF;
  INSERT INTO raw_material_purchases(bakery_id,raw_material_id,quantity,unit_price,total_price,supplier)
  VALUES(p_bakery_id,p_raw_material_id,p_quantity,p_unit_price,p_quantity*p_unit_price,p_supplier) RETURNING id INTO v_id;
  UPDATE raw_materials SET stock=stock+p_quantity,avg_cost=v_new_avg_cost,purchase_price=p_unit_price,updated_at=now() WHERE id=p_raw_material_id AND bakery_id=p_bakery_id;
  INSERT INTO stock_ledger(bakery_id,kind,raw_material_id,delta_quantity,delta_value,note)
  VALUES(p_bakery_id,'purchase',p_raw_material_id,p_quantity,p_quantity*p_unit_price,'Réapprovisionnement');
  INSERT INTO activity_log(bakery_id,user_id,action_type,description)
  VALUES(p_bakery_id,auth.uid(),'purchase','Réapprovisionnement '||v_mat_name||' : +'||p_quantity||' ('||(p_quantity*p_unit_price)||' FCFA)');
  RETURN v_id;
END;
$$;

-- ------------------------------------------------------------------- losses
DROP FUNCTION IF EXISTS public.record_loss(uuid, uuid, numeric, text);
CREATE FUNCTION public.record_loss(
  p_bakery_id uuid, p_product_id uuid, p_quantity numeric,
  p_reason text DEFAULT NULL::text, p_client_ref uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_price numeric;
  v_prod_name text;
BEGIN
  IF NOT public.user_has_bakery_access(p_bakery_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF NOT public.subscription_active(p_bakery_id) THEN RAISE EXCEPTION 'Abonnement inactif ou expiré'; END IF;
  IF NOT public.claim_client_ref(p_client_ref) THEN RETURN NULL; END IF;

  SELECT sale_price, name INTO v_price, v_prod_name FROM products WHERE id = p_product_id AND bakery_id = p_bakery_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable pour cette boulangerie'; END IF;
  UPDATE products SET stock = stock - p_quantity, updated_at = now() WHERE id = p_product_id AND bakery_id = p_bakery_id AND stock >= p_quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
  INSERT INTO losses(bakery_id, product_id, quantity, reason) VALUES (p_bakery_id, p_product_id, p_quantity, p_reason) RETURNING id INTO v_id;
  INSERT INTO stock_ledger(bakery_id, kind, product_id, delta_quantity, delta_value, note)
  VALUES (p_bakery_id, 'loss', p_product_id, -p_quantity, -(p_quantity * COALESCE(v_price, 0)), COALESCE(p_reason, 'Perte'));
  INSERT INTO activity_log(bakery_id, user_id, action_type, description)
  VALUES (p_bakery_id, auth.uid(), 'loss', 'Perte ' || v_prod_name || ' x' || p_quantity || COALESCE(' — ' || p_reason, ''));
  RETURN v_id;
END;
$$;

-- ------------------------------------------------------- simple product sale
DROP FUNCTION IF EXISTS public.record_product_sale(uuid, uuid, numeric, numeric);
CREATE FUNCTION public.record_product_sale(
  p_bakery_id uuid, p_product_id uuid, p_quantity numeric, p_price numeric,
  p_client_ref uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_prod_name text;
BEGIN
  IF NOT public.user_has_bakery_access(p_bakery_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF NOT public.subscription_active(p_bakery_id) THEN RAISE EXCEPTION 'Abonnement inactif ou expiré'; END IF;
  IF NOT public.claim_client_ref(p_client_ref) THEN RETURN NULL; END IF;

  SELECT name INTO v_prod_name FROM products WHERE id = p_product_id AND bakery_id = p_bakery_id;
  IF v_prod_name IS NULL THEN RAISE EXCEPTION 'Produit introuvable pour cette boulangerie'; END IF;

  UPDATE products SET stock = stock - p_quantity, updated_at = now()
  WHERE id = p_product_id AND bakery_id = p_bakery_id AND stock >= p_quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock'; END IF;

  INSERT INTO stock_ledger(bakery_id, kind, product_id, delta_quantity, delta_value, note)
  VALUES (p_bakery_id, 'sale', p_product_id, -p_quantity, p_quantity * p_price, 'Vente')
  RETURNING id INTO v_id;

  INSERT INTO activity_log(bakery_id, user_id, action_type, description)
  VALUES (p_bakery_id, auth.uid(), 'sale', 'Vente ' || v_prod_name || ' x' || p_quantity || ' (' || (p_quantity * p_price) || ' FCFA)');

  RETURN v_id;
END;
$$;

-- ------------------------------------------------------------------ batches
DROP FUNCTION IF EXISTS public.record_batch(uuid, text, jsonb, jsonb, text);
CREATE FUNCTION public.record_batch(
  p_bakery_id uuid, p_name text, p_consumptions jsonb, p_outputs jsonb,
  p_notes text DEFAULT NULL::text, p_client_ref uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_id uuid;
  item jsonb;
  v_total_cost numeric := 0;
  v_total_output_qty numeric := 0;
  v_stock numeric;
  v_cost numeric;
  v_qty_used numeric;
  v_qty_produced numeric;
  v_unit_cost numeric;
  v_sale_price numeric;
BEGIN
  IF NOT public.user_has_bakery_access(p_bakery_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF NOT public.subscription_active(p_bakery_id) THEN RAISE EXCEPTION 'Abonnement inactif ou expiré — impossible d''enregistrer la fournée'; END IF;
  IF NOT public.claim_client_ref(p_client_ref) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;

  INSERT INTO public.batches(bakery_id,name,status,notes,created_at,produced_at)
  VALUES(p_bakery_id,p_name,'completed',p_notes,now(),now()) RETURNING id INTO v_batch_id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_consumptions) LOOP
    v_qty_used := COALESCE((item->>'quantity_used')::numeric,(item->>'quantity')::numeric);
    IF v_qty_used IS NULL OR v_qty_used<=0 THEN RAISE EXCEPTION 'Quantité de consommation invalide'; END IF;
    SELECT stock,avg_cost INTO v_stock,v_cost FROM public.raw_materials WHERE id=(item->>'raw_material_id')::uuid AND bakery_id=p_bakery_id FOR UPDATE;
    IF v_stock IS NULL THEN RAISE EXCEPTION 'Matière première introuvable pour cette boulangerie'; END IF;
    IF v_stock<v_qty_used THEN RAISE EXCEPTION 'Stock matière première insuffisant'; END IF;
    UPDATE public.raw_materials SET stock=stock-v_qty_used,updated_at=now() WHERE id=(item->>'raw_material_id')::uuid;
    INSERT INTO public.batch_consumptions(bakery_id,batch_id,raw_material_id,quantity_used,unit_cost,line_cost)
    VALUES(p_bakery_id,v_batch_id,(item->>'raw_material_id')::uuid,v_qty_used,COALESCE(v_cost,0),COALESCE(v_cost,0)*v_qty_used);
    INSERT INTO public.stock_ledger(bakery_id,kind,ref_id,raw_material_id,delta_quantity,delta_value,note)
    VALUES(p_bakery_id,'batch_consume',v_batch_id,(item->>'raw_material_id')::uuid,-v_qty_used,COALESCE(v_cost,0)*v_qty_used,'Consommation fournée');
    v_total_cost := v_total_cost + COALESCE(v_cost,0)*v_qty_used;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(p_outputs) LOOP
    v_qty_produced := COALESCE((item->>'quantity_produced')::numeric,(item->>'quantity')::numeric);
    IF v_qty_produced>0 THEN v_total_output_qty := v_total_output_qty+v_qty_produced; END IF;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(p_outputs) LOOP
    v_qty_produced := COALESCE((item->>'quantity_produced')::numeric,(item->>'quantity')::numeric);
    IF v_qty_produced IS NULL OR v_qty_produced<=0 THEN RAISE EXCEPTION 'Quantité produite invalide'; END IF;

    SELECT sale_price INTO v_sale_price FROM public.products WHERE id=(item->>'product_id')::uuid AND bakery_id=p_bakery_id;
    IF v_sale_price IS NULL THEN RAISE EXCEPTION 'Produit introuvable pour cette boulangerie'; END IF;

    v_unit_cost := CASE WHEN v_total_output_qty>0 THEN (v_total_cost*v_qty_produced/v_total_output_qty)/v_qty_produced ELSE 0 END;
    UPDATE public.products
    SET stock=stock+v_qty_produced,
        material_cost=CASE WHEN (stock+v_qty_produced)>0 THEN (stock*material_cost+v_qty_produced*v_unit_cost)/(stock+v_qty_produced) ELSE v_unit_cost END,
        updated_at=now()
    WHERE id=(item->>'product_id')::uuid AND bakery_id=p_bakery_id;
    INSERT INTO public.batch_outputs(bakery_id,batch_id,product_id,quantity_produced,unit_material_cost)
    VALUES(p_bakery_id,v_batch_id,(item->>'product_id')::uuid,v_qty_produced,v_unit_cost);
    INSERT INTO public.stock_ledger(bakery_id,kind,ref_id,product_id,delta_quantity,delta_value,note)
    VALUES(p_bakery_id,'batch_produce',v_batch_id,(item->>'product_id')::uuid,v_qty_produced,COALESCE(v_sale_price,0)*v_qty_produced,'Production fournée');
  END LOOP;

  UPDATE public.batches SET total_material_cost=v_total_cost,completed_at=now(),updated_at=now() WHERE id=v_batch_id;
  INSERT INTO public.activity_log(bakery_id,user_id,action_type,description)
  VALUES(p_bakery_id,auth.uid(),'batch','Fournée « '||p_name||' » (coût matières : '||v_total_cost||' FCFA)');
  RETURN jsonb_build_object('success',true,'batch_id',v_batch_id);
END;
$$;

-- ------------------------------------------------------- close sales session
DROP FUNCTION IF EXISTS public.close_sales_session(uuid);
CREATE FUNCTION public.close_sales_session(_session_id uuid, _client_ref uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s RECORD;
  it RECORD;
  q_sold numeric(14,4);
  rev numeric(14,4) := 0;
  loss_val numeric(14,4) := 0;
BEGIN
  SELECT * INTO s FROM public.sales_sessions WHERE id = _session_id FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'Session introuvable'; END IF;
  IF s.status = 'closed' THEN RETURN; END IF;
  IF NOT public.has_bakery_access(s.bakery_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF NOT public.subscription_active(s.bakery_id) THEN RAISE EXCEPTION 'Abonnement inactif ou expiré — impossible de clôturer la session'; END IF;
  IF NOT public.claim_client_ref(_client_ref) THEN RETURN; END IF;

  FOR it IN
    SELECT ssi.*, p.material_cost, p.name AS product_name
    FROM public.sales_session_items ssi
    JOIN public.products p ON p.id = ssi.product_id AND p.bakery_id = s.bakery_id
    WHERE ssi.session_id = _session_id
  LOOP
    q_sold := GREATEST(it.opening_stock + it.restocked - it.closing_stock - it.unsold, 0);
    UPDATE public.sales_session_items SET quantity_sold=q_sold, unit_cost_at_sale=it.material_cost WHERE id=it.id;
    IF q_sold > 0 THEN
      rev := rev + (q_sold * it.price_at_sale);
      INSERT INTO public.stock_ledger(bakery_id,kind,ref_id,product_id,delta_quantity,delta_value,user_id,note)
      VALUES(s.bakery_id,'sale',s.id,it.product_id,-q_sold,q_sold*it.price_at_sale,s.created_by,s.name);
    END IF;
    IF it.unsold > 0 THEN
      loss_val := loss_val + (it.unsold * it.price_at_sale);
      INSERT INTO public.stock_ledger(bakery_id,kind,ref_id,product_id,delta_quantity,delta_value,user_id,note)
      VALUES(s.bakery_id,'loss',s.id,it.product_id,-it.unsold,-(it.unsold*it.price_at_sale),s.created_by,s.name||' (invendus)');
    END IF;
    UPDATE public.products SET stock=GREATEST(stock-(q_sold+it.unsold),0), updated_at=now() WHERE id=it.product_id AND bakery_id=s.bakery_id;
  END LOOP;

  UPDATE public.sales_sessions SET status='closed',closed_at=now(),total_revenue=rev,total_loss_value=loss_val,updated_at=now() WHERE id=_session_id;
  INSERT INTO public.activity_log(bakery_id,user_id,action_type,description)
  VALUES(s.bakery_id,auth.uid(),'sales_session','Clôture session « '||s.name||' » — CA '||rev||' FCFA');
END;
$$;