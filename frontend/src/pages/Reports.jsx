import { useState, useEffect } from "react";
import { api } from "../api/client";
import { Upload, Download, Trash2, FileText } from "lucide-react";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", board_id: "" });
  const [file, setFile] = useState(null);
  const [boards, setBoards] = useState([]);

  const load = async () => {
    setReports(await api.getReports());
    setBoards(await api.getBoards());
  };

  useEffect(() => { load(); }, []);

  const uploadReport = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("board_id", form.board_id || "0");
    if (file) fd.append("file", file);
    await api.uploadReport(fd);
    setShowModal(false);
    setForm({ title: "", description: "", board_id: "" });
    setFile(null);
    load();
  };

  const downloadReport = async (id) => {
    const res = await api.downloadReport(id);
    if (res.url || res instanceof Response) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "report";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const deleteReport = async (id) => {
    await api.deleteReport(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Отчеты</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Upload size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Загрузить отчет
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <FileText size={48} color="var(--text-secondary)" style={{ marginBottom: "1rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>Нет отчетов. Загрузите первый отчет!</p>
        </div>
      ) : (
        <div>
          {reports.map((r) => (
            <div key={r.id} className="report-item">
              <div className="report-info">
                <h4>{r.title}</h4>
                <span>{r.description || "Нет описания"} • {r.file_name || "Без файла"}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {r.file_name && (
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadReport(r.id)}>
                    <Download size={14} />
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => deleteReport(r.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Загрузить отчет</h2>
            <form onSubmit={uploadReport}>
              <div className="form-group">
                <label>Название</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Доска</label>
                <select value={form.board_id} onChange={(e) => setForm({ ...form, board_id: e.target.value })}>
                  <option value="">Без доски</option>
                  {boards.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Файл</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Загрузить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
