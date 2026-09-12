const P = {
  home: <><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></>,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" />
         <rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M4.8 20c.9-3.6 3.7-5.4 7.2-5.4s6.3 1.8 7.2 5.4" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  chev: <path d="M9 5l7 7-7 7" />,
  dots: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  download: <><path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" /></>,
  share: <><path d="M12 15V4m0 0 4 4m-4-4L8 8" /><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="8.6" cy="9.6" r="1.6" />
          <path d="M4 16.5 9 12l4 3.4 3-2.4 4 3.5" /></>,
  check: <path d="M5 12.5 10 17.5 19 7" />
};

export default function Icon({ name, className }) {
  return <svg className={className} viewBox="0 0 24 24">{P[name]}</svg>;
}

export const PlayGlyph = () => <svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" /></svg>;
