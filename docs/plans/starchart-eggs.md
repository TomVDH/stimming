# Star Chart: egg candidates per body

Status: proposed, 2026-11-25 · Bean `stimming-3qc0` (decision) · Epic `stimming-e35i` · Round 2 build bean: `stimming-27rx`. Nothing here is built. Tom picks.

Tom, 2026-11-25: "come up with the list per body that we can add -- be elaborate -- reference sci fi -- yet be realistic about how stylishly we can develop it".

## How an egg works now

| Part | Now |
|---|---|
| Trigger | A still press of 3 s on the body (`HOLD`). From 0.6 s (`CUE`) the egg builds; a release before 3 s runs it back. Each egg also comes on its own about once per 25 awake minutes (`RARE`), never under reduced motion. The Sun's ship needs a hold on Mercury while Mercury is on the disk |
| Code | `eggs.js` holds the timing and each egg's timeline as pure functions (`carrington(egg)`, `dimming(egg)`, `sunshine(egg)`, `stepVoice`). `main.js` wires them. `EGGS` maps one egg to each star |
| Picture | Uniforms into existing passes: `uEgg[4]` and `uDim[2]` in the disk pass (spots, kernels, the dust veil), `uShip` in the final pass, the flare system (`sun.js`) for the Carrington rope and arcade, the pulsar's spin rate for Vela |
| Sound | `sound.js`: `dim`, `beacon`, `ping`, `spin`, `flare`. The choir (`choir.js`) is one engine with presets; an egg can bend it (filter, swell, wob) or add one small voice |
| Text | `EGG_TEXT` in `articles.js`: each egg has a name, a Do row, a What row and its real background in the article's Eggs section |
| Rules | Idle pages do no per-frame work: an egg holds the loop awake only while it runs. Reduced motion softens or skips it. No film or brand name on screen (the ship is "after Sunshine" only in the docs) |

## How to read this plan

Kinds: **R** real science (a true event or oddity), **F** a sci-fi nod (an original homage, never a copy), **U** playful or uncanny.
★ marks a top pick: cheap, high delight, low style risk.

Cost, against the toy's real kit:

| Cost | Means |
|---|---|
| S | A timeline in `eggs.js` plus a uniform or a branch in a pass that the body already runs, or a 2D overlay like `sstars.js`. About half a day with the article text |
| M | New geometry, a new sound voice, or a branch that adds to a disk-pass compile version. One to two days with Tom's look |
| L | A new march, a new pass or new shared tech. Several days |

Perf: an egg branch in the disk pass (SKY) adds to that star's compile version, and D3D on Windows is slow with a large SKY program (`stimming-al27`). Prefer the final pass, the 2D overlay or a uniform the star already reads. Every egg below sleeps when it ends.

Style risk: **low** means the toy's current look carries it (light, haze, glow, a silhouette against a bright disk). **mid** needs Tom's eye on one detail. **high** draws a literal object or a symbol, which can look cheap next to the film-graded star; say so before a build.

New triggers this plan uses (each one small, in `main.js`):

| Trigger | What |
|---|---|
| Hold | The existing 3 s still press, on the body or on a part of it (a limb, a dust cloud, a ring) |
| Far hold | The same hold, only at x16 to x32, where the body is a point |
| Key | A key or a short key sequence while the body is in hand |
| Date | The visitor's own calendar date (an anniversary plays the egg the first time the body is picked that day) |
| Turn | A Turn rate held for a time (real time, or ×100) |
| Rare | The existing rare draw; some eggs only come this way |

## The stars

### Sun

