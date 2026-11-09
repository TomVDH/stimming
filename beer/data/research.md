# Belgian beer catalogue (25 beers)

Data: `beer-catalogue.json` (same folder). Each entry lists its guessed fields in `est`. EBC values are estimates except where noted; no brewery publishes EBC for most of these. `srm` = EBC / 1.97. Kriek hexes are hand-picked reds because SRM cannot show red.

| Beer | Style | ABV | EBC | Glass | Bottle |
|---|---|---|---|---|---|
| Duvel | Strong golden | 8.5 | 7 | Tulip, etched D | Duvel round-belly 33cl, brown |
| Omer Traditional Blond | Strong blond | 8.0 | 10 | Goblet | Belgian 33cl, brown |
| Averbode | Blond abbey, dry-hopped | 7.5 | 11 | Chalice | Belgian 33cl / 75cl cork |
| La Chouffe | Blond, spiced | 8.0 | 13 | Goblet (17 cm) | Belgian 33cl; 75cl red hood |
| Kriek Boon | Kriek | 4.0 | 35 | Tall slim stemmed (20.5 cm) | 25cl stubby |
| Lindemans Kriek | Sweet kriek | 3.5 | 30 | Lambic flute | 37.5cl mini champagne, red foil |
| Oude Geuze Boon | Oude gueuze | 7.0 | 14 | Heavy-based tumbler | 37.5cl / 75cl cork-cage |
| Westmalle Tripel | Tripel | 9.5 | 12 | Chalice | Trappist squat, yellow diamond |
| Westmalle Dubbel | Dubbel | 7.0 | 60 | Chalice | Trappist squat, purple diamond |
| Chimay Blue | Dark strong | 9.0 | 70 | Chalice, silver rim (14.9 cm) | Trappist squat, blue cap |
| Orval | Trappist pale + Brett | 6.2 | 18 | Wide chalice | Skittle, lilac diamond |
| Rochefort 10 | Quad | 11.3 | 90 | Chalice (16 x 9.6 cm) | Trappist squat, blue |
| Westvleteren 12 | Quad | 10.2 | 70 | Chalice | Trappist squat, yellow cap, cap-like label |
| Tripel Karmeliet | Tripel, 3 grains | 8.4 | 14 | Domed tulip, frosted fleur-de-lis | Belgian 33cl |
| Pauwel Kwak | Strong amber | 8.4 | 32 | Coachman + wooden stand (24.5 cm) | Belgian 33cl |
| Delirium Tremens | Strong golden | 8.5 | 10 | Stemmed tulip, elephant band (21 cm) | Matte painted white, blue foil |
| Hoegaarden | Witbier | 4.9 | 6 | Hexagonal heavy tumbler (12.7 cm) | Steinie |
| Leffe Blonde | Blond abbey | 6.6 | 14 | Chalice, gold rim, abbey relief | Belgian 33cl |
| Rodenbach Grand Cru | Flanders red | 6.0 | 45 | Tall tapered cup (21.6 cm, 44 cl brim) | Steinie |
| Gulden Draak | Dark strong | 10.5 | 55 | Goblet, rock foot, engraved dragon | Painted white 33cl |
| St. Bernardus Abt 12 | Quad | 10.0 | 75 | Round chalice, high stem | Belgian 33cl |
| Brugse Zot Blond | Blond | 6.0 | 11 | Flute-like goblet | Belgian 33cl |
| Gouden Carolus Classic | Dark strong | 8.5 | 70 | Tall stemmed tulip (23.5 cm) | Belgian 33cl |
| Straffe Hendrik Tripel | Tripel | 9.0 | 16 | Goblet | Belgian 33cl |
| Stella Artois | Pale lager | 5.2 | 7 | Chalice, gold rim | Green longneck |

## Details that matter for the render

