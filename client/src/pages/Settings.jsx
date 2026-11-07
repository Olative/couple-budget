import { useState, useEffect } from 'react';
import { IconChevronLeft, IconChevronRight, IconFileSpreadsheet, IconHelpCircle, IconRotate, IconBuildingBank, IconFileUpload } from '@tabler/icons-react';
import { api } from '../api/client';
import CurrencyPicker from '../components/CurrencyPicker';
import InviteCard from '../components/InviteCard';
import Sheet from '../components/Sheet';
import { BankNoticeSheet, StatementSheet } from '../components/BankSheets';
import { getThemePref, setThemePref } from '../theme';
import { openDoc } from '../components/Legal';

const DEFAULT_NAME = 'Наш бюджет';

export default function Settings({ budget, user, onBack, onBudgetUpdate, onOpenBudgets, onShowTutorial, onBudgetReset, onDataChanged }) {
  const [budgetData, setBudgetData] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [theme, setTheme] = useState(getThemePref);
  const [name, setName] = useState(budget.name);
  const [bankSheet, setBankSheet] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [removePartner, setRemovePartner] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contact, setContact] = useState('');
  useEffect(() => { api.getLegal().then(l => setContact(l.email)).catch(() => {}); }, []);

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount();
      const tg = window.Telegram?.WebApp;
      if (tg?.close && tg.platform !== 'unknown') tg.close();
      else window.location.reload();
    } catch {
      setDeleting(false);
    }
  };

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

  const [limit, setLimit] = useState('');
  const [limitSaved, setLimitSaved] = useState(false);

  useEffect(() => {
    api.getPersonal(budget.id).then(p => {
      const me = p.members.find(m => m.id === user.id);
      setLimit(me?.limit ? String(me.limit) : '');
    });
  }, [budget.id, user.id]);

  const partner = budgetData?.members?.find(m => m.id !== user.id);

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

      <div className="section-label">Траты и доходы без ручного ввода</div>
      <div className="card">
        <button className="row row-btn" onClick={() => setBankSheet('notice')}>
          <span className="row-ic"><IconBuildingBank size={17} stroke={1.6} /></span>
          <div className="row-main"><div className="row-name">Уведомления банка</div><div className="row-sub">перешлите SMS боту или настройте автоматически</div></div>
          <IconChevronRight size={16} color="var(--muted)" />
        </button>
        <button className="row row-btn" onClick={() => setBankSheet('statement')}>
          <span className="row-ic"><IconFileUpload size={17} stroke={1.6} /></span>
          <div className="row-main"><div className="row-name">Загрузить выписку</div><div className="row-sub">PDF, Excel или CSV из приложения банка</div></div>
          <IconChevronRight size={16} color="var(--muted)" />
        </button>
      </div>
      {bankSheet === 'notice' && (
        <BankNoticeSheet botLink={budgetData?.invite_link?.split('?')[0]} onClose={() => setBankSheet(null)} />
      )}
      {bankSheet === 'statement' && (
        <StatementSheet budget={budget} onClose={() => setBankSheet(null)} onDone={() => onDataChanged?.()} />
      )}

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
      <div className="row-sub" style={{ margin: '0 4px' }}>Личные траты не попадают в общий бюджет и показываются на главной в вашей карточке</div>

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

      <div className="section-label">О приложении</div>
      <div className="card">
        <button className="row row-btn" onClick={() => openDoc('privacy')}><div className="row-main"><div className="row-name">Политика конфиденциальности</div></div><IconChevronRight size={16} stroke={1.6} className="muted" /></button>
        <button className="row row-btn" onClick={() => openDoc('terms')}><div className="row-main"><div className="row-name">Пользовательское соглашение</div></div><IconChevronRight size={16} stroke={1.6} className="muted" /></button>
        {contact && <div className="row"><div className="row-main"><div className="row-name">Поддержка</div></div><span className="row-sub" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{contact}</span></div>}
      </div>
      <button className="btn btn-danger" onClick={() => setDeleteOpen(true)}>Удалить аккаунт и данные</button>

      {deleteOpen && (
        <Sheet title="Удалить аккаунт?" onClose={() => setDeleteOpen(false)}>
          <div className="card-pad" style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 300 }}>
            Удалятся ваши доходы, личные траты, комментарии, фото чеков, настройки и личная ссылка для SMS. Бюджеты, где вы одни, удалятся целиком.
            {partner && <div style={{ marginTop: 8 }}>В общем бюджете у {partner.first_name} останутся общие траты и копилка — без вашего имени.</div>}
            <div className="warn" style={{ marginTop: 8 }}>Вернуть удалённое не получится. Если нужна копия — сначала «Выгрузить в Excel».</div>
          </div>
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => setDeleteOpen(false)}>Отмена</button>
            <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} disabled={deleting} onClick={deleteAccount}>
              {deleting ? 'Удаляем…' : 'Удалить'}
            </button>
          </div>
        </Sheet>
      )}

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