Built: the Carrington flare, the ship in transit (after Sunshine).

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The pale blue dot | Far hold at x32 | A thin shaft of scattered light, the lens's own streak tilted, crosses the frame beside the Sun. In the shaft one pixel of pale blue holds still. The choir drops to the low singers for 10 s | Voyager 1, 14 February 1990: the earth as one pixel in a ray of scattered sunlight, 6 billion km out. Our own frame and our own ray; no NASA picture | S: the final pass already draws the streak and ghosts; one more streak at an angle and one dot. The choir's zoom mix holds the low singers | low: it is light and one pixel, the toy's strength | Final pass only; nothing per frame after 15 s |
| R · A sungrazer | Hold on the limb; also rare | A comet dives from outside the frame toward the limb, its tail streaming away from the Sun, brightens, and breaks into a fading cloud a little above the surface | Kreutz sungrazers; Comet ISON broke up on 28 November 2013. Our own comet, made of strands | M: a new strand bundle in `sun.js` (the tail as a fan of threads, as the rope is) | mid: a tail must read as gas, not as a white line | Strands are instanced; one bundle is cheap |
| R · A sunquake | Plays 8 s after any Carrington egg, once | Rings run out from the flare site over the surface, slow, faint, like a stone in a pond | Kosovichev and Zharkova, 1998: a flare of 1996 sent seismic rings over the Sun. **Tom said no wave runs over the disk (2026-11-23)**, so this is the one exception to ask about | S: `uEgg` already marks the Carrington site; a ring term in the same loop | mid: a wave was cut once | One branch in the existing egg loop |
| F · The amplifier | Key: type the Sun's name, then hold the Sun | The choir falls silent. A low radio tone goes into the Sun; 8 s later the whole disk breathes once, brighter, and an echo of the tone comes back, deeper and with a pause in it | The Three-Body Problem (Liu Cixin): a scientist uses the Sun as an amplifier to call out. On screen: no names, no text, one breath of light and one tone | S: the exposure already has a lift (Real light); `sound.js` gains one tone | low | One timeline |
| F · A sail regatta | Rare, only on the long lens | Three thin square sails, gold on one face, cross the open corner slowly, tilting so each one flashes once as it catches the Sun | Arthur C. Clarke, "The Wind from the Sun" (Sunjammer, 1964). Our own sails: flat squares, no rigging detail | S: `uShip` already draws a silhouette with a glint in the final pass; three quads | mid: must stay tiny and slow, as the ship does | Final pass |

### Proxima

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The superflare | Hold | The whole star whites out: a flare 68 times its own light. The exposure fights it for 2 s, then settles. A brass blast an octave lower than a tap | March 2016, Evryscope: Proxima flared so hard that a human eye could have seen it, for a moment. A tap's flare at 6 times its size, plus the Real light lift | S: a tap's flare with a larger scale (the flare already scales with the view) and the exposure lift | low: the toy's best moment, larger | One flare; the same cost as a tap |
| ★ F · The flicker | Far hold | The film grain and the starfield blink, all at once, slowly, in a pattern that counts down. After the last blink the frame is still for a moment, then the grain comes back | The Three-Body Problem: the cosmic background flickers for one man, counting down. Its aliens live in the Alpha Centauri system, Proxima's own. On screen: no numbers, only the blinks | S: the grain and the starfield are final-pass terms; one multiplier | low: grain is already there | Final pass |
| R · A sail at a fifth of light speed | Rare | A point of light streaks across the frame in under a second, with a faint laser line behind it that fades | Breakthrough Starshot: gram-scale sails pushed by lasers toward Alpha Centauri at about 20 percent of light speed | S: a line in the final pass | low | Under a second |
| R · The false signal | Sound on; hold | Under the choir, a thin pure tone rises out of the hiss, drifts slowly in pitch, then breaks into a buzz of our own machines and stops. The article says it was interference | BLC1, 982.002 MHz, heard at Parkes in 2019 and traced to human interference in 2021 | S: one voice in `sound.js` | low | Audio only |

### Epsilon Eridani

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ F · A station in the dark | Far hold at x8 to x32 | A slow turning drum, very small and dark, crosses the glow beside the star, with a few lit windows on its night side | Babylon 5 is set at a station in this system, and Halo's planet Reach orbits it. On screen: a plain cylinder with a spin, not the show's station shape, and no jump gate | S: `uShip` in the final pass, a second silhouette | mid: must stay a few pixels, like the ship | Final pass |
| R · Project Ozma | Sound on; hold | A hiss at the hydrogen line rises under the choir. A strong signal pops in, Morse-like, then the hiss stays empty. The article tells the story | Frank Drake, 1960: the first search for alien radio, at this star and Tau Ceti; the one strong signal was our own aircraft | S: `sound.js` | low | Audio only |
| R · Its dust ring | Zoom out past x4; hold | A faint wide ring of dust grows in round the star, as Fomalhaut's belt does, with a gap where a planet runs | Epsilon Eridani has a debris disc and at least one planet. Reuses Fomalhaut's belt block | S: `uRing` already exists in the disk pass for Fomalhaut | low | A ring the pass already knows; it joins this star's compile version |

