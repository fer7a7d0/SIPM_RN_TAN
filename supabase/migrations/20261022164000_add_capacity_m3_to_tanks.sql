ALTER TABLE public."TAN_tanques_termo"
ADD COLUMN capacidad_m3 numeric;

ALTER TABLE public."TAN_tanques_termo"
ADD CONSTRAINT tan_tanques_termo_capacidad_m3_positive
CHECK (capacidad_m3 IS NULL OR capacidad_m3 > 0);
