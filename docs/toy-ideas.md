# Toy ideas

Pool of new toy ideas. Tom picks; nothing here is built or has a bean yet.
The Pages build skips this folder (it has no `index.html`), so it never ships.
Feasibility, ranking and budget live in [toy-plan.md](toy-plan.md).

Six groups run through every batch:

- **A.** School and uni lab experiments
- **B.** Data visualisation
- **C.** Cinematic dioramas (Strandbeest register)
- **D.** Stimming and fidget
- **E.** Satisfying physics loops
- **F.** Quiet to use, rich to look at

Working names only. Dutch names and mottos stay with Tom.

## Shortlist

Tom's picks, 2026-11-04. 27 toys.

| # | Toy | Group | Interaction |
|---|---|---|---|
| 1 | **Cloud chamber** | A | Tap to drop a source. Alpha, beta and muon trails condense in the mist and fade. |
| 42 | **Iodine clock** | A | Pour two clear liquids together. After a set delay the beaker snaps to ink black. A slider sets the delay. |
| 43 | **Electrolysis** | A | Two electrodes in water with indicator. Bubbles stream up and colour clouds bloom at each pole. |
| 46 | **Kelvin dropper** | A | Two drip streams slowly charge up, then a spark jumps the gap. |
| 47 | **Dry ice fog** | A | Drop dry ice in a basin of water; fog boils up, spills over the rim and pools on the table. Fire's smoke sim fits. |
| 12 | **Wind map** | B | Streamlines flow over a field; drag to spin up a cyclone. |
| 49 | **Ulam spiral** | B | Numbers spiral outward; primes glow and the diagonals appear. Zoom in and out. (Tom wrote "449"; read as 49.) |
| 50 | **Collatz coral** | B | Every number's path back to 1 grows as one branch of a coral. |
| 54 | **Spectrogram** | B | Play a small synth; the sound scrolls past as a waterfall of colour. Plan proposes folding it into Sonar. |
| S1 | **Sonar** | B | Submarine sonar on a green phosphor CRT. See below. |
| 15 | **Coast and meteor** | C | A calm cliffside cove at dusk. Tap the sky: streak, flash, shock ring, then the sea pulls back and returns. |
| 16 | **Night viaduct** | C | Snow, a stone bridge, a lit train crossing. Tap to send the next train. |
| 55 | **Marsh launch** | C | Dawn over a reed marsh. Tap to launch a rocket on the far shore; the sound arrives seconds later. |
| 56 | **Window seat** | C | A night city from orbit. Thunderstorms flicker inside the clouds; drag to drift along. |
| 59 | **Wind farm** | C | Turbines in sea fog. A slider sets the wind; blades and fog respond. |
| 61 | **Canal at dusk** | C | A rainy Flemish canal. Tap the quay lamps to light them; a paper boat drifts past. |
| 23 | **Peel** | D | Peel the protective film off a screen, sticker sheets, tape. |
| 27 | **Calm jar** | D | Shake by dragging; glitter swirls and settles slowly. Close to Snow globe (`snow/`): needs a clear difference. |
| 63 | **Pull chain** | D | A row of ball-chain pull switches. Each pull clicks a lamp and a tone. |
| 65 | **Rain stick** | D | Tilt the tube; beads trickle through the pins with sound. |
| 67 | **Pea pod** | D | Squeeze a pod; it splits and the peas pop out and roll. |
| 34 | **Washing line** | E | Cloth flaps in the wind; unclip pegs one by one. |
| 73 | **Water wheel** | E | Pour water; it runs through sluices and turns a chain of wheels. |
| S2 | **Fireworks** | E | Tap to launch shells. See below. |
| 35 | **Ink in water** | F | Drop ink; it blooms in volumetric curls. |
| 75 | **Sunbeam dust** | F | Motes drift in a shaft of light; your pointer stirs them. |
| 79 | **Star trails** | F | Hold to open the shutter; stars arc around the pole. |

### S1. Sonar: how it becomes a toy

A submarine sonar console on a green phosphor CRT: scanlines, slight barrel curve, bloom, and phosphor that fades slowly.

1. **Ping.** Tap to send an active ping. A ring sweeps out; echoes light up as blips and fade with the phosphor.
2. **Steer.** Drag to turn a narrow beam. Hidden contacts wait in the dark: a whale, a wreck, a fish school, the seabed, now and then something odd.
3. **Listen.** A Passive chip switches to the waterfall display (the spectrogram, idea 54). Whale song and a far propeller show as bright lines.
4. **Sound.** The ping and its echo delay come from Tone.js. Distance sets the echo time.

The loop: ping, hear the echo, find the contact, ping again. The CRT pass is reusable for other toys.

### S2. Fireworks

GPU particles with bloom over dark water.

1. Tap to launch a shell where you tap; hold to make it bigger.
2. Chips pick the shell: peony, willow, crossette, ring, strobe.
3. The bang arrives late, by distance. Smoke drifts and lingers.

## Tom's adds, 2026-11-14

