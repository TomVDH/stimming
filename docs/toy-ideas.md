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
