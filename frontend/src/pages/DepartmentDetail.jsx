import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Circle, CheckCircle2, AlertCircle } from "lucide-react";

const SQDCP_LABELS = {
  safety: "Безопасность",
  quality: "Качество",
  delivery: "Сроки",
  cost: "Стоимость",
  people: "Персонал",
};

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

      {rows.length === 0 ? (
        <div className="card empty-state">
          <p>У этого отдела пока нет записей в досках.</p>
        </div>
      ) : (
        <div className="sqdcp-table-wrap">
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
                    </button>
                  </td>
                  <td className="dept-detail-date">{row.board_date || "—"}</td>
                  {Object.keys(SQDCP_LABELS).map((key) => {
                    const cellTasks = getCellTasks(row.id, key);
                    const visibleTasks = cellTasks.slice(0, 3);
                    const remaining = cellTasks.length - visibleTasks.length;
                    return (
                      <td key={key} className="sqdcp-edit-cell">
                        {cellTasks.length > 0 && (
                          <div className="cell-tasks">
                            {visibleTasks.map((t) => {
                              const Icon = STATUS_ICONS[t.status] || Circle;
                              return (
                                <div key={t.id} className="cell-task-item" title={t.title}>
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
                        {cellTasks.length === 0 && <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}