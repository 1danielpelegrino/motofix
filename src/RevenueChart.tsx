import { useId, useState } from "react"

const money = (value: number) => `₱${value.toLocaleString()}`
const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })

export default function RevenueChart({ rows }: { rows: [string, number][] }) {
  const gradientId = useId()
  const [selected, setSelected] = useState<string | null>(null)
  if (!rows.length) {
    return <div className="revenue-chart-empty">No completed revenue for this period.<span>Complete a booking to start tracking revenue trends.</span></div>
  }
  const totals = new Map(rows)
  const points: [string, number][] = []
  const cursor = new Date(`${rows[0][0]}-01T12:00:00`)
  const end = new Date(`${rows[rows.length - 1][0]}-01T12:00:00`)
  while (cursor <= end) {
    const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    points.push([month, totals.get(month) ?? 0])
    cursor.setMonth(cursor.getMonth() + 1)
  }
  const current = points.find(([month]) => month === selected) ?? points[points.length - 1]
  const max = Math.max(1, ...points.map(([, value]) => value))
  const ceiling = Math.ceil(max / 4) * 4
  const width = Math.max(520, points.length * 90 + 100)
  const left = 82
  const top = 24
  const bottom = 224
  const plotWidth = width - left - 24
  const slot = plotWidth / points.length
  const total = points.reduce((sum, [, value]) => sum + value, 0)
  return <div className="revenue-chart">
    <div className="revenue-chart-summary">
      <div><span>Period revenue</span><strong>{money(total)}</strong></div>
      <div className="revenue-chart-selection" aria-live="polite"><span>{monthLabel(current[0])}</span><strong>{money(current[1])}</strong></div>
    </div>
    <div className="revenue-chart-scroll" role="region" aria-label="Monthly revenue chart, scroll horizontally to view all months" tabIndex={0}>
      <svg width={width} height="276" viewBox={`0 0 ${width} 276`} role="img" aria-label="Estimated monthly completed revenue in Philippine pesos">
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffad76" /><stop offset="100%" stopColor="#ed762e" stopOpacity=".55" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = ceiling * tick / 4
          const y = bottom - tick * (bottom - top) / 4
          return <g key={tick}><line x1={left} x2={width - 24} y1={y} y2={y} stroke="#31597c" strokeDasharray={tick ? "4 6" : undefined} /><text x={left - 12} y={y + 4} textAnchor="end" fill="#9fbcd3" fontSize="11">{money(value)}</text></g>
        })}
        {points.map(([month, value], index) => {
          const x = left + slot * (index + .5)
          const height = value / ceiling * (bottom - top)
          const barWidth = Math.min(42, slot * .48)
          return <g key={month} tabIndex={0} role="button" aria-label={`${monthLabel(month)}: ${money(value)}`} onFocus={() => setSelected(month)} onMouseEnter={() => setSelected(month)} onClick={() => setSelected(month)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(month) } }} className="revenue-chart-month">
            <title>{monthLabel(month)}: {money(value)}</title>
            <rect x={x - slot / 2 + 4} y={top} width={slot - 8} height={bottom - top} rx="8" fill={current[0] === month ? "#ffad760c" : "transparent"} />
            <rect x={x - barWidth / 2} y={bottom - Math.max(height, 2)} width={barWidth} height={Math.max(height, 2)} rx="5" fill={`url(#${gradientId})`} opacity={current[0] === month ? 1 : .72} />
            <text x={x} y={bottom + 24} textAnchor="middle" fill={current[0] === month ? "#ffd0ae" : "#9fbcd3"} fontSize="11">{monthLabel(month)}</text>
          </g>
        })}
      </svg>
    </div>
    <div className="revenue-chart-legend"><span />Estimated revenue · PHP</div>
    <p className="so-muted">Select or hover over a month to view its total. Months without completed revenue show ₱0.</p>
  </div>
}
