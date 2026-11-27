import { glyph } from './glyphs.js';
import { FACTS } from './facts.js';
import { STARS } from './sun.js';
import { portraitSize } from './portrait-frame.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let serial = 0;
function logo(kind) {
  const u = `study-${serial++}-`;
  const fill = name => `url(#${u}${name})`;
  const settings = [
    { r: 13, x: 64, y: 64, spread: 58, height: 1.1, haze: 0.28 },
    { r: 29, x: 84, y: 48, spread: 56, height: 0.8, haze: 0.22 },
    { r: 22, x: 64, y: 64, spread: 60, height: 1.8, haze: 0.4 },
  ][kind];
  const { r, x, y, spread, height, haze } = settings;
  const streak = (rx, ry) => `M${Math.max(5, x-rx)} ${y} Q${x} ${y-ry*2} ${Math.min(123, x+rx)} ${y} Q${x} ${y+ry*2} ${Math.max(5, x-rx)} ${y}Z`;
  return `<svg viewBox="0 0 128 128" data-kind="${kind}" aria-hidden="true"><defs>
    <radialGradient id="${u}body" cx=".39" cy=".36" r=".68">
      <stop stop-color="oklch(1 0 0)"/>
      <stop offset=".65" stop-color="oklch(0.98 0.015 92)"/>
      <stop offset=".88" stop-color="oklch(0.9 0.035 78)"/>
      <stop offset="1" stop-color="oklch(0.56 0.055 61)"/>
    </radialGradient>
    <radialGradient id="${u}corona">
      <stop offset=".25" stop-color="oklch(0.95 0.11 88 / 0)"/>
      <stop offset=".49" stop-color="oklch(0.91 0.14 87 / .72)"/>
      <stop offset=".6" stop-color="oklch(0.8 0.15 78 / .3)"/>
      <stop offset="1" stop-color="oklch(0.62 0.11 64 / 0)"/>
    </radialGradient>
    <linearGradient id="${u}gold">
      <stop stop-color="oklch(0.76 0.14 78 / 0)"/>
      <stop offset=".2" stop-color="oklch(0.84 0.15 83 / .2)"/>
      <stop offset=".43" stop-color="oklch(0.94 0.13 90 / .85)"/>
      <stop offset=".5" stop-color="oklch(1 0.015 90)"/>
      <stop offset=".57" stop-color="oklch(0.94 0.13 90 / .85)"/>
      <stop offset=".8" stop-color="oklch(0.84 0.15 83 / .2)"/>
      <stop offset="1" stop-color="oklch(0.76 0.14 78 / 0)"/>
    </linearGradient>
    <radialGradient id="${u}halo">
      <stop stop-color="oklch(0.94 0.12 87 / .85)"/>
      <stop offset=".35" stop-color="oklch(0.83 0.13 78 / .38)"/>
      <stop offset="1" stop-color="oklch(0.65 0.1 66 / 0)"/>
    </radialGradient>
    <linearGradient id="${u}streak">
      <stop stop-color="oklch(0.8 0.035 75 / 0)"/>
      <stop offset=".3" stop-color="oklch(0.96 0.015 86 / .25)"/>
      <stop offset=".48" stop-color="oklch(1 0 0 / .95)"/>
      <stop offset=".52" stop-color="oklch(1 0 0 / .95)"/>
      <stop offset=".7" stop-color="oklch(0.96 0.015 86 / .25)"/>
      <stop offset="1" stop-color="oklch(0.8 0.035 75 / 0)"/>
    </linearGradient>
    <radialGradient id="${u}hot">
      <stop stop-color="oklch(1 0 0)"/>
      <stop offset=".2" stop-color="oklch(0.99 0.012 90 / .9)"/>
      <stop offset="1" stop-color="oklch(0.92 0.035 80 / 0)"/>
    </radialGradient>
    <clipPath id="${u}bounds"><path d="M3 4H125V124H3Z"/></clipPath>
  </defs>
  <g clip-path="${fill('bounds')}">
    <ellipse class="breathe" cx="64" cy="64" rx="${r+23}" ry="${r+20}" fill="${fill('halo')}" opacity="${haze}"/>
    <circle class="gold-corona" cx="64" cy="64" r="${r*1.9}" fill="${fill('corona')}"/>
    <g class="star-core"><circle cx="64" cy="64" r="${r}" fill="${fill('body')}"/>
      <ellipse cx="${x}" cy="${y}" rx="1" ry="${kind === 2 ? 28 : 17}" fill="${fill('hot')}" opacity=".65"/>
    </g>
    <g class="optics">
      <ellipse cx="${x}" cy="${y}" rx="${spread}" ry="${kind === 2 ? 12 : 7}" fill="${fill('halo')}" opacity=".36"/>
      <path class="flare-gold" d="${streak(spread, height*4.5)}" fill="${fill('gold')}"/>
      <path class="flare-soft" d="${streak(spread, height*3)}" fill="${fill('streak')}" opacity=".25"/>
      <path class="flare" d="${streak(spread, height)}" fill="${fill('streak')}"/>
      <ellipse cx="${x}" cy="${y}" rx="${kind === 1 ? 9 : r*1.2}" ry="${kind === 1 ? 9 : r*1.6}" fill="${fill('hot')}"/>
      
    </g>
  </g></svg>`;
}

