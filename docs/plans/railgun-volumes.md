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
| **Storm lightning** | `stormBurst()`, `flashIn()`, `uFl` | Flashes light the Towers and the Giant from inside, after Window seat: bursts of one to five strokes every 6 to 22 s. Dev row Storm lightning. |

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
