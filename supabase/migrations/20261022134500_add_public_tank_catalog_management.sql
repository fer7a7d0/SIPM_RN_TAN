GRANT INSERT, UPDATE ON TABLE public."TAN_tanques_termo" TO anon;

DROP POLICY IF EXISTS tanques_catalogo_insert_anon ON public."TAN_tanques_termo";

CREATE POLICY tanques_catalogo_insert_anon
ON public."TAN_tanques_termo"
FOR INSERT
TO anon
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.eliminar_tanque_catalogo(p_tanque_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_tanque public."TAN_tanques_termo"%ROWTYPE;
BEGIN
  SELECT *
  INTO v_tanque
  FROM public."TAN_tanques_termo"
  WHERE id = p_tanque_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('deleted', false);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."TAN_mediciones"
    WHERE materia_prima_id = p_tanque_id
  ) THEN
    RETURN pg_catalog.jsonb_build_object('deleted', false, 'has_measurements', true);
  END IF;

  DELETE FROM public."TAN_tanques_termo"
  WHERE id = p_tanque_id;

  RETURN pg_catalog.jsonb_build_object('deleted', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.eliminar_tanque_catalogo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_tanque_catalogo(uuid) TO anon;
