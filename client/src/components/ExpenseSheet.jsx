import { useState, useEffect, useCallback, useRef } from 'react';
import { IconSend, IconRepeat, IconPaperclip, IconPencil, IconPlus, IconUser } from '@tabler/icons-react';
import { api, fetchReceiptUrl } from '../api/client';
import Sheet from './Sheet';
import CategorySheet from './CategorySheet';
import { money, confirmAction, MONTHS_GEN, compressImage } from '../format';
import { t } from '../i18n';

const REACTIONS = ['😍', '👍', '😱', '🤔', '💸', '🐧'];

function when(date) {
  return t('{day} {month}', { day: Number(date.slice(8, 10)), month: MONTHS_GEN[Number(date.slice(5, 7)) - 1] });
}

const FIELD = { category: 'категория', amount: 'сумма', description: 'описание', date: 'дата', personal: 'личная' };

// "Оля: категория «Прочее» → «Красота» · 7 ноября"
function editLine(ed, currency) {
  const show = (v) => (ed.field === 'amount' ? money(Number(v), currency) : ed.field === 'date' ? when(v) : ed.field === 'personal' ? t(v) : t('«{value}»', { value: (ed.field === 'category' ? t(v) : v) || '—' }));
  return `${ed.user_name}: ${t(FIELD[ed.field])} ${show(ed.old_value)} → ${show(ed.new_value)} · ${when(ed.created_at.slice(0, 10))}`;
}

// Either of the two can fix category, amount, description or date.
function EditForm({ budget, expense, onSaved, onCancel }) {
  const [personal, setPersonal] = useState(!!expense.personal);
  const [showNewCat, setShowNewCat] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(expense.category_id);
  const [amount, setAmount] = useState(String(expense.amount));
  const [description, setDescription] = useState(expense.description || '');
  const [date, setDate] = useState(expense.date);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api.getBudget(budget.id).then(b => setCategories(b.categories)); }, [budget.id]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateExpense(expense.id, { category_id: categoryId, amount: Number(amount), description, date, personal });
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <>
      <div className="card-pad" style={{ marginBottom: 10 }}>
        <input className="amount-input" type="number" inputMode="decimal" value={amount} onChange={ev => setAmount(ev.target.value)} />
      </div>
      <div className="cat-grid" style={{ marginBottom: 10 }}>
        {categories.map(c => (
          <button key={c.id} className={`cat-btn ${categoryId === c.id ? 'on' : ''}`} onClick={() => setCategoryId(c.id)}>
            <span className="e">{c.icon}</span><span>{t(c.name)}</span>
          </button>
        ))}
        <button className="cat-btn" style={{ background: 'transparent', border: '1.5px dashed #c8c8c8' }} onClick={() => setShowNewCat(true)}>
          <span className="e"><IconPlus size={20} stroke={1.6} /></span><span>{t('Своя')}</span>
        </button>
      </div>
      {showNewCat && (
        <CategorySheet
          budget={budget}
          onClose={() => setShowNewCat(false)}
          onSaved={(cat) => { setCategories(cs => [...cs, cat]); setCategoryId(cat.id); setShowNewCat(false); }}
        />
      )}
      <div className="input-group">
        <input className="input" placeholder={t('Описание')} value={description} onChange={ev => setDescription(ev.target.value)} />
      </div>
      <div className="input-group">
        <input className="input" type="date" value={date} onChange={ev => setDate(ev.target.value)} />
      </div>
      <label className="switch-row" style={{ marginBottom: 6 }}>
        <span>
          {t('Личная трата')}
          <span className="row-sub" style={{ display: 'block', marginTop: 2 }}>
            {personal ? t('покупка для себя — идёт из общего бюджета и покажется в карточке {name} на главной', { name: expense.user_name }) : t('отметить как покупку для себя')}
          </span>
        </span>
        <input type="checkbox" className="switch" checked={personal} onChange={ev => setPersonal(ev.target.checked)} />
      </label>
      {error && <div className="warn" style={{ fontSize: 13, margin: '0 4px' }}>{error}</div>}
      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onCancel}>{t('Отмена')}</button>
        <button className="btn" onClick={save} disabled={saving || !(Number(amount) > 0)}>{saving ? t('Сохраняем…') : t('Сохранить')}</button>
      </div>
    </>
  );
}

