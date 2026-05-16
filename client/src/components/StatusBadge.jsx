const statusConfig = {
  pending: {
    label: 'Pending',
    bg: 'bg-[var(--color-warning)]',
    text: 'text-[var(--color-warning)]',
  },
  reminder_sent: {
    label: 'Reminder Sent',
    bg: 'bg-[var(--color-info)]',
    text: 'text-[var(--color-info)]',
  },
  overdue: {
    label: 'Overdue',
    bg: 'bg-[var(--color-danger)]',
    text: 'text-[var(--color-danger)]',
  },
  paid: {
    label: 'Paid',
    bg: 'bg-[var(--color-success)]',
    text: 'text-[var(--color-success)]',
  },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-[600] uppercase tracking-[0.04em] bg-opacity-15 ${config.bg} ${config.text}`}
      style={{ backgroundColor: `color-mix(in srgb, var(${config.bg.replace('bg-[var(', '').replace(')]', '')}) 15%, transparent)` }}
    >
      {config.label}
    </span>
  );
}
