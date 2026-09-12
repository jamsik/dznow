import { CATEGORIES } from "../data/catalog";

export default function CategorySelector({ value, onChange }) {
  return (
    <div className="rail">
      {CATEGORIES.map(c => (
        <button key={c.id} className="cat" disabled={!c.ready}
                aria-pressed={c.ready ? value === c.id : undefined}
                onClick={() => c.ready && onChange(c.id)}>
          {c.title}{!c.ready && <span className="soon">скоро</span>}
        </button>
      ))}
    </div>
  );
}
