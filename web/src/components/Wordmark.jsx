/**
 * Фирменный вордмарк из F:\DZNOW (letterforms 1:1 с DZNOW_wordmark_mono.svg).
 * Буквы берут currentColor и потому живут в обеих темах,
 * а «N» на стыке DZN|NOW залита фирменным градиентом.
 */
export default function Wordmark({ className = "" }) {
  return (
    <span className={"wordmark " + className}>
      <svg viewBox="0 0 1200 220" role="img" aria-label="DZNOW">
        <defs>
          <linearGradient id="dznow-hinge" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#5533FF" />
            <stop offset="0.55" stopColor="#2563FF" />
            <stop offset="1" stopColor="#19D7FF" />
          </linearGradient>
        </defs>
        <g fill="currentColor">
          <path d="M20 30 H115C165 30 195 62 195 110C195 158 165 190 115 190H20 V140 H110C130 140 142 129 142 110C142 91 130 80 110 80H20 Z" />
          <path d="M220 30 H390 V78 L292 142 H390 V190 H220 V142 L318 78 H220 Z" />
          <path fill="url(#dznow-hinge)" d="M415 190 V30 H465 L565 128 V30 H620 V190 H570 L470 92 V190 Z" />
          <path fillRule="evenodd" d="M650 110C650 60 684 30 742 30C800 30 834 60 834 110C834 160 800 190 742 190C684 190 650 160 650 110 Z M704 110C704 87 719 76 742 76C765 76 780 87 780 110C780 133 765 144 742 144C719 144 704 133 704 110 Z" />
          <path d="M858 30 H914 L949 125 L986 30 H1038 L1075 125 L1112 30 H1168 L1108 190 H1056 L1012 82 L968 190 H916 Z" />
        </g>
      </svg>
    </span>
  );
}
