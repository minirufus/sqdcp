import { useState, useEffect, useContext } from "react";
import { api } from "../api/client";
import { UserContext } from "../App";
import { Plus, Trash2, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function addHour(iso) {
  const d = new Date(iso);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 16);
}

export default function Calendar() {
  const user = useContext(UserContext);
  const [events, setEvents] = useState([]);
  const [date, setDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", start_time: "", end_time: "", department_id: "" });
  const [departments, setDepartments] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setEvents(await api.getEvents());
    setDepartments(await api.getDepartments());
  };

  useEffect(() => { load(); }, []);

  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));

  const today = new Date();
  const isToday = (d) =>
    d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

  const canDeleteEvent = (ev) => user.role === "admin" || user.role === "manager" || ev.user_id === user.id;

  const createEvent = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api.createEvent({
        title: form.title,
        description: form.description,
        start_time: form.start_time,
        end_time: form.end_time,
        department_id: form.department_id ? Number(form.department_id) : null,
      });
      if (data.error) {
        setError(data.error);
        return;
      }
      setShowModal(false);
      setForm({ title: "", description: "", start_time: "", end_time: "", department_id: "" });
      load();
    } catch (err) {
      setError(err.body?.error || err.message || "Ошибка при создании события");
    }
  };

  const deleteEvent = async (id) => {
    await api.deleteEvent(id);
    setSelectedEvent(null);
    load();
  };

  const getEventsForDay = (day) => {
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().slice(0, 10);
    return events
      .filter((e) => e.start_time?.startsWith(dateStr))
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  };

  const openCreateModal = (day) => {
    const d = new Date(year, month, day);
    const start = d.toISOString().slice(0, 16);
    setForm({ title: "", description: "", start_time: start, end_time: addHour(d.toISOString()), department_id: "" });
    setError("");
    setShowModal(true);
  };

  const calendarDays = [];
  for (let i = startOffset - 1; i >= 0; i--) calendarDays.push({ day: prevDays - i, other: true });
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push({ day: i, other: false });
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) calendarDays.push({ day: i, other: true });

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={20} /></button>
          <h1 style={{ minWidth: 200, textAlign: "center" }}>{MONTHS[month]} {year}</h1>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={20} /></button>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(""); setShowModal(true); }}>
          <Plus size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Событие
        </button>
      </div>

      <div className="calendar-grid">
        {DAYS.map((d) => <div key={d} className="calendar-header">{d}</div>)}
        {calendarDays.map((cd, idx) => {
          const dayEvents = cd.other ? [] : getEventsForDay(cd.day);
          return (
            <div
              key={idx}
              className={`calendar-day${isToday(new Date(year, month, cd.day)) && !cd.other ? " today" : ""}${cd.other ? " other-month" : ""}`}
              onClick={() => { if (!cd.other) openCreateModal(cd.day); }}
            >
              <div className="day-number">{cd.day}</div>
              {dayEvents.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  className="calendar-event"
                  title={`${ev.title} (${formatTime(ev.start_time)} - ${formatTime(ev.end_time)})`}
                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(selectedEvent?.id === ev.id ? null : ev); }}
                >
                  <Clock size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />
                  {formatTime(ev.start_time)} {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>+{dayEvents.length - 3}</div>
              )}
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedEvent.title}</h2>
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                {selectedEvent.description || "Нет описания"}
              </p>
              <p style={{ fontSize: "0.9rem" }}>
                <Clock size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                {formatDateShort(selectedEvent.start_time)} {formatTime(selectedEvent.start_time)} — {formatDateShort(selectedEvent.end_time)} {formatTime(selectedEvent.end_time)}
              </p>
            </div>
            {canDeleteEvent(selectedEvent) && (
              <button className="btn btn-danger" onClick={() => deleteEvent(selectedEvent.id)}>
                <Trash2 size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                Удалить событие
              </button>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setSelectedEvent(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setError(""); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Новое событие</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={createEvent}>
              <div className="form-group">
                <label>Название</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Начало</label>
                <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Конец</label>
                <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Отдел</label>
                <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Без отдела</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setError(""); }}>Отмена</button>
                <button type="submit" className="btn btn-primary">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
