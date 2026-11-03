import { createPortal } from 'react-dom';
import SpriteAnim from './SpriteAnim';

// Full-screen moment of joy: plays a dance, then closes itself (or on tap).
export default function Celebration({ anim, label, title, subtitle, loops = 2, onClose }) {
  return createPortal(
    <div className="celebration" onClick={onClose}>
      <SpriteAnim name={anim} width="min(78vw, 340px)" loops={loops} onDone={() => setTimeout(onClose, 500)} />
      {label && <div className="celebration-label">· {label} ·</div>}
      {title && <div className="celebration-title">{title}</div>}
      {subtitle && <div className="celebration-sub">{subtitle}</div>}
    </div>,
    document.body
  );
}
