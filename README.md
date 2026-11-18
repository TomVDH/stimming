# Stimming

Small interactive desk toys for the office: one menu, and one self-contained page per toy.

- Live: <https://tomvdh.github.io/stimming/>
- Source: <https://github.com/TomVDH/stimming>

## Run locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Libraries load from jsDelivr and cdnjs, so the toys need an internet connection.

| Address | View |
|---|---|
| `./` | The Clock: twelve toys on a dial. R deals twelve more. |
| `./?all` | The whole main shelf |
| `./?lab` | The Lab: toys that wait for their turn |

## Working on it

Rules for people and agents: [AGENTS.md](AGENTS.md). Terms: [GLOSSARY.md](GLOSSARY.md). Credits: [CREDITS.md](CREDITS.md).

## Main shelf

`node tools/readme-toys.mjs` writes this table from `toys.json`.

<!-- gen:toys -->
| Toy | Dutch | Motto |
|---|---|---|
| [Morpher](https://tomvdh.github.io/stimming/morpher/) | Vloeivorm | We always start somewhere |
| [Pop field](https://tomvdh.github.io/stimming/pop/) | Bubbelplastiek | One is none. |
| [Fidget board](https://tomvdh.github.io/stimming/fidget/) | Prutsbord | Your hands were busy anyway |
| [Domino Day](https://tomvdh.github.io/stimming/domino/) | Domino Day | Live from Leeuwarden, IYKYK. |
| [Pin art](https://tomvdh.github.io/stimming/pins/) | Spijkerbed | Everyone tried it with their face |
| [Galaxy](https://tomvdh.github.io/stimming/galaxy/) | Heelal | And off we fly at critical speed |
| [Prism](https://tomvdh.github.io/stimming/prism/) | Prisma | Light existed before the album cover came along. |
| [Kaleidoscope](https://tomvdh.github.io/stimming/kaleido/) | Caleidoscoop | Sensory stimulation is for all ages |
| [Ferrofluid](https://tomvdh.github.io/stimming/ferro/) | Ferrofluïde | Liquid that's up to something. |
| [Neon Hum](https://tomvdh.github.io/stimming/neon/) | TL-lamp | It's buzzing time somewhere... |
| [Magnet balls](https://tomvdh.github.io/stimming/magnet/) | Magneetknikkers | Opposites attract, apparently... |
| [Soap cutting](https://tomvdh.github.io/stimming/soap/) | Zeepsnijden | Rarely worth the lather. |
| [Glass](https://tomvdh.github.io/stimming/glass/) | Ruitenbreker | Shards bring luck, supposedly |
| [Chladni plate](https://tomvdh.github.io/stimming/chladni/) | Zingend zand | Sound, finally sitting still |
| [Pendulum wave](https://tomvdh.github.io/stimming/pendulum/) | Slingers | Mathematical harmony doesn't have to be ugly. |
| [Caustic pool](https://tomvdh.github.io/stimming/pool/) | Zwembad | No running by the pool |
| [Heat putty](https://tomvdh.github.io/stimming/putty/) | Warme plasticine | Warm hands, bad decisions |
| [Oscilloscope](https://tomvdh.github.io/stimming/scope/) | Oscilloscoop | Lab coat optional |
| [Beach walker](https://tomvdh.github.io/stimming/walker/) | Strandbeest | The wind does the work |
| [Fire](https://tomvdh.github.io/stimming/fire/) | Vuur | Don't leave it unattended |
| [Rain on glass](https://tomvdh.github.io/stimming/rain/) | Belgisch weer | It's raining cats and dogs. |
| [TV tree](https://tomvdh.github.io/stimming/tvtree/) | Teeveeboom | Who has the remote? |
| [Balloon letters](https://tomvdh.github.io/stimming/balloons/) | Opgeblazen woorden | It's all hot air. |
| [Bubble wand](https://tomvdh.github.io/stimming/bubbles/) | Bellenblazer | Gone before you get attached |
| [Lava lamp](https://tomvdh.github.io/stimming/lava/) | Lavalamp | Slow is the whole point |
| [Googly eyes](https://tomvdh.github.io/stimming/eyes/) | Wiebelogen | They saw that |
| [Sonar](https://tomvdh.github.io/stimming/sonar/) | Sonar |  |
| [Star trails](https://tomvdh.github.io/stimming/trails/) | Sterrensporen |  |
| [ShadyOS](https://tomvdh.github.io/stimming/shadyos/) | LoucheOS |  |
| [Cloud chamber](https://tomvdh.github.io/stimming/chamber/) | Nevelkamer |  |
| [Ink Water](https://tomvdh.github.io/stimming/ink/) | Inktwater |  |
| [Window seat](https://tomvdh.github.io/stimming/window/) | Vensterplaats |  |
| [Wind map](https://tomvdh.github.io/stimming/windmap/) | Windkaart |  |
| [Smoke ring cannon](https://tomvdh.github.io/stimming/vortex/) | Rookringkanon |  |
| [Dijkstra](https://tomvdh.github.io/stimming/dijkstra/) | Lichtvloed |  |
| [Fireworks](https://tomvdh.github.io/stimming/fireworks/) | Vuurwerk |  |
| [Ten seconds](https://tomvdh.github.io/stimming/launch/) | Hemelvaart |  |
| [Frietkot](https://tomvdh.github.io/stimming/frietkot/) | Frietkot |  |
| [Railgun](https://tomvdh.github.io/stimming/railgun/) | Spoorkanon |  |
| [Train Ride](https://tomvdh.github.io/stimming/trainride/) | Treinrit |  |
| [Washing line](https://tomvdh.github.io/stimming/washline/) | Wasdraad |  |
| [Soup cauldron](https://tomvdh.github.io/stimming/cauldron/) |  |  |
| [Mesh ball](https://tomvdh.github.io/stimming/meshball/) |  |  |
| [Pressure washer](https://tomvdh.github.io/stimming/washer/) |  |  |
| [Spark wheel](https://tomvdh.github.io/stimming/spark/) | Vonkwieltje |  |
| [Oil slick](https://tomvdh.github.io/stimming/oilslick/) | Olievlek |  |
| [Jacob's ladder](https://tomvdh.github.io/stimming/ladder/) |  |  |
| [Wind tunnel](https://tomvdh.github.io/stimming/windtunnel/) |  |  |
| [Schlieren candle](https://tomvdh.github.io/stimming/schlieren/) |  |  |
| [Lichtenberg burn](https://tomvdh.github.io/stimming/lichtenberg/) | Bliksemhout |  |
| [Steel wool](https://tomvdh.github.io/stimming/steelwool/) |  |  |
| [East Van postcards](https://tomvdh.github.io/stimming/postcard/) |  |  |
| [Lit motorway](https://tomvdh.github.io/stimming/motorway/) | Verlichte snelweg |  |
| [Crinkle foil](https://tomvdh.github.io/stimming/foil/) | Kreukelfolie |  |
| [Kintsugi](https://tomvdh.github.io/stimming/kintsugi/) |  |  |
| [Crossing button](https://tomvdh.github.io/stimming/crossing/) |  |  |
| [Marbling](https://tomvdh.github.io/stimming/marble/) | Marmeren |  |
| [Rupert's drop](https://tomvdh.github.io/stimming/rupert/) |  |  |
| [Singing bowl](https://tomvdh.github.io/stimming/bowl/) |  |  |
| [Observatory](https://tomvdh.github.io/stimming/observatory/) | Sterrenwacht |  |
| [Night vision](https://tomvdh.github.io/stimming/nvg/) |  |  |
| [Plasma globe](https://tomvdh.github.io/stimming/plasma/) | Plasmabol |  |
| [Zena](https://tomvdh.github.io/stimming/drone/) | Zena |  |
| [Snow globe](https://tomvdh.github.io/stimming/snow/) | Sneeuwbol |  |
| [Tornado alley](https://tomvdh.github.io/stimming/tornado/) | Tornadosteeg |  |
| [Wind farm](https://tomvdh.github.io/stimming/windfarm/) | Windpark |  |
| [Subway](https://tomvdh.github.io/stimming/subway/) | Metro |  |
| [Car wash](https://tomvdh.github.io/stimming/carwash/) |  |  |
| [Harmonograph](https://tomvdh.github.io/stimming/harmono/) | Harmonograaf |  |
<!-- /gen:toys -->
