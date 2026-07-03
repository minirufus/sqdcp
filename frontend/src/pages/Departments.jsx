import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { UserContext } from "../App";
import { Plus, Trash2, Building2, Eye, Lock, UserPlus } from "lucide-react";

export default function Departments() {
  const user = useContext(UserContext);
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const canCreate = user.role === "admin" || user.role === "manager";
  const canJoin = user.role === "user" || user.role === "viewer";

  const load = async () => setDepartments(await api.getDepartments());
  useEffect(() => { load(); }, []);

  const createDept = async (e) => {
    e.preventDefault();
    await api.createDepartment(form);
    setShowModal(false);
    setForm({ name: "", description: "" });
    load();
  };

  const deleteDept = async (id) => {
    await api.deleteDepartment(id);
    load();
  };

  const handleJoin = async (deptId, e) => {
    e.stopPropagation();
    try {
      await api.joinDepartment(deptId);
      alert("Заявка отправлена! Ожидайте подтверждения администратора.");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Отделы</h1>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Добавить отдел
          </button>
        )}
      </div>

      {departments.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <Building2 size={48} color="var(--text-secondary)" style={{ marginBottom: "1rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>Нет отделов. Создайте первый отдел!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {departments.map((d) => (
            <div key={d.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{ cursor: d.is_own || user.role === "admin" || user.role === "manager" ? "pointer" : "default", flex: 1 }}
                onClick={() => {
                  if (d.is_own || user.role === "admin" || user.role === "manager") {
                    navigate(`/departments/${d.id}`);
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <h3>{d.name}</h3>
                  {d.is_own && <span style={{ fontSize: "0.7rem", background: "var(--accent-light)", color: "var(--accent)", padding: "2px 6px", borderRadius: 4 }}>Мой отдел</span>}
                  {!d.is_own && user.role !== "admin" && user.role !== "manager" && (
                    <Lock size={14} color="var(--text-secondary)" />
                  )}
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{d.description || "Нет описания"}</p>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  {d.boards_count} досок • {d.users_count} сотрудников
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {(d.is_own || user.role === "admin" || user.role === "manager") && (
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/departments/${d.id}`)}>
                    <Eye size={14} />
                  </button>
                )}
                {canJoin && !user.department_id && !d.is_own && (
                  <button className="btn btn-primary btn-sm" onClick={(e) => handleJoin(d.id, e)}>
                    <UserPlus size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Присоединиться
                  </button>
                )}
                {(d.can_edit) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteDept(d.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Новый отдел</h2>
            <form onSubmit={createDept}>
              <div className="form-group">
                <label>Название</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
