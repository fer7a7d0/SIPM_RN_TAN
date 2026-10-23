"use client"

import { useEffect, useState } from "react"
import {
  actualizarTanque,
  crearTanque,
  crearUnidadTanque,
  eliminarTanque,
  obtenerUnidadesTanque,
  reactivarTanque,
  type TanqueCatalogo,
} from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { UNIDADES_CAPACIDAD_GAS, UNIDADES_LECTURA, type TipoUnidadTanque } from "@/lib/unidades-tanques"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { formatNumber } from "@/lib/format-number"

type CatalogoTanquesProps = {
  tanques: TanqueCatalogo[]
  onCrear: (tanque: TanqueCatalogo) => void
  onActualizar: (tanque: TanqueCatalogo) => void
  onEliminar: (id: string) => void
  onArchivar: (id: string) => void
  onReactivar: (id: string) => void
}

export function CatalogoTanques({
  tanques,
  onCrear,
  onActualizar,
  onEliminar,
  onArchivar,
  onReactivar,
}: CatalogoTanquesProps) {
  const [tanqueEditando, setTanqueEditando] = useState<TanqueCatalogo | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [unidad, setUnidad] = useState<string>(UNIDADES_LECTURA[0])
  const [unidadCapacidadGas, setUnidadCapacidadGas] = useState<string>(UNIDADES_CAPACIDAD_GAS[1])
  const [unidadesLectura, setUnidadesLectura] = useState<string[]>([...UNIDADES_LECTURA])
  const [unidadesCapacidadGas, setUnidadesCapacidadGas] = useState<string[]>([...UNIDADES_CAPACIDAD_GAS])
  const [agregandoUnidad, setAgregandoUnidad] = useState<TipoUnidadTanque | null>(null)
  const [nuevaUnidad, setNuevaUnidad] = useState("")
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    async function cargarUnidades() {
      const resultado = await obtenerUnidadesTanque()
      if (!activo) return
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      setUnidadesLectura((actuales) => [
        ...new Set([
          ...actuales,
          ...resultado.unidades.filter((item) => item.tipo === "lectura").map((item) => item.nombre),
        ]),
      ])
      setUnidadesCapacidadGas((actuales) => [
        ...new Set([
          ...actuales,
          ...resultado.unidades.filter((item) => item.tipo === "capacidad_gas").map((item) => item.nombre),
        ]),
      ])
    }

    void cargarUnidades().catch((loadError) => {
      console.error("Error cargando unidades de tanque:", loadError)
      if (activo) setError("Ocurrió un error al cargar las unidades.")
    })
    return () => {
      activo = false
    }
  }, [])

  function abrirNuevo() {
    setTanqueEditando(null)
    setUnidad(UNIDADES_LECTURA[0])
    setUnidadCapacidadGas(UNIDADES_CAPACIDAD_GAS[1])
    setAgregandoUnidad(null)
    setNuevaUnidad("")
    setError(null)
    setAgregando(true)
  }

  function abrirEdicion(tanque: TanqueCatalogo) {
    setTanqueEditando(tanque)
    setUnidad(tanque.unidad)
    setUnidadCapacidadGas(tanque.unidad_capacidad_gas ?? UNIDADES_CAPACIDAD_GAS[1])
    setAgregandoUnidad(null)
    setNuevaUnidad("")
    setError(null)
    setAgregando(false)
  }

  function cerrarFormulario() {
    setTanqueEditando(null)
    setAgregando(false)
    setAgregandoUnidad(null)
    setNuevaUnidad("")
    setError(null)
  }

  function cambiarUnidad(tipo: TipoUnidadTanque, valor: string) {
    if (valor === "__agregar_unidad__") {
      setAgregandoUnidad(tipo)
      setNuevaUnidad("")
      setError(null)
      return
    }

    if (tipo === "lectura") setUnidad(valor)
    else setUnidadCapacidadGas(valor)
    setAgregandoUnidad(null)
    setNuevaUnidad("")
  }

  async function guardarUnidad(tipo: TipoUnidadTanque) {
    setPendiente(true)
    setError(null)
    try {
      const resultado = await crearUnidadTanque(tipo, nuevaUnidad)
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      const setter = tipo === "lectura" ? setUnidadesLectura : setUnidadesCapacidadGas
      setter((actuales) => [...new Set([...actuales, resultado.unidad.nombre])])
      if (tipo === "lectura") setUnidad(resultado.unidad.nombre)
      else setUnidadCapacidadGas(resultado.unidad.nombre)
      setAgregandoUnidad(null)
      setNuevaUnidad("")
    } catch (unitError) {
      console.error("Error guardando unidad de tanque:", unitError)
      setError("Ocurrió un error al guardar la unidad. Intenta de nuevo.")
    } finally {
      setPendiente(false)
    }
  }

  function selectorUnidad(tipo: TipoUnidadTanque, label: string, valor: string, opciones: string[]) {
    const idUnidad = `unidad-${tipo}`
    const idNuevaUnidad = `nueva-unidad-${tipo}`
    return (
      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor={idUnidad} className="font-medium">{label}</label>
        <select
          id={idUnidad}
          value={valor}
          onChange={(event) => cambiarUnidad(tipo, event.target.value)}
          required
          disabled={pendiente}
          className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          {valor && !opciones.includes(valor) && <option value={valor}>Actual: {valor}</option>}
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
          <option value="__agregar_unidad__">+ Agregar unidad…</option>
        </select>
        {agregandoUnidad === tipo && (
          <div className="mt-1 flex gap-2">
            <label htmlFor={idNuevaUnidad} className="sr-only">Nueva unidad</label>
            <input
              id={idNuevaUnidad}
              value={nuevaUnidad}
              onChange={(event) => setNuevaUnidad(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void guardarUnidad(tipo)
                }
              }}
              maxLength={tipo === "lectura" ? 20 : 30}
              placeholder="Escribe la unidad"
              autoFocus
              disabled={pendiente}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              type="button"
              variant="outline"
              disabled={pendiente || !nuevaUnidad.trim()}
              onClick={() => void guardarUnidad(tipo)}
            >
              Agregar
            </Button>
          </div>
        )}
      </div>
    )
  }

  async function guardarTanque(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPendiente(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    formData.set("unidad", unidad)
    formData.set("unidad_capacidad_gas", unidadCapacidadGas)
    if (tanqueEditando) {
      formData.set("id", tanqueEditando.id)
    }

    try {
      const resultado = tanqueEditando
        ? await actualizarTanque(formData)
        : await crearTanque(formData)

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      if (tanqueEditando) {
        onActualizar(resultado.tanque)
      } else {
        onCrear(resultado.tanque)
      }
      cerrarFormulario()
    } catch (saveError) {
      console.error("Error guardando tanque del catálogo:", saveError)
      setError("Ocurrió un error al guardar el tanque. Intenta de nuevo.")
    } finally {
      setPendiente(false)
    }
  }

  async function borrarTanque(tanque: TanqueCatalogo) {
    if (
      !window.confirm(
        `¿Deseas eliminar la pipa "${tanque.nombre}"? Si tiene registros, se conservará inactiva en el catálogo y se ocultará del resumen. Si no tiene registros, se eliminará definitivamente.`,
      )
    ) return

    setPendiente(true)
    setError(null)
    try {
      const resultado = await eliminarTanque(tanque.id)
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo eliminar el tanque.")
        return
      }
      if (resultado.archived) onArchivar(tanque.id)
      else onEliminar(tanque.id)
    } catch (deleteError) {
      console.error("Error eliminando tanque del catálogo:", deleteError)
      setError("Ocurrió un error al eliminar el tanque. Intenta de nuevo.")
    } finally {
      setPendiente(false)
    }
  }

  async function restaurarTanque(tanque: TanqueCatalogo) {
    setPendiente(true)
    setError(null)
    try {
      const resultado = await reactivarTanque(tanque.id)
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo reactivar el tanque.")
        return
      }
      onReactivar(tanque.id)
    } catch (restoreError) {
      console.error("Error reactivando tanque del catálogo:", restoreError)
      setError("Ocurrió un error al reactivar el tanque. Intenta de nuevo.")
    } finally {
      setPendiente(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
      <header className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 id="catalogo-tanques-titulo" className="text-xl font-semibold">
                  Catálogo de tanques termo
                </h2>
              </div>
      </header>

            {!agregando && !tanqueEditando && (
              <div className="mb-4 flex justify-end">
                <Button
                  type="button"
                  aria-label="Agregar tanque"
                  title="Agregar tanque"
                  disabled={pendiente}
                  onClick={abrirNuevo}
                  className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground transition-all hover:bg-muted/80 disabled:opacity-60"
                >
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {(agregando || tanqueEditando) && (
              <form onSubmit={guardarTanque} className="mb-5 grid gap-3 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-2">
                <h3 className="sm:col-span-2 text-base font-semibold">
                  {tanqueEditando ? "Editar tanque" : "Nuevo tanque"}
                </h3>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Nombre</span>
                  <input
                    name="nombre"
                    defaultValue={tanqueEditando?.nombre ?? ""}
                    maxLength={100}
                    required
                    className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Capacidad máxima de gas</span>
                  <FormattedNumberInput
                    name="capacidad_gas"
                    min={0.01}
                    defaultValue={tanqueEditando?.capacidad_gas ?? ""}
                    required
                    className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                {selectorUnidad("capacidad_gas", "Unidad de capacidad del gas", unidadCapacidadGas, unidadesCapacidadGas)}
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Rango máximo de lectura</span>
                  <FormattedNumberInput
                    name="capacidad_maxima"
                    min={0.01}
                    defaultValue={tanqueEditando?.capacidad_maxima ?? ""}
                    required
                    className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                {selectorUnidad("lectura", "Unidad de lectura del instrumento", unidad, unidadesLectura)}
                {!tanqueEditando && (
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    El tanque se creará sin mediciones, con un nivel inicial de 0%.
                  </p>
                )}
                {error && (
                  <p role="alert" className="sm:col-span-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit" disabled={pendiente}>
                    {pendiente ? "Guardando..." : tanqueEditando ? "Guardar cambios" : "Crear tanque"}
                  </Button>
                  <Button type="button" variant="outline" disabled={pendiente} onClick={cerrarFormulario}>
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {!agregando && !tanqueEditando && error && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {error}
              </p>
            )}

      {!agregando && !tanqueEditando && (tanques.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {tanques.map((tanque) => (
                  <li
                    key={tanque.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {tanque.nombre}
                        {!tanque.activa && <span className="ml-2 text-xs font-normal text-muted-foreground">Inactiva</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rango de lectura: 0 - {formatNumber(tanque.capacidad_maxima)} {tanque.unidad}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Capacidad máxima de gas:{" "}
                        {tanque.capacidad_gas === null ? "Sin especificar" : formatNumber(tanque.capacidad_gas)}{" "}
                        {tanque.unidad_capacidad_gas ?? ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${tanque.nombre}`}
                        disabled={pendiente || agregando || tanqueEditando !== null}
                        onClick={() => abrirEdicion(tanque)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      {tanque.activa ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar ${tanque.nombre}`}
                          title={`Eliminar ${tanque.nombre}`}
                          disabled={pendiente || agregando || tanqueEditando !== null}
                          onClick={() => borrarTanque(tanque)}
                        >
                          <Trash2 aria-hidden="true" className="text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Reactivar ${tanque.nombre}`}
                          title={`Reactivar ${tanque.nombre}`}
                          disabled={pendiente || agregando || tanqueEditando !== null}
                          onClick={() => void restaurarTanque(tanque)}
                        >
                          <RotateCcw aria-hidden="true" className="text-primary" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No hay tanques registrados.
              </p>
            ))}
    </section>
  )
}
