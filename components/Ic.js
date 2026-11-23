const P = {
  hash: <path d='M5 9h14M4 15h14M10 4L8 20M16 4l-2 16' />,
  speaker: <><path d='M11 5L6 9H3v6h3l5 4z' /><path d='M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12' /></>,
  chevR: <path d='M9 6l6 6-6 6' />,
  chevD: <path d='M6 9l6 6 6-6' />,
  search: <><circle cx='11' cy='11' r='7' /><path d='M20 20l-4-4' /></>,
  userplus: <><circle cx='9' cy='8' r='4' /><path d='M2 21c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6' /></>,
  gear: <><circle cx='12' cy='12' r='3' /><path d='M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1' /></>,
  people: <><circle cx='9' cy='8' r='3.5' /><path d='M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5' /><circle cx='17' cy='9' r='2.5' /><path d='M17.5 14c3 .2 4.5 1.8 4.5 4.5' /></>,
  back: <path d='M15 6l-6 6 6 6' />,
  x: <path d='M6 6l12 12M18 6L6 18' />,
  chat: <path d='M4 5h16v11H9l-5 4z' />,
  plus: <path d='M12 5v14M5 12h14' />,
  emoji: <><circle cx='12' cy='12' r='9' /><path d='M8 14c1 1.5 2.3 2 4 2s3-.5 4-2M9 9.5h.01M15 9.5h.01' /></>,
  send: <path d='M4 12l16-8-6 16-3-6z' />,
  link: <path d='M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' />,
  shield: <><path d='M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z' /><path d='M8.5 12l2.5 2.5 4.5-5' /></>,
  info: <><circle cx='12' cy='12' r='9' /><path d='M12 11v5M12 8h.01' /></>,
  list: <path d='M4 6h16M4 12h16M4 18h10' />,
  copy: <><rect x='8' y='8' width='12' height='12' rx='2' /><path d='M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2' /></>,
  folder: <path d='M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />,
  grid: <><rect x='3' y='3' width='7' height='7' rx='1.5' /><rect x='14' y='3' width='7' height='7' rx='1.5' /><rect x='3' y='14' width='7' height='7' rx='1.5' /><rect x='14' y='14' width='7' height='7' rx='1.5' /></>,
  bot: <><rect x='5' y='8' width='14' height='11' rx='3' /><path d='M12 8V4M9 13h.01M15 13h.01M9 17h6' /></>,
  check: <><circle cx='12' cy='12' r='9' /><path d='M8 12.5l3 3 5-6' /></>,
};

// Small line icons used by the Discord-style screens.
export default function Ic({ n, s = 20 }) {
  return (
    <svg viewBox='0 0 24 24' width={s} height={s} fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>{P[n]}</svg>
  );
}
