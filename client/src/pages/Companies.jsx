import { useState, useEffect, useMemo } from 'react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../lib/firestore';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import CompanyTable from '../components/CompanyTable';
import { Building2, Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

const PAGE_SIZE = 10;

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      setError('Failed to load companies. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function showToastMsg(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  const filtered = companies.filter(
    (c) =>
      (c.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function openAdd() {
    setForm({ company_name: '', contact_name: '', email: '', phone: '', address: '' });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(c) {
    setForm({
      company_name: c.company_name || '',
      contact_name: c.contact_name || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
    });
    setEditing(c.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.company_name.trim()) {
      showToastMsg('error', 'Company name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCompany(editing, form);
        showToastMsg('success', 'Company updated!');
      } else {
        await createCompany(form);
        showToastMsg('success', 'Company added!');
      }
      closeForm();
      await loadCompanies();
    } catch (err) {
      showToastMsg('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteCompany(id);
      showToastMsg('success', 'Company deleted');
      await loadCompanies();
    } catch (err) {
      showToastMsg('error', err.message);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <div className="page-header-inner">
            <div className="skeleton h-8 w-40 mb-2" />
            <div className="skeleton h-4 w-32" />
          </div>
        </header>
        <div className="page-content">
          <div className="skeleton h-[400px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell flex flex-col items-center justify-center py-16 text-center page-content">
        <AlertCircle size={48} className="text-[var(--color-danger)] mb-4" strokeWidth={1} />
        <p className="text-[var(--color-text-secondary)] text-lg mb-4">{error}</p>
        <button type="button" onClick={loadCompanies} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader title="Companies" subtitle={`${companies.length} saved compan${companies.length !== 1 ? 'ies' : 'y'}`}>
        <button type="button" onClick={openAdd} className="btn-primary h-10 px-5 text-sm shrink-0" id="add-company-btn">
          <Plus size={16} /> New Company
        </button>
      </PageHeader>

      <div className="page-content">
        <div className="toolbar-card">
          <div className="search-input-wrap flex-1">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              id="search-companies"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16 flex flex-col items-center">
            <Building2 size={48} className="text-[var(--color-text-muted)] mb-4" strokeWidth={1} />
            <p className="text-[var(--color-text-primary)] font-semibold mb-1">
              {search ? 'No companies match your search' : 'No companies saved yet'}
            </p>
            {!search && (
              <>
                <p className="text-[var(--color-text-secondary)] text-sm mb-6">
                  Add your first company to auto-fill invoice details
                </p>
                <button type="button" onClick={openAdd} className="btn-primary">
                  <Plus size={16} /> Add Company
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="card card-flush">
            <CompanyTable companies={paginated} onEdit={openEdit} onDelete={handleDelete} />
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              itemLabel="companies"
            />
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  {editing ? (
                    <Edit2 size={18} className="text-[var(--color-accent)]" />
                  ) : (
                    <Plus size={18} className="text-[var(--color-accent)]" />
                  )}
                  {editing ? 'Edit Company' : 'Add Company'}
                </h2>
                <button type="button" onClick={closeForm} className="btn-icon" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                    className="input-field"
                    placeholder="Company name"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Contact Name</label>
                    <input
                      type="text"
                      value={form.contact_name}
                      onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                      className="input-field"
                      placeholder="Contact person"
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="input-field"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="input-field"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="form-label">Address</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    className="input-field min-h-[80px] resize-y"
                    placeholder="Full address"
                    rows={2}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 mt-2 border-t border-[var(--color-border)]">
                  <button type="button" onClick={closeForm} className="btn-secondary sm:w-1/3">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary sm:flex-1 justify-center">
                    {saving ? 'Saving...' : editing ? 'Update Company' : 'Add Company'}
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
