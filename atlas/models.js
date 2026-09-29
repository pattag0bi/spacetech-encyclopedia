/* Engine atlas \u2014 models for every family beyond the liquid cycles.
   Each model supplies physics (compute), lab controls, a schematic (stageStatic/stageDynamic),
   outputs, a chart and the equations, and plugs into the shared UI in atlas.js. */
(function () {
  'use strict';
  var A = window.ATLAS, L = A && A.lib;
  if (!L) return;
  var G0 = L.G0, CY = L.CY, tx = L.tx, grp = L.grp, circ = L.circ, rect = L.rect, path = L.path, pd = L.pd;
  var nf = L.nf, fp = L.fp, fN = L.fN, fS = L.fS, fDur = L.fDur, fEps = L.fEps, esc = L.esc, rng = L.rng;
  var rocket = L.rocket, ambient = L.ambient, pipe = L.pipeSVG, part = L.partSVG;
  function P(id, fl, w, pts, o) { var p = { id: id, fl: fl, w: w, pts: pts }; if (o) for (var k in o) p[k] = o[k]; return pipe(p); }
  function altFmt(x) { return x === 0 ? 'Sea level' : (x >= 100 ? 'Vacuum' : x + ' km \u00B7 ' + fp(ambient(x)) + ' bar'); }
  function altCtl(o) { o = o || {}; o.step = 1; o.keepPreset = true; o.fmt = altFmt; o.help = o.help || 'Outside air pushes back on the exhaust. At 100 km it\u2019s effectively vacuum.'; return rng('alt', 'Altitude', 0, 100, o); }
  function epsCtl(min, max, help) { return rng('eps', 'Expansion ratio (<span class="atl-nt">\u03B5</span>)', min, max, { log: true, fmt: fEps, help: help || 'Nozzle exit area divided by throat area.' }); }
  function big(l, v, s) { return { l: l, v: v, s: s }; }
  function eqLi(title, code, note) { return '<li><b>' + title + '</b>' + (code ? '<code>' + code + '</code>' : '') + (note ? '<span>' + note + '</span>' : '') + '</li>'; }
  function eqWrap(items, note) { return '<ol class="atl-eqs">' + items.join('') + '</ol>' + (note ? '<p class="atl-eqnote">' + note + '</p>' : ''); }
  function pubVs(x, label, model, pub, unit, extra) {
    var gap = (model - pub) / pub * 100;
    return '<span class="lbl">Model vs the real ' + esc(x.name) + '</span><p>Published ' + label + ': <strong>' + pub + ' ' + unit + '</strong>. The model says <strong>' + model.toFixed(model < 10 ? 2 : (model < 100 ? 1 : 0)) + ' ' + unit + '</strong> \u2014 ' +
      (gap >= 0 ? '+' : '\u2212') + nf(Math.abs(gap), 1) + '%. ' + (extra || '') + '</p>';
  }
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ======================================================================
     SOLID ROCKET MOTOR \u2014 grain burn-back on a grid (exact distance transform)
     ====================================================================== */
  var SOL = { R: 0.5, L: 4.0, rho: 1770, Tc: 3400, M: 29, g: 1.142, rref: 0.008, pref: 7e6, N: 150 };
  function edt1(f, n) { /* Felzenszwalb\u2013Huttenlocher 1-D squared distance transform */
    var d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1), k = 0;
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (var q = 1; q < n; q++) {
      var s;
      do { var p = v[k]; s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p); if (s <= z[k]) k--; else break; } while (k >= 0);
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (q = 0; q < n; q++) { while (z[k + 1] < q) k++; var dq = q - v[k]; d[q] = dq * dq + f[v[k]]; }
    return d;
  }
  var GRAIN_CACHE = {};
  function portMask(shape, x, y) { /* x, y in units of case radius */
    var r = Math.hypot(x, y), th = Math.atan2(y, x);
    if (shape === 'tube' || shape === 'bates') return r < 0.35;
    if (shape === 'star') {
      var k = 7, lobe = 2 * Math.PI / k, ph = ((th % lobe) + lobe) % lobe, u = Math.abs(ph - lobe / 2) / (lobe / 2);
      return r < 0.62 - (0.62 - 0.24) * u || r < 0.24;
    }
    if (shape === 'fin') {
      if (r < 0.28) return true;
      for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3, along = x * Math.cos(a) + y * Math.sin(a), across = Math.abs(-x * Math.sin(a) + y * Math.cos(a)); if (along > 0 && along < 0.8 && across < 0.05) return true; }
      return false;
    }
    return false;
  }
  function grainField(shape) {
    if (GRAIN_CACHE[shape]) return GRAIN_CACHE[shape];
    var N = SOL.N, h = 2 / N, f = new Float64Array(N * N), INF = 1e20, inside = new Uint8Array(N * N);
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
      var x = -1 + (i + 0.5) * h, y = -1 + (j + 0.5) * h, idx = j * N + i;
      inside[idx] = Math.hypot(x, y) <= 1 ? 1 : 0;
      f[idx] = portMask(shape, x, y) ? 0 : INF;
    }
    var col = new Float64Array(N), tmp = new Float64Array(N * N);
    for (i = 0; i < N; i++) { for (j = 0; j < N; j++) col[j] = f[j * N + i]; var dc = edt1(col, N); for (j = 0; j < N; j++) tmp[j * N + i] = dc[j]; }
    var dist = new Float64Array(N * N);
    for (j = 0; j < N; j++) { var dr = edt1(tmp.subarray(j * N, j * N + N), N); for (i = 0; i < N; i++) dist[j * N + i] = Math.sqrt(dr[i]) * h; }
    /* burned area vs web, then burning perimeter = dA/dw (in units of R) */
    var dmax = 0;
    for (i = 0; i < N * N; i++) if (inside[i] && dist[i] > dmax) dmax = dist[i];
    var K = Math.max(20, Math.floor(dmax / (1.5 * h))); /* bins no finer than the grid, or the perimeter aliases to zero */
    var bins = new Float64Array(K + 1);
    for (i = 0; i < N * N; i++) if (inside[i]) bins[Math.min(K, Math.ceil(dist[i] / dmax * K))] += h * h;
    var Aw = new Float64Array(K + 1), acc = 0;
    for (i = 0; i <= K; i++) { acc += bins[i]; Aw[i] = acc; }
    var Pw = new Float64Array(K + 1), dw = dmax / K;
    for (i = 0; i <= K; i++) { var a0 = Aw[Math.max(0, i - 1)], a1 = Aw[Math.min(K, i + 1)], span = (Math.min(K, i + 1) - Math.max(0, i - 1)) * dw; Pw[i] = (a1 - a0) / span; }
    GRAIN_CACHE[shape] = { dist: dist, inside: inside, N: N, dmax: dmax, K: K, Aw: Aw, Pw: Pw, A0: Aw[0] };
    return GRAIN_CACHE[shape];
  }
  function burnAreaFn(shape) { /* returns {Ab(w) m\u00B2, webMax m, portR(w) (m, equivalent), total propellant m\u00B3, burned m\u00B3(w)} */
    var R = SOL.R, Lg = SOL.L;
    if (shape === 'end') return { web: Lg, Ab: function () { return Math.PI * R * R; }, portR: function () { return 0; }, vol: Math.PI * R * R * Lg, burned: function (w) { return Math.PI * R * R * Math.min(w, Lg); } };
    if (shape === 'bates') {
      var r0 = 0.35 * R, n = 4, Ls = Lg / n, webB = Math.min(R - r0, Ls / 2);
      return { web: webB, Ab: function (w) { if (w >= webB) return 0; var ri = r0 + w, ls = Ls - 2 * w; return n * (2 * Math.PI * ri * ls + 2 * Math.PI * (R * R - ri * ri)); },
        portR: function (w) { return r0 + Math.min(w, webB); }, vol: n * Math.PI * (R * R - r0 * r0) * Ls,
        burned: function (w) { w = Math.min(w, webB); var ri = r0 + w, ls = Ls - 2 * w; return n * Math.PI * (R * R - r0 * r0) * Ls - n * Math.PI * (R * R - ri * ri) * ls; } };
    }
    var fields = shape === 'fin' ? [grainField('fin'), grainField('tube')] : [grainField(shape)], wts = shape === 'fin' ? [0.35, 0.65] : [1];
    function sample(fd, w, key) { var t = w / R / fd.dmax * fd.K; if (t >= fd.K) return key === 'P' ? 0 : fd.Aw[fd.K]; var i = Math.floor(t), f = t - i, arr = key === 'P' ? fd.Pw : fd.Aw; return arr[i] + f * (arr[i + 1] - arr[i]); }
    var web = Math.max.apply(null, fields.map(function (fd) { return fd.dmax * R; }));
    return {
      web: web,
      Ab: function (w) { var s = 0; fields.forEach(function (fd, i) { s += wts[i] * sample(fd, w, 'P') * R * Lg; }); return s; },
      portR: function (w) { var s = 0; fields.forEach(function (fd, i) { s += wts[i] * sample(fd, w, 'A'); }); return Math.sqrt(s / Math.PI) * R; },
      vol: fields.reduce(function (acc, fd, i) { return acc + wts[i] * (Math.PI - fd.A0) * R * R * Lg; }, 0),
      burned: function (w) { var s = 0; fields.forEach(function (fd, i) { s += wts[i] * (sample(fd, w, 'A') - fd.A0); }); return s * R * R * Lg; }
    };
  }
  function solidSim(v) {
    var shape = v.grain, g = SOL.g, n = v.n, a = SOL.rref / Math.pow(SOL.pref, n);
    var dtm = v.dt / 100, At = Math.PI * dtm * dtm / 4, ec = Math.max(0.85, 1 - 0.02 / Math.sqrt(dtm));
    var R = 8314.46 / SOL.M, Gam = Math.sqrt(g) * Math.pow(2 / (g + 1), (g + 1) / (2 * (g - 1))), cs = Math.sqrt(R * SOL.Tc) / Gam * ec;
    var geo = burnAreaFn(shape), K = 200, dw = geo.web / K, t = 0, pts = [], Itot = 0, Pmax = 0, Fmax = 0, Pa = ambient(v.alt);
    for (var k = 0; k <= K; k++) {
      var w = k * dw, Ab = geo.Ab(w);
      var Pc = Ab > 0 ? Math.pow(a * SOL.rho * cs * Ab / At, 1 / (1 - n)) : 0; /* Pa */
      var r = a * Math.pow(Math.max(Pc, 1), n), F = 0, isp = 0;
      if (Pc / 1e5 > 2) { var rk = rocket(g, SOL.Tc, SOL.M, Pc / 1e5, v.eps, Pa, ec); F = rk.cf * Pc * At; isp = rk.isp; }
      pts.push({ t: t, w: w, Pc: Pc / 1e5, F: F, r: r, Ab: Ab, isp: isp });
      if (Pc / 1e5 > Pmax) Pmax = Pc / 1e5;
      if (F > Fmax) Fmax = F;
      if (k < K && r > 0 && Pc / 1e5 > 2) { var dtk = dw / r; Itot += F * dtk; t += dtk; } else if (k < K) { break; }
    }
    var mprop = geo.burned(pts[pts.length - 1].w) * SOL.rho, grainMass = geo.vol * SOL.rho;
    var tb = pts[pts.length - 1].t, tNow = v.t / 100 * tb, cur = pts[0];
    for (var j = 1; j < pts.length; j++) if (pts[j].t <= tNow) cur = pts[j];
    var main = pts.filter(function (q) { return q.F > 0.25 * Fmax; }), Fmin = Math.min.apply(null, main.map(function (q) { return q.F; }));
    var first = main[0] ? main[0].F : 0, last = main.length ? main[main.length - 1].F : 0;
    var shapeK = Fmax / Math.max(Fmin, 1) < 1.25 ? 'neutral' : (last > first ? 'progressive' : 'regressive');
    return { pts: pts, tb: tb, Itot: Itot, Pmax: Pmax, Fmax: Fmax, Favg: tb > 0 ? Itot / tb : 0, mprop: mprop, grainMass: grainMass, isp: mprop > 0 ? Itot / (mprop * G0) : 0,
      cur: cur, tNow: tNow, geo: geo, At: At, cs: cs, ec: ec, a: a, shapeK: shapeK, sliver: 1 - mprop / grainMass, Pa: Pa, n: n };
  }
  function throatFor(shape, n, pcBar) { /* throat diameter (cm) giving ~pcBar at ignition */
    var g = SOL.g, R = 8314.46 / SOL.M, Gam = Math.sqrt(g) * Math.pow(2 / (g + 1), (g + 1) / (2 * (g - 1))), a = SOL.rref / Math.pow(SOL.pref, n);
    var Ab = burnAreaFn(shape).Ab(0), cs = Math.sqrt(R * SOL.Tc) / Gam * 0.97;
    var At = a * SOL.rho * cs * Ab / Math.pow(pcBar * 1e5, 1 - n);
    return Math.max(5, Math.min(90, Math.sqrt(4 * At / Math.PI) * 100));
  }
  var GRAINS = [{ v: 'tube', label: 'Tube', sub: 'progressive' }, { v: 'star', label: 'Star', sub: 'near-neutral' }, { v: 'fin', label: 'Finocyl', sub: 'fins + tube' },
    { v: 'bates', label: 'BATES', sub: 'segments' }, { v: 'end', label: 'End-burner', sub: 'long & gentle' }];

  var CASE = { x0: 120, x1: 720, R: 104 };
  A.models.solid = {
    init: function (e) { var g = e.grain || 'star'; return { grain: g, n: 0.35, dt: throatFor(g, 0.35, 55), eps: 12, alt: 0, t: 30 }; },
    controls: function (e, v) {
      return [
        { k: 'grain', type: 'choice', label: 'Grain shape (the hole down the middle)', options: GRAINS, onSet: function (vv) { vv.dt = throatFor(vv.grain, vv.n, 55); vv.t = 30; },
          help: 'The propellant burns outward from the hole, so the hole\u2019s shape decides how the burning area \u2014 and so the thrust \u2014 changes over time.' },
        rng('t', 'Burn progress', 0, 100, { step: 0.5, keepPreset: true, play: 'Fire', playMs: 7000, fmt: function (x, vv, r) { return r ? nf(r.tNow, 1) + ' s of ' + nf(r.tb, 1) + ' s' : nf(x, 0) + '%'; } }),
        rng('dt', 'Throat diameter', 5, 90, { log: true, fmt: function (x) { return nf(x, 1) + ' cm'; }, help: 'A smaller throat traps more gas, so pressure rises \u2014 and pressure makes the propellant burn faster. That feedback sets the whole motor\u2019s pressure.' }),
        rng('n', 'Burn-rate pressure exponent <span class="atl-nt">n</span>', 0.2, 0.8, { step: 0.01, fmt: function (x) { return nf(x, 2); }, help: 'Burn rate r = a\u00B7P\u207F. Real propellants sit around 0.3\u20130.5. As n approaches 1 the pressure becomes wildly sensitive to tiny changes \u2014 the motor can run away and burst.' }),
        epsCtl(3, 60, 'Nozzle exit area divided by throat area.'),
        altCtl()
      ];
    },
    compute: function (e, v) { return solidSim(v); },
    speed: function (e, v) { return 1; },
    stageStatic: function (e, v) {
      var s = L.defs(), x0 = CASE.x0, x1 = CASE.x1, R = CASE.R, cy = CY;
      s += grp('case', path('M' + x0 + ' ' + (cy - R) + ' L' + x1 + ' ' + (cy - R) + ' Q' + (x1 + 44) + ' ' + (cy - R) + ' ' + (x1 + 58) + ' ' + (cy - 30) +
        ' L' + (x1 + 58) + ' ' + (cy + 30) + ' Q' + (x1 + 44) + ' ' + (cy + R) + ' ' + x1 + ' ' + (cy + R) + ' L' + x0 + ' ' + (cy + R) +
        ' Q' + (x0 - 60) + ' ' + (cy + R) + ' ' + (x0 - 60) + ' ' + cy + ' Q' + (x0 - 60) + ' ' + (cy - R) + ' ' + x0 + ' ' + (cy - R) + ' Z', 'atl-case') +
        tx(420, cy - R - 12, 'MOTOR CASE \u2014 steel or carbon-fibre pressure vessel', 'atl-t2', 'middle'));
      s += grp('ign', rect(x0 - 40, cy - 12, 34, 24, 'atl-mach', ' rx="4"') + tx(x0 - 23, cy - 18, 'IGNITER', 'atl-t2', 'middle'));
      s += grp('inset', circ(200, 462, 68, 'atl-inset') + '<image id="atl-grainimg" x="132" y="394" width="136" height="136" preserveAspectRatio="none"/>' +
        circ(200, 462, 68, 'atl-insetring') + tx(282, 430, 'GRAIN CROSS-SECTION', 'atl-t2', 'start') + tx(282, 445, 'as it burns back', 'atl-t2', 'start'));
      return s;
    },
    stageDynamic: function (e, v, r) {
      var cy = CY, x0 = CASE.x0, x1 = CASE.x1, R = CASE.R - 6, s = '', w = r.cur.w, burning = r.cur.Pc > 2 && v.t > 0 && v.t < 100;
      var rp = r.geo.portR(w) / SOL.R * R, gr = 'atl-grain', lenPx = x1 - x0;
      if (v.grain === 'end') {
        var xr = x0 + (1 - Math.min(1, w / SOL.L)) * lenPx;
        s += grp('grain', rect(x0, cy - R, Math.max(0, xr - x0), 2 * R, gr) + (burning ? '<line class="atl-burnln" x1="' + xr.toFixed(1) + '" x2="' + xr.toFixed(1) + '" y1="' + (cy - R) + '" y2="' + (cy + R) + '"/>' : '') +
          tx(x0 + 40, cy + 4, 'PROPELLANT GRAIN', 'atl-t atl-tb', 'start'));
        s += grp('port', rect(xr, cy - R, x1 - xr, 2 * R, 'atl-portgas', burning ? '' : ' style="opacity:.15"'));
      } else if (v.grain === 'bates') {
        var segs = '', lines = '', Ls = lenPx / 4, gap = Math.min(Ls / 2 - 2, w / (SOL.L / 4) * Ls);
        for (var i = 0; i < 4; i++) {
          var sx = x0 + i * Ls + gap, sw = Math.max(0, Ls - 2 * gap);
          if (sw <= 0) continue;
          segs += rect(sx, cy - R, sw, R - rp, gr) + rect(sx, cy + rp, sw, R - rp, gr);
          if (burning) lines += '<path class="atl-burnln" d="M' + sx.toFixed(1) + ' ' + (cy - R) + ' L' + sx.toFixed(1) + ' ' + (cy - rp).toFixed(1) + ' L' + (sx + sw).toFixed(1) + ' ' + (cy - rp).toFixed(1) + ' L' + (sx + sw).toFixed(1) + ' ' + (cy - R) +
            ' M' + sx.toFixed(1) + ' ' + (cy + R) + ' L' + sx.toFixed(1) + ' ' + (cy + rp).toFixed(1) + ' L' + (sx + sw).toFixed(1) + ' ' + (cy + rp).toFixed(1) + ' L' + (sx + sw).toFixed(1) + ' ' + (cy + R) + '"/>';
        }
        s += grp('port', rect(x0, cy - R, lenPx, 2 * R, 'atl-portgas', burning ? '' : ' style="opacity:.15"'));
        s += grp('grain', segs + lines + tx(x0 + 20, cy - R + 18, 'FOUR GRAIN SEGMENTS', 'atl-t2 atl-tb', 'start'));
      } else {
        var aft = v.grain === 'fin' ? x0 + lenPx * 0.65 : x1;
        var rpF = v.grain === 'fin' ? Math.min(R - 2, rp * 1.35) : rp, rpT = v.grain === 'fin' ? rp * 0.85 : rp;
        s += grp('port', rect(x0, cy - R, lenPx, 2 * R, 'atl-portgas', burning ? '' : ' style="opacity:.15"'));
        s += grp('grain', rect(x0, cy - R, aft - x0, R - rpT, gr) + rect(x0, cy + rpT, aft - x0, R - rpT, gr) +
          (v.grain === 'fin' ? rect(aft, cy - R, x1 - aft, R - rpF, gr) + rect(aft, cy + rpF, x1 - aft, R - rpF, gr) + tx(aft + 8, cy - R + 18, 'FINS', 'atl-t2 atl-tb', 'start') : '') +
          (burning ? '<path class="atl-burnln" d="M' + x0 + ' ' + (cy - rpT).toFixed(1) + ' L' + aft + ' ' + (cy - rpT).toFixed(1) + (v.grain === 'fin' ? ' L' + aft + ' ' + (cy - rpF).toFixed(1) + ' L' + x1 + ' ' + (cy - rpF).toFixed(1) : '') +
            ' M' + x0 + ' ' + (cy + rpT).toFixed(1) + ' L' + aft + ' ' + (cy + rpT).toFixed(1) + (v.grain === 'fin' ? ' L' + aft + ' ' + (cy + rpF).toFixed(1) + ' L' + x1 + ' ' + (cy + rpF).toFixed(1) : '') + '"/>' : '') +
          tx(x0 + 30, cy - R + 18, 'PROPELLANT GRAIN', 'atl-t2 atl-tb', 'start'));
      }
      var p = rocket(SOL.g, SOL.Tc, SOL.M, Math.max(r.cur.Pc, 2.1), v.eps, r.Pa, r.ec);
      var rt = Math.max(14, Math.min(40, 8 + v.dt * 0.6)), nz = L.nozzleSVG(p, { xt: x1 + 72, rt: rt, maxRe: 200, maxL: 200, noPlume: !burning });
      s += grp('throat', path('M' + (x1 + 58) + ' ' + (cy - 30) + ' L' + (x1 + 72) + ' ' + (cy - rt) + ' M' + (x1 + 58) + ' ' + (cy + 30) + ' L' + (x1 + 72) + ' ' + (cy + rt), 'atl-wall')) + nz.svg;
      s += tx(x0 - 40, 88, burning ? 't = ' + nf(r.tNow, 1) + ' s \u00B7 chamber ' + nf(r.cur.Pc, 0) + ' bar \u00B7 thrust ' + fN(r.cur.F) : (v.t >= 100 ? 'Burnt out after ' + nf(r.tb, 1) + ' s' : 'Press \u201CFire\u201D in the lab to watch it burn'), 'atl-t atl-tb', 'start');
      return s;
    },
    after: function (stage, e, v, r) {
      var img = stage.querySelector('#atl-grainimg'); if (!img) return;
      var N = 120, c = document.createElement('canvas'); c.width = N; c.height = N;
      var ctx = c.getContext('2d'), im = ctx.createImageData(N, N), w = r.cur.w / SOL.R, cs = getComputedStyle(stage);
      function col(name, fb) { var t = document.createElement('span'); t.style.color = cs.getPropertyValue(name) || fb; document.body.appendChild(t); var c2 = getComputedStyle(t).color; t.remove(); var m = c2.match(/\d+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; }
      var cg = col('--atl-grain', '#9A8B78'), cp = col('--panel', '#EEE'), cb = col('--oxide', '#B4471F');
      var burning = r.cur.Pc > 2 && v.t > 0 && v.t < 100, shape = v.grain;
      var fd = (shape === 'end') ? null : grainField(shape === 'bates' ? 'tube' : (shape === 'fin' ? 'fin' : shape));
      for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
        var x = -1 + (i + 0.5) * 2 / N, y = -1 + (j + 0.5) * 2 / N, k = (j * N + i) * 4, rr = Math.hypot(x, y), cc = null;
        if (rr > 1) { im.data[k + 3] = 0; continue; }
        if (shape === 'end') cc = burning ? cb : (v.t >= 100 ? cp : cg);
        else {
          var gi = Math.min(fd.N - 1, Math.floor((x + 1) / 2 * fd.N)), gj = Math.min(fd.N - 1, Math.floor((y + 1) / 2 * fd.N)), d = fd.dist[gj * fd.N + gi];
          var ww = shape === 'bates' ? w : w;
          cc = d <= ww ? cp : (burning && d - ww < 0.035 ? cb : cg);
        }
        im.data[k] = cc[0]; im.data[k + 1] = cc[1]; im.data[k + 2] = cc[2]; im.data[k + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
      img.setAttribute('href', c.toDataURL());
    },
    legendExtra: function () { return ['<span class="atl-lg"><i style="background:var(--atl-grain)"></i>Solid propellant</span>', '<span class="atl-lg"><i style="background:var(--oxide)"></i>Burning surface</span>']; },
    outputs: function (e, v, r) {
      var warn = r.Pmax > 110 ? { k: 'sep', t: 'The case would burst', x: 'Peak chamber pressure reaches ' + nf(r.Pmax, 0) + ' bar \u2014 far past what a case like this is built for (around 100 bar). With a solid there\u2019s no valve to close: once lit, the only control you ever had was the shape you cast.' }
        : (r.n >= 0.7 ? { k: 'edge', t: 'Dangerously sensitive propellant', x: 'With n = ' + nf(r.n, 2) + ', a 1% bump in burning area raises pressure by ' + nf(1 / (1 - r.n), 1) + '%. A crack in the grain \u2014 suddenly more surface \u2014 could run the pressure away. Real propellants are formulated to keep n well below 0.7.' }
          : { k: r.shapeK === 'neutral' ? 'ideal' : 'over', t: 'Thrust curve: ' + r.shapeK, x: r.shapeK === 'neutral' ? 'The burning area stays roughly constant as the grain burns back, so thrust stays level \u2014 usually what you want.' : (r.shapeK === 'progressive' ? 'The burning surface grows as the hole widens, so thrust climbs through the burn. Good if the rocket gets lighter and you want acceleration to keep building \u2014 bad for peak loads at the end.' : 'The burning surface shrinks, so thrust falls off. Useful for easing aerodynamic loads as the rocket speeds up through thick air.') });
      return {
        big: [big('Thrust now', fN(r.cur.F), 'Average over the burn ' + fN(r.Favg)), big('Delivered Isp', nf(r.isp, 0) + ' s', 'Total impulse ' + fN(r.Itot).replace(' N', ' N') + '\u00B7s'.replace('\u00B7s', '\u00B7s'))],
        rows: [['Burn time', nf(r.tb, 1) + ' s'], ['Chamber pressure now', nf(r.cur.Pc, 1) + ' bar'], ['Peak pressure', nf(r.Pmax, 1) + ' bar'], ['Burn rate now', nf(r.cur.r * 1000, 1) + ' mm/s'],
          ['Propellant burned', nf(r.mprop / 1000, 2) + ' t'], ['Unburned sliver', nf(Math.max(0, r.sliver) * 100, 1) + '% of the grain'], ['Two-phase efficiency', nf(r.ec * 100, 1) + '%']],
        badge: warn
      };
    },
    chart: function (e, v, r) {
      var tmax = Math.max(1, r.tb * 1.05), Fm = Math.max(1, r.Fmax * 1.15), Pm = Math.max(1, r.Pmax * 1.15);
      var ch = L.lineChart({ aria: 'Thrust and pressure through the burn', axes: { x: [0, tmax], y: [0, Fm], xt: ticks(0, tmax, 5), yt: ticks(0, Fm, 4), xf: function (t) { return nf(t, 0) + ' s'; }, yf: function (t) { return fN(t); }, xl: 'Time since ignition', yl: 'Thrust (solid) \u00B7 pressure (dashed, scaled)' },
        series: [{ pts: r.pts.map(function (q) { return [q.t, q.F]; }), cls: 'atl-lp' }, { pts: r.pts.map(function (q) { return [q.t, q.Pc / Pm * Fm]; }), cls: 'atl-lt' }],
        vlines: [{ x: r.tNow, cls: 'atl-vline' }], legend: [{ cls: 'atl-lp', label: 'thrust' }, { cls: 'atl-lt', label: 'chamber pressure (peak ' + nf(r.Pmax, 0) + ' bar)' }] });
      return { title: 'Thrust and pressure through the burn', svg: ch.svg, note: 'Computed by burning the grain back layer by layer: at each step the burning area sets the pressure, the pressure sets how fast the surface recedes, and the loop repeats until the grain is gone.' };
    },
    eq: function (e, v, r) {
      return eqWrap([
        eqLi('Burn rate \u2014 faster at higher pressure', 'r = a \u00B7 P\u2099 = ' + r.a.toExponential(2) + ' \u00B7 P<sup>' + nf(r.n, 2) + '</sup> \u2192 ' + nf(r.cur.r * 1000, 2) + ' mm/s now', 'Saint-Robert\u2019s law. The constant a is set so r = 8 mm/s at 70 bar, typical of an aluminised composite propellant.'),
        eqLi('Pressure balance \u2014 gas made = gas escaping', '\u03C1 \u00B7 A<sub>b</sub> \u00B7 r = P<sub>c</sub> \u00B7 A<sub>t</sub> / c*  \u21D2  P<sub>c</sub> = (a \u00B7 \u03C1 \u00B7 c* \u00B7 A<sub>b</sub>/A<sub>t</sub>)<sup>1/(1\u2212n)</sup> = ' + nf(r.cur.Pc, 1) + ' bar', 'A<sub>b</sub> is the burning area (' + nf(r.cur.Ab, 2) + ' m\u00B2 now) and A<sub>t</sub> the throat (' + nf(r.At * 1e4, 1) + ' cm\u00B2). Their ratio, the \u201CKn\u201D, is the single number a solid-motor designer lives by. The exponent 1/(1\u2212n) is why n must stay small.'),
        eqLi('Thrust', 'F = C<sub>F</sub> \u00B7 P<sub>c</sub> \u00B7 A<sub>t</sub> = ' + fN(r.cur.F), 'C<sub>F</sub> comes from the same nozzle equations as the liquid engines.'),
        eqLi('Two-phase loss \u2014 the aluminium tax', '\u03B7 = 1 \u2212 0.02/\u221Ad<sub>t</sub> = ' + nf(r.ec, 3), 'Aluminium burns into molten droplets of alumina that lag behind the gas and waste energy. Big throats let them catch up, so big motors lose less \u2014 the reason a Space Shuttle booster beats a small upper-stage motor on this score.')
      ], '<b>What\u2019s simplified.</b> One demonstration motor (1 m diameter, 4 m long grain), aluminised composite propellant (combustion ~3,400 K), no erosive burning, and a flat 2-D slice of the grain extended along its length. Finocyl fins are treated as running along the aft 35% of the grain.');
    },
    mapPoint: function (e, v, r) { return r.Favg > 0 ? { F: r.Favg, isp: rocket(SOL.g, SOL.Tc, SOL.M, Math.max(2.1, r.Pmax * 0.8), v.eps, 0, r.ec).isp } : null; }
  };
  function ticks(a, b, n) { var step = niceStep((b - a) / n), out = []; for (var t = Math.ceil(a / step) * step; t <= b + 1e-9; t += step) out.push(t); return out; }
  function niceStep(x) { var p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
  L.ticks = ticks;

  /* ======================================================================
     HYBRID \u2014 solid fuel, liquid oxidiser; the mixture drifts as the port opens
     ====================================================================== */
  var HYB = { R: 0.2, L: 1.5,
    ox: { n2o: { name: 'N\u2082O', long: 'nitrous oxide', g: 1.23, tab: [[3, 2400, 23.0], [5, 2950, 24.6], [6, 3080, 25.3], [7, 3120, 25.8], [8, 3080, 26.3], [10, 2900, 27.0], [14, 2500, 28.0]], best: 7 },
      lox: { name: 'LOX', long: 'liquid oxygen', g: 1.20, tab: [[1, 2300, 18.5], [1.5, 3000, 20.5], [2, 3400, 22.2], [2.4, 3500, 23.6], [3, 3450, 25.2], [4, 3150, 27.0]], best: 2.3 } },
    fuel: { htpb: { name: 'HTPB rubber', a: 3.04e-5, n: 0.681, rho: 930 }, wax: { name: 'Paraffin wax', a: 1.17e-4, n: 0.62, rho: 900 } } };
  function hybridSim(v) {
    var ox = HYB.ox[v.ox], fu = HYB.fuel[v.fuel], At = Math.PI * Math.pow(v.dt / 200, 2), rp0 = v.dp / 200, Rg = HYB.R, Lg = HYB.L;
    var K = 160, drp = (Rg - rp0) / K, t = 0, pts = [], I = 0, mf = 0, Pa = ambient(v.alt);
    for (var k = 0; k <= K; k++) {
      var rp = rp0 + k * drp, G = v.mox / (Math.PI * rp * rp), rd = fu.a * Math.pow(G, fu.n), mdf = fu.rho * 2 * Math.PI * rp * Lg * rd;
      var of = v.mox / mdf, tm = L.interp(ox.tab, of), p0 = rocket(ox.g, tm[0], tm[1], 20, v.eps, 0, 0.95);
      var Pc = (v.mox + mdf) * p0.cs / At / 1e5, pr = rocket(ox.g, tm[0], tm[1], Math.max(Pc, 1.2), v.eps, Pa, 0.95), F = pr.isp * G0 * (v.mox + mdf);
      pts.push({ t: t, rp: rp, of: of, Pc: Pc, F: F, rd: rd, mdf: mdf, isp: pr.isp, G: G, Tc: tm[0] });
      if (k < K) { var dt = drp / rd; I += F * dt; mf += mdf * dt; t += dt; }
    }
    var tNow = v.t / 100 * t, cur = pts[0];
    for (var j = 1; j < pts.length; j++) if (pts[j].t <= tNow) cur = pts[j];
    var ofs = pts.map(function (q) { return q.of; });
    return { pts: pts, tb: t, I: I, mf: mf, mo: v.mox * t, isp: I / ((mf + v.mox * t) * G0), cur: cur, tNow: tNow, ox: ox, fu: fu, ofMin: Math.min.apply(null, ofs), ofMax: Math.max.apply(null, ofs), At: At, Pa: Pa,
      Fmax: Math.max.apply(null, pts.map(function (q) { return q.F; })), Pmax: Math.max.apply(null, pts.map(function (q) { return q.Pc; })) };
  }
  A.models.hybrid = {
    init: function () { return { ox: 'n2o', fuel: 'htpb', mox: 10, dp: 10, dt: 9, eps: 12, alt: 0, t: 25 }; },
    controls: function () {
      return [
        { k: 'ox', type: 'choice', label: 'Oxidiser (liquid)', options: [{ v: 'n2o', label: 'N\u2082O', sub: 'self-pressurising' }, { v: 'lox', label: 'LOX', sub: 'more energetic' }], onSet: function (vv) { vv.mox = vv.ox === 'lox' ? 6 : 10; vv.t = 25; } },
        { k: 'fuel', type: 'choice', label: 'Fuel (solid)', options: [{ v: 'htpb', label: 'HTPB', sub: 'rubber, slow' }, { v: 'wax', label: 'Paraffin', sub: 'wax, ~3\u00D7 faster' }], onSet: function (vv) { vv.t = 25; } },
        rng('t', 'Burn progress', 0, 100, { step: 0.5, keepPreset: true, play: 'Fire', playMs: 7000, fmt: function (x, vv, r) { return r ? nf(r.tNow, 1) + ' s of ' + nf(r.tb, 1) + ' s' : nf(x, 0) + '%'; } }),
        rng('mox', 'Oxidiser flow', 1, 30, { log: true, fmt: function (x) { return nf(x, 1) + ' kg/s'; }, help: 'This is the throttle \u2014 and the kill switch. Close the valve and the fire goes out.' }),
        rng('dp', 'Starting port diameter', 4, 30, { step: 0.5, fmt: function (x) { return nf(x, 1) + ' cm'; }, help: 'A narrow port means fast-moving oxidiser and quick regression at first; as the port opens up, the fuel burns more slowly.' }),
        rng('dt', 'Throat diameter', 3, 25, { step: 0.1, fmt: function (x) { return nf(x, 1) + ' cm'; } }),
        epsCtl(3, 60),
        altCtl()
      ];
    },
    compute: function (e, v) { return hybridSim(v); },
    stageStatic: function (e, v) {
      var s = L.defs(), cy = CY, lox = v.ox === 'lox';
      if (lox) s += part({ id: 'he', type: 'sphere', x: 94, y: 70, r: 26, label: 'HELIUM', label2: 'pressurant', lx: 128, ly: 66 });
      s += P('p-ox', 'ox', 5, [[164, cy], [310, cy]]);
      if (lox) s += P('p-he', 'press', 3, [[94, 96], [94, 150]]);
      s += part({ id: 'otank', type: 'tank', side: 'ox', x: 24, y: 150, w: 140, h: 240, name: 'OXIDISER', sub: HYB.ox[v.ox].name + (lox ? ' \u00B7 90 K' : ' \u00B7 ~50 bar'), fill: 0.75 });
      s += part({ id: 'valve', type: 'valve', x: 238, y: cy, label: 'MAIN VALVE', lx: 238, ly: cy - 20 });
      s += grp('inj', rect(310, cy - 96, 24, 192, 'atl-dome', ' rx="8"') + tx(322, cy + 118, 'INJECTOR', 'atl-t2', 'middle'));
      s += grp('case', rect(334, cy - 104, 420, 208, 'atl-case', ' rx="10"') + tx(544, cy - 116, 'COMBUSTION CHAMBER', 'atl-t2', 'middle'));
      s += grp('post', rect(754, cy - 80, 50, 160, 'atl-case', ' rx="10"') + tx(779, cy + 100, 'MIXING', 'atl-t2', 'middle'));
      s += grp('inset', circ(560, 462, 62, 'atl-inset') + tx(632, 440, 'FUEL PORT', 'atl-t2', 'start') + tx(632, 455, 'widening as it burns', 'atl-t2', 'start'));
      return s;
    },
    stageDynamic: function (e, v, r) {
      var cy = CY, s = '', burning = v.t > 0 && v.t < 100, Rpx = 96, rp = r.cur.rp / HYB.R * Rpx, x0 = 342, x1 = 746;
      s += grp('port', rect(x0, cy - rp, x1 - x0, 2 * rp, 'atl-portgas', burning ? '' : ' style="opacity:.15"'));
      s += grp('grain', rect(x0, cy - Rpx, x1 - x0, Rpx - rp, 'atl-grain atl-fuelg') + rect(x0, cy + rp, x1 - x0, Rpx - rp, 'atl-grain atl-fuelg') +
        (burning ? '<path class="atl-burnln" d="M' + x0 + ' ' + (cy - rp).toFixed(1) + ' L' + x1 + ' ' + (cy - rp).toFixed(1) + ' M' + x0 + ' ' + (cy + rp).toFixed(1) + ' L' + x1 + ' ' + (cy + rp).toFixed(1) + '"/>' : '') +
        tx(x0 + 16, cy - Rpx + 18, 'SOLID FUEL GRAIN \u00B7 ' + r.fu.name.toUpperCase(), 'atl-t2 atl-tb', 'start'));
      s += grp('oxflow', P('p-core', 'ox', 3, [[334, cy], [746, cy]], { nochev: true }));
      var p = rocket(r.ox.g, r.cur.Tc, 25, Math.max(r.cur.Pc, 1.3), v.eps, r.Pa, 0.95);
      var rt = Math.max(10, Math.min(40, v.dt * 2.2)), nz = L.nozzleSVG(p, { xt: 830, rt: rt, maxRe: 190, maxL: 190, noPlume: !burning });
      s += grp('throat', path('M804 ' + (cy - 60) + ' L830 ' + (cy - rt) + ' M804 ' + (cy + 60) + ' L830 ' + (cy + rt), 'atl-wall')) + nz.svg;
      s += grp('insetd', circ(560, 462, 60, 'atl-grain atl-fuelg') + circ(560, 462, rp / Rpx * 60, burning ? 'atl-portgas2' : 'atl-portcold') + (burning ? circ(560, 462, rp / Rpx * 60, 'atl-burnc') : ''));
      s += tx(28, 470, burning ? 't = ' + nf(r.tNow, 1) + ' s \u00B7 O/F ' + nf(r.cur.of, 1) + ' \u00B7 ' + nf(r.cur.Pc, 0) + ' bar' : (v.t >= 100 ? 'Burnt out after ' + nf(r.tb, 1) + ' s' : 'Press \u201CFire\u201D in the lab'), 'atl-t atl-tb', 'start');
      return s;
    },
    legendExtra: function () { return ['<span class="atl-lg"><i style="background:var(--atl-grain)"></i>Solid fuel</span>']; },
    outputs: function (e, v, r) {
      var best = r.ox.best, of = r.cur.of, dev = of / best;
      var badge = dev > 1.35 ? { k: 'over', t: 'Running oxidiser-rich', x: 'O/F is ' + nf(of, 1) + ' against a best of about ' + best + '. The port is still narrow, the oxidiser is racing through it, but the fuel can\u2019t keep up. As the port widens this drifts \u2014 the hybrid\u2019s signature headache.' }
        : (dev < 0.75 ? { k: 'under', t: 'Running fuel-rich', x: 'O/F is ' + nf(of, 1) + ' against a best of about ' + best + '. Plenty of fuel surface, not enough oxidiser to burn it all.' }
          : { k: 'ideal', t: 'Near the best mixture', x: 'O/F ' + nf(of, 1) + ' is close to the best of about ' + best + ' for ' + r.ox.long + '. Enjoy it \u2014 as the port keeps widening, the mixture will keep shifting.' });
      return {
        big: [big('Thrust now', fN(r.cur.F), 'Peak ' + fN(r.Fmax)), big('Isp now', nf(r.cur.isp, 0) + ' s', 'Burn average ' + nf(r.isp, 0) + ' s')],
        rows: [['Mixture ratio now (O/F)', nf(of, 2)], ['O/F drift over the burn', nf(r.ofMax, 1) + ' \u2192 ' + nf(r.ofMin, 1)], ['Fuel regression rate', nf(r.cur.rd * 1000, 2) + ' mm/s'],
          ['Chamber pressure', nf(r.cur.Pc, 1) + ' bar'], ['Burn time', nf(r.tb, 1) + ' s'], ['Oxidiser flux', nf(r.cur.G, 0) + ' kg/m\u00B2/s']],
        badge: badge
      };
    },
    chart: function (e, v, r) {
      var tmax = Math.max(1, r.tb * 1.03), ofm = Math.max(r.ofMax, r.ox.best) * 1.15;
      var a = L.lineChart({ H: 170, mb: 30, aria: 'Thrust through the burn', axes: { x: [0, tmax], y: [0, r.Fmax * 1.2], xt: ticks(0, tmax, 5), yt: ticks(0, r.Fmax * 1.2, 3), xf: function (t) { return nf(t, 0) + ' s'; }, yf: fN, yl: 'Thrust' },
        series: [{ pts: r.pts.map(function (q) { return [q.t, q.F]; }), cls: 'atl-lp' }], vlines: [{ x: r.tNow }] });
      var b = L.lineChart({ H: 170, mt: 22, mb: 40, aria: 'Mixture ratio through the burn', axes: { x: [0, tmax], y: [0, ofm], xt: ticks(0, tmax, 5), yt: ticks(0, ofm, 3), xf: function (t) { return nf(t, 0) + ' s'; }, yf: function (t) { return nf(t, 0); }, yl: 'Mixture ratio O/F', xl: 'Time since ignition' },
        series: [{ pts: [[0, r.ox.best], [tmax, r.ox.best]], cls: 'atl-lref' }, { pts: r.pts.map(function (q) { return [q.t, q.of]; }), cls: 'atl-lt' }], vlines: [{ x: r.tNow }] });
      return { title: 'Thrust and mixture ratio through the burn', svg: a.svg + b.svg, note: 'The dotted line is the best mixture for this oxidiser. The fuel only burns where the oxidiser touches it, so as the port widens the oxidiser slows down, the fuel burns more slowly, and the mixture drifts.' };
    },
    eq: function (e, v, r) {
      return eqWrap([
        eqLi('Oxidiser flux through the port', 'G = \u1E41<sub>ox</sub> / (\u03C0 r<sub>p</sub>\u00B2) = ' + nf(v.mox, 1) + ' / (\u03C0 \u00D7 ' + nf(r.cur.rp, 3) + '\u00B2) = ' + nf(r.cur.G, 0) + ' kg/m\u00B2/s'),
        eqLi('Regression rate \u2014 the fuel burns only where oxidiser reaches it', '\u1E59 = a \u00B7 G\u207F = ' + r.fu.a.toExponential(2) + ' \u00B7 G<sup>' + r.fu.n + '</sup> = ' + nf(r.cur.rd * 1000, 2) + ' mm/s', 'Heat reaches the fuel surface through a flame sitting in the boundary layer above it, so the burn rate depends on how fast the oxidiser flows past \u2014 not on chamber pressure as in a solid.'),
        eqLi('Fuel flow and mixture', '\u1E41<sub>f</sub> = \u03C1 \u00B7 2\u03C0 r<sub>p</sub> L \u00B7 \u1E59 = ' + nf(r.cur.mdf, 2) + ' kg/s \u2192 O/F = ' + nf(r.cur.of, 2)),
        eqLi('Chamber pressure and thrust', 'P<sub>c</sub> = (\u1E41<sub>ox</sub> + \u1E41<sub>f</sub>) \u00B7 c* / A<sub>t</sub> = ' + nf(r.cur.Pc, 1) + ' bar,   F = I<sub>sp</sub> \u00B7 g\u2080 \u00B7 \u1E41 = ' + fN(r.cur.F))
      ], '<b>What\u2019s simplified.</b> A 40 cm diameter, 1.5 m fuel grain with a single round port. Regression constants are typical published values (paraffin\u2019s higher rate comes from a thin liquid layer that sheds droplets into the flow). Combustion efficiency 95%.');
    },
    mapPoint: function (e, v, r) { return { F: r.I / Math.max(r.tb, 1e-6), isp: rocket(r.ox.g, 3000, 25, Math.max(1.5, r.Pmax), v.eps, 0, 0.95).isp }; }
  };

  /* ======================================================================
     SMALL THRUSTERS \u2014 cold gas, monopropellant, bipropellant (pulsed)
     ====================================================================== */
  var GASES = { n2: { name: 'Nitrogen', M: 28.01, g: 1.40 }, he: { name: 'Helium', M: 4.0, g: 1.66 }, kr: { name: 'Krypton', M: 83.8, g: 1.67 } };
  function hydrazine(x) { return { Tc: 1640 - 774 * x, M: 96 / (5 + 4 * x), g: 1.282 }; }
  function thrusterPerf(e, v) {
    var k = e.kind, p, gas;
    if (k === 'coldgas') { gas = GASES[v.gas]; p = rocket(gas.g, 293, gas.M, v.pc, v.eps, 0, 0.98); }
    else if (k === 'monoprop') { gas = hydrazine(v.x); p = rocket(gas.g, gas.Tc, gas.M, v.pc, v.eps, 0, 0.95); }
    else { var Pr = A.props.hyp, tm = L.interp(Pr.tab, v.of); p = rocket(Pr.g, tm[0], tm[1], v.pc, v.eps, 0, 0.96); }
    var At = Math.PI * Math.pow(v.dt / 2000, 2), F = p.cf * v.pc * 1e5 * At, md = F / (p.isp * G0);
    var eta = 1, tp = v.pw || 0;
    if (k === 'biprop') eta = tp / (tp + 12);
    return { p: p, F: F, md: md, isp: p.isp, ispEff: p.isp * eta, eta: eta, ibit: F * tp / 1000 * eta, gas: gas, At: At };
  }
  A.models.thruster = {
    init: function (e) {
      if (e.kind === 'coldgas') return { gas: 'n2', pc: 5, eps: 40, dt: 2.5 };
      if (e.kind === 'monoprop') return { x: 0.45, pc: 15, eps: 60, dt: 4 };
      return { of: 1.65, pc: 7, eps: 150, dt: 10, pw: 200 };
    },
    controls: function (e) {
      var c = [];
      if (e.kind === 'coldgas') c.push({ k: 'gas', type: 'choice', label: 'Stored gas', options: [{ v: 'n2', label: 'Nitrogen', sub: 'M = 28' }, { v: 'he', label: 'Helium', sub: 'M = 4' }, { v: 'kr', label: 'Krypton', sub: 'M = 84' }], help: 'Same temperature, same pressure \u2014 only the weight of the molecules changes. Watch what that does to Isp.' });
      if (e.kind === 'monoprop') c.push(rng('x', 'Ammonia dissociation <span class="atl-nt">x</span>', 0.1, 0.9, { step: 0.01, fmt: function (q) { return nf(q * 100, 0) + '%'; }, help: 'Hydrazine first breaks into ammonia, then some ammonia breaks into nitrogen and hydrogen. A longer catalyst bed breaks up more ammonia: the gas gets lighter but colder.' }));
      if (e.kind === 'biprop') c.push(rng('of', 'Mixture ratio (O/F)', 1.4, 2.7, { step: 0.01, fmt: function (q) { return nf(q, 2); } }));
      c.push(rng('pc', 'Chamber pressure', e.kind === 'coldgas' ? 1 : 3, e.kind === 'coldgas' ? 20 : 30, { step: 0.1, fmt: function (q) { return fp(q) + ' bar'; } }));
      c.push(epsCtl(5, 300));
      c.push(rng('dt', 'Throat diameter', 0.3, 40, { log: true, fmt: function (q) { return nf(q, q < 10 ? 1 : 0) + ' mm'; }, help: 'Sets the size, and so the thrust.' }));
      if (e.kind === 'biprop') c.push(rng('pw', 'Pulse length', 5, 2000, { log: true, keepPreset: true, fmt: function (q) { return q < 1000 ? nf(q, 0) + ' ms' : nf(q / 1000, 1) + ' s'; }, help: 'Attitude thrusters fire in bursts, often just tens of milliseconds long. Every pulse wastes a little: the valves open, the lines fill and the chamber warms up before it reaches full thrust.' }));
      return c;
    },
    compute: function (e, v) { return thrusterPerf(e, v); },
    stageStatic: function (e, v) {
      var s = L.defs(), cy = CY;
      if (e.kind === 'coldgas') {
        s += P('p-hp', 'press', 4, [[190, cy], [310, cy]]) + P('p-lp', 'press', 4, [[430, cy], [660, cy]]);
        s += part({ id: 'tank', type: 'sphere', x: 118, y: cy, r: 72, mark: GASES[v.gas].name === 'Helium' ? 'He' : (v.gas === 'kr' ? 'Kr' : 'N\u2082'), label: 'GAS TANK', label2: '~300 bar, room temperature', lx: 46, ly: cy + 100, la: 'start' });
        s += part({ id: 'reg', type: 'box', x: 370, y: cy, w: 120, h: 56, label: 'REGULATOR', label2: '300 bar \u2192 a few bar' });
        s += part({ id: 'valve', type: 'valve', x: 560, y: cy, label: 'SOLENOID VALVE', lx: 560, ly: cy - 22 });
      } else if (e.kind === 'monoprop') {
        s += part({ id: 'he', type: 'sphere', x: 96, y: 88, r: 30, label: 'HELIUM', label2: 'pressurant', lx: 134, ly: 84 });
        s += P('p-he', 'press', 3, [[96, 118], [96, 160]]) + P('p-feed', 'fuel', 4, [[168, cy], [470, cy]]) + P('p-cat', 'hotf', 5, [[610, cy], [650, cy]], { nochev: true });
        s += part({ id: 'tank', type: 'tank', side: 'fuel', x: 24, y: 160, w: 144, h: 220, name: 'HYDRAZINE', sub: 'N\u2082H\u2084 \u00B7 diaphragm tank', fill: 0.7 });
        s += part({ id: 'valve', type: 'valve', x: 330, y: cy, label: 'VALVE', lx: 330, ly: cy - 22 });
        var gr = '';
        for (var i = 0; i < 38; i++) gr += circ(484 + (i % 10) * 12.5 + (Math.floor(i / 10) % 2) * 6, cy - 30 + Math.floor(i / 10) * 20, 5, 'atl-catg');
        s += grp('bed', rect(470, cy - 44, 140, 88, 'atl-bed', ' rx="10"') + gr + tx(540, cy - 56, 'CATALYST BED', 'atl-t', 'middle') + tx(540, cy + 64, 'iridium on alumina pellets', 'atl-t2', 'middle'));
      } else {
        s += part({ id: 'he', type: 'sphere', x: 94, y: CY, r: 34, label: 'HELIUM', label2: 'pressurant', lx: 34, ly: CY + 58, la: 'start' });
        s += P('p-hef', 'press', 3, [[94, 236], [94, 196]]) + P('p-heo', 'press', 3, [[94, 304], [94, 344]]);
        s += P('pf', 'fuel', 4, [[164, 118], [560, 118], [560, 246], [612, 246]]) + P('po', 'ox', 4, [[164, 420], [560, 420], [560, 294], [612, 294]]);
        s += part({ id: 'ftank', type: 'tank', side: 'fuel', x: 24, y: 40, w: 140, h: 156, name: 'FUEL', sub: 'MMH', fill: 0.7 });
        s += part({ id: 'otank', type: 'tank', side: 'ox', x: 24, y: 344, w: 140, h: 156, name: 'OXIDISER', sub: 'N\u2082O\u2084', fill: 0.7 });
        s += part({ id: 'vf', type: 'valve', x: 420, y: 118, label: 'FUEL VALVE', lx: 420, ly: 100 }) + part({ id: 'vo', type: 'valve', x: 420, y: 420, label: 'OX VALVE', lx: 420, ly: 450 });
      }
      return s;
    },
    stageDynamic: function (e, v, r) {
      var s = '', cy = CY, k = e.kind, p = r.p, xt, rt = Math.max(9, Math.min(34, 8 + Math.sqrt(v.dt) * 4));
      if (k === 'coldgas') {
        xt = 700;
        s += grp('chamber', path('M660 ' + (cy - 26) + ' L690 ' + (cy - 26) + ' L' + xt + ' ' + (cy - rt) + ' M660 ' + (cy + 26) + ' L690 ' + (cy + 26) + ' L' + xt + ' ' + (cy + rt), 'atl-wall') + tx(676, cy + 46, 'NO FLAME', 'atl-t2', 'middle'));
        s += '<g class="atl-cold">' + L.nozzleSVG(p, { xt: xt, rt: rt, maxRe: 150, maxL: 200, plumeOpacity: 0.3 }).svg + '</g>';
      } else if (k === 'monoprop') {
        xt = 700;
        s += grp('chamber', path('M650 ' + (cy - 40) + ' L680 ' + (cy - 40) + ' L' + xt + ' ' + (cy - rt) + ' M650 ' + (cy + 40) + ' L680 ' + (cy + 40) + ' L' + xt + ' ' + (cy + rt), 'atl-wall') +
          '<ellipse cx="668" cy="' + cy + '" rx="16" ry="30" class="atl-fire"/>' + tx(668, cy + 60, nf(p.Tc, 0) + ' K', 'atl-t2', 'middle'));
        s += L.nozzleSVG(p, { xt: xt, rt: rt, maxRe: 120, maxL: 170, plumeOpacity: 0.7 }).svg;
      } else {
        xt = 700;
        var pulse = Math.max(0.12, Math.min(2.2, v.pw / 1000 + 0.12));
        s += grp('chamber', path('M612 226 L670 226 L' + xt + ' ' + (cy - rt) + ' M612 314 L670 314 L' + xt + ' ' + (cy + rt), 'atl-niob') + '<ellipse cx="648" cy="' + cy + '" rx="26" ry="32" class="atl-fire atl-pulse" style="animation-duration:' + pulse.toFixed(2) + 's"/>' +
          tx(640, 344, 'NIOBIUM CHAMBER \u2014 glows red-hot', 'atl-t2', 'middle'));
        s += grp('inj', rect(600, 232, 12, 76, 'atl-dome', ' rx="4"') + tx(606, 222, 'INJECTOR', 'atl-t2', 'middle'));
        s += '<g class="atl-pulse" style="animation-duration:' + pulse.toFixed(2) + 's">' + L.nozzleSVG(p, { xt: xt, rt: rt, maxRe: 130, maxL: 180 }).svg + '</g>';
      }
      return s;
    },
    stageNote: 'Schematic, not to scale. Real thrusters of this kind range from the size of a pen to the size of a bread loaf.',
    outputs: function (e, v, r) {
      var rows = [['Chamber temperature', nf(r.p.Tc, 0) + ' K'], ['Exhaust molar mass', nf(r.p.M, 1) + ' kg/kmol'], ['Propellant flow', r.md < 0.01 ? nf(r.md * 1e6, 0) + ' mg/s' : nf(r.md * 1000, 1) + ' g/s'], ['Thrust coefficient C<sub>F</sub>', nf(r.p.cf, 3)]];
      if (e.kind === 'biprop') rows.push(['Pulse efficiency', nf(r.eta * 100, 0) + '%'], ['Impulse per pulse', r.ibit < 1 ? nf(r.ibit * 1000, 1) + ' mN\u00B7s' : nf(r.ibit, 2) + ' N\u00B7s']);
      if (e.kind === 'monoprop') rows.push(['Gas after the catalyst', nf((1 - v.x) * 100, 0) + '% of ammonia survives']);
      var bigs = [big('Thrust', fN(r.F), 'In vacuum'), big(e.kind === 'biprop' ? 'Effective Isp' : 'Specific impulse', nf(e.kind === 'biprop' ? r.ispEff : r.isp, 0) + ' s', e.kind === 'biprop' ? 'Steady-state ' + nf(r.isp, 0) + ' s' : 'Exhaust at ' + nf(r.isp * G0, 0) + ' m/s')];
      var badge = e.kind === 'coldgas' ? { k: 'vac', t: 'Speed limit: the sound speed of cold gas', x: 'With no fire, the only energy available is the gas\u2019s own warmth at room temperature. Lighter molecules move faster at the same temperature, which is why helium beats nitrogen by more than two to one.' }
        : (e.kind === 'biprop' && r.eta < 0.6 ? { k: 'edge', t: 'Short pulses waste propellant', x: 'At ' + nf(v.pw, 0) + ' ms, only ' + nf(r.eta * 100, 0) + '% of each pulse runs at full efficiency. That\u2019s the price of precise, tiny nudges.' } : null);
      return { big: bigs, rows: rows, badge: badge };
    },
    chart: function (e, v, r) {
      if (e.kind === 'coldgas') {
        var pts = [], Ms = [2, 3, 4, 6, 8, 12, 16, 20, 28, 40, 60, 84, 131];
        Ms.forEach(function (M) { pts.push([M, rocket(M < 5 ? 1.66 : (M > 80 ? 1.67 : (M < 20 ? 1.5 : 1.4)), 293, M, v.pc, v.eps, 0, 0.98).isp]); });
        var ch = L.lineChart({ aria: 'Cold gas Isp against molar mass', axes: { x: [2, 140], y: [20, 400], xlog: true, ylog: true, xt: [2, 4, 10, 28, 84], yt: [30, 100, 300], xl: 'Molar mass of the gas (kg/kmol, log)', yl: 'Isp (s, log)', xf: function (t) { return nf(t, 0); }, yf: function (t) { return nf(t, 0) + ' s'; } },
          series: [{ pts: pts, cls: 'atl-lp' }], marks: [{ x: 4, y: rocket(1.66, 293, 4, v.pc, v.eps, 0, 0.98).isp, label: 'helium' }, { x: 28.01, y: rocket(1.4, 293, 28.01, v.pc, v.eps, 0, 0.98).isp, label: 'nitrogen' }, { x: 83.8, y: rocket(1.67, 293, 83.8, v.pc, v.eps, 0, 0.98).isp, label: 'krypton' }, { x: r.p.M, y: r.isp, cls: 'atl-ring', r: 8 }] });
        return { title: 'Isp falls as the square root of molecular weight', svg: ch.svg, note: 'Exhaust speed scales with \u221A(T/M). With T fixed at room temperature, the only lever left is lighter gas \u2014 and hydrogen, lightest of all, is too hard to store as a gas.' };
      }
      if (e.kind === 'monoprop') {
        var ip = [], tp = [];
        for (var x = 0.1; x <= 0.901; x += 0.05) { var h = hydrazine(x), q = rocket(h.g, h.Tc, h.M, v.pc, v.eps, 0, 0.95); ip.push([x * 100, q.isp]); tp.push([x * 100, h.Tc / 1700 * 260]); }
        var c2 = L.lineChart({ aria: 'Hydrazine Isp and temperature against ammonia dissociation', axes: { x: [10, 90], y: [150, 260], xt: [10, 30, 50, 70, 90], yt: [160, 190, 220, 250], xl: 'Ammonia dissociated (%)', yl: 'Isp (s) \u00B7 temperature (dashed, scaled)', xf: function (t) { return nf(t, 0) + '%'; }, yf: function (t) { return nf(t, 0) + ' s'; } },
          series: [{ pts: ip, cls: 'atl-lp' }, { pts: tp, cls: 'atl-lt' }], marks: [{ x: v.x * 100, y: r.isp, cls: 'atl-ring', r: 8 }], legend: [{ cls: 'atl-lp', label: 'Isp' }, { cls: 'atl-lt', label: 'chamber temperature' }] });
        return { title: 'The catalyst-bed trade: lighter gas, but colder', svg: c2.svg, note: 'Breaking up ammonia makes lighter nitrogen and hydrogen, which helps \u2014 but the reaction absorbs heat, which hurts more. Designers keep dissociation around 30\u201350%.' };
      }
      var ep = [];
      for (var t = 5; t <= 2000; t *= 1.25) ep.push([t, r.isp * t / (t + 12)]);
      var c3 = L.lineChart({ aria: 'Effective Isp against pulse length', axes: { x: [5, 2000], y: [0, r.isp * 1.1], xlog: true, xt: [10, 30, 100, 300, 1000], yt: ticks(0, r.isp * 1.1, 4), xl: 'Pulse length (ms, log)', yl: 'Effective Isp (s)', xf: function (q) { return nf(q, 0); }, yf: function (q) { return nf(q, 0); } },
        series: [{ pts: ep, cls: 'atl-lp' }, { pts: [[5, r.isp], [2000, r.isp]], cls: 'atl-lref' }], marks: [{ x: v.pw, y: r.ispEff, cls: 'atl-ring', r: 8 }] });
      return { title: 'Short pulses cost efficiency', svg: c3.svg, note: 'Illustrative: each pulse loses the equivalent of about 12 ms of full-thrust firing to valve opening, line filling and chamber warm-up. The dotted line is steady firing.' };
    },
    eq: function (e, v, r) {
      var items = [eqLi('Same nozzle physics as a big engine', 'I<sub>sp</sub> = c* \u00B7 C<sub>F</sub> / g\u2080 = ' + nf(r.p.cs, 0) + ' \u00D7 ' + nf(r.p.cf, 3) + ' / 9.81 = ' + nf(r.isp, 1) + ' s', 'c* = \u221A(R\u00B7T<sub>c</sub>)/\u0393 with T<sub>c</sub> = ' + nf(r.p.Tc, 0) + ' K and M = ' + nf(r.p.M, 1) + ' kg/kmol.')];
      if (e.kind === 'monoprop') items.push(eqLi('Hydrazine decomposition', '3 N\u2082H\u2084 \u2192 4(1\u2212x) NH\u2083 + (1+2x) N\u2082 + 6x H\u2082 \u21D2 M = 96/(5+4x) = ' + nf(r.p.M, 1), 'Temperature falls roughly linearly from 1,640 K (no ammonia broken up) to 866 K (all of it broken up).'));
      if (e.kind === 'biprop') items.push(eqLi('Pulse efficiency (illustrative)', '\u03B7 = t<sub>p</sub> / (t<sub>p</sub> + 12 ms) = ' + nf(r.eta, 2)));
      items.push(eqLi('Thrust', 'F = C<sub>F</sub> \u00B7 P<sub>c</sub> \u00B7 A<sub>t</sub> = ' + fN(r.F)));
      return eqWrap(items, '<b>What\u2019s simplified.</b> Combustion (or decomposition) efficiency is set at 95\u201398%, and small thrusters lose more to heat and boundary layers than big engines do.');
    },
    mapPoint: function (e, v, r) { return { F: r.F, isp: e.kind === 'biprop' ? r.ispEff : r.isp }; }
  };

  /* ======================================================================
     NOZZLES \u2014 how the same engine behaves as it climbs
     ====================================================================== */
  var NPROPS = [{ v: 'lh2', label: 'LOX / LH\u2082', sub: 'Hydrolox' }, { v: 'ch4', label: 'LOX / CH\u2084', sub: 'Methalox' }, { v: 'rp1', label: 'LOX / RP-1', sub: 'Kerolox' }];
  function gasOf(v) { var Pr = A.props[v.prop], tm = L.interp(Pr.tab, Pr.ofNom); return { g: Pr.g, Tc: tm[0], M: tm[1] }; }
  function bellAt(gs, pc, eps, pa) { return rocket(gs.g, gs.Tc, gs.M, pc, eps, pa); }
  function epsFor(gs, pc, pa) { /* area ratio that expands exactly to pa (capped) */
    if (pa <= 0) return 400;
    var pr = pa / pc, g = gs.g; if (pr >= 0.5) return 1.01;
    return Math.min(400, L.areaRatio(L.machFromPr(pr, g), g));
  }
  function nozzleIsp(e, v, alt) {
    var gs = gasOf(v), pa = ambient(alt), k = e.kind, p, mode = '', effEps;
    if (k === 'bell') { p = bellAt(gs, v.pc, v.eps, pa); effEps = v.eps; }
    else if (k === 'extend') { var dep = alt >= v.hd; effEps = dep ? v.eps2 : v.eps1; p = bellAt(gs, v.pc, effEps, pa); mode = dep ? 'deployed' : 'stowed'; }
    else if (k === 'dual') {
      var p2 = bellAt(gs, v.pc, v.eps2, pa);
      if (!p2.sep && (pa <= 0 || p2.PeNom >= 0.25 * pa)) { p = p2; mode = 'full'; effEps = v.eps2; }
      else { p = bellAt(gs, v.pc, v.eps1, pa); p = Object.assign({}, p, { isp: p.isp * 0.985 }); mode = 'inner'; effEps = v.eps1; }
    } else { /* aerospike and expansion\u2013deflection: free jet boundary adapts until the design expansion is reached */
      var eta = k === 'spike' ? 0.985 - 0.02 * v.trunc / 100 : 0.96;
      var pd0 = bellAt(gs, v.pc, v.eps, 0).PeNom;
      if (pa >= pd0 && pa > 0) { effEps = epsFor(gs, v.pc, pa); p = bellAt(gs, v.pc, effEps, pa); mode = 'adapting'; }
      else { effEps = v.eps; p = bellAt(gs, v.pc, v.eps, pa); mode = 'fixed'; }
      p = Object.assign({}, p, { isp: p.isp * eta, eta: eta });
    }
    return { p: p, isp: p.isp, mode: mode, effEps: effEps, pa: pa };
  }
  function nozzleCurves(e, v) {
    var gs = gasOf(v), out = { me: [], sl: [], vac: [], ideal: [] }, epsSL = epsFor(gs, v.pc, 1.01325), epsV = e.kind === 'extend' || e.kind === 'dual' ? v.eps2 : v.eps;
    for (var h = 0; h <= 100; h += 2) {
      var pa = ambient(h);
      out.me.push([h, nozzleIsp(e, v, h).isp]);
      out.sl.push([h, bellAt(gs, v.pc, epsSL, pa).isp]);
      out.vac.push([h, bellAt(gs, v.pc, epsV, pa).isp]);
      out.ideal.push([h, bellAt(gs, v.pc, epsFor(gs, v.pc, pa), pa).isp]);
    }
    out.epsSL = epsSL; out.epsV = epsV;
    return out;
  }
  A.models.nozzle = {
    init: function (e) {
      var v = { prop: 'lh2', pc: 120, alt: 0 };
      if (e.kind === 'bell') v.eps = 40;
      if (e.kind === 'extend') { v.eps1 = 40; v.eps2 = 200; v.hd = 60; }
      if (e.kind === 'dual') { v.eps1 = 25; v.eps2 = 80; }
      if (e.kind === 'spike') { v.eps = 60; v.trunc = 40; }
      if (e.kind === 'ed') v.eps = 50;
      return v;
    },
    controls: function (e) {
      var c = [{ k: 'prop', type: 'choice', label: 'Engine propellants', options: NPROPS },
        rng('alt', 'Altitude', 0, 100, { step: 1, keepPreset: true, play: 'Climb', playMs: 9000, fmt: altFmt, help: 'Press Climb to fly the engine from the launch pad to space and watch the plume change.' }),
        rng('pc', 'Chamber pressure', 40, 250, { step: 1, fmt: function (x) { return nf(x, 0) + ' bar'; } })];
      if (e.kind === 'bell' || e.kind === 'ed') c.push(epsCtl(4, 150, 'One fixed shape. Pick it for sea level, for vacuum, or compromise.'));
      if (e.kind === 'spike') c.push(epsCtl(10, 150, 'The expansion the spike reaches once the air has thinned out.'), rng('trunc', 'Spike truncation', 0, 80, { step: 1, fmt: function (x) { return nf(x, 0) + '%'; }, help: 'A full-length spike is long and heavy. Chopping it short saves most of the weight and costs only a little performance, because hot gas recirculating at the flat base pushes back.' }));
      if (e.kind === 'extend') c.push(rng('eps1', 'Fixed nozzle \u03B5', 10, 60, { step: 1, fmt: fEps }), rng('eps2', 'With extension \u03B5', 60, 300, { log: true, fmt: fEps }), rng('hd', 'Deploy extension at', 10, 100, { step: 1, fmt: function (x) { return nf(x, 0) + ' km'; } }));
      if (e.kind === 'dual') c.push(rng('eps1', 'Inner bell \u03B5', 8, 40, { step: 1, fmt: fEps }), rng('eps2', 'Outer bell \u03B5', 40, 150, { step: 1, fmt: fEps }));
      return c;
    },
    compute: function (e, v) { var r = nozzleIsp(e, v, v.alt); r.curves = nozzleCurves(e, v); r.gs = gasOf(v); return r; },
    stageStatic: function (e, v) {
      var s = L.defs(), cy = CY;
      s += '<rect x="0" y="0" width="1120" height="540" class="atl-sky" id="atl-sky"/>';
      if (e.kind !== 'spike') {
        s += grp('chamber', path('M560 208 L680 208 L720 244 L720 296 L680 332 L560 332 Z', '', ' fill="url(#atlGlow)"') + path('M560 208 L680 208 L720 244 M560 332 L680 332 L720 296', 'atl-wall') +
          path('M560 206 C524 210 516 248 516 270 C516 292 524 330 560 334 Z', 'atl-dome') + tx(624, cy + 4, 'CHAMBER', 'atl-t atl-tb', 'middle'));
      }
      return s;
    },
    stageDynamic: function (e, v, r) {
      var s = '', cy = CY, p = r.p, k = e.kind, xt = 720, rt = 26, pa = r.pa, sky = Math.min(1, pa / 1.01325);
      s += tx(24, 36, (v.alt === 0 ? 'On the launch pad' : (v.alt >= 100 ? 'In space' : 'Climbing through ' + v.alt + ' km')) + ' \u00B7 outside air ' + fp(pa) + ' bar', 'atl-t atl-tb', 'start');
      s += '<rect x="0" y="48" width="' + (1120 * sky).toFixed(0) + '" height="4" class="atl-airbar"/>' + tx(24, 70, 'air density', 'atl-t2', 'start');
      if (k === 'bell' || k === 'extend' || k === 'dual' || k === 'ed') {
        var eps = k === 'bell' || k === 'ed' ? v.eps : (k === 'extend' ? (r.mode === 'deployed' ? v.eps2 : v.eps1) : v.eps2);
        var pv = Object.assign({}, p, { eps: eps });
        if (k === 'dual' && r.mode === 'inner') {
          var n1 = L.noz(v.eps1, { xt: xt, rt: rt }), n2 = L.noz(v.eps2, { xt: xt, rt: rt });
          var outerU = 'M' + n1.xe.toFixed(1) + ' ' + (cy - n1.re).toFixed(1) + ' Q' + ((n1.xe + n2.xe) / 2).toFixed(1) + ' ' + (cy - n1.re - (n2.re - n1.re) * 0.75).toFixed(1) + ' ' + n2.xe.toFixed(1) + ' ' + (cy - n2.re).toFixed(1);
          var outerL = outerU.replace(/(\d+\.\d) (\d+\.\d)/g, function (m0, a, b) { return a + ' ' + (2 * cy - b).toFixed(1); });
          var pin = Object.assign({}, p, { eps: v.eps1 });
          s += L.nozzleSVG(pin, { xt: xt, rt: rt, label: 'INNER BELL' }).svg + grp('outer', path(outerU, 'atl-wall') + path(outerL, 'atl-wall') + tx(n2.xe - 10, cy - n2.re - 10, 'OUTER BELL \u2014 flow separated here', 'atl-t2', 'end') +
            circ(n1.xe, cy - n1.re, 4, 'atl-kink') + circ(n1.xe, cy + n1.re, 4, 'atl-kink'));
        } else if (k === 'dual') {
          var n1b = L.noz(v.eps1, { xt: xt, rt: rt });
          s += L.nozzleSVG(pv, { xt: xt, rt: rt, label: 'BOTH BELLS FLOWING' }).svg + grp('outer', circ(n1b.xe, cy - n1b.re, 4, 'atl-kink') + circ(n1b.xe, cy + n1b.re, 4, 'atl-kink') + tx(n1b.xe, cy - n1b.re - 10, 'KINK', 'atl-t2', 'middle'));
        } else if (k === 'extend') {
          s += L.nozzleSVG(pv, { xt: xt, rt: rt, label: r.mode === 'deployed' ? 'EXTENSION DEPLOYED' : 'FIXED NOZZLE' }).svg;
          var ne = L.noz(v.eps2, { xt: xt, rt: rt }), nf1 = L.noz(v.eps1, { xt: xt, rt: rt });
          if (r.mode === 'stowed') s += grp('ext', path(L.bellD(ne, false), 'atl-ghost2', ' transform="translate(' + (-(ne.xe - nf1.xe) * 0.85).toFixed(1) + ' 0)"') + path(L.bellD(ne, true), 'atl-ghost2', ' transform="translate(' + (-(ne.xe - nf1.xe) * 0.85).toFixed(1) + ' 0)"') + tx(nf1.xe - 30, cy - ne.re - 12, 'EXTENSION STOWED \u2014 deploys at ' + v.hd + ' km', 'atl-t2', 'middle'));
          else s += grp('ext', circ(nf1.xe, cy - nf1.re, 4, 'atl-kink') + circ(nf1.xe, cy + nf1.re, 4, 'atl-kink') + tx(nf1.xe, cy - nf1.re - 10, 'JOINT', 'atl-t2', 'middle'));
        } else {
          s += L.nozzleSVG(pv, { xt: xt, rt: rt, label: k === 'ed' ? 'SHROUD' : 'BELL' }).svg;
          if (k === 'ed') {
            var wake = r.mode === 'adapting' ? Math.max(10, 70 * (1 - r.effEps / v.eps)) : 8;
            s += grp('pintle', path('M' + (xt - 26) + ' ' + cy + ' Q' + (xt + 6) + ' ' + (cy - 18) + ' ' + (xt + 30) + ' ' + cy + ' Q' + (xt + 6) + ' ' + (cy + 18) + ' ' + (xt - 26) + ' ' + cy + ' Z', 'atl-spike') +
              '<ellipse cx="' + (xt + 60) + '" cy="' + cy + '" rx="' + (30 + wake).toFixed(0) + '" ry="' + (wake * 0.6 + 6).toFixed(0) + '" class="atl-wake"/>' + tx(xt + 4, cy - 30, 'PINTLE', 'atl-t2', 'middle'));
          }
        }
      } else { /* aerospike */
        var len = 330 * (1 - v.trunc / 100 * 0.85), base = 16, tipX = 640 + len, Rb = 92;
        var spikeU = 'M640 ' + (cy - Rb) + ' C' + (640 + len * 0.35) + ' ' + (cy - Rb * 0.55) + ' ' + (640 + len * 0.7) + ' ' + (cy - base - 6) + ' ' + tipX.toFixed(1) + ' ' + (cy - base);
        var spikeFill = spikeU + ' L' + tipX.toFixed(1) + ' ' + (cy + base) + ' C' + (640 + len * 0.7) + ' ' + (cy + base + 6) + ' ' + (640 + len * 0.35) + ' ' + (cy + Rb * 0.55) + ' 640 ' + (cy + Rb) + ' Z';
        var adapt = r.mode === 'adapting', spread = adapt ? Math.max(0.05, Math.min(1, (r.effEps - 1) / (v.eps - 1))) : 1;
        var outR = Rb + 18 + (v.alt >= 100 ? 200 : 150 * spread), xe = 1115;
        var jet = 'M640 ' + (cy - Rb - 14) + ' Q' + (tipX - len * 0.3).toFixed(0) + ' ' + (cy - Rb - 20 - 60 * spread).toFixed(0) + ' ' + xe + ' ' + (cy - Math.min(260, outR)).toFixed(0) +
          ' L' + xe + ' ' + (cy + Math.min(260, outR)).toFixed(0) + ' Q' + (tipX - len * 0.3).toFixed(0) + ' ' + (cy + Rb + 20 + 60 * spread).toFixed(0) + ' 640 ' + (cy + Rb + 14) + ' Z';
        s += grp('plume', '<g class="atl-plume"><path d="' + jet + '" fill="url(#atlPlumeG)"/></g>' + (v.trunc > 0 ? '<ellipse cx="' + (tipX + 18).toFixed(0) + '" cy="' + cy + '" rx="24" ry="' + (base + 8) + '" class="atl-wake"/>' : ''));
        s += grp('spike', path(spikeFill, 'atl-spike') + tx(640 + len * 0.45, cy + 4, 'SPIKE', 'atl-t atl-tb', 'middle') + (v.trunc > 0 ? tx(tipX + 4, cy + base + 44, 'truncated base', 'atl-t2', 'start') : ''));
        s += grp('chamber', rect(560, cy - Rb - 34, 80, 34, 'atl-comb', ' rx="8" style="stroke:var(--oxide)"') + rect(560, cy + Rb, 80, 34, 'atl-comb', ' rx="8" style="stroke:var(--oxide)"') +
          tx(600, cy - Rb - 44, 'RING OF COMBUSTION CHAMBERS', 'atl-t2', 'middle') + tx(600, cy + Rb + 52, 'firing along the spike', 'atl-t2', 'middle'));
        s += tx(900, 120, adapt ? 'OUTER EDGE SQUEEZED BY THE AIR' : 'AIR TOO THIN: EXPANSION FIXED', 'atl-t2 atl-tb', 'middle');
      }
      return s;
    },
    stageNote: 'Schematic, not to scale. The bar under the heading shows how dense the outside air is.',
    outputs: function (e, v, r) {
      var c = r.curves, ideal = c.ideal[Math.round(v.alt / 2)][1], rows = [['Outside pressure', fp(r.pa) + ' bar'], ['Working expansion ratio', fEps(r.effEps)], ['Exit pressure', fp(r.p.Pe) + ' bar'],
        ['Best possible here (perfect nozzle)', nf(ideal, 0) + ' s'], ['This nozzle reaches', nf(r.isp / ideal * 100, 1) + '% of that']];
      var badge = L.expansion(r.p), k = e.kind;
      if (k === 'spike' || k === 'ed') badge = r.mode === 'adapting' ? { k: 'ideal', t: 'Adapting to the air', x: 'There\u2019s no outer wall. The outside air itself forms the jet\u2019s outer boundary, so at every altitude up to its design point the exhaust expands to just about the right pressure. That\u2019s altitude compensation.' } : { k: 'vac', t: 'Past the design point', x: 'The air is now too thin to shape the jet. From here the ' + (k === 'spike' ? 'aerospike' : 'nozzle') + ' behaves like an ordinary bell of expansion ratio ' + fEps(v.eps) + '.' };
      if (k === 'dual') badge = r.mode === 'inner' ? { k: 'over', t: 'Inner bell only', x: 'The air is still thick, so the flow deliberately peels away cleanly at the kink, and the engine behaves like a small sea-level nozzle \u2014 no violent side loads.' } : { k: 'vac', t: 'Flowing into the outer bell', x: 'The air has thinned enough for the flow to attach to the second contour. The same nozzle now acts as a big vacuum nozzle.' };
      if (k === 'extend') badge = r.mode === 'stowed' ? { k: 'over', t: 'Extension stowed', x: 'The short fixed nozzle suits the thicker air. The big extension waits folded, out of the way.' } : { k: 'vac', t: 'Extension deployed', x: 'The skirt has slid into place. The larger expansion ratio pays off now that there\u2019s little air left to push back.' };
      return { big: [big('Specific impulse', nf(r.isp, 0) + ' s', 'At ' + (v.alt === 0 ? 'sea level' : (v.alt >= 100 ? 'vacuum' : v.alt + ' km'))), big('Versus sea-level bell', (r.isp >= c.sl[Math.round(v.alt / 2)][1] ? '+' : '') + nf(r.isp - c.sl[Math.round(v.alt / 2)][1], 0) + ' s', 'Against a bell sized for sea level (\u03B5 ' + fEps(c.epsSL) + ')')], rows: rows, badge: badge };
    },
    chart: function (e, v, r) {
      var c = r.curves, lo = Math.min.apply(null, c.sl.concat(c.me).map(function (q) { return q[1]; })) - 10, hi = c.ideal[c.ideal.length - 1][1] + 10;
      var ch = L.lineChart({ aria: 'Isp against altitude for this nozzle and two plain bells', axes: { x: [0, 100], y: [Math.max(0, lo), hi], xt: [0, 20, 40, 60, 80, 100], yt: ticks(Math.max(0, lo), hi, 5), xl: 'Altitude (km)', yl: 'Isp (s)', xf: function (t) { return nf(t, 0); }, yf: function (t) { return nf(t, 0); } },
        series: [{ pts: c.ideal, cls: 'atl-lref' }, { pts: c.sl, cls: 'atl-lsl' }, { pts: c.vac, cls: 'atl-lvac' }, { pts: c.me, cls: 'atl-lme' }], vlines: [{ x: v.alt }],
        marks: [{ x: v.alt, y: r.isp, cls: 'atl-ring', r: 7 }],
        legend: [{ cls: 'atl-lme', label: 'this nozzle' }, { cls: 'atl-lsl', label: 'sea-level bell' }, { cls: 'atl-lvac', label: 'vacuum bell' }, { cls: 'atl-lref', label: 'perfect' }] });
      return { title: 'Isp from launch pad to space', svg: ch.svg, note: 'The dotted curve is a perfect nozzle that reshapes itself at every altitude \u2014 the ceiling nothing can beat. A plain bell only touches it at one altitude. Altitude-compensating designs try to hug it all the way up.' };
    },
    eq: function (e, v, r) {
      var items = [eqLi('Perfect expansion', 'P<sub>e</sub> = P<sub>a</sub>  \u21D2  \u03B5<sub>ideal</sub> = f(P<sub>c</sub>/P<sub>a</sub>) = ' + fEps(epsFor(r.gs, v.pc, r.pa)), 'The area ratio that turns all the pressure into speed at this altitude. It grows without limit as the air vanishes \u2014 hence the ever-bigger vacuum nozzles.'),
        eqLi('Thrust coefficient', 'C<sub>F</sub> = momentum term + \u03B5(P<sub>e</sub> \u2212 P<sub>a</sub>)/P<sub>c</sub> = ' + nf(r.p.mom, 3) + ' + (' + nf(r.p.press, 3) + ')', 'An over-expanded bell loses to the second term; an under-expanded one leaves energy unused.')];
      if (e.kind === 'spike' || e.kind === 'ed') items.push(eqLi('Altitude compensation (idealised)', 'P<sub>a</sub> \u2265 P<sub>e,design</sub>: expand to P<sub>a</sub>;  otherwise: fixed \u03B5 = ' + fEps(v.eps) + ',  \u00D7 efficiency ' + nf(r.p.eta || 1, 3), e.kind === 'spike' ? 'Truncation costs about 2% for a stub spike; real aerospikes also lose a little to the more complex flow.' : 'Expansion\u2013deflection compensates less cleanly; the model uses a flat 96% efficiency.'));
      if (e.kind === 'dual') items.push(eqLi('Transition', 'flow fills the outer bell once P<sub>e,outer</sub> \u2265 0.25 \u00B7 P<sub>a</sub>', 'Below that, the flow separates cleanly at the kink; a small aspiration drag (1.5%) is charged in that mode.'));
      return eqWrap(items, '<b>What\u2019s simplified.</b> Same effective-\u03B3 nozzle model as the liquid cycles, at the propellant\u2019s nominal mixture ratio. Real altitude-compensating nozzles lose a few percent more to cooling, weight and complex flow.');
    },
    mapPoint: function () { return null; }
  };

  /* ======================================================================
     ELECTRIC PROPULSION \u2014 power-limited: thrust = 2\u00B7\u03B7\u00B7P / v_e
     ====================================================================== */
  var AMU = 1.6605e-27, QE = 1.602e-19;
  var EPROP = { xe: { name: 'Xenon', m: 131.29, loss: 250, hloss: 80 }, kr: { name: 'Krypton', m: 83.8, loss: 350, hloss: 140 }, ar: { name: 'Argon', m: 39.95, loss: 500, hloss: 220 } };
  var RGAS = { n2h4: { name: 'Hydrazine', M: 12.8, g: 1.30 }, nh3: { name: 'Ammonia', M: 17.03, g: 1.30 }, h2o: { name: 'Water', M: 18.0, g: 1.25 }, h2: { name: 'Hydrogen', M: 2.016, g: 1.38 }, xe: { name: 'Xenon', M: 131.3, g: 1.67 } };
  function elecPerf(e, v) {
    var k = e.kind, P = v.P, ve, eta, extra = {};
    if (k === 'resisto' || k === 'arcjet') {
      var gs = RGAS[v.gas], M = gs.M;
      if (k === 'arcjet' && v.gas !== 'xe') { var diss = 1 / (1 + Math.exp(-(v.T - 5000) / 900)); M = gs.M / (1 + 0.8 * diss); extra.diss = diss; }
      var pr = rocket(gs.g, v.T, M, 2, 100, 0, 1.0);
      ve = pr.isp * G0;
      eta = k === 'resisto' ? 0.8 : Math.max(0.22, 0.45 - 0.03 * (v.T - 3000) / 1000);
      extra.M = M;
    } else if (k === 'ion') {
      var pp = EPROP[v.prop]; ve = 0.77 * Math.sqrt(2 * QE * v.V / (pp.m * AMU)); eta = 0.78 * v.V / (v.V + pp.loss);
    } else if (k === 'hall') {
      var ph = EPROP[v.prop]; ve = 0.8 * Math.sqrt(2 * QE * v.V / (ph.m * AMU)); eta = 0.65 * v.V / (v.V + ph.hloss);
    } else if (k === 'mpd') {
      var J = P / 100, T = 1e-7 * J * J * (Math.log(5) + 0.75), md = v.md / 1000;
      extra.J = J; extra.onset = J * J / md > 1.3e11;
      if (T * T / (2 * md * P) > 0.7) T = Math.sqrt(1.4 * md * P);
      ve = T / md; eta = T * T / (2 * md * P);
      return fin(T, ve, eta, extra);
    } else if (k === 'vasimr') {
      ve = v.isp * G0; eta = 0.72 * Math.min(1, Math.pow(v.isp / 4500, 0.5));
    } else if (k === 'ppt') {
      var Ibit = 15e-6 * v.E, isp = 800 + 8 * v.E; ve = isp * G0; P = v.E * v.f;
      var Tp = Ibit * v.f; extra.Ibit = Ibit; extra.Pavg = P;
      return fin(Tp, ve, Tp * ve / (2 * P), extra, P);
    } else { ve = v.isp * G0; eta = 0.13; }
    return fin(2 * eta * P / ve, ve, eta, extra);
    function fin(T, vex, et, ex, Pin) {
      var Pw = Pin || v.P, md2 = T / vex, m0 = v.mass, dv = 1000, mp = m0 * (1 - Math.exp(-dv / vex)), tdv = mp / md2;
      var o = { T: T, ve: vex, isp: vex / G0, eta: et, md: md2, P: Pw, mp: mp, tdv: tdv, acc: T / m0 };
      for (var q in ex) o[q] = ex[q];
      return o;
    }
  }
  var PWR = function (x) { return x < 1000 ? nf(x, x < 10 ? 1 : 0) + ' W' : (x < 1e6 ? nf(x / 1000, x < 1e4 ? 2 : 1) + ' kW' : nf(x / 1e6, 2) + ' MW'); };
  var ELEC_BAND = { resisto: [200, 350], arcjet: [450, 1500], ion: [2500, 10000], hall: [1200, 3000], mpd: [1500, 8000], vasimr: [3000, 30000], ppt: [700, 1500], espray: [1000, 8000] };
  A.models.electric = {
    init: function (e) {
      var k = e.kind, base = { mass: 1000 };
      if (k === 'resisto') return Object.assign(base, { gas: 'n2h4', T: 2000, P: 500 });
      if (k === 'arcjet') return Object.assign(base, { gas: 'n2h4', T: 5000, P: 2000 });
      if (k === 'ion') return Object.assign(base, { prop: 'xe', V: 1100, P: 2300 });
      if (k === 'hall') return Object.assign(base, { prop: 'xe', V: 300, P: 1350 });
      if (k === 'mpd') return Object.assign(base, { P: 1e6, md: 1.2, mass: 20000 });
      if (k === 'vasimr') return Object.assign(base, { P: 200000, isp: 5000, mass: 10000 });
      if (k === 'ppt') return Object.assign(base, { E: 40, f: 1, mass: 50 });
      return Object.assign(base, { P: 40, isp: 4000, mass: 20 });
    },
    controls: function (e) {
      var k = e.kind, c = [];
      if (k === 'resisto' || k === 'arcjet') c.push({ k: 'gas', type: 'choice', label: 'Propellant', options: (k === 'resisto' ? ['n2h4', 'nh3', 'h2o', 'xe'] : ['n2h4', 'nh3', 'h2']).map(function (q) { return { v: q, label: RGAS[q].name, sub: 'M = ' + nf(RGAS[q].M, 0) }; }) });
      if (k === 'ion' || k === 'hall') c.push({ k: 'prop', type: 'choice', label: 'Propellant', options: (k === 'ion' ? ['xe', 'kr'] : ['xe', 'kr', 'ar']).map(function (q) { return { v: q, label: EPROP[q].name, sub: nf(EPROP[q].m, 0) + ' amu' }; }) });
      if (k === 'resisto') c.push(rng('T', 'Heater temperature', 800, 2600, { step: 10, fmt: function (x) { return nf(x, 0) + ' K'; }, help: 'Limited by what the heating element and chamber metal can survive.' }));
      if (k === 'arcjet') c.push(rng('T', 'Average gas temperature', 2500, 9000, { step: 50, fmt: function (x) { return nf(x, 0) + ' K'; }, help: 'The arc core runs past 20,000 K; this is the average after the cold outer gas mixes in.' }));
      if (k === 'ion') c.push(rng('V', 'Beam voltage', 300, 3000, { step: 10, fmt: function (x) { return nf(x, 0) + ' V'; }, help: 'The voltage across the grids sets how hard each ion is flung out \u2014 and so the exhaust speed directly.' }));
      if (k === 'hall') c.push(rng('V', 'Discharge voltage', 150, 800, { step: 5, fmt: function (x) { return nf(x, 0) + ' V'; } }));
      if (k === 'vasimr' || k === 'espray') c.push(rng('isp', 'Specific impulse', k === 'vasimr' ? 3000 : 1000, k === 'vasimr' ? 30000 : 8000, { log: true, fmt: function (x) { return nf(x, 0) + ' s'; }, help: k === 'vasimr' ? 'VASIMR can retune this in flight: at fixed power, trade exhaust speed for thrust.' : 'Set by the extraction voltage and the charge-to-mass ratio of what\u2019s emitted.' }));
      if (k === 'mpd') c.push(rng('md', 'Propellant flow', 0.5, 60, { log: true, fmt: function (x) { return nf(x, 1) + ' g/s'; }, help: 'Thrust depends on current, not flow. Less flow means faster exhaust \u2014 until the discharge goes unstable.' }));
      if (k === 'ppt') c.push(rng('E', 'Energy per pulse', 2, 100, { log: true, fmt: function (x) { return nf(x, 1) + ' J'; } }), rng('f', 'Pulse rate', 0.1, 5, { log: true, fmt: function (x) { return nf(x, 2) + ' Hz'; } }));
      else c.push(rng('P', 'Input power', { resisto: 50, arcjet: 300, ion: 300, hall: 150, mpd: 1e5, vasimr: 1e4, espray: 1 }[k], { resisto: 5000, arcjet: 30000, ion: 20000, hall: 50000, mpd: 1e7, vasimr: 1e6, espray: 200 }[k], { log: true, fmt: PWR, help: 'Electric propulsion is power-limited: the whole design follows from how many watts the spacecraft can spare.' }));
      c.push(rng('mass', 'Spacecraft mass', k === 'espray' || k === 'ppt' ? 1 : 100, k === 'mpd' || k === 'vasimr' ? 200000 : 20000, { log: true, keepPreset: true, fmt: function (x) { return x < 1000 ? nf(x, 0) + ' kg' : nf(x / 1000, x < 1e4 ? 1 : 0) + ' t'; } }));
      return c;
    },
    compute: function (e, v) { return elecPerf(e, v); },
    speed: function (e, v, r) { return 1; },
    stageStatic: function (e, v) { return L.defs() + elecStatic(e, v); },
    stageDynamic: function (e, v, r) { return elecDynamic(e, v, r); },
    stageNote: 'Schematic, not to scale. Beams and particles are drawn slowed down enormously \u2014 real ions leave at tens of kilometres per second.',
    outputs: function (e, v, r) {
      var rows = [['Efficiency (jet power \u00F7 input)', nf(r.eta * 100, 0) + '%'], ['Thrust per kilowatt', nf(r.T / (r.P / 1000) * 1000, 1) + ' mN/kW'], ['Propellant flow', r.md < 1e-6 ? nf(r.md * 1e9, 1) + ' \u00B5g/s' : (r.md < 1e-3 ? nf(r.md * 1e6, 1) + ' mg/s' : nf(r.md * 1000, 1) + ' g/s')],
        ['Acceleration of this spacecraft', r.acc < 1e-3 ? nf(r.acc * 1e6, 1) + ' \u00B5m/s\u00B2' : nf(r.acc * 1000, 2) + ' mm/s\u00B2'], ['Time to change speed by 1 km/s', fDur(r.tdv)], ['Propellant for that 1 km/s', r.mp < 10 ? nf(r.mp, 2) + ' kg' : nf(r.mp, 0) + ' kg']];
      if (e.kind === 'mpd') rows.unshift(['Arc current', nf(r.J / 1000, 1) + ' kA']);
      if (e.kind === 'ppt') rows.unshift(['Impulse per pulse', nf(r.Ibit * 1e6, 0) + ' \u00B5N\u00B7s'], ['Average power', PWR(r.Pavg)]);
      var chem = r.mp > 0 ? v.mass * (1 - Math.exp(-1000 / (320 * G0))) : 0;
      var badge = { k: 'vac', t: 'Gentle but relentless', x: 'This thruster pushes a ' + (v.mass < 1000 ? nf(v.mass, 0) + ' kg' : nf(v.mass / 1000, 1) + '-tonne') + ' spacecraft with the force of ' + weightOf(r.T) + '. Changing speed by 1 km/s takes ' + fDur(r.tdv) + ' \u2014 but only ' + nf(r.mp, r.mp < 10 ? 2 : 0) + ' kg of propellant, against about ' + nf(chem, 0) + ' kg for a good chemical thruster.' };
      if (e.kind === 'mpd' && r.onset) badge = { k: 'sep', t: 'Past the \u201Conset\u201D limit', x: 'This much current for this little propellant is beyond what real MPD thrusters sustain: the discharge starts to starve, voltage oscillates and the electrodes erode rapidly. Add propellant or cut power.' };
      return { big: [big('Thrust', fN(r.T), 'From ' + PWR(r.P) + ' of electricity'), big('Specific impulse', nf(r.isp, 0) + ' s', 'Exhaust at ' + nf(r.ve / 1000, 1) + ' km/s')], rows: rows, badge: badge };
    },
    chart: function (e, v, r) {
      var Pj = r.eta * r.P, pts = [], band = ELEC_BAND[e.kind];
      for (var isp = 100; isp <= 50000; isp *= 1.15) pts.push([isp, 2 * Pj / (isp * G0)]);
      var ymax = 2 * Pj / (100 * G0), ymin = 2 * Pj / (50000 * G0);
      var ch = L.lineChart({ aria: 'Thrust against specific impulse at fixed power', axes: { x: [100, 50000], y: [ymin, ymax], xlog: true, ylog: true, xt: [100, 1000, 10000], yt: decades(ymin, ymax), xl: 'Specific impulse (s, log)', yl: 'Thrust (log)', xf: function (t) { return nf(t, 0) + ' s'; }, yf: fN },
        bands: [{ x0: band[0], x1: band[1], label: 'where this type operates' }], series: [{ pts: pts, cls: 'atl-lp' }], marks: [{ x: r.isp, y: r.T, cls: 'atl-ring', r: 8, label: 'this setting' }] });
      return { title: 'The power trade: thrust or exhaust speed, pick one', svg: ch.svg, note: 'At fixed jet power, thrust \u00D7 exhaust speed is constant \u2014 double the Isp and you halve the thrust. The curve is every possible setting at ' + PWR(r.P) + ' and ' + nf(r.eta * 100, 0) + '% efficiency.' };
    },
    eq: function (e, v, r) {
      var k = e.kind, items = [];
      if (k === 'ion') items.push(eqLi('Exhaust speed from the grid voltage', 'v<sub>e</sub> \u2248 0.77 \u00B7 \u221A(2 \u00B7 e \u00B7 V<sub>b</sub> / m<sub>ion</sub>) = 0.77 \u00B7 \u221A(2 \u00D7 1.6\u00D710\u207B\u00B9\u2079 \u00D7 ' + nf(v.V, 0) + ' / (' + nf(EPROP[v.prop].m, 1) + ' \u00D7 1.66\u00D710\u207B\u00B2\u2077)) = ' + nf(r.ve / 1000, 1) + ' km/s', 'Energy gained falling through the voltage becomes kinetic energy. The 0.77 folds in beam spread, doubly charged ions and unused propellant.'),
        eqLi('Efficiency', '\u03B7 \u2248 0.78 \u00B7 V<sub>b</sub> / (V<sub>b</sub> + ' + EPROP[v.prop].loss + ' V) = ' + nf(r.eta, 2), 'Making each ion costs a roughly fixed amount of energy, so low-voltage (low-Isp) operation wastes a larger share. Krypton costs more to ionise than xenon.'));
      else if (k === 'hall') items.push(eqLi('Exhaust speed from the discharge voltage', 'v<sub>e</sub> \u2248 0.8 \u00B7 \u221A(2 \u00B7 e \u00B7 V<sub>d</sub> / m<sub>ion</sub>) = ' + nf(r.ve / 1000, 1) + ' km/s'), eqLi('Efficiency', '\u03B7 \u2248 0.65 \u00B7 V<sub>d</sub> / (V<sub>d</sub> + ' + EPROP[v.prop].hloss + ' V) = ' + nf(r.eta, 2)));
      else if (k === 'resisto' || k === 'arcjet') items.push(eqLi('Thermal exhaust speed', 'v<sub>e</sub> from the nozzle equations with T = ' + nf(v.T, 0) + ' K, M = ' + nf(r.M, 1) + ' \u2192 ' + nf(r.ve, 0) + ' m/s', k === 'arcjet' ? 'At arc temperatures molecules break apart, lowering the molar mass \u2014 which helps exhaust speed, but that broken-up energy is never recovered (frozen-flow loss), so efficiency falls.' : 'An electric heater replaces combustion. Same physics as a rocket nozzle, capped by the metal\u2019s temperature limit.'));
      else if (k === 'mpd') items.push(eqLi('Self-field Lorentz thrust (Maecker)', 'F = (\u03BC\u2080/4\u03C0) \u00B7 J\u00B2 \u00B7 (ln(r<sub>a</sub>/r<sub>c</sub>) + \u00BE) = 10\u207B\u2077 \u00D7 ' + nf(r.J, 0) + '\u00B2 \u00D7 2.36 = ' + fN(r.T), 'The current J = P/V (V \u2248 100 V) flows radially through the plasma and makes its own ring-shaped magnetic field; J \u00D7 B pushes the plasma out. Thrust depends on current squared, not on how much propellant you feed.'),
        eqLi('Efficiency', '\u03B7 = F\u00B2 / (2 \u00B7 \u1E41 \u00B7 P) = ' + nf(r.eta, 2)));
      else if (k === 'ppt') items.push(eqLi('Impulse per pulse', 'I<sub>bit</sub> \u2248 15 \u00B5N\u00B7s/J \u00D7 ' + nf(v.E, 1) + ' J = ' + nf(r.Ibit * 1e6, 0) + ' \u00B5N\u00B7s', 'Illustrative, typical of Teflon pulsed plasma thrusters. Average thrust = I<sub>bit</sub> \u00D7 pulse rate.'));
      else if (k === 'vasimr') items.push(eqLi('Efficiency', '\u03B7 \u2248 0.72 \u00B7 min(1, \u221A(I<sub>sp</sub>/4,500)) = ' + nf(r.eta, 2), 'Illustrative: radio-frequency heating couples less well at low exhaust speeds.'));
      else items.push(eqLi('Efficiency', '\u03B7 \u2248 0.13', 'Overall value including the propellant heater and power electronics, fitted to a flight FEEP unit. The emission itself is far more efficient.'));
      items.push(eqLi('Thrust from power', 'F = 2 \u00B7 \u03B7 \u00B7 P / v<sub>e</sub> = 2 \u00D7 ' + nf(r.eta, 2) + ' \u00D7 ' + PWR(r.P) + ' / ' + nf(r.ve, 0) + ' m/s = ' + fN(r.T), 'Jet power is \u00BD\u1E41v<sub>e</sub>\u00B2 and thrust is \u1E41v<sub>e</sub>, so F = 2P<sub>jet</sub>/v<sub>e</sub>. For fixed power, faster exhaust means less thrust.'),
        eqLi('Propellant for \u0394v = 1 km/s', 'm<sub>p</sub> = m\u2080 (1 \u2212 e<sup>\u2212\u0394v/v<sub>e</sub></sup>) = ' + nf(r.mp, 2) + ' kg', 'The rocket equation again: the faster the exhaust, the less propellant you need.'));
      return eqWrap(items, '<b>What\u2019s simplified.</b> Efficiencies use simple fits to flight hardware (NSTAR, NEXT, SPT-100) and textbook values; the spacecraft mass is treated as constant while computing time.');
    },
    preset: function (e, x) { return x.set ? { v: Object.assign({}, x.set) } : null; },
    vs: function (e, v, r, x) {
      if (!x.pub) return null;
      return '<span class="lbl">Model vs the real ' + esc(x.name) + '</span><p>Published: <strong>' + fN(x.pub.T) + '</strong> at <strong>' + nf(x.pub.isp, 0) + ' s</strong>. The model says <strong>' + fN(r.T) + '</strong> at <strong>' + nf(r.isp, 0) + ' s</strong> (' +
        ((r.T - x.pub.T) / x.pub.T * 100 >= 0 ? '+' : '\u2212') + nf(Math.abs((r.T - x.pub.T) / x.pub.T * 100), 0) + '% thrust, ' + ((r.isp - x.pub.isp) / x.pub.isp * 100 >= 0 ? '+' : '\u2212') + nf(Math.abs((r.isp - x.pub.isp) / x.pub.isp * 100), 0) + '% Isp).</p>';
    },
    mapPoint: function (e, v, r) { return { F: r.T, isp: r.isp }; }
  };
  function decades(a, b) { var out = []; for (var p = Math.ceil(Math.log10(a)); p <= Math.floor(Math.log10(b)); p++) out.push(Math.pow(10, p)); return out.length ? out : [a, b]; }
  function weightOf(N) {
    if (N < 1e-4) return 'a grain of sand resting on your hand';
    if (N < 0.002) return 'a feather in Earth\u2019s gravity';
    if (N < 0.02) return 'a sheet of paper';
    if (N < 0.3) return 'a few coins';
    if (N < 3) return 'an apple';
    if (N < 30) return 'a bag of groceries';
    return 'a person standing on a bathroom scale';
  }
  function solarArray() {
    var cells = '';
    for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) cells += rect(34 + i * 34, 60 + j * 40, 30, 36, 'atl-cell');
    return grp('array', rect(28, 54, 144, 130, 'atl-arrayf', ' rx="3"') + cells + tx(100, 202, 'SOLAR ARRAY', 'atl-t2', 'middle'));
  }
  function elecStatic(e, v) {
    var k = e.kind, s = '';
    s += solarArray();
    s += P('pw1', 'elec', 2, [[172, 120], [230, 120]]);
    s += part({ id: 'ppu', type: 'box', x: 290, y: 120, w: 120, h: 58, label: 'POWER UNIT', label2: k === 'ppt' ? 'charges capacitor' : 'volts & amps', fl: 'elec' });
    var tank = k === 'ppt' ? null : { id: 'tank', type: 'sphere', x: 100, y: 410, r: 50, mark: { xe: 'Xe', kr: 'Kr', ar: 'Ar' }[v.prop] || (k === 'espray' ? 'In' : (k === 'resisto' || k === 'arcjet' ? { n2h4: 'N\u2082H\u2084', nh3: 'NH\u2083', h2o: 'H\u2082O', h2: 'H\u2082', xe: 'Xe' }[v.gas] : (k === 'mpd' ? 'Ar' : (k === 'vasimr' ? 'Ar' : '')))), label: k === 'espray' ? 'IONIC LIQUID / METAL' : 'PROPELLANT', label2: k === 'ion' || k === 'hall' ? 'stored at ~150 bar' : '', lx: 160, ly: 440, fl: 'xe' };
    if (tank) s += part(tank) + P('pp', 'xe', 3, [[150, 410], [300, 410]]) + part({ id: 'fcv', type: 'valve', x: 330, y: 410, label: 'FLOW CONTROL', lx: 330, ly: 392 });
    return s;
  }
  function beamLines(x0, x1, y0, y1, n, id, fl, cls) {
    var s = '';
    for (var i = 0; i < n; i++) { var y = y0 + (y1 - y0) * (i + 0.5) / n; s += '<line class="' + (cls || 'atl-beaml') + '" x1="' + x0 + '" x2="' + x1 + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" style="stroke:var(--atl-' + fl + ');animation-delay:' + (-i * 0.13).toFixed(2) + 's"/>'; }
    return s;
  }
  function elecDynamic(e, v, r) {
    var k = e.kind, s = '', cy = CY, spread = Math.max(0.15, Math.min(1, r.T / (0.3 * Math.max(r.T, 1e-9))));
    void spread;
    if (k === 'ion') {
      s += P('pp2', 'xe', 3, [[354, 410], [560, 410], [560, 340]]) + P('pw2', 'elec', 2, [[350, 120], [748, 120], [748, 162]]) + P('pw3', 'elec', 2, [[350, 132], [540, 132], [540, 234]]);
      s += grp('chamber', rect(520, 160, 240, 220, 'atl-case', ' rx="14"') + rect(530, 170, 220, 200, 'atl-plasmaf', ' rx="10"') + rect(526, 176, 10, 24, 'atl-magnet') + rect(526, 340, 10, 24, 'atl-magnet') + rect(640, 162, 24, 10, 'atl-magnet') + rect(640, 368, 24, 10, 'atl-magnet') +
        tx(640, 150, 'DISCHARGE CHAMBER', 'atl-t', 'middle') + tx(640, 398, 'magnets keep electrons bouncing', 'atl-t2', 'middle'));
      s += grp('cathode', rect(536, cy - 10, 44, 20, 'atl-mach', ' rx="4"') + tx(558, cy - 16, 'HOLLOW CATHODE', 'atl-t2', 'middle'));
      var grid = '';
      for (var i = 0; i < 18; i++) grid += '<line class="atl-hole2" x1="760" x2="776" y1="' + (178 + i * 11.2).toFixed(1) + '" y2="' + (178 + i * 11.2).toFixed(1) + '"/>';
      s += grp('grids', '<line class="atl-grid2" x1="762" x2="762" y1="170" y2="370"/><line class="atl-grid2 atl-grid2b" x1="774" x2="774" y1="170" y2="370"/>' + grid +
        tx(756, 424, 'SCREEN GRID +' + nf(v.V, 0) + ' V', 'atl-t2', 'end') + tx(756, 438, 'ACCEL GRID \u2212200 V', 'atl-t2', 'end'));
      s += grp('beam', path('M776 176 L1115 ' + (176 - 40) + ' L1115 ' + (364 + 40) + ' L776 364 Z', '', ' fill="url(#atlBeamG)"') + beamLines(780, 1115, 184, 356, 9, '', 'ion') + tx(950, 120, 'ION BEAM \u2014 ' + nf(r.ve / 1000, 0) + ' km/s', 'atl-t atl-tb', 'middle'));
      s += grp('neut', rect(800, 420, 44, 20, 'atl-mach', ' rx="4"') + P('pe', 'e', 2, [[844, 430], [940, 430], [940, 380]]) + tx(822, 458, 'NEUTRALISER', 'atl-t2', 'middle') + tx(946, 452, 'electrons join the beam', 'atl-t2', 'start'));
    } else if (k === 'hall') {
      s += P('pp2', 'xe', 3, [[354, 410], [520, 410], [520, 320], [560, 320]]) + P('pp3', 'xe', 3, [[520, 320], [520, 220], [560, 220]], { nochev: true }) + P('pw2', 'elec', 2, [[350, 120], [548, 120], [548, 190]]);
      s += grp('channel', rect(560, 190, 170, 60, 'atl-chan', ' rx="4"') + rect(560, 290, 170, 60, 'atl-chan', ' rx="4"') + rect(566, 196, 158, 48, 'atl-plasmaf') + rect(566, 296, 158, 48, 'atl-plasmaf') +
        tx(645, 180, 'ANNULAR CHANNEL (seen in cut-away)', 'atl-t2', 'middle'));
      s += grp('anode', rect(556, 192, 10, 56, 'atl-anode') + rect(556, 292, 10, 56, 'atl-anode') + tx(540, 270, 'ANODE', 'atl-t2', 'end') + tx(540, 284, '+' + nf(v.V, 0) + ' V', 'atl-t2', 'end'));
      s += grp('magnet', rect(560, 250, 170, 40, 'atl-magnet2', ' rx="3"') + rect(560, 150, 170, 40, 'atl-magnet2', ' rx="3"') + rect(560, 350, 170, 40, 'atl-magnet2', ' rx="3"') +
        [690, 704, 718].map(function (x) { return '<line class="atl-field" x1="' + x + '" x2="' + x + '" y1="188" y2="252"/><line class="atl-field" x1="' + x + '" x2="' + x + '" y1="288" y2="352"/>'; }).join('') + tx(645, 274, 'MAGNETIC POLES', 'atl-t2', 'middle'));
      s += grp('drift', '<ellipse cx="702" cy="220" rx="12" ry="20" class="atl-drift"/><ellipse cx="702" cy="320" rx="12" ry="20" class="atl-drift"/>' + tx(760, 402, 'electrons trapped circling the channel', 'atl-t2', 'start'));
      s += grp('beam', path('M730 190 L1115 110 L1115 250 L730 250 Z', '', ' fill="url(#atlPlasmaG)"') + path('M730 290 L1115 290 L1115 430 L730 350 Z', '', ' fill="url(#atlPlasmaG)"') + beamLines(734, 1115, 196, 244, 4, '', 'plasma') + beamLines(734, 1115, 296, 344, 4, '', 'plasma') + tx(950, 96, 'PLASMA JET \u2014 ' + nf(r.ve / 1000, 0) + ' km/s', 'atl-t atl-tb', 'middle'));
      s += grp('cathode', rect(760, 420, 44, 20, 'atl-mach', ' rx="4"') + P('pe', 'e', 2, [[782, 420], [782, 372]]) + tx(782, 458, 'CATHODE', 'atl-t2', 'middle'));
    } else if (k === 'resisto' || k === 'arcjet') {
      var p = rocket(RGAS[v.gas].g, v.T, r.M || RGAS[v.gas].M, 2, 100, 0, 1.0);
      s += P('pp2', 'xe', 3, [[354, 410], [500, 410], [500, cy], [540, cy]]) + P('pw2', 'elec', 2, [[350, 120], [620, 120], [620, 206]]);
      if (k === 'resisto') {
        var zig = 'M560 ' + cy;
        for (var j = 0; j < 12; j++) zig += ' L' + (566 + j * 12) + ' ' + (cy + (j % 2 ? 26 : -26));
        s += grp('heater', rect(540, 206, 180, 128, 'atl-case', ' rx="12"') + path(zig, 'atl-coilg') + tx(630, 196, 'HEATER CHAMBER', 'atl-t', 'middle') + tx(630, 352, 'electric element at ' + nf(v.T, 0) + ' K', 'atl-t2', 'middle'));
        s += L.nozzleSVG(p, { xt: 760, rt: 16, maxRe: 90, maxL: 130, plumeOpacity: 0.45 }).svg + grp('throat', path('M720 214 L760 ' + (cy - 16) + ' M720 326 L760 ' + (cy + 16), 'atl-wall'));
      } else {
        var arc = 'M' + 632 + ' ' + cy;
        for (var q = 0; q < 6; q++) arc += ' L' + (640 + q * 20) + ' ' + (cy + (q % 2 ? -12 : 12) - q * 2);
        s += grp('cathode', rect(540, cy - 7, 92, 14, 'atl-mach', ' rx="4"') + path('M632 ' + (cy - 7) + ' L648 ' + cy + ' L632 ' + (cy + 7) + ' Z', 'atl-mach') + tx(580, cy - 16, 'CATHODE ROD', 'atl-t2', 'middle'));
        s += grp('arc', path(arc, 'atl-arc') + path('M640 ' + cy + ' L760 ' + (cy - 14) + ' L760 ' + (cy + 14) + ' Z', 'atl-arcglow') + tx(700, cy + 46, 'ARC \u2014 core above 20,000 K', 'atl-t2', 'middle'));
        s += grp('anode', path('M540 206 L700 206 L760 ' + (cy - 16) + ' M540 334 L700 334 L760 ' + (cy + 16), 'atl-wall') + tx(620, 196, 'ANODE \u2014 the nozzle body itself', 'atl-t', 'middle'));
        s += L.nozzleSVG(p, { xt: 760, rt: 16, maxRe: 90, maxL: 130 }).svg;
      }
    } else if (k === 'mpd') {
      s += P('pp2', 'xe', 3, [[354, 410], [520, 410], [520, 300], [560, 300]]) + P('pw2', 'elec', 2, [[350, 120], [650, 120], [650, 180]]);
      s += grp('anode', rect(540, 180, 240, 18, 'atl-anode') + rect(540, 342, 240, 18, 'atl-anode') + tx(660, 172, 'ANODE (outer cylinder)', 'atl-t2', 'middle'));
      s += grp('cathode', rect(540, cy - 12, 150, 24, 'atl-mach', ' rx="6"') + tx(600, cy + 4, 'CATHODE', 'atl-t2', 'middle'));
      var cur = '';
      for (var c2 = 0; c2 < 5; c2++) { var xx = 600 + c2 * 30; cur += path('M' + xx + ' 198 Q' + (xx + 30) + ' 230 ' + (xx + 44) + ' ' + (cy - 12), 'atl-arcj') + path('M' + xx + ' 342 Q' + (xx + 30) + ' 310 ' + (xx + 44) + ' ' + (cy + 12), 'atl-arcj'); }
      s += grp('current', cur + rect(560, 198, 210, 144, 'atl-plasmaf') + tx(700, 214, 'current J', 'atl-t2', 'middle'));
      s += grp('force', ['\u2299', '\u2297'].map(function (m, i) { return tx(730, i ? 318 : 230, m, 'atl-tm', 'middle'); }).join('') + path('M730 250 L800 250', 'atl-force') + path('M730 290 L800 290', 'atl-force') + tx(812, 274, 'J \u00D7 B pushes plasma out', 'atl-t2', 'start'));
      s += grp('beam', path('M780 198 L1115 140 L1115 400 L780 342 Z', '', ' fill="url(#atlPlasmaG)"') + beamLines(790, 1115, 210, 330, 6, '', 'plasma'));
    } else if (k === 'vasimr') {
      s += P('pp2', 'xe', 3, [[354, 410], [430, 410], [430, cy], [460, cy]]) + P('pw2', 'elec', 2, [[350, 120], [520, 120], [520, 206]]) + P('pw3', 'elec', 2, [[350, 132], [680, 132], [680, 206]]);
      s += grp('tube', rect(460, 222, 420, 96, 'atl-case', ' rx="10"') + rect(470, 232, 400, 76, 'atl-plasmaf'));
      s += grp('helicon', coils(488, 552, 'HELICON \u2014 ionises the gas'));
      s += grp('icrh', coils(648, 712, 'ION-CYCLOTRON HEATING'));
      s += grp('magnets', [480, 560, 640, 720, 800].map(function (x) { return rect(x, 200, 30, 14, 'atl-magnet') + rect(x, 326, 30, 14, 'atl-magnet'); }).join('') + tx(660, 190, 'SUPERCONDUCTING MAGNETS', 'atl-t2', 'middle'));
      s += grp('mnozzle', [0, 1, 2, 3].map(function (i) { var o = 12 + i * 10; return path('M860 ' + (cy - o) + ' Q960 ' + (cy - o) + ' 1110 ' + (cy - o - 70 - i * 30), 'atl-field') + path('M860 ' + (cy + o) + ' Q960 ' + (cy + o) + ' 1110 ' + (cy + o + 70 + i * 30), 'atl-field'); }).join('') + tx(990, 150, 'MAGNETIC NOZZLE', 'atl-t2', 'middle'));
      s += grp('beam', path('M880 234 L1115 170 L1115 370 L880 306 Z', '', ' fill="url(#atlPlasmaG)"') + beamLines(884, 1115, 244, 296, 5, '', 'plasma'));
    } else if (k === 'ppt') {
      s += P('pw3', 'elec', 2, [[290, 149], [290, 430], [420, 430]]) + P('pw2', 'elec', 2, [[510, 420], [700, 420], [700, 334]]) + P('pw4', 'elec', 2, [[510, 440], [720, 440], [720, 150], [700, 150], [700, 206]], { nochev: true });
      s += grp('cap', rect(420, 400, 90, 60, 'atl-mach', ' rx="4"') + tx(465, 435, 'CAPACITOR', 'atl-t2 atl-tb', 'middle'));
      s += grp('rails', rect(600, 206, 200, 14, 'atl-anode') + rect(600, 320, 200, 14, 'atl-anode') + tx(700, 198, 'ELECTRODES', 'atl-t2', 'middle'));
      s += grp('teflon', rect(520, 222, 80, 96, 'atl-teflon', ' rx="3"') + path('M470 270 L520 270', 'atl-spring') + tx(560, 342, 'TEFLON BAR', 'atl-t2', 'middle') + tx(480, 256, 'spring', 'atl-t2', 'middle'));
      s += grp('spark', circ(606, 300, 5, 'atl-tapc') + tx(606, 356, 'SPARK PLUG', 'atl-t2', 'middle'));
      var pr2 = Math.max(0.3, Math.min(6, 1 / v.f));
      s += grp('sheet', '<g class="atl-sheet" style="animation-duration:' + pr2.toFixed(2) + 's">' + rect(604, 220, 8, 100, 'atl-arcsheet') + '</g>' + tx(700, 360, 'current sheet sweeps a puff of plasma out', 'atl-t2', 'middle'));
      s += grp('beam', '<g class="atl-pulse" style="animation-duration:' + pr2.toFixed(2) + 's">' + path('M800 220 L1115 160 L1115 380 L800 320 Z', '', ' fill="url(#atlPlasmaG)"') + '</g>');
    } else {
      s += P('pp2', 'xe', 3, [[354, 410], [600, 410], [600, 340]]) + P('pw2', 'elec', 2, [[350, 120], [700, 120], [700, 180]]);
      var em = '', jets = '';
      for (var n = 0; n < 7; n++) { var y = 196 + n * 24; em += path('M600 ' + (y - 7) + ' L636 ' + y + ' L600 ' + (y + 7) + ' Z', 'atl-emitter'); jets += '<line class="atl-spray" x1="640" x2="1110" y1="' + y + '" y2="' + (y + (y - cy) * 0.35).toFixed(0) + '" style="animation-delay:' + (-n * 0.17).toFixed(2) + 's"/>'; }
      s += grp('emitters', rect(560, 180, 40, 180, 'atl-case', ' rx="6"') + em + tx(596, 170, 'EMITTER TIPS', 'atl-t2', 'middle') + tx(560, 380, 'liquid wicks to each sharp tip', 'atl-t2', 'start'));
      s += grp('extractor', rect(680, 180, 10, 180, 'atl-anode') + tx(686, 170, 'EXTRACTOR', 'atl-t2', 'middle') + tx(700, 380, 'thousands of volts', 'atl-t2', 'start'));
      s += grp('beam', jets + tx(900, 150, 'IONS & NANO-DROPLETS', 'atl-t atl-tb', 'middle'));
    }
    return s;
  }
  function coils(x0, x1, label) { var s = ''; for (var x = x0; x <= x1; x += 8) s += '<ellipse cx="' + x + '" cy="' + CY + '" rx="4" ry="56" class="atl-coilr"/>'; return s + tx((x0 + x1) / 2, CY + 78, label, 'atl-t2', 'middle'); }

  /* ======================================================================
     NUCLEAR \u2014 thermal (solid & gas core), electric, pulse
     ====================================================================== */
  var H2 = { M: 2.016, g: 1.282, cp: 16300 };
  function gasCoreGas(T) { var ad = 1 / (1 + Math.exp(-(T - 3500) / 500)), ai = 1 / (1 + Math.exp(-(T - 12000) / 1500)); return { M: 2.016 / (1 + ad) / (1 + ai), g: 1.28 + 0.25 * ad, ad: ad, ai: ai, h: 16300 * T + ad * 216e6 + ai * 1.31e9 }; }
  function nucPerf(e, v) {
    var k = e.kind;
    if (k === 'ntr') { var p = rocket(H2.g, v.T, H2.M, v.pc, v.eps, 0, 0.98), md = v.P * 1e6 / (H2.cp * (v.T - 20)); return { p: p, isp: p.isp, md: md, F: p.isp * G0 * md }; }
    if (k === 'gascore') {
      var T = v.mode === 'closed' ? Math.min(v.T, 12000) : v.T, gg = gasCoreGas(T), pg = rocket(gg.g, T, gg.M, v.pc, v.eps, 0, 0.98), mdg = v.P * 1e9 / gg.h;
      return { p: pg, isp: pg.isp, md: mdg, F: pg.isp * G0 * mdg, gas: gg, Tuse: T, capped: v.mode === 'closed' && v.T > 12000 };
    }
    if (k === 'nep') {
      var eff = { te: 0.06, ti: 0.1, st: 0.25, br: 0.3 }[v.conv], Pe = v.P * 1e6 * eff, waste = v.P * 1e6 - Pe, Arad = waste / (2 * 0.85 * 5.67e-8 * Math.pow(v.Trad, 4));
      var ve = v.isp * G0, T2 = 2 * 0.65 * Pe / ve;
      return { Pe: Pe, waste: waste, Arad: Arad, eff: eff, T: T2, isp: v.isp, ve: ve, md: T2 / ve, acc: T2 / (v.mass * 1000), tdv: v.mass * 1000 * (1 - Math.exp(-10000 / ve)) / (T2 / ve) };
    }
    var E = v.Y * 4.184e12, vd = Math.sqrt(2 * 0.3 * E / v.mu), I = v.fc * v.mu * vd, dvp = I / (v.M * 1000);
    return { vd: vd, I: I, dvp: dvp, isp: v.fc * vd / G0, F: I / v.dt, acc: dvp / v.dt, E: E };
  }
  A.models.nuclear = {
    init: function (e) {
      if (e.kind === 'ntr') return { T: 2700, P: 1100, pc: 40, eps: 100 };
      if (e.kind === 'gascore') return { mode: 'closed', T: 10000, P: 4, pc: 400, eps: 100 };
      if (e.kind === 'nep') return { P: 2, conv: 'br', Trad: 800, isp: 5000, mass: 40 };
      return { Y: 0.14, mu: 140, dt: 1.1, M: 4000, fc: 0.5 };
    },
    controls: function (e) {
      var k = e.kind;
      if (k === 'ntr') return [rng('T', 'Hydrogen temperature leaving the core', 1500, 3200, { step: 10, fmt: function (x) { return nf(x, 0) + ' K'; }, why: { q: 'Why does this stop at 3,200 K?', a: 'The uranium fuel itself has to be hotter than the gas it heats. Carbide fuels start to soften and erode in hot hydrogen above roughly 3,000 K \u2014 the whole performance of a nuclear thermal rocket is capped by what its fuel can survive.' } }),
        rng('P', 'Reactor power', 50, 5000, { log: true, fmt: function (x) { return nf(x, 0) + ' MW'; } }), rng('pc', 'Chamber pressure', 10, 100, { step: 1, fmt: function (x) { return nf(x, 0) + ' bar'; } }), epsCtl(20, 300)];
      if (k === 'gascore') return [{ k: 'mode', type: 'choice', label: 'Design', options: [{ v: 'closed', label: 'Closed', sub: '\u201Cnuclear lightbulb\u201D' }, { v: 'open', label: 'Open cycle', sub: 'fuel in the flow' }] },
        rng('T', 'Propellant temperature', 3000, 25000, { log: true, fmt: function (x) { return nf(x, 0) + ' K'; } }), rng('P', 'Reactor power', 0.5, 20, { log: true, fmt: function (x) { return nf(x, 1) + ' GW'; } }), rng('pc', 'Chamber pressure', 100, 1000, { step: 10, fmt: function (x) { return nf(x, 0) + ' bar'; } }), epsCtl(20, 300)];
      if (k === 'nep') return [rng('P', 'Reactor heat output', 0.05, 20, { log: true, fmt: function (x) { return x < 1 ? nf(x * 1000, 0) + ' kW' : nf(x, 1) + ' MW'; } }),
        { k: 'conv', type: 'choice', label: 'Heat-to-electricity converter', options: [{ v: 'te', label: 'Thermoelectric', sub: '~6%, no moving parts' }, { v: 'ti', label: 'Thermionic', sub: '~10%' }, { v: 'st', label: 'Stirling', sub: '~25%' }, { v: 'br', label: 'Brayton turbine', sub: '~30%' }] },
        rng('Trad', 'Radiator temperature', 400, 1100, { step: 10, fmt: function (x) { return nf(x, 0) + ' K'; }, help: 'Hotter radiators shed heat much faster (\u221D T\u2074) and can be far smaller \u2014 but a hotter cold end means a less efficient converter in real life.' }),
        rng('isp', 'Thruster Isp', 2000, 9000, { step: 50, fmt: function (x) { return nf(x, 0) + ' s'; } }), rng('mass', 'Spacecraft mass', 5, 500, { log: true, fmt: function (x) { return nf(x, 0) + ' t'; } })];
      return [rng('Y', 'Yield per pulse unit', 0.01, 10, { log: true, fmt: function (x) { return x < 1 ? nf(x * 1000, 0) + ' t TNT' : nf(x, 1) + ' kt TNT'; } }), rng('mu', 'Propellant mass per pulse', 20, 1000, { log: true, fmt: function (x) { return nf(x, 0) + ' kg'; } }),
        rng('dt', 'Time between pulses', 0.3, 3, { step: 0.05, fmt: function (x) { return nf(x, 2) + ' s'; } }), rng('M', 'Ship mass', 100, 10000, { log: true, fmt: function (x) { return nf(x, 0) + ' t'; } }),
        rng('fc', 'Share of debris hitting the plate', 0.2, 0.85, { step: 0.01, fmt: function (x) { return nf(x * 100, 0) + '%'; } })];
    },
    compute: function (e, v) { return nucPerf(e, v); },
    stageStatic: function (e, v) { return L.defs() + nucStatic(e, v); },
    stageDynamic: function (e, v, r) { return nucDynamic(e, v, r); },
    stageNote: 'Schematic, not to scale.',
    outputs: function (e, v, r) {
      var k = e.kind;
      if (k === 'ntr') return { big: [big('Specific impulse', nf(r.isp, 0) + ' s', 'About twice the best chemical engine'), big('Thrust', fN(r.F), 'From ' + nf(v.P, 0) + ' MW of heat')],
        rows: [['Hydrogen flow', nf(r.md, 1) + ' kg/s'], ['Exhaust molar mass', '2.0 kg/kmol (pure H\u2082)'], ['Exit pressure', fp(r.p.Pe) + ' bar'], ['Thrust per megawatt', fN(r.F / v.P)]],
        badge: v.T > 3000 ? { k: 'edge', t: 'At the fuel\u2019s limit', x: 'Above about 3,000 K the carbide fuel elements erode in hot hydrogen. NERVA-era fuel ran at around 2,300\u20132,500 K for exactly this reason.' } : { k: 'vac', t: 'Why hydrogen?', x: 'There\u2019s no combustion, so you can pick the lightest possible exhaust: pure hydrogen, molar mass 2 against about 13 for a hydrogen\u2013oxygen flame. Exhaust speed goes as \u221A(T/M) \u2014 at similar temperatures that\u2019s roughly 2.5\u00D7 faster.' } };
      if (k === 'gascore') return { big: [big('Specific impulse', nf(r.isp, 0) + ' s', 'Theoretical'), big('Thrust', fN(r.F), 'From ' + nf(v.P, 1) + ' GW')],
        rows: [['Propellant temperature used', nf(r.Tuse, 0) + ' K'], ['Hydrogen split into atoms', nf(r.gas.ad * 100, 0) + '%'], ['Hydrogen ionised', nf(r.gas.ai * 100, 0) + '%'], ['Effective molar mass', nf(r.gas.M, 2) + ' kg/kmol'], ['Propellant flow', nf(r.md, 1) + ' kg/s']],
        badge: r.capped ? { k: 'edge', t: 'Capped at 12,000 K', x: 'In the closed design, the heat must shine through a fused-silica wall to reach the hydrogen. That wall \u2014 even cooled \u2014 limits how hot the propellant can get. The open cycle has no wall, but loses uranium out the nozzle.' } : (v.mode === 'open' ? { k: 'sep', t: 'Uranium in the exhaust', x: 'With no wall between fuel and propellant, some fissioning uranium inevitably leaves with the hydrogen \u2014 both a fuel loss and a radioactive exhaust.' } : { k: 'vac', t: 'Heat by light', x: 'The uranium plasma is so hot it glows mostly in the ultraviolet. The hydrogen is seeded with fine particles so it can absorb that light.' }) };
      if (k === 'nep') return { big: [big('Electric power', r.Pe < 1e6 ? nf(r.Pe / 1000, 0) + ' kW' : nf(r.Pe / 1e6, 2) + ' MW', nf(r.eff * 100, 0) + '% of the reactor\u2019s heat'), big('Thrust', fN(r.T), 'At ' + nf(v.isp, 0) + ' s')],
        rows: [['Waste heat to radiate', nf(r.waste / 1e6, 2) + ' MW'], ['Radiator area (both faces)', nf(r.Arad, 0) + ' m\u00B2'], ['Acceleration', nf(r.acc * 1000, 3) + ' mm/s\u00B2'], ['Time for \u0394v of 10 km/s', fDur(r.tdv)]],
        badge: { k: 'vac', t: 'Most of the heat is thrown away', x: 'Even the best converter turns only about a third of the reactor\u2019s heat into electricity. The rest must be radiated into space, and radiating is slow: ' + nf(r.Arad, 0) + ' m\u00B2 of radiator here. Radiators, not reactors, tend to dominate the spacecraft.' } };
      return { big: [big('Effective Isp', nf(r.isp, 0) + ' s', 'Debris at ' + nf(r.vd / 1000, 0) + ' km/s'), big('Average thrust', fN(r.F), nf(r.dvp, 1) + ' m/s per pulse')],
        rows: [['Energy per pulse', nf(r.E / 1e12, 2) + ' TJ'], ['Momentum per pulse', nf(r.I / 1e6, 2) + ' MN\u00B7s'], ['Average acceleration', nf(r.acc / G0, 2) + ' g'], ['Pulses for 10 km/s', nf(10000 / r.dvp, 0)]],
        badge: { k: 'edge', t: 'Banned by treaty', x: 'The 1963 Partial Test Ban Treaty outlawed nuclear explosions in the atmosphere and in space, which ended Project Orion. The physics still stands: this is the only design here that combines high thrust with Isp in the thousands.' } };
    },
    chart: function (e, v, r) {
      var k = e.kind;
      if (k === 'ntr' || k === 'gascore') {
        var pts = [], lox = [], T0 = k === 'ntr' ? 1500 : 3000, T1 = k === 'ntr' ? 3200 : 25000;
        for (var T = T0; T <= T1; T *= 1.04) {
          var gm = k === 'ntr' ? { M: 2.016, g: 1.282 } : gasCoreGas(T);
          pts.push([T, rocket(gm.g, T, gm.M, v.pc, v.eps, 0, 0.98).isp]);
        }
        var ch = L.lineChart({ aria: 'Isp against propellant temperature', axes: { x: [T0, T1], y: [300, Math.max(1200, pts[pts.length - 1][1] * 1.1)], xlog: k === 'gascore', xt: k === 'ntr' ? [1500, 2000, 2500, 3000] : [3000, 5000, 10000, 20000], yt: k === 'ntr' ? [400, 600, 800, 1000] : [500, 1000, 2000, 3000, 4000], xl: 'Propellant temperature (K)', yl: 'Isp (s)', xf: function (t) { return nf(t, 0); }, yf: function (t) { return nf(t, 0); } },
          series: [{ pts: [[T0, 452], [T1, 452]], cls: 'atl-lref' }, { pts: pts, cls: 'atl-lp' }], marks: [{ x: k === 'gascore' ? r.Tuse : v.T, y: r.isp, cls: 'atl-ring', r: 8 }] });
        return { title: 'Hotter hydrogen, faster exhaust', svg: ch.svg, note: 'The dotted line is the RS-25, the best chemical engine in the atlas (452 s). ' + (k === 'ntr' ? 'A solid-core reactor roughly doubles it \u2014 limited only by what the fuel survives.' : 'Past about 3,500 K the hydrogen molecules split into atoms, halving the molar mass: the curve steepens even as the splitting soaks up energy.') };
      }
      if (k === 'nep') {
        var ap = [];
        for (var Tr = 400; Tr <= 1100; Tr += 25) ap.push([Tr, r.waste / (2 * 0.85 * 5.67e-8 * Math.pow(Tr, 4))]);
        var c2 = L.lineChart({ aria: 'Radiator area against radiator temperature', axes: { x: [400, 1100], y: [Math.max(1, ap[ap.length - 1][1] * 0.8), ap[0][1] * 1.2], ylog: true, xt: [400, 600, 800, 1000], yt: decades(Math.max(1, ap[ap.length - 1][1] * 0.8), ap[0][1] * 1.2), xl: 'Radiator temperature (K)', yl: 'Radiator area (m\u00B2, log)', xf: function (t) { return nf(t, 0); }, yf: function (t) { return nf(t, 0); } },
          series: [{ pts: ap, cls: 'atl-lp' }], marks: [{ x: v.Trad, y: r.Arad, cls: 'atl-ring', r: 8 }] });
        return { title: 'Radiator size: the fourth-power law', svg: c2.svg, note: 'A surface radiates heat in proportion to its temperature to the fourth power (Stefan\u2013Boltzmann). Halve the radiator temperature and you need sixteen times the area.' };
      }
      var st = [], vcur = 0;
      for (var i = 0; i < 16; i++) { st.push([i * v.dt, vcur]); vcur += r.dvp; st.push([i * v.dt, vcur]); }
      var c3 = L.lineChart({ aria: 'Ship speed over the first pulses', axes: { x: [0, 15 * v.dt], y: [0, vcur * 1.05], xt: ticks(0, 15 * v.dt, 5), yt: ticks(0, vcur * 1.05, 4), xl: 'Time (s)', yl: 'Ship speed gained (m/s)', xf: function (t) { return nf(t, 0) + ' s'; }, yf: function (t) { return nf(t, 0); } }, series: [{ pts: st, cls: 'atl-lp' }] });
      return { title: 'Speed gained, one bang at a time', svg: c3.svg, note: 'Each pulse kicks the ship forward by ' + nf(r.dvp, 1) + ' m/s. Giant shock absorbers between the plate and the ship smooth those kicks into a steady push the crew can survive.' };
    },
    eq: function (e, v, r) {
      var k = e.kind;
      if (k === 'ntr') return eqWrap([eqLi('Nozzle physics with pure hydrogen', 'I<sub>sp</sub> = c* \u00B7 C<sub>F</sub>/g\u2080 with M = 2.016, \u03B3 = 1.282, T = ' + nf(v.T, 0) + ' K \u2192 ' + nf(r.isp, 0) + ' s', '\u03B3 is fitted so the model reproduces NERVA XE (841 s).'),
        eqLi('Flow from reactor power', '\u1E41 = P / (c<sub>p</sub> \u00B7 \u0394T) = ' + nf(v.P, 0) + ' MW / (16.3 kJ/kg\u00B7K \u00D7 ' + nf(v.T - 20, 0) + ' K) = ' + nf(r.md, 1) + ' kg/s', 'Every watt of fission heat goes into warming hydrogen from 20 K. This reproduces NERVA\u2019s thrust to within about 4%.'), eqLi('Thrust', 'F = I<sub>sp</sub> \u00B7 g\u2080 \u00B7 \u1E41 = ' + fN(r.F))]);
      if (k === 'gascore') return eqWrap([eqLi('Hydrogen that falls apart', 'M = 2.016 / (1 + \u03B1<sub>dissoc</sub>) / (1 + \u03B1<sub>ion</sub>) = ' + nf(r.gas.M, 2), 'Above ~3,500 K molecules split into atoms (\u03B1 = ' + nf(r.gas.ad, 2) + '); above ~12,000 K atoms ionise (\u03B1 = ' + nf(r.gas.ai, 2) + ').'),
        eqLi('Energy per kilogram', 'h = c<sub>p</sub>T + \u03B1<sub>d</sub> \u00B7 216 MJ/kg + \u03B1<sub>i</sub> \u00B7 1.31 GJ/kg', 'Splitting and ionising hydrogen soaks up enormous energy that\u2019s mostly never recovered in the nozzle \u2014 the model keeps it in the power budget but doesn\u2019t credit it to thrust.'),
        eqLi('Isp and thrust', 'I<sub>sp</sub> = ' + nf(r.isp, 0) + ' s,  \u1E41 = P/h = ' + nf(r.md, 1) + ' kg/s,  F = ' + fN(r.F))], '<b>What\u2019s simplified.</b> An idealised thermal model; real gas-core designs remain paper studies with large uncertainties.');
      if (k === 'nep') return eqWrap([eqLi('Electricity from heat', 'P<sub>e</sub> = \u03B7<sub>conv</sub> \u00B7 P<sub>th</sub> = ' + nf(r.eff, 2) + ' \u00D7 ' + nf(v.P, 2) + ' MW = ' + nf(r.Pe / 1e6, 3) + ' MW'),
        eqLi('Radiator area (Stefan\u2013Boltzmann)', 'A = P<sub>waste</sub> / (2 \u00B7 \u03B5 \u00B7 \u03C3 \u00B7 T\u2074) = ' + nf(r.waste / 1e6, 2) + ' MW / (2 \u00D7 0.85 \u00D7 5.67\u00D710\u207B\u2078 \u00D7 ' + nf(v.Trad, 0) + '\u2074) = ' + nf(r.Arad, 0) + ' m\u00B2'),
        eqLi('Thrust from electric thrusters', 'F = 2 \u00B7 0.65 \u00B7 P<sub>e</sub> / v<sub>e</sub> = ' + fN(r.T))]);
      return eqWrap([eqLi('Debris speed from yield', 'v = \u221A(2 \u00B7 0.3 \u00B7 E / m) = \u221A(2 \u00D7 0.3 \u00D7 ' + nf(r.E / 1e12, 2) + '\u00D710\u00B9\u00B2 J / ' + nf(v.mu, 0) + ' kg) = ' + nf(r.vd / 1000, 0) + ' km/s', 'About 30% of the bomb\u2019s energy is assumed to end up as kinetic energy of the propellant slab.'),
        eqLi('Momentum delivered', 'I = f \u00B7 m \u00B7 v = ' + nf(v.fc, 2) + ' \u00D7 ' + nf(v.mu, 0) + ' \u00D7 ' + nf(r.vd, 0) + ' = ' + nf(r.I / 1e6, 2) + ' MN\u00B7s'), eqLi('Speed gained per pulse', '\u0394v = I / M<sub>ship</sub> = ' + nf(r.dvp, 2) + ' m/s,  effective I<sub>sp</sub> = f \u00B7 v / g\u2080 = ' + nf(r.isp, 0) + ' s')], '<b>What\u2019s simplified.</b> Illustrative physics in the spirit of the 1958\u201365 Orion studies.');
    },
    preset: function (e, x) { return x.set ? { v: Object.assign({}, x.set) } : null; },
    vs: function (e, v, r, x) { return x.pub ? pubVs(x, x.pub.label, x.pub.key === 'isp' ? r.isp : r.F / 1000, x.pub.val, x.pub.unit, x.pub.note) : null; },
    mapPoint: function (e, v, r) { if (e.kind === 'nep') return { F: r.T, isp: r.isp }; return { F: r.F, isp: r.isp }; }
  };
  function nucStatic(e, v) {
    var k = e.kind, s = '', cy = CY;
    if (k === 'ntr') {
      s += part({ id: 'shaft', type: 'shaft', segs: [[250, 190, 330]] });
      s += P('p-in', 'fuel', 5, [[164, 190], [224, 190]]) + P('p-hi', 'fuel', 5, [[276, 190], [440, 190], [440, 250], [470, 250]]) + P('p-bleed', 'hotf', 3, [[720, 330], [720, 400], [290, 400], [290, 355]], { nochev: false }) + P('p-tdump', 'hotf', 3, [[224, 330], [180, 330], [180, 470]]);
      s += part({ id: 'tank', type: 'tank', side: 'fuel', x: 24, y: 80, w: 140, h: 360, name: 'HYDROGEN', sub: 'LH\u2082 \u00B7 20 K', fill: 0.75 });
      s += part({ id: 'pump', type: 'pump', x: 250, y: 190, r: 26, label: 'PUMP', lx: 250, ly: 150, la: 'middle' }) + part({ id: 'turb', type: 'turbine', x: 250, y: 330, r: 26, label: 'TURBINE', lx: 250, ly: 372, la: 'middle' });
      s += grp('shield', rect(454, 196, 16, 148, 'atl-shield') + tx(462, 186, 'SHIELD', 'atl-t2', 'middle'));
    } else if (k === 'gascore') {
      s += part({ id: 'tank', type: 'tank', side: 'fuel', x: 24, y: 100, w: 140, h: 340, name: 'HYDROGEN', sub: 'seeded with particles', fill: 0.75 });
      s += P('p-in', 'fuel', 5, [[164, cy], [300, cy], [300, 150], [520, 150], [520, 178]]) + P('p-in2', 'fuel', 5, [[300, cy], [300, 390], [520, 390], [520, 362]]);
      s += grp('vessel', circ(560, cy, 150, 'atl-case') + tx(560, 106, 'PRESSURE VESSEL \u00B7 ~400 bar', 'atl-t2', 'middle'));
    } else if (k === 'nep') {
      s += grp('reactor', rect(40, 230, 90, 80, 'atl-rcore', ' rx="10"') + tx(85, 330, 'REACTOR', 'atl-t2 atl-tb', 'middle'));
      s += grp('shield', path('M130 222 L180 200 L180 340 L130 318 Z', 'atl-shield') + tx(155, 360, 'SHADOW SHIELD', 'atl-t2', 'middle'));
      s += grp('boom', rect(180, 266, 760, 8, 'atl-boom'));
      s += part({ id: 'conv', type: 'box', x: 250, y: 230, w: 110, h: 60, label: 'CONVERTER', label2: 'heat \u2192 electricity', fl: 'elec' });
      s += P('p-hot', 'hotf', 4, [[130, 250], [195, 250]]) + P('p-cold', 'vap', 4, [[305, 300], [305, 320], [110, 320], [110, 310]]) + P('pw', 'elec', 2, [[305, 200], [305, 160], [860, 160], [860, 220]]);
      s += part({ id: 'ppu', type: 'box', x: 860, y: 240, w: 90, h: 40, label: 'POWER UNIT', fl: 'elec' });
    } else {
      s += grp('ship', rect(40, 200, 360, 140, 'atl-case', ' rx="16"') + tx(220, 196, 'CREW & CARGO', 'atl-t2', 'middle') + tx(220, 276, 'SHIP', 'atl-t atl-tb', 'middle'));
      s += grp('magazine', rect(400, 230, 140, 80, 'atl-mach', ' rx="6"') + [0, 1, 2, 3, 4, 5].map(function (i) { return circ(420 + i * 20, 270, 7, 'atl-pu2'); }).join('') + tx(470, 222, 'PULSE-UNIT MAGAZINE', 'atl-t2', 'middle'));
    }
    return s;
  }
  function nucDynamic(e, v, r) {
    var k = e.kind, s = '', cy = CY;
    if (k === 'ntr') {
      var ch = '';
      for (var i = 0; i < 9; i++) ch += '<line class="atl-fuelel" x1="480" x2="690" y1="' + (206 + i * 16) + '" y2="' + (206 + i * 16) + '"/>';
      s += grp('core', rect(470, 196, 230, 148, 'atl-rcore', ' rx="10"') + ch + tx(585, 186, 'REACTOR CORE \u00B7 ' + nf(v.P, 0) + ' MW', 'atl-t atl-tb', 'middle') + tx(585, 362, 'hydrogen flows through channels in the uranium fuel', 'atl-t2', 'middle'));
      s += grp('drums', [0, 1, 2, 3].map(function (i) { return '<g class="atl-rot" style="animation-duration:12s">' + circ(505 + i * 55, 196, 14, 'atl-drum') + '<path class="atl-drumw" d="M' + (505 + i * 55) + ' 196 m-14 0 a14 14 0 0 1 28 0 z"/></g>'; }).join('') + tx(700, 178, 'CONTROL DRUMS', 'atl-t2', 'start'));
      s += grp('plenum', path('M700 206 L740 206 L780 244 M700 334 L740 334 L780 296', 'atl-wall') + '<ellipse cx="740" cy="' + cy + '" rx="30" ry="40" class="atl-fire atl-h2glow"/>');
      s += L.nozzleSVG(r.p, { maxRe: 150, maxL: 180, plumeOpacity: 0.55 }).svg;
    } else if (k === 'gascore') {
      var T = r.Tuse, glow = Math.min(1, (T - 3000) / 15000);
      s += grp('plasma', '<circle cx="560" cy="' + cy + '" r="' + (46 + 20 * glow).toFixed(0) + '" class="atl-uplasma"/>' + tx(560, cy + 4, 'URANIUM PLASMA', 'atl-t atl-tb', 'middle') + tx(560, cy + 20, '~' + nf(T * 2, 0) + ' K', 'atl-t2', 'middle'));
      if (v.mode === 'closed') s += grp('bulb', circ(560, cy, 88, 'atl-bulb') + tx(660, cy - 96, 'FUSED-SILICA \u201CLIGHTBULB\u201D', 'atl-t2', 'start'));
      else s += grp('bulb', [0, 1, 2, 3, 4, 5].map(function (i) { return circ(640 + i * 40, cy + (i % 2 ? 8 : -8), 3, 'atl-uleak'); }).join('') + tx(660, cy - 70, 'uranium escaping with the flow', 'atl-t2 atl-warn', 'start'));
      s += grp('swirl', '<g class="atl-rot" style="animation-duration:4s">' + circ(560, cy, 124, 'atl-swirl') + '</g>' + tx(560, cy + 140, 'hydrogen swirls in from the walls', 'atl-t2', 'middle'));
      var p = Object.assign({}, r.p);
      s += grp('throat', path('M690 200 L760 244 M690 340 L760 296', 'atl-wall')) + L.nozzleSVG(p, { xt: 760, rt: 26, maxRe: 150, maxL: 180, plumeOpacity: 0.8 }).svg;
    } else if (k === 'nep') {
      var nPanels = Math.max(1, Math.min(9, Math.round(Math.sqrt(r.Arad / 50)))), pw = 60, ph = Math.max(30, Math.min(200, 30 + r.Arad / 200));
      var rad = '';
      for (var j = 0; j < nPanels; j++) { var x = 400 + j * (pw + 8); rad += rect(x, 266 - ph, pw, ph, 'atl-rad') + rect(x, 274, pw, ph, 'atl-rad'); }
      s += grp('radiators', rad + tx(400 + nPanels * (pw + 8) / 2, 266 - ph - 10, 'RADIATORS \u00B7 ' + nf(r.Arad, 0) + ' m\u00B2', 'atl-t atl-tb', 'middle'));
      s += P('p-rad', 'vap', 3, [[305, 200], [380, 200], [380, 260]], { nochev: true });
      s += grp('thrusters', [230, 270, 310].map(function (y) { return rect(900, y - 12, 40, 24, 'atl-mach', ' rx="4"'); }).join('') + tx(920, 216, 'ION THRUSTERS', 'atl-t2', 'middle'));
      s += grp('beam', path('M940 218 L1115 170 L1115 370 L940 322 Z', '', ' fill="url(#atlBeamG)"') + beamLines(944, 1115, 226, 314, 5, '', 'ion'));
    } else {
      var boom = Math.max(0.15, Math.min(1, r.dvp / 15)), plate = 700;
      s += grp('absorbers', [0, 1, 2].map(function (i) { return path('M540 ' + (240 + i * 30) + ' l20 -8 l20 16 l20 -16 l20 16 l20 -16 l20 16 l20 -16 l20 16 l20 -8', 'atl-spring atl-pushm'); }).join('') + tx(620, 222, 'SHOCK ABSORBERS', 'atl-t2', 'middle'));
      s += grp('plate', '<g class="atl-pushm">' + rect(plate, 150, 22, 240, 'atl-pusher', ' rx="6"') + '</g>' + tx(711, 140, 'PUSHER PLATE', 'atl-t2', 'middle'));
      s += grp('pulse', circ(900, cy, 26 + 60 * boom, 'atl-flash') + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { var a = (i / 8) * Math.PI * 2; return path('M' + (900 + Math.cos(a) * 30) + ' ' + (cy + Math.sin(a) * 30) + ' L' + (900 + Math.cos(a) * (70 + 60 * boom)) + ' ' + (cy + Math.sin(a) * (70 + 60 * boom)), 'atl-debris'); }).join('') +
        tx(900, cy + 150, 'PULSE UNIT DETONATES ~' + nf(Math.max(30, 60 * Math.sqrt(v.Y) * 10), 0) + ' m BEHIND', 'atl-t2', 'middle'));
    }
    return s;
  }

  /* ======================================================================
     AIR-BREATHING & FRONTIER
     ====================================================================== */
  function atm(h) { var T = h <= 11 ? 288.15 - 6.5 * h : (h <= 20 ? 216.65 : (h <= 32 ? 216.65 + (h - 20) : 228.65 + 2.8 * (h - 32))); var p = 101325 * Math.exp(-h / 7.2); return { T: T, p: p, rho: p / (287 * T), a: Math.sqrt(1.4 * 287 * T) }; }
  var FUELS = { hc: { name: 'Hydrocarbon', h: 43e6, fst: 0.068 }, h2: { name: 'Hydrogen', h: 120e6, fst: 0.0292 } };
  function breather(M, h, Mb, Tlim, fuel, A, eke) {
    var at = atm(h), cp = 1004, T0 = at.T, v0 = M * at.a, tr = 1 + 0.2 * M * M, Tt0 = T0 * tr, fu = FUELS[fuel];
    var Tt4max = Tlim * (1 + 0.2 * Mb * Mb), Tt4 = Math.min(Tt4max, Tt0 + fu.fst * fu.h / cp), f = Math.max(0, cp * (Tt4 - Tt0) / fu.h);
    var ve = Tt4 > Tt0 ? Math.sqrt(eke * 2 * cp * Tt4 * (1 - 1 / tr)) : v0, Fs = (1 + f) * ve - v0, isp = f > 0 ? Fs / (f * G0) : 0, md = at.rho * v0 * A;
    return { at: at, v0: v0, Tt0: Tt0, Tt4: Tt4, f: f, ve: ve, Fs: Fs, isp: Math.max(0, isp), F: Fs * md, md: md, phi: f / fu.fst, limited: Tt4 >= Tt4max - 1, dead: Tt0 >= Tt4max * 0.97 };
  }
  function sabre(M) {
    var h = Math.min(28, 2 + 4.8 * M), at = atm(h), v0 = M * at.a, Tt0 = at.T * (1 + 0.2 * M * M);
    if (M >= 5.4) return { mode: 'rocket', isp: 450, h: h, Tt0: Tt0, phi: 0, q: 0, v0: v0 };
    var q = 1004 * Math.max(0, Tt0 - 150), h2need = q / 12.6e6, phi = Math.max(1, h2need / 0.0292), f = phi * 0.0292;
    var tau = Math.pow(140e5 / at.p, 0.2857), ve = Math.sqrt(0.9 * 2 * 1004 * 2600 * (1 - 1 / tau)), Fs = (1 + f) * ve - v0;
    return { mode: 'air', isp: Math.max(0, Fs / (f * G0)), h: h, Tt0: Tt0, phi: phi, q: q, v0: v0, f: f };
  }
  var SUN = 1361, CL = 2.998e8;
  A.models.frontier = {
    init: function (e) {
      var k = e.kind;
      if (k === 'ramjet') return { M: 3, h: 20, fuel: 'hc', Tlim: 2400, A: 0.5 };
      if (k === 'scramjet') return { M: 7, h: 30, fuel: 'h2', Tlim: 2600, Mb: 2.5, A: 0.5 };
      if (k === 'sabre') return { M: 3 };
      if (k === 'rde') return { prop: 'ch4', pc: 20, pg: 1.15, D: 20, eps: 10, alt: 0 };
      if (k === 'solarth') return { r: 1, D: 15, T: 2500, pc: 3, eps: 200 };
      if (k === 'sail') return { side: 14, mass: 310, r: 1, th: 0, refl: 0.9 };
      return { P: 100, isp: 50000, eta: 0.5, mass: 50 };
    },
    controls: function (e) {
      var k = e.kind;
      if (k === 'ramjet' || k === 'scramjet') {
        var c = [rng('M', 'Flight Mach number', k === 'ramjet' ? 1.5 : 3, 15, { step: 0.1, play: 'Accelerate', playMs: 9000, keepPreset: true, fmt: function (x) { return 'Mach ' + nf(x, 1); } }),
          rng('h', 'Altitude', 10, 40, { step: 1, fmt: function (x) { return nf(x, 0) + ' km'; } }),
          { k: 'fuel', type: 'choice', label: 'Fuel', options: [{ v: 'hc', label: 'Hydrocarbon', sub: 'JP-7 \u00B7 43 MJ/kg' }, { v: 'h2', label: 'Hydrogen', sub: '120 MJ/kg' }] },
          rng('Tlim', 'Combustor temperature limit', 2000, 3000, { step: 10, fmt: function (x) { return nf(x, 0) + ' K'; }, help: 'Set by the walls \u2014 and by chemistry: above ~2,500 K the combustion products start to fall apart and stop releasing heat.' })];
        if (k === 'scramjet') c.push(rng('Mb', 'Airflow speed in the combustor', 1.2, 3.5, { step: 0.1, fmt: function (x) { return 'Mach ' + nf(x, 1); }, help: 'Keeping the flow supersonic keeps it cooler \u2014 which leaves room to add heat. That\u2019s the whole point of a scramjet.' }));
        c.push(rng('A', 'Intake capture area', 0.05, 3, { log: true, fmt: function (x) { return nf(x, 2) + ' m\u00B2'; } }));
        return c;
      }
      if (k === 'sabre') return [rng('M', 'Flight Mach number', 0.5, 8, { step: 0.05, play: 'Fly to orbit', playMs: 10000, fmt: function (x) { return 'Mach ' + nf(x, 2); } })];
      if (k === 'rde') return [{ k: 'prop', type: 'choice', label: 'Propellants', options: NPROPS },
        rng('pc', 'Injection pressure', 5, 60, { step: 0.5, fmt: function (x) { return nf(x, 1) + ' bar'; } }),
        rng('pg', 'Pressure gain from detonation', 1, 1.3, { step: 0.01, fmt: function (x) { return '\u00D7' + nf(x, 2); }, help: 'Illustrative. A detonation compresses as it burns, so the gas ends up at higher pressure than it was injected at \u2014 something ordinary burning can never do. How much gain real engines achieve is still being measured.' }),
        rng('D', 'Annulus diameter', 5, 60, { step: 1, fmt: function (x) { return nf(x, 0) + ' cm'; } }), epsCtl(3, 60), altCtl()];
      if (k === 'solarth') return [rng('r', 'Distance from the Sun', 0.3, 5, { log: true, fmt: function (x) { return nf(x, 2) + ' AU'; }, help: '1 AU is Earth\u2019s distance. Sunlight falls off as 1/distance\u00B2.' }),
        rng('D', 'Mirror diameter', 1, 40, { log: true, fmt: function (x) { return nf(x, 1) + ' m'; } }), rng('T', 'Absorber temperature', 1500, 3000, { step: 10, fmt: function (x) { return nf(x, 0) + ' K'; } }),
        rng('pc', 'Chamber pressure', 1, 20, { step: 0.5, fmt: function (x) { return nf(x, 1) + ' bar'; } }), epsCtl(20, 300)];
      if (k === 'sail') return [rng('side', 'Sail size (side of square)', 3, 200, { log: true, fmt: function (x) { return nf(x, 1) + ' m \u00B7 ' + nf(x * x, 0) + ' m\u00B2'; } }),
        rng('mass', 'Total mass', 1, 1000, { log: true, fmt: function (x) { return nf(x, x < 10 ? 1 : 0) + ' kg'; } }), rng('r', 'Distance from the Sun', 0.2, 5, { log: true, keepPreset: true, fmt: function (x) { return nf(x, 2) + ' AU'; } }),
        rng('th', 'Sail tilt to the sunlight', 0, 75, { step: 1, keepPreset: true, fmt: function (x) { return nf(x, 0) + '\u00B0'; }, help: 'Tilting the sail lets you push sideways and steer \u2014 speed up along your orbit or slow down \u2014 at the cost of total push.' }),
        rng('refl', 'Reflectivity', 0.6, 0.95, { step: 0.01, fmt: function (x) { return nf(x * 100, 0) + '%'; } })];
      return [rng('P', 'Fusion power', 1, 100000, { log: true, fmt: function (x) { return x < 1000 ? nf(x, 0) + ' MW' : nf(x / 1000, 1) + ' GW'; } }),
        rng('isp', 'Specific impulse', 5000, 1000000, { log: true, fmt: function (x) { return nf(x, 0) + ' s'; }, help: 'Add extra propellant to the fusion exhaust for more thrust and lower Isp, or run it pure for enormous exhaust speed.' }),
        rng('eta', 'Share of fusion power in the jet', 0.1, 0.9, { step: 0.01, fmt: function (x) { return nf(x * 100, 0) + '%'; } }), rng('mass', 'Spacecraft mass', 1, 10000, { log: true, fmt: function (x) { return nf(x, 0) + ' t'; } })];
    },
    compute: function (e, v) {
      var k = e.kind;
      if (k === 'ramjet' || k === 'scramjet') {
        var r = breather(v.M, v.h, k === 'ramjet' ? 0.3 : v.Mb, v.Tlim, v.fuel, v.A, k === 'ramjet' ? 0.9 : 0.82);
        r.curveR = []; r.curveS = [];
        for (var M = 1; M <= 15; M += 0.25) { r.curveR.push([M, breather(M, v.h, 0.3, v.Tlim, v.fuel, 1, 0.9).isp]); r.curveS.push([M, breather(M, v.h, k === 'scramjet' ? v.Mb : 2.5, v.Tlim, v.fuel, 1, 0.82).isp]); }
        return r;
      }
      if (k === 'sabre') { var s = sabre(v.M); s.curve = []; for (var m = 0.5; m <= 8; m += 0.1) s.curve.push([m, sabre(m).isp]); return s; }
      if (k === 'rde') {
        var Pr = A.props[v.prop], tm = L.interp(Pr.tab, Pr.ofNom), pa = ambient(v.alt), pd = rocket(Pr.g, tm[0], tm[1], v.pc * v.pg, v.eps, pa), pn = rocket(Pr.g, tm[0], tm[1], v.pc, v.eps, pa);
        var vdet = { lh2: 2840, ch4: 2390, rp1: 2300 }[v.prop], waves = v.D < 15 ? 1 : (v.D < 35 ? 2 : 3), freq = waves * vdet / (Math.PI * v.D / 100);
        return { p: pd, pn: pn, isp: pd.isp, gain: pd.isp - pn.isp, vdet: vdet, waves: waves, freq: freq };
      }
      if (k === 'solarth') {
        var Psun = SUN / (v.r * v.r) * Math.PI * v.D * v.D / 4 * 0.8 * 0.7, pp = rocket(H2.g, v.T, H2.M, v.pc, v.eps, 0, 0.98), md = Psun / (H2.cp * (v.T - 20));
        return { p: pp, isp: pp.isp, P: Psun, md: md, F: pp.isp * G0 * md };
      }
      if (k === 'sail') {
        var S = SUN / (v.r * v.r), Ar = v.side * v.side, cth = Math.cos(v.th * Math.PI / 180), Fn = S / CL * Ar * (1 + v.refl) * cth * cth, acc = Fn / v.mass;
        return { S: S, A: Ar, F: Fn, acc: acc, dvday: acc * 86400, t1k: 1000 / acc, ac1: SUN / CL * Ar * (1 + v.refl) / v.mass };
      }
      var ve = v.isp * G0, T = 2 * v.eta * v.P * 1e6 / ve;
      return { T: T, isp: v.isp, ve: ve, acc: T / (v.mass * 1000), md: T / ve };
    },
    stageStatic: function (e, v) { return L.defs() + frontStatic(e, v); },
    stageDynamic: function (e, v, r) { return frontDynamic(e, v, r); },
    stageNote: 'Schematic, not to scale.',
    outputs: function (e, v, r) {
      var k = e.kind;
      if (k === 'ramjet' || k === 'scramjet') {
        var badge = r.dead ? { k: 'sep', t: 'No room to add heat', x: 'Just slowing the air down heats it to ' + nf(r.Tt0, 0) + ' K \u2014 already at the combustor\u2019s limit. Burn fuel now and the gas only falls apart. ' + (k === 'ramjet' ? 'This is where ramjets die, around Mach 6. A scramjet keeps the air supersonic, and so cooler, to get past it.' : 'Even supersonic combustion has a ceiling.') }
          : (v.M < 2.5 && k === 'ramjet' ? { k: 'over', t: 'Too slow to compress well', x: 'At low Mach numbers the ram effect barely squeezes the air, so the cycle is inefficient \u2014 and at a standstill a ramjet makes no thrust at all. Something else has to get it up to speed first.' }
            : { k: 'ideal', t: 'Breathing air', x: 'Every kilogram of oxygen comes free from the atmosphere, so Isp \u2014 counted per kilogram of fuel carried \u2014 reaches thousands of seconds. The air arrives at ' + nf(r.Tt0, 0) + ' K just from being slowed down.' });
        return { big: [big('Specific impulse', nf(r.isp, 0) + ' s', 'Counting only the fuel carried'), big('Thrust', fN(Math.max(0, r.F)), 'From ' + nf(v.A, 2) + ' m\u00B2 of intake')],
          rows: [['Flight speed', nf(r.v0, 0) + ' m/s'], ['Air temperature after slowing down', nf(r.Tt0, 0) + ' K'], ['Gas temperature after burning', nf(r.Tt4, 0) + ' K (stagnation)'], ['Fuel\u2013air ratio', nf(r.f, 4) + ' (' + nf(r.phi * 100, 0) + '% of stoichiometric)'], ['Air swallowed', nf(r.md, 1) + ' kg/s'], ['Thrust per kg/s of air', nf(r.Fs, 0) + ' N']], badge: badge };
      }
      if (k === 'sabre') return { big: [big('Specific impulse', nf(r.isp, 0) + ' s', r.mode === 'air' ? 'Air-breathing mode' : 'Rocket mode'), big('Mode', r.mode === 'air' ? 'Breathing air' : 'Pure rocket', 'Switches at Mach 5.4')],
        rows: [['Altitude on this climb', nf(r.h, 0) + ' km'], ['Air temperature at the intake', nf(r.Tt0, 0) + ' K'], ['Heat the precooler must remove', r.mode === 'air' ? nf(r.q / 1000, 0) + ' kJ per kg of air' : '\u2014'], ['Hydrogen flow vs what burning needs', r.mode === 'air' ? nf(r.phi, 2) + '\u00D7' : '\u2014']],
        badge: r.mode === 'rocket' ? { k: 'vac', t: 'Rocket mode', x: 'Above Mach 5.4 and ~28 km, the intake closes and the same combustion chambers run on liquid oxygen from onboard tanks.' } : (r.phi > 1.5 ? { k: 'edge', t: 'Burning hydrogen just to cool the air', x: 'The precooler needs more cold hydrogen than the engine can burn: ' + nf(r.phi, 1) + '\u00D7 the stoichiometric amount. The excess is wasted, so Isp is falling fast. This is why the engine switches to rocket mode.' } : { k: 'ideal', t: 'Precooled air-breathing', x: 'The precooler chills incoming air from ' + nf(r.Tt0, 0) + ' K to about 150 K in a fraction of a second, so an ordinary turbine compressor can squeeze it to rocket-chamber pressure.' }) };
      if (k === 'rde') return { big: [big('Specific impulse', nf(r.isp, 0) + ' s', (r.gain >= 0 ? '+' : '') + nf(r.gain, 1) + ' s over ordinary burning'), big('Wave frequency', nf(r.freq / 1000, 1) + ' kHz', r.waves + ' wave' + (r.waves > 1 ? 's' : '') + ' at ' + nf(r.vdet, 0) + ' m/s')],
        rows: [['Effective chamber pressure', nf(v.pc * v.pg, 1) + ' bar'], ['Detonation speed', nf(r.vdet, 0) + ' m/s (Chapman\u2013Jouguet)'], ['Laps per second', nf(r.freq, 0)]], badge: L.expansion(r.p) };
      if (k === 'solarth') return { big: [big('Specific impulse', nf(r.isp, 0) + ' s', 'Pure hydrogen, heated by sunlight'), big('Thrust', fN(r.F), 'From ' + (r.P < 1e6 ? nf(r.P / 1000, 0) + ' kW' : nf(r.P / 1e6, 2) + ' MW') + ' of sunlight absorbed')],
        rows: [['Sunlight at this distance', nf(SUN / (v.r * v.r), 0) + ' W/m\u00B2'], ['Hydrogen flow', r.md < 0.01 ? nf(r.md * 1e6, 0) + ' mg/s' : nf(r.md * 1000, 1) + ' g/s']], badge: { k: 'vac', t: 'Chemical-free heat', x: 'No combustion, so like a nuclear thermal rocket the exhaust can be pure hydrogen \u2014 about twice the Isp of the best chemical engine \u2014 but with far less power, and only while in sunlight.' } };
      if (k === 'sail') return { big: [big('Thrust', fN(r.F), 'From sunlight alone'), big('Acceleration', r.acc < 1e-3 ? nf(r.acc * 1e6, 1) + ' \u00B5m/s\u00B2' : nf(r.acc * 1000, 3) + ' mm/s\u00B2', 'Speed gained per day: ' + nf(r.dvday, 1) + ' m/s')],
        rows: [['Sunlight at this distance', nf(r.S, 0) + ' W/m\u00B2'], ['Sail area', nf(r.A, 0) + ' m\u00B2'], ['Time to gain 1 km/s', fDur(r.t1k)], ['Characteristic acceleration (1 AU)', nf(r.ac1 * 1000, 3) + ' mm/s\u00B2'], ['Propellant used', 'none, ever']],
        badge: { k: 'vac', t: 'Pushed by light', x: 'Photons carry momentum \u2014 a tiny amount, about 9 micronewtons per square metre at Earth\u2019s distance. Bounce them off a mirror and you get twice that. Tiny, but it never runs out.' } };
      return { big: [big('Thrust', fN(r.T), 'At ' + nf(v.isp, 0) + ' s'), big('Acceleration', nf(r.acc * 1000, 2) + ' mm/s\u00B2', 'Speed gained per day: ' + nf(r.acc * 86400 / 1000, 2) + ' km/s')],
        rows: [['Exhaust speed', nf(r.ve / 1000, 0) + ' km/s'], ['Propellant flow', r.md < 1e-3 ? nf(r.md * 1e6, 1) + ' mg/s' : nf(r.md * 1000, 2) + ' g/s'], ['Time to gain 100 km/s', fDur(100000 / r.acc)]],
        badge: { k: 'edge', t: 'Still on paper', x: 'Nobody has yet made a fusion reaction that puts out more power than it takes in, let alone one light enough to fly. But the physics says that if you can, the solar system becomes a matter of weeks, not years.' } };
    },
    chart: function (e, v, r) {
      var k = e.kind;
      if (k === 'ramjet' || k === 'scramjet') {
        var top = Math.max(1000, Math.max.apply(null, r.curveR.concat(r.curveS).map(function (q) { return q[1]; })) * 1.1);
        var ch = L.lineChart({ aria: 'Isp against flight Mach for ramjet, scramjet and rocket', axes: { x: [1, 15], y: [0, top], xt: [1, 3, 5, 7, 9, 11, 13, 15], yt: ticks(0, top, 5), xl: 'Flight Mach number', yl: 'Isp (s, per kg of fuel)', xf: function (t) { return nf(t, 0); }, yf: function (t) { return nf(t, 0); } },
          series: [{ pts: [[1, 450], [15, 450]], cls: 'atl-lref' }, { pts: r.curveR, cls: k === 'ramjet' ? 'atl-lme' : 'atl-lsl' }, { pts: r.curveS, cls: k === 'scramjet' ? 'atl-lme' : 'atl-lsl' }], marks: [{ x: v.M, y: r.isp, cls: 'atl-ring', r: 8 }],
          legend: [{ cls: k === 'ramjet' ? 'atl-lme' : 'atl-lsl', label: 'ramjet' }, { cls: k === 'scramjet' ? 'atl-lme' : 'atl-lsl', label: 'scramjet' }, { cls: 'atl-lref', label: 'hydrogen rocket' }] });
        return { title: 'Where each engine works', svg: ch.svg, note: 'Idealised Brayton cycle at ' + nf(v.h, 0) + ' km with ' + FUELS[v.fuel].name.toLowerCase() + '. The ramjet peaks around Mach 3\u20134 and collapses by about Mach 6; the scramjet takes over but also fades as speed rises. The dotted line is a hydrogen rocket, which works everywhere \u2014 including where there\u2019s no air.' };
      }
      if (k === 'sabre') {
        var c2 = L.lineChart({ aria: 'SABRE Isp against Mach', axes: { x: [0.5, 8], y: [0, 7000], xt: [1, 2, 3, 4, 5, 6, 7, 8], yt: [0, 1000, 2000, 3000, 4000, 5000, 6000], xl: 'Flight Mach number', yl: 'Isp (s)', xf: function (t) { return nf(t, 0); }, yf: function (t) { return nf(t, 0); } },
          series: [{ pts: r.curve, cls: 'atl-lp' }], vlines: [{ x: 5.4, label: 'switch to rocket' }], marks: [{ x: v.M, y: r.isp, cls: 'atl-ring', r: 8 }] });
        return { title: 'One engine, two modes', svg: c2.svg, note: 'Idealised: air compressed to 140 bar after precooling, burned at up to 2,600 K. As speed rises, hotter incoming air needs ever more hydrogen as coolant, and air-breathing Isp falls toward the rocket\u2019s 450 s.' };
      }
      if (k === 'rde') {
        var pts = [], pts2 = [], Pr = A.props[v.prop], tm = L.interp(Pr.tab, Pr.ofNom), pa = ambient(v.alt);
        for (var pc = 5; pc <= 60; pc += 1) { pts.push([pc, rocket(Pr.g, tm[0], tm[1], pc * v.pg, v.eps, pa).isp]); pts2.push([pc, rocket(Pr.g, tm[0], tm[1], pc, v.eps, pa).isp]); }
        var c3 = L.lineChart({ aria: 'Isp with and without detonation pressure gain', axes: { x: [5, 60], y: [Math.min(pts2[0][1], pts[0][1]) - 10, pts[pts.length - 1][1] + 10], xt: [10, 20, 30, 40, 50, 60], yt: ticks(pts2[0][1] - 10, pts[pts.length - 1][1] + 10, 4), xl: 'Injection pressure (bar)', yl: 'Isp (s)', xf: function (t) { return nf(t, 0); }, yf: function (t) { return nf(t, 0); } },
          series: [{ pts: pts2, cls: 'atl-lsl' }, { pts: pts, cls: 'atl-lme' }], marks: [{ x: v.pc, y: r.isp, cls: 'atl-ring', r: 8 }], legend: [{ cls: 'atl-lme', label: 'with detonation gain' }, { cls: 'atl-lsl', label: 'ordinary burning' }] });
        return { title: 'What detonation buys', svg: c3.svg, note: 'The gain is largest when injection pressure is low \u2014 so a detonation engine could get big-engine performance out of simpler, lower-pressure plumbing.' };
      }
      if (k === 'solarth') {
        var pp = [];
        for (var rr = 0.3; rr <= 5; rr *= 1.06) pp.push([rr, SUN / (rr * rr) * Math.PI * v.D * v.D / 4 * 0.56 / (H2.cp * (v.T - 20)) * r.isp * G0]);
        var c4 = L.lineChart({ aria: 'Thrust against distance from the Sun', axes: { x: [0.3, 5], y: [pp[pp.length - 1][1] * 0.8, pp[0][1] * 1.2], xlog: true, ylog: true, xt: [0.5, 1, 2, 5], yt: decades(pp[pp.length - 1][1] * 0.8, pp[0][1] * 1.2), xl: 'Distance from the Sun (AU, log)', yl: 'Thrust (log)', xf: function (t) { return nf(t, 1); }, yf: fN },
          series: [{ pts: pp, cls: 'atl-lp' }], marks: [{ x: v.r, y: r.F, cls: 'atl-ring', r: 8 }] });
        return { title: 'Thrust fades with distance from the Sun', svg: c4.svg, note: 'Sunlight \u2014 and so thrust \u2014 falls as 1/distance\u00B2. At Jupiter (5.2 AU) you\u2019d get less than 4% of what you get at Earth.' };
      }
      if (k === 'sail') {
        var sp = [];
        for (var t = 0; t <= 80; t += 2) { var c = Math.cos(t * Math.PI / 180); sp.push([t, r.F / Math.max(1e-9, Math.pow(Math.cos(v.th * Math.PI / 180), 2)) * c * c]); }
        var c5 = L.lineChart({ aria: 'Sail thrust against tilt angle', axes: { x: [0, 80], y: [0, sp[0][1] * 1.1], xt: [0, 20, 40, 60, 80], yt: ticks(0, sp[0][1] * 1.1, 4), xl: 'Tilt to the sunlight (degrees)', yl: 'Thrust', xf: function (q) { return nf(q, 0) + '\u00B0'; }, yf: fN },
          series: [{ pts: sp, cls: 'atl-lp' }], marks: [{ x: v.th, y: r.F, cls: 'atl-ring', r: 8 }] });
        return { title: 'Tilting trades push for steering', svg: c5.svg, note: 'Tilt the sail and it catches less light (one factor of cos \u03B8) and pushes less directly (a second one): thrust goes as cos\u00B2\u03B8. But the sideways part is what lets a sail spiral outward or inward.' };
      }
      var fp2 = [];
      for (var isp = 5000; isp <= 1e6; isp *= 1.2) fp2.push([isp, 2 * v.eta * v.P * 1e6 / (isp * G0)]);
      var c6 = L.lineChart({ aria: 'Fusion thrust against Isp at fixed power', axes: { x: [5000, 1e6], y: [fp2[fp2.length - 1][1] * 0.8, fp2[0][1] * 1.2], xlog: true, ylog: true, xt: [1e4, 1e5, 1e6], yt: decades(fp2[fp2.length - 1][1] * 0.8, fp2[0][1] * 1.2), xl: 'Specific impulse (s, log)', yl: 'Thrust (log)', xf: function (t) { return nf(t, 0); }, yf: fN },
        series: [{ pts: fp2, cls: 'atl-lp' }], marks: [{ x: v.isp, y: r.T, cls: 'atl-ring', r: 8 }] });
      return { title: 'Same power trade as electric \u2014 at a far bigger scale', svg: c6.svg, note: 'Fusion rockets obey the same rule as ion engines: at fixed power, thrust \u00D7 exhaust speed is constant. The difference is the power \u2014 megawatts to gigawatts instead of kilowatts.' };
    },
    eq: function (e, v, r) {
      var k = e.kind;
      if (k === 'ramjet' || k === 'scramjet') return eqWrap([eqLi('Ram compression \u2014 free heating', 'T<sub>t0</sub> = T\u2080 \u00B7 (1 + 0.2 M\u00B2) = ' + nf(r.at.T, 0) + ' \u00D7 ' + nf(1 + 0.2 * v.M * v.M, 2) + ' = ' + nf(r.Tt0, 0) + ' K'),
        eqLi('Room for heat', 'T<sub>t4</sub> = min(T<sub>limit</sub> \u00B7 (1 + 0.2 M<sub>b</sub>\u00B2), T<sub>t0</sub> + f<sub>st</sub>\u00B7h/c<sub>p</sub>) = ' + nf(r.Tt4, 0) + ' K', 'The limit applies to the gas\u2019s static temperature. Keeping the combustor flow at Mach ' + nf(k === 'ramjet' ? 0.3 : v.Mb, 1) + ' lets the total temperature exceed the limit by (1 + 0.2 M<sub>b</sub>\u00B2) \u2014 the scramjet\u2019s trick.'),
        eqLi('Exhaust speed (ideal Brayton cycle)', 'v<sub>e</sub> = \u221A(\u03B7 \u00B7 2c<sub>p</sub> T<sub>t4</sub> (1 \u2212 1/\u03C4<sub>r</sub>)) = ' + nf(r.ve, 0) + ' m/s', 'Compression and expansion are both ram-driven, so the cycle efficiency is 1 \u2212 1/\u03C4<sub>r</sub>, with \u03C4<sub>r</sub> = 1 + 0.2M\u00B2. \u03B7 = ' + (k === 'ramjet' ? '0.90' : '0.82') + ' stands in for real losses.'),
        eqLi('Thrust and Isp', 'F/\u1E41<sub>air</sub> = (1 + f) v<sub>e</sub> \u2212 v\u2080 = ' + nf(r.Fs, 0) + ' N\u00B7s/kg,  I<sub>sp</sub> = (F/\u1E41<sub>air</sub>) / (f g\u2080) = ' + nf(r.isp, 0) + ' s')],
        '<b>What\u2019s simplified.</b> Constant c<sub>p</sub> and \u03B3 = 1.4, no inlet pressure losses beyond the efficiency factor, and ideal expansion back to ambient pressure.');
      if (k === 'sabre') return eqWrap([eqLi('Precooler load', 'q = c<sub>p</sub> (T<sub>t0</sub> \u2212 150 K) = ' + nf(r.q / 1000, 0) + ' kJ/kg of air'), eqLi('Hydrogen needed as coolant', '\u1E41<sub>H\u2082</sub>/\u1E41<sub>air</sub> = q / 12.6 MJ/kg \u2192 \u03C6 = ' + nf(r.phi, 2) + ' \u00D7 stoichiometric', 'Liquid hydrogen warming from 20 K to ~900 K (via a helium loop) absorbs about 12.6 MJ/kg.'),
        eqLi('Isp in air-breathing mode', 'I<sub>sp</sub> = ((1+f)v<sub>e</sub> \u2212 v\u2080) / (f g\u2080) = ' + nf(r.isp, 0) + ' s', 'With the air compressed to 140 bar after precooling: v<sub>e</sub> = \u221A(0.9 \u00B7 2c<sub>p</sub> \u00B7 2,600 K \u00B7 (1 \u2212 1/\u03C4)).')], '<b>What\u2019s simplified.</b> An idealised model built to show why the precooler sets the switch-over speed, not Reaction Engines\u2019 design numbers.');
      if (k === 'rde') return eqWrap([eqLi('Detonation speed', 'v<sub>CJ</sub> \u2248 ' + nf(r.vdet, 0) + ' m/s', 'The Chapman\u2013Jouguet speed: a detonation is a combustion front riding its own shock wave.'), eqLi('Wave frequency', 'f = n \u00B7 v<sub>CJ</sub> / (\u03C0 D) = ' + r.waves + ' \u00D7 ' + nf(r.vdet, 0) + ' / (\u03C0 \u00D7 ' + nf(v.D / 100, 2) + ') = ' + nf(r.freq, 0) + ' Hz'),
        eqLi('Isp with pressure gain', 'I<sub>sp</sub> = f(P<sub>c</sub> \u00D7 ' + nf(v.pg, 2) + ') = ' + nf(r.isp, 1) + ' s  vs  ' + nf(r.pn.isp, 1) + ' s', 'Illustrative: the gain is modelled as a higher effective chamber pressure.')]);
      if (k === 'solarth') return eqWrap([eqLi('Sunlight absorbed', 'P = 1,361 W/m\u00B2 / r\u00B2 \u00D7 \u03C0 D\u00B2/4 \u00D7 0.8 \u00D7 0.7 = ' + (r.P < 1e6 ? nf(r.P / 1000, 1) + ' kW' : nf(r.P / 1e6, 2) + ' MW'), '80% mirror efficiency, 70% absorber efficiency.'),
        eqLi('Hydrogen flow and thrust', '\u1E41 = P / (c<sub>p</sub> \u0394T) = ' + nf(r.md * 1000, 2) + ' g/s,  F = I<sub>sp</sub> g\u2080 \u1E41 = ' + fN(r.F))]);
      if (k === 'sail') return eqWrap([eqLi('Radiation pressure', 'F = (S/c) \u00B7 A \u00B7 (1 + \u03C1) \u00B7 cos\u00B2\u03B8 = (' + nf(r.S, 0) + ' / 3\u00D710\u2078) \u00D7 ' + nf(r.A, 0) + ' \u00D7 ' + nf(1 + v.refl, 2) + ' \u00D7 ' + nf(Math.pow(Math.cos(v.th * Math.PI / 180), 2), 3) + ' = ' + fN(r.F), 'S/c is the momentum sunlight carries per square metre per second. Absorbed light gives one push; reflected light gives a second, equal push on the way out.'),
        eqLi('Acceleration', 'a = F / m = ' + nf(r.acc * 1000, 4) + ' mm/s\u00B2')], '<b>What\u2019s simplified.</b> Only the push along the sail\u2019s normal; a real sail also sags, wrinkles and absorbs some light unevenly.');
      return eqWrap([eqLi('Thrust from power', 'F = 2 \u00B7 \u03B7 \u00B7 P / v<sub>e</sub> = 2 \u00D7 ' + nf(v.eta, 2) + ' \u00D7 ' + nf(v.P, 0) + ' MW / ' + nf(r.ve / 1000, 0) + ' km/s = ' + fN(r.T))], '<b>What\u2019s simplified.</b> Treats the fusion reactor as a power source of given size and efficiency \u2014 building one that works is the unsolved part.');
    },
    preset: function (e, x) { return x.set ? { v: Object.assign({}, x.set) } : null; },
    vs: function (e, v, r, x) { if (!x.pub) return null; if (x.pub.text) return '<span class="lbl">The real ' + esc(x.name) + '</span><p>' + esc(x.pub.text) + '</p>'; return pubVs(x, x.pub.label, x.pub.key === 'F' ? r.F * 1000 : r.isp, x.pub.val, x.pub.unit, x.pub.note); },
    mapPoint: function (e, v, r) {
      var k = e.kind;
      if (k === 'sail' || k === 'sabre') return null;
      if (k === 'ramjet' || k === 'scramjet') return r.F > 0 && r.isp > 0 ? { F: r.F, isp: r.isp } : null;
      if (k === 'rde') return null;
      return { F: r.F || r.T, isp: r.isp };
    }
  };
  function frontStatic(e, v) {
    var k = e.kind, s = '';
    if (k === 'sail') {
      s += grp('sun', circ(-40, 270, 120, 'atl-sun') + tx(20, 420, 'THE SUN', 'atl-t2 atl-tb', 'start'));
    } else if (k === 'solarth') {
      s += grp('sun', circ(-60, 270, 110, 'atl-sun'));
      s += part({ id: 'tank', type: 'tank', side: 'fuel', x: 540, y: 380, w: 150, h: 110, name: 'HYDROGEN', sub: 'LH\u2082', fill: 0.7 });
      s += P('p-h2', 'fuel', 4, [[615, 380], [615, 330], [700, 330], [700, 300]]);
    } else if (k === 'fusion') {
      s += part({ id: 'tank', type: 'tank', side: 'fuel', x: 24, y: 160, w: 130, h: 220, name: 'FUEL', sub: 'deuterium + helium-3', fill: 0.6, fl: 'plasma' });
      s += P('p-fuel', 'plasma', 3, [[154, 270], [300, 270]]);
    } else if (k === 'rde') {
      s += part({ id: 'ftank', type: 'tank', side: 'fuel', x: 24, y: 60, w: 120, h: 150, name: 'FUEL', sub: A.props[v.prop].fuel, fill: 0.7 }) + part({ id: 'otank', type: 'tank', side: 'ox', x: 24, y: 330, w: 120, h: 150, name: 'OXIDISER', sub: 'LOX', fill: 0.7 });
    }
    return s;
  }
  function frontDynamic(e, v, r) {
    var k = e.kind, s = '', cy = CY;
    if (k === 'ramjet') {
      var mu = Math.asin(Math.min(1, 1 / v.M)), shockX = 200 + 40 / Math.tan(mu + 0.12);
      s += grp('air', P('p-air', 'air', 6, [[20, cy - 60], [300, cy - 60]]) + P('p-air2', 'air', 6, [[20, cy + 60], [300, cy + 60]]) + tx(30, cy - 80, 'AIR IN \u00B7 Mach ' + nf(v.M, 1), 'atl-t atl-tb', 'start'));
      s += grp('inlet', path('M200 ' + cy + ' L330 ' + (cy - 34) + ' L360 ' + (cy - 34) + ' L380 ' + cy + ' L360 ' + (cy + 34) + ' L330 ' + (cy + 34) + ' Z', 'atl-spike') + path('M300 ' + (cy - 120) + ' L420 ' + (cy - 96) + ' L960 ' + (cy - 96) + ' M300 ' + (cy + 120) + ' L420 ' + (cy + 96) + ' L960 ' + (cy + 96), 'atl-inlet') + tx(330, cy - 132, 'INLET \u2014 cone spike', 'atl-t2', 'middle'));
      s += grp('shocks', path('M200 ' + cy + ' L' + Math.min(360, shockX).toFixed(0) + ' ' + (cy - 118) + ' M200 ' + cy + ' L' + Math.min(360, shockX).toFixed(0) + ' ' + (cy + 118), 'atl-shock') + path('M430 ' + (cy - 96) + ' L430 ' + (cy + 96), 'atl-shock atl-nshock') + tx(436, cy - 104, 'TERMINAL SHOCK \u2192 subsonic', 'atl-t2', 'start'));
      s += grp('burner', [0, 1, 2].map(function (i) { return path('M620 ' + (cy - 60 + i * 60) + ' l18 -10 m-18 10 l18 10', 'atl-flameh'); }).join('') + rect(640, cy - 90, 260, 180, 'atl-portgas', r.f > 0 ? '' : ' style="opacity:.1"') + tx(620, cy - 104, 'FLAMEHOLDERS', 'atl-t2', 'middle') + tx(770, cy + 4, r.dead ? 'NO ROOM FOR HEAT' : 'SUBSONIC COMBUSTION', 'atl-t atl-tb', 'middle'));
      s += grp('fuel', P('p-f', 'fuel', 3, [[560, cy - 150], [560, cy - 96]]) + tx(566, cy - 150, 'FUEL', 'atl-t2', 'start'));
      s += grp('nozzle', path('M960 ' + (cy - 96) + ' L1000 ' + (cy - 50) + ' L1110 ' + (cy - 80) + ' M960 ' + (cy + 96) + ' L1000 ' + (cy + 50) + ' L1110 ' + (cy + 80), 'atl-wall') + (r.f > 0 ? path('M1000 ' + (cy - 50) + ' L1115 ' + (cy - 70) + ' L1115 ' + (cy + 70) + ' L1000 ' + (cy + 50) + ' Z', '', ' fill="url(#atlPlumeG)"') : ''));
    } else if (k === 'scramjet') {
      var mu2 = Math.asin(Math.min(1, 1 / v.M)) + 0.1;
      s += grp('air', P('p-air', 'air', 6, [[20, 170], [300, 170]]) + tx(30, 150, 'AIR IN \u00B7 Mach ' + nf(v.M, 1), 'atl-t atl-tb', 'start'));
      s += grp('inlet', path('M120 360 L480 300 L760 300 L1115 380 L1115 400 L120 400 Z', 'atl-spike') + path('M400 210 L1000 210', 'atl-inlet') + tx(300, 390, 'VEHICLE FOREBODY = INLET RAMP', 'atl-t2', 'middle') + tx(1000, 200, 'COWL', 'atl-t2', 'end'));
      s += grp('shocks', [0, 1, 2].map(function (i) { var x0 = 120 + i * 120, y0 = 360 - i * 20; return path('M' + x0 + ' ' + y0 + ' L' + (x0 + 150 / Math.tan(mu2)).toFixed(0) + ' ' + (y0 - 150), 'atl-shock'); }).join('') + tx(250, 250, 'OBLIQUE SHOCKS squeeze the air', 'atl-t2', 'middle'));
      s += grp('burner', rect(560, 212, 200, 86, 'atl-portgas', r.f > 0 ? '' : ' style="opacity:.1"') + [0, 1, 2].map(function (i) { return rect(580 + i * 60, 240, 8, 30, 'atl-strut'); }).join('') + tx(660, 205 - 12, 'SUPERSONIC COMBUSTOR \u00B7 Mach ' + nf(v.Mb, 1), 'atl-t2', 'middle'));
      s += grp('fuel', P('p-f', 'fuel', 3, [[600, 120], [600, 210]]) + tx(606, 120, 'FUEL INJECTED', 'atl-t2', 'start'));
      s += grp('nozzle', (r.f > 0 ? path('M760 214 L1115 170 L1115 360 L760 298 Z', '', ' fill="url(#atlPlumeG)"') : '') + tx(960, 350, 'AFTBODY = NOZZLE', 'atl-t2', 'middle'));
    } else if (k === 'sabre') {
      var air = r.mode === 'air';
      s += grp('intake', path('M60 ' + cy + ' L200 ' + (cy - 40) + ' L230 ' + (cy - 40) + ' L250 ' + cy + ' L230 ' + (cy + 40) + ' L200 ' + (cy + 40) + ' Z', 'atl-spike') + path('M170 ' + (cy - 120) + ' L300 ' + (cy - 92) + ' L420 ' + (cy - 92) + ' M170 ' + (cy + 120) + ' L300 ' + (cy + 92) + ' L420 ' + (cy + 92), 'atl-inlet') + tx(200, cy - 132, air ? 'INTAKE OPEN' : 'INTAKE CLOSED', 'atl-t2 atl-tb', 'middle'));
      s += grp('air', P('p-air', 'air', 6, [[20, cy - 150], [150, cy - 150], [150, cy - 100], [310, cy - 60]], air ? {} : { nochev: true }) + (air ? '' : path('M20 ' + (cy - 150) + ' L150 ' + (cy - 150), 'atl-ghost2')));
      var tubes = '';
      for (var i = 0; i < 9; i++) tubes += path('M' + (320 + i * 12) + ' ' + (cy - 86) + ' L' + (320 + i * 12) + ' ' + (cy + 86), 'atl-htx');
      s += grp('precooler', rect(310, cy - 92, 110, 184, 'atl-bed', ' rx="10"') + tubes + tx(365, cy + 112, 'PRECOOLER', 'atl-t atl-tb', 'middle') + tx(365, cy + 127, air ? nf(r.Tt0, 0) + ' K \u2192 150 K in 1/100 s' : 'idle', 'atl-t2', 'middle'));
      s += grp('heloop', P('p-he', 'press', 3, [[420, cy - 60], [520, cy - 60], [520, cy - 150], [310, cy - 150], [310, cy - 92]]) + tx(420, cy - 162, 'HELIUM LOOP', 'atl-t2', 'middle'));
      s += part({ id: 'comp', type: 'turbine', x: 560, y: cy, r: 34, label: 'COMPRESSOR', lx: 560, ly: cy + 54, la: 'middle' });
      s += grp('h2', P('p-h2', 'fuel', 4, [[440, 470], [700, 470], [700, cy + 40]]) + tx(440, 490, 'LIQUID HYDROGEN \u2014 fuel and coolant', 'atl-t2', 'start'));
      s += grp('lox', P('p-lox', 'ox', 4, [[440, 90], [720, 90], [720, cy - 40]], air ? { nochev: true } : {}) + tx(440, 78, air ? 'LOX VALVE CLOSED' : 'LIQUID OXYGEN \u2014 rocket mode', 'atl-t2', 'start'));
      s += grp('chamber', rect(680, cy - 50, 90, 100, 'atl-comb', ' rx="10" style="stroke:var(--oxide)"') + tx(725, cy + 70, 'COMBUSTION CHAMBERS', 'atl-t2', 'middle'));
      var p = rocket(1.2, 3300, 16, 140, air ? 30 : 60, 0);
      s += L.nozzleSVG(p, { xt: 800, rt: 26, maxRe: 110, maxL: 150, noLabel: true }).svg;
    } else if (k === 'rde') {
      var dur = Math.max(0.6, Math.min(4, 2000 / r.freq)), R0 = 150, R1 = 100;
      s += P('pf', 'fuel', 4, [[144, 135], [300, 135], [300, 140]]) + P('po', 'ox', 4, [[144, 405], [300, 405], [300, 400]]);
      s += grp('annulus', circ(300, cy, R0, 'atl-annulus') + circ(300, cy, R1, 'atl-annulusi') + tx(300, cy + 4, 'END-ON VIEW', 'atl-t2 atl-tb', 'middle') + tx(300, cy + 18, 'of the ring-shaped chamber', 'atl-t2', 'middle'));
      var wave = '';
      for (var w = 0; w < r.waves; w++) { var a0 = w * 2 * Math.PI / r.waves; wave += path('M' + (300 + Math.cos(a0) * R1).toFixed(1) + ' ' + (cy + Math.sin(a0) * R1).toFixed(1) + ' L' + (300 + Math.cos(a0) * R0).toFixed(1) + ' ' + (cy + Math.sin(a0) * R0).toFixed(1), 'atl-wave') + path('M' + (300 + Math.cos(a0) * 125).toFixed(1) + ' ' + (cy + Math.sin(a0) * 125).toFixed(1) + ' A125 125 0 0 0 ' + (300 + Math.cos(a0 - 1.6) * 125).toFixed(1) + ' ' + (cy + Math.sin(a0 - 1.6) * 125).toFixed(1), 'atl-wavetrail'); }
      s += grp('wave', '<g class="atl-rot" style="animation-duration:' + dur.toFixed(2) + 's">' + circ(300, cy, R0 - 2, 'atl-ghost') + wave + '</g>' + tx(300, 96, 'DETONATION WAVE \u2014 ' + nf(r.freq / 1000, 1) + ' kHz (shown slowed)', 'atl-t2 atl-tb', 'middle'));
      s += grp('side', rect(560, 190, 200, 24, 'atl-case', ' rx="4"') + rect(560, 326, 200, 24, 'atl-case', ' rx="4"') + rect(560, 214, 200, 18, 'atl-portgas') + rect(560, 308, 200, 18, 'atl-portgas') + tx(660, 180, 'SIDE VIEW: THE THIN ANNULUS', 'atl-t2', 'middle'));
      s += grp('plug', path('M560 232 L760 232 C860 240 900 262 950 ' + cy + ' C900 278 860 300 760 308 L560 308 Z', 'atl-spike') + tx(700, cy + 4, 'CENTREBODY', 'atl-t2 atl-tb', 'middle'));
      s += grp('plume', '<g class="atl-plume"><path d="M760 190 Q900 180 1115 150 L1115 390 Q900 360 760 350 Z" fill="url(#atlPlumeG)"/></g>');
    } else if (k === 'solarth') {
      var rays = '', D = Math.max(60, Math.min(230, 60 + v.D * 5)), fy = cy, fx = 520;
      for (var j = 0; j < 7; j++) { var y = cy - D + j * (2 * D / 6); rays += path('M60 ' + y.toFixed(0) + ' L360 ' + y.toFixed(0) + ' L' + fx + ' ' + fy, 'atl-ray'); }
      s += grp('rays', rays + tx(120, cy - D - 14, 'SUNLIGHT \u00B7 ' + nf(SUN / (v.r * v.r), 0) + ' W/m\u00B2', 'atl-t2 atl-tb', 'start'));
      s += grp('mirror', path('M370 ' + (cy - D) + ' Q300 ' + cy + ' 370 ' + (cy + D), 'atl-mirror') + tx(330, cy + D + 20, 'CONCENTRATOR MIRROR \u00B7 ' + nf(v.D, 1) + ' m', 'atl-t2', 'middle'));
      s += grp('absorber', rect(500, cy - 30, 120, 60, 'atl-rcore', ' rx="8"') + tx(560, cy - 40, 'ABSORBER CAVITY \u00B7 ' + nf(v.T, 0) + ' K', 'atl-t2', 'middle'));
      s += grp('throat', path('M620 ' + (cy - 30) + ' L660 ' + (cy - 16) + ' M620 ' + (cy + 30) + ' L660 ' + (cy + 16), 'atl-wall')) + L.nozzleSVG(r.p, { xt: 660, rt: 16, maxRe: 100, maxL: 150, plumeOpacity: 0.5 }).svg;
    } else if (k === 'sail') {
      var th = v.th * Math.PI / 180, cx = 640, half = Math.max(40, Math.min(210, 30 + Math.sqrt(v.side) * 14)), dx = Math.sin(th) * half, dy = Math.cos(th) * half;
      var rays2 = '';
      for (var q = -3; q <= 3; q++) { var yy = cy + q * half / 3.4; rays2 += path('M110 ' + yy.toFixed(0) + ' L' + (cx - dx * q / 3.4 * 0).toFixed(0) + ' ' + yy.toFixed(0), 'atl-ray'); }
      var nx = Math.cos(th), ny = -Math.sin(th);
      s += grp('light', rays2 + tx(160, cy - half - 20, 'SUNLIGHT', 'atl-t2 atl-tb', 'start'));
      s += grp('sail', path('M' + (cx - dx).toFixed(1) + ' ' + (cy - dy).toFixed(1) + ' L' + (cx + dx).toFixed(1) + ' ' + (cy + dy).toFixed(1), 'atl-sail') + tx(cx + dx + 10, cy + dy + 20, 'SAIL \u2014 aluminium-coated film thinner than a hair', 'atl-t2', 'start'));
      s += grp('reflect', [-2, 0, 2].map(function (q2) { var px = cx + dx * q2 / 3.4 * -1, py = cy + q2 * half / 3.4, rx = px - Math.cos(2 * th) * 140, ry = py - Math.sin(2 * th) * 140; return path('M' + px.toFixed(0) + ' ' + py.toFixed(0) + ' L' + rx.toFixed(0) + ' ' + ry.toFixed(0), 'atl-ray atl-rayr'); }).join(''));
      var fl = Math.max(40, Math.min(260, 60 + Math.log10(Math.max(r.F, 1e-7) * 1e6) * 40));
      s += grp('force', path('M' + cx + ' ' + cy + ' L' + (cx + nx * fl).toFixed(1) + ' ' + (cy + ny * fl * -1).toFixed(1), 'atl-force') + tx(cx + nx * fl + 8, cy - ny * fl * -1, 'PUSH \u00B7 ' + fN(r.F), 'atl-t atl-tb', 'start'));
      s += grp('bus', rect(cx - 14, cy - 14, 28, 28, 'atl-mach', ' rx="3"'));
    } else {
      s += grp('coils', [360, 420, 480, 540, 600, 660].map(function (x) { return '<ellipse cx="' + x + '" cy="' + cy + '" rx="12" ry="110" class="atl-coilr2"/>'; }).join('') + tx(510, 142, 'MAGNET COILS \u2014 a magnetic bottle', 'atl-t2', 'middle'));
      s += grp('plasma', '<ellipse cx="510" cy="' + cy + '" rx="170" ry="46" class="atl-uplasma atl-fplasma"/>' + tx(510, cy + 4, 'FUSING PLASMA \u00B7 ~1 billion K', 'atl-t atl-tb', 'middle'));
      s += grp('mnozzle', [0, 1, 2, 3].map(function (i) { var o = 14 + i * 12; return path('M700 ' + (cy - o) + ' Q820 ' + (cy - o) + ' 1110 ' + (cy - o - 80 - i * 30), 'atl-field') + path('M700 ' + (cy + o) + ' Q820 ' + (cy + o) + ' 1110 ' + (cy + o + 80 + i * 30), 'atl-field'); }).join('') + tx(900, 150, 'MAGNETIC NOZZLE', 'atl-t2', 'middle'));
      s += grp('beam', path('M690 226 L1115 150 L1115 390 L690 314 Z', '', ' fill="url(#atlPlasmaG)"') + beamLines(700, 1115, 236, 304, 5, '', 'plasma'));
    }
    return s;
  }
})();
