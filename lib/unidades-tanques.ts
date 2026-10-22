export const UNIDADES_LECTURA = ["inH₂O", "kg × 1000"] as const
export type UnidadLectura = (typeof UNIDADES_LECTURA)[number]

export const UNIDADES_CAPACIDAD_GAS = ["kg", "m³"] as const
export type UnidadCapacidadGas = (typeof UNIDADES_CAPACIDAD_GAS)[number]
