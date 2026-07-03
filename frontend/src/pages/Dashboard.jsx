import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Plus, Trash2, BarChart3, Users, CalendarDays, FileText } from "lucide-react";

export default function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", department_id: "" });
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    setBoards(await api.getBoards());
    setDepartments(await api.getDepartments());
  };

  useEffect(() => { load(); }, []);

  const createBoard = async (e) => {
    e.preventDefault();
    await api.createBoard({ ...form, department_id: form.department_id ? Number(form.department_id) : null });
    setShowModal(false);
    setForm({ title: "", description: "", department_id: "" });
    load();
  };

  const deleteBoard = async (e, id) => {
    e.stopPropagation();
    await api.deleteBoard(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Панель управления</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Добавить доску
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: "2rem" }}>
        <div className="card stat-card">
          <BarChart3 size={24} color="var(--accent)" style={{ marginBottom: 8 }} />
          <div className="stat-value">{boards.length}</div>
          <div className="stat-label">Доски</div>
        </div>
        <div className="card stat-card">
          <Users size={24} color="var(--accent)" style={{ marginBottom: 8 }} />
          <div className="stat-value">{departments.length}</div>
          <div className="stat-label">Отделы</div>
        </div>
        <div className="card stat-card">
          <CalendarDays size={24} color="var(--accent)" style={{ marginBottom: 8 }} />
          <div className="stat-value">{new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}</div>
          <div className="stat-label">Текущий день</div>
        </div>
        <div className="card stat-card">
          <FileText size={24} color="var(--accent)" style={{ marginBottom: 8 }} />
          <div className="stat-value">0</div>
          <div className="stat-label">Отчеты</div>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem", fontSize: "1.15rem" }}>Ваши доски</h2>
      {boards.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>Нет досок. Создайте первую!</p>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((b) => (
            <div key={b.id} className="card board-card" onClick={() => navigate(`/boards/${b.id}`)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h3>{b.title}</h3>
                <button className="btn btn-ghost btn-sm" onClick={(e) => deleteBoard(e, b.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <p>{b.description || "Нет описания"}</p>
              <div className="board-meta">
                ID: {b.id}
                {b.department_id && ` • Отдел: ${departments.find((d) => d.id === b.department_id)?.name || b.department_id}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Новая доска</h2>
            <form onSubmit={createBoard}>
              <div className="form-group">
                <label>Название</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Отдел</label>
                <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Без отдела</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
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
