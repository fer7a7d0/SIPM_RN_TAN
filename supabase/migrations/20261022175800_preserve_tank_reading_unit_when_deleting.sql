CREATE OR REPLACE FUNCTION public.eliminar_medicion_historial(
  p_materia_id text,
  p_medicion_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_medicion public."TAN_mediciones"%ROWTYPE;
  v_tanque public."TAN_tanques_termo"%ROWTYPE;
  v_ultima_id text;
  v_cantidad_restaurada numeric;
  v_tiene_mediciones_restantes boolean;
  v_es_ultima boolean;
BEGIN
  SELECT *
  INTO v_medicion
  FROM public."TAN_mediciones"
  WHERE id::text = p_medicion_id
    AND materia_prima_id::text = p_materia_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('deleted', false);
  END IF;

  SELECT *
  INTO v_tanque
  FROM public."TAN_tanques_termo"
  WHERE id = v_medicion.materia_prima_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el tanque asociado a la medición.';
  END IF;

  SELECT id::text
  INTO v_ultima_id
  FROM public."TAN_mediciones"
  WHERE materia_prima_id = v_medicion.materia_prima_id
  ORDER BY creado_en DESC, id DESC
  LIMIT 1;

  v_es_ultima := v_ultima_id = p_medicion_id;

  DELETE FROM public."TAN_mediciones"
  WHERE id = v_medicion.id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo eliminar la medición seleccionada.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public."TAN_mediciones"
    WHERE materia_prima_id = v_medicion.materia_prima_id
  )
  INTO v_tiene_mediciones_restantes;

  IF v_es_ultima THEN
    IF v_tiene_mediciones_restantes THEN
      SELECT cantidad_nueva
      INTO v_cantidad_restaurada
      FROM public."TAN_mediciones"
      WHERE materia_prima_id = v_medicion.materia_prima_id
      ORDER BY creado_en DESC, id DESC
      LIMIT 1;
    ELSE
      v_cantidad_restaurada := 0;
    END IF;

    UPDATE public."TAN_tanques_termo"
    SET cantidad = v_cantidad_restaurada,
        tiene_medicion = v_tiene_mediciones_restantes,
        actualizado_en = pg_catalog.now()
    WHERE id = v_medicion.materia_prima_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'deleted', true,
    'latest_deleted', v_es_ultima,
    'restored_cantidad', CASE WHEN v_es_ultima THEN v_cantidad_restaurada END,
    'has_measurements', v_tiene_mediciones_restantes
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.eliminar_medicion_historial(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_medicion_historial(text, text) TO anon;