1. **Nucleation marks make bubble columns.** Duvel has an etched D in the bowl base. Gulden Draak has an engraved dragon. Each one feeds a single steady stream of bubbles up the centre. Glasses without a mark should only show stray bubbles from the walls.
2. **Kwak glass.** The bottom is a round bulb that cannot stand. Above it is a narrow waist (~35 mm), then a long trumpet that flares to an ~84 mm rim; the glass is 245 mm tall. A wooden stand holds it: a base with a hollow for the bulb and an upright handle that clips the waist. When the bulb empties at the end, the beer gushes out (the "kwak").
3. **Orval bottle and glass.** The bottle is a dark amber skittle: widest low on the body, then a long taper with no shoulder. It has a small lilac diamond label with white outlined "ORVAL" letters, a silver-grey cap and "ORVAL" embossed near the base. The chalice is very wide and open. The head is huge and ivory.
4. **Painted bottles.** Delirium is sprayed matte off-white to look like stoneware, with an electric-blue foil label and neck (pink elephants, green crocodiles). Gulden Draak is solid white with a gold dragon. Render both as opaque with no liquid visible.
5. **Liquid and foam contrasts.** Hoegaarden is opaque milky straw. Swirling the last third clouds the glass, and the heavy hexagonal tumbler bends the light at its facets. The krieks have pink foam that collapses fast. Rodenbach's beige head is thin and dies in under a minute. Duvel, Orval and La Chouffe build towering heads.
6. **Glass decorations.** Karmeliet has a frosted fleur-de-lis band. Delirium has a frosted ring of small elephants at the 33cl line and a skewed, notched stem. Leffe has a 3D abbey relief where the cup meets the stem. Chimay has a silver rim; Stella and Leffe have gold rims.
7. **Westmalle labels.** Both are diamond labels with a red AW roundel. The Tripel's is yellow and the Dubbel's is dark purple. Westvleteren still uses cap-colour coding (12 = yellow). Since 2022 its label copies the cap.

Pour rituals that change the animation:
- **Duvel:** start at 45 deg and straighten at half. The foam line lands mid-D. Leave about 1 cm.
- **Hoegaarden:** pour two thirds, swirl the bottle, top off.
- **Gueuze:** pour from a horizontal basket.
- **Stella:** nine steps, including skimming the head with a knife to two fingers.
- **Westvleteren:** one motion, leave the yeast.

## Data gaps

1. **EBC and CO2.** Almost none are published. All EBC values except Gouden Carolus (a homebrew-clone figure) are estimates from descriptions, and all CO2 volumes and head half-lives are estimates.
2. **Bottle dimensions.** None are brand-specific. I used generic archetypes: steinie 174x70, longneck 226x60 (Univerre), and trappist/Belgian 33cl around 200-210 x 64-66. Duvel is 178x69, taken from retail pack size. Orval's skittle size (245 mm) is a guess from a photo. Several cap colours are unconfirmed.
3. **Glass dimensions.**
   - Measured, height only or partial: Duvel, Chimay, Rochefort, Kwak, Rodenbach, Gouden Carolus, Delirium, Hoegaarden 25cl, Boon Kriek, Chouffe.
   - Marketplace listings: Leffe and Westmalle.
   - Fully estimated: Orval, Westvleteren, Gulden Draak, St. Bernardus, Brugse Zot, Straffe Hendrik, Stella, Omer, Averbode, Lindemans, Boon Geuze.
   - No source gives foot diameter, stem height or base thickness.
4. **Label looks.** Orval and Westmalle Dubbel were read from importer tech-sheet photos. Westmalle Tripel's yellow label is confirmed by Wikipedia. The rest come from memory and need checking against real photos before the real art arrives. This applies most to Averbode, Omer, Straffe Hendrik, Kwak and Hoegaarden, including whether Hoegaarden's bottle glass is brown or clear.
5. **Source links.** Barshopen, Rike, the brewery pages and the regalwine PDFs were opened. The Wikipedia brewery links and the boon.be and lindemans.be home pages were not opened.
