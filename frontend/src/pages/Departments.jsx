import { useState, useEffect } from "react";
import { api } from "../api/client";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", head_name: "", deputy_name: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setDepartments(await api.getDepartments());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", head_name: "", deputy_name: "" });
    setShowModal(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm({ name: dept.name, description: dept.description, head_name: dept.head_name, deputy_name: dept.deputy_name });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await api.updateDepartment(editing.id, form);
      } else {
        await api.createDepartment(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteDepartment = async () => {
    if (!deleteTarget) return;
    await api.deleteDepartment(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Отделы</h1>
          <p className="page-subtitle">Управление отделами, начальниками и заместителями.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Добавить отдел
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="loading-panel">Загрузка...</div>
      ) : departments.length === 0 ? (
        <div className="card empty-state">
          <Building2 size={48} color="var(--text-secondary)" style={{ marginBottom: "1rem" }} />
          <p>Пока нет отделов.</p>
        </div>
      ) : (
        <table className="dept-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Описание</th>
              <th>Начальник</th>
              <th>Зам. начальника</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id}>
                <td><strong>{dept.name}</strong></td>
                <td className="dept-desc">{dept.description}</td>
                <td>{dept.head_name || "—"}</td>
                <td>{dept.deputy_name || "—"}</td>
                <td>
                  <div className="dept-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dept)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(dept)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? "Редактировать отдел" : "Новый отдел"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Название отдела" required autoFocus />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Описание отдела" />
              </div>
              <div className="form-group">
                <label>Начальник (Фамилия И.О.)</label>
                <input value={form.head_name} onChange={(e) => setForm({ ...form, head_name: e.target.value })} placeholder="Иванов И.И." />
              </div>
              <div className="form-group">
                <label>Зам. начальника (Фамилия И.О.)</label>
                <input value={form.deputy_name} onChange={(e) => setForm({ ...form, deputy_name: e.target.value })} placeholder="Петров П.П." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">{editing ? "Сохранить" : "Создать"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="Удалить отдел?"
          message={`Отдел "${deleteTarget.name}" будет удалён.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteDepartment}
        />
      )}
    </div>
  );
}
