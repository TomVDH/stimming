---
# stimming-gj2i
title: 'Doodle Hunt: what real silicon chip art looks like'
status: completed
type: spike
created_at: 2026-11-27T07:39:55Z
updated_at: 2026-11-27T07:39:55Z
---

Research for the realistic redo of Doodle Hunt (the Kimi build is parked as doodlehunt-kimi). Sources: Silicon Zoo (micro.magnet.fsu.edu/creatures), IEEE Spectrum The Secret Art of Chip Graffiti, NPR 2024 on the Qualcomm Q1650 doodles.

Findings:
- Doodles are photolithographed metal shapes, usually first metal, flat polygonal line art; a few use two layers for a 3D effect (HP leopard: outline in metal 1, spots in the contact layer).
- They sit in unused space: the pad ring, gaps between cache and buses, corners, next to mask credits. Sizes tens of microns to about 1.5 mm on dies of roughly a centimetre.
- Subjects: animals (cheetah, owls, buffalo, snakes as adder puns), vehicles (Wright biplane, Concorde, Lunar Lander, trains), cartoon characters, license plates with the chip revision, initials.
- Discovery is real: Davidson found Waldo scanning a MIPS R4000 at 25-100X, resolving it at 600X; Chipworks finds art on 1 in 10 chips.
- Die-photo look: rainbow thin-film interference per layer, tungsten-halogen optical microscopy, regular SRAM fabric vs looser standard-cell logic, bond pads and seal ring at the edge.

Design consequences recorded in chat 2026-11-26: die must read as a real optical die photo (pad ring, block floorplan, bus channels, seal ring); doodles flat single-metal line art at true scale, nearly invisible zoomed out; the hunt is zoom-driven like the real one.

- [x] Web research
- [x] Report to Tom
