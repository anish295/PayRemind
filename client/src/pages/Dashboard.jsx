import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getInvoiceStats, getInvoices } from '../lib/firestore';
import StatCard from '../components/StatCard';
import InvoiceTable from '../components/InvoiceTable';
import PageHeader from '../components/PageHeader';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  Plus,
  List,
  Building2,
  ChevronRight,
  Info,
} from 'lucide-react';

import { fmtMoney, CURRENCY_SYMBOLS } from '../lib/currency';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning, Anish';
  if (hour < 18) return 'Good Afternoon, Anish';
  return 'Good Evening, Anish';
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const greeting = getGreeting();

  useEffect(() => {
    async function load() {
      try {
        const [statsData, invoices] = await Promise.all([getInvoiceStats(), getInvoices()]);
        setStats(statsData);
        setRecentInvoices(invoices.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <div className="page-header-inner">
            <div className="skeleton h-8 w-56 mb-2" />
            <div className="skeleton h-4 w-72" />
          </div>
        </header>
        <div className="page-content page-content--dashboard">
          <div className="dashboard-stats">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-[118px] rounded-2xl" />
            ))}
          </div>
          <div className="dashboard-main-grid">
            <div className="skeleton h-[360px] rounded-2xl" />
            <div className="skeleton h-[360px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const unpaidDisplay =
    stats?.unpaidCurrencies?.length > 0
      ? stats.unpaidCurrencies
          .map((c) => fmtMoney(c.total, c.currency))
          .join(' / ')
      : '0';

  const pendingCount = (stats?.pendingCount || 0) + (stats?.reminderSentCount || 0);
  const paidCount = stats?.paidCount || 0;
  const overdueCount = stats?.overdueCount || 0;
  const totalCount = stats?.total || 0;

  const chartData = [
    { name: 'Paid', value: paidCount, color: '#22c55e' },
    { name: 'Pending', value: pendingCount, color: '#f97316' },
    { name: 'Overdue', value: overdueCount, color: '#ef4444' },
  ];

  const pendingTotal =
    stats?.unpaidCurrencies?.length === 1
      ? fmtMoney(stats.unpaidCurrencies[0].total, stats.unpaidCurrencies[0].currency)
      : unpaidDisplay;

  return (
    <div className="page-shell page-shell--dashboard">
      <PageHeader
        className="page-header--dashboard"
        title={`${greeting} 👋`}
        subtitle="Here's your payment overview for today"
      />

      <div className="page-content page-content--dashboard">
        <div className="dashboard-stats">
          <StatCard label="Total Invoices" value={totalCount} meta="All time" icon={<FileText size={20} />} variant="default" />
          <StatCard label="Unpaid Amount" value={unpaidDisplay} meta="Total outstanding" icon={<IndianRupee size={20} />} variant="accent" />
          <StatCard label="Overdue" value={overdueCount} meta="Requires attention" icon={<AlertCircle size={20} />} variant="danger" />
          <StatCard label="Paid This Month" value={paidCount} meta="Payments received" icon={<CheckCircle2 size={20} />} variant="success" />
        </div>

        <div className="dashboard-main-grid">
          <div className="card card-hover dashboard-overview-card">
            <h2 className="dashboard-card-title dashboard-overview-title">Payment Overview</h2>

            <div className="dashboard-chart-row">
              {totalCount === 0 ? (
                <>
                  <div className="relative w-[220px] h-[220px] flex items-center justify-center shrink-0">
                    <div className="w-[180px] h-[180px] rounded-full border-[18px] border-[var(--color-bg-tertiary)] flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-[var(--color-text-primary)]">0</span>
                        <span className="text-xs text-[var(--color-text-muted)]">Total</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 flex-1 w-full">
                    {chartData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                          <span className="text-sm text-[var(--color-text-muted)]">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--color-text-muted)]">0%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative w-[220px] h-[220px] shrink-0">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={chartData.filter(item => item.value > 0)} dataKey="value" innerRadius={62} outerRadius={98} stroke="none" paddingAngle={2}>
                          {chartData.filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-[var(--color-text-primary)]">{totalCount}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">Total</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 flex-1 w-full">
                    {chartData.map((item) => {
                      const pct = totalCount ? Math.round((item.value / totalCount) * 100) : 0;
                      return (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-[var(--color-text-primary)]">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {pendingCount > 0 && (
              <div className="alert-banner">
                <Info size={18} className="shrink-0" />
                <span>
                  You have {pendingCount} pending invoice{pendingCount !== 1 ? 's' : ''} totalling {pendingTotal}
                </span>
              </div>
            )}
          </div>

          <div className="card card-flush card-hover flex flex-col dashboard-quick-actions">
            <div className="dashboard-quick-actions-head">
              <h2 className="dashboard-card-title">Quick Actions</h2>
            </div>
            <div className="flex flex-col flex-1">
              <button type="button" onClick={() => navigate('/invoices/new')} className="quick-action-row group">
                <div className="quick-action-icon">
                  <Plus size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">New Invoice</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Create and send a new invoice</p>
                </div>
                <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors shrink-0" />
              </button>
              <button type="button" onClick={() => navigate('/invoices')} className="quick-action-row group">
                <div className="quick-action-icon">
                  <List size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">View All Invoices</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Manage your existing invoices</p>
                </div>
                <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors shrink-0" />
              </button>
              <button type="button" onClick={() => navigate('/companies')} className="quick-action-row group">
                <div className="quick-action-icon">
                  <Building2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Manage Companies</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Add or edit saved clients</p>
                </div>
                <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors shrink-0" />
              </button>
            </div>
          </div>
        </div>

        <section className="dashboard-recent-section">
          <div className="dashboard-section-head">
            <h2 className="dashboard-section-title">Recent Invoices</h2>
            <Link to="/invoices" className="btn-outline-accent">
              View All Invoices
            </Link>
          </div>
          <div className="card card-flush">
            <InvoiceTable invoices={recentInvoices} />
          </div>
        </section>
      </div>
    </div>
  );
}
