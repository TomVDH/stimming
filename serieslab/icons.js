// Category icons: an outline hex holding a solid glyph cut with negative space.
// Both the icons sheet and the dividers sheet draw from here.
// Each motif is a solid shape on a 24 x 24 grid, plus cuts that punch through it.
// `fill` draws in the colour; `cut` draws in black inside the mask, so it removes.
export const M = {
  poke: [
    ['Bubble sheet', {
      fill: `<rect x="1.5" y="1.5" width="21" height="21" rx="4"/>`,
      cut: `<circle cx="7.8" cy="7.8" r="3.9"/><circle cx="16.2" cy="7.8" r="3.9"/><circle cx="7.8" cy="16.2" r="3.9"/><circle cx="16.2" cy="16.2" r="3.9"/>`,
      top: `<circle cx="7.8" cy="7.8" r="2.6"/><circle cx="16.2" cy="7.8" r="2.6"/><circle cx="7.8" cy="16.2" r="2.6"/><path d="M14.4 14.4l3.6 3.6M18 14.4l-3.6 3.6" stroke-width="1.6" stroke-linecap="round"/>`,
    }],
    ['Big button', {
      fill: `<path d="M1.5 16.5H22.5V21.5H1.5Z"/><path d="M4.5 16.5V12a7.5 5 0 0 1 15 0V16.5Z"/>`,
      cut: `<path d="M7.6 11.6a4.4 2.6 0 0 1 4.6-2.6" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M1.5 16.5H22.5" stroke-width="1.4"/>`,
      top: `<path d="M12 1.2V4.4M6.6 2.6L8 5.4M17.4 2.6L16 5.4" stroke-width="1.8" stroke-linecap="round"/>`,
    }],
    ['Pop!', {
      fill: `<path d="M12 .8L14.3 6.2L19.6 3.6L18.2 9.4L23.2 12L18.2 14.6L19.6 20.4L14.3 17.8L12 23.2L9.7 17.8L4.4 20.4L5.8 14.6L.8 12L5.8 9.4L4.4 3.6L9.7 6.2Z"/>`,
      cut: `<path d="M10.8 6.8H13.2L12.8 13.6H11.2Z"/><circle cx="12" cy="16.4" r="1.4"/>`,
    }],
  ],
  goo: [
    ['Slime face', {
      fill: `<path d="M3.4 21.5C1.4 21.5 1 18.4 2.6 17C1.8 13.6 3.8 9.6 7 8.6C8 4.4 13.4 2.7 16.4 5.4C20 5.6 22.6 9.8 21.4 13.8C23.4 16.2 22.8 21.5 19.6 21.5Z"/>`,
      cut: `<ellipse cx="9.2" cy="14" rx="2.2" ry="2.6"/><ellipse cx="15.4" cy="13.4" rx="2.2" ry="2.6"/><path d="M5.4 9.6a4 4 0 0 1 3-3" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
      top: `<circle cx="9.8" cy="14.6" r="1"/><circle cx="16" cy="14" r="1"/>`,
    }],
    ['Drip', {
      fill: `<path d="M2 2H22V10.6L19.4 13.4V19.2L16.8 22.4L14.2 19.2V15L11.6 17.6L9 15V12.8L6.2 15.4L2 11.8Z"/>`,
      cut: `<path d="M5 5H12.5" stroke-width="2" stroke-linecap="round"/><circle cx="16.8" cy="17.6" r="1.1"/>`,
    }],
    ['Drop', {
      fill: `<path d="M12 1.2C12 1.2 4.4 10 4.4 14.8a7.6 7.6 0 0 0 15.2 0C19.6 10 12 1.2 12 1.2Z"/>`,
      cut: `<path d="M8 15.2a4.2 4.2 0 0 0 3.2 3.8" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    }],
  ],
  light: [
    ['Prism', {
      fill: `<path d="M10 2.2L18.6 20.6H1.4Z"/><path d="M17.6 10.6L23.4 7.6V9.8ZM18 12.4L23.4 11.6V13.8ZM18.4 14.2L23.4 15.6V17.8Z"/>`,
      cut: `<path d="M10 9.4L14 17.6H6Z"/>`,
      top: `<path d="M.6 13.6L8.2 12.4" stroke-width="1.8" stroke-linecap="round"/>`,
    }],
    ['Bulb', {
      fill: `<path d="M12 1.2a7.6 7.6 0 0 1 4.6 13.6V17.6H7.4V14.8A7.6 7.6 0 0 1 12 1.2Z"/><path d="M8 19H16V20.6H8ZM9.2 21.6H14.8V23H9.2Z"/>`,
      cut: `<path d="M9.4 14.2L10.6 9.2L12 11.4L13.4 9.2L14.6 14.2" stroke-width="1.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M7.6 6.8a4.6 4.6 0 0 1 2.8-2.6" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    }],
    ['Glint', {
      fill: `<path d="M11 1L13.2 9.8L22 12L13.2 14.2L11 23L8.8 14.2L0 12L8.8 9.8Z"/><path d="M19.4 1.4L20.3 3.9L22.8 4.8L20.3 5.7L19.4 8.2L18.5 5.7L16 4.8L18.5 3.9Z"/>`,
      cut: `<circle cx="11" cy="12" r="1.8"/>`,
    }],
  ],
  science: [
    ['Flask', {
      fill: `<path d="M8.2 1.4H15.8V3.6H14.6V8.6L21.4 20V22.6H2.6V20L9.4 8.6V3.6H8.2Z"/>`,
      cut: `<path d="M6.8 15.2H17.2" stroke-width="1.5"/><circle cx="10.2" cy="18.6" r="1.3"/><circle cx="14" cy="17.8" r="0.9"/><circle cx="12.2" cy="12.2" r="0.9"/>`,
    }],
    ['Atom', {
      fill: `<circle cx="12" cy="12" r="3"/>`,
      top: `<g fill="none" stroke-width="1.9"><ellipse cx="12" cy="12" rx="10.4" ry="4.2"/><ellipse cx="12" cy="12" rx="10.4" ry="4.2" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10.4" ry="4.2" transform="rotate(-60 12 12)"/></g>`,
    }],
    ['Magnet', {
      fill: `<path d="M3 2H9.4V12.6a2.6 2.6 0 0 0 5.2 0V2H21V12.6a9 9 0 0 1-18 0Z"/>`,
      cut: `<path d="M3 6.6H9.4M14.6 6.6H21" stroke-width="1.6"/>`,
    }],
  ],
  dark: [
    ['Moon and star', {
      fill: `<path d="M13.6 1.6A10.2 10.2 0 1 0 22.4 16.8A8.4 8.4 0 0 1 13.6 1.6Z"/><path d="M19.4 2L20.4 4.6L23 5.6L20.4 6.6L19.4 9.2L18.4 6.6L15.8 5.6L18.4 4.6Z"/>`,
      cut: `<circle cx="7.6" cy="14" r="1.3"/><circle cx="11" cy="18.6" r="0.9"/><circle cx="6" cy="9" r="0.7"/>`,
    }],
    ['Eyes in the dark', {
      fill: `<path d="M.8 12.4C3.4 6.4 8.8 6.4 11.2 12.4C8.8 18.4 3.4 18.4 .8 12.4ZM12.8 12.4C15.2 6.4 20.6 6.4 23.2 12.4C20.6 18.4 15.2 18.4 12.8 12.4Z"/>`,
      cut: `<path d="M6 9.6V15.2M18 9.6V15.2" stroke-width="2.6" stroke-linecap="round"/>`,
    }],
    ['Night window', {
      fill: `<path d="M3 1.5H21V22.5H3Z"/>`,
      cut: `<path d="M5.5 4H18.5V20H5.5Z"/>`,
      top: `<path d="M14.6 6.2A5.4 5.4 0 1 0 17 14.4A4.4 4.4 0 0 1 14.6 6.2Z"/><path d="M12 4V20M5.5 12.2H18.5" stroke-width="1.4"/>`,
    }],
  ],
  candy: [
    ['Diorama box', {
      fill: `<path d="M12 1.4L22.2 7.2V16.8L12 22.6L1.8 16.8V7.2Z"/>`,
      cut: `<path d="M12 12.6V22.6M1.8 7.2L12 12.6L22.2 7.2" stroke-width="1.4" fill="none"/><path d="M4.6 15.8L7.6 11L10.2 14.6V18.8Z"/><circle cx="16.4" cy="14" r="1.6"/>`,
    }],
    ['Snow globe', {
      fill: `<circle cx="12" cy="10.4" r="9"/><path d="M4.6 18.4H19.4L21 22.8H3Z"/>`,
      cut: `<circle cx="12" cy="10.4" r="7.2"/>`,
      top: `<path d="M12 4.8L16 11.6H13.4L16.4 15.6H7.6L10.6 11.6H8Z"/><circle cx="7" cy="7.6" r="0.9"/><circle cx="17.4" cy="6.8" r="0.8"/><circle cx="16.2" cy="9.4" r="0.6"/><path d="M8.6 3.8a7.6 7.6 0 0 0-3.4 3" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
    }],
    ['Little stage', {
      fill: `<path d="M1.6 2H22.4V22.4H1.6Z"/>`,
      cut: `<path d="M4.4 6.4H19.6V22.4H4.4Z"/>`,
      top: `<path d="M4.4 6.4C6.6 9 8.6 9.4 10.4 7.6V6.4ZM19.6 6.4C17.4 9 15.4 9.4 13.6 7.6V6.4Z"/><path d="M4.4 6.4V18.6C5.8 17.4 6.4 13 6 9.6ZM19.6 6.4V18.6C18.2 17.4 17.6 13 18 9.6Z"/><path d="M12 12.2L13 14.6L15.6 14.9L13.6 16.6L14.2 19.2L12 17.8L9.8 19.2L10.4 16.6L8.4 14.9L11 14.6Z"/>`,
    }],
  ],
  sonder: [
    ['Lit window', {
      fill: `<path d="M3 1.6H21V22.4H3Z"/>`,
      cut: `<path d="M6.4 5H17.6V19H6.4Z"/>`,
      top: `<circle cx="12" cy="10.6" r="2.6"/><path d="M6.4 19C6.6 15.4 9 13.8 12 13.8S17.4 15.4 17.6 19Z"/>`,
    }],
    ['Bench and lamp', {
      fill: `<path d="M1.6 14.6H16.4V16.6H1.6ZM2.6 11.4H15.4V13.2H2.6ZM3 16.6H4.8V21.4H3ZM13.2 16.6H15V21.4H13.2Z"/><path d="M19.4 4H21V21.4H19.4Z"/><path d="M17 2.2H23.4L22.4 5H18Z"/>`,
      top: `<path d="M20.2 6.4L17.6 12.4M20.2 6.4L22.8 12.4" stroke-width="0.9" opacity="0.6"/>`,
    }],
    ['Coffee', {
      fill: `<path d="M3 10.4H17.4V15.8A5.6 5.6 0 0 1 11.8 21.4H8.6A5.6 5.6 0 0 1 3 15.8Z"/><path d="M17.4 12H19a2.8 2.8 0 0 1 0 5.6H17V15.8H19a1 1 0 0 0 0-2H17.4Z"/><path d="M1.8 22H18.6V23.4H1.8Z"/>`,
      top: `<path d="M7.4 2.4C6.2 4 8.6 5 7.4 7.4M11.4 1.6C10.2 3.2 12.6 4.2 11.4 6.6" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    }],
  ],
  odd: [
    ['Asterisk', {
      fill: `<g transform="rotate(14 12 12)"><path d="M10.3 1.2H13.7V9.1L20.4 5.2L22.1 8.2L15.4 12L22.1 15.8L20.4 18.8L13.7 14.9V22.8H10.3V14.9L3.6 18.8L1.9 15.8L8.6 12L1.9 8.2L3.6 5.2L10.3 9.1Z"/></g>`,
      cut: `<circle cx="12" cy="12" r="1.8"/>`,
    }],
    ['Googly eye', {
      fill: `<circle cx="12" cy="12" r="10.8"/>`,
      cut: `<circle cx="12" cy="12" r="8.6"/>`,
      top: `<circle cx="15.2" cy="15.6" r="4.6"/>`,
    }],
    ['Question', {
      fill: `<g transform="rotate(-12 12 12)"><path d="M6 8.2a6 6 0 1 1 9.2 5.1C13.6 14.3 13.2 15 13.2 16.8H10C10 14 10.9 12.4 12.8 11.1A2.8 2.8 0 1 0 9.3 8.2Z"/><circle cx="11.6" cy="20.6" r="2.1"/></g>`,
    }],
  ],
};

