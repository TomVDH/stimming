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
| [Morpher](https://tomvdh.github.io/stimming/morpher/) | Vloeivorm | Having a bit of a shape crisis. |
| [Pop field](https://tomvdh.github.io/stimming/pop/) | Bubbelplastiek | Just one more. Obviously. |
| [Fidget board](https://tomvdh.github.io/stimming/fidget/) | Prutsbord | A meeting could have been an email. This helps. |
| [Domino Day](https://tomvdh.github.io/stimming/domino/) | Domino Day | Several hours of work. One excellent second. |
| [Pin art](https://tomvdh.github.io/stimming/pins/) | Spijkerbed | Please keep all faces inside the browser. |
| [Galaxy](https://tomvdh.github.io/stimming/galaxy/) | Heelal | A lot of stars for a Tuesday afternoon. |
| [Prism](https://tomvdh.github.io/stimming/prism/) | Prisma | White light has been keeping secrets. |
| [Kaleidoscope](https://tomvdh.github.io/stimming/kaleido/) | Caleidoscoop | Turn it until your thoughts catch up. |
| [Ferrofluid](https://tomvdh.github.io/stimming/ferro/) | Ferrofluïde | Magnets make it a little defensive. |
| [Neon Hum](https://tomvdh.github.io/stimming/neon/) | TL-lamp | The sound of a shop that's still open. |
| [Magnet balls](https://tomvdh.github.io/stimming/magnet/) | Magneetknikkers | They have attachment issues. |
| [Soap cutting](https://tomvdh.github.io/stimming/soap/) | Zeepsnijden | Clean slices. Questionable hygiene. |
| [Glass](https://tomvdh.github.io/stimming/glass/) | Ruitenbreker | The good part without the sweeping. |
| [Chladni plate](https://tomvdh.github.io/stimming/chladni/) | Zingend zand | Sand taking instructions from a noise. |
| [Pendulum wave](https://tomvdh.github.io/stimming/pendulum/) | Slingers | Give them a minute. They'll agree again. |
| [Caustic pool](https://tomvdh.github.io/stimming/pool/) | Zwembad | The bit you stare at instead of swimming. |
| [Heat putty](https://tomvdh.github.io/stimming/putty/) | Warme plasticine | Leave a handprint. Take no responsibility. |
| [Oscilloscope](https://tomvdh.github.io/stimming/scope/) | Oscilloscoop | Lines with something to say. |
| [Beach walker](https://tomvdh.github.io/stimming/walker/) | Strandbeest | All legs, no particular hurry. |
| [Fire](https://tomvdh.github.io/stimming/fire/) | Vuur | The oldest screen saver. |
| [Rain on glass](https://tomvdh.github.io/stimming/rain/) | Belgisch weer | Pick a drop. That's your horse now. |
| [TV tree](https://tomvdh.github.io/stimming/tvtree/) | Teeveeboom | Five hundred channels and still a tree. |
| [Balloon letters](https://tomvdh.github.io/stimming/balloons/) | Opgeblazen woorden | Big words, very little substance. |
| [Bubble wand](https://tomvdh.github.io/stimming/bubbles/) | Bellenblazer | Beautiful, briefly, then on your glasses. |
| [Lava lamp](https://tomvdh.github.io/stimming/lava/) | Lavalamp | Nobody in there has a deadline. |
| [Googly eyes](https://tomvdh.github.io/stimming/eyes/) | Wiebelogen | Suddenly everything has an opinion. |
| [Sonar](https://tomvdh.github.io/stimming/sonar/) | Sonar | Hello? Hello? Hello? |
| [Star trails](https://tomvdh.github.io/stimming/trails/) | Sterrensporen | A very long exposure to staying up late. |
| [ShadyOS](https://tomvdh.github.io/stimming/shadyos/) | LoucheOS | Everything is under control. Probably. |
| [Cloud chamber](https://tomvdh.github.io/stimming/chamber/) | Nevelkamer | Tiny things leaving very dramatic exits. |
| [Ink Water](https://tomvdh.github.io/stimming/ink/) | Inktwater | One drop. No taking it back. |
| [Window seat](https://tomvdh.github.io/stimming/window/) | Vensterplaats | The best part of the flight is looking out. |
| [Wind map](https://tomvdh.github.io/stimming/windmap/) | Windkaart | Turns out the air has places to be. |
| [Smoke ring cannon](https://tomvdh.github.io/stimming/vortex/) | Rookringkanon | A doughnut with somewhere to be. |
| [Dijkstra](https://tomvdh.github.io/stimming/dijkstra/) | Lichtvloed | Finding the way without asking for directions. |
| [Fireworks](https://tomvdh.github.io/stimming/fireworks/) | Vuurwerk | Money going up in a very pretty fashion. |
| [Frietkot](https://tomvdh.github.io/stimming/frietkot/) | Frietkot | The sauce is a serious decision. |
| [Railgun](https://tomvdh.github.io/stimming/railgun/) | Spoorkanon | A very persuasive way to move something. |
| [Train Ride](https://tomvdh.github.io/stimming/trainride/) | Treinrit | Watching the world go by is the itinerary. |
| [Soup cauldron](https://tomvdh.github.io/stimming/cauldron/) |  | If it fits, it's soup. |
| [Mesh ball](https://tomvdh.github.io/stimming/meshball/) |  | Holding it together, one line at a time. |
| [Pressure washer](https://tomvdh.github.io/stimming/washer/) |  | The line between before and after is addictive. |
| [Spark wheel](https://tomvdh.github.io/stimming/spark/) | Vonkwieltje | A little friction goes a long way. |
| [Oil slick](https://tomvdh.github.io/stimming/oilslick/) | Olievlek | Something beautiful is leaking. |
| [Jacob's ladder](https://tomvdh.github.io/stimming/ladder/) |  | Up the stairs and straight back down. |
| [Wind tunnel](https://tomvdh.github.io/stimming/windtunnel/) |  | Air has notes on your design. |
| [Schlieren candle](https://tomvdh.github.io/stimming/schlieren/) |  | Hot air finally showing its work. |
| [Lichtenberg burn](https://tomvdh.github.io/stimming/lichtenberg/) | Bliksemhout | A tree made by electricity in a hurry. |
| [Steel wool](https://tomvdh.github.io/stimming/steelwool/) |  | The kitchen scourer has other plans. |
| [East Van postcards](https://tomvdh.github.io/stimming/postcard/) |  | Greetings from under the power lines. |
| [Lit motorway](https://tomvdh.github.io/stimming/motorway/) | Verlichte snelweg | The long way home, in orange. |
| [Crinkle foil](https://tomvdh.github.io/stimming/foil/) | Kreukelfolie | You can hear this picture. |
| [Kintsugi](https://tomvdh.github.io/stimming/kintsugi/) |  | The cracks got the fancy treatment. |
| [Marbling](https://tomvdh.github.io/stimming/marble/) | Marmeren | Swirl first. Ask what it is later. |
| [Rupert's drop](https://tomvdh.github.io/stimming/rupert/) |  | Strong opinions about which end you touch. |
| [Singing bowl](https://tomvdh.github.io/stimming/bowl/) |  | You can't rush a good hum. |
| [Observatory](https://tomvdh.github.io/stimming/observatory/) | Sterrenwacht | Please hold while the past comes into focus. |
| [Night vision](https://tomvdh.github.io/stimming/nvg/) |  | The dark has gone a bit green. |
| [Plasma globe](https://tomvdh.github.io/stimming/plasma/) | Plasmabol | Touch glass. Summon tiny lightning. |
| [Snow globe](https://tomvdh.github.io/stimming/snow/) | Sneeuwbol | A small weather event of your own making. |
| [Subway](https://tomvdh.github.io/stimming/subway/) | Metro | Your train is approaching. Eventually. |
| [Car wash](https://tomvdh.github.io/stimming/carwash/) |  | Sit back. The brushes have this. |
| [Harmonograph](https://tomvdh.github.io/stimming/harmono/) | Harmonograaf | A drawing made by things that can't sit still. |
| [East Van Alley](https://tomvdh.github.io/stimming/wires/) | Kraaiendraden | A perfectly good view if you look up. |
| [Contour map](https://tomvdh.github.io/stimming/contour/) | Hoogtekaart | Mountains, flattened for your convenience. |
| [Sorting sounds](https://tomvdh.github.io/stimming/sorting/) | Sorteerklanken | Please hold while the numbers get their lives together. |
| [Star Chart](https://tomvdh.github.io/stimming/starchart/) | Sterrenkaart | Pick a star. It's already old news. |
| [Fake Cash](https://tomvdh.github.io/stimming/fakecash/) | Vals geld | Money talks. This one's just for looking. |
| [Dichroic glass](https://tomvdh.github.io/stimming/dichroic/) | Dichroïsch glas | Can't settle on a colour. Fair enough. |
| [Fruit slice](https://tomvdh.github.io/stimming/fruit/) | Fruitsnee | All the satisfaction, none of the sticky counter. |
| [Opal turn](https://tomvdh.github.io/stimming/opal/) | Opaal | A little weather system inside a rock. |
<!-- /gen:toys -->
