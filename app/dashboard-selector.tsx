"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { TarjetaMateria, type Materia } from "@/components/tarjeta-materia"
import { CatalogoTanques } from "@/components/catalogo-tanques"
import { GraficoHistorico } from "@/components/grafico-historico"
import { Button } from "@/components/ui/button"
import { LineChart, Plus, Share2 } from "lucide-react"
import { toPng } from "html-to-image"
import { formatNumber } from "@/lib/format-number"
import {
  eliminarMedicionHistorial,
  obtenerHistorialTanque,
  type TanqueCatalogo,
} from "@/app/actions"

type ResumenTanque = {
  id: string
  nombre: string
  porcentaje: number
  tieneMedicion: boolean
  estado: {
    texto: string
    colorBarra: string
    colorChip: string
  }
}

const EMOJI_ESTADO: Record<string, string> = {
  Critico: "\u{1F534}",
  Atencion: "\u{1F7E1}",
  Optimo: "\u{1F7E2}",
}

function generarTextoResumen(resumenTanques: ResumenTanque[]) {
  const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
  const lineas = resumenTanques.map(
    (t) =>
      `${EMOJI_ESTADO[t.estado.texto] ?? "\u26AA"} ${t.nombre}: ${
        t.tieneMedicion ? `${formatNumber(t.porcentaje)}% (${t.estado.texto})` : "Sin registro"
      }`,
  )
  return [`\u{1F4CA} Resumen de niveles - ${fecha}`, "", ...lineas].join("\n")
}