### Procyon

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The wobble | Far hold | The far star sways a little, side to side, on a slow beat. After two sways a tiny white pip appears beside it: the companion that caused it | Bessel saw Procyon wobble in 1844; Schaeberle saw the white dwarf in 1896 | S: the far star's place is a final-pass uniform; one pip | low | Final pass |
| U · The little dog | Hold, three times in a row | The tiny companion runs one fast lap round Procyon and stops where it started. The choir yips once: a short, high, glad interval | Procyon is the brightest star of Canis Minor, the little dog. Our own pip, no dog drawn | S | mid: zany; it must stay a light, not a cartoon | Short |

### Sirius

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · Low on the horizon | Far hold | The far star twinkles hard and changes colour, red, green, blue, white, as Sirius does low over a winter horizon. The streak wavers with it. Slow enough to be safe for photosensitive eyes | Scintillation: the air's turbulence splits the brightest star's light into colours | S: the far star's colour and the streak are final-pass uniforms | low: it is how people really see Sirius | Final pass; under 2 changes a second |
| R · The pup | Zoom out past x4 | Sirius B shows as a tiny blue-white pip on its 50-year orbit, following Turn | Sirius B, the Pup, found by Alvan Clark in 1862 | S: one pip, as Procyon's | low | Final pass |
| F · A door that sighs | Key: I, when the card opens on Sirius | The card's wipe plays with a soft, pleased synth sigh | Douglas Adams, The Hitchhiker's Guide to the Galaxy: doors that sigh with pleasure. Sirius gives its name to the company that made them. On screen: no names; only the sigh | S: one sound | low | Audio only |

### Vega

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ F · Primes | Hold; also rare | The star's light pulses in counts: 2, 3, 5, 7, 11, 13, a pause between each group. The choir answers each pulse with one soft note | Contact (Carl Sagan, 1985; the film, 1997): a signal from Vega counts out the prime numbers. On screen: our own pulses in Vega's light, no dish, no text | S: the exposure lift as a pulse; `snd.ping` exists for the pulsar's flash | low | A short timeline |
| ★ R · The first star photograph | Key: P, or a far hold | The frame turns into a silver plate: grey and warm, a soft vignette, the star's disk a little blurred as by a long exposure. It holds for 8 s, then the colour returns | 16–17 July 1850: Vega was the first star photographed, a daguerreotype at Harvard. Our own grade, no scan | S: the grade's Look block already holds looks; one more | low: the grade is the toy's strength | Final pass |
| R · The pole star of 13,700 | Turn at ×100, held 30 s, far out | The starfield starts to turn slowly round a point just off Vega, as the sky turns round the pole | Precession: Vega will be near the north celestial pole in about 12,000 years | S: the starfield layers rotate in the final pass | low | Final pass |

### Regulus

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · Blinked out by an asteroid | Far hold | A dark point crosses the far star; the star snaps out for 14 s, the streak and ghosts gone, then snaps back | 20 March 2014: the asteroid Erigone was to hide Regulus for up to 14 s over New York. Clouds hid it from most watchers | S: the far star's weight is a final-pass uniform | low: a blink is a strong, clean beat | Final pass |
| R · Spun to breaking | Hold | The spin speeds up; the equator stretches further and darkens; at the peak a thin bright ring of gas peels off the equator and drifts out, then the star settles | Regulus spins at about 96 percent of its break-up speed. Be stars shed rings this way | M: the oblate shape is a uniform; the ring reuses `uRing` | mid: the stretched star must not look like a lens error | Joins this star's compile version |

