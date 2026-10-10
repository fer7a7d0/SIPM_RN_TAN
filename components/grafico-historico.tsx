"use client"

import { Materia } from "@/components/tarjeta-materia"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

type DatoHistorico = {
  fecha: string
  porcentaje: number
  nota?: string
}

type GraficoHistoricoProps = {
  materia: Materia
  datos: DatoHistorico[]
}

export function GraficoHistorico({ materia, datos }: GraficoHistoricoProps) {
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
          {nombreTanque} - Últimos 14 días
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
            <p className="mt-2 text-2xl font-bold text-card-foreground">{promedio}%</p>
          </div>

          <div className="rounded-lg bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Máximo</p>
            <p className="mt-2 text-2xl font-bold text-success-foreground">{maximo}%</p>
          </div>

          <div className="rounded-lg bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Mínimo</p>
            <p className="mt-2 text-2xl font-bold text-destructive-foreground">{minimo}%</p>
          </div>

          <div className="rounded-lg bg-background/60 p-4">
            <p className="text-sm font-medium text-muted-foreground">Críticos</p>
            <p className="mt-2 text-2xl font-bold text-destructive-foreground">{criticos}x</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold tracking-tight text-card-foreground">Comportamiento histórico</h2>
          {datos.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...datos].reverse()} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Nivel"]}
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
              <p className="text-sm">Sin datos históricos disponibles</p>
            </div>
          )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-card-foreground">Historial detallado</h2>
        <div className="flex flex-col gap-2">
            {datos.length > 0 ? (
              datos.map((dato, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 rounded-lg bg-background/60 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">{dato.fecha}</p>
                    {dato.nota && <p className="text-xs text-muted-foreground">{dato.nota}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-card-foreground">{dato.porcentaje}%</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos históricos disponibles</p>
            )}
        </div>
      </section>
    </div>
  )
}
