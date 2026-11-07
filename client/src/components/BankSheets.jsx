import { useState, useEffect, useRef } from 'react';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { api } from '../api/client';
import Sheet from './Sheet';
import { money } from '../format';
import { t, pl } from '../i18n';

// How to send bank SMS/pushes to the bot, by hand or automatically with iPhone Shortcuts.
export function BankNoticeSheet({ botLink, onClose }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { api.getHook().then(h => setUrl(h.url)); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const openBot = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink && botLink) tg.openTelegramLink(botLink); else if (botLink) window.open(botLink);
  };

  return (
    <Sheet title={t('Уведомления банка')} onClose={onClose}>
      <div className="card-pad" style={{ fontSize: 14, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>{t('Вручную')}</div>
        {t('Перешлите боту SMS или уведомление о покупке — он сам найдёт сумму и магазин и запишет трату в нужную категорию. Поменяете категорию — запомнит для этого магазина.')}
        {botLink && <button className="btn btn-secondary" style={{ marginTop: 12, background: 'var(--surface-2)' }} onClick={openBot}>{t('Открыть чат с ботом')}</button>}
      </div>

      <div className="card-pad" style={{ fontSize: 14, lineHeight: 1.5, marginTop: 10 }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>{t('Автоматически на iPhone')}</div>
        <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>{t('Откройте приложение «Команды» → «Автоматизация» → «+».')}</li>
          <li>{t('Выберите «Сообщение», в «Отправитель» укажите банк (например, 900), включите «Запускать сразу».')}</li>
          <li>{t('«Новая пустая команда» → добавьте действие «Получить содержимое URL» и вставьте ссылку ниже.')}</li>
          <li>{t('Нажмите «Показать больше»: метод — POST, тело запроса — JSON, поле')} <b>text</b>{t(', значение — «Ввод команды».')}</li>
        </ol>
        <div className="row-sub" style={{ marginTop: 10, wordBreak: 'break-all', fontSize: 12 }}>{url || '…'}</div>
        <button className="btn" style={{ marginTop: 10 }} onClick={copy} disabled={!url}>
          {copied ? <><IconCheck size={18} /> {t('Скопировано')}</> : <><IconCopy size={18} stroke={1.6} /> {t('Скопировать ссылку')}</>}
        </button>
        <div className="row-sub" style={{ marginTop: 10 }}>
          {t('Ссылка личная: по ней траты записываются от вашего имени. На Android то же можно настроить в MacroDroid.')}
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 4, fontSize: 13 }} onClick={async () => setUrl((await api.resetHook()).url)}>{t('Сменить ссылку')}</button>
      </div>
    </Sheet>
  );
}

const readAsBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = reject;
  r.readAsDataURL(file);
});
const short = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;

// Pick a PDF/Excel/CSV statement, see what's in it, then confirm.
export function StatementSheet({ budget, onClose, onDone }) {
  const input = useRef(null);
  const [state, setState] = useState({ step: 'pick' });

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setState({ step: 'pick', error: t('Файл больше 10 МБ. Выгрузите выписку за месяц-два') }); return; }
    setState({ step: 'reading' });
    try {
      const summary = await api.importStatement(budget.id, { filename: file.name, data: await readAsBase64(file) });
      setState({ step: 'confirm', summary });
    } catch (err) {
      setState({ step: 'pick', error: err.message });
    }
  };
  const commit = async () => {
    setState(s => ({ ...s, step: 'saving' }));
    try {
      const r = await api.commitImport(state.summary.id);
      setState({ step: 'done', result: r });
      onDone();
    } catch (err) {
      setState({ step: 'pick', error: err.message });
    }
  };
  const s = state.summary;

  return (
    <Sheet title={t('Выписка из банка')} onClose={onClose}>
      <input ref={input} type="file" accept=".pdf,.csv,.xlsx,application/pdf,text/csv" style={{ display: 'none' }} onChange={pick} />
      {(state.step === 'pick' || state.step === 'reading') && (
        <div className="card-pad" style={{ fontSize: 14, lineHeight: 1.5 }}>
          {t('Скачайте в приложении банка выписку за нужный период в PDF, Excel или CSV и загрузите её сюда — все операции запишутся разом. Можно и просто отправить файл боту.')}
          <div className="row-sub" style={{ marginTop: 8 }}>{t('Переводы между своими счетами и операции, которые уже есть в бюджете, пропустим. PDF пока не читаем.')}</div>
          {state.error && <div className="warn" style={{ fontSize: 13, marginTop: 10 }}>{state.error}</div>}
          <button className="btn" style={{ marginTop: 14 }} disabled={state.step === 'reading'} onClick={() => input.current.click()}>
            {state.step === 'reading' ? t('Читаем файл…') : t('Выбрать файл')}
          </button>
        </div>
      )}
      {(state.step === 'confirm' || state.step === 'saving') && (
        <>
          <div className="card-pad" style={{ fontSize: 14, lineHeight: 1.6 }}>
            <div className="num" style={{ fontSize: 22 }}>{s.count} {pl(s.count, 'операция', 'операции', 'операций', 'transaction', 'transactions')}</div>
            <div className="row-sub">{t('с {from} по {to} → «{name}»', { from: short(s.from), to: short(s.to), name: s.budgetName })}</div>
            <div style={{ marginTop: 10 }}>{t('Расходы: {n} на {sum}', { n: s.expenses, sum: money(s.spent, s.currency) })}</div>
            <div>{t('Доходы: {n} на {sum}', { n: s.incomes, sum: money(s.earned, s.currency) })}</div>
          </div>
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => setState({ step: 'pick' })}>{t('Другой файл')}</button>
            <button className="btn" disabled={state.step === 'saving'} onClick={commit}>{state.step === 'saving' ? t('Записываем…') : t('Записать')}</button>
          </div>
        </>
      )}
      {state.step === 'done' && (
        <div className="card-pad" style={{ fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>
          <div className="num" style={{ fontSize: 22 }}>{t('✓ Записано {n}', { n: state.result.added })}</div>
          {state.result.skipped > 0 && <div className="row-sub">{t('пропустили {n} — они уже были в бюджете', { n: state.result.skipped })}</div>}
          <button className="btn" style={{ marginTop: 14 }} onClick={onClose}>{t('Готово')}</button>
        </div>
      )}
    </Sheet>
  );
}
