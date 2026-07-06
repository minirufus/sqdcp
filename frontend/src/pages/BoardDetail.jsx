import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, ArrowDown, ArrowUp, Building2, CalendarDays, Plus, Save, Trash2 } from "lucide-react";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

const DEFAULT_COLUMNS = [
  { key: "safety", label: "Safety", description: "безопасность" },
  { key: "quality", label: "Quality", description: "качество" },
  { key: "delivery", label: "Delivery", description: "сроки" },
  { key: "cost", label: "Cost", description: "стоимость" },
  { key: "people", label: "People", description: "персонал" },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRows(rows) {
  return rows.map((row, idx) => ({
    id: row.id || `new-${idx}`,
    department_id: row.department_id || null,
    team_name: row.team_name || `Команда ${idx + 1}`,
    position: idx,
    safety: row.safety || "",
    quality: row.quality || "",
    delivery: row.delivery || "",
    cost: row.cost || "",
    people: row.people || "",
  }));
}

export default function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", head_name: "", deputy_name: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, deptsData] = await Promise.all([api.getBoard(id), api.getDepartments()]);
      setBoard(data);
      setRows(normalizeRows(data.rows || []));
      setColumns(data.columns || DEFAULT_COLUMNS);
      setDepartments(deptsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateCell = (idx, key, value) => {
    setRows(rows.map((row, rowIdx) => rowIdx === idx ? { ...row, [key]: value } : row));
  };

  const resizeTextarea = (element) => {
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  const handleCellChange = (idx, key, event) => {
    resizeTextarea(event.target);
    updateCell(idx, key, event.target.value);
  };

  const deleteRow = (idx) => {
    setRows(rows.filter((_, rowIdx) => rowIdx !== idx).map((row, rowIdx) => ({ ...row, position: rowIdx })));
  };

  const moveRow = (idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= rows.length) return;
    const newRows = [...rows];
    [newRows[idx], newRows[target]] = [newRows[target], newRows[idx]];
    setRows(newRows.map((row, i) => ({ ...row, position: i })));
  };

  const addDepartmentRow = (dept) => {
    if (rows.some((r) => r.department_id === dept.id)) return;
    setRows([
      ...rows,
      {
        id: `new-${Date.now()}`,
        department_id: dept.id,
        team_name: dept.name,
        position: rows.length,
        safety: "",
        quality: "",
        delivery: "",
        cost: "",
        people: "",
      },
    ]);
    setShowAddDept(false);
  };

  const createDeptInline = async (e) => {
    e.preventDefault();
    setError("");
    const name = deptForm.name.trim();
    if (!name) { setError("Введите название отдела"); return; }
    try {
      const created = await api.createDepartment(deptForm);
      const [data, deptsData] = await Promise.all([api.getBoard(id), api.getDepartments()]);
      setBoard(data);
      setRows(normalizeRows(data.rows || []));
      setDepartments(deptsData);
      addDepartmentRow(created);
      setDeptForm({ name: "", head_name: "", deputy_name: "" });
      setShowCreateDept(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const availableDepts = departments.filter(
    (d) => !rows.some((r) => r.department_id === d.id)
  );

  const saveBoard = async () => {
    setSaving(true);
    setError("");
    try {
      const data = await api.updateBoard(id, {
        title: board.title,
        board_date: board.board_date || todayKey(),
        rows: rows.map((row, idx) => ({
          department_id: row.department_id || null,
          team_name: row.team_name,
          position: idx,
          safety: row.safety,
          quality: row.quality,
          delivery: row.delivery,
          cost: row.cost,
          people: row.people,
        })),
      });
      setBoard(data);
      setRows(normalizeRows(data.rows || []));
      setColumns(data.columns || DEFAULT_COLUMNS);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrentBoard = async () => {
    await api.deleteBoard(id);
    setShowDeleteConfirm(false);
    navigate("/boards");
  };

  if (loading) return <div className="loading-panel">Загрузка...</div>;
  if (error && !board) return <div className="form-error">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/boards")}>
            <ArrowLeft size={18} />
          </button>
          <div className="board-edit-fields">
            <label>
              Название
              <textarea
                value={board.title}
                onChange={(e) => {
                  resizeTextarea(e.target);
                  setBoard({ ...board, title: e.target.value });
                }}
                ref={(element) => { if (element) resizeTextarea(element); }}
                aria-label="Название доски"
                rows={1}
              />
            </label>
          </div>
        </div>
        <div className="board-actions">
          <label className="date-picker-control">
            <CalendarDays size={18} />
            <input
              type="date"
              value={board.board_date || todayKey()}
              onChange={(e) => setBoard({ ...board, board_date: e.target.value })}
            />
          </label>
          <button className="btn btn-primary" onClick={saveBoard} disabled={saving}>
            <Save size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Удалить доску
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sqdcp-table-wrap">
        <table className="sqdcp-table">
          <thead>
            <tr>
              <th className="team-column">Отдел</th>
              {columns.map((column) => (
                <th key={column.key} className={`sqdcp-header sqdcp-header-${column.key}`}>
                  <span>{column.label}</span>
                  <small>{column.description}</small>
                </th>
              ))}
              <th className="row-action-column" aria-label="Действия"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id}>
                <td className="team-cell">
                  {row.department_id ? (
                    <div className="team-dept-name">
                      <Building2 size={16} style={{ verticalAlign: "middle", marginRight: 6, opacity: 0.6 }} />
                      {row.team_name}
                    </div>
                  ) : (
                    <input
                      value={row.team_name}
                      onChange={(e) => updateCell(idx, "team_name", e.target.value)}
                      aria-label={`Название строки ${idx + 1}`}
                    />
                  )}
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="sqdcp-edit-cell">
                    <textarea
                      value={row[column.key] || ""}
                      onChange={(e) => handleCellChange(idx, column.key, e)}
                      ref={(element) => { if (element) resizeTextarea(element); }}
                      aria-label={`${column.label}, ${row.team_name}`}
                    />
                  </td>
                ))}
                <td className="row-action-cell">
                  <div className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => moveRow(idx, -1)} disabled={idx === 0}>
                      <ArrowUp size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => moveRow(idx, 1)} disabled={idx === rows.length - 1}>
                      <ArrowDown size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteRow(idx)} disabled={rows.length <= 1}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="board-bottom-actions" style={{ display: "flex", gap: "0.75rem" }}>
        <div className="add-dept-wrap">
          <button className="btn btn-ghost" onClick={() => { setShowAddDept(!showAddDept); setShowCreateDept(false); }}>
            <Plus size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Добавить отдел
          </button>
          {showAddDept && (
            <div className="add-dept-dropdown">
              {availableDepts.length === 0 && departments.length === 0 && (
                <div className="add-dept-empty">Нет отделов. Создайте первый.</div>
              )}
              {availableDepts.map((d) => (
                <button key={d.id} className="add-dept-item" onClick={() => addDepartmentRow(d)}>
                  <Building2 size={16} />
                  <span>{d.name}</span>
                  {d.head_name && <span className="dept-item-head">{d.head_name}</span>}
                </button>
              ))}
              <button className="add-dept-item add-dept-create" onClick={() => { setShowCreateDept(!showCreateDept); setDeptForm({ name: "", head_name: "", deputy_name: "" }); }}>
                + Создать новый отдел
              </button>
            </div>
          )}
          {showCreateDept && (
            <div className="dept-create-inline" style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="Название отдела" />
              <input value={deptForm.head_name} onChange={(e) => setDeptForm({ ...deptForm, head_name: e.target.value })} placeholder="Начальник (Фамилия И.О.)" />
              <input value={deptForm.deputy_name} onChange={(e) => setDeptForm({ ...deptForm, deputy_name: e.target.value })} placeholder="Зам. начальника (опционально)" />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={createDeptInline}>Создать</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreateDept(false)}>Отмена</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDeleteModal
          title="Удалить доску?"
          message={`Доска "${board.title}" будет удалена без возможности восстановления.`}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={deleteCurrentBoard}
        />
      )}
    </div>
  );
}
