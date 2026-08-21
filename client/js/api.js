// Обёртка над REST API сервера. Сессия — cookie, данные клиента — localStorage.
export async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const Auth = {
  register: (username, password) => api('/api/register', { method: 'POST', body: { username, password } }),
  login: (username, password) => api('/api/login', { method: 'POST', body: { username, password } }),
  logout: () => api('/api/logout', { method: 'POST' }),
  me: () => api('/api/me'),
  cases: () => api('/api/cases'),
  openCase: (caseId) => api('/api/case/open', { method: 'POST', body: { caseId } }),
};

// localStorage: запоминаем последний логин для удобства.
const LS_USER = 'strike_last_user';
export const rememberUser = (username) => {
  try { localStorage.setItem(LS_USER, username); } catch { /* ignore */ }
};
export const recallUser = () => {
  try { return localStorage.getItem(LS_USER) || ''; } catch { return ''; }
};
export const forgetUser = () => {
  try { localStorage.removeItem(LS_USER); } catch { /* ignore */ }
};
