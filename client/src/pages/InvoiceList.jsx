import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices } from '../lib/firestore';
import InvoiceTable from '../components/InvoiceTable';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { Search, Plus } from 'lucide-react';

const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);
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
        setPage(1);
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
  }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return invoices.slice(start, start + PAGE_SIZE);
  }, [invoices, page]);

  return (
    <div className="page-shell">
      <PageHeader title="Invoices" subtitle="Manage and track all your invoices">
        <button type="button" onClick={() => navigate('/invoices/new')} className="btn-primary h-10 px-5 text-sm shrink-0">
          <Plus size={16} /> New Invoice
        </button>
      </PageHeader>

      <div className="page-content">
        <div className="toolbar-card">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="search-input-wrap flex-1">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
                id="search-invoices"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 px-4 min-w-[160px] shrink-0 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/10 cursor-pointer"
              id="filter-status"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="card card-flush">
            <InvoiceTable invoices={paginatedInvoices} />
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={invoices.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              itemLabel="invoices"
            />
          </div>
        )}
      </div>
    </div>
  );
}
