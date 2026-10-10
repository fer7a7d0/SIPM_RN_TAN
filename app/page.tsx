import { createClient } from "@/lib/supabase/server"
import { type Materia } from "@/components/tarjeta-materia"
import { TANQUES, normalizarNombre } from "@/lib/tanques"
import { DashboardSelector } from "@/app/dashboard-selector"

function clampPorcentaje(valor: number) {
  if (!Number.isFinite(valor)) return 0
  return Math.round(Math.max(0, Math.min(100, valor)))
}

function estadoNivel(porcentaje: number) {
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
    .from("materias_primas")
    .select("id, nombre, cantidad, unidad, actualizado_en")
    .order("nombre", { ascending: true })

  const materiasDB = (data ?? []) as Materia[]
  const materiasNormalizadas = new Map(materiasDB.map((m) => [normalizarNombre(m.nombre), m]))

  const materias = TANQUES.map((tanque) => {
    const encontrada = tanque.aliases
      .map((a) => materiasNormalizadas.get(normalizarNombre(a)))
      .find(Boolean)

    if (encontrada) {
      return {
        ...encontrada,
        tanque: tanque.nombreUI,
        claveTanque: tanque.clave,
        capacidadMaxima: tanque.capacidadMaxima,
      }
    }

    return {
      id: "",
      nombre: tanque.nombreUI,
      cantidad: 0,
      unidad: "%",
      actualizado_en: "",
      tanque: tanque.nombreUI,
      claveTanque: tanque.clave,
      capacidadMaxima: tanque.capacidadMaxima,
    }
  })

  const resumenTanques = materias
    .map((materia) => {
      const porcentaje = clampPorcentaje(Number(materia.cantidad))
      return {
        nombre: materia.tanque ?? materia.nombre,
        porcentaje,
        estado: estadoNivel(porcentaje),
      }
    })
    .sort((a, b) => a.porcentaje - b.porcentaje)

  return (
    <DashboardSelector
      resumenTanques={resumenTanques}
      materias={materias}
      error={error}
    />
  )
}
