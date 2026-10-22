"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type ActionResult = {
  ok: boolean
  error?: string
  latestDeleted?: boolean
  restoredCantidad?: number
  restoredUnidad?: string
  tieneMedicion?: boolean
}

export type ResultadoActualizarNivel =
  | { ok: true; cantidad: number; actualizadoEn: string; tieneMedicion: true }
  | { ok: false; error: string }

export type TanqueCatalogo = {
  id: string
  nombre: string
  cantidad: number
  unidad: string
  actualizado_en: string
  capacidad_maxima: number
  tiene_medicion: boolean
}

type ResultadoTanque = { ok: true; tanque: TanqueCatalogo } | { ok: false; error: string }
type DatosTanque = { nombre: string; unidad: string; capacidadMaxima: number }

function validarDatosTanque(
  formData: FormData,
): { ok: true; datos: DatosTanque } | { ok: false; error: string } {
  const nombre = String(formData.get("nombre") ?? "").trim()
  const unidad = String(formData.get("unidad") ?? "").trim()
  const capacidadMaxima = Number(formData.get("capacidad_maxima"))

  if (!nombre || nombre.length > 100) {
    return { ok: false, error: "El nombre es obligatorio y no puede exceder 100 caracteres." }
  }
  if (!Number.isFinite(capacidadMaxima) || capacidadMaxima <= 0) {
    return { ok: false, error: "La capacidad máxima debe ser mayor que cero." }
  }
  if (!unidad || unidad.length > 20) {
    return { ok: false, error: "La unidad es obligatoria y no puede exceder 20 caracteres." }
  }

  return { ok: true, datos: { nombre, unidad, capacidadMaxima } }
}

function normalizarTanque(tanque: {
  id: string
  nombre: string
  cantidad: number | string
  unidad: string
  actualizado_en: string
  capacidad_maxima: number | string
  tiene_medicion: boolean
}): TanqueCatalogo {
  return {
    ...tanque,
    cantidad: Number(tanque.cantidad),
    capacidad_maxima: Number(tanque.capacidad_maxima),
  }
}

export async function crearTanque(formData: FormData): Promise<ResultadoTanque> {
  const valores = validarDatosTanque(formData)
  if (!valores.ok) return valores

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("TAN_tanques_termo")
    .insert({
      nombre: valores.datos.nombre,
      capacidad_maxima: valores.datos.capacidadMaxima,
      cantidad: 0,
      unidad: valores.datos.unidad,
      actualizado_en: new Date().toISOString(),
    })
    .select("id, nombre, cantidad, unidad, actualizado_en, capacidad_maxima, tiene_medicion")
    .single()

  if (error) {
    console.error("Error creando tanque termo:", error)
    return {
      ok: false,
      error: error.code === "23505" ? "Ya existe un tanque con ese nombre." : "No se pudo crear el tanque.",
    }
  }

  return { ok: true, tanque: normalizarTanque(data) }
}

