import { useMemo } from 'react'
import type { GanttPayload, TaskItem } from '../../services/api/modulesApi'

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatShort(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#0f766e'
    case 'in_progress':
      return '#0369a1'
    case 'on_hold':
      return '#b45309'
    case 'cancelled':
      return '#94a3b8'
    default:
      return '#475569'
  }
}

type Props = {
  data?: GanttPayload | null
  loading?: boolean
}

export function GanttChart({ data, loading }: Props) {
  const model = useMemo(() => {
    const tasks = (data?.tasks ?? []).filter(
      (t) => t.planned_start_date && t.planned_end_date,
    ) as TaskItem[]

    if (tasks.length === 0) {
      return null
    }

    const starts = tasks.map((t) => parseDate(t.planned_start_date)!)
    const ends = tasks.map((t) => parseDate(t.planned_end_date)!)
    let min = new Date(Math.min(...starts.map((d) => d.getTime())))
    let max = new Date(Math.max(...ends.map((d) => d.getTime())))

    // Pad a few days for readability
    min = addDays(min, -2)
    max = addDays(max, 2)

    const totalDays = Math.max(daysBetween(min, max), 1)
    const rowHeight = 36
    const labelWidth = 220
    const chartWidth = Math.max(720, totalDays * 18)
    const height = tasks.length * rowHeight + 48

    const ticks: Date[] = []
    for (let i = 0; i <= totalDays; i += Math.max(1, Math.ceil(totalDays / 10))) {
      ticks.push(addDays(min, i))
    }

    return { tasks, min, max, totalDays, rowHeight, labelWidth, chartWidth, height, ticks }
  }, [data])

  if (loading) {
    return <p className="muted">Loading Gantt…</p>
  }

  if (!model) {
    return <p className="muted">Add tasks with planned start/end dates to see the Gantt chart.</p>
  }

  const { tasks, min, totalDays, rowHeight, labelWidth, chartWidth, height, ticks } = model
  const deps = data?.dependencies ?? []

  return (
    <div className="gantt-wrap">
      <div className="gantt-scroll">
        <svg width={labelWidth + chartWidth} height={height} className="gantt-svg">
          {/* header ticks */}
          {ticks.map((tick, i) => {
            const x = labelWidth + (daysBetween(min, tick) / totalDays) * chartWidth
            return (
              <g key={i}>
                <line x1={x} y1={28} x2={x} y2={height} stroke="#e2e8f0" strokeWidth={1} />
                <text x={x + 4} y={18} fill="#64748b" fontSize={11}>
                  {formatShort(tick)}
                </text>
              </g>
            )
          })}

          <line x1={labelWidth} y1={28} x2={labelWidth + chartWidth} y2={28} stroke="#cbd5e1" />

          {tasks.map((task, index) => {
            const start = parseDate(task.planned_start_date)!
            const end = parseDate(task.planned_end_date)!
            const y = 36 + index * rowHeight
            const x = labelWidth + (daysBetween(min, start) / totalDays) * chartWidth
            const w = Math.max(((daysBetween(start, end) + 1) / totalDays) * chartWidth, 8)
            const progress = Math.min(Math.max(Number(task.progress_percent ?? 0), 0), 100)
            const color = statusColor(task.status)

            return (
              <g key={task.id}>
                <text x={8} y={y + 18} fill="#0f172a" fontSize={12}>
                  {(task.task_code ? `${task.task_code} · ` : '') + task.name}
                </text>
                <rect x={x} y={y + 6} width={w} height={20} rx={5} fill={color} opacity={0.2} />
                <rect x={x} y={y + 6} width={(w * progress) / 100} height={20} rx={5} fill={color} />
                <title>
                  {task.name}
                  {'\n'}
                  {task.planned_start_date} → {task.planned_end_date}
                  {'\n'}
                  {progress}% · {task.status}
                </title>
              </g>
            )
          })}

          {/* simple FS dependency markers */}
          {deps.map((dep) => {
            const predIndex = tasks.findIndex((t) => t.id === dep.predecessor_task_id)
            const succIndex = tasks.findIndex((t) => t.id === dep.successor_task_id)
            if (predIndex < 0 || succIndex < 0) return null

            const pred = tasks[predIndex]
            const succ = tasks[succIndex]
            const predEnd = parseDate(pred.planned_end_date)!
            const succStart = parseDate(succ.planned_start_date)!
            const x1 = labelWidth + ((daysBetween(min, predEnd) + 1) / totalDays) * chartWidth
            const y1 = 36 + predIndex * rowHeight + 16
            const x2 = labelWidth + (daysBetween(min, succStart) / totalDays) * chartWidth
            const y2 = 36 + succIndex * rowHeight + 16

            return (
              <g key={dep.id} opacity={0.55}>
                <path
                  d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                  stroke="#64748b"
                  strokeWidth={1.5}
                  fill="none"
                />
                <polygon points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`} fill="#64748b" />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="gantt-legend muted small">
        Bar fill = progress · Links = dependencies · Colors by status
      </div>
    </div>
  )
}
