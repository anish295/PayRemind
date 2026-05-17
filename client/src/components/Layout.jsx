import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Building2,
  Plus,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 76;

const mainItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/companies', label: 'Companies', icon: Building2 },
];

function NavItem({ to, end, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'sidebar-link',
          collapsed ? 'sidebar-link--collapsed' : '',
          isActive ? 'sidebar-link--active' : '',
        ]
          .filter(Boolean)
          .join(' ')
      }
    >
      <Icon size={18} className="sidebar-link-icon" strokeWidth={2} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

function LogoMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.6)', padding: '8px 16px', borderRadius: '12px', width: 'fit-content', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', color: '#0f172a' }}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        <path d="m9 10 2 2 4-4" stroke="#10b981" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem('sidebar_collapsed');
    if (saved !== null) setSidebarCollapsed(saved === 'true');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const sidebarWidth = isMobile
    ? 0
    : sidebarCollapsed
      ? SIDEBAR_WIDTH_COLLAPSED
      : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div
      className="min-h-screen bg-[#f8fafc]"
      style={{ '--sidebar-width': `${sidebarWidth}px` }}
    >
      <aside
        className={`sidebar hidden md:flex fixed top-0 bottom-0 left-0 flex-col z-20 overflow-hidden transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? 'sidebar--collapsed' : 'sidebar--expanded'
        }`}
      >
        {sidebarCollapsed ? (
          <div className="sidebar-inner sidebar-inner--collapsed">
            <div className="sidebar-brand sidebar-brand--collapsed">
              <LogoMark />
            </div>

            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="sidebar-toggle mb-2"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronsRight size={18} />
            </button>

            <div className="sidebar-divider" />

            <nav className="sidebar-nav sidebar-nav--collapsed flex-1">
              {mainItems.map((item) => (
                <NavItem
                  key={item.path}
                  to={item.path}
                  icon={item.icon}
                  label={item.label}
                  collapsed
                  end={item.path === '/' || item.path === '/invoices'}
                />
              ))}
              <div className="sidebar-divider my-2" />
              <NavItem to="/invoices/new" icon={Plus} label="New Invoice" collapsed />
            </nav>
          </div>
        ) : (
          <div className="sidebar-inner">
            <div className="sidebar-brand">
              <div className="sidebar-brand-mark">
                <LogoMark />
                <div className="sidebar-brand-text">
                  <span className="sidebar-brand-name">PayRemind</span>
                  <span className="sidebar-brand-tagline">Smart Payment</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="sidebar-toggle"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft size={18} />
              </button>
            </div>

            <nav className="sidebar-nav">
              <p className="sidebar-section-label">Main</p>
              <div className="sidebar-nav-group">
                {mainItems.map((item) => (
                  <NavItem
                    key={item.path}
                    to={item.path}
                    icon={item.icon}
                    label={item.label}
                    collapsed={false}
                    end={item.path === '/' || item.path === '/invoices'}
                  />
                ))}
              </div>

              <p className="sidebar-section-label sidebar-section-label--spaced">Actions</p>
              <div className="sidebar-nav-group">
                <NavItem to="/invoices/new" icon={Plus} label="New Invoice" collapsed={false} />
              </div>
            </nav>

            <div className="mt-auto p-6 text-xs text-[var(--color-text-muted)] font-medium">
              &copy; {new Date().getFullYear()} PayRemind
            </div>
          </div>
        )}
      </aside>

      <main className="layout-main">
        <Outlet />
      </main>

      {isMobile && (
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `mobile-bottom-nav-item ${isActive ? 'mobile-bottom-nav-item--active' : ''}`
            }
            aria-label="Dashboard"
          >
            <LayoutDashboard size={22} />
          </NavLink>
          <NavLink
            to="/invoices"
            end
            className={({ isActive }) =>
              `mobile-bottom-nav-item ${isActive ? 'mobile-bottom-nav-item--active' : ''}`
            }
            aria-label="Invoices"
          >
            <FileText size={22} />
          </NavLink>
          <div className="mobile-bottom-nav-fab">
            <button
              type="button"
              onClick={() => navigate('/invoices/new')}
              className="mobile-bottom-nav-fab-btn"
              aria-label="New Invoice"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </div>
          <NavLink
            to="/companies"
            className={({ isActive }) =>
              `mobile-bottom-nav-item ${isActive ? 'mobile-bottom-nav-item--active' : ''}`
            }
            aria-label="Companies"
          >
            <Building2 size={22} />
          </NavLink>
        </nav>
      )}
    </div>
  );
}
