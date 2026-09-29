/* Engine atlas \u2014 data.
   Every engine is described as parts (tanks, pumps, turbines, combustors\u2026) and pipes
   in one shared 1120\u00d7540 coordinate space; atlas.js draws and animates them.
   Strings use double quotes throughout so apostrophes in the prose are safe. */
(function () {
  "use strict";

  /* ---------- shared parts ---------- */
  var FT = { id: "ftank", type: "tank", side: "fuel", x: 24, y: 36, w: 128, h: 150 };
  var OT = { id: "otank", type: "tank", side: "ox", x: 24, y: 354, w: 128, h: 150 };
  var FP = { id: "fpump", type: "pump", x: 300, y: 100, r: 30, label: "FUEL PUMP", lx: 300, ly: 56, la: "middle" };
  var OP = { id: "opump", type: "pump", x: 300, y: 440, r: 30, label: "OXIDISER PUMP", lx: 300, ly: 496, la: "middle" };
  var TU = { id: "turb", type: "turbine", x: 300, y: 270, r: 34, label: "TURBINE", lx: 300, ly: 326, la: "middle" };
  var SHAFT1 = { id: "shaft", type: "shaft", segs: [[300, 100, 440]] };
  var DUMP = { id: "dump", type: "dump", x: 470, y: 270, label: "DUMPED", label2: "OVERBOARD", lx: 494, ly: 300 };

  /* ---------- shared pipes ---------- */
  function P(id, fl, w, pts) { return { id: id, fl: fl, w: w, pts: pts }; }
  var F_IN = P("pf-in", "fuel", 5, [[152, 100], [270, 100]]);
  var O_IN = P("po-in", "ox", 5, [[152, 440], [270, 440]]);
  var F_MAIN = P("pf-main", "fuel", 5, [[330, 100], [776, 100], [776, 236]]);
  var J_INJ = P("pj-inj", "fuel", 5, [[640, 202], [628, 205], [622, 213]]);
  var O_MAIN = P("po-main", "ox", 5, [[330, 440], [622, 440], [622, 326]]);
  function fBranch(w) { return P("pf-br", "fuel", w, [[360, 100], [360, 180], [208, 180], [208, 246]]); }
  function oBranch(w) { return P("po-br", "ox", w, [[360, 440], [360, 360], [208, 360], [208, 294]]); }
  function toTurb(fl) { return P("ph-tu", fl, 5, [[248, 270], [266, 270]]); }
  function turbToInj(id, fl) { return P(id, fl, 6, [[334, 270], [596, 270]]); }
  function turbToDump(id, fl) { return P(id, fl, 4, [[334, 270], [462, 270]]); }
  var V_TU = P("pv-tu", "vap", 5, [[640, 202], [640, 150], [236, 150], [236, 270], [266, 270]]);

  window.ATLAS = {
    eta: { cstar: 0.98, nozzle: 0.985 },

    /* Thermochemistry, simplified: combustion temperature Tc (K) and product molar mass M
       (kg/kmol) tabulated against mixture ratio, plus one effective gamma per propellant
       fitted so the model reproduces 18 real engines (mean error ~1.4%). */
    props: {
      lh2: { name: "LOX / LH\u2082", short: "Hydrolox", fuel: "LH\u2082", fuelLong: "liquid hydrogen", ox: "LOX", oxLong: "liquid oxygen",
        Tf: 20, To: 90, g: 1.162, of: [3.5, 8], ofNom: 6.0, tj: 220, tpb: 950,
        tab: [[4, 2950, 10.0], [5, 3250, 11.8], [6, 3450, 13.5], [7, 3550, 15.0], [8, 3560, 16.5]] },
      ch4: { name: "LOX / CH\u2084", short: "Methalox", fuel: "CH\u2084", fuelLong: "liquid methane", ox: "LOX", oxLong: "liquid oxygen",
        Tf: 111, To: 90, g: 1.132, of: [2.6, 4.2], ofNom: 3.6, tj: 380, tpb: 1000,
        tab: [[2.6, 3240, 19.3], [3.0, 3420, 20.6], [3.4, 3540, 21.8], [3.8, 3590, 22.9], [4.2, 3570, 24.0]] },
      rp1: { name: "LOX / RP-1", short: "Kerolox", fuel: "RP-1", fuelLong: "RP-1 kerosene", ox: "LOX", oxLong: "liquid oxygen",
        Tf: 290, To: 90, g: 1.164, of: [2.0, 3.4], ofNom: 2.6, tj: 450, tpb: 1050,
        tab: [[2.0, 3300, 20.5], [2.3, 3500, 22.0], [2.6, 3600, 23.5], [3.0, 3650, 25.0], [3.4, 3600, 26.5]] },
      hyp: { name: "N\u2082O\u2084 / MMH", short: "Hypergolic", fuel: "MMH", fuelLong: "monomethylhydrazine", ox: "N\u2082O\u2084", oxLong: "nitrogen tetroxide",
        Tf: 290, To: 290, g: 1.21, of: [1.4, 2.7], ofNom: 1.65, tj: 380, tpb: 900,
        tab: [[1.4, 3000, 20.0], [1.65, 3150, 21.5], [2.0, 3250, 23.0], [2.3, 3280, 24.0], [2.7, 3200, 25.0]] }
    },

    fluids: {
      fuel: "Fuel (liquid)", ox: "Oxidiser (liquid)", hotf: "Fuel-rich hot gas", hoto: "Oxygen-rich hot gas",
      vap: "Heated fuel gas", press: "Helium pressurant", elec: "Electric power"
    },

    engines: [
      /* ======================================================= 1 */
      {
        id: "pf", name: "Pressure-fed", short: "Pressure-fed", level: 1,
        idea: "No pumps at all. Squeeze the tanks hard enough and the propellant has nowhere to go but into the chamber.",
        intro: "This is the simplest liquid rocket engine there is, and the one you trust when failure is not an option. A bottle of very high-pressure helium pushes on both propellant tanks, and that pressure alone drives the propellant into the chamber. The catch is brutal and simple: to push propellant into a chamber at some pressure, the tank has to sit at an even higher pressure \u2014 so the tanks must be thick, strong and heavy. That caps the chamber pressure low, which is why you find this engine on spacecraft, not on the first stage of a rocket.",
        glance: { drive: "Nothing \u2014 there is no turbine", exhaust: "\u2014", cooling: "Ablative liner", pc: "5\u201325 bar", penalty: "None, but heavy tanks" },
        pc: { min: 3, max: 70, nom: 8.6, why: "Tank wall thickness \u2014 and so tank mass \u2014 grows in step with tank pressure, and the tank must sit above chamber pressure. Past roughly 20 bar the tanks start to weigh more than the performance is worth, which is why every large booster uses pumps. Crew Dragon's SuperDraco reaches about 69 bar only because its tanks are small." },
        eps: 55, dt: 15, alt: 100, prop: "hyp",
        props: { hyp: true, rp1: true, ch4: true, lh2: true },
        open: null, st: "pf", chamber: { regen: false, ablative: true },
        parts: [FT, OT,
          { id: "he", type: "sphere", x: 88, y: 270, r: 30, label: "HELIUM", label2: "~300 bar", lx: 126, ly: 266 },
          { id: "vf", type: "valve", x: 400, y: 100, label: "VALVE", lx: 400, ly: 82 },
          { id: "vo", type: "valve", x: 400, y: 440, label: "VALVE", lx: 400, ly: 470 }],
        pipes: [
          P("pp-f", "press", 3, [[88, 240], [88, 186]]),
          P("pp-o", "press", 3, [[88, 300], [88, 354]]),
          P("pf-feed", "fuel", 4, [[152, 100], [560, 100], [560, 213], [622, 213]]),
          P("po-feed", "ox", 4, [[152, 440], [622, 440], [622, 326]])],
        steps: [
          { t: "The big picture", b: "Follow the arrows: helium pushes, propellant flows, fire comes out. There isn't a single moving part except two valves. Press Next to follow a molecule through it.", hl: [] },
          { t: "A bottle of helium", b: "Everything starts here \u2014 a sphere of helium at about 300 times atmospheric pressure. Why helium? It's inert, it's light, and it stays a gas even while touching propellant cold enough to liquefy air.", hl: ["he", "pp-f", "pp-o"] },
          { t: "Tanks under pressure", b: "The helium pushes down on the propellant in each tank. Here's the whole trick, and the whole problem: to shove liquid into a chamber at, say, 9 bar, the tank itself must be held above 9 bar. Strong tanks are thick tanks, and thick tanks are heavy.", hl: ["ftank", "otank", "pp-f", "pp-o"] },
          { t: "Open the valves", b: "Open two valves and the propellant simply flows. Want less thrust? Close them a little. With no spinning machinery, almost nothing can go wrong \u2014 which is exactly why this is the engine you put on a spacecraft that has to fire after sitting in orbit for years.", hl: ["vf", "vo", "pf-feed", "po-feed"] },
          { t: "The injector", b: "Fuel and oxidiser arrive at the injector \u2014 a plate drilled with hundreds of small holes, aimed so the jets smash into each other and break into a fine mist. Good mixing here is most of what makes an engine efficient.", hl: ["inj", "pf-feed", "po-feed"] },
          { t: "Fire without a spark", b: "With hypergolic propellants, the moment fuel touches oxidiser it bursts into flame. No igniter, no spark plug \u2014 ignition that physically can't fail to happen. That's why these nasty, toxic chemicals are still flown.", hl: ["chamber"] },
          { t: "A wall that burns away on purpose", b: "Nothing circulates to cool the chamber wall. Instead it's lined with an ablative \u2014 a material that chars and slowly erodes, carrying heat away as it goes. A heat shield on the inside of the engine.", hl: ["chamber", "nozzle"] },
          { t: "A big, lazy nozzle", b: "Low chamber pressure means the gas can't be expanded very hard, so these engines need large nozzles to be efficient. In vacuum, where they live, that's fine. Drag the altitude slider in the lab to sea level and watch what happens to the flow.", hl: ["nozzle", "plume"] }
        ],
        pros: ["Fewest parts of any liquid engine \u2014 nothing spins", "Restarts as many times as you like, and throttles by valve position", "Hypergolic versions ignite on contact: no igniter to fail"],
        cons: ["Tank pressure must exceed chamber pressure, so tanks are heavy", "Chamber pressure capped low \u2014 typically 5\u201325 bar", "Needs a big nozzle; poor thrust for its size"],
        used: "Orbital manoeuvring, landers, capsule abort systems and satellite thrusters.",
        examples: [
          { name: "AJ10-190", veh: "Space Shuttle orbital manoeuvring engine", prop: "hyp", pc: 8.62, of: 1.65, eps: 55, thrust: { vac: 26.7 }, isp: { vac: 316 }, preset: true },
          { name: "AJ10-137", veh: "Apollo Service Module main engine", prop: "hyp", pc: 6.9, of: 2.0, eps: 62.5, thrust: { vac: 91.2 }, isp: { vac: 314 }, preset: true, note: "Flew on Aerozine 50 rather than MMH; the model uses its MMH table as a close stand-in." },
          { name: "SuperDraco", veh: "Crew Dragon launch abort", prop: "hyp", thrust: { sl: 71 }, isp: { sl: 235 }, note: "Runs at about 69 bar \u2014 unusually high for a pressure-fed engine. Mixture ratio and nozzle size aren't published, so it can't be loaded." },
          { name: "Draco", veh: "Dragon manoeuvring thrusters", prop: "hyp", thrust: { vac: 0.4 }, isp: { vac: 300 } }
        ]
      },

      /* ======================================================= 2 */
      {
        id: "elec", name: "Electric pump-fed", short: "Electric pump", level: 2,
        idea: "Replace the turbine with a battery. Electric motors spin the pumps, and the only fire in the engine is in the chamber.",
        intro: "Pumps solve the heavy-tank problem: keep the tanks at a few bar and let a pump raise the pressure. But a pump needs power, and every other pumped cycle on this page gets it by burning propellant. Rocket Lab's Rutherford engine asked a disarmingly simple question \u2014 why not just use a battery? Brushless motors spin the pumps, a computer sets their speed, and there's no hot gas anywhere except the chamber. It works beautifully, right up until you do the arithmetic on batteries.",
        glance: { drive: "Battery-powered electric motors", exhaust: "\u2014", cooling: "Regenerative (fuel in the walls)", pc: "Modest \u2014 tens of bar", penalty: "None, but battery mass" },
        pc: { min: 5, max: 40, nom: 20, why: "Pump power is flow multiplied by pressure rise. Double the chamber pressure and you double the power the motors must supply \u2014 and the battery mass with it. A lithium battery stores only about a tenth of the energy per kilogram that burning propellant releases, so electric pumps stay at modest pressures and small sizes." },
        eps: 4, dt: 10, alt: 0, prop: "rp1",
        props: { rp1: true, ch4: true, lh2: true, hyp: true },
        open: null, st: "elec", chamber: { regen: true },
        parts: [FT, OT, FP, OP,
          { id: "shaft", type: "shaft", segs: [[300, 100, 190], [300, 350, 440]] },
          { id: "mf", type: "motor", x: 300, y: 190, label: "MOTOR", lx: 330, ly: 194 },
          { id: "mo", type: "motor", x: 300, y: 350, label: "MOTOR", lx: 330, ly: 354 },
          { id: "batt", type: "battery", x: 208, y: 270 }],
        pipes: [F_IN, O_IN, F_MAIN, J_INJ, O_MAIN,
          P("pw-f", "elec", 2, [[208, 248], [208, 190], [278, 190]]),
          P("pw-o", "elec", 2, [[208, 292], [208, 350], [278, 350]])],
        steps: [
          { t: "The big picture", b: "Two tanks, two pumps, two motors, one battery. Notice what's missing: there is no second fire anywhere. Press Next.", hl: [] },
          { t: "Tanks at a relaxed pressure", b: "Because pumps do the heavy lifting, the tanks only need a few bar \u2014 just enough to stop the pumps sucking vapour. Thin walls, light tanks. That's the whole point of pumps.", hl: ["ftank", "otank", "pf-in", "po-in"] },
          { t: "The battery", b: "Here's the twist. Instead of burning propellant to make power, we carry it: a lithium battery pack. Electron's second stage even throws away spent battery packs mid-flight, just to stop carrying dead weight.", hl: ["batt", "pw-f", "pw-o"] },
          { t: "Motors instead of turbines", b: "Brushless electric motors spin each pump at tens of thousands of rpm. Throttling is just changing motor speed \u2014 a computer can do it in milliseconds, with no hot plumbing to wait for.", hl: ["mf", "mo", "pw-f", "pw-o", "shaft"] },
          { t: "The pumps", b: "Each pump takes propellant from a few bar to well above chamber pressure. Same job as in the big engines \u2014 only the power source is different.", hl: ["fpump", "opump", "pf-main", "po-main"] },
          { t: "Cooling with the fuel", b: "On its way to the injector, the fuel runs through channels in the chamber wall. The coldest thing in the engine flows past the hottest, soaking up heat so the metal doesn't melt. That's regenerative cooling \u2014 the heat isn't lost, it goes back into the fuel.", hl: ["jacket", "pf-main", "pj-inj"] },
          { t: "Injector and chamber", b: "Fuel and oxidiser meet at the injector and burn. Everything upstream existed just to deliver them here at the right pressure.", hl: ["inj", "chamber", "pj-inj", "po-main"] },
          { t: "Why big engines don't do this", b: "Do the arithmetic. The Space Shuttle main engine's high-pressure fuel pump alone drew about 50 megawatts. Running that from batteries for an eight-minute burn would take something like 25 tonnes of batteries \u2014 around eight times the mass of the whole engine. Electric pumps are wonderful, but only when small.", hl: ["batt", "mf", "mo"] }
        ],
        pros: ["Mechanically simple \u2014 no preburner, no hot turbine", "Fast, precise throttling by motor speed", "Cheap to build and well suited to 3D printing"],
        cons: ["Battery mass grows with power and burn time", "Only practical for small engines", "Spent batteries are dead weight \u2014 hence dropping them"],
        used: "Small launch vehicles.",
        examples: [
          { name: "Rutherford Vacuum", veh: "Electron second stage (Rocket Lab)", prop: "rp1", thrust: { vac: 25.8 }, isp: { vac: 343 }, note: "The vacuum-optimised variant, with a larger nozzle. The first-stage Rutherford is usually quoted at around 311 s. Chamber pressure isn't published, so neither can be loaded into the lab." }
        ]
      },

      /* ======================================================= 3 */
      {
        id: "gg", name: "Gas generator", short: "Gas generator", level: 3,
        idea: "Burn a little propellant on the side just to spin the turbine \u2014 then throw that exhaust away.",
        intro: "The workhorse. Many of the big boosters in history \u2014 Saturn V's F-1, Falcon 9's Merlin, Delta IV's RS-68 \u2014 use this cycle. A small side combustor, the gas generator, burns a trickle of propellant deliberately far too rich in fuel, so it runs cool enough not to melt the turbine blades. The hot gas spins the turbine, the turbine spins the pumps, and then \u2014 here's the part that should bother you \u2014 the gas is simply dumped overboard. A few percent of everything you carried, thrown away to pay for the pumping.",
        glance: { drive: "A small, fuel-rich gas generator", exhaust: "Dumped overboard", cooling: "Regenerative", pc: "50\u2013120 bar", penalty: "1\u20134% of Isp" },
        pc: { min: 20, max: 150, nom: 97, why: "More chamber pressure needs more pump power, which means more gas through the generator \u2014 and all of it is thrown away. Push this slider up and watch the dumped fraction grow in the results. Somewhere around 100\u2013120 bar the waste stops being worth it, and engineers switch to a closed cycle." },
        eps: 16, dt: 25, alt: 0, prop: "rp1",
        props: { rp1: true, lh2: true, ch4: true, hyp: true },
        open: { f0: 0.030, pref: 100, k: 0.35 }, st: "gg", chamber: { regen: true },
        parts: [FT, OT, SHAFT1, FP, OP, TU,
          { id: "gg", type: "comb", x: 208, y: 270, fl: "hotf", label: "GAS", label2: "GENERATOR" }, DUMP],
        pipes: [F_IN, O_IN, F_MAIN, J_INJ, O_MAIN, fBranch(3), oBranch(3), toTurb("hotf"), turbToDump("ph-dump", "hotf")],
        steps: [
          { t: "The big picture", b: "One shaft, one turbine, two pumps \u2014 and a second, smaller fire off to the side. Watch where that side fire's exhaust ends up. Press Next.", hl: [] },
          { t: "Low-pressure tanks, high-pressure pumps", b: "Propellant leaves the tanks at a few bar and hits the pumps. Everything downstream depends on those pumps raising it far above chamber pressure.", hl: ["ftank", "otank", "pf-in", "po-in", "fpump", "opump"] },
          { t: "One shaft", b: "Fuel pump, turbine and oxidiser pump all sit on one shaft, spinning together at tens of thousands of rpm. Whatever power the turbine makes, the pumps consume.", hl: ["shaft", "turb", "fpump", "opump"] },
          { t: "The gas generator", b: "A small side combustor takes a trickle of both propellants \u2014 but with far too much fuel. Burning fuel-rich keeps the gas at roughly 900\u20131,100 K instead of 3,500 K. Turbine blades can survive that; they could never survive the main chamber.", hl: ["gg", "pf-br", "po-br"] },
          { t: "Spinning the turbine", b: "The hot gas rushes through the turbine blades and spins the shaft. That's the entire purpose of the gas generator: turn a little chemical energy into shaft power.", hl: ["gg", "ph-tu", "turb", "shaft"] },
          { t: "Thrown away", b: "And then we dump it. The dark exhaust pipe on the side of a Merlin is this gas \u2014 a few percent of the propellant, burned at the wrong mixture and blown overboard for very little thrust. It works, it's simple, and it's wasteful.", hl: ["turb", "ph-dump", "dump"] },
          { t: "The main flow", b: "Meanwhile nearly all the fuel runs through the chamber walls to cool them, then into the injector alongside the oxidiser.", hl: ["pf-main", "jacket", "pj-inj", "po-main", "inj"] },
          { t: "The chamber", b: "Here's where the real thrust is made, at around 100 bar. Try the chamber-pressure slider in the lab: Isp goes up, but so does the dumped fraction. That tug-of-war is the whole story of this cycle.", hl: ["chamber", "nozzle", "plume"] }
        ],
        pros: ["Simple and forgiving, with decades of flight experience", "The turbine is decoupled from the chamber, so starting is easy", "Pumps only need to exceed chamber pressure by a modest margin"],
        cons: ["Wastes 1\u20135% of the propellant flow, costing a few percent of Isp", "Practical ceiling around 100\u2013120 bar chamber pressure", "Kerosene versions deposit soot in the turbine \u2014 a headache for reuse"],
        used: "Boosters and upper stages: Saturn V, Falcon 9, Delta IV, Ariane 5.",
        examples: [
          { name: "Merlin 1D", veh: "Falcon 9 first stage", prop: "rp1", pc: 97, of: 2.36, eps: 16, thrust: { sl: 845, vac: 914 }, isp: { sl: 282, vac: 311 }, preset: true },
          { name: "F-1", veh: "Saturn V first stage", prop: "rp1", pc: 70, of: 2.27, eps: 16, thrust: { sl: 6770, vac: 7770 }, isp: { sl: 263, vac: 304 }, preset: true, note: "The model runs about 5% optimistic here: 1960s injectors burned less completely than modern ones, and the F-1 fed its turbine exhaust into the nozzle extension as a coolant." },
          { name: "RS-68A", veh: "Delta IV first stage", prop: "lh2", pc: 102, of: 5.97, eps: 21.5, thrust: { sl: 3137, vac: 3560 }, isp: { sl: 362, vac: 411 }, preset: true },
          { name: "Vulcain 2", veh: "Ariane 5 core stage", prop: "lh2", pc: 115, of: 6.1, eps: 58.5, thrust: { vac: 1359 }, isp: { sl: 318, vac: 434 }, preset: true },
          { name: "J-2", veh: "Saturn V upper stages", prop: "lh2", pc: 52.6, of: 5.5, eps: 27.5, thrust: { vac: 1033 }, isp: { vac: 421 }, preset: true }
        ]
      },

      /* ======================================================= 4 */
      {
        id: "tap", name: "Combustion tap-off", short: "Tap-off", level: 3,
        idea: "Skip the gas generator. Bleed hot gas straight out of the main chamber and use that to spin the turbine.",
        intro: "If you're going to burn propellant to drive the turbine anyway, why build a second combustor at all? A tap-off engine takes gas from the edge of the main chamber, near the injector where it's cooler and rich in fuel, and pipes it to the turbine. One fewer fire, fewer parts. But now the turbine and the chamber depend on each other: no chamber gas, no pump power; no pump power, no chamber gas. That chicken-and-egg start, plus the difficulty of taming gas pulled from a 3,000 K fire, is why so few engines use it.",
        glance: { drive: "Hot gas tapped from the main chamber", exhaust: "Dumped overboard", cooling: "Regenerative", pc: "Roughly 50\u2013100 bar", penalty: "1\u20133% of Isp" },
        pc: { min: 20, max: 120, nom: 60, why: "It's still an open cycle \u2014 the tapped gas is dumped after the turbine \u2014 so the same waste-versus-pressure trade applies as in a gas generator. On top of that, drawing hotter gas at higher pressure makes the tap harder to keep cool." },
        eps: 10, dt: 22, alt: 0, prop: "lh2",
        props: { lh2: true, ch4: true, rp1: true, hyp: true },
        open: { f0: 0.020, pref: 80, k: 0.40 }, st: "tap", chamber: { regen: true, tap: true },
        parts: [FT, OT, SHAFT1, FP, OP, TU, DUMP],
        pipes: [F_IN, O_IN, F_MAIN, J_INJ, O_MAIN,
          P("ph-tap", "hotf", 4, [[690, 208], [690, 160], [236, 160], [236, 270], [266, 270]]),
          turbToDump("ph-dump", "hotf")],
        steps: [
          { t: "The big picture", b: "Look for the missing piece: there's no gas generator. The turbine's hot gas comes from the main chamber itself. Press Next.", hl: [] },
          { t: "Tanks and pumps", b: "Same start as before \u2014 low-pressure tanks feeding pumps on a single shaft.", hl: ["ftank", "otank", "fpump", "opump", "shaft", "pf-in", "po-in"] },
          { t: "Main flow first", b: "Fuel cools the chamber wall and heads for the injector; oxidiser goes straight there. So far this looks like any pump-fed engine.", hl: ["pf-main", "jacket", "pj-inj", "po-main", "inj"] },
          { t: "The tap", b: "Here's the new part. A port near the injector end of the chamber draws off a small stream of combustion gas. Right there, the gas along the wall is cooler and rich in fuel \u2014 the least hostile gas in the whole chamber.", hl: ["tap", "ph-tap", "chamber"] },
          { t: "Into the turbine", b: "That tapped gas spins the turbine, which drives the pumps, which feed the chamber, which supplies the tapped gas. A loop of mutual dependence \u2014 elegant, and a little nerve-racking.", hl: ["ph-tap", "turb", "shaft"] },
          { t: "The start problem", b: "Chicken and egg: the turbine needs the chamber burning, and the chamber needs the turbine spinning. So a tap-off engine needs a helper to start \u2014 something like stored gas or tank pressure to spin things up until the loop can carry itself.", hl: ["turb", "chamber", "fpump", "opump"] },
          { t: "Still dumped", b: "After the turbine, the gas is thrown overboard, just as in a gas generator. You've saved a component, not the waste.", hl: ["ph-dump", "dump"] },
          { t: "Where it flies", b: "Blue Origin's BE-3 on New Shepard uses this cycle. NASA tested it in the 1960s on the J-2S, an upgrade to the Saturn V's J-2 that never flew.", hl: ["chamber", "nozzle", "plume"] }
        ],
        pros: ["No separate gas generator \u2014 fewer parts and less weight", "Turbine gas supply scales naturally with chamber power", "Simple overall architecture"],
        cons: ["Still dumps its turbine gas (open cycle)", "Coupled start: needs a starting aid", "Tapped gas is hard to temperature-control; turbine erosion risk"],
        used: "New Shepard (BE-3PM); tested on the J-2S.",
        examples: [
          { name: "BE-3PM", veh: "New Shepard (Blue Origin)", prop: "lh2", thrust: { sl: 490 }, note: "Chamber pressure and Isp aren't published." },
          { name: "J-2S", veh: "Tested in the 1960s; never flew", prop: "lh2", thrust: { vac: 1138 }, isp: { vac: 436 } }
        ]
      },

      /* ======================================================= 5 */
      {
        id: "exp", name: "Closed expander", short: "Expander", level: 3,
        idea: "No fire drives the turbine at all. The heat the engine sheds into its own walls does the work.",
        intro: "This may be the most elegant cycle on the page. Liquid hydrogen at 20 K is pumped through the chamber walls, where it picks up enough heat to turn into warm, high-pressure gas. That expanding gas spins the turbine \u2014 and then all of it goes into the injector and burns. Nothing is dumped. There's no gas generator and no preburner, so the turbine never sees anything hotter than a few hundred kelvin. The RL10 has flown since 1963 on exactly this principle. Its one real limit is geometry, and it's a beautiful one.",
        glance: { drive: "Heat picked up by fuel in the chamber walls", exhaust: "Into the main chamber", cooling: "Regenerative \u2014 it's the power source", pc: "Roughly 30\u201360 bar", penalty: "None" },
        pc: { min: 15, max: 90, nom: 42, why: "The turbine's power comes from heat soaked up through the chamber wall. Scale the engine up and that wall area grows more slowly than the propellant flow it has to drive \u2014 the square-cube law. Heat can't keep up with demand, which caps expander engines at roughly 300 kN of thrust and about 60 bar." },
        eps: 84, dt: 12.5, alt: 100, prop: "lh2",
        props: { lh2: true, ch4: true,
          rp1: "Kerosene can't do this job. Instead of boiling cleanly into gas in the hot channels, it breaks down and leaves carbon deposits (coking). An expander needs a fuel that turns into clean, energetic gas.",
          hyp: "Hydrazine-family fuels decompose if they're overheated in the cooling channels, so they can't serve as the turbine's working gas." },
        open: null, st: "exp", chamber: { regen: true },
        parts: [FT, OT, SHAFT1, FP, OP, TU],
        pipes: [F_IN, O_IN, F_MAIN, V_TU, turbToInj("pv-inj", "vap"), O_MAIN],
        steps: [
          { t: "The big picture", b: "Find the fire that drives the turbine. You can't \u2014 there isn't one. Press Next.", hl: [] },
          { t: "Pump the hydrogen", b: "Liquid hydrogen leaves the tank at about 20 K \u2014 twenty degrees above absolute zero \u2014 and the fuel pump raises it to roughly twice the chamber pressure.", hl: ["ftank", "pf-in", "fpump", "pf-main"] },
          { t: "The coldest meets the hottest", b: "Now it runs through channels in the chamber wall, millimetres from gas at over 3,000 K. The hydrogen keeps the metal alive, and the metal gives the hydrogen a tremendous dose of heat.", hl: ["jacket", "pf-main"] },
          { t: "Liquid becomes gas", b: "By the time it leaves the wall, the hydrogen has boiled and warmed to a couple of hundred kelvin \u2014 a high-pressure gas with a lot of energy stored in it, waiting to expand.", hl: ["jacket", "pv-tu"] },
          { t: "Heat spins the turbine", b: "That gas expands through the turbine and spins it. Think of a steam engine whose boiler is the rocket's own chamber wall. The turbine never touches combustion gas, so it runs cool and lasts.", hl: ["pv-tu", "turb", "shaft", "fpump", "opump"] },
          { t: "Nothing wasted", b: "After the turbine, every bit of that hydrogen goes on to the injector and burns in the chamber. That's what makes it a closed cycle.", hl: ["pv-inj", "inj"] },
          { t: "The oxygen's short trip", b: "The oxygen side is simple \u2014 pumped and piped straight to the injector.", hl: ["otank", "po-in", "opump", "po-main", "inj"] },
          { t: "The square-cube ceiling", b: "Here's the beautiful limit. As you scale the engine up, the wall area that collects heat grows more slowly than the flow it has to drive. So expanders top out around 300 kN. Perfect for upper stages; hopeless for boosters.", hl: ["jacket", "chamber", "nozzle"] }
        ],
        pros: ["No gas generator or preburner \u2014 the turbine sees only warm hydrogen", "Closed cycle: nothing dumped overboard", "Extremely reliable and easy to restart in space"],
        cons: ["Thrust and chamber pressure capped by heat pickup (square-cube law)", "Needs hydrogen, or methane, as the working fluid", "Low chamber pressure means large nozzles"],
        used: "Upper stages: Centaur, Delta IV, Ariane 6.",
        examples: [
          { name: "RL10A-4-2", veh: "Atlas Centaur upper stage", prop: "lh2", pc: 42.1, of: 5.5, eps: 84, thrust: { vac: 99.2 }, isp: { vac: 451 }, preset: true },
          { name: "RL10B-2", veh: "Delta IV upper stage", prop: "lh2", pc: 43.6, of: 5.88, eps: 285, thrust: { vac: 110.1 }, isp: { vac: 465.5 }, preset: true, note: "Its enormous nozzle extension unfolds after stage separation." },
          { name: "Vinci", veh: "Ariane 6 upper stage", prop: "lh2", pc: 60.8, of: 5.8, eps: 240, thrust: { vac: 180 }, isp: { vac: 457 }, preset: true }
        ]
      },

      /* ======================================================= 6 */
      {
        id: "bleed", name: "Expander bleed", short: "Expander bleed", level: 3,
        idea: "The same heat-powered turbine \u2014 but bleed its gas overboard, so the turbine can take a far bigger pressure drop.",
        intro: "In a closed expander, the turbine's exhaust has to carry on into the chamber, so it can only drop from the pump's high pressure to just above chamber pressure. Open the cycle and dump that gas instead, and the turbine can expand it all the way to near-vacuum. A much bigger pressure drop means far more power from far less gas, so the pumps don't have to work nearly as hard. The price is a little hydrogen thrown away. Japan's LE-5B made that trade on purpose.",
        glance: { drive: "Heat picked up by fuel in the chamber walls", exhaust: "Dumped overboard", cooling: "Regenerative", pc: "Roughly 30\u201350 bar", penalty: "1\u20133% of Isp" },
        pc: { min: 15, max: 70, nom: 36, why: "Power still comes from heat through the wall, so the same square-cube limit applies as in the closed expander. Bleeding the turbine gas buys some margin, but every extra bar of chamber pressure means bleeding more hydrogen." },
        eps: 110, dt: 15, alt: 100, prop: "lh2",
        props: { lh2: true, ch4: true,
          rp1: "Kerosene can't be the turbine's working gas: in the hot channels it cokes \u2014 leaving carbon deposits \u2014 instead of boiling cleanly.",
          hyp: "Hydrazine-family fuels decompose if they're overheated in the cooling channels, so they can't drive the turbine." },
        open: { f0: 0.055, pref: 36, k: 0.30 }, st: "bleed", chamber: { regen: true },
        parts: [FT, OT, SHAFT1, FP, OP, TU, DUMP],
        pipes: [F_IN, O_IN, F_MAIN, J_INJ, V_TU, turbToDump("pv-dump", "vap"), O_MAIN],
        steps: [
          { t: "The big picture", b: "It looks like the expander \u2014 except the turbine's gas has somewhere else to go. Press Next.", hl: [] },
          { t: "Pump and heat", b: "Hydrogen is pumped through the chamber walls and comes out as warm, high-pressure gas, exactly as in the closed expander.", hl: ["ftank", "pf-in", "fpump", "pf-main", "jacket"] },
          { t: "Split the flow", b: "At the end of the jacket the gas divides. Most of it heads straight to the injector. A smaller share is bled off to drive the turbine.", hl: ["pj-inj", "pv-tu", "jacket"] },
          { t: "A bigger pressure drop", b: "Because this turbine exhausts overboard, it can expand the gas from high pressure down to almost nothing. A turbine's power depends hugely on that pressure ratio \u2014 so a small bleed does a lot of work.", hl: ["pv-tu", "turb", "shaft"] },
          { t: "Easier pumps", b: "More turbine power per kilogram of gas means the pumps don't need to push as far above chamber pressure as in a closed expander. Lower pressures mean simpler, more robust hardware.", hl: ["fpump", "opump", "shaft"] },
          { t: "The cost", b: "The bled hydrogen leaves through a small dump nozzle, making only a little thrust. A few percent of the fuel, spent to buy simplicity and margin.", hl: ["pv-dump", "dump"] },
          { t: "Into the chamber", b: "The rest of the hydrogen and all of the oxygen meet at the injector and burn.", hl: ["pj-inj", "po-main", "inj", "chamber"] },
          { t: "Where it flies", b: "Japan's LE-5B powered the H-IIA and H-IIB upper stages, and Blue Origin's BE-3U on New Glenn's upper stage also uses an open expander cycle.", hl: ["chamber", "nozzle", "plume"] }
        ],
        pros: ["The turbine takes a huge pressure ratio, so pumps can run at lower pressures", "Benign turbine temperatures \u2014 no combustion gas", "Robust and restartable"],
        cons: ["Dumps a few percent of the hydrogen", "Same heat-pickup ceiling on size and pressure as the closed expander", "Needs hydrogen, or methane"],
        used: "Upper stages: H-IIA, H-IIB, New Glenn.",
        examples: [
          { name: "LE-5B", veh: "H-IIA and H-IIB upper stages", prop: "lh2", pc: 36, of: 5.0, eps: 110, thrust: { vac: 137 }, isp: { vac: 447 }, preset: true },
          { name: "BE-3U", veh: "New Glenn upper stage (Blue Origin)", prop: "lh2", note: "Performance figures aren't published in enough detail to load." }
        ]
      },

      /* ======================================================= 7 */
      {
        id: "fr", name: "Staged combustion \u2014 fuel-rich", short: "Staged \u00b7 fuel-rich", level: 4,
        idea: "Burn nearly all the fuel with a little oxygen first, spin the turbine with it \u2014 then send that hot, still fuel-rich gas into the main chamber to finish burning.",
        intro: "Here the waste disappears entirely. The preburner runs very fuel-rich, so it's cool enough for turbine blades, and after the turbine that gas \u2014 still full of unburned fuel \u2014 goes straight into the main chamber, where the rest of the oxygen finishes the job. Nothing is dumped, and because the turbine can now be fed an enormous flow, the pumps can drive chamber pressure past 200 bar. The bill arrives in the pumps: propellant must pass through the preburner and turbine before it even reaches the chamber, so the pumps have to push it to roughly twice chamber pressure.",
        glance: { drive: "A fuel-rich preburner", exhaust: "Into the main chamber", cooling: "Regenerative", pc: "120\u2013220 bar", penalty: "None" },
        pc: { min: 60, max: 260, nom: 206, why: "In a closed cycle, higher chamber pressure isn't limited by waste but by the pumps, which must reach roughly twice chamber pressure, and by turbine temperature. The RS-25's high-pressure fuel pump discharges at over 400 bar." },
        eps: 69, dt: 26, alt: 0, prop: "lh2",
        props: { lh2: true, ch4: true,
          rp1: "Burn kerosene fuel-rich and you get soot \u2014 lots of it \u2014 which would clog the turbine and injector. That's exactly why Soviet engineers ran their kerosene preburners oxygen-rich instead (next cycle).",
          hyp: "Proton's RD-253 is a hypergolic staged-combustion engine, but it runs its preburner oxidiser-rich \u2014 see the next cycle." },
        open: null, st: "fr", chamber: { regen: true },
        parts: [FT, OT, SHAFT1, FP, OP, TU,
          { id: "pb", type: "comb", x: 208, y: 270, fl: "hotf", label: "PREBURNER", label2: "fuel-rich" }],
        pipes: [F_IN, O_IN, F_MAIN, J_INJ, O_MAIN, fBranch(5), oBranch(3), toTurb("hotf"), turbToInj("ph-inj", "hotf")],
        steps: [
          { t: "The big picture", b: "Follow the turbine's exhaust. Instead of being dumped, it runs straight into the main chamber. Press Next.", hl: [] },
          { t: "Pumps working very hard", b: "The pumps here push propellant to roughly twice the chamber pressure \u2014 over 400 bar in the Space Shuttle main engine. They have to, because the fuel must still get through a preburner and a turbine before it reaches the chamber.", hl: ["fpump", "opump", "shaft", "pf-in", "po-in"] },
          { t: "Most of the fuel, a little oxygen", b: "A large share of the fuel heads for the preburner, joined by just a small amount of oxygen. So much fuel, so little oxygen, that the gas only reaches around 1,000 K.", hl: ["pf-br", "po-br", "pb"] },
          { t: "Hot hydrogen is gentle", b: "What comes out is hot, hydrogen-rich steam. That's fairly kind to metal \u2014 there's barely any free oxygen to attack it, and hydrogen doesn't make soot. This is why hydrogen engines choose the fuel-rich route.", hl: ["pb", "ph-tu"] },
          { t: "The turbine", b: "That gas spins the turbine, which drives both pumps. Because the preburner can take a huge flow, the turbine makes enormous power \u2014 the RS-25's fuel turbopump produced around 50 megawatts from a machine small enough to carry on a trolley.", hl: ["ph-tu", "turb", "shaft"] },
          { t: "Nothing thrown away", b: "Now the crucial difference: the turbine's exhaust, still packed with unburned fuel, flows straight into the main injector. Every molecule ends up making thrust.", hl: ["ph-inj", "inj"] },
          { t: "Finishing the burn", b: "The rest of the oxygen arrives at the injector and meets that hot, fuel-rich gas. The combustion completes in the chamber at over 200 bar.", hl: ["po-main", "pf-main", "jacket", "pj-inj", "chamber"] },
          { t: "The high-pressure payoff", b: "High chamber pressure lets a compact engine carry a big expansion, so it's efficient at sea level and in vacuum alike. Load the RS-25 below and compare its sea-level and vacuum numbers. (The real RS-25 has two fuel-rich preburners, one per turbopump; it's drawn with one here.)", hl: ["chamber", "nozzle", "plume"] }
        ],
        pros: ["Closed cycle \u2014 no propellant wasted", "Very high chamber pressure: compact and efficient", "Hydrogen-rich turbine gas is relatively kind to metal"],
        cons: ["Pumps must reach roughly twice chamber pressure", "Complex, tightly coupled plumbing that's hard to develop", "Not suited to kerosene (soot)"],
        used: "Space Shuttle and SLS (RS-25), Energia (RD-0120), H-IIA and H-IIB (LE-7A).",
        examples: [
          { name: "RS-25", veh: "Space Shuttle, SLS", prop: "lh2", pc: 206.4, of: 6.03, eps: 69, thrust: { sl: 1860, vac: 2279 }, isp: { sl: 366, vac: 452.3 }, preset: true, note: "Uses two fuel-rich preburners, one for each turbopump." },
          { name: "RD-0120", veh: "Energia core stage", prop: "lh2", pc: 218, of: 6.0, eps: 85.7, thrust: { vac: 1961 }, isp: { sl: 353, vac: 455 }, preset: true },
          { name: "LE-7A", veh: "H-IIA and H-IIB first stage", prop: "lh2", pc: 121, of: 5.9, eps: 51.9, thrust: { vac: 1098 }, isp: { sl: 338, vac: 440 }, preset: true }
        ]
      },

      /* ======================================================= 8 */
      {
        id: "ox", name: "Staged combustion \u2014 oxidiser-rich", short: "Staged \u00b7 ox-rich", level: 5,
        idea: "Run the preburner on all of the oxygen and just a splash of kerosene. No soot at all \u2014 but now the turbine sits in a torrent of hot, high-pressure oxygen.",
        intro: "Kerosene burned fuel-rich makes soot, so Soviet engineers turned the preburner around: all the oxygen, a little fuel. The gas comes out clean \u2014 and very, very aggressive. Hot oxygen at hundreds of bar will set steel on fire; the metal itself becomes the fuel. Making turbines, ducts and seals survive it took special alloys and coatings, and for decades only the Soviet Union managed it. The reward is a kerosene engine running at over 250 bar: the RD-180 and RD-170 remain among the best-performing kerosene engines ever built. The first American oxidiser-rich engine, BE-4, didn't fly until 2024.",
        glance: { drive: "An oxygen-rich preburner", exhaust: "Into the main chamber", cooling: "Regenerative", pc: "140\u2013270 bar", penalty: "None" },
        pc: { min: 80, max: 300, nom: 267, why: "The limit is how hot you dare make oxygen-rich gas. Turbine inlet temperatures stay around 700\u2013800 K \u2014 well below a fuel-rich preburner \u2014 because hotter oxygen attacks metal. Every extra bar has to be won with metallurgy." },
        eps: 36.87, dt: 23, alt: 0, prop: "rp1",
        props: { rp1: true, ch4: true, hyp: true,
          lh2: "Hydrogen doesn't make soot, so hydrogen engines have no reason to face hot oxygen \u2014 they take the gentler fuel-rich route instead (previous cycle)." },
        open: null, st: "ox", chamber: { regen: true },
        parts: [FT, OT, SHAFT1, FP, OP, TU,
          { id: "pb", type: "comb", x: 208, y: 270, fl: "hoto", label: "PREBURNER", label2: "oxygen-rich" }],
        pipes: [F_IN, O_IN, F_MAIN, J_INJ, fBranch(3),
          P("po-pb", "ox", 5, [[330, 440], [360, 440], [360, 360], [208, 360], [208, 294]]),
          toTurb("hoto"), turbToInj("ph-inj", "hoto")],
        steps: [
          { t: "The big picture", b: "Look at the oxygen line. It never goes directly to the chamber \u2014 every drop passes through the preburner first. Press Next.", hl: [] },
          { t: "All the oxygen", b: "The oxygen pump sends its entire output to the preburner. Just a small stream of kerosene joins it.", hl: ["otank", "po-in", "opump", "po-pb", "pf-br"] },
          { t: "Why oxygen-rich?", b: "Burn kerosene with too little oxygen and you get soot that clogs turbines and injectors. Burn it with far too much oxygen and it burns clean. So Soviet engineers chose clean \u2014 and inherited a new problem.", hl: ["pb", "po-pb", "pf-br"] },
          { t: "Hot oxygen, dangerous gas", b: "What leaves the preburner is roughly 700\u2013800 K gas that is mostly oxygen, at hundreds of bar. In those conditions ordinary steel doesn't just weaken \u2014 it ignites. The turbine, ducts and seals needed special alloys and protective coatings.", hl: ["pb", "ph-tu"] },
          { t: "The turbine", b: "That oxygen-rich gas spins the single turbine driving both pumps. On the RD-180, one turbopump feeds two combustion chambers.", hl: ["ph-tu", "turb", "shaft", "fpump", "opump"] },
          { t: "Into the chamber", b: "After the turbine, the hot oxygen-rich gas is injected into the main chamber. Nothing is dumped.", hl: ["ph-inj", "inj"] },
          { t: "The fuel's job", b: "Most of the kerosene cools the chamber walls first, then meets the hot oxygen-rich gas at the injector. Combustion completes at over 250 bar.", hl: ["pf-main", "jacket", "pj-inj", "chamber"] },
          { t: "Decades ahead", b: "The Soviet Union mastered this from the 1960s to the 1980s: NK-33, RD-170, RD-180. The United States bought RD-180s to fly the Atlas V. The first American oxidiser-rich engine to fly, Blue Origin's methane-fuelled BE-4, launched on Vulcan in 2024.", hl: ["chamber", "nozzle", "plume"] }
        ],
        pros: ["Kerosene without soot \u2014 suited to high performance and to reuse", "Very high chamber pressure (250+ bar)", "Closed cycle: nothing wasted"],
        cons: ["Hot, high-pressure oxygen can ignite metal: exotic alloys and coatings needed", "Lower turbine temperatures limit the power margin", "Historically among the hardest engines to develop"],
        used: "Atlas V (RD-180), Energia and Zenit (RD-170 family), N1 and Antares (NK-33), Vulcan and New Glenn (BE-4).",
        examples: [
          { name: "RD-180", veh: "Atlas V first stage", prop: "rp1", pc: 266.8, of: 2.72, eps: 36.87, chambers: 2, thrust: { sl: 3830, vac: 4152 }, isp: { sl: 311, vac: 338 }, preset: true, note: "One turbopump feeding two chambers; the lab models one chamber and doubles the thrust." },
          { name: "RD-170", veh: "Energia boosters, Zenit", prop: "rp1", pc: 245, of: 2.63, eps: 36.87, chambers: 4, thrust: { vac: 7904 }, isp: { sl: 309, vac: 337 }, preset: true, note: "Four chambers on one turbopump \u2014 the most powerful liquid engine ever flown." },
          { name: "NK-33", veh: "N1; later Antares (as AJ26)", prop: "rp1", pc: 145, of: 2.8, eps: 27.7, thrust: { sl: 1510, vac: 1638 }, isp: { sl: 297, vac: 331 }, preset: true, approx: true },
          { name: "BE-4", veh: "Vulcan, New Glenn", prop: "ch4", thrust: { sl: 2400 }, note: "Methane-fuelled. Detailed performance figures aren't published." },
          { name: "RD-253", veh: "Proton first stage", prop: "hyp", thrust: { sl: 1470, vac: 1630 }, isp: { sl: 285, vac: 316 }, note: "Hypergolic (N\u2082O\u2084 with UDMH), oxidiser-rich." }
        ]
      },

      /* ======================================================= 9 */
      {
        id: "ff", name: "Full-flow staged combustion", short: "Full-flow staged", level: 5,
        idea: "Two preburners \u2014 one fuel-rich, one oxygen-rich. Every molecule of both propellants passes through a turbine before it reaches the chamber.",
        intro: "Take the last two cycles and use both at once. All the fuel goes through a fuel-rich preburner that drives the fuel pump; all the oxygen goes through an oxygen-rich preburner that drives the oxygen pump. Because every kilogram of propellant now flows through a turbine, each turbine needs less temperature for the same power, so it runs cooler and lives longer. Both propellants reach the chamber as hot gases, which mix and burn very completely. It's the hardest cycle to build: the Soviet RD-270 and the American Integrated Powerhead Demonstrator made it to test stands, but the first to fly was SpaceX's Raptor, in 2019.",
        glance: { drive: "Two preburners \u2014 one fuel-rich, one oxygen-rich", exhaust: "Both into the main chamber, as gas", cooling: "Regenerative", pc: "250\u2013350 bar", penalty: "None" },
        pc: { min: 120, max: 350, nom: 300, why: "With the entire flow available to both turbines, pump power stops being the constraint. What's left is how hard you can push chamber walls, injectors and turbines at 300-plus bar. Raptor runs around 300 bar, among the highest of any engine ever flown." },
        eps: 34.3, dt: 24, alt: 0, prop: "ch4",
        props: { ch4: true, lh2: true, hyp: true,
          rp1: "The fuel-rich preburner would choke on soot with kerosene. Full-flow needs a fuel that burns cleanly when fuel-rich \u2014 methane or hydrogen." },
        open: null, st: "ff", chamber: { regen: true },
        parts: [FT, OT, FP, OP,
          { id: "shaft", type: "shaft", segs: [[300, 100, 196], [300, 344, 440]] },
          { id: "fturb", type: "turbine", x: 300, y: 196, r: 24, label: "FUEL TURBINE", lx: 318, ly: 238, la: "start" },
          { id: "oturb", type: "turbine", x: 300, y: 344, r: 24, label: "OX TURBINE", lx: 318, ly: 308, la: "start" },
          { id: "frpb", type: "comb", x: 208, y: 196, h: 40, fl: "hotf", label: "PREBURNER", label2: "fuel-rich" },
          { id: "orpb", type: "comb", x: 208, y: 344, h: 40, fl: "hoto", label: "PREBURNER", label2: "oxygen-rich" }],
        pipes: [F_IN, O_IN, F_MAIN,
          P("pj-frpb", "fuel", 5, [[640, 202], [640, 150], [208, 150], [208, 176]]),
          P("po-orpb", "ox", 5, [[330, 440], [360, 440], [360, 390], [208, 390], [208, 364]]),
          P("p-frtu", "hotf", 5, [[248, 196], [276, 196]]),
          P("p-ortu", "hoto", 5, [[248, 344], [276, 344]]),
          P("p-ftinj", "hotf", 5, [[324, 196], [560, 196], [560, 262], [596, 262]]),
          P("p-otinj", "hoto", 5, [[324, 344], [560, 344], [560, 278], [596, 278]])],
        steps: [
          { t: "The big picture", b: "Two turbopumps, two preburners, and not a single liquid line into the chamber. Everything arrives as gas. Press Next.", hl: [] },
          { t: "Two separate turbopumps", b: "The fuel pump and the oxygen pump each get their own shaft and their own turbine. That separation matters: nowhere is there a seal with fuel on one side and oxygen on the other.", hl: ["fpump", "fturb", "opump", "oturb", "shaft"] },
          { t: "Fuel: walls first, then preburner", b: "The fuel is pumped through the chamber walls to cool them, and then \u2014 all of it \u2014 into the fuel-rich preburner, where it meets just a little oxygen.", hl: ["ftank", "pf-in", "fpump", "pf-main", "jacket", "pj-frpb", "frpb"] },
          { t: "Oxygen: straight to its preburner", b: "All of the oxygen goes to the oxygen-rich preburner, with just a little fuel.", hl: ["otank", "po-in", "opump", "po-orpb", "orpb"] },
          { t: "Cooler turbines", b: "Here's the elegance. Every molecule of propellant now flows through a turbine. With that much mass to work with, each turbine can make its power at a lower temperature \u2014 and cooler turbines last longer. That matters enormously for an engine meant to be reused.", hl: ["frpb", "orpb", "fturb", "oturb", "p-frtu", "p-ortu"] },
          { t: "Gas meets gas", b: "Both turbine exhausts \u2014 one fuel-rich, one oxygen-rich \u2014 flow into the injector as hot gases. Gas mixes with gas far more completely than liquid sprays do, so the combustion is fast and thorough.", hl: ["p-ftinj", "p-otinj", "inj"] },
          { t: "Three hundred bar", b: "The main chamber runs at around 300 bar \u2014 about three times the pressure of a gas-generator engine. That's the pressure at the bottom of three kilometres of ocean, held back by the chamber walls.", hl: ["chamber"] },
          { t: "Hardest of all", b: "The Soviet RD-270 was tested in the 1960s but never flew; an American demonstrator ran in the 2000s. SpaceX's Raptor became the first full-flow engine to fly, on the Starhopper test vehicle in 2019.", hl: ["chamber", "nozzle", "plume"] }
        ],
        pros: ["The highest chamber pressures of any cycle", "Cooler turbines \u2014 longer life and better reusability", "No fuel-oxygen shaft seals, and gas-gas mixing burns very completely"],
        cons: ["Two preburners and two turbopumps: the most complex plumbing", "The hardest cycle to develop and to start", "Not compatible with kerosene"],
        used: "Starship (Raptor).",
        examples: [
          { name: "Raptor 2", veh: "Starship", prop: "ch4", pc: 300, of: 3.6, eps: 34.3, thrust: { sl: 2256 }, isp: { sl: 327 }, preset: true, approx: true, note: "Sea-level version. SpaceX publishes only headline figures, so the mixture and expansion ratios here are widely reported approximations." },
          { name: "RD-270", veh: "Tested 1962\u201370 for the UR-700; never flew", prop: "hyp", thrust: { sl: 6272, vac: 6713 }, isp: { sl: 301, vac: 322 }, note: "Hypergolic (N\u2082O\u2084 with UDMH)." },
          { name: "Integrated Powerhead Demonstrator", veh: "US test programme, 2000s", prop: "lh2", note: "A hydrogen full-flow demonstrator; ran on the test stand only." }
        ]
      }
    ],

    compare: [
      { id: "pf", drive: "Nothing \u2014 no turbine", ex: "\u2014", pc: "5\u201325 bar", pen: "None (heavy tanks)", flown: "Apollo SPS, Shuttle OMS, Dragon" },
      { id: "elec", drive: "Battery and electric motors", ex: "\u2014", pc: "Tens of bar", pen: "None (battery mass)", flown: "Rutherford (Electron)" },
      { id: "gg", drive: "Small fuel-rich combustor", ex: "Dumped", pc: "50\u2013120 bar", pen: "1\u20134%", flown: "F-1, Merlin, RS-68, Vulcain" },
      { id: "tap", drive: "Gas tapped from the chamber", ex: "Dumped", pc: "~50\u2013100 bar", pen: "1\u20133%", flown: "BE-3PM (New Shepard)" },
      { id: "exp", drive: "Heat from the chamber walls", ex: "Into the chamber", pc: "30\u201360 bar", pen: "None", flown: "RL10, Vinci" },
      { id: "bleed", drive: "Heat from the chamber walls", ex: "Dumped", pc: "30\u201350 bar", pen: "1\u20133%", flown: "LE-5B, BE-3U" },
      { id: "fr", drive: "Fuel-rich preburner", ex: "Into the chamber", pc: "120\u2013220 bar", pen: "None", flown: "RS-25, RD-0120, LE-7A" },
      { id: "ox", drive: "Oxygen-rich preburner", ex: "Into the chamber", pc: "140\u2013270 bar", pen: "None", flown: "RD-180, RD-170, NK-33, BE-4" },
      { id: "ff", drive: "Both preburners", ex: "Into the chamber, as gas", pc: "250\u2013350 bar", pen: "None", flown: "Raptor" }
    ]
  };
})();
