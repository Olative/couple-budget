import { useState, useEffect, useCallback } from 'react';
import { api, setTelegramUserId } from './api/client';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Plan from './pages/Plan';
import Savings from './pages/Savings';
import Settings from './pages/Settings';
import Welcome from './pages/Welcome';

const TABS = [
  { id: 'dashboard', label: 'Обзор', icon: '📊' },
  { id: 'expenses', label: 'Расходы', icon: '💸' },
  { id: 'plan', label: 'План', icon: '📋' },
  { id: 'savings', label: 'Копилка', icon: '🎯' },
  { id: 'settings', label: 'Ещё', icon: '⚙️' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [activeBudget, setActiveBudget] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
    }

    const initData = tg?.initData || 'user=' + encodeURIComponent(JSON.stringify({
      id: 1, first_name: 'Тест', username: 'test'
    }));

    api.auth(initData).then(({ user, budgets }) => {
      setUser(user);
      setTelegramUserId(user.telegram_id);
      setBudgets(budgets);
      if (budgets.length > 0) {
        setActiveBudget(budgets[0]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleBudgetCreated = useCallback((budget) => {
    setBudgets(prev => [...prev, budget]);
    setActiveBudget(budget);
  }, []);

  const handleBudgetJoined = useCallback((budget) => {
    setBudgets(prev => {
      if (prev.find(b => b.id === budget.id)) return prev;
      return [...prev, budget];
    });
    setActiveBudget(budget);
  }, []);

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!activeBudget) {
    return <Welcome user={user} onCreated={handleBudgetCreated} onJoined={handleBudgetJoined} />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard budget={activeBudget} user={user} />;
      case 'expenses': return <Expenses budget={activeBudget} user={user} />;
      case 'plan': return <Plan budget={activeBudget} />;
      case 'savings': return <Savings budget={activeBudget} user={user} />;
      case 'settings': return <Settings budget={activeBudget} user={user} />;
      default: return null;
    }
  };

  return (
    <div className="app">
      {renderPage()}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