Three toys Tom asked for by name. The interactions are proposals.

| # | Toy | Group | Interaction |
|---|---|---|---|
| 361 | **Terrarium** | F | A sealed glass jar of moss and ferns. Mist it; drops run down the glass and the green wakes up. |
| 362 | **Aquarium** | F | A planted tank. Drop food and the fish rise; tap the glass and they scatter. Close to Jellyfish tank (80). |
| 363 | **Soup cauldron** | E | A big pot on the fire. Throw things in and stir; it bubbles, steams and changes colour. |

## Later: batch 1

### A. School and uni lab experiments

| # | Toy | Interaction |
|---|---|---|
| 2 | **Ripple tank** | Drag two slits; tap to send waves. An interference pattern forms. Close to Caustic pool. |
| 3 | **BZ reaction** | Touch a petri dish to start chemical spirals that collide and wipe each other out. |
| 4 | **Hot ice** | Touch a supercooled liquid. Crystals race outward and freeze the dish. |
| 5 | **Leidenfrost drops** | Flick water drops onto a hot plate; they skate and hiss. |
| 6 | **Rubens' tube** | A slider sets the tone; a row of flames rises and falls in a standing wave. Close to Fire. |
| 7 | **Jacob's ladder** | An arc climbs two rods, snaps and starts again. Blow on it to bend it. |

### B. Data visualisation

| # | Toy | Interaction |
|---|---|---|
| 8 | **Galton board** | Pour beads; a bell curve builds up. Tilt the pegs to skew it. |
| 9 | **Sorting sounds** | Pick an algorithm; bars sort themselves, each swap a tone. |
| 10 | **Epicycles** | Draw a shape. Spinning circles (a Fourier series) redraw it. |
| 11 | **Rule 30 loom** | Toggle the top row of cells. A one-dimensional automaton weaves a textile downward. |
| 13 | **Voronoi mosaic** | Tap to drop cells; they jostle into stained-glass tiles. |
| 14 | **Desire paths** | Your pointer wears trails into a lawn over the session. |

### C. Cinematic dioramas

| # | Toy | Interaction |
|---|---|---|
| 17 | **Desert eclipse** | Drag the moon across the sun. Shadow bands, a corona, then the landscape goes cold. |
| 18 | **Fjord aurora** | A slider sets the solar wind; curtains ripple and reflect in still water. |
| 19 | **Deep vent** | Black water, falling marine snow, a hydrothermal vent. Your pointer is a lure light. |
| 20 | **Tide pool** | Scrub time; the tide fills and drains a rock pool and small creatures react. |
| 21 | **Wheat storm** | Wind ripples through a wheat field; tap to call lightning. |

### D. Stimming and fidget

| # | Toy | Interaction |
|---|---|---|
| 22 | **Worry stone** | Rub with your thumb; the stone polishes and warms in colour. |
| 24 | **Geoboard** | Stretch rubber bands across pegs; pluck them to twang. |
| 25 | **Spring stairs** | A coil spring walks down endless steps. Nudge it to change its pace. |
| 26 | **Abacus** | Flick beads along wires; they clack and settle. |
| 28 | **Detent dial** | A heavy rotary knob with deep clicks, safe-dial style. |

### E. Satisfying physics loops

| # | Toy | Interaction |
|---|---|---|
| 29 | **Chain fountain** | Pull one bead out of a jar; the chain leaps up and pours out by itself. |
| 30 | **Hourglass** | Flip it; sand piles and slumps. Tilt to stall it. |
| 31 | **Coin ledge** | Drop coins on a pushing shelf; some tip over the edge. |
| 32 | **Block tower** | Pull wooden blocks out of a stack until it falls. |
| 33 | **Jelly stack** | Drop soft cubes; they wobble and squash into a pile. |

### F. Quiet to use, rich to look at

| # | Toy | Interaction |
|---|---|---|
| 36 | **Incense smoke** | A thin plume rises; your pointer disturbs it. |
| 37 | **Slime mould** | Place food; a Physarum network grows and finds the shortest routes. |
| 38 | **Chromatography** | A drop of ink on wet paper separates into coloured bands. |
| 39 | **Dichroic glass** | Move the light; the glass shifts colour as you move. |
| 40 | **Glowing tide** | Waves on a night beach glow blue where you touch. |

## Later: batch 2

