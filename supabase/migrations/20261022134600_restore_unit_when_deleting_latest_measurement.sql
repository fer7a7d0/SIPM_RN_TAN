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
  v_ultima_id text;
  v_cantidad_restaurada numeric;
  v_unidad_restaurada text;
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

  SELECT id::text
  INTO v_ultima_id
  FROM public."TAN_mediciones"
  WHERE materia_prima_id::text = p_materia_id
  ORDER BY creado_en DESC, id DESC
  LIMIT 1;

  v_es_ultima := v_ultima_id = p_medicion_id;

  IF v_es_ultima THEN
    SELECT cantidad_nueva, unidad
    INTO v_cantidad_restaurada, v_unidad_restaurada
    FROM public."TAN_mediciones"
    WHERE materia_prima_id::text = p_materia_id
      AND id <> v_medicion.id
    ORDER BY creado_en DESC, id DESC
    LIMIT 1;

    IF NOT FOUND THEN
      v_cantidad_restaurada := v_medicion.cantidad_anterior;
      v_unidad_restaurada := v_medicion.unidad;
    END IF;

    UPDATE public."TAN_tanques_termo"
    SET cantidad = v_cantidad_restaurada,
        unidad = v_unidad_restaurada,
        actualizado_en = pg_catalog.now()
    WHERE id::text = p_materia_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró el tanque asociado a la medición.';
    END IF;
  END IF;

  DELETE FROM public."TAN_mediciones"
  WHERE id = v_medicion.id
    AND materia_prima_id::text = p_materia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo eliminar la medición seleccionada.';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'deleted', true,
    'latest_deleted', v_es_ultima,
    'restored_cantidad', CASE WHEN v_es_ultima THEN v_cantidad_restaurada END,
    'restored_unidad', CASE WHEN v_es_ultima THEN v_unidad_restaurada END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.eliminar_medicion_historial(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_medicion_historial(text, text) TO anon;
