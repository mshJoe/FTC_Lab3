/* ================= ICONS ================= */
const ICONS={
  cap:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  phone:'<path d="M6.5 3.5h3l1.5 4-2 1.2a11 11 0 0 0 6.3 6.3l1.2-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>',
  linkedin:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.2v.01M12 17v-6.5M12 13.5c0-2 1.2-3 2.6-3S17 11.5 17 13.5V17"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  send:'<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  reset:'<path d="M4 4v6h6"/><path d="M5.2 15a8 8 0 1 0 .3-7.5L4 10"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  down:'<path d="M6 9l6 6 6-6"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  alert:'<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.2M12 17.2v.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.01"/>',
  code:'<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
  play:'<path d="M7 5l12 7-12 7z"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M6.8 6.8L5.4 5.4M18.6 18.6l-1.4-1.4M17.2 6.8l1.4-1.4M5.4 18.6l1.4-1.4"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  edit:'<path d="M4 20l4.5-1L19.5 8a2.1 2.1 0 0 0-3-3L5.5 16z"/><path d="M13.5 6.5l3 3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>',
  users:'<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 5.6a3.5 3.5 0 0 1 0 5.8M17.5 14.6a6.5 6.5 0 0 1 4 5.4"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  note:'<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/>'
};
const ic=(n,c='')=>`<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;
document.querySelectorAll('[data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic,e.className||'')});

