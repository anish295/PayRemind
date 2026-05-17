import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getInvoice, updateInvoice, deleteInvoice, getActivities, logActivity } from '../lib/firestore';
import { sendInvoiceEmail, sendReminderEmail } from '../lib/emailjs';
import { downloadInvoicePDF, generateInvoicePDFBase64 } from '../lib/pdfGenerator';
import StatusBadge from '../components/StatusBadge';
import { 
  ArrowLeft, Edit2, Send, Bell, Download, CheckCircle, Trash2, 
  FileText, Activity, Mail, RefreshCw, PlusCircle, Check, AlertCircle
} from 'lucide-react';

import { fmtMoney } from '../lib/currency';

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
      // Generate PDF as base64 for email attachment
      const pdfBase64 = generateInvoicePDFBase64(invoice);
      await sendInvoiceEmail(invoice, pdfBase64);
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
      <div className="invoice-detail-page">
        <div className="invoice-detail-topbar">
          <div className="invoice-detail-topbar-inner">
            <div className="invoice-detail-topbar-left">
              <div className="skeleton w-9 h-9 rounded-lg" />
              <div className="skeleton h-6 w-px" />
              <div className="skeleton h-7 w-56 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="invoice-detail-body">
          <div className="skeleton h-10 w-full max-w-2xl rounded-xl mb-6" />
          <div className="invoice-detail-grid">
            <div className="skeleton h-[560px] rounded-2xl invoice-detail-main" />
            <div className="skeleton h-[400px] rounded-2xl invoice-detail-sidebar" />
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
    const daysDifference = Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysDifference === 0) return 'Today';
    if (daysDifference === -1) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getActivityTimestamp = (dateStr) => {
    const time = new Date(dateStr)
      .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
      .toLowerCase();
    return `${getRelativeTime(dateStr)} • ${time}`;
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="invoice-detail-page">
      <header className="invoice-detail-topbar">
        <div className="invoice-detail-topbar-inner">
          <div className="invoice-detail-topbar-left">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="invoice-detail-back"
              title="Back to Invoices"
              aria-label="Back to Invoices"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="invoice-detail-topbar-divider" aria-hidden="true" />
            <div className="invoice-detail-title-row">
              <h1 className="invoice-detail-title">
                Invoice #{invoice.invoice_number || invoice.id.substring(0, 6)}
              </h1>
              <StatusBadge status={displayStatus} />
            </div>
          </div>
          {!isPaid && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={marking}
              className="btn-primary h-[38px] flex items-center gap-2 shrink-0"
            >
              <CheckCircle size={16} /> {marking ? 'Updating...' : 'Mark Paid'}
            </button>
          )}
        </div>
      </header>

      <div className="invoice-detail-body">
        <div className="invoice-detail-actions">
          {!isPaid && (
            <>
              <button
                type="button"
                onClick={handleSendInvoice}
                disabled={sendingInvoice}
                className="invoice-detail-action-btn"
              >
                <Send size={16} /> {sendingInvoice ? 'Sending...' : 'Send Invoice'}
              </button>
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={sendingReminder}
                className="invoice-detail-action-btn"
              >
                <Bell size={16} /> {sendingReminder ? 'Sending...' : 'Send Reminder'}
              </button>
            </>
          )}
          <button type="button" onClick={handleDownloadPDF} className="invoice-detail-action-btn">
            <Download size={16} /> Download PDF
          </button>
          <button
            type="button"
            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            className="invoice-detail-action-btn"
          >
            <Edit2 size={16} /> Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="invoice-detail-action-btn invoice-detail-action-btn--danger"
          >
            <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        <div className="invoice-detail-grid">
          <div className="invoice-detail-main">
            <div className="card invoice-detail-card">
              <div className="invoice-detail-parties">
                <div>
                  <p className="invoice-detail-party-label">Billed To</p>
                  <p className="invoice-detail-client-name">{invoice.client_name}</p>
                  <p className="invoice-detail-client-line">{invoice.client_email}</p>
                  {invoice.client_phone && (
                    <p className="invoice-detail-client-line">{invoice.client_phone}</p>
                  )}
                  {invoice.client_address && (
                    <p className="invoice-detail-client-line invoice-detail-client-address">
                      {invoice.client_address}
                    </p>
                  )}
                </div>
                <div className="invoice-detail-party-block--right">
                  <p className="invoice-detail-party-label">Invoice Details</p>
                  <div className="invoice-detail-meta-row">
                    <span className="invoice-detail-meta-label">Issue Date</span>
                    <span className="invoice-detail-meta-value">{fmtDate(invoice.issue_date)}</span>
                  </div>
                  <div className="invoice-detail-meta-row">
                    <span className="invoice-detail-meta-label">Due Date</span>
                    <span className="invoice-detail-meta-value">{fmtDate(invoice.due_date)}</span>
                  </div>
                </div>
              </div>

              {lineItems.length > 0 && (
                <div className="invoice-detail-table-wrap">
                  <table className="invoice-detail-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{fmtMoney(item.unit_price, currency)}</td>
                          <td>{fmtMoney(item.line_total, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="invoice-detail-totals">
                <div className="invoice-detail-totals-inner">
                  <div className="invoice-detail-total-row">
                    <span>Subtotal</span>
                    <span>{fmtMoney(invoice.subtotal, currency)}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="invoice-detail-total-row">
                      <span>Tax ({invoice.tax_percent || 0}%)</span>
                      <span>{fmtMoney(taxAmount, currency)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="invoice-detail-total-row invoice-detail-total-row--discount">
                      <span>
                        Discount {invoice.discount_type === 'percent' ? `(${invoice.discount}%)` : ''}
                      </span>
                      <span>-{fmtMoney(discountAmount, currency)}</span>
                    </div>
                  )}
                  <div className="invoice-detail-grand-total">
                    <span className="invoice-detail-grand-total-label">Grand Total</span>
                    <span className="invoice-detail-grand-total-value">
                      {fmtMoney(invoice.grand_total, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {(invoice.notes || invoice.payment_terms) && (
                <div className="invoice-detail-footer">
                  {invoice.payment_terms && (
                    <div className="invoice-detail-footer-block">
                      <p className="invoice-detail-footer-label">Payment Terms</p>
                      <p className="invoice-detail-footer-text">{invoice.payment_terms}</p>
                    </div>
                  )}
                  {invoice.notes && (
                    <div className="invoice-detail-footer-block">
                      <p className="invoice-detail-footer-label">Notes</p>
                      <p className="invoice-detail-footer-text">{invoice.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="invoice-detail-sidebar">
            <div className="card invoice-detail-timeline-card">
              <h2 className="invoice-detail-timeline-title">Activity Timeline</h2>
              {activities.length === 0 ? (
                <p className="invoice-detail-timeline-empty">No activity yet</p>
              ) : (
                <div className="invoice-detail-timeline-list">
                  {activities.map((act) => (
                    <div key={act.id} className="invoice-detail-timeline-item">
                      <span
                        className="invoice-detail-timeline-dot"
                        style={{ backgroundColor: getActivityColor(act.type) }}
                      />
                      <div className="invoice-detail-timeline-item-inner">
                        <div
                          className="invoice-detail-timeline-icon"
                          style={{ color: getActivityColor(act.type) }}
                        >
                          {getActivityIcon(act.type)}
                        </div>
                        <div className="invoice-detail-timeline-text">
                          <p className="invoice-detail-timeline-desc">{act.description}</p>
                          <p className="invoice-detail-timeline-time">
                            {getActivityTimestamp(act.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
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
