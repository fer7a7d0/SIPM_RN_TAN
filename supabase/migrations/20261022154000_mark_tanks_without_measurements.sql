ALTER TABLE public."TAN_tanques_termo"
ADD COLUMN tiene_medicion boolean NOT NULL DEFAULT false;

UPDATE public."TAN_tanques_termo" AS tanque
SET tiene_medicion = EXISTS (
  SELECT 1
  FROM public."TAN_mediciones" AS medicion
  WHERE medicion.materia_prima_id = tanque.id
);

CREATE OR REPLACE FUNCTION public.sincronizar_estado_medicion_tanque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_tanque_id uuid;
  v_tiene_medicion boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tanque_id := OLD.materia_prima_id;
  ELSE
    v_tanque_id := NEW.materia_prima_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public."TAN_mediciones"
    WHERE materia_prima_id = v_tanque_id
  )
  INTO v_tiene_medicion;

  UPDATE public."TAN_tanques_termo"
  SET tiene_medicion = v_tiene_medicion
  WHERE id = v_tanque_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sincronizar_estado_medicion_tanque() FROM PUBLIC;

CREATE TRIGGER sincronizar_estado_medicion_tanque
AFTER INSERT OR DELETE ON public."TAN_mediciones"
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_estado_medicion_tanque();

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
  v_unidad_restaurada text;
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
      SELECT cantidad_nueva, unidad
      INTO v_cantidad_restaurada, v_unidad_restaurada
      FROM public."TAN_mediciones"
      WHERE materia_prima_id = v_medicion.materia_prima_id
      ORDER BY creado_en DESC, id DESC
      LIMIT 1;
    ELSE
      v_cantidad_restaurada := 0;
      v_unidad_restaurada := v_tanque.unidad;
    END IF;

    UPDATE public."TAN_tanques_termo"
    SET cantidad = v_cantidad_restaurada,
        unidad = v_unidad_restaurada,
        tiene_medicion = v_tiene_mediciones_restantes,
        actualizado_en = pg_catalog.now()
    WHERE id = v_medicion.materia_prima_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'deleted', true,
    'latest_deleted', v_es_ultima,
    'restored_cantidad', CASE WHEN v_es_ultima THEN v_cantidad_restaurada END,
    'restored_unidad', CASE WHEN v_es_ultima THEN v_unidad_restaurada END,
    'has_measurements', v_tiene_mediciones_restantes
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.eliminar_medicion_historial(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_medicion_historial(text, text) TO anon;
