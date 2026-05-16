export default function StatCard({ label, value, icon, variant = 'default', meta }) {
  const variantClass = {
    default: 'stat-card-default',
    accent: 'stat-card-accent',
    danger: 'stat-card-danger',
    success: 'stat-card-success',
  }[variant] || 'stat-card-default';

  return (
    <div className={`stat-card ${variantClass} card-hover`}>
      <div className="stat-card-content">
        <span className="stat-card-label">{label}</span>
        <p className="stat-card-value">
          {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        </p>
        {meta && <p className="stat-card-meta">{meta}</p>}
      </div>
      {icon && (
        <div className="stat-icon-wrap" aria-hidden="true">
          {icon}
        </div>
      )}
    </div>
  );
}
