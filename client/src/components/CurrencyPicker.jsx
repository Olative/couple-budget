import { useState, useMemo } from 'react';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Евро' },
  { code: 'USD', symbol: '$', name: 'Доллар США' },
  { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
  { code: 'THB', symbol: '฿', name: 'Тайский бат' },
  { code: 'GBP', symbol: '£', name: 'Британский фунт' },
  { code: 'TRY', symbol: '₺', name: 'Турецкая лира' },
  { code: 'JPY', symbol: '¥', name: 'Японская иена' },
  { code: 'CNY', symbol: '¥', name: 'Китайский юань' },
  { code: 'KRW', symbol: '₩', name: 'Южнокорейская вона' },
  { code: 'INR', symbol: '₹', name: 'Индийская рупия' },
  { code: 'RSD', symbol: 'RSD', name: 'Сербский динар' },
  { code: 'AED', symbol: 'د.إ', name: 'Дирхам ОАЭ' },
  { code: 'ARS', symbol: '$', name: 'Аргентинское песо' },
  { code: 'AUD', symbol: 'A$', name: 'Австралийский доллар' },
  { code: 'BRL', symbol: 'R$', name: 'Бразильский реал' },
  { code: 'CAD', symbol: 'C$', name: 'Канадский доллар' },
  { code: 'CHF', symbol: 'Fr', name: 'Швейцарский франк' },
  { code: 'CLP', symbol: '$', name: 'Чилийское песо' },
  { code: 'COP', symbol: '$', name: 'Колумбийское песо' },
  { code: 'CZK', symbol: 'Kč', name: 'Чешская крона' },
  { code: 'DKK', symbol: 'kr', name: 'Датская крона' },
  { code: 'EGP', symbol: 'E£', name: 'Египетский фунт' },
  { code: 'GEL', symbol: '₾', name: 'Грузинский лари' },
  { code: 'HKD', symbol: 'HK$', name: 'Гонконгский доллар' },
  { code: 'HUF', symbol: 'Ft', name: 'Венгерский форинт' },
  { code: 'IDR', symbol: 'Rp', name: 'Индонезийская рупия' },
  { code: 'ILS', symbol: '₪', name: 'Израильский шекель' },
  { code: 'ISK', symbol: 'kr', name: 'Исландская крона' },
  { code: 'KGS', symbol: 'сом', name: 'Киргизский сом' },
  { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге' },
  { code: 'MAD', symbol: 'MAD', name: 'Марокканский дирхам' },
  { code: 'MXN', symbol: 'Mex$', name: 'Мексиканское песо' },
  { code: 'MYR', symbol: 'RM', name: 'Малайзийский ринггит' },
  { code: 'NGN', symbol: '₦', name: 'Нигерийская найра' },
  { code: 'NOK', symbol: 'kr', name: 'Норвежская крона' },
  { code: 'NZD', symbol: 'NZ$', name: 'Новозеландский доллар' },
  { code: 'PEN', symbol: 'S/', name: 'Перуанский соль' },
  { code: 'PHP', symbol: '₱', name: 'Филиппинское песо' },
  { code: 'PKR', symbol: '₨', name: 'Пакистанская рупия' },
  { code: 'PLN', symbol: 'zł', name: 'Польский злотый' },
  { code: 'QAR', symbol: 'QR', name: 'Катарский риал' },
  { code: 'RON', symbol: 'lei', name: 'Румынский лей' },
  { code: 'SAR', symbol: 'SR', name: 'Саудовский риял' },
  { code: 'SEK', symbol: 'kr', name: 'Шведская крона' },
  { code: 'SGD', symbol: 'S$', name: 'Сингапурский доллар' },
  { code: 'TWD', symbol: 'NT$', name: 'Тайваньский доллар' },
  { code: 'UAH', symbol: '₴', name: 'Украинская гривна' },
  { code: 'UYU', symbol: '$U', name: 'Уругвайское песо' },
  { code: 'UZS', symbol: 'сўм', name: 'Узбекский сум' },
  { code: 'VND', symbol: '₫', name: 'Вьетнамский донг' },
  { code: 'ZAR', symbol: 'R', name: 'Южноафриканский рэнд' },
  { code: 'AMD', symbol: '֏', name: 'Армянский драм' },
  { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль' },
  { code: 'MDL', symbol: 'L', name: 'Молдавский лей' },
  { code: 'BAM', symbol: 'KM', name: 'Конвертируемая марка' },
  { code: 'BGN', symbol: 'лв', name: 'Болгарский лев' },
  { code: 'HRK', symbol: 'kn', name: 'Хорватская куна' },
  { code: 'LKR', symbol: 'Rs', name: 'Шри-ланкийская рупия' },
  { code: 'MMK', symbol: 'K', name: 'Мьянманский кьят' },
  { code: 'KHR', symbol: '៛', name: 'Камбоджийский риель' },
  { code: 'LAK', symbol: '₭', name: 'Лаосский кип' },
];

const POPULAR_CODES = ['EUR', 'USD', 'RUB', 'THB', 'GBP', 'TRY', 'GEL', 'RSD'];

export function getCurrencySymbol(codeOrSymbol) {
  const c = CURRENCIES.find(c => c.code === codeOrSymbol || c.symbol === codeOrSymbol);
  return c ? c.symbol : codeOrSymbol;
}

export function getCurrencyDisplay(codeOrSymbol) {
  const c = CURRENCIES.find(c => c.code === codeOrSymbol || c.symbol === codeOrSymbol);
  return c ? `${c.symbol} ${c.code}` : codeOrSymbol;
}

export default function CurrencyPicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = CURRENCIES.find(c => c.code === value || c.symbol === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  const popular = CURRENCIES.filter(c => POPULAR_CODES.includes(c.code));
  const displayList = filtered || popular;

  const handleSelect = (c) => {
    onChange(c.symbol);
    setOpen(false);
    setSearch('');
  };

  if (!open) {
    return (
      <div className="input-group">
        {label && <label className="input-label">{label}</label>}
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: '100%', padding: '12px 16px', border: '2px solid var(--tg-theme-secondary-bg-color)',
            borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {selected ? `${selected.symbol}  ${selected.name}` : value || 'Выберите валюту'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>▼</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
      background: 'var(--tg-theme-bg-color)', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--tg-theme-secondary-bg-color)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => { setOpen(false); setSearch(''); }}
          style={{
            background: 'none', border: 'none', fontSize: 24,
            color: 'var(--tg-theme-text-color)', cursor: 'pointer', padding: 4,
          }}
        >
          ←
        </button>
        <input
          autoFocus
          placeholder="Поиск валюты..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: '10px 14px', border: '2px solid var(--tg-theme-secondary-bg-color)',
            borderRadius: 10, background: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)', fontSize: 16, outline: 'none',
          }}
        />
      </div>

      {!filtered && (
        <div style={{
          padding: '8px 16px 4px', fontSize: 13, fontWeight: 600,
          color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase',
        }}>
          Популярные
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayList.map(c => (
          <button
            key={c.code}
            onClick={() => handleSelect(c)}
            style={{
              width: '100%', padding: '14px 16px', border: 'none',
              background: (selected?.code === c.code) ? 'var(--tg-theme-secondary-bg-color)' : 'transparent',
              color: 'var(--tg-theme-text-color)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            }}
          >
            <span style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700,
              background: 'var(--tg-theme-secondary-bg-color)',
            }}>
              {c.symbol}
            </span>
            <div>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{c.code}</div>
            </div>
            {selected?.code === c.code && (
              <span style={{ marginLeft: 'auto', color: 'var(--tg-theme-button-color)', fontSize: 20 }}>✓</span>
            )}
          </button>
        ))}

        {filtered && filtered.length === 0 && (
          <div style={{
            padding: 32, textAlign: 'center', color: 'var(--tg-theme-hint-color)',
          }}>
            Ничего не найдено
          </div>
        )}

        {!filtered && (
          <>
            <div style={{
              padding: '16px 16px 4px', fontSize: 13, fontWeight: 600,
              color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase',
            }}>
              Все валюты
            </div>
            {CURRENCIES.filter(c => !POPULAR_CODES.includes(c.code)).map(c => (
              <button
                key={c.code}
                onClick={() => handleSelect(c)}
                style={{
                  width: '100%', padding: '14px 16px', border: 'none',
                  background: (selected?.code === c.code) ? 'var(--tg-theme-secondary-bg-color)' : 'transparent',
                  color: 'var(--tg-theme-text-color)', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700,
                  background: 'var(--tg-theme-secondary-bg-color)',
                }}>
                  {c.symbol}
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{c.code}</div>
                </div>
                {selected?.code === c.code && (
                  <span style={{ marginLeft: 'auto', color: 'var(--tg-theme-button-color)', fontSize: 20 }}>✓</span>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
