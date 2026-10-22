ALTER TABLE public."TAN_tanques_termo"
RENAME COLUMN capacidad_m3 TO capacidad_gas;

ALTER TABLE public."TAN_tanques_termo"
RENAME CONSTRAINT tan_tanques_termo_capacidad_m3_positive TO tan_tanques_termo_capacidad_gas_positive;

ALTER TABLE public."TAN_tanques_termo"
ADD COLUMN unidad_capacidad_gas text;

UPDATE public."TAN_tanques_termo"
SET unidad_capacidad_gas = 'm³'
WHERE capacidad_gas IS NOT NULL;

ALTER TABLE public."TAN_tanques_termo"
ADD CONSTRAINT tan_tanques_termo_unidad_capacidad_gas_valid
CHECK (unidad_capacidad_gas IS NULL OR unidad_capacidad_gas IN ('kg', 'm³'));
