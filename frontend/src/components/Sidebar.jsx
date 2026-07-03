import { NavLink } from "react-router-dom";
import { LayoutDashboard, Columns3, CalendarDays, Building2, FileText, LogOut, UserCheck } from "lucide-react";

const ROLE_NAMES = {
  admin: "Администратор",
  manager: "Менеджер",
  user: "Пользователь",
  viewer: "Наблюдатель",
};

export default function Sidebar({ user, onLogout }) {
  const links = [
    { to: "/", label: "Панель", icon: LayoutDashboard },
    { to: "/calendar", label: "Календарь", icon: CalendarDays },
    { to: "/departments", label: "Отделы", icon: Building2 },
    { to: "/reports", label: "Отчеты", icon: FileText },
  ];

  if (user.role === "admin" || user.role === "manager") {
    links.push({ to: "/approvals", label: "Подтверждения", icon: UserCheck });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Columns3 size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
        TBP Dashboard
      </div>
      <div className="sidebar-user">
        <strong>{user.username}</strong>
        <br />
        <span className="sidebar-role">{ROLE_NAMES[user.role] || user.role}</span>
      </div>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          <l.icon size={18} />
          {l.label}
        </NavLink>
      ))}
      <button className="sidebar-logout" onClick={onLogout}>
        <LogOut size={18} />
        Выйти
      </button>
    </aside>
  );
}