### Zeta Ophiuchi

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The ghost of the kick | Zoom out past x4; hold | Behind the runaway, a faint thin shell of old gas grows in, centred far behind it: the supernova that threw it out | Zeta Ophiuchi's partner exploded about a million years ago and threw it free | S: a ring in the final pass, beside the bow shock (`uBow`) | low | Final pass |
| F · A ramjet in the bow shock | Rare, far out | A tiny ship with a wide glowing funnel ahead of it dives into the bow shock, which flares where it passes | Poul Anderson, Tau Zero (1970): a ramjet that scoops gas with a magnetic funnel. Our own shape: a point with a glowing cone | S: `uShip` plus the bow shock's own colour | mid | Final pass |

### Fomalhaut

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The planet that vanished | Hold on the dust cloud inside the belt | Two specks meet there; a soft cloud of dust puffs out, grows and thins over 20 s, and is gone | "Fomalhaut b" looked like a planet in 2008, then faded: two icy bodies collided (Gáspár and Rieke, 2020) | S: the belt's dust cloud is already in `uRing`; animate its size and weight | low | A uniform |
| U · The eye | Hold on the star, far out, at night (visitor's clock after 22:00) | The off-centre belt and its bright star read as an eye. The belt narrows once, slowly, a blink, and the choir dips | The 2008 picture's nickname after a fantasy villain's eye. On screen: our belt only, no flame, no tower | S: the belt's ellipse is a uniform | mid: a blink must look like the belt, not a cartoon | Uniform |

### Arcturus

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The light that opened a fair | Hold | A faint beam leaves the star toward the eye. When it lands, the toy's own lights come on: the bar, the rail and the time clock light in a sweep from left to right, one by one, with a soft relay click each | 27 May 1933: Arcturus's light, thought to have left at the 1893 fair, was focused onto photocells to switch on the Chicago fair | S: CSS on the bar and the rail, one sound | low: it uses the toy's own interface | DOM only |
| R · The stream | Rare, far out | A loose stream of faint stars drifts across the far field, all moving one way | The Arcturus stream: stars that may come from a small galaxy the Milky Way swallowed | S: the starfield's layers already slide | low | Final pass |

### Rigel

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The witch's head | Far hold | To one side, a faint blue reflection nebula lights up, a long hooked cloud, lit only by Rigel | IC 2118, the Witch Head Nebula, shines by Rigel's light. Our own noise cloud | M: a cloud in the final pass (noise, the cool ramp) | mid: a nebula far out must stay faint | Final pass, only far out |
| R · A hidden family | Zoom out past x4 | Three faint companions show near Rigel | Rigel is a system of at least four stars | S: pips | low | Final pass |

## The giants

### Betelgeuse

Built: the Great Dimming.

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · Not yet | Hold three times in a row | A dry tick sounds, then ticks faster: neutrinos, hours before the light. The star swells and whites out, a supernova starting; at its peak, the frame freezes, rewinds fast, and Betelgeuse is as it was | A core collapse sends neutrinos hours before the light; detectors watch for it (SNEWS). Betelgeuse will explode within about 100,000 years | M: the exposure lift and a flare at full scale; a rewind of the same timeline | low: it is light, and the rewind is the joke | Short |
| ★ F · Off the shoulder of Orion | Far hold, sound on | Far out, near the star, small orange fires flicker and die; thin beams glitter in the dark beside them. Fine rain streaks run down the lens for 20 s | Blade Runner (1982): the dying replicant's speech of attack ships burning off Orion's shoulder, Betelgeuse. On screen: no ships, no words, no film music; distant light and rain | M: sparks and streaks in the final pass; the lens dirt term carries the rain | mid: must stay far and faint | Final pass, 20 s |
| U · Say it three times | Key: type the star's name three times | The star's limb bands darkly for a moment, stripes running round it, and a cheap organ chord plays, wrong for one bar | Beetlejuice (1988): say the name three times. Also: Hitchhiker's Zaphod is from here. On screen: no character, no title, only stripes | S: a stripe term in the existing `uDim` veil | high: stripes over a film-graded star can look cheap | One uniform |

### VY CMa

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · An outburst | Hold | A new arc of gas heaves off one side, swells and drifts out into the dust envelope, which dims behind it | Hubble shows arcs and knots that VY CMa threw off in separate outbursts (Humphreys) | S: the dust envelope's arcs are already in the disk pass; one arc's place and weight | low | Uniform |
| R · Water masers | Sound on; hold | Out of the rumble, a set of pure, steady tones at odd intervals rise and hold, like radio stations | Its envelope shines with water and SiO masers: natural radio lasers | S: `sound.js` | low | Audio only |

### Stephenson 2-18

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · Our solar system inside it | Full view; hold | Thin rings, one per planet's orbit, grow in over the disk at true scale: Mercury, Venus, the Earth, Mars and Jupiter all inside the star; Saturn's ring just outside the limb | At about 1,840 suns wide, its surface would reach close to Saturn's orbit | S: a 2D overlay as `sstars.js` | low: thin lines on the full view | 2D canvas, still |
| ★ U · Our Sun in transit | Hold on the long lens | A tiny white disc crosses the limb's face, as Mercury crosses our Sun: our Sun, a fleck | The mirror of the Mercury transit on our Sun. The scale is near true | S: the scale-body code that draws Mercury | low | One body |

### WOH G64

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The change | Hold | Over 12 s the star warms from amber to yellow, its dust thins, and the torus dims: a red supergiant becoming a yellow hypergiant | Since about 2014 WOH G64's light has changed toward a yellow hypergiant's (2024 to 2025 papers): a star seen changing class in our lifetime | S: the star's ramps lerp; the torus weight | low | Uniforms |
| R · Its galaxy | Far hold | Behind the far star, a soft smudge of the Large Magellanic Cloud fades in | It lies in the Large Magellanic Cloud, 160,000 light years away | S: a final-pass glow | low | Final pass |

### XX Trianguli

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The spot that spans | Hold on the big spot | Our Sun's disc, to scale, ghosts in over the spot: the spot is wider than the whole Sun | Doppler imaging (Strassmeier, 1999) found a spot on XX Trianguli many times the Sun's width, one of the largest known | S: a 2D circle at true scale | low | 2D, still |
| R · The spots move | Turn at ×100 for 20 s | The spots drift and change, as the star's real spot maps did over six years | Künstner et al. 2016 filmed its spots over six years | S: `uStarspot` | low | Uniform |

### Quasi-star

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The seed | Hold | The rifts widen, the envelope tears away in streamers and thins to nothing, and the black hole's shadow and disc stand bare where the star was. Then the toy fades back to the star | Theory: a quasi-star ends when its envelope blows away, and leaves a black hole of thousands of suns, a seed for the giant holes in galaxies | M: the cutaway (`core: 2`) at full strength; the rift width | mid: the end state must look like a real hole | Uniform; the disk pass already holds the core |
| U · The thing that breathes | Rare, night only | The heat through the rifts swells and ebbs once every 4 s, slower and deeper each time, three times | Uncanny: a star with a hole for a heart | S: the rift light | low | Uniform |

## Newborn and failed

### T Tauri

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The vanishing nebula | Far hold | A small fan-shaped nebula beside the star fades, then lights again 10 s later | Hind's Variable Nebula (NGC 1555) fades and returns as T Tauri's light changes | S: a final-pass glow | low | Final pass |
| R · A planet in the gap | Hold on the disk's gap | Dust in one gap gathers into a glowing knot that clears its lane as it orbits | ALMA's 2014 picture of HL Tauri: planets clear gaps in a young disk | S: the disk's gaps are uniforms | low | Uniform |
| R · A jet knot | Hold on a pole | A bright knot shoots out of the jet and opens into a small bow shock | Herbig-Haro objects | S: the jet knots exist | low | Uniform |

### Luhman 16

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The polar hexagon | Hold on a pole | The jet stream round the pole folds into a six-sided ring and holds | Saturn's north pole has a hexagon. Brown dwarfs have jet streams; the hexagon here is a guess, said so in the article | S: one term in the dwarf deck's pole storms | mid: a clean geometric form on soft clouds | Joins the dwarf version; Windows compile cost |
| F · The ocean thinks | Rare | The cloud bands slow, and for 10 s their patterns fall into slow symmetric shapes, mirrored left and right, before they churn back | Stanisław Lem, Solaris (1961): a living ocean that builds shapes. On screen: only the clouds, mirrored | S: a mirror of the noise coordinate | mid: a mirror seam must not show | One uniform |

### WISE 0855

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · Frost on the lens | Hold | Frost creeps in over the lens from the corners, fine feathered crystals catching the star's dim light, and melts back | WISE 0855 is about 250 K, freezer cold, with water ice clouds | S: the lens dirt term already sits in the final pass; one frost texture by noise | low | Final pass |
| ★ F · Something under the ice | Rare, night only | A large dark shape moves slowly under the cloud bands, against their flow, and sinks | John W. Campbell, "Who Goes There?" (1938), and its film: a thing found in the ice. On screen: no creature, only a shadow under the clouds | S: one dark term in the deck | low: uncanny by restraint | Uniform |

## Pairs and winds

### Beta Lyrae

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · A probe at L1 | Hold on the neck | A small glint parks at the neck, the L1 point, and holds there while the gas flows past | Space probes park at the Sun-Earth L1 point (SOHO). Here the point is where the gas leaves | S: one glint at the traced L1 point | low | Final pass |
| R · The slow years | Turn at ×100 for 30 s | The time clock jumps a century; the orbit widens a little and the stream thickens | The period grows by 19 s a year as mass moves across | S: the orbit's spacing | low | Uniform |

### VFTS 352

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The chirp | Hold | The pair spin faster and closer, merge into one, and a rising chirp sweeps up and stops. Then the rewind | The pair may end as two black holes that merge; LIGO heard such a merger on 14 September 2015 as a chirp from 35 to 250 Hz | M: the pair's spacing and turn (`uPair`); one chirp voice | low | Uniform; the march already holds |

### Epsilon Aurigae

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ F · The slab | Hold | The dark disc squares off: its edges go sharp and its proportions settle to 1 by 4. It stands centred on the star. The choir swells into a dense cluster chord and holds, then lets go | Arthur C. Clarke and Stanley Kubrick, 2001: A Space Odyssey (1968): a black slab of 1:4:9 that lines up with a sun. On screen: no film music; the choir's own cluster chord (the library has it) | S: `uDiscE` holds the slab's size; the edge softness | low: the slab is already there | Uniform |
| R · The hole in the middle | Hold, after the slab | Mid-eclipse, the star brightens a little through a thinner middle of the disc | 2009 to 2011: a brightening at mid-eclipse showed the disc thins at its middle | S | low | Uniform |

### WR 140

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ U · Play the record | Hold | The shells start to turn and a faint crackle plays, as if a needle rides the rings; the choir's melody plays a little slower, warped | JWST's 2022 picture of 17 nested shells, nicknamed a fingerprint. On screen: the shells as they are | S: `uShell`, one sound | low | Uniform |
| R · Periastron | Turn at ×100 | A new shell puffs out brighter than the rest, and the time clock marks the closest pass | A shell forms each 7.9-year orbit at closest approach | S | low | Uniform |

### WR 124

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| R · A knot ignites | Hold on the nebula | One knot of the nebula brightens, its tail streaming back | JWST's 2023 picture: dust knots round a dying star | S | low | Uniform |
| U · The runaway's wake | Far hold | Faint bow-shaped ripples show ahead of it as it ploughs through the gas at 200 km/s | It runs at about 200 km/s | S: `uBow` | low | Final pass |

### Thorne–Żytkow object

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ F · The heart under the floor | Hold, sound on | A dull heartbeat sounds under the choir, louder each time; the core's pulse beats with it, faster, until the cutaway opens wide on the neutron star, and both stop | Edgar Allan Poe, "The Tell-Tale Heart" (1843): a heart that beats under the floorboards. Here a dead star beats under a live one | S: the core pulse is a uniform; a thump voice | low | Uniform |
| R · The spectrum that gave it away | Key: I on the card | A barcode of spectral lines wipes in beside the card; three lines (rubidium, lithium, molybdenum) burn brighter | HV 2112 (2014) was claimed by strange lines of these metals; a 2018 study recast it | S: DOM in the card | low | DOM only |

## Dead stars

### Sirius B

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · Diamond | Hold | Fine facets glint over the surface, crystal faces turning with the star | Cooling white dwarfs crystallize; Gaia found the sign in 2019, and one white dwarf is nicknamed "Lucy", a diamond | M: a cell pattern in the disk pass with a sharp glint | mid: glints can look like noise | Joins the white dwarf version |
| U · A teaspoon | Hold three times | A tiny spoon silhouette falls to the star and stops dead; the card shows a row: about 5 tonnes | A teaspoon of white dwarf matter weighs several tonnes on Earth | S: `uShip` silhouette; a card row | high: a literal spoon can look cheap | Short |

### Pulsar (Vela)

Built: Vela's true voice.

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The map on the plaque | Far hold | Fourteen thin lines fan out from the far point, each with tick marks, one longer line to the side: the pulsar map that tells where Earth is | Pioneer 10 and 11 plaques (1972) and the Voyager records: our place marked by 14 pulsars, Vela among them. The map is NASA's, public domain; our own lines | S: a 2D overlay | low: thin lines on black | 2D, still |
| ★ R · A glitch | Rare; on a hold, 1 in 5 | Mid-spin, the pulsar jumps faster all at once; the choir catches its breath; the spin then eases back over 30 s | Vela glitches every 2 to 3 years; one in 2019 was seen live | S: `stepVoice` already sets the rate | low | Uniform |
| F · Little green men | Key: G | The beams turn faint green for one lap and the flash comes in a regular, too-regular beat | Jocelyn Bell's first pulsar, 1967, was logged "LGM-1" | S | mid: green on violet | Uniform |
| F · Stacked pulses | Hold, sound off | Vela's pulse, plotted, stacks line over line from the top in white on black | Harold Craft's 1970 plot of CP 1919, famous on a 1979 album cover. **Risk: it reads as that cover;** keep it as Vela's own pulse | S: 2D | high: brand look | 2D |

## Black holes

### Cygnus X-1

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · A probe at the horizon | Hold | A small probe falls in. It slows, reddens and dims as it nears the shadow, then freezes at its edge and fades, never seen to cross. A tone falls with it, lower and lower | General relativity: a far watcher sees anything that falls in slow and redden forever at the horizon. The doc's own plan says dropping a star in comes next | M: a sprite placed along the bent ray, weighted by the disc's `g` term | mid: the freeze must be slow and believable | One sprite |
| R · The bet | Key: I on the card | The card shows a row: "bet: 1974, lost 1990" | Hawking bet Thorne that Cygnus X-1 was not a black hole, and conceded in 1990 | S: a card row | low | DOM |

### Sagittarius A*

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · A hot spot | Hold | A bright spot races round the inner disc, near the shadow, once every few seconds, then fades | GRAVITY, 2018: flares from hot spots orbiting near the innermost stable orbit | S: one bright term in the disc light | low | Uniform |
| R · G2 survives | Rare, with the S stars shown | A small gas cloud swings past the hole, stretches, and comes out whole | G2, 2014: predicted to be torn apart, it survived; it hid a star | S: `sstars.js` already draws orbits | low | 2D |
| R · The bubbles | Far hold at x32 | Two vast faint lobes rise above and below the point, towering | The Fermi bubbles, found 2010, each 25,000 light years tall | M: final-pass glow | mid: must stay faint | Final pass |

### Pōwehi (M87*)

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The photo | Key: P, or hold | The frame blurs to the EHT's resolution, the ring orange and soft, a hot colour map. It holds 8 s and sharpens back | The 2019 picture, a blurred ring of light. Our own blur and colour map | S: a blur in the final pass (Black hole detail already runs an upscale) | low | Final pass |
| R · The ring turns | Turn: a year on the time clock | The ring's bright side swings about 30 degrees | The 2018 data, released 2024: the bright side had moved | S: the disc's Doppler angle | low | Uniform |

## Far and strange

### 3C 273

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The Moon's edge | Far hold, sound on | A dark curved limb sweeps in and covers the point; the radio hiss under the choir cuts out at that moment, then returns when the point comes out on the far side | 1962, Parkes: Cyril Hazard timed the Moon's edge passing over the source to pin it down | S: a dark disc in the final pass; one hiss voice | low | Final pass |
| R · Faster than light | Hold on the jet | The jet's knots run out, and a small row reads their speed: several times the speed of light. The article says it is an illusion | Superluminal motion in 3C 273's jet | S: the knots exist | low | Uniform |

### Earendel

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The caustic | Hold | The star brightens hugely as it nears the lens's critical curve, its two images merging, then fades as it moves off | Lensed stars brighten thousands of times as they cross a caustic | S: the lens's source position | low | Uniform |
| F · A light in dark places | Rare | The whole frame darkens, and only Earendel's pip keeps its light, warm, for 10 s | Earendel is Old English for the morning star; Tolkien's Eärendil carries a star whose light is given in a phial. On screen: no phial, only light | S: the exposure | low | Uniform |

### Mothra

| Egg | Trigger | See and hear | Source; how it stays original | Cost | Style risk | Perf |
|---|---|---|---|---|---|---|
| ★ R · The hidden millilens | Hold | A small glassy distortion shows near the pip, a dark clump bending light | Mothra's light is boosted by an unseen clump of 10,000 to a million suns | S: a second lens term in `lensScene` | low | Final pass |
| U · Wings | Rare | The lensed arc folds and opens once, slowly, mirrored, like wings | Mothra is named after the film moth. On screen: only the arc | S | mid | Final pass |

## The picked bodies, not built

Short eggs for each, to plan with the body.

| Body | Egg | Kind | Trigger | See and hear | Cost |
|---|---|---|---|---|---|
| Crab or Cassiopeia A | ★ The guest star of 1054 | R | Date: 4 July | The remnant shrinks back to a point that blazes, bright enough to see by day | M |
| Cassiopeia A | The star Flamsteed missed | R | Hold | A faint point flicks on, then the shell grows from it | S |
| Planetary nebula | A dying breath | R | Hold | The nebula's shell puffs out once, and the hot core flickers | S |
| Cepheid | ★ Leavitt's law | R | Tap a rhythm | The star pulses at the tempo you tap, and the choir follows | S |
| Polaris | The still point | R | Turn at real time | The starfield turns round Polaris, and it stays still | S |
| Mira | The tail | R | Far hold | Its 13 light-year tail of gas grows in behind it | M |
| R Leporis | ★ A drop of blood | U | Hold | The star's crimson bleeds down the lens in one slow drop | S |
| Magnetar SGR 1806-20 | ★ The 2004 flare | R | Hold | One flash blows out the toy's lights: the bar flickers and dims for a second | S |
| J1407b | Rings in eclipse | R | Hold | Ring shadows cross the star for 56 days, sped up | M |
| Gargantua (asked, no bean) | One hour, seven years | F | Hold | The time clock runs at one hour to seven years | S |

## Shortlist

The ten best across all bodies, ranked by delight for the cost.

| Rank | Egg | Body | Cost | Why |
|---|---|---|---|---|
| 1 | The pale blue dot | Sun | S | One pixel in a ray; moving and the toy's own light |
| 2 | The slab | Epsilon Aurigae | S | The disc is already a slab; one squaring and a chord |
| 3 | Primes | Vega | S | Contact is the best-known nod for Vega; pulses and notes only |
| 4 | A probe at the horizon | Cygnus X-1 | M | The plan's next step for holes; real and ominous |
| 5 | The Moon's edge | 3C 273 | S | A real moment with a sound that cuts |
| 6 | Not yet | Betelgeuse | M | A supernova that rewinds: daring and funny |
| 7 | Our Sun in transit | Stephenson 2-18 | S | The mirror of Mercury; scale in one shot |
| 8 | The superflare | Proxima | S | The toy's best effect, larger |
| 9 | The heart under the floor | Thorne–Żytkow | S | Uncanny, with Poe's heartbeat |
| 10 | The flicker | Proxima | S | Three-Body's countdown, in grain only |

## New shared tech

| Tech | For | Note |
|---|---|---|
| A 2D overlay for eggs | Orbits, the pulsar map, the spot scale | Generalize `sstars.js` |
| Key-sequence and date triggers | Several eggs | Small, in `main.js` |
| A chirp and tone voice in `sound.js` | VFTS 352, the amplifier, BLC1 | One voice each |
| Lens and DOM effects | Frost, rain, the bar's lights | Shared parts in `shared/` need their own bean and Tom's yes |
