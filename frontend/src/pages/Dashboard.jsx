import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Plus, Columns3, Trash2 } from "lucide-react";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

export default function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [boardToDelete, setBoardToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [boardsData, deptsData] = await Promise.all([api.getBoards(), api.getDepartments()]);
      setBoards(boardsData);
      setDepartments(deptsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleDept = (deptId) => {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const createBoard = async (e) => {
    e.preventDefault();
    setError("");
    const board = await api.createBoard({
      title: title.trim() || "Новая SQDCP-доска",
      department_ids: selectedDepts,
    });
    setShowModal(false);
    setTitle("");
    setSelectedDepts([]);
    navigate(`/boards/${board.id}`);
  };

  const [deptForm, setDeptForm] = useState({ name: "", head_name: "", deputy_name: "" });
  const [showDeptForm, setShowDeptForm] = useState(false);

  const openCreateModal = () => {
    setSelectedDepts([]);
    setTitle("");
    setDeptForm({ name: "", head_name: "", deputy_name: "" });
    setShowDeptForm(false);
    setShowModal(true);
  };

  const createDeptInline = async (e) => {
    e.preventDefault();
    setError("");
    const name = deptForm.name.trim();
    if (!name) { setError("Введите название отдела"); return; }
    const created = await api.createDepartment(deptForm);
    await load();
    setSelectedDepts((prev) => [...prev, created.id]);
    setDeptForm({ name: "", head_name: "", deputy_name: "" });
    setShowDeptForm(false);
  };

  const deleteBoard = async () => {
    if (!boardToDelete) return;
    await api.deleteBoard(boardToDelete.id);
    setBoardToDelete(null);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>SQDCP-доски</h1>
          <p className="page-subtitle">Выберите доску или создайте новую таблицу команд.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Создать доску
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="loading-panel">Загрузка...</div>
      ) : boards.length === 0 ? (
        <div className="card empty-state">
          <Columns3 size={48} color="var(--text-secondary)" style={{ marginBottom: "1rem" }} />
          <p>Пока нет SQDCP-досок.</p>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => (
            <div key={board.id} className="card board-card board-card-button" onClick={() => navigate(`/boards/${board.id}`)} role="button" tabIndex={0}>
              <div className="board-card-title-area">
                <h3>{board.title}</h3>
              </div>
              <div className="board-card-footer">
                <button
                  className="btn btn-ghost btn-sm delete-icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBoardToDelete(board);
                  }}
                  aria-label={`Удалить доску ${board.title}`}
                >
                  <Trash2 size={14} />
                </button>
                <div className="board-meta">ID: {board.id}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Новая SQDCP-доска</h2>
            <form onSubmit={createBoard}>
              <div className="form-group">
                <label>Название</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Проект внедрения"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Отделы (строки таблицы)</label>
                {departments.length > 0 ? (
                  <div className="dept-checklist">
                    {departments.map((d) => (
                      <label key={d.id} className="dept-check-item">
                        <input
                          type="checkbox"
                          checked={selectedDepts.includes(d.id)}
                          onChange={() => toggleDept(d.id)}
                        />
                        <span>{d.name}</span>
                        {d.head_name && <span className="dept-check-head">{d.head_name}</span>}
                      </label>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: "0.35rem" }} onClick={() => { setShowDeptForm(!showDeptForm); setDeptForm({ name: "", head_name: "", deputy_name: "" }); }}>
                      + Создать новый отдел
                    </button>
                  </div>
                ) : (
                  <div className="dept-create-inline">
                    <p className="text-secondary" style={{ marginBottom: "0.5rem" }}>Отделов пока нет. Создайте первый отдел:</p>
                    <input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="Название отдела" />
                    <input value={deptForm.head_name} onChange={(e) => setDeptForm({ ...deptForm, head_name: e.target.value })} placeholder="Начальник (Фамилия И.О.)" />
                    <input value={deptForm.deputy_name} onChange={(e) => setDeptForm({ ...deptForm, deputy_name: e.target.value })} placeholder="Зам. начальника (опционально)" />
                    <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }} onClick={createDeptInline}>Создать отдел</button>
                  </div>
                )}
                {showDeptForm && departments.length > 0 && (
                  <div className="dept-create-inline" style={{ marginTop: "0.5rem" }}>
                    <input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="Название отдела" />
                    <input value={deptForm.head_name} onChange={(e) => setDeptForm({ ...deptForm, head_name: e.target.value })} placeholder="Начальник (Фамилия И.О.)" />
                    <input value={deptForm.deputy_name} onChange={(e) => setDeptForm({ ...deptForm, deputy_name: e.target.value })} placeholder="Зам. начальника (опционально)" />
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button type="button" className="btn btn-primary btn-sm" onClick={createDeptInline}>Создать</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDeptForm(false)}>Отмена</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={selectedDepts.length === 0}>Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {boardToDelete && (
        <ConfirmDeleteModal
          title="Удалить доску?"
          message={`Доска "${boardToDelete.title}" будет удалена без возможности восстановления.`}
          onCancel={() => setBoardToDelete(null)}
          onConfirm={deleteBoard}
        />
      )}
    </div>
  );
}
