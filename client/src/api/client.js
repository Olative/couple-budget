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
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status, data: err });
  }
  return res.json();
}

export async function fetchReceiptUrl(expenseId) {
  const res = await fetch(`${API_BASE}/expenses/${expenseId}/receipt`, { headers: { 'X-Telegram-User-Id': telegramUserId } });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}

export const api = {
  uploadReceipt: (expenseId, image) => request(`/expenses/${expenseId}/receipt`, { method: 'PUT', body: JSON.stringify({ image }) }),
  deleteReceipt: (expenseId) => request(`/expenses/${expenseId}/receipt`, { method: 'DELETE' }),
  exportBudget: (budgetId) => request(`/budgets/${budgetId}/export`, { method: 'POST' }),

  auth: (initData) => request('/auth', { method: 'POST', body: JSON.stringify({ initData }) }),

  createBudget: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  joinBudget: (inviteCode) => request('/budgets/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
  getBudget: (id) => request(`/budgets/${id}`),
  updateBudget: (id, data) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getSummary: (id, month) => request(`/budgets/${id}/summary${month ? `?month=${month}` : ''}`),
  getForecast: (id, month) => request(`/budgets/${id}/forecast${month ? `?month=${month}` : ''}`),
  getRecap: (id, month) => request(`/budgets/${id}/recap${month ? `?month=${month}` : ''}`),

  getExpenses: (budgetId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/budgets/${budgetId}/expenses${qs ? `?${qs}` : ''}`);
  },
  addExpense: (budgetId, data) => request(`/budgets/${budgetId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  getIncomes: (budgetId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/budgets/${budgetId}/incomes${qs ? `?${qs}` : ''}`);
  },
  addIncome: (budgetId, data) => request(`/budgets/${budgetId}/incomes`, { method: 'POST', body: JSON.stringify(data) }),
  deleteIncome: (id) => request(`/incomes/${id}`, { method: 'DELETE' }),
  updateIncome: (id, data) => request(`/incomes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getThread: (expenseId) => request(`/expenses/${expenseId}/thread`),
  setReaction: (expenseId, emoji) => request(`/expenses/${expenseId}/reaction`, { method: 'PUT', body: JSON.stringify({ emoji }) }),
  addComment: (expenseId, text) => request(`/expenses/${expenseId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteComment: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
  getNotify: () => request('/me/notify'),
  setNotify: (data) => request('/me/notify', { method: 'PUT', body: JSON.stringify(data) }),
  getMyBudgets: () => request('/me/budgets'),
  updateExpense: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getHook: () => request('/me/hook'),
  resetHook: () => request('/me/hook/reset', { method: 'POST' }),
  importStatement: (budgetId, data) => request(`/budgets/${budgetId}/import`, { method: 'POST', body: JSON.stringify(data) }),
  commitImport: (id) => request(`/imports/${id}/commit`, { method: 'POST' }),
  resetBudget: (budgetId, removePartner) => request(`/budgets/${budgetId}/reset`, { method: 'POST', body: JSON.stringify({ remove_partner: removePartner }) }),
  setActiveBudget: (budgetId) => request('/me/active-budget', { method: 'PUT', body: JSON.stringify({ budget_id: budgetId }) }),
  setTutorialDone: (done) => request('/me/tutorial', { method: 'PUT', body: JSON.stringify({ done }) }),

  getBalance: (budgetId) => request(`/budgets/${budgetId}/balance`),
  settle: (budgetId) => request(`/budgets/${budgetId}/settle`, { method: 'POST' }),
  setShares: (budgetId, myShare) => request(`/budgets/${budgetId}/shares`, { method: 'PUT', body: JSON.stringify({ myShare }) }),
  getPersonal: (budgetId, month) => request(`/budgets/${budgetId}/personal${month ? `?month=${month}` : ''}`),
  addPersonal: (budgetId, data) => request(`/budgets/${budgetId}/personal`, { method: 'POST', body: JSON.stringify(data) }),
  deletePersonal: (id) => request(`/personal/${id}`, { method: 'DELETE' }),
  updatePersonal: (id, data) => request(`/personal/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setPersonalLimit: (budgetId, amount) => request(`/budgets/${budgetId}/personal-limit`, { method: 'PUT', body: JSON.stringify({ amount }) }),

  getRecurring: (budgetId) => request(`/budgets/${budgetId}/recurring`),
  addRecurring: (budgetId, data) => request(`/budgets/${budgetId}/recurring`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRecurring: (id) => request(`/recurring/${id}`, { method: 'DELETE' }),

  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addCategory: (budgetId, data) => request(`/budgets/${budgetId}/categories`, { method: 'POST', body: JSON.stringify(data) }),
  deleteCategory: (id, moveTo) => request(`/categories/${id}${moveTo ? `?move_to=${moveTo}` : ''}`, { method: 'DELETE' }),

  getSavings: (budgetId) => request(`/budgets/${budgetId}/savings`),
  addSavingsGoal: (budgetId, data) => request(`/budgets/${budgetId}/savings`, { method: 'POST', body: JSON.stringify(data) }),
  contributeSavings: (goalId, amount) => request(`/savings/${goalId}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) }),
  updateSavingsGoal: (id, data) => request(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSavingsGoal: (id) => request(`/savings/${id}`, { method: 'DELETE' }),
};
