import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

const TASK_STATUSES = [
  { value: "not_started", label: "не начата", columnLabel: "Не начатые" },
  { value: "in_progress", label: "в работе", columnLabel: "В работе" },
  { value: "done", label: "выполнена", columnLabel: "Выполненные" },
];

const TASK_STATUS_VALUES = new Set(TASK_STATUSES.map((status) => status.value));

function normalizeTaskStatus(status) {
  return TASK_STATUS_VALUES.has(status) ? status : "not_started";
}

function taskStatusClass(task) {
  return `task-status-${normalizeTaskStatus(task.status)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function Canban() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [department, setDepartment] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskForm, setSelectedTaskForm] = useState({
    name: "",
    description: "",
    assignees: "",
    status: "not_started",
  });
  const [kanbanDate, setKanbanDate] = useState(todayKey);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dropTargetStatus, setDropTargetStatus] = useState("");
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingDepartment, setLoadingDepartment] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [error, setError] = useState("");

  const tasks = useMemo(() => department?.assigned_tasks || [], [department]);
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status !== "done") return true;
      if (!task.completed_at) return false;
      return task.completed_at.slice(0, 10) === kanbanDate;
    });
  }, [tasks, kanbanDate]);
  const completedDates = useMemo(() => {
    const counts = {};
    tasks.forEach((task) => {
      if (task.status === "done" && task.completed_at) {
        const key = task.completed_at.slice(0, 10);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days = [];

    for (let i = 0; i < startOffset; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = dateKey(calendarYear, calendarMonth, day);
      days.push({ day, key, count: completedDates[key] || 0 });
    }

    return days;
  }, [completedDates, calendarMonth, calendarYear]);

  const tasksByStatus = useMemo(() => {
    const grouped = new Map(TASK_STATUSES.map((status) => [status.value, []]));
    filteredTasks.forEach((task) => {
      grouped.get(normalizeTaskStatus(task.status)).push(task);
    });
    return grouped;
  }, [filteredTasks]);

  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingDepartments(true);
      setError("");
      try {
        const data = await api.getDepartments();
        setDepartments(data);
        setSelectedDepartmentId((currentId) => currentId || (data[0]?.id ? String(data[0].id) : ""));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  useEffect(() => {
    if (!selectedDepartmentId) {
      setDepartment(null);
      return;
    }

    const loadDepartment = async () => {
      setLoadingDepartment(true);
      setError("");
      try {
        setDepartment(await api.getDepartment(selectedDepartmentId));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingDepartment(false);
      }
    };

    loadDepartment();
  }, [selectedDepartmentId]);

  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setSelectedTaskForm({
      name: task.name || "",
      description: task.description || "",
      assignees: task.assignees || "",
      status: normalizeTaskStatus(task.status),
    });
  };

  const updateTaskInDepartment = (updatedTask) => {
    setDepartment((currentDepartment) => {
      if (!currentDepartment) return currentDepartment;

      return {
        ...currentDepartment,
        assigned_tasks: (currentDepartment.assigned_tasks || []).map((task) => (
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        )),
      };
    });
  };

  const updateSelectedTaskDetails = async (event) => {
    event.preventDefault();
    if (!selectedTask) return;

    setTaskSaving(true);
    setError("");
    try {
      const updatedTask = await api.updateBoardTask(selectedTask.board_id, selectedTask.id, selectedTaskForm);
      const mergedTask = { ...selectedTask, ...updatedTask };
      setSelectedTask(mergedTask);
      setSelectedTaskForm({
        name: mergedTask.name || "",
        description: mergedTask.description || "",
        assignees: mergedTask.assignees || "",
        status: normalizeTaskStatus(mergedTask.status),
      });
      updateTaskInDepartment(mergedTask);
    } catch (err) {
      setError(err.message);
    } finally {
      setTaskSaving(false);
    }
  };

  const handleTaskDragStart = (task, event) => {
    setDraggedTaskId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(task.id));
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDropTargetStatus("");
  };

  const moveTaskToStatus = async (status, event) => {
    event.preventDefault();
    const rawTaskId = event.dataTransfer.getData("text/plain");
    const fallbackTaskId = rawTaskId ? Number(rawTaskId) : null;
    const taskId = draggedTaskId ?? (Number.isInteger(fallbackTaskId) ? fallbackTaskId : null);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    setDropTargetStatus("");
    setDraggedTaskId(null);
    if (normalizeTaskStatus(task.status) === status) return;

    setError("");
    try {
      const updatedTask = await api.updateBoardTask(task.board_id, task.id, { status });
      const mergedTask = { ...task, ...updatedTask };
      updateTaskInDepartment(mergedTask);
      if (selectedTask?.id === mergedTask.id) {
        setSelectedTask(mergedTask);
        setSelectedTaskForm((currentForm) => ({ ...currentForm, status: normalizeTaskStatus(mergedTask.status) }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loadingDepartments) return <div className="loading-panel">Загрузка...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Канбан</h1>
          <p className="page-subtitle">Задачи выбранного отдела по степени выполнения</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="canban-toolbar" style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Отдел</label>
          <select
            value={selectedDepartmentId}
            onChange={(event) => setSelectedDepartmentId(event.target.value)}
          >
            {departments.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Дата выполнения</label>
          <div className="mini-calendar">
            <div className="mini-calendar-header">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear((y) => y - 1); }
                else { setCalendarMonth((m) => m - 1); }
              }}><ChevronLeft size={14} /></button>
              <span className="mini-calendar-title">{MONTHS[calendarMonth]} {calendarYear}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear((y) => y + 1); }
                else { setCalendarMonth((m) => m + 1); }
              }}><ChevronRight size={14} /></button>
            </div>
            <div className="mini-calendar-weekdays">
              {WEEKDAYS.map((wd) => <span key={wd}>{wd}</span>)}
            </div>
            <div className="mini-calendar-grid">
              {calendarDays.map((day, idx) =>
                day ? (
                  <button
                    key={day.key}
                    type="button"
                    className={`mini-calendar-day${kanbanDate === day.key ? " selected" : ""}${day.count > 0 ? " has-tasks" : ""}`}
                    onClick={() => setKanbanDate(day.key)}
                  >
                    <span className="mini-calendar-day-number">{day.day}</span>
                    {day.count > 0 && <span className="mini-calendar-task-count">{day.count}</span>}
                  </button>
                ) : (
                  <span key={`e-${idx}`} className="mini-calendar-day empty" />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {departments.length === 0 ? (
        <div className="task-empty-state">Пока нет созданных отделов.</div>
      ) : loadingDepartment ? (
        <div className="loading-panel">Загрузка задач...</div>
      ) : (
        <div className="canban-board">
          {TASK_STATUSES.map((status) => {
            const columnTasks = tasksByStatus.get(status.value) || [];

            return (
              <section
                key={status.value}
                className={`canban-column${dropTargetStatus === status.value ? " task-drop-target" : ""}`}
                onDragOver={(event) => {
                  if (draggedTaskId === null) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTargetStatus(status.value);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget)) return;
                  setDropTargetStatus("");
                }}
                onDrop={(event) => moveTaskToStatus(status.value, event)}
              >
                <div className="canban-column-header">
                  <h2>{status.columnLabel}</h2>
                  <span>{columnTasks.length}</span>
                </div>
                {columnTasks.length === 0 ? (
                  <div className="task-empty-state">Задач нет.</div>
                ) : (
                  <div className="canban-task-list">
                    {columnTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className={`task-pill canban-task ${taskStatusClass(task)}`}
                        draggable
                        onDragStart={(event) => handleTaskDragStart(task, event)}
                        onDragEnd={handleTaskDragEnd}
                        onClick={() => openTaskDetail(task)}
                      >
                        <strong>{task.name}</strong>
                        {task.assignees && <span>{task.assignees}</span>}
                        {task.completed_at && status.value === "done" && (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginTop: "0.15rem" }}>
                            {new Date(task.completed_at).toLocaleDateString("ru")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>{selectedTaskForm.name || selectedTask.name}</h2>
            <form className="task-detail" onSubmit={updateSelectedTaskDetails}>
              <div className="form-group">
                <label>Имя задачи</label>
                <input
                  value={selectedTaskForm.name}
                  onChange={(event) => setSelectedTaskForm({ ...selectedTaskForm, name: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Доска</label>
                <input value={selectedTask.board_title || "Доска не указана"} readOnly />
              </div>
              <div className="form-group">
                <label>Степень выполнения</label>
                <select
                  value={selectedTaskForm.status}
                  onChange={(event) => setSelectedTaskForm({ ...selectedTaskForm, status: event.target.value })}
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                {selectedTask.completed_at && (
                  <small style={{ display: "block", marginTop: "0.35rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    Выполнена: {new Date(selectedTask.completed_at).toLocaleString("ru")}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Описание задачи</label>
                <textarea
                  value={selectedTaskForm.description}
                  onChange={(event) => setSelectedTaskForm({ ...selectedTaskForm, description: event.target.value })}
                  rows={5}
                />
              </div>
              <div className="form-group">
                <label>Ответственные</label>
                <input
                  value={selectedTaskForm.assignees}
                  onChange={(event) => setSelectedTaskForm({ ...selectedTaskForm, assignees: event.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedTask(null)} disabled={taskSaving}>
                  Закрыть
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => navigate(`/boards/${selectedTask.board_id}`)} disabled={taskSaving}>
                  Открыть доску
                </button>
                <button type="submit" className="btn btn-primary" disabled={taskSaving}>
                  {taskSaving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