function obtenerEstadoNivel(porcentaje: number, tieneMedicion = true): ResumenTanque["estado"] {
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

function crearResumenTanque(materia: Materia): ResumenTanque {
  const porcentaje = Math.round(Math.max(0, Math.min(100, Number(materia.cantidad) || 0)))
  return {
    id: materia.id,
    nombre: materia.tanque ?? materia.nombre,
    porcentaje,
    tieneMedicion: materia.tieneMedicion,
    estado: obtenerEstadoNivel(porcentaje, materia.tieneMedicion),
  }
}

type DashboardSelectorProps = {
  resumenTanques: ResumenTanque[]
  materias: Materia[]
  error: boolean | null
}

export function DashboardSelector({ resumenTanques, materias, error }: DashboardSelectorProps) {
  const [resumenActual, setResumenActual] = useState(resumenTanques)
  const [materiasActuales, setMateriasActuales] = useState(materias)
  const [catalogoAbierto, setCatalogoAbierto] = useState(false)
  const [tanqueSeleccionado, setTanqueSeleccionado] = useState<string | null>(null)
  const [graficoSeleccionado, setGraficoSeleccionado] = useState<string | null>(null)
  const [diasHistorial, setDiasHistorial] = useState<15 | 30>(15)
  const [historialDatos, setHistorialDatos] = useState<Array<{ id: string; fecha: string; porcentaje: number; nota?: string }>>([])
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSharing, setIsSharing] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  async function compartirWhatsApp() {
    if (!headerRef.current || isSharing) return
    setIsSharing(true)
    try {
      const dataUrl = await toPng(headerRef.current, { pixelRatio: 2 })
      const blob = await (await fetch(dataUrl)).blob()
      const archivo = new File([blob], "resumen-tanques.png", { type: "image/png" })

      // La imagen ya muestra el detalle; el texto solo se usa cuando no hay soporte para adjuntar archivos.
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: "Resumen de niveles" })
      } else {
        const texto = generarTextoResumen(resumenActual)
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank")
      }
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") {
        const texto = generarTextoResumen(resumenActual)
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank")
      }
    } finally {
      setIsSharing(false)
    }
  }

  const materiaPorNombre = new Map(materiasActuales.map((m) => [m.tanque ?? m.nombre, m]))
  const materiaSeleccionada = tanqueSeleccionado ? materiaPorNombre.get(tanqueSeleccionado) : null
  const materiaGrafico = graficoSeleccionado ? materiaPorNombre.get(graficoSeleccionado) : null
  const catalogoTanques: TanqueCatalogo[] = materiasActuales.map((materia) => ({
    id: materia.id,
    nombre: materia.nombre,
    cantidad: materia.cantidad,
    unidad: materia.unidad,
    actualizado_en: materia.actualizado_en,
    capacidad_maxima: materia.capacidadMaxima,
    capacidad_gas: materia.capacidadGas,
    unidad_capacidad_gas: materia.unidadCapacidadGas,
    tiene_medicion: materia.tieneMedicion,
  }))

  function agregarTanque(tanque: TanqueCatalogo) {
    const materia: Materia = {
      ...tanque,
      tanque: tanque.nombre,
      capacidadMaxima: tanque.capacidad_maxima,
      capacidadGas: tanque.capacidad_gas,
      unidadCapacidadGas: tanque.unidad_capacidad_gas,
      tieneMedicion: tanque.tiene_medicion,
    }
    setMateriasActuales((actuales) => [...actuales, materia].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setResumenActual((actuales) =>
      [...actuales, crearResumenTanque(materia)].sort((a, b) => a.porcentaje - b.porcentaje),
    )
  }

  function actualizarTanqueCatalogo(tanque: TanqueCatalogo) {
    const materiaAnterior = materiasActuales.find((materia) => materia.id === tanque.id)
    const materia: Materia = {
      ...tanque,
      tanque: tanque.nombre,
      capacidadMaxima: tanque.capacidad_maxima,
      capacidadGas: tanque.capacidad_gas,
      unidadCapacidadGas: tanque.unidad_capacidad_gas,
      tieneMedicion: tanque.tiene_medicion,
    }
    setMateriasActuales((actuales) =>
      actuales.map((actual) => (actual.id === tanque.id ? materia : actual)),
    )
    setResumenActual((actuales) =>
      actuales
        .map((actual) => (actual.id === tanque.id ? crearResumenTanque(materia) : actual))
        .sort((a, b) => a.porcentaje - b.porcentaje),
    )
    if (materiaAnterior) {
      const nombreAnterior = materiaAnterior.tanque ?? materiaAnterior.nombre
      if (tanqueSeleccionado === nombreAnterior) setTanqueSeleccionado(tanque.nombre)
      if (graficoSeleccionado === nombreAnterior) setGraficoSeleccionado(tanque.nombre)
    }
  }

  function quitarTanque(id: string) {
    const materia = materiasActuales.find((actual) => actual.id === id)
    setMateriasActuales((actuales) => actuales.filter((actual) => actual.id !== id))
    setResumenActual((actuales) => actuales.filter((actual) => actual.id !== id))
    if (materia) {
      const nombre = materia.tanque ?? materia.nombre
      if (tanqueSeleccionado === nombre) setTanqueSeleccionado(null)
      if (graficoSeleccionado === nombre) {
        setGraficoSeleccionado(null)
        setHistorialDatos([])
      }
    }
  }

  function actualizarNivelResumen(actualizacion: {
    id: string
    cantidad: number
    actualizado_en: string
    tieneMedicion: boolean
  }) {
    setMateriasActuales((actuales) =>
      actuales.map((materia) =>
        materia.id === actualizacion.id
          ? {
              ...materia,
              cantidad: actualizacion.cantidad,
              actualizado_en: actualizacion.actualizado_en,
              tieneMedicion: actualizacion.tieneMedicion,
            }
          : materia,
      ),
    )
    setResumenActual((actuales) =>
      actuales
        .map((tanque) =>
          tanque.id === actualizacion.id
            ? {
                ...tanque,
                porcentaje: actualizacion.cantidad,
                tieneMedicion: actualizacion.tieneMedicion,
                estado: obtenerEstadoNivel(actualizacion.cantidad, actualizacion.tieneMedicion),
              }
            : tanque,
        )
        .sort((a, b) => a.porcentaje - b.porcentaje),
    )
  }

  useEffect(() => {
    if (graficoSeleccionado && materiaGrafico?.id) {
      let activo = true

      startTransition(async () => {
        const datos = await obtenerHistorialTanque(materiaGrafico.id, diasHistorial)
        if (activo) setHistorialDatos(datos)
      })

      return () => {
        activo = false
      }
    }
  }, [graficoSeleccionado, materiaGrafico, diasHistorial])

  async function eliminarRegistroHistorial(medicionId: string) {
    if (!materiaGrafico || eliminandoId) return

    setEliminandoId(medicionId)
    setErrorEliminar(null)

    try {
      const resultado = await eliminarMedicionHistorial(materiaGrafico.id, medicionId)
      if (!resultado.ok) {
        setErrorEliminar(resultado.error ?? "No se pudo eliminar el registro del historial.")
        return
      }

      setHistorialDatos((datos) => datos.filter((dato) => dato.id !== medicionId))

      if (
        resultado.latestDeleted &&
        resultado.restoredCantidad !== undefined &&
        resultado.tieneMedicion !== undefined
      ) {
        const tieneMedicion = resultado.tieneMedicion
        const porcentaje = Math.round(Math.max(0, Math.min(100, resultado.restoredCantidad)))
        const materiaActualizada = {
          ...materiaGrafico,
          cantidad: porcentaje,
          tieneMedicion,
        }
        setMateriasActuales((materias) =>
          materias.map((materia) => (materia.id === materiaGrafico.id ? materiaActualizada : materia)),
        )
        setResumenActual((resumen) =>
          resumen.map((tanque) =>
            tanque.id === materiaGrafico.id
              ? {
                  ...tanque,
                  porcentaje,
                  tieneMedicion,
                  estado: obtenerEstadoNivel(porcentaje, tieneMedicion),
                }
              : tanque,
          ).sort((a, b) => a.porcentaje - b.porcentaje),
        )
      }
    } catch (error) {
      console.error("Error eliminando registro del historial:", error)
      setErrorEliminar("Ocurrió un error al eliminar el registro. Intenta de nuevo.")
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-3 py-10 sm:px-6 md:py-12">
        <header ref={headerRef} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">MONITOREO DE TANQUES TERMO</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-card-foreground text-balance">
            Registro de mediciones
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground text-pretty">
            Nivel actual
          </p>

          {!catalogoAbierto && !tanqueSeleccionado && !graficoSeleccionado && (
            <section className="mt-5 rounded-xl border border-border bg-background/60 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                    Resumen general de niveles
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ordenado de menor a mayor
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Administrar catálogo de tanques"
                    title="Catálogo de tanques"
                    onClick={() => setCatalogoAbierto(true)}
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                  <button
                    onClick={compartirWhatsApp}
                    disabled={isSharing}
                    aria-label={isSharing ? "Generando resumen para compartir" : "Compartir resumen"}
                    title={isSharing ? "Generando..." : "Compartir"}
                    className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground transition-all hover:bg-muted/80 disabled:opacity-60"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {resumenActual.map((tanque) => (
                  <li key={tanque.id} className="rounded-lg border border-border bg-card">
                    <button
                      onClick={() => setTanqueSeleccionado(tanque.nombre)}
                      className="w-full text-left p-3 focus:outline-none focus:ring-2 focus:ring-ring rounded-lg transition-all hover:bg-card/80"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-card-foreground">{tanque.nombre}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums text-card-foreground">
                            {tanque.tieneMedicion ? `${formatNumber(tanque.porcentaje)}%` : "Sin registro"}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tanque.estado.colorChip}`}>
                            {tanque.estado.texto}
                          </span>
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              setGraficoSeleccionado(tanque.nombre)
                            }}
                            className="ml-1 rounded-md bg-muted p-1 text-muted-foreground transition-all hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                            title="Ver gráfico histórico"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation()
                                setGraficoSeleccionado(tanque.nombre)
                              }
                            }}
                          >
                            <LineChart className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${tanque.estado.colorBarra}`}
                          style={{ width: `${tanque.tieneMedicion ? tanque.porcentaje : 0}%` }}
                        />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </header>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudieron cargar los datos. Intenta de nuevo más tarde.
          </p>
        )}

        {graficoSeleccionado && materiaGrafico && (
          <section className="flex flex-col gap-4">
            <Button
              onClick={() => setGraficoSeleccionado(null)}
              variant="outline"
              className="w-fit"
            >
              ← Volver al resumen
            </Button>
            {isPending ? (
              <div className="flex h-64 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <p className="text-sm">Cargando historial...</p>
              </div>
            ) : (
              <GraficoHistorico
                materia={materiaGrafico}
                datos={historialDatos}
                dias={diasHistorial}
                onCambiarDias={setDiasHistorial}
                onEliminar={eliminarRegistroHistorial}
                eliminandoId={eliminandoId}
                errorEliminar={errorEliminar}
              />
            )}
          </section>
        )}

        {catalogoAbierto && (
          <section className="flex flex-col gap-4">
            <Button
              onClick={() => setCatalogoAbierto(false)}
              variant="outline"
              className="w-fit"
            >
              ← Volver al resumen
            </Button>
            <CatalogoTanques
              tanques={catalogoTanques}
              onCrear={agregarTanque}
              onActualizar={actualizarTanqueCatalogo}
              onEliminar={quitarTanque}
            />
          </section>
        )}

        {tanqueSeleccionado && materiaSeleccionada && (
          <section className="flex flex-col gap-4">
            <Button
              onClick={() => setTanqueSeleccionado(null)}
              variant="outline"
              className="w-fit"
            >
              ← Volver al resumen
            </Button>
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                <TarjetaMateria
                  materia={materiaSeleccionada}
                  onActualizado={actualizarNivelResumen}
                />
              </div>
            </div>
          </section>
        )}

        {!catalogoAbierto && !tanqueSeleccionado && !graficoSeleccionado && !error && materiasActuales.length === 0 && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            No hay tanques registrados. Usa el botón del catálogo para agregar uno.
          </p>
        )}
      </main>
    </div>
  )
}