export default function ExpenseSheet({ budget, user, expenseId, onClose, onChanged }) {
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const [receipt, setReceipt] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileInput = useRef(null);

  const load = useCallback(() => api.getThread(expenseId).then(setThread), [expenseId]);
  useEffect(() => { load(); }, [load]);

  const loadReceipt = useCallback(async () => {
    const url = await fetchReceiptUrl(expenseId);
    setReceipt(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
  }, [expenseId]);
  useEffect(() => { loadReceipt(); }, [loadReceipt]);

  const attach = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadReceipt(expenseId, await compressImage(file));
      await loadReceipt();
      onChanged();
    } finally {
      setUploading(false);
    }
  };

  const removeReceipt = async () => {
    if (!(await confirmAction(t('Удалить фото чека?')))) return;
    await api.deleteReceipt(expenseId);
    setShowReceipt(false);
    setReceipt(null);
    onChanged();
  };

  if (!thread) return <Sheet onClose={onClose}><div className="empty" style={{ padding: 30 }}>…</div></Sheet>;

  const { expense: e, reactions, comments, edits = [] } = thread;

  if (editing) {
    return (
      <Sheet title={t('Изменить трату')} onClose={onClose}>
        <EditForm budget={budget} expense={e} onCancel={() => setEditing(false)}
          onSaved={async () => { setEditing(false); await load(); onChanged(); }} />
      </Sheet>
    );
  }
  const mine = reactions.find(r => r.user_id === user.id)?.emoji;
  const others = reactions.filter(r => r.user_id !== user.id);

  const react = async (emoji) => {
    await api.setReaction(e.id, mine === emoji ? null : emoji);
    await load();
    onChanged();
  };

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    await api.addComment(e.id, text.trim());
    setText('');
    setSending(false);
    await load();
    onChanged();
  };

  const removeComment = async (c) => {
    if (!(await confirmAction(t('Удалить комментарий?')))) return;
    await api.deleteComment(c.id);
    await load();
    onChanged();
  };

  const removeExpense = async () => {
    if (!(await confirmAction(t('Удалить «{name}» на {sum}?', { name: e.description || t(e.category_name), sum: money(e.amount, budget.currency) })))) return;
    await api.deleteExpense(e.id);
    onChanged();
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <div className="card-pad" style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 30 }}>{e.category_icon}</div>
        <div className="num" style={{ fontSize: 28, margin: '6px 0 4px' }}>{money(e.amount, budget.currency)}</div>
        <div style={{ fontSize: 15 }}>{e.description || t(e.category_name)}</div>
        <div className="row-sub" style={{ marginTop: 4 }}>
          {e.description ? `${t(e.category_name)} · ` : ''}{e.personal ? <><IconUser size={12} style={{ verticalAlign: -1 }} /> {t('личная')} · </> : ''}{e.user_name} · {when(e.date)}
          {e.recurring_id && <> · <IconRepeat size={12} style={{ verticalAlign: -1 }} /> {t('каждый месяц')}</>}
        </div>
        {edits.length > 0 && (
          <div className="edits">
            {edits.map((ed, i) => <div key={i}>✏️ {editLine(ed, budget.currency)}</div>)}
          </div>
        )}
        <button className="btn btn-ghost" style={{ marginTop: 6, padding: 8, fontSize: 14, width: 'auto', margin: '6px auto 0' }} onClick={() => setEditing(true)}>
          <IconPencil size={16} stroke={1.6} /> {t('Изменить')}
        </button>
      </div>

      <input ref={fileInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={attach} />
      {receipt ? (
        <button className="receipt-thumb" onClick={() => setShowReceipt(true)} aria-label={t('Открыть фото чека')}>
          <img src={receipt} alt={t('Фото чека')} />
          <span><IconPaperclip size={14} /> {t('Чек')}</span>
        </button>
      ) : (
        <button className="btn btn-secondary" style={{ marginBottom: 10, padding: 12, fontSize: 14 }} onClick={() => fileInput.current.click()} disabled={uploading}>
          <IconPaperclip size={16} stroke={1.6} /> {uploading ? t('Загружаем…') : t('Фото чека')}
        </button>
      )}

      {showReceipt && receipt && (
        <div className="receipt-view" onClick={() => setShowReceipt(false)}>
          <img src={receipt} alt={t('Фото чека')} />
          <div className="receipt-actions" onClick={ev => ev.stopPropagation()}>
            <button className="btn btn-secondary" onClick={() => fileInput.current.click()}>{t('Заменить')}</button>
            <button className="btn btn-secondary" style={{ color: 'var(--danger)' }} onClick={removeReceipt}>{t('Удалить')}</button>
            <button className="btn" onClick={() => setShowReceipt(false)}>{t('Закрыть')}</button>
          </div>
        </div>
      )}

      <div className="reactions">
        {REACTIONS.map(r => (
          <button key={r} className={mine === r ? 'on' : ''} onClick={() => react(r)} aria-label={t('Реакция {emoji}', { emoji: r })}>{r}</button>
        ))}
      </div>
      {others.length > 0 && (
        <div className="row-sub" style={{ textAlign: 'center', margin: '8px 0 0', fontSize: 13 }}>
          {others.map(r => `${r.user_name}: ${r.emoji}`).join(' · ')}
        </div>
      )}

      <div className="comments">
        {comments.map(c => (
          <div key={c.id} className={`bubble ${c.user_id === user.id ? 'me' : ''}`} onClick={() => c.user_id === user.id && removeComment(c)}>
            {c.user_id !== user.id && <div className="bubble-name">{c.user_name}</div>}
            {c.text}
          </div>
        ))}
      </div>

      <div className="comment-input">
        <input
          className="input"
          placeholder={t('Комментарий…')}
          value={text}
          maxLength={500}
          onChange={ev => setText(ev.target.value)}
          onKeyDown={ev => ev.key === 'Enter' && send()}
        />
        <button className="icon-btn dark" style={{ width: 46, height: 46 }} onClick={send} disabled={sending || !text.trim()} aria-label={t('Отправить комментарий')}>
          <IconSend size={18} />
        </button>
      </div>

      {e.user_id === user.id && (
        <button className="btn btn-danger" style={{ marginTop: 10 }} onClick={removeExpense}>{t('Удалить трату')}</button>
      )}
    </Sheet>
  );
}
