# Railgun: names for the sky, the air and every volume

Status: in use (2026-11-16, bean `stimming-626s`).
One name per effect. Chats, beans, Dev rows and code comments use the name in **bold**.
Code handles stay as they are: five sessions share `railgun/index.html`, so a rename waits for a quiet day.

## Distance bands

Clouds, smoke and glows write no depth, so draw order decides what covers what.
`BAND` in `railgun/index.html` holds every draw order. Far bands draw first. A new effect takes its band's entry; never a bare number.

| Band | Distance from the eye | `BAND` entries | Holds |
|---|---|---|---|
| Sky | infinite | `sky` | Sky, Cirrus, Deck |
| Country | 80 to 200 km | `country` | The ranges (they write depth) |
| Deep | 100 to 300 km | `giants`, `deep` | Giants, then Towers |
| Far | 50 to 100 km | `far` | Mids past 48 km (`ROCK_FAR`), Dust domes past 70 km |
| Rock | 40 to 50 km | `domes`, `fireball`, `shards`, `smoke`, `debris`, `ribbons`, `glows` | Dust domes, Fireball, Soot cloud, shards, Smoke trail, Debris and Hulk trails, Companion trails, Bow shock and the rock glows |
| Mid | 5 to 40 km | `mids`, `heaps` | Mids within 48 km, Heaps |
| Near | 0 to 5 km | `plume`, `shell`, `shockRing`, `dust`, `ionPuffs`, `ion` | Muzzle flash, Muzzle smoke, Blast rings, Shot dust, Charge dust, Vent jets, Dust puffs, Ion line |
| Over all | any | `sparks`, `lights`, `specks` | Sparks, Arcs, the bolt, Case dust, flares, the laser, air specks |

Known mixes: `sparks` holds both the muzzle's sparks (near) and the rock's sparks (45 km); `lights` draws flares over every cloud. Each needs its own split to sort by distance.

## Families

| Family | What it holds | Technique |
|---|---|---|
| Sky | The dome and the layers painted on it | 2D, in the sky dome shader |
| Cards | Clouds drawn as camera-facing cards | `cloudLayer()` instanced cards |
| Air | Haze, aerial perspective, fog, light shafts | Per-pixel terms in every shader |
| Trails | Smoke behind things that fly | Raymarched cones or cheap ribbons |
| Volumes | Short-lived 3D bursts | `makeVol()` raymarched boxes (VOLFX) |
| Air shocks | Compressed air round the rock and the bolt | Shells, discs, ribbons |

## Sky

| Name | Height | Code | Notes |
|---|---|---|---|
| **Cirrus** | 9 km | `wisps()` | Long icy streaks on one wind line. Reacts to the blast. |
| **Deck** | 5.2 km | `deck()` in the sky dome | Broken cells that shrink to the horizon. Reacts to the blast. Dev row Cloud deck. |
| **Sky** | - | `k2skyB()`, `k2sky()` | Zenith, horizon, sun, moon, stars. |

## Cards

| Name | Code | Notes |
|---|---|---|
| **Heaps** | `HEAPS` | Cumulus, 8 to 38 km out. The far clusters float clear of the crests. |
| **Towers** | `TOWERS` | Three storm towers 105 to 150 km out, each its own build (girth, lean, anvil reach); about one in three has no anvil yet. |
| **Mids** | `MIDS` | Heaps 4 to 6 km up. Off while the Deck is on. |
| **Giants** | `GIANTS` | One colossal storm 225 km out, 95 km tall, always with an anvil. Dev row Giants. |
| **Storm volumes** | `STORM_FS`, `setStormProbe()` | On by default (Dev row Storm volumes; off shows the flat cards): the Towers and the Giant marched as Window seat's storm volumes inside their cards. Dev row Storm probe. Empty-space skipping; about 1.3 ms more GPU a frame on a phone. |
| **Storm lightning** | `stormBurst()`, `flashIn()`, `uFl` | Flashes light the Towers and the Giant from inside, after Window seat: rumbles of two to five spots (six to twelve when a cell boils over), each one to four strokes; a rumble every 6 to 22 s. Dev rows Storm lightning and Storm flash. |

## Air

