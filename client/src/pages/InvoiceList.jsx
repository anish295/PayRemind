import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices } from '../lib/firestore';
import InvoiceTable from '../components/InvoiceTable';
import Pagination from '../components/Pagination';
import { Search, Plus } from 'lucide-react';

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'reminder_sent', label: 'Reminder Sent' },
];

const SORT_OPTIONS = [
  { value: 'due_asc', label: 'Due Date — Earliest First' },
  { value: 'due_desc', label: 'Due Date — Latest First' },
  { value: 'amount_desc', label: 'Amount — Highest First' },
  { value: 'amount_asc', label: 'Amount — Lowest First' },
  { value: 'client_asc', label: 'Client Name — A to Z' },
  { value: 'status', label: 'Status' },
];

const STATUS_SORT_ORDER = {
  overdue: 0,
  pending: 1,
  reminder_sent: 2,
  paid: 3,
};

function getDisplayStatus(invoice) {
  return invoice._displayStatus || invoice.status;
}

function matchesSearch(invoice, query) {
  const s = query.toLowerCase();
  return (
    (invoice.client_name || '').toLowerCase().includes(s) ||
    (invoice.client_email || '').toLowerCase().includes(s) ||
    (invoice.invoice_number || '').toLowerCase().includes(s) ||
    (invoice.id || '').toLowerCase().includes(s)
  );
}

function sortInvoices(list, sortBy) {
  const sorted = [...list];
  switch (sortBy) {
    case 'due_asc':
      return sorted.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    case 'due_desc':
      return sorted.sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
    case 'amount_desc':
      return sorted.sort((a, b) => (b.grand_total || 0) - (a.grand_total || 0));
    case 'amount_asc':
      return sorted.sort((a, b) => (a.grand_total || 0) - (b.grand_total || 0));
    case 'client_asc':
      return sorted.sort((a, b) =>
        (a.client_name || '').localeCompare(b.client_name || '', undefined, { sensitivity: 'base' })
      );
    case 'status':
      return sorted.sort((a, b) => {
        const orderA = STATUS_SORT_ORDER[getDisplayStatus(a)] ?? 99;
        const orderB = STATUS_SORT_ORDER[getDisplayStatus(b)] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.client_name || '').localeCompare(b.client_name || '', undefined, { sensitivity: 'base' });
      });
    default:
      return sorted;
  }
}

export default function InvoiceList() {
  const [allInvoices, setAllInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('due_asc');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getInvoices();
        setAllInvoices(data);
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statusCounts = useMemo(() => {
    const counts = {
      all: allInvoices.length,
      pending: 0,
      overdue: 0,
      paid: 0,
      reminder_sent: 0,
    };
    allInvoices.forEach((inv) => {
      const displayStatus = getDisplayStatus(inv);
      if (displayStatus in counts) {
        counts[displayStatus] += 1;
      }
    });
    return counts;
  }, [allInvoices]);

  const filteredInvoices = useMemo(() => {
    let list = allInvoices;

    if (search.trim()) {
      list = list.filter((inv) => matchesSearch(inv, search.trim()));
    }

    if (status !== 'all') {
      list = list.filter((inv) => getDisplayStatus(inv) === status);
    }

    return sortInvoices(list, sortBy);
  }, [allInvoices, search, status, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, status, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, page]);

  return (
    <div className="page-shell page-shell--invoice-list">
      <header className="page-header invoice-list-header">
        <div className="invoice-list-header-inner">
          <div className="invoice-list-header-text">
            <h1 className="page-title">Invoices</h1>
            <p className="page-subtitle">Manage and track all your invoices</p>
          </div>

          <div className="invoice-list-search-wrap">
            <Search size={16} className="invoice-list-search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by client or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="invoice-list-search"
              id="search-invoices"
            />
          </div>

          <button
            type="button"
            onClick={() => navigate('/invoices/new')}
            className="btn-primary h-10 px-5 text-sm shrink-0"
          >
            <Plus size={16} /> New Invoice
          </button>
        </div>

        <div className="invoice-list-toolbar">
          <div className="invoice-list-tabs" role="tablist" aria-label="Filter by status">
            {STATUS_TABS.map((tab) => {
              const isActive = status === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`invoice-list-tab${isActive ? ' invoice-list-tab--active' : ''}`}
                  onClick={() => setStatus(tab.value)}
                >
                  <span>{tab.label}</span>
                  <span className={`invoice-list-tab-count${isActive ? ' invoice-list-tab-count--active' : ''}`}>
                    {statusCounts[tab.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="invoice-list-sort"
            aria-label="Sort invoices"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="page-content">
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
              totalItems={filteredInvoices.length}
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
