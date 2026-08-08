'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

/* Série mensal genérica: { month, value } */
type MonthPoint = { month: string; value: number }

export function RevenueAreaChart({
  data,
  currency = false,
}: {
  data: MonthPoint[]
  currency?: boolean
}) {
  const config = {
    value: { label: currency ? 'Receita' : 'Total', color: 'var(--artist-primary)' },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-[220px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-[10px] font-bold uppercase"
        />
        <YAxis
          width={44}
          tickLine={false}
          axisLine={false}
          className="text-[10px] font-bold"
          tickFormatter={(v: number) =>
            currency ? `R$${Math.round(v / 100)}` : v.toLocaleString('pt-BR')
          }
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-numeric font-bold">
                  {currency
                    ? `R$ ${(Number(value) / 100).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}`
                    : Number(value).toLocaleString('pt-BR')}
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="value"
          type="monotone"
          fill="url(#fillRevenue)"
          stroke="var(--color-value)"
          strokeWidth={2.5}
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function SubscribersBarChart({ data }: { data: MonthPoint[] }) {
  const config = {
    value: { label: 'Novos assinantes', color: 'var(--artist-primary)' },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-[220px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-[10px] font-bold uppercase"
        />
        <YAxis width={32} tickLine={false} axisLine={false} className="text-[10px] font-bold" allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ChartContainer>
  )
}

/* Barras horizontais: conteúdo em destaque (ex.: posts por curtidas). */
export function TopContentBarChart({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  const config = {
    value: { label: 'Total', color: 'var(--artist-primary)' },
  } satisfies ChartConfig

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-[10px] font-bold text-[var(--artist-muted)]">
        Sem dados suficientes ainda.
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis type="number" tickLine={false} axisLine={false} className="text-[10px] font-bold" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tickLine={false}
          axisLine={false}
          className="text-[10px] font-bold"
          tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 6, 6, 0]} maxBarSize={26} />
      </BarChart>
    </ChartContainer>
  )
}

type TierSlice = { tier: string; label: string; value: number; color: string }

export function TierDonutChart({ data }: { data: TierSlice[] }) {
  const config = data.reduce((acc, d) => {
    acc[d.tier] = { label: d.label, color: d.color }
    return acc
  }, {} as ChartConfig)

  const total = data.reduce((acc, d) => acc + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-[10px] font-bold text-[var(--artist-muted)]">
        Sem assinantes ainda.
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-[220px]">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="label" hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={58} outerRadius={92} strokeWidth={3} paddingAngle={3}>
          {data.map((d) => (
            <Cell key={d.tier} fill={d.color} stroke="var(--artist-surface)" />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
