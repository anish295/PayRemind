export default function StatCard({ label, value, icon, variant = 'default', prefix = '' }) {
  // Determine border and colors based on variant
  let borderClass = 'border-[var(--color-border)]';
  let iconColor = 'text-[var(--color-text-secondary)]';

  if (variant === 'accent') {
    borderClass = 'border-[var(--color-border)] border-l-[3px] border-l-amber-500';
    iconColor = 'text-amber-500';
  } else if (variant === 'danger') {
    borderClass = 'border-[var(--color-border)] border-l-[3px] border-l-red-500';
    iconColor = 'text-red-500';
  } else if (variant === 'success') {
    borderClass = 'border-[var(--color-border)] border-l-[3px] border-l-green-500';
    iconColor = 'text-green-500';
  }

  return (
    <div className={`p-[20px_22px] rounded-[12px] border bg-[var(--color-bg-secondary)] flex flex-col justify-between relative overflow-hidden min-h-[100px] ${borderClass}`}>
      <div className="flex flex-col relative z-10">
        <span className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.07em] pr-2">
          {label}
        </span>
        <p className="text-[32px] font-[700] text-[var(--color-text-primary)] pr-2 mt-[12px]">
          {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        </p>
      </div>
      {icon && (
        <span className={`absolute right-[22px] top-[20px] ${iconColor}`} aria-hidden="true">
          {icon}
        </span>
      )}
    </div>
  );
}
