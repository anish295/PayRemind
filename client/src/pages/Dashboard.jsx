import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getInvoiceStats } from '../lib/firestore';
import StatCard from '../components/StatCard';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Plus, 
  List, 
  Building2
} from 'lucide-react';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Admin';
  if (hour < 18) return 'Good afternoon, Admin';
  return 'Good evening, Admin';
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const greeting = getGreeting();

  useEffect(() => {
    async function load() {
      try {
        const statsData = await getInvoiceStats();
        setStats(statsData);
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
      <div className="flex flex-col min-h-full">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shrink-0">
          <div className="max-w-[1200px] w-full mx-auto py-[16px] px-[32px] flex flex-col">
            <div className="skeleton h-8 w-48 mb-2"></div>
            <div className="skeleton h-4 w-64"></div>
          </div>
        </div>
        <div className="max-w-[1200px] w-full mx-auto py-[28px] px-[32px] flex-1">
          <div className="space-y-10 animate-pulse">
            <div className="grid grid-cols-2 min-[900px]:grid-cols-4 gap-[16px] mb-[20px]">
              <div className="skeleton h-[120px] rounded-[var(--radius-md)]"></div>
              <div className="skeleton h-[120px] rounded-[var(--radius-md)]"></div>
              <div className="skeleton h-[120px] rounded-[var(--radius-md)]"></div>
              <div className="skeleton h-[120px] rounded-[var(--radius-md)]"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[20px]">
              <div className="skeleton h-[300px] rounded-[var(--radius-md)]"></div>
              <div className="skeleton h-[300px] rounded-[var(--radius-md)]"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const unpaidDisplay = stats?.unpaidCurrencies?.length > 0 
    ? stats.unpaidCurrencies.map(c => `${CURRENCY_SYMBOLS[c.currency] || c.currency}${c.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' / ')
    : '0';

  const pendingCount = (stats?.pendingCount || 0) + (stats?.reminderSentCount || 0);
  const paidCount = stats?.paidCount || 0;
  const overdueCount = stats?.overdueCount || 0;
  const totalCount = stats?.total || 0;

  const chartData = [
    { name: 'Paid', value: paidCount, color: '#22c55e' },
    { name: 'Pending', value: pendingCount, color: '#f59e0b' },
    { name: 'Overdue', value: overdueCount, color: '#ef4444' }
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* TOPBAR */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shrink-0">
        <div className="max-w-[1200px] w-full mx-auto py-[16px] px-[32px] flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)] leading-tight">{greeting}</h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">Here's your payment overview for today</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-[1200px] w-full mx-auto py-[28px] px-[32px] flex-1">
        
        {/* Stat Cards */}
        <div className="grid grid-cols-2 min-[900px]:grid-cols-4 gap-[16px] mb-[20px]">
          <StatCard
            label="Total Invoices"
            value={totalCount}
            icon={<FileText size={20} />}
            variant="default"
          />
          <StatCard
            label="Unpaid Amount"
            value={unpaidDisplay}
            icon={<DollarSign size={20} />}
            variant="accent"
          />
          <StatCard
            label="Overdue"
            value={overdueCount}
            icon={<AlertCircle size={20} />}
            variant="danger"
          />
          <StatCard
            label="Paid This Month"
            value={paidCount}
            icon={<CheckCircle2 size={20} />}
            variant="success"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 min-[900px]:grid-cols-[1fr_340px] gap-[20px]">
          
          {/* Chart Panel */}
          <div className="card flex flex-col p-[24px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.1em]">Payment Overview</h2>
            </div>
            
            <div className="flex flex-1 items-center gap-[24px]">
              {totalCount === 0 ? (
                <>
                  <div className="relative w-[240px] h-[220px] flex items-center justify-center">
                    <div className="w-[200px] h-[200px] rounded-full border-[20px] border-[var(--color-bg-tertiary)] flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[24px] font-[700] text-[var(--color-text-primary)] leading-tight">0</span>
                        <span className="text-[12px] text-[var(--color-text-muted)]">Total</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 flex-1 justify-center">
                    {chartData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
                          <span className="text-[14px] text-[var(--color-text-muted)]">{item.name}</span>
                        </div>
                        <span className="text-[14px] font-[600] text-[var(--color-text-muted)] text-right">0</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Chart */}
                  <div className="relative w-[240px] h-[220px]">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          innerRadius={60}
                          outerRadius={100}
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Custom Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[24px] font-[700] text-[var(--color-text-primary)] leading-tight">{totalCount}</span>
                      <span className="text-[12px] text-[var(--color-text-muted)]">Total</span>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-col gap-4 flex-1 justify-center">
                    {chartData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[14px] text-[var(--color-text-primary)]">{item.name}</span>
                        </div>
                        <span className="text-[14px] font-[600] text-[var(--color-text-primary)] text-right">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="card flex flex-col overflow-hidden p-0">
            <div className="p-[20px] pb-[16px] border-b border-[var(--color-border)]">
              <h2 className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.1em]">Quick Actions</h2>
            </div>
            
            <div className="flex flex-col">
              <button 
                onClick={() => navigate('/invoices/new')}
                className="w-full flex items-center gap-[14px] p-[14px_18px] min-h-[60px] border-b border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors group text-left"
              >
                <div className="w-[36px] h-[36px] rounded-[8px] bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                  <Plus size={20} />
                </div>
                <div>
                  <p className="text-[14px] font-[600] text-[var(--color-text-primary)] leading-tight">New Invoice</p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Create and send a new invoice</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/invoices')}
                className="w-full flex items-center gap-[14px] p-[14px_18px] min-h-[60px] border-b border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors group text-left"
              >
                <div className="w-[36px] h-[36px] rounded-[8px] bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                  <List size={20} />
                </div>
                <div>
                  <p className="text-[14px] font-[600] text-[var(--color-text-primary)] leading-tight">View All Invoices</p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Manage your existing invoices</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/companies')}
                className="w-full flex items-center gap-[14px] p-[14px_18px] min-h-[60px] hover:bg-[var(--color-bg-tertiary)] transition-colors group text-left"
              >
                <div className="w-[36px] h-[36px] rounded-[8px] bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="text-[14px] font-[600] text-[var(--color-text-primary)] leading-tight">Manage Companies</p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">Add or edit saved clients</p>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
