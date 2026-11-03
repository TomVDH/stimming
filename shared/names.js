// Each toy's Dutch (Flemish) name and its IPA, keyed by folder.
// The menu and the intro both read this table.
export const NL = {
  morpher: ['Vloeistof', 'ˈvluiˌstɔf'],
  pop: ['Knalveld', 'ˈknɑlˌvɛlt'],
  fidget: ['Friemelbord', 'ˈfriməlˌbɔrt'],
  domino: ['Dominoval', 'ˈdoːminoˌvɑl'],
  pins: ['Spijkerbed', 'ˈspɛikərˌbɛt'],
  galaxy: ['Sterrenstelsel', 'ˈstɛrənˌstɛlsəl'],
  prism: ['Prisma', 'ˈprɪsmaː'],
  kaleido: ['Caleidoscoop', 'kaːˌlɛidoˈskoːp'],
  ferro: ['Ferrovloeistof', 'ˈfɛroˌvluistɔf'],
  neon: ['Lichtreclame', 'ˈlɪxtreˌklaːmə'],
  magnet: ['Magneetknikkers', 'mɑxˈneːtˌknɪkərs'],
  soap: ['Zeepsnijden', 'ˈzeːpˌsnɛidə'],
  glass: ['Glasbreuk', 'ˈɣlɑzˌbrøːk'],
  tesseract: ['Hyperkubus', 'ˈhipərˌkybʏs'],
  chladni: ['Klankfiguren', 'ˈklɑŋkfiˌɣyrə'],
  pendulum: ['Slingergolf', 'ˈslɪŋərˌɣɔlf'],
  pool: ['Zwembad', 'ˈzʋɛmbɑt'],
  putty: ['Warmteklei', 'ˈʋɑrmtəˌklɛi'],
  scope: ['Oscilloscoop', 'ˌɔsiloˈskoːp'],
  walker: ['Strandloper', 'ˈstrɑntˌloːpər'],
  fire: ['Vuur', 'vyːr'],
  balloons: ['Ballonletters', 'bɑˈlɔnˌlɛtərs'],
  bubbles: ['Bellenblazer', 'ˈbɛləˌblaːzər'],
  coil: ['Spiraalveer', 'spiˈraːlˌveːr'],
  cube: ['Oneindige kubus', 'oːnˈɛindəɣə ˈkybʏs'],
  dandelion: ['Paardenbloem', 'ˈpaːrdəˌblum'],
  eyes: ['Wiebelogen', 'ˈʋibəlˌoːɣə'],
  flap: ['Klapbord', 'ˈklɑbˌbɔrt'],
  flock: ['Spreeuwenzwerm', 'ˈspreːuʋəˌzʋɛrm'],
  frost: ['IJsbloemen', 'ˈɛisˌblumə'],
  gears: ['Tandwielen', 'ˈtɑntˌʋilə'],
  harmono: ['Harmonograaf', 'hɑrˌmoːnoˈɣraːf'],
  harp: ['Snarenharp', 'ˈsnaːrəˌhɑrp'],
  lava: ['Lavalamp', 'ˈlaːvaˌlɑmp'],
  marble: ['Marmeren', 'ˈmɑrmərə'],
  musicbox: ['Speeldoos', 'ˈspeːlˌdoːs'],
  orbits: ['Banen', 'ˈbaːnə'],
  plasma: ['Plasmabol', 'ˈplɑsmaˌbɔl'],
  rain: ['Regenruit', 'ˈreːɣəˌrœyt'],
  ribbon: ['Lint', 'lɪnt'],
  sand: ['Zandtuin', 'ˈzɑntˌtœyn'],
  slime: ['Slijm', 'slɛim'],
  snow: ['Sneeuwbol', 'ˈsneːuˌbɔl'],
  top: ['Tol', 'tɔl'],
  tvtree: ['Beeldbuisboom', 'ˈbeːltbœysˌboːm'],
  zipper: ['Rits', 'rɪts'],
};

// The toy's folder name, read from the page address.
export function toyId(path = location.pathname) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length && parts[parts.length - 1].endsWith('.html')) parts.pop();
  return parts[parts.length - 1] || '';
}
