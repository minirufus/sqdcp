import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { UserContext } from "../App";
import { Plus, Trash2, ArrowLeft, Settings, PlusCircle, MinusCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const sampleData = [
  { name: "Янв", value: 400 }, { name: "Фев", value: 300 }, { name: "Мар", value: 600 },
  { name: "Апр", value: 800 }, { name: "Май", value: 500 }, { name: "Июн", value: 700 },
];

function ChartRenderer({ chart }) {
  const config = (() => { try { return JSON.parse(chart.config); } catch { return {}; } })();
  const data = config.data || sampleData;
  const columns = config.columns || ["value"];
  const type = chart.chart_type;
  const commonProps = { data, margin: { top: 5, right: 20, left: 0, bottom: 5 } };

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3f54" />
            <XAxis dataKey="name" stroke="#8899aa" fontSize={12} />
            <YAxis stroke="#8899aa" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1b2838", border: "1px solid #2a3f54", borderRadius: 8 }} />
            {columns.map((col, idx) => (
              <Bar key={col} dataKey={col} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3f54" />
            <XAxis dataKey="name" stroke="#8899aa" fontSize={12} />
            <YAxis stroke="#8899aa" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1b2838", border: "1px solid #2a3f54", borderRadius: 8 }} />
            {columns.map((col, idx) => (
              <Line key={col} type="monotone" dataKey={col} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ fill: COLORS[idx % COLORS.length] }} />
            ))}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3f54" />
            <XAxis dataKey="name" stroke="#8899aa" fontSize={12} />
            <YAxis stroke="#8899aa" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1b2838", border: "1px solid #2a3f54", borderRadius: 8 }} />
            {columns.map((col, idx) => (
              <Area key={col} type="monotone" dataKey={col} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.2} />
            ))}
          </AreaChart>
        );
      case "pie":
        return (
          <PieChart>
            <Pie data={data} dataKey={columns[0] || "value"} nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#1b2838", border: "1px solid #2a3f54", borderRadius: 8 }} />
          </PieChart>
        );
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3f54" />
            <XAxis dataKey="name" stroke="#8899aa" fontSize={12} />
            <YAxis stroke="#8899aa" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1b2838", border: "1px solid #2a3f54", borderRadius: 8 }} />
            {columns.map((col, idx) => (
              <Bar key={col} dataKey={col} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="card" style={{ padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ fontSize: "0.95rem" }}>{chart.title}</h3>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", background: "var(--accent-light)", padding: "2px 8px", borderRadius: 4 }}>
          {chart.chart_type === "bar" ? "Столбчатая" : chart.chart_type === "line" ? "Линейная" : chart.chart_type === "area" ? "Область" : chart.chart_type === "pie" ? "Круговая" : chart.chart_type}
        </span>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">{renderChart()}</ResponsiveContainer>
      </div>
    </div>
  );
}

export default function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useContext(UserContext);
  const [board, setBoard] = useState(null);
  const [charts, setCharts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [form, setForm] = useState({ title: "", chart_type: "bar", config: "" });
  const [valueColumns, setValueColumns] = useState(["value"]);
  const [dataRows, setDataRows] = useState([{ name: "", value: "" }]);

  const canEdit = board?.can_edit && user?.role !== "viewer";

  const load = async () => {
    const b = await api.getBoards();
    const found = b.find((x) => x.id === Number(id));
    setBoard(found);
    setCharts(await api.getCharts(id));
  };

  useEffect(() => { load(); }, [id]);

  const buildConfig = () => {
    const rows = dataRows.filter((r) => r.name.trim() !== "");
    if (rows.length === 0) return "{}";
    const data = rows.map((r) => {
      const entry = { name: r.name };
      valueColumns.forEach((col) => { entry[col] = Number(r[col]) || 0; });
      return entry;
    });
    return JSON.stringify({ columns: valueColumns, data });
  };

  const createChart = async (e) => {
    e.preventDefault();
    await api.createChart(id, { ...form, config: buildConfig() });
    setShowCreate(false);
    resetForm();
    load();
  };

  const updateChart = async (e) => {
    e.preventDefault();
    await api.updateChart(id, showEdit.id, { ...form, config: buildConfig() });
    setShowEdit(null);
    resetForm();
    load();
  };

  const deleteChart = async (chartId) => {
    await api.deleteChart(id, chartId);
    load();
  };

  const resetForm = () => {
    setForm({ title: "", chart_type: "bar", config: "" });
    setValueColumns(["value"]);
    setDataRows([{ name: "", value: "" }]);
  };

  const openEdit = (chart) => {
    setForm({ title: chart.title, chart_type: chart.chart_type, config: chart.config });
    const parsed = (() => { try { return JSON.parse(chart.config); } catch { return {}; } })();
    const cols = parsed.columns || ["value"];
    setValueColumns(cols);
    const existing = (parsed.data || []).map((d) => {
      const row = { name: d.name };
      cols.forEach((col) => { row[col] = String(d[col] ?? ""); });
      return row;
    });
    setDataRows(existing.length > 0 ? existing : [{ name: "", ...Object.fromEntries(cols.map((c) => [c, ""])) }]);
    setShowEdit(chart);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const addRow = () => {
    const newRow = { name: "", ...Object.fromEntries(valueColumns.map((c) => [c, ""])) };
    setDataRows([...dataRows, newRow]);
  };
  const removeRow = (idx) => setDataRows(dataRows.filter((_, i) => i !== idx));
  const updateRow = (idx, field, val) => {
    const rows = [...dataRows];
    rows[idx][field] = val;
    setDataRows(rows);
  };

  const addColumn = () => {
    const newCol = "value" + (valueColumns.length > 1 ? valueColumns.length : "");
    setValueColumns([...valueColumns, newCol]);
    setDataRows(dataRows.map((r) => ({ ...r, [newCol]: "" })));
  };
  const removeColumn = (col) => {
    if (valueColumns.length <= 1) return;
    setValueColumns(valueColumns.filter((c) => c !== col));
    setDataRows(dataRows.map((r) => {
      const { [col]: _, ...rest } = r;
      return rest;
    }));
  };
  const renameColumn = (oldCol, newCol) => {
    if (!newCol.trim() || newCol === oldCol) return;
    setValueColumns(valueColumns.map((c) => (c === oldCol ? newCol : c)));
    setDataRows(dataRows.map((r) => {
      const { [oldCol]: val, ...rest } = r;
      return { ...rest, [newCol]: val };
    }));
  };

  function DataEditor() {
    return (
      <div className="form-group" style={{ marginTop: 12 }}>
        <label style={{ marginBottom: 6 }}>Данные</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", minWidth: 60 }}>Столбцы:</span>
          {valueColumns.map((col) => (
            <div key={col} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                value={col}
                onChange={(e) => renameColumn(col, e.target.value)}
                style={{ width: 90, padding: "2px 6px", fontSize: "0.8rem" }}
              />
              {valueColumns.length > 1 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeColumn(col)} style={{ padding: 2 }}>
                  <MinusCircle size={14} />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addColumn}>
            <PlusCircle size={14} style={{ verticalAlign: "middle", marginRight: 2 }} />
            Столбец
          </button>
        </div>
        {dataRows.map((row, idx) => (
          <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <input
              placeholder="Название"
              value={row.name}
              onChange={(e) => updateRow(idx, "name", e.target.value)}
              style={{ flex: 1, minWidth: 80 }}
            />
            {valueColumns.map((col) => (
              <input
                key={col}
                placeholder={col}
                type="number"
                value={row[col] ?? ""}
                onChange={(e) => updateRow(idx, col, e.target.value)}
                style={{ width: 90 }}
              />
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRow(idx)} disabled={dataRows.length === 1}>
              <MinusCircle size={16} />
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>
          <PlusCircle size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Добавить строку
        </button>
      </div>
    );
  }

  if (!board) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{board.title}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{board.description}</p>
          </div>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Добавить график
          </button>
        )}
      </div>

      {charts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>Нет графиков. Добавьте первый график на доску!</p>
        </div>
      ) : (
        <div className="charts-grid">
          {charts.map((c) => (
            <div key={c.id} style={{ position: "relative" }}>
              <ChartRenderer chart={c} />
              {canEdit && (
                <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", display: "flex", gap: "0.25rem" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>
                    <Settings size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteChart(c.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Новый график</h2>
            <form onSubmit={createChart}>
              <div className="form-group">
                <label>Название</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Тип графика</label>
                <select value={form.chart_type} onChange={(e) => setForm({ ...form, chart_type: e.target.value })}>
                  <option value="bar">Столбчатая</option>
                  <option value="line">Линейная</option>
                  <option value="area">Область</option>
                  <option value="pie">Круговая</option>
                </select>
              </div>
              <DataEditor />
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Редактировать график</h2>
            <form onSubmit={updateChart}>
              <div className="form-group">
                <label>Название</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Тип графика</label>
                <select value={form.chart_type} onChange={(e) => setForm({ ...form, chart_type: e.target.value })}>
                  <option value="bar">Столбчатая</option>
                  <option value="line">Линейная</option>
                  <option value="area">Область</option>
                  <option value="pie">Круговая</option>
                </select>
              </div>
              <DataEditor />
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEdit(null)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
