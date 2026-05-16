export default function DonutChart({ paid = 0, unpaid = 0 }) {
  const total = paid + unpaid;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        No invoices yet
      </div>
    );
  }

  const paidPct = (paid / total) * 100;
  const unpaidPct = (unpaid / total) * 100;

  // SVG donut chart
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const paidStroke = (paidPct / 100) * circumference;
  const unpaidStroke = (unpaidPct / 100) * circumference;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
          {/* Unpaid arc */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="var(--color-danger)"
            strokeOpacity="0.3"
            strokeWidth="20"
            strokeDasharray={`${unpaidStroke} ${circumference - unpaidStroke}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          {/* Paid arc */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="var(--color-success)"
            strokeWidth="20"
            strokeDasharray={`${paidStroke} ${circumference - paidStroke}`}
            strokeDashoffset={-unpaidStroke}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-[var(--color-text-primary)]">{total}</span>
          <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[var(--color-success)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Paid</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">{paid} <span className="text-xs text-[var(--color-text-muted)] font-normal">({paidPct.toFixed(0)}%)</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[var(--color-danger)] opacity-80" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Unpaid</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">{unpaid} <span className="text-xs text-[var(--color-text-muted)] font-normal">({unpaidPct.toFixed(0)}%)</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
