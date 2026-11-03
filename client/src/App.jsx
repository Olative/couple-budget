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
import BudgetSheet from './components/BudgetSheet';
import Tutorial from './components/Tutorial';
import { paintTelegram } from './theme';

// The splash lives in index.html so it shows before the bundle loads.
// It stays until the short belly-bump loop has played once; the timer covers a video that never starts.
const SPLASH_LOOPS = 1;
const SPLASH_FALLBACK_MS = 1800;

function whenDanceFinished() {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, Math.max(0, SPLASH_FALLBACK_MS - performance.now()));
    const onLoop = (e) => {
      if (e.detail < SPLASH_LOOPS) return;
      window.removeEventListener('splashloop', onLoop);
      clearTimeout(timer);
      resolve();
    };
    window.addEventListener('splashloop', onLoop);
  });
}

const danceFinished = whenDanceFinished();

function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  danceFinished.then(() => {
    splash.classList.add('hide');
    paintTelegram();
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
  const [addRepeat, setAddRepeat] = useState(false);
  const [recapMonth, setRecapMonth] = useState(initialRecap);
  const [refreshKey, setRefreshKey] = useState(0);
  const [budgetCount, setBudgetCount] = useState(0);
  const [showBudgets, setShowBudgets] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

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
      setBudgetCount(budgets.length);
      if (!user.tutorial_done) setShowTutorial(true);
      let active = budgets[0] || null;
      if (initialJoin) {
        try {
          active = await api.joinBudget(initialJoin);
          if (!budgets.some(b => b.id === active.id)) setBudgetCount(n => n + 1);
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

  const handleBudgetReady = useCallback((budget) => { setActiveBudget(budget); setBudgetCount(n => n || 1); }, []);

  const switchBudget = (budget, created) => {
    if (created) setBudgetCount(n => n + 1);
    setActiveBudget(budget);
    setActiveTab('dashboard');
  };

  const finishTutorial = () => {
    setShowTutorial(false);
    api.setTutorialDone(true).catch(() => {});
  };

  if (loading) return null;

  if (!activeBudget) {
    return <Welcome onReady={handleBudgetReady} />;
  }

  const refresh = () => setRefreshKey(k => k + 1);
  const pageProps = { budget: activeBudget, user, refreshKey, onAdd: (kind, repeat) => { setAddRepeat(repeat === true); setShowAdd(kind === 'income' ? 'income' : 'expense'); } };

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard {...pageProps} onOpenRecap={setRecapMonth} onOpenSettings={() => setActiveTab('settings')} onOpenSavings={() => setActiveTab('savings')} onOpenBudgets={() => setShowBudgets(true)} multiBudget={budgetCount > 1} />;
      case 'expenses': return <Expenses {...pageProps} />;
      case 'plan': return <Plan {...pageProps} />;
      case 'savings': return <Savings {...pageProps} />;
      case 'settings': return <Settings {...pageProps} onBack={() => setActiveTab('dashboard')} onBudgetUpdate={(b) => setActiveBudget(prev => ({ ...prev, ...b }))} onOpenBudgets={() => setShowBudgets(true)} onShowTutorial={() => setShowTutorial(true)} />;
      default: return null;
    }
  };

  return (
    <div className="app" key={activeBudget.id}>
      {renderPage()}

      <nav className="tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-label={label}
            className={`tab ${id === 'add' ? 'add' : ''} ${activeTab === id ? 'active' : ''}`}
            onClick={() => (id === 'add' ? (setAddRepeat(false), setShowAdd('expense')) : setActiveTab(id))}
          >
            <Icon size={21} stroke={1.6} />
          </button>
        ))}
      </nav>

      {showAdd && (
        <AddExpenseSheet
          budget={activeBudget}
          initialKind={showAdd}
          initialRepeat={addRepeat}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refresh(); }}
        />
      )}

      {showBudgets && <BudgetSheet current={activeBudget} onPick={switchBudget} onClose={() => setShowBudgets(false)} />}

      {showTutorial && <Tutorial joined={!!initialJoin} onDone={finishTutorial} />}

      {recapMonth && <Recap budget={activeBudget} month={recapMonth} onClose={() => setRecapMonth(null)} />}
    </div>
  );
}
