# Credits

Every outside asset the site uses: models, textures, sounds, fonts, map data.
A new download needs Tom's yes first (file, source, size, licence), then a row here.

| Asset | Used by | Source | Licence | Credit shown |
|---|---|---|---|---|
| Gabarito, B612, Iosevka Term Slab | Every page | `shared/fonts/` (licence files beside the fonts) | SIL OFL 1.1 | No |
| HYG star database v4.4 by David Nash (astronexus) | Observatory | <https://codeberg.org/astronexus/hyg> | CC BY-SA 4.0 | No |
| Pine Tree - PS1 Low Poly by Wersaus33 (`observatory/models/pine.glb`; the file is unchanged; modified in code: the bark is recoloured, the texture is filtered smoothly, and impostor cards are baked from it) | Observatory | <https://sketchfab.com/3d-models/pine-tree-ps1-low-poly-d71ceeb303644e649d09fe8038aa5e47> | CC BY 4.0 | No |
| Song arrangements as MIDI, from onlinesequencer.net: *Messages from the Stars* (The Rah Band, 1983; arr. Wezz, <https://onlinesequencer.net/4575387>), *Das Model* (Kraftwerk, 1978; arr. gurkin4, <https://onlinesequencer.net/2900150>; its full mix is the site's own MP3 render, `scope/model.mp3`), *Smalltown Boy* (Bronski Beat, 1984; arr. Wezz, <https://onlinesequencer.net/4859241>), *Minute Waltz, Op. 64 No. 1* (Frédéric Chopin, 1847, public domain; arr. BrayKen2010, <https://onlinesequencer.net/5878784>), *Toccata and Fugue in D minor, BWV 565* (J. S. Bach, public domain; orchestrated arr. Drake, <https://onlinesequencer.net/5882794>), *Группа крови* (*Blood Type*; Кино / Kino, 1988; arr. 166femm, <https://onlinesequencer.net/5786219>), *Soviet March* (James Hannigan, 2008, from Command & Conquer: Red Alert 3; <https://onlinesequencer.net/104611>), *DotA* (Basshunter, 2006; arr. Tymek_1200, <https://onlinesequencer.net/1521964>), *Whirling-In-Rags 8 AM* (British Sea Power, 2019, from the Disco Elysium soundtrack; arr. fallh0und, <https://onlinesequencer.net/5532046>), *Plastic Love* (Mariya Takeuchi, 1984; an Online Sequencer export from Tom), *Blue Monday* (New Order, 1983; an Online Sequencer export from Tom, `monday.mid`), *Invisible* (Duran Duran, 2021; arr. horsecel, <https://onlinesequencer.net/4418820>; its ASCII portrait is drawn from a Metal Gear Solid V still Tom supplied), *ばかみたい* (*Baka Mitai*; Takaya Kuroda, 2015, from Yakuza 0; arr. RiceLover423, <https://onlinesequencer.net/4602799>; its ASCII portrait is drawn from a Yakuza still Tom supplied), and *You Spin Me Round (Like a Record)* (Dead or Alive, 1984; an Online Sequencer export from Tom, `around.mid`). Files: `scope/messages.mid`, `model.mid`, `monday.mid`, `beat.mid`, `plastic.mid`, `around.mid`, `whirling.mid`, `dota.mid`, `soviet.mid`, `kino.mid`, `toccata.mid`, `chopin.mid`, `invisible.mid`, `yakuza.mid` | Oscilloscope (hidden codewords) | onlinesequencer.net | Unknown; the songs are under copyright. Tom's call (2026-11-17): ship as an easter egg, take down on request | Title, artist, year and label on screen while a song plays |
| Online Sequencer instrument samples, cut to the notes each song uses (`scope/*-kit.mp3`, index in `scope/*-kit.json`) | Oscilloscope (O full mix) | <https://onlinesequencer.net/app/instruments/> | Unknown | No |

Observatory's `observatory/stars.bin` and `observatory/stars.json` are derived from HYG v4.4 (cut by `tools/hyg-cut.mjs`) and carry the same licence, CC BY-SA 4.0.

Toy lists:
- East Van: `eastvan/CREDITS.md`
- Window seat map: sources in `tools/vancouver/bake.py`
