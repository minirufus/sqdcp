import { useState, useEffect, useContext } from "react";
import { api } from "../api/client";
import { UserContext } from "../App";
import {
  CheckCircle, XCircle, UserCheck, Mail, Shield, Trash2,
  Lock, Unlock, Edit3, Building2, UserPlus,
} from "lucide-react";

const ROLE_NAMES = {
  admin: "Администратор",
  manager: "Менеджер",
  user: "Пользователь",
  viewer: "Наблюдатель",
};

const STATUS_MAP = {
  active: { label: "Активен", color: "var(--success)", bg: "rgba(34,197,94,0.15)" },
  pending: { label: "Ожидает", color: "var(--warning)", bg: "rgba(245,158,11,0.15)" },
  rejected: { label: "Отклонён", color: "var(--danger)", bg: "rgba(239,68,68,0.15)" },
  blocked: { label: "Заблокирован", color: "var(--danger)", bg: "rgba(239,68,68,0.25)" },
};

export default function Approvals() {
  const currentUser = useContext(UserContext);
  const [pending, setPending] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [tab, setTab] = useState("all");
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: "", department_id: "", status: "" });

  const isAdmin = currentUser.role === "admin";
  const canManage = isAdmin || currentUser.role === "manager";

  const load = async () => {
    try {
      setPending(await api.getPending());
      setAllUsers(await api.getUsers());
      setDepartments(await api.getDepartments());
      setJoinRequests(await api.getJoinRequests());
    } catch {}
  };

  useEffect(() => { if (canManage) load(); }, []);

  const handleApprove = async (targetId, role, deptId) => {
    await api.approveUser(targetId, { role, department_id: deptId || null });
    load();
  };

  const handleReject = async (targetId) => {
    await api.rejectUser(targetId);
    load();
  };

  const handleBlockToggle = async (targetId) => {
    await api.blockUser(targetId);
    load();
  };

  const handleApproveJoin = async (reqId) => {
    await api.approveJoinRequest(reqId);
    load();
  };

  const handleRejectJoin = async (reqId) => {
    await api.rejectJoinRequest(reqId);
    load();
  };

  const handleDelete = async (targetId, username) => {
    if (!window.confirm(`Удалить пользователя "${username}"? Это действие необратимо.`)) return;
    await api.deleteUser(targetId);
    load();
  };

  const openEdit = (u) => {
    setEditForm({ role: u.role, department_id: u.department_id || "", status: u.status });
    setEditUser(u);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await api.updateUser(editUser.id, {
      role: editForm.role,
      department_id: editForm.department_id ? Number(editForm.department_id) : null,
      status: editForm.status,
    });
    setEditUser(null);
    load();
  };

  if (!canManage) return <div className="loading">Нет доступа</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Управление сотрудниками</h1>
      </div>

      <div className="tabs">
        <button className={`tab${tab === "all" ? " active" : ""}`} onClick={() => setTab("all")}>
          Все сотрудники ({allUsers.length})
        </button>
        <button className={`tab${tab === "pending" ? " active" : ""}`} onClick={() => setTab("pending")}>
          На подтверждении {pending.length > 0 && `(${pending.length})`}
        </button>
        <button className={`tab${tab === "join" ? " active" : ""}`} onClick={() => setTab("join")}>
          Заявки в отделы {joinRequests.length > 0 && `(${joinRequests.length})`}
        </button>
      </div>

      {tab === "pending" && (
        <>
          {pending.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <UserCheck size={48} color="var(--text-secondary)" style={{ marginBottom: "1rem" }} />
              <p style={{ color: "var(--text-secondary)" }}>Нет заявок на подтверждение</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {pending.map((u) => (
                <PendingCard
                  key={u.id}
                  user={u}
                  departments={departments}
                  onApprove={(role, deptId) => handleApprove(u.id, role, deptId)}
                  onReject={() => handleReject(u.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "join" && (
        <>
          {joinRequests.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <UserPlus size={48} color="var(--text-secondary)" style={{ marginBottom: "1rem" }} />
              <p style={{ color: "var(--text-secondary)" }}>Нет заявок на присоединение к отделам</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {joinRequests.map((jr) => (
                <div key={jr.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{jr.username}</strong>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginLeft: "0.75rem" }}>
                        <Building2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        {jr.department_name}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleApproveJoin(jr.id)}>
                        <CheckCircle size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        Принять
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRejectJoin(jr.id)}>
                        <XCircle size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        Отклонить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "all" && (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {allUsers.map((u) => (
            <div key={u.id} className="card" style={{ padding: "0.75rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.15rem" }}>
                    <strong>{u.username}</strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {ROLE_NAMES[u.role] || u.role}
                    </span>
                    {u.id === currentUser.id && (
                      <span style={{ fontSize: "0.7rem", background: "var(--accent-light)", color: "var(--accent)", padding: "1px 6px", borderRadius: 4 }}>Вы</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {departments.find((d) => d.id === u.department_id)?.name || "Без отдела"}
                    {" · "}{u.email}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{
                    fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4,
                    background: (STATUS_MAP[u.status] || STATUS_MAP.pending).bg,
                    color: (STATUS_MAP[u.status] || STATUS_MAP.pending).color,
                  }}>
                    {(STATUS_MAP[u.status] || STATUS_MAP.pending).label}
                  </span>
                  {isAdmin && u.id !== currentUser.id && (
                    <>
                      <button className="btn btn-ghost btn-sm" title="Редактировать" onClick={() => openEdit(u)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title={u.status === "blocked" ? "Разблокировать" : "Заблокировать"} onClick={() => handleBlockToggle(u.id)}>
                        {u.status === "blocked" ? <Unlock size={14} /> : <Lock size={14} />}
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Удалить" onClick={() => handleDelete(u.id, u.username)}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Редактировать: {editUser.username}</h2>
            <form onSubmit={saveEdit}>
              <div className="form-group">
                <label>Роль</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  {Object.entries(ROLE_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Отдел</label>
                <select value={editForm.department_id} onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}>
                  <option value="">Без отдела</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Статус</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="active">Активен</option>
                  <option value="blocked">Заблокирован</option>
                  <option value="pending">Ожидает</option>
                  <option value="rejected">Отклонён</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditUser(null)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PendingCard({ user: u, departments, onApprove, onReject }) {
  const [role, setRole] = useState("user");
  const [deptId, setDeptId] = useState(u.department_id || "");

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ marginBottom: "0.25rem" }}>{u.username}</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <Mail size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {u.email}
          </p>
        </div>
        <span style={{ fontSize: "0.75rem", background: "rgba(245,158,11,0.15)", color: "var(--warning)", padding: "2px 8px", borderRadius: 4 }}>
          Ожидает
        </span>
      </div>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
          <label>Роль</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">Пользователь</option>
            <option value="viewer">Наблюдатель</option>
            <option value="manager">Менеджер</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
          <label>Отдел</label>
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
            <option value="">Без отдела</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", paddingBottom: "0.25rem" }}>
          <button className="btn btn-primary btn-sm" onClick={() => onApprove(role, deptId)}>
            <CheckCircle size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Подтвердить
          </button>
          <button className="btn btn-danger btn-sm" onClick={onReject}>
            <XCircle size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Отклонить
          </button>
        </div>
      </div>
    </div>
  );
}
