"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { obtenerTanquePorClave } from "@/lib/tanques"

export type ActionResult = { ok: boolean; error?: string }

export async function actualizarNivel(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") || "").trim()
  const tanqueClave = String(formData.get("tanqueClave") || "").trim()
  const cantidadRaw = String(formData.get("cantidad") || "")
  const unidad = String(formData.get("unidad") || "").trim()
  const nota = String(formData.get("nota") || "").trim()

  if (!id) return { ok: false, error: "Tanque no vinculado en base de datos. Crea ese registro para poder guardar nivel." }

  const tanqueConfig = obtenerTanquePorClave(tanqueClave)
  if (!tanqueConfig) {
    return { ok: false, error: "No se encontró la configuración de capacidad para este tanque." }
  }

  const nivelMedido = Number(cantidadRaw)
  if (!Number.isFinite(nivelMedido) || nivelMedido < 0 || nivelMedido > tanqueConfig.capacidadMaxima) {
    return {
      ok: false,
      error: `El nivel debe ser un valor entre 0 y ${tanqueConfig.capacidadMaxima} para ${tanqueConfig.nombreUI}.`,
    }
  }
  if (!unidad) {
    return { ok: false, error: "Debes indicar una unidad de medida." }
  }

  const porcentajeNuevo = Math.round((nivelMedido / tanqueConfig.capacidadMaxima) * 100)

  const supabase = await createClient()
  let materiaId = id
  let cantidadAnterior = 0

  const { data: actual, error: readError } = await supabase
    .from("TAN_tanques_termo")
    .select("id, cantidad")
    .eq("id", materiaId)
    .single()

  if (readError || !actual) {
    return { ok: false, error: "No se encontró el tanque solicitado." }
  }

  cantidadAnterior = Number(actual.cantidad) || 0

  // Actualizar el nivel actual
  const { error: updateError } = await supabase
    .from("TAN_tanques_termo")
    .update({ cantidad: porcentajeNuevo, unidad, actualizado_en: new Date().toISOString() })
    .eq("id", materiaId)

  if (updateError) {
    return { ok: false, error: "No se pudo actualizar el nivel." }
  }

  const detalleNivel = `Lectura real: ${nivelMedido}/${tanqueConfig.capacidadMaxima}`
  const notaCompleta = nota ? `${nota} | ${detalleNivel}` : detalleNivel

  // Registrar el movimiento en el historial
  const { error: histError } = await supabase.from("TAN_mediciones").insert({
    materia_prima_id: materiaId,
    cantidad_anterior: cantidadAnterior,
    cantidad_nueva: porcentajeNuevo,
    unidad,
    nota: notaCompleta,
  })

  if (histError) {
    return { ok: false, error: "El nivel se actualizó pero no se pudo guardar el historial." }
  }

  revalidatePath("/")
  return { ok: true }
}

export async function obtenerHistorialTanque(materiaId: string, dias: 15 | 30 = 15) {
  const supabase = await createClient()
  
  if (!materiaId) {
    console.error("obtenerHistorialTanque: materiaId está vacío")
    return []
  }

  console.log(`obtenerHistorialTanque: buscando ${dias} días para materiaId =`, materiaId)

  const fechaInicio = new Date()
  fechaInicio.setDate(fechaInicio.getDate() - dias)

  const { data, error } = await supabase
    .from("TAN_mediciones")
    .select("id, cantidad_nueva, nota, creado_en")
    .eq("materia_prima_id", materiaId)
    .gte("creado_en", fechaInicio.toISOString())
    .order("creado_en", { ascending: false })

  if (error) {
    console.error("Error obteniendo historial:", error)
    return []
  }

  console.log("obtenerHistorialTanque: encontrados", data?.length || 0, "registros")

  return (
    data?.map((item) => ({
      id: String(item.id),
      fecha: new Date(item.creado_en).toLocaleDateString("es-ES", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      porcentaje: Math.round(Number(item.cantidad_nueva) || 0),
      nota: item.nota || undefined,
    })) || []
  )
}

export async function eliminarMedicionHistorial(materiaId: string, medicionId: string): Promise<ActionResult> {
  if (!materiaId.trim() || !medicionId.trim()) {
    return { ok: false, error: "No se pudo identificar el registro que deseas eliminar." }
  }

  const supabase = await createClient()
  const { count, error } = await supabase
    .from("TAN_mediciones")
    .delete({ count: "exact" })
    .eq("id", medicionId)
    .eq("materia_prima_id", materiaId)

  if (error) {
    console.error("Error eliminando medición del historial:", error)
    return { ok: false, error: "No se pudo eliminar el registro del historial." }
  }

  if (count !== 1) {
    return {
      ok: false,
      error: "No se eliminó el registro. Verifica que la política de borrado público esté aplicada en Supabase.",
    }
  }

  return { ok: true }
}
