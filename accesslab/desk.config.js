// @ts-check
// The project config: the one file another project replaces. TEMPLATE.md says how.
// Stimming: the items are toys from toys.json, plus toy folders toys.json lacks yet.
import { inkOf, flagsHTML, techHTML, glyph, REC } from './access-data.js';

/**
 * @typedef {object} Item
 * @property {string} id
 * @property {string} name
 * @property {string} group  One of the config's groups.
 * @property {string} [sub]  A second line under the name.
 * @property {string|null} [emblem]  An image path for the strip, from the site root.
 * @property {string|null} [accent]  A CSS colour or gradient; its first stop inks the item.
 * @property {any} raw  The source record, for panels.
 */

export default {
  project: 'Stimming',
  title: 'Toy desk',
  // Keys for the desk's own state: the tab and the filter.
  storage: 'stimming.desk.',
  // Paths here are from the site root; the desk lives one folder down.
  root: '../',
  // The pages beside the desk.
  links: [['Access kit', 'access.html'], ['Type trials', 'type.html'], ['Icon sheet', '../icons/sheet.html'], ['Inventory', '../inventorylab/']],
  // Groups in strip order, with their filter word.
  groups: [['main', 'Main'], ['lab', 'Lab'], ['unlisted', 'Unlisted']],
  // Panel modules from ./panels/, in tab order.
  panels: ['icons', 'feedback', 'intro', 'share', 'annex'],
  // The item a bare address opens.
  first: 'railgun',

  /** The item's ink: the first stop of its accent. @param {Item} it */
  ink: it => inkOf(it.accent || ''),
  /** The line under the name: access flags, sound, tech tags. @param {Item} it */
  facts: it => (it.group === 'unlisted' ? '' : (REC[/** @type {keyof typeof REC} */ (it.id)] ? flagsHTML(it.id, it.raw) || '<span>No access flags</span>' : '<span>Access not checked</span>')
    + (it.raw.sound ? `<span class="acc-i" style="color: var(--muted)">${glyph('sound')}<b>Sound</b></span>` : '') + techHTML(it.id)),

  /** @returns {Promise<Item[]>} */
  async items() {
    const toys = await fetch('../toys.json', { cache: 'no-cache' }).then(r => r.json());
    // Folders toys.json lacks yet; tools/hubdata.mjs writes the list.
    const hub = await fetch('hub.json', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ unlisted: [] }));
    const listed = Object.entries(toys).map(([id, t]) => ({
      id, name: t.name, group: t.number == null ? 'lab' : 'main', emblem: t.emblem, accent: t.accent,
      sub: t.nl ? `${t.nl} <span class="ipa">/${t.ipa}/</span>` : '', raw: t,
    }));
    // Main shelf by number, then the Lab in file order.
    listed.sort((a, b) => (a.raw.number ?? 1e4) - (b.raw.number ?? 1e4));
    const unlisted = (hub.unlisted || []).map(([id, name]) => ({ id, name, group: 'unlisted', emblem: null, accent: null, sub: 'Not in toys.json yet', raw: { name, unlisted: true } }));
    return [...listed, ...unlisted];
  },
};
