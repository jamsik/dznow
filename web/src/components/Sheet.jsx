/** Нижний шит: подтверждения, меню «•••», результат экспорта. */
export default function Sheet({ onClose, children }) {
  return (
    <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}