| # | Toy | Group | Interaction |
|---|---|---|---|
| 41 | **Flame tests** | A | Salts in a burner flame. Fire already has these fuels (lithium, copper, potassium and more), so this is mostly built. |
| 44 | **Glow paper** | A | A torch writes on phosphorescent paper; the trace glows green and fades. |
| 45 | **Lotus leaf** | A | Drip water on a waxy leaf; beads roll, merge and carry dust off the edge. |
| 48 | **Terminator** | B | A world map with the live day/night line. Scrub the date; the seasons tilt the line. |
| 51 | **Pi walk** | B | Each digit of pi takes one step in a direction. A random-looking walk draws itself. |
| 52 | **Contour map** | B | Press to raise hills. Contour lines and height colours update live. |
| 53 | **Seismograph** | B | Tap or drag on the "desk" to shake it; the needle writes on rolling paper. |
| 57 | **Calving** | C | A glacier wall in a fjord. Tap the ice; a slab drops and a slow wave rolls out. |
| 58 | **Observatory** | C | An old dome at night. Tap a star; the dome turns, the slit opens and the telescope slews. |
| 60 | **Lantern lake** | C | Tap to release paper lanterns over a still lake; they rise and reflect. |
| 62 | **Velcro** | D | Rip a strip open slowly or fast; the crackle follows your speed. |
| 64 | **Ice tray** | D | Twist a tray; cubes crack loose and pop out. |
| 66 | **Bead board** | D | Draw with a magnetic pen on a bead board; drag the slider to wipe it. |
| 68 | **Chalk and sponge** | D | Scribble on a blackboard; wipe it with a wet sponge and watch it dry. |
| 69 | **Newton's cradle** | E | Pull and drop the balls; the clack passes through. Close to Magnet balls and Pendulum wave. |
| 70 | **Drinking bird** | E | The bird dips, sips and rights itself. A slider sets the heat. |
| 71 | **Rattleback** | E | Spin a stone the wrong way; it wobbles, stops and spins back. |
| 72 | **Wrecking ball** | E | Swing a ball into a brick wall; bricks tumble, the wall rebuilds. |
| 74 | **Bottle flip** | E | Flick a half-full bottle; the water sloshes and it lands or falls. |
| 76 | **Leaf shadows** | F | Dappled light through leaves on a wall. A slider sets the breeze. |
| 77 | **Oil slick** | F | A thin oil film on a puddle; touch to swirl the rainbow bands. |
| 78 | **Marbling** | F | Drop paint on water and comb it into patterns; lay paper to print it. |
| 80 | **Jellyfish tank** | F | Jellies pulse in a blue-lit tank; tap the glass and they drift away. |

## Later: batch 3

A fresh agent drafted this batch without seeing batches 1 and 2.
It repeated 13 earlier ideas; those slots hold replacements (marked †).

### A. School and uni lab experiments

| # | Toy | Interaction |
|---|---|---|
| 81 | **Bell jar** † | Pump the air out of a bell jar. The ringing bell inside goes silent and a marshmallow swells. Let the air back in. |
| 82 | **Stress fringes** | Drag to turn a polariser over a clear plastic part, and hold to squeeze it. Rainbow stress fringes gather where the strain builds. |
| 83 | **Radiometer** † | Shine a lamp on a glass bulb; the black-and-silver vanes spin faster as you bring it closer. |
| 84 | **Cartesian diver** | Hold to squeeze a tall water bottle and the glass diver sinks. Let go and it bobs back up, trailing small bubbles. |
| 85 | **Stir vortex** † | Spin up a magnetic stir bar; a vortex funnels down into the beaker and drags dye with it. |
| 86 | **Candle jar** † | Cover a floating candle with a glass; the flame dies and the water climbs inside. |
| 87 | **Elephant foam** | Tap to tip catalyst into a tall cylinder. A hot, steaming column of foam erupts and folds over the bench. |

### B. Data visualisation

| # | Toy | Interaction |
|---|---|---|
| 88 | **Buffon needles** | Hold to rain needles onto floorboards. Needles that cross a line light up, and an estimate of pi settles digit by digit. |
| 89 | **Daylight ribbon** | Drag a latitude slider from the equator to the pole. A 365-day ribbon of sunrise and sunset stretches into polar day and polar night. |
| 90 | **Butterfly seed** | Tap to release a hundred particles from almost the same point. They stay together, then split apart across the Lorenz attractor. |
| 91 | **Birthday room** | Tap to walk one more person into a lit room. A thread joins any two who share a birthday, and a gauge shows the odds jump. |
| 92 | **Benford wells** | Drag through real datasets (river lengths, town sizes, star distances). The leading digits drop into nine wells that fill in the same lopsided curve. |
| 93 | **Traffic wave** † | Cars circle a ring road. Tap one to brake; a phantom jam ripples backward long after it moves on. |
| 94 | **Earth breathes** | Scrub a year slider. The northern forests green and fade, and the CO2 sawtooth breathes in step around the globe. |

### C. Cinematic dioramas

| # | Toy | Interaction |
|---|---|---|
| 95 | **Lighthouse storm** | A rock lighthouse in heavy weather. Tap the sea to send a wave over the tower; the beam cuts through the spray. |
| 96 | **Haboob** † | A desert town at dusk. Tap the horizon; a wall of dust rolls in and swallows the lights one by one. |
| 97 | **Avalanche ridge** | An alpine face at golden hour. Tap the cornice; a slab breaks loose and a powder cloud rolls down, lit pink by the low sun. |
| 98 | **Rice terraces** | Hillside terraces under monsoon clouds. Hold to rain; each terrace fills in turn and becomes a mirror of the sky. |
| 99 | **Lava coast** | A volcanic island at night. Tap the vent for a lava fountain whose flow meets the sea in towers of lit steam. |
| 100 | **Fog horn** † | A harbour mouth in thick fog. Tap the horn; a container ship slides out of the grey, lights first. |
| 101 | **Spillway** † | A concrete dam in a gorge. Drag to open the gates; water thunders down and mist climbs the walls. |

