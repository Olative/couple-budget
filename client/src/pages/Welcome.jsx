import { useState } from 'react';
import { IconHeart } from '@tabler/icons-react';
import { api } from '../api/client';
import CurrencyPicker from '../components/CurrencyPicker';
import Sheet from '../components/Sheet';
import { ArcTitle, GridLines, PenguinPair } from '../components/Art';

export default function Welcome({ onReady }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('€');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    setLoading(true);
    setError('');
    try {
      onReady(await api.createBudget({ name: name || 'Наш бюджет', currency }));
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 44, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <div className="ticket">
        <span className="notch" style={{ left: -11, top: '24%' }} />
        <span className="notch" style={{ right: -11, top: '24%' }} />
        <span className="notch" style={{ left: -11, top: '70%' }} />
        <span className="notch" style={{ right: -11, top: '70%' }} />
        <div className="badge"><IconHeart size={20} stroke={1.6} /></div>
        <div className="ticket-in" style={{ height: 'min(108vw, 420px)' }}>
          <GridLines color="#fff" opacity={0.35} />
          <ArcTitle title="Lolo & Pepe" subtitle="бюджет для двоих" />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '9%' }}>
            <PenguinPair height={150} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 24 }}>
        <button className="btn" onClick={() => setCreating(true)}>Создать бюджет</button>
        <div className="row-sub" style={{ textAlign: 'center', fontSize: 12, padding: '0 24px' }}>
          Вас уже позвали в бюджет? Откройте ссылку-приглашение
        </div>
      </div>

      {creating && (
        <Sheet title="Новый бюджет" onClose={() => setCreating(false)}>
          <div className="input-group">
            <label className="input-label">Название</label>
            <input className="input" placeholder="Наш бюджет" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <CurrencyPicker value={currency} onChange={setCurrency} label="Валюта" />
          {error && <div className="warn" style={{ fontSize: 13, margin: '0 4px' }}>{error}</div>}
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => setCreating(false)}>Назад</button>
            <button className="btn" disabled={loading} onClick={create}>{loading ? 'Создаём…' : 'Создать'}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