function bind(button) {
  const svg = button.querySelector('svg');
  const white = svg.dataset.kind === '2';
  if (white) button.classList.add('white-heat');
  const optics = svg.querySelector('.optics');
  const original = optics.innerHTML;
  const aim = (x, y) => {
    const px = 64 + x * 2, py = 64 + y * 2;
    const near = 1 - Math.min(1, Math.hypot(x, y));
    optics.querySelectorAll('ellipse').forEach(el => { el.setAttribute('cx', px); el.setAttribute('cy', py); });
    for (const [selector, h] of [['.flare', 1.8], ['.flare-soft', 5.4], ['.flare-gold', 8.1]]) {
      const reach = 55 + 3 * near, left = Math.max(5, px - reach), right = Math.min(123, px + reach);
      const height = h * (1.12 + .08 * near);
      optics.querySelector(selector).setAttribute('d', `M${left} ${py}Q${px} ${py-height*2} ${right} ${py}Q${px} ${py+height*2} ${left} ${py}Z`);
    }
    svg.querySelector('[id$="corona"]').setAttribute('cx', .5 - x * .02);
    svg.querySelector('[id$="corona"]').setAttribute('cy', .5 - y * .02);
  };
  let timer;
  const activate = () => {
    if (reduced.matches || document.hidden) return;
    button.classList.add('active');
    clearTimeout(timer); timer = setTimeout(rest, 60000);
  };
  const rest = () => {
    clearTimeout(timer);
    button.classList.remove('active');
    if (white) {
      optics.innerHTML = original;
      svg.querySelector('[id$="corona"]').removeAttribute('cx');
      svg.querySelector('[id$="corona"]').removeAttribute('cy');
    }
    button.style.removeProperty('--rx');
    button.style.removeProperty('--ry');
    button.style.removeProperty('--reach');
    button.style.removeProperty('--energy');
  };
  button.addEventListener('pointerenter', activate);
  button.addEventListener('focus', activate);
  button.addEventListener('pointermove', e => {
    if (reduced.matches) return;
    activate();
    const r = (white ? svg : button).getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    if (white) aim(Math.max(-1, Math.min(1, x * 2)), Math.max(-1, Math.min(1, y * 2)));
    button.style.setProperty('--rx', `${x * (white ? 3 : 16)}px`);
    button.style.setProperty('--ry', `${y * (white ? 2 : 10)}px`);
    button.style.setProperty('--reach', String(1.05 + .25 * x));
    button.style.setProperty('--energy', String(.75 + .5 * (1 - Math.min(1, Math.hypot(x, y) * 1.4))));
  });
  button.addEventListener('pointerleave', rest);
  button.addEventListener('blur', rest);
  button.addEventListener('pointercancel', rest);
  button.addEventListener('click', () => {
    activate(); clearTimeout(timer); timer = setTimeout(rest, 2400);
    if (white && !reduced.matches) optics.animate([{ opacity: 1 }, { opacity: 1, filter: 'brightness(1.8)' }, { opacity: 1, filter: 'brightness(1)' }], { duration: 650, easing: 'ease-out' });
  });
  document.addEventListener('visibilitychange', rest);
  reduced.addEventListener('change', rest);
}

['Distant', 'Limb flare', 'White heat'].forEach((name, kind) => {
  const study = document.createElement('article');
  study.className = 'study';
  study.innerHTML = `<button type="button" class="logo" aria-label="${name}, large preview">${logo(kind)}</button><h3>${name}</h3><div class="small"><button type="button" class="logo" aria-label="${name}, 128 pixels">${logo(kind)}</button><button type="button" class="logo" aria-label="${name}, 64 pixels">${logo(kind)}</button></div>`;
  study.querySelectorAll('button').forEach(bind);
  document.querySelector('.logos').append(study);
});

