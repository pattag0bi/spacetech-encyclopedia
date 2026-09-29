# Space Technology — A First-Principles Encyclopedia

A visual, first-principles value-chain encyclopedia of space technology, built from the
[Wikipedia "Space technology"](https://en.wikipedia.org/wiki/Space_technology) article outward.

The centerpiece is the **engine atlas**: an interactive collection of every major rocket-propulsion
family, each with an animated schematic, a step-by-step walkthrough, a physics lab with real
(simplified) equations you can play with, and real-hardware presets checked against published
performance figures.

## Families covered

- **Liquid cycles** — 9 turbopump-feed cycles (gas generator, staged combustion, expander, etc.)
- **Solid & hybrid** — grain-burn simulation with selectable cross-sections
- **Small thrusters** — cold gas, monopropellant, bipropellant RCS
- **Nozzles** — bell, extendable, dual-bell, aerospike, expansion–deflection
- **Electric propulsion** — resistojet, arcjet, ion, Hall, MPD, VASIMR, PPT, electrospray
- **Nuclear** — solid-core and gas-core NTR, nuclear-electric, Orion
- **Air-breathing & frontier** — ramjet, scramjet, SABRE, rotating detonation, solar thermal, solar sail, fusion

## Running locally

This is a static site — no build step, no dependencies.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. (Opening `index.html` directly via `file://` will not load the
`atlas/*.js` scripts in most browsers due to CORS restrictions on local scripts — use a local
server instead.)

## File layout

```
index.html            The encyclopedia page and the atlas's mount point
atlas/engines.js       Data for the 9 liquid-propellant cycles
atlas/engines-more.js  Data for the other six families (29 engines)
atlas/atlas.js         Shared physics/drawing library, the liquid-cycle model, and the generic UI
atlas/models.js        Physics models + schematics for every non-liquid family
atlas/atlas.css        Styles for the atlas
```

Load order matters: `engines.js`, `engines-more.js`, `atlas.js`, `models.js`.
