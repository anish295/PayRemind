import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Building2, Plus, ChevronsLeft, ChevronsRight } from 'lucide-react';

const mainItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/companies', label: 'Companies', icon: Building2 },
];

const LogoBox = () => (
  <div className="flex-shrink-0 flex items-center justify-center w-[32px] h-[32px] bg-amber-500 rounded-[8px] text-[#1a1a1a] text-[13px] font-bold">
    PR
  </div>
);

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem('sidebar_collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Desktop Sidebar (Fixed) */}
      <aside 
        className={`hidden md:flex fixed top-0 bottom-0 left-0 flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] z-20 overflow-hidden transition-[width] duration-200 ease-in-out ${sidebarCollapsed ? 'w-[56px]' : 'w-[220px]'}`}
      >
        {sidebarCollapsed ? (
            <div className="flex flex-col items-center w-full h-full">
            <div className="mt-[14px] mb-[10px]">
              <LogoBox />
            </div>
            <button 
              onClick={() => setSidebarCollapsed(false)} 
              className="flex items-center justify-center w-[40px] h-[36px] rounded-[8px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors duration-150 mb-4" 
              title="Expand"
            >
              <ChevronsRight size={16} />
            </button>
            <div className="w-[32px] h-[1px] bg-amber-500/20 mb-2" />
            
            <nav className="flex flex-col items-center w-full py-[10px] gap-6">
              {mainItems.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/' || path === '/invoices'}
                  title={label}
                  className={({ isActive }) => `flex items-center justify-center w-[44px] h-[44px] rounded-[8px] transition-colors duration-150 mb-2 ${
                    isActive ? 'bg-amber-500/10 text-amber-500' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  <Icon size={18} className="transition-colors duration-150" />
                </NavLink>
              ))}
              
              <div className="my-[8px]" /> {/* Gap */}
              
              <NavLink
                to="/invoices/new"
                title="New Invoice"
                className={({ isActive }) => `flex items-center justify-center w-[44px] h-[44px] rounded-[8px] transition-colors duration-150 mt-2 ${
                  isActive ? 'bg-amber-500/10 text-amber-500' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                <Plus size={18} className="transition-colors duration-150" />
              </NavLink>
            </nav>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            <div className="flex flex-col p-[16px] border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-[16px]">
                <div className="flex items-center gap-[10px]">
                  <LogoBox />
                  <div className="flex flex-col justify-center">
                    <span className="text-[15px] font-[600] text-[var(--color-text-primary)] leading-tight">PayRemind</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] leading-tight mt-0.5">Payment System</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSidebarCollapsed(true)} 
                  className="flex items-center justify-center w-[32px] h-[32px] rounded-[8px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors duration-150" 
                  title="Collapse"
                >
                  <ChevronsLeft size={16} />
                </button>
              </div>
            </div>
            
            <nav className="flex flex-col flex-1 gap-[12px] p-[20px_16px] overflow-y-auto">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] p-[8px_8px_4px]">MAIN</div>
              {mainItems.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/' || path === '/invoices'}
                  className={({ isActive }) => `flex items-center gap-[10px] rounded-[6px] text-[14px] transition-colors duration-150 ${
                    isActive 
                      ? 'border-l-[3px] border-amber-500 bg-amber-500/10 text-amber-500 py-[14px] pr-[10px] pl-[7px]' 
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] py-[14px] px-[10px]'
                  }`}
                >
                  <div className="w-[18px] flex justify-center"><Icon size={16} className="transition-colors duration-150" /></div>
                  <span>{label}</span>
                </NavLink>
              ))}
              
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] p-[8px_8px_4px] mt-6">ACTIONS</div>
              <NavLink
                to="/invoices/new"
                className={({ isActive }) => `flex items-center gap-[10px] rounded-[6px] text-[14px] transition-colors duration-150 ${
                  isActive 
                    ? 'border-l-[3px] border-amber-500 bg-amber-500/10 text-amber-500 py-[14px] pr-[10px] pl-[7px]' 
                    : 'text-[var(--color-text-secondary)] bg-amber-500/5 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] py-[14px] px-[10px]'
                }`}
              >
                <div className="w-[18px] flex justify-center"><Plus size={16} className="transition-colors duration-150" /></div>
                <span>New Invoice</span>
              </NavLink>
              
              <div className="mt-auto" />
            </nav>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main 
        className="min-h-screen pb-[72px] md:pb-0 overflow-y-auto"
        style={{
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? '56px' : '220px'),
          transition: 'margin-left 0.2s ease'
        }}
      >
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] z-50 flex justify-between items-center px-6 h-[56px] pb-safe">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `flex flex-col items-center p-2 transition-colors duration-150 ${isActive ? 'text-amber-500' : 'text-[var(--color-text-muted)]'}`}
        >
          <LayoutDashboard size={24} />
        </NavLink>
        
        <NavLink
          to="/invoices"
          end
          className={({ isActive }) => `flex flex-col items-center p-2 transition-colors duration-150 ${isActive ? 'text-amber-500' : 'text-[var(--color-text-muted)]'}`}
        >
          <FileText size={24} />
        </NavLink>

        {/* Center Raised Button */}
        <button
          onClick={() => navigate('/invoices/new')}
          className="bg-amber-500 text-white rounded-full w-[44px] h-[44px] flex items-center justify-center mt-[-8px] shadow-[var(--shadow-elevated)] hover:bg-amber-400 transition-colors duration-150"
          aria-label="New Invoice"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>

        <NavLink
          to="/companies"
          className={({ isActive }) => `flex flex-col items-center p-2 transition-colors duration-150 ${isActive ? 'text-amber-500' : 'text-[var(--color-text-muted)]'}`}
        >
          <Building2 size={24} />
        </NavLink>
        
        {/* Placeholder for visual balance since we have 4 items conceptually but one is centered */}
        <div className="w-10"></div>
      </nav>
    </div>
  );
}
