
-- Add product/quantity to batch_templates (nullable for compat with existing rows)
ALTER TABLE public.batch_templates
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planned_quantity numeric(14,4);

-- Ingredients per template
CREATE TABLE IF NOT EXISTS public.batch_template_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.batch_templates(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, raw_material_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_template_ingredients TO authenticated;
GRANT ALL ON public.batch_template_ingredients TO service_role;

ALTER TABLE public.batch_template_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bakery members manage template ingredients" ON public.batch_template_ingredients;
CREATE POLICY "bakery members manage template ingredients"
ON public.batch_template_ingredients
FOR ALL TO authenticated
USING (public.has_bakery_access(bakery_id))
WITH CHECK (public.has_bakery_access(bakery_id));

CREATE INDEX IF NOT EXISTS idx_bti_template ON public.batch_template_ingredients(template_id);
