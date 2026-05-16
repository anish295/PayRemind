const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'bg-orange-50 text-orange-700 ring-orange-200/60',
  },
  reminder_sent: {
    label: 'Reminder Sent',
    className: 'bg-blue-50 text-blue-700 ring-blue-200/60',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-50 text-red-700 ring-red-200/60',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-50 text-green-700 ring-green-200/60',
  },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
