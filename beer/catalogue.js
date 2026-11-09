/* Beer pour: the beers, their glasses and their bottles. */
// beer/data/gen_catalogue.py writes this file from beer/data/research.json; do not edit by hand.
// Lengths are in cm. ebc: colour; tint: a measured colour for red beers.
// half: head half-life (s) on Fast time; Real time is three times longer.
// Most sizes and colours are estimates; real label art goes in labels/<id>.png.
export const BEERS = [
 {
  "id": "duvel",
  "name": "Duvel",
  "brewery": "Duvel Moortgat (Breendonk)",
  "style": "Belgian strong golden ale",
  "abv": 8.5,
  "ebc": 7,
  "tint": null,
  "haze": 0.04,
  "foam": "#FBF8EF",
  "half": 80,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 1,
  "glass": {
   "kind": "tulip",
   "h": 16.5,
   "rim": 4.15,
   "max": 5.25,
   "maxAt": 9.5,
   "stem": 2.5,
   "foot": 3.75,
   "base": 0.8,
   "wall": 0.18,
   "etch": true,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "bulb",
   "cl": 33,
   "h": 17.8,
   "r": 3.45,
   "sh": 10.5,
   "nl": 4.0,
   "nr": 1.45,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#C8102E"
  },
  "label": {
   "shape": "oval",
   "colours": [
    "#FFFFFF",
    "#C8102E",
    "#1A1A1A"
   ],
   "elements": "large red script wordmark with dark outline on white; small text 'Moortgat' and strength line; clean, lots of white"
  },
  "pour": {
   "tilt": 45,
   "head": 4.5,
   "yeast": true
  }
 },
 {
  "id": "omer",
  "name": "Omer Traditional Blond",
  "brewery": "Brouwerij Omer Vander Ghinste (Bellegem)",
  "style": "Belgian strong blond ale",
  "abv": 8.0,
  "ebc": 10,
  "tint": null,
  "haze": 0.04,
  "foam": "#FBF8EF",
  "half": 67,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.73,
  "glass": {
   "kind": "chalice",
   "h": 20.0,
   "rim": 4.4,
   "max": 4.6,
   "maxAt": 13.0,
   "stem": 5.5,
   "foot": 4.0,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#B8963E"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F4EFE4",
    "#151515",
    "#B8963E"
   ],
   "elements": "bold black 'Omer.' wordmark (with full stop) on light ground, gold seal/rules; very typographic, minimal"
  },
  "pour": {
   "tilt": 45,
   "head": 3,
   "yeast": true
  }
 },
 {
  "id": "averbode",
  "name": "Averbode",
  "brewery": "Abdij van Averbode, brewed with Brouwerij Huyghe (Melle)",
  "style": "Belgian blond abbey ale, dry-hopped",
  "abv": 7.5,
  "ebc": 11,
  "tint": null,
  "haze": 0.18,
  "foam": "#FBF8EF",
  "half": 50,
  "power": 1.1,
  "cell": 0.14,
  "fizz": 0.66,
  "glass": {
   "kind": "chalice",
   "h": 18.5,
   "rim": 4.5,
   "max": 4.6,
   "maxAt": 12.0,
   "stem": 5.0,
   "foot": 3.9,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": null
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F3EEE3",
    "#9E1B32",
    "#B58B3A"
   ],
   "elements": "abbey name in serif caps, abbey emblem; restrained monastic look (check against real label)"
  },
  "pour": {
   "tilt": 45,
   "head": 3,
   "yeast": true
  }
 },
 {
  "id": "la-chouffe",
  "name": "La Chouffe",
  "brewery": "Brasserie d'Achouffe (Duvel Moortgat)",
  "style": "Belgian blond / strong golden ale, spiced (coriander)",
  "abv": 8.0,
  "ebc": 13,
  "tint": null,
  "haze": 0.5,
  "foam": "#FBF8EF",
  "half": 70,
  "power": 1.5,
  "cell": 0.16,
  "fizz": 0.83,
  "glass": {
   "kind": "tulip",
   "h": 17.0,
   "rim": 4.0,
   "max": 4.4,
   "maxAt": 11.0,
   "stem": 3.5,
   "foot": 3.6,
   "base": 1.0,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#D22630"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F2E6C9",
    "#D22630",
    "#1F3F8F",
    "#FFFFFF",
    "#3B7A3A"
   ],
   "elements": "cartoon gnome with red pointed cap and white beard; rounded hand-drawn 'La Chouffe' lettering; forest/ardennes motifs"
  },
  "pour": {
   "tilt": 45,
   "head": 4,
   "yeast": true
  }
 },
 {
  "id": "boon-kriek",
  "name": "Kriek Boon",
  "brewery": "Brouwerij Boon (Lembeek)",
  "style": "Kriek (cherry lambic)",
  "abv": 4.0,
  "ebc": 35,
  "tint": "#8E1B2A",
  "haze": 0.04,
  "foam": "#F2B8C2",
  "half": 30,
  "power": 1.1,
  "cell": 0.14,
  "fizz": 0.66,
  "glass": {
   "kind": "flute",
   "h": 20.5,
   "rim": 3.4,
   "max": 3.5,
   "maxAt": 15.0,
   "stem": 4.5,
   "foot": 3.5,
   "base": 0.7,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "steinie",
   "cl": 25,
   "h": 16.5,
   "r": 3.0,
   "sh": 10.0,
   "nl": 3.5,
   "nr": 1.35,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#B01E2E"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#B01E2E",
    "#FFFFFF",
    "#C7A250",
    "#5A0E18"
   ],
   "elements": "cherries; Boon wordmark; 'Lembeek' place name"
  },
  "pour": {
   "tilt": 20,
   "head": 2,
   "yeast": false
  }
 },
 {
  "id": "lindemans-kriek",
  "name": "Lindemans Kriek",
  "brewery": "Brouwerij Lindemans (Vlezenbeek)",
  "style": "Kriek (sweetened cherry lambic)",
  "abv": 3.5,
  "ebc": 30,
  "tint": "#A3172E",
  "haze": 0.04,
  "foam": "#F5C2CC",
  "half": 20,
  "power": 0.75,
  "cell": 0.16,
  "fizz": 0.66,
  "glass": {
   "kind": "tulip",
   "h": 21.0,
   "rim": 3.1,
   "max": 3.5,
   "maxAt": 15.0,
   "stem": 5.0,
   "foot": 3.4,
   "base": 0.6,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "champ",
   "cl": 37.5,
   "h": 23.5,
   "r": 3.6,
   "sh": 15.0,
   "nl": 6.0,
   "nr": 1.45,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#B5121B"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F7F3EA",
    "#B5121B",
    "#1A1A1A",
    "#C5A253"
   ],
   "elements": "large cherries illustration; Lindemans wordmark; 'Kriek' title"
  },
  "pour": {
   "tilt": 15,
   "head": 2,
   "yeast": false
  }
 },
 {
  "id": "oude-geuze-boon",
  "name": "Oude Geuze Boon",
  "brewery": "Brouwerij Boon (Lembeek)",
  "style": "Oude gueuze (blended spontaneous lambic)",
  "abv": 7.0,
  "ebc": 14,
  "tint": null,
  "haze": 0.18,
  "foam": "#FAF7EE",
  "half": 20,
  "power": 0.75,
  "cell": 0.14,
  "fizz": 1,
  "glass": {
   "kind": "tumbler",
   "h": 15.0,
   "rim": 3.6,
   "max": 3.6,
   "maxAt": 15.0,
   "stem": 0.0,
   "foot": 3.1,
   "base": 1.5,
   "wall": 0.3,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "champ",
   "cl": 37.5,
   "h": 23.5,
   "r": 3.6,
   "sh": 15.0,
   "nl": 6.0,
   "nr": 1.45,
   "glass": "#2E3320",
   "paint": null,
   "cap": "#B8963E"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F1E8D2",
    "#1F2B22",
    "#B8963E",
    "#A51E22"
   ],
   "elements": "traditional typographic label, 'Oude Geuze' and 'Lembeek'"
  },
  "pour": {
   "tilt": 30,
   "head": 1.5,
   "yeast": true
  }
 },
 {
  "id": "westmalle-tripel",
  "name": "Westmalle Tripel",
  "brewery": "Brouwerij der Trappisten van Westmalle",
  "style": "Tripel (Trappist)",
  "abv": 9.5,
  "ebc": 12,
  "tint": null,
  "haze": 0.04,
  "foam": "#FBF8EF",
  "half": 67,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.83,
  "glass": {
   "kind": "chalice",
   "h": 18.0,
   "rim": 5.25,
   "max": 5.5,
   "maxAt": 15.0,
   "stem": 4.5,
   "foot": 4.25,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 20.0,
   "r": 3.3,
   "sh": 11.8,
   "nl": 5.5,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#E9C547"
  },
  "label": {
   "shape": "diamond",
   "colours": [
    "#E9C547",
    "#2A1C10",
    "#C8202F",
    "#FFFFFF"
   ],
   "elements": "red roundel with white interlaced A-W monogram at top of diamond; 'Westmalle' blackletter-style wordmark across; 'Trappist Ale' and 'Tripel' below"
  },
  "pour": {
   "tilt": 45,
   "head": 3,
   "yeast": true
  }
 },
 {
  "id": "westmalle-dubbel",
  "name": "Westmalle Dubbel",
  "brewery": "Brouwerij der Trappisten van Westmalle",
  "style": "Dubbel (Trappist)",
  "abv": 7.0,
  "ebc": 60,
  "tint": null,
  "haze": 0.04,
  "foam": "#D9C2A0",
  "half": 60,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.66,
  "glass": {
   "kind": "chalice",
   "h": 18.0,
   "rim": 5.25,
   "max": 5.5,
   "maxAt": 15.0,
   "stem": 4.5,
   "foot": 4.25,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 20.0,
   "r": 3.3,
   "sh": 11.8,
   "nl": 5.5,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#6B4A2A"
  },
  "label": {
   "shape": "diamond",
   "colours": [
    "#4A1F2E",
    "#F4F0E8",
    "#C8202F",
    "#C9A65A",
    "#B8963E"
   ],
   "elements": "same diamond layout as Tripel in dark purple; thin gold keyline; white wordmark"
  },
  "pour": {
   "tilt": 45,
   "head": 2.5,
   "yeast": true
  }
 },
 {
  "id": "chimay-blue",
  "name": "Chimay Grande Réserve (Blue)",
  "brewery": "Bières de Chimay (Abbaye de Scourmont)",
  "style": "Belgian strong dark ale (Trappist)",
  "abv": 9.0,
  "ebc": 70,
  "tint": null,
  "haze": 0.04,
  "foam": "#D2B48C",
  "half": 60,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.66,
  "glass": {
   "kind": "chalice",
   "h": 14.9,
   "rim": 5.0,
   "max": 5.0,
   "maxAt": 10.0,
   "stem": 3.5,
   "foot": 4.0,
   "base": 0.7,
   "wall": 0.18,
   "etch": false,
   "metal": "silver",
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 20.0,
   "r": 3.3,
   "sh": 11.8,
   "nl": 5.5,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#1E3C8C"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#1E3C8C",
    "#FFFFFF",
    "#C9A65A",
    "#111111"
   ],
   "elements": "Chimay wordmark in a serif, abbey crest/emblem, blue colour band coding the beer"
  },
  "pour": {
   "tilt": 45,
   "head": 2.5,
   "yeast": true
  }
 },
 {
  "id": "orval",
  "name": "Orval",
  "brewery": "Brasserie d'Orval (Abbaye Notre-Dame d'Orval)",
  "style": "Trappist pale ale with Brettanomyces, dry-hopped",
  "abv": 6.2,
  "ebc": 18,
  "tint": null,
  "haze": 0.18,
  "foam": "#F4EBD6",
  "half": 80,
  "power": 1.5,
  "cell": 0.16,
  "fizz": 0.93,
  "glass": {
   "kind": "chalice",
   "h": 17.0,
   "rim": 5.5,
   "max": 5.6,
   "maxAt": 15.0,
   "stem": 4.5,
   "foot": 4.25,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": "silver",
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "skittle",
   "cl": 33,
   "h": 24.5,
   "r": 3.2,
   "sh": 15.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#2C1A0C",
   "paint": null,
   "cap": "#A7A9AC"
  },
  "label": {
   "shape": "diamond",
   "colours": [
    "#B7A9CF",
    "#FFFFFF",
    "#3A2D4A",
    "#C9A65A"
   ],
   "elements": "white 'ORVAL' outlined letters across a lilac diamond, trout with a gold ring in its mouth, 'Trappist Ale' below"
  },
  "pour": {
   "tilt": 45,
   "head": 4,
   "yeast": true
  }
 },
 {
  "id": "rochefort-10",
  "name": "Rochefort 10",
  "brewery": "Brasserie de Rochefort (Abbaye Notre-Dame de Saint-Rémy)",
  "style": "Quadrupel / Belgian strong dark ale (Trappist)",
  "abv": 11.3,
  "ebc": 90,
  "tint": null,
  "haze": 0.04,
  "foam": "#C9A57B",
  "half": 40,
  "power": 1.1,
  "cell": 0.14,
  "fizz": 0.62,
  "glass": {
   "kind": "chalice",
   "h": 16.0,
   "rim": 4.8,
   "max": 4.8,
   "maxAt": 13.0,
   "stem": 4.5,
   "foot": 3.9,
   "base": 0.7,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 20.0,
   "r": 3.3,
   "sh": 11.8,
   "nl": 5.5,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#1F4E9A"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#EFE6D0",
    "#1F4E9A",
    "#1A1A1A"
   ],
   "elements": "simple typographic label, big '10'; blue codes the 10 (6 red, 8 green)"
  },
  "pour": {
   "tilt": 45,
   "head": 2,
   "yeast": true
  }
 },
 {
  "id": "westvleteren-12",
  "name": "Trappist Westvleteren 12",
  "brewery": "Brouwerij Westvleteren (Sint-Sixtusabdij)",
  "style": "Quadrupel (Trappist)",
  "abv": 10.2,
  "ebc": 70,
  "tint": null,
  "haze": 0.18,
  "foam": "#EFE6D6",
  "half": 60,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.62,
  "glass": {
   "kind": "chalice",
   "h": 17.5,
   "rim": 5.0,
   "max": 5.1,
   "maxAt": 14.0,
   "stem": 4.5,
   "foot": 4.1,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 20.0,
   "r": 3.3,
   "sh": 11.8,
   "nl": 5.5,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#E3B21B"
  },
  "label": {
   "shape": "round",
   "colours": [
    "#E3B21B",
    "#FFFFFF",
    "#1A1A1A"
   ],
   "elements": "label mimics the yellow cap; white area with best-before and batch code"
  },
  "pour": {
   "tilt": 45,
   "head": 2,
   "yeast": true
  }
 },
 {
  "id": "tripel-karmeliet",
  "name": "Tripel Karmeliet",
  "brewery": "Brouwerij Bosteels (Buggenhout; AB InBev)",
  "style": "Tripel (barley, wheat, oats)",
  "abv": 8.4,
  "ebc": 14,
  "tint": null,
  "haze": 0.18,
  "foam": "#F6EEDC",
  "half": 73,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.76,
  "glass": {
   "kind": "tulip",
   "h": 21.0,
   "rim": 4.25,
   "max": 5.0,
   "maxAt": 15.0,
   "stem": 4.0,
   "foot": 3.9,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#B8963E"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F1E7CF",
    "#5B3A1E",
    "#C39A4B",
    "#1A1A1A"
   ],
   "elements": "'Tripel Karmeliet' in script, Carmelite and grain motifs (three grains), warm earth palette"
  },
  "pour": {
   "tilt": 45,
   "head": 3.5,
   "yeast": true
  }
 },
 {
  "id": "kwak",
  "name": "Pauwel Kwak",
  "brewery": "Brouwerij Bosteels (Buggenhout; AB InBev)",
  "style": "Belgian strong amber ale",
  "abv": 8.4,
  "ebc": 32,
  "tint": null,
  "haze": 0.04,
  "foam": "#F2E6CC",
  "half": 43,
  "power": 1.1,
  "cell": 0.14,
  "fizz": 0.59,
  "glass": {
   "kind": "coachman",
   "h": 24.5,
   "rim": 4.2,
   "max": 3.6,
   "maxAt": 3.0,
   "stem": 0.0,
   "foot": 0.0,
   "base": 0.4,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#B8963E"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#C86A1E",
    "#3A2414",
    "#F2E6CC",
    "#C39A4B"
   ],
   "elements": "'Kwak' wordmark, coachman/coach-inn motif"
  },
  "pour": {
   "tilt": 40,
   "head": 2.5,
   "yeast": false
  }
 },
 {
  "id": "delirium-tremens",
  "name": "Delirium Tremens",
  "brewery": "Brouwerij Huyghe (Melle)",
  "style": "Belgian strong golden ale",
  "abv": 8.5,
  "ebc": 10,
  "tint": null,
  "haze": 0.18,
  "foam": "#FBF8EF",
  "half": 67,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.83,
  "glass": {
   "kind": "tulip",
   "h": 21.0,
   "rim": 3.95,
   "max": 4.5,
   "maxAt": 15.0,
   "stem": 4.5,
   "foot": 4.2,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 20.5,
   "r": 3.3,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#E4E1D8",
   "paint": "#E4E1D8",
   "cap": "#1F5FBF"
  },
  "label": {
   "shape": "foil",
   "colours": [
    "#1F5FBF",
    "#F49AC1",
    "#3FA34D",
    "#FFFFFF",
    "#D4AF37"
   ],
   "elements": "pink elephants, green crocodiles and dragons dancing on a circus ball; 'Delirium Tremens' lettering; whole bottle is the canvas"
  },
  "pour": {
   "tilt": 45,
   "head": 4,
   "yeast": true
  }
 },
 {
  "id": "hoegaarden",
  "name": "Hoegaarden Wit",
  "brewery": "Brouwerij Hoegaarden (AB InBev)",
  "style": "Witbier (wheat, coriander, orange peel)",
  "abv": 4.9,
  "ebc": 6,
  "tint": null,
  "haze": 0.85,
  "foam": "#FFFFFF",
  "half": 50,
  "power": 1.1,
  "cell": 0.14,
  "fizz": 0.62,
  "glass": {
   "kind": "tumbler",
   "h": 12.7,
   "rim": 4.75,
   "max": 4.75,
   "maxAt": 12.7,
   "stem": 0.0,
   "foot": 3.9,
   "base": 2.5,
   "wall": 0.45,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": true
  },
  "bottle": {
   "kind": "steinie",
   "cl": 33,
   "h": 17.4,
   "r": 3.5,
   "sh": 11.0,
   "nl": 3.5,
   "nr": 1.45,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#F2F2F2"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F7F7F2",
    "#1F3B73",
    "#C9A24D",
    "#7FA06A"
   ],
   "elements": "white 'Hoegaarden' letters trimmed in blue below two gold shields; botanical illustrations (since UK refresh)"
  },
  "pour": {
   "tilt": 45,
   "head": 3,
   "yeast": false
  }
 },
 {
  "id": "leffe-blonde",
  "name": "Leffe Blonde",
  "brewery": "AB InBev (brewed at Leuven for Abbaye de Leffe)",
  "style": "Belgian blond abbey ale",
  "abv": 6.6,
  "ebc": 14,
  "tint": null,
  "haze": 0.04,
  "foam": "#FAF6EC",
  "half": 43,
  "power": 1.1,
  "cell": 0.14,
  "fizz": 0.55,
  "glass": {
   "kind": "chalice",
   "h": 19.0,
   "rim": 4.5,
   "max": 4.6,
   "maxAt": 13.0,
   "stem": 5.0,
   "foot": 4.0,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": "gold",
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#C4A04E"
  },
  "label": {
   "shape": "arch",
   "colours": [
    "#C4A04E",
    "#F3E9D2",
    "#8F1D21",
    "#1A1A1A"
   ],
   "elements": "abbey stained-glass window motif, 'Leffe' wordmark, red ribbon banner, gilded borders"
  },
  "pour": {
   "tilt": 45,
   "head": 3,
   "yeast": false
  }
 },
 {
  "id": "rodenbach-grand-cru",
  "name": "Rodenbach Grand Cru",
  "brewery": "Brouwerij Rodenbach (Roeselare; Swinkels)",
  "style": "Flanders red ale (oak-aged)",
  "abv": 6.0,
  "ebc": 45,
  "tint": "#7A2414",
  "haze": 0.04,
  "foam": "#E3CBA8",
  "half": 15,
  "power": 0.75,
  "cell": 0.2,
  "fizz": 0.45,
  "glass": {
   "kind": "tulip",
   "h": 21.6,
   "rim": 4.0,
   "max": 4.35,
   "maxAt": 16.0,
   "stem": 3.0,
   "foot": 3.6,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "steinie",
   "cl": 33,
   "h": 17.4,
   "r": 3.5,
   "sh": 11.0,
   "nl": 3.5,
   "nr": 1.45,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#7A1E1E"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#6B1420",
    "#C9A65A",
    "#F1E7D2"
   ],
   "elements": "'Rodenbach' wordmark, 'Grand Cru', oak foeder motif"
  },
  "pour": {
   "tilt": 30,
   "head": 1.5,
   "yeast": false
  }
 },
 {
  "id": "gulden-draak",
  "name": "Gulden Draak",
  "brewery": "Brouwerij Van Steenberge (Ertvelde)",
  "style": "Belgian dark strong ale / dark tripel",
  "abv": 10.5,
  "ebc": 55,
  "tint": null,
  "haze": 0.04,
  "foam": "#D8BE98",
  "half": 60,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.66,
  "glass": {
   "kind": "tulip",
   "h": 19.0,
   "rim": 4.25,
   "max": 4.75,
   "maxAt": 14.0,
   "stem": 4.0,
   "foot": 4.0,
   "base": 1.0,
   "wall": 0.18,
   "etch": true,
   "metal": null,
   "rock": true,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#F4F2EC",
   "paint": "#F4F2EC",
   "cap": "#C9A24D"
  },
  "label": {
   "shape": "printed",
   "colours": [
    "#F4F2EC",
    "#C9A24D",
    "#151515",
    "#A51E22"
   ],
   "elements": "gold dragon (from the Ghent belfry) on the white bottle, 'Gulden Draak' lettering in black/red"
  },
  "pour": {
   "tilt": 45,
   "head": 2.5,
   "yeast": true
  }
 },
 {
  "id": "st-bernardus-abt-12",
  "name": "St. Bernardus Abt 12",
  "brewery": "Brouwerij St. Bernardus (Watou)",
  "style": "Quadrupel",
  "abv": 10.0,
  "ebc": 75,
  "tint": null,
  "haze": 0.04,
  "foam": "#CDAE85",
  "half": 57,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.66,
  "glass": {
   "kind": "chalice",
   "h": 18.5,
   "rim": 4.5,
   "max": 4.75,
   "maxAt": 13.0,
   "stem": 5.5,
   "foot": 3.9,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#C9A24D"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F4EEDF",
    "#1C2333",
    "#B3202A",
    "#C9A24D"
   ],
   "elements": "cartoon monk holding a glass, 'St. Bernardus' wordmark, 'Abt 12'"
  },
  "pour": {
   "tilt": 45,
   "head": 2.5,
   "yeast": true
  }
 },
 {
  "id": "brugse-zot-blond",
  "name": "Brugse Zot Blond",
  "brewery": "Brouwerij De Halve Maan (Bruges)",
  "style": "Belgian blond ale",
  "abv": 6.0,
  "ebc": 11,
  "tint": null,
  "haze": 0.18,
  "foam": "#FBF8EF",
  "half": 47,
  "power": 1.1,
  "cell": 0.14,
  "fizz": 0.66,
  "glass": {
   "kind": "flute",
   "h": 20.5,
   "rim": 3.6,
   "max": 3.9,
   "maxAt": 15.0,
   "stem": 4.0,
   "foot": 3.75,
   "base": 1.0,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": null
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F3E7C9",
    "#C8202F",
    "#F2C230",
    "#24539B",
    "#1A1A1A"
   ],
   "elements": "grinning court jester (the 'Zot') in a two-colour cap; 'Brugse Zot' wordmark"
  },
  "pour": {
   "tilt": 45,
   "head": 3,
   "yeast": true
  }
 },
 {
  "id": "gouden-carolus-classic",
  "name": "Gouden Carolus Classic",
  "brewery": "Brouwerij Het Anker (Mechelen)",
  "style": "Belgian dark strong ale",
  "abv": 8.5,
  "ebc": 70,
  "tint": null,
  "haze": 0.04,
  "foam": "#DCC3A0",
  "half": 47,
  "power": 1.1,
  "cell": 0.14,
  "fizz": 0.59,
  "glass": {
   "kind": "tulip",
   "h": 23.5,
   "rim": 3.5,
   "max": 4.1,
   "maxAt": 17.0,
   "stem": 5.5,
   "foot": 3.75,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": "#C9A24D"
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#151515",
    "#C9A24D",
    "#7E1B1F"
   ],
   "elements": "Emperor Charles V (Carolus) imagery and gold coin, 'Gouden Carolus' gold lettering on black"
  },
  "pour": {
   "tilt": 45,
   "head": 2.5,
   "yeast": true
  }
 },
 {
  "id": "straffe-hendrik-tripel",
  "name": "Straffe Hendrik Tripel",
  "brewery": "Brouwerij De Halve Maan (Bruges)",
  "style": "Tripel",
  "abv": 9.0,
  "ebc": 16,
  "tint": null,
  "haze": 0.04,
  "foam": "#FAF6EC",
  "half": 60,
  "power": 1.5,
  "cell": 0.14,
  "fizz": 0.76,
  "glass": {
   "kind": "chalice",
   "h": 18.5,
   "rim": 4.25,
   "max": 4.4,
   "maxAt": 12.0,
   "stem": 5.5,
   "foot": 3.75,
   "base": 0.7,
   "wall": 0.18,
   "etch": false,
   "metal": null,
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "belgian",
   "cl": 33,
   "h": 21.0,
   "r": 3.2,
   "sh": 12.0,
   "nl": 6.0,
   "nr": 1.4,
   "glass": "#3B2410",
   "paint": null,
   "cap": null
  },
  "label": {
   "shape": "rect",
   "colours": [
    "#F2E7CC",
    "#D2552B",
    "#3A2414",
    "#C9A24D"
   ],
   "elements": "'Straffe Hendrik' wordmark with the brewery's half-moon logo; old-Bruges motif"
  },
  "pour": {
   "tilt": 45,
   "head": 2.5,
   "yeast": true
  }
 },
 {
  "id": "stella-artois",
  "name": "Stella Artois",
  "brewery": "AB InBev (Leuven)",
  "style": "Pilsner / Euro pale lager",
  "abv": 5.2,
  "ebc": 7,
  "tint": null,
  "haze": 0.04,
  "foam": "#FFFFFF",
  "half": 37,
  "power": 1.1,
  "cell": 0.14,
  "fizz": 0.52,
  "glass": {
   "kind": "chalice",
   "h": 18.0,
   "rim": 4.0,
   "max": 4.3,
   "maxAt": 12.0,
   "stem": 4.5,
   "foot": 3.75,
   "base": 0.8,
   "wall": 0.18,
   "etch": false,
   "metal": "gold",
   "rock": false,
   "hex": false
  },
  "bottle": {
   "kind": "longneck",
   "cl": 33,
   "h": 22.6,
   "r": 3.0,
   "sh": 12.5,
   "nl": 7.5,
   "nr": 1.35,
   "glass": "#2F5A2A",
   "paint": null,
   "cap": "#C8102E"
  },
  "label": {
   "shape": "arch",
   "colours": [
    "#FFFFFF",
    "#C8102E",
    "#C9A24D",
    "#1A1A1A"
   ],
   "elements": "red 'Stella Artois' serif wordmark, gold horn-and-star emblem, 'Anno 1366', ornate gold border"
  },
  "pour": {
   "tilt": 45,
   "head": 3,
   "yeast": false
  }
 }
];
