const API_BASE = '/api';

let telegramUserId = null;

export function setTelegramUserId(id) {
  telegramUserId = id;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-User-Id': telegramUserId,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: (initData) => request('/auth', { method: 'POST', body: JSON.stringify({ initData }) }),

  createBudget: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  joinBudget: (inviteCode) => request('/budgets/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
  getBudget: (id) => request(`/budgets/${id}`),
  getSummary: (id, month) => request(`/budgets/${id}/summary${month ? `?month=${month}` : ''}`),

  getExpenses: (budgetId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/budgets/${budgetId}/expenses${qs ? `?${qs}` : ''}`);
  },
  addExpense: (budgetId, data) => request(`/budgets/${budgetId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addCategory: (budgetId, data) => request(`/budgets/${budgetId}/categories`, { method: 'POST', body: JSON.stringify(data) }),

  getSavings: (budgetId) => request(`/budgets/${budgetId}/savings`),
  addSavingsGoal: (budgetId, data) => request(`/budgets/${budgetId}/savings`, { method: 'POST', body: JSON.stringify(data) }),
  contributeSavings: (goalId, amount) => request(`/savings/${goalId}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) }),
  deleteSavingsGoal: (id) => request(`/savings/${id}`, { method: 'DELETE' }),
};
