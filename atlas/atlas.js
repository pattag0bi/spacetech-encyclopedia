/* Engine atlas \u2014 core. Shared physics + drawing helpers (window.ATLAS.lib), the liquid-cycle
   model, and a family-agnostic UI that any model (models.js) plugs into.
   Load order: engines.js, engines-more.js, atlas.js, models.js \u2014 the UI mounts on DOMContentLoaded,
   after every script has run. */
(function () {
  'use strict';
  var A = window.ATLAS = window.ATLAS || {};
  A.models = A.models || {};
  var L = A.lib = {};

  var G0 = 9.80665, SEP = 0.15, EDGE = 0.30, CY = 270, XI = 640, XC = 740, XT = 780, RT = 26, RC = 62, XEND = 1115;
  var SVGNS = 'http://www.w3.org/2000/svg';
  L.G0 = G0; L.SEP = SEP; L.CY = CY; L.XEND = XEND;

  /* ================================================================ physics */
  function interp(tab, x) {
    if (x <= tab[0][0]) return tab[0].slice(1);
    for (var i = 1; i < tab.length; i++) {
      if (x <= tab[i][0]) {
        var a = tab[i - 1], b = tab[i], f = (x - a[0]) / (b[0] - a[0]);
        return a.slice(1).map(function (v, j) { return v + f * (b[j + 1] - v); });
      }
    }
    return tab[tab.length - 1].slice(1);
  }
  function areaRatio(M, g) { return (1 / M) * Math.pow((2 / (g + 1)) * (1 + (g - 1) / 2 * M * M), (g + 1) / (2 * (g - 1))); }
  function machFromEps(eps, g) {
    var lo = 1.0001, hi = 40;
    for (var i = 0; i < 90; i++) { var m = (lo + hi) / 2; if (areaRatio(m, g) < eps) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function machFromPr(pr, g) { return Math.sqrt((Math.pow(pr, -(g - 1) / g) - 1) * 2 / (g - 1)); }
  function ambient(alt) { return alt >= 100 ? 0 : 1.01325 * Math.exp(-alt / 8.4); }

  /* Ideal rocket nozzle for any hot gas: stagnation temperature Tc (K), molar mass M, effective gamma. */
  function rocket(g, Tc, M, Pc, eps, Pa, ec, en) {
    ec = ec == null ? 0.98 : ec; en = en == null ? 0.985 : en;
    var R = 8314.46 / M, Gam = Math.sqrt(g) * Math.pow(2 / (g + 1), (g + 1) / (2 * (g - 1)));
    var cs = Math.sqrt(R * Tc) / Gam * ec;
    var Me = machFromEps(eps, g), pr = Math.pow(1 + (g - 1) / 2 * Me * Me, -g / (g - 1));
    var PeNom = Pc * pr, Pe = PeNom, epsEff = eps, sep = false;
    if (Pa > 0 && PeNom < SEP * Pa) { /* flow detaches where local pressure falls to ~SEP \u00D7 ambient */
      sep = true; pr = Math.min(0.5, SEP * Pa / Pc);
      Me = machFromPr(pr, g); epsEff = areaRatio(Me, g); Pe = Pc * pr;
    }
    var mom = Math.sqrt(2 * g * g / (g - 1) * Math.pow(2 / (g + 1), (g + 1) / (g - 1)) * (1 - Math.pow(pr, (g - 1) / g))) * en;
    var press = epsEff * (Pe - Pa) / Pc, cf = mom + press;
    return { g: g, Tc: Tc, M: M, R: R, Gam: Gam, cs: cs, Pc: Pc, Pa: Pa, eps: eps, epsEff: epsEff, Me: Me, pr: pr,
      Pe: Pe, PeNom: PeNom, sep: sep, mom: mom, press: press, cf: cf, isp: cs * cf / G0,
      Te: Tc * Math.pow(pr, (g - 1) / g), Tt: 2 * Tc / (g + 1), Pt: Pc * Math.pow(2 / (g + 1), g / (g - 1)) };
  }

  function expansion(p) {
    if (p.Pa <= 0) return { k: 'vac', t: 'Vacuum', x: 'In vacuum there\u2019s nothing outside to push back, so the exhaust keeps spreading sideways the moment it leaves the nozzle. Here a bigger nozzle always helps; only its weight and size stop you.' };
    if (p.sep) return { k: 'sep', t: 'Flow separation', x: 'The exhaust would leave at only ' + fp(p.PeNom) + ' bar against ' + fp(p.Pa) + ' bar of outside air, so the air pushes up into the nozzle and the flow tears away from the wall partway down. In a real engine that causes violent, lopsided side loads that can wreck the nozzle \u2014 which is why vacuum nozzles aren\u2019t fired at sea level.' };
    var r = p.Pe / p.Pa;
    if (r > 1.15) return { k: 'under', t: 'Under-expanded', x: 'The exhaust leaves at ' + fp(p.Pe) + ' bar into ' + fp(p.Pa) + ' bar of air \u2014 still above the outside pressure, so it balloons outward after leaving the nozzle. Some energy is left on the table; a longer nozzle would have captured it.' };
    if (r < EDGE) return { k: 'edge', t: 'On the edge of separating', x: 'The exhaust leaves at only ' + fp(p.Pe) + ' bar into ' + fp(p.Pa) + ' bar of air \u2014 heavily over-expanded, but the flow is still clinging to the wall. Sea-level engines with big nozzles, like the RS-25 and LE-7A, deliberately live here to squeeze out more performance higher up. The price is dangerous side loads if the flow starts to detach, especially during start-up.' };
    if (r >= 0.87) return { k: 'ideal', t: 'Close to ideal', x: 'Exit pressure (' + fp(p.Pe) + ' bar) roughly matches the outside air (' + fp(p.Pa) + ' bar), so at this altitude the nozzle turns almost all of the available pressure into speed.' };
    return { k: 'over', t: 'Over-expanded', x: 'The exhaust leaves at ' + fp(p.Pe) + ' bar into ' + fp(p.Pa) + ' bar of air. The atmosphere squeezes the plume inward, and the shock waves that makes show up as bright diamonds. A little thrust is lost, but the engine is healthy.' };
  }

  L.interp = interp; L.areaRatio = areaRatio; L.machFromEps = machFromEps; L.machFromPr = machFromPr;
  L.ambient = ambient; L.rocket = rocket; L.expansion = expansion;

  /* ============================================================= formatting */
  function nf(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function fp(b) {
    if (b === 0) return '0';
    if (b < 0.001) return '<0.001';
    if (b < 0.1) return nf(b, 3);
    if (b < 10) return nf(b, 2);
    if (b < 100) return nf(b, 1);
    return nf(b, 0);
  }
  function fT(kN) { if (kN < 1) return nf(kN * 1000, kN < 0.01 ? 1 : 0) + ' N'; if (kN < 100) return nf(kN, 1) + ' kN'; return nf(kN, 0) + ' kN'; }
  function fN(N) { /* thrust in newtons, auto units from micronewtons to meganewtons */
    var a = Math.abs(N);
    if (a < 1e-3) return nf(N * 1e6, a < 1e-4 ? 1 : 0) + ' \u00B5N';
    if (a < 1) return nf(N * 1e3, a < 0.01 ? 2 : (a < 0.1 ? 1 : 0)) + ' mN';
    if (a < 1000) return nf(N, a < 10 ? 2 : (a < 100 ? 1 : 0)) + ' N';
    if (a < 1e6) return fT(N / 1000);
    return nf(N / 1e6, 2) + ' MN';
  }
  function fS(n) { /* significant-figure friendly number */
    var a = Math.abs(n);
    if (a >= 100) return nf(n, 0);
    if (a >= 10) return nf(n, 1);
    if (a >= 1) return nf(n, 2);
    return nf(n, 3);
  }
  function fDur(s) {
    if (s < 120) return nf(s, 0) + ' s';
    if (s < 7200) return nf(s / 60, 0) + ' min';
    if (s < 172800) return nf(s / 3600, 1) + ' h';
    if (s < 3.15e7 * 2) return nf(s / 86400, 0) + ' days';
    return nf(s / 3.156e7, 1) + ' years';
  }
  function fEps(e) { return e < 10 ? nf(e, 1) : nf(e, 0); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  L.nf = nf; L.fp = fp; L.fT = fT; L.fN = fN; L.fS = fS; L.fDur = fDur; L.fEps = fEps; L.esc = esc;

  /* ============================================================ svg helpers */
  function pd(pts) { return 'M' + pts.map(function (p) { return (+p[0]).toFixed(1) + ' ' + (+p[1]).toFixed(1); }).join(' L'); }
  function tx(x, y, s, cls, anchor, extra) {
    return '<text x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" class="' + (cls || 'atl-t') + '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') + (extra || '') + '>' + esc(s) + '</text>';
  }
  function grp(id, inner, extra) { return '<g class="atl-part" data-part="' + id + '"' + (extra || '') + '>' + inner + '</g>'; }
  function circ(x, y, r, cls, extra) { return '<circle cx="' + (+x).toFixed(1) + '" cy="' + (+y).toFixed(1) + '" r="' + (+r).toFixed(1) + '" class="' + cls + '"' + (extra || '') + '/>'; }
  function circT(x, y, r, cls, style, title) {
    return '<circle cx="' + (+x).toFixed(1) + '" cy="' + (+y).toFixed(1) + '" r="' + (+r).toFixed(1) + '" class="' + cls + '"' +
      (style ? ' style="' + style + '"' : '') + '><title>' + esc(title) + '</title></circle>';
  }
  function rect(x, y, w, h, cls, extra) { return '<rect x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" width="' + (+w).toFixed(1) + '" height="' + (+h).toFixed(1) + '" class="' + cls + '"' + (extra || '') + '/>'; }
  function path(d, cls, extra) { return '<path d="' + d + '" class="' + cls + '"' + (extra || '') + '/>'; }
  L.pd = pd; L.tx = tx; L.grp = grp; L.circ = circ; L.circT = circT; L.rect = rect; L.path = path;

  /* ================================================================== parts */
  function rotor(x, y, r, inner, rev) {
    /* an invisible circle gives the group a centred bounding box, so it spins about the part\u2019s centre */
    return '<g class="atl-rot' + (rev ? ' atl-rev' : '') + '">' + circ(x, y, r - 3, 'atl-ghost') + inner + '</g>';
  }
  function pumpSVG(c) {
    var v = '', r = c.r;
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3, b = a + 0.55;
      v += '<path class="atl-vane" d="M' + c.x + ' ' + c.y + ' Q' + (c.x + Math.cos(b) * r * 0.5).toFixed(1) + ' ' + (c.y + Math.sin(b) * r * 0.5).toFixed(1) +
        ' ' + (c.x + Math.cos(a) * r * 0.78).toFixed(1) + ' ' + (c.y + Math.sin(a) * r * 0.78).toFixed(1) + '"/>';
    }
    return grp(c.id, circ(c.x, c.y, r, 'atl-mach') + rotor(c.x, c.y, r, v + circ(c.x, c.y, r * 0.18, 'atl-hub')) +
      (c.label ? tx(c.lx, c.ly, c.label, 'atl-t', c.la) : ''));
  }
  function turbSVG(c) {
    var v = '', r = c.r;
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 8;
      v += '<line class="atl-blade" x1="' + (c.x + Math.cos(a) * r * 0.42).toFixed(1) + '" y1="' + (c.y + Math.sin(a) * r * 0.42).toFixed(1) +
        '" x2="' + (c.x + Math.cos(a + 0.35) * r * 0.86).toFixed(1) + '" y2="' + (c.y + Math.sin(a + 0.35) * r * 0.86).toFixed(1) + '"/>';
    }
    return grp(c.id, circ(c.x, c.y, r, 'atl-mach atl-turb') + rotor(c.x, c.y, r, v + circ(c.x, c.y, r * 0.3, 'atl-hub')) +
      (c.label ? tx(c.lx, c.ly, c.label, 'atl-t', c.la) : ''));
  }
  function motorSVG(c) {
    var coils = '';
    for (var i = -1; i <= 1; i++) coils += '<line class="atl-coil" x1="' + (c.x - 14) + '" y1="' + (c.y + i * 8) + '" x2="' + (c.x - 8) + '" y2="' + (c.y + i * 8) + '"/>';
    return grp(c.id, rect(c.x - 22, c.y - 18, 44, 36, 'atl-mach', ' rx="6"') + coils +
      tx(c.x + 4, c.y + 5, 'M', 'atl-tm', 'middle') + (c.label ? tx(c.lx, c.ly, c.label, 'atl-t', 'start') : ''));
  }
  function battSVG(c) {
    var x = c.x - 36, y = c.y - 22;
    return grp(c.id, rect(x, y, 72, 44, 'atl-mach', ' rx="5"') + rect(x + 72, c.y - 7, 5, 14, 'atl-term', ' rx="1.5"') +
      '<line class="atl-coil" x1="' + (x + 24) + '" y1="' + (y + 6) + '" x2="' + (x + 24) + '" y2="' + (y + 38) + '"/>' +
      '<line class="atl-coil" x1="' + (x + 48) + '" y1="' + (y + 6) + '" x2="' + (x + 48) + '" y2="' + (y + 38) + '"/>' +
      tx(c.x, c.y + 4, c.label || 'BATTERY', 'atl-t2 atl-tb', 'middle'));
  }
  function combSVG(c) {
    var h = c.h || 48, w = c.w || 80, x = c.x - w / 2, y = c.y - h / 2, col = 'var(--atl-' + c.fl + ')';
    return grp(c.id, rect(x, y, w, h, 'atl-comb', ' rx="9" style="stroke:' + col + '"') +
      '<ellipse cx="' + c.x + '" cy="' + c.y + '" rx="' + (w / 2 - 10) + '" ry="' + (h / 2 - 6) + '" class="atl-flame" style="fill:' + col + '"/>' +
      tx(c.x, c.y - 2, c.label, 'atl-t atl-tb', 'middle') + (c.label2 ? tx(c.x, c.y + 12, c.label2, 'atl-t2', 'middle') : ''));
  }
  function valveSVG(c) {
    var x = c.x, y = c.y, s = c.s || 11;
    return grp(c.id, '<path class="atl-valve" d="M' + (x - s) + ' ' + (y - s * 0.82) + ' L' + (x + s) + ' ' + (y + s * 0.82) + ' L' + (x + s) + ' ' + (y - s * 0.82) + ' L' + (x - s) + ' ' + (y + s * 0.82) + ' Z"/>' +
      (c.label ? tx(c.lx, c.ly, c.label, 'atl-t2', 'middle') : ''));
  }
  function dumpSVG(c) {
    var x = c.x, y = c.y, puffs = '';
    for (var i = 0; i < 3; i++) puffs += circ(x, y + 46 + i * 14, 7 + i * 4, 'atl-puff', ' style="animation-delay:' + (-i * 0.6) + 's"');
    return grp(c.id, '<path class="atl-mach" d="M' + (x - 7) + ' ' + y + ' L' + (x + 7) + ' ' + y + ' L' + (x + 15) + ' ' + (y + 34) + ' L' + (x - 15) + ' ' + (y + 34) + ' Z"/>' +
      puffs + tx(c.lx, c.ly, c.label, 'atl-t2', 'start') + tx(c.lx, c.ly + 13, c.label2, 'atl-t2', 'start'));
  }
  function shaftSVG(c) {
    return grp(c.id, c.segs.map(function (s) {
      return s.length === 3 ? '<line class="atl-shaft" x1="' + s[0] + '" y1="' + s[1] + '" x2="' + s[0] + '" y2="' + s[2] + '"/>'
        : '<line class="atl-shaft" x1="' + s[0] + '" y1="' + s[1] + '" x2="' + s[2] + '" y2="' + s[3] + '"/>';
    }).join(''));
  }
  function tankSVG(c, P) {
    var f = c.side === 'fuel', col = c.fl ? 'var(--atl-' + c.fl + ')' : (f ? 'var(--atl-fuel)' : 'var(--atl-ox)');
    var name = c.name || (f ? 'FUEL' : 'OXIDISER');
    var sub = c.sub != null ? c.sub : (P ? (f ? P.fuel : P.ox) + ' \u00B7 ' + (f ? P.Tf : P.To) + ' K' : '');
    var fill = c.fill == null ? 0.68 : c.fill;
    return grp(c.id, rect(c.x, c.y, c.w, c.h, 'atl-tank', ' rx="' + (c.rx || 18) + '"') +
      (fill > 0 ? rect(c.x + 6, c.y + c.h * (1 - fill), c.w - 12, c.h * fill - 6, 'atl-liq', ' rx="12" style="fill:' + col + '"') : '') +
      tx(c.x + c.w / 2, c.y + c.h / 2 + 4, name, 'atl-t atl-tb', 'middle') +
      (sub ? tx(c.x + c.w / 2, c.y + c.h / 2 + 20, sub, 'atl-t2', 'middle') : ''));
  }
  function sphereSVG(c) {
    return grp(c.id, circ(c.x, c.y, c.r, 'atl-sph', c.fl ? ' style="fill:var(--atl-' + c.fl + ')"' : '') + tx(c.x, c.y + 5, c.mark || 'He', 'atl-tm', 'middle') +
      (c.label ? tx(c.lx, c.ly, c.label, 'atl-t', c.la || 'start') : '') + (c.label2 ? tx(c.lx, c.ly + 15, c.label2, 'atl-t2', c.la || 'start') : ''));
  }
  function boxSVG(c) {
    return grp(c.id, rect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, c.cls || 'atl-mach', ' rx="' + (c.rx == null ? 6 : c.rx) + '"' + (c.fl ? ' style="stroke:var(--atl-' + c.fl + ')"' : '')) +
      (c.label ? tx(c.x, c.y + (c.label2 ? -1 : 4), c.label, 'atl-t atl-tb', 'middle') : '') + (c.label2 ? tx(c.x, c.y + 13, c.label2, 'atl-t2', 'middle') : ''));
  }
  function partSVG(c, P) {
    switch (c.type) {
      case 'tank': return tankSVG(c, P);
      case 'pump': return pumpSVG(c);
      case 'turbine': return turbSVG(c);
      case 'motor': return motorSVG(c);
      case 'battery': return battSVG(c);
      case 'comb': return combSVG(c);
      case 'valve': return valveSVG(c);
      case 'dump': return dumpSVG(c);
      case 'shaft': return shaftSVG(c);
      case 'sphere': return sphereSVG(c);
      case 'box': return boxSVG(c);
    }
    return '';
  }
  function pipeSVG(p) {
    var d = pd(p.pts), c = 'var(--atl-' + p.fl + ')', w = p.w || 4, best = null;
    var s = '<path class="atl-pw" d="' + d + '" style="stroke-width:' + (w + 4) + '"/>' +
      '<path class="atl-pu" d="' + d + '" style="stroke:' + c + ';stroke-width:' + w + '"/>' +
      '<path class="atl-pf' + (p.fl === 'elec' || p.fl === 'e' ? ' atl-el' : '') + (p.beam ? ' atl-beamf' : '') + '" d="' + d + '" style="stroke:' + c + ';stroke-width:' + w + '"/>';
    for (var i = 1; i < p.pts.length; i++) {
      var a = p.pts[i - 1], b = p.pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!best || len > best.L) best = { a: a, b: b, L: len };
    }
    if (best && best.L > 26 && !p.nochev) {
      var ang = Math.atan2(best.b[1] - best.a[1], best.b[0] - best.a[0]) * 180 / Math.PI;
      s += '<path class="atl-chev" d="M-5 -5 L5 0 L-5 5 Z" transform="translate(' + ((best.a[0] + best.b[0]) / 2) + ' ' + ((best.a[1] + best.b[1]) / 2) + ') rotate(' + ang.toFixed(1) + ')" style="fill:' + c + '"/>';
    }
    return grp(p.id, s, ' data-fl="' + p.fl + '"');
  }
  L.partSVG = partSVG; L.pipeSVG = pipeSVG; L.rotor = rotor;

  /* ========================================================= nozzle & plume */
  /* A bell nozzle whose exit radius follows the expansion ratio on a compressed scale.
     o: { xt, cy, rt, maxRe, maxL } \u2014 defaults match the liquid-cycle stage. */
  function noz(eps, o) {
    o = o || {};
    var rt = o.rt || RT, xt = o.xt || XT, maxRe = o.maxRe || 228, maxL = o.maxL || 220;
    var re = Math.max(rt + 6, Math.min(maxRe, rt * Math.pow(eps, 0.38)));
    var len = Math.min(maxL, (re - rt) * 1.35 + 24);
    return { re: re, L: len, xe: xt + len, rt: rt, xt: xt, cy: o.cy || CY, maxRe: maxRe };
  }
  function bez(a, b, c, d, t) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; }
  function bellPts(n) { var cy = n.cy; return [[n.xt, cy - n.rt], [n.xt + n.L * 0.28, cy - n.rt - (n.re - n.rt) * 0.62], [n.xt + n.L * 0.62, cy - n.re], [n.xe, cy - n.re]]; }
  function bellD(n, lower) {
    var c = bellPts(n), f = function (v) { return (lower ? 2 * n.cy - v : v).toFixed(1); };
    return 'M' + c[0][0].toFixed(1) + ' ' + f(c[0][1]) + ' C' + c[1][0].toFixed(1) + ' ' + f(c[1][1]) + ' ' + c[2][0].toFixed(1) + ' ' + f(c[2][1]) + ' ' + c[3][0].toFixed(1) + ' ' + f(c[3][1]);
  }
  function bellFill(n) {
    var c = bellPts(n), cy = n.cy, m = function (v) { return (2 * cy - v).toFixed(1); };
    return bellD(n, false) + ' L' + n.xe.toFixed(1) + ' ' + m(c[3][1]) + ' C' + c[2][0].toFixed(1) + ' ' + m(c[2][1]) + ' ' +
      c[1][0].toFixed(1) + ' ' + m(c[1][1]) + ' ' + n.xt.toFixed(1) + ' ' + (cy + n.rt).toFixed(1) + ' Z';
  }
  function bellAtRadius(n, r) {
    var c = bellPts(n);
    for (var t = 0; t <= 1.0001; t += 0.01) {
      if (n.cy - bez(c[0][1], c[1][1], c[2][1], c[3][1], t) >= r) return bez(c[0][0], c[1][0], c[2][0], c[3][0], t);
    }
    return n.xe;
  }
  function visR(eps, n) { return Math.max(n.rt + 4, Math.min(n.maxRe, n.rt * Math.pow(eps, 0.38))); }

  /* plume from (x0, cy) with half-height r0; state is an expansion() key. o: { xend, id, opacity } */
  function plumeSVG(state, x0, r0, cy, o) {
    o = o || {};
    var xend = o.xend || XEND, L = xend - x0, top;
    if (state === 'vac') top = [[x0 + L * 0.25, cy - r0 - L * 0.30], [x0 + L * 0.6, cy - r0 - L * 0.55], [xend, cy - r0 - L * 0.62]];
    else if (state === 'under') top = [[x0 + 36, cy - r0 * 1.55], [x0 + L * 0.5, cy - r0 * 1.5], [xend, cy - r0 * 1.35]];
    else if (state === 'ideal') top = [[x0 + L * 0.3, cy - r0 * 1.02], [x0 + L * 0.7, cy - r0 * 0.92], [xend, cy - r0 * 0.8]];
    else if (state === 'edge' || state === 'sep') top = [[x0 + L * 0.12, cy - r0 * 0.6], [x0 + L * 0.5, cy - r0 * 0.5], [xend, cy - r0 * 0.42]];
    else top = [[x0 + L * 0.15, cy - r0 * 0.72], [x0 + L * 0.5, cy - r0 * 0.62], [xend, cy - r0 * 0.52]];
    function shape(scale) {
      function Y(y) { return Math.max(6, Math.min(534, cy + (y - cy) * scale)); }
      function M(y) { return 2 * cy - y; }
      var t = top.map(function (q) { return [q[0].toFixed(1), Y(q[1]).toFixed(1), Y(M(q[1])).toFixed(1)]; });
      return 'M' + x0.toFixed(1) + ' ' + Y(cy - r0).toFixed(1) + ' C' + t[0][0] + ' ' + t[0][1] + ' ' + t[1][0] + ' ' + t[1][1] + ' ' + t[2][0] + ' ' + t[2][1] +
        ' L' + t[2][0] + ' ' + t[2][2] + ' C' + t[1][0] + ' ' + t[1][2] + ' ' + t[0][0] + ' ' + t[0][2] + ' ' + x0.toFixed(1) + ' ' + Y(cy + r0).toFixed(1) + ' Z';
    }
    var dia = '';
    if (state === 'over' || state === 'edge' || state === 'sep' || state === 'ideal') {
      var sp = Math.max(30, r0 * 1.1), d = Math.max(6, r0 * 0.32);
      for (var x = x0 + sp * 0.75, i = 0; x < xend - d && i < 8; x += sp, i++) {
        dia += '<path class="atl-dia" style="opacity:' + (0.85 - i * 0.09).toFixed(2) + '" d="M' + (x - d).toFixed(1) + ' ' + cy + ' L' + x.toFixed(1) + ' ' + (cy - d * 0.55).toFixed(1) +
          ' L' + (x + d).toFixed(1) + ' ' + cy + ' L' + x.toFixed(1) + ' ' + (cy + d * 0.55).toFixed(1) + ' Z"/>';
      }
    }
    return grp(o.id || 'plume', '<g class="atl-plume"' + (o.opacity != null ? ' style="opacity:' + o.opacity + '"' : '') + '><path d="' + shape(1) + '" fill="url(#atlPlumeG)"/><path class="atl-core" d="' + shape(0.42) + '"/>' + dia + '</g>');
  }

  /* A complete bell nozzle (fill, walls, label, separation mark, plume) for a rocket() result p. */
  function nozzleSVG(p, o) {
    o = o || {};
    var n = noz(p.eps, o), ex = expansion(p), up = bellD(n, false), lo = bellD(n, true), s = '';
    var x0 = n.xe, r0 = n.re;
    if (p.sep) { r0 = Math.min(n.re, visR(p.epsEff, n)); x0 = bellAtRadius(n, r0); }
    if (!o.noPlume) s += plumeSVG(ex.k, x0, r0, n.cy, { xend: o.xend, id: o.plumeId, opacity: o.plumeOpacity });
    var sepMark = '';
    if (p.sep) {
      sepMark = '<path class="atl-sep" d="M' + (x0 - 6).toFixed(1) + ' ' + (n.cy - r0 - 10).toFixed(1) + ' l6 6 l6 -6 l6 6 M' + (x0 - 6).toFixed(1) + ' ' + (n.cy + r0 + 10).toFixed(1) + ' l6 -6 l6 6 l6 -6"/>' +
        tx(x0, Math.max(14, n.cy - r0 - 18), 'FLOW SEPARATES HERE', 'atl-t2 atl-warn', 'middle');
    }
    var nlx = Math.max(n.xt + 34, n.xt + n.L * 0.55);
    s += grp(o.id || 'nozzle', path(bellFill(n), '', ' fill="url(#atlNozG)"') + (o.ablative ? path(up, 'atl-abl') + path(lo, 'atl-abl') : '') +
      path(up, o.wallCls || 'atl-wall') + path(lo, o.wallCls || 'atl-wall') +
      (o.noLabel ? '' : tx(nlx, n.cy + 4, o.label || 'NOZZLE', 'atl-t', 'middle') + tx(nlx, n.cy + 19, '\u03B5 ' + fEps(p.eps), 'atl-t2', 'middle')) + sepMark);
    return { svg: s, n: n, ex: ex };
  }
  L.noz = noz; L.bellD = bellD; L.bellFill = bellFill; L.bellPts = bellPts; L.bellAtRadius = bellAtRadius; L.visR = visR;
  L.plumeSVG = plumeSVG; L.nozzleSVG = nozzleSVG;

  /* gradients shared by every stage */
  function defs(jEnd) {
    return '<defs>' +
      '<radialGradient id="atlGlow" cx="0.45" cy="0.5" r="0.62"><stop offset="0" style="stop-color:#FFE9B8;stop-opacity:.95"/><stop offset=".45" style="stop-color:var(--oxide);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--oxide);stop-opacity:.1"/></radialGradient>' +
      '<linearGradient id="atlNozG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:var(--oxide);stop-opacity:.5"/><stop offset="1" style="stop-color:var(--gold);stop-opacity:.08"/></linearGradient>' +
      '<linearGradient id="atlPlumeG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:var(--oxide);stop-opacity:.72"/><stop offset=".45" style="stop-color:var(--gold);stop-opacity:.34"/><stop offset="1" style="stop-color:var(--gold);stop-opacity:0"/></linearGradient>' +
      '<linearGradient id="atlBeamG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:var(--atl-ion);stop-opacity:.7"/><stop offset="1" style="stop-color:var(--atl-ion);stop-opacity:0"/></linearGradient>' +
      '<linearGradient id="atlPlasmaG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:var(--atl-plasma);stop-opacity:.75"/><stop offset="1" style="stop-color:var(--atl-plasma);stop-opacity:0"/></linearGradient>' +
      '<linearGradient id="atlJacketG" gradientUnits="userSpaceOnUse" x1="778" y1="0" x2="640" y2="0"><stop offset="0" style="stop-color:var(--atl-fuel)"/><stop offset="1" style="stop-color:' + (jEnd || 'var(--oxide)') + '"/></linearGradient>' +
      '</defs>';
  }
  L.defs = defs;

  /* ============================================== simple charts for models */
  /* o: { series:[{pts:[[x,y]], cls, style}], axes:{x:[a,b], y:[a,b], xlog, ylog, xt:[], yt:[], xl, yl, xf, yf}, marks, vlines, bands, legend } */
  function lineChart(o) {
    var W = o.W || 560, H = o.H || 300, ml = o.ml || 58, mr = o.mr || 20, mt = o.mt || 30, mb = o.mb || 46, iw = W - ml - mr, ih = H - mt - mb;
    var ax = o.axes, lx = function (v) { return ax.xlog ? Math.log10(v) : v; }, ly = function (v) { return ax.ylog ? Math.log10(v) : v; };
    var x0 = lx(ax.x[0]), x1 = lx(ax.x[1]), y0 = ly(ax.y[0]), y1 = ly(ax.y[1]);
    function X(v) { return ml + (lx(Math.max(ax.x[0], Math.min(ax.x[1], v))) - x0) / (x1 - x0) * iw; }
    function Y(v) { return mt + (1 - (ly(Math.max(ax.y[0], Math.min(ax.y[1], v))) - y0) / (y1 - y0)) * ih; }
    var s = '';
    (ax.yt || []).forEach(function (t) { var y = Y(t); s += '<line class="atl-grid" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>' + tx(ml - 6, y + 3.5, (ax.yf || fS)(t), 'atl-ax', 'end'); });
    (ax.xt || []).forEach(function (t) { var x = X(t); s += '<line class="atl-grid" x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + mt + '" y2="' + (H - mb) + '"/>' + tx(x, H - mb + 15, (ax.xf || fS)(t), 'atl-ax', 'middle'); });
    if (ax.xl) s += tx(ml + iw / 2, H - 8, ax.xl, 'atl-ax', 'middle');
    if (ax.yl) s += tx(4, mt - 14, ax.yl, 'atl-ax', 'start');
    (o.bands || []).forEach(function (b) { s += rect(X(b.x0), mt, Math.max(0, X(b.x1) - X(b.x0)), ih, 'atl-band', b.style ? ' style="' + b.style + '"' : '') + (b.label ? tx((X(b.x0) + X(b.x1)) / 2, mt + 12, b.label, 'atl-ax', 'middle') : ''); });
    (o.series || []).forEach(function (sr) {
      var pts = sr.pts.filter(function (q) { return isFinite(q[0]) && isFinite(q[1]); });
      if (pts.length < 2) return;
      s += '<path class="' + (sr.cls || 'atl-lp') + '" d="' + pd(pts.map(function (q) { return [X(q[0]), Y(q[1])]; })) + '"' + (sr.style ? ' style="' + sr.style + '"' : '') + '/>';
    });
    (o.vlines || []).forEach(function (v) { var x = X(v.x); s += '<line class="' + (v.cls || 'atl-vline') + '" x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + mt + '" y2="' + (H - mb) + '"/>' + (v.label ? tx(x + 4, mt + 10, v.label, 'atl-ax', 'start') : ''); });
    (o.marks || []).forEach(function (m) {
      var x = X(m.x), y = Y(m.y);
      s += circ(x, y, m.r || 5, m.cls || 'atl-ring2') + (m.label ? tx(x + (m.dx == null ? 8 : m.dx), y + (m.dy == null ? -8 : m.dy), m.label, 'atl-t2 atl-mlbl', m.anchor || 'start') : '');
    });
    if (o.legend) {
      var lxp = ml + 4;
      s += '<g transform="translate(0 ' + (mt - 14) + ')">';
      o.legend.forEach(function (l) { s += '<line class="' + l.cls + '" x1="' + lxp + '" x2="' + (lxp + 18) + '" y1="-4" y2="-4"' + (l.style ? ' style="' + l.style + '"' : '') + '/>' + tx(lxp + 22, 0, l.label, 'atl-ax', 'start'); lxp += 30 + l.label.length * 6.2; });
      s += '</g>';
    }
    return { svg: '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Chart') + '">' + s + '</svg>', X: X, Y: Y };
  }
  L.lineChart = lineChart;

  /* ====================================================== liquid-cycle model */
  var PROP_ORDER = ['lh2', 'ch4', 'rp1', 'hyp'];
  function liquidPerf(v, e) {
    var P = A.props[v.prop], tm = interp(P.tab, v.of);
    var p = rocket(P.g, tm[0], tm[1], v.pc, v.eps, ambient(v.alt), A.eta.cstar, A.eta.nozzle);
    var f = 0, k = 0;
    if (e.open) { f = Math.min(0.15, e.open.f0 * v.pc / e.open.pref); k = e.open.k; }
    p.ispMain = p.isp; p.f = f; p.k = k; p.cyc = 1 - f * (1 - k); p.isp = p.ispMain * p.cyc;
    p.At = Math.PI * Math.pow(v.dt / 200, 2);
    p.mTot = v.pc * 1e5 * p.At / p.cs / (1 - f);
    p.F = p.isp * G0 * p.mTot;
    return p;
  }
  function liquidChamber(e, p) {
    var ch = e.chamber, s = '', nz = nozzleSVG(p, { ablative: ch.ablative });
    s += nz.svg;
    if (ch.regen) {
      var ju = 'M778 236 L743 202 L640 202', jl = 'M778 304 L743 338 L640 338';
      s += grp('jacket', path(ju, 'atl-jw') + path(jl, 'atl-jw') + path(ju, 'atl-jg') + path(jl, 'atl-jg') +
        path(ju, 'atl-jf') + path(jl, 'atl-jf') + tx(700, 364, 'COOLING JACKET', 'atl-t2', 'middle'));
    }
    var body = 'M' + XI + ' ' + (CY - RC) + ' L' + XC + ' ' + (CY - RC) + ' L' + XT + ' ' + (CY - RT) + ' L' + XT + ' ' + (CY + RT) + ' L' + XC + ' ' + (CY + RC) + ' L' + XI + ' ' + (CY + RC) + ' Z';
    var wu = 'M' + XI + ' ' + (CY - RC) + ' L' + XC + ' ' + (CY - RC) + ' L' + XT + ' ' + (CY - RT);
    var wl = 'M' + XI + ' ' + (CY + RC) + ' L' + XC + ' ' + (CY + RC) + ' L' + XT + ' ' + (CY + RT);
    s += grp('chamber', path(body, '', ' fill="url(#atlGlow)"') + '<ellipse cx="700" cy="' + CY + '" rx="52" ry="38" class="atl-fire"/>' +
      (ch.ablative ? path(wu, 'atl-abl') + path(wl, 'atl-abl') + tx(700, 364, 'ABLATIVE LINER', 'atl-t2', 'middle') : '') +
      path(wu, 'atl-wall') + path(wl, 'atl-wall') + tx(690, CY + 4, 'CHAMBER', 'atl-t atl-tb', 'middle'));
    var holes = '';
    for (var hy = 222; hy <= 318; hy += 12) holes += circ(640, hy, 1.8, 'atl-hole');
    s += grp('inj', path('M640 206 C604 210 596 248 596 270 C596 292 604 330 640 334 Z', 'atl-dome') + '<line class="atl-plate" x1="640" y1="208" x2="640" y2="332"/>' +
      holes + tx(614, 388, 'INJECTOR', 'atl-t2', 'end'));
    if (ch.tap) s += grp('tap', circ(690, 208, 6, 'atl-tapc') + tx(682, 184, 'TAP-OFF PORT', 'atl-t2', 'end'));
    return s;
  }
  function liquidStations(e, p, v) {
    var P = A.props[v.prop], Pc = p.Pc, Tf = P.Tf, tj = P.tj, tpb = P.tpb, texp = v.prop === 'ch4' ? 420 : 240;
    var out = { title: 'Follow the fuel: pressure and temperature along the way', pts: [] };
    switch (e.st) {
      case 'pf': out.pts = [{ l: 'He bottle', P: 300, T: 290, side: true }, { l: 'Tank', P: 1.5 * Pc, T: Tf }, { l: 'Injector', P: 1.2 * Pc, T: Tf }]; break;
      case 'elec': out.pts = [{ l: 'Tank', P: 2.5, T: Tf }, { l: 'Pump out', P: 1.5 * Pc, T: Tf }, { l: 'Jacket out', P: 1.25 * Pc, T: tj }]; break;
      case 'gg': out.pts = [{ l: 'Tank', P: 3, T: Tf }, { l: 'Pump out', P: 1.35 * Pc, T: Tf }, { l: 'Gas gen', P: 0.9 * Pc, T: 1000, side: true }, { l: 'Turb out', P: 2.5, T: 700, side: true }, { l: 'Jacket out', P: 1.2 * Pc, T: tj }]; break;
      case 'tap': out.pts = [{ l: 'Tank', P: 3, T: Tf }, { l: 'Pump out', P: 1.3 * Pc, T: Tf }, { l: 'Jacket out', P: 1.15 * Pc, T: tj }, { l: 'Tap gas', P: 0.95 * Pc, T: 1050, side: true }, { l: 'Turb out', P: 2.5, T: 750, side: true }]; break;
      case 'exp': out.title = 'Follow the fuel \u2014 it drives the turbine'; out.pts = [{ l: 'Tank', P: 2, T: Tf }, { l: 'Pump out', P: 2 * Pc, T: Tf }, { l: 'Jacket out', P: 1.7 * Pc, T: texp }, { l: 'Turb out', P: 1.2 * Pc, T: texp * 0.85 }, { l: 'Injector', P: 1.1 * Pc, T: texp * 0.85 }]; break;
      case 'bleed': out.pts = [{ l: 'Tank', P: 2, T: Tf }, { l: 'Pump out', P: 1.5 * Pc, T: Tf }, { l: 'Jacket out', P: 1.3 * Pc, T: texp }, { l: 'Turb out', P: 1.5, T: texp * 0.6, side: true }, { l: 'Injector', P: 1.1 * Pc, T: texp }]; break;
      case 'fr': out.title = 'Follow the fuel \u2014 it drives the turbine'; out.pts = [{ l: 'Tank', P: 3, T: Tf }, { l: 'Pump out', P: 2.1 * Pc, T: Tf }, { l: 'Preburner', P: 1.6 * Pc, T: tpb }, { l: 'Turb out', P: 1.2 * Pc, T: tpb * 0.8 }, { l: 'Injector', P: 1.1 * Pc, T: tpb * 0.8 }]; break;
      case 'ox': out.title = 'Follow the oxidiser \u2014 it drives the turbine'; out.pts = [{ l: 'Tank', P: 3, T: P.To }, { l: 'Pump out', P: 2.2 * Pc, T: P.To }, { l: 'Preburner', P: 1.7 * Pc, T: 760 }, { l: 'Turb out', P: 1.25 * Pc, T: 650 }, { l: 'Injector', P: 1.1 * Pc, T: 650 }]; break;
      case 'ff': out.pts = [{ l: 'Tank', P: 3, T: Tf }, { l: 'Pump out', P: 2.2 * Pc, T: Tf }, { l: 'Jacket out', P: 2.0 * Pc, T: tj }, { l: 'Preburner', P: 1.7 * Pc, T: tpb }, { l: 'Turb out', P: 1.2 * Pc, T: tpb * 0.82 }, { l: 'Injector', P: 1.1 * Pc, T: tpb * 0.82 }]; break;
    }
    out.pts = out.pts.concat([{ l: 'Chamber', P: Pc, T: p.Tc }, { l: 'Throat', P: p.Pt, T: p.Tt }, { l: 'Exit', P: Math.max(p.Pe, 0.001), T: p.Te }]);
    return out;
  }
  /* pressure (log) + temperature path chart, shared by any model that has "stations" */
  function stationChart(d) {
    var W = 560, H = 300, ml = 56, mr = 56, mt = 30, mb = 70, n = d.pts.length, ih = H - mt - mb, iw = W - ml - mr, tmax = d.tmax || 4000;
    function X(i) { return ml + i * iw / (n - 1); }
    function YP(P) { return mt + ih * (1 - (Math.log10(Math.max(P, 0.001)) + 3) / 6); }
    function YT(T) { return mt + ih * (1 - Math.min(T, tmax) / tmax); }
    var s = '';
    ['0.001', '0.01', '0.1', '1', '10', '100', '1000'].forEach(function (v) {
      var y = YP(+v);
      s += '<line class="atl-grid" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>' + tx(ml - 6, y + 3.5, v, 'atl-ax', 'end');
    });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) { s += tx(W - mr + 6, YT(f * tmax) + 3.5, nf(f * tmax, 0), 'atl-ax atl-axt', 'start'); });
    s += tx(4, mt - 12, 'bar (log)', 'atl-ax', 'start') + tx(W - 4, mt - 12, 'kelvin', 'atl-ax atl-axt', 'end');
    var pp = d.pts.map(function (q, i) { return [X(i), YP(q.P)]; }), tp = d.pts.map(function (q, i) { return [X(i), YT(q.T)]; });
    s += path(pd(pp), 'atl-lp') + path(pd(tp), 'atl-lt');
    d.pts.forEach(function (q, i) {
      s += circT(pp[i][0], pp[i][1], 3.8, 'atl-mp' + (q.side ? ' atl-hol' : ''), '', q.l + ': ' + fp(q.P) + ' bar');
      s += circT(tp[i][0], tp[i][1], 3.8, 'atl-mt' + (q.side ? ' atl-hol' : ''), '', q.l + ': ' + nf(q.T, 0) + ' K');
      s += '<text class="atl-ax atl-axl" text-anchor="end" transform="translate(' + X(i).toFixed(1) + ' ' + (H - mb + 14) + ') rotate(-38)">' + esc(q.l) + '</text>';
    });
    s += '<g transform="translate(' + ml + ' ' + (mt - 16) + ')"><line class="atl-lp" x1="70" x2="88" y1="-4" y2="-4"/>' + tx(92, 0, 'pressure', 'atl-ax', 'start') +
      '<line class="atl-lt" x1="160" x2="178" y1="-4" y2="-4"/>' + tx(182, 0, 'temperature', 'atl-ax', 'start') + '</g>';
    return '<svg viewBox="0 0 560 300" role="img" aria-label="Pressure and temperature at each station along the flow path">' + s + '</svg>';
  }
  L.stationChart = stationChart;

  function rng(k, label, min, max, o) { o = o || {}; o.k = k; o.type = 'range'; o.label = label; o.min = min; o.max = max; return o; }
  L.rng = rng;

  A.models.liquid = {
    init: function (e) { return { prop: e.prop, pc: e.pc.nom, of: A.props[e.prop].ofNom, eps: e.eps, dt: e.dt, alt: e.alt }; },
    controls: function (e, v) {
      var P = A.props[v.prop];
      return [
        { k: 'prop', type: 'choice', label: 'Propellants', options: PROP_ORDER.map(function (k) {
          return { v: k, label: A.props[k].name, sub: A.props[k].short, no: e.props[k] === true ? null : e.props[k] };
        }), onSet: function (vv) { vv.of = A.props[vv.prop].ofNom; } },
        rng('pc', 'Chamber pressure', e.pc.min, e.pc.max, { step: e.pc.max <= 40 ? 0.1 : 1, fmt: function (x) { return fp(x) + ' bar'; }, why: { q: 'Why does this stop at ' + e.pc.max + ' bar?', a: e.pc.why } }),
        rng('of', 'Mixture ratio (O/F)', P.of[0], P.of[1], { step: 0.01, fmt: function (x) { return nf(x, 2); }, help: 'Kilograms of oxidiser per kilogram of fuel. Engines run richer in fuel than a chemically perfect burn, because lighter exhaust molecules fly out faster.' }),
        rng('eps', 'Expansion ratio (<span class="atl-nt">\u03B5</span>)', 2, 300, { log: true, fmt: fEps, help: 'Nozzle exit area divided by throat area. Bigger means more expansion \u2014 better in vacuum, risky at sea level.' }),
        rng('dt', 'Throat diameter', 1, 100, { log: true, fmt: function (x) { return x < 10 ? nf(x, 1) + ' cm' : nf(x, 0) + ' cm'; }, help: 'Sets the engine\u2019s size, and so its thrust. It doesn\u2019t change Isp.' }),
        rng('alt', 'Altitude', 0, 100, { step: 1, keepPreset: true, fmt: function (x) { return x === 0 ? 'Sea level' : (x >= 100 ? 'Vacuum' : x + ' km \u00B7 ' + fp(ambient(x)) + ' bar'); }, help: 'Outside air pushes back on the exhaust. At 100 km it\u2019s effectively vacuum.' })
      ];
    },
    compute: function (e, v) { return liquidPerf(v, e); },
    speed: function (e, v) { return Math.max(0.35, Math.min(2.2, v.pc / e.pc.nom)); },
    stageStatic: function (e, v) {
      var P = A.props[v.prop], s = defs((e.st === 'exp' || e.st === 'bleed') ? 'var(--atl-vap)' : 'var(--oxide)');
      e.parts.forEach(function (c) { if (c.type === 'shaft') s += partSVG(c, P); });
      e.pipes.forEach(function (p) { s += pipeSVG(p); });
      e.parts.forEach(function (c) { if (c.type !== 'shaft') s += partSVG(c, P); });
      return s;
    },
    stageDynamic: function (e, v, p) { return liquidChamber(e, p); },
    legendExtra: function (e) {
      var out = [];
      if (e.chamber.regen) out.push('<span class="atl-lg"><i class="atl-lgj' + ((e.st === 'exp' || e.st === 'bleed') ? ' atl-lgv' : '') + '"></i>Fuel heating in the cooling jacket</span>');
      if (e.chamber.ablative) out.push('<span class="atl-lg"><i class="atl-lga"></i>Ablative liner</span>');
      return out;
    },
    outputs: function (e, v, p, chs) {
      var rows = [['Chamber temperature', nf(p.Tc, 0) + ' K'], ['Characteristic velocity c*', nf(p.cs, 0) + ' m/s'], ['Thrust coefficient C<sub>F</sub>', nf(p.cf, 3)],
        ['Exit Mach number', nf(p.Me, 2)], ['Exit pressure', fp(p.Pe) + ' bar'], ['Exit temperature', nf(p.Te, 0) + ' K']];
      if (e.open) rows.push(['Turbine gas dumped', nf(p.f * 100, 1) + '% of flow \u2192 costs ' + nf((1 - p.cyc) * 100, 1) + '% of Isp']);
      return {
        big: [{ l: 'Specific impulse', v: nf(p.isp, 0) + ' s', s: 'Exhaust leaves at ' + nf(p.isp * G0 / 1000, 2) + ' km/s effective' },
          { l: 'Thrust', v: fT(p.F / 1000 * chs), s: chs > 1 ? chs + ' chambers \u00D7 ' + fT(p.F / 1000) : 'Burning ' + nf(p.mTot, p.mTot < 10 ? 2 : 0) + ' kg of propellant a second' }],
        rows: rows, badge: expansion(p)
      };
    },
    chart: function (e, v, p) {
      var d = liquidStations(e, p, v);
      return { title: d.title, svg: stationChart(d), note: 'Chamber, throat and exit come straight from the model. Upstream stations use typical ratios for this cycle, to show the shape of the journey. Hollow markers are a side branch.' };
    },
    eq: function (e, v, p) {
      var g = p.g, P = A.props[v.prop];
      return '<ol class="atl-eqs">' +
        '<li><b>Characteristic velocity</b> \u2014 how energetic the chamber gas is.<code>c* = \u03B7 \u00B7 \u221A(R\u00B7T<sub>c</sub>) / \u0393 = 0.98 \u00B7 \u221A(' + nf(p.R, 0) + ' \u00D7 ' + nf(p.Tc, 0) + ') / ' + nf(p.Gam, 4) + ' = ' + nf(p.cs, 0) + ' m/s</code>' +
          '<span>\u0393 = \u221A\u03B3 \u00B7 (2/(\u03B3+1))<sup>(\u03B3+1)/(2(\u03B3\u22121))</sup> with \u03B3 = ' + nf(g, 3) + '. R = 8,314 / M, with the exhaust\u2019s average molar mass M = ' + nf(p.M, 1) + ' kg/kmol at O/F ' + nf(v.of, 2) + '.</span></li>' +
        '<li><b>Exit Mach number</b> \u2014 solved from the area ratio.<code>\u03B5 = ' + fEps(p.epsEff) + (p.sep ? ' (effective, after separation)' : '') + ' \u2192 M<sub>e</sub> = ' + nf(p.Me, 2) + '</code>' +
          '<span>From \u03B5 = (1/M) \u00B7 [(2/(\u03B3+1)) \u00B7 (1 + (\u03B3\u22121)/2 \u00B7 M\u00B2)]<sup>(\u03B3+1)/(2(\u03B3\u22121))</sup>, solved numerically for the supersonic root.</span></li>' +
        '<li><b>Exit pressure</b><code>P<sub>e</sub> = P<sub>c</sub> \u00B7 (1 + (\u03B3\u22121)/2 \u00B7 M<sub>e</sub>\u00B2)<sup>\u2212\u03B3/(\u03B3\u22121)</sup> = ' + fp(p.Pc) + ' \u00D7 ' + p.pr.toExponential(2) + ' = ' + fp(p.Pe) + ' bar</code></li>' +
        '<li><b>Thrust coefficient</b> \u2014 how well the nozzle turns pressure into push.<code>C<sub>F</sub> = \u03BB \u00B7 \u221A(2\u03B3\u00B2/(\u03B3\u22121) \u00B7 (2/(\u03B3+1))<sup>(\u03B3+1)/(\u03B3\u22121)</sup> \u00B7 (1 \u2212 (P<sub>e</sub>/P<sub>c</sub>)<sup>(\u03B3\u22121)/\u03B3</sup>)) + \u03B5(P<sub>e</sub> \u2212 P<sub>a</sub>)/P<sub>c</sub></code>' +
          '<code>= ' + nf(p.mom, 3) + ' + (' + nf(p.press, 3) + ') = ' + nf(p.cf, 3) + '</code><span>\u03BB = 0.985 accounts for exhaust leaving the bell at a slight angle. The second term is the pressure thrust: positive when the exhaust is above ambient, negative when the air pushes back.</span></li>' +
        '<li><b>Specific impulse</b><code>I<sub>sp</sub> = c* \u00B7 C<sub>F</sub> / g\u2080 = ' + nf(p.cs, 0) + ' \u00D7 ' + nf(p.cf, 3) + ' / 9.81 = ' + nf(p.ispMain, 1) + ' s</code>' +
          (e.open ? '<code>\u00D7 cycle factor (1 \u2212 f(1 \u2212 k)) = \u00D7 ' + nf(p.cyc, 4) + ' = ' + nf(p.isp, 1) + ' s</code><span>An open cycle dumps a fraction f = ' + nf(p.f * 100, 1) + '% of the flow after the turbine, at only k = ' + nf(p.k, 2) + ' of the main exhaust\u2019s efficiency. f grows with chamber pressure \u2014 that\u2019s the open cycle\u2019s ceiling.</span>' : '') + '</li>' +
        '<li><b>Thrust and flow</b><code>F = I<sub>sp</sub> \u00B7 g\u2080 \u00B7 \u1E41 = ' + fT(p.F / 1000) + ',  \u1E41 = P<sub>c</sub> \u00B7 A<sub>t</sub> / c* = ' + nf(p.mTot, p.mTot < 10 ? 2 : 1) + ' kg/s</code></li>' +
        '</ol>' +
        '<p class="atl-eqnote"><b>What\u2019s simplified.</b> Real exhaust changes chemistry as it expands. The model stands that in with one effective \u03B3 per propellant (' + esc(P.short) + ': ' + nf(g, 3) + '), fitted so these equations reproduce 18 real engines with a mean error of about 1.4%. \u03B7 = 0.98 is combustion efficiency. Flow separation: the classic textbook rule says flow detaches once exit pressure falls below about 40% of outside pressure, but modern bell nozzles on engines like the RS-25 and LE-7A stay attached down to roughly 20%. The model treats flow as attached above 15% and flags 15\u201330% as on the edge.</p>';
    },
    stats: function (x) {
      var bits = [];
      if (x.isp && x.isp.sl) bits.push(nf(x.isp.sl, x.isp.sl % 1 ? 1 : 0) + ' s sea level');
      if (x.isp && x.isp.vac) bits.push(nf(x.isp.vac, x.isp.vac % 1 ? 1 : 0) + ' s vacuum');
      if (x.thrust && x.thrust.sl) bits.push(fT(x.thrust.sl) + ' SL');
      if (x.thrust && x.thrust.vac) bits.push(fT(x.thrust.vac) + ' vac');
      var out = [bits.join(' \u00B7 ')];
      if (x.preset) out.push('Pc ' + fp(x.pc) + ' bar \u00B7 O/F ' + x.of + ' \u00B7 \u03B5 ' + fEps(x.eps) + (x.chambers ? ' \u00B7 ' + x.chambers + ' chambers' : ''));
      return out;
    },
    preset: function (e, x) {
      var v = { prop: x.prop, pc: x.pc, of: x.of, eps: x.eps, alt: x.isp.sl ? 0 : 100, dt: 10 };
      var ch = x.chambers || 1, useAlt = x.thrust.sl ? 0 : 100, Fpub = (x.thrust.sl || x.thrust.vac) / ch;
      var p = liquidPerf({ prop: v.prop, pc: v.pc, of: v.of, eps: v.eps, dt: 10, alt: useAlt }, e);
      /* size the throat so the model\u2019s thrust matches the published figure (open cycles also burn the dumped turbine flow) */
      var At = Fpub * 1000 * (1 - p.f) / (p.cf * p.cyc * v.pc * 1e5);
      v.dt = Math.max(1, Math.min(100, 200 * Math.sqrt(At / Math.PI)));
      return { v: v, ch: ch };
    },
    vs: function (e, v, p, x) {
      var pub = null, where = '';
      if (v.alt === 0 && x.isp.sl) { pub = x.isp.sl; where = 'at sea level'; } else if (v.alt >= 100 && x.isp.vac) { pub = x.isp.vac; where = 'in vacuum'; }
      if (!pub) return '<span class="lbl">Model vs the real ' + esc(x.name) + '</span><p>Published figures are for ' + (x.isp.sl && x.isp.vac ? 'sea level and vacuum' : (x.isp.sl ? 'sea level' : 'vacuum')) + ' \u2014 set the altitude to ' + (x.isp.sl && x.isp.vac ? '0 or 100 km' : (x.isp.sl ? '0 km' : '100 km')) + ' to compare.</p>';
      var gap = (p.isp - pub) / pub * 100;
      return '<span class="lbl">Model vs the real ' + esc(x.name) + '</span><p>Published Isp ' + where + ': <strong>' + nf(pub, pub % 1 ? 1 : 0) + ' s</strong>. The model says <strong>' + nf(p.isp, 1) + ' s</strong> \u2014 ' +
        (gap >= 0 ? '+' : '\u2212') + nf(Math.abs(gap), 1) + '%. ' + (Math.abs(gap) < 3 ? 'Within a few percent, from nothing but first principles and one fitted constant per propellant.' : 'The gap is real-world loss the ideal equations don\u2019t see: incomplete mixing, heat lost to the walls, boundary layers.') +
        ' Thrust matches by construction \u2014 the throat is sized from the published thrust.</p>';
    },
    mapPoint: function (e, v, p, chs) {
      var pv = liquidPerf({ prop: v.prop, pc: v.pc, of: v.of, eps: v.eps, dt: v.dt, alt: 100 }, e);
      return { F: pv.F * chs, isp: pv.isp };
    },
    mapOf: function (x) {
      if (!x.thrust || !x.isp) return null;
      var F = x.thrust.vac || x.thrust.sl, isp = x.isp.vac || x.isp.sl;
      return F && isp ? { F: F * 1000, isp: isp, hol: !x.isp.vac } : null;
    }
  };

  /* ================================================================ families */
  function buildFamilies() {
    var fams = [{
      id: 'liquid', name: 'Liquid cycles', kicker: 'Liquid-propellant cycle', color: 'var(--oxide)',
      blurb: 'Pumps, turbines and preburners: nine ways to feed a liquid rocket, from simplest to hardest.',
      engines: A.engines.map(function (e) {
        e.model = 'liquid';
        if (!Array.isArray(e.glance)) {
          var g = e.glance;
          e.glance = [['Turbine driven by', g.drive], ['Turbine exhaust', g.exhaust], ['Wall cooling', g.cooling], ['Typical chamber pressure', g.pc], ['Isp given up', g.penalty]];
        }
        return e;
      }),
      compare: { title: 'The nine cycles side by side', first: 'Cycle', cols: ['Turbine driven by', 'Turbine exhaust', 'Typical chamber pressure', 'Isp given up', 'Flown on'],
        rows: A.compare.map(function (r) { return { id: r.id, cells: [r.drive, r.ex, r.pc, r.pen, r.flown] }; }) }
    }];
    return fams.concat(A.moreFamilies || []);
  }
  A.buildFamilies = buildFamilies;

  /* ===================================================================== UI */
  function mount() {
    var root = document.getElementById('atlas');
    if (!root) return;
    var FAM = buildFamilies().filter(function (f) { return f.engines.every(function (e) { return A.models[e.model]; }); });
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { /* older browsers */ }
    var S = { f: 0, i: 0, step: 0, v: {}, preset: null, ctl: [] };
    var UI = {}, stage, dynG, molG, playTimer = null, molRAF = null, mols = [], animRAF = null, lastR = null;
    function fam() { return FAM[S.f]; }
    function eng() { return fam().engines[S.i]; }
    function model() { return A.models[eng().model]; }
    function chs() { return S.preset ? S.preset.ch || 1 : 1; }
    function throttle() { var m = model(); return m.speed ? m.speed(eng(), S.v) : 1; }
    function el(id) { return document.getElementById(id); }

    root.innerHTML =
      '<div class="atl">' +
        '<div class="atl-fams" id="atl-fams" role="group" aria-label="Choose a family of engines"></div>' +
        '<p class="atl-famblurb" id="atl-famblurb"></p>' +
        '<div class="atl-pick" id="atl-pick" role="group" aria-label="Choose an engine, simplest to most complex"></div>' +
        '<div class="atl-head"><div class="lbl" id="atl-kick"></div><h4 class="atl-name" id="atl-name"></h4><p class="atl-idea" id="atl-idea"></p></div>' +
        '<p class="atl-swipe" aria-hidden="true">Swipe sideways to see the whole engine \u2192</p>' +
        '<div class="atl-stagewrap"><svg class="atl-stage" id="atl-stage" viewBox="0 0 1120 540" role="img"></svg></div>' +
        '<div class="atl-legend" id="atl-legend"></div>' +
        '<div class="atl-under">' +
          '<div class="atl-step">' +
            '<div class="atl-step-top"><span class="lbl" id="atl-sn"></span><div class="atl-dots" id="atl-dots"></div></div>' +
            '<div aria-live="polite"><h5 class="atl-st" id="atl-st"></h5><p class="atl-sb" id="atl-sb"></p></div>' +
            '<div class="atl-ctl"><button type="button" class="atl-btn" id="atl-prev">\u2190 Back</button>' +
            '<button type="button" class="atl-btn" id="atl-play">Play</button>' +
            '<button type="button" class="atl-btn atl-pri" id="atl-next">Next \u2192</button></div>' +
          '</div>' +
          '<div class="atl-side"><p class="atl-intro" id="atl-intro"></p><dl class="atl-glance" id="atl-glance"></dl></div>' +
        '</div>' +
        '<div class="atl-lab">' +
          '<div class="atl-lab-h"><h5>Physics lab</h5><p id="atl-labp"></p></div>' +
          '<div class="atl-lab-g"><div class="atl-ctrls" id="atl-ctrls"></div>' +
            '<div class="atl-outs">' +
              '<div class="atl-big" id="atl-big"></div>' +
              '<dl class="atl-small" id="atl-small"></dl>' +
              '<div class="atl-badge" id="atl-badge"><span class="atl-bt" id="atl-bt"></span><p id="atl-bx"></p></div>' +
              '<div class="atl-vs" id="atl-vs" hidden></div>' +
            '</div></div>' +
          '<details class="atl-eq"><summary>Show the equations, with your numbers</summary><div id="atl-eqb"></div></details>' +
        '</div>' +
        '<div class="atl-two">' +
          '<div class="atl-card"><span class="lbl" id="atl-cht"></span><div id="atl-chart"></div><p class="atl-note" id="atl-chn"></p></div>' +
          '<div class="atl-card"><span class="lbl" id="atl-exl"></span><div id="atl-ex"></div></div>' +
        '</div>' +
        '<div class="atl-trade" id="atl-trade"></div>' +
        '<div class="atl-global">' +
          '<h5>Every engine in the atlas, on one chart</h5>' +
          '<p class="atl-gp">Thrust against efficiency, both on logarithmic scales \u2014 each gridline is a hundred or ten times the last. Chemical rockets own the top of the thrust range; electric thrusters give up almost all of their thrust for ten times the efficiency. The ring is the engine you\u2019ve set up in the lab. Sails don\u2019t appear: they carry no propellant at all, so their efficiency is effectively infinite.</p>' +
          '<div class="atl-mapwrap"><svg id="atl-map" viewBox="0 0 1000 420" role="img" aria-label="Scatter chart of real engines by thrust and specific impulse, both on log scales"></svg></div>' +
          '<div class="atl-maplegend" id="atl-maplegend"></div>' +
          '<h5 id="atl-cmph"></h5>' +
          '<div class="scroll"><table class="atl-cmp" id="atl-cmp"></table></div>' +
        '</div>' +
      '</div>';

    stage = el('atl-stage');
    ['fams', 'famblurb', 'pick', 'kick', 'name', 'idea', 'legend', 'sn', 'dots', 'st', 'sb', 'prev', 'play', 'next', 'intro', 'glance', 'labp', 'ctrls',
      'big', 'small', 'badge', 'bt', 'bx', 'vs', 'eqb', 'cht', 'chart', 'chn', 'exl', 'ex', 'trade', 'map', 'maplegend', 'cmph', 'cmp'].forEach(function (k) { UI[k] = el('atl-' + k); });

    /* ---------- family tabs + engine picker ---------- */
    UI.fams.innerHTML = FAM.map(function (f, i) {
      return '<button type="button" class="atl-fam" data-f="' + i + '" aria-pressed="false"><i style="background:' + f.color + '"></i>' + esc(f.name) + '<span>' + f.engines.length + '</span></button>';
    }).join('');
    UI.fams.addEventListener('click', function (ev) { var b = ev.target.closest('.atl-fam'); if (b) setFamily(+b.getAttribute('data-f'), true); });
    function renderPicker() {
      UI.pick.innerHTML = fam().engines.map(function (e, i) {
        var pips = '';
        for (var j = 1; j <= 5; j++) pips += j <= (e.level || 1) ? '\u25CF' : '\u25CB';
        return '<button type="button" class="atl-pk" data-i="' + i + '" aria-pressed="false"><span class="atl-pk-n">' + esc(e.short) + '</span>' +
          '<span class="atl-pk-l" aria-label="complexity ' + (e.level || 1) + ' of 5">' + pips + '</span></button>';
      }).join('');
      var fb = UI.fams.querySelectorAll('.atl-fam');
      for (var i = 0; i < fb.length; i++) fb[i].setAttribute('aria-pressed', i === S.f ? 'true' : 'false');
      UI.famblurb.textContent = fam().blurb || '';
    }
    UI.pick.addEventListener('click', function (ev) { var b = ev.target.closest('.atl-pk'); if (b) setEngine(+b.getAttribute('data-i'), true); });

    /* ---------- stepper ---------- */
    UI.prev.addEventListener('click', function () { stopPlay(); if (S.step > 0) { S.step--; applyStep(); } });
    UI.next.addEventListener('click', function () { stopPlay(); var n = eng().steps.length; S.step = S.step < n - 1 ? S.step + 1 : 0; applyStep(); });
    UI.play.addEventListener('click', function () { if (playTimer) stopPlay(); else startPlay(); });
    UI.dots.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) { stopPlay(); S.step = +b.getAttribute('data-s'); applyStep(); } });
    function startPlay() {
      if (S.step >= eng().steps.length - 1) S.step = 0;
      UI.play.textContent = 'Pause'; UI.play.setAttribute('aria-pressed', 'true');
      if (S.step === 0) { S.step = 1; applyStep(); }
      playTimer = setInterval(function () {
        if (S.step >= eng().steps.length - 1) { stopPlay(); return; }
        S.step++; applyStep();
      }, 6500);
    }
    function stopPlay() {
      if (playTimer) clearInterval(playTimer);
      playTimer = null; UI.play.textContent = 'Play'; UI.play.setAttribute('aria-pressed', 'false');
    }

    /* ---------- lab controls (generic) ---------- */
    function toPos(c, x) { return c.log ? 1000 * Math.log(x / c.min) / Math.log(c.max / c.min) : 1000 * (x - c.min) / (c.max - c.min); }
    function fromPos(c, pos) {
      var x = c.log ? c.min * Math.pow(c.max / c.min, pos / 1000) : c.min + (c.max - c.min) * pos / 1000;
      if (c.step) x = Math.round(x / c.step) * c.step;
      return Math.max(c.min, Math.min(c.max, x));
    }
    function renderControls() {
      S.ctl = model().controls(eng(), S.v);
      UI.ctrls.innerHTML = S.ctl.map(function (c) {
        if (c.type === 'choice') {
          return '<div class="atl-c"><span class="lbl">' + c.label + '</span><div class="atl-chips">' + c.options.map(function (o) {
            return '<button type="button" class="atl-chip' + (o.no ? ' atl-no' : '') + '" data-k="' + c.k + '" data-v="' + esc(o.v) + '" aria-pressed="' + (String(S.v[c.k]) === String(o.v)) + '"' + (o.no ? ' aria-disabled="true"' : '') + '>' +
              esc(o.label) + (o.sub ? '<span>' + esc(o.sub) + '</span>' : '') + '</button>';
          }).join('') + '</div><p class="atl-why" data-why="' + c.k + '" hidden></p>' + (c.help ? '<span class="atl-help">' + c.help + '</span>' : '') + '</div>';
        }
        return '<label class="atl-c"><span class="atl-cl"><span class="lbl">' + c.label + '</span>' +
          (c.play ? '<button type="button" class="atl-btn atl-mini" data-play="' + c.k + '">' + esc(c.play) + '</button>' : '') +
          '<output class="mono" data-out="' + c.k + '"></output></span>' +
          '<input type="range" data-k="' + c.k + '" min="0" max="1000" step="1" value="' + Math.round(toPos(c, S.v[c.k])) + '">' +
          (c.why ? '<details class="atl-ceil"><summary>' + esc(c.why.q) + '</summary><p>' + esc(c.why.a) + '</p></details>' : '') +
          (c.help ? '<span class="atl-help">' + c.help + '</span>' : '') + '</label>';
      }).join('');
    }
    function ctlSpec(k) { for (var i = 0; i < S.ctl.length; i++) if (S.ctl[i].k === k) return S.ctl[i]; return null; }
    UI.ctrls.addEventListener('input', function (ev) {
      var inp = ev.target.closest('input[data-k]'); if (!inp) return;
      var c = ctlSpec(inp.getAttribute('data-k')); if (!c) return;
      stopAnim();
      S.v[c.k] = fromPos(c, +inp.value);
      if (!c.keepPreset) S.preset = null;
      if (c.rebuild) { renderControls(); renderStage(); }
      update();
    });
    UI.ctrls.addEventListener('click', function (ev) {
      var pb = ev.target.closest('button[data-play]');
      if (pb) { ev.preventDefault(); toggleAnim(pb.getAttribute('data-play'), pb); return; }
      var b = ev.target.closest('button[data-k]'); if (!b) return;
      var c = ctlSpec(b.getAttribute('data-k')), val = b.getAttribute('data-v'), opt = null;
      c.options.forEach(function (o) { if (String(o.v) === val) opt = o; });
      var why = UI.ctrls.querySelector('[data-why="' + c.k + '"]');
      if (opt.no) { why.hidden = false; why.textContent = 'Not an option here \u2014 ' + opt.no; return; }
      why.hidden = true;
      if (String(S.v[c.k]) === val) return;
      stopAnim();
      S.v[c.k] = typeof opt.v === 'number' ? +val : val;
      if (c.onSet) c.onSet(S.v);
      if (!c.keepPreset) S.preset = null;
      renderControls(); renderStage(); update(); renderExamples();
    });
    /* play buttons sweep a slider from its minimum to its maximum (a solid motor\u2019s burn, a flight\u2019s climb\u2026) */
    function toggleAnim(k, btn) {
      if (animRAF) { stopAnim(); return; }
      var c = ctlSpec(k), t0 = performance.now(), dur = c.playMs || 6000;
      if (toPos(c, S.v[k]) >= 999) S.v[k] = c.min;
      var start = toPos(c, S.v[k]);
      btn.textContent = 'Pause';
      (function frame(now) {
        var pos = Math.min(1000, start + (now - t0) / dur * 1000);
        S.v[k] = fromPos(c, pos);
        var inp = UI.ctrls.querySelector('input[data-k="' + k + '"]'); if (inp) inp.value = Math.round(pos);
        update();
        if (pos < 1000) animRAF = requestAnimationFrame(frame); else stopAnim();
      })(t0);
    }
    function stopAnim() {
      if (animRAF) cancelAnimationFrame(animRAF);
      animRAF = null;
      var bs = UI.ctrls.querySelectorAll('button[data-play]');
      for (var i = 0; i < bs.length; i++) { var c = ctlSpec(bs[i].getAttribute('data-play')); if (c) bs[i].textContent = c.play; }
    }

    UI.ex.addEventListener('click', function (ev) { var b = ev.target.closest('button[data-x]'); if (b) loadPreset(+b.getAttribute('data-x')); });
    UI.cmp.addEventListener('click', function (ev) { var b = ev.target.closest('button[data-i]'); if (b) setEngine(+b.getAttribute('data-i'), true); });

    /* ---------- stage ---------- */
    function renderStage() {
      var e = eng(), m = model();
      stopMolecules();
      stage.innerHTML = m.stageStatic(e, S.v) + '<g id="atl-dyn"></g><g id="atl-mol"></g>';
      stage.setAttribute('aria-label', e.name + '. ' + e.idea);
      dynG = stage.querySelector('#atl-dyn'); molG = stage.querySelector('#atl-mol');
    }
    function renderLegend() {
      var e = eng(), m = model(), seen = {}, items = [];
      var fl = stage.querySelectorAll('[data-fl]');
      for (var i = 0; i < fl.length; i++) {
        var k = fl[i].getAttribute('data-fl');
        if (!seen[k] && A.fluids[k]) { seen[k] = 1; items.push('<span class="atl-lg"><i style="background:var(--atl-' + k + ')"></i>' + esc(A.fluids[k]) + '</span>'); }
      }
      if (m.legendExtra) items = items.concat(m.legendExtra(e, S.v));
      UI.legend.innerHTML = items.join('') + '<span class="atl-lgnote">' + esc(e.stageNote || 'Schematic, not to scale. The nozzle follows the expansion-ratio slider on a compressed scale so very large nozzles still fit.') + '</span>';
    }
    function markHL() {
      var hl = eng().steps[S.step].hl;
      stage.classList.toggle('focus', hl.length > 0);
      var parts = stage.querySelectorAll('.atl-part');
      for (var i = 0; i < parts.length; i++) parts[i].classList.toggle('hl', hl.indexOf(parts[i].getAttribute('data-part')) >= 0);
    }
    function applyStep() {
      var e = eng(), st = e.steps[S.step], n = e.steps.length;
      markHL();
      UI.sn.textContent = S.step === 0 ? 'Overview' : 'Step ' + S.step + ' of ' + (n - 1);
      UI.st.textContent = st.t; UI.sb.textContent = st.b;
      var ds = UI.dots.querySelectorAll('button');
      for (var i = 0; i < ds.length; i++) ds[i].setAttribute('aria-current', i === S.step ? 'step' : 'false');
      UI.prev.disabled = S.step === 0;
      UI.next.textContent = S.step === 0 ? 'Start \u2192' : (S.step === n - 1 ? 'Start over' : 'Next \u2192');
      startMolecules(st.hl);
    }
    function startMolecules(hl) {
      stopMolecules();
      if (reduce || !hl.length || !molG) return;
      hl.forEach(function (id) {
        var p = stage.querySelector('[data-part="' + id + '"] .atl-pf') || stage.querySelector('[data-part="' + id + '"] .atl-jf');
        if (!p || !p.getTotalLength) return;
        var len = p.getTotalLength();
        if (len < 20) return;
        for (var i = 0; i < 3; i++) {
          var c = document.createElementNS(SVGNS, 'circle');
          c.setAttribute('r', '4.5'); c.setAttribute('class', 'atl-mol');
          c.style.stroke = p.style.stroke || 'var(--atl-fuel)';
          molG.appendChild(c);
          mols.push({ c: c, path: p, L: len, off: i / 3 });
        }
      });
      if (!mols.length) return;
      var t0 = performance.now();
      (function tick(now) {
        var t = (now - t0) / 1000, th = throttle();
        for (var i = 0; i < mols.length; i++) {
          var m = mols[i], dur = Math.max(1.4, m.L / 120) / th, u = ((t / dur) + m.off) % 1;
          var pt = m.path.getPointAtLength(u * m.L);
          m.c.setAttribute('cx', pt.x.toFixed(1)); m.c.setAttribute('cy', pt.y.toFixed(1));
        }
        molRAF = requestAnimationFrame(tick);
      })(t0);
    }
    function stopMolecules() {
      if (molRAF) cancelAnimationFrame(molRAF);
      molRAF = null; mols = [];
      if (molG) molG.innerHTML = '';
    }
    function renderStepperShell() {
      var e = eng(), d = '';
      for (var i = 0; i < e.steps.length; i++) d += '<button type="button" data-s="' + i + '" aria-label="' + (i === 0 ? 'Overview' : 'Step ' + i) + '"></button>';
      UI.dots.innerHTML = d;
    }

    /* ---------- per-engine text ---------- */
    function renderInfo() {
      var e = eng(), pips = '';
      for (var j = 1; j <= 5; j++) pips += j <= (e.level || 1) ? '\u25CF' : '\u25CB';
      UI.kick.textContent = (e.kicker || fam().kicker) + ' \u00B7 complexity ' + pips;
      UI.name.textContent = e.name; UI.idea.textContent = e.idea; UI.intro.textContent = e.intro;
      UI.glance.innerHTML = e.glance.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
      UI.trade.innerHTML =
        '<div><h5>Why you\u2019d choose it</h5><ul>' + e.pros.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
        '<div><h5>Why you wouldn\u2019t</h5><ul>' + e.cons.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
        '<div><h5>' + esc(e.usedTitle || 'Where it flies') + '</h5><p>' + esc(e.used) + '</p></div>';
      UI.labp.textContent = e.labIntro || 'Run this engine yourself. Every number here is computed live from the physics.';
      UI.exl.textContent = e.examplesTitle || (fam().id === 'liquid' ? 'Real engines on this cycle' : 'Real hardware');
      var btns = UI.pick.querySelectorAll('.atl-pk');
      for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', i === S.i ? 'true' : 'false');
    }
    function renderExamples() {
      var e = eng(), m = model();
      if (!e.examples.length) { UI.ex.innerHTML = '<p class="atl-exnote">Nothing like this has flown yet.</p>'; return; }
      UI.ex.innerHTML = e.examples.map(function (x, i) {
        var stats = x.stats || (m.stats ? m.stats(x) : []), tag = x.tag || (x.prop && A.props[x.prop] ? A.props[x.prop].short : '');
        return '<div class="atl-exi' + (S.preset && S.preset.x === i ? ' on' : '') + '">' +
          '<div class="atl-exh"><strong>' + esc(x.name) + '</strong><span>' + esc(x.veh || '') + '</span>' + (tag || x.approx ? '<em>' + esc(tag) + (x.approx ? (tag ? ' \u00B7 ' : '') + 'approx.' : '') + '</em>' : '') + '</div>' +
          stats.filter(Boolean).map(function (s, j) { return '<div class="atl-exn' + (j ? ' atl-exin' : '') + '">' + esc(s) + '</div>'; }).join('') +
          (x.note ? '<p class="atl-exnote">' + esc(x.note) + '</p>' : '') +
          (x.preset && m.preset ? '<button type="button" class="atl-btn" data-x="' + i + '">Load into the lab</button>' : '') + '</div>';
      }).join('');
    }
    function loadPreset(i) {
      var e = eng(), x = e.examples[i], res = model().preset(e, x, S.v);
      if (!res) return;
      stopAnim();
      S.v = Object.assign({}, S.v, res.v);
      S.preset = { x: i, ch: res.ch || 1 };
      renderControls(); renderStage(); update(); renderLegend(); renderExamples(); applyStep();
      var lab = root.querySelector('.atl-lab');
      if (lab && lab.scrollIntoView) lab.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }

    /* ---------- update ---------- */
    function update() {
      var e = eng(), m = model(), r = m.compute(e, S.v), th = throttle();
      lastR = r;
      stage.style.setProperty('--atl-flow', (1.0 / th).toFixed(2) + 's');
      stage.style.setProperty('--atl-spin', (0.9 / th).toFixed(2) + 's');
      dynG.innerHTML = m.stageDynamic(e, S.v, r);
      markHL();
      if (m.after) m.after(stage, e, S.v, r);
      var hl = e.steps[S.step].hl;
      if (!reduce && !animRAF && hl.some(function (id) { return dynG.querySelector('[data-part="' + id + '"] .atl-pf, [data-part="' + id + '"] .atl-jf'); })) startMolecules(hl);

      S.ctl.forEach(function (c) {
        var o = UI.ctrls.querySelector('[data-out="' + c.k + '"]');
        if (o && c.type !== 'choice') o.innerHTML = esc(c.fmt ? c.fmt(S.v[c.k], S.v, r) : fS(S.v[c.k]));
      });
      var out = m.outputs(e, S.v, r, chs());
      UI.big.innerHTML = out.big.map(function (b) { return '<div><span class="lbl">' + b.l + '</span><div class="atl-bn">' + esc(b.v) + '</div><span class="atl-sub">' + esc(b.s || '') + '</span></div>'; }).join('');
      UI.small.innerHTML = out.rows.map(function (rw) { return '<div><dt>' + rw[0] + '</dt><dd>' + esc(rw[1]) + '</dd></div>'; }).join('');
      UI.small.classList.toggle('atl-odd', out.rows.length % 2 === 1);
      if (out.badge) { UI.badge.hidden = false; UI.badge.className = 'atl-badge atl-b-' + out.badge.k; UI.bt.textContent = out.badge.t; UI.bx.textContent = out.badge.x; }
      else UI.badge.hidden = true;
      if (S.preset && m.vs) { var h = m.vs(e, S.v, r, e.examples[S.preset.x]); UI.vs.hidden = !h; UI.vs.innerHTML = h || ''; } else UI.vs.hidden = true;
      UI.eqb.innerHTML = m.eq(e, S.v, r);
      var ch = m.chart(e, S.v, r);
      UI.cht.textContent = ch.title; UI.chart.innerHTML = ch.svg; UI.chn.textContent = ch.note || '';
      renderMap(r);
      var exi = UI.ex.querySelectorAll('.atl-exi');
      for (var i = 0; i < exi.length; i++) exi[i].classList.toggle('on', !!S.preset && S.preset.x === i);
    }

    /* ---------- global map (log\u2013log) ---------- */
    var MAP_PTS = [];
    FAM.forEach(function (f, fi) {
      f.engines.forEach(function (e, ei) {
        var m = A.models[e.model];
        e.examples.forEach(function (x) {
          var q = x.map || (m.mapOf ? m.mapOf(x) : null);
          if (q && q.F > 0 && q.isp > 0) MAP_PTS.push({ fi: fi, ei: ei, name: x.name, F: q.F, isp: q.isp, hol: !!q.hol, air: !!q.air });
        });
      });
    });
    var FX = [1e-5, 1e8], FY = [30, 1e6];
    function renderMap(r) {
      var W = 1000, H = 420, ml = 70, mr = 24, mt = 20, mb = 56, iw = W - ml - mr, ih = H - mt - mb;
      function X(F) { return ml + (Math.log10(Math.max(FX[0], Math.min(FX[1], F))) - Math.log10(FX[0])) / (Math.log10(FX[1]) - Math.log10(FX[0])) * iw; }
      function Y(isp) { return mt + (1 - (Math.log10(Math.max(FY[0], Math.min(FY[1], isp))) - Math.log10(FY[0])) / (Math.log10(FY[1]) - Math.log10(FY[0]))) * ih; }
      var s = '';
      [[1e-5, '10 \u00B5N'], [1e-3, '1 mN'], [0.1, '0.1 N'], [10, '10 N'], [1e3, '1 kN'], [1e5, '100 kN'], [1e7, '10 MN']].forEach(function (t) {
        var x = X(t[0]); s += '<line class="atl-grid" x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + mt + '" y2="' + (H - mb) + '"/>' + tx(x, H - mb + 18, t[1], 'atl-ax', 'middle');
      });
      [[30, '30 s'], [100, '100 s'], [1000, '1,000 s'], [1e4, '10,000 s'], [1e5, '100,000 s'], [1e6, '1,000,000 s']].forEach(function (t) {
        var y = Y(t[0]); s += '<line class="atl-grid" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>' + tx(ml - 8, y + 4, t[1], 'atl-ax', 'end');
      });
      s += tx(ml + iw / 2, H - 12, 'Thrust (log scale)', 'atl-ax', 'middle');
      s += '<text class="atl-ax" text-anchor="middle" transform="translate(14 ' + (mt + ih / 2) + ') rotate(-90)">Specific impulse (log scale)</text>';
      var cur = '', others = '', labels = [], placed = [];
      MAP_PTS.forEach(function (q) {
        var x = X(q.F), y = Y(q.isp), on = q.fi === S.f && q.ei === S.i, fcur = q.fi === S.f, col = FAM[q.fi].color;
        var title = q.name + ' \u2014 ' + fN(q.F) + ', ' + nf(q.isp, 0) + ' s' + (q.hol ? ' (sea-level figure)' : '') + (q.air ? ' (air-breathing: Isp counts fuel only)' : '');
        var dot, cls = 'atl-mpt' + (on ? ' on' : (fcur ? ' fam' : ''));
        if (q.air) { var h = on ? 6 : 4.5; dot = '<rect x="' + (x - h).toFixed(1) + '" y="' + (y - h).toFixed(1) + '" width="' + 2 * h + '" height="' + 2 * h + '" class="' + cls + '" style="fill:var(--panel);stroke:' + col + ';stroke-width:1.8"><title>' + esc(title) + '</title></rect>'; }
        else dot = circT(x, y, on ? 6.5 : 4.2, cls + (q.hol ? ' atl-hol' : ''), q.hol ? 'stroke:' + col + ';fill:var(--panel)' : 'fill:' + col, title);
        if (fcur) { cur += dot; labels.push({ x: x, y: y, t: q.name, on: on }); } else others += dot;
      });
      var mp = model().mapPoint ? model().mapPoint(eng(), S.v, r, chs()) : null, mx = null, myy = null, ringLabel = '';
      if (mp && isFinite(mp.F) && isFinite(mp.isp) && mp.F > 0 && mp.isp > 0) { mx = X(mp.F); myy = Y(mp.isp); placed.push({ x0: mx - 12, x1: mx + 12, y0: myy - 12, y1: myy + 12 }); }
      function place(l, cls, rr) {
        var w = l.t.length * 6.4 + 2, cands = [[rr, -6, 'start'], [rr, 15, 'start'], [-rr, -6, 'end'], [-rr, 15, 'end'], [rr, -18, 'start'], [-rr, -18, 'end'], [rr, 27, 'start'], [-rr, 27, 'end']];
        for (var c = 0; c < cands.length; c++) {
          var ax = l.x + cands[c][0], ay = l.y + cands[c][1], x0 = cands[c][2] === 'start' ? ax : ax - w, box = { x0: x0, x1: x0 + w, y0: ay - 10, y1: ay + 3 };
          var hit = box.x0 < ml || box.x1 > W - mr || box.y0 < mt || box.y1 > H - mb || placed.some(function (b) { return box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0; });
          if (!hit) { placed.push(box); return tx(ax, ay, l.t, cls, cands[c][2]); }
        }
        return '';
      }
      if (mx !== null) ringLabel = place({ x: mx, y: myy, t: 'your engine' }, 'atl-t2 atl-mlbl atl-ringl', 14);
      labels.sort(function (a, b) { return (b.on - a.on) || (a.x - b.x); }).forEach(function (l) { cur += place(l, 'atl-t2 atl-mlbl' + (l.on ? ' atl-mon' : ''), 9); });
      s += others + cur;
      if (mx !== null) s += circ(mx, myy, 10, 'atl-ring') + ringLabel;
      UI.map.innerHTML = s;
    }
    function renderMapLegend() {
      UI.maplegend.innerHTML = FAM.map(function (f) { return '<span class="atl-lg"><i class="atl-dot" style="background:' + f.color + '"></i>' + esc(f.name) + '</span>'; }).join('') +
        '<span class="atl-lg"><i class="atl-dot atl-dhol"></i>Sea-level figure only</span><span class="atl-lg"><i class="atl-dot atl-dsq"></i>Air-breathing (Isp counts fuel only)</span><span class="atl-lg"><i class="atl-dot atl-dring"></i>Your engine</span>';
    }
    function renderCompare() {
      var f = fam(), cmp = f.compare;
      UI.cmph.textContent = cmp.title;
      var head = '<thead><tr><th>' + esc(cmp.first || 'Engine') + '</th>' + cmp.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead>';
      var body = cmp.rows.map(function (r) {
        var i = -1;
        f.engines.forEach(function (e, j) { if (e.id === r.id) i = j; });
        if (i < 0) return '';
        return '<tr' + (i === S.i ? ' class="on"' : '') + '><td><button type="button" class="atl-cmpb" data-i="' + i + '">' + esc(f.engines[i].name) + '</button></td>' +
          r.cells.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
      }).join('');
      UI.cmp.innerHTML = head + '<tbody>' + body + '</tbody>';
    }

    /* ---------- selection ---------- */
    function setEngine(i, user) {
      stopPlay(); stopAnim();
      S.i = i; S.step = 0;
      S.v = model().init(eng()); S.preset = null;
      renderControls(); renderStage(); renderStepperShell(); renderInfo(); renderExamples(); renderCompare();
      update(); renderLegend(); applyStep();
      if (user) { var h = root.querySelector('.atl-head'); if (h && h.getBoundingClientRect().top < 0) h.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    }
    function setFamily(f, user) {
      S.f = f;
      renderPicker();
      setEngine(f === 0 ? 2 : 0, false);
      if (user) { var p = root.querySelector('.atl-fams'); if (p && p.getBoundingClientRect().top < 0) p.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    }
    /* renderStage is also triggered by choices, so keep the legend in step with it */
    var baseRenderStage = renderStage;
    renderStage = function () { baseRenderStage(); renderLegend(); };
    A.ui = { get: function () { return { S: S, r: lastR, e: eng(), fam: fam(), FAM: FAM }; }, setFamily: setFamily, setEngine: setEngine, update: update };

    renderMapLegend();
    setFamily(0, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else setTimeout(mount, 0);
})();
