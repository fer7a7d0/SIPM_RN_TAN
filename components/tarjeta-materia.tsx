"use client"

import { useState, useTransition } from "react"
import { actualizarNivel } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"
import { formatNumber } from "@/lib/format-number"

export type Materia = {
  id: string
  nombre: string
  cantidad: number
  unidad: string
  actualizado_en: string
  tanque?: string
  capacidadMaxima: number
  capacidadGas: number | null
  unidadCapacidadGas: string | null
  tieneMedicion: boolean
  activa: boolean
}

function clampPorcentaje(valor: number) {
  if (!Number.isFinite(valor)) return 0
  return Math.max(0, Math.min(100, valor))
}

function clampNivel(valor: number, capacidadMaxima: number) {
  if (!Number.isFinite(valor)) return 0
  return Math.max(0, Math.min(capacidadMaxima, valor))
}

function formatoCorto(valor: number) {
  return formatNumber(Math.round(valor))
}

function colorNivel(porcentaje: number) {
  if (porcentaje < 30) {
    return {
      barra: "bg-destructive",
      chip: "bg-destructive/10 text-destructive-foreground border-destructive/30",
      estado: "Critico",
    }
  }

  if (porcentaje <= 60) {
    return {
      barra: "bg-warning",
      chip: "bg-warning/10 text-warning-foreground border-warning/30",
      estado: "Atencion",
    }
  }

  return {
    barra: "bg-success",
    chip: "bg-success/10 text-success-foreground border-success/30",
    estado: "Optimo",
  }
}

export function TarjetaMateria({
  materia,
  onActualizado,
}: {
  materia: Materia
  onActualizado: (actualizacion: {
    id: string
    cantidad: number
    actualizado_en: string
    tieneMedicion: boolean
  }) => void
}) {
  const capacidadMaxima = materia.capacidadMaxima
  const nivelInicial = clampNivel((clampPorcentaje(materia.cantidad) * capacidadMaxima) / 100, capacidadMaxima)
  const [cantidad, setCantidad] = useState(formatoCorto(nivelInicial))
  const [nota, setNota] = useState("")
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const nivelCapturado = clampNivel(Number(cantidad), capacidadMaxima)
  const porcentajeActual = clampPorcentaje((nivelCapturado / capacidadMaxima) * 100)
  const porcentajeCalculado = Math.round(porcentajeActual)
  const cantidadGasCalculada =
    materia.capacidadGas !== null && Number.isFinite(materia.capacidadGas) && materia.capacidadGas > 0
      ? Math.round((materia.capacidadGas * porcentajeCalculado) / 100)
      : null
  const semaforo = materia.tieneMedicion
    ? colorNivel(porcentajeActual)
    : {
        barra: "bg-muted",
        chip: "bg-muted text-muted-foreground border-border",
        estado: "Sin registro",
      }
  const nombreTanque = materia.tanque ?? materia.nombre
  const tanqueDisponible = Boolean(materia.id)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMensaje(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await actualizarNivel(formData)
      if (res.ok) {
        onActualizado({
          id: materia.id,
          cantidad: res.cantidad,
          actualizado_en: res.actualizadoEn,
          tieneMedicion: true,
        })
        setMensaje({ tipo: "ok", texto: "Nivel registrado correctamente." })
        setNota("")
      } else {
        setMensaje({ tipo: "error", texto: res.error ?? "Ocurrió un error." })
      }
    })
  }

  return (
    <article className="flex min-h-[420px] flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{nombreTanque}</h2>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${semaforo.chip}`}>
          {semaforo.estado}
        </span>
      </header>

      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Nivel actual</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-card-foreground">
            {materia.tieneMedicion ? `${formatoCorto(porcentajeActual)}%` : "Sin registro"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cantidad estimada de gas:{" "}
            <span className="font-semibold text-card-foreground">
              {!materia.tieneMedicion
                ? "Sin registro"
                : cantidadGasCalculada === null || !materia.unidadCapacidadGas
                  ? "Capacidad sin especificar"
                  : `${formatNumber(cantidadGasCalculada)} ${materia.unidadCapacidadGas}`}
            </span>
          </p>
        </div>

        <div className="relative h-44 w-20 overflow-hidden rounded-t-[1.6rem] rounded-b-lg border-2 border-border bg-muted/80 p-1">
          <div className="absolute inset-x-1 bottom-1 top-1 overflow-hidden rounded-t-[1.2rem] rounded-b-md bg-gradient-to-b from-muted to-background">
            <div
              className={`absolute inset-x-0 bottom-0 transition-all duration-500 ${semaforo.barra}`}
              style={{ height: `${materia.tieneMedicion ? porcentajeActual : 0}%` }}
            />
          </div>
          <div className="absolute -top-2 left-1/2 h-2 w-10 -translate-x-1/2 rounded-t-md border border-border bg-muted" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={materia.id} />
        <input type="hidden" name="nombre" value={nombreTanque} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">
            Registrar nivel medido (0 - {formatNumber(capacidadMaxima)} {materia.unidad})
          </span>
            <FormattedNumberInput
              name="cantidad"
              defaultValue={cantidad}
              onValueChange={setCantidad}
              min={0}
              max={capacidadMaxima}
              step={0.1}
              disabled={!tanqueDisponible || isPending}
              required
              className="rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
        </label>

        <p className="text-xs text-muted-foreground">Porcentaje calculado: {formatoCorto(porcentajeActual)}%</p>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">Nota (opcional)</span>
          <input
            name="nota"
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Motivo del cambio, entrada, salida..."
            disabled={!tanqueDisponible || isPending}
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </label>

        <Button type="submit" disabled={!tanqueDisponible || isPending} className="w-full">
          {isPending ? "Guardando..." : "Guardar nivel"}
        </Button>

        {!tanqueDisponible && (
          <p className="text-sm text-warning-foreground">
            Tanque pendiente de vincular en base de datos.
          </p>
        )}

        {mensaje && (
          <p
            role="status"
            className={
              mensaje.tipo === "ok"
                ? "text-sm text-success-foreground"
                : "text-sm text-destructive-foreground"
            }
          >
            {mensaje.texto}
          </p>
        )}
      </form>
    </article>
  )
}
