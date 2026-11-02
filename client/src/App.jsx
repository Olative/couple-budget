import { useState, useEffect, useCallback } from 'react';
import { IconLayoutGrid, IconReceipt2, IconPlus, IconCalendarStats, IconPigMoney } from '@tabler/icons-react';
import { api, setTelegramUserId } from './api/client';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Plan from './pages/Plan';
import Savings from './pages/Savings';
import Settings from './pages/Settings';
import Welcome from './pages/Welcome';
import AddExpenseSheet from './components/AddExpenseSheet';
import Recap from './components/Recap';
import { Penguin } from './components/Art';

const TABS = [
  { id: 'dashboard', label: 'Обзор', Icon: IconLayoutGrid },
  { id: 'expenses', label: 'Расходы', Icon: IconReceipt2 },
  { id: 'add', label: 'Добавить расход', Icon: IconPlus },
  { id: 'plan', label: 'План', Icon: IconCalendarStats },
  { id: 'savings', label: 'Копилка', Icon: IconPigMoney },
];

const params = new URLSearchParams(window.location.search);
const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
const initialRecap = params.get('recap') || (startParam.startsWith('recap_') ? startParam.slice(6) : null);
const initialJoin = params.get('join') || (startParam.startsWith('join_') ? startParam.slice(5) : '');

export default function App() {
  const [user, setUser] = useState(null);
  const [activeBudget, setActiveBudget] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [recapMonth, setRecapMonth] = useState(initialRecap);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.('#ececec');
      tg.setBackgroundColor?.('#ececec');
    }

    const initData = tg?.initData || 'user=' + encodeURIComponent(JSON.stringify({
      id: 1, first_name: 'Тест', username: 'test'
    }));

    api.auth(initData).then(async ({ user, budgets }) => {
      setUser(user);
      setTelegramUserId(user.telegram_id);
      let active = budgets[0] || null;
      if (initialJoin) {
        try {
          active = await api.joinBudget(initialJoin);
        } catch (e) {
          if (tg?.showAlert && tg.platform !== 'unknown') tg.showAlert(e.message);
          else window.alert(e.message);
        }
      }
      setActiveBudget(active);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleBudgetReady = useCallback((budget) => setActiveBudget(budget), []);

  if (loading) {
    return (
      <div className="loading"><div><Penguin height={64} /></div></div>
    );
  }

  if (!activeBudget) {
    return <Welcome onReady={handleBudgetReady} />;
  }

  const refresh = () => setRefreshKey(k => k + 1);
  const pageProps = { budget: activeBudget, user, refreshKey, onAdd: () => setShowAdd(true) };

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard {...pageProps} onOpenRecap={setRecapMonth} onOpenSettings={() => setActiveTab('settings')} />;
      case 'expenses': return <Expenses {...pageProps} />;
      case 'plan': return <Plan {...pageProps} />;
      case 'savings': return <Savings {...pageProps} />;
      case 'settings': return <Settings {...pageProps} onBack={() => setActiveTab('dashboard')} onBudgetUpdate={(b) => setActiveBudget(prev => ({ ...prev, ...b }))} />;
      default: return null;
    }
  };

  return (
    <div className="app">
      {renderPage()}

      <nav className="tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-label={label}
            className={`tab ${id === 'add' ? 'add' : ''} ${activeTab === id ? 'active' : ''}`}
            onClick={() => (id === 'add' ? setShowAdd(true) : setActiveTab(id))}
          >
            <Icon size={21} stroke={1.6} />
          </button>
        ))}
      </nav>

      {showAdd && (
        <AddExpenseSheet
          budget={activeBudget}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refresh(); }}
        />
      )}

      {recapMonth && <Recap budget={activeBudget} month={recapMonth} onClose={() => setRecapMonth(null)} />}
    </div>
  );
}
