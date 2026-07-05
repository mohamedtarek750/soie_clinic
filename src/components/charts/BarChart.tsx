/** Dependency-free server-rendered bar chart in the Soie palette. */
export function BarChart({
  data,
  height = 160,
  formatValue = (v: number) => String(v),
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const width = 640;
  const pad = { top: 14, right: 8, bottom: 24, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = innerW / Math.max(1, data.length);

  return (
    <div className="chart-frame">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bar chart">
        <defs>
          <linearGradient id="soieGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E4D3AE" />
            <stop offset="1" stopColor="#A9884E" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const h = Math.round((d.value / max) * innerH);
          const x = pad.left + i * bw + bw * 0.18;
          const y = pad.top + innerH - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw * 0.64} height={Math.max(h, 2)} rx={4} fill="url(#soieGold)">
                <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              </rect>
              <text
                x={pad.left + i * bw + bw / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#6A635A"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
