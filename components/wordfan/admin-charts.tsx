'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

type MonthPoint = { month: string; value: number }

export function AdminRevenueChart({ data }: { data: MonthPoint[] }) {
  const config = {
    value: { label: 'Volume transacionado', color: '#ff8a00' },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-[310px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.34} />
            <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.015} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,.08)" opacity={0.65} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          className="text-[10px] font-bold uppercase"
        />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          className="text-[10px] font-bold"
          tickFormatter={(value: number) =>
            value >= 100000
              ? `R$${(value / 100000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
              : `R$${Math.round(value / 100)}`
          }
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-numeric font-bold">
                  {(Number(value) / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="value"
          type="monotone"
          fill="url(#adminRevenueFill)"
          stroke="var(--color-value)"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: 'var(--color-value)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#ffc857', stroke: '#050505', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
