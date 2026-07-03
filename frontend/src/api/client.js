const API_URL = "http://localhost:8000";

class ApiError extends Error {
  constructor(status, body) {
    super(typeof body === "string" ? body : body?.error || body?.errors?.join("; ") || `Ошибка ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body = options.body;
  if (!(body instanceof FormData)) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, body });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : null;

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new ApiError(401, data);
  }

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  register: (data) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/api/auth/me"),
  getUsers: () => request("/api/auth/users"),
  seed: (password) =>
    request("/api/auth/seed", { method: "POST", body: JSON.stringify({ password: password || "test123" }) }),

  getBoards: () => request("/api/boards"),
  createBoard: (data) => request("/api/boards", { method: "POST", body: JSON.stringify(data) }),
  deleteBoard: (id) => request(`/api/boards/${id}`, { method: "DELETE" }),

  getCharts: (boardId) => request(`/api/boards/${boardId}/charts`),
  createChart: (boardId, data) => request(`/api/boards/${boardId}/charts`, { method: "POST", body: JSON.stringify(data) }),
  updateChart: (boardId, chartId, data) => request(`/api/boards/${boardId}/charts/${chartId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteChart: (boardId, chartId) => request(`/api/boards/${boardId}/charts/${chartId}`, { method: "DELETE" }),

  getDepartments: () => request("/api/departments"),
  getDepartment: (id) => request(`/api/departments/${id}`),
  createDepartment: (data) => request("/api/departments", { method: "POST", body: JSON.stringify(data) }),
  updateDepartment: (id, data) => request(`/api/departments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDepartment: (id) => request(`/api/departments/${id}`, { method: "DELETE" }),
  joinDepartment: (id) => request(`/api/departments/${id}/join`, { method: "POST" }),
  getJoinRequests: () => request("/api/departments/join-requests"),
  approveJoinRequest: (id) => request(`/api/departments/join-requests/${id}/approve`, { method: "POST" }),
  rejectJoinRequest: (id) => request(`/api/departments/join-requests/${id}/reject`, { method: "POST" }),

  getEvents: () => request("/api/events"),
  createEvent: (data) => request("/api/events", { method: "POST", body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/api/events/${id}`, { method: "DELETE" }),

  getPending: () => request("/api/auth/pending"),
  approveUser: (id, data) => request(`/api/auth/approve/${id}`, { method: "POST", body: JSON.stringify(data) }),
  rejectUser: (id) => request(`/api/auth/reject/${id}`, { method: "POST" }),
  updateUser: (id, data) => request(`/api/auth/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/api/auth/users/${id}`, { method: "DELETE" }),
  blockUser: (id) => request(`/api/auth/block/${id}`, { method: "POST" }),

  getReports: () => request("/api/reports"),
  uploadReport: (formData) => request("/api/reports/upload", { method: "POST", body: formData }),
  downloadReport: (id) => request(`/api/reports/download/${id}`),
  deleteReport: (id) => request(`/api/reports/${id}`, { method: "DELETE" }),
};
