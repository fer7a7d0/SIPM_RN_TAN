import { createClient } from "@/lib/supabase/server"
import { type Materia } from "@/components/tarjeta-materia"
import { DashboardSelector } from "@/app/dashboard-selector"

function clampPorcentaje(valor: number) {
  if (!Number.isFinite(valor)) return 0
  return Math.round(Math.max(0, Math.min(100, valor)))
}

function estadoNivel(porcentaje: number, tieneMedicion: boolean) {
  if (!tieneMedicion) {
    return {
      texto: "Sin registro",
      colorBarra: "bg-muted",
      colorChip: "bg-muted text-muted-foreground border-border",
    }
  }

  if (porcentaje < 30) {
    return {
      texto: "Critico",
      colorBarra: "bg-destructive",
      colorChip: "bg-destructive/10 text-destructive-foreground border-destructive/30",
    }
  }

  if (porcentaje <= 60) {
    return {
      texto: "Atencion",
      colorBarra: "bg-warning",
      colorChip: "bg-warning/10 text-warning-foreground border-warning/30",
    }
  }

  return {
    texto: "Optimo",
    colorBarra: "bg-success",
    colorChip: "bg-success/10 text-success-foreground border-success/30",
  }
}

export default async function Home() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("TAN_tanques_termo")
    .select("id, nombre, cantidad, unidad, actualizado_en, capacidad_maxima, capacidad_gas, unidad_capacidad_gas, tiene_medicion")
    .order("nombre", { ascending: true })

  const materias: Materia[] = (data ?? []).map((tanque) => ({
    id: tanque.id,
    nombre: tanque.nombre,
    tanque: tanque.nombre,
    cantidad: Number(tanque.cantidad),
    unidad: tanque.unidad,
    actualizado_en: tanque.actualizado_en,
    capacidadMaxima: Number(tanque.capacidad_maxima),
    capacidadGas: tanque.capacidad_gas === null ? null : Number(tanque.capacidad_gas),
    unidadCapacidadGas: tanque.unidad_capacidad_gas,
    tieneMedicion: tanque.tiene_medicion,
  }))

  const resumenTanques = materias
    .map((materia) => {
      const porcentaje = clampPorcentaje(Number(materia.cantidad))
      return {
        id: materia.id,
        nombre: materia.tanque ?? materia.nombre,
        porcentaje,
        tieneMedicion: materia.tieneMedicion,
        estado: estadoNivel(porcentaje, materia.tieneMedicion),
      }
    })
    .sort((a, b) => a.porcentaje - b.porcentaje)

  return (
    <DashboardSelector
      resumenTanques={resumenTanques}
      materias={materias}
      error={Boolean(error)}
    />
  )
}