| Name | Code | Notes |
|---|---|---|
| **Haze** | `k2haze()`, `uHaze` | Low dust on the plain, thins with height. |
| **Air** | `air()`, `uAir` | Rayleigh blue fade for clouds and far meshes. |
| **Far air** | inside `farPass` | Rayleigh and Mie along each ray to the ranges. |
| **Far haze** | `uLayer.x` | Far clouds sink into the haze, foot first. Dev row Far haze. |
| **Valley fog** | `uLayer.y` | Fog pools in the far valleys. Dev row Valley fog. |
| **Sun rays** | `shafts()`, `SHAFT_U` | Cloud and trail shadows in the low air. Dev row Sun rays. |

## Trails

| Name | Code | Notes |
|---|---|---|
| **Smoke trail** | `makeTrain()`, the trail section | The rock's main train, 160 km long. |
| **Companion trails** | `frags[].trail` (ribbon), `frags[].mini` | The up to sixteen companions that fall beside the rock. |
| **Debris trails** | `chunks` (chains of `makeMini()`) | Behind the biggest shards after the hit. |
| **Hail ribbons** | `hailRibs` | Behind the hail pieces that land on the horizon. |
| **Hulk trails** | `shipTrains` | The ship's broken hulks, with a ribbon on the prow and the tower. |

## Volumes

| Name | Code | When |
|---|---|---|
| **Charge dust** | `chargeDust` | The charge: dust drawn in, rings thrown out, devils at rage. |
| **Muzzle flash** | `plume` | The shot: white-blue fire for a fifth of a second, then grey. |
| **Muzzle smoke** | `muzzleSmoke` | The shot: the smoke that hangs after the flash. |
| **Blast rings** | `ringVols` | The shot: two follow-up rings of smoke. |
| **Shot dust** | `shotDust` | The shot: the skirt on the plain and the Mach wall. |
| **Vent jets** | `ventJets` | The breech vents: a ripple of side jets. |
| **Case dust** | `caseDustV` | The spent case lands. |
| **Fireball** | `fireball` | The hit: fireball, two shells, then the soot cloud. |
| **Soot cloud** | `fireball` late phase, `uSootS` | Hangs 20 s; shades the sky and the deck. |
| **Dust domes** | `domeVols` | Hulks and hail land. |
| **Dust puffs** | dust section | Billboards that lift off the plain. |

## Air shocks

| Name | Code | Notes |
|---|---|---|
| **Bow shock** | `bowMat`, `haloMat` | The glowing arc in front of the rock. |
| **Shock rings** | `makeRing()` | Thin discs of compressed air. |
| **Ion line** | `ionMat` | The bolt's path stays in the sky. |
| **Arcs** | `arcMat` | Lightning over the barrel during the charge. |

## Added since the first pass (2026-11-16, bean `stimming-z267`)

Tom asked for every volume and glow by name. These came in after the inventory frames were taken.

### Rock glows

| Name | Code | Notes |
|---|---|---|
| **Fire globe** | `rockFill()`, `uFill` | The nearing rock wraps the sky round it in fire: a hot core, an orange globe, a soft halo. From halfway down; full near the ground; each split swells it (`fillPopT`). |
| **Fire light** | `uFill` in `STORM_FS` and the card cloud shader | The globe lights the Storm volumes and the cards, warm, strongest toward the rock. |
| **Rock globe** | `rockGlobe` | A glow card round the rock in the strike. |
| **Bow halo** | `haloMat` | The wide glow ahead of the Bow shock. |
| **Hit flare** | `hitFlare`, `hitGlow` | The flash and glow at the hit. |
| **Ember pools** | `uPool` in the ground shader | Hot spots on the plain where Debris lands; they cool in about 20 s. |

### Far guns and distant events (the ambient section, session `railgun-ambient`)

| Name | Code | Notes |
|---|---|---|
| **Far rounds** | `kind: 'bolt'`, `farAt()`, `farBand()`, `FAR_WARM` | Other railguns fire from between the ranges and miss: the main shot's ribbon, Ion line and contrail puffs at lower detail, in their launch's distance band, lighting the clouds warm. Off unless `?dev` (Tom). |
| **Horizon war** | `kind: 'war'`, a free `IMP_U.uImp` slot | Flashes past the ranges on the horizon and the cloud bases; a late rumble. |
| **Late landings** | `kind: 'land'`, `ambFall` (a Meteor), `domeVols` | Chunks fall far out minutes after a kill: a streak, a flash, a Dust dome. |
| **Embers** | `kind: 'embers'`, `ambEmbers`, Dust puffs | Red points where pieces lie after a kill, each under a thread of smoke. |
| **Satellite** | `kind: 'sat'`, `ambSat` | A point of sunlight crossing a dark sky; dims behind the Smoke trail. |
| **Orbital flak** | `kind: 'flak'`, `ambFlak` | Pinprick pops in one patch of night sky. |
| **Rock shed** | `kind: 'shed'`, `ambShed`, `ambShedTail` | A hot lump peels off the falling rock. |
| **Meteor** | `makeMeteor()`, `meteor()` | The streak shape: a round hot head and a tapering, cooling tail. Shooting stars use it and are off (Tom). |

