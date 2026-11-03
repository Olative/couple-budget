import { useState, useEffect, useCallback, useRef } from 'react';
import { IconSend, IconRepeat, IconPaperclip } from '@tabler/icons-react';
import { api, fetchReceiptUrl } from '../api/client';
import Sheet from './Sheet';
import { money, confirmAction, MONTHS_GEN, compressImage } from '../format';

const REACTIONS = ['😍', '👍', '😱', '🤔', '💸', '🐧'];

function when(date) {
  return `${Number(date.slice(8, 10))} ${MONTHS_GEN[Number(date.slice(5, 7)) - 1]}`;
}

export default function ExpenseSheet({ budget, user, expenseId, onClose, onChanged }) {
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const [receipt, setReceipt] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    if (!(await confirmAction('Удалить фото чека?'))) return;
    await api.deleteReceipt(expenseId);
    setShowReceipt(false);
    setReceipt(null);
    onChanged();
  };

  if (!thread) return <Sheet onClose={onClose}><div className="empty" style={{ padding: 30 }}>…</div></Sheet>;

  const { expense: e, reactions, comments } = thread;
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
    if (!(await confirmAction('Удалить комментарий?'))) return;
    await api.deleteComment(c.id);
    await load();
    onChanged();
  };

  const removeExpense = async () => {
    if (!(await confirmAction(`Удалить «${e.description || e.category_name}» на ${money(e.amount, budget.currency)}?`))) return;
    await api.deleteExpense(e.id);
    onChanged();
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <div className="card-pad" style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 30 }}>{e.category_icon}</div>
        <div className="num" style={{ fontSize: 28, margin: '6px 0 4px' }}>{money(e.amount, budget.currency)}</div>
        <div style={{ fontSize: 15 }}>{e.description || e.category_name}</div>
        <div className="row-sub" style={{ marginTop: 4 }}>
          {e.description ? `${e.category_name} · ` : ''}{e.user_name} · {when(e.date)}
          {e.recurring_id && <> · <IconRepeat size={12} style={{ verticalAlign: -1 }} /> каждый месяц</>}
        </div>
      </div>

      <input ref={fileInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={attach} />
      {receipt ? (
        <button className="receipt-thumb" onClick={() => setShowReceipt(true)} aria-label="Открыть фото чека">
          <img src={receipt} alt="Фото чека" />
          <span><IconPaperclip size={14} /> Чек</span>
        </button>
      ) : (
        <button className="btn btn-secondary" style={{ marginBottom: 10, padding: 12, fontSize: 14 }} onClick={() => fileInput.current.click()} disabled={uploading}>
          <IconPaperclip size={16} stroke={1.6} /> {uploading ? 'Загружаем…' : 'Фото чека'}
        </button>
      )}

      {showReceipt && receipt && (
        <div className="receipt-view" onClick={() => setShowReceipt(false)}>
          <img src={receipt} alt="Фото чека" />
          <div className="receipt-actions" onClick={ev => ev.stopPropagation()}>
            <button className="btn btn-secondary" onClick={() => fileInput.current.click()}>Заменить</button>
            <button className="btn btn-secondary" style={{ color: 'var(--danger)' }} onClick={removeReceipt}>Удалить</button>
            <button className="btn" onClick={() => setShowReceipt(false)}>Закрыть</button>
          </div>
        </div>
      )}

      <div className="reactions">
        {REACTIONS.map(r => (
          <button key={r} className={mine === r ? 'on' : ''} onClick={() => react(r)} aria-label={`Реакция ${r}`}>{r}</button>
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
          placeholder="Комментарий…"
          value={text}
          maxLength={500}
          onChange={ev => setText(ev.target.value)}
          onKeyDown={ev => ev.key === 'Enter' && send()}
        />
        <button className="icon-btn dark" style={{ width: 46, height: 46 }} onClick={send} disabled={sending || !text.trim()} aria-label="Отправить комментарий">
          <IconSend size={18} />
        </button>
      </div>

      {e.user_id === user.id && (
        <button className="btn btn-danger" style={{ marginTop: 10 }} onClick={removeExpense}>Удалить трату</button>
      )}
    </Sheet>
  );
}
