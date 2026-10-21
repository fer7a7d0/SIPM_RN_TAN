export type TanqueClave = "AR" | "N2" | "O2" | "CO2_1" | "CO2_2"

export type TanqueConfig = {
  clave: TanqueClave
  nombreUI: string
  capacidadMaxima: number
  unidadContenido: "m³" | "kg"
  aliases: string[]
}

export const TANQUES: TanqueConfig[] = [
  { clave: "AR", nombreUI: "LAR", capacidadMaxima: 16084.52, unidadContenido: "m³", aliases: ["ar", "lar", "argon", "argón"] },
  { clave: "N2", nombreUI: "LIN", capacidadMaxima: 11440, unidadContenido: "m³", aliases: ["n2", "lin", "nitrogeno", "nitrógeno"] },
  { clave: "O2", nombreUI: "LOX", capacidadMaxima: 41000, unidadContenido: "m³", aliases: ["o2", "lox", "oxigeno", "oxígeno"] },
  {
    clave: "CO2_1",
    nombreUI: "CO2 #1",
    capacidadMaxima: 50850,
    unidadContenido: "kg",
    aliases: ["co2 #1", "co2 1", "co2-1", "bioxido de carbono #1", "bióxido de carbono #1"],
  },
  {
    clave: "CO2_2",
    nombreUI: "CO2 #2",
    capacidadMaxima: 50850,
    unidadContenido: "kg",
    aliases: ["co2 #2", "co2 2", "co2-2", "bioxido de carbono #2", "bióxido de carbono #2"],
  },
]

export function normalizarNombre(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

export function obtenerTanquePorClave(clave: string | null | undefined) {
  if (!clave) return undefined
  return TANQUES.find((t) => t.clave === clave)
}
