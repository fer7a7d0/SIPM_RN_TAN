GRANT DELETE ON TABLE public."TAN_mediciones" TO anon;

DROP POLICY IF EXISTS tan_mediciones_allow_anon_delete ON public."TAN_mediciones";

CREATE POLICY tan_mediciones_allow_anon_delete
ON public."TAN_mediciones"
FOR DELETE
TO anon
USING (true);
