import { useState, useEffect } from 'react';
import { IconChevronLeft, IconChevronRight, IconFileSpreadsheet, IconHelpCircle, IconRotate, IconBuildingBank, IconFileUpload } from '@tabler/icons-react';
import { api } from '../api/client';
import CurrencyPicker from '../components/CurrencyPicker';
import InviteCard from '../components/InviteCard';
import Sheet from '../components/Sheet';
import { BankNoticeSheet, StatementSheet } from '../components/BankSheets';
import { getThemePref, setThemePref } from '../theme';
import { openDoc } from '../components/Legal';
import { t, getLang, setLang } from '../i18n';

const DEFAULT_NAME = 'Наш бюджет';

export default function Settings({ budget, user, onBack, onBudgetUpdate, onOpenBudgets, onShowTutorial, onBudgetReset, onDataChanged }) {
  const [budgetData, setBudgetData] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [theme, setTheme] = useState(getThemePref);
  const [lang, setLangState] = useState(getLang);
  const [name, setName] = useState(budget.name);
  const [bankSheet, setBankSheet] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [removePartner, setRemovePartner] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contact, setContact] = useState('');
  const [botUser, setBotUser] = useState('');
  useEffect(() => { api.getLegal().then(l => { setContact(l.email); setBotUser(l.bot || ''); }).catch(() => {}); }, []);
  const writeUs = () => {
    const url = `https://t.me/${botUser}?start=support`;
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink && tg.platform !== 'unknown') tg.openTelegramLink(url); else window.open(url, '_blank');
  };

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

  const changeLang = (next) => {
    setLangState(next);
    setLang(next);
    api.setLang(next).catch(() => {});
  };

  const changeCurrency = async (c) => {
    const updated = await api.updateBudget(budget.id, { currency: c });
    onBudgetUpdate(updated);
  };

  return (
    <div className="page">
      <div className="page-head" style={{ justifyContent: 'flex-start' }}>
        <button className="icon-btn" onClick={onBack} aria-label={t('Назад')}><IconChevronLeft size={18} /></button>
        <div className="h-title">{t('Настройки')}</div>
      </div>

      <div className="section-label">{t('Бюджет')}</div>
      <div className="card">
        <div className="row">
          <div className="row-main"><div className="row-name">{t('Название')}</div></div>
          <input
            className="name-input"
            value={name}
            maxLength={40}
            onChange={e => setName(e.target.value)}
            onBlur={() => saveName()}
            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label={t('Название бюджета')}
          />
        </div>
        {budget.name !== DEFAULT_NAME && budget.name !== t(DEFAULT_NAME) && (
          <button className="row row-btn" onClick={() => saveName(t(DEFAULT_NAME))}>
            <div className="row-main"><div className="row-sub" style={{ fontSize: 13 }}>{t('Вернуть название «{name}»', { name: t(DEFAULT_NAME) })}</div></div>
            <IconRotate size={16} stroke={1.6} color="var(--muted)" />
          </button>
        )}
        <button className="row row-btn" onClick={onOpenBudgets}>
          <div className="row-main"><div className="row-name">{t('Другие бюджеты')}</div><div className="row-sub">{t('например, на поездку или с кем-то ещё')}</div></div>
          <IconChevronRight size={16} color="var(--muted)" />
        </button>
      </div>
      <CurrencyPicker value={budget.currency} onChange={changeCurrency} label={t('Валюта')} />

      <div className="section-label">{t('Траты и доходы без ручного ввода')}</div>
      <div className="card">
        <button className="row row-btn" onClick={() => setBankSheet('notice')}>
          <span className="row-ic"><IconBuildingBank size={17} stroke={1.6} /></span>
          <div className="row-main"><div className="row-name">{t('Уведомления банка')}</div><div className="row-sub">{t('перешлите SMS боту или настройте автоматически')}</div></div>
          <IconChevronRight size={16} color="var(--muted)" />
        </button>
        <button className="row row-btn" onClick={() => setBankSheet('statement')}>
          <span className="row-ic"><IconFileUpload size={17} stroke={1.6} /></span>
          <div className="row-main"><div className="row-name">{t('Загрузить выписку')}</div><div className="row-sub">{t('PDF, Excel или CSV из приложения банка')}</div></div>
          <IconChevronRight size={16} color="var(--muted)" />
        </button>
      </div>
      {bankSheet === 'notice' && (
        <BankNoticeSheet botLink={budgetData?.invite_link?.split('?')[0]} onClose={() => setBankSheet(null)} />
      )}
      {bankSheet === 'statement' && (
        <StatementSheet budget={budget} onClose={() => setBankSheet(null)} onDone={() => onDataChanged?.()} />
      )}

      <div className="section-label">{t('Участники')}</div>
      <div className="card">
        {budgetData?.members?.map(m => (
          <div key={m.id} className="row">
            <span className="row-ic" style={{ fontSize: 14 }}>{m.first_name[0]}</span>
            <div className="row-main">
              <div className="row-name">{m.first_name}{m.last_name ? ` ${m.last_name}` : ''}{m.id === user.id ? ` (${t('вы')})` : ''}</div>
            </div>
            <span className="row-sub">{m.role === 'owner' ? t('создатель') : t('участник')}</span>
          </div>
        ))}
      </div>

      <InviteCard budget={budget} />

      <div className="section-label">{t('Мои личные деньги в месяц')}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          placeholder={`0 ${budget.currency}`}
          value={limit}
          onChange={e => setLimit(e.target.value)}
        />
        <button className="btn" style={{ width: 'auto', padding: '0 18px' }} onClick={saveLimit}>{limitSaved ? t('Готово') : t('Сохранить')}</button>
      </div>
      <div className="row-sub" style={{ margin: '0 4px' }}>{t('Сколько вы хотите тратить на себя в месяц. Личные траты идут из общего бюджета и показываются на главной в вашей карточке')}</div>

      <div className="section-label">{t('Выгрузка')}</div>
      <button className="btn btn-secondary" onClick={exportAll} disabled={exporting === 'sending'}>
        <IconFileSpreadsheet size={18} stroke={1.6} />
        {exporting === 'sending' ? t('Готовим файл…') : exporting === 'done' ? t('Файл отправлен в чат с ботом') : t('Выгрузить в Excel')}
      </button>
      {exportError && <div className="warn" style={{ fontSize: 13, margin: '0 4px' }}>{exportError}</div>}

      <div className="section-label">{t('Уведомления от бота')}</div>
      {prefs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['partner_activity', t('Траты, реакции и комментарии второго')],
            ['limits', t('Лимит категории почти или полностью потрачен')],
            ['reminder', t('Напомнить в 20:00, если за день ничего не записано')],
            ['savings', t('Напомнить после 20-го, если план копилки не выполнен')],
          ].map(([key, label]) => (
            <label key={key} className="switch-row">
              <span>{label}</span>
              <input type="checkbox" className="switch" checked={!!prefs[key]} onChange={() => toggle(key)} />
            </label>
          ))}
        </div>
      )}

      <div className="section-label">{t('Оформление')}</div>
      <div className="segmented">
        {[['auto', t('Как в Telegram')], ['light', t('Светлая')], ['dark', t('Тёмная')]].map(([key, label]) => (
          <button key={key} className={theme === key ? 'on' : ''} onClick={() => { setTheme(key); setThemePref(key); }}>{label}</button>
        ))}
      </div>

      <div className="section-label">Язык / Language</div>
      <div className="segmented">
        {[['ru', 'Русский'], ['en', 'English']].map(([key, label]) => (
          <button key={key} className={lang === key ? 'on' : ''} onClick={() => changeLang(key)}>{label}</button>
        ))}
      </div>

      <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onShowTutorial}>
        <IconHelpCircle size={18} stroke={1.6} /> {t('Как пользоваться')}
      </button>

      <button className="btn btn-danger" onClick={() => { setRemovePartner(false); setResetOpen(true); }}>{t('Очистить бюджет')}</button>

      <div className="section-label">{t('О приложении')}</div>
      <div className="card">
        <button className="row row-btn" onClick={() => openDoc('privacy')}><div className="row-main"><div className="row-name">{t('Политика конфиденциальности')}</div></div><IconChevronRight size={16} stroke={1.6} className="muted" /></button>
        <button className="row row-btn" onClick={() => openDoc('terms')}><div className="row-main"><div className="row-name">{t('Пользовательское соглашение')}</div></div><IconChevronRight size={16} stroke={1.6} className="muted" /></button>
        {botUser && <button className="row row-btn" onClick={writeUs}><div className="row-main"><div className="row-name">{t('Написать нам')}</div><div className="row-sub">{t('вопрос, ошибка или идея — ответим в чате с ботом')}</div></div><IconChevronRight size={16} stroke={1.6} className="muted" /></button>}
        {contact && <div className="row"><div className="row-main"><div className="row-name">{t('Поддержка')}</div></div><span className="row-sub" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{contact}</span></div>}
      </div>
      <button className="btn btn-danger" onClick={() => setDeleteOpen(true)}>{t('Удалить аккаунт и данные')}</button>

      {deleteOpen && (
        <Sheet title={t('Удалить аккаунт?')} onClose={() => setDeleteOpen(false)}>
          <div className="card-pad" style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 300 }}>
            {t('Удалятся ваши доходы, личные траты, комментарии, фото чеков, настройки и личная ссылка для SMS. Бюджеты, где вы одни, удалятся целиком.')}
            {partner && <div style={{ marginTop: 8 }}>{t('В общем бюджете у {name} останутся общие траты и копилка — без вашего имени.', { name: partner.first_name })}</div>}
            <div className="warn" style={{ marginTop: 8 }}>{t('Вернуть удалённое не получится. Если нужна копия — сначала «Выгрузить в Excel».')}</div>
          </div>
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => setDeleteOpen(false)}>{t('Отмена')}</button>
            <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} disabled={deleting} onClick={deleteAccount}>
              {deleting ? t('Удаляем…') : t('Удалить')}
            </button>
          </div>
        </Sheet>
      )}

      {resetOpen && (
        <Sheet title={t('Очистить бюджет?')} onClose={() => setResetOpen(false)}>
          <div className="card-pad" style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 300 }}>
            {t('Удалятся все траты и доходы, цели копилки, регулярные платежи, личные траты и лимиты. Останутся название, валюта и категории.')}
            <div className="warn" style={{ marginTop: 8 }}>{t('Вернуть удалённое не получится.')}</div>
          </div>
          {partner && (
            <label className="switch-row" style={{ marginTop: 8 }}>
              <span>
                {t('Убрать {name} из бюджета', { name: partner.first_name })}
                <span className="row-sub" style={{ display: 'block', marginTop: 2 }}>
                  {removePartner ? t('Старая ссылка-приглашение перестанет работать') : t('{name} останется в бюджете', { name: partner.first_name })}
                </span>
              </span>
              <input type="checkbox" className="switch" checked={removePartner} onChange={e => setRemovePartner(e.target.checked)} />
            </label>
          )}
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => setResetOpen(false)}>{t('Отмена')}</button>
            <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} disabled={resetting} onClick={reset}>
              {resetting ? t('Очищаем…') : t('Очистить')}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