### D. Stimming and fidget

| # | Toy | Interaction |
|---|---|---|
| 102 | **Spark wheel** † | Flick a knurled flint wheel with your thumb; sparks spray and the ratchet clicks. |
| 103 | **Worry beads** | Drag a loop of beads through your fingers. Each one clacks past the next and the loop never ends. |
| 104 | **Sequin brush** | Stroke a field of reversible sequins. They flip colour in your trail; stroke back to flip them home. |
| 105 | **Fold cube** | Drag to fold a hinged block of eight cubes inside out. It opens again and again with a soft magnetic snap. |
| 106 | **Toggle wall** | A wall of chunky toggle switches. Drag across it to flick waves of them, each with a crisp snap. |
| 107 | **Crinkle foil** | Drag to scrunch a sheet of foil, then smooth it flat again. The wrinkles catch moving specular light. |
| 108 | **Doorstop twang** | Flick a spring doorstop. It wobbles and twangs, and the twang slowly dies into a hum. |

### E. Satisfying physics loops

| # | Toy | Interaction |
|---|---|---|
| 109 | **Silk drop** | Drag a sheet of silk over a cluster of shapes and let go. It falls, drapes and slides off. |
| 110 | **Plate spinning** † | Keep a row of plates spinning on poles; flick each one before it wobbles off. |
| 111 | **Clackers** † | Two balls on a string. Pump the handle until they clack top and bottom in rhythm. |
| 112 | **Tablecloth yank** | Drag the cloth edge and yank it. Plates and glasses stay put or crash, depending on how fast you pull. |
| 113 | **Coin funnel** | Flick coins into a curved gravity-well funnel. They spiral faster and faster until they rattle into the hole. |
| 114 | **Tetherball** † | Hit a ball on a rope; it wraps round the pole, slows and unwinds. |

### F. Quiet to use, rich to look at

| # | Toy | Interaction |
|---|---|---|
| 115 | **Breath mirror** | Hold to fog a dark mirror with your breath. Old finger doodles show through the mist, then fade as it clears. |
| 116 | **Opal turn** | Drag slowly to tilt a polished opal. Patches of play-of-colour flare up and slide across its depth. |
| 117 | **Moire veils** | Drag one of two sheer silk layers over the other. Large moire waves ripple across the folds. |
| 118 | **Night bloom** | Hold to time-lapse a night flower opening. Its petals glow from within under soft moonlight. |
| 119 | **Beetle shell** | Drag to turn a jewel beetle in your fingers. Its shell shifts from green to copper to violet. |
| 120 | **Smoke rings** † | Tap the side of a box; smoke rings drift out, wobble, and pass through each other. |

## Later: batch 4

Drafted 2026-11-14 against every built toy and batches 1 to 3. 40 ideas per group.
Close to a built toy: Snow crystal (Frost), Embers (Fire), Soft life (Slime), Bokeh (`shared/bokeh.js`), Watercolour bloom (Ink Water, Marbling).

### A. School and uni lab experiments

