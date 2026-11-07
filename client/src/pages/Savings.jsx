import { useState, useEffect, useCallback } from 'react';
import { IconPlus, IconTrash, IconPencil } from '@tabler/icons-react';
import { api } from '../api/client';
import { GridLines, PenguinPair, Ring } from '../components/Art';
import Sheet from '../components/Sheet';
import Celebration from '../components/Celebration';
import { money, byMonth, confirmAction } from '../format';
import { t } from '../i18n';

function etaText(goal) {
  const left = goal.target_amount - goal.current_amount;
  if (left <= 0) return { text: t('Цель достигнута!'), tone: 'good' };
  if (!goal.eta_month) return { text: t('Пополняйте копилку, и мы покажем, когда накопите'), tone: '' };
  let text = t('При вашем темпе накопите к {month}', { month: byMonth(goal.eta_month) });
  let tone = '';
  if (goal.deadline) {
    const deadlineMonth = goal.deadline.slice(0, 7);
    if (goal.eta_month > deadlineMonth) { text += t(' — позже срока'); tone = 'warn'; }
    else { text += t(' — успеваете'); tone = 'good'; }
  }
  return { text, tone };
}

export default function Savings({ budget }) {
  const [goals, setGoals] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [contributeTo, setContributeTo] = useState(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [plan, setPlan] = useState('');
  const [editing, setEditing] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [reached, setReached] = useState(null);

  const load = useCallback(() => { api.getSavings(budget.id).then(setGoals); }, [budget.id]);
  useEffect(() => { load(); }, [load]);

  const openForm = (goal) => {
    setEditing(goal || null);
    setName(goal?.name || '');
    setTarget(goal ? String(goal.target_amount) : '');
    setDeadline(goal?.deadline || '');
    setPlan(goal?.monthly_plan ? String(goal.monthly_plan) : '');
    setShowAdd(true);
  };

  const saveGoal = async () => {
    if (!name || !target) return;
    setSaving(true);
    const data = { name, target_amount: Number(target), deadline: deadline || null, monthly_plan: Number(plan) || 0 };
    if (editing) await api.updateSavingsGoal(editing.id, data);
    else await api.addSavingsGoal(budget.id, data);
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const contribute = async () => {
    if (!contributeAmount || Number(contributeAmount) <= 0) return;
    setSaving(true);
    const goal = contributeTo;
    const updated = await api.contributeSavings(goal.id, Number(contributeAmount));
    setContributeAmount('');
    setContributeTo(null);
    setSaving(false);
    if (Number(goal.current_amount) < Number(goal.target_amount) && Number(updated.current_amount) >= Number(updated.target_amount)) {
      setReached(goal);
    }
    load();
  };

  const remove = async (goal) => {
    if (!(await confirmAction(t('Удалить цель «{name}»?', { name: goal.name })))) return;
    await api.deleteSavingsGoal(goal.id);
    load();
  };

  const cur = budget.currency;

  return (
    <div className="page">
      <div className="page-head">
        <div className="h-title">{t('Копилка')}</div>
        <button className="icon-btn dark" onClick={() => openForm(null)} aria-label={t('Новая цель')}><IconPlus size={18} /></button>
      </div>

      {goals && goals.length === 0 && (
        <div className="empty">
          <PenguinPair height={70} />
          <div className="empty-text">{t('На что копим вместе?')}</div>
          <button className="btn" style={{ maxWidth: 220 }} onClick={() => openForm(null)}>{t('Создать цель')}</button>
        </div>
      )}

      {goals?.map(goal => {
        const current = Number(goal.current_amount);
        const targetAmount = Number(goal.target_amount);
        const percent = targetAmount > 0 ? (current / targetAmount) * 100 : 0;
        const eta = etaText({ ...goal, current_amount: current, target_amount: targetAmount });
        const monthPlan = Number(goal.monthly_plan);
        const monthSaved = Number(goal.month_saved);
        return (
          <div key={goal.id} className="stamp-wrap">
            <div className="stamp" style={{ padding: '22px 18px 20px', textAlign: 'center' }}>
              <GridLines color="#000" opacity={0.06} />
              <div className="rel">
                <div className="num" style={{ fontSize: 14, fontWeight: 400 }}>{goal.name}</div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 10px' }}>
                  <Ring size={140} percent={percent}><PenguinPair height={64} /></Ring>
                </div>
                <div className="num" style={{ fontSize: 22 }}>{money(current, cur)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontWeight: 300 }}>
                  {t('из {sum}', { sum: money(targetAmount, cur) })} · {Math.round(percent)}%
                </div>
                <div className={eta.tone} style={{ fontSize: 12, marginTop: 8, color: eta.tone ? undefined : 'var(--ink-2)' }}>{eta.text}</div>
                {monthPlan > 0 && current < targetAmount && (
                  <div className="envelope">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>{t('В этом месяце')}</span>
                      <span className="num" style={{ fontSize: 12 }}>{money(monthSaved, cur)} <span className="muted">{t('из {sum}', { sum: money(monthPlan, cur) })}</span></span>
                    </div>
                    <div className="progress">
                      <div className="progress-fill" style={{ width: `${Math.min(100, (monthSaved / monthPlan) * 100)}%`, background: monthSaved >= monthPlan ? 'var(--ok)' : 'var(--ink)' }} />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn" onClick={() => { setContributeTo(goal); setContributeAmount(''); }}>{t('Пополнить')}</button>
                  <button className="icon-btn" style={{ width: 50, height: 50, background: 'var(--surface-2)' }} onClick={() => openForm(goal)} aria-label={t('Изменить цель')}>
                    <IconPencil size={18} stroke={1.5} />
                  </button>
                  <button className="icon-btn" style={{ width: 50, height: 50, background: 'var(--surface-2)' }} onClick={() => remove(goal)} aria-label={t('Удалить цель')}>
                    <IconTrash size={18} stroke={1.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {showAdd && (
        <Sheet title={editing ? t('Цель') : t('Новая цель')} onClose={() => setShowAdd(false)}>
          <div className="input-group">
            <label className="input-label">{t('На что копим?')}</label>
            <input className="input" placeholder={t('Поездка в Японию')} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">{t('Сколько нужно')}</label>
            <input className="input" type="number" inputMode="numeric" placeholder={`150 000 ${cur}`} value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">{t('К какому сроку (необязательно)')}</label>
            <div className="date-field">
              <input className={`input ${deadline ? "" : "date-empty"}`} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              {!deadline && <span className="date-placeholder">{t('Выбрать дату')}</span>}
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">{t('Откладывать каждый месяц (необязательно)')}</label>
            <input className="input" type="number" inputMode="numeric" placeholder={`10 000 ${cur}`} value={plan} onChange={e => setPlan(e.target.value)} />
            <div className="row-sub" style={{ margin: '6px 4px 0' }}>{t('Покажем, сколько отложено в этом месяце, а бот напомнит после 20-го, если план не выполнен')}</div>
          </div>
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>{t('Отмена')}</button>
            <button className="btn" onClick={saveGoal} disabled={saving || !name || !target}>{saving ? t('Сохраняем…') : editing ? t('Сохранить') : t('Создать')}</button>
          </div>
        </Sheet>
      )}

      {contributeTo && (
        <Sheet title={t('Пополнить «{name}»', { name: contributeTo.name })} onClose={() => setContributeTo(null)}>
          <div className="card-pad">
            <input className="amount-input" type="number" inputMode="decimal" placeholder={`0 ${cur}`} value={contributeAmount} onChange={e => setContributeAmount(e.target.value)} autoFocus />
          </div>
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => setContributeTo(null)}>{t('Отмена')}</button>
            <button className="btn" onClick={contribute} disabled={saving || !contributeAmount}>{saving ? t('Сохраняем…') : t('Пополнить')}</button>
          </div>
        </Sheet>
      )}

      {reached && (
        <Celebration
          anim="celebrate"
          label={t('цель достигнута')}
          title={reached.name}
          subtitle={t('Накопили {sum}. Можно тратить с удовольствием', { sum: money(reached.target_amount, cur) })}
          onClose={() => setReached(null)}
        />
      )}
    </div>
  );
}
