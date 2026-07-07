import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Circle, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

const SQDCP_LABELS = {
  safety: "Безопасность",
  quality: "Качество",
  delivery: "Сроки",
  cost: "Стоимость",
  people: "Персонал",
};

const STATUS_LABELS = { todo: "К выполнению", in_progress: "В работе", done: "Готово" };
const STATUS_ICONS = { todo: Circle, in_progress: AlertCircle, done: CheckCircle2 };
const STATUS_COLORS = { todo: "#6b7280", in_progress: "#f59e0b", done: "#22c55e" };

export default function DepartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [rows, setRows] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingTask, setViewingTask] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [deptsData, rowsData, tasksData] = await Promise.all([
          api.getDepartments(),
          api.getBoardRowsByDepartment(id),
          api.getTasksByDepartment(id),
        ]);
        const dept = deptsData.find((d) => d.id === Number(id));
        if (dept) setDepartment(dept);
        else setError("Отдел не найден");
        setRows(rowsData);
        setTasks(tasksData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const getCellTasks = (rowId, colKey) => {
    return tasks.filter((t) => t.row_id === rowId && t.column_key === colKey);
  };

  const getRowName = (rowId) => {
    const row = rows.find((r) => r.id === rowId);
    return row?.team_name || row?.board_title || "—";
  };

  const getBoardName = (boardId) => {
    for (const row of rows) {
      if (row.board_id === boardId) return row.board_title;
    }
    return "—";
  };

  if (loading) return <div className="loading-panel">Загрузка...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/departments")}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{department?.name}</h1>
            <p className="page-subtitle">
              {department?.head_name && `Начальник: ${department.head_name}`}
            </p>
          </div>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="sqdcp-table-wrap" style={{ marginBottom: "1.5rem" }}>
          <table className="sqdcp-table dept-detail-table">
            <thead>
              <tr>
                <th>Проект</th>
                <th>Дата</th>
                {Object.entries(SQDCP_LABELS).map(([key, label]) => (
                  <th key={key} className={`sqdcp-header sqdcp-header-${key}`}>
                    <span>{label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button className="link-btn" onClick={() => navigate(`/boards/${row.board_id}`)}>
                      {row.board_title}
                      <ExternalLink size={12} style={{ marginLeft: 6, opacity: 0.5 }} />
                    </button>
                  </td>
                  <td className="dept-detail-date">{row.board_date || "—"}</td>
                  {Object.keys(SQDCP_LABELS).map((key) => {
                    const cellTasks = getCellTasks(row.id, key);
                    const visibleTasks = cellTasks.slice(0, 3);
                    const remaining = cellTasks.length - visibleTasks.length;
                    return (
                      <td key={key} className="sqdcp-edit-cell">
                        {cellTasks.length > 0 ? (
                          <div className="cell-tasks">
                            {visibleTasks.map((t) => {
                              const Icon = STATUS_ICONS[t.status] || Circle;
                              return (
                                <div key={t.id} className="cell-task-item" onClick={() => setViewingTask(t)} title={STATUS_LABELS[t.status]}>
                                  <Icon size={10} color={STATUS_COLORS[t.status]} />
                                  <span>{t.title}</span>
                                </div>
                              );
                            })}
                            {remaining > 0 && (
                              <div className="cell-task-more">+{remaining}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty-state" style={{ marginBottom: "1.5rem" }}>
          <p>У этого отдела пока нет записей в досках.</p>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Задачи отдела</h2>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Всего: {tasks.length}
          </span>
        </div>
        <div className="card-body" style={{ padding: "0.75rem" }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Нет задач.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {tasks.map((task) => {
                const StatusIcon = STATUS_ICONS[task.status] || Circle;
                return (
                  <div key={task.id} className="task-tracker-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", background: "var(--bg-primary)", borderRadius: 6, fontSize: "0.82rem", cursor: "pointer" }} onClick={() => setViewingTask(task)}>
                    <StatusIcon size={14} color={STATUS_COLORS[task.status]} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: task.status === "done" ? 400 : 500, textDecoration: task.status === "done" ? "line-through" : "none", color: task.status === "done" ? "var(--text-secondary)" : "inherit" }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span>{SQDCP_LABELS[task.column_key] || task.column_key}</span>
                        <span>— {getRowName(task.row_id)}</span>
                        <button className="link-btn" style={{ fontSize: "0.7rem" }} onClick={(e) => { e.stopPropagation(); navigate(`/boards/${task.board_id}`); }}>
                          {getBoardName(task.board_id)}
                          <ExternalLink size={10} style={{ marginLeft: 3 }} />
                        </button>
                        {task.assignee && <span>— {task.assignee}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {viewingTask && (
        <div className="modal-overlay" onClick={() => setViewingTask(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, width: "100%" }}>
            <h2>{viewingTask.title}</h2>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <span>Статус: <strong>{STATUS_LABELS[viewingTask.status]}</strong></span>
              <span>|</span>
              <span>{SQDCP_LABELS[viewingTask.column_key] || viewingTask.column_key}</span>
              {viewingTask.row_id && <><span>|</span><span>{getRowName(viewingTask.row_id)}</span></>}
              {viewingTask.assignee && <><span>|</span><span>Исполнитель: {viewingTask.assignee}</span></>}
            </div>
            <div style={{ fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text-primary)", whiteSpace: "pre-wrap", marginBottom: "1rem", padding: "0.75rem", background: "var(--bg-primary)", borderRadius: 8, border: "1px solid var(--border)", minHeight: "80px" }}>
              {viewingTask.description || "Нет описания."}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setViewingTask(null)}>Закрыть</button>
              <button className="btn btn-primary" onClick={() => { setViewingTask(null); navigate(`/boards/${viewingTask.board_id}`); }}>
                Открыть в доске
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}