const ribbon = document.querySelector('.ribbon');
const selection = document.querySelector('.selection');
let selected = 'sun';
const names = { sun: 'The Sun', zetaoph: 'Zeta Ophiuchi', epseri: 'Epsilon Eridani', luhman: 'Luhman 16', wise: 'WISE 0855', ttauri: 'T Tauri', vycma: 'VY CMa', tzo: 'Thorne–Żytkow', betalyr: 'Beta Lyrae', neutron: 'Pulsar', cygx1: 'Cygnus X-1', sgra: 'Sagittarius A*', qso: '3C 273', st218: 'Stephenson 2-18', wohg64: 'WOH G64', quasi: 'Quasi-star', wr140: 'WR 140', vfts352: 'VFTS 352', xxtri: 'XX Trianguli', epsaur: 'Epsilon Aurigae', powehi: 'Pōwehi', gargantua: 'Gargantua', wr124: 'WR 124', siriusb: 'Sirius B', magnetar: 'SGR 1806-20', crab: 'Crab Nebula', ring: 'Ring Nebula', hubblev1: 'Hubble V1', gaiabh1: 'Gaia BH1', rlep: 'R Leporis', uhz1: 'UHZ1', momz14: 'MoM-z14', eincross: 'Einstein Cross', v838: 'V838 Monocerotis', etacar: 'Eta Carinae', s5hvs1: 'S5-HVS1' };
const nameOf = id => names[id] || FACTS[id]?.name || id[0].toUpperCase() + id.slice(1);
const ids = ['sun', ...Object.keys(STARS).filter(id => id !== 'sun')];
for (const id of ids) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'body no-preview'; button.dataset.id = id;
  button.style.setProperty('--c', 'oklch(0.86 0.08 80)');
  button.style.setProperty('--portrait-size', `${portraitSize(STARS[id].rsun)}px`);
  button.setAttribute('aria-pressed', String(id === selected));
  button.innerHTML = `<span class="portrait">${glyph(id)}</span><span class="body-name"></span>`;
  button.querySelector('.body-name').textContent = nameOf(id);
  button.addEventListener('pointerenter', () => { selection.textContent = nameOf(id); });
  button.addEventListener('focus', () => { selection.textContent = nameOf(id); });
  button.addEventListener('pointerleave', () => { selection.textContent = nameOf(selected); });
  button.addEventListener('click', () => {
    selected = id; selection.textContent = nameOf(id);
    for (const b of ribbon.children) b.setAttribute('aria-pressed', String(b === button));
  });
  ribbon.append(button);
}
for (const b of document.querySelectorAll('.tools [data-mode]')) {
  b.addEventListener('click', () => {
    ribbon.dataset.mode = b.dataset.mode;
    for (const other of document.querySelectorAll('.tools [data-mode]')) other.setAttribute('aria-pressed', String(other === b));
  });
}
document.querySelector('#relative-size').addEventListener('click', e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  ribbon.dataset.scale = on ? 'relative' : 'equal';
});
document.querySelector('#ground').addEventListener('click', e => {
  const on = document.querySelector('.bodies').classList.toggle('light');
  e.currentTarget.setAttribute('aria-pressed', String(on));
});
ribbon.addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const buttons = [...ribbon.children], at = buttons.indexOf(document.activeElement);
  const to = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, at + (e.key === 'ArrowRight' ? 1 : -1)));
  buttons[to].focus({ preventScroll: true });
  buttons[to].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced.matches ? 'instant' : 'smooth' });
});

// Replace glyphs only after the surface renderer returns a real portrait.
const portraitUrls = [];
const observeBodies = new IntersectionObserver(async entries => {
  if (!entries.some(entry => entry.isIntersecting)) return;
  observeBodies.disconnect();
  ribbon.setAttribute('aria-busy', 'true');
  try {
    const { renderScenePortraits } = await import('./scene-portrait.js');
    const rendered = new Set();
    const status = document.querySelector('.render-status');
    const show = (id, blob) => {
      const tile = ribbon.querySelector(`[data-id="${id}"]`);
      if (!tile) return;
      const img = new Image(144, 144);
      img.alt = '';
      const url = URL.createObjectURL(blob); portraitUrls.push(url);
      img.onload = () => {
        tile.querySelector('.portrait').prepend(img); tile.classList.remove('no-preview');
        rendered.add(id); status.textContent = rendered.size === ids.length ? '' : `Rendering ${rendered.size} / ${ids.length}`;
      };
      img.src = url;
    };
    const studio = await renderScenePortraits(ids, show);
    const { attachPortraitHover } = await import('./portrait-hover.js');
    const disposeHover = attachPortraitHover(ribbon, studio);
    addEventListener('pagehide', disposeHover, { once: true });
  } catch (error) {
    console.error('Star Chart surface portraits:', error);
    document.querySelector('.render-status').textContent = 'Rendering stopped. Current icons remain for unfinished bodies.';
  } finally { ribbon.setAttribute('aria-busy', 'false'); }
});
observeBodies.observe(ribbon);
addEventListener('pagehide', () => { for (const url of portraitUrls) URL.revokeObjectURL(url); });