| # | Toy | Interaction |
|---|---|---|
| 121 | **Magnet drop** | Drop a magnet down a copper pipe; it falls in slow motion. |
| 122 | **Schlieren candle** | Heat shows as shimmering shadow; wave a hand to stir it. |
| 123 | **Double slit** | Fire single photons; stripes build one dot at a time. |
| 124 | **Chemical garden** | Drop salts in the tank; coloured stalks grow upward. |
| 125 | **Oobleck speaker** | Starch goo on a speaker grows fingers; poke it and it goes solid. |
| 126 | **Van de Graaff** | Crank the belt; hair strands rise and sparks jump. |
| 127 | **Rupert's drop** | Hammer the head: nothing. Snip the tail: it explodes, slowly. |
| 128 | **Wave machine** | Flick a row of rods; the wave runs out and bounces back. |
| 129 | **Cloud in a bottle** | Pump, then release; a cloud snaps into being. |
| 130 | **Superconductor track** | A frosty puck floats and locks over a magnet track; push it. |
| 131 | **Titration** | Drip by drip; one drop flips the flask pink. |
| 132 | **Golden rain** | Mix two clear liquids; gold flakes form and drift down. |
| 133 | **Black snake** | Light a tablet; an ash snake grows and curls out. |
| 134 | **Glowing pickle** | Plug in a gherkin; it hums and glows sodium yellow. |
| 135 | **Gallium spoon** | Stir hot tea; the spoon melts into a silver pool. |
| 136 | **Beating heart** | Touch a metal drop with a nail; it pulses like a heart. |
| 137 | **Silver tree** | Hang copper wire in solution; silver ferns grow on it. |
| 138 | **Lemon battery** | Wire up lemons; each one makes the lamp less dim. |
| 139 | **Star in a jar** | Sound traps one bubble; it glows as a blue point. |
| 140 | **Walking water** | Colour climbs paper bridges between glasses and mixes. |
| 141 | **Density column** | Pour layered liquids; each dropped object finds its layer. |
| 142 | **Tank sunset** | Add milk to a tank; the beam turns blue, then sunset red. |
| 143 | **Singing glass** | Slide the pitch to the glass's note; it wobbles, then shatters. |
| 144 | **Standing string** | Speed up the motor; loops multiply. A strobe freezes them. |
| 145 | **Strobe fountain** | Turn the strobe rate; drops hang, then rise. |
| 146 | **Pond drop** | Pan and focus a microscope on a living drop of pond water. |
| 147 | **Petri bloom** | Streak a plate; colonies bloom in time-lapse. |
| 148 | **Viscous fingers** | Pull two glass plates apart; ink grows fern fingers. |
| 149 | **Luminol** | Mix; the flask glows blue. Swirl to brighten. |
| 150 | **Whoosh bottle** | Light the vapour; a blue flame dives down the jug. |
| 151 | **Foucault pendulum** | Scrub the hours; the swing turns and fells pins in a ring. |
| 152 | **Tea engine** | A cup of tea drives a small hot-air engine; ice speeds it up. |
| 153 | **Greedy cup** | Fill past the line and the cup drains itself whole. |
| 154 | **Crookes tube** | Bend the green beam with a magnet; a cross casts its shadow. |
| 155 | **Geiger counter** | Sweep the wand over a banana, a watch dial, a rock. |
| 156 | **Brownian jiggle** | Grains jitter under the lens; a slider sets the heat. |
| 157 | **Sound levitation** | Beads float in a standing wave; shift the pitch and they hop. |
| 158 | **Dry sand** | Pour sand under water; it stands in silver columns and lifts out dry. |
| 159 | **Convection cells** | Heat a pan of flaked oil; hexagon cells form and churn. |
| 160 | **Steel wool** | Touch a battery to it; sparks crawl through. Blow to brighten. |

### B. Data visualisation

| # | Toy | Interaction |
|---|---|---|
| 161 | **Life garden** | Paint cells; gliders and guns take over. |
| 162 | **Fractal dive** | Hold to zoom forever; the Julia set follows your pointer. |
| 163 | **Sandpile** | Drop grains on one cell; avalanches build a fractal carpet. |
| 164 | **Ant highway** | One ant makes chaos, then a road. Add more ants. |
| 165 | **Maze grower** | A maze grows by your chosen rule, then floods with colour. |
| 166 | **Turing skin** | Brush two chemicals; spots turn to stripes, leopard to zebra. |
| 167 | **Flight day** | A day of flights as light trails; scrub the hour. |
| 168 | **Quake year** | A year of earthquakes thumps on a globe, sized by force. |
| 169 | **Star census** | Stars fall into place by heat and brightness. |
| 170 | **Prime sieve** | Multiples fall away in waves, each with a tone. |
| 171 | **Pascal weave** | Colour the triangle by remainder; slide the divisor. |
| 172 | **Chaos game** | Dots hop halfway to random corners; a fractal appears. |
| 173 | **Rule garden** | Rewrite rules grow plants; drag the branch angle. |
| 174 | **Golden angle** | Seeds place by one angle; shift it a hair and the spirals break. |
| 175 | **Bifurcation** | Turn one knob; a calm line forks into chaos. |
| 176 | **Percolation** | Raise the fill; one cluster suddenly spans the grid. |
| 177 | **Spin lattice** | Slide the temperature; magnetic domains melt and freeze. |
| 178 | **Forest fire** | Trees grow, lightning strikes, fires sweep; set the growth. |
| 179 | **Tree rings** | Scrub a trunk; wet and dry years show as wide and thin rings. |
| 180 | **Letter rain** | Type; letters fall into bins by how common they are. |
| 181 | **Telegraph** | Type; dots and dashes run down the wire as light and beeps. |
| 182 | **Space curve** | One line fills the square; slide its depth. |
| 183 | **Dragon fold** | Fold a strip again and again; unfold it to a dragon curve. |
| 184 | **Circle packing** | Tap to seed circles; each grows until it touches. |
| 185 | **Hat tiling** | One tile shape covers the floor and never repeats. |
| 186 | **Truchet weave** | Tap tiles to turn them; paths reroute across the sheet. |
| 187 | **Collapse** | Tap one cell; a town resolves outward from it. |
| 188 | **North Sea tide** | The tide wave turns round the sea; scrub twelve hours. |
| 189 | **Rail pulse** | A day of Belgian trains as dots on the net; scrub the hour. |
| 190 | **Zoom ladder** | Scroll from atom to galaxy, one power of ten per step. |
| 191 | **Light crawl** | A photon leaves the Sun at true speed; wait for each planet. |
| 192 | **Moon phases** | Drag the moon round the earth; phase and tide follow. |
| 193 | **Analemma** | A year of noon suns draws a figure eight; slide latitude. |
| 194 | **Half-life** | Atoms pop at random; the curve is the same every time. |
| 195 | **Soft life** | Smooth cell creatures glide and split like microbes. |
| 196 | **Firefly sync** | Fireflies blink at random, then lock in step. Tap to scatter. |
| 197 | **Gamut** | Every screen colour as one solid; turn it, slice it. |
| 198 | **Clock of clocks** | 24 small clocks turn their hands to spell the time. |
| 199 | **Salesman** | Drop cities; the tangled route untangles itself. |
| 200 | **Downhill** | Balls roll down a bumpy landscape; rival methods race. |

