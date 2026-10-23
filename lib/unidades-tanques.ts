export const UNIDADES_LECTURA = ["inH₂O", "kg × 1000"] as const

export const UNIDADES_CAPACIDAD_GAS = ["kg", "m³"] as const

export type TipoUnidadTanque = "lectura" | "capacidad_gas"

export type UnidadTanque = {
  id: string
  tipo: TipoUnidadTanque
  nombre: string
}
