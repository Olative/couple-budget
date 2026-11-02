export default function Sheet({ title, onClose, children }) {
  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-grip" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
