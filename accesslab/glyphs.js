// @ts-check
// The access glyphs, ColorSym marks and colour-vision filters, as one SVG sprite.
// Glyphs: 24 by 16 hairlines, Bar v3's How to play idiom (docs/plans/access.md).
// ColorSym after Chris Eastridge and Luis Francisco, CC BY-SA 4.0, redrawn.
export const SPRITE = `<svg class="defs" aria-hidden="true">
  <defs>
    <!-- Grammar: the left half is the subject, the right half the modifier. -->
    <!-- Three ticks mean fast and repeated. The point is Bar v3's touch point. -->
    <symbol id="g-flash" viewBox="0 0 24 16"><rect fill="currentColor" stroke="none" x="2.5" y="4" width="8" height="8"/><path d="M15 4.5v7M18 4.5v7M21 4.5v7"/></symbol>
    <symbol id="g-taps" viewBox="0 0 24 16"><circle fill="currentColor" stroke="none" cx="6.5" cy="8" r="2"/><circle cx="6.5" cy="8" r="4.5"/><path d="M15 4.5v7M18 4.5v7M21 4.5v7"/></symbol>
    <!-- Hold: Bar v3's long press, a bar that lasts. -->
    <symbol id="g-hold" viewBox="0 0 24 16"><circle fill="currentColor" stroke="none" cx="6.5" cy="8" r="2"/><circle cx="6.5" cy="8" r="4.5"/><path d="M13.5 5.5v5M13.5 8h7M20.5 5.5v5"/></symbol>
    <!-- Drag: a dotted path to a small target. -->
    <symbol id="g-drag" viewBox="0 0 24 16"><circle fill="currentColor" stroke="none" cx="6.5" cy="8" r="2"/><circle cx="6.5" cy="8" r="4.5"/><path d="M12.6 8h3.6" stroke-dasharray="0.01 1.8"/><circle cx="20" cy="8" r="2.4"/><circle fill="currentColor" stroke="none" cx="20" cy="8" r="0.7"/></symbol>
    <!-- Colour: two discs that differ only in hue. -->
    <symbol id="g-colour" viewBox="0 0 24 16"><circle fill="currentColor" stroke="none" cx="9" cy="8" r="4.5"/><circle cx="15" cy="8" r="4.5"/></symbol>
    <!-- Sound: the intro's headphones, in hairline. -->
    <symbol id="g-sound" viewBox="0 0 24 16"><path d="M5.5 11.5V8a6.5 6.5 0 0 1 13 0v3.5"/><rect fill="currentColor" stroke="none" x="4.2" y="9.2" width="3.2" height="5" rx="0.9"/><rect fill="currentColor" stroke="none" x="16.6" y="9.2" width="3.2" height="5" rx="0.9"/></symbol>
    <!-- Motion: the view, and Bar v3's circle gesture beside it. -->
    <symbol id="g-motion" viewBox="0 0 24 16"><rect x="2.5" y="4" width="8.5" height="8" rx="1"/><path d="M18.2 4.5a3.5 3.5 0 1 1-3.03 1.75M13.1 7l2.07-.75.38 2.17"/></symbol>

    <!-- ColorSym, after Chris Eastridge and Luis Francisco, CC BY-SA 4.0. -->
    <symbol id="cs-R" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.4" fill="currentColor"/></symbol>
    <symbol id="cs-Y" viewBox="0 0 24 24"><rect x="5.6" y="10.8" width="12.8" height="2.4" rx="1.2" fill="currentColor"/></symbol>
    <symbol id="cs-B" viewBox="0 0 24 24"><path d="M6.2 15.4 12 8.6l5.8 6.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="cs-O" viewBox="0 0 24 24"><circle cx="12" cy="9.4" r="2.4" fill="currentColor"/><rect x="5.6" y="14.3" width="12.8" height="2.4" rx="1.2" fill="currentColor"/></symbol>
    <symbol id="cs-G" viewBox="0 0 24 24"><path d="M6.2 12.4 12 5.6l5.8 6.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="5.6" y="15.9" width="12.8" height="2.4" rx="1.2" fill="currentColor"/></symbol>
    <symbol id="cs-V" viewBox="0 0 24 24"><path d="M6.2 12.6 12 5.8l5.8 6.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="16.3" r="2.4" fill="currentColor"/></symbol>
    <symbol id="cs-P" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.1" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/></symbol>
    <symbol id="cs-N" viewBox="0 0 24 24"><path d="M6.2 10.6 12 3.8l5.8 6.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="14" r="2.4" fill="currentColor"/><rect x="5.6" y="18" width="12.8" height="2.4" rx="1.2" fill="currentColor"/></symbol>
    <symbol id="cs-W" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.1" fill="none" stroke="currentColor" stroke-width="1.7"/></symbol>

    <!-- Colour-vision views: Machado 2009, severity 1, in linear RGB. -->
    <filter id="deut" color-interpolation-filters="linearRGB"><feColorMatrix values="0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0"/></filter>
    <filter id="prot" color-interpolation-filters="linearRGB"><feColorMatrix values="0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0"/></filter>
    <filter id="trit" color-interpolation-filters="linearRGB"><feColorMatrix values="1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0"/></filter>
  </defs>
</svg>`;

/** Puts the sprite in the page once; <use href="#g-flash"> then works. */
export function injectSprite(doc = document) {
  if (doc.getElementById('access-sprite')) return;
  const host = doc.createElement('div');
  host.id = 'access-sprite';
  // The sprite holds symbols only; it takes no room.
  host.style.cssText = 'position: absolute; width: 0; height: 0; overflow: hidden;';
  host.innerHTML = SPRITE;
  doc.body.prepend(host);
}
