"use client"

import { useState } from "react"
import { actualizarTanque, crearTanque, eliminarTanque, type TanqueCatalogo } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { UNIDADES_CAPACIDAD_GAS, UNIDADES_LECTURA } from "@/lib/unidades-tanques"

type CatalogoTanquesProps = {
  tanques: TanqueCatalogo[]
  onCrear: (tanque: TanqueCatalogo) => void
  onActualizar: (tanque: TanqueCatalogo) => void
  onEliminar: (id: string) => void
}

export function CatalogoTanques({ tanques, onCrear, onActualizar, onEliminar }: CatalogoTanquesProps) {
  const [abierto, setAbierto] = useState(false)
  const [tanqueEditando, setTanqueEditando] = useState<TanqueCatalogo | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [unidad, setUnidad] = useState<string>(UNIDADES_LECTURA[0])
  const [unidadCapacidadGas, setUnidadCapacidadGas] = useState<string>(UNIDADES_CAPACIDAD_GAS[1])
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function abrirNuevo() {
    setTanqueEditando(null)
    setUnidad(UNIDADES_LECTURA[0])
    setUnidadCapacidadGas(UNIDADES_CAPACIDAD_GAS[1])
    setError(null)
    setAgregando(true)
  }

  function abrirEdicion(tanque: TanqueCatalogo) {
    setTanqueEditando(tanque)
    setUnidad(tanque.unidad)
    setUnidadCapacidadGas(tanque.unidad_capacidad_gas ?? UNIDADES_CAPACIDAD_GAS[1])
    setError(null)
    setAgregando(false)
  }

  function cerrarFormulario() {
    setTanqueEditando(null)
    setAgregando(false)
    setError(null)
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
    if (!window.confirm(`¿Deseas eliminar el tanque "${tanque.nombre}"?`)) return

    setPendiente(true)
    setError(null)
    try {
      const resultado = await eliminarTanque(tanque.id)
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo eliminar el tanque.")
        return
      }
      onEliminar(tanque.id)
    } catch (deleteError) {
      console.error("Error eliminando tanque del catálogo:", deleteError)
      setError("Ocurrió un error al eliminar el tanque. Intenta de nuevo.")
    } finally {
      setPendiente(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Administrar catálogo de tanques"
        title="Catálogo de tanques"
        onClick={() => {
          setError(null)
          setAbierto(true)
        }}
      >
        <Plus aria-hidden="true" />
      </Button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pendiente) setAbierto(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalogo-tanques-titulo"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:p-6"
          >
            <header className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 id="catalogo-tanques-titulo" className="text-xl font-semibold">
                  Catálogo de tanques termo
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los cambios se reflejan en el resumen y en los formularios.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cerrar catálogo"
                disabled={pendiente}
                onClick={() => setAbierto(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </header>

            <div className="mb-4 flex justify-end">
              <Button type="button" size="sm" disabled={pendiente || agregando || tanqueEditando !== null} onClick={abrirNuevo}>
                <Plus data-icon="inline-start" />
                Agregar tanque
              </Button>
            </div>

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
                  <span className="font-medium">Rango máximo de lectura</span>
                  <input
                    name="capacidad_maxima"
                    type="number"
                    min="0.01"
                    step="any"
                    defaultValue={tanqueEditando?.capacidad_maxima ?? ""}
                    required
                    className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Capacidad máxima de gas</span>
                  <input
                    name="capacidad_gas"
                    type="number"
                    min="0.01"
                    step="any"
                    defaultValue={tanqueEditando?.capacidad_gas ?? ""}
                    required
                    className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Unidad de lectura del instrumento</span>
                  <select
                    value={unidad}
                    onChange={(event) => setUnidad(event.target.value)}
                    required
                    className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                  >
                    {!UNIDADES_LECTURA.some((opcion) => opcion === unidad) && (
                      <option value={unidad}>Actual: {unidad}</option>
                    )}
                    {UNIDADES_LECTURA.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Unidad de capacidad del gas</span>
                  <select
                    value={unidadCapacidadGas}
                    onChange={(event) => setUnidadCapacidadGas(event.target.value)}
                    required
                    className="rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                  >
                    {UNIDADES_CAPACIDAD_GAS.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion}
                      </option>
                    ))}
                  </select>
                </label>
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

            {error && !agregando && !tanqueEditando && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {error}
              </p>
            )}

            {tanques.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {tanques.map((tanque) => (
                  <li
                    key={tanque.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{tanque.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Rango máximo de lectura: {tanque.capacidad_maxima} {tanque.unidad} · Nivel actual:{" "}
                        {tanque.tiene_medicion ? `${tanque.cantidad}%` : "Sin registro"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Capacidad máxima de gas: {tanque.capacidad_gas ?? "Sin especificar"}{" "}
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Eliminar ${tanque.nombre}`}
                        disabled={pendiente || agregando || tanqueEditando !== null}
                        onClick={() => borrarTanque(tanque)}
                      >
                        <Trash2 aria-hidden="true" className="text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No hay tanques registrados.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}
