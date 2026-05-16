import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createInvoice, getCompanies, createCompany } from '../lib/firestore';
import { Building2, List, CreditCard, Settings, Loader2 } from 'lucide-react';

const CURRENCY_OPTIONS = ['USD', 'EUR', 'INR', 'GBP'];
const PAYMENT_TERMS_OPTIONS = ['', 'Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];
const PAYMENT_METHOD_OPTIONS = ['', 'Bank Transfer', 'UPI', 'PayPal', 'Credit Card', 'Cash', 'Other'];
const emptyLineItem = () => ({ description: '', quantity: 1, unit_price: 0 });

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}
function formatDateStr(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function InvoiceNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    invoice_number: '', business_name: '', client_name: '', client_email: '',
    client_phone: '', client_address: '', issue_date: formatDateStr(new Date()),
    due_date: '', currency: 'INR', payment_terms: '', payment_method: '',
    tax_percent: 0, discount_type: 'flat', discount: 0, status: 'pending',
    reminder_enabled: true, notes: '',
  });
  const [lineItems, setLineItems] = useState([emptyLineItem()]);
  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [saveAsCompany, setSaveAsCompany] = useState(false);

  useEffect(() => {
    getCompanies().then(setCompanies).catch(() => {});
  }, []);

  // ─── Calculations ────────────────────────────────────
  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);
  const taxAmount = subtotal * ((Number(form.tax_percent) || 0) / 100);
  const discountAmount = form.discount_type === 'percent'
    ? subtotal * ((Number(form.discount) || 0) / 100)
    : Number(form.discount) || 0;
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const currencySymbol = { USD: '$', EUR: '€', INR: '₹', GBP: '£' }[form.currency] || '₹';

  // ─── Validation helpers ──────────────────────────────
  function clampField(field, value) {
    const num = Number(value);
    const newFieldErrors = { ...fieldErrors };
    if (field === 'tax_percent') {
      if (num < 0) { newFieldErrors.tax_percent = 'Tax cannot be negative'; setFieldErrors(newFieldErrors); return 0; }
      if (num > 100) { newFieldErrors.tax_percent = 'Tax cannot exceed 100%'; setFieldErrors(newFieldErrors); return 100; }
      delete newFieldErrors.tax_percent; setFieldErrors(newFieldErrors); return num;
    }
    if (field === 'discount' && form.discount_type === 'percent') {
      if (num < 0) { newFieldErrors.discount = 'Discount cannot be negative'; setFieldErrors(newFieldErrors); return 0; }
      if (num > 100) { newFieldErrors.discount = 'Discount cannot exceed 100%'; setFieldErrors(newFieldErrors); return 100; }
      delete newFieldErrors.discount; setFieldErrors(newFieldErrors); return num;
    }
    if (field === 'discount' && form.discount_type === 'flat') {
      if (num < 0) { newFieldErrors.discount = 'Discount cannot be negative'; setFieldErrors(newFieldErrors); return 0; }
      if (num > subtotal) { newFieldErrors.discount = 'Discount cannot exceed subtotal'; setFieldErrors(newFieldErrors); return subtotal; }
      delete newFieldErrors.discount; setFieldErrors(newFieldErrors); return num;
    }
    if (num < 0) return 0;
    return num;
  }

  // ─── Handlers ────────────────────────────────────────
  function handleChange(field) {
    return (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function handleNumericBlur(field) {
    return () => {
      const clamped = clampField(field, form[field]);
      setForm((prev) => ({ ...prev, [field]: clamped }));
    };
  }

  function handleNumericChange(field) {
    return (e) => {
      const val = e.target.value;
      setForm((prev) => ({ ...prev, [field]: val }));
      const num = Number(val);
      const newFieldErrors = { ...fieldErrors };
      if (num < 0) { newFieldErrors[field] = 'Value cannot be negative'; }
      else if (field === 'tax_percent' && num > 100) { newFieldErrors[field] = 'Tax cannot exceed 100%'; }
      else if (field === 'discount' && form.discount_type === 'percent' && num > 100) { newFieldErrors[field] = 'Discount cannot exceed 100%'; }
      else if (field === 'discount' && form.discount_type === 'flat' && num > subtotal) { newFieldErrors[field] = 'Discount cannot exceed subtotal'; }
      else { delete newFieldErrors[field]; }
      setFieldErrors(newFieldErrors);
    };
  }

  function handleLineItemChange(index, field, value) {
    setLineItems((prev) => {
      const updated = [...prev];
      let val = value;
      if (field === 'quantity' || field === 'unit_price') {
        if (Number(value) < 0) val = 0;
      }
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  }

  function handleLineItemBlur(index, field) {
    setLineItems((prev) => {
      const updated = [...prev];
      if (field === 'quantity' || field === 'unit_price') {
        if (Number(updated[index][field]) < 0) {
          updated[index] = { ...updated[index], [field]: 0 };
        }
      }
      return updated;
    });
  }

  function addLineItem() { setLineItems((prev) => [...prev, emptyLineItem()]); }
  function removeLineItem(index) { if (lineItems.length <= 1) return; setLineItems((prev) => prev.filter((_, i) => i !== index)); }

  function handleSelectCompany(company) {
    setSelectedCompany(company.id);
    setForm((prev) => ({
      ...prev,
      client_name: company.contact_name || company.company_name || '',
      client_email: company.email || '',
      client_phone: company.phone || '',
      client_address: company.address || '',
    }));
    setCompanySearch(company.company_name);
    setShowCompanyDropdown(false);
  }

  const filteredCompanies = companies.filter((c) =>
    (c.company_name || '').toLowerCase().includes(companySearch.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(companySearch.toLowerCase())
  );

  function validate() {
    const errs = {};
    if (!form.client_name.trim()) errs.client_name = 'Client name is required';
    if (!form.client_email.trim()) { errs.client_email = 'Email is required'; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.client_email)) { errs.client_email = 'Invalid email format'; }
    if (!form.due_date) errs.due_date = 'Due date is required';
    if (lineItems.length === 0 || lineItems.every(li => !li.description.trim())) { errs.line_items = 'At least one line item with a description is required'; }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const result = await createInvoice({
        ...form,
        tax_percent: Number(form.tax_percent) || 0,
        discount: Number(form.discount) || 0,
        line_items: lineItems.filter(li => li.description.trim()),
      });

      if (saveAsCompany && form.client_name.trim()) {
        await createCompany({
          company_name: form.business_name || form.client_name,
          contact_name: form.client_name,
          email: form.client_email,
          phone: form.client_phone,
          address: form.client_address,
        });
      }

      setToast({ type: 'success', message: 'Invoice created successfully!' });
      setTimeout(() => navigate(`/invoices/${result.id}`), 1000);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* TOPBAR */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shrink-0">
        <div className="max-w-[1200px] w-full mx-auto py-[16px] px-[32px] flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)] leading-tight">Create Invoice</h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">Add a new invoice with detailed line items</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-[1200px] w-full mx-auto py-[28px] px-[32px] flex-1 pb-24 lg:pb-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column */}
            <div className="lg:w-[65%] flex flex-col gap-6">
            
            {/* Business & Client Info */}
            <div className="card">
              <h2 className="text-[13px] font-semibold flex items-center gap-2 pb-[12px] border-b border-[var(--color-border)] mb-[16px]">
                <Building2 size={16} className="text-[var(--color-text-muted)]" /> Business & Client Details
              </h2>

              {/* Company selector */}
              <div className="mb-[16px] relative">
                <label className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Select Saved Company</label>
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => { setCompanySearch(e.target.value); setShowCompanyDropdown(true); setSelectedCompany(''); }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  className="input-field h-[38px] w-full"
                  placeholder="Search companies..."
                  id="company-search"
                />
                {showCompanyDropdown && filteredCompanies.length > 0 && (
                  <div className="absolute z-30 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-xl">
                    {filteredCompanies.map((c) => (
                      <button key={c.id} type="button" onClick={() => handleSelectCompany(c)}
                        className="w-full text-left px-4 py-3 hover:bg-[var(--color-bg-tertiary)] transition-colors text-sm">
                        <p className="text-[var(--color-text-primary)] font-medium">{c.company_name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{c.email}</p>
                      </button>
                    ))}
                  </div>
                )}
                {showCompanyDropdown && companySearch && filteredCompanies.length === 0 && (
                  <div className="absolute z-30 w-full mt-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
                    No companies found
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                <div className="mb-[16px]">
                  <label htmlFor="business_name" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Business Name</label>
                  <input type="text" id="business_name" value={form.business_name}
                    onChange={handleChange('business_name')} className="input-field h-[38px] w-full"
                    placeholder="e.g. Tata Consultancy Services" />
                </div>
                <div className="mb-[16px]">
                  <label htmlFor="invoice_number" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">
                    Invoice Number <span className="text-[var(--color-text-muted)] font-normal">(auto-generated)</span>
                  </label>
                  <input type="text" id="invoice_number" value={form.invoice_number}
                    onChange={handleChange('invoice_number')} className="input-field h-[38px] w-full"
                    placeholder="e.g. INV-2026-001" />
                </div>
                <div className="mb-[16px]">
                  <label htmlFor="client_name" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Client Name *</label>
                  <input type="text" id="client_name" value={form.client_name}
                    onChange={handleChange('client_name')}
                    className={`input-field h-[38px] w-full ${errors.client_name ? 'border-[var(--color-danger)]' : ''}`}
                    placeholder="e.g. Rahul Sharma" />
                  {errors.client_name && <p className="form-error">{errors.client_name}</p>}
                </div>
                <div className="mb-[16px]">
                  <label htmlFor="client_email" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Client Email *</label>
                  <input type="email" id="client_email" value={form.client_email}
                    onChange={handleChange('client_email')}
                    className={`input-field h-[38px] w-full ${errors.client_email ? 'border-[var(--color-danger)]' : ''}`}
                    placeholder="e.g. rahul@example.in" />
                  {errors.client_email && <p className="form-error">{errors.client_email}</p>}
                </div>
                <div className="mb-[16px]">
                  <label htmlFor="client_phone" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Client Phone</label>
                  <input type="tel" id="client_phone" value={form.client_phone}
                    onChange={handleChange('client_phone')} className="input-field h-[38px] w-full"
                    placeholder="e.g. +91 98765 43210" />
                </div>
                <div className="mb-[16px]">
                  <label className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Currency</label>
                  <select id="currency" value={form.currency}
                    onChange={handleChange('currency')} className="input-field h-[38px] w-full appearance-none cursor-pointer">
                    {CURRENCY_OPTIONS.map(c => <option key={c} value={c} className="bg-[var(--color-bg-secondary)]">{c}</option>)}
                  </select>
                </div>
                <div className="mb-[16px]">
                  <label className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Issue Date</label>
                  <DatePicker
                    selected={parseDate(form.issue_date)}
                    onChange={(date) => setForm((prev) => ({ ...prev, issue_date: formatDateStr(date) }))}
                    dateFormat="dd/MM/yyyy"
                    todayButton="Today"
                    className="input-field h-[38px] w-full"
                    wrapperClassName="w-full"
                    id="issue_date"
                    placeholderText="DD/MM/YYYY"
                  />
                </div>
                <div className="mb-[16px]">
                  <label className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Due Date *</label>
                  <DatePicker
                    selected={parseDate(form.due_date)}
                    onChange={(date) => { setForm((prev) => ({ ...prev, due_date: formatDateStr(date) })); if (errors.due_date) setErrors((prev) => ({ ...prev, due_date: undefined })); }}
                    dateFormat="dd/MM/yyyy"
                    todayButton="Today"
                    minDate={parseDate(form.issue_date)}
                    className={`input-field h-[38px] w-full ${errors.due_date ? 'border-[var(--color-danger)]' : ''}`}
                    wrapperClassName="w-full"
                    id="due_date"
                    placeholderText="DD/MM/YYYY"
                  />
                  {errors.due_date && <p className="form-error">{errors.due_date}</p>}
                </div>
              </div>

              <div className="mb-[16px]">
                <label htmlFor="client_address" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Client Address</label>
                <textarea id="client_address" value={form.client_address}
                  onChange={handleChange('client_address')}
                  className="input-field min-h-[70px] resize-y w-full"
                  placeholder="Street, City, State, ZIP..." rows={2} />
              </div>

              {/* Save as company checkbox */}
              <div className="flex items-center gap-3 pt-5 border-t border-[var(--color-border)]">
                <input type="checkbox" id="save_as_company" checked={saveAsCompany}
                  onChange={(e) => setSaveAsCompany(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer" />
                <label htmlFor="save_as_company" className="text-sm text-[var(--color-text-secondary)] cursor-pointer">
                  Save as new company
                </label>
              </div>
            </div>

            {/* Line Items */}
            <div className="card">
              <h2 className="text-[13px] font-semibold flex items-center gap-2 pb-[12px] border-b border-[var(--color-border)] mb-[16px]">
                <List size={16} className="text-[var(--color-text-muted)]" /> Line Items
              </h2>
              {errors.line_items && <p className="form-error mb-4">{errors.line_items}</p>}

              <div className="hidden sm:grid sm:grid-cols-[1fr_80px_110px_110px_40px] gap-3 mb-2 px-1">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Description</span>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Qty</span>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Unit Price</span>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Total</span>
                <span></span>
              </div>

              <div className="space-y-4 sm:space-y-2">
                {lineItems.map((item, i) => {
                  const lineTotal = Math.max(0, (Number(item.quantity) || 0) * (Number(item.unit_price) || 0));
                  return (
                    <div key={i} className="sm:grid sm:grid-cols-[1fr_80px_110px_110px_40px] gap-3 p-4 sm:p-0 sm:py-[8px] rounded-md bg-[var(--color-bg-tertiary)] sm:bg-transparent border border-[var(--color-border)] sm:border-none">
                      <div>
                        <label className="sm:hidden text-xs text-[var(--color-text-muted)] mb-1 block">Description</label>
                        <input type="text" value={item.description}
                          onChange={(e) => handleLineItemChange(i, 'description', e.target.value)}
                          className="input-field h-[38px] text-sm w-full" placeholder="Item description" />
                      </div>
                      <div>
                        <label className="sm:hidden text-xs text-[var(--color-text-muted)] mb-1 block">Qty</label>
                        <input type="number" value={item.quantity}
                          onChange={(e) => handleLineItemChange(i, 'quantity', e.target.value)}
                          onBlur={() => handleLineItemBlur(i, 'quantity')}
                          className="input-field h-[38px] text-sm sm:text-right w-full" min="0" step="1" />
                      </div>
                      <div>
                        <label className="sm:hidden text-xs text-[var(--color-text-muted)] mb-1 block">Unit Price</label>
                        <input type="number" value={item.unit_price}
                          onChange={(e) => handleLineItemChange(i, 'unit_price', e.target.value)}
                          onBlur={() => handleLineItemBlur(i, 'unit_price')}
                          className="input-field h-[38px] text-sm sm:text-right w-full" min="0" step="0.01" />
                      </div>
                      <div className="flex items-center sm:justify-end mt-2 sm:mt-0">
                        <label className="sm:hidden text-xs text-[var(--color-text-muted)] mr-2">Total:</label>
                        <span className="text-sm font-mono text-[var(--color-text-primary)]">
                          {currencySymbol}{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-end mt-2 sm:mt-0">
                        <button type="button" onClick={() => removeLineItem(i)}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors p-1"
                          title="Remove item" disabled={lineItems.length <= 1}>×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={addLineItem} className="btn-secondary mt-4 text-sm w-full sm:w-auto h-[38px]">
                + Add Line Item
              </button>
            </div>
            </div>

            {/* Right Column */}
            <div className="lg:w-[35%] flex flex-col gap-6">
            
            {/* Totals & Payment */}
            <div className="card">
              <h2 className="text-[13px] font-semibold flex items-center gap-2 pb-[12px] border-b border-[var(--color-border)] mb-[16px]">
                <CreditCard size={16} className="text-[var(--color-text-muted)]" /> Totals & Payment
              </h2>
              
              <div className="flex flex-col gap-[16px]">
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                  <span className="text-sm text-[var(--color-text-secondary)]">Subtotal</span>
                  <span className="font-mono text-[var(--color-text-primary)]">{currencySymbol}{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-[16px]">
                  <div className="mb-[16px]">
                    <label htmlFor="tax_percent" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Tax %</label>
                    <input type="number" id="tax_percent" value={form.tax_percent}
                      onChange={handleNumericChange('tax_percent')}
                      onBlur={handleNumericBlur('tax_percent')}
                      className={`input-field h-[38px] w-full ${fieldErrors.tax_percent ? 'border-[var(--color-danger)]' : ''}`} min="0" max="100" step="0.1" />
                    {fieldErrors.tax_percent && <p className="form-error">{fieldErrors.tax_percent}</p>}
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Tax: {currencySymbol}{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  
                  <div className="mb-[16px]">
                    <label htmlFor="discount" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Discount</label>
                    <div className="flex gap-2">
                      <select value={form.discount_type} onChange={handleChange('discount_type')}
                        className="input-field h-[38px] p-2 appearance-none cursor-pointer text-xs" id="discount_type">
                        <option value="flat" className="bg-[var(--color-bg-secondary)]">{currencySymbol}</option>
                        <option value="percent" className="bg-[var(--color-bg-secondary)]">%</option>
                      </select>
                      <input type="number" id="discount" value={form.discount}
                        onChange={handleNumericChange('discount')}
                        onBlur={handleNumericBlur('discount')}
                        className={`input-field h-[38px] w-full ${fieldErrors.discount ? 'border-[var(--color-danger)]' : ''}`} min="0" step="0.01" />
                    </div>
                    {fieldErrors.discount && <p className="form-error">{fieldErrors.discount}</p>}
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Discount: {currencySymbol}{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 border-t border-[var(--color-border)]">
                  <span className="font-bold text-[var(--color-text-primary)]">Grand Total</span>
                  <span className="font-mono font-bold text-lg text-[var(--color-accent)]">
                    {currencySymbol}{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-[16px]">
                  <div className="mb-[16px]">
                    <label htmlFor="payment_terms" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Payment Terms</label>
                    <select id="payment_terms" value={form.payment_terms} onChange={handleChange('payment_terms')}
                      className="input-field h-[38px] w-full appearance-none cursor-pointer">
                      {PAYMENT_TERMS_OPTIONS.map(t => <option key={t} value={t} className="bg-[var(--color-bg-secondary)]">{t || '— Select —'}</option>)}
                    </select>
                  </div>
                  <div className="mb-[16px]">
                    <label htmlFor="payment_method" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Payment Method</label>
                    <select id="payment_method" value={form.payment_method} onChange={handleChange('payment_method')}
                      className="input-field h-[38px] w-full appearance-none cursor-pointer">
                      {PAYMENT_METHOD_OPTIONS.map(m => <option key={m} value={m} className="bg-[var(--color-bg-secondary)]">{m || '— Select —'}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="card">
              <h2 className="text-[13px] font-semibold flex items-center gap-2 pb-[12px] border-b border-[var(--color-border)] mb-[16px]">
                <Settings size={16} className="text-[var(--color-text-muted)]" /> Additional Options
              </h2>
              <div className="flex flex-col gap-[16px]">
                <div className="mb-[16px]">
                  <label htmlFor="status" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Initial Status</label>
                  <select id="status" value={form.status} onChange={handleChange('status')}
                    className="input-field h-[38px] w-full appearance-none cursor-pointer">
                    <option value="pending" className="bg-[var(--color-bg-secondary)]">Pending</option>
                    <option value="paid" className="bg-[var(--color-bg-secondary)]">Paid</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-3 mb-[16px]">
                  <input type="checkbox" id="reminder_enabled" checked={form.reminder_enabled}
                    onChange={handleChange('reminder_enabled')}
                    className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer" />
                  <label htmlFor="reminder_enabled" className="text-sm text-[var(--color-text-secondary)] cursor-pointer">
                    Enable Payment Reminders
                  </label>
                </div>
                
                <div className="mb-[16px]">
                  <label htmlFor="notes" className="text-[12px] font-medium text-[var(--color-text-muted)] mb-[6px] block">Notes</label>
                  <textarea id="notes" value={form.notes} onChange={handleChange('notes')}
                    className="input-field min-h-[100px] resize-y w-full"
                    placeholder="Additional notes or payment instructions..." rows={3} />
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Mobile-Sticky Save Button Container */}
          <div className="fixed bottom-[60px] left-0 right-0 p-4 bg-[var(--color-bg-primary)] border-t border-[var(--color-border)] z-20 flex justify-end gap-3 lg:static lg:left-[var(--sidebar-width)] lg:ml-auto lg:bg-transparent lg:border-none lg:p-0">
            <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary px-6 h-[38px]">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary px-8 flex items-center gap-2 h-[38px]">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>

        {toast && (
          <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}
            onClick={() => setToast(null)}>{toast.message}</div>
        )}
      </div>
    </div>
  );
}
