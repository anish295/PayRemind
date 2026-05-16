import { useState, useEffect } from 'react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../lib/firestore';
import { Building2, Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    setLoading(true); setError(null);
    try { const data = await getCompanies(); setCompanies(data); }
    catch (err) { setError('Failed to load companies. Please try again.'); console.error(err); }
    finally { setLoading(false); }
  }

  function showToastMsg(type, message) { setToast({ type, message }); setTimeout(() => setToast(null), 4000); }

  const filtered = companies.filter(c =>
    (c.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()));

  function openAdd() { setForm({ company_name: '', contact_name: '', email: '', phone: '', address: '' }); setEditing(null); setShowForm(true); }
  function openEdit(c) { setForm({ company_name: c.company_name || '', contact_name: c.contact_name || '', email: c.email || '', phone: c.phone || '', address: c.address || '' }); setEditing(c.id); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.company_name.trim()) { showToastMsg('error', 'Company name is required'); return; }
    setSaving(true);
    try {
      if (editing) { await updateCompany(editing, form); showToastMsg('success', 'Company updated!'); }
      else { await createCompany(form); showToastMsg('success', 'Company added!'); }
      closeForm(); await loadCompanies();
    } catch (err) { showToastMsg('error', err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await deleteCompany(id); showToastMsg('success', 'Company deleted'); await loadCompanies(); }
    catch (err) { showToastMsg('error', err.message); }
  }

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
          <div className="space-y-8">
            <div className="skeleton h-[400px] w-full rounded-[var(--radius-md)]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={48} className="text-[var(--color-danger)] mb-4" strokeWidth={1} />
        <p className="text-[var(--color-text-secondary)] text-lg mb-4">{error}</p>
        <button onClick={loadCompanies} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* TOPBAR */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shrink-0">
        <div className="max-w-[1200px] w-full mx-auto py-[16px] px-[32px] flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)] leading-tight">Companies</h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">{companies.length} saved compan{companies.length !== 1 ? 'ies' : 'y'}</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-[1200px] w-full mx-auto py-[28px] px-[32px] flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-0 max-w-lg w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full h-[36px] pl-[36px] pr-[12px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[6px] text-[13px] focus:outline-none focus:border-amber-500 transition-colors" 
              id="search-companies" 
            />
          </div>
          <button onClick={openAdd} className="btn-primary py-[8px] px-[16px] text-[13px] flex items-center justify-center gap-2 h-[36px] w-full md:w-auto shrink-0" id="add-company-btn">
            <Plus size={16} /> Add Company
          </button>
        </div>

        {/* Table / Mobile Cards */}
        {filtered.length === 0 ? (
          <div className="card text-center py-16 flex flex-col items-center">
            <Building2 size={48} className="text-[var(--color-text-muted)] mb-4" strokeWidth={1} />
            <p className="text-[var(--color-text-primary)] font-medium mb-1">
              {search ? 'No companies match your search' : 'No companies saved yet'}
            </p>
            {!search && (
              <p className="text-[var(--color-text-secondary)] text-sm mb-6">Add your first company to auto-fill invoice details</p>
            )}
            {!search && (
              <button onClick={openAdd} className="btn-primary">
                <Plus size={16} /> Add Company
              </button>
            )}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-6 py-4 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-bg-tertiary)] transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{c.company_name}</p>
                        {c.contact_name && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{c.contact_name}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">{c.email || '—'}</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">{c.phone || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => openEdit(c)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(c.id, c.company_name)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {filtered.map(c => (
                <div key={c.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{c.company_name}</h3>
                      {c.contact_name && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{c.contact_name}</p>}
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => openEdit(c)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors p-1" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id, c.company_name)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors p-1" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {(c.email || c.phone) && (
                    <div className="flex flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  {editing ? <Edit2 size={18} className="text-[var(--color-accent)]" /> : <Plus size={18} className="text-[var(--color-accent)]" />}
                  {editing ? 'Edit Company' : 'Add Company'}
                </h2>
                <button onClick={closeForm} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="form-label">Company Name *</label>
                  <input type="text" value={form.company_name} onChange={(e) => setForm(p => ({ ...p, company_name: e.target.value }))} className="input-field" placeholder="Company name" autoFocus />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Contact Name</label>
                    <input type="text" value={form.contact_name} onChange={(e) => setForm(p => ({ ...p, contact_name: e.target.value }))} className="input-field" placeholder="Contact person" />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className="input-field" placeholder="email@example.com" />
                  </div>
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} className="input-field" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="form-label">Address</label>
                  <textarea value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} className="input-field min-h-[80px] resize-y" placeholder="Full address" rows={2} />
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 mt-2 border-t border-[var(--color-border)]">
                  <button type="button" onClick={closeForm} className="btn-secondary sm:w-1/3">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary sm:w-2/3 flex justify-center items-center">
                    {saving ? 'Saving...' : (editing ? 'Update Company' : 'Add Company')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {toast && (
          <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`} onClick={() => setToast(null)}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
