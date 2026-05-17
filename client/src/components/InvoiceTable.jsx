import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { Inbox, Plus, FileText } from 'lucide-react';

import { fmtMoney } from '../lib/currency';

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isOverdue(invoice) {
  return (invoice._displayStatus || invoice.status) === 'overdue';
}

function getDaysLeftInfo(dueDateStr, status) {
  if (!dueDateStr || status === 'paid') return null;
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} days overdue`, colorClass: 'text-red-600 font-medium text-xs mt-0.5' };
  } else if (diffDays === 0) {
    return { text: 'Due today', colorClass: 'text-[var(--color-accent)] font-medium text-xs mt-0.5' };
  } else {
    return { text: `${diffDays} days left`, colorClass: 'text-[#10b981] font-medium text-xs mt-0.5' };
  }
}

export default function InvoiceTable({ invoices }) {
  const navigate = useNavigate();

  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Inbox size={48} className="text-[var(--color-text-muted)] mb-4" strokeWidth={1} />
        <p className="text-[var(--color-text-primary)] font-semibold mb-1">No invoices found</p>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">Create your first invoice to get started.</p>
        <button type="button" onClick={() => navigate('/invoices/new')} className="btn-primary">
          <Plus size={16} /> New Invoice
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const displayStatus = invoice._displayStatus || invoice.status;
              const overdue = isOverdue(invoice);
              return (
                <tr
                  key={invoice.id}
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                  className="cursor-pointer"
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="invoice-doc-icon">
                        <FileText size={16} />
                      </div>
                      <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                        {invoice.invoice_number || invoice.id.substring(0, 8)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{invoice.client_name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{invoice.client_email}</p>
                  </td>
                  <td className="text-sm text-[var(--color-text-secondary)]">
                    {invoice.issue_date ? fmtDate(invoice.issue_date) : '—'}
                  </td>
                  <td className="text-sm">
                    <div className={`${overdue ? 'text-red-600 font-medium' : 'text-[var(--color-text-secondary)]'}`}>
                      {fmtDate(invoice.due_date)}
                    </div>
                    {(() => {
                      const info = getDaysLeftInfo(invoice.due_date, displayStatus);
                      return info ? <div className={info.colorClass}>{info.text}</div> : null;
                    })()}
                  </td>
                  <td className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {fmtMoney(invoice.grand_total, invoice.currency)}
                  </td>
                  <td>
                    <StatusBadge status={displayStatus} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 p-4 md:hidden">
        {invoices.map((invoice) => {
          const displayStatus = invoice._displayStatus || invoice.status;
          const overdue = isOverdue(invoice);
          return (
            <div
              key={invoice.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/invoices/${invoice.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/invoices/${invoice.id}`)}
              className="card p-4 cursor-pointer hover:border-orange-300 transition-colors"
            >
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="invoice-doc-icon">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{invoice.client_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                      {invoice.invoice_number || invoice.id.substring(0, 8)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={displayStatus} />
              </div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-[var(--color-text-muted)]'}`}>
                    Due {fmtDate(invoice.due_date)}
                  </span>
                  {(() => {
                    const info = getDaysLeftInfo(invoice.due_date, displayStatus);
                    return info ? <span className={info.colorClass}>{info.text}</span> : null;
                  })()}
                </div>
                <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                  {fmtMoney(invoice.grand_total, invoice.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
