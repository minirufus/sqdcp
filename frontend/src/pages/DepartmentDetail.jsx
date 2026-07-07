import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Building2 } from "lucide-react";

const SQDCP_LABELS = {
  safety: "Безопасность",
  quality: "Качество",
  delivery: "Сроки",
  cost: "Стоимость",
  people: "Персонал",
};

export default function DepartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [deptsData, rowsData] = await Promise.all([
          api.getDepartments(),
          api.getBoardRowsByDepartment(id),
        ]);
        const dept = deptsData.find((d) => d.id === Number(id));
        if (dept) setDepartment(dept);
        else setError("Отдел не найден");
        setRows(rowsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

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
            <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Building2 size={24} />
              {department?.name}
            </h1>
            <p className="page-subtitle">
              {department?.head_name && `Начальник: ${department.head_name}`}
            </p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card empty-state">
          <Building2 size={48} color="var(--text-secondary)" style={{ marginBottom: "1rem" }} />
          <p>У этого отдела пока нет задач в досках.</p>
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
                  {Object.keys(SQDCP_LABELS).map((key) => (
                    <td key={key} className="sqdcp-edit-cell" style={{ textAlign: "center" }}>
                      {row[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
