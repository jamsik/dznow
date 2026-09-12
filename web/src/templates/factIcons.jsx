const PATHS = {
  area: <><path d="M4 20V8l8-4 8 4v12" /><path d="M4 20h16" /><path d="M9 20v-6h6v6" /></>,
  floor: <><rect x="5" y="3" width="14" height="18" rx="1.5" />
           <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></>,
  ready: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  finish: <><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v4M15 12v3" /></>
};

export default function FactIcon({ name, delay }) {
  return (
    <svg className="ic anim-pop" viewBox="0 0 24 24" style={{ "--d": delay }}>
      {PATHS[name]}
    </svg>
  );
}
