export default function PrimaryAction({ label, note, onClick, disabled }) {
  return (
    <div className="ctabar">
      <div className="in">
        <button className="btn primary" onClick={onClick} disabled={disabled}>{label}</button>
        {note ? <div className="fmt" dangerouslySetInnerHTML={{ __html: note }} /> : null}
      </div>
    </div>
  );
}