### C. Cinematic dioramas

| # | Toy | Interaction |
|---|---|---|
| 201 | **Drive-in** | An empty drive-in at night; the beam cuts the mist. Tap for the next reel. |
| 202 | **Night laundrette** | A row of drums under neon; tap one to start it. |
| 203 | **Boat lift** | A barge rises 70 metres in a tub of water, slowly. |
| 204 | **Furnace tap** | Tap the furnace; molten iron runs the channel and lights the hall. |
| 205 | **Night terminal** | Port cranes in drizzle; tap one to lift a box. |
| 206 | **Cooling towers** | Steam plumes at dawn; a slider sets the wind. |
| 207 | **Funfair** | A fair at night; tap a ride to spin it into light streaks. |
| 208 | **Glasshouse glow** | Pink grow-lights paint the low clouds over flat land. |
| 209 | **Whiteout** | A polar hut in a blizzard; tap the door lamp. |
| 210 | **Earthrise** | A rover crosses a crater; kicked dust falls in slow arcs. |
| 211 | **Airship hangar** | The doors part; an airship noses out, very slowly. |
| 212 | **Geyser field** | Tap a vent; a rumble, then a column of steam. |
| 213 | **Kelp forest** | Sun shafts through kelp; fish schools part round your pointer. |
| 214 | **Whale pass** | Deep blue; a whale crosses overhead and dims the light. |
| 215 | **Salt flat** | A thin sheet of water mirrors the sky; drag to ripple it. |
| 216 | **Dune sea** | Wind moves the sand; crests smoke and the dunes hum. |
| 217 | **Slot canyon** | One light shaft in a narrow canyon; throw sand into it. |
| 218 | **Cable car** | A gondola climbs through cloud into sun; tap to send the next. |
| 219 | **Apron at night** | Tap a jet; it takes off and its vortices curl the mist. |
| 220 | **Night catapult** | A carrier deck: steam, afterburner, launch. |
| 221 | **Test stand** | Hold to throttle a rocket engine; shock diamonds form. |
| 222 | **Slipway** | A hull slides sideways into the water; a wall of wave follows. |
| 223 | **Chimney fall** | A brick stack topples and breaks in mid-air. |
| 224 | **Night harvest** | Combines with lights work a field in glowing dust. |
| 225 | **Belfry** | A belfry at dusk; tap the bells and the pigeons scatter. |
| 226 | **Rose window** | Scrub the sun; coloured light crawls over pillars and dust. |
| 227 | **Level crossing** | Bells, barriers, then the train blasts past and leaves swirl. |
| 228 | **Horseback shrimpers** | Low tide, wet sand mirror; horses drag nets through the surf. |
| 229 | **Polder mist** | Dawn fog on fields and willows; scrub the sun to burn it off. |
| 230 | **Fen lights** | A bog at night; pale lights drift toward your pointer. |
| 231 | **Cobbles** | A cobbled climb in rain; tap to send the peloton up. |
| 232 | **Tower block** | Tap windows on a night estate; each lights with its own flicker. |
| 233 | **Last petrol station** | Moths at a desert pump; a truck passes with a Doppler howl. |
| 234 | **Car wash** | Seen from the seat: foam, brushes, water curtain, coloured light. |
| 235 | **Night glow** | Hot-air balloons at dawn; tap a burner to light one. |
| 236 | **Gas giant** | Storm bands swirl; drag to stir a new storm. |
| 237 | **Event horizon** | Orbit a black hole; drop a star into the disc. |
| 238 | **Solar loop** | Plasma loops rise off the sun's edge; tap for a flare. |
| 239 | **Flare stack** | A rig in night swell; the flare lights the cloud base. |
| 240 | **Ice breach** | A submarine's sail breaks up through Arctic ice. |

### D. Stimming and fidget

