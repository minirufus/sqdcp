import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { UserContext } from "../App";
import { ArrowLeft, Users, Columns3, Edit3 } from "lucide-react";

export default function DepartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useContext(UserContext);
  const [dept, setDept] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const canEdit = user.role === "admin" || user.department_id === Number(id);

  const load = async () => {
    const d = await api.getDepartment(id);
    setDept(d);
    setForm({ name: d.name, description: d.description });
  };

  useEffect(() => { load(); }, [id]);

  const saveDept = async (e) => {
    e.preventDefault();
    await api.updateDepartment(id, form);
    setEditing(false);
    load();
  };

  if (!dept) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/departments")}>
            <ArrowLeft size={18} />
          </button>
          <h1>{dept.name}</h1>
        </div>
        {canEdit && !editing && (
          <button className="btn btn-ghost" onClick={() => setEditing(true)}>
            <Edit3 size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Редактировать
          </button>
        )}
      </div>

      {editing ? (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <form onSubmit={saveDept}>
            <div className="form-group">
              <label>Название</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Описание</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Отмена</button>
              <button type="submit" className="btn btn-primary">Сохранить</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>{dept.description || "Нет описания"}</p>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: "1.5rem" }}>
        <div className="card stat-card">
          <Users size={24} color="var(--accent)" style={{ marginBottom: 8 }} />
          <div className="stat-value">{dept.users?.length || 0}</div>
          <div className="stat-label">Сотрудники</div>
        </div>
        <div className="card stat-card">
          <Columns3 size={24} color="var(--accent)" style={{ marginBottom: 8 }} />
          <div className="stat-value">{dept.boards?.length || 0}</div>
          <div className="stat-label">Доски</div>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem", fontSize: "1.15rem" }}>Сотрудники</h2>
      {dept.users?.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>Нет сотрудников в этом отделе</p>
      ) : (
        <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {dept.users?.map((u) => (
            <div key={u.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }}>
              <span>{u.username}</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{u.role}</span>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginBottom: "1rem", fontSize: "1.15rem" }}>Доски</h2>
      {dept.boards?.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>Нет досок в этом отделе</p>
      ) : (
        <div className="boards-grid">
          {dept.boards?.map((b) => (
            <div key={b.id} className="card board-card" onClick={() => navigate(`/boards/${b.id}`)}>
              <h3>{b.title}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
