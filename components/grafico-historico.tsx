"use client"

import { Materia } from "@/components/tarjeta-materia"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Trash2 } from "lucide-react"
import { formatNumber } from "@/lib/format-number"

type DatoHistorico = {
  id: string
  fecha: string
  porcentaje: number
  nota?: string
}

type GraficoHistoricoProps = {
  materia: Materia
  datos: DatoHistorico[]
  dias: 15 | 30
  cargando: boolean
  errorHistorial: string | null
  onCambiarDias: (dias: 15 | 30) => void
  onEliminar: (id: string) => void
  eliminandoId: string | null
  errorEliminar: string | null
}

export function GraficoHistorico({
  materia,
  datos,
  dias,
  cargando,
  errorHistorial,
  onCambiarDias,
  onEliminar,
  eliminandoId,
  errorEliminar,
}: GraficoHistoricoProps) {
  const nombreTanque = materia.tanque ?? materia.nombre

  // Calcular estadísticas
  const porcentajes = datos.map((d) => d.porcentaje)
  const promedio = porcentajes.length > 0 ? Math.round(porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length) : 0
  const criticos = porcentajes.filter((p) => p < 30).length
  const minimo = porcentajes.length > 0 ? Math.min(...porcentajes) : 0
  const maximo = porcentajes.length > 0 ? Math.max(...porcentajes) : 0

  return (
    <div className="flex flex-col gap-8">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">Historial</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-card-foreground text-balance">
          {nombreTanque} - Últimos {formatNumber(dias)} días
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground text-pretty">
          Comportamiento histórico y estadísticas del nivel
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold tracking-tight text-card-foreground">Estadísticas</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Promedio</p>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{formatNumber(promedio)}%</p>
          </div>

          <div className="rounded-lg bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Máximo</p>
            <p className="mt-2 text-2xl font-bold text-success-foreground">{formatNumber(maximo)}%</p>
          </div>

          <div className="rounded-lg bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Mínimo</p>
            <p className="mt-2 text-2xl font-bold text-destructive-foreground">{formatNumber(minimo)}%</p>
          </div>

          <div className="rounded-lg bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Críticos</p>
            <p className="mt-2 text-2xl font-bold text-destructive-foreground">{formatNumber(criticos)}x</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-card-foreground">Comportamiento histórico</h2>
          <div className="flex items-center gap-3">
            {cargando && <span className="text-xs text-muted-foreground">Actualizando historial...</span>}
            <div className="flex gap-2" aria-label="Periodo del historial">
              {([15, 30] as const).map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  aria-pressed={dias === opcion}
                  onClick={() => onCambiarDias(opcion)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    dias === opcion
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {formatNumber(opcion)} días
                </button>
              ))}
            </div>
          </div>
        </div>
        {errorHistorial && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {errorHistorial}
          </p>
        )}
          {datos.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...datos].reverse()} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={8}
                    width={48}
                    tickFormatter={formatNumber}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      `${typeof value === "number" ? formatNumber(value) : String(value ?? "")}%`,
                      "Nivel",
                    ]}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <ReferenceLine y={30} stroke="var(--destructive)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="porcentaje" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg bg-background/60 text-muted-foreground">
              <p className="text-sm">
                {cargando ? "Cargando historial..." : "Sin datos históricos disponibles"}
              </p>
            </div>
          )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-card-foreground">Historial detallado</h2>
        <div className="flex flex-col gap-2">
            {datos.length > 0 ? (
              datos.map((dato, index) => {
                const lecturaPrevia = datos[index + 1]
                const variacionGas =
                  lecturaPrevia &&
                  materia.capacidadGas !== null &&
                  materia.capacidadGas > 0 &&
                  materia.unidadCapacidadGas
                    ? Math.round(
                        (materia.capacidadGas * (dato.porcentaje - lecturaPrevia.porcentaje)) / 100,
                      )
                    : null

                return (
                  <div key={dato.id} className="flex items-center justify-between gap-4 rounded-lg bg-background/60 p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground">{dato.fecha}</p>
                      {dato.nota && <p className="text-xs text-muted-foreground">{dato.nota}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-card-foreground">{formatNumber(dato.porcentaje)}%</p>
                      {variacionGas !== null && (
                        <p className="flex items-center justify-end gap-1 text-xs font-semibold text-muted-foreground">
                          {variacionGas !== 0 && (
                            <span
                              aria-label={variacionGas > 0 ? "Aumento" : "Disminución"}
                              className={variacionGas > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                            >
                              {variacionGas > 0 ? "↑" : "↓"}
                            </span>
                          )}
                          {variacionGas > 0 ? "+" : ""}
                          {formatNumber(variacionGas)} {materia.unidadCapacidadGas}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Eliminar registro del ${dato.fecha}`}
                      title="Eliminar registro"
                      disabled={eliminandoId !== null}
                      onClick={() => {
                        if (window.confirm(`¿Deseas eliminar el registro del ${dato.fecha}?`)) {
                          onEliminar(dato.id)
                        }
                      }}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                {cargando ? "Cargando historial..." : "Sin datos históricos disponibles"}
              </p>
            )}
        </div>
        {errorEliminar && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {errorEliminar}
          </p>
        )}
      </section>
    </div>
  )
}
