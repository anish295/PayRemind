export default function PageHeader({ title, subtitle, children, className = '' }) {
  return (
    <header className={`page-header ${className}`}>
      <div className="page-header-inner">
        <div className="page-header-text">
          {title && <h1 className="page-title">{title}</h1>}
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {children && <div className="page-header-actions">{children}</div>}
      </div>
    </header>
  );
}
