export type TipoUnidadTanque = "lectura" | "capacidad_gas"

export type UnidadTanque = {
  id: string
  tipo: TipoUnidadTanque
  nombre: string
}