export async function actualizarTanque(formData: FormData): Promise<ResultadoTanque> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) return { ok: false, error: "No se pudo identificar el tanque." }

  const valores = validarDatosTanque(formData)
  if (!valores.ok) return valores

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("TAN_tanques_termo")
    .update({
      nombre: valores.datos.nombre,
      capacidad_maxima: valores.datos.capacidadMaxima,
      unidad: valores.datos.unidad,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, nombre, cantidad, unidad, actualizado_en, capacidad_maxima, tiene_medicion")
    .maybeSingle()

  if (error) {
    console.error("Error actualizando tanque termo:", error)
    return {
      ok: false,
      error: error.code === "23505" ? "Ya existe un tanque con ese nombre." : "No se pudo actualizar el tanque.",
    }
  }

  if (!data) return { ok: false, error: "No se encontró el tanque solicitado." }
  return { ok: true, tanque: normalizarTanque(data) }
}

export async function eliminarTanque(id: string): Promise<ActionResult> {
  if (!id.trim()) return { ok: false, error: "No se pudo identificar el tanque." }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("eliminar_tanque_catalogo", {
    p_tanque_id: id,
  })

  if (error) {
    console.error("Error eliminando tanque termo:", error)
    return { ok: false, error: "No se pudo eliminar el tanque." }
  }

  if (!data || typeof data !== "object" || data.deleted !== true) {
    return {
      ok: false,
      error:
        data && typeof data === "object" && data.has_measurements
          ? "No se puede eliminar este tanque porque tiene mediciones registradas."
          : "No se encontró el tanque solicitado.",
    }
  }

  return { ok: true }
}

export async function actualizarNivel(formData: FormData): Promise<ResultadoActualizarNivel> {
  const id = String(formData.get("id") || "").trim()
  const cantidadRaw = String(formData.get("cantidad") || "")
  const nota = String(formData.get("nota") || "").trim()

  if (!id) return { ok: false, error: "Tanque no vinculado en base de datos. Crea ese registro para poder guardar nivel." }

  const nivelMedido = Number(cantidadRaw)
  if (!Number.isFinite(nivelMedido) || nivelMedido < 0) {
    return { ok: false, error: "El nivel debe ser un valor igual o mayor que cero." }
  }

  const supabase = await createClient()
  const { data: actual, error: readError } = await supabase
    .from("TAN_tanques_termo")
    .select("id, nombre, cantidad, unidad, capacidad_maxima")
    .eq("id", id)
    .single()

  if (readError || !actual) {
    return { ok: false, error: "No se encontró el tanque solicitado." }
  }

  const capacidadMaxima = Number(actual.capacidad_maxima)
  if (nivelMedido > capacidadMaxima) {
    return {
      ok: false,
      error: `El nivel debe ser un valor entre 0 y ${capacidadMaxima} ${actual.unidad} para ${actual.nombre}.`,
    }
  }

  const porcentajeNuevo = Math.round((nivelMedido / capacidadMaxima) * 100)
  const cantidadAnterior = Number(actual.cantidad) || 0
  const actualizadoEn = new Date().toISOString()

  // Actualizar el nivel actual
  const { error: updateError } = await supabase
    .from("TAN_tanques_termo")
    .update({ cantidad: porcentajeNuevo, actualizado_en: actualizadoEn })
    .eq("id", id)

  if (updateError) {
    return { ok: false, error: "No se pudo actualizar el nivel." }
  }

  const detalleNivel = `Lectura real: ${nivelMedido}/${capacidadMaxima} ${actual.unidad}`
  const notaCompleta = nota ? `${nota} | ${detalleNivel}` : detalleNivel

  // Registrar el movimiento en el historial
  const { error: histError } = await supabase.from("TAN_mediciones").insert({
    materia_prima_id: id,
    cantidad_anterior: cantidadAnterior,
    cantidad_nueva: porcentajeNuevo,
    unidad: actual.unidad,
    nota: notaCompleta,
  })

  if (histError) {
    return { ok: false, error: "El nivel se actualizó pero no se pudo guardar el historial." }
  }

  revalidatePath("/")
  return { ok: true, cantidad: porcentajeNuevo, actualizadoEn, tieneMedicion: true }
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
    .order("id", { ascending: false })

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
  const { data, error } = await supabase.rpc("eliminar_medicion_historial", {
    p_materia_id: materiaId,
    p_medicion_id: medicionId,
  })

  if (error) {
    console.error("Error eliminando medición del historial:", error)
    return { ok: false, error: "No se pudo eliminar el registro del historial." }
  }

  if (!data || typeof data !== "object" || data.deleted !== true) {
    return {
      ok: false,
      error: "No se encontró el registro del historial.",
    }
  }

  const latestDeleted = data.latest_deleted === true
  const tieneMedicion = data.has_measurements === true
  const restoredCantidad = Number(data.restored_cantidad)
  const restoredUnidad = typeof data.restored_unidad === "string" ? data.restored_unidad : ""
  if (
    latestDeleted &&
    (!Number.isFinite(restoredCantidad) || !restoredUnidad || typeof data.has_measurements !== "boolean")
  ) {
    console.error("La medición se eliminó pero la cantidad restaurada no es válida:", data)
    return { ok: false, error: "Se eliminó el registro, pero no se pudo actualizar el resumen." }
  }

  return {
    ok: true,
    latestDeleted,
    restoredCantidad: latestDeleted ? restoredCantidad : undefined,
    restoredUnidad: latestDeleted ? restoredUnidad : undefined,
    tieneMedicion: latestDeleted ? tieneMedicion : undefined,
  }
}
