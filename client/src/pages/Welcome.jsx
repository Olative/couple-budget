import { useState } from 'react';
import { api } from '../api/client';

export default function Welcome({ user, onCreated, onJoined }) {
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('€');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const budget = await api.createBudget({ name: name || 'Наш бюджет', currency });
      onCreated(budget);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const budget = await api.joinBudget(inviteCode.trim());
      onJoined(budget);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>💑💰</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Парный бюджет</h1>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15 }}>
          Ведите финансы вместе: расходы, планы, накопления
        </p>
      </div>

      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn" onClick={() => setMode('create')}>
            Создать бюджет
          </button>
          <button className="btn btn-secondary" onClick={() => setMode('join')}>
            Присоединиться по коду
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div>
          <div className="input-group">
            <label className="input-label">Название бюджета</label>
            <input
              className="input"
              placeholder="Наш бюджет"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Валюта</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['€', '$', '₽', '₺', 'RSD', '£', '¥'].map(c => (
                <button
                  key={c}
                  style={{
                    flex: 1, padding: '10px 0', border: '2px solid',
                    borderColor: currency === c ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
                    borderRadius: 8,
                    background: currency === c ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
                    color: currency === c ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
                    fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  }}
                  onClick={() => setCurrency(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 14, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setMode(null)} style={{ flex: 1 }}>
              Назад
            </button>
            <button className="btn" onClick={handleCreate} disabled={loading} style={{ flex: 2 }}>
              {loading ? 'Создаём...' : 'Создать'}
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div>
          <div className="input-group">
            <label className="input-label">Код приглашения</label>
            <input
              className="input"
              placeholder="abc123def456"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              style={{ textAlign: 'center', letterSpacing: 2, fontFamily: 'monospace' }}
            />
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 14, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setMode(null)} style={{ flex: 1 }}>
              Назад
            </button>
            <button className="btn" onClick={handleJoin} disabled={loading || !inviteCode.trim()} style={{ flex: 2 }}>
              {loading ? 'Подключаемся...' : 'Присоединиться'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