| # | Toy | Interaction |
|---|---|---|
| 241 | **Pen click** | Click a giant pen; now and then the spring escapes. |
| 242 | **Hole punch** | Punch paper; the dots pile up. |
| 243 | **Embosser** | Dial a letter and squeeze; the tape stamps with a clunk. |
| 244 | **Typewriter** | Keys, a carriage bell, and jams when you mash. |
| 245 | **Rotary phone** | Dial a digit; the wheel whirs home. |
| 246 | **Cash register** | Chunky keys, a bell, and the drawer shoots out. |
| 247 | **Ratchet** | Turn the wrench; it clicks. Flip the lever to reverse. |
| 248 | **Tape measure** | Pull it out, let go; it whips back and wobbles. |
| 249 | **Key tester** | Giant key switches: clicky, smooth, deep. |
| 250 | **Mesh ball** | Squeeze; coloured bubbles bulge through the net. |
| 251 | **Pop tube** | Stretch and crush a ribbed tube; whirl it to sing. |
| 252 | **Twist snake** | Twist a chain of hinged wedges into shapes. |
| 253 | **Magnet sliders** | Two magnetic discs slide, flip and snap together. |
| 254 | **Bead curtain** | Run a hand through; the strands clatter and sway. |
| 255 | **Wind chimes** | Brush through them; a slider sets the breeze. |
| 256 | **Singing bowl** | Circle the rim; the tone builds and the water dances. |
| 257 | **Scratch card** | Scratch off the silver; flakes curl away. |
| 258 | **Wax seal** | Drip wax, press the stamp, lift. |
| 259 | **Pencil sharpener** | Turn slowly for one long unbroken curl. |
| 260 | **Tin clicker** | Press the tin frog; every click makes it jump. |
| 261 | **Slap band** | Slap it and it coils; pull it straight with a snap. |
| 262 | **Press studs** | Snap a row shut one by one, then rip it open. |
| 263 | **Cable ties** | Pull each tie tight: zzzip. |
| 264 | **Purr** | Stroke a furry blob; the fur follows and it purrs. |
| 265 | **Pinwheel** | Hold to blow; the colours blend as it spins. |
| 266 | **Fortune teller** | Open and close the paper mouth; flaps lift. |
| 267 | **Paper tear** | Tear a sheet your way; the fibres fray. |
| 268 | **Shredder** | Feed in sheets; strips curl out below. |
| 269 | **Flip book** | Thumb the corner; a small film runs. |
| 270 | **Card riffle** | Riffle, bridge and fan a deck. |
| 271 | **Chip shuffle** | Shuffle two chip stacks into one with a clack. |
| 272 | **Bead maze** | Slide wooden beads along looping wires. |
| 273 | **Hammer pegs** | Hammer the pegs through, flip the bench, go again. |
| 274 | **Nesting dolls** | Open a doll; there is always a smaller one. |
| 275 | **Arcade panel** | Waggle the stick and mash buttons; lamps answer. |
| 276 | **Lift panel** | Press every floor; they light, the doors ding. |
| 277 | **Crossing button** | Press the button; the ticker speeds up, then it goes green. |
| 278 | **Liquid timer** | Flip it; coloured drops walk down the ramps. |
| 279 | **Ring toss** | Press the pump; rings float up toward the pegs. |
| 280 | **Tilt maze** | Tilt the board; steer a ball past the holes. |

### E. Satisfying physics loops

| # | Toy | Interaction |
|---|---|---|
| 281 | **Marble run** | Place a few track parts; a lift keeps the marbles looping. |
| 282 | **Ringing disc** | Spin a heavy disc; it rings faster and faster, then stops dead. |
| 283 | **Metronome sync** | Metronomes on a swinging board fall into step. |
| 284 | **Trap room** | A floor of loaded mousetraps; drop one ball. |
| 285 | **Popcorn** | Heat the pan; kernels pop until the lid lifts. |
| 286 | **Water balloons** | Drop them on a spike; they burst in slow motion. |
| 287 | **Paint speaker** | Paint leaps off a speaker cone; slide the pitch. |
| 288 | **Slow smash** | Drop a cup at 1000 frames a second; scrub the time. |
| 289 | **Hydraulic press** | Crush things; each one fails its own way. |
| 290 | **Lathe** | Hold a chisel to spinning wood; shavings fly. |
| 291 | **Pottery wheel** | Pull the clay up; off-centre, it wobbles and folds. |
| 292 | **Pressure washer** | Clean a filthy patio in crisp stripes. |
| 293 | **Ice resurfacer** | Lay a glossy wet stripe over scarred rink ice. |
| 294 | **Parcel sorter** | Parcels ride belts; flip the gates to route them. |
| 295 | **Bottling line** | Fill, cap, label in rhythm; speed it up until it jams. |
| 296 | **Bounce stairs** | Tip a bucket of bouncy balls down a stairwell. |
| 297 | **Trebuchet** | Load, release; the sling whips a stone into a wall. |
| 298 | **Skipping stones** | Flick a flat stone; count the skips and rings. |
| 299 | **Paper plane** | Throw it; it glides, loops or stalls. |
| 300 | **Boomerang** | Throw it; it curves home. Catch it. |
| 301 | **Yo-yo** | Throw, let it sleep, tug it home. |
| 302 | **Juggler** | Add balls to the pattern until it breaks. |
| 303 | **Brazil nut** | Shake a jar of mixed nuts; the big ones rise. |
| 304 | **Magnet pendulum** | A pendulum over three magnets; no two swings end alike. |
| 305 | **Self-righter** | Push the odd shape over; it always stands up again. |
| 306 | **Air ball** | A ball hovers on an air jet; tilt the jet, add more. |
| 307 | **Wind tunnel** | Drag a shape in smoke lines; vortices peel off behind it. |
| 308 | **Wave flume** | A paddle sends waves that break on a slope. |
| 309 | **Sandcastle** | Build a mound; the tide takes it apart. |
| 310 | **Stream table** | Rain on a sand hill; rivers carve, a delta forms. |
| 311 | **Honey coil** | Pour honey from a height; the thread coils like rope. |
| 312 | **Match line** | Light one match; fire runs down the row you drew. |
| 313 | **Angel chimes** | Candle heat turns the rotor; small hammers ring. |
| 314 | **Ball clock** | Steel balls tip the rails each minute and cascade. |
| 315 | **Escapement** | Wind the spring; watch one tick in slow motion. |
| 316 | **Cutaway engine** | Open the throttle on a sliced four-stroke engine. |
| 317 | **Spin cycle** | An off-balance washer shakes and walks across the floor. |
| 318 | **Pizza toss** | Spin the dough; it stretches wider each toss. |
| 319 | **Whip crack** | Flick; the loop runs out and cracks. |
| 320 | **Sprinkler** | Tick, tick, tick, then the fast sweep back. |

