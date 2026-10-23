CREATE TABLE public."TAN_unidades" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('lectura', 'capacidad_gas')),
  nombre text NOT NULL,
  CONSTRAINT tan_unidades_nombre_length_valid CHECK (
    (tipo = 'lectura' AND char_length(btrim(nombre)) BETWEEN 1 AND 20)
    OR (tipo = 'capacidad_gas' AND char_length(btrim(nombre)) BETWEEN 1 AND 30)
  ),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tan_unidades_tipo_nombre_unique
ON public."TAN_unidades" (tipo, lower(btrim(nombre)));

ALTER TABLE public."TAN_unidades" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public."TAN_unidades" TO anon;

CREATE POLICY tan_unidades_select_anon
ON public."TAN_unidades"
FOR SELECT
TO anon
USING (true);

CREATE POLICY tan_unidades_insert_anon
ON public."TAN_unidades"
FOR INSERT
TO anon
WITH CHECK (true);

INSERT INTO public."TAN_unidades" (tipo, nombre)
VALUES
  ('lectura', 'inH₂O'),
  ('lectura', 'kg × 1000'),
  ('capacidad_gas', 'kg'),
  ('capacidad_gas', 'm³')
ON CONFLICT DO NOTHING;

INSERT INTO public."TAN_unidades" (tipo, nombre)
SELECT DISTINCT 'lectura', btrim(unidad)
FROM public."TAN_tanques_termo"
WHERE nullif(btrim(unidad), '') IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public."TAN_unidades" (tipo, nombre)
SELECT DISTINCT 'lectura', btrim(unidad)
FROM public."TAN_mediciones"
WHERE nullif(btrim(unidad), '') IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public."TAN_unidades" (tipo, nombre)
SELECT DISTINCT 'capacidad_gas', btrim(unidad_capacidad_gas)
FROM public."TAN_tanques_termo"
WHERE nullif(btrim(unidad_capacidad_gas), '') IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public."TAN_tanques_termo"
DROP CONSTRAINT IF EXISTS tan_tanques_termo_unidad_capacidad_gas_valid;
