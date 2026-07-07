import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, GripVertical, Building2, CalendarDays, Plus, Save, Trash2, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

const DEFAULT_COLUMNS = [
  { key: "safety", label: "Safety", description: "безопасность" },
  { key: "quality", label: "Quality", description: "качество" },
  { key: "delivery", label: "Delivery", description: "сроки" },
  { key: "cost", label: "Cost", description: "стоимость" },
  { key: "people", label: "People", description: "персонал" },
];

const STATUS_LABELS = { todo: "К выполнению", in_progress: "В работе", done: "Готово" };
const STATUS_ICONS = { todo: Circle, in_progress: AlertCircle, done: CheckCircle2 };
const STATUS_COLORS = { todo: "#6b7280", in_progress: "#f59e0b", done: "#22c55e" };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRows(rows) {
  return rows.map((row, idx) => ({
    id: row.id || `new-${idx}`,
    department_id: row.department_id || null,
    team_name: row.team_name || `Команда ${idx + 1}`,
    head_name: row.head_name || "",
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
  const [deptForm, setDeptForm] = useState({ name: "", head_name: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  const [tasks, setTasks] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "todo", assignee: "", row_id: null, column_key: "safety" });
  const [editingTask, setEditingTask] = useState(null);
  const [filterColumn, setFilterColumn] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, deptsData, tasksData] = await Promise.all([api.getBoard(id), api.getDepartments(), api.getTasks(id)]);
      setBoard(data);
      setRows(normalizeRows(data.rows || []));
      setColumns(data.columns || DEFAULT_COLUMNS);
      setDepartments(deptsData);
      setTasks(tasksData || []);
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

  const handleDragStart = (idx) => (e) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== idx) {
      setDragOverIndex(idx);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (idx) => (e) => {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData("text/plain"));
    if (fromIdx !== idx) {
      const newRows = [...rows];
      const [moved] = newRows.splice(fromIdx, 1);
      newRows.splice(idx, 0, moved);
      setRows(newRows.map((row, i) => ({ ...row, position: i })));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const addDepartmentRow = (dept) => {
    if (rows.some((r) => r.department_id === dept.id)) return;
    setRows([
      ...rows,
      {
        id: `new-${Date.now()}`,
        department_id: dept.id,
        team_name: dept.name,
        head_name: dept.head_name || "",
        position: rows.length,
        safety: "", quality: "", delivery: "", cost: "", people: "",
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
      setDeptForm({ name: "", head_name: "" });
      setShowCreateDept(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const availableDepts = departments.filter((d) => !rows.some((r) => r.department_id === d.id));

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
          safety: row.safety, quality: row.quality, delivery: row.delivery, cost: row.cost, people: row.people,
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

  const getFilteredTasks = () => {
    return tasks.filter((t) => {
      if (filterColumn !== "all" && t.column_key !== filterColumn) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      return true;
    });
  };

  const openCreateTask = (rowId, colKey) => {
    setTaskForm({ title: "", description: "", status: "todo", assignee: "", row_id: rowId, column_key: colKey });
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setTaskForm({ title: task.title, description: task.description || "", status: task.status, assignee: task.assignee || "", row_id: task.row_id, column_key: task.column_key });
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const submitTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    try {
      if (editingTask) {
        await api.updateTask(id, editingTask.id, taskForm);
      } else {
        await api.createTask(id, taskForm);
      }
      setShowTaskModal(false);
      const tasksData = await api.getTasks(id);
      setTasks(tasksData || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Удалить задачу?")) return;
    await api.deleteTask(id, taskId);
    const tasksData = await api.getTasks(id);
    setTasks(tasksData || []);
  };

  const updateTaskStatus = async (task, newStatus) => {
    await api.updateTask(id, task.id, { status: newStatus });
    const tasksData = await api.getTasks(id);
    setTasks(tasksData || []);
  };

  const getRowName = (rowId) => {
    if (!rowId) return "Без строки";
    const row = rows.find((r) => String(r.id) === String(rowId));
    return row ? row.team_name : "Строка удалена";
  };

  if (loading) return <div className="loading-panel">Загрузка...</div>;
  if (error && !board) return <div className="form-error">{error}</div>;

  const filteredTasks = getFilteredTasks();

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
              <tr
                key={row.id}
                draggable
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOver(idx)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={
                  (dragIndex === idx ? "sqdcp-row-dragging" : "") +
                  (dragOverIndex === idx ? " sqdcp-row-drag-over" : "")
                }
              >
                <td className="team-cell">
                  <div className="team-cell-inner">
                    <span className="drag-handle" title="Перетащить для сортировки">
                      <GripVertical size={14} />
                    </span>
                    {row.department_id ? (
                      <div className="team-dept-name">
                        <Building2 size={16} style={{ verticalAlign: "middle", marginRight: 6, opacity: 0.6 }} />
                        <div>
                          <div>{row.team_name}</div>
                          {row.head_name && <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>{row.head_name}</div>}
                        </div>
                      </div>
                    ) : (
                      <input
                        value={row.team_name}
                        onChange={(e) => updateCell(idx, "team_name", e.target.value)}
                        aria-label={`Название строки ${idx + 1}`}
                      />
                    )}
                  </div>
                </td>
                {columns.map((column) => {
                  const cellTasks = tasks.filter((t) => t.row_id === row.id && t.column_key === column.key);
                  const visibleTasks = cellTasks.slice(0, 3);
                  const remaining = cellTasks.length - visibleTasks.length;
                  return (
                    <td key={column.key} className="sqdcp-edit-cell">
                      <textarea
                        value={row[column.key] || ""}
                        onChange={(e) => handleCellChange(idx, column.key, e)}
                        ref={(element) => { if (element) resizeTextarea(element); }}
                        aria-label={`${column.label}, ${row.team_name}`}
                      />
                      {visibleTasks.length > 0 && (
                        <div className="cell-tasks">
                          {visibleTasks.map((t) => {
                            const Icon = STATUS_ICONS[t.status] || Circle;
                            return (
                              <div key={t.id} className="cell-task-item" onClick={() => openEditTask(t)} title={STATUS_LABELS[t.status]}>
                                <Icon size={10} color={STATUS_COLORS[t.status]} />
                                <span>{t.title}</span>
                              </div>
                            );
                          })}
                          {remaining > 0 && (
                            <div className="cell-task-more">+{remaining}</div>
                          )}
                        </div>
                      )}
                      <button
                        className="task-badge"
                        onClick={() => openCreateTask(row.id, column.key)}
                        title="Добавить задачу"
                      >
                        <Plus size={10} />
                        {cellTasks.length > 0 && <span className="task-count">{cellTasks.length}</span>}
                      </button>
                    </td>
                  );
                })}
                <td className="row-action-cell">
                  <div className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => moveRow(idx, -1)} disabled={idx === 0}>
                      <ArrowLeft size={14} style={{ transform: "rotate(90deg)" }} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => moveRow(idx, 1)} disabled={idx === rows.length - 1}>
                      <ArrowLeft size={14} style={{ transform: "rotate(-90deg)" }} />
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

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
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
              <button className="add-dept-item add-dept-create" onClick={() => { setShowCreateDept(!showCreateDept); setDeptForm({ name: "", head_name: "" }); }}>
                + Создать новый отдел
              </button>
            </div>
          )}
          {showCreateDept && (
            <div className="dept-create-inline" style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="Название отдела" />
              <input value={deptForm.head_name} onChange={(e) => setDeptForm({ ...deptForm, head_name: e.target.value })} placeholder="Начальник (Фамилия И.О.)" />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={createDeptInline}>Создать</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreateDept(false)}>Отмена</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Трекер задач</h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <select className="input-sm" value={filterColumn} onChange={(e) => setFilterColumn(e.target.value)} style={{ fontSize: "0.78rem", padding: "3px 6px" }}>
              <option value="all">Все SQDCP</option>
              {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select className="input-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: "0.78rem", padding: "3px 6px" }}>
              <option value="all">Все статусы</option>
              <option value="todo">К выполнению</option>
              <option value="in_progress">В работе</option>
              <option value="done">Готово</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => openCreateTask(null, filterColumn === "all" ? "safety" : filterColumn)}>
              <Plus size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Задача
            </button>
          </div>
        </div>
        <div className="card-body" style={{ padding: "0.75rem" }}>
          {filteredTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Задач нет. Нажмите + на ячейке таблицы или кнопку «Задача».
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {filteredTasks.map((task) => {
                const StatusIcon = STATUS_ICONS[task.status] || Circle;
                return (
                  <div key={task.id} className="task-tracker-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", background: "var(--bg-primary)", borderRadius: 6, fontSize: "0.82rem" }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: 2, lineHeight: 1 }} onClick={() => updateTaskStatus(task, task.status === "done" ? "todo" : task.status === "todo" ? "in_progress" : "done")} title={STATUS_LABELS[task.status]}>
                      <StatusIcon size={14} color={STATUS_COLORS[task.status]} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: task.status === "done" ? 400 : 500, textDecoration: task.status === "done" ? "line-through" : "none", color: task.status === "done" ? "var(--text-secondary)" : "inherit" }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span>{DEFAULT_COLUMNS.find((c) => c.key === task.column_key)?.label || task.column_key}</span>
                        {task.row_id && <span>— {getRowName(task.row_id)}</span>}
                        {task.assignee && <span>— {task.assignee}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: 2, lineHeight: 1 }} onClick={() => openEditTask(task)} title="Редактировать">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: 2, lineHeight: 1 }} onClick={() => deleteTask(task.id)} title="Удалить">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>{editingTask ? "Редактировать задачу" : "Новая задача"}</h2>
            <form onSubmit={submitTask}>
              <div className="form-group">
                <label>Название</label>
                <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Статус</label>
                  <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                    <option value="todo">К выполнению</option>
                    <option value="in_progress">В работе</option>
                    <option value="done">Готово</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>SQDCP</label>
                  <select value={taskForm.column_key} onChange={(e) => setTaskForm({ ...taskForm, column_key: e.target.value })}>
                    {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Строка (отдел)</label>
                <select value={taskForm.row_id || ""} onChange={(e) => setTaskForm({ ...taskForm, row_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Без строки</option>
                  {rows.map((r) => <option key={r.id} value={r.id}>{r.team_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Исполнитель</label>
                <input value={taskForm.assignee} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })} placeholder="ФИО" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">{editingTask ? "Сохранить" : "Создать"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