### F. Quiet to use, rich to look at

| # | Toy | Interaction |
|---|---|---|
| 321 | **Embers** | Hold to breathe on a bed of coals; sparks lift. |
| 322 | **Koi pond** | Touch the water; koi come and the ripples bend them. |
| 323 | **Cumulus** | Clouds form and dissolve over a hill; set the speed. |
| 324 | **Geode** | Crack it open; turn the crystal hollow in the light. |
| 325 | **Agate slice** | Backlit bands; zoom in without end. |
| 326 | **Peacock feather** | The eye shifts colour as the breeze moves the barbs. |
| 327 | **Wing scales** | Zoom from wing to scale to ridge; the blue is structure. |
| 328 | **Snow crystal** | Six arms grow; humidity and cold set the shape. |
| 329 | **Mirror ball** | Light spots wheel round a dark, smoky room. |
| 330 | **Lighthouse lens** | A giant glass lens turns; beams sweep the dark. |
| 331 | **Lava skin** | Slow lava crusts, cracks and glows through. |
| 332 | **Glassblower** | Turn a glowing gather so it stays true; hold to blow. |
| 333 | **Temper colours** | Heat steel; straw, purple and blue run along it. Quench. |
| 334 | **Verdigris** | Copper greens over years; rub it back to bright. |
| 335 | **Melt** | An ice block melts in time-lapse and bends the room. |
| 336 | **Dew web** | A beaded web at dawn; pluck a thread, drops fall. |
| 337 | **Pond skaters** | Their feet dimple the water; flower shadows move below. |
| 338 | **Anemone** | Tentacles sway; touch them and they close. |
| 339 | **Coral spawn** | A night reef lets go; pink eggs rise like slow snow. |
| 340 | **Cuttlefish skin** | Colour cells pulse in waves that follow your pointer. |
| 341 | **Moth lamp** | Moths circle a porch light; big shadows flutter on the wall. |
| 342 | **Carousel lamp** | A turning cut-paper lamp sends shapes round the room. |
| 343 | **Bokeh** | Pull focus on night lights; change the aperture shape. |
| 344 | **Night-shining clouds** | Electric blue ripples high in the sky after dusk. |
| 345 | **Sundogs** | Tilt the ice crystals; halos and sundogs form. |
| 346 | **Double rainbow** | Drag the sun; the bows rise and fall. |
| 347 | **Comet tail** | Drag a comet round the sun; the tail always points away. |
| 348 | **Green flash** | The setting sun flattens, splits and ends in green. |
| 349 | **Heat shimmer** | A hot road; a far truck stretches and floats. |
| 350 | **Bubble ice** | Under lake ice: stacked white bubbles, booming cracks. |
| 351 | **Glowworm cave** | Blue points on a cave roof, doubled in the water. |
| 352 | **Spore puff** | Backlit mushrooms breathe out spores. |
| 353 | **Crown shyness** | Look up; the treetops sway and never touch. |
| 354 | **Watercolour bloom** | Touch wet paper with paint; blooms spread and dry to an edge. |
| 355 | **Sand grains** | Under the lens, every grain is a gem; pan around. |
| 356 | **Kintsugi** | A broken bowl; gold flows into the cracks. |
| 357 | **Valves** | Amplifier valves warm to orange and hum. |
| 358 | **Digit tubes** | Glowing wire digits count the time in their mesh cages. |
| 359 | **Degauss** | The picture wobbles in rainbow, then folds to one dot. |
| 360 | **Fibre lamp** | Brush a spray of light fibres; the tips change colour. |
