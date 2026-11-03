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

// The splash lives in index.html so it shows before the bundle loads.
// It stays until the dance has played through once; the timer covers a video that never starts.
const SPLASH_FALLBACK_MS = 4200;

function whenDanceFinished() {
  const video = document.querySelector('#splash video');
  return new Promise(resolve => {
    const timer = setTimeout(resolve, Math.max(0, SPLASH_FALLBACK_MS - performance.now()));
    if (!video) return;
    let last = video.currentTime;
    const onTime = () => {
      if (video.currentTime < last) {
        video.removeEventListener('timeupdate', onTime);
        clearTimeout(timer);
        resolve();
      }
      last = video.currentTime;
    };
    video.addEventListener('timeupdate', onTime);
  });
}

const danceFinished = whenDanceFinished();

function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  danceFinished.then(() => {
    splash.classList.add('hide');
    const tg = window.Telegram?.WebApp;
    tg?.setHeaderColor?.('#ececec');
    tg?.setBackgroundColor?.('#ececec');
    setTimeout(() => splash.remove(), 400);
  });
}

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
      tg.setHeaderColor?.('#ffffff');
      tg.setBackgroundColor?.('#ffffff');
    }

    const initData = tg?.initData || 'user=' + encodeURIComponent(JSON.stringify({
      id: 1, first_name: 'Тест', username: 'test'
    }));

    api.auth(initData).then(async ({ user, budgets }) => {
      setUser(user);
      setTelegramUserId(user.telegram_id);
      api.setNotify({ tz_offset: -new Date().getTimezoneOffset() }).catch(() => {});
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

  useEffect(() => {
    if (!loading) hideSplash();
  }, [loading]);

  const handleBudgetReady = useCallback((budget) => setActiveBudget(budget), []);

  if (loading) return null;

  if (!activeBudget) {
    return <Welcome onReady={handleBudgetReady} />;
  }

  const refresh = () => setRefreshKey(k => k + 1);
  const pageProps = { budget: activeBudget, user, refreshKey, onAdd: (kind) => setShowAdd(kind === 'income' ? 'income' : 'expense') };

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
            onClick={() => (id === 'add' ? setShowAdd('expense') : setActiveTab(id))}
          >
            <Icon size={21} stroke={1.6} />
          </button>
        ))}
      </nav>

      {showAdd && (
        <AddExpenseSheet
          budget={activeBudget}
          initialKind={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refresh(); }}
        />
      )}

      {recapMonth && <Recap budget={activeBudget} month={recapMonth} onClose={() => setRecapMonth(null)} />}
    </div>
  );
}
