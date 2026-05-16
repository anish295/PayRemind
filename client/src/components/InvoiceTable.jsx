import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { Inbox, Plus } from 'lucide-react';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };

function fmtMoney(amount, currency = 'INR') {
  const sym = CURRENCY_SYMBOLS[currency] || '₹';
  return `${sym}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoiceTable({ invoices }) {
  const navigate = useNavigate();

  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
        <Inbox size={48} className="text-[var(--color-text-muted)] mb-4" strokeWidth={1} />
        <p className="text-[var(--color-text-primary)] font-medium mb-1">No invoices found</p>
        <p className="text-[12px] text-[var(--color-text-secondary)] mb-6">Create your first invoice to get started.</p>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary">
          <Plus size={16} /> New Invoice
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-[10px] text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.06em] border-b border-[var(--color-border)]">Invoice</th>
              <th className="px-6 py-[10px] text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.06em] border-b border-[var(--color-border)]">Client</th>
              <th className="px-6 py-[10px] text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.06em] border-b border-[var(--color-border)]">Due Date</th>
              <th className="px-6 py-[10px] text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.06em] border-b border-[var(--color-border)]">Status</th>
              <th className="px-6 py-[10px] text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.06em] border-b border-[var(--color-border)] text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                className="cursor-pointer transition-colors duration-150 hover:bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] last:border-b-0"
              >
                <td className="px-6 py-[10px]">
                  <span className="font-medium text-[var(--color-text-primary)] text-sm">{invoice.invoice_number || invoice.id.substring(0, 6)}</span>
                </td>
                <td className="px-6 py-[10px]">
                  <p className="text-sm text-[var(--color-text-primary)]">{invoice.client_name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{invoice.client_email}</p>
                </td>
                <td className="px-6 py-[10px] text-sm text-[var(--color-text-secondary)]">
                  {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-6 py-[10px]">
                  <StatusBadge status={invoice._displayStatus || invoice.status} />
                </td>
                <td className="px-6 py-[10px] text-sm font-semibold font-mono text-amber-500 text-right">
                  {fmtMoney(invoice.grand_total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="flex flex-col gap-3 md:hidden">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="card cursor-pointer flex flex-col hover:border-[var(--color-accent)] active:bg-[var(--color-bg-tertiary)]"
            style={{ padding: '16px' }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[14px] font-bold text-[var(--color-text-primary)] leading-tight">{invoice.client_name}</span>
              <StatusBadge status={invoice._displayStatus || invoice.status} />
            </div>
            
            <span className="text-[12px] text-[var(--color-text-muted)] mb-4">{invoice.invoice_number || invoice.id.substring(0, 6)}</span>
            
            <div className="flex justify-between items-end mt-auto">
              <span className="text-[12px] text-[var(--color-text-muted)]">
                Due {new Date(invoice.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="font-mono font-semibold text-[14px] text-amber-500">
                {fmtMoney(invoice.grand_total, invoice.currency)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
