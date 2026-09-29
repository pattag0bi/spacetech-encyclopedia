/* Engine atlas \u2014 every family beyond the liquid cycles. Pure data: the physics lives in models.js.
   Each engine: id, name, short, level, model, kind, idea, intro, glance [[label, value]], steps [{t, b, hl}],
   pros, cons, used, examples [{name, veh, tag, stats, note, map:{F (N), isp (s), hol, air}, set, pub, approx}]. */
(function () {
  'use strict';
  var A = window.ATLAS = window.ATLAS || {};
  A.fluids = A.fluids || {};
  A.fluids.xe = 'Propellant gas';
  A.fluids.e = 'Electrons';
  A.fluids.air = 'Air';
  A.fluids.plasma = 'Fusion fuel';

  A.moreFamilies = [
    /* ================================================================ SOLID & HYBRID */
    {
      id: 'solid', name: 'Solid & hybrid', kicker: 'Solid-propellant motor', color: 'var(--gold)',
      blurb: 'Cast the propellant into the case and light it. No pumps, no valves \u2014 and, for a pure solid, no way to stop.',
      engines: [
        {
          id: 'solid', name: 'Solid rocket motor', short: 'Solid motor', level: 1, model: 'solid', grain: 'star',
          idea: 'Fuel and oxidiser mixed into one rubbery solid, cast inside the case. Once it\u2019s lit, it burns until it\u2019s gone.',
          intro: 'A solid rocket motor is a firework grown up. Powdered aluminium (the fuel) and ammonium perchlorate (the oxidiser) are stirred into liquid rubber, poured into the motor case around a shaped core, and left to cure into something with the feel of a pencil eraser. There are no pumps, no valves, no plumbing \u2014 you can store one for twenty years and it will fire the day you need it. Here\u2019s the catch: once lit, you can\u2019t throttle it or turn it off. Every decision about how it will burn \u2014 how hard, and for how long \u2014 is frozen into the shape of the hole you cast down its middle.',
          glance: [['Propellant', 'Aluminium + ammonium perchlorate in rubber'], ['Control after ignition', 'None \u2014 it burns to completion'], ['Typical chamber pressure', '40\u2013100 bar'], ['Typical Isp', '240\u2013300 s'], ['Main virtue', 'Enormous thrust, stored for decades']],
          labIntro: 'Pick a grain shape, then press Fire and watch it burn back layer by layer. Every number comes from the burning-area \u2192 pressure \u2192 burn-rate loop, computed live.',
          stageNote: 'Schematic, not to scale. The circle at the bottom left is a slice through the grain, computed from the burning surface as it recedes.',
          steps: [
            { t: 'The big picture', b: 'A steel or carbon-fibre tube packed with propellant, an igniter at one end and a nozzle at the other. That\u2019s all of it. Press Next to follow the burn.', hl: [] },
            { t: 'A case that is the combustion chamber', b: 'In a liquid engine the chamber is a small, hot box. In a solid motor the whole case is the chamber: the fire fills the full length of it. That\u2019s why the case must be a pressure vessel strong enough to hold 50 or more atmospheres \u2014 the size of a building.', hl: ['case'] },
            { t: 'The propellant grain', b: 'The solid propellant is called the grain. It\u2019s bonded to the case wall, and it also insulates the wall: the fire burns from the inside out, so the case stays cool until the very end.', hl: ['grain', 'inset'] },
            { t: 'Light it', b: 'The igniter \u2014 itself a tiny rocket motor \u2014 blasts hot gas down the central hole. In a fraction of a second the entire exposed surface is burning. There is no going back.', hl: ['ign', 'port'] },
            { t: 'Pressure makes it burn faster', b: 'Here is the heart of it. The burning surface makes gas; the gas can only escape through the throat, so pressure builds. And higher pressure pushes the flame harder into the propellant, making it burn faster. The motor settles where gas made equals gas escaping. Try the throat slider.', hl: ['port', 'throat'] },
            { t: 'The shape sets the thrust', b: 'The propellant burns back perpendicular to its surface, like an ice sculpture melting evenly everywhere. A plain round hole gets bigger as it burns, so burning area and thrust rise. A star-shaped hole loses its points as it gains its circumference \u2014 nearly constant thrust. Switch shapes and press Fire.', hl: ['grain', 'inset'] },
            { t: 'Out through the nozzle', b: 'The same nozzle physics as any rocket: squeeze the gas through a throat, let it expand in the bell. Solid motors have one quirk \u2014 molten droplets of aluminium oxide in the exhaust, which lag behind the gas and cost a few percent of performance.', hl: ['nozzle', 'plume'] }
          ],
          pros: ['Huge thrust from a simple, compact package', 'Stored ready to fire for years \u2014 the reason missiles use them', 'No pumps, valves or cryogenics to fail'],
          cons: ['Cannot be shut down or throttled once lit (only pre-programmed by grain shape)', 'Lower Isp than good liquid engines', 'A crack in the grain means more burning area, higher pressure \u2014 and possibly a burst case'],
          used: 'Strap-on boosters (Space Shuttle, Ariane 5 and 6, Atlas V, SLS), upper stages and kick motors, missiles, and every model rocket.',
          examples: [
            { name: 'Space Shuttle SRB', veh: 'Space Shuttle (1981\u20132011)', tag: 'PBAN / AP / Al', stats: ['12.5 MN at liftoff \u00B7 Isp 242 s (sea level), 268 s (vacuum)', 'Burn 124 s \u00B7 500 t of propellant each'], note: 'Its forward segment used an 11-point star; the aft segments were plain tapered tubes. Thrust was deliberately cut by about a third around 50 seconds in, to ease the aerodynamic load \u2014 all built into the grain.', map: { F: 12.5e6, isp: 242, hol: true } },
            { name: 'SLS five-segment booster', veh: 'Space Launch System', tag: 'PBAN / AP / Al', stats: ['About 16 MN peak \u00B7 Isp about 269 s (vacuum)', 'Burn about 126 s'], note: 'A stretched Shuttle booster \u2014 one extra segment and a new grain design.', map: { F: 16e6, isp: 250, hol: true }, approx: true },
            { name: 'P120C', veh: 'Ariane 6 strap-on \u00B7 Vega C first stage', tag: 'HTPB / AP / Al', stats: ['About 4.5 MN (vacuum) \u00B7 Isp 278.5 s', 'Carbon-fibre case, 142 t of propellant'], map: { F: 4.5e6, isp: 278.5 } },
            { name: 'Star 48B', veh: 'PAM-D kick stage; New Horizons\u2019 third stage', tag: 'HTPB / AP / Al', stats: ['About 68 kN \u00B7 Isp about 286 s (vacuum)', 'Burn about 85 s'], note: 'The kick motor that threw New Horizons onto its path to Pluto at a record launch speed.', map: { F: 68e3, isp: 286 }, approx: true }
          ]
        },
        {
          id: 'hybrid', name: 'Hybrid rocket', short: 'Hybrid', level: 2, model: 'hybrid',
          idea: 'Solid fuel, liquid oxidiser. Shut the valve and the fire goes out.',
          intro: 'Split the two ingredients of a solid motor and keep one of them liquid, and you get a hybrid. The fuel \u2014 rubber, plastic or wax \u2014 is cast in the case with a hole down the middle. The oxidiser \u2014 nitrous oxide or liquid oxygen \u2014 sits in a separate tank. Nothing burns until you open the valve and spray oxidiser down the hole. That buys you back what a solid gives up: you can throttle it, shut it down and even restart it, and a crack in the fuel is harmless because the fuel can\u2019t burn by itself. The price is a stubborn problem you can watch in the lab: the mixture ratio drifts as the hole widens.',
          glance: [['Fuel', 'Solid: HTPB rubber or paraffin wax'], ['Oxidiser', 'Liquid: nitrous oxide or LOX'], ['Control', 'Throttle, shut down, restart'], ['Typical Isp', '230\u2013300 s'], ['Main headache', 'Slow burning fuel; mixture drifts']],
          labIntro: 'Choose the oxidiser and fuel, then press Fire. Watch the port widen \u2014 and the mixture ratio drift \u2014 as the burn goes on.',
          steps: [
            { t: 'The big picture', b: 'A tank of liquid oxidiser, a valve, and a case of solid fuel with a hole down it. The two only meet in the hole. Press Next.', hl: [] },
            { t: 'Liquid oxidiser', b: 'Nitrous oxide is popular for a neat reason: at room temperature it sits in its tank at about 50 bar, so it pushes itself out. No pumps, no pressurant.', hl: ['otank', 'p-ox'] },
            { t: 'The valve is the throttle', b: 'Open it and oxidiser sprays into the fuel port. Close it and the fire starves. That single valve gives a hybrid what a solid motor can never have: an off switch.', hl: ['valve', 'inj'] },
            { t: 'A flame hovering over the fuel', b: 'The fuel can\u2019t burn on its own. Heat from a flame sitting in the flow just above the surface vaporises it, and the vapour burns where it meets oxidiser. So the fuel burns only as fast as heat reaches it \u2014 typically a millimetre or two per second, far slower than a solid.', hl: ['grain', 'port', 'oxflow'] },
            { t: 'The drift', b: 'As the port widens, the same flow of oxidiser moves more slowly through a bigger hole, so the fuel burns more slowly \u2014 but over a larger surface. The two effects don\u2019t cancel, and the mixture ratio wanders through the burn. Watch the lower chart.', hl: ['port', 'insetd'] },
            { t: 'Mix, then expand', b: 'A mixing chamber after the fuel grain gives the last unburned vapour a chance to meet the oxidiser, then the gas leaves through an ordinary nozzle.', hl: ['post', 'nozzle', 'plume'] }
          ],
          pros: ['Can be throttled, shut down and restarted', 'Very safe: fuel and oxidiser are stored apart, and a cracked grain can\u2019t run away', 'Cheap, benign propellants (rubber, wax, nitrous oxide)'],
          cons: ['Fuel burns slowly, so big motors need long grains or many ports', 'Mixture ratio drifts during the burn, costing performance', 'Leftover fuel sliver is dead weight'],
          used: 'Suborbital spaceplanes, sounding rockets, student rockets and a few small-launcher projects.',
          examples: [
            { name: 'SpaceShipOne motor', veh: 'SpaceShipOne (2004 X-Prize flights)', tag: 'N\u2082O / HTPB', stats: ['About 74 kN \u00B7 Isp about 250 s', 'Burn about 80 s'], note: 'The first private crewed spaceflights rode on a hybrid, chosen largely because it could be shut down safely.', map: { F: 74e3, isp: 250 }, approx: true },
            { name: 'RocketMotorTwo', veh: 'Virgin Galactic SpaceShipTwo', tag: 'N\u2082O / plastic', stats: ['Tens of kilonewtons, burn about 60 s'], note: 'Started on HTPB rubber and switched to a polyamide plastic fuel in 2014.' },
            { name: 'Paraffin hybrids', veh: 'HyImpulse and others', tag: 'LOX / paraffin', stats: ['Wax burns about 3\u00D7 faster than rubber'], note: 'Molten wax forms a thin liquid layer that sheds droplets into the flow \u2014 a trick discovered at Stanford that fixes the hybrid\u2019s slow-burn problem.' }
          ]
        }
      ],
      compare: { title: 'Solid versus hybrid', first: 'Motor', cols: ['Fuel', 'Oxidiser', 'Can you stop it?', 'Typical Isp', 'Flown on'],
        rows: [{ id: 'solid', cells: ['Aluminium in rubber', 'Ammonium perchlorate, mixed in', 'No', '240\u2013300 s', 'Shuttle, SLS, Ariane, missiles'] },
          { id: 'hybrid', cells: ['Rubber, plastic or wax', 'N\u2082O or LOX, separate tank', 'Yes', '230\u2013300 s', 'SpaceShipOne, sounding rockets'] }] }
    },

    /* ================================================================ SMALL THRUSTERS */
    {
      id: 'small', name: 'Small thrusters', kicker: 'Spacecraft thruster', color: 'var(--ink2)',
      blurb: 'The thrusters that point, nudge and dock spacecraft \u2014 from puffs of cold gas to hypergolic engines the size of a coffee cup.',
      engines: [
        {
          id: 'coldgas', name: 'Cold-gas thruster', short: 'Cold gas', level: 1, model: 'thruster', kind: 'coldgas',
          idea: 'Open a valve on a bottle of compressed gas. That\u2019s it \u2014 no fire at all.',
          intro: 'The simplest rocket there is: a tank of compressed nitrogen, a regulator, a valve and a tiny nozzle. Open the valve, gas rushes out, the spacecraft moves the other way. No combustion, so nothing hot, nothing toxic, nothing that can explode. The catch is that the only energy available is the gas\u2019s own warmth at room temperature \u2014 and that caps the exhaust speed at about the speed of sound in the gas. Isp around 70 seconds for nitrogen. Terrible for going anywhere; perfect for tiny, precise, clean nudges.',
          glance: [['Energy source', 'Stored pressure only'], ['Typical propellant', 'Nitrogen, sometimes helium or krypton'], ['Thrust', 'Micronewtons to ~10 N'], ['Isp', '60\u2013180 s'], ['Main virtue', 'Simple, clean, precise']],
          steps: [
            { t: 'The big picture', b: 'A bottle, a regulator, a valve and a nozzle. Press Next.', hl: [] },
            { t: 'Compressed gas', b: 'The tank holds gas at around 300 atmospheres. All the energy the thruster will ever have is stored in that squeeze.', hl: ['tank'] },
            { t: 'The regulator', b: 'Tank pressure falls as the gas is used. The regulator steps it down to a steady, low pressure so every pulse gives the same push.', hl: ['reg', 'p-hp'] },
            { t: 'A fast valve', b: 'A solenoid valve snaps open for milliseconds at a time. Tiny, repeatable pulses are what attitude control needs.', hl: ['valve', 'p-lp'] },
            { t: 'Cold expansion', b: 'The gas expands through the nozzle and cools dramatically \u2014 often to well below freezing. Swap nitrogen for helium in the lab: same temperature, lighter molecules, much faster exhaust.', hl: ['chamber', 'nozzle', 'plume'] }
          ],
          pros: ['Simplest possible rocket \u2014 very reliable', 'Clean, cold, non-toxic exhaust: safe near astronauts and optics', 'Extremely fine, repeatable impulse'],
          cons: ['Very low Isp (\u224870 s for nitrogen)', 'Heavy high-pressure tanks for the propellant carried', 'Tiny total impulse'],
          used: 'Astronaut jetpacks, precision pointing of science spacecraft, CubeSats, and the separation pushes on launch vehicles.',
          examples: [
            { name: 'Manned Maneuvering Unit', veh: 'Space Shuttle spacewalks (1984)', tag: 'Nitrogen', stats: ['24 thrusters of about 7.6 N', 'Isp about 65 s'], note: 'Bruce McCandless flew it 100 m from the Shuttle with no tether.', map: { F: 7.6, isp: 65 }, approx: true },
            { name: 'Gaia micro-propulsion', veh: 'ESA Gaia', tag: 'Nitrogen', stats: ['About 1\u2013500 \u00B5N per thruster', 'Held the spacecraft steady to microarcseconds'], note: 'Isp is about as low as nitrogen gets \u2014 what mattered was smoothness, not efficiency.', map: { F: 1e-4, isp: 60 }, approx: true }
          ]
        },
        {
          id: 'monoprop', name: 'Monopropellant thruster', short: 'Monoprop', level: 2, model: 'thruster', kind: 'monoprop',
          idea: 'One liquid that falls apart into hot gas the moment it touches a catalyst.',
          intro: 'Hydrazine is an unstable molecule \u2014 N\u2082H\u2084 \u2014 that wants to fall apart. Drip it onto a bed of iridium-coated pellets and it does, violently, into hot ammonia, nitrogen and hydrogen at over 1,000 \u00B0C. No oxidiser, no igniter, no mixing: one tank, one valve, one catalyst bed. Isp is about three times that of cold gas, and the thruster can fire hundreds of thousands of pulses. The catch: hydrazine is highly toxic and suspected to cause cancer, so fuelling a satellite means technicians in full protective suits.',
          glance: [['Propellant', 'Hydrazine (N\u2082H\u2084)'], ['Ignition', 'Catalyst bed \u2014 no oxidiser, no spark'], ['Thrust', '0.5 N to a few kN'], ['Isp', '220\u2013235 s'], ['Main virtue', 'Simple, reliable, restartable']],
          steps: [
            { t: 'The big picture', b: 'One propellant tank, one valve, a bed of catalyst and a nozzle. Press Next.', hl: [] },
            { t: 'A single tank', b: 'Helium or nitrogen pushes the hydrazine out through a rubber diaphragm, so it flows even in weightlessness.', hl: ['tank', 'he', 'p-he', 'p-feed'] },
            { t: 'The catalyst bed', b: 'Pellets of alumina coated with iridium. The moment hydrazine touches them, it breaks into ammonia and nitrogen, releasing heat. Pre-warming the bed makes each start smoother.', hl: ['bed', 'valve'] },
            { t: 'A second break-up', b: 'Some of the ammonia breaks up again into nitrogen and hydrogen. That makes the gas lighter \u2014 good \u2014 but absorbs heat \u2014 bad. Drag the dissociation slider to see which wins.', hl: ['bed', 'p-cat'] },
            { t: 'Out through the nozzle', b: 'Gas at about 1,200 K expands through a small, long nozzle.', hl: ['chamber', 'nozzle', 'plume'] }
          ],
          pros: ['One propellant, one valve: very simple and reliable', 'Instant, repeatable pulses; hundreds of thousands of restarts', 'Storable for years at room temperature'],
          cons: ['Hydrazine is very toxic', 'Isp only about 230 s', 'Catalyst slowly degrades; cold starts wear it faster'],
          used: 'Satellite attitude control and station-keeping, planetary landers, and the Curiosity and Perseverance sky cranes.',
          examples: [
            { name: 'MR-103', veh: 'Voyager, New Horizons and many others', tag: 'Hydrazine', stats: ['About 1 N \u00B7 Isp about 220 s'], note: 'Voyager\u2019s tiny thrusters are still firing, nearly half a century after launch.', map: { F: 1, isp: 220 }, approx: true },
            { name: 'MR-106', veh: 'Satellites and landers', tag: 'Hydrazine', stats: ['About 22 N \u00B7 Isp about 235 s'], map: { F: 22, isp: 235 }, approx: true },
            { name: 'MR-80 descent engine', veh: 'Viking landers; Mars sky cranes', tag: 'Hydrazine', stats: ['About 3 kN, deep throttling \u00B7 Isp about 225 s'], note: 'Eight of them lowered Curiosity and Perseverance onto Mars.', map: { F: 3100, isp: 225 }, approx: true }
          ]
        },
        {
          id: 'biprop', name: 'Bipropellant thruster', short: 'Biprop RCS', level: 3, model: 'thruster', kind: 'biprop',
          idea: 'Fuel and oxidiser that ignite on contact, fired in bursts of a few milliseconds.',
          intro: 'Put the pressure-fed hypergolic engine from the liquid family on a diet and you get the thrusters that steer Dragon, dock with the space station and hold geostationary satellites in their slots. Monomethylhydrazine and nitrogen tetroxide burst into flame the instant they meet, so there\u2019s nothing to ignite \u2014 the thruster can fire a burst lasting a few hundredths of a second, thousands of times over. Isp about 300 s, a third better than hydrazine alone. The catch you\u2019ll see in the lab: very short pulses are inefficient, because every pulse wastes a little propellant getting started.',
          glance: [['Propellants', 'MMH + nitrogen tetroxide (hypergolic)'], ['Feed', 'Helium pressure'], ['Thrust', '10 N to about 500 N'], ['Isp', '280\u2013320 s'], ['Pulses', 'Down to a few milliseconds']],
          steps: [
            { t: 'The big picture', b: 'Helium pushes two propellants through two fast valves into a small chamber. Press Next.', hl: [] },
            { t: 'Two tanks, one pressurant', b: 'A shared helium bottle keeps both tanks pressurised. The whole system has no pumps.', hl: ['he', 'p-hef', 'p-heo', 'ftank', 'otank'] },
            { t: 'Two fast valves', b: 'Both valves open together, for as little as a few milliseconds. The timing has to match closely or one propellant arrives first.', hl: ['vf', 'vo', 'pf', 'po'] },
            { t: 'Fire on contact', b: 'The two liquids meet at the injector and ignite spontaneously. No igniter to fail, ever \u2014 which is why these nasty chemicals still fly.', hl: ['inj', 'chamber'] },
            { t: 'A red-hot chamber', b: 'Small thrusters can\u2019t easily be cooled with propellant, so the chamber is made of niobium or other exotic metals that simply glow red-hot and radiate the heat away.', hl: ['chamber', 'nozzle', 'plume'] }
          ],
          pros: ['Instant, reliable ignition \u2014 thousands of pulses', 'Better Isp than hydrazine alone', 'Storable propellants, no cryogenics'],
          cons: ['Both propellants are toxic and corrosive', 'Short pulses waste propellant', 'Two valves to synchronise, two tanks to carry'],
          used: 'Crew capsule manoeuvring, space station docking, geostationary satellites and upper-stage attitude control.',
          examples: [
            { name: 'R-4D', veh: 'Apollo Service Module and LM; many satellites', tag: 'MMH / N\u2082O\u2084', stats: ['About 490 N \u00B7 Isp about 312 s'], note: 'Designed for Apollo in the 1960s; developed versions still raise satellites into geostationary orbit.', map: { F: 490, isp: 312 }, approx: true },
            { name: 'Draco', veh: 'SpaceX Dragon', tag: 'MMH / N\u2082O\u2084', stats: ['About 400 N \u00B7 Isp about 300 s'], map: { F: 400, isp: 300 }, approx: true },
            { name: 'S400', veh: 'ArianeGroup satellite apogee engine', tag: 'MMH / N\u2082O\u2084', stats: ['About 425 N \u00B7 Isp about 318 s'], map: { F: 425, isp: 318 }, approx: true }
          ]
        }
      ],
      compare: { title: 'Small thrusters side by side', first: 'Thruster', cols: ['Energy source', 'Propellants', 'Isp', 'Hazard'],
        rows: [{ id: 'coldgas', cells: ['Stored pressure', 'Nitrogen', '\u224870 s', 'None'] }, { id: 'monoprop', cells: ['Catalytic decomposition', 'Hydrazine', '\u2248230 s', 'Toxic'] }, { id: 'biprop', cells: ['Hypergolic combustion', 'MMH + N\u2082O\u2084', '\u2248300 s', 'Toxic, corrosive'] }] }
    },

    /* ================================================================ NOZZLES */
    {
      id: 'nozzles', name: 'Nozzles', kicker: 'Nozzle design', color: 'var(--atl-abl)',
      blurb: 'The same chamber, five ways to turn its pressure into speed \u2014 and the fight against air pressure on the way up.',
      engines: [
        {
          id: 'bell', name: 'Bell nozzle', short: 'Bell', level: 1, model: 'nozzle', kind: 'bell',
          idea: 'One fixed shape, perfect at exactly one altitude.',
          intro: 'Every nozzle has a job: take hot, slow, high-pressure gas and turn it into cold, fast, low-pressure exhaust. A bell does it with a fixed curve, and the shape of that curve decides the one altitude where it works perfectly. Too short, and at high altitude the exhaust leaves still pushing outward \u2014 energy wasted. Too long, and at sea level the air squeezes the exhaust back in, and in the extreme the flow tears away from the wall. Every rocket designer has to pick. Press Climb in the lab and watch the plume change on the way to space.',
          glance: [['Shape', 'Fixed curved bell'], ['Best at', 'One altitude only'], ['Used on', 'Nearly every rocket ever flown'], ['Main trade', 'Sea-level safety vs vacuum performance']],
          labIntro: 'Press Climb and watch the plume on the way up. The chart compares this nozzle with a bell sized for sea level, one sized for vacuum, and a perfect nozzle that reshapes itself at every altitude.',
          steps: [
            { t: 'The big picture', b: 'A combustion chamber, a throat, and a bell that widens out. Press Next.', hl: [] },
            { t: 'Squeeze to the speed of sound', b: 'Gas from the chamber accelerates into the narrow throat and reaches exactly the speed of sound there. It can go no faster in a narrowing duct \u2014 that\u2019s a law of fluid flow, not an engineering limit.', hl: ['chamber'] },
            { t: 'Widen to go faster', b: 'Past the throat something counter-intuitive happens: supersonic gas speeds up in a widening channel. As it spreads, its pressure and temperature fall and its speed climbs. The longer the bell, the more it expands.', hl: ['nozzle'] },
            { t: 'The air pushes back', b: 'At the exit the exhaust meets the outside air. If its pressure matches the air\u2019s, all the energy became speed. If not, some is wasted. Air pressure falls a thousandfold on the way to space \u2014 so a fixed bell is only right at one height.', hl: ['plume'] }
          ],
          pros: ['Simple, well understood, efficient at its design point', 'Easy to cool', 'Short and light for its performance (the curved bell beats a straight cone)'],
          cons: ['Only perfect at one altitude', 'Big vacuum bells can\u2019t fire at sea level without flow separation', 'Every stage needs a compromise'],
          used: 'Almost everything: from Merlin to RS-25 to every satellite thruster.',
          examplesTitle: 'Real nozzles',
          examples: [
            { name: 'RS-25', veh: 'Space Shuttle, SLS', tag: '\u03B5 69', stats: ['Sea-level engine with an unusually big nozzle'], note: 'Designed to fire all the way from the pad to orbit, so its nozzle compromises: slightly over-expanded at liftoff, under-expanded near orbit.' },
            { name: 'Merlin 1D Vacuum', veh: 'Falcon 9 second stage', tag: '\u03B5 165', stats: ['Only ever fired in near-vacuum'], note: 'The huge bell would tear itself apart with flow separation at sea level.' }
          ]
        },
        {
          id: 'extend', name: 'Extendable nozzle', short: 'Extendable', level: 2, model: 'nozzle', kind: 'extend',
          idea: 'A short nozzle for launch, then slide a skirt into place once you\u2019re high enough.',
          intro: 'If the problem is that a vacuum nozzle is too big for the thick lower atmosphere \u2014 and too long to fit in the rocket \u2014 the obvious fix is to make it telescope. The engine starts on its short fixed nozzle, and once the air has thinned out, a skirt slides down over it, doubling or tripling the exit area. It\u2019s mechanically bold \u2014 a moving part the size of a person, joined to a nozzle at over 1,000 \u00B0C \u2014 but upper stages like the RL10B-2 fly it because stowed length is precious.',
          glance: [['Shape', 'Fixed bell + sliding skirt'], ['Best at', 'Two altitudes'], ['Used on', 'Upper stages (RL10B-2, Vinci)'], ['Main trade', 'Mechanism risk vs performance and length']],
          steps: [
            { t: 'The big picture', b: 'A fixed nozzle with a folded-up extension waiting around it. Press Next, then press Climb in the lab.', hl: [] },
            { t: 'Stowed', b: 'At lower altitude the short fixed nozzle suits the thicker air, and a short stage fits in the rocket.', hl: ['nozzle', 'ext'] },
            { t: 'Deployed', b: 'Above the deployment altitude, the skirt slides down and locks. The expansion ratio jumps and the Isp with it. Try moving the deployment altitude.', hl: ['ext', 'plume'] }
          ],
          pros: ['Much shorter when stowed', 'Near-vacuum performance without separation risk low down'],
          cons: ['A moving, heavy, hot mechanism that must work first time', 'Only two fixed expansion ratios'],
          used: 'Upper-stage engines, where they fire only once the air is gone but must fit in a short interstage.',
          examplesTitle: 'Real nozzles',
          examples: [
            { name: 'RL10B-2', veh: 'Delta IV upper stage; SLS interim upper stage', tag: '\u03B5 285 deployed', stats: ['Carbon\u2013carbon extension'], note: 'The extension deploys after stage separation \u2014 here there\u2019s no air left at all, so the point is fitting inside the rocket.' },
            { name: 'Vinci', veh: 'Ariane 6 upper stage', tag: '\u03B5 about 240', stats: ['Deployable nozzle extension'] }
          ]
        },
        {
          id: 'dual', name: 'Dual-bell nozzle', short: 'Dual bell', level: 3, model: 'nozzle', kind: 'dual',
          idea: 'Two bells in one, joined by a kink. The air decides which one the flow uses.',
          intro: 'A dual-bell nozzle has no moving parts at all. It\u2019s a small bell, then a sharp kink, then a bigger bell. Low down, the thick air forces the flow to peel away \u2014 cleanly, all around \u2014 at the kink, so the engine behaves like a small sea-level nozzle. Higher up, as the air thins, the flow suddenly jumps outward and attaches to the second bell, and the same nozzle becomes a vacuum nozzle. The catch is the jump itself: it happens in milliseconds, with side loads, and the timing depends on the air.',
          glance: [['Shape', 'Two bell contours joined by a kink'], ['Moving parts', 'None'], ['Status', 'Ground-tested (DLR, NASA)'], ['Main trade', 'The transition is abrupt']],
          steps: [
            { t: 'The big picture', b: 'An inner bell, a kink, an outer bell. Press Climb in the lab.', hl: [] },
            { t: 'Low altitude: inner bell only', b: 'The kink is a designed-in place for the flow to separate \u2014 cleanly and symmetrically, rather than randomly as in an oversized ordinary bell.', hl: ['nozzle', 'outer'] },
            { t: 'The switch', b: 'When the outside air is thin enough, the separated region collapses and the flow snaps onto the outer bell. One nozzle, two operating points.', hl: ['outer', 'plume'] }
          ],
          pros: ['Two good expansion ratios with no moving parts', 'Controlled separation at low altitude'],
          cons: ['Abrupt transition with side loads', 'Transition altitude hard to control', 'Some drag from air drawn into the outer bell before the switch'],
          used: 'Not yet flown; studied for future first stages and reusable vehicles.',
          examplesTitle: 'Real hardware',
          examples: [
            { name: 'DLR dual-bell tests', veh: 'German Aerospace Center test stands', tag: 'Ground tests', stats: ['Cold-flow and hot-fire campaigns'], note: 'Showed the switch happens reliably, and that it can be made to happen at lower pressure with careful contour design.' }
          ]
        },
        {
          id: 'spike', name: 'Aerospike', short: 'Aerospike', level: 4, model: 'nozzle', kind: 'spike',
          idea: 'Turn the nozzle inside out: the outer wall is the air itself.',
          intro: 'In a bell, the exhaust expands inside a wall. An aerospike turns that inside out. A ring of small combustion chambers fires along the outside of a central spike, and the other side of the jet has no wall at all \u2014 just the outside air. That missing wall is the whole point. At sea level, the air pushes the jet in against the spike, so it expands less. High up, the air lets go and the jet spreads more. The nozzle adapts itself continuously. The catch: it\u2019s heavy, hard to cool, and nobody has yet flown one to orbit.',
          glance: [['Shape', 'Central spike, open outer edge'], ['Best at', 'Every altitude up to its design point'], ['Status', 'Ground-tested (XRS-2200); small flight tests'], ['Main trade', 'Weight and cooling vs adaptation']],
          steps: [
            { t: 'The big picture', b: 'A ring of chambers, a spike, and no outer wall. Press Climb in the lab and watch the jet\u2019s outer edge.', hl: [] },
            { t: 'Chambers around the spike', b: 'Many small chambers (or one ring-shaped chamber) fire along the spike\u2019s curved surface.', hl: ['chamber'] },
            { t: 'The spike is the inner wall', b: 'The gas expands against the spike, pushing on it \u2014 and the spike pushes the rocket.', hl: ['spike'] },
            { t: 'The air is the outer wall', b: 'On the outside, the jet expands until its pressure matches the air. Thick air: a narrow jet. Thin air: a wide one. Up to the design altitude, it always expands about the right amount.', hl: ['plume'] },
            { t: 'Chop it short', b: 'A full spike is long and heavy. Truncating it saves most of the weight; hot gas trapped at the flat base pushes back and recovers most of the loss. Drag the truncation slider.', hl: ['spike'] }
          ],
          pros: ['Near-optimal expansion at every altitude up to design', 'Shorter than an equivalent bell when truncated', 'Differential throttling of chambers can steer without gimbals'],
          cons: ['Heavy spike that must be cooled', 'Complex plumbing for many chambers', 'Never flown to orbit \u2014 little heritage'],
          used: 'Ground-tested for the X-33 and VentureStar single-stage-to-orbit programmes; small flight tests since.',
          examplesTitle: 'Real hardware',
          examples: [
            { name: 'XRS-2200', veh: 'X-33 (cancelled 2001)', tag: 'LOX / LH\u2082 \u00B7 linear', stats: ['About 900 kN, ground-fired'], note: 'A linear aerospike \u2014 a wedge rather than a cone \u2014 fired successfully on test stands before the X-33 programme was cancelled.' },
            { name: 'Small aerospike flights', veh: 'University and start-up sounding rockets', tag: 'Various', stats: ['Sub-orbital demonstrations'], note: 'Several small aerospikes have flown on sounding rockets since the 2000s.' }
          ]
        },
        {
          id: 'ed', name: 'Expansion\u2013deflection nozzle', short: 'E-D nozzle', level: 4, model: 'nozzle', kind: 'ed',
          idea: 'A plug inside the throat deflects the flow outward along a short bell, with a free inner boundary.',
          intro: 'The expansion\u2013deflection nozzle is an aerospike folded back inside a bell. A plug \u2014 the pintle \u2014 sits in the throat and throws the flow outward against a short bell wall. Behind the pintle is a pocket of low-pressure gas open to the outside. At low altitude, outside air bleeds into that pocket and pushes the flow outward less, so the jet expands less; up high, the pocket empties and the flow fills the bell. It compensates for altitude, in a compact package \u2014 but less cleanly than a true aerospike.',
          glance: [['Shape', 'Short bell + central pintle'], ['Best at', 'A range of altitudes'], ['Status', 'Tested since the 1960s, never flown on a launcher'], ['Main trade', 'Compact, but less efficient']],
          steps: [
            { t: 'The big picture', b: 'A short bell with a plug in its throat. Press Climb in the lab.', hl: [] },
            { t: 'The pintle', b: 'The plug deflects the flow outward so it hugs the bell wall. Behind the plug sits a wake region open to the outside.', hl: ['pintle'] },
            { t: 'The wake does the adapting', b: 'Thick outside air fills the wake and limits how far the flow can expand; thin air lets it expand fully. Watch the wake shrink as you climb.', hl: ['pintle', 'plume'] }
          ],
          pros: ['Very short and compact', 'Some altitude compensation with no moving parts'],
          cons: ['Lower peak efficiency than a good bell', 'Hot pintle needs cooling', 'Little flight heritage'],
          used: 'Studied and tested; attractive for upper stages and landers where length is precious.',
          examplesTitle: 'Real hardware',
          examples: [
            { name: 'Rocketdyne E-D tests', veh: '1960s test programmes', tag: 'Ground tests', stats: ['Hot-fire demonstrations'], note: 'Studied alongside plug nozzles as a way to get altitude compensation in a short package.' }
          ]
        }
      ],
      compare: { title: 'Nozzles side by side', first: 'Nozzle', cols: ['Adapts to altitude?', 'Moving parts', 'Flight status'],
        rows: [{ id: 'bell', cells: ['No', 'None', 'Everywhere'] }, { id: 'extend', cells: ['In one step', 'Sliding skirt', 'Flying (RL10B-2, Vinci)'] }, { id: 'dual', cells: ['In one step', 'None', 'Ground tests'] },
          { id: 'spike', cells: ['Continuously', 'None', 'Ground tests, small flights'] }, { id: 'ed', cells: ['Partly', 'None', 'Ground tests'] }] }
    },

    /* ================================================================ ELECTRIC */
    {
      id: 'electric', name: 'Electric', kicker: 'Electric propulsion', color: 'var(--phos)',
      blurb: 'Use electricity instead of chemistry to throw propellant out. Tiny thrust, enormous efficiency \u2014 and a whole new trade-off.',
      engines: [
        {
          id: 'resisto', name: 'Resistojet', short: 'Resistojet', level: 1, model: 'electric', kind: 'resisto',
          idea: 'An electric kettle with a nozzle: heat the propellant with a hot wire, then expand it.',
          intro: 'The gentlest step from chemical to electric. Propellant flows past an electrically heated element \u2014 a glorified toaster coil \u2014 and leaves through a nozzle. Because the heat comes from electricity rather than from the propellant\u2019s own chemistry, you can pick almost anything: water, ammonia, xenon, even the hydrazine a satellite already carries (decomposed first, then heated further). The catch: the heater metal melts well below the temperatures a flame reaches, so Isp improves on chemistry only a little.',
          glance: [['Heats with', 'Electric element'], ['Propellants', 'Hydrazine, ammonia, water, xenon'], ['Power', 'Tens of watts to a few kW'], ['Isp', '150\u2013350 s'], ['Main virtue', 'Simple; uses any fluid']],
          steps: [
            { t: 'The big picture', b: 'Solar power runs a heater; propellant flows past it and out a nozzle. Press Next.', hl: [] },
            { t: 'Power in', b: 'Solar panels feed a power unit that drives current through the heating element.', hl: ['array', 'pw1', 'ppu', 'pw2'] },
            { t: 'Propellant in', b: 'Propellant flows from its tank through a flow-control valve.', hl: ['tank', 'pp', 'fcv', 'pp2'] },
            { t: 'The heater', b: 'The element \u2014 tungsten or rhenium \u2014 heats the gas to as much as 2,500 K. That metal\u2019s melting point is the ceiling on performance.', hl: ['heater'] },
            { t: 'Ordinary nozzle', b: 'From here it\u2019s a normal thermal rocket: hot gas expands through a nozzle.', hl: ['nozzle', 'plume'] }
          ],
          pros: ['Very simple and reliable', 'Uses almost any fluid, even water', 'Can boost an existing hydrazine system'],
          cons: ['Isp only modestly above chemical', 'Power-hungry for the thrust it gives'],
          used: 'Satellite station-keeping (Iridium, Intelsat), and small satellites using water or xenon.',
          examples: [
            { name: 'MR-501B', veh: 'Geostationary satellites (1980s\u201390s)', tag: 'Hydrazine', stats: ['About 0.3 N \u00B7 Isp about 300 s \u00B7 about 500 W'], note: 'An electrothermal hydrazine thruster \u2014 decomposes hydrazine on a catalyst, then heats the gas further.', set: { gas: 'n2h4', T: 1800, P: 500 }, pub: { T: 0.33, isp: 300 }, map: { F: 0.33, isp: 300 }, approx: true, preset: true }
          ]
        },
        {
          id: 'arcjet', name: 'Arcjet', short: 'Arcjet', level: 2, model: 'electric', kind: 'arcjet',
          idea: 'Pass the propellant through a lightning bolt.',
          intro: 'A resistojet is limited by the melting point of its heater. So get rid of the heater: strike an electric arc between a pointed cathode and the nozzle throat, and blow the propellant straight through it. The arc core runs at tens of thousands of degrees \u2014 no solid could survive it, but the gas passes through too fast to melt anything. Isp doubles over a resistojet. The catch: much of the energy goes into ripping molecules apart, and it never comes back as thrust. Efficiency hovers around a third.',
          glance: [['Heats with', 'Electric arc'], ['Propellants', 'Hydrazine, ammonia, hydrogen'], ['Power', '0.3\u201330 kW'], ['Isp', '500\u20131,500 s'], ['Main loss', 'Energy stuck in broken molecules']],
          steps: [
            { t: 'The big picture', b: 'An arc strikes between a cathode rod and the nozzle, and propellant flows through it. Press Next.', hl: [] },
            { t: 'Power in', b: 'The power unit supplies a steady high current at about 100 volts.', hl: ['array', 'pw1', 'ppu', 'pw2'] },
            { t: 'The cathode', b: 'A pointed tungsten rod on the centreline. The arc springs from its tip.', hl: ['cathode'] },
            { t: 'The arc', b: 'The arc attaches to the nozzle wall just past the throat. The gas flowing through it is heated to average temperatures of 5,000 K or more.', hl: ['arc', 'anode'] },
            { t: 'Expand', b: 'The superheated gas expands through the nozzle. Hot enough that many molecules arrive broken apart \u2014 and that splitting energy is lost.', hl: ['nozzle', 'plume', 'pp2'] }
          ],
          pros: ['About twice the Isp of a resistojet', 'Relatively high thrust for electric propulsion', 'Uses familiar propellants'],
          cons: ['Low efficiency (\u224830\u201340%)', 'Electrode erosion limits life'],
          used: 'Geostationary satellite station-keeping (Lockheed Martin A2100 series).',
          examples: [
            { name: 'MR-510', veh: 'Lockheed Martin A2100 satellites', tag: 'Hydrazine', stats: ['About 0.25 N \u00B7 Isp about 590 s \u00B7 about 2 kW'], set: { gas: 'n2h4', T: 5000, P: 2000 }, pub: { T: 0.25, isp: 590 }, map: { F: 0.25, isp: 590 }, approx: true, preset: true }
          ]
        },
        {
          id: 'ion', name: 'Gridded ion thruster', short: 'Ion', level: 3, model: 'electric', kind: 'ion',
          idea: 'Strip electrons off xenon atoms, then fling the ions out with an electric field.',
          intro: 'Here electricity doesn\u2019t heat anything \u2014 it pushes directly. Xenon atoms are ionised in a chamber (knock off one electron each and they become positive ions). At the back of the chamber are two grids with over a thousand volts between them. Any ion that wanders near the grids is grabbed and hurled out at around 30 kilometres per second \u2014 ten times faster than any chemical exhaust. The catch? The thrust is about the weight of a sheet of paper. Dawn used that paper-weight push, day after day for years, to change speed by more than 11 km/s \u2014 a record.',
          glance: [['Accelerates with', 'Electrostatic grids'], ['Propellant', 'Xenon (krypton for cost)'], ['Power', '0.3\u20137 kW typical'], ['Isp', '2,500\u20134,500 s'], ['Thrust', 'Tens to hundreds of millinewtons']],
          labIntro: 'Set the power and beam voltage. The readouts include how long this thruster would take to change a spacecraft\u2019s speed by 1 km/s \u2014 and how little propellant it would use doing it.',
          steps: [
            { t: 'The big picture', b: 'Xenon in, electricity in, a beam of fast ions out, and electrons added back at the end. Press Next.', hl: [] },
            { t: 'Power', b: 'Solar arrays feed a power processing unit that makes several different voltages \u2014 including over 1,000 volts for the grids.', hl: ['array', 'pw1', 'ppu', 'pw2', 'pw3'] },
            { t: 'Xenon', b: 'Xenon is stored as a dense supercritical fluid. It\u2019s heavy (good \u2014 more thrust per watt), inert, and easy to ionise. Its downside is price, which is why newer thrusters use krypton.', hl: ['tank', 'pp', 'fcv', 'pp2'] },
            { t: 'Make ions', b: 'A hollow cathode sprays electrons into the chamber. They collide with xenon atoms and knock electrons off. Magnets around the walls keep the electrons bouncing around longer so they make more ions.', hl: ['chamber', 'cathode'] },
            { t: 'The grids', b: 'The screen grid sits at the chamber\u2019s high voltage; the accelerator grid just behind it is negative. Ions reaching a hole fall through that voltage drop \u2014 like a ball rolling off a cliff \u2014 and leave at tens of kilometres per second.', hl: ['grids'] },
            { t: 'The beam', b: 'A beam of positive ions leaves. Nothing inside the thruster touches it \u2014 which is why ion thrusters can run for tens of thousands of hours.', hl: ['beam'] },
            { t: 'Neutralise', b: 'If only positive ions left, the spacecraft would build up a negative charge and pull the ions back. A second cathode sprays electrons into the beam to keep everything neutral.', hl: ['neut'] }
          ],
          pros: ['Very high Isp (3,000+ s) \u2014 a tenth of the propellant of a chemical rocket', 'Extremely long life', 'Precise, throttleable thrust'],
          cons: ['Tiny thrust: months to change speed significantly', 'Needs lots of electric power', 'Thrust per square metre limited by space charge; complex power electronics'],
          used: 'Deep-space missions (Deep Space 1, Dawn, Hayabusa, BepiColombo, DART) and geostationary satellites.',
          examples: [
            { name: 'NSTAR', veh: 'Deep Space 1, Dawn', tag: 'Xenon', stats: ['92 mN \u00B7 3,100 s \u00B7 2.3 kW'], note: 'Dawn\u2019s three NSTAR thrusters ran for over 50,000 hours between them, orbiting both Vesta and Ceres.', set: { prop: 'xe', V: 1100, P: 2300 }, pub: { T: 0.092, isp: 3100 }, map: { F: 0.092, isp: 3100 }, preset: true },
            { name: 'NEXT-C', veh: 'DART', tag: 'Xenon', stats: ['236 mN \u00B7 4,190 s \u00B7 6.9 kW'], set: { prop: 'xe', V: 1800, P: 6900 }, pub: { T: 0.236, isp: 4190 }, map: { F: 0.236, isp: 4190 }, preset: true },
            { name: 'T6', veh: 'BepiColombo (to Mercury)', tag: 'Xenon', stats: ['Up to 145 mN \u00B7 about 4,100 s \u00B7 4.5 kW'], map: { F: 0.145, isp: 4100 }, approx: true }
          ]
        },
        {
          id: 'hall', name: 'Hall-effect thruster', short: 'Hall', level: 3, model: 'electric', kind: 'hall',
          idea: 'Trap electrons in a magnetic field so they form a virtual grid that accelerates the ions.',
          intro: 'A Hall thruster does an ion thruster\u2019s job without grids. Xenon flows into a ring-shaped channel. A radial magnetic field across the channel traps electrons into a swirling ring current near the exit \u2014 they can\u2019t reach the anode easily. That cloud of trapped electrons ionises the xenon and, at the same time, acts as a virtual negative grid: ions fall through a few hundred volts of electric field and shoot out. Less voltage, so lower Isp than a gridded thruster \u2014 but more thrust per watt, a simpler build, and no grids to erode. Thousands of them now fly on Starlink satellites.',
          glance: [['Accelerates with', 'Electric field held by trapped electrons'], ['Propellant', 'Xenon, krypton or argon'], ['Power', '0.2\u201350 kW'], ['Isp', '1,200\u20133,000 s'], ['Thrust per kW', '\u224855\u201365 mN']],
          labIntro: 'Set power and voltage. Try krypton and argon: cheaper and lighter, so faster exhaust per volt \u2014 but harder to ionise, which costs efficiency.',
          steps: [
            { t: 'The big picture', b: 'An annular channel, a magnetic field across it, an anode at the back and a cathode outside. Press Next.', hl: [] },
            { t: 'Propellant in', b: 'Xenon enters through the anode at the bottom of the ring-shaped channel.', hl: ['tank', 'pp', 'fcv', 'pp2', 'pp3', 'anode'] },
            { t: 'The magnetic field', b: 'Magnets make a field pointing across the channel, strongest near the exit.', hl: ['magnet'] },
            { t: 'Trapped electrons', b: 'Electrons from the outside cathode head for the anode, but the field makes them spiral \u2014 and the crossed electric and magnetic fields send them circling around the ring. That circling current is the Hall current that gives the thruster its name.', hl: ['drift', 'cathode'] },
            { t: 'Ionise and accelerate', b: 'Xenon atoms drifting up the channel collide with the trapped electrons and lose an electron. The new ions are heavy enough to ignore the magnetic field and fall straight out through the electric field.', hl: ['channel', 'beam'] },
            { t: 'Neutralise', b: 'Some electrons from the cathode join the departing plume, keeping the spacecraft neutral.', hl: ['cathode', 'beam'] }
          ],
          pros: ['More thrust per watt than gridded ion thrusters', 'Simple and compact; no grids', 'Huge flight heritage; works with cheap krypton and argon'],
          cons: ['Lower Isp than gridded ion', 'Channel walls erode slowly', 'Wider plume can hit spacecraft surfaces'],
          used: 'Soviet satellites since 1971, geostationary satellites, ESA\u2019s SMART-1, and Starlink.',
          examples: [
            { name: 'SPT-100', veh: 'Russian and Western geostationary satellites', tag: 'Xenon', stats: ['83 mN \u00B7 1,600 s \u00B7 1.35 kW'], note: 'Hundreds flown since the 1990s.', set: { prop: 'xe', V: 300, P: 1350 }, pub: { T: 0.083, isp: 1600 }, map: { F: 0.083, isp: 1600 }, preset: true },
            { name: 'AEPS', veh: 'Lunar Gateway power and propulsion', tag: 'Xenon', stats: ['About 600 mN \u00B7 about 2,800 s \u00B7 12.5 kW'], set: { prop: 'xe', V: 600, P: 12500 }, pub: { T: 0.6, isp: 2800 }, map: { F: 0.6, isp: 2800 }, approx: true, preset: true },
            { name: 'Starlink V2 thruster', veh: 'SpaceX Starlink', tag: 'Argon', stats: ['170 mN \u00B7 2,500 s \u00B7 4.2 kW'], note: 'Argon is far cheaper than xenon. The simple efficiency fit here underestimates this modern design, so it isn\u2019t loadable.', map: { F: 0.17, isp: 2500 } }
          ]
        },
        {
          id: 'mpd', name: 'Magnetoplasmadynamic thruster', short: 'MPD', level: 4, model: 'electric', kind: 'mpd',
          idea: 'A huge current through a plasma makes its own magnetic field, and the two push the plasma out.',
          intro: 'Run thousands of amps from a central cathode to a surrounding anode through a plasma, and that current makes a ring-shaped magnetic field around the axis. Current crossing a magnetic field feels a force \u2014 the Lorentz force, the same one that spins every electric motor \u2014 and here it points out of the thruster. The plasma is shoved out at tens of kilometres per second. Thrust grows as the current squared, so MPD thrusters love power: they only get efficient at hundreds of kilowatts to megawatts, more than any solar array provides today.',
          glance: [['Accelerates with', 'Lorentz force (J \u00D7 B)'], ['Propellant', 'Argon, lithium, hydrogen'], ['Power', '100 kW \u2013 several MW'], ['Isp', '1,500\u20138,000 s'], ['Status', 'Laboratory; brief flight tests']],
          steps: [
            { t: 'The big picture', b: 'A central cathode, a cylindrical anode, a huge current between them through a plasma. Press Next.', hl: [] },
            { t: 'Megawatts in', b: 'This needs enormous power \u2014 realistically from a nuclear reactor.', hl: ['array', 'pw1', 'ppu', 'pw2'] },
            { t: 'Propellant in', b: 'Gas enters around the cathode base.', hl: ['tank', 'pp', 'fcv', 'pp2'] },
            { t: 'The current', b: 'Thousands of amps arc from the cathode to the anode through the gas, turning it into plasma.', hl: ['current', 'anode', 'cathode'] },
            { t: 'Its own magnetic field', b: 'The current flowing along the cathode creates a magnetic field circling the axis \u2014 \u2299 above, \u2297 below. Current \u00D7 field gives a force pointing out of the thruster. No magnets needed.', hl: ['force'] },
            { t: 'Out', b: 'The plasma leaves at high speed. Try cutting the propellant flow: exhaust gets faster until the \u201Conset\u201D limit, where the plasma starves and the electrodes start to burn.', hl: ['beam'] }
          ],
          pros: ['High thrust density \u2014 much more thrust per area than ion or Hall', 'Scales to megawatts', 'High Isp'],
          cons: ['Needs enormous power', 'Electrode erosion, especially past onset', 'Inefficient at low power'],
          used: 'Laboratories worldwide; Japan flew a pulsed MPD experiment on the SFU satellite in 1995.',
          examples: [
            { name: 'Laboratory MPD thrusters', veh: 'Princeton, Stuttgart, Moscow', tag: 'Argon \u00B7 lithium', stats: ['Up to tens of newtons at MW power'], note: 'Lithium-fed versions have shown efficiencies near 50% at hundreds of kilowatts in the lab.' }
          ]
        },
        {
          id: 'vasimr', name: 'VASIMR', short: 'VASIMR', level: 4, model: 'electric', kind: 'vasimr',
          idea: 'Heat a plasma with radio waves inside a magnetic bottle, then let it out through a magnetic nozzle.',
          intro: 'VASIMR \u2014 the Variable Specific Impulse Magnetoplasma Rocket \u2014 never lets its plasma touch a wall. Argon is ionised by one radio antenna, then energised by a second tuned to the frequency at which the ions spiral around the magnetic field lines, much like pushing a child on a swing at just the right moment. The hot plasma then leaves through a magnetic nozzle \u2014 field lines flaring outward. Because nothing touches the plasma, there\u2019s no electrode erosion, and the split of power between the two antennas lets you trade thrust for Isp in flight.',
          glance: [['Accelerates with', 'Radio-frequency heating + magnetic nozzle'], ['Propellant', 'Argon'], ['Power', '\u2248200 kW (VX-200)'], ['Isp', '3,000\u201312,000 s (variable)'], ['Status', 'Ground-tested']],
          steps: [
            { t: 'The big picture', b: 'A tube inside powerful magnets, two radio antennas, and a magnetic nozzle. Press Next.', hl: [] },
            { t: 'Superconducting magnets', b: 'Strong magnetic fields guide the plasma down the tube without letting it touch the walls.', hl: ['magnets', 'tube'] },
            { t: 'Ionise', b: 'The first antenna (a helicon) turns neutral argon into plasma.', hl: ['helicon', 'pw2', 'pp2'] },
            { t: 'Energise', b: 'The second antenna broadcasts at the ion cyclotron frequency \u2014 the rate ions spin around field lines. In resonance, they absorb energy and spin faster and faster.', hl: ['icrh', 'pw3'] },
            { t: 'Magnetic nozzle', b: 'The field lines flare outward, and the ions\u2019 spin turns into straight-line speed as they leave \u2014 a nozzle made of magnetism.', hl: ['mnozzle', 'beam'] }
          ],
          pros: ['No electrodes touching the plasma \u2014 potentially very long life', 'Thrust and Isp adjustable in flight', 'High power density'],
          cons: ['Needs ~200 kW or more', 'Superconducting magnets and cryogenics', 'Never flown'],
          used: 'Ground tests by Ad Astra Rocket Company.',
          examples: [
            { name: 'VX-200', veh: 'Ad Astra ground tests', tag: 'Argon', stats: ['About 5.8 N \u00B7 about 5,000 s \u00B7 200 kW'], note: 'Reported about 72% efficiency at full power in vacuum-chamber tests.', set: { P: 200000, isp: 5000, mass: 10000 }, pub: { T: 5.8, isp: 5000 }, map: { F: 5.8, isp: 5000 }, approx: true, preset: true }
          ]
        },
        {
          id: 'ppt', name: 'Pulsed plasma thruster', short: 'PPT', level: 2, model: 'electric', kind: 'ppt',
          idea: 'A spark vaporises a sliver of Teflon, and the discharge current blasts the puff of plasma out.',
          intro: 'The pulsed plasma thruster is almost comically simple. A spring pushes a bar of Teflon (PTFE, the non-stick pan coating) between two metal rails. A capacitor charges up; a spark plug triggers it; the capacitor dumps its energy across the Teflon face in a few microseconds, vaporising and ionising a thin layer. The current through that plasma makes its own magnetic field and slams the puff out between the rails. One pulse, then recharge. No tanks, no valves, no liquids \u2014 the propellant is a solid block.',
          glance: [['Accelerates with', 'Pulsed Lorentz force + heating'], ['Propellant', 'Solid Teflon'], ['Energy per pulse', '2\u2013100 J'], ['Isp', '800\u20131,500 s'], ['Impulse bit', 'Tens to ~1,000 \u00B5N\u00B7s']],
          steps: [
            { t: 'The big picture', b: 'A capacitor, two rails, a bar of Teflon and a spark plug. Press Next.', hl: [] },
            { t: 'Charge the capacitor', b: 'The power unit slowly charges a capacitor to a few thousand volts.', hl: ['array', 'pw1', 'ppu', 'pw3', 'cap'] },
            { t: 'Solid propellant', b: 'A spring feeds a Teflon bar forward as its face is eaten away, pulse by pulse.', hl: ['teflon'] },
            { t: 'Spark', b: 'A small spark plug seeds the gap with charged particles, and the capacitor discharges across the Teflon face.', hl: ['spark', 'rails', 'pw2', 'pw4'] },
            { t: 'The current sheet', b: 'The discharge ablates a thin layer of Teflon into plasma, and the current through it \u2014 crossing its own magnetic field \u2014 accelerates the sheet out between the rails.', hl: ['sheet', 'beam'] }
          ],
          pros: ['No tanks, valves or liquids \u2014 very simple', 'Precise tiny impulses', 'Solid propellant stores forever'],
          cons: ['Very low efficiency (\u224810%)', 'Low total thrust', 'Some propellant leaves as slow vapour after each pulse'],
          used: 'The first electric propulsion in space (Zond 2, 1964), attitude control on satellites, NASA\u2019s EO-1 and CubeSats.',
          examples: [
            { name: 'EO-1 PPT', veh: 'NASA Earth Observing-1 (2000)', tag: 'Teflon', stats: ['Up to 860 \u00B5N\u00B7s per pulse \u00B7 up to 56 J \u00B7 Isp up to about 1,350 s'], note: 'Replaced a reaction wheel for pitch control as a flight demonstration.', set: { E: 56, f: 1, mass: 570 }, pub: { T: 860e-6, isp: 1350 }, map: { F: 8.6e-4, isp: 1350 }, preset: true }
          ]
        },
        {
          id: 'espray', name: 'Electrospray and FEEP', short: 'Electrospray', level: 3, model: 'electric', kind: 'espray',
          idea: 'Pull charged molecules straight off the tip of a liquid with a strong electric field.',
          intro: 'Put an electrically conducting liquid on the point of a needle and apply thousands of volts. The liquid surface is pulled into a tiny cone \u2014 a Taylor cone \u2014 so sharp that ions and nanodroplets are ripped straight off its tip and accelerated away. No gas, no ionisation chamber, no plasma: the liquid (an ionic liquid, or molten indium or caesium in field-emission electric propulsion, FEEP) is ionised and accelerated in one step. Each emitter gives micronewtons; hundreds of them together make a thruster the size of a matchbox \u2014 perfect for CubeSats and for pointing telescopes with exquisite smoothness.',
          glance: [['Accelerates with', 'Electrostatic field at a liquid tip'], ['Propellant', 'Ionic liquid, indium, caesium'], ['Power', '1\u2013100 W'], ['Isp', '1,000\u20138,000 s'], ['Thrust', 'Micronewtons to a millinewton']],
          steps: [
            { t: 'The big picture', b: 'A row of sharp emitters wetted with liquid propellant, an extractor electrode, and a spray of ions. Press Next.', hl: [] },
            { t: 'Liquid propellant', b: 'The liquid is stored with no pressure at all; capillary action wicks it to each tip.', hl: ['tank', 'pp', 'fcv', 'pp2', 'emitters'] },
            { t: 'Thousands of volts', b: 'The extractor electrode sits a fraction of a millimetre away at thousands of volts.', hl: ['extractor', 'pw2'] },
            { t: 'Taylor cones', b: 'The field pulls the liquid into a sharp cone at each tip, and ions (and tiny droplets) are torn off and flung out.', hl: ['emitters', 'beam'] }
          ],
          pros: ['Very compact, no gas handling', 'Ultra-fine, smooth thrust', 'High Isp at tiny scale'],
          cons: ['Microscopic thrust', 'Emitter degradation', 'Low overall efficiency at small power once heaters and electronics are counted'],
          used: 'LISA Pathfinder\u2019s drag-free control (colloid thrusters) and hundreds of small satellites with FEEP units.',
          examples: [
            { name: 'IFM Nano Thruster', veh: 'Enpulsion \u00B7 many CubeSats', tag: 'Indium FEEP', stats: ['About 350 \u00B5N \u00B7 2,000\u20136,000 s \u00B7 about 40 W'], set: { P: 40, isp: 3000, mass: 20 }, pub: { T: 350e-6, isp: 3000 }, map: { F: 3.5e-4, isp: 3000 }, approx: true, preset: true },
            { name: 'Colloid Micro-Newton Thrusters', veh: 'LISA Pathfinder (NASA ST7)', tag: 'Ionic liquid', stats: ['5\u201330 \u00B5N, adjustable to 0.1 \u00B5N'], note: 'Held a spacecraft so still that its free-floating test masses could measure gravitational-wave-level disturbances.', map: { F: 2e-5, isp: 200 }, approx: true }
          ]
        }
      ],
      compare: { title: 'Electric thrusters side by side', first: 'Thruster', cols: ['How it accelerates', 'Typical Isp', 'Typical power', 'Status'],
        rows: [{ id: 'resisto', cells: ['Electric heater', '150\u2013350 s', 'W to kW', 'Flying'] }, { id: 'arcjet', cells: ['Electric arc', '500\u20131,500 s', '0.3\u201330 kW', 'Flying'] }, { id: 'ion', cells: ['Electrostatic grids', '2,500\u20134,500 s', '0.3\u20137 kW', 'Flying'] },
          { id: 'hall', cells: ['Trapped-electron field', '1,200\u20133,000 s', '0.2\u201350 kW', 'Flying (thousands)'] }, { id: 'mpd', cells: ['Self-field Lorentz force', '1,500\u20138,000 s', '100 kW\u2013MW', 'Laboratory'] }, { id: 'vasimr', cells: ['RF heating + magnetic nozzle', '3,000\u201312,000 s', '\u2248200 kW', 'Ground tests'] },
          { id: 'ppt', cells: ['Pulsed Lorentz force', '800\u20131,500 s', '1\u2013100 W avg', 'Flying'] }, { id: 'espray', cells: ['Field at a liquid tip', '1,000\u20138,000 s', '1\u2013100 W', 'Flying'] }] }
    },

    /* ================================================================ NUCLEAR */
    {
      id: 'nuclear', name: 'Nuclear', kicker: 'Nuclear propulsion', color: 'var(--atl-hoto)',
      blurb: 'Split atoms instead of burning chemicals: heat hydrogen with a reactor, make electricity, or \u2014 once seriously proposed \u2014 ride a string of bombs.',
      engines: [
        {
          id: 'ntr', name: 'Solid-core nuclear thermal rocket', short: 'Nuclear thermal', level: 3, model: 'nuclear', kind: 'ntr',
          idea: 'Pump liquid hydrogen through a hot nuclear reactor, then out a nozzle.',
          intro: 'A chemical rocket is stuck with the exhaust its chemistry makes \u2014 water vapour, for hydrogen and oxygen, with an average molar mass around 13. A nuclear thermal rocket breaks that link. The heat comes from uranium fission in a reactor core, and the only thing flowing through it is hydrogen, the lightest molecule there is. At the same temperature, exhaust speed goes as one over the square root of molar mass \u2014 so Isp roughly doubles, to about 900 seconds. In the 1960s, the United States built and ground-fired more than twenty of these reactors under the NERVA and Rover programmes. The catch has always been politics and testing, not physics.',
          glance: [['Heat source', 'Uranium fission'], ['Propellant', 'Pure liquid hydrogen'], ['Core temperature', '2,300\u20133,000 K'], ['Isp', '850\u2013950 s'], ['Status', 'Ground-tested 1959\u201372']],
          labIntro: 'Adjust the reactor\u2019s power and how hot it runs. The limit on temperature is the fuel itself.',
          steps: [
            { t: 'The big picture', b: 'A hydrogen tank, a turbopump, a reactor instead of a combustion chamber, and a nozzle. Press Next.', hl: [] },
            { t: 'Hydrogen only', b: 'There\u2019s no oxidiser \u2014 nothing burns. The tank holds liquid hydrogen at 20 K, and that\u2019s the entire propellant.', hl: ['tank', 'p-in'] },
            { t: 'A turbopump', b: 'The pump pushes hydrogen to high pressure. Some of it \u2014 warmed by the reactor \u2014 drives the turbine, just like an expander-bleed liquid engine.', hl: ['pump', 'turb', 'shaft', 'p-bleed', 'p-tdump'] },
            { t: 'A shield', b: 'A radiation shield sits between the reactor and everything upstream \u2014 the tank, the pumps and, further forward, the crew.', hl: ['shield', 'p-hi'] },
            { t: 'Through the core', b: 'Hydrogen flows through hundreds of channels in the uranium fuel elements, heating from 20 K to about 2,500 K in a metre or so. Control drums around the core \u2014 part neutron reflector, part absorber \u2014 rotate to set the power.', hl: ['core', 'drums'] },
            { t: 'Light, hot exhaust', b: 'Pure hot hydrogen expands through the nozzle. Light molecules, fast exhaust: about 900 seconds of Isp.', hl: ['plenum', 'nozzle', 'plume'] }
          ],
          pros: ['About twice the Isp of the best chemical engines', 'High thrust \u2014 unlike electric propulsion', 'Tested extensively on the ground'],
          cons: ['Radioactive; testing and launch approval are hard', 'Liquid hydrogen is bulky and boils off', 'Heavy reactor and shielding \u2014 thrust-to-weight far below chemical engines'],
          used: 'Never flown. Ground-tested in the US (Rover/NERVA, 1959\u201372) and the USSR (RD-0410). Studied for crewed Mars missions.',
          examples: [
            { name: 'NERVA XE', veh: 'Ground test, Nevada (1969)', tag: 'LH\u2082', stats: ['About 250 kN \u00B7 about 1,100 MW', 'Design Isp about 840 s'], note: 'Started 28 times in one test series \u2014 a flight-configuration engine in all but name.', set: { T: 2270, P: 1140, pc: 40, eps: 100 }, pub: { key: 'F', val: 246.6, unit: 'kN', label: 'thrust' }, map: { F: 246.6e3, isp: 841 }, approx: true, preset: true },
            { name: 'RD-0410', veh: 'Soviet ground tests (1965\u201385)', tag: 'LH\u2082', stats: ['About 35 kN \u00B7 910 s \u00B7 196 MW'], set: { T: 3000, P: 196, pc: 70, eps: 100 }, pub: { key: 'isp', val: 910, unit: 's', label: 'Isp' }, map: { F: 35.3e3, isp: 910 }, approx: true, preset: true }
          ]
        },
        {
          id: 'gascore', name: 'Gas-core nuclear rocket', short: 'Gas core', level: 5, model: 'nuclear', kind: 'gascore',
          idea: 'Let the uranium itself become a gas, so it can run far hotter than any solid could.',
          intro: 'A solid-core reactor is capped by the melting point of its fuel. So stop using solid fuel. In a gas-core rocket the uranium is a swirling ball of plasma at tens of thousands of degrees, and hydrogen flowing around it is heated by the light it gives off. There are two designs. In the \u201Cnuclear lightbulb\u201D the uranium plasma is sealed inside a transparent quartz wall, cooled from the outside. In the open-cycle version there\u2019s no wall at all \u2014 the hydrogen and uranium mix, and some uranium inevitably goes out the nozzle. Isp from 1,500 to over 5,000 s. The catch: none of this has ever been built beyond laboratory experiments.',
          glance: [['Heat source', 'Fissioning uranium plasma'], ['Propellant', 'Hydrogen seeded with particles'], ['Propellant temperature', '5,000\u201325,000 K'], ['Isp', '1,500\u20135,000 s'], ['Status', 'Paper studies']],
          steps: [
            { t: 'The big picture', b: 'A pressure vessel holding a ball of uranium plasma, hydrogen swirling around it, and a nozzle. Press Next.', hl: [] },
            { t: 'Hydrogen in', b: 'Hydrogen enters through the walls, swirling. It\u2019s seeded with fine tungsten or carbon dust so it can absorb light \u2014 pure hydrogen is transparent.', hl: ['tank', 'p-in', 'p-in2', 'swirl'] },
            { t: 'Uranium plasma', b: 'At the centre, uranium plasma sustains a chain reaction at twenty thousand kelvin or more. It glows mostly in the ultraviolet.', hl: ['plasma', 'vessel'] },
            { t: 'Lightbulb or open?', b: 'The closed design wraps the plasma in a cooled quartz bulb \u2014 clean, but the bulb limits how hot the hydrogen can get. Switch to open cycle in the lab: no bulb, higher temperature, uranium in the exhaust.', hl: ['bulb'] },
            { t: 'Out', b: 'The hydrogen \u2014 now hot enough to have fallen apart into atoms \u2014 leaves through the nozzle.', hl: ['nozzle', 'plume', 'throat'] }
          ],
          pros: ['Isp 2\u20135\u00D7 a solid-core nuclear rocket, at high thrust', 'Could make crewed trips to Mars take weeks'],
          cons: ['Never built; enormous engineering unknowns', 'Open cycle loses uranium out the nozzle', 'Very high pressures and heat loads'],
          used: 'NASA and United Aircraft studies from the 1960s\u201370s.',
          examples: [
            { name: 'Nuclear lightbulb study', veh: 'NASA / United Aircraft (about 1970)', tag: 'Closed cycle', stats: ['About 410 kN \u00B7 about 1,870 s \u00B7 about 4.6 GW'], set: { mode: 'closed', T: 7500, P: 4.6, pc: 500, eps: 100 }, pub: { key: 'isp', val: 1870, unit: 's', label: 'Isp' }, map: { F: 409e3, isp: 1870 }, approx: true, preset: true }
          ]
        },
        {
          id: 'nep', name: 'Nuclear-electric propulsion', short: 'Nuclear-electric', level: 4, model: 'nuclear', kind: 'nep',
          idea: 'A reactor makes electricity for ion thrusters \u2014 and most of its heat has to be thrown away.',
          intro: 'Electric thrusters are power-hungry, and sunlight gets weak far from the Sun. A nuclear reactor gives steady power anywhere. The heat drives a converter \u2014 thermoelectric junctions, a Stirling engine, or a gas turbine \u2014 that makes electricity for ion or Hall thrusters. Here\u2019s the catch, and it\u2019s pure thermodynamics: no converter can turn more than a fraction of the heat into electricity. The rest must be radiated into space, and in a vacuum there\u2019s no air to carry heat away \u2014 only radiation. The radiators end up being the largest thing on the spacecraft.',
          glance: [['Power source', 'Fission reactor + converter'], ['Thrusters', 'Ion, Hall or MPD'], ['Conversion efficiency', '5\u201330%'], ['Isp', '2,000\u20139,000 s'], ['Biggest part', 'The radiators']],
          labIntro: 'Size the reactor and choose the converter. Watch the radiator grow \u2014 and try the radiator temperature slider to feel the fourth-power law.',
          steps: [
            { t: 'The big picture', b: 'Reactor, shield, a long boom, converter, radiators and thrusters. Press Next.', hl: [] },
            { t: 'The reactor', b: 'A small fission reactor produces heat \u2014 megawatts of it for large designs.', hl: ['reactor'] },
            { t: 'Shadow shield', b: 'Radiation travels in straight lines, so a shield only needs to cast a shadow over the spacecraft. The long boom adds distance, and distance is the cheapest shielding there is.', hl: ['shield', 'boom'] },
            { t: 'The converter', b: 'Hot fluid from the reactor drives the converter. A Brayton gas turbine reaches about 30%; solid-state thermoelectrics only about 6%, but with no moving parts.', hl: ['conv', 'p-hot', 'p-cold'] },
            { t: 'The radiators', b: 'Everything the converter can\u2019t use must be radiated away. Radiated power goes as temperature to the fourth power \u2014 so hotter radiators are dramatically smaller.', hl: ['radiators', 'p-rad'] },
            { t: 'Electric thrusters', b: 'The electricity runs ion thrusters \u2014 the same physics as the electric family, with far more power.', hl: ['pw', 'ppu', 'thrusters', 'beam'] }
          ],
          pros: ['Power independent of the Sun', 'High Isp electric propulsion at large scale', 'Long operating life'],
          cons: ['Low thrust \u2014 the same months-long burns as solar-electric', 'Huge radiators', 'Reactor in space: launch safety and policy'],
          used: 'The US flew one reactor (SNAP-10A, 1965); the USSR flew over thirty to power radar satellites. No flight has yet used nuclear-electric propulsion for a mission.',
          examples: [
            { name: 'SNAP-10A', veh: 'US test satellite (1965)', tag: 'Thermoelectric', stats: ['About 500 W electric from 30 kW of heat'], note: 'The only American reactor ever flown. It also briefly ran a small caesium ion thruster.' },
            { name: 'TOPAZ', veh: 'Soviet Kosmos satellites (1987)', tag: 'Thermionic', stats: ['About 5 kW electric'] },
            { name: 'Project Prometheus (JIMO)', veh: 'NASA Jupiter Icy Moons Orbiter study (cancelled 2005)', tag: 'Brayton', stats: ['About 200 kW electric planned'] }
          ]
        },
        {
          id: 'orion', name: 'Nuclear pulse propulsion (Orion)', short: 'Orion', level: 5, model: 'nuclear', kind: 'orion',
          idea: 'Throw small nuclear bombs out the back and ride the blasts on a giant steel plate.',
          intro: 'Of all the ideas in this atlas, this is the one that sounds like a joke and isn\u2019t. Project Orion (1958\u201365) studied a ship that drops a small nuclear explosive behind it every second or so. Each one blasts a slab of propellant into a thick steel pusher plate, and giant shock absorbers smooth the kicks into a steady push. It gets around every limit in this atlas at once: no chamber holds the explosion, so no material limits the temperature \u2014 and so it offers high thrust and high Isp together. Scientists including Freeman Dyson took it seriously. The 1963 Partial Test Ban Treaty ended it.',
          glance: [['Energy source', 'A sequence of small nuclear explosions'], ['Push delivered by', 'Steel pusher plate + shock absorbers'], ['Isp', '2,000\u20136,000 s (designs)'], ['Thrust', 'Meganewtons'], ['Status', 'Studied 1958\u201365; banned']],
          steps: [
            { t: 'The big picture', b: 'A ship, a magazine of pulse units, shock absorbers and a pusher plate. Press Next.', hl: [] },
            { t: 'Pulse units', b: 'Each unit is a small nuclear charge packed with a slab of propellant, designed to throw that slab backward toward the plate as a fast, flat jet.', hl: ['magazine'] },
            { t: 'The detonation', b: 'The unit detonates tens of metres behind the plate. The propellant slab \u2014 now a plasma at tens of kilometres per second \u2014 slams into it.', hl: ['pulse'] },
            { t: 'The pusher plate', b: 'The plate takes the hit. It survives because the contact lasts only a fraction of a millisecond; a thin layer of oil sprayed on its face ablates to protect it.', hl: ['plate'] },
            { t: 'Shock absorbers', b: 'Two stages of shock absorbers stretch each kick out over the time between pulses, so the crew feels a steady push of about one g.', hl: ['absorbers', 'ship'] }
          ],
          pros: ['High thrust and high Isp together \u2014 unique in this atlas', 'Could lift thousands of tonnes', 'Relies on no exotic unproven technology'],
          cons: ['Nuclear explosions: banned by treaty since 1963', 'Fallout if used in the atmosphere', 'Huge, heavy ship'],
          used: 'Never built. A small model flew in 1959 on conventional explosives (\u201CHot Rod\u201D).',
          examples: [
            { name: 'Orion (1958\u201365 studies)', veh: 'General Atomics, for ARPA and the US Air Force', tag: 'Illustrative', stats: ['Designs from about 100 to 10,000 t', 'Isp in the thousands of seconds'], note: 'The lab\u2019s defaults are illustrative values in the spirit of those studies.', set: { Y: 0.14, mu: 140, dt: 1.1, M: 4000, fc: 0.5 }, map: { F: 4e7, isp: 2500 }, approx: true, preset: true }
          ]
        }
      ],
      compare: { title: 'Nuclear options side by side', first: 'Concept', cols: ['What the reactor does', 'Isp', 'Thrust', 'Status'],
        rows: [{ id: 'ntr', cells: ['Heats hydrogen directly', '850\u2013950 s', 'High', 'Ground-tested'] }, { id: 'gascore', cells: ['Heats hydrogen with light from a uranium plasma', '1,500\u20135,000 s', 'High', 'Studies'] },
          { id: 'nep', cells: ['Makes electricity for thrusters', '2,000\u20139,000 s', 'Very low', 'Reactors flown; propulsion not'] }, { id: 'orion', cells: ['Nothing \u2014 explosions push a plate', '2,000\u20136,000 s', 'Very high', 'Studied; banned'] }] }
    },

    /* ================================================================ AIR-BREATHING & FRONTIER */
    {
      id: 'frontier', name: 'Air-breathing & frontier', kicker: 'Beyond the rocket', color: 'var(--atl-ox)',
      blurb: 'Take the oxygen from the air, ride a detonation wave, sail on sunlight \u2014 or harness fusion.',
      engines: [
        {
          id: 'ramjet', name: 'Ramjet', short: 'Ramjet', level: 2, model: 'frontier', kind: 'ramjet',
          idea: 'Fly fast enough and the air compresses itself. No moving parts at all.',
          intro: 'A jet engine\u2019s compressor squeezes air before burning fuel in it. At about three times the speed of sound you don\u2019t need one: simply slowing the incoming air down in a carefully shaped inlet compresses it as much as a turbine would. Burn fuel in that slowed air, blow it out a nozzle \u2014 that\u2019s a ramjet, a tube with no moving parts. And because it takes its oxygen from the atmosphere, it only carries fuel, so its Isp \u2014 counted per kilogram of propellant carried \u2014 is in the thousands of seconds. The catches: it makes no thrust at all standing still, and above about Mach 6 it strangles on its own heat.',
          glance: [['Oxygen from', 'The air'], ['Compression by', 'Slowing the air in the inlet'], ['Works from', 'About Mach 2 to Mach 5\u20136'], ['Isp', '1,000\u20132,000+ s (per kg of fuel)'], ['Moving parts', 'None']],
          labIntro: 'Press Accelerate to fly the ramjet from Mach 1.5 upward and watch where it comes alive and where it dies.',
          stageNote: 'Schematic, not to scale. Shock angles follow the flight Mach number.',
          steps: [
            { t: 'The big picture', b: 'An inlet with a central cone, a combustor, and a nozzle \u2014 all one tube. Press Next.', hl: [] },
            { t: 'Air arrives supersonic', b: 'The engine is flying at several times the speed of sound, so from its point of view air is rushing in at that speed.', hl: ['air'] },
            { t: 'Shock waves compress it', b: 'The cone makes an oblique shock that turns and compresses the air; a final normal shock slows it below the speed of sound. Slowing air down turns its speed into pressure and heat.', hl: ['inlet', 'shocks'] },
            { t: 'Burn', b: 'Fuel is sprayed in, and flameholders \u2014 V-shaped gutters \u2014 make sheltered eddies where the flame can survive in the fast flow.', hl: ['burner', 'fuel'] },
            { t: 'Expand', b: 'Hot gas speeds out through the nozzle faster than the air came in. The difference is thrust.', hl: ['nozzle'] },
            { t: 'Where it dies', b: 'Push past Mach 6 and slowing the air heats it so much there\u2019s no room left to add fuel energy \u2014 and the gas starts to fall apart. Press Accelerate and watch.', hl: ['burner', 'shocks'] }
          ],
          pros: ['No moving parts', 'Very high Isp: oxygen comes free from the air', 'Light and simple for sustained supersonic flight'],
          cons: ['No thrust at zero speed \u2014 needs a booster', 'Only works in a band of Mach numbers', 'Useless above the atmosphere'],
          used: 'Missiles (Bloodhound, BrahMos, Meteor), the D-21 reconnaissance drone and experimental aircraft.',
          usedTitle: 'Where it flies',
          examples: [
            { name: 'BrahMos', veh: 'Indian\u2013Russian cruise missile', tag: 'Liquid-fuel ramjet', stats: ['Cruises at about Mach 2.8', 'Solid rocket booster gets it up to speed'], note: 'The classic ramjet arrangement: something else to get going, the ramjet to cruise.' },
            { name: 'Lockheed D-21', veh: 'Reconnaissance drone (1960s)', tag: 'RJ43 ramjet', stats: ['About Mach 3.3 at about 27 km'] }
          ]
        },
        {
          id: 'scramjet', name: 'Scramjet', short: 'Scramjet', level: 4, model: 'frontier', kind: 'scramjet',
          idea: 'Keep the air supersonic even while burning in it \u2014 like lighting a match in a hurricane.',
          intro: 'A ramjet dies at high Mach numbers because slowing the air to subsonic speed heats it far too much. So don\u2019t slow it down that far. A supersonic-combustion ramjet \u2014 scramjet \u2014 lets the air through the engine at Mach 2 or 3, and burns fuel in that supersonic stream. The air passes through in about a millisecond, so injecting and mixing the fuel is like keeping a match lit in a hurricane. Hydrogen, which burns fastest, is the usual choice. The vehicle\u2019s underside is the engine: the nose is the inlet ramp and the tail is the nozzle.',
          glance: [['Oxygen from', 'The air'], ['Combustor flow', 'Supersonic (Mach 1.5\u20133.5)'], ['Works from', 'About Mach 5 to Mach 12+'], ['Fuel', 'Hydrogen or hydrocarbon'], ['Status', 'Brief flight tests']],
          labIntro: 'Press Accelerate and compare the scramjet with a ramjet across the Mach range. Try raising the combustor flow speed.',
          stageNote: 'Schematic, not to scale.',
          steps: [
            { t: 'The big picture', b: 'The whole underside of the vehicle is the engine. Press Next.', hl: [] },
            { t: 'The forebody is the inlet', b: 'The nose ramp makes a series of oblique shocks that compress the air \u2014 but leave it supersonic.', hl: ['inlet', 'shocks', 'air'] },
            { t: 'Supersonic combustion', b: 'Fuel is injected from struts or wall ports straight into air moving at Mach 2\u20133. It has about a thousandth of a second to mix and burn.', hl: ['burner', 'fuel'] },
            { t: 'Why supersonic helps', b: 'Fast-moving air is cooler air: less of its energy is heat. That leaves room to add fuel energy without exceeding what the walls and chemistry allow.', hl: ['burner'] },
            { t: 'The aftbody is the nozzle', b: 'The hot gas expands along the underside of the tail.', hl: ['nozzle'] }
          ],
          pros: ['Air-breathing at hypersonic speed', 'High Isp compared with rockets in that range', 'No moving parts'],
          cons: ['Must be boosted to about Mach 5 first', 'Very hard to ignite and sustain', 'Enormous heating of the whole vehicle'],
          used: 'Experimental flights: NASA X-43A (Mach 9.6, 2004), USAF X-51A (2013), HIFiRE and hypersonic missiles.',
          examples: [
            { name: 'X-43A', veh: 'NASA Hyper-X (2004)', tag: 'Hydrogen', stats: ['Mach 9.6 for about 10 s of powered flight'], note: 'Boosted by a Pegasus rocket, then flew under scramjet power for about ten seconds \u2014 the fastest air-breathing flight ever.' },
            { name: 'X-51A Waverider', veh: 'US Air Force (2013)', tag: 'JP-7 hydrocarbon', stats: ['Mach 5.1 \u00B7 about 210 s of powered flight'] }
          ]
        },
        {
          id: 'sabre', name: 'SABRE (precooled air-breathing rocket)', short: 'SABRE', level: 5, model: 'frontier', kind: 'sabre',
          idea: 'Breathe air through a jet engine up to Mach 5 \u2014 by chilling it to \u2212140 \u00B0C in a hundredth of a second \u2014 then switch to rocket mode.',
          intro: 'Ramjets can\u2019t start from zero; rockets carry all their oxygen; jet engines melt above Mach 3. SABRE \u2014 the Synergetic Air-Breathing Rocket Engine \u2014 tried to be all three. Its trick is a precooler: thousands of hair-thin tubes carrying cold helium that chill incoming air from over 1,000 \u00B0C to about \u2212140 \u00B0C in a hundredth of a second, without the moisture in the air freezing onto them. Cold air is easy to compress, so an ordinary turbocompressor squeezes it straight into rocket combustion chambers. Near Mach 5.4 the intake closes and the same chambers burn onboard liquid oxygen. Reaction Engines tested the precooler at Mach 5 conditions in 2019 but went into administration in 2024.',
          glance: [['Air-breathing to', 'About Mach 5.4, 28 km'], ['Then', 'Rocket mode on LOX'], ['Key technology', 'Precooler'], ['Design Isp', 'About 3,500 s (air), 460 s (rocket)'], ['Status', 'Precooler tested; engine never built']],
          labIntro: 'Press Fly to orbit. Watch the precooler\u2019s load and hydrogen demand climb until rocket mode takes over.',
          steps: [
            { t: 'The big picture', b: 'An intake, a precooler, a compressor, combustion chambers and nozzles \u2014 plus tanks of hydrogen and oxygen. Press Next.', hl: [] },
            { t: 'The intake', b: 'A moving cone slows the incoming supersonic air \u2014 which heats it, to over 1,000 \u00B0C at Mach 5.', hl: ['intake', 'air'] },
            { t: 'The precooler', b: 'The heart of SABRE. Helium in thousands of thin tubes chills the air in a hundredth of a second. A methanol-injection trick keeps frost from blocking it.', hl: ['precooler', 'heloop'] },
            { t: 'Compress', b: 'The cold, dense air is easy to compress. A turbocompressor squeezes it to about 140 bar \u2014 rocket-chamber pressure.', hl: ['comp'] },
            { t: 'Hydrogen: fuel and coolant', b: 'The helium loop dumps its heat into the liquid hydrogen fuel on its way to the chambers. Hydrogen\u2019s huge heat capacity is what makes the whole scheme possible.', hl: ['h2', 'heloop'] },
            { t: 'Rocket mode', b: 'Above Mach 5.4, the intake closes and liquid oxygen feeds the same chambers \u2014 now a pure rocket for the final push to orbit.', hl: ['lox', 'chamber', 'nozzle'] }
          ],
          pros: ['One engine from runway to orbit', 'Very high Isp in air-breathing mode', 'Enabled a single-stage-to-orbit spaceplane concept (Skylon)'],
          cons: ['Enormously complex', 'Carries both air-breathing and rocket hardware', 'Never built as a complete engine'],
          used: 'Designed for the Skylon spaceplane. Precooler technology tested; development stopped in 2024.',
          examples: [
            { name: 'SABRE (Skylon design)', veh: 'Reaction Engines (UK)', tag: 'LH\u2082 / air, then LOX', stats: ['About 2 MN per engine (design)', 'About 3,500 s air-breathing (design)'], note: 'Design figures. The idealised model here is deliberately simple and lands above that at low Mach \u2014 real inlet, precooler and cycle losses are large.', pub: { text: 'Published design targets: about 2 MN of thrust per engine and an air-breathing Isp around 3,500 s, falling to about 460 s in rocket mode. The lab is an idealised cycle, meant to show why the precooler sets the switch-over, not to reproduce those numbers.' }, map: { F: 2e6, isp: 3500, air: true }, approx: true, set: { M: 4 }, preset: true }
          ]
        },
        {
          id: 'rde', name: 'Rotating detonation engine', short: 'Detonation', level: 4, model: 'frontier', kind: 'rde',
          idea: 'Instead of a steady flame, a detonation wave races around a ring thousands of times a second.',
          intro: 'Every other engine in this atlas burns its propellant in a flame \u2014 a deflagration, travelling at metres per second. A detonation is different: a combustion front locked to a shock wave, tearing through the mixture at two to three kilometres per second, and compressing it as it burns. In a rotating detonation engine, propellant is injected into a thin ring-shaped channel, and one or more detonation waves chase each other around it thousands of times a second, each one burning the fresh mixture injected since the last pass. The gain: the burned gas ends up at higher pressure than it was injected at \u2014 more performance from simpler, lower-pressure plumbing.',
          glance: [['Combustion', 'Detonation (supersonic)'], ['Chamber', 'Thin annulus'], ['Wave speed', '2\u20133 km/s'], ['Frequency', 'Thousands of laps per second'], ['Status', 'First flights 2021\u201325']],
          steps: [
            { t: 'The big picture', b: 'Fuel and oxidiser feed a ring-shaped chamber where a detonation wave circles endlessly. Press Next.', hl: [] },
            { t: 'Inject into the ring', b: 'Propellants are injected continuously into the thin annulus through hundreds of small holes.', hl: ['ftank', 'otank', 'pf', 'po', 'annulus'] },
            { t: 'The detonation wave', b: 'A wave of shock-plus-combustion runs around the ring at about 2.4 km/s, burning the fresh mixture ahead of it. Behind it, fresh propellant refills the channel before the wave comes round again.', hl: ['wave'] },
            { t: 'Pressure gain', b: 'Because the detonation compresses as it burns, the products are at higher pressure than the injection pressure \u2014 something an ordinary flame can never do.', hl: ['side', 'wave'] },
            { t: 'Out', b: 'The gas expands along a central plug and leaves. The chamber is short \u2014 much shorter than a conventional one.', hl: ['plug', 'plume'] }
          ],
          pros: ['Pressure gain: better performance from lower feed pressure', 'Very short, compact chamber', 'Few moving parts'],
          cons: ['Intense, unsteady heat loads', 'Hard to control the number and stability of waves', 'Real-world gains still being measured'],
          used: 'JAXA flew one on a sounding rocket in 2021; NASA hot-fired large versions in 2022\u201324; Venus Aerospace flew one in 2025.',
          examples: [
            { name: 'JAXA S-520-31', veh: 'Sounding rocket (2021)', tag: 'Methane / oxygen', stats: ['About 500 N, first detonation engine in space'] },
            { name: 'NASA RDRE', veh: 'Marshall Space Flight Center tests', tag: 'Hydrogen / oxygen', stats: ['Over 20 kN in ground tests'] }
          ]
        },
        {
          id: 'solarth', name: 'Solar thermal rocket', short: 'Solar thermal', level: 3, model: 'frontier', kind: 'solarth',
          idea: 'Focus sunlight with a mirror to heat hydrogen \u2014 a nuclear thermal rocket powered by the Sun.',
          intro: 'Why carry a reactor when the Sun is a free one? A solar thermal rocket uses a large, light mirror to concentrate sunlight onto an absorber cavity \u2014 a block of refractory metal glowing at over 2,000 K \u2014 and runs hydrogen through it. Like a nuclear thermal rocket there\u2019s no combustion, so the exhaust can be pure hydrogen, and the Isp is about 800\u2013900 s. The catch: sunlight is diffuse, so the power \u2014 and the thrust \u2014 is small, and it fades as you move away from the Sun.',
          glance: [['Heat source', 'Concentrated sunlight'], ['Propellant', 'Hydrogen'], ['Temperature', '2,000\u20133,000 K'], ['Isp', '700\u2013900 s'], ['Status', 'Ground-tested']],
          steps: [
            { t: 'The big picture', b: 'Sunlight, a mirror, a hot cavity and a nozzle. Press Next.', hl: [] },
            { t: 'Collect sunlight', b: 'At Earth\u2019s distance, each square metre facing the Sun gets 1,361 watts. A big mirror gathers a lot of square metres.', hl: ['sun', 'rays', 'mirror'] },
            { t: 'The absorber', b: 'The mirror focuses light into a cavity of tungsten or rhenium that heats to thousands of kelvin.', hl: ['absorber'] },
            { t: 'Hydrogen through the heat', b: 'Hydrogen flows through the hot cavity and out the nozzle \u2014 pure, light, hot exhaust.', hl: ['tank', 'p-h2', 'nozzle', 'plume'] }
          ],
          pros: ['About twice chemical Isp without a reactor', 'No combustion; simple in principle'],
          cons: ['Low thrust', 'Big, delicate mirrors', 'Fades with distance from the Sun; no thrust in shadow', 'Hydrogen storage'],
          used: 'Ground-tested for orbital transfer stages (US Air Force ISUS, 1990s). Not yet flown.',
          examples: [
            { name: 'ISUS', veh: 'US Air Force Integrated Solar Upper Stage', tag: 'Ground tests (1990s)', stats: ['Absorber also stored heat for thrust in shadow'] }
          ]
        },
        {
          id: 'sail', name: 'Solar sail', short: 'Solar sail', level: 2, model: 'frontier', kind: 'sail',
          idea: 'Light carries momentum. Bounce sunlight off a huge mirror and it pushes you \u2014 forever, for free.',
          intro: 'Every photon carries a little momentum, even though it has no mass. When sunlight hits a surface it pushes, and when it bounces off a mirror it pushes twice \u2014 once on arrival, once on departure. At Earth\u2019s distance that push is about 9 micronewtons per square metre: an insect\u2019s weight spread over a room. So you build a sail of plastic film thinner than a human hair, coated with aluminium, tens of metres across, on a spacecraft of a few kilograms. The acceleration is tiny, but it never stops, and it needs no propellant at all. Tilt the sail and you can steer \u2014 spiralling in toward the Sun or out away from it.',
          glance: [['Pushed by', 'Sunlight (radiation pressure)'], ['Propellant', 'None'], ['Force at 1 AU', '\u2248 9 \u00B5N per m\u00B2 (perfect mirror)'], ['Isp', 'Infinite \u2014 no propellant'], ['Status', 'Flown (IKAROS, LightSail 2, ACS3)']],
          labIntro: 'Size the sail and the spacecraft. Tilt it to see the push fall off, and move closer to the Sun to see it grow.',
          steps: [
            { t: 'The big picture', b: 'The Sun, a mirror-thin sail, and a small spacecraft. Press Next.', hl: [] },
            { t: 'Light has momentum', b: 'A photon of energy E carries momentum E/c. Sunlight at Earth delivers 1,361 watts per square metre, and dividing by the speed of light gives a pressure of about 4.5 micronewtons per square metre.', hl: ['sun', 'light'] },
            { t: 'Reflect it for a double push', b: 'Absorbed light gives one push; reflected light gives two. That\u2019s why sails are mirrors.', hl: ['sail', 'reflect'] },
            { t: 'Tilt to steer', b: 'Tilt the sail and the push swings away from the Sun line \u2014 letting you speed up or slow down along your orbit. The price is less total push. Try the tilt slider.', hl: ['sail', 'force'] }
          ],
          pros: ['No propellant \u2014 unlimited operating time', 'Very simple once deployed', 'Can reach speeds no chemical rocket could'],
          cons: ['Tiny acceleration', 'Enormous, fragile structures to deploy', 'Push fades with distance from the Sun'],
          used: 'JAXA\u2019s IKAROS (2010), The Planetary Society\u2019s LightSail 2 (2019) and NASA\u2019s ACS3 (2024).',
          examples: [
            { name: 'IKAROS', veh: 'JAXA (2010, to Venus)', tag: '196 m\u00B2 \u00B7 310 kg', stats: ['Measured about 1.12 mN'], note: 'The first interplanetary solar sail. Part of its area was covered in thin-film solar cells and steering panels, which reflect less than bare aluminium.', set: { side: 14, mass: 310, r: 1, th: 0, refl: 0.6 }, pub: { key: 'F', val: 1.12, unit: 'mN', label: 'thrust', note: 'Real sails wrinkle and sag, which scatters light in unhelpful directions.' }, preset: true },
            { name: 'LightSail 2', veh: 'The Planetary Society (2019)', tag: '32 m\u00B2 \u00B7 5 kg', stats: ['Raised its orbit using sunlight alone'], set: { side: 5.66, mass: 5, r: 1, th: 0, refl: 0.9 }, pub: { text: 'LightSail 2 demonstrated controlled orbit raising in Earth orbit \u2014 tilting its sail edge-on for half of every orbit and face-on for the other half. Atmospheric drag eventually won and it re-entered in 2022.' }, preset: true }
          ]
        },
        {
          id: 'fusion', name: 'Fusion rocket', short: 'Fusion', level: 5, model: 'frontier', kind: 'fusion',
          idea: 'Fuse light nuclei in a magnetic bottle and let the products out the back at a few per cent of light speed.',
          intro: 'Fusion releases about four times more energy per kilogram than fission, and a million times more than chemistry. A fusion rocket confines a plasma of deuterium and helium-3 (or deuterium and tritium) at hundreds of millions of degrees in a magnetic field, and lets the reaction products \u2014 or propellant heated by them \u2014 escape through a magnetic nozzle. Exhaust speeds could reach thousands of kilometres per second. The catch is the obvious one: nobody has yet made a fusion reactor produce more power than it consumes on a sustained basis, let alone one light enough to fly.',
          glance: [['Energy source', 'Nuclear fusion'], ['Fuel', 'Deuterium + helium-3 or tritium'], ['Exhaust speed', 'Up to thousands of km/s'], ['Isp', '10,000\u20131,000,000 s'], ['Status', 'Concepts only']],
          steps: [
            { t: 'The big picture', b: 'Fuel in, a magnetically confined fusing plasma, a magnetic nozzle. Press Next.', hl: [] },
            { t: 'Fuel', b: 'Deuterium and helium-3 are favoured: the reaction gives mostly charged particles, which magnetic fields can steer, and few neutrons.', hl: ['tank', 'p-fuel'] },
            { t: 'The magnetic bottle', b: 'Rings of magnets confine a plasma hotter than the Sun\u2019s core, never letting it touch a wall.', hl: ['coils', 'plasma'] },
            { t: 'Magnetic nozzle', b: 'At one end the field opens up. Fusion products \u2014 and any extra propellant they heat \u2014 stream out along the flaring field lines.', hl: ['mnozzle', 'beam'] }
          ],
          pros: ['Enormous Isp at useful thrust', 'Could make the outer solar system weeks away'],
          cons: ['Net-energy fusion not yet achieved in a flyable form', 'Helium-3 is rare on Earth', 'Massive magnets and radiators'],
          used: 'Studies: Project Daedalus (British Interplanetary Society, 1978), Direct Fusion Drive (Princeton Satellite Systems) and others.',
          examples: [
            { name: 'Project Daedalus', veh: 'British Interplanetary Society study (1978)', tag: 'D\u2013\u00B3He pulsed fusion', stats: ['First stage about 7.5 MN \u00B7 exhaust about 10,000 km/s'], note: 'An uncrewed probe to Barnard\u2019s Star, fifty years away at 12% of light speed.', map: { F: 7.5e6, isp: 1e6 }, approx: true },
            { name: 'Direct Fusion Drive', veh: 'Princeton Satellite Systems concept', tag: 'D\u2013\u00B3He, steady', stats: ['1\u201310 MW class \u00B7 Isp around 10,000 s'] }
          ]
        }
      ],
      compare: { title: 'Beyond the rocket, side by side', first: 'Concept', cols: ['Energy from', 'Carries its oxidiser?', 'Isp', 'Status'],
        rows: [{ id: 'ramjet', cells: ['Fuel + air', 'No', '1,000\u20132,000 s', 'Flying (missiles)'] }, { id: 'scramjet', cells: ['Fuel + air', 'No', '1,000\u20133,000 s', 'Flight tests'] }, { id: 'sabre', cells: ['Hydrogen + air, then LOX', 'Only for the last stretch', '\u22483,500 s / 460 s', 'Components tested'] },
          { id: 'rde', cells: ['Detonation of propellants', 'Yes', 'Chemical + a few %', 'Early flights'] }, { id: 'solarth', cells: ['Sunlight', 'No oxidiser needed', '700\u2013900 s', 'Ground tests'] }, { id: 'sail', cells: ['Sunlight\u2019s momentum', 'No propellant at all', '\u221E', 'Flown'] },
          { id: 'fusion', cells: ['Fusion', 'No oxidiser needed', '10\u2074\u201310\u2076 s', 'Concepts'] }] }
    }
  ];
})();
