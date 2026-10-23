ALTER TABLE public."TAN_tanques_termo"
ADD COLUMN activa boolean NOT NULL DEFAULT true;

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
    UPDATE public."TAN_tanques_termo"
    SET activa = false
    WHERE id = p_tanque_id;

    RETURN pg_catalog.jsonb_build_object(
      'deleted', false,
      'has_measurements', true,
      'archived', true
    );
  END IF;

  DELETE FROM public."TAN_tanques_termo"
  WHERE id = p_tanque_id;

  RETURN pg_catalog.jsonb_build_object('deleted', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reactivar_tanque_catalogo(p_tanque_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public."TAN_tanques_termo"
  SET activa = true
  WHERE id = p_tanque_id;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('reactivated', false);
  END IF;

  RETURN pg_catalog.jsonb_build_object('reactivated', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.eliminar_tanque_catalogo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_tanque_catalogo(uuid) TO anon;

REVOKE ALL ON FUNCTION public.reactivar_tanque_catalogo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reactivar_tanque_catalogo(uuid) TO anon;
