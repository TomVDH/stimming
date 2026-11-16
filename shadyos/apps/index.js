// Every app the OS can open, by id.
import { dialog, notes, properties, nfo, gauge, bin } from './basic.js';
import { files } from './files.js';
import { terminal, chat } from './talk.js';
import { mines, patience } from './games.js';
import { control, taskmgr, player } from './system.js';

export const APPS = { dialog, notes, properties, nfo, gauge, bin, files, terminal, chat, mines, patience, control, taskmgr, player };
export { cardCanvas, CARD } from './games.js';
