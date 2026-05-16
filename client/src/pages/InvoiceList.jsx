import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getInvoices } from '../lib/firestore';
import InvoiceTable from '../components/InvoiceTable';
import { Search, Plus } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'reminder_sent', label: 'Reminder Sent' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
];

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = {};
        if (search) params.search = search;
        if (status !== 'all') params.status = status;
        const data = await getInvoices(params);
        setInvoices(data);
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
  }, [search, status]);

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shrink-0">
        <div className="max-w-[1200px] w-full mx-auto py-[16px] px-[32px] flex items-center justify-between">
          <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)] leading-tight">Invoices</h1>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-[1200px] w-full mx-auto py-[28px] px-[32px] flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 flex-1 w-full max-w-2xl">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[36px] pl-[36px] pr-[12px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[6px] text-[13px] focus:outline-none focus:border-amber-500 transition-colors"
                id="search-invoices"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full md:w-[160px] h-[36px] px-[12px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[6px] text-[13px] focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
              id="filter-status"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => navigate('/invoices/new')} className="btn-primary py-[8px] px-[16px] text-[13px] flex items-center justify-center gap-2 h-[36px] w-full md:w-auto shrink-0">
            <Plus size={16} /> <span>New Invoice</span>
          </button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-[72px] md:h-[60px] rounded-[var(--radius-sm)]"></div>
            ))}
          </div>
        ) : (
          <InvoiceTable invoices={invoices} />
        )}
      </div>
    </div>
  );
}
