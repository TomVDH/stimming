# Bar v2: diegetic controls

A diegetic control lives inside the scene. It draws on the toy's canvas, the pointer grabs it like any other part, and it replaces a bar control. It never duplicates one. A key in the key strip keeps the keyboard path.

Every Bar v2 port proposes one, or says in one line that none fits. Brief: [bar-v2-migration.md](bar-v2-migration.md), step 4. Spec: [bar-v2.md](bar-v2.md).
A session builds a proposal only on Tom's yes. Tom sets the verdict here; the toy's bean holds the detail.

**Verdicts:** `built` (Tom said yes, shipped) · `waiting` (no verdict yet) · `none fits` (no proposal) · `yes` / `no` (Tom decided, not built yet).

## Proposals

| Toy | Proposal | Replaces | Keyboard path | Still | Verdict | Bean |
|---|---|---|---|---|---|---|
| Pin art | Knock the frame to shake flat; drag a frame side to flip. | Shake, Flip | Esc, Enter | [pins](diegetic/pins-diegetic.jpg) | built | `stimming-fz4t` |
| Fidget board | A short press on the stick's nub shuffles the board, in a wave from the stick. | Shuffle | S, Space on the stick | [fidget](diegetic/fidget-diegetic-shuffle.jpg) | built | `stimming-marx` |
| Morpher | Shape seeds you fling into the morpher. | Shape stepper | Arrows | [morpher](diegetic/morpher-diegetic-seeds.jpg) | waiting | `stimming-x325` |
| Prism | Tap the lamp body to step its light: White, Red, Green, Violet. | Light row | L | [prism](diegetic/prism-diegetic-lamp-switch.jpg) | waiting | `stimming-by83` |
| Pop field | A peel corner on the sheet. | Shuffle | S | none | waiting | `stimming-g3c3` |
| Domino Day | A click on a fallen tile rewinds the run. | Reset | R | [domino](diegetic/domino-diegetic-rewind.jpg) | waiting | `stimming-qll8` |
| Glass | Hammer, gun and brick lie under the frame; click one to pick it up. | Tool row | Tool keys | [glass](diegetic/glass-diegetic-tools.jpg) | waiting | `stimming-b3ri` |
| Googly eyes | No proposal recorded. | | | | none fits | `stimming-4yxl` |
| Fire | A pinch of chemical would clone Flame test; a bellows repeats the drag. | | | | none fits | `stimming-94pk` |
| Rain on glass | Drag already wipes the glass; weather is outside the pane. | | | | none fits | `stimming-4dkg` |
| Bubble wand | Hold anywhere in the air to blow through the ring. | Blow chip | Space (held) | [bubbles](diegetic/bubbles-diegetic-hold-to-blow.jpg) | waiting | `stimming-kc8x` |
| Kaleidoscope | A knurled mirror collar at the rim that clicks to 6, 12 or Tri. | Mirrors choice | M | [kaleido](diegetic/kaleido-diegetic-collar.jpg) | waiting | `stimming-7a9j` |
| Ferrofluid | A lit arc on the plinth with a steel knob for field strength. | Field slider | − and = | [ferro](diegetic/ferro-diegetic-field-dial.jpg) | waiting | `stimming-w8a5` |
| Neon Hum | A pull chain on a junction box beside the sign steps the Lights modes. | Lights row | L | [neon](diegetic/neon-diegetic-pullchain.jpg) | waiting | `stimming-at0y` |
| Oscilloscope | A FREQ knob right of the face and a Pen/Knot switch left of it. | Pitch slider, Mode | Arrows | [scope](diegetic/scope-diegetic-knobs.jpg) | waiting | `stimming-gt7l` |
| Magnet balls | A compass on the table follows the field; a tap shows the field lines. | Field lines toggle | F | [magnet](diegetic/magnet-diegetic-compass.jpg) | waiting | `stimming-mhzq` |
| Soap cutting | A crate of six bars beside the mat; tap one to slide it in. | Soap stepper, New bar | 1 to 6, N | [soap](diegetic/soap-diegetic-crate.jpg) | waiting | `stimming-jy9z` |
| Chladni plate | A signal generator with a FREQ dial, one detent per pattern. Alternative: a bow on the plate edge. | Rail slider | Arrows | [chladni](diegetic/chladni-diegetic-signal-generator.jpg) | waiting | `stimming-ofei` |
| Pendulum wave | A release lever on the beam: hold to lift, let go to drop. | Release | Space (held) | [pendulum](diegetic/pendulum-diegetic-lever.jpg) | waiting | `stimming-rc86` |
| Caustic pool | A lamp switch on the deck flips day and night. | Time row | N | [pool](diegetic/pool-diegetic-lamp-switch.jpg) | waiting | `stimming-arla` |
| Heat putty | A putty knife on the slab edge; drag it across to scrape the slab clean. | Clear | C | [putty](diegetic/putty-diegetic-scraper.jpg) | waiting | `stimming-qj4w` |
| Beach walker | A windsock in the sand; drag its mouth to set breeze direction and strength. | A breeze slider | Up and Down | [walker](diegetic/walker-diegetic-windsock.jpg) | waiting | `stimming-kvkt` |
| Balloon letters | A helium tank; a tap opens the touch keyboard and letters puff from the nozzle. | Type chip (touch) | Typing | [balloons](diegetic/balloons-diegetic-helium-tank.jpg) | waiting | `stimming-gwzz` |
| Lava lamp | A dimmer puck on the cord sets the heat; fully down, the wax sets. | Hold the base | Up and Down | [lava](diegetic/lava-diegetic-dimmer.jpg) | waiting | `stimming-j2q5` |
| TV tree | A remote in the grass tunes every set to one picture; a tap on the lantern lights it. | Tune, Lantern row | T, L | [tvtree](diegetic/tvtree-diegetic-remote.jpg) | waiting | `stimming-867b` |
| Coil | Tap the coil body to tip it over the edge. | Nudge | Space | [coil](diegetic/coil-diegetic-tap.jpg) | waiting | `stimming-gg7y` |
| Dandelion | A bud in the grass; tap it to regrow the head. | Regrow | R | [dandelion](diegetic/dandelion-diegetic-bud.jpg) | waiting | `stimming-jmpi` |
| Fireworks | The sky is already the control: a press launches, a hold sizes the shell. A firing console on the shore would sit outside the view. | | | | none fits | `stimming-u4us` |
| Star trails | The sky is already the shutter: a press opens it. A cable release on the ridge would only repeat that. | | | | none fits | `stimming-80dc` |
| Cloud chamber | The view is the mist itself; the lamp and the magnet sit outside the frame. | | | | none fits | `stimming-c7hm` |

## Not yet proposed

The rest of the toys propose as they port, batch by batch. Infinity cube, Split-flap and Murmuration (batch 6) stopped before a proposal.