### Near the gun

| Name | Code | Notes |
|---|---|---|
| **Field motes** | `moteMat` | Dust that falls into orbit round the barrel during the charge. |
| **Contrail puffs** | `ionPuffs` | The puffs along the Ion line; Far rounds have their own. |
| **Lens dirt** | the grade pass | Smudges and specks that light up in bright bloom. |

### Gone, on Tom's word

Re-entry rain, the ambient dust devil, the air specks, and the ember sprays off the rock, its splits and its fragments.

### Corrections to the tables above

- **Giants**: the Supercell, 225 km out, in `STORMS` in `railgun/storms.js` (see below).
- **Hail ribbons** (`hailRibs`, the hail section) now run behind the pieces that land in front of and behind the ranges.

## Storms and the storm lab

`railgun/storms.js` holds the storm table (`STORMS`), the look knobs (`STORM_K`), the baked noise (`VOL_NOISE`), the shapes (`STORM_GLSL`) and the march (`STORM_MARCH`). The toy and `railgun/stormlab.html` (noindex) both import it, so the lab draws what the toy draws.

| Form | What it is |
|---|---|
| 1 Storm tower | A cumulonimbus; about two in three carry an anvil. |
| 2 Towering cumulus | Young, no anvil, a cauliflower crown. |
| 3 Squall line | Cells in a row across the wind, one long anvil, a shelf cloud at the foot. |
| 4 Dying storm | A thin, ragged column under a wide anvil that drifts on. |
| 5 Supercell | One fat banded column, a big overshoot, a broad anvil. |

Lightning inside the storms takes Window seat's `FLASH_C` (a cold, slightly violet blue-white) and is added after the air, so far flashes punch through the haze.

## Air controls (Dev, group Sky)

| Row | Uniform | What it does |
|---|---|---|
| **Air blue fade** | `uAirK.x`, `uAir` | Rayleigh: how fast far things turn blue and pale. |
| **Air dust** | `uAirK.y` | The dusty Mie haze: how thick the far air is. |
| **Air dust height** | `uAirK.z` | How deep the dust stands, in metres; low dust leaves tall things clear. |
| **Air sun glow** | `uAirK.w` | The dust's warm glow toward the sun. |
| **Near dust** | `uHaze` | The plain's own low dust, thick near the ground. |
| **Near dust height** | `uHazeH` | How high that low dust reaches. |
| **Cloud far fade** | `uLayer.x` | Far clouds sink further into the air, foot first. |
| **Valley fog** | `uLayer.y` | Fog pools in the far valleys. |
| **Sun rays** | `shaftGain` | Cloud and trail shadows in the low air. |

`aerialFrom()`, `aerialT()`, `aerialIn()`, `cirrusAir()` and the ambient section's `ambT()` all read `uAirK`, so one knob moves every far thing at once.

## Ray-marched clouds: the names

Only one family of sky cloud is ray-marched: the **Storm volumes** (`STORM_FS`, `railgun/storms.js`). Every other sky cloud is painted flat (Deck, Cirrus) or drawn on a card (Heaps, Mids).

| Name | Form | Where today |
|---|---|---|
| **Storm tower** | 1 | Right of the gun, 85 km |
| **Towering cumulus** | 2 | Right of centre, 135 km |
| **Squall line** | 3 | Behind the gun, 95 km, the long anvil |
| **Dying storm** | 4 | Not placed; the lab can add one |
| **Supercell** (the Giant) | 5 | Left, 200 km |

Other ray-marched volumes are not sky clouds: the **Smoke trail** and **Debris trails** (trains), and the blast volumes (**Fireball**, **Muzzle flash**, **Shot dust**, **Charge dust**).

Storm look knobs: Billows, Ragged, Anvil reach, Density (`STORM_K`) and **Storm softness** (`STORM_SOFT`, Dev row and lab).
