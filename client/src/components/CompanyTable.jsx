import { Building2, Edit2, Trash2 } from 'lucide-react';

const AVATAR_CLASSES = ['company-avatar-purple', 'company-avatar-green', 'company-avatar-blue'];

function avatarClass(index) {
  return AVATAR_CLASSES[index % AVATAR_CLASSES.length];
}

export default function CompanyTable({ companies, onEdit, onDelete }) {
  if (!companies || companies.length === 0) {
    return null;
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className={`company-avatar ${avatarClass(i)}`}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{c.company_name}</p>
                      {c.contact_name && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{c.contact_name}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="text-sm text-[var(--color-text-secondary)]">{c.email || '—'}</td>
                <td className="text-sm text-[var(--color-text-secondary)]">{c.phone || '—'}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => onEdit(c)} className="btn-icon" title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id, c.company_name)}
                      className="btn-icon btn-icon-danger"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 p-4 md:hidden">
        {companies.map((c, i) => (
          <div key={c.id} className="card p-4">
            <div className="flex justify-between items-start gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`company-avatar ${avatarClass(i)}`}>
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{c.company_name}</p>
                  {c.contact_name && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{c.contact_name}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => onEdit(c)} className="btn-icon" title="Edit">
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c.id, c.company_name)}
                  className="btn-icon btn-icon-danger"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {(c.email || c.phone) && (
              <div className="flex justify-between items-end gap-3 text-xs text-[var(--color-text-muted)]">
                <span className="truncate">{c.email || '—'}</span>
                <span className="shrink-0">{c.phone || ''}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

