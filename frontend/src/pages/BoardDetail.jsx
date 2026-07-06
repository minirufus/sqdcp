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
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const updateTeamName = (idx, value) => {
    setRows(rows.map((row, rowIdx) => rowIdx === idx ? { ...row, team_name: value } : row));
  };

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

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: `new-${Date.now()}`,
        team_name: `Команда ${rows.length + 1}`,
        position: rows.length,
        safety: "",
        quality: "",
        delivery: "",
        cost: "",
        people: "",
      },
    ]);
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

  const saveBoard = async () => {
    setSaving(true);
    setError("");
    try {
      const data = await api.updateBoard(id, {
        title: board.title,
        board_date: board.board_date || todayKey(),
        department_id: board.department_id || null,
        rows: rows.map((row, idx) => ({
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
            <label className="board-dept-select">
              Отдел
              <select value={board.department_id || ""} onChange={(e) => setBoard({ ...board, department_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Без отдела</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
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

      {board.department_name && (
        <div className="board-dept-info">
          <Building2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          <strong>{board.department_name}</strong>
          {board.department_head && (
            <span style={{ marginLeft: "1.5rem" }}>
              Начальник: {board.department_head}
            </span>
          )}
          {board.department_deputy && (
            <span style={{ marginLeft: "1.5rem" }}>
              Зам. начальника: {board.department_deputy}
            </span>
          )}
        </div>
      )}

      <div className="sqdcp-table-wrap">
        <table className="sqdcp-table">
          <thead>
            <tr>
              <th className="team-column">Команда</th>
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
                  <input
                    value={row.team_name}
                    onChange={(e) => updateTeamName(idx, e.target.value)}
                    aria-label={`Название команды ${idx + 1}`}
                  />
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
      <div className="board-bottom-actions">
        <button className="btn btn-ghost" onClick={addRow}>
          <Plus size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Добавить команду
        </button>
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
