"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { TarjetaMateria, type Materia } from "@/components/tarjeta-materia"
import { GraficoHistorico } from "@/components/grafico-historico"
import { Button } from "@/components/ui/button"
import { LineChart, Share2 } from "lucide-react"
import { toPng } from "html-to-image"
import { eliminarMedicionHistorial, obtenerHistorialTanque } from "@/app/actions"

type ResumenTanque = {
  nombre: string
  porcentaje: number
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
    (t) => `${EMOJI_ESTADO[t.estado.texto] ?? "\u26AA"} ${t.nombre}: ${t.porcentaje}% (${t.estado.texto})`,
  )
  return [`\u{1F4CA} Resumen de niveles - ${fecha}`, "", ...lineas].join("\n")
}

type DashboardSelectorProps = {
  resumenTanques: ResumenTanque[]
  materias: Materia[]
  error: boolean | null
}

export function DashboardSelector({ resumenTanques, materias, error }: DashboardSelectorProps) {
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
        const texto = generarTextoResumen(resumenTanques)
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank")
      }
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") {
        const texto = generarTextoResumen(resumenTanques)
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank")
      }
    } finally {
      setIsSharing(false)
    }
  }

  const materiaPorNombre = new Map(materias.map((m) => [m.tanque ?? m.nombre, m]))
  const materiaSeleccionada = tanqueSeleccionado ? materiaPorNombre.get(tanqueSeleccionado) : null
  const materiaGrafico = graficoSeleccionado ? materiaPorNombre.get(graficoSeleccionado) : null

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
            Tanques termo
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground text-pretty">
            Nivel actual
          </p>

          {!tanqueSeleccionado && !graficoSeleccionado && (
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
                <button
                  onClick={compartirWhatsApp}
                  disabled={isSharing}
                  aria-label={isSharing ? "Generando resumen para compartir" : "Compartir resumen"}
                  title={isSharing ? "Generando..." : "Compartir"}
                  className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/80 disabled:opacity-60"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {resumenTanques.map((tanque) => (
                  <li key={tanque.nombre} className="rounded-lg border border-border bg-card">
                    <button
                      onClick={() => setTanqueSeleccionado(tanque.nombre)}
                      className="w-full text-left p-3 focus:outline-none focus:ring-2 focus:ring-ring rounded-lg transition-all hover:bg-card/80"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-card-foreground">{tanque.nombre}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums text-card-foreground">
                            {tanque.porcentaje}%
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
                          style={{ width: `${tanque.porcentaje}%` }}
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
                <TarjetaMateria materia={materiaSeleccionada} />
              </div>
            </div>
          </section>
        )}

        {!tanqueSeleccionado && !graficoSeleccionado && !error && materias.every((m) => !m.id) && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            Ningún tanque coincide con los nombres esperados. Crea los registros en la tabla TAN_tanques_termo para habilitar el guardado.
          </p>
        )}
      </main>
    </div>
  )
}