// A neutral outline hex holds the glyph; only the glyph takes the colour.
// One mask per icon cuts the negative space.
let uid = 0;
export const icon = (m, c) => {
  const id = 'm' + (uid++);
  return `<svg viewBox="0 0 44 44" aria-hidden="true">
    <path d="M22 2.6L39 12.3V31.7L22 41.4L5 31.7V12.3Z" fill="oklch(0.2 0.012 275)" stroke="oklch(0.42 0.018 275)" stroke-width="2" stroke-linejoin="round"/>
    <g transform="translate(11 11) scale(0.917)" fill="${c}" stroke="${c}" stroke-width="0">
      <mask id="${id}" maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28"><rect x="-2" y="-2" width="28" height="28" fill="white"/><g fill="black" stroke="black">${m.cut || ''}</g></mask>
      <g mask="url(#${id})">${m.fill || ''}</g>${m.top || ''}
    </g></svg>`;
};

// Tom's picks live in the browser; these are the defaults.
// Tom's picks, 2026-11-09.
export const DEFAULTS = { poke: 'Pop!', goo: 'Drop', light: 'Glint', science: 'Atom', dark: 'Moon and star', odd: 'Asterisk', candy: 'Snow globe', sonder: 'Lit window' };
export const PICKS_KEY = 'stimming.serieslab.icons3';
export function picks() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(PICKS_KEY)) || {}; } catch (e) {}
  return { ...DEFAULTS, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v)) };
}
export const motif = (k, label) => (M[k].find(([l]) => l === label) || M[k][0])[1];
