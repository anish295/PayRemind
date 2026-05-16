import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getInvoice, updateInvoice, deleteInvoice, getActivities, logActivity } from '../lib/firestore';
import { sendInvoiceEmail, sendReminderEmail } from '../lib/emailjs';
import { downloadInvoicePDF } from '../lib/pdfGenerator';
import StatusBadge from '../components/StatusBadge';
import { 
  ArrowLeft, Edit2, Send, Bell, Download, CheckCircle, Trash2, 
  FileText, Activity, Mail, RefreshCw, PlusCircle, Check, AlertCircle
} from 'lucide-react';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };

function fmtMoney(amount, currency = 'INR') {
  const sym = CURRENCY_SYMBOLS[currency] || '₹';
  return `${sym}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [inv, acts] = await Promise.all([
        getInvoice(id),
        getActivities(id),
      ]);
      setInvoice(inv);
      // Sort activities: latest at top
      setActivities(acts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (err) {
      console.error('Failed to load invoice:', err);
      setToast({ type: 'error', message: 'Invoice not found' });
    } finally {
      setLoading(false);
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSendInvoice() {
    if (!invoice) return;
    setSendingInvoice(true);
    try {
      await sendInvoiceEmail(invoice);
      await logActivity(invoice.id, {
        type: 'invoice_sent',
        description: `Invoice sent to ${invoice.client_email}`,
        metadata: { email_type: 'invoice', to_email: invoice.client_email },
      });
      showToast('success', `Invoice sent to ${invoice.client_email}!`);
      await loadData();
    } catch (err) {
      if (err.message.includes('credentials')) {
        showToast('error', err.message);
      } else {
        try {
          await logActivity(invoice.id, {
            type: 'invoice_sent',
            description: `Invoice sent to ${invoice.client_email} (delivery uncertain)`,
            metadata: { email_type: 'invoice', to_email: invoice.client_email, error: err.message },
          });
          showToast('error', `Email failed (${err.message}), but activity was logged.`);
          await loadData();
        } catch {
          showToast('error', `Failed to send invoice: ${err.message}`);
        }
      }
    } finally {
      setSendingInvoice(false);
    }
  }

  async function handleSendReminder() {
    if (!invoice) return;
    setSendingReminder(true);
    try {
      await sendReminderEmail(invoice);
      await logActivity(invoice.id, {
        type: 'reminder_sent',
        description: `Payment reminder sent to ${invoice.client_email}`,
        metadata: { email_type: 'reminder', to_email: invoice.client_email },
      });
      showToast('success', `Reminder sent to ${invoice.client_email}!`);
      await loadData();
    } catch (err) {
      if (err.message.includes('credentials')) {
        showToast('error', err.message);
      } else {
        try {
          await logActivity(invoice.id, {
            type: 'reminder_sent',
            description: `Payment reminder sent to ${invoice.client_email} (delivery uncertain)`,
            metadata: { email_type: 'reminder', to_email: invoice.client_email, error: err.message },
          });
          showToast('error', `Email failed (${err.message}), but reminder was logged.`);
          await loadData();
        } catch {
          showToast('error', `Failed to send reminder: ${err.message}`);
        }
      }
    } finally {
      setSendingReminder(false);
    }
  }

  function handleDownloadPDF() {
    if (!invoice) return;
    downloadInvoicePDF(invoice);
    showToast('success', 'PDF downloaded!');
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    setMarking(true);
    try {
      await updateInvoice(invoice.id, { status: 'paid' });
      showToast('success', 'Invoice marked as paid!');
      await loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setMarking(false);
    }
  }

  async function handleDelete() {
    if (!invoice) return;
    if (!window.confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteInvoice(invoice.id);
      showToast('success', 'Invoice deleted');
      setTimeout(() => navigate('/invoices'), 800);
    } catch (err) {
      showToast('error', err.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shrink-0">
          <div className="max-w-[1200px] w-full mx-auto py-[16px] px-[32px] flex items-center gap-4">
             <div className="skeleton w-[24px] h-[24px] rounded-md"></div>
             <div className="h-6 w-px bg-[var(--color-border)]"></div>
             <div className="skeleton h-6 w-48 rounded-[var(--radius-sm)]"></div>
          </div>
        </div>
        <div className="max-w-[1200px] w-full mx-auto py-[28px] px-[32px] flex-1">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="skeleton h-[600px] lg:w-[65%] rounded-[var(--radius-md)]"></div>
            <div className="skeleton h-[400px] lg:w-[35%] rounded-[var(--radius-md)]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText size={48} className="text-[var(--color-text-muted)] mb-4" strokeWidth={1} />
        <p className="text-[var(--color-text-primary)] font-medium mb-4">Invoice not found</p>
        <button onClick={() => navigate('/invoices')} className="btn-primary">
          Back to Invoices
        </button>
      </div>
    );
  }

  const displayStatus = invoice._displayStatus || invoice.status;
  const isPaid = invoice.status === 'paid';
  const currency = invoice.currency || 'INR';
  const lineItems = invoice.line_items || [];
  const taxAmount = (invoice.subtotal || 0) * ((invoice.tax_percent || 0) / 100);
  const discountAmount = invoice.discount_type === 'percent'
    ? (invoice.subtotal || 0) * ((invoice.discount || 0) / 100)
    : (invoice.discount || 0);

  const getActivityIcon = (type) => {
    switch(type) {
      case 'invoice_created': return <PlusCircle size={16} />;
      case 'invoice_updated': return <Edit2 size={16} />;
      case 'invoice_sent': return <Send size={16} />;
      case 'reminder_sent': return <Bell size={16} />;
      case 'status_changed': return <RefreshCw size={16} />;
      case 'marked_paid': return <CheckCircle size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const getActivityColor = (type) => {
    if (type === 'invoice_sent' || type === 'reminder_sent') return 'var(--color-accent)';
    if (type === 'marked_paid') return 'var(--color-success)';
    return 'var(--color-text-muted)';
  };

  const getRelativeTime = (dateStr) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysDifference === 0) return 'Today';
    if (daysDifference === -1) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* TOPBAR */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shrink-0">
        <div className="max-w-[1200px] w-full mx-auto py-[16px] px-[32px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/invoices')}
              className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1 -ml-1 rounded-md"
              title="Back to Invoices"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-6 w-px bg-[var(--color-border)]"></div>
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)] leading-tight">
                Invoice #{invoice.invoice_number || invoice.id.substring(0, 6)}
              </h1>
              <StatusBadge status={displayStatus} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isPaid && (
              <button onClick={handleMarkPaid} disabled={marking} className="btn-primary h-[38px] flex items-center gap-2">
                <CheckCircle size={16} /> {marking ? 'Updating...' : 'Mark Paid'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-[1200px] w-full mx-auto py-[28px] px-[32px] flex-1">
        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-3 mb-[24px] pb-[16px] border-b border-[var(--color-border)]">
          {!isPaid && (
            <>
              <button onClick={handleSendInvoice} disabled={sendingInvoice} className="btn-secondary h-[38px] flex items-center gap-2 text-sm">
                <Send size={16} /> {sendingInvoice ? 'Sending...' : 'Send Invoice'}
              </button>
              <button onClick={handleSendReminder} disabled={sendingReminder} className="btn-secondary h-[38px] flex items-center gap-2 text-sm">
                <Bell size={16} /> {sendingReminder ? 'Sending...' : 'Send Reminder'}
              </button>
            </>
          )}
          <button onClick={handleDownloadPDF} className="btn-secondary h-[38px] flex items-center gap-2 text-sm">
            <Download size={16} /> Download PDF
          </button>
          <button onClick={() => navigate(`/invoices/${invoice.id}/edit`)} className="btn-secondary h-[38px] flex items-center gap-2 text-sm">
            <Edit2 size={16} /> Edit
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger h-[38px] flex items-center gap-2 ml-auto text-sm">
            <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Invoice Info */}
        <div className="lg:w-[65%] flex flex-col gap-6">
          <div className="card">
            <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
              <div>
                <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Billed To</p>
                <p className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{invoice.client_name}</p>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">{invoice.client_email}</p>
                {invoice.client_phone && <p className="text-sm text-[var(--color-text-secondary)] mb-1">{invoice.client_phone}</p>}
                {invoice.client_address && <p className="text-sm text-[var(--color-text-secondary)] mt-2 whitespace-pre-line">{invoice.client_address}</p>}
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Invoice Details</p>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  <span className="font-medium text-[var(--color-text-primary)]">Issue Date:</span> {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  <span className="font-medium text-[var(--color-text-primary)]">Due Date:</span> {new Date(invoice.due_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            {lineItems.length > 0 && (
              <div className="mb-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="py-3 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)]">Description</th>
                      <th className="py-3 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] text-right">Qty</th>
                      <th className="py-3 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] text-right">Unit Price</th>
                      <th className="py-3 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={item.id || idx} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="py-4 text-sm text-[var(--color-text-primary)]">{item.description}</td>
                        <td className="py-4 text-sm text-[var(--color-text-secondary)] text-right">{item.quantity}</td>
                        <td className="py-4 text-sm text-[var(--color-text-secondary)] text-right">{fmtMoney(item.unit_price, currency)}</td>
                        <td className="py-4 text-sm font-mono font-semibold text-[var(--color-text-primary)] text-right">{fmtMoney(item.line_total, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
              <div className="w-full sm:w-[280px] flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">Subtotal</span>
                  <span className="text-[var(--color-text-primary)] font-mono">{fmtMoney(invoice.subtotal, currency)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">Tax ({invoice.tax_percent || 0}%)</span>
                    <span className="text-[var(--color-text-primary)] font-mono">{fmtMoney(taxAmount, currency)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Discount {invoice.discount_type === 'percent' ? `(${invoice.discount}%)` : ''}
                    </span>
                    <span className="text-[var(--color-danger)] font-mono">-{fmtMoney(discountAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold mt-2 pt-3 border-t border-[var(--color-border)]">
                  <span className="text-[var(--color-text-primary)]">Grand Total</span>
                  <span className="text-[var(--color-accent)] font-mono">{fmtMoney(invoice.grand_total, currency)}</span>
                </div>
              </div>
            </div>

            {/* Notes / Terms */}
            {(invoice.notes || invoice.payment_terms) && (
              <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                {invoice.payment_terms && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Payment Terms</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{invoice.payment_terms}</p>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="lg:w-[35%] flex flex-col gap-4">
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-2">Activity Timeline</h2>
          
          <div className="card relative p-6">
            {activities.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center">No activity yet</p>
            ) : (
              <div className="relative border-l-2 border-[var(--color-border)] ml-3 space-y-8 py-2">
                {activities.map((act) => (
                  <div key={act.id} className="relative pl-6">
                    {/* Dot */}
                    <div 
                      className="absolute left-[-5px] top-1 w-[8px] h-[8px] rounded-full"
                      style={{ backgroundColor: getActivityColor(act.type) }}
                    />
                    <div className="flex items-start gap-3">
                      <div className="text-[var(--color-text-muted)] mt-0.5">
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--color-text-primary)] font-medium leading-tight mb-1">
                          {act.description}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {getRelativeTime(act.timestamp)} • {new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`} onClick={() => setToast(null)}>
          {toast.type === 'success' ? <Check size={18} className="text-[var(--color-accent)]" /> : <AlertCircle size={18} className="text-[var(--color-danger)]" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
