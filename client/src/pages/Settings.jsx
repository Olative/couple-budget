import { useState, useEffect } from 'react';
import { IconChevronLeft, IconChevronRight, IconFileSpreadsheet, IconHelpCircle, IconRotate } from '@tabler/icons-react';
import { api } from '../api/client';
import CurrencyPicker from '../components/CurrencyPicker';
import InviteCard from '../components/InviteCard';
import Sheet from '../components/Sheet';
import { getThemePref, setThemePref } from '../theme';

const DEFAULT_NAME = 'Наш бюджет';

export default function Settings({ budget, user, onBack, onBudgetUpdate, onOpenBudgets, onShowTutorial, onBudgetReset }) {
  const [budgetData, setBudgetData] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [theme, setTheme] = useState(getThemePref);
  const [name, setName] = useState(budget.name);
  const [resetOpen, setResetOpen] = useState(false);
  const [removePartner, setRemovePartner] = useState(false);
  const [resetting, setResetting] = useState(false);

  const reset = async () => {
    setResetting(true);
    await api.resetBudget(budget.id, removePartner);
    setResetting(false);
    setResetOpen(false);
    onBudgetReset();
  };

  const saveName = async (value = name) => {
    const next = value.trim();
    if (!next || next === budget.name) { setName(budget.name); return; }
    setName(next);
    onBudgetUpdate(await api.updateBudget(budget.id, { name: next }));
  };

  useEffect(() => {
    api.getBudget(budget.id).then(setBudgetData);
    api.getNotify().then(setPrefs);
  }, [budget.id]);

  const [balance, setBalance] = useState(null);
  const [limit, setLimit] = useState('');
  const [limitSaved, setLimitSaved] = useState(false);

  useEffect(() => {
    api.getBalance(budget.id).then(setBalance);
    api.getPersonal(budget.id).then(p => {
      const me = p.members.find(m => m.id === user.id);
      setLimit(me?.limit ? String(me.limit) : '');
    });
  }, [budget.id, user.id]);

  const myShare = balance?.members.find(m => m.id === user.id)?.share;
  const partner = balance?.members.find(m => m.id !== user.id);

  const saveLimit = async () => {
    await api.setPersonalLimit(budget.id, Number(limit) || 0);
    setLimitSaved(true);
    setTimeout(() => setLimitSaved(false), 1500);
  };

  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState('');

  const exportAll = async () => {
    setExporting('sending');
    setExportError('');
    try {
      await api.exportBudget(budget.id);
      setExporting('done');
    } catch (e) {
      setExportError(e.message);
      setExporting(null);
    }
  };

  const toggle = async (key) => {
    const next = { ...prefs, [key]: prefs[key] ? 0 : 1 };
    setPrefs(next);
    setPrefs(await api.setNotify({ [key]: next[key] }));
  };

  const changeCurrency = async (c) => {
    const updated = await api.updateBudget(budget.id, { currency: c });
    onBudgetUpdate(updated);
  };

  return (
    <div className="page">
      <div className="page-head" style={{ justifyContent: 'flex-start' }}>
        <button className="icon-btn" onClick={onBack} aria-label="Назад"><IconChevronLeft size={18} /></button>
        <div className="h-title">Настройки</div>
      </div>

      <div className="section-label">Бюджет</div>
      <div className="card">
        <div className="row">
          <div className="row-main"><div className="row-name">Название</div></div>
          <input
            className="name-input"
            value={name}
            maxLength={40}
            onChange={e => setName(e.target.value)}
            onBlur={() => saveName()}
            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Название бюджета"
          />
        </div>
        {budget.name !== DEFAULT_NAME && (
          <button className="row row-btn" onClick={() => saveName(DEFAULT_NAME)}>
            <div className="row-main"><div className="row-sub" style={{ fontSize: 13 }}>Вернуть название «{DEFAULT_NAME}»</div></div>
            <IconRotate size={16} stroke={1.6} color="var(--muted)" />
          </button>
        )}
        <button className="row row-btn" onClick={onOpenBudgets}>
          <div className="row-main"><div className="row-name">Другие бюджеты</div><div className="row-sub">например, на поездку или с кем-то ещё</div></div>
          <IconChevronRight size={16} color="var(--muted)" />
        </button>
      </div>
      <CurrencyPicker value={budget.currency} onChange={changeCurrency} label="Валюта" />

      <div className="section-label">Участники</div>
      <div className="card">
        {budgetData?.members?.map(m => (
          <div key={m.id} className="row">
            <span className="row-ic" style={{ fontSize: 14 }}>{m.first_name[0]}</span>
            <div className="row-main">
              <div className="row-name">{m.first_name}{m.last_name ? ` ${m.last_name}` : ''}{m.id === user.id ? ' (вы)' : ''}</div>
            </div>
            <span className="row-sub">{m.role === 'owner' ? 'создатель' : 'участник'}</span>
          </div>
        ))}
      </div>

      <InviteCard budget={budget} />

      {partner && (
        <>
          <div className="section-label">Как делим общие траты</div>
          <div className="pills">
            {[50, 60, 70, 40, 30].map(p => (
              <button key={p} className={`pill ${Math.round(myShare) === p ? 'on' : ''}`} onClick={async () => setBalance(await api.setShares(budget.id, p))}>
                Я {p}% · {partner.first_name} {100 - p}%
              </button>
            ))}
          </div>
          <div className="row-sub" style={{ margin: '0 4px' }}>Пригодится, если вы вкладываетесь в общие траты не поровну</div>
        </>
      )}

      <div className="section-label">Мои личные деньги в месяц</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          placeholder={`0 ${budget.currency}`}
          value={limit}
          onChange={e => setLimit(e.target.value)}
        />
        <button className="btn" style={{ width: 'auto', padding: '0 18px' }} onClick={saveLimit}>{limitSaved ? 'Готово' : 'Сохранить'}</button>
      </div>
      <div className="row-sub" style={{ margin: '0 4px' }}>Личные траты не попадают в общий бюджет — второй видит только сумму за месяц</div>

      <div className="section-label">Выгрузка</div>
      <button className="btn btn-secondary" onClick={exportAll} disabled={exporting === 'sending'}>
        <IconFileSpreadsheet size={18} stroke={1.6} />
        {exporting === 'sending' ? 'Готовим файл…' : exporting === 'done' ? 'Файл отправлен в чат с ботом' : 'Выгрузить в Excel'}
      </button>
      {exportError && <div className="warn" style={{ fontSize: 13, margin: '0 4px' }}>{exportError}</div>}

      <div className="section-label">Уведомления от бота</div>
      {prefs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['partner_activity', 'Траты, реакции и комментарии второго'],
            ['limits', 'Лимит категории почти или полностью потрачен'],
            ['reminder', 'Напомнить в 20:00, если за день ничего не записано'],
            ['savings', 'Напомнить после 20-го, если план копилки не выполнен'],
          ].map(([key, label]) => (
            <label key={key} className="switch-row">
              <span>{label}</span>
              <input type="checkbox" className="switch" checked={!!prefs[key]} onChange={() => toggle(key)} />
            </label>
          ))}
        </div>
      )}

      <div className="section-label">Оформление</div>
      <div className="segmented">
        {[['auto', 'Как в Telegram'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([key, label]) => (
          <button key={key} className={theme === key ? 'on' : ''} onClick={() => { setTheme(key); setThemePref(key); }}>{label}</button>
        ))}
      </div>

      <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onShowTutorial}>
        <IconHelpCircle size={18} stroke={1.6} /> Как пользоваться
      </button>

      <button className="btn btn-danger" onClick={() => { setRemovePartner(false); setResetOpen(true); }}>Очистить бюджет</button>

      {resetOpen && (
        <Sheet title="Очистить бюджет?" onClose={() => setResetOpen(false)}>
          <div className="card-pad" style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 300 }}>
            Удалятся все траты и доходы, цели копилки, регулярные платежи, личные траты и лимиты. Останутся название, валюта и категории.
            <div className="warn" style={{ marginTop: 8 }}>Вернуть удалённое не получится.</div>
          </div>
          {partner && (
            <label className="switch-row" style={{ marginTop: 8 }}>
              <span>
                Убрать {partner.first_name} из бюджета
                <span className="row-sub" style={{ display: 'block', marginTop: 2 }}>
                  {removePartner ? 'Старая ссылка-приглашение перестанет работать' : `${partner.first_name} останется в бюджете`}
                </span>
              </span>
              <input type="checkbox" className="switch" checked={removePartner} onChange={e => setRemovePartner(e.target.checked)} />
            </label>
          )}
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => setResetOpen(false)}>Отмена</button>
            <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} disabled={resetting} onClick={reset}>
              {resetting ? 'Очищаем…' : 'Очистить'}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